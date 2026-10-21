import "server-only";
import { getConfiguration } from "../config";
import { prompts } from "./prompts";
import { brewInput, prepInput, moderationInput, canonical, requestSchema, providerEnvelope, validateResult, parseTokenUsage,
  type Feature, type FeatureData, type TokenUsage, type BrewInput } from "./schemas";
import { BYTE_LIMIT, BodyOverflow, readBounded, operationSettings, soclaasTransport, fakeResponse, type Transport } from "./transport";

export type { Feature, BrewInput, PrepInput, ModerationInput, BrewResult, PrepResult, ModerationResult, TokenUsage } from "./schemas";
type Reason = "disabled" | "usage_limited" | "unavailable" | "no_source_data";
const fallbacks = { brew_finder: "rating_sorted_catalogue", prep_advisor: "top_items", moderation: "manual_queue" } as const;
export type Result = { [F in Feature]:
  | { requestId: string; feature: F; mode: "ai"; source: "provider" | "cache"; data: FeatureData[F] }
  | { requestId: string; feature: F; mode: "fallback"; reason: Reason; fallback: typeof fallbacks[F] }
}[Feature];
export type Options = {
  feature: Feature; input: unknown; requestId: string;
  /** Trusted server construction only; HTTP requests cannot supply configuration. */
  getConfig?: () => Record<string, unknown>;
  /** Bound to an authenticated actor/scope and server-issued identities by caller. */
  admit: (stage: "action" | "provider_attempt") => Promise<boolean>;
  /** Internal transport seam, never accepted from feature HTTP bodies. */
  transport?: Transport;
  /** Caller owns current authorization, scope, versions and expiry checks. */
  cache?: { read: () => Promise<unknown | null>; write: (data: unknown) => Promise<void> };
  signal?: AbortSignal;
  /** Content-free provider usage seam for the accounting owner; never browser data. */
  recordUsage?: (usage: TokenUsage) => void;
};
function liveConfiguration(): Record<string, unknown> {
  // Reuse application environment/credential validation before selecting transport.
  getConfiguration();
  return process.env;
}

/**
 * Consumes already-authorized snapshots; it neither reads domain records nor
 * grants authority. Endpoints must recheck current eligibility before delivery.
 */
export async function runLlmOperation(options: Options): Promise<Result> {
  const { feature, requestId } = options;
  const fallback = (reason: Reason) => ({ requestId, feature, mode: "fallback", reason, fallback: fallbacks[feature] }) as Result;
  const ai = (source: "provider" | "cache", data: FeatureData[Feature]) => ({ requestId, feature, mode: "ai", source, data }) as Result;
  const current = () => operationSettings((options.getConfig ?? liveConfiguration)());
  const stateFailure = () => {
    const config = current();
    if (config.state !== "enabled") return config.state;
    if (options.signal?.aborted) return "unavailable";
    return null;
  };
  try {
    const config = current();
    // Validate source before admission/cache/provider effects, even in disabled mode.
    const source = feature === "brew_finder" ? brewInput.parse(options.input) : feature === "prep_advisor"
      ? prepInput.parse(options.input) : moderationInput(config.state === "enabled" ? config.limits.AI_MODERATION_REVIEWS_PER_CALL : 20).parse(options.input);
    const context = canonical(source);
    if (new TextEncoder().encode(context).byteLength > BYTE_LIMIT) return fallback("unavailable");
    if (config.state !== "enabled") return fallback(config.state);
    if (options.signal?.aborted) return fallback("unavailable");
    if (feature === "brew_finder" && !(source as BrewInput).candidates.length) return fallback("no_source_data");
    if (!(await options.admit("action"))) return fallback(stateFailure() ?? "usage_limited");
    let failure = stateFailure();
    if (failure) return fallback(failure);
    if (feature !== "moderation" && options.cache) {
      const cached = await options.cache.read();
      failure = stateFailure();
      if (failure) return fallback(failure);
      if (cached !== null) return ai("cache", validateResult(feature, cached, source, true));
    }
    if (!(await options.admit("provider_attempt"))) return fallback(stateFailure() ?? "usage_limited");
    failure = stateFailure();
    if (failure) return fallback(failure);
    // Take a fresh validated configuration immediately before dispatch.
    const dispatch = current();
    if (dispatch.state !== "enabled") return fallback(dispatch.state);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(cancel, 30_000);
    let abortListener = () => {};
    const aborted = new Promise<never>((_, reject) => {
      abortListener = () => reject(new Error("Cancelled."));
      controller.signal.addEventListener("abort", abortListener, { once: true });
    });
    try {
      if (controller.signal.aborted) return fallback("unavailable");
      const request = new Request(dispatch.url, { method: "POST", signal: controller.signal, redirect: "error", cache: "no-store",
        headers: { "content-type": "application/json", ...(dispatch.settings.SOCLAAS_API_KEY ? { authorization: `Bearer ${dispatch.settings.SOCLAAS_API_KEY.trim()}` } : {}) },
        body: JSON.stringify({ model: dispatch.settings.SOCLAAS_MODEL, reasoning_effort: dispatch.settings.SOCLAAS_REASONING_EFFORT,
          stream: false, messages: [{ role: "system", content: prompts[feature] }, { role: "user", content: context }] }),
      });
      const transport = options.transport ?? (dispatch.settings.AI_PROVIDER === "fake"
        ? async () => fakeResponse(feature, source) : soclaasTransport);
      const response = await Promise.race([transport(request), aborted]);
      failure = stateFailure();
      if (failure) { void response.body?.cancel().catch(() => {}); return fallback(failure); }
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        return fallback(response.status === 429 ? "usage_limited" : "unavailable");
      }
      const body = await Promise.race([readBounded(response.body, controller.signal), aborted]);
      const envelope = providerEnvelope.parse(JSON.parse(body));
      const data = validateResult(feature, JSON.parse(envelope.choices[0].message.content), source, false);
      failure = stateFailure();
      if (failure) return fallback(failure);
      options.recordUsage?.(parseTokenUsage(envelope.usage));
      if (feature !== "moderation" && options.cache) {
        await options.cache.write(data);
        failure = stateFailure();
        if (failure) return fallback(failure);
      }
      return ai("provider", data);
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
      controller.signal.removeEventListener("abort", abortListener);
    }
  } catch {
    // Never include source, credential, prompt, provider or validation details.
    try { return fallback(stateFailure() ?? "unavailable"); } catch { return fallback("unavailable"); }
  }
}

/** Shared reader only: route-owned session/origin/role/source checks still apply. */
export async function readAiRequest(request: Request, feature: Feature, options: { maxReviews: number; requestId: string }) {
  const error = (status: number, code: string, message: string) => ({ ok: false as const, response: Response.json({ requestId: options.requestId,
    error: { code, message } }, { status, headers: { "cache-control": "private, no-store", ...(status === 405 ? { allow: "POST" } : {}) } }) });
  if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED", "Use POST for this operation.");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error(415, "UNSUPPORTED_MEDIA_TYPE", "Use a JSON request body.");
  try {
    const body = await readBounded(request.body, request.signal);
    const data = requestSchema(feature, options.maxReviews).parse(JSON.parse(body));
    return { ok: true as const, data };
  } catch (caught) {
    if (caught instanceof BodyOverflow) return error(413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
    return error(400, "INVALID_REQUEST", "The request is invalid.");
  }
}
