import "server-only";
import { z } from "zod";
import { parseUsageLimits } from "./usage";
import { type Feature, type Input, type BrewInput, type ModerationInput } from "./schemas";

export const BYTE_LIMIT = 65_536;
export class BodyOverflow extends Error {}

/** Bounds bytes as they arrive. Cancellation never waits for a remote stream. */
export async function readBounded(body: ReadableStream<Uint8Array> | null, signal?: AbortSignal): Promise<string> {
  if (!body) throw new Error("Missing body.");
  const reader = body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  const cancel = () => { void reader.cancel().catch(() => {}); };
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => { cancel(); reject(new Error("Cancelled.")); };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
  try {
    if (signal?.aborted) throw new Error("Cancelled.");
    while (true) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      size += value.byteLength;
      if (size > BYTE_LIMIT) throw new BodyOverflow();
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    cancel();
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

const settingsSchema = z.object({
  APP_ENV: z.enum(["local", "ci", "dev", "prod"]),
  AI_PROVIDER: z.enum(["fake", "soclaas", "disabled"]),
  SOCLAAS_API_KEY: z.string().optional(),
  SOCLAAS_BASE_URL: z.url().refine((v) => {
    const url = new URL(v);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
  }),
  SOCLAAS_MODEL: z.string().trim().min(1),
  SOCLAAS_REASONING_EFFORT: z.string().trim().min(1),
}).refine((v) => !(v.APP_ENV === "prod" && v.AI_PROVIDER === "fake"));
export function operationSettings(value: Record<string, unknown>) {
  // Disable/missing-key precedence also works with otherwise incomplete config.
  if (value.AI_PROVIDER === "disabled" || (value.AI_PROVIDER === "soclaas" &&
    (value.SOCLAAS_API_KEY == null || (typeof value.SOCLAAS_API_KEY === "string" && !value.SOCLAAS_API_KEY.trim())))) return { state: "disabled" } as const;
  const parsed = settingsSchema.safeParse(value);
  const limits = parseUsageLimits(value);
  if (!parsed.success || !limits) return { state: "unavailable" } as const;
  const settings = parsed.data;
  const url = new URL(settings.SOCLAAS_BASE_URL);
  // The configured service root may include a prefix, with at most one terminal v1.
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.filter((p) => p === "v1").length > 1 || segments.some((p, n) => p === "v1" && n !== segments.length - 1)) return { state: "unavailable" } as const;
  if (segments.at(-1) !== "v1") segments.push("v1");
  url.pathname = `/${segments.join("/")}/chat/completions`;
  return { state: "enabled", settings, limits, url: url.toString() } as const;
}
export type Transport = (request: Request) => Promise<Response>;

/** Native HTTP transport makes exactly one dispatch: no SDK or automatic retries. */
export const soclaasTransport: Transport = (request) => fetch(request);

/** Deterministic local/CI provider. It uses the identical envelope/result gate. */
export function fakeResponse(feature: Feature, input: Input): Response {
  let result: unknown;
  if (feature === "brew_finder") result = { suggestions: (input as BrewInput).candidates.slice(0, 5).map((c) => ({
    cafeId: c.cafeId, itemId: c.items[0].itemId, reason: "Suggested from the supplied catalogue.",
  })) };
  else if (feature === "prep_advisor") result = { suggestions: [] };
  else result = { classifications: (input as ModerationInput).reviews.map((r) => ({
    reviewId: r.reviewId, label: "ok", reason: "Deterministic fake advice for manual review.",
  })) };
  return Response.json({ choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(result) } }] });
}
