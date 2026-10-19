// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "vitest";
import { isolationModule } from "../../unit/config/contracts";
import { secretCanaries, secretNames } from "../../unit/config/fixtures";
import { allowedSources, importViolations, privilegedArtifacts, safeClientArtifacts } from "./fixtures/imports";

test("SYS-04.3: permits public imports and a server-only openai adapter confined to src/server/llm", async () => {
  const { checkIsolation } = await isolationModule();
  expect(checkIsolation({ sources: allowedSources, clientArtifacts: safeClientArtifacts, secretValues: [] })).toEqual([]);
});

test("SYS-04.3: import-like text in comments and ordinary strings is not an import violation", async () => {
  const { checkIsolation } = await isolationModule();
  const sources = {
    "src/lib/documented.ts": `// import OpenAI from "openai";
/* export { default } from "openai"; */
export const example = 'require("openai")';`,
  };
  expect(checkIsolation({ sources, clientArtifacts: {}, secretValues: [] })).toEqual([]);
});

test.each(importViolations)("SYS-04.3: rejects $name", async ({ sources }) => {
  const { checkIsolation } = await isolationModule();
  const violations = checkIsolation({ sources, clientArtifacts: {}, secretValues: [] });
  expect(violations.length).toBeGreaterThan(0);
  expect(violations).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: expect.any(String), message: expect.any(String) }),
  ]));
});

test.each(privilegedArtifacts)("SYS-04.3: rejects generated client artifact containing $name", async ({ content }) => {
  const { checkIsolation } = await isolationModule();
  const path = ".next/static/chunks/unsafe.js";
  const violations = checkIsolation({ sources: {}, clientArtifacts: { [path]: content }, secretValues: [] });
  expect(violations).toEqual(expect.arrayContaining([expect.objectContaining({ path })]));
});

test.each(secretNames)("SYS-04.3 SYS-07.3: rejects client artifacts containing synthetic %s without echoing it", async (name) => {
  const { checkIsolation } = await isolationModule();
  const value = secretCanaries[name];
  const path = ".next/static/chunks/leak.js";
  const violations = checkIsolation({
    sources: {},
    clientArtifacts: { [path]: `window.leaked = ${JSON.stringify(value)};` },
    secretValues: Object.values(secretCanaries),
  });
  expect(violations).toEqual(expect.arrayContaining([expect.objectContaining({ path })]));
  expect(JSON.stringify(violations)).not.toContain(value);
});

test("SYS-04.3 SYS-07.3: scans generated client source maps for secret canaries", async () => {
  const { checkIsolation } = await isolationModule();
  const path = ".next/static/chunks/client.js.map";
  const violations = checkIsolation({
    sources: {},
    clientArtifacts: { [path]: JSON.stringify({
      version: 3,
      sources: ["synthetic-source.ts"],
      sourcesContent: [`export const secret = "${secretCanaries.SUPABASE_SECRET_KEY}";`],
    }) },
    secretValues: Object.values(secretCanaries),
  });
  expect(violations).toEqual(expect.arrayContaining([expect.objectContaining({ path })]));
  expect(JSON.stringify(violations)).not.toContain(secretCanaries.SUPABASE_SECRET_KEY);
});

test("SYS-04.3: current application source satisfies the same import boundary as the synthetic fixtures", async () => {
  const { checkIsolation } = await isolationModule();
  const sources: Record<string, string> = {};
  function collect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) collect(path);
      // Restrict reads to code; configuration files and dotenv files are never opened.
      else if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.name)) sources[relative(process.cwd(), path)] = readFileSync(path, "utf8");
    }
  }
  collect(join(process.cwd(), "src"));
  expect(checkIsolation({ sources, clientArtifacts: {}, secretValues: [] })).toEqual([]);
});
