// @vitest-environment node
import { expect, test, vi } from "vitest";
import { runtimeModule } from "./contracts";
import { configuration, deploymentBindings, secretCanaries, secretNames } from "./fixtures";

test.each(["local", "ci"])("SYS-07.2: %s fake mode needs no live key or network", async (environment) => {
  const { parseConfiguration } = await runtimeModule();
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network forbidden in configuration tests"));
  try {
    const result = parseConfiguration(configuration({ APP_ENV: environment }));
    expect(result.environment).toBe(environment);
    expect(result.ai).toMatchObject({ provider: "fake", enabled: true, fallbackAvailable: true });
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});

test.each(["local", "ci", "dev", "prod"])("SYS-07.2: %s permits explicit disabled mode and retains fallback capability", async (environment) => {
  const { parseConfiguration } = await runtimeModule();
  const result = parseConfiguration(configuration({ APP_ENV: environment, AI_PROVIDER: "disabled" }));
  expect(result.environment).toBe(environment);
  expect(result.ai).toMatchObject({ provider: "disabled", enabled: false, fallbackAvailable: true });
});

test.each(["", "preview", "production", "LOCAL"])("SYS-07.2: rejects unsupported APP_ENV %s", async (environment) => {
  const { parseConfiguration } = await runtimeModule();
  expect(() => parseConfiguration(configuration({ APP_ENV: environment }))).toThrow();
});

test.each(["", "openai", "FAKE"])("SYS-07.2: rejects unsupported AI_PROVIDER %s", async (provider) => {
  const { parseConfiguration } = await runtimeModule();
  expect(() => parseConfiguration(configuration({ AI_PROVIDER: provider }))).toThrow();
});

test("SYS-07.2: CI refuses a supplied live LLM key instead of retaining it", async () => {
  const { parseConfiguration } = await runtimeModule();
  expect(() => parseConfiguration(configuration({
    APP_ENV: "ci",
    SOCLAAS_API_KEY: secretCanaries.SOCLAAS_API_KEY,
  }))).toThrow();
});

test("SYS-07.2: a production compilation retains key-free CI fake mode when APP_ENV is ci", async () => {
  const { parseConfiguration } = await runtimeModule();
  const result = parseConfiguration(configuration({ APP_ENV: "ci", NODE_ENV: "production" }));
  expect(result.environment).toBe("ci");
  expect(result.ai).toMatchObject({ provider: "fake", enabled: true });
});

test("SYS-07.2: refuses fake in prod even when the database settings and synthetic key are supplied", async () => {
  const { parseConfiguration } = await runtimeModule();
  expect(() => parseConfiguration(configuration({
    APP_ENV: "prod",
    AI_PROVIDER: "fake",
    SOCLAAS_API_KEY: secretCanaries.SOCLAAS_API_KEY,
  }))).toThrow();
});

test.each(["dev", "prod"])("SYS-07.2: %s soclaas with a synthetic key enables the configured live adapter without probing it", async (environment) => {
  const { parseConfiguration } = await runtimeModule();
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Live probes forbidden"));
  try {
    const result = parseConfiguration(configuration({
      APP_ENV: environment,
      AI_PROVIDER: "soclaas",
      SOCLAAS_API_KEY: secretCanaries.SOCLAAS_API_KEY,
    }));
    expect(result.ai).toMatchObject({ provider: "soclaas", enabled: true, fallbackAvailable: true });
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});

test.each([undefined, ""])("SYS-07.2: missing soclaas key %s disables live AI and retains the non-AI path", async (key) => {
  const { parseConfiguration } = await runtimeModule();
  const result = parseConfiguration(configuration({ APP_ENV: "dev", AI_PROVIDER: "soclaas", SOCLAAS_API_KEY: key }));
  expect(result.ai).toMatchObject({ enabled: false, fallbackAvailable: true });
});

test.each(["local", "ci"])("SYS-07.2: %s rejects a hosted Supabase URL without connecting", async (environment) => {
  const { parseConfiguration } = await runtimeModule();
  expect(() => parseConfiguration(configuration({
    APP_ENV: environment,
    NEXT_PUBLIC_SUPABASE_URL: "https://hosted-project.supabase.co",
  }))).toThrow();
});

test.each([
  "http://127.0.0.1.attacker.invalid:54321",
  "http://localhost.attacker.invalid:54321",
  "http://127.0.0.1@hosted-project.supabase.co:54321",
])("SYS-07.2: rejects misleading local Supabase hostname %s", async (url) => {
  const { parseConfiguration } = await runtimeModule();
  expect(() => parseConfiguration(configuration({ NEXT_PUBLIC_SUPABASE_URL: url }))).toThrow();
});

test("SYS-07.3: exposes exactly the Supabase URL and publishable key despite extra public-prefixed values", async () => {
  const { parseConfiguration } = await runtimeModule();
  const input = configuration({
    ...secretCanaries,
    NEXT_PUBLIC_SUPABASE_SECRET_KEY: secretCanaries.SUPABASE_SECRET_KEY,
    NEXT_PUBLIC_SOCLAAS_API_KEY: secretCanaries.SOCLAAS_API_KEY,
    NEXT_PUBLIC_UNREVIEWED_VALUE: "synthetic-unallowlisted-value",
  });
  expect(parseConfiguration(input).public).toEqual({
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
});

test("SYS-07.3: invalid configuration errors never reproduce credential canaries", async () => {
  const { parseConfiguration } = await runtimeModule();
  const input = configuration({ ...secretCanaries, APP_ENV: secretCanaries.VERCEL_TOKEN });
  let observed: unknown;
  try {
    parseConfiguration(input);
  } catch (error) {
    observed = error;
  }
  expect(observed).toBeDefined();
  const rendered = `${String(observed)} ${JSON.stringify(observed)} ${observed instanceof Error ? observed.stack : ""}`;
  for (const name of secretNames) expect(rendered).not.toContain(secretCanaries[name]);
});

test("SYS-07.3: redacts credential values in nested error and audit output while retaining safe metadata", async () => {
  const { redactSensitiveOutput } = await runtimeModule();
  const value = {
    requestId: "synthetic-request-34",
    outcome: "disabled",
    error: { message: `Rejected ${Object.values(secretCanaries).join(" / ")}` },
    audit: [{ detail: secretCanaries.SOCLAAS_API_KEY }, { ...secretCanaries }],
  };
  const sanitized = redactSensitiveOutput(value, configuration(secretCanaries));
  expect(sanitized).toMatchObject({ requestId: "synthetic-request-34", outcome: "disabled" });
  const rendered = JSON.stringify(sanitized);
  for (const name of secretNames) expect(rendered).not.toContain(secretCanaries[name]);
});

test("SYS-07.3: accepts explicitly distinct dev and prod deployment bindings without key-content inference", async () => {
  const { validateDeploymentBindings } = await runtimeModule();
  expect(() => validateDeploymentBindings(deploymentBindings())).not.toThrow();
});

test.each(["supabaseUrl", "publishableKeyBinding", "secretKeyBinding", "soclaasKeyBinding"] as const)(
  "SYS-07.3: rejects shared dev/prod %s binding",
  async (field) => {
    const { validateDeploymentBindings } = await runtimeModule();
    const bindings = deploymentBindings();
    bindings.prod[field] = bindings.dev[field];
    expect(() => validateDeploymentBindings(bindings)).toThrow();
  },
);
