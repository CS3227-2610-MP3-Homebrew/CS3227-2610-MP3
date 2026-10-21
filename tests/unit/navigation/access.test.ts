// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { actor } from "../../integration/accounts/contracts";

const fixture = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), cookies: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: fixture.getUser }, from: fixture.from }) }));
vi.mock("next/headers", () => ({ cookies: fixture.cookies }));
type Access = { kind: "verified"; actor: typeof actor } | { kind: "anonymous" | "session-ended" | "unavailable" | "retry" };
async function access(): Promise<Access> {
  const path = resolve("src/server/auth/account-access.ts");
  expect(existsSync(path), "Missing implementation: src/server/auth/account-access.ts differentiated account access").toBe(true);
  const subject = await import(/* @vite-ignore */ path) as { resolveAccountAccess(): Promise<Access> };
  return subject.resolveAccountAccess();
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ENV", "local"); vi.stubEnv("AI_PROVIDER", "disabled");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-public-account-fixture");
  fixture.cookies.mockResolvedValue({ getAll: () => [] });
  fixture.getUser.mockResolvedValue({ data: { user: { id: actor.id } }, error: null });
  profile({ id: actor.id, workspace_id: actor.workspaceId, role: actor.role });
});
function profile(data: unknown, error: unknown = null) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data, error })) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); fixture.from.mockReturnValue(query);
}
test("SYS-02.6 SYS-03.2: absent session resolves anonymous rather than expired", async () => {
  fixture.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError", status: 400 } });
  expect(await access()).toEqual({ kind: "anonymous" });
});
test.each(["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt"])("SYS-02.6 SYS-03.2: invalid/revoked session %s resolves session-ended", async (code) => {
  fixture.cookies.mockResolvedValue({ getAll: () => [{ name: "sb-local-auth-token", value: "expired-synthetic-cookie" }] });
  fixture.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthApiError", status: 401, code } });
  expect(await access()).toEqual({ kind: "session-ended" });
});
test.each([503, 429])("SYS-02.6 SYS-03.8: Auth source status %s offers retry without profile/home", async (status) => {
  fixture.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthApiError", status, message: "provider-private" } });
  expect(await access()).toEqual({ kind: "retry" });
  expect(fixture.from).not.toHaveBeenCalled();
});
test("SYS-03.8: thrown Auth network failure offers retry rather than sign-in loop", async () => {
  fixture.getUser.mockRejectedValue(new Error("provider-private network failure"));
  expect(await access()).toEqual({ kind: "retry" });
});
test("SYS-02.5 SYS-03.8: profile-source outage is retry rather than an empty account", async () => {
  profile(null, { code: "08006", message: "provider-private" });
  expect(await access()).toEqual({ kind: "retry" });
});
test.each([null, { id: actor.id, workspace_id: "invalid", role: "customer" }, { id: actor.id, workspace_id: actor.workspaceId, role: "superuser" }])("SYS-02.5 SYS-03.8: absent/invalid profile %# is unavailable without a fabricated role", async (value) => {
  profile(value);
  expect(await access()).toEqual({ kind: "unavailable" });
});
test.each(["customer", "owner", "admin"] as const)("SYS-03.1: verified %s profile retains protected workspace authority", async (role) => {
  profile({ id: actor.id, workspace_id: actor.workspaceId, role });
  expect(await access()).toEqual({ kind: "verified", actor: { ...actor, role } });
});
