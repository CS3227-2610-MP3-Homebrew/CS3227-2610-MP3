import "server-only";
import { getVerifiedActor } from "@/server/auth/session";
import { trustedOrigin } from "@/server/http/origin";
import { BodyOverflow, checkJsonContentType, checkOrigin, privateResponses, readBounded } from "@/server/http/json";
import { suspensionConflictMessage } from "@/lib/owner/cafe-input";
import { approvalConflictMessage, validateMenuInput, type MenuAction } from "@/lib/owner/menu-input";
import { OwnerMenuError, readOwnerMenu, writeOwnerMenu } from "./menu";
import { menuPage, menuQueryInvalidHeader } from "./menu-query";

const status = { INVALID_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, STATE_CONFLICT: 409, INTERNAL_ERROR: 500, SOURCE_UNAVAILABLE: 503 };
const messages = {
  INVALID_REQUEST: "Check the menu item and try again.",
  UNAUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "Café owner access required.",
  // Identical for missing, foreign and other-workspace items.
  NOT_FOUND: "Requested record not found.",
  STATE_CONFLICT: "Another item on your menu already has this name.",
  INTERNAL_ERROR: "Unable to save menu changes. Try again.",
  SOURCE_UNAVAILABLE: "Menu information is temporarily unavailable. Try again.",
};

type Responses = ReturnType<typeof privateResponses>;
function safeFailure(failure: unknown, responses: Responses, mutation: boolean) {
  const error = failure instanceof OwnerMenuError ? failure : new OwnerMenuError(mutation ? "INTERNAL_ERROR" : "SOURCE_UNAVAILABLE");
  const message = error.conflict === "approval" ? approvalConflictMessage : error.conflict === "suspension" ? suspensionConflictMessage : messages[error.code];
  return responses.error(status[error.code], error.code, message);
}
/** Verified owner session; role is checked before any owner source is read. */
async function requireOwner() {
  const actor = await getVerifiedActor().catch(() => { throw new OwnerMenuError("SOURCE_UNAVAILABLE"); });
  if (!actor) throw new OwnerMenuError("UNAUTHENTICATED");
  if (actor.role !== "owner") throw new OwnerMenuError("FORBIDDEN");
}

export async function ownerMenuGet(request: Request) {
  const responses = privateResponses();
  try {
    await requireOwner();
    const page = menuPage(new URL(request.url).searchParams);
    if (page === null || request.headers.get(menuQueryInvalidHeader) === "1" || request.body) throw new OwnerMenuError("INVALID_REQUEST");
    return responses.json(await readOwnerMenu(page));
  } catch (error) { return safeFailure(error, responses, false); }
}

export async function ownerMenuPost(request: Request, action: MenuAction, itemId: string | null = null) {
  const responses = privateResponses();
  try {
    const originError = checkOrigin(request.headers.get("origin"), trustedOrigin(), responses.error);
    if (originError) return originError;
    const mediaError = checkJsonContentType(request, responses.error);
    if (mediaError) return mediaError;
    await requireOwner();
    if (new URL(request.url).search !== "") throw new OwnerMenuError("INVALID_REQUEST");
    let body: unknown;
    try { body = JSON.parse(await readBounded(request.body, request.signal)); }
    catch (error) {
      if (error instanceof BodyOverflow) return responses.error(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
      return responses.error(400, "INVALID_REQUEST", "Request body must be valid JSON.");
    }
    // Strict validation precedes any source admission or mutation.
    const validation = validateMenuInput(action, body);
    if (!validation.success) return responses.error(400, "INVALID_REQUEST", messages.INVALID_REQUEST);
    const result = await writeOwnerMenu(action, itemId, validation.data);
    return responses.json(result, action === "create" ? 201 : 200);
  } catch (error) { return safeFailure(error, responses, true); }
}

export function ownerMenuMethodNotAllowed(allow: string) {
  return () => privateResponses().error(405, "METHOD_NOT_ALLOWED", "Method not allowed.", { Allow: allow });
}
