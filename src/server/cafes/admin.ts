import "server-only";
import { z } from "zod";
import { getVerifiedActor } from "@/server/auth/session";
import { trustedOrigin } from "@/server/auth/account-adapter";
import { createSessionClient } from "@/server/supabase/session-client";
import { BodyOverflow, readBounded, privateResponses, checkOrigin, checkJsonContentType } from "@/server/http/json";

const ref = z.string().refine(value => [...value].length >= 1 && [...value].length <= 128);
const reason = z.string().refine(value => value.trim().length > 0 && [...value].length <= 300);
const decision = z.strictObject({ decision: z.enum(["approve", "reject"]), reason });
const suspension = z.strictObject({ suspended: z.boolean(), reason });
const outcome = z.union([
  z.strictObject({ applicationState: z.enum(["approved", "rejected"]) }),
  z.strictObject({ suspended: z.boolean() }),
  z.strictObject({ error: z.enum(["INVALID_REQUEST", "NOT_FOUND"]) }),
  z.strictObject({ error: z.literal("STATE_CONFLICT"), currentState: z.enum(["pending", "approved", "rejected", "suspended", "not suspended"]) }),
]);

export async function handleCafeAction(request: Request, cafeId: string, operation: "decision" | "suspension") {
  const { json, error } = privateResponses();
  if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED", "Method not allowed.", { Allow: "POST" });
  try {
    const originError = checkOrigin(request.headers.get("origin"), trustedOrigin(), error);
    if (originError) return originError;
    const mediaError = checkJsonContentType(request, error);
    if (mediaError) return mediaError;
    let body: unknown;
    try { body = JSON.parse(await readBounded(request.body, request.signal)); }
    catch (failure) {
      return failure instanceof BodyOverflow ? error(413, "PAYLOAD_TOO_LARGE", "Request body is too large.") : error(400, "INVALID_REQUEST", "Check the action and reason.");
    }
    const parsed = (operation === "decision" ? decision : suspension).safeParse(body);
    if (!parsed.success || !ref.safeParse(cafeId).success) return error(400, "INVALID_REQUEST", "Check the action and reason.");
    const actor = await getVerifiedActor();
    if (!actor) return error(401, "UNAUTHENTICATED", "Sign in to continue.");
    if (actor.role !== "admin") return error(403, "FORBIDDEN", "Admin access required.");
    const client = await createSessionClient({ retry: false });
    const args = { p_cafe_ref: cafeId, p_reason: parsed.data.reason };
    const result = "decision" in parsed.data
      ? await client.rpc("decide_cafe", { ...args, p_decision: parsed.data.decision })
      : await client.rpc("set_cafe_suspension", { ...args, p_suspended: parsed.data.suspended });
    if (result.error) {
      if (result.status === 0 || [502, 503, 504].includes(result.status)) return error(503, "SOURCE_UNAVAILABLE", "Unable to reach café data. Try again.");
      return error(500, "INTERNAL_ERROR", "Unable to save this café action. Try again.");
    }
    const value = outcome.parse(result.data);
    if (!("error" in value)) {
      if (operation === "decision" && "applicationState" in value) return json(value);
      if (operation === "suspension" && "suspended" in value) return json(value);
      throw new Error("Unexpected cafe action response");
    }
    if (value.error === "STATE_CONFLICT") return error(409, value.error, `Café record changed. Current state: ${value.currentState}.`);
    if (value.error === "NOT_FOUND") return error(404, value.error, "Café not found.");
    return error(400, value.error, "Check the action and reason.");
  } catch { return error(500, "INTERNAL_ERROR", "Unable to save this café action. Try again."); }
}

export const cafeQueueRow = z.object({ id: z.uuid(), name: z.string(), description: z.string(), area: z.string(), pickup_address: z.string(),
  pickup_cutoff_minutes: z.number().int().min(0).max(180), submitted_at: z.string(), suspended: z.boolean(),
  opening_hours: z.array(z.object({ weekday: z.number().int().min(1).max(7), opensAt: z.string(), closesAt: z.string(), closesNextDay: z.boolean() })) });
