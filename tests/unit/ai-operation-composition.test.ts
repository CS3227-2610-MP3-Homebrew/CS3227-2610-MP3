// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createAiState, type AiCacheContext, type AiOperationContext } from "@/server/llm/ai-state";
import { createAiAudit } from "@/server/llm/ai-audit";
import { Fixture as DatabaseFixture, literal, successfulSql } from "../integration/schema/local-database";
import { runLlmOperation } from "@/server/llm/operations";
import { prompts } from "@/server/llm/prompts";
import { limits } from "./usage/contracts";
import { fixture, prepFixture, matchingRows } from "../integration/ai-state/fixtures";
import { queryAs, rpcAs } from "../integration/usage/local";
import type { UsageRequest, UsageRpc } from "@/server/llm/usage";
vi.setConfig({ testTimeout: 60_000 });
const configuration = () => ({ APP_ENV: "ci", AI_PROVIDER: "fake", SOCLAAS_BASE_URL: "http://127.0.0.1:1/v1", SOCLAAS_MODEL: "synthetic", SOCLAAS_REASONING_EFFORT: "none", ...limits() });
const envelope = (data: unknown, usage: unknown = { prompt_tokens: 0, completion_tokens: 7, total_tokens: "unknown" }) => Response.json({
  choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(data) } }], usage,
  ignored_metadata: "PRIVATE_PROVIDER_CANARY",
});
type Fixture = Pick<Awaited<ReturnType<typeof fixture>>, "context" | "admission" | "now">;
function setup(f: Fixture, changes: Partial<Parameters<typeof createAiState>[0]> = {}) {
  const config = configuration();
  f.context.model = { provider: "fake", baseUrl: config.SOCLAAS_BASE_URL, model: config.SOCLAAS_MODEL, reasoningEffort: config.SOCLAAS_REASONING_EFFORT };
  f.context.contract = { feature: f.context.feature, version: f.context.feature === "brew_finder" ? "2" : "1", systemPrompt: prompts[f.context.feature] };
  const requests: UsageRequest[] = [];
  const reserve = vi.fn(async (request: UsageRequest) => { requests.push(request); return f.admission.reserve(request); });
  const rpc: UsageRpc = rpcAs();
  const state = createAiState({ environment: "ci", rpc, admission: { reserve }, databaseClock: async () => f.now(),
    eligibleCafeIds: async actorId => (await queryAs("authenticated", actorId)("select id from public.cafes")).map(r => String(r.id)),
    ...changes,
  });
  return { state, config, requests, reserve };
}
const snapshot = (c: AiCacheContext): AiOperationContext => ({ operationId: c.operationId, actorId: c.actorId,
  ...(c.cafeId ? { cafeId: c.cafeId } : {}), feature: c.feature, scope: c.scope, input: c.input, source: c.source });
const audit = (operationId: string) => matchingRows(operationId).filter(({ table }) => table.name === "ai_audit_events").map(({ row }) => row);
const admissions = (operationId: string) => matchingRows(operationId).filter(({ table }) => table.name === "ai_usage_admissions").map(({ row }) => row.event).sort();

