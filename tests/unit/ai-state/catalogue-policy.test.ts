// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

test("SYS-05.3, SEC-07.2: src has no use cache directive including function scopes", () => {
  const violations: string[] = [];
  function walk(path: string) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name.startsWith(".env")) continue;
      const file = join(path, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.[cm]?[jt]sx?$/.test(file)) {
        const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
        function visit(node: ts.Node) {
          if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && /^use cache(?:$|:)/.test(node.expression.text)) violations.push(file);
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }
  walk("src"); expect(violations).toEqual([]);
});
