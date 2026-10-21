// @vitest-environment node
import { expect, test, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor: async () => ({ id: "admin-ref", workspaceId: "workspace-ref", role: "admin" }) }));
vi.mock("@/server/auth/account-adapter", () => ({ trustedOrigin: () => "https://homebrew.invalid" }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: async () => ({ rpc }) }));
import { handleCafeAction } from "@/server/cafes/admin";

test.each([0, 502, 503, 504])("maps an unavailable database response (%s) to a safe source error", async status => {
  // The installed SDK represents a failed fetch with status zero, and otherwise
  // retains the database gateway's HTTP status. Never expose its raw error body.
  rpc.mockResolvedValue({ status, data: null, error: { code: "", message: "INTERNAL DATABASE CANARY", details: "PRIVATE CONTENT" } });
  const request = new Request("https://homebrew.invalid/api/admin/cafes/cafe-ref/decision", { method: "POST", headers: { origin: "https://homebrew.invalid", "content-type": "application/json" }, body: JSON.stringify({ decision: "approve", reason: "A human reason" }) });
  const response = await handleCafeAction(request, "cafe-ref", "decision");
  expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "SOURCE_UNAVAILABLE", message: "Unable to reach café data. Try again." } });
});
test("keeps a rolled-back transaction error distinct from source unavailability", async () => {
  rpc.mockResolvedValue({ status: 400, data: null, error: { code: "P0001", message: "PRIVATE AUDIT ERROR" } });
  const request = new Request("https://homebrew.invalid/api/admin/cafes/cafe-ref/suspension", { method: "POST", headers: { origin: "https://homebrew.invalid", "content-type": "application/json" }, body: JSON.stringify({ suspended: true, reason: "A human reason" }) });
  const response = await handleCafeAction(request, "cafe-ref", "suspension");
  expect(response.status).toBe(500); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ requestId: expect.any(String), error: { code: "INTERNAL_ERROR", message: "Unable to save this café action. Try again." } });
});