test("composed Brew operation reserves each stage once, persists provider tokens, then audits a zero-dispatch cache hit", async () => {
  const f = await fixture(); f.context.input.query = "PRIVATE_QUERY_CANARY";
  const s = setup(f); const transport = vi.fn(async () => envelope(f.result));
  expect(await s.state.runOperation(snapshot(f.context), { requestId: "first", getConfig: () => s.config, transport })).toMatchObject({ mode: "ai", source: "provider", data: f.result });
  expect(s.requests.map(r => r.event)).toEqual(["action", "provider_attempt"]);
  expect(admissions(f.context.operationId)).toEqual(["action", "provider_attempt"]);
  expect(audit(f.context.operationId)).toContainEqual(expect.objectContaining({ outcome: "success", input_tokens: 0, output_tokens: 7, total_tokens: null }));
  const serialized = JSON.stringify(audit(f.context.operationId));
  for (const canary of ["PRIVATE_QUERY_CANARY", "PRIVATE_PROVIDER_CANARY", "Synthetic result"]) expect(serialized).not.toContain(canary);
  expect(await f.state.readCache(f.context)).toMatchObject({ data: f.result });
  const next = f.next(); s.requests.length = 0;
  expect(await s.state.runOperation(snapshot(next), { requestId: "second", getConfig: () => s.config, transport })).toMatchObject({ mode: "ai", source: "cache", data: f.result });
  expect(s.requests.map(r => r.event)).toEqual(["action"]);
  expect(admissions(next.operationId)).toEqual(["action"]);
  expect(transport).toHaveBeenCalledTimes(1);
  expect(audit(next.operationId)).toContainEqual(expect.objectContaining({ outcome: "cache", input_tokens: null, output_tokens: null }));
});

test("composed Prep refresh reserves refresh and provider once and shares model validation plus deterministic evidence rendering", async () => {
  const f = await prepFixture(); const s = setup(f);
  await s.state.runOperation(snapshot(f.context), { requestId: "seed", getConfig: () => s.config, transport: async () => envelope({ suggestions: [] }) });
  f.advance("2040-01-01T15:51:00.000Z");
  const next = f.next(); s.requests.length = 0;
  const suggestion = f.result.suggestions[0];
  const transport = vi.fn(async () => envelope({ suggestions: [{ itemId: suggestion.itemId, weekday: suggestion.weekday, direction: suggestion.direction, evidenceIds: suggestion.evidence.map(e => e.aggregateId) }] }));
  expect(await s.state.runOperation(snapshot(next), { requestId: "refresh", refresh: true, getConfig: () => s.config, transport })).toMatchObject({ mode: "ai", source: "provider", data: f.result });
  expect(admissions(next.operationId)).toEqual(["provider_attempt", "refresh"]);
  expect(s.requests.map(r => r.event)).toEqual(["refresh", "provider_attempt"]);
  expect(transport).toHaveBeenCalledTimes(1);
  expect((await f.state.readCache(next))!.data).toEqual(f.result);
  expect(audit(next.operationId)).toContainEqual(expect.objectContaining({ outcome: "success", output_tokens: 7 }));
});

