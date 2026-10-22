import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rpc } from "../../unit/usage/contracts";

export type Account = { role: "customer" | "owner" | "admin"; email: string; password: string };
export type Kit = { accounts: Account[] };
export type AdmissionResult = { admitted: boolean; retryAfter?: number; unavailable?: boolean };
export type Admission = { reserve(): Promise<AdmissionResult> };
export interface DemoModule {
  createDemoKitHandler(options: { trustedOrigin: string; admission: Admission; createKit(): Promise<Kit> }): (request: Request) => Promise<Response>;
  createDemoKitAdmission(options: { environment: "local" | "ci"; rpc: Rpc; limits: { perTenMinutes: number; perDay: number }; databaseClock?: () => Promise<string> }): Admission;
  provisionDemoKit(options: { auth: Pick<SupabaseClient["auth"]["admin"], "createUser" | "deleteUser">; rpc: Rpc; now?: () => Date }): Promise<Kit>;
}
/** Small internal seams for deterministic transport, real Postgres admission and Auth failure injection. */
export async function demoModule(): Promise<DemoModule> {
  const path = resolve("src/server/demo-kits/index.ts");
  expect(existsSync(path), "Missing implementation: demo-kit feature module").toBe(true);
  return import(/* @vite-ignore */ path);
}
export const origin = "http://127.0.0.1:3100";
export function request(init: RequestInit = {}) {
  return new Request(`${origin}/api/demo-kits`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}", ...init });
}
