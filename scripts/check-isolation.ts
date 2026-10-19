import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { checkIsolation } from "../src/server/config/isolation";
import { configuredSecretValues } from "../src/server/config/runtime";

/** Only regular code/build files are opened; symlinks and dotenv files are excluded. */
function collect(directory: string, extension: RegExp): Record<string, string> {
  const files: Record<string, string> = {};
  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".env") || entry.isSymbolicLink()) continue;
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && extension.test(entry.name)) files[relative(process.cwd(), path)] = readFileSync(path, "utf8");
    }
  }
  walk(directory);
  return files;
}

const artifacts = process.argv.includes("--artifacts");
if (artifacts && !existsSync(".next/static")) {
  console.error("Isolation check requires a generated client build.");
  process.exit(1);
}
const clientArtifacts = artifacts ? {
  ...collect(".next/static", /\.(?:[cm]?js|map|json|css)$/),
  ...(existsSync(".next/server/app") ? collect(".next/server/app", /\.(?:html|rsc)$/) : {}),
} : {};
const violations = checkIsolation({
  sources: collect("src", /\.(?:[cm]?[jt]s|[jt]sx)$/),
  clientArtifacts,
  secretValues: configuredSecretValues(process.env),
});
for (const violation of violations) console.error(`${violation.path}: ${violation.message}`);
if (violations.length) process.exit(1);
console.log(`Isolation check passed (${artifacts ? `${Object.keys(clientArtifacts).length} client artifacts and ` : ""}application sources).`);
