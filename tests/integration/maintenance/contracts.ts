import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rpc } from "../../unit/usage/contracts";

export type Outcome = { outcome: string; count: number };
export type ProvisionOptions = {
  auth: Pick<SupabaseClient["auth"]["admin"], "createUser">;
  rpc: Rpc;
  email?: string;
  password?: string;
};
export interface MaintenanceModule {
  createMaintenanceHandler(options: {
    secret?: string;
    cleanup(): Promise<Outcome>;
    ensureMainAdmin(): Promise<Outcome>;
    ensureShowcase(): Promise<Outcome>;
  }): (request: Request) => Promise<Response>;
  ensureMainAdmin(options: ProvisionOptions): Promise<Outcome>;
  ensureShowcase(options: Pick<ProvisionOptions, "auth" | "rpc">): Promise<Outcome>;
}
export async function maintenanceModule(): Promise<MaintenanceModule> {
  const path = resolve("src/server/maintenance/index.ts");
  expect(existsSync(path), "Missing implementation: server-only maintenance feature").toBe(true);
  return import(/* @vite-ignore */ path);
}
export const secret = "synthetic-maintenance-bearer-canary";
export function request(authorization: string | undefined = `Bearer ${secret}`) {
  return new Request("http://localhost/api/internal/maintenance", {
    headers: authorization === undefined ? {} : { authorization },
  });
}
