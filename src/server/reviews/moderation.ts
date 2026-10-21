import "server-only";
import { z } from "zod";
import { getVerifiedActor } from "@/server/auth/session";
import { trustedOrigin } from "@/server/auth/account-adapter";
import { createSessionClient } from "@/server/supabase/session-client";
import { BodyOverflow, readBounded, privateResponses, checkOrigin, checkJsonContentType } from "@/server/http/json";

const ref = z.string().refine(v => [...v].length >= 1 && [...v].length <= 128);
const fields = z.strictObject({ action: z.enum(["keep", "hide", "restore"]), reason: z.string().refine(v => v.trim().length > 0 && [...v].length <= 300) });
const outcome = z.union([
  z.strictObject({ moderationState: z.enum(["kept", "hidden"]) }),
  z.strictObject({ error: z.enum(["INVALID_REQUEST", "NOT_FOUND"]) }),
  z.strictObject({ error: z.literal("STATE_CONFLICT"), currentState: z.enum(["pending", "kept", "hidden"]) }),
]);

export async function handleModeration(request: Request, reviewId: string) {
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
    const parsed = fields.safeParse(body);
    if (!parsed.success || !ref.safeParse(reviewId).success) return error(400, "INVALID_REQUEST", "Check the action and reason.");
    const actor = await getVerifiedActor();
    if (!actor) return error(401, "UNAUTHENTICATED", "Sign in to continue.");
    if (actor.role !== "admin") return error(403, "FORBIDDEN", "Admin access required.");
    const client = await createSessionClient({ retry: false });
    const result = await client.rpc("moderate_review", { p_review_ref: reviewId, p_action: parsed.data.action, p_reason: parsed.data.reason });
    if (result.error) return error(500, "INTERNAL_ERROR", "Unable to moderate this review. Try again.");
    const value = outcome.parse(result.data);
    if ("moderationState" in value) return json(value);
    if (value.error === "STATE_CONFLICT") return error(409, value.error, `Review record changed. Current state: ${value.currentState}.`);
    if (value.error === "NOT_FOUND") return error(404, value.error, "Review not found.");
    return error(400, value.error, "Check the action and reason.");
  } catch { return error(500, "INTERNAL_ERROR", "Unable to moderate this review. Try again."); }
}

export const reviewRow = z.object({ id: z.uuid(), rating: z.number().int().min(1).max(5), text: z.string(), submitted_at: z.string(), moderation_state: z.enum(["pending", "kept", "hidden"]), cafe_name: z.string() });
export const auditActions = ["approve", "reject", "suspend", "un-suspend", "keep", "hide", "restore"] as const;
export const auditRow = z.object({ id: z.uuid(), created_at: z.string(), admin_email: z.string(), action: z.enum(auditActions), target_type: z.enum(["cafe", "review"]), target_id: z.uuid(), cafe_name: z.string(), reason: z.string() });
export function pageNumber(value: string | string[] | undefined) {
  const n = typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(n) && n <= 2_147_483_647 ? n : 1;
}
export { queueSize } from "./queue-config";
export const singaporeTime = (value: string) => new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
