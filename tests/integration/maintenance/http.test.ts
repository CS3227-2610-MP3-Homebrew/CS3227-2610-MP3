// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { maintenanceModule, request, secret } from "./contracts";
import { fixture, matchingRows } from "../ai-state/fixtures";
vi.mock("server-only", () => ({}));
afterEach(() => vi.restoreAllMocks());
function steps() {
  return {
    cleanup: vi.fn(async () => ({ outcome: "success", count: 2 })),
    ensureMainAdmin: vi.fn(async () => ({ outcome: "success", count: 1 })),
    ensureShowcase: vi.fn(async () => ({ outcome: "success", count: 1 })),
  };
}
for (const authorization of [null, "", "Bearer wrong", `Basic ${secret}`, `Bearer ${secret}x`]) describe(JSON.stringify(authorization), () => {
  test("SYS-13.3, SEC-10.4: missing or wrong bearer returns private 401 before any work", async () => {
    const api = await maintenanceModule(); const work = steps();
    const req = authorization === null ? new Request("http://localhost/api/internal/maintenance") : request(authorization);
    const response = await api.createMaintenanceHandler({ secret, ...work })(req);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
    for (const fn of Object.values(work)) expect(fn).not.toHaveBeenCalled();
  });
});
test("SEC-10.4: missing configured secret fails closed even with a supplied bearer", async () => {
  const api = await maintenanceModule(); const work = steps();
  expect((await api.createMaintenanceHandler(work)(request())).status).toBe(401);
  for (const fn of Object.values(work)) expect(fn).not.toHaveBeenCalled();
});
test("SYS-13.5, SYS-13.6, SEC-10.5: authorized request awaits ordered steps and returns only counts", async () => {
  const api = await maintenanceModule(); const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const work = {
    cleanup: vi.fn(async () => { order.push("cleanup"); await gate; return { outcome: "success", count: 2 }; }),
    ensureMainAdmin: vi.fn(async () => { order.push("admin"); return { outcome: "success", count: 1 }; }),
    ensureShowcase: vi.fn(async () => { order.push("showcase"); return { outcome: "success", count: 1 }; }),
  };
  const pending = api.createMaintenanceHandler({ secret, ...work })(request());
  await vi.waitFor(() => expect(work.cleanup).toHaveBeenCalledOnce());
  expect(order).toEqual(["cleanup"]); release();
  const response = await pending; const body = await response.json();
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(order).toEqual(["cleanup", "admin", "showcase"]);
  expect(Object.keys(body).sort()).toEqual(["requestId", "steps"]);
  expect(body.requestId).toEqual(expect.any(String)); expect(body.requestId.length).toBeGreaterThan(0);
  expect(body.steps).toHaveLength(3);
  expect(body.steps.map((s: { count: number }) => s.count)).toEqual([2, 1, 1]);
  for (const step of body.steps) {
    expect(Object.keys(step).sort()).toEqual(["count", "outcome", "step"]);
    expect(step.step).toEqual(expect.any(String)); expect(step.outcome).toBe("success");
  }
  expect(new Set(body.steps.map((s: { step: string }) => s.step)).size).toBe(3);
});
for (const failed of ["cleanup", "ensureMainAdmin", "ensureShowcase"] as const) describe(failed, () => {
  test("SYS-13.5, SEC-10.5: a step exception is sanitized and every later step still runs", async () => {
    const api = await maintenanceModule(); const work = steps();
    const canary = `${secret} synthetic-admin-password admin-canary@example.com private-record-canary`;
    const logs = [vi.spyOn(console, "log").mockImplementation(() => {}), vi.spyOn(console, "warn").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {})];
    work[failed].mockRejectedValue(new Error(canary));
    const response = await api.createMaintenanceHandler({ secret, ...work })(request());
    const body = await response.json();
    for (const fn of Object.values(work)) expect(fn).toHaveBeenCalledOnce();
    expect(body.steps).toHaveLength(3);
    const index = Object.keys(work).indexOf(failed);
    expect(body.steps[index].outcome).toBe("failure"); expect(body.steps[index].count).toBe(0);
    for (const step of body.steps) expect(Object.keys(step).sort()).toEqual(["count", "outcome", "step"]);
    const captured = JSON.stringify([body, ...logs.map(log => log.mock.calls)]);
    for (const value of canary.split(" ")) expect(captured).not.toContain(value);
  });
});
test("SYS-13.5, SYS-13.8: authorized maintenance invokes the existing retention repository without generating AI content", async () => {
  const api = await maintenanceModule(); const f = await fixture("2051-01-01T00:00:00.000Z");
  await f.state.writeCache(f.context, f.result);
  const cached = () => matchingRows(f.actors.customer).filter(({ row }) => JSON.stringify(row).includes("suggestions"));
  expect(cached().length).toBeGreaterThan(0);
  f.advance("2051-01-02T00:00:00.001Z");
  const work = steps();
  work.cleanup.mockImplementation(async () => { await f.state.cleanup(); return { outcome: "success", count: 0 }; });
  const response = await api.createMaintenanceHandler({ secret, ...work })(request());
  expect(response.status).toBe(200); expect(work.cleanup).toHaveBeenCalledOnce(); expect(cached()).toEqual([]);
  expect(work.ensureMainAdmin).toHaveBeenCalledOnce(); expect(work.ensureShowcase).toHaveBeenCalledOnce();
}, 120000);
test("SYS-13.7: main Admin configuration failure remains an outcome while cleanup and showcase succeed", async () => {
  const api = await maintenanceModule(); const work = steps();
  work.ensureMainAdmin.mockResolvedValue({ outcome: "failure", count: 0 });
  const body = await (await api.createMaintenanceHandler({ secret, ...work })(request())).json();
  expect(body.steps.map((step: { outcome: string }) => step.outcome)).toEqual(["success", "failure", "success"]);
  expect(work.cleanup).toHaveBeenCalledOnce(); expect(work.ensureShowcase).toHaveBeenCalledOnce();
});
