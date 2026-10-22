import "server-only";
import { z } from "zod";

const maxima = {
  AI_GLOBAL_CALLS_PER_MINUTE: Number.MAX_SAFE_INTEGER,
  AI_GLOBAL_CALLS_PER_DAY: Number.MAX_SAFE_INTEGER,
  AI_USER_ACTIONS_PER_MINUTE: Number.MAX_SAFE_INTEGER,
  AI_USER_ACTIONS_PER_DAY: Number.MAX_SAFE_INTEGER,
  AI_BREW_FINDER_CALLS_PER_MINUTE: Number.MAX_SAFE_INTEGER,
  AI_PREP_ADVISOR_CALLS_PER_MINUTE: Number.MAX_SAFE_INTEGER,
  AI_MODERATION_CALLS_PER_MINUTE: Number.MAX_SAFE_INTEGER,
  AI_BREW_FINDER_CALLS_PER_ACTION: 2,
  AI_PREP_ADVISOR_CALLS_PER_ACTION: 1,
  AI_MODERATION_CALLS_PER_ACTION: 1,
  AI_PREP_REFRESHES_PER_DAY: Number.MAX_SAFE_INTEGER,
  AI_MODERATION_RUNS_PER_DAY: Number.MAX_SAFE_INTEGER,
  AI_MODERATION_REVIEWS_PER_CALL: 20,
} as const;
export type UsageLimits = Record<keyof typeof maxima, number>;
const integer = z.preprocess(
  (value) => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
);

/** Explicit server policy only: absent/invalid values never become unlimited. */
export function parseUsageLimits(input: Record<string, unknown>): UsageLimits | null {
  if (!input || typeof input !== "object") return null;
  const limits = {} as UsageLimits;
  for (const key of Object.keys(maxima) as (keyof UsageLimits)[]) {
    const parsed = integer.safeParse(input[key]);
    if (!parsed.success || parsed.data > maxima[key]) return null;
    limits[key] = parsed.data;
  }
  return limits;
}

const requestSchema = z.object({
  admissionId: z.uuid(), operationId: z.uuid(), actorId: z.uuid(), cafeId: z.uuid().optional(),
  feature: z.enum(["brew-finder", "prep-advisor", "moderation-assistant"]),
  event: z.enum(["action", "refresh", "run", "provider_attempt"]),
}).strict();
export type UsageRequest = z.infer<typeof requestSchema>;
export type UsageRpc = (fn: string, args: Record<string, unknown>) => Promise<{
  data: unknown; error: { message: string; code?: string } | null;
}>;
export type UsageAdmission = { reserve(request: UsageRequest): Promise<{ admitted: boolean }> };
export type UsageEnvironment = "local" | "ci" | "dev" | "prod";

/**
 * Server-internal boundary. Feature handlers supply verified actors, authorized
 * cafe identities and server-generated UUIDs, never browser admission objects.
 * SQL independently validates the actor/feature/cafe relationship.
 */
export function createUsageAdmission(options: {
  environment: UsageEnvironment; limits: UsageLimits | null; rpc: UsageRpc;
  /** Composed feature operations distinguish a storage outage from a quota denial. */
  throwOnUnavailable?: boolean;
  /** Trusted construction-only test seam. Production omits it and uses DB time. */
  databaseClock?: () => Promise<string>;
}): UsageAdmission {
  const policy = options.limits && parseUsageLimits(options.limits);
  const environment = z.enum(["local", "ci", "dev", "prod"]).safeParse(options.environment);
  const rpc = options.rpc;
  const clock = options.databaseClock;
  const throwOnUnavailable = options.throwOnUnavailable === true;
  const unavailable = () => {
    if (throwOnUnavailable) throw new Error("Usage admission unavailable.");
    return { admitted: false };
  };
  return {
    async reserve(input) {
      const request = requestSchema.safeParse(input);
      if (!policy || !environment.success || !request.success) return unavailable();
      try {
        const response = await rpc("reserve_ai_usage", {
          p_environment: environment.data, p_request: request.data, p_limits: policy,
          ...(clock ? { p_now: await clock() } : {}),
        });
        const rows = z.array(z.object({ admitted: z.boolean() })).length(1).safeParse(response.data);
        if (response.error || !rows.success) return unavailable();
        return { admitted: rows.data[0].admitted };
      } catch {
        // Database/transport detail can contain credentials; expose no raw error.
        return unavailable();
      }
    },
  };
}

type Tokens = { input?: number; output?: number; total?: number };
/** Caller has already authorized cached data and the deterministic fallback. */
export async function dispatchWithAdmission(input: {
  admission: UsageAdmission; request: UsageRequest; cached?: { value: unknown };
  provider: () => Promise<{ value: unknown; tokens?: Tokens }>;
}): Promise<{ outcome: "success" | "fallback"; value?: unknown; tokens?: Tokens; cost?: null }> {
  if (input.cached) return { outcome: "success", value: input.cached.value };
  if (input.request.event !== "provider_attempt") return { outcome: "fallback" };
  try {
    if (!(await input.admission.reserve(input.request)).admitted) return { outcome: "fallback" };
    const result = await input.provider();
    // Preserve provider-reported partial counts, including zero, without
    // estimating absent fields or inferring monetary cost from call counters.
    return { outcome: "success", value: result.value, tokens: result.tokens, cost: null };
  } catch {
    // Exactly one callback; an admitted failure stays charged. No retries/refunds.
    return { outcome: "fallback" };
  }
}
