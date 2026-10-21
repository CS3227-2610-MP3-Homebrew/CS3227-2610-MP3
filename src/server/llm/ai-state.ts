import "server-only";
import { randomUUID } from "node:crypto";
import { createAiAudit, type AiAuditEvent } from "./ai-audit";
import { z } from "zod";
import { brewSourceRevision, prepSourceRevision, cacheKey, canonicalJson, digest } from "./cache-identity";
import { contextSchema, envelopeSchema, instant, validateResult, type CacheContext, type CacheResult } from "./cache-schema";
import type { UsageAdmission, UsageEnvironment, UsageRequest, UsageRpc } from "./usage";

export type AiCacheContext = {
  operationId: string; actorId: string; cafeId?: string; feature: "brew_finder" | "prep_advisor";
  scope: { actorId: string } | { cafeId: string; businessDate: string };
  input: Record<string, unknown>; source: Record<string, unknown>;
  model: Record<string, unknown>; contract: Record<string, unknown>;
};
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
  function context(input: AiCacheContext): CacheContext {
    // Validation clones the data, preventing caller mutation while work is in flight.
    const parsed = contextSchema.parse(input);
    // Ensure every identity component is canonical JSON, with no ignored undefined values.
    canonicalJson(input);
    const providerInput = parsed.feature === "brew_finder" ? { query: parsed.input.query, candidates: parsed.source.candidates } : parsed.source;
    if (Buffer.byteLength(canonicalJson(providerInput), "utf8") > 65_536) throw unavailable();
    if (!enabled()) throw unavailable();
    return parsed;
  }
  const metadata = (c: CacheContext) => ({ actorId: c.actorId, ...(c.cafeId ? { cafeId: c.cafeId } : {}), operationId: c.operationId, feature: c.feature, scope: c.scope });
  function identity(c: CacheContext) {
    const ids = { inputFingerprint: digest(c.input), sourceRevision: c.feature === "brew_finder" ? brewSourceRevision(c.source) : prepSourceRevision(c.source), modelIdentity: digest(c.model), contractIdentity: digest(c.contract) };
    return { ...metadata(c), identity: ids, key: cacheKey({ environment, feature: c.feature, scope: c.scope, ...ids }) };
  }
  async function authorized(c: CacheContext, data?: CacheResult) {
    if (!enabled()) return false;
    const auth = z.object({ now: instant }).strict().safeParse(await call("authorize", metadata(c)));
    if (!auth.success) return false;
    const ids = z.array(z.uuid()).parse(await eligibleCafeIds(c.actorId));
    if (c.feature === "prep_advisor") return ids.includes(c.cafeId!);
    return !data || data.suggestions.every(s => "cafeId" in s && ids.includes(s.cafeId));
  }
  async function read(c: CacheContext): Promise<Envelope | null> {
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
    if (!data || !(await authorized(c, data))) return null;
    return { ...envelope, data };
  }
  async function write(c: CacheContext, candidate: unknown): Promise<boolean> {
    const data = validateResult(c, candidate);
    if (!data || Buffer.byteLength(canonicalJson(data), "utf8") > 65_536 || !(await authorized(c, data))) return false;
    const stored = await call("write", { ...identity(c), data });
    return envelopeSchema.safeParse(stored).success;
  }
  async function audit(c: CacheContext, outcome: AiAuditEvent["outcome"]) {
    if (!(await aiAudit.record({ ...metadata(c), outcome }))) throw unavailable();
  }
  const request = (c: CacheContext, event: UsageRequest["event"]): UsageRequest => ({ admissionId: randomUUID(), operationId: c.operationId, actorId: c.actorId, cafeId: c.cafeId, feature: c.feature === "brew_finder" ? "brew-finder" : "prep-advisor", event });
  return {
    async readCache(input: AiCacheContext): Promise<Envelope | null> {
      try { return await read(context(input)); } catch { return null; }
    },
    async writeCache(input: AiCacheContext, result: unknown): Promise<boolean> {
      try { return await write(context(input), result); } catch { return false; }
    },
    async invoke(input: AiCacheContext, invocation: { refresh?: boolean; provider: () => Promise<unknown> }): Promise<Outcome> {
      let c: CacheContext | undefined;
      try {
        c = context(input);
        if (!(await authorized(c))) return { outcome: "fallback" };
        // The initial durable audit establishes storage availability before dispatch.
        await audit(c, "started");
        const event = invocation.refresh ? "refresh" : "action";
        if (!(await admission.reserve(request(c, event))).admitted) {
          await audit(c, "denied"); return { outcome: "fallback" };
        }
        if (!invocation.refresh) {
          const cached = await read(c);
          if (cached) {
            await audit(c, "cache");
            return await authorized(c, cached.data) ? { outcome: "cache", data: cached.data } : { outcome: "fallback" };
          }
        }
        if (!(await authorized(c))) { await audit(c, "fallback"); return { outcome: "fallback" }; }
        if (!(await admission.reserve(request(c, "provider_attempt"))).admitted) {
          await audit(c, "denied"); return { outcome: "fallback" };
        }
        await audit(c, "provider_attempt");
        // One callback and one reservation. Failed/429/invalid attempts stay charged.
        const result = await invocation.provider();
        if (!enabled() || !(await write(c, result))) { await audit(c, "fallback"); return { outcome: "fallback" }; }
        await audit(c, "success");
        const cached = await read(c);
        return cached ? { outcome: "success", data: cached.data } : { outcome: "fallback" };
      } catch {
        if (c) { try { await audit(c, "fallback"); } catch { /* Fail closed without exposing storage/provider detail. */ } }
        return { outcome: "fallback" };
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
