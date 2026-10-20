import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";
import type { NextRequest, NextResponse } from "next/server";

export type Role = "customer" | "owner" | "admin";
export type VerifiedActor = { id: string; workspaceId: string; role: Role };
export interface SessionModule { getVerifiedActor(): Promise<VerifiedActor | null> }
export interface GuardModule {
  withAuthorizedActor<T>(input: {
    role: Role;
    authorize: (actor: VerifiedActor) => boolean | Promise<boolean>;
    operation: (actor: VerifiedActor) => T | Promise<T>;
  }): Promise<T>;
}
export interface ProxyModule { proxy(request: NextRequest): Promise<NextResponse> }

async function load<T>(name: string): Promise<T> {
  const path = resolve(name);
  expect(existsSync(path), `Missing implementation: ${name}`).toBe(true);
  return import(/* @vite-ignore */ path);
}
export const sessionModule = () => load<SessionModule>("src/server/auth/session.ts");
export const guardModule = () => load<GuardModule>("src/server/auth/guard.ts");
export const proxyModule = () => load<ProxyModule>("src/proxy.ts");

export const actor: VerifiedActor = {
  id: "00000000-0000-4000-8000-000000000041",
  workspaceId: "00000000-0000-4000-8000-000000000042",
  role: "customer",
};
