// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ actor: null as null | { id: string; workspaceId: string; role: "customer" | "owner" | "admin" } }));
const boundary = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor: async () => auth.actor }));
vi.mock("@/server/auth/account-adapter", () => ({ trustedOrigin: () => "https://homebrew.invalid" }));
vi.mock("@/server/http/origin", () => ({ trustedOrigin: () => "https://homebrew.invalid" }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: boundary.client }));
afterEach(() => { auth.actor = null; vi.resetModules(); vi.clearAllMocks(); });

/** Route Handler files follow the OWN-03 Owner menu boundary paths. */
const trusted = "https://homebrew.invalid";
const item = "00000000-0000-4000-8000-0000000000aa";
const routes = {
  read: ["src/app/api/owner/menu/route.ts", "/api/owner/menu", "GET", {}],
  create: ["src/app/api/owner/menu/route.ts", "/api/owner/menu", "POST", {}],
  save: ["src/app/api/owner/menu/[itemId]/route.ts", `/api/owner/menu/${item}`, "POST", { itemId: item }],
  remove: ["src/app/api/owner/menu/[itemId]/remove/route.ts", `/api/owner/menu/${item}/remove`, "POST", { itemId: item }],
} as const;
const bodies = {
  create: { name: "Route Latte", drinkType: "coffee", priceCents: 450, expectedSuspensionVersion: 0 },
  save: { name: "Route Latte", drinkType: "coffee", priceCents: 450, soldOut: false, expectedSuspensionVersion: 0 },
  remove: { expectedSuspensionVersion: 0 },
};
type Name = keyof typeof routes;
async function call(name: Name, init: { origin?: string | null; body?: string; contentType?: string } = {}) {
  const [path, url, method, params] = routes[name];
  expect(existsSync(path), `Missing implementation: ${path}`).toBe(true);
  const api = await import(/* @vite-ignore */ resolve(path)) as Record<string, (request: Request, context: { params: Promise<object> }) => Promise<Response>>;
  expect(typeof api[method], `Missing ${method} export: ${path}`).toBe("function");
  const headers: Record<string, string> = {};
  if (method === "POST") { headers["content-type"] = init.contentType ?? "application/json"; if (init.origin !== null) headers.origin = init.origin ?? trusted; }
  const request = new NextRequest(`${trusted}${url}`, { method, headers, ...(method === "POST" ? { body: init.body ?? JSON.stringify(bodies[name as Exclude<Name, "read">]) } : {}) });
  return api[method](request, { params: Promise.resolve(params) });
}
async function error(response: Response, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toContain("application/json");
  const body = await response.json();
  expect(body).toEqual({ requestId: expect.any(String), error: { code, message: expect.any(String) } });
  expect(body.requestId.length).toBeGreaterThan(0);
  expect(body.error.message).not.toMatch(/Synthetic|SQL|stack|supabase|Route Latte/i);
}

test("OWN-03.8: GET /api/owner/menu refuses an absent session with 401 before reading owner data", async () => {
  boundary.client.mockRejectedValue(new Error("Synthetic unauthorized source access"));
  await error(await call("read"), 401, "UNAUTHENTICATED");
});
test("OWN-03.8: POST /api/owner/menu refuses an absent session with 401 and writes nothing", async () => {
  boundary.client.mockRejectedValue(new Error("Synthetic unauthorized source access"));
  await error(await call("create"), 401, "UNAUTHENTICATED");
});
test("OWN-03.8: POST /api/owner/menu/{itemId} refuses an absent session with 401 and writes nothing", async () => {
  boundary.client.mockRejectedValue(new Error("Synthetic unauthorized source access"));
  await error(await call("save"), 401, "UNAUTHENTICATED");
});
test("OWN-03.8: POST /api/owner/menu/{itemId}/remove refuses an absent session with 401 and writes nothing", async () => {
  boundary.client.mockRejectedValue(new Error("Synthetic unauthorized source access"));
  await error(await call("remove"), 401, "UNAUTHENTICATED");
});

test.each([["read", "customer"], ["read", "admin"], ["create", "customer"], ["create", "admin"], ["save", "customer"], ["save", "admin"], ["remove", "customer"], ["remove", "admin"]] as const)(
  "OWN-03.8: owner menu %s handler refuses a %s session with 403 before reading or writing owner data", async (name, role) => {
    auth.actor = { id: "actor-ref", workspaceId: "workspace-ref", role };
    boundary.client.mockRejectedValue(new Error("Synthetic unauthorized source access"));
    await error(await call(name), 403, "FORBIDDEN");
  });

test.each([["create", null], ["create", "https://evil.invalid"], ["create", "null"], ["save", null], ["save", "https://evil.invalid"], ["save", "null"], ["remove", null], ["remove", "https://evil.invalid"], ["remove", "null"]] as const)(
  "OWN-03.8: owner menu %s handler rejects Origin %s with 403 and no write", async (name, origin) => {
    auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
    boundary.client.mockRejectedValue(new Error("Synthetic source must not be written"));
    await error(await call(name, { origin }), 403, "FORBIDDEN");
  });

test.each(["create", "save", "remove"] as const)("OWN-03.8: owner menu %s handler rejects a non-JSON media type with 415", async name => {
  auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
  boundary.client.mockRejectedValue(new Error("Synthetic source must not be written"));
  await error(await call(name, { contentType: "text/plain" }), 415, "UNSUPPORTED_MEDIA_TYPE");
});

test.each([["create", 65_536], ["create", 65_537], ["save", 65_536], ["save", 65_537], ["remove", 65_536], ["remove", 65_537]] as const)(
  "OWN-03.8: owner menu %s handler bounds a %d-byte body without Content-Length", async (name, bytes) => {
    auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
    boundary.client.mockRejectedValue(new Error("Synthetic source must not be written"));
    // A valid JSON string is schema-invalid: exactly the limit reaches strict validation.
    const response = await call(name, { body: JSON.stringify("x".repeat(bytes - 2)) });
    await error(response, bytes === 65_536 ? 400 : 413, bytes === 65_536 ? "INVALID_REQUEST" : "PAYLOAD_TOO_LARGE");
  });

test.each(["create", "save", "remove"] as const)("OWN-03.8: owner menu %s handler rejects malformed JSON with 400 before any write", async name => {
  auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
  boundary.client.mockRejectedValue(new Error("Synthetic source must not be written"));
  await error(await call(name, { body: "{\"expectedSuspensionVersion\":" }), 400, "INVALID_REQUEST");
});

test("OWN-03.1: an authorized owner menu source outage is a safe 503, never an empty menu", async () => {
  auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
  boundary.client.mockRejectedValue(new Error("Synthetic private SQL source failure"));
  const response = await call("read");
  expect(boundary.client).toHaveBeenCalled();
  await error(response, 503, "SOURCE_UNAVAILABLE");
});
