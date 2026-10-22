// @vitest-environment node
import { expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createAiState, type AiCacheContext, type AiOperationContext } from "@/server/llm/ai-state";
import { prompts } from "@/server/llm/prompts";
import { limits } from "../../unit/usage/contracts";
import { prepFixture, matchingRows } from "../ai-state/fixtures";
import { queryAs, rpcAs } from "../usage/local";
import type { UsageRequest } from "@/server/llm/usage";
vi.setConfig({ testTimeout: 60_000 });

const configuration = () => ({ APP_ENV: "ci", AI_PROVIDER: "fake", SOCLAAS_BASE_URL: "http://127.0.0.1:1/v1", SOCLAAS_MODEL: "synthetic", SOCLAAS_REASONING_EFFORT: "none", ...limits() });
const envelope = (data: unknown) => Response.json({ choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(data) } }],
  usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 }, ignored_metadata: "PRIVATE_PROVIDER_CANARY" });
type Fixture = Awaited<ReturnType<typeof prepFixture>>;
function setup(f: Fixture) {
  const config = configuration();
  f.context.model = { provider: "fake", baseUrl: config.SOCLAAS_BASE_URL, model: config.SOCLAAS_MODEL, reasoningEffort: config.SOCLAAS_REASONING_EFFORT };
  f.context.contract = { feature: "prep_advisor", version: "1", systemPrompt: prompts.prep_advisor };
  const requests: UsageRequest[] = [];
  const reserve = vi.fn(async (request: UsageRequest) => { requests.push(request); return f.admission.reserve(request); });
  const state = createAiState({ environment: "ci", rpc: rpcAs(), admission: { reserve }, databaseClock: async () => f.now(),
    eligibleCafeIds: async actorId => (await queryAs("authenticated", actorId)("select id from public.cafes")).map(r => String(r.id)) });
  return { state, config, requests, reserve };
}
const snapshot = (c: AiCacheContext): AiOperationContext => ({ operationId: c.operationId, actorId: c.actorId, cafeId: c.cafeId, feature: c.feature, scope: c.scope, input: c.input, source: c.source });
const model = (f: Fixture) => { const s = f.result.suggestions[0]; return { suggestions: [{ itemId: s.itemId, weekday: s.weekday, direction: s.direction, evidenceIds: s.evidence.map(e => e.aggregateId) }] }; };

test("OWN-07.6: E04 an eligible daily entry is reused with zero provider calls", async () => {
  const f = await prepFixture(); const s = setup(f); const transport = vi.fn(async () => envelope(model(f)));
  expect(await s.state.runOperation(snapshot(f.context), { requestId: "first", getConfig: () => s.config, transport })).toMatchObject({ mode: "ai", source: "provider", data: f.result });
  const next = f.next(); s.requests.length = 0;
  expect(await s.state.runOperation(snapshot(next), { requestId: "second", getConfig: () => s.config, transport })).toMatchObject({ mode: "ai", source: "cache", data: f.result });
  expect(transport).toHaveBeenCalledTimes(1); expect(s.requests.map(r => r.event)).toEqual(["action"]);
});
test("OWN-07.6: E04 changed aggregates are a cache miss, never stale reuse", async () => {
  const f = await prepFixture(); const s = setup(f); const transport = vi.fn(async () => envelope(model(f)));
  await s.state.runOperation(snapshot(f.context), { requestId: "first", getConfig: () => s.config, transport });
  const changed = f.next(); changed.source = structuredClone(changed.source);
  (changed.source as { aggregates: { quantity: number }[] }).aggregates[0].quantity = 8;
  const result = await s.state.runOperation(snapshot(changed), { requestId: "changed", getConfig: () => s.config, transport });
  expect(result).toMatchObject({ mode: "ai", source: "provider" });
  expect((result as { data: { suggestions: { evidence: { quantity: number }[] }[] } }).data.suggestions[0].evidence[0].quantity).toBe(8);
  expect(transport).toHaveBeenCalledTimes(2);
});
test("OWN-07.6: E04 the entry expires at the next Singapore midnight", async () => {
  const f = await prepFixture(); const s = setup(f); const transport = vi.fn(async () => envelope(model(f)));
  await s.state.runOperation(snapshot(f.context), { requestId: "first", getConfig: () => s.config, transport });
  f.advance("2040-01-01T16:00:00.000Z");
  expect(await f.state.readCache(f.next())).toBeNull();
});
test("OWN-07.7: E05 manual refresh bypasses lookup with one attempt and replaces the eligible entry", async () => {
  const f = await prepFixture(); const s = setup(f);
  await s.state.runOperation(snapshot(f.context), { requestId: "seed", getConfig: () => s.config, transport: async () => envelope({ suggestions: [] }) });
  const next = f.next(); s.requests.length = 0; const transport = vi.fn(async () => envelope(model(f)));
  expect(await s.state.runOperation(snapshot(next), { requestId: "refresh", refresh: true, getConfig: () => s.config, transport })).toMatchObject({ mode: "ai", source: "provider", data: f.result });
  expect(transport).toHaveBeenCalledTimes(1); expect(s.requests.map(r => r.event)).toEqual(["refresh", "provider_attempt"]);
  expect((await f.state.readCache(f.next()))!.data).toEqual(f.result);
});
test.each(["timeout", "invalid"] as const)("OWN-07.7 OWN-07.14: E05 a failed %s refresh returns fallback and preserves the previous entry", async (failure) => {
  const f = await prepFixture(); const s = setup(f);
  await s.state.runOperation(snapshot(f.context), { requestId: "seed", getConfig: () => s.config, transport: async () => envelope(model(f)) });
  const before = await f.state.readCache(f.next()); const next = f.next();
  const transport = vi.fn(async () => failure === "timeout" ? Promise.reject(new Error("PRIVATE_TIMEOUT_CANARY")) : envelope({ suggestions: [{ invented: true }] }));
  expect(await s.state.runOperation(snapshot(next), { requestId: "failed", refresh: true, getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: "unavailable" });
  expect(transport).toHaveBeenCalledTimes(1);
  expect(await f.state.readCache(f.next())).toEqual(before);
  // Content-free telemetry: no source label, provider body or exception text.
  const stored = JSON.stringify(matchingRows(next.operationId));
  for (const canary of ["PRIVATE_TIMEOUT_CANARY", "PRIVATE_PROVIDER_CANARY", "Coffee", "invented"]) expect(stored).not.toContain(canary);
});
