import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { expect, vi } from "vitest";
import type { AiOperationContext, AiOperationOptions } from "@/server/llm/ai-state";
import type { VerifiedActor } from "@/server/auth/workspace";
import { limits } from "../../unit/usage/contracts";
import type { OpeningInterval } from "@/lib/catalogue/clock";

const boundary = vi.hoisted(() => ({ actor: vi.fn(), client: vi.fn(), run: vi.fn() }));
export { boundary };
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getVerifiedActor: boundary.actor }));
vi.mock("@/server/auth/account-adapter", () => ({ trustedOrigin: () => "https://homebrew.invalid" }));
vi.mock("@/server/http/origin", () => ({ trustedOrigin: () => "https://homebrew.invalid" }));
vi.mock("@/server/supabase/session-client", () => ({ createSessionClient: boundary.client }));
vi.mock("@/server/llm/ai-state-client", () => ({ createConfiguredAiState: () => ({ runOperation: boundary.run }) }));

export const filters = { timeMode: "all" as const, at: null, drinkType: null, area: null };
export const query = "  iced coffee 😀  ";
export const attack = '<img src=x onerror="window.brewExecuted=true"> [steal](https://evil.invalid)';
export function cafe(index = 0, rating = 4) {
  const cafeId = `cafe-${String(index).padStart(3, "0")}`;
  return { cafeId, name: `Cafe ${index}`, area: "Central", description: "PRIVATE_DESCRIPTION_CANARY",
    pickupAddress: "PRIVATE_ADDRESS_CANARY", openingHours: [] as OpeningInterval[],
    menu: [{ itemId: `${cafeId}-coffee`, name: "Iced coffee", drinkType: "coffee", priceCents: 450, soldOut: false },
      { itemId: `${cafeId}-tea`, name: "Tea", drinkType: "tea", priceCents: 350, soldOut: false }],
    reviews: [{ reviewId: `${cafeId}-review`, rating, text: "RAW_REVIEW_CANARY", submittedAt: "2026-01-01T00:00:00Z", authorLabel: "Verified customer" }] };
}
export type Cafe = ReturnType<typeof cafe>;
export const providerEnvelope = (content: unknown) => ({ choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: typeof content === "string" ? content : JSON.stringify(content) } }] });
export function request(body: unknown = { query, filters }, init: RequestInit = {}) {
  return new Request("https://homebrew.invalid/api/ai/brew-finder", { method: "POST",
    headers: { origin: "https://homebrew.invalid", "content-type": "application/json" }, body: JSON.stringify(body), ...init });
}
export async function route() {
  const path = resolve("src/app/api/ai/brew-finder/route.ts");
  expect(existsSync(path), "Missing implementation: POST /api/ai/brew-finder").toBe(true);
  return import(/* @vite-ignore */ path) as Promise<Record<string, (request: Request) => Promise<Response>>>;
}
export async function setup() {
  const api = await route();
  const actor: VerifiedActor = { id: randomUUID(), workspaceId: randomUUID(), role: "customer" };
  const source = { now: "2026-10-19T01:00:00Z", cafes: [cafe(0, 3), cafe(1, 5)] };
  const settings: Record<string, unknown> = { APP_ENV: "ci", AI_PROVIDER: "fake", SOCLAAS_BASE_URL: "https://provider.invalid/v1",
    SOCLAAS_MODEL: "qwen3.5:9b", SOCLAAS_REASONING_EFFORT: "none", ...limits() };
  const data = { suggestions: [{ cafeId: source.cafes[1].cafeId, itemId: source.cafes[1].menu[0].itemId, reason: "Iced coffee matches the request." }] };
  const transport = vi.fn(async (request: Request): Promise<Response> => { void request; return Response.json(providerEnvelope(data)); });
  const admit = vi.fn(async (stage: "action" | "provider_attempt") => { void stage; return true; });
  const cache = { read: vi.fn(async (): Promise<unknown | null> => null), write: vi.fn(async (data: unknown) => { void data; }) };
  const rpc = vi.fn(async (name: string) => { void name; return { data: structuredClone(source), error: null }; });
  boundary.actor.mockResolvedValue(actor); boundary.client.mockResolvedValue({ rpc });
  // Exercise real fixed prompts, schemas, admission sequence and transport bounds.
  // Durable cache/usage behavior is covered separately with the local database.
  boundary.run.mockImplementation(async (context: AiOperationContext, options: AiOperationOptions) => {
    expect(context.feature).toBe("brew_finder"); expect(context.actorId).toBe(actor.id);
    expect(context.scope).toEqual({ actorId: actor.id }); expect(context.operationId).toMatch(/^[\da-f-]{36}$/);
    if (context.feature !== "brew_finder") throw new Error("Wrong feature");
    const { runLlmOperation } = await import("@/server/llm/operations");
    return runLlmOperation({ ...options, feature: "brew_finder", input: { query: context.input.query, candidates: context.source.candidates },
      getConfig: () => settings, transport, admit, cache });
  });
  return { api, actor, source, settings, data, transport, admit, cache, rpc,
    post: (body?: unknown, init?: RequestInit) => api.POST(request(body, init)),
    context: () => boundary.run.mock.calls[0][0] as Exclude<AiOperationContext, { feature: "moderation" }> };
}
export async function fallback(response: Response, reason: string) {
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ requestId: expect.any(String), feature: "brew_finder", mode: "fallback", reason, fallback: "rating_sorted_catalogue" });
}
export async function error(response: Response, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json(); expect(body).toEqual({ requestId: expect.any(String), error: { code, message: expect.any(String) } });
  expect(JSON.stringify(body)).not.toMatch(/CANARY|SQL|stack|ZodError|provider\.invalid/);
}
