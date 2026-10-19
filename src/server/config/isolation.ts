import { posix } from "node:path";
import ts from "typescript";
import { publicConfigurationNames, secretValueVariants } from "./runtime";

export interface IsolationInput {
  sources: Record<string, string>;
  clientArtifacts: Record<string, string>;
  secretValues: string[];
}

export interface IsolationViolation { path: string; message: string }

const isOpenAI = (name: string) => name === "openai" || name.startsWith("openai/");
const isServerPath = (path: string) => path.startsWith("src/server/");
function unwrapExpression(node: ts.Node): ts.Node {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) {
    node = node.expression;
  }
  return node;
}

/** Dot and literal bracket access have the same property identity, including escapes. */
function staticAccess(node: ts.Node): { object: ts.Expression; name: string } | undefined {
  node = unwrapExpression(node);
  if (ts.isPropertyAccessExpression(node)) return { object: node.expression, name: node.name.text };
  if (ts.isElementAccessExpression(node) && node.argumentExpression) {
    const argument = unwrapExpression(node.argumentExpression);
    if (ts.isStringLiteralLike(argument)) return { object: node.expression, name: argument.text };
  }
}

/** Parse syntax rather than matching import-like text in comments or strings. */
function inspect(path: string, content: string) {
  const file = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true,
    /\.[jt]sx$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports: string[] = [];
  const strings: string[] = [];
  let unapprovedPublic = false;
  let privileged = false;
  const addImport = (node: ts.Expression | undefined) => {
    if (node && ts.isStringLiteralLike(node)) imports.push(node.text);
  };
  function visit(node: ts.Node) {
    if (ts.isStringLiteralLike(node)) strings.push(node.text);
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) addImport(node.moduleSpecifier);
    if (ts.isExportDeclaration(node) && !node.isTypeOnly) addImport(node.moduleSpecifier);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      addImport(node.moduleReference.expression);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === "require"))) addImport(node.arguments[0]);
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const access = staticAccess(node);
      const parent = access && staticAccess(access.object);
      if (access?.name === "admin" && parent?.name === "auth") privileged = true;
      const root = parent && unwrapExpression(parent.object);
      if (parent?.name === "env" && root && ts.isIdentifier(root) && root.text === "process" &&
        access?.name.startsWith("NEXT_PUBLIC_") &&
        !(publicConfigurationNames as readonly string[]).includes(access.name)) unapprovedPublic = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  const client = file.statements.some((statement) => ts.isExpressionStatement(statement) &&
    ts.isStringLiteral(statement.expression) && statement.expression.text === "use client");
  return { imports, strings, client, privileged, unapprovedPublic };
}

export function checkIsolation(input: IsolationInput): IsolationViolation[] {
  const violations: IsolationViolation[] = [];
  const secrets = secretValueVariants(input.secretValues);
  const cleanPath = (path: string) => secrets.reduce((text, secret) => text.split(secret).join("[REDACTED]"), path);
  const report = (path: string, message: string) => violations.push({ path: cleanPath(path), message });
  const sources = Object.fromEntries(Object.entries(input.sources).map(([path, content]) => [posix.normalize(path.replaceAll("\\", "/")), content]));
  const modules = new Map(Object.entries(sources).map(([path, content]) => [path, inspect(path, content)]));
  function resolveImport(from: string, name: string): string | undefined {
    const base = name.startsWith("@/") ? `src/${name.slice(2)}`
      : name.startsWith(".") ? posix.normalize(posix.join(posix.dirname(from), name)) : undefined;
    if (!base) return;
    const withoutExtension = base.replace(/\.[cm]?jsx?$/, "");
    const candidates = [base, ...[".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"].flatMap((extension) =>
      [`${base}${extension}`, `${base}/index${extension}`, `${withoutExtension}${extension}`])];
    return candidates.find((candidate) => modules.has(candidate));
  }
  for (const [path, module] of modules) {
    if (module.imports.some(isOpenAI) &&
      (!path.startsWith("src/server/llm/") || !module.imports.includes("server-only") || module.client)) {
      report(path, "OpenAI imports require the server-only src/server/llm/ boundary.");
    }
    if (module.unapprovedPublic) report(path, "Public environment access is outside the configuration allowlist.");
    if (!module.client) continue;
    const visited = new Set<string>();
    function follow(current: string) {
      if (visited.has(current)) return;
      visited.add(current);
      const dependency = modules.get(current)!;
      if (isServerPath(current) || dependency.imports.includes("server-only") ||
          dependency.imports.some(isOpenAI) || dependency.privileged) {
        report(path, "Client import graph reaches a privileged server module.");
        return;
      }
      for (const name of dependency.imports) {
        const target = resolveImport(current, name);
        if (target) follow(target);
        else if (name.startsWith("@/server/")) report(path, "Client import graph reaches the server directory.");
      }
    }
    follow(path);
  }
  for (const [path, content] of Object.entries(input.clientArtifacts)) {
    const decoded = [content];
    if (path.endsWith(".map")) {
      try {
        const map: unknown = JSON.parse(content);
        if (map && typeof map === "object" && "sourcesContent" in map && Array.isArray(map.sourcesContent)) {
          decoded.push(...map.sourcesContent.filter((item): item is string => typeof item === "string"));
        }
      } catch {
        report(path, "Client source map is invalid and cannot be inspected.");
      }
    }
    // Decoded literal contents also catch JSON/JavaScript escaping of credentials.
    const inspected = decoded.map((text) => inspect(path, text));
    const texts = [...decoded, ...inspected.flatMap((module) => module.strings)];
    if (secrets.some((secret) => texts.some((text) => text.includes(secret)))) {
      report(path, "Client artifact contains a configured secret.");
    }
    if (inspected.some((module) => module.imports.some(isOpenAI) || module.privileged) ||
      texts.some((text) => /\b(?:OpenAI|openai)\b/.test(text))) {
      report(path, "Client artifact contains provider or privileged database code.");
    }
  }
  return violations;
}
