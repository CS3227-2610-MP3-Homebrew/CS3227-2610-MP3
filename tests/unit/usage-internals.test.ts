// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/config", () => ({
  getConfiguration: () => ({
    environment: "ci", supabase: { secretKey: "sb_secret_synthetic_test_only" },
    public: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" },
  }),
}));
import { createUsageRpc } from "@/server/llm/usage-client";
import { createUsageAdmission, dispatchWithAdmission, parseUsageLimits, type UsageRpc } from "@/server/llm/usage";

const policy = () => parseUsageLimits({
  AI_GLOBAL_CALLS_PER_MINUTE: 20, AI_GLOBAL_CALLS_PER_DAY: 20,
  AI_USER_ACTIONS_PER_MINUTE: 20, AI_USER_ACTIONS_PER_DAY: 20,
  AI_BREW_FINDER_CALLS_PER_MINUTE: 20, AI_PREP_ADVISOR_CALLS_PER_MINUTE: 20,
  AI_MODERATION_CALLS_PER_MINUTE: 20, AI_BREW_FINDER_CALLS_PER_ACTION: 2,
  AI_PREP_ADVISOR_CALLS_PER_ACTION: 1, AI_MODERATION_CALLS_PER_ACTION: 1,
  AI_PREP_REFRESHES_PER_DAY: 20, AI_MODERATION_RUNS_PER_DAY: 20, AI_MODERATION_REVIEWS_PER_CALL: 20,
});
const request = () => ({
  actorId: randomUUID(), admissionId: randomUUID(), operationId: randomUUID(),
  feature: "brew-finder" as const, event: "provider_attempt" as const,
});
afterEach(() => vi.unstubAllGlobals());

test("installed Supabase client sends a public RPC using only its configured secret key", async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify([{ admitted: true }]), {
    status: 200, headers: { "Content-Type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetch);
  const rpc = createUsageRpc();
  const args = { p_environment: "ci", p_request: request(), p_limits: policy() };
  expect(await rpc("reserve_ai_usage", args)).toEqual({ data: [{ admitted: true }], error: null });
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(String(url)).toBe("http://127.0.0.1:54321/rest/v1/rpc/reserve_ai_usage");
  expect(options.method).toBe("POST");
  expect(new Headers(options.headers).get("apikey")).toBe("sb_secret_synthetic_test_only");
  expect(new Headers(options.headers).get("content-profile")).toBe("public");
  expect(JSON.parse(String(options.body))).toEqual(args);
  expect(await rpc("unrelated_function", {})).toMatchObject({ data: null, error: { message: "Usage operation unavailable." } });
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("RPC errors are reduced to a content-free denial", async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ message: "synthetic private detail", code: "42501" }), {
    status: 403, headers: { "Content-Type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetch);
  expect(await createUsageRpc()("reserve_ai_usage", {})).toEqual({ data: null, error: { message: "Usage admission unavailable." } });
});

test("request input cannot set a clock, quota scope or unvalidated identity", async () => {
  const rpc = vi.fn<UsageRpc>(async () => ({ data: [{ admitted: true }], error: null }));
  const admission = createUsageAdmission({ environment: "ci", limits: policy(), rpc });
  for (const extra of [{ databaseClock: "2040-01-01" }, { p_now: "2040-01-01" }, { scope: "global" }, { actorId: "forged" }]) {
    expect(await admission.reserve({ ...request(), ...extra })).toEqual({ admitted: false });
  }
  expect(rpc).not.toHaveBeenCalled();
  expect(await admission.reserve(request())).toEqual({ admitted: true });
  expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_now");
});

test("malformed RPC responses cannot authorize provider work", async () => {
  for (const data of [true, { admitted: true }, [], [{ admitted: "true" }], [{ admitted: true }, { admitted: true }]]) {
    const admission = createUsageAdmission({ environment: "ci", limits: policy(), rpc: async () => ({ data, error: null }) });
    expect(await admission.reserve(request())).toEqual({ admitted: false });
  }
});

test("non-provider events cannot dispatch a callback", async () => {
  const reserve = vi.fn(async () => ({ admitted: true })); const provider = vi.fn();
  expect(await dispatchWithAdmission({ admission: { reserve }, request: { ...request(), event: "action" }, provider })).toEqual({ outcome: "fallback" });
  expect(reserve).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
});
