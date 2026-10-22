import "server-only";
import { getVerifiedActor } from "@/server/auth/session";
import { trustedOrigin } from "@/server/http/origin";
import { BodyOverflow, checkJsonContentType, checkOrigin, privateResponses, readBounded } from "@/server/http/json";
import { suspensionConflictMessage, validateOwnerInput, type OwnerInputKind } from "@/lib/owner/cafe-input";
import { OwnerCafeError, readOwnerCafe, resubmitApplication, saveSettings, submitApplication, type OwnerErrorCode } from "./source";

const status: Record<OwnerErrorCode, number> = { INVALID_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, STATE_CONFLICT: 409, INTERNAL_ERROR: 500, SOURCE_UNAVAILABLE: 503 };
const messages: Record<OwnerErrorCode, string> = {
  INVALID_REQUEST: "Check the café details and try again.",
  UNAUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "Café owner access required.",
  NOT_FOUND: "Requested record not found.",
  // Generic: never identifies another café, owner or workspace.
  STATE_CONFLICT: "This request conflicts with the current café registration. Review the application page and try again.",
  INTERNAL_ERROR: "Unable to save café changes. Try again.",
  SOURCE_UNAVAILABLE: "Café information is temporarily unavailable. Try again.",
};

type Responses = ReturnType<typeof privateResponses>;
function safeFailure(failure: unknown, responses: Responses, mutation: boolean) {
  const error = failure instanceof OwnerCafeError ? failure : new OwnerCafeError(mutation ? "INTERNAL_ERROR" : "SOURCE_UNAVAILABLE");
  return responses.error(status[error.code], error.code, error.suspension ? suspensionConflictMessage : messages[error.code]);
}
/** Verified owner session; role is checked before any owner source is read. */
async function requireOwner() {
  const actor = await getVerifiedActor().catch(() => { throw new OwnerCafeError("SOURCE_UNAVAILABLE"); });
  if (!actor) throw new OwnerCafeError("UNAUTHENTICATED");
  if (actor.role !== "owner") throw new OwnerCafeError("FORBIDDEN");
}

export async function ownerCafeGet(request: Request) {
  const responses = privateResponses();
  try {
    await requireOwner();
    if (new URL(request.url).search !== "" || request.body) throw new OwnerCafeError("INVALID_REQUEST");
    return responses.json({ cafe: await readOwnerCafe() });
  } catch (error) { return safeFailure(error, responses, false); }
}

const operations = {
  application: async (input: unknown) => {
    const result = await submitApplication(input as never);
    return { cafe: result.cafe, status: result.created ? 201 : 200 };
  },
  resubmission: async (input: unknown) => ({ cafe: (await resubmitApplication(input as never)).cafe, status: 200 }),
  settings: async (input: unknown) => ({ cafe: await saveSettings(input as never), status: 200 }),
} satisfies Record<OwnerInputKind, (input: unknown) => Promise<{ cafe: unknown; status: number }>>;

export async function ownerCafePost(request: Request, kind: OwnerInputKind) {
  const responses = privateResponses();
  try {
    const originError = checkOrigin(request.headers.get("origin"), trustedOrigin(), responses.error);
    if (originError) return originError;
    const mediaError = checkJsonContentType(request, responses.error);
    if (mediaError) return mediaError;
    await requireOwner();
    if (new URL(request.url).search !== "") throw new OwnerCafeError("INVALID_REQUEST");
    let body: unknown;
    try { body = JSON.parse(await readBounded(request.body, request.signal)); }
    catch (error) {
      if (error instanceof BodyOverflow) return responses.error(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
      return responses.error(400, "INVALID_REQUEST", "Request body must be valid JSON.");
    }
    // Strict validation precedes any source admission or mutation.
    const validation = validateOwnerInput(kind, body);
    if (!validation.ok) return responses.error(400, "INVALID_REQUEST", validation.message);
    const result = await operations[kind](validation.value);
    return responses.json({ cafe: result.cafe }, result.status);
  } catch (error) { return safeFailure(error, responses, true); }
}

export function ownerMethodNotAllowed(allow: string) {
  return () => privateResponses().error(405, "METHOD_NOT_ALLOWED", "Method not allowed.", { Allow: allow });
}
