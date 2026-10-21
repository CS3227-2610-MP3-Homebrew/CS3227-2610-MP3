// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const fixture = vi.hoisted(() => ({ cookies: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: fixture.cookies }));

import { handleAccountRequest } from "@/server/auth/account-adapter";
import { resolveAccountAccess } from "@/server/auth/account-access";
import { createAccountTransport } from "@/server/auth/account-transport";

const origin = "http://127.0.0.1:3100";
const endpoint = "http://127.0.0.1:54321";
const id = "00000000-0000-4000-8000-000000000051";
const user = { id, aud: "authenticated", role: "authenticated", email: "adapter@example.com" };
const credentials = { email: user.email, password: "synthetic-adapter-password" };
let jar: { name: string; value: string }[];

function session() {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", exp: expires })).toString("base64url"), "synthetic-signature"].join(".");
  return { access_token: token, refresh_token: "synthetic-refresh", expires_at: expires, expires_in: 3600, token_type: "bearer", user };
}
function apiRequest(operation: "signIn" | "signUp") {
  return new Request(`${origin}/api/auth/${operation === "signIn" ? "sign-in" : "sign-up"}`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(operation === "signIn" ? credentials : { ...credentials, role: "customer" }) });
}
function url(input: Parameters<typeof fetch>[0]) { return new URL(input instanceof Request ? input.url : String(input)); }

beforeEach(() => {
  vi.stubEnv("APP_ENV", "local"); vi.stubEnv("AI_PROVIDER", "disabled"); vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", endpoint); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-public-adapter-key");
  vi.stubEnv("SUPABASE_SECRET_KEY", "synthetic-private-adapter-key");
  jar = [];
  fixture.cookies.mockImplementation(async () => ({ getAll: () => jar }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

for (const surface of ["sign-in adapter", "account access"] as const) {
  test.each(["network", "503"] as const)(`${surface} sends one profile request on %s failure`, async (failure) => {
    if (surface === "account access") jar = [{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session())).toString("base64url")}` }];
    const transport = vi.fn<typeof fetch>(async (input) => {
      const path = url(input).pathname;
      if (path === "/auth/v1/token") return Response.json(session());
      if (path === "/auth/v1/user") return Response.json(user);
      if (path === "/rest/v1/profiles") {
        if (failure === "network") throw new TypeError("provider-private network failure");
        return Response.json({ code: "08006", message: "provider-private source failure" }, { status: 503 });
      }
      throw new Error("Unexpected fake transport request.");
    });
    vi.stubGlobal("fetch", transport);
    if (surface === "sign-in adapter") {
      const response = await handleAccountRequest("signIn", apiRequest("signIn"));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "SOURCE_UNAVAILABLE", message: "Account service is temporarily unavailable. Try again." } });
    } else expect(await resolveAccountAccess()).toEqual({ kind: "retry" });
    expect(transport.mock.calls.filter(([input]) => url(input).pathname === "/rest/v1/profiles")).toHaveLength(1);
  });
}

const delays = [
  { supplied: "12", expected: "12" }, { supplied: "0", expected: "0" },
  { supplied: "Wed, 21 Oct 2015 07:28:00 GMT", expected: "Wed, 21 Oct 2015 07:28:00 GMT" },
  { supplied: null, expected: null }, { supplied: "", expected: null },
  { supplied: "-1", expected: null }, { supplied: "1.5", expected: null },
  { supplied: "provider-private", expected: null }, { supplied: "Infinity", expected: null },
  { supplied: "999999999999999999999", expected: null },
  { supplied: "Thu, 21 Oct 2015 07:28:00 GMT", expected: null },
];
for (const operation of ["signIn", "signUp"] as const) {
  test.each(delays)(`${operation} preserves only a valid provider retry delay ($supplied)`, async ({ supplied, expected }) => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ code: "over_request_rate_limit", message: "provider-private detail" }, { status: 429, headers: { ...(supplied === null ? {} : { "retry-after": supplied }), "x-provider-private": "provider-private-header" } }));
    vi.stubGlobal("fetch", transport);
    const response = await handleAccountRequest(operation, apiRequest(operation));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe(expected);
    expect(response.headers.get("x-provider-private")).toBeNull();
    expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(url(transport.mock.calls[0][0]).pathname).toBe(operation === "signIn" ? "/auth/v1/token" : "/auth/v1/admin/users");
  });
}

test("transport capture is request-local, consumed once and cleared by a later Auth response", async () => {
  const upstream = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })).mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "12" } })).mockResolvedValueOnce(new Response(null, { status: 200 }));
  const first = createAccountTransport(endpoint, upstream); const second = createAccountTransport(endpoint, upstream);
  await first.fetch(`${endpoint}/auth/v1/token`);
  expect(second.takeRetryAfter()).toBeUndefined();
  expect(first.takeRetryAfter()).toBe("12");
  expect(first.takeRetryAfter()).toBeUndefined();
  upstream.mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "15" } }));
  await first.fetch(`${endpoint}/auth/v1/token`);
  expect(first.takeRetryAfter()).toBeUndefined();
  await first.fetch(`${endpoint}/auth/v1/token`);
  await first.fetch(`${endpoint}/auth/v1/user`);
  expect(first.takeRetryAfter()).toBeUndefined();
});
