import "server-only";
import { z } from "zod";
import { accountMessages, roleHomes, signInFields, signUpFields } from "@/lib/accounts/fields";
import { validRetryAfter } from "./account-transport";

export const accountActor = z.object({ id: z.uuid(), workspaceId: z.uuid(), role: z.enum(["customer", "owner", "admin"]) });
type Actor = z.infer<typeof accountActor>;
export type AccountFault = { kind: "credentials" | "duplicate" | "unavailable" | "throttled" | "unexpected"; retryAfter?: string };
export type AccountResult<T> = { data: T; error?: never } | { data?: never; error: AccountFault };
export interface AccountDependencies {
  trustedOrigin: string;
  mainWorkspaceId: string;
  currentIdentity(): Promise<string | null>;
  createIdentity(input: { email: string; password: string }): Promise<AccountResult<{ id: string }>>;
  createProfile(input: Actor): Promise<AccountResult<Actor>>;
  deleteIdentity(id: string): Promise<AccountResult<null>>;
  signIn(input: { email: string; password: string }): Promise<AccountResult<{ id: string }>>;
  readProfile(id: string): Promise<AccountResult<unknown>>;
  persistSession(): Promise<void>;
  clearSession(): Promise<void>;
  revokeSession(scope: "local"): Promise<AccountResult<null>>;
}
export type AccountOperation = "signUp" | "signIn" | "signOut";
export class AccountOperationError extends Error {
  constructor(readonly fault: AccountFault) { super("Account operation unavailable."); }
}

export function createAccountHandlers(deps: AccountDependencies) {
  async function handle(operation: AccountOperation, request: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    const json = (body: object, status = 200, headers: Record<string, string> = {}) => Response.json({ requestId, ...body }, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
    const error = (status: number, code: string, message: string, headers?: Record<string, string>) => json({ error: { code, message } }, status, headers);
    const success = (redirectTo: string) => json({ redirectTo });
    const fault = (value: AccountFault) => {
      if (value.kind === "credentials") return error(401, "UNAUTHENTICATED", "Email or password is incorrect.");
      if (value.kind === "duplicate") return error(409, "STATE_CONFLICT", "Unable to create account. Try signing in.");
      if (value.kind === "unavailable") return error(503, "SOURCE_UNAVAILABLE", accountMessages.retry);
      const retryAfter = validRetryAfter(value.retryAfter);
      if (value.kind === "throttled") return error(429, "RATE_LIMITED", "Too many attempts. Try again later.", retryAfter ? { "Retry-After": retryAfter } : {});
      return error(500, "INTERNAL_ERROR", accountMessages.unexpected);
    };
    const invalid = () => error(400, "INVALID_REQUEST", "Check the account fields and try again.");
    if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED", "Method not allowed.", { Allow: "POST" });
    if (request.headers.get("origin") !== deps.trustedOrigin) return error(403, "FORBIDDEN", "Request origin is not allowed.");
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json.");
    // Count actual streamed bytes rather than trusting Content-Length or buffering an unbounded body.
    let body: unknown;
    try {
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      if (reader) while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 65_536) { await reader.cancel(); return error(413, "PAYLOAD_TOO_LARGE", "Request body is too large."); }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch { return invalid(); }
    const fields = operation === "signUp" ? signUpFields.safeParse(body) : operation === "signIn" ? signInFields.safeParse(body) : z.strictObject({}).safeParse(body);
    if (!fields.success) return invalid();
    let provisional = false;
    try {
      const current = await deps.currentIdentity();
      if (operation === "signOut") {
        let confirmed = true;
        try { if (current) confirmed = !(await deps.revokeSession("local")).error; }
        catch { confirmed = false; }
        await deps.clearSession();
        return success(confirmed ? "/sign-in" : "/sign-in?notice=sign-out-unconfirmed");
      }
      if (current) return error(409, "STATE_CONFLICT", "An account is already signed in.");
      const credentials = signInFields.parse(operation === "signUp" ? { email: (fields.data as z.infer<typeof signUpFields>).email, password: (fields.data as z.infer<typeof signUpFields>).password } : fields.data);
      if (operation === "signUp") {
        const selection = signUpFields.parse(fields.data);
        const created = await deps.createIdentity(credentials);
        if (created.error) return fault(created.error);
        provisional = true;
        let profile: AccountResult<Actor>;
        try { profile = await deps.createProfile({ id: created.data.id, workspaceId: deps.mainWorkspaceId, role: selection.role }); }
        catch { profile = { error: { kind: "unexpected" } }; }
        if (profile.error) {
          let cleaned = false;
          try { cleaned = !(await deps.deleteIdentity(created.data.id)).error; } catch { /* One bounded cleanup attempt only. */ }
          await deps.clearSession(); provisional = false;
          return cleaned ? error(503, "SOURCE_UNAVAILABLE", "Unable to complete account setup. Try again.") : error(500, "INTERNAL_ERROR", "Account setup could not be completed. Try signing in; account access is unavailable until setup is resolved.");
        }
        try {
          const login = await deps.signIn(credentials);
          if (login.error || login.data.id !== created.data.id) throw new Error("Initial session unavailable.");
          const resolved = await deps.readProfile(login.data.id);
          const actor = accountActor.safeParse(resolved.data);
          if (resolved.error || !actor.success || actor.data.id !== created.data.id || actor.data.workspaceId !== deps.mainWorkspaceId || actor.data.role !== selection.role) throw new Error("Initial profile unavailable.");
          await deps.persistSession(); provisional = false;
          return success(roleHomes[actor.data.role]);
        } catch {
          await deps.clearSession(); provisional = false;
          return success("/sign-in?notice=account-created");
        }
      }
      provisional = true;
      const login = await deps.signIn(credentials);
      if (login.error) { await deps.clearSession(); provisional = false; return fault(login.error); }
      const profile = await deps.readProfile(login.data.id);
      if (profile.error) { await deps.clearSession(); provisional = false; return fault(profile.error); }
      const actor = accountActor.safeParse(profile.data);
      if (!actor.success || actor.data.id !== login.data.id) {
        await deps.clearSession(); provisional = false;
        return error(403, "FORBIDDEN", accountMessages.unavailable);
      }
      await deps.persistSession(); provisional = false;
      return success(roleHomes[actor.data.role]);
    } catch (failure) {
      if (operation === "signOut") {
        try { await deps.clearSession(); return success("/sign-in?notice=sign-out-unconfirmed"); } catch { /* No clearance claim without clearance. */ }
      } else if (provisional) { try { await deps.clearSession(); } catch { /* Fail closed. */ } }
      return failure instanceof AccountOperationError ? fault(failure.fault) : error(500, "INTERNAL_ERROR", accountMessages.unexpected);
    }
  }
  return { signUp: (request: Request) => handle("signUp", request), signIn: (request: Request) => handle("signIn", request), signOut: (request: Request) => handle("signOut", request) };
}
