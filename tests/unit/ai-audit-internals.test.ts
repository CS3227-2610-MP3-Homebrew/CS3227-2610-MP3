// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/server/config", () => ({ getConfiguration: () => ({
  environment: "ci", supabase: { secretKey: "sb_secret_synthetic_test_only" },
  public: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" },
}) }));
import { createAiAudit } from "@/server/llm/ai-audit";
import { createUsageRpc } from "@/server/llm/usage-client";
import { createAiState } from "@/server/llm/ai-state";
const event = () => {
  const actorId = randomUUID();
  return { actorId, operationId: randomUUID(), feature: "moderation_assistant" as const, scope: { actorId }, outcome: "provider_attempt" as const };
};
afterEach(() => vi.unstubAllGlobals());

test("shared moderation audit uses the installed Supabase RPC client and preserves partial token counts", async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify([{ result: { ok: true } }]), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetch);
  const audit = createAiAudit({ environment: "ci", rpc: createUsageRpc() });
  const request = { ...event(), tokens: { input: 0, output: 7 } };
  expect(await audit.record(request)).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(String(url)).toBe("http://127.0.0.1:54321/rest/v1/rpc/ai_state");
  expect(JSON.parse(String(init.body))).toEqual({ p_environment: "ci", p_action: "audit", p_request: request });
  expect(new Headers(init.headers).get("content-profile")).toBe("public");
});

test("audit rejects content, forged scope and a moderation cache outcome before storage", async () => {
  const rpc = vi.fn(async () => ({ data: [{ result: { ok: true } }], error: null }));
  const audit = createAiAudit({ environment: "ci", rpc });
  for (const extra of [{ prompt: "private canary" }, { tokens: { total: -1 } }, { scope: { actorId: randomUUID() } }, { outcome: "cache" }, { p_now: "2040-01-01" }]) {
    expect(await audit.record({ ...event(), ...extra } as Parameters<typeof audit.record>[0])).toBe(false);
  }
  expect(rpc).not.toHaveBeenCalled();
});

test("deployed state and audit construction reject injected clocks", () => {
  for (const environment of ["dev", "prod"] as const) {
    const rpc = vi.fn(); const databaseClock = vi.fn();
    expect(() => createAiAudit({ environment, rpc, databaseClock })).toThrow("AI audit unavailable.");
    expect(() => createAiState({ environment, rpc, databaseClock, admission: { reserve: vi.fn() }, eligibleCafeIds: vi.fn() })).toThrow("AI state unavailable.");
    expect(rpc).not.toHaveBeenCalled(); expect(databaseClock).not.toHaveBeenCalled();
  }
});
