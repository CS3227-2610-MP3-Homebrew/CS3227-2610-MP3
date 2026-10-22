// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

type Hours = { weekday: number; opensAt: string; closesAt: string; closesNextDay: boolean }[];
type Pickup = { pickupSlots(hours: Hours, cutoffMinutes: number | undefined, now: string): string[] };
async function policy(): Promise<Pickup> {
  const path = resolve("src/server/orders/pickup.ts");
  expect(existsSync(path), "Missing implementation: customer pickup policy").toBe(true);
  return import(/* @vite-ignore */ path);
}
const monday: Hours = [{ weekday: 1, opensAt: "09:00", closesAt: "10:00", closesNextDay: false }];
const at = (time: string) => `2026-10-19T${time}Z`;
for (const [now, expected] of [
  ["00:45:00", ["01:00:00", "01:15:00", "01:30:00", "01:45:00"]],
  ["00:45:01", ["01:15:00", "01:30:00", "01:45:00"]],
  ["01:30:00", ["01:45:00"]], ["01:30:01", []], ["02:00:00", []],
] as const) test(`CUS-03.2: exact Singapore grid, 15-minute lead and inclusive cutoff at ${now}`, async () => {
  expect((await policy()).pickupSlots(monday, 15, at(now))).toEqual(expected.map(at));
});
for (const [cutoff, expected] of [[undefined, 4], [0, 4], [15, 4], [30, 3], [60, 1], [180, 0]] as const)
  test(`CUS-03.2: cutoff ${cutoff ?? "default 15"} permits equality but excludes closing`, async () => {
    const slots = (await policy()).pickupSlots(monday, cutoff, at("00:00:00"));
    expect(slots).toHaveLength(expected);
    expect(slots).not.toContain(at("02:00:00"));
    if (expected) expect(slots[0]).toBe(at("01:00:00"));
  });
test("CUS-03.2: Sunday overnight interval includes Monday pickup using its actual Singapore date", async () => {
  const hours: Hours = [{ weekday: 7, opensAt: "23:00", closesAt: "01:00", closesNextDay: true }];
  const slots = (await policy()).pickupSlots(hours, 15, "2026-10-18T16:00:00Z");
  expect(slots.slice(0, 3)).toEqual(["2026-10-18T16:15:00Z", "2026-10-18T16:30:00Z", "2026-10-18T16:45:00Z"]);
  expect(slots).not.toContain("2026-10-18T17:00:00Z");
  expect(slots).toContain("2026-10-25T15:00:00Z");
  expect(slots).not.toContain("2026-10-25T16:00:00Z"); // next Monday is outside the seven-date horizon
});
test("CUS-03.2: adjacent intervals form one continuous opening interval before cutoff", async () => {
  const hours = [...monday, { weekday: 1, opensAt: "10:00", closesAt: "12:00", closesNextDay: false }];
  const slots = (await policy()).pickupSlots(hours, 30, at("00:00:00"));
  expect(slots).toContain(at("01:45:00")); expect(slots).toContain(at("02:00:00"));
  expect(slots.at(-1)).toBe(at("03:30:00")); expect(slots).toHaveLength(11);
});
test("CUS-03.2: horizon includes today plus six Singapore dates and excludes the seventh", async () => {
  const hours: Hours = Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, opensAt: "09:00", closesAt: "10:00", closesNextDay: false }));
  const slots = (await policy()).pickupSlots(hours, 15, at("00:00:00"));
  expect(slots).toHaveLength(28); expect(slots.at(-1)).toBe("2026-10-25T01:45:00Z");
  expect(slots).toEqual([...new Set(slots)].sort());
});
test("CUS-03.2: no hours gives an empty choice set without invented availability", async () => {
  expect((await policy()).pickupSlots([], 15, at("00:00:00"))).toEqual([]);
});
test("CUS-03.2: slots use Singapore dates independently of the host timezone", async () => {
  const original = process.env.TZ;
  try {
    const p = await policy();
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      expect(p.pickupSlots(monday, 15, at("00:45:00"))).toEqual(["01:00:00", "01:15:00", "01:30:00", "01:45:00"].map(at));
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
