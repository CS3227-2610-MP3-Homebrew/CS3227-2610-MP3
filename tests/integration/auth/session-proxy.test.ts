// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { actor, proxyModule, sessionModule } from "../../unit/auth/contracts";

const fixture = vi.hoisted(() => ({
  getUser: vi.fn(), getClaims: vi.fn(), getSession: vi.fn(), from: vi.fn(),
  createServerClient: vi.fn(), cookies: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: fixture.createServerClient }));
vi.mock("next/headers", () => ({ cookies: fixture.cookies }));

type Cookie = { name: string; value: string; options?: { path?: string; httpOnly?: boolean; sameSite?: "lax"; maxAge?: number } };
let requestCookies: Map<string, string>;
let profile: Record<string, unknown> | null;
let profileError: unknown;
let refreshed: Cookie[];
let eq: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ENV", "local");
  vi.stubEnv("AI_PROVIDER", "disabled");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-auth-fixture");
  requestCookies = new Map([["sb-local-auth-token", "old-session"]]);
  profile = { id: actor.id, workspace_id: actor.workspaceId, role: actor.role };
  profileError = null;
  refreshed = [];
  const result = () => Promise.resolve({ data: profile, error: profileError });
  const query: Record<string, unknown> = { single: result, maybeSingle: result, then: (resolve: (value: unknown) => void) => result().then(resolve) };
  eq = vi.fn(() => query);
  Object.assign(query, { select: vi.fn(() => query), eq });
  fixture.from.mockReturnValue(query);
  fixture.getUser.mockResolvedValue({ data: { user: { id: actor.id, user_metadata: { role: "admin", workspace_id: "forged" } } }, error: null });
  fixture.getClaims.mockResolvedValue({ data: { claims: { sub: actor.id } }, error: null });
  fixture.getSession.mockResolvedValue({ data: { session: { user: { id: actor.id, user_metadata: { role: "admin" } } } }, error: null });
  fixture.cookies.mockResolvedValue({
    getAll: () => [...requestCookies].map(([name, value]) => ({ name, value })),
    get: (name: string) => requestCookies.has(name) ? { name, value: requestCookies.get(name) } : undefined,
    set: (name: string, value: string) => requestCookies.set(name, value),
  });
  fixture.createServerClient.mockImplementation((_url, _key, options: { cookies: { getAll(): Cookie[]; setAll(cookies: Cookie[]): void } }) => {
    const verify = async () => {
      options.cookies.getAll();
      if (refreshed.length) options.cookies.setAll(refreshed);
      return fixture.getUser();
    };
    const claims = async () => {
      options.cookies.getAll();
      if (refreshed.length) options.cookies.setAll(refreshed);
      return fixture.getClaims();
    };
    return { auth: { getUser: verify, getClaims: claims, getSession: fixture.getSession }, from: fixture.from };
  });
});
afterEach(() => { vi.unstubAllEnvs(); });

test("SYS-05.2: src/proxy.ts propagates every refreshed cookie to downstream request and browser response", async () => {
  const { proxy } = await proxyModule();
  refreshed = [
    { name: "sb-local-auth-token.0", value: "new-chunk-0", options: { path: "/", httpOnly: true, sameSite: "lax", maxAge: 3600 } },
    { name: "sb-local-auth-token.1", value: "new-chunk-1", options: { path: "/", httpOnly: true, sameSite: "lax", maxAge: 3600 } },
    { name: "sb-local-auth-token", value: "", options: { path: "/", maxAge: 0 } },
  ];
  const request = new NextRequest("http://127.0.0.1:3100/fixture-private", { headers: { cookie: "sb-local-auth-token=old-session; unrelated=keep" } });
  const response = await proxy(request);
  expect(fixture.getUser.mock.calls.length + fixture.getClaims.mock.calls.length).toBeGreaterThan(0);
  for (const cookie of refreshed) {
    expect(request.cookies.get(cookie.name)?.value).toBe(cookie.value);
    expect(response.cookies.get(cookie.name)).toMatchObject({ name: cookie.name, value: cookie.value, ...cookie.options });
  }
  expect(request.cookies.get("unrelated")?.value).toBe("keep");
  const downstreamCookie = response.headers.get("x-middleware-request-cookie");
  expect(downstreamCookie, "NextResponse must forward refreshed request cookies, not only mutate an in-memory request").toContain("new-chunk-0");
  expect(downstreamCookie).toContain("new-chunk-1");
});

test.each(["customer", "owner", "admin"])("SYS-05.2: a verified Auth user resolves protected-profile %s rather than caller metadata", async (role) => {
  const { getVerifiedActor } = await sessionModule();
  profile = { id: actor.id, workspace_id: actor.workspaceId, role };
  expect(await getVerifiedActor()).toEqual({ ...actor, role });
  expect(fixture.getUser.mock.calls.length + fixture.getClaims.mock.calls.length).toBeGreaterThan(0);
  expect(fixture.from).toHaveBeenCalledWith("profiles");
  expect(eq).toHaveBeenCalledWith("id", actor.id);
});

test.each(["expired", "invalid", "absent"])("SYS-05.2: %s Auth verification cannot be rescued by a cached getSession user", async () => {
  const { getVerifiedActor } = await sessionModule();
  fixture.getUser.mockResolvedValue({ data: { user: null }, error: new Error("unverified session") });
  fixture.getClaims.mockResolvedValue({ data: null, error: new Error("unverified session") });
  expect(await getVerifiedActor()).toBeNull();
  expect(fixture.from).not.toHaveBeenCalled();
});

test.each([null, { ...actor, workspace_id: actor.workspaceId, role: "superuser" }, { id: actor.id, workspace_id: "invalid", role: "admin" }])("SYS-05.2: missing or invalid protected profile %j never grants a role", async (value) => {
  const { getVerifiedActor } = await sessionModule();
  profile = value;
  expect(await getVerifiedActor()).toBeNull();
});

test("SYS-05.2: profile lookup denial cannot fall back to Auth metadata", async () => {
  const { getVerifiedActor } = await sessionModule();
  profileError = { code: "42501", message: "permission denied" };
  expect(await getVerifiedActor()).toBeNull();
});
