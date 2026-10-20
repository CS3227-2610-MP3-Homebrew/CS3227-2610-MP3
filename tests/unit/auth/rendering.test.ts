// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

test("SYS-05.1: cacheComponents and partialPrefetching remain enabled", async () => {
  const { default: config } = await import("../../../next.config");
  expect(config.cacheComponents).toBe(true);
  expect(config.partialPrefetching).toBe(true);
});

test("SYS-05.4: no app-wide instant opt-out exists and this pair introduces no route exceptions requiring PR reasons", () => {
  const exceptions: string[] = [];
  function visit(directory: string) {
    for (const file of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, file.name);
      if (file.isDirectory()) visit(path);
      else if (/\.[jt]sx?$/.test(file.name)) {
        const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
        for (const statement of source.statements) {
          if (!ts.isVariableStatement(statement) || !statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
          for (const declaration of statement.declarationList.declarations) {
            if (declaration.name.getText(source) === "instant" && declaration.initializer?.kind === ts.SyntaxKind.FalseKeyword) exceptions.push(path);
          }
        }
      }
    }
  }
  visit("src/app");
  // No exceptions exist on the approved base. A future exception needs its own
  // route-level evidence and human PR reason; a passing build cannot supply it.
  expect(exceptions, "Any new exception needs per-route scope plus human PR rationale").toEqual([]);
});
