// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("SYS-04.1: declares Next.js 16.4.2 with the src/app App Router", () => {
  expect(packageJson.dependencies.next).toBe("16.4.2");
  expect(existsSync("src/app/layout.tsx")).toBe(true);
  expect(existsSync("src/app/page.tsx")).toBe(true);
});

test("SYS-04.1: enables strict TypeScript", () => {
  const config = JSON.parse(readFileSync("tsconfig.json", "utf8"));
  expect(config.compilerOptions.strict).toBe(true);
});

test("SYS-04.1: declares Tailwind 4 and Bun 1.4.3", () => {
  expect(packageJson.devDependencies.tailwindcss ?? packageJson.dependencies.tailwindcss).toMatch(/^[~^]?4(?:\.|$)/);
  expect(packageJson.packageManager).toBe("bun@1.4.3");
});

test("SYS-04.1: selects Node 24 for application deployment", () => {
  // Vercel uses package.json engines.node to select the application's runtime.
  // CI's setup-node value alone does not establish the deployed runtime.
  expect(packageJson.engines?.node).toEqual(expect.stringMatching(/^(?:24(?:\.x|\.\d+(?:\.\d+)?)?|\^24\.\d+\.\d+|>=24(?:\.0(?:\.0)?)?\s+<25(?:\.0(?:\.0)?)?)$/));
});
