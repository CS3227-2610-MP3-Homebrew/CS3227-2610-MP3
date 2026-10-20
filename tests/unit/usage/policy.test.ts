// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { limitKeys, limits, usageModule } from "./contracts";
import { request } from "../../integration/usage/local";

vi.mock("server-only", () => ({}));

describe("explicit usage policy", () => {
  test("SYS-09.5, SEC-06.2: an authorized cache hit makes no reservation or provider attempt", async () => {
    const api = await usageModule(); const reserve = vi.fn(); const provider = vi.fn();
    const result = await api.dispatchWithAdmission({ admission: { reserve }, request: request(), cached: { value: { synthetic: true } }, provider });
    expect(result.outcome).toBe("success"); expect(reserve).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
  });
  test("SEC-06.3: all explicitly configured nonnegative integers, including zero, validate", async () => {
    const api = await usageModule();
    expect(api.parseUsageLimits(limits())).toEqual(limits());
    expect(api.parseUsageLimits(Object.fromEntries(Object.entries(limits()).map(([key, value]) => [key, String(value)])))).toEqual(limits());
    expect(api.parseUsageLimits(Object.fromEntries(limitKeys.map((key) => [key, 0])))).not.toBeNull();
  });
  for (const key of limitKeys) {
    test(`SEC-06.3: ${key} missing or invalid cannot remove the limit`, async () => {
      const api = await usageModule();
      for (const invalid of [undefined, null, "", "unlimited", -1, "-1", 1.5, "1.5", NaN, Infinity, true, {}, []]) {
        expect(api.parseUsageLimits({ ...limits(), [key]: invalid }), String(invalid)).toBeNull();
      }
    });
  }
  test.each([
    ["AI_BREW_FINDER_CALLS_PER_ACTION", 3], ["AI_PREP_ADVISOR_CALLS_PER_ACTION", 2],
    ["AI_MODERATION_CALLS_PER_ACTION", 2], ["AI_MODERATION_REVIEWS_PER_CALL", 21],
  ])("SEC-06.3: rejects unsafe maximum %s=%s", async (key, value) => {
    expect((await usageModule()).parseUsageLimits({ ...limits(), [key]: value })).toBeNull();
  });
  test("SYS-09.5, SEC-06.3: missing policy prevents dispatch with an authorized fallback", async () => {
    const api = await usageModule(); const provider = vi.fn();
    const admission = api.createUsageAdmission({ environment: "ci", limits: null, rpc: vi.fn() });
    expect((await api.dispatchWithAdmission({ admission, request: request(), provider })).outcome).toBe("fallback");
    expect(provider).not.toHaveBeenCalled();
  });
  test.each([false, "unavailable"])("SYS-09.5, SEC-06.3: denied/unavailable admission (%s) dispatches nothing", async (state) => {
    const api = await usageModule(); const provider = vi.fn();
    const reserve = vi.fn(async () => { if (state === "unavailable") throw new Error("database unavailable"); return { admitted: false }; });
    expect((await api.dispatchWithAdmission({ admission: { reserve }, request: request(), provider })).outcome).toBe("fallback");
    expect(provider).not.toHaveBeenCalled();
  });
  test("SYS-09.5, SEC-06.3: returned tokens survive and absent tokens/cost remain unknown", async () => {
    const api = await usageModule(); const admission = { reserve: async () => ({ admitted: true }) };
    const tokens = { input: 17, output: 8, total: 25 };
    const result = await api.dispatchWithAdmission({ admission, request: request(), provider: async () => ({ value: {}, tokens }) });
    expect(result.outcome).toBe("success"); expect(result.tokens).toEqual(tokens); expect(result.cost == null).toBe(true);
    const unknown = await api.dispatchWithAdmission({ admission, request: request(), provider: async () => ({ value: {} }) });
    expect(unknown.tokens == null).toBe(true); expect(unknown.cost == null).toBe(true);
    const partial = await api.dispatchWithAdmission({ admission, request: request(), provider: async () => ({ value: {}, tokens: { input: 0 } }) });
    expect(partial.tokens).toEqual({ input: 0 }); expect(partial.tokens?.output == null).toBe(true); expect(partial.cost == null).toBe(true);
  });
});
