// @vitest-environment node
import { expect, test } from "vitest";
import { hoursProblem, validateOwnerInput } from "@/lib/owner/cafe-input";

const h = (weekday: number, opensAt: string, closesAt: string, closesNextDay = false) => ({ weekday, opensAt, closesAt, closesNextDay });

test("owner hours validation accepts adjacency across the week boundary and names the first overlapping interval", () => {
  expect(hoursProblem([h(7, "22:00", "01:00", true), h(1, "01:00", "02:00")])).toBeNull();
  expect(hoursProblem([h(7, "23:00", "01:00", true), h(1, "00:30", "02:00")])).toBe("openingHours[1]: intervals must not overlap.");
  expect(hoursProblem([h(5, "10:00", "10:00", true)])).toBeNull();
  expect(hoursProblem([h(1, "09:00", "09:01", true)])).toMatch(/^openingHours\[0\]:/);
});

test("owner input messages name the field without echoing submitted values or unknown keys", () => {
  const result = validateOwnerInput("settings", { description: "SECRET", openingHours: [], pickupSettings: { pickupCutoffMinutes: 181 }, expectedSuspensionVersion: 0 });
  expect(result).toEqual({ ok: false, message: "pickupSettings.pickupCutoffMinutes: must be a whole number of minutes from 0 to 180." });
  const extra = validateOwnerInput("settings", { description: "", openingHours: [], pickupSettings: { pickupCutoffMinutes: 1 }, expectedSuspensionVersion: 0, leakedKeyName: 1 });
  expect(extra.ok).toBe(false); if (!extra.ok) expect(extra.message).not.toContain("leakedKeyName");
});

test("owner application input is trimmed and measured in Unicode code points", () => {
  const base = { submissionKey: "6f1c1f9e-8f55-4c55-9a1e-2a3b4c5d6e7f", description: "  a\nb  ", area: "East", openingHours: [], pickupSettings: {} };
  const ok = validateOwnerInput("application", { ...base, name: ` ${"😀".repeat(100)} `, pickupAddress: " 1234567890 " });
  expect(ok).toMatchObject({ ok: true, value: { name: "😀".repeat(100), description: "a\nb", pickupAddress: "1234567890" } });
  expect(validateOwnerInput("application", { ...base, name: "😀".repeat(101), pickupAddress: "1234567890" }).ok).toBe(false);
});
