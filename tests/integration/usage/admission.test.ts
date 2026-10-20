// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { limits, usageModule, type Limits, type Request } from "../../unit/usage/contracts";
import { clock, rpcAs, request, verifiedActors } from "./local";

vi.mock("server-only", () => ({}));

const instant = "2040-02-03T04:05:20.000Z";
async function fixture(changes: Partial<Limits> = {}, time = instant) {
  const api = await usageModule();
  const actors = verifiedActors();
  const config = limits(changes);
  const create = (timestamp = time, role: "service_role" | "anon" | "authenticated" = "service_role") =>
    api.createUsageAdmission({ environment: "ci", limits: config, rpc: rpcAs(role, actors.customer), databaseClock: clock(timestamp) });
  const admission = create();
  const next = (changes: Partial<Request> = {}) => {
    const feature = changes.feature ?? "brew-finder";
    return request({ actorId: feature === "prep-advisor" ? actors.owner : feature === "moderation-assistant" ? actors.admin : actors.customer, cafeId: feature === "prep-advisor" ? actors.cafe : undefined, ...changes });
  };
  return { api, admission, create, next, actors };
}
afterEach(() => vi.useRealTimers());

describe("durable usage through the local secret-key role", () => {
  test("SYS-09.1, SYS-09.2: service_role admits successfully and a reconstructed instance retains consumed capacity", async () => {
    const f = await fixture({ AI_USER_ACTIONS_PER_MINUTE: 1 });
    expect(await f.admission.reserve(f.next({ event: "action" }))).toMatchObject({ admitted: true });
    expect(await f.create().reserve(f.next({ event: "action" }))).toMatchObject({ admitted: false });
    vi.resetModules();
    const restarted = (await usageModule()).createUsageAdmission({ environment: "ci", limits: limits({ AI_USER_ACTIONS_PER_MINUTE: 1 }), rpc: rpcAs(), databaseClock: clock(instant) });
    expect(await restarted.reserve(f.next({ event: "action" }))).toMatchObject({ admitted: false });
    // Different actors keep their independent capacity.
    expect(await f.create().reserve(f.next({ actorId: f.actors.customer2, event: "action" }))).toMatchObject({ admitted: true });
  });
  test.each(["anon", "authenticated"] as const)("SYS-09.1, SEC-06.2: %s cannot authorize admissions", async (role) => {
    const f = await fixture();
    expect(await f.admission.reserve(f.next())).toMatchObject({ admitted: true });
    // A SQL authorization error or explicit denied result is valid; successful reservation is never valid.
    let admitted = false;
    try { admitted = (await f.create(instant, role).reserve(f.next())).admitted; }
    catch (error) { expect(String(error)).toMatch(/42501|permission denied|not authorized/i); }
    expect(admitted).toBe(false);
  });
  test("SYS-09.2, SEC-06.2: duplicate admission identity authorizes exactly one concurrent dispatch", async () => {
    const f = await fixture(); const identity = f.next();
    const results = await Promise.all(Array.from({ length: 6 }, () => f.create().reserve(identity)));
    expect(results.filter((r) => r.admitted)).toHaveLength(1);
  });
  test("SYS-09.2, SYS-09.5, SEC-06.2: daily last-capacity race admits exactly remaining capacity across instances", async () => {
    const f = await fixture({ AI_GLOBAL_CALLS_PER_DAY: 3 });
    // Isolate this environment/global window from the other cases with a unique day.
    const time = "2041-01-01T01:00:00Z";
    const results = await Promise.all(Array.from({ length: 8 }, () => f.create(time).reserve(f.next())));
    expect(results.filter((r) => r.admitted)).toHaveLength(3);
    expect(await f.create(time).reserve(f.next())).toMatchObject({ admitted: false });
  });
  test("SYS-09.2, SEC-06.2: denied multi-scope reservation leaves every other counter unchanged", async () => {
    const f = await fixture({ AI_GLOBAL_CALLS_PER_DAY: 1, AI_BREW_FINDER_CALLS_PER_ACTION: 1 });
    const time = "2042-01-01T15:59:59Z"; const operationId = randomUUID();
    expect(await f.create(time).reserve(f.next())).toMatchObject({ admitted: true });
    expect(await f.create(time).reserve(f.next({ operationId }))).toMatchObject({ admitted: false });
    // The previous denial must not have charged the operation counter: new day frees only the global scope.
    expect(await f.create("2042-01-01T16:00:00Z").reserve(f.next({ operationId }))).toMatchObject({ admitted: true });
  });
  test("SYS-09.2, SEC-06.2: operation denial cannot spend remaining global or feature capacity", async () => {
    const f = await fixture({ AI_GLOBAL_CALLS_PER_DAY: 2, AI_BREW_FINDER_CALLS_PER_MINUTE: 2, AI_BREW_FINDER_CALLS_PER_ACTION: 1 }, "2047-01-01T00:00:00Z");
    const operationId = randomUUID();
    expect(await f.admission.reserve(f.next({ operationId }))).toMatchObject({ admitted: true });
    expect(await f.create().reserve(f.next({ operationId }))).toMatchObject({ admitted: false });
    expect(await f.create().reserve(f.next())).toMatchObject({ admitted: true });
    expect(await f.create().reserve(f.next())).toMatchObject({ admitted: false });
  });
  test.each([
    ["AI_USER_ACTIONS_PER_DAY", "action", "brew-finder"],
    ["AI_PREP_REFRESHES_PER_DAY", "refresh", "prep-advisor"],
    ["AI_MODERATION_RUNS_PER_DAY", "run", "moderation-assistant"],
  ] as const)("SEC-06.1, SYS-09.3: %s survives minute rollover and opens only at Singapore midnight", async (key, event, feature) => {
    const f = await fixture({ [key]: 1 });
    expect(await f.create("2048-01-01T15:58:59Z").reserve(f.next({ event, feature }))).toMatchObject({ admitted: true });
    expect(await f.create("2048-01-01T15:59:00Z").reserve(f.next({ event, feature }))).toMatchObject({ admitted: false });
    expect(await f.create("2048-01-01T16:00:00Z").reserve(f.next({ event, feature }))).toMatchObject({ admitted: true });
  });
  test.each([
    ["AI_USER_ACTIONS_PER_MINUTE", "action", "brew-finder"],
    ["AI_USER_ACTIONS_PER_DAY", "action", "brew-finder"],
    ["AI_PREP_REFRESHES_PER_DAY", "refresh", "prep-advisor"],
    ["AI_MODERATION_RUNS_PER_DAY", "run", "moderation-assistant"],
  ] as const)("SEC-06.1: concurrent %s enforces actor or café scope", async (key, event, feature) => {
    const f = await fixture({ [key]: 1 }); const cafeId = f.actors.cafe;
    const results = await Promise.all(Array.from({ length: 5 }, () => f.create().reserve(f.next({ event, feature, cafeId }))));
    expect(results.filter((r) => r.admitted)).toHaveLength(1);
  });
  test.each([
    ["AI_GLOBAL_CALLS_PER_MINUTE", "brew-finder"],
    ["AI_BREW_FINDER_CALLS_PER_MINUTE", "brew-finder"],
    ["AI_PREP_ADVISOR_CALLS_PER_MINUTE", "prep-advisor"],
    ["AI_MODERATION_CALLS_PER_MINUTE", "moderation-assistant"],
  ] as const)("SEC-06.2: %s blocks excess provider attempts", async (key, feature) => {
    const f = await fixture({ [key]: 1 });
    // Separate global/feature namespaces by unique minute without truncating shared tables.
    const time = `2043-01-01T00:${String(["AI_GLOBAL_CALLS_PER_MINUTE", "AI_BREW_FINDER_CALLS_PER_MINUTE", "AI_PREP_ADVISOR_CALLS_PER_MINUTE", "AI_MODERATION_CALLS_PER_MINUTE"].indexOf(key)).padStart(2, "0")}:00Z`;
    const results = await Promise.all(Array.from({ length: 5 }, () => f.create(time).reserve(f.next({ feature }))));
    expect(results.filter((r) => r.admitted)).toHaveLength(1);
  });
  test.each([
    ["brew-finder", 2], ["prep-advisor", 1], ["moderation-assistant", 1],
  ] as const)("SEC-06.2: %s operation has at most %s independently admitted calls", async (feature, cap) => {
    const f = await fixture(); const operationId = randomUUID();
    const results = await Promise.all(Array.from({ length: 4 }, () => f.create().reserve(f.next({ feature, operationId }))));
    expect(results.filter((r) => r.admitted)).toHaveLength(cap);
  });
  test("SYS-09.3, SEC-06.1: fixed minute half-open boundary has independent counters before/at/after", async () => {
    const f = await fixture({ AI_USER_ACTIONS_PER_MINUTE: 1 });
    expect(await f.create("2044-01-01T00:00:59.999Z").reserve(f.next({ event: "action" }))).toMatchObject({ admitted: true });
    expect(await f.create("2044-01-01T00:01:00.000Z").reserve(f.next({ event: "action" }))).toMatchObject({ admitted: true });
    expect(await f.create("2044-01-01T00:01:00.001Z").reserve(f.next({ event: "action" }))).toMatchObject({ admitted: false });
    expect(await f.create("2044-01-01T00:00:59.999Z").reserve(f.next({ event: "action" }))).toMatchObject({ admitted: false });
  });
  test("SYS-09.3, SYS-09.5, SEC-06.2: Singapore midnight creates new daily capacity and preserves the earlier day", async () => {
    const f = await fixture({ AI_GLOBAL_CALLS_PER_DAY: 1 });
    expect(await f.create("2045-01-01T15:59:59.999Z").reserve(f.next())).toMatchObject({ admitted: true });
    expect(await f.create("2045-01-01T16:00:00.000Z").reserve(f.next())).toMatchObject({ admitted: true });
    expect(await f.create("2045-01-01T16:00:00.001Z").reserve(f.next())).toMatchObject({ admitted: false });
    expect(await f.create("2045-01-01T15:59:59.999Z").reserve(f.next())).toMatchObject({ admitted: false });
  });
  test("SYS-09.1, SYS-09.3: default membership uses database time despite an incorrect app clock", async () => {
    const api = await usageModule(); const actorId = verifiedActors().customer;
    const create = () => api.createUsageAdmission({ environment: "ci", limits: limits({ AI_USER_ACTIONS_PER_DAY: 1 }), rpc: rpcAs() });
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2050-01-01T00:00:00Z"));
    expect(await create().reserve(request({ actorId, event: "action" }))).toMatchObject({ admitted: true });
    vi.setSystemTime(new Date("2050-01-03T00:00:00Z"));
    expect(await create().reserve(request({ actorId, event: "action" }))).toMatchObject({ admitted: false });
  });
  test("SYS-09.1: local and CI configurations use independent persisted namespaces", async () => {
    const f = await fixture({ AI_USER_ACTIONS_PER_MINUTE: 1 });
    expect(await f.admission.reserve(f.next({ event: "action" }))).toMatchObject({ admitted: true });
    const local = f.api.createUsageAdmission({ environment: "local", limits: limits({ AI_USER_ACTIONS_PER_MINUTE: 2 }), rpc: rpcAs(), databaseClock: clock(instant) });
    expect(await local.reserve(f.next({ event: "action" }))).toMatchObject({ admitted: true });
    expect(await local.reserve(f.next({ event: "action" }))).toMatchObject({ admitted: true });
    expect(await local.reserve(f.next({ event: "action" }))).toMatchObject({ admitted: false });
  });
  test.each(["429", "timeout", "transport", "invalid output"])("SYS-09.5, SEC-06.2: fake %s falls back without retry or refund", async (failure) => {
    const f = await fixture({ AI_GLOBAL_CALLS_PER_DAY: 1 }, `2046-01-0${["429", "timeout", "transport", "invalid output"].indexOf(failure) + 1}T00:00:00Z`); const operationId = randomUUID();
    const provider = vi.fn(async () => { throw Object.assign(new Error(failure), { status: failure === "429" ? 429 : undefined }); });
    expect((await f.api.dispatchWithAdmission({ admission: f.admission, request: f.next({ operationId }), provider })).outcome).toBe("fallback");
    expect(provider).toHaveBeenCalledTimes(1);
    expect(await f.create().reserve(f.next())).toMatchObject({ admitted: false });
  });
  test.each([
    ["AI_GLOBAL_CALLS_PER_MINUTE", "provider_attempt", "brew-finder"],
    ["AI_BREW_FINDER_CALLS_PER_MINUTE", "provider_attempt", "brew-finder"],
    ["AI_PREP_ADVISOR_CALLS_PER_MINUTE", "provider_attempt", "prep-advisor"],
    ["AI_MODERATION_CALLS_PER_MINUTE", "provider_attempt", "moderation-assistant"],
    ["AI_BREW_FINDER_CALLS_PER_ACTION", "provider_attempt", "brew-finder"],
    ["AI_PREP_ADVISOR_CALLS_PER_ACTION", "provider_attempt", "prep-advisor"],
    ["AI_MODERATION_CALLS_PER_ACTION", "provider_attempt", "moderation-assistant"],
    ["AI_USER_ACTIONS_PER_MINUTE", "action", "brew-finder"],
    ["AI_USER_ACTIONS_PER_DAY", "action", "brew-finder"],
    ["AI_PREP_REFRESHES_PER_DAY", "refresh", "prep-advisor"],
    ["AI_MODERATION_RUNS_PER_DAY", "run", "moderation-assistant"],
  ] as const)("SEC-06.3: zero %s denies its relevant work", async (key, event, feature) => {
    const f = await fixture({ [key]: 0 });
    expect(await f.admission.reserve(f.next({ event, feature }))).toMatchObject({ admitted: false });
  });
  test("SYS-09.5, SEC-06.3: zero daily cap prevents a provider call", async () => {
    const f = await fixture({ AI_GLOBAL_CALLS_PER_DAY: 0 }); const provider = vi.fn();
    expect((await f.api.dispatchWithAdmission({ admission: f.admission, request: f.next(), provider })).outcome).toBe("fallback");
    expect(provider).not.toHaveBeenCalled();
  });
});
