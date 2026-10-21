import "server-only";
import { randomUUID } from "node:crypto";
import { createAiAudit, auditMetadataSchema, type AiAuditMetadata, type AiAuditEvent } from "./ai-audit";
import { z } from "zod";
import { brewSourceRevision, prepSourceRevision, cacheKey, canonicalJson, digest } from "./cache-identity";
import { contextSchema, envelopeSchema, instant, validateResult, type CacheContext, type CacheResult } from "./cache-schema";
import { runOperationWithLifecycle, operationFallback, type Options as LlmOptions, type Result as LlmResult } from "./operations";
import type { TokenUsage } from "./schemas";
import type { UsageAdmission, UsageEnvironment, UsageRequest, UsageRpc } from "./usage";

export type AiCacheContext = {
  operationId: string; actorId: string; cafeId?: string; feature: "brew_finder" | "prep_advisor";
  scope: { actorId: string } | { cafeId: string; businessDate: string };
  input: Record<string, unknown>; source: Record<string, unknown>;
  model: Record<string, unknown>; contract: Record<string, unknown>;
};
/** Composed operations derive model/prompt identities from T-14 configuration. */
export type AiOperationContext = Omit<AiCacheContext, "model" | "contract"> | {
  operationId: string; actorId: string; feature: "moderation";
  scope: { actorId: string }; input: unknown;
};
type ModerationContext = { operationId: string; actorId: string; feature: "moderation_assistant"; scope: { actorId: string }; cafeId?: undefined };
type AuditContext = AiAuditMetadata;
export type AiOperationOptions = Pick<LlmOptions, "requestId" | "getConfig" | "transport" | "signal"> & { refresh?: boolean };
type Envelope = Omit<z.infer<typeof envelopeSchema>, "data"> & { data: CacheResult };
type Outcome = { outcome: "cache" | "success" | "fallback"; data?: CacheResult };
const unavailable = () => new Error("AI state unavailable.");
const responseSchema = z.array(z.object({ result: z.unknown() }).strict()).length(1);

/** Server-internal repository: feature adapters supply verified actors and current
 * authorized source snapshots. No HTTP payload may be passed as this context. */
