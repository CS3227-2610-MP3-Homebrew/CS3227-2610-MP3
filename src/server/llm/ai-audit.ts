import "server-only";
import { z } from "zod";
import type { UsageEnvironment, UsageRpc } from "./usage";
import { instant } from "./cache-schema";

const tokens = z.object({
  input: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  output: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
}).strict();
const metadataSchema = z.object({
  operationId: z.uuid(), actorId: z.uuid(), cafeId: z.uuid().optional(),
  feature: z.enum(["brew_finder", "prep_advisor", "moderation_assistant"]),
  scope: z.union([z.object({ actorId: z.uuid() }).strict(), z.object({ cafeId: z.uuid(), businessDate: z.iso.date() }).strict()]),
}).strict();
const validScope = (e: z.infer<typeof metadataSchema>) => e.feature === "prep_advisor"
  ? "cafeId" in e.scope && e.cafeId === e.scope.cafeId
  : "actorId" in e.scope && e.actorId === e.scope.actorId && e.cafeId === undefined;
export const auditMetadataSchema = metadataSchema.refine(validScope);
export type AiAuditMetadata = z.infer<typeof auditMetadataSchema>;
const eventSchema = metadataSchema.extend({
  outcome: z.enum(["started", "cache", "provider_attempt", "success", "fallback", "denied"]),
  tokens: tokens.optional(),
}).refine(e => validScope(e) && !(e.feature === "moderation_assistant" && e.outcome === "cache"));
export type AiAuditEvent = z.infer<typeof eventSchema>;

/** Shared content-free AI audit, including transient Moderation Assistant use.
 * Feature boundaries call this with verified, server-generated metadata only.
 * False is an unavailable audit prerequisite, never permission to dispatch. */
export function createAiAudit(options: { environment: UsageEnvironment; rpc: UsageRpc; databaseClock?: () => Promise<string> }) {
  const environment = z.enum(["local", "ci", "dev", "prod"]).parse(options.environment);
  const { rpc, databaseClock } = options;
  if (databaseClock && !["local", "ci"].includes(environment)) throw new Error("AI audit unavailable.");
  return {
    async record(input: AiAuditEvent): Promise<boolean> {
      try {
        const parsed = eventSchema.safeParse(input);
        if (!parsed.success) return false;
        const clock = databaseClock ? instant.parse(await databaseClock()) : undefined;
        const response = await rpc("ai_state", { p_environment: environment, p_action: "audit", p_request: parsed.data, ...(clock ? { p_now: clock } : {}) });
        return !response.error && z.array(z.object({ result: z.object({ ok: z.literal(true) }).strict() }).strict()).length(1).safeParse(response.data).success;
      } catch { return false; }
    },
  };
}
