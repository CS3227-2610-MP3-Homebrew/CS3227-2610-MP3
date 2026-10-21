// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

/** Inspect the existing import graph, without imposing a new data-access module API. */
function graph(entry: string, seen = new Set<string>()): string[] {
  const path = resolve(entry); if (seen.has(path) || !existsSync(path)) return []; seen.add(path);
  const text = readFileSync(path, "utf8"); const result = [text];
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const name = statement.moduleSpecifier.text;
    if (!name.startsWith("@/") && !name.startsWith(".")) continue;
    const base = name.startsWith("@/") ? resolve("src", name.slice(2)) : resolve(dirname(path), name);
    const file = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(p => existsSync(p) && /\.[jt]sx?$/.test(p));
    if (file) result.push(...graph(file, seen));
  } return result;
}
test("CUS-01.8 CUS-02.9: catalogue reads reach session-bound RLS clients with a Suspense shell", () => {
  const browse = graph("src/app/customer/cafes/page.tsx");
  const detail = graph("src/app/customer/cafes/[cafeId]/page.tsx");
  const shell = graph("src/app/customer/layout.tsx").join("\n");
  expect(shell).toMatch(/<Suspense\b/);
  for (const [name, sources] of [["browse", browse], ["detail", detail]] as const) {
    expect(sources.length, `${name} page exists`).toBeGreaterThan(0);
    expect(sources.join("\n"), `${name} reaches the existing session-bound RLS client`).toMatch(/createSessionClient/);
    expect(sources.join("\n")).not.toMatch(/["']use cache["']/);
  }
});
