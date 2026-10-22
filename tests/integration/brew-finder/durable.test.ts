// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
import { boundary, cafe, fallback, filters, providerEnvelope, query, setup } from "./fixtures";
import { scenario, insert, q } from "../moderation/fixtures";
import { localSql } from "../../e2e/accounts/local";
import { matchingRows } from "../ai-state/fixtures";
import { queryAs, rpcAs } from "../usage/local";
import { createAiState, type AiOperationContext, type AiOperationOptions } from "@/server/llm/ai-state";
import { createUsageAdmission, parseUsageLimits } from "@/server/llm/usage";
import prompts from "../llm/prompts.json";

vi.setConfig({ testTimeout: 60000 });
afterEach(() => { vi.clearAllMocks(); });

async function durable() {
  const f = await setup(); const domain = scenario();
  Object.assign(f.actor, { id: domain.customer.id, workspaceId: domain.customer.workspaceId });
  const itemId = randomUUID();
  insert("public.menu_items", { id: itemId, cafe_id: domain.cafe, name: "Iced coffee", drink_type: "coffee", price_cents: 450, sold_out: false });
  const c = cafe(); c.cafeId = domain.cafe; c.menu = [{ ...c.menu[0], itemId }]; f.source.cafes = [c];
  f.data.suggestions = [{ cafeId: domain.cafe, itemId, reason: "Coffee matches QUERY_CANARY" }];
  let now = "2040-01-01T01:00:00.000Z";
  const databaseClock = async () => now;
  const rpc = vi.fn(rpcAs());
  Object.assign(f.settings, { AI_GLOBAL_CALLS_PER_MINUTE: 1000000, AI_GLOBAL_CALLS_PER_DAY: 1000000, AI_BREW_FINDER_CALLS_PER_MINUTE: 1000000 });
  const eligibility = async (id: string) => (await queryAs("authenticated", id)("select id from public.cafes")).map(r => String(r.id));
  const create = () => createAiState({ environment: "ci", rpc, databaseClock, eligibleCafeIds: eligibility,
    admission: createUsageAdmission({ environment: "ci", rpc, databaseClock, limits: parseUsageLimits(f.settings) }) });
  const contexts: AiOperationContext[] = [];
  boundary.run.mockImplementation(async (context: AiOperationContext, options: AiOperationOptions) => {
    contexts.push(structuredClone(context));
    return create().runOperation(context, { ...options, getConfig: () => f.settings, transport: f.transport });
  });
  return { ...f, domain, rpc, contexts, create, advance: (value: string) => { now = value; } };
}
test("CUS-06.12 CUS-06.16: E02/E14 route binds exact same-actor input and real durable cache with ten-minute expiry", async () => {
  const f = await durable();
  f.transport.mockImplementation(async () => Response.json(providerEnvelope({ suggestions: [] })));
  expect(await (await f.post()).json()).toMatchObject({ mode: "ai", source: "provider", data: { suggestions: [] } });
  f.advance("2040-01-01T01:09:59.999Z");
  expect(await (await f.post()).json()).toMatchObject({ mode: "ai", source: "cache", data: { suggestions: [] } });
  expect(f.transport).toHaveBeenCalledTimes(1);
  f.advance("2040-01-01T01:10:00.000Z");
  expect(await (await f.post()).json()).toMatchObject({ mode: "ai", source: "provider" }); expect(f.transport).toHaveBeenCalledTimes(2);
  expect(f.contexts[0].input).toEqual({ query, filters });
});
test("CUS-06.12: exact query/filter/source/model changes cannot reuse the old cache", async () => {
  const f = await durable();
  expect(await (await f.post()).json()).toMatchObject({ mode: "ai", source: "provider" });
  expect(await (await f.post()).json()).toMatchObject({ mode: "ai", source: "cache" });
  expect(await (await f.post({ query: query + " ", filters })).json()).toMatchObject({ source: "provider" });
  expect(await (await f.post({ query, filters: { ...filters, area: "Central" } })).json()).toMatchObject({ source: "provider" });
  f.source.cafes[0].menu[0].name = "Changed coffee";
  expect(await (await f.post()).json()).toMatchObject({ source: "provider" });
  f.settings.SOCLAAS_MODEL = "changed-model";
  expect(await (await f.post()).json()).toMatchObject({ source: "provider" });
  f.source.cafes[0].reviews[0].rating = 1;
  expect(await (await f.post()).json()).toMatchObject({ source: "provider" });
  expect(f.transport).toHaveBeenCalledTimes(6);
});
test("CUS-06.4 CUS-06.12: E09 another actor cannot reuse actor A's durable cache", async () => {
  const f = await durable(); await f.post();
  f.actor.id = f.domain.reader.id;
  expect(await (await f.post()).json()).toMatchObject({ mode: "ai", source: "provider" }); expect(f.transport).toHaveBeenCalledTimes(2);
  expect(f.contexts[1].scope).toEqual({ actorId: f.domain.reader.id });
});
test("CUS-06.12: old Brew contract version cache is ignored by route composition", async () => {
  const f = await durable(); await f.post(); const context = f.contexts[0];
  if (context.feature !== "brew_finder") throw new Error("Wrong feature");
  const oldInput = { query: "legacy query", filters };
  expect(await f.create().writeCache({ ...context, input: oldInput,
    model: { provider: "fake", baseUrl: String(f.settings.SOCLAAS_BASE_URL), model: String(f.settings.SOCLAAS_MODEL), reasoningEffort: "none" },
    contract: { feature: "brew_finder", version: "1", systemPrompt: prompts.brew_finder } }, f.data)).toBe(true);
  expect(await (await f.post(oldInput)).json()).toMatchObject({ mode: "ai", source: "provider" }); expect(f.transport).toHaveBeenCalledTimes(2);
});
test("CUS-06.8 CUS-06.12: E16 open-state boundary invalidates cache even with unchanged candidate content", async () => {
  const f = await durable(); f.source.cafes[0].openingHours = [{ weekday: 1, opensAt: "09:00", closesAt: "10:00", closesNextDay: false }];
  await f.post(); expect(await (await f.post()).json()).toMatchObject({ source: "cache" });
  f.source.now = "2026-10-19T02:00:00Z";
  expect(await (await f.post()).json()).toMatchObject({ source: "provider" }); expect(f.transport).toHaveBeenCalledTimes(2);
});
test("CUS-06.8 CUS-06.9: E09/E11 disable and current RLS suspension defeat populated cache", async () => {
  const f = await durable(); await f.post(); f.settings.AI_PROVIDER = "disabled";
  await fallback(await f.post(), "disabled"); expect(f.transport).toHaveBeenCalledTimes(1);
  f.settings.AI_PROVIDER = "fake";
  localSql(`update public.cafes set suspended=true where id=${q(f.domain.cafe)};`);
  await fallback(await f.post(), "unavailable"); expect(f.transport).toHaveBeenCalledTimes(1);
});
test("CUS-06.10 CUS-06.13: E11 parallel different queries at final feature capacity dispatch exactly once across state instances", async () => {
  const f = await durable();
  // Separate controlled minute from all other fixtures; database caps remain authoritative.
  f.advance(new Date(Date.UTC(2050, 0, 1) + (Number.parseInt(randomUUID().slice(0, 8), 16) % 100000000) * 60000).toISOString());
  f.settings.AI_BREW_FINDER_CALLS_PER_MINUTE = 1;
  const results = await Promise.all([f.post({ query: "one", filters }), f.post({ query: "two", filters })]);
  const bodies = await Promise.all(results.map(r => r.json()));
  expect(bodies.filter(b => b.mode === "ai")).toHaveLength(1);
  expect(bodies.filter(b => b.reason === "usage_limited")).toHaveLength(1); expect(f.transport).toHaveBeenCalledTimes(1);
});
test("CUS-06.16: E12 durable audit stores allowlisted metadata and never query/provider content", async () => {
  const f = await durable(); await f.post({ query: "QUERY_CANARY", filters });
  const events = f.rpc.mock.calls.filter(([name, args]) => name === "ai_audit" || (name === "ai_state" && String(args.p_action).includes("audit")));
  expect(events.length).toBeGreaterThan(0);
  expect(JSON.stringify(events)).not.toMatch(/QUERY_CANARY|Coffee matches|RAW_REVIEW|PRIVATE_|SOCLAAS_API_KEY/);
  const audits = matchingRows(f.contexts[0].operationId).filter(({ table }) => table.name === "ai_audit_events");
  expect(audits.length).toBeGreaterThan(0);
  expect(JSON.stringify(audits)).not.toMatch(/QUERY_CANARY|Coffee matches|RAW_REVIEW|PRIVATE_/);
  // Cache publication contains validated advice; audit/accounting calls contain metadata only.
  const accounting = f.rpc.mock.calls.filter(([name]) => name === "reserve_ai_usage");
  expect(accounting.length).toBeGreaterThan(0); expect(JSON.stringify(accounting)).not.toMatch(/QUERY_CANARY|Coffee matches/);
  expect(f.contexts[0].actorId).toBe(f.domain.customer.id);
  const context = f.contexts[0];
  if (context.feature !== "brew_finder") throw new Error("Wrong feature");
  expect(JSON.stringify(context.source)).not.toMatch(/RAW_REVIEW|PRIVATE_|pickupAddress|priceCents|reviewId/);
  expect(context.source).toMatchObject({
    catalogue: [expect.objectContaining({ cafeId: f.domain.cafe, eligible: true, ratingSum: 4, ratingCount: 1,
      openNow: false, nextStateChangeAt: null, weeklyIntervals: [],
      items: [expect.objectContaining({ itemId: f.data.suggestions[0].itemId, soldOut: false })] })],
    candidateOrder: [f.domain.cafe], itemOrders: [{ cafeId: f.domain.cafe, itemIds: [f.data.suggestions[0].itemId] }],
  });
});
test("CUS-06.8 CUS-06.16: E16 item becomes sold-out during generation, rejects advice before durable success publication", async () => {
  const f = await durable();
  f.transport.mockImplementation(async () => { f.source.cafes[0].menu[0].soldOut = true; return Response.json(providerEnvelope(f.data)); });
  await fallback(await f.post(), "unavailable");
  expect(f.rpc.mock.calls.filter(([name, args]) => name === "ai_state" && args.p_action === "write")).toHaveLength(0);
});
test("CUS-06.7 CUS-06.16: rejected provider output produces no durable success and later valid request calls provider", async () => {
  const f = await durable(); f.transport.mockImplementationOnce(async () => Response.json(providerEnvelope({ suggestions: [], tool: "write" })));
  await fallback(await f.post(), "unavailable");
  expect(await (await f.post()).json()).toMatchObject({ mode: "ai", source: "provider" }); expect(f.transport).toHaveBeenCalledTimes(2);
  expect(f.rpc.mock.calls.filter(([name, args]) => name === "ai_state" && args.p_action === "write")).toHaveLength(1);
});
