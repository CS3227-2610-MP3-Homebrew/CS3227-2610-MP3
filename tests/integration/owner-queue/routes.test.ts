// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor: async () => ({ id: "synthetic-owner", workspaceId: "synthetic-workspace", role: "owner" }) }));
vi.mock("@/server/auth/account-adapter", () => ({ trustedOrigin: () => "http://localhost" }));
const boundary = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: boundary.client }));
afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });

const listRoute = "src/app/api/owner/orders/route.ts";
const actions = [["accept", {}], ["reject", { reason: "Out of oat milk" }], ["ready", {}], ["collect", {}]] as const;
const actionRoute = (action: string) => `src/app/api/owner/orders/[orderId]/${action}/route.ts`;
const leak = /Synthetic|private|SQL|stack|relation|constraint/;

async function load(path: string) {
  expect(existsSync(path), `Missing implementation: ${path}`).toBe(true);
  return import(/* @vite-ignore */ resolve(path));
}
const post = (action: string, body: unknown) => new NextRequest(`http://localhost/api/owner/orders/synthetic-order/${action}`, {
  method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body),
});

test("OWN-05.7: an authorized queue source outage gives safe 503, never an empty successful queue", async () => {
  boundary.client.mockRejectedValue(new Error("Synthetic private SQL source failure"));
  const route = await load(listRoute);
  const response: Response = await route.GET(new NextRequest("http://localhost/api/owner/orders"), { params: Promise.resolve({}) });
  expect(boundary.client).toHaveBeenCalled();
  expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "SOURCE_UNAVAILABLE", message: expect.not.stringMatching(leak) } });
});
test("OWN-05.7: a failed queue read result also gives 503 rather than an empty page", async () => {
  boundary.client.mockResolvedValue({ rpc: vi.fn(async () => ({ data: null, error: { code: "XX000", message: "Synthetic private SQL" }, status: 500 })) });
  const route = await load(listRoute);
  const response: Response = await route.GET(new NextRequest("http://localhost/api/owner/orders"), { params: Promise.resolve({}) });
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "SOURCE_UNAVAILABLE", message: expect.not.stringMatching(leak) } });
});
for (const [action, body] of actions) test(`OWN-05.7: a transactional ${action} failure gives safe 500 INTERNAL_ERROR`, async () => {
  boundary.client.mockResolvedValue({ rpc: vi.fn(async () => ({ data: null, error: { code: "40001", message: "Synthetic private SQL rollback" }, status: 500 })) });
  const route = await load(actionRoute(action));
  const response: Response = await route.POST(post(action, body), { params: Promise.resolve({ orderId: "synthetic-order" }) });
  expect(response.status).toBe(500); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "INTERNAL_ERROR", message: expect.not.stringMatching(leak) } });
});
for (const [action] of actions) for (const bytes of [65_536, 65_537]) test(`OWN-05.8: ${action} bounds a ${bytes}-byte body before any source access`, async () => {
  const route = await load(actionRoute(action));
  const request = new NextRequest(`http://localhost/api/owner/orders/synthetic-order/${action}`, { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify("x".repeat(bytes - 2)) });
  const response: Response = await route.POST(request, { params: Promise.resolve({ orderId: "synthetic-order" }) });
  expect(response.status).toBe(bytes === 65_536 ? 400 : 413);
  expect((await response.json()).error.code).toBe(bytes === 65_536 ? "INVALID_REQUEST" : "PAYLOAD_TOO_LARGE");
  expect(boundary.client).not.toHaveBeenCalled();
});
