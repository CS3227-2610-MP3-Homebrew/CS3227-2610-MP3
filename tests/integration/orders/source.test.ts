// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor: async () => ({ id: "synthetic-customer", workspaceId: "synthetic-workspace", role: "customer" }) }));
vi.mock("@/server/auth/account-adapter", () => ({ trustedOrigin: () => "http://localhost" }));
const boundary = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: boundary.client }));
afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });
for (const [path, url, params] of [
  ["src/app/api/customer/cafes/[cafeId]/pickup-slots/route.ts", "/api/customer/cafes/synthetic-cafe/pickup-slots", { cafeId: "synthetic-cafe" }],
  ["src/app/api/customer/orders/route.ts", "/api/customer/orders", {}],
  ["src/app/api/customer/orders/[orderId]/route.ts", "/api/customer/orders/synthetic-order", { orderId: "synthetic-order" }],
] as const) test(`CUS-03.2 CUS-04.1: authorized source outage gives safe 503, never fabricated empty data at ${url}`, async () => {
  boundary.client.mockRejectedValue(new Error("Synthetic private SQL source failure"));
  expect(existsSync(path), `Missing implementation: ${path}`).toBe(true);
  const route = await import(/* @vite-ignore */ resolve(path));
  const response: Response = await route.GET(new NextRequest(`http://localhost${url}`), { params: Promise.resolve(params) });
  expect(boundary.client).toHaveBeenCalled();
  expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "SOURCE_UNAVAILABLE", message: expect.not.stringMatching(/Synthetic|private|SQL|stack/) } });
});
for (const [path, url, params] of [
  ["src/app/api/customer/orders/route.ts", "/api/customer/orders", {}],
  ["src/app/api/customer/orders/[orderId]/cancel/route.ts", "/api/customer/orders/synthetic-order/cancel", { orderId: "synthetic-order" }],
] as const) for (const bytes of [65_536, 65_537]) test(`CUS-03.8 CUS-04.8: ${url} bounds a ${bytes}-byte body without Content-Length`, async () => {
  expect(existsSync(path), `Missing implementation: ${path}`).toBe(true);
  const route = await import(/* @vite-ignore */ resolve(path));
  // A valid JSON string is deliberately schema-invalid. Exactly the byte limit
  // reaches strict validation; the next byte must be rejected while reading.
  const request = new NextRequest(`http://localhost${url}`, { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify("x".repeat(bytes - 2)) });
  expect(request.headers.has("content-length")).toBe(false);
  const response: Response = await route.POST(request, { params: Promise.resolve(params) });
  expect(response.status).toBe(bytes === 65_536 ? 400 : 413);
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: bytes === 65_536 ? "INVALID_REQUEST" : "PAYLOAD_TOO_LARGE", message: expect.any(String) } });
  expect(boundary.client).not.toHaveBeenCalled();
});
