// @vitest-environment node
import { expect, test } from "vitest";
import { configuredSecretValues, parseConfiguration, redactSensitiveOutput } from "../../src/server/config/runtime";
import { checkIsolation } from "../../src/server/config/isolation";

test.each([
  "sb_secret_synthetic-private-value",
  `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from('{"role":"service_role"}').toString("base64url")}.synthetic-signature`,
  "synthetic-configured-private-value",
])("public projection refuses recognized or explicitly configured private key %s", (key) => {
  expect(() => parseConfiguration({
    APP_ENV: "local",
    AI_PROVIDER: "disabled",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    SUPABASE_SECRET_KEY: "synthetic-configured-private-value",
  })).toThrow("Invalid application configuration.");
});

test("malformed URL validation cannot disclose the URL input through a native error", () => {
  const privateValue = "synthetic-url-private-value";
  let observed: unknown;
  try {
    parseConfiguration({
      APP_ENV: "local",
      AI_PROVIDER: "disabled",
      NEXT_PUBLIC_SUPABASE_URL: privateValue,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
    });
  } catch (error) { observed = error; }
  expect(observed).toBeInstanceOf(Error);
  expect(`${observed} ${JSON.stringify(observed)} ${(observed as Error).stack}`).not.toContain(privateValue);
});

test("error serialization redacts keys, non-enumerable messages and recursive causes", () => {
  const secret = "synthetic-recursive-private-value";
  const error = Object.assign(new Error(`Failure ${secret}`), { [secret]: secret });
  error.cause = error;
  const sanitized = redactSensitiveOutput(error, { SOCLAAS_API_KEY: secret });
  const serialized = JSON.stringify(sanitized);
  expect(serialized).not.toContain(secret);
  expect(serialized).toContain("[Circular]");
  expect(serialized).toContain("Failure [REDACTED]");
});

test("artifact inspection decodes escaped JavaScript secret literals", () => {
  const result = checkIsolation({
    sources: {},
    clientArtifacts: { ".next/static/escaped.js": 'globalThis.value="synthetic-\\u0070rivate-value";' },
    secretValues: ["synthetic-private-value"],
  });
  expect(result).toContainEqual({ path: ".next/static/escaped.js", message: "Client artifact contains a configured secret." });
});

const paddedCredentialInputs = [" ", "\t", "\u2003\n"].map((padding) => ({
  APP_ENV: "dev",
  AI_PROVIDER: "soclaas",
  NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.invalid",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
  SOCLAAS_API_KEY: `${padding}synthetic-normalized-private-value${padding}`,
  SOCLAAS_BASE_URL: "https://soclaas.invalid/v1",
  SOCLAAS_MODEL: "synthetic-model",
  SOCLAAS_REASONING_EFFORT: "none",
}));

test.each(paddedCredentialInputs)("sanitizer removes supplied and effective padded credentials %#", (input) => {
  const key = parseConfiguration(input).ai.apiKey!;
  expect(key).toBe("synthetic-normalized-private-value");
  const sanitized = redactSensitiveOutput({
    requestId: "synthetic-request",
    error: new Error(`Adapter rejected ${key}`),
    audit: { supplied: input.SOCLAAS_API_KEY, effective: key },
  }, input);
  expect(sanitized).toMatchObject({ requestId: "synthetic-request" });
  expect(JSON.stringify(sanitized)).not.toContain(key);
  expect(configuredSecretValues(input)).toEqual(expect.arrayContaining([input.SOCLAAS_API_KEY, key]));
});

test.each(paddedCredentialInputs)("artifact checker detects supplied and effective padded credentials %#", (input) => {
  const key = parseConfiguration(input).ai.apiKey!;
  const violations = checkIsolation({
    sources: {},
    clientArtifacts: {
      ".next/static/supplied.js": `globalThis.key=${JSON.stringify(input.SOCLAAS_API_KEY)};`,
      ".next/static/effective.js": `globalThis.key=${JSON.stringify(key)};`,
    },
    secretValues: configuredSecretValues(input),
  });
  expect(violations).toEqual(expect.arrayContaining([
    { path: ".next/static/supplied.js", message: "Client artifact contains a configured secret." },
    { path: ".next/static/effective.js", message: "Client artifact contains a configured secret." },
  ]));
  expect(JSON.stringify(violations)).not.toContain(key);
});

test.each([" ", " \t "])("whitespace-only optional values preserve ordinary artifact and audit spacing %#", (value) => {
  const input = { SOCLAAS_API_KEY: value };
  expect(checkIsolation({
    sources: {},
    clientArtifacts: { ".next/static/safe.js": 'globalThis.label = "Homebrew";' },
    secretValues: configuredSecretValues(input),
  })).toEqual([]);
  expect(redactSensitiveOutput({ outcome: "AI is disabled" }, input)).toEqual({ outcome: "AI is disabled" });
});

const administrativeAccesses = [
  "client.auth.admin",
  'client.auth["admin"]',
  'client["auth"].admin',
  'client["auth"]["admin"]',
  'client?.auth?.["admin"]',
  '(client.auth)["admin"]',
  'client[`auth`][`admin`]',
  'client["a\\u0075th"]["ad\\u006din"]',
];

test.each(administrativeAccesses)("client source refuses administrative access %s", (access) => {
  const path = "src/app/unsafe-client.tsx";
  expect(checkIsolation({
    sources: { [path]: `"use client"; export const create = (client) => ${access}.createUser({email:"synthetic@example.com"});` },
    clientArtifacts: {},
    secretValues: [],
  })).toContainEqual({ path, message: "Client import graph reaches a privileged server module." });
});

test.each(administrativeAccesses)("client artifact refuses administrative access %s", (access) => {
  const path = ".next/static/unsafe-client.js";
  expect(checkIsolation({
    sources: {},
    clientArtifacts: { [path]: `function create(client){return ${access}.createUser({email:"synthetic@example.com"});}` },
    secretValues: [],
  })).toContainEqual({ path, message: "Client artifact contains provider or privileged database code." });
});

test("source map content receives the same static-bracket administrative check", () => {
  const path = ".next/static/unsafe-client.js.map";
  expect(checkIsolation({
    sources: {},
    clientArtifacts: { [path]: JSON.stringify({
      version: 3,
      sourcesContent: ['function create(client){return client.auth["admin"].createUser({});}'],
    }) },
    secretValues: [],
  })).toContainEqual({ path, message: "Client artifact contains provider or privileged database code." });
});

test.each([
  '// Example: client.auth.admin.createUser({});\nexport const label = "Homebrew";',
  'export const example = "client.auth.admin.createUser({})";',
  'export const label = ({ example: "client.auth.admin" }).example;',
])("administrative-looking comments and strings are harmless data %#", (content) => {
  expect(checkIsolation({
    sources: { "src/app/safe-client.tsx": `"use client";\n${content}` },
    clientArtifacts: { ".next/static/safe-client.js": content },
    secretValues: [],
  })).toEqual([]);
});
