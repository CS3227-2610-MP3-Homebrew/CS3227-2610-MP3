import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";

export type Role = "customer" | "owner" | "admin";
/** Trusted server-resolved context, never raw request metadata. */
export type VerifiedActor = { id: string; workspaceId: string; role: Role };
export interface WorkspaceModule {
  authorizeWorkspace(actor: VerifiedActor | null, resourceWorkspaceId: string): boolean;
}
export interface SignupModule {
  resolveSignup(input: { role: unknown; metadata?: Record<string, unknown> }, mainWorkspaceId: string): { role: "customer" | "owner"; workspaceId: string };
  validateAuthConfiguration(input: { dev: { emailConfirmationEnabled: boolean }; prod: { emailConfirmationEnabled: boolean } }): void;
}
export interface SeedModule {
  seedLocalDemonstration(input: { environment: "local" | "ci" | "dev" | "prod"; supabaseUrl: string; provider: "fake" | "disabled" }): Promise<unknown>;
}

async function load<T>(name: string): Promise<T> {
  const path = resolve(name);
  expect(existsSync(path), `Missing implementation: ${name}`).toBe(true);
  return import(/* @vite-ignore */ path);
}
export const workspaceModule = () => load<WorkspaceModule>("src/server/auth/workspace.ts");
export const signupModule = () => load<SignupModule>("src/server/auth/signup.ts");
export const seedModule = () => load<SeedModule>("src/server/seeds/local.ts");
