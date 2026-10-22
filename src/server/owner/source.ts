import "server-only";
import { z } from "zod";
import { createSessionClient } from "@/server/supabase/session-client";
import { areas, type ApplicationInput, type OwnerCafe, type ResubmissionInput, type SettingsInput } from "@/lib/owner/cafe-input";

export type OwnerErrorCode = "INVALID_REQUEST" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "STATE_CONFLICT" | "INTERNAL_ERROR" | "SOURCE_UNAVAILABLE";
export class OwnerCafeError extends Error {
  constructor(readonly code: OwnerErrorCode, readonly suspension = false) { super(code); }
}

const instant = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
const interval = z.strictObject({ weekday: z.number().int().min(1).max(7), opensAt: z.string().regex(/^\d{2}:\d{2}$/), closesAt: z.string().regex(/^\d{2}:\d{2}$/), closesNextDay: z.boolean() });
const ownerCafe: z.ZodType<OwnerCafe> = z.strictObject({
  cafeId: z.string().min(1).max(128), name: z.string(), description: z.string(), area: z.enum(areas), pickupAddress: z.string(),
  openingHours: z.array(interval), pickupSettings: z.strictObject({ pickupCutoffMinutes: z.number().int().min(0).max(180) }),
  applicationState: z.enum(["pending", "approved", "rejected"]), submittedAt: instant,
  suspended: z.boolean(), suspensionVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  latestDecision: z.strictObject({ decision: z.enum(["approve", "reject"]), reason: z.string(), decidedAt: instant }).nullable(),
  suspensionReason: z.string().nullable(),
});
const failure = z.strictObject({ error: z.enum(["INVALID_REQUEST", "NOT_FOUND", "STATE_CONFLICT"]), suspension: z.literal(true).optional() });

/** Session-bound RPC: the database derives owner/workspace and applies RLS. */
async function rpc(name: string, args: Record<string, unknown>, mutation: boolean): Promise<unknown> {
  let client: Awaited<ReturnType<typeof createSessionClient>>;
  try { client = await createSessionClient({ retry: false }); }
  catch { throw new OwnerCafeError("SOURCE_UNAVAILABLE"); }
  try {
    const result = await client.rpc(name, args);
    if (result.error) {
      if (result.status === 401) throw new OwnerCafeError("UNAUTHENTICATED");
      if (result.error.code === "42501" || result.status === 403) throw new OwnerCafeError("FORBIDDEN");
      throw new OwnerCafeError(!mutation || result.status === 0 || [502, 503, 504].includes(result.status) ? "SOURCE_UNAVAILABLE" : "INTERNAL_ERROR");
    }
    const parsed = failure.safeParse(result.data);
    if (parsed.success) throw new OwnerCafeError(parsed.data.error, parsed.data.suspension === true);
    return result.data;
  } catch (error) {
    if (error instanceof OwnerCafeError) throw error;
    throw new OwnerCafeError(mutation ? "INTERNAL_ERROR" : "SOURCE_UNAVAILABLE");
  }
}
function decode<T>(schema: z.ZodType<T>, value: unknown, mutation: boolean): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new OwnerCafeError(mutation ? "INTERNAL_ERROR" : "SOURCE_UNAVAILABLE");
  return result.data;
}

/** The owner's own café, or null only when it has none. Source failures throw. */
export async function readOwnerCafe(): Promise<OwnerCafe | null> {
  return decode(z.strictObject({ cafe: ownerCafe.nullable() }), await rpc("owner_cafe", {}, false), false).cafe;
}
const written = z.strictObject({ cafe: ownerCafe, created: z.boolean() });
export async function submitApplication(input: ApplicationInput) {
  return decode(written, await rpc("submit_owner_cafe_application", { p_input: input }, true), true);
}
export async function resubmitApplication(input: ResubmissionInput) {
  return decode(written, await rpc("resubmit_owner_cafe_application", { p_input: input }, true), true);
}
export async function saveSettings(input: SettingsInput) {
  return decode(z.strictObject({ cafe: ownerCafe }), await rpc("save_owner_cafe_settings", { p_input: input }, true), true).cafe;
}
