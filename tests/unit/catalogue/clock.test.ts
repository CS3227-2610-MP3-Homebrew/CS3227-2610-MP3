// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

type Hours = { weekday: number; opensAt: string; closesAt: string; closesNextDay: boolean }[];
interface Clock {
  openingState(hours: Hours, now: string): { isOpen: boolean; closingSoon: boolean; nextOpeningAt: string | null };
  singaporeMinuteToInstant(date: string, minute: string): string;
}
async function clock(): Promise<Clock> {
  const path = resolve("src/server/catalogue/clock.ts");
  expect(existsSync(path), "Missing implementation: catalogue clock policy").toBe(true);
  return import(/* @vite-ignore */ path);
}
const monday: Hours = [{ weekday: 1, opensAt: "09:00", closesAt: "10:00", closesNextDay: false }];
for (const [time, isOpen, closingSoon] of [
  ["00:59:59", false, false], ["01:00:00", true, false],
  ["01:29:59", true, false], ["01:30:00", true, true],
  ["01:30:01", true, true], ["01:59:59", true, true], ["02:00:00", false, false],
] as const) test(`CUS-01.2 CUS-01.10: Singapore opening/30-minute/closing boundary ${time}`, async () => {
  const state = (await clock()).openingState(monday, `2026-10-19T${time}Z`);
  expect(state.isOpen).toBe(isOpen); expect(state.closingSoon).toBe(closingSoon);
});
test("CUS-01.2 CUS-01.9: overnight Sunday interval crosses week boundary and next opening wraps a week", async () => {
  const c = await clock(); const hours: Hours = [{ weekday: 7, opensAt: "23:00", closesAt: "01:00", closesNextDay: true }];
  expect(c.openingState(hours, "2026-10-18T16:30:00Z")).toMatchObject({ isOpen: true, closingSoon: true });
  expect(c.openingState(hours, "2026-10-18T17:00:00Z")).toEqual({ isOpen: false, closingSoon: false, nextOpeningAt: "2026-10-25T15:00:00Z" });
});
test("CUS-01.2 CUS-01.10: adjacent intervals remain continuously open past the first closing", async () => {
  const c = await clock(); const hours = [...monday, { weekday: 1, opensAt: "10:00", closesAt: "12:00", closesNextDay: false }];
  expect(c.openingState(hours, "2026-10-19T01:45:00Z")).toMatchObject({ isOpen: true, closingSoon: false });
  expect(c.openingState(hours, "2026-10-19T02:00:00Z")).toMatchObject({ isOpen: true, closingSoon: false });
});
test("CUS-01.2 CUS-01.9: absent hours yield closed without an invented next opening", async () => {
  expect((await clock()).openingState([], "2026-10-19T01:00:00Z")).toEqual({ isOpen: false, closingSoon: false, nextOpeningAt: null });
});
test("CUS-01.3 CUS-02.3: chosen Singapore minute converts to UTC independently of host timezone", async () => {
  const c = await clock(); const original = process.env.TZ;
  try { for (const zone of ["America/Los_Angeles", "UTC", "Asia/Tokyo"]) {
    process.env.TZ = zone; expect(c.singaporeMinuteToInstant("2026-10-19", "00:15")).toBe("2026-10-18T16:15:00Z");
  } } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
