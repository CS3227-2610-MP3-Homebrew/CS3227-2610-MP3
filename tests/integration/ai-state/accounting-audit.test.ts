// @vitest-environment node
import { expect, test, vi } from "vitest";
import { fixture, matchingRows } from "./fixtures";
vi.mock("server-only", () => ({}));
vi.setConfig({ testTimeout: 30_000 });

test("SYS-09.4, SYS-10.3, SEC-09.1: cache hit records operation outcome with no provider reservation", async () => {
  const f = await fixture(); await f.state.writeCache(f.context, f.result);
  const reserve = vi.fn(f.admission.reserve); const provider = vi.fn();
  expect((await f.create({ admission: { reserve } }).invoke(f.context, { provider })).outcome).toBe("cache");
  expect(provider).not.toHaveBeenCalled(); expect(reserve.mock.calls.filter(([request]) => request.event === "provider_attempt")).toHaveLength(0);
  const rows = matchingRows(f.context.operationId).filter(({ row }) => /cache/.test(JSON.stringify(row)));
  expect(rows.length).toBeGreaterThan(0); expect(JSON.stringify(rows)).toContain(f.actors.customer);
});
test.each(["success", "429", "failure"])("SYS-09.4, SYS-10.3, SEC-09.1: each %s dispatch has exactly one reservation and content-free audit", async outcome => {
  const f = await fixture(); const canary = "PAYLOAD_SECRET_CANARY_46";
  f.context.input.query = canary;
  const reserve = vi.fn(f.admission.reserve);
  const provider = vi.fn(async () => { if (outcome !== "success") throw Object.assign(new Error(canary), { status: outcome === "429" ? 429 : 500, body: canary }); return f.result; });
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {}); const log = vi.spyOn(console, "log").mockImplementation(() => {}); const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    const result = await f.create({ admission: { reserve } }).invoke(f.context, { provider });
    expect(result.outcome).toBe(outcome === "success" ? "success" : "fallback");
    expect(provider).toHaveBeenCalledTimes(1);
    const attempts = reserve.mock.calls.filter(([request]) => request.event === "provider_attempt"); expect(attempts).toHaveLength(1);
    expect(attempts[0][0]).toMatchObject({ actorId: f.actors.customer, operationId: f.context.operationId });
    const rows = matchingRows(f.context.operationId);
    const audit = rows.filter(({ row }) => /outcome/.test(JSON.stringify(Object.keys(row))));
    expect(audit.length).toBeGreaterThan(0);
    const content = JSON.stringify(audit.map(({ row }) => row));
    expect(content).toContain(f.actors.customer); expect(content).toMatch(/brew[_-]finder/); expect(content).toContain("2040-01-01");
    for (const text of [content, JSON.stringify(result), JSON.stringify(errorLog.mock.calls), JSON.stringify(log.mock.calls), JSON.stringify(warn.mock.calls)]) {
      expect(text).not.toContain(canary);
    }
    expect(content).not.toContain("Synthetic result");
    for (const { row } of audit) expect(Object.keys(row).join(" ")).not.toMatch(/prompt|payload|query|source|digest|fingerprint|response_body|\b(?:output|model_output)\b/);
  } finally { errorLog.mockRestore(); log.mockRestore(); warn.mockRestore(); }
});
test("SYS-10.3, SEC-09.1: admitted actor denial records safe outcome without provider dispatch", async () => {
  const f = await fixture(); const provider = vi.fn();
  const state = f.create({ admission: { reserve: async () => ({ admitted: false }) } });
  expect((await state.invoke(f.context, { provider })).outcome).toBe("fallback"); expect(provider).not.toHaveBeenCalled();
  const audit = matchingRows(f.context.operationId).filter(({ row }) => /outcome/.test(JSON.stringify(Object.keys(row))));
  expect(audit.length).toBeGreaterThan(0); expect(JSON.stringify(audit)).toMatch(/denied|denial|limit/);
});
test.each(["audit", "admission"])("SEC-09.1: unavailable %s storage fails closed before dispatch", async storage => {
  const f = await fixture(); const provider = vi.fn();
  const state = f.create(storage === "audit" ? { rpc: async () => ({ data: null, error: { message: "SECRET_CANARY_UNAVAILABLE" } }) } : { admission: { reserve: async () => { throw new Error("SECRET_CANARY_UNAVAILABLE"); } } });
  const result = await state.invoke(f.context, { provider });
  expect(result.outcome).toBe("fallback"); expect(provider).not.toHaveBeenCalled(); expect(JSON.stringify(result)).not.toContain("SECRET_CANARY_UNAVAILABLE");
});
