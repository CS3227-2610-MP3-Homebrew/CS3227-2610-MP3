// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, test, vi } from "vitest";
import { createAiState } from "@/server/llm/ai-state";
import { fixture, matchingRows } from "../ai-state/fixtures";
import { rpcAs } from "../usage/local";
import { limits } from "../../unit/usage/contracts";

vi.mock("server-only", () => ({}));
vi.setConfig({ testTimeout: 60_000 });
for (const disabled of [false, true]) describe(disabled ? "fallback" : "success", () => {
  test("ADM-04.18 ADM-04.15: retains content-free internal accounting and no suggestion cache", async () => {
    const f = await fixture(); const operationId = randomUUID(); const calls: string[] = []; const rpc = rpcAs();
    const state = createAiState({ environment: "ci", databaseClock: async () => f.now(), admission: f.admission, eligibleCafeIds: async () => [],
      rpc: async (fn, args) => { calls.push(String(args.p_action)); return rpc(fn, args); },
    });
    const settings = { APP_ENV: "ci", AI_PROVIDER: disabled ? "disabled" : "fake", SOCLAAS_BASE_URL: "http://127.0.0.1:1/v1", SOCLAAS_MODEL: "synthetic", SOCLAAS_REASONING_EFFORT: "none", ...limits() };
    const transport = vi.fn(async () => Response.json({ choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ classifications: [{ reviewId: "r1", label: "ok", reason: "MODEL_REASON_CANARY" }] }) } }], usage: { prompt_tokens: 2, completion_tokens: 3 }, extra: "PROVIDER_BODY_CANARY" }));
    const response = await state.runOperation({ feature: "moderation", operationId, actorId: f.actors.admin, scope: { actorId: f.actors.admin }, input: { reviews: [{ reviewId: "r1", text: "RAW_REVIEW_CANARY" }] } }, { requestId: "moderation", getConfig: () => settings, transport });
    expect(response).toMatchObject({ mode: disabled ? "fallback" : "ai" }); expect(transport).toHaveBeenCalledTimes(disabled ? 0 : 1);
    expect(calls).not.toContain("read"); expect(calls).not.toContain("write");
    const stored = matchingRows(operationId); const audit = stored.filter(r => r.table.name === "ai_audit_events").map(r => r.row);
    expect(audit).toContainEqual(expect.objectContaining({ actor_id: f.actors.admin, feature: "moderation_assistant", outcome: disabled ? "fallback" : "ready" }));
    if (!disabled) expect(audit).toContainEqual(expect.objectContaining({ input_tokens: 2, output_tokens: 3 }));
    const serialized = JSON.stringify(stored);
    for (const canary of ["MODEL_REASON_CANARY", "RAW_REVIEW_CANARY", "PROVIDER_BODY_CANARY", "systemPrompt", "classifications"]) expect(serialized).not.toContain(canary);
    expect(stored.filter(r => /cache/.test(r.table.name))).toHaveLength(0);
  });
});
