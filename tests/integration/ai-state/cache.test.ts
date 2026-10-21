// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { fixture, prepFixture, assertStored, matchingRows } from "./fixtures";
import { identifier, literal, qualified, successfulSql } from "../schema/local-database";
vi.mock("server-only", () => ({}));
vi.setConfig({ testTimeout: 30_000 });

test("SYS-10.1: validated Brew envelope persists across repository instances with exact ten-minute expiry", async () => {
  const f = await fixture(); expect(await f.state.writeCache(f.context, f.result)).toBe(true);
  const cached = await f.create().readCache(f.context);
  expect(cached).toMatchObject({ version: "1", environment: "ci", feature: "brew_finder", scope: f.context.scope, data: f.result });
  expect(new Date(cached!.createdAt).toISOString()).toBe(f.now());
  expect(new Date(cached!.expiresAt).toISOString()).toBe("2040-01-01T16:00:00.000Z");
  expect(Object.keys(cached!).sort()).toEqual(["version", "feature", "environment", "scope", "inputFingerprint", "sourceRevision", "modelIdentity", "contractIdentity", "createdAt", "expiresAt", "data"].sort());
  for (const key of ["inputFingerprint", "sourceRevision", "modelIdentity", "contractIdentity"] as const) expect(cached![key]).toMatch(/^[0-9a-f]{64}$/);
  assertStored(String((f.context.scope as { actorId: string }).actorId));
  f.advance("2040-01-01T15:59:59.999Z"); expect(await f.create().readCache(f.context)).not.toBeNull();
  f.advance("2040-01-01T16:00:00.000Z"); expect(await f.create().readCache(f.context)).toBeNull();
});
test("SYS-10.1, SEC-07.1: Prep expires precisely at Singapore midnight without cleanup", async () => {
  const f = await prepFixture(); expect(await f.state.writeCache(f.context, f.result)).toBe(true);
  expect((await f.create().readCache(f.context))!.expiresAt).toBe("2040-01-01T16:00:00.000Z");
  f.advance("2040-01-01T15:59:59.999Z"); expect(await f.create().readCache(f.context)).not.toBeNull();
  f.advance("2040-01-01T16:00:00.000Z"); expect(await f.create().readCache(f.context)).toBeNull();
});
test("SYS-10.1, SYS-10.2, SEC-07.1: actor environment source model and contract mismatches miss", async () => {
  const f = await fixture(); await f.state.writeCache(f.context, f.result);
  for (const changes of [
    { actorId: f.actors.customer2, scope: { actorId: f.actors.customer2 } },
    { input: { ...f.context.input, query: "Synthetic query " } },
    { source: { ...f.context.source, candidateOrder: [] } },
    { model: { ...f.context.model, model: "changed" } },
    { model: { ...f.context.model, baseUrl: "http://127.0.0.1:2/v1" } },
    { model: { ...f.context.model, reasoningEffort: "low" } },
    { contract: { ...f.context.contract, version: "3" } },
    { contract: { ...f.context.contract, systemPrompt: "changed" } },
  ]) expect(await f.create().readCache(f.next(changes))).toBeNull();
  expect(await f.create({ environment: "local" }).readCache(f.context)).toBeNull();
  expect(await f.create().readCache(f.context)).not.toBeNull();
  successfulSql(`update public.profiles set role='owner' where id=${literal(f.actors.customer)};`);
  expect(await f.create().readCache(f.context)).toBeNull();
});
test("SYS-10.1, SYS-10.2, SEC-07.1: Prep cafe ownership business day and aggregate content isolate reuse", async () => {
  const f = await prepFixture(); await f.state.writeCache(f.context, f.result);
  expect(await f.create().readCache(f.next({ cafeId: randomUUID(), scope: { cafeId: randomUUID(), businessDate: "2040-01-01" } }))).toBeNull();
  expect(await f.create().readCache(f.next({ actorId: f.actors.customer }))).toBeNull();
  expect(await f.create().readCache(f.next({ scope: { cafeId: f.actors.cafe, businessDate: "2040-01-02" } }))).toBeNull();
  const source = structuredClone(f.context.source); (source.aggregates as { quantity: number }[])[0].quantity++;
  expect(await f.create().readCache(f.next({ source }))).toBeNull();
});
test.each(["suspended=true", "application_state='pending'"])("SYS-05.3, SYS-10.2, SEC-07.1: RLS eligibility change %s blocks existing Brew result", async change => {
  const f = await fixture(); await f.state.writeCache(f.context, f.result);
  expect(await f.create().readCache(f.context)).not.toBeNull();
  await f.eligibility(change);
  expect(await f.create().readCache(f.context)).toBeNull();
});
test("SYS-05.3, SYS-10.2, SEC-07.1: cafe suspended during fake generation never returns or stores AI result", async () => {
  const f = await fixture(); const provider = vi.fn(async () => { await f.eligibility("suspended=true"); return f.result; });
  expect((await f.state.invoke(f.context, { provider })).outcome).toBe("fallback");
  expect(await f.create().readCache(f.context)).toBeNull();
});
test.each([
  { suggestions: [{ cafeId: "foreign", itemId: "foreign", reason: "x" }] },
  { suggestions: [], unexpected: true }, { suggestions: "invalid" },
])("SYS-10.2, SEC-07.2: invalid provider payload %j is never stored as success", async invalid => {
  const f = await fixture(); expect(await f.state.writeCache(f.context, invalid)).toBe(false);
  expect((await f.state.invoke(f.context, { provider: async () => invalid })).outcome).toBe("fallback");
  expect(await f.create().readCache(f.context)).toBeNull();
});
test("SYS-10.1, SYS-09.4, SEC-07.2: refresh bypasses cache retains admission replaces only successful result", async () => {
  const f = await prepFixture(); await f.state.writeCache(f.context, f.result);
  const reserve = vi.fn(f.admission.reserve); const state = f.create({ admission: { reserve } });
  const replacement = { suggestions: [] }; const provider = vi.fn(async () => replacement);
  expect(await state.invoke(f.context, { refresh: true, provider })).toMatchObject({ outcome: "success", data: replacement });
  expect(reserve.mock.calls.some(([request]) => request.event === "refresh")).toBe(true);
  expect(reserve.mock.calls.filter(([request]) => request.event === "provider_attempt")).toHaveLength(1);
  expect(provider).toHaveBeenCalledTimes(1); expect((await f.create().readCache(f.context))!.data).toEqual(replacement);
});
test.each(["failure", "denied", "invalid"])("SYS-10.1, SEC-07.2: %s refresh returns fallback and preserves eligible old envelope", async failure => {
  const f = await prepFixture(); await f.state.writeCache(f.context, f.result); const before = await f.state.readCache(f.context);
  const reserve = vi.fn(async (request: Parameters<typeof f.admission.reserve>[0]) => failure === "denied" && request.event === "refresh" ? { admitted: false } : f.admission.reserve(request));
  const provider = vi.fn(async () => { if (failure === "failure") throw new Error("synthetic failure"); return { broken: true }; });
  expect((await f.create({ admission: { reserve } }).invoke(f.context, { refresh: true, provider })).outcome).toBe("fallback");
  if (failure === "denied") expect(provider).not.toHaveBeenCalled();
  expect(await f.create().readCache(f.context)).toEqual(before);
  expect(await f.create().readCache(f.next({ actorId: f.actors.customer }))).toBeNull();
  f.advance("2040-01-01T16:00:00.000Z"); expect(await f.create().readCache(f.context)).toBeNull();
});

test("SYS-10.2, SEC-07.1, SEC-07.2: corrupt persisted payload is revalidated as a miss", async () => {
  const f = await fixture(); await f.state.writeCache(f.context, f.result);
  expect(await f.create().readCache(f.context)).not.toBeNull();
  const stored = matchingRows(f.actors.customer).find(({ row }) => Object.values(row).some(value => value && typeof value === "object" && JSON.stringify(value).includes("suggestions")));
  expect(stored, "Validated cache has a persisted structured payload").toBeDefined();
  const { table, row } = stored!;
  const column = Object.entries(row).find(([, value]) => value && typeof value === "object" && JSON.stringify(value).includes("suggestions"))![0];
  const where = table.primary.map(key => `${identifier(key)}=${literal(row[key] as string | number | boolean)}`).join(" and ");
  expect(where).not.toBe("");
  successfulSql(`update ${qualified(table)} set ${identifier(column)}=${literal('{"version":"invalid","suggestions":"poisoned"}')} where ${where};`);
  expect(await f.create().readCache(f.context)).toBeNull();
});