export function createAiState(options: {
  environment: UsageEnvironment; rpc: UsageRpc; admission: UsageAdmission;
  databaseClock?: () => Promise<string>;
  eligibleCafeIds: (actorId: string) => Promise<string[]>;
  enabled?: () => boolean;
}) {
  const environment = z.enum(["local", "ci", "dev", "prod"]).parse(options.environment);
  if (options.databaseClock && !["local", "ci"].includes(environment)) throw unavailable();
  // Capture construction capabilities; later mutation of options cannot replace them.
  const { rpc, admission, databaseClock, eligibleCafeIds } = options;
  const enabled = options.enabled ?? (() => true);
  const aiAudit = createAiAudit({ environment, rpc, databaseClock });
  async function call(action: string, request: Record<string, unknown>) {
    const clock = databaseClock ? instant.parse(await databaseClock()) : undefined;
    const response = await rpc("ai_state", { p_environment: environment, p_action: action, p_request: request, ...(clock ? { p_now: clock } : {}) });
    const parsed = responseSchema.safeParse(response.data);
    if (response.error || !parsed.success) throw unavailable();
    return parsed.data[0].result;
  }
  function context(input: AiCacheContext, operationPreflight = true): CacheContext {
    // Validation clones the data, preventing caller mutation while work is in flight.
    const parsed = contextSchema.parse(input);
    // Ensure every identity component is canonical JSON, with no ignored undefined values.
    canonicalJson(input);
    if (operationPreflight) {
      const providerInput = parsed.feature === "brew_finder" ? { query: parsed.input.query, candidates: parsed.source.candidates } : parsed.source;
      if (Buffer.byteLength(canonicalJson(providerInput), "utf8") > 65_536) throw unavailable();
      if (!enabled()) throw unavailable();
    }
    return parsed;
  }
  const metadata = (c: AuditContext) => ({ actorId: c.actorId, ...(c.cafeId ? { cafeId: c.cafeId } : {}), operationId: c.operationId, feature: c.feature, scope: c.scope });
  function operationMetadata(input: AiCacheContext | AiOperationContext): AuditContext {
    return auditMetadataSchema.parse({ operationId: input.operationId, actorId: input.actorId,
      feature: input.feature === "moderation" ? "moderation_assistant" : input.feature, scope: input.scope,
      ...("cafeId" in input && input.cafeId ? { cafeId: input.cafeId } : {}),
    });
  }
  function identity(c: CacheContext) {
    const ids = { inputFingerprint: digest(c.input), sourceRevision: c.feature === "brew_finder" ? brewSourceRevision(c.source) : prepSourceRevision(c.source), modelIdentity: digest(c.model), contractIdentity: digest(c.contract) };
    return { ...metadata(c), identity: ids, key: cacheKey({ environment, feature: c.feature, scope: c.scope, ...ids }) };
  }
  async function authorized(c: AuditContext, data?: CacheResult, checkEnabled = true) {
    if (checkEnabled && !enabled()) return false;
    const auth = z.object({ now: instant }).strict().safeParse(await call("authorize", metadata(c)));
    if (!auth.success) return false;
    const ids = z.array(z.uuid()).parse(await eligibleCafeIds(c.actorId));
    if (c.feature === "moderation_assistant") return true;
    if (c.feature === "prep_advisor") return ids.includes(c.cafeId!);
    return !data || data.suggestions.every(s => "cafeId" in s && ids.includes(s.cafeId));
  }
  async function read(c: CacheContext, checkEnabled = true): Promise<Envelope | null> {
    const key = identity(c);
    const stored = await call("read", key);
    if (stored === null) return null;
    const parsed = envelopeSchema.safeParse(stored);
    if (!parsed.success) return null;
    const envelope = parsed.data;
    if (envelope.environment !== environment || envelope.feature !== c.feature || canonicalJson(envelope.scope) !== canonicalJson(c.scope)
      || Object.entries(key.identity).some(([k,v]) => envelope[k as keyof typeof key.identity] !== v)) return null;
    const created = Date.parse(envelope.createdAt), expires = Date.parse(envelope.expiresAt);
    const expected = c.feature === "brew_finder" ? created + 600_000 : Math.floor((created + 28_800_000) / 86_400_000) * 86_400_000 + 57_600_000;
    if (!(created < expires) || expires !== expected) return null;
    const data = validateResult(c, envelope.data);
    if (!data || !(await authorized(c, data, checkEnabled))) return null;
    return { ...envelope, data };
  }
  async function write(c: CacheContext, candidate: unknown, checkEnabled = true): Promise<boolean> {
    const data = validateResult(c, candidate);
    if (!data || Buffer.byteLength(canonicalJson(data), "utf8") > 65_536 || !(await authorized(c, data, checkEnabled))) return false;
    const stored = await call("write", { ...identity(c), data });
    return envelopeSchema.safeParse(stored).success;
  }
  async function audit(c: AuditContext, outcome: AiAuditEvent["outcome"], tokens?: TokenUsage) {
    if (!(await aiAudit.record({ ...metadata(c), outcome, ...(tokens ? { tokens } : {}) }))) throw unavailable();
  }
  const request = (c: AuditContext, event: UsageRequest["event"]): UsageRequest => ({ admissionId: randomUUID(), operationId: c.operationId, actorId: c.actorId, cafeId: c.cafeId, feature: c.feature === "brew_finder" ? "brew-finder" : c.feature === "prep_advisor" ? "prep-advisor" : "moderation-assistant", event });
  return {
    async readCache(input: AiCacheContext): Promise<Envelope | null> {
      try { return await read(context(input)); } catch { return null; }
    },
    async writeCache(input: AiCacheContext, result: unknown): Promise<boolean> {
      try { return await write(context(input), result); } catch { return false; }
    },
    async invoke(input: AiCacheContext, invocation: { refresh?: boolean; signal?: AbortSignal; provider: () => Promise<unknown> }): Promise<Outcome> {
      let c: CacheContext | undefined;
      let m: AuditContext | undefined;
      try {
        const initialMetadata = operationMetadata(input);
        if (!(await authorized(initialMetadata, undefined, false))) return { outcome: "fallback" };
        m = initialMetadata;
        c = context(input);
        if (!enabled()) { await audit(m, "fallback"); return { outcome: "fallback" }; }
        // The initial durable audit establishes storage availability before dispatch.
        await audit(m, "started");
        const event = invocation.refresh ? "refresh" : "action";
        if (!(await admission.reserve(request(m, event))).admitted) {
          await audit(m, "denied"); return { outcome: "fallback" };
        }
        if (!invocation.refresh) {
          const cached = await read(c);
          if (cached) {
            await audit(m, "cache");
            if (!(await authorized(c, cached.data))) throw unavailable();
            return { outcome: "cache", data: cached.data };
          }
        }
        if (!(await authorized(c))) throw unavailable();
        if (!(await admission.reserve(request(m, "provider_attempt"))).admitted) {
          await audit(m, "denied"); return { outcome: "fallback" };
        }
        await audit(m, "provider_attempt");
        const result = await invocation.provider();
        const data = validateResult(c, result);
        if (!data || Buffer.byteLength(canonicalJson(data), "utf8") > 65_536 || !(await authorized(c, data))) throw unavailable();
        await audit(m, "ready");
        if (!(await authorized(c, data)) || invocation.signal?.aborted || !enabled()) throw unavailable();
        // The RPC performs current database authorization and an atomic write.
        // A lost acknowledgement may leave a committed entry; never roll it back.
        const stored = await call("write", { ...identity(c), data });
        if (!envelopeSchema.safeParse(stored).success) throw unavailable();
        let disabled = false;
        try { disabled = !enabled(); } catch { /* No new post-commit failure. */ }
        if (disabled || invocation.signal?.aborted) throw unavailable();
        return { outcome: "success", data };
      } catch {
        if (m) { try { await audit(m, "fallback"); } catch { /* Content-free fail closed. */ } }
        return { outcome: "fallback" };
      }
    },
    /** Future feature routes use this entrypoint instead of nesting invoke and
     * runLlmOperation. T-14 alone sequences stages; these callbacks do T-16 work. */
    async runOperation(input: AiOperationContext, invocation: AiOperationOptions): Promise<LlmResult> {
      const fallback = () => operationFallback(input.feature, invocation.requestId, "unavailable");
      let c: CacheContext | ModerationContext | undefined;
      let m: AuditContext | undefined;
      let usage: TokenUsage | undefined;
      let denied = false;
      let candidate: CacheResult | undefined;
      try {
        const snapshot = structuredClone(input);
        const initialMetadata = operationMetadata(snapshot);
        if (!(await authorized(initialMetadata, undefined, false))) return fallback();
        m = initialMetadata;
        const source = snapshot.feature === "brew_finder"
          ? { query: snapshot.input.query, candidates: snapshot.source.candidates }
          : snapshot.feature === "prep_advisor" ? snapshot.source : snapshot.input;
        const result = await runOperationWithLifecycle({
          feature: snapshot.feature, input: source, requestId: invocation.requestId,
          getConfig: invocation.getConfig, transport: invocation.transport, signal: invocation.signal,
          admit: async stage => {
            if (!c || !(await authorized(c, undefined, false))) throw unavailable();
            if (stage === "action") await audit(m!, "started");
            const event = stage !== "action" ? stage : c.feature === "moderation_assistant" ? "run" : invocation.refresh && c.feature === "prep_advisor" ? "refresh" : "action";
            if (!(await admission.reserve(request(c, event))).admitted) {
              await audit(c, "denied"); denied = true; return false;
            }
            if (stage === "provider_attempt") await audit(c, "provider_attempt");
            return true;
          },
          cache: snapshot.feature === "moderation" ? undefined : {
            read: async () => {
              if (!c || c.feature === "moderation_assistant") throw unavailable();
              return invocation.refresh ? null : (await read(c, false))?.data ?? null;
            },
            write: async data => {
              if (!c || c.feature === "moderation_assistant") throw unavailable();
              const validated = validateResult(c, data);
              if (!validated || Buffer.byteLength(canonicalJson(validated), "utf8") > 65_536) throw unavailable();
              candidate = validated;
            },
          },
        }, {
          // Only sanitized counts cross this seam, including valid envelope usage
          // accompanying a rejected feature result. The public T-14 callback is unchanged.
          providerUsage: tokens => { usage = { ...tokens }; },
          beforeReturn: async result => {
            if (!c || !(await authorized(c, c.feature === "moderation_assistant" ? undefined : result.data as CacheResult, false))) throw unavailable();
            await audit(c, result.source === "cache" ? "cache" : "ready", usage);
            if (!(await authorized(c, c.feature === "moderation_assistant" ? undefined : result.data as CacheResult, false))) throw unavailable();
          },
          publish: snapshot.feature === "moderation" ? undefined : async () => {
            if (!c || c.feature === "moderation_assistant" || !candidate) throw unavailable();
            const stored = await call("write", { ...identity(c), data: candidate });
            if (!envelopeSchema.safeParse(stored).success) throw unavailable();
          },
          bindIdentity: identity => {
            if (identity.environment !== environment) throw unavailable();
            if (snapshot.feature === "moderation") {
              const parsed = z.object({ operationId: z.uuid(), actorId: z.uuid(), feature: z.literal("moderation"),
                scope: z.object({ actorId: z.uuid() }).strict(), input: z.unknown() }).strict().parse(snapshot);
              if (parsed.actorId !== parsed.scope.actorId) throw unavailable();
              c = { operationId: parsed.operationId, actorId: parsed.actorId, scope: parsed.scope, feature: "moderation_assistant" };
            } else {
              const next = context({ ...snapshot, model: identity.model, contract: identity.contract }, false);
              // Configuration changes during an awaited stage must not write or
              // return results under an earlier model/prompt cache identity.
              if (c && (c.feature === "moderation_assistant" || digest(c.model) !== digest(next.model) || digest(c.contract) !== digest(next.contract))) throw unavailable();
              c = next;
            }
          },
        });
        if (result.mode === "fallback") {
          if (m && !denied) { try { await audit(m, "fallback", usage); } catch { /* Suppression retains its original reason. */ } }
          return result;
        }
        return result;
      } catch {
        if (m) { try { await audit(m, "fallback", usage); } catch { /* Content-free fail closed. */ } }
        return fallback();
      }
    },
    async cleanup(): Promise<void> {
      try {
        const result = await call("cleanup", {});
        if (!z.object({ ok: z.literal(true) }).strict().safeParse(result).success) throw unavailable();
      } catch { throw unavailable(); }
    },
  };
}
