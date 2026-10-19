import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";
import type { EnvironmentInput } from "./fixtures";

export interface RuntimeConfiguration {
  environment: "local" | "ci" | "dev" | "prod";
  ai: {
    provider: "soclaas" | "fake" | "disabled";
    enabled: boolean;
    /** Availability of the configured non-AI path, not authorization to read it. */
    fallbackAvailable: boolean;
  };
  public: {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  };
}

export interface DeploymentBinding {
  supabaseUrl: string;
  publishableKeyBinding: string;
  secretKeyBinding: string;
  soclaasKeyBinding: string;
}

export interface RuntimeModule {
  parseConfiguration(input: EnvironmentInput): RuntimeConfiguration;
  validateDeploymentBindings(input: { dev: DeploymentBinding; prod: DeploymentBinding }): void;
  redactSensitiveOutput(value: unknown, input: EnvironmentInput): unknown;
}

export interface IsolationInput {
  sources: Record<string, string>;
  clientArtifacts: Record<string, string>;
  secretValues: string[];
}

export interface IsolationModule {
  checkIsolation(input: IsolationInput): Array<{ path: string; message: string }>;
}

/** Deferred imports let lint/typecheck run before the implementation exists. */
export async function runtimeModule(): Promise<RuntimeModule> {
  const path = resolve("src/server/config/runtime.ts");
  expect(existsSync(path), "Missing implementation: src/server/config/runtime.ts").toBe(true);
  return import(/* @vite-ignore */ path);
}

export async function isolationModule(): Promise<IsolationModule> {
  const path = resolve("src/server/config/isolation.ts");
  expect(existsSync(path), "Missing implementation: src/server/config/isolation.ts").toBe(true);
  return import(/* @vite-ignore */ path);
}
