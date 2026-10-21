import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";

export type Role = "customer" | "owner" | "admin";
export type Actor = { id: string; workspaceId: string; role: Role };
export type Fault = { kind: "credentials" | "duplicate" | "unavailable" | "throttled" | "unexpected"; retryAfter?: string };
export type Result<T> = { data: T; error?: never } | { data?: never; error: Fault };
/** Effects are supplied by the server adapter; no request may supply this authority. */
export interface AccountDependencies {
  trustedOrigin: string;
  mainWorkspaceId: string;
  currentIdentity(): Promise<string | null>;
  createIdentity(input: { email: string; password: string }): Promise<Result<{ id: string }>>;
  createProfile(input: Actor): Promise<Result<Actor>>;
  deleteIdentity(id: string): Promise<Result<null>>;
  signIn(input: { email: string; password: string }): Promise<Result<{ id: string }>>;
  readProfile(id: string): Promise<Result<unknown>>;
  persistSession(): Promise<void>;
  clearSession(): Promise<void>;
  revokeSession(scope: "local"): Promise<Result<null>>;
}
export interface AccountHandlers {
  signUp(request: Request): Promise<Response>;
  signIn(request: Request): Promise<Response>;
  signOut(request: Request): Promise<Response>;
}
export interface AccountsModule { createAccountHandlers(dependencies: AccountDependencies): AccountHandlers }
export async function accountsModule(): Promise<AccountsModule> {
  const path = resolve("src/server/auth/accounts.ts");
  expect(existsSync(path), "Missing implementation: src/server/auth/accounts.ts account HTTP handlers").toBe(true);
  return import(/* @vite-ignore */ path);
}
export const origin = "http://127.0.0.1:3100";
export const actor: Actor = { id: "00000000-0000-4000-8000-000000000099", workspaceId: "00000000-0000-4000-8000-000000000001", role: "customer" };
export const homes: Record<Role, string> = { customer: "/customer/cafes", owner: "/owner/dashboard", admin: "/admin/moderation" };
export const fields = { email: "fixture@example.com", password: " example password " };
export function request(operation: keyof AccountHandlers, body: unknown, init: RequestInit = {}) {
  const route = { signUp: "sign-up", signIn: "sign-in", signOut: "sign-out" }[operation];
  return new Request(`${origin}/api/auth/${route}`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body), ...init,
  });
}
