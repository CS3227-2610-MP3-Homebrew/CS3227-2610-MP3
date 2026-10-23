// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const actor = vi.hoisted(() => ({ current: { id: "synthetic-owner", workspaceId: "synthetic-workspace", role: "owner" } as { id: string; workspaceId: string; role: string } | null }));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor: async () => actor.current }));
const boundary = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: boundary.client }));
afterEach(() => { vi.resetModules(); vi.clearAllMocks(); actor.current = { id: "synthetic-owner", workspaceId: "synthetic-workspace", role: "owner" }; });

const routePath = "src/app/api/owner/prep-sheet/route.ts";
const leak = /Synthetic|private|SQL|stack|relation|constraint/;
async function get() {
  expect(existsSync(routePath), `Missing implementation: ${routePath}`).toBe(true);
  const route = await import(/* @vite-ignore */ resolve(routePath));
  return route.GET(new NextRequest("http://localhost/api/owner/prep-sheet")) as Promise<Response>;
}
async function expectFailure(response: Response, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code, message: expect.not.stringMatching(leak) } });
}

test("OWN-09.6: an unavailable session source gives safe 503 SOURCE_UNAVAILABLE, never an empty sheet", async () => {
  boundary.client.mockRejectedValue(new Error("Synthetic private SQL source failure"));
  await expectFailure(await get(), 503, "SOURCE_UNAVAILABLE");
});
test("OWN-09.6: a failed prep-sheet read result gives 503 rather than an empty sheet", async () => {
  boundary.client.mockResolvedValue({ rpc: vi.fn(async () => ({ data: null, error: { code: "XX000", message: "Synthetic private SQL" }, status: 500 })) });
  await expectFailure(await get(), 503, "SOURCE_UNAVAILABLE");
});
test("OWN-09.6: a malformed source payload gives 503 rather than a partial sheet", async () => {
  boundary.client.mockResolvedValue({ rpc: vi.fn(async () => ({ data: { prepSheet: { items: [], orders: [] } }, error: null, status: 200 })) });
  await expectFailure(await get(), 503, "SOURCE_UNAVAILABLE");
});
test("OWN-09.7: missing sessions and wrong roles are refused before any source access", async () => {
  actor.current = null; await expectFailure(await get(), 401, "UNAUTHENTICATED");
  for (const role of ["customer", "admin"]) { actor.current = { id: "synthetic", workspaceId: "synthetic-workspace", role }; await expectFailure(await get(), 403, "FORBIDDEN"); }
  expect(boundary.client).not.toHaveBeenCalled();
});
