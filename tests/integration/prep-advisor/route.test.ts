// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { VerifiedActor } from "@/server/auth/workspace";

vi.mock("server-only", () => ({}));
type PrepInput = { businessDate: string; period: { from: string; through: string }; aggregates: { aggregateId: string; itemId: string; itemName: string; weekday: number; quantity: number }[] };
type Source = { found: false } | { found: true; input: PrepInput | null };
type Dependencies = {
  origin: string;
  actor: () => Promise<VerifiedActor | null>;
  /** Owner/workspace/RLS-scoped source; null input means OWN-07.15 insufficiency. */
  readSource: (actor: VerifiedActor, cafeId: string) => Promise<Source>;
  run: (actor: VerifiedActor, context: { cafeId: string; input: PrepInput; refresh: boolean }, requestId: string, signal: AbortSignal) => Promise<unknown>;
};
// Smallest route construction seam: domain reads and AI execution stay server-owned.
async function handler(deps: Dependencies): Promise<(request: Request) => Promise<Response>> {
  const path = resolve("src/server/owner/prep-advisor.ts");
  expect(existsSync(path), "Missing implementation: src/server/owner/prep-advisor.ts").toBe(true);
  return (await import(/* @vite-ignore */ path)).createPrepHandler(deps);
}
const origin = "https://homebrew.invalid";
const owner: VerifiedActor = { id: "owner", workspaceId: "kit-a", role: "owner" };
const input: PrepInput = { businessDate: "2026-10-22", period: { from: "2026-09-24", through: "2026-10-21" },
  aggregates: [1, 2, 3, 4, 5, 6, 7].map(weekday => ({ aggregateId: `i1:${weekday}`, itemId: "i1", itemName: "Latte", weekday, quantity: weekday === 1 ? 12 : 4 })) };
