import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { stateModule, type Context } from "../../unit/ai-state/contracts";
import { limits, usageModule } from "../../unit/usage/contracts";
import { queryAs, rpcAs, verifiedActors } from "../usage/local";
import { catalogue, identifier, literal, qualified, successfulSql } from "../schema/local-database";

/** Logical source snapshot; no unfinished feature adapter or catalogue UI is imported. */
export function brewSource(cafeId: string, itemId: string) {
  return {
    catalogue: [{ cafeId, name: "Synthetic Cafe", area: "Central", eligible: true,
      weeklyIntervals: [{ weekday: 1, opensAt: "09:00", closesAt: "18:00", closesNextDay: false }],
      openNow: true, nextStateChangeAt: "2040-01-01T10:00:00Z", ratingSum: 9, ratingCount: 2,
      items: [{ itemId, name: "Coffee", drinkType: "coffee", soldOut: false }, { itemId: "second-item", name: "Tea", drinkType: "tea", soldOut: false }] }],
    candidates: [{ cafeId, name: "Synthetic Cafe", area: "Central", items: [{ itemId, name: "Coffee", drinkType: "coffee" }, { itemId: "second-item", name: "Tea", drinkType: "tea" }] }],
    candidateOrder: [cafeId], itemOrders: [{ cafeId, itemIds: [itemId, "second-item"] }],
  };
}
export async function fixture(initial = "2040-01-01T15:50:00.000Z") {
  const api = await stateModule(); const usage = await usageModule(); const actors = verifiedActors();
  let now = initial;
  const databaseClock = async () => new Date(String((await queryAs()("select $1::timestamptz::text as now", [now]))[0].now)).toISOString();
  const admission = usage.createUsageAdmission({ environment: "ci", limits: limits({ AI_GLOBAL_CALLS_PER_MINUTE: 1000000, AI_GLOBAL_CALLS_PER_DAY: 1000000, AI_BREW_FINDER_CALLS_PER_MINUTE: 1000000, AI_PREP_ADVISOR_CALLS_PER_MINUTE: 1000000 }), rpc: rpcAs(), databaseClock });
  const eligibility = async (actorId: string) => (await queryAs("authenticated", actorId)("select id from public.cafes")).map(row => String(row.id));
  const create = (changes: Partial<Parameters<typeof api.createAiState>[0]> = {}) => api.createAiState({ environment: "ci", rpc: rpcAs(), admission, databaseClock, eligibleCafeIds: eligibility, ...changes });
  const itemId = randomUUID();
  const context: Context = { operationId: randomUUID(), actorId: actors.customer, feature: "brew_finder", scope: { actorId: actors.customer },
    input: { query: "Synthetic query", filters: { timeMode: "all", at: null, drinkType: null, area: null } }, source: brewSource(actors.cafe, itemId),
    model: { provider: "fake", baseUrl: "http://127.0.0.1:1/v1", model: "synthetic", reasoningEffort: "none" },
    contract: { feature: "brew_finder", version: "2", systemPrompt: "synthetic contract identity" } };
  const result = { suggestions: [{ cafeId: actors.cafe, itemId, reason: "Synthetic result" }] };
  return { api, actors, context, result, admission, create, state: create(), now: () => now,
    advance: (instant: string) => { now = instant; },
    next: (changes: Partial<Context> = {}): Context => ({ ...context, operationId: randomUUID(), ...changes }),
    eligibility: async (changes: string) => { successfulSql(`update public.cafes set ${changes} where id=${literal(actors.cafe)};`); },
  };
}
export async function prepFixture() {
  const f = await fixture(); const itemId = randomUUID(); const aggregateId = randomUUID();
  f.context.actorId = f.actors.owner; f.context.cafeId = f.actors.cafe; f.context.feature = "prep_advisor";
  f.context.scope = { cafeId: f.actors.cafe, businessDate: "2040-01-01" };
  f.context.input = { cafeId: f.actors.cafe, businessDate: "2040-01-01" };
  f.context.source = { businessDate: "2040-01-01", period: { from: "2039-12-01", through: "2039-12-31" }, aggregates: [{ aggregateId, itemId, itemName: "Coffee", weekday: 1, quantity: 7 }] };
  f.context.contract = { feature: "prep_advisor", version: "1", systemPrompt: "synthetic contract identity" };
  const result = { suggestions: [{ itemId, weekday: 1, direction: "more", evidence: [{ aggregateId, quantity: 7 }], reason: "Prepare more of this item on weekday 1; recorded quantities: 7." }] };
  return { ...f, result };
}
/** Discover implementation-owned tables; no production generic-SQL seam is required. */
export function matchingRows(marker: string) {
  return catalogue().flatMap(table => {
    const rows = JSON.parse(successfulSql(`select coalesce(json_agg(t),'[]'::json) from ${qualified(table)} t;`)) as Record<string, unknown>[];
    return rows.filter(row => JSON.stringify(row).includes(marker)).map(row => ({ table, row }));
  });
}
export function assertStored(marker: string) { const rows = matchingRows(marker); expect(rows.length, `Expected durable rows for ${marker}`).toBeGreaterThan(0); return rows; }
export const tableRows = (schema: string, name: string) => JSON.parse(successfulSql(`select coalesce(json_agg(t),'[]'::json) from ${identifier(schema)}.${identifier(name)} t;`)) as Record<string, unknown>[];
