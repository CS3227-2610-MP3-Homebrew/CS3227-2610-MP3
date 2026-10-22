// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { createMaintenanceHandler, ensureMainAdmin } from "@/server/maintenance";
vi.mock("server-only", () => ({}));
afterEach(() => vi.restoreAllMocks());
test("invalid internal outcomes are projected as failures and do not prevent later work", async () => {
  const marker = "synthetic-private-outcome-canary";
  const later = vi.fn(async () => ({ outcome: "success" as const, count: 0, email: marker }));
  const handler = createMaintenanceHandler({ secret: "synthetic-bearer",
    cleanup: async () => ({ outcome: marker, count: -1 }) as never,
    ensureMainAdmin: later, ensureShowcase: later,
  });
  const response = await handler(new Request("http://localhost/api/internal/maintenance", { headers: { authorization: "Bearer synthetic-bearer" } }));
  const body = await response.json();
  expect(body.steps[0]).toEqual({ step: "cleanup", outcome: "failure", count: 0 });
  expect(later).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(body)).not.toContain(marker);
});
test("unsupported authorized methods never run maintenance steps", async () => {
  const work = vi.fn(async () => ({ outcome: "success" as const, count: 1 }));
  const handler = createMaintenanceHandler({ secret: "synthetic-bearer", cleanup: work, ensureMainAdmin: work, ensureShowcase: work });
  const response = await handler(new Request("http://localhost/api/internal/maintenance", { method: "POST", headers: { authorization: "Bearer synthetic-bearer" } }));
  expect(response.status).toBe(405); expect(response.headers.get("allow")).toBe("GET");
  expect(work).not.toHaveBeenCalled();
});
test("Admin identity reservations use the same canonical email sent to Auth", async () => {
  const token = "00000000-0000-4000-8000-000000000002";
  const id = "00000000-0000-4000-8000-000000000003";
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => name === "prepare_maintenance"
    ? { data: [{ outcome: "create", count: 0, token, email: args.p_email, user_id: null }], error: null }
    : { data: [{ outcome: "success", count: 1 }], error: null });
  const auth = { createUser: vi.fn(async () => ({ data: { user: { id } }, error: null })) };
  await ensureMainAdmin({ rpc, auth: auth as unknown as Parameters<typeof ensureMainAdmin>[0]["auth"], email: "Synthetic-Admin@EXAMPLE.COM", password: "synthetic-password" });
  expect(rpc).toHaveBeenCalledWith("prepare_maintenance", { p_step: "admin", p_email: "synthetic-admin@example.com" });
  expect(auth.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "synthetic-admin@example.com" }));
});
