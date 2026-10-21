import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";
import type { Admission, Request, Rpc } from "../usage/contracts";

export type Snapshot = Record<string, unknown>;
export type Context = {
  operationId: string; actorId: string; cafeId?: string;
  feature: "brew_finder" | "prep_advisor";
  scope: { actorId: string } | { cafeId: string; businessDate: string };
  input: Snapshot; source: Snapshot; model: Snapshot; contract: Snapshot;
};
export type Result = { suggestions: Record<string, unknown>[] };
export type Envelope = {
  version: "1"; feature: Context["feature"]; environment: string; scope: Context["scope"];
  inputFingerprint: string; sourceRevision: string; modelIdentity: string; contractIdentity: string;
  createdAt: string; expiresAt: string; data: Result;
};
export interface Identity {
  canonicalJson(value: unknown): string;
  digest(value: unknown): string;
  brewSourceRevision(source: Snapshot): string;
  cacheKey(value: Snapshot): string;
}
export interface State {
  readCache(context: Context): Promise<Envelope | null>;
  writeCache(context: Context, result: unknown): Promise<boolean>;
  invoke(context: Context, options: { refresh?: boolean; provider: () => Promise<unknown> }): Promise<{ outcome: "cache" | "success" | "fallback"; data?: Result }>;
  cleanup(): Promise<void>;
}
export interface StateModule {
  createAiState(options: {
    environment: "local" | "ci"; rpc: Rpc; admission: Admission;
    /** Trusted server construction seam; caller requests never supply a clock. */
    databaseClock: () => Promise<string>;
    /** Session-bound RLS projection, re-run before cache return and after generation. */
    eligibleCafeIds: (actorId: string) => Promise<string[]>;
  }): State;
}
async function load<T>(name: string): Promise<T> {
  const path = resolve(`src/server/llm/${name}.ts`);
  expect(existsSync(path), `Missing implementation: src/server/llm/${name}.ts`).toBe(true);
  return import(/* @vite-ignore */ path);
}
export const identityModule = () => load<Identity>("cache-identity");
export const stateModule = () => load<StateModule>("ai-state");
export const featureRequest = (context: Context, event: Request["event"]): Request => ({
  admissionId: crypto.randomUUID(), operationId: context.operationId, actorId: context.actorId,
  cafeId: context.cafeId, feature: context.feature === "brew_finder" ? "brew-finder" : "prep-advisor", event,
});
