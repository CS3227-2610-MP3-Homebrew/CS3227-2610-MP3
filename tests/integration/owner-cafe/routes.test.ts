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

const trusted = "https://homebrew.invalid";
const routes = {
  read: ["src/app/api/owner/cafe/route.ts", "/api/owner/cafe", "GET"],
  apply: ["src/app/api/owner/applications/route.ts", "/api/owner/applications", "POST"],
  resubmit: ["src/app/api/owner/cafe/resubmit/route.ts", "/api/owner/cafe/resubmit", "POST"],
  settings: ["src/app/api/owner/cafe/settings/route.ts", "/api/owner/cafe/settings", "POST"],
} as const;
const hours = [{ weekday: 1, opensAt: "09:00", closesAt: "12:00", closesNextDay: false }];
const bodies = {
  apply: { submissionKey: "6f1c1f9e-8f55-4c55-9a1e-2a3b4c5d6e7f", name: "Route Café", description: "", area: "Central", pickupAddress: "1 Route Pickup Road", openingHours: hours, pickupSettings: {} },
  resubmit: { submissionKey: "6f1c1f9e-8f55-4c55-9a1e-2a3b4c5d6e70", name: "Route Café", description: "", area: "Central", pickupAddress: "1 Route Pickup Road", openingHours: hours, pickupSettings: {}, expectedSuspensionVersion: 0 },
  settings: { description: "", openingHours: hours, pickupSettings: { pickupCutoffMinutes: 15 }, expectedSuspensionVersion: 0 },
};
type Name = keyof typeof routes;
async function call(name: Name, init: { origin?: string | null; body?: string; contentType?: string } = {}) {
  const [path, url, method] = routes[name];
  expect(existsSync(path), `Missing implementation: ${path}`).toBe(true);
  const api = await import(/* @vite-ignore */ resolve(path)) as Record<string, (request: Request, context: { params: Promise<object> }) => Promise<Response>>;
  expect(typeof api[method], `Missing ${method} export: ${path}`).toBe("function");
  const headers: Record<string, string> = {};
  if (method === "POST") { headers["content-type"] = init.contentType ?? "application/json"; if (init.origin !== null) headers.origin = init.origin ?? trusted; }
  const request = new NextRequest(`${trusted}${url}`, { method, headers, ...(method === "POST" ? { body: init.body ?? JSON.stringify(bodies[name as Exclude<Name, "read">]) } : {}) });
  return api[method](request, { params: Promise.resolve({}) });
}
async function error(response: Response, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toContain("application/json");
  const body = await response.json();
  expect(body).toEqual({ requestId: expect.any(String), error: { code, message: expect.any(String) } });
  expect(body.error.message).not.toMatch(/Synthetic|SQL|stack|supabase/i);
}

for (const name of Object.keys(routes) as Name[]) {
  const ids = name === "read" ? "OWN-01.7 OWN-02.8 OWN-04.8" : name === "settings" ? "OWN-02.8 OWN-04.8" : "OWN-01.7";
  test(`${ids}: ${name} handler refuses an absent session with 401 before reading owner data`, async () => {
    boundary.client.mockRejectedValue(new Error("Synthetic unauthorized source access"));
    await error(await call(name), 401, "UNAUTHENTICATED");
  });
  for (const role of ["customer", "admin"] as const) test(`${ids}: ${name} handler refuses a ${role} session with 403 before reading owner data`, async () => {
    auth.actor = { id: "actor-ref", workspaceId: "workspace-ref", role };
    boundary.client.mockRejectedValue(new Error("Synthetic unauthorized source access"));
    await error(await call(name), 403, "FORBIDDEN");
  });
  if (name !== "read") {
    for (const origin of [null, "https://evil.invalid", "null"]) test(`${ids}: ${name} handler rejects ${origin === null ? "a missing" : JSON.stringify(origin)} Origin with 403 and no write`, async () => {
      auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
      boundary.client.mockRejectedValue(new Error("Synthetic source must not be written"));
      await error(await call(name, { origin }), 403, "FORBIDDEN");
    });
    test(`${ids}: ${name} handler rejects a non-JSON media type with 415`, async () => {
      auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
      await error(await call(name, { contentType: "text/plain" }), 415, "UNSUPPORTED_MEDIA_TYPE");
    });
    for (const bytes of [65_536, 65_537]) test(`${ids}: ${name} handler bounds a ${bytes}-byte body without Content-Length`, async () => {
      auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
      // A valid JSON string is schema-invalid: exactly the limit reaches strict validation.
      const response = await call(name, { body: JSON.stringify("x".repeat(bytes - 2)) });
      await error(response, bytes === 65_536 ? 400 : 413, bytes === 65_536 ? "INVALID_REQUEST" : "PAYLOAD_TOO_LARGE");
    });
  }
}

test("OWN-01.2 OWN-02.1 OWN-04.1: an authorized owner source outage is a safe 503, never an absent café or default settings", async () => {
  auth.actor = { id: "owner-ref", workspaceId: "workspace-ref", role: "owner" };
  boundary.client.mockRejectedValue(new Error("Synthetic private SQL source failure"));
  const response = await call("read");
  expect(boundary.client).toHaveBeenCalled();
  await error(response, 503, "SOURCE_UNAVAILABLE");
});
