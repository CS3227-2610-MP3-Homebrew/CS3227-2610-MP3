// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { demoModule } from "./contracts";
import { clock, rpcAs } from "../usage/local";
vi.mock("server-only", () => ({}));
const limits = { perTenMinutes: 5, perDay: 30 };
async function admission(time: string, role: "service_role" | "anon" | "authenticated" = "service_role") {
  return (await demoModule()).createDemoKitAdmission({ environment: "ci", limits, rpc: rpcAs(role), databaseClock: clock(time) });
}
test("SYS-12.7 SEC-10.1: concurrent instances share exactly five admissions and restart cannot restore capacity", async () => {
  const results = await Promise.all(Array.from({ length: 12 }, async () => (await admission("2051-01-01T00:09:59.999Z")).reserve()));
  expect(results.filter(r => r.admitted)).toHaveLength(5);
  expect(results.filter(r => !r.admitted).every(r => r.retryAfter === 1)).toBe(true);
  vi.resetModules();
  expect(await (await admission("2051-01-01T00:09:59.999Z")).reserve()).toMatchObject({ admitted: false, retryAfter: 1 });
  expect(await (await admission("2051-01-01T00:10:00.000Z")).reserve()).toMatchObject({ admitted: true });
});
test("SYS-12.7 SEC-10.1: thirty daily admissions survive window rollover and reopen only at Singapore midnight", async () => {
  for (let minute = 0; minute < 60; minute += 10) {
    const results = await Promise.all(Array.from({ length: 5 }, async () => (await admission(`2052-01-01T14:${String(minute).padStart(2, "0")}:00Z`)).reserve()));
    expect(results.filter(r => r.admitted)).toHaveLength(5);
  }
  expect(await (await admission("2052-01-01T15:59:59.999Z")).reserve()).toMatchObject({ admitted: false, retryAfter: 1 });
  const results = await Promise.all(Array.from({ length: 8 }, async () => (await admission("2052-01-01T16:00:00.000Z")).reserve()));
  expect(results.filter(r => r.admitted)).toHaveLength(5);
  expect(await (await admission("2052-01-01T15:59:59.999Z")).reserve()).toMatchObject({ admitted: false });
});
test("SYS-12.7 SEC-10.1: daily last-slot race admits only remaining capacity", async () => {
  for (let minute = 0; minute < 50; minute += 10) {
    const results = await Promise.all(Array.from({ length: 5 }, async () => (await admission(`2053-01-01T00:${String(minute).padStart(2, "0")}:00Z`)).reserve()));
    expect(results.filter(r => r.admitted)).toHaveLength(5);
  }
  for (let i = 0; i < 4; i++) expect(await (await admission("2053-01-01T00:50:00Z")).reserve()).toMatchObject({ admitted: true });
  const results = await Promise.all(Array.from({ length: 8 }, async () => (await admission("2053-01-01T01:00:00Z")).reserve()));
  expect(results.filter(r => r.admitted)).toHaveLength(1);
});
for (const role of ["anon", "authenticated"] as const) describe(role, () => {
  test("SYS-12.7 SEC-10.1: unprivileged clients cannot reserve global creation capacity", async () => {
    expect((await (await admission("2054-01-01T00:00:00Z", role)).reserve()).admitted).toBe(false);
  });
});
for (const fault of ["error", "throw", "malformed"] as const) describe(fault, () => {
  test("SYS-12.7 SEC-10.1: unavailable or invalid durable counters deny admission", async () => {
    const rpc = vi.fn(async () => {
      if (fault === "throw") throw new Error("synthetic secret");
      return fault === "error" ? { data: null, error: { message: "synthetic secret" } } : { data: [{ admitted: "true" }], error: null };
    });
    const subject = (await demoModule()).createDemoKitAdmission({ environment: "ci", limits, rpc });
    expect(await subject.reserve()).toMatchObject({ admitted: false, unavailable: true });
  });
});
