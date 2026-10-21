// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor: async () => ({ id: "synthetic-customer", workspaceId: "synthetic-workspace", role: "customer" }) }));
const boundary = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: boundary.client }));
afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });
for (const [path, url, params] of [
  ["src/app/api/customer/cafes/route.ts", "/api/customer/cafes", {}],
  ["src/app/api/customer/cafes/[cafeId]/route.ts", "/api/customer/cafes/synthetic-cafe", { cafeId: "synthetic-cafe" }],
  ["src/app/api/customer/cafes/[cafeId]/reviews/route.ts", "/api/customer/cafes/synthetic-cafe/reviews", { cafeId: "synthetic-cafe" }],
] as const) test(`CUS-01.1 CUS-02.1 CUS-02.4: session-bound source outage is safe 503 rather than empty data at ${url}`, async () => {
  boundary.client.mockRejectedValue(new Error("Synthetic SQL private source failure"));
  expect(existsSync(path), `Missing implementation: ${path}`).toBe(true);
  const route = await import(/* @vite-ignore */ resolve(path));
  const response: Response = await route.GET(new NextRequest(`http://localhost${url}`), { params: Promise.resolve(params) });
  expect(boundary.client).toHaveBeenCalled();
  expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(body).toEqual({ requestId: expect.any(String), error: { code: "SOURCE_UNAVAILABLE", message: expect.any(String) } });
  expect(JSON.stringify(body)).not.toMatch(/Synthetic|SQL|private source failure/);
});