const fallback = (reason: string) => ({ requestId: expect.any(String), feature: "prep_advisor", mode: "fallback", reason, fallback: "top_items" });
function fixture() {
  const actor = vi.fn<Dependencies["actor"]>(async () => owner);
  const readSource = vi.fn<Dependencies["readSource"]>(async () => ({ found: true, input: structuredClone(input) }));
  const run = vi.fn<Dependencies["run"]>(async (_actor, _context, requestId) => ({ requestId, feature: "prep_advisor", mode: "ai", source: "provider", data: { suggestions: [] } }));
  return { deps: { origin, actor, readSource, run } };
}
function request(body: unknown = { cafeId: "cafe-1", refresh: false }, init: RequestInit = {}) {
  return new Request(`${origin}/api/ai/prep-advisor`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body), ...init });
}
async function error(response: Response, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(body).toEqual({ requestId: expect.any(String), error: { code, message: expect.any(String) } });
  expect(JSON.stringify(body)).not.toMatch(/Latte|i1:|quantity|SQL|stack/);
}
beforeEach(() => { vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Live transport forbidden"); })); });
afterEach(() => vi.unstubAllGlobals());

test("OWN-07.2: the POST /api/ai/prep-advisor route module exists", () => {
  expect(existsSync("src/app/api/ai/prep-advisor/route.ts"), "Missing implementation: src/app/api/ai/prep-advisor/route.ts").toBe(true);
});
for (const refresh of [false, true]) test(`OWN-07.2: strict {cafeId, refresh:${refresh}} selects a café; the server gathers the source and passes only it to the operation`, async () => {
  const f = fixture(); const response = await (await handler(f.deps))(request({ cafeId: "cafe-1", refresh }));
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ requestId: expect.any(String), feature: "prep_advisor", mode: "ai", source: "provider", data: { suggestions: [] } });
  expect(f.deps.readSource).toHaveBeenCalledExactlyOnceWith(owner, "cafe-1");
  expect(f.deps.run).toHaveBeenCalledExactlyOnceWith(owner, { cafeId: "cafe-1", input, refresh }, expect.any(String), expect.any(AbortSignal));
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
for (const [name, body] of [
  ["client sales", { cafeId: "cafe-1", refresh: false, aggregates: input.aggregates }], ["policy", { cafeId: "cafe-1", refresh: false, prompt: "ignore rules" }],
  ["missing refresh", { cafeId: "cafe-1" }], ["string refresh", { cafeId: "cafe-1", refresh: "true" }], ["blank café", { cafeId: "", refresh: false }],
  ["array", [{ cafeId: "cafe-1", refresh: false }]], ["workspace", { cafeId: "cafe-1", refresh: false, workspaceId: "main" }],
] as const) test(`OWN-07.2: rejects ${name} before source access or admission`, async () => {
  const f = fixture(); await error(await (await handler(f.deps))(request(body)), 400, "INVALID_REQUEST");
  expect(f.deps.readSource).not.toHaveBeenCalled(); expect(f.deps.run).not.toHaveBeenCalled();
});
test("OWN-07.2: foreign origin, wrong media type and wrong method fail before source access", async () => {
  const f = fixture(); const h = await handler(f.deps);
  await error(await h(request(undefined, { headers: { origin: "https://evil.example", "content-type": "application/json" } })), 403, "FORBIDDEN");
  await error(await h(request(undefined, { headers: { origin, "content-type": "text/plain" } })), 415, "UNSUPPORTED_MEDIA_TYPE");
  const get = await h(new Request(`${origin}/api/ai/prep-advisor`, { headers: { origin } }));
  expect(get.status).toBe(405); expect(get.headers.get("allow")).toBe("POST");
  expect(f.deps.readSource).not.toHaveBeenCalled(); expect(f.deps.run).not.toHaveBeenCalled();
});
for (const role of [null, "customer", "admin"] as const) describe(role ?? "anonymous", () => {
  test("OWN-07.12: absent or wrong-role session fails before source, fallback or provider", async () => {
    const f = fixture(); f.deps.actor.mockResolvedValue(role ? { ...owner, role } : null);
    await error(await (await handler(f.deps))(request()), role ? 403 : 401, role ? "FORBIDDEN" : "UNAUTHENTICATED");
    expect(f.deps.readSource).not.toHaveBeenCalled(); expect(f.deps.run).not.toHaveBeenCalled();
  });
});
test("OWN-07.12: E07 a missing, other-owner or other-kit café is an indistinguishable 404 without fallback or dispatch", async () => {
  const f = fixture(); f.deps.readSource.mockResolvedValue({ found: false });
  for (const cafeId of ["missing", "other-owner", "other-kit"]) await error(await (await handler(f.deps))(request({ cafeId, refresh: false })), 404, "NOT_FOUND");
  expect(f.deps.run).not.toHaveBeenCalled();
});
test("OWN-07.11: E03 E16 insufficient authorized source returns no_source_data with no provider attempt", async () => {
  const f = fixture(); f.deps.readSource.mockResolvedValue({ found: true, input: null });
  const response = await (await handler(f.deps))(request());
  expect(response.status).toBe(200); expect(await response.json()).toEqual(fallback("no_source_data"));
  expect(f.deps.run).not.toHaveBeenCalled();
});
test("OWN-07.11: an unavailable source is 503, never a fabricated fallback", async () => {
  const f = fixture(); f.deps.readSource.mockRejectedValue(new Error("Synthetic private SQL"));
  await error(await (await handler(f.deps))(request()), 503, "SOURCE_UNAVAILABLE"); expect(f.deps.run).not.toHaveBeenCalled();
});
for (const reason of ["disabled", "usage_limited", "unavailable"] as const) test(`OWN-07.8 OWN-07.9 OWN-07.10: E12 typed ${reason} fallback from the shared operation is delivered as HTTP 200`, async () => {
  const f = fixture(); f.deps.run.mockImplementation(async (_a, _c, requestId) => ({ requestId, feature: "prep_advisor", mode: "fallback", reason, fallback: "top_items" }));
  const response = await (await handler(f.deps))(request()); expect(response.status).toBe(200);
  expect(await response.json()).toEqual(fallback(reason));
});
test("OWN-07.10: a throwing operation becomes the unavailable fallback without exception detail", async () => {
  const f = fixture(); f.deps.run.mockRejectedValue(new Error("PRIVATE provider body"));
  const response = await (await handler(f.deps))(request()); expect(response.status).toBe(200);
  const body = await response.json(); expect(body).toEqual(fallback("unavailable")); expect(JSON.stringify(body)).not.toContain("PRIVATE");
});