for (const failure of ["429", "invalid", "denied"] as const) test(`composed ${failure} refresh preserves the earlier envelope and records the durable outcome`, async () => {
  const f = await prepFixture(); const s = setup(f);
  await s.state.runOperation(snapshot(f.context), { requestId: "seed", getConfig: () => s.config, transport: async () => envelope({ suggestions: [] }) });
  const before = await f.state.readCache(f.context); const next = f.next(); s.requests.length = 0;
  if (failure === "denied") s.reserve.mockImplementation(async request => request.event === "refresh" ? { admitted: false } : f.admission.reserve(request));
  const transport = vi.fn(async () => failure === "429" ? new Response("PRIVATE_FAILURE_CANARY", { status: 429 }) : envelope({ suggestions: [{ invented: true }] }));
  expect(await s.state.runOperation(snapshot(next), { requestId: "failed", refresh: true, getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: failure === "invalid" ? "unavailable" : "usage_limited" });
  expect(transport).toHaveBeenCalledTimes(failure === "denied" ? 0 : 1);
  expect(await f.state.readCache(next)).toEqual(before);
  const events = audit(next.operationId);
  expect(events).toContainEqual(expect.objectContaining({ outcome: failure === "denied" ? "denied" : "fallback" }));
  if (failure === "invalid") expect(events).toContainEqual(expect.objectContaining({ outcome: "fallback", input_tokens: 0, output_tokens: 7 }));
  expect(JSON.stringify(events)).not.toContain("PRIVATE_FAILURE_CANARY");
  expect(admissions(next.operationId)).toEqual(failure === "denied" ? [] : ["provider_attempt", "refresh"]);
});

test("composed moderation has one stage admission and durable token audit without cache reads or writes", async () => {
  const f = await fixture(); const s = setup(f); const operationId = randomUUID();
  const rpcCalls: string[] = []; const rpc = rpcAs();
  const state = createAiState({ environment: "ci", databaseClock: async () => f.now(), admission: { reserve: s.reserve },
    rpc: async (fn,args) => { rpcCalls.push(String(args.p_action)); return rpc(fn,args); }, eligibleCafeIds: async () => [],
  });
  const input: AiOperationContext = { feature: "moderation", operationId, actorId: f.actors.admin, scope: { actorId: f.actors.admin }, input: { reviews: [{ reviewId: "r1", text: "PRIVATE_REVIEW_CANARY" }] } };
  const data = { classifications: [{ reviewId: "r1", label: "ok", reason: "Relevant" }] };
  const transport = vi.fn(async () => envelope(data));
  expect(await state.runOperation(input, { requestId: "moderation", getConfig: () => s.config, transport })).toMatchObject({ mode: "ai", feature: "moderation", data });
  expect(admissions(operationId)).toEqual(["provider_attempt", "run"]);
  expect(rpcCalls).not.toContain("read"); expect(rpcCalls).not.toContain("write");
  expect(audit(operationId)).toContainEqual(expect.objectContaining({ feature: "moderation_assistant", outcome: "success", output_tokens: 7 }));
  expect(JSON.stringify(audit(operationId))).not.toContain("PRIVATE_REVIEW_CANARY");
  expect(transport).toHaveBeenCalledTimes(1);
});

test("composed disabled configuration precedes admission and cache; changed model never writes under its earlier identity", async () => {
  const f = await fixture(); const s = setup(f); s.config.AI_PROVIDER = "disabled";
  const transport = vi.fn(async () => envelope(f.result));
  expect(await s.state.runOperation(snapshot(f.context), { requestId: "disabled", getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: "disabled" });
  expect(s.requests).toEqual([]); expect(transport).not.toHaveBeenCalled();
  s.config.AI_PROVIDER = "fake";
  transport.mockImplementation(async () => { s.config.SOCLAAS_MODEL = "changed"; return envelope(f.result); });
  expect(await s.state.runOperation(snapshot(f.context), { requestId: "model-change", getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: "unavailable" });
  expect(await f.state.readCache(f.context)).toBeNull();
  expect(admissions(f.context.operationId)).toEqual(["action", "provider_attempt"]);
});

test("composed audit failure prevents transport and final audit disable retains the T-14 disabled fallback", async () => {
  const f = await fixture(); const s = setup(f); const rpc = rpcAs();
  let unavailable = true;
  const state = createAiState({ environment: "ci", databaseClock: async () => f.now(), admission: { reserve: s.reserve }, eligibleCafeIds: async () => [f.actors.cafe],
    rpc: async (fn,args) => {
      if (args.p_action === "audit") {
        if (unavailable) return { data: null, error: { message: "PRIVATE_STORAGE_CANARY" } };
        if ((args.p_request as Record<string,unknown>).outcome === "success") s.config.AI_PROVIDER = "disabled";
      }
      return rpc(fn,args);
    },
  });
  const transport = vi.fn(async () => envelope(f.result));
  expect(await state.runOperation(snapshot(f.context), { requestId: "storage-failure", getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: "unavailable" });
  expect(transport).not.toHaveBeenCalled(); expect(s.requests).toEqual([]);
  unavailable = false;
  const next = f.next();
  expect(await state.runOperation(snapshot(next), { requestId: "disable-after-audit", getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: "disabled" });
  expect(transport).toHaveBeenCalledTimes(1);
  expect(audit(next.operationId)).toContainEqual(expect.objectContaining({ outcome: "fallback", output_tokens: 7 }));
});


test("standalone usage callback retains its existing success-only behavior", async () => {
  const config = configuration(); const recordUsage = vi.fn();
  const options = { feature: "brew_finder" as const, requestId: "standalone", getConfig: () => config,
    input: { query: "coffee", candidates: [{ cafeId: "c1", name: "Cafe", area: "East", items: [{ itemId: "i1", name: "Coffee", drinkType: "coffee" }] }] },
    admit: async () => true, recordUsage,
  };
  expect(await runLlmOperation({ ...options, transport: async () => envelope({ suggestions: [] }) })).toMatchObject({ mode: "ai" });
  expect(recordUsage.mock.calls).toEqual([[{ input: 0, output: 7 }]]);
  recordUsage.mockClear();
  expect(await runLlmOperation({ ...options, transport: async () => envelope({ suggestions: [{ invented: true }] }) })).toMatchObject({ mode: "fallback", reason: "unavailable" });
  expect(recordUsage).not.toHaveBeenCalled();
});


for (const feature of ["brew_finder", "prep_advisor", "moderation"] as const) test(`initially disabled ${feature} records a content-free authorized fallback without admission/cache/provider work`, async () => {
  const f = feature === "prep_advisor" ? await prepFixture() : await fixture();
  const calls: string[] = []; const rpc = rpcAs();
  const s = setup(f, { rpc: async (fn,args) => { calls.push(String(args.p_action)); return rpc(fn,args); } });
  s.config.AI_PROVIDER = "disabled";
  const input = feature === "moderation"
    ? { operationId: f.context.operationId, actorId: f.actors.admin, feature, scope: { actorId: f.actors.admin }, input: { reviews: [{ reviewId: "r1", text: "PRIVATE_DISABLED_CANARY" }] } }
    : snapshot(f.context);
  const transport = vi.fn();
  expect(await s.state.runOperation(input, { requestId: "disabled", getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: "disabled" });
  expect(s.reserve).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
  expect(calls).toEqual(["authorize", "audit"]);
  const rows = audit(f.context.operationId);
  expect(rows).toContainEqual(expect.objectContaining({ actor_id: feature === "moderation" ? f.actors.admin : f.context.actorId, outcome: "fallback", input_tokens: null, output_tokens: null }));
  expect(JSON.stringify(rows)).not.toContain("PRIVATE_DISABLED_CANARY");
});

for (const invalid of ["model", "limit", "missing-key"] as const) test(`initial ${invalid} configuration fallback is audited without admission or cache access`, async () => {
  const f = await fixture(); const calls: string[] = []; const rpc = rpcAs();
  const s = setup(f, { rpc: async (fn,args) => { calls.push(String(args.p_action)); return rpc(fn,args); } });
  if (invalid === "model") s.config.SOCLAAS_MODEL = "";
  if (invalid === "limit") s.config.AI_GLOBAL_CALLS_PER_MINUTE = -1;
  if (invalid === "missing-key") Object.assign(s.config, { AI_PROVIDER: "soclaas", SOCLAAS_API_KEY: "" });
  const transport = vi.fn();
  expect(await s.state.runOperation(snapshot(f.context), { requestId: "invalid-config", getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: invalid === "missing-key" ? "disabled" : "unavailable" });
  expect(calls).toEqual(["authorize", "audit"]);
  expect(s.reserve).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
  expect(audit(f.context.operationId)).toContainEqual(expect.objectContaining({ outcome: "fallback" }));
});

test("legacy disabled invocation audits before cache identity construction and unauthorized metadata grants no audit", async () => {
  const f = await fixture(); const calls: string[] = []; const rpc = rpcAs();
  const s = setup(f, { enabled: () => false, rpc: async (fn,args) => { calls.push(String(args.p_action)); return rpc(fn,args); } });
  const provider = vi.fn();
  expect(await s.state.invoke(f.context, { provider })).toEqual({ outcome: "fallback" });
  expect(calls).toEqual(["authorize", "audit"]); expect(provider).not.toHaveBeenCalled(); expect(s.reserve).not.toHaveBeenCalled();
  expect(audit(f.context.operationId)).toContainEqual(expect.objectContaining({ outcome: "fallback" }));
  const forged = f.next({ actorId: f.actors.owner, scope: { actorId: f.actors.owner } });
  expect(await s.state.invoke(forged, { provider })).toEqual({ outcome: "fallback" });
  expect(audit(forged.operationId)).toEqual([]);
});

for (const transition of ["midnight", "suspension", "unapproval", "ownership", "role"] as const) test(`Prep terminal audit retains returned tokens after ${transition} while current cache/dispatch access remains denied`, async () => {
  const f = await prepFixture(); const s = setup(f); const rpc = rpcAs();
  let newOwner: string | undefined;
  if (transition === "ownership") {
    const workspaceId = successfulSql(`select workspace_id from public.profiles where id=${literal(f.actors.owner)}`);
    const db = new DatabaseFixture();
    const owner = db.profile({ table: "workspaces", values: { id: workspaceId } }, "owner");
    successfulSql(`begin; ${db.statements.join("\n")} commit;`);
    newOwner = String(owner.values.id);
  }
  const transport = vi.fn(async () => {
    if (transition === "midnight") f.advance("2040-01-01T16:00:00.001Z");
    if (transition === "suspension") await f.eligibility("suspended=true");
    if (transition === "unapproval") await f.eligibility("application_state='pending'");
    if (transition === "ownership") await f.eligibility(`owner_id=${literal(newOwner!)}`);
    if (transition === "role") successfulSql(`update public.profiles set role='customer' where id=${literal(f.actors.owner)}`);
    return envelope({ suggestions: [] });
  });
  expect(await s.state.runOperation(snapshot(f.context), { requestId: "transition", getConfig: () => s.config, transport })).toMatchObject({ mode: "fallback", reason: "unavailable" });
  expect(transport).toHaveBeenCalledTimes(1);
  const events = audit(f.context.operationId);
  expect(events).toContainEqual(expect.objectContaining({ outcome: "fallback", actor_id: f.actors.owner, input_tokens: 0, output_tokens: 7, total_tokens: null }));
  expect(JSON.stringify(events)).not.toContain("PRIVATE_PROVIDER_CANARY");
  expect(await f.state.readCache(f.context)).toBeNull(); expect(await f.state.writeCache(f.context, f.result)).toBe(false);
  const metadata = { operationId: f.context.operationId, actorId: f.context.actorId, cafeId: f.context.cafeId, feature: f.context.feature, scope: f.context.scope };
  const current = await rpc("ai_state", { p_environment: "ci", p_action: "authorize", p_request: metadata, p_now: f.now() });
  expect(current.data).toEqual([{ result: null }]);
  const auditService = createAiAudit({ environment: "ci", rpc, databaseClock: async () => f.now() });
  expect(await auditService.record({ ...metadata, outcome: "provider_attempt" })).toBe(false);
  expect(await auditService.record({ ...metadata, operationId: randomUUID(), outcome: "fallback", tokens: { output: 7 } })).toBe(false);
  expect(await auditService.record({ ...metadata, actorId: f.actors.customer, outcome: "fallback" })).toBe(false);
  expect(await auditService.record({ ...metadata, scope: { cafeId: f.actors.cafe, businessDate: "2040-01-02" }, outcome: "fallback" })).toBe(false);
  const denied = await rpcAs("authenticated", f.actors.owner)("ai_state", { p_environment: "ci", p_action: "audit", p_request: { ...metadata, outcome: "fallback" }, p_now: f.now() });
  expect(denied.error).not.toBeNull();
});

test("legacy in-flight Prep eligibility loss still creates a terminal audit through its original operation binding", async () => {
  const f = await prepFixture(); const s = setup(f);
  expect(await s.state.invoke(f.context, { provider: async () => { f.advance("2040-01-01T16:00:00.001Z"); return f.result; } })).toEqual({ outcome: "fallback" });
  expect(audit(f.context.operationId)).toContainEqual(expect.objectContaining({ outcome: "fallback", actor_id: f.actors.owner }));
});
