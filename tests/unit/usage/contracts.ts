import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";

export const limitKeys = [
  "AI_GLOBAL_CALLS_PER_MINUTE", "AI_GLOBAL_CALLS_PER_DAY",
  "AI_USER_ACTIONS_PER_MINUTE", "AI_USER_ACTIONS_PER_DAY",
  "AI_BREW_FINDER_CALLS_PER_MINUTE", "AI_PREP_ADVISOR_CALLS_PER_MINUTE",
  "AI_MODERATION_CALLS_PER_MINUTE", "AI_BREW_FINDER_CALLS_PER_ACTION",
  "AI_PREP_ADVISOR_CALLS_PER_ACTION", "AI_MODERATION_CALLS_PER_ACTION",
  "AI_PREP_REFRESHES_PER_DAY", "AI_MODERATION_RUNS_PER_DAY",
  "AI_MODERATION_REVIEWS_PER_CALL",
] as const;
export type Limits = Record<typeof limitKeys[number], number>;
export const limits = (changes: Partial<Limits> = {}): Limits => ({
  ...Object.fromEntries(limitKeys.map((key) => [key, 20])),
  AI_BREW_FINDER_CALLS_PER_ACTION: 2,
  AI_PREP_ADVISOR_CALLS_PER_ACTION: 1,
  AI_MODERATION_CALLS_PER_ACTION: 1,
  ...changes,
}) as Limits;
export type Request = {
  admissionId: string; operationId: string; actorId: string; cafeId?: string;
  feature: "brew-finder" | "prep-advisor" | "moderation-assistant";
  event: "action" | "refresh" | "run" | "provider_attempt";
};
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{
  data: unknown;
  error: { message: string; code?: string } | null;
}>;
export type Admission = { reserve(request: Request): Promise<{ admitted: boolean }> };
export interface UsageModule {
  parseUsageLimits(input: Record<string, unknown>): Limits | null;
  createUsageAdmission(options: {
    environment: "local" | "ci"; limits: Limits | null; rpc: Rpc;
    /** Construction-time trusted server option only, never request input. Fixture timestamp comes from local PostgreSQL; default uses database time. */
    databaseClock?: () => Promise<string>;
  }): Admission;
  dispatchWithAdmission(input: {
    admission: Admission; request: Request;
    /** Already-authorized eligible cache result; eligibility belongs to the feature boundary. */
    cached?: { value: unknown };
    provider: () => Promise<{ value: unknown; tokens?: { input?: number; output?: number; total?: number } }>;
  }): Promise<{ outcome: "success" | "fallback"; tokens?: { input?: number; output?: number; total?: number } | null; cost?: number | null }>;
}
export async function usageModule(): Promise<UsageModule> {
  const path = resolve("src/server/llm/usage.ts");
  expect(existsSync(path), "Missing implementation: src/server/llm/usage.ts").toBe(true);
  return import(/* @vite-ignore */ path);
}
