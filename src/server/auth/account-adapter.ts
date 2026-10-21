import "server-only";
import { createClient, type AuthError } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getConfiguration } from "@/server/config";
import { accountActor, AccountOperationError, createAccountHandlers, type AccountFault, type AccountOperation, type AccountResult } from "./accounts";
import { isAuthCookie, isSourceFailure } from "./account-access";
import { createAccountTransport } from "./account-transport";

/** Server deployment setting only; request host/forwarding headers never supply trust. */
function trustedOrigin() {
  const configured = process.env.APP_ORIGIN ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const environment = getConfiguration().environment;
  const value = configured ?? (["local", "ci"].includes(environment) ? `http://127.0.0.1:${process.env.PORT ?? "3000"}` : "");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== value || url.username || url.password) throw new Error("Account origin unavailable.");
  return value;
}
function authFault(error: AuthError, retryAfter?: string): AccountFault {
  if (["email_exists", "user_already_exists"].includes(error.code ?? "")) return { kind: "duplicate" };
  if (error.status === 429) return { kind: "throttled", ...(retryAfter ? { retryAfter } : {}) };
  if (error.code === "invalid_credentials") return { kind: "credentials" };
  return { kind: isSourceFailure(error) ? "unavailable" : "unexpected" };
}

/** One request, isolated provisional cookie buffer, session-bound reads only. */
export async function handleAccountRequest(operation: AccountOperation, request: Request) {
  try {
    const configuration = getConfiguration();
    const origin = trustedOrigin();
    const jar = await cookies();
    const transport = createAccountTransport(configuration.public.NEXT_PUBLIC_SUPABASE_URL);
    const fault = (error: AuthError) => authFault(error, transport.takeRetryAfter());
    const staged = new Map<string, { name: string; value: string; options: CookieOptions }>();
    const committed = new Map<string, { name: string; value: string; options: CookieOptions }>();
    // Even SDK initialization stays behind transport/field admission: registering
    // its storage listener may load/refresh an existing session immediately.
    let session: ReturnType<typeof createServerClient> | undefined;
    const sessionClient = () => session ??= createServerClient(configuration.public.NEXT_PUBLIC_SUPABASE_URL, configuration.public.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      db: { retry: false },
      global: { fetch: transport.fetch },
      cookieOptions: { httpOnly: true, sameSite: "lax", secure: new URL(origin).protocol === "https:" },
      cookies: {
        getAll: () => jar.getAll().map((cookie) => staged.get(cookie.name) ?? cookie).concat([...staged.values()].filter((cookie) => !jar.getAll().some((old) => old.name === cookie.name))),
        setAll: (values) => { for (const cookie of values) staged.set(cookie.name, cookie); },
      },
    });
    const privileged = () => {
      if (!configuration.supabase.secretKey) throw new Error("Account provisioning unavailable.");
      return createClient(configuration.public.NEXT_PUBLIC_SUPABASE_URL, configuration.supabase.secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, db: { retry: false }, global: { fetch: transport.fetch } });
    };
    const handlers = createAccountHandlers({
      trustedOrigin: origin,
      // Protected foundation migration establishes this immutable main identity.
      mainWorkspaceId: "00000000-0000-4000-8000-000000000001",
      async currentIdentity() {
        const result = await sessionClient().auth.getUser();
        if (result.error && result.error.name !== "AuthSessionMissingError" && isSourceFailure(result.error)) throw new AccountOperationError(fault(result.error));
        return result.data.user?.id ?? null;
      },
      async createIdentity(input) {
        const result = await privileged().auth.admin.createUser({ ...input, email_confirm: true });
        if (result.error) return { error: fault(result.error) };
        if (!result.data.user) return { error: { kind: "unexpected" } };
        return { data: { id: result.data.user.id } };
      },
      async createProfile(input) {
        const result = await privileged().rpc("create_signup_profile", { identity_id: input.id, selected_role: input.role });
        const actor = accountActor.safeParse(result.data);
        if (result.error || !actor.success || actor.data.id !== input.id || actor.data.workspaceId !== input.workspaceId || actor.data.role !== input.role) return { error: { kind: "unavailable" } };
        return { data: actor.data };
      },
      async deleteIdentity(id) {
        const result = await privileged().auth.admin.deleteUser(id);
        return result.error ? { error: fault(result.error) } : { data: null };
      },
      async signIn(input) {
        const result = await sessionClient().auth.signInWithPassword(input);
        if (result.error) return { error: fault(result.error) };
        return result.data.user ? { data: { id: result.data.user.id } } : { error: { kind: "unexpected" } };
      },
      async readProfile(id): Promise<AccountResult<unknown>> {
        const result = await sessionClient().from("profiles").select("id, workspace_id, role").eq("id", id).maybeSingle();
        return result.error ? { error: { kind: "unavailable" } } : { data: result.data ? { id: result.data.id, workspaceId: result.data.workspace_id, role: result.data.role } : null };
      },
      async persistSession() { for (const [name, value] of staged) committed.set(name, value); },
      async clearSession() {
        const names = new Set([...jar.getAll().map((cookie) => cookie.name), ...staged.keys()].filter(isAuthCookie));
        for (const name of names) committed.set(name, { name, value: "", options: { path: "/", httpOnly: true, sameSite: "lax", secure: new URL(origin).protocol === "https:", maxAge: 0 } });
        staged.clear();
      },
      async revokeSession(scope) {
        const result = await sessionClient().auth.signOut({ scope });
        return result.error ? { error: fault(result.error) } : { data: null };
      },
    });
    const result = await handlers[operation](request);
    const response = new NextResponse(result.body, { status: result.status, headers: result.headers });
    for (const cookie of committed.values()) response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch {
    return Response.json({ requestId: crypto.randomUUID(), error: { code: "SOURCE_UNAVAILABLE", message: "Account service is temporarily unavailable. Try again." } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
