import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { criterionPattern } from "./lib/plan";
import { testFiles, testTitles } from "./lib/test-titles";

// Optional paths let the self-check exercise the CLI against isolated fixtures.
const planPath = resolve(process.argv[2] ?? "workflow/PLAN.md");
const testsPath = resolve(process.argv[3] ?? "tests");
const criterionPattern = /\b(?:SYS|CUS|OWN|ADM|SEC)-\d+\.\d+\b/g;

function testFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return entry.isFile() && /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

function testTitles(source: string): string[] {
  // Tokenize without executing tests. Comments and complete strings stay opaque,
  // so IDs in test bodies, fixtures, imports or comments do not imply coverage.
  const tokens = Array.from(
    source.matchAll(
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|[\w$]+|[^\s]/g,
    ),
    (match) => match[0],
  ).filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
  const titles: string[] = [];
  for (let index = 0; index < tokens.length; index++) {
    if (!["test", "it"].includes(tokens[index]) || tokens[index - 1] === ".") continue;
    let cursor = index + 1;
    let isTest = true;
    let excludedFromCoverage = false;
    while (tokens[cursor] === ".") {
      const modifier = tokens[cursor + 1];
      // Parse every supported modifier, but tests that do not run or are
      // expected to fail cannot provide coverage.
      if (!["only", "skip", "todo", "concurrent", "sequential", "fails", "fail", "fixme", "each", "for"].includes(modifier)) {
        isTest = false;
        break;
      }
      if (["skip", "todo", "fixme", "fails", "fail"].includes(modifier)) excludedFromCoverage = true;
      cursor += 2;
      // Parameterized Vitest titles follow the data call: test.each([...])("...").
      if (["each", "for"].includes(modifier) && tokens[cursor] === "(") {
        let depth = 0;
        do {
          if (tokens[cursor] === "(") depth++;
          if (tokens[cursor] === ")") depth--;
          cursor++;
        } while (cursor < tokens.length && depth > 0);
      }
    }
    const title = tokens[cursor + 1];
    // Require a literal title; dynamic/interpolated names need explicit IDs.
    if (isTest && !excludedFromCoverage && tokens[cursor] === "(" && title && /^["'`]/.test(title) && !title.includes("${")) {
      titles.push(title.slice(1, -1));
    }
  }
  return titles;
}

function main(): number {
  const covered = new Set(
    testFiles(testsPath).flatMap((path) =>
      testTitles(readFileSync(path, "utf8")).flatMap((title) => title.match(criterionPattern) ?? []),
    ),
  );
  const plan = readFileSync(planPath, "utf8");
  const tasks = plan.split(/(?=^### T-\d+:)/m);
  const uncovered = new Map<string, string[]>();
  let doneTasks = 0;
  for (const task of tasks) {
    const heading = task.match(/^### (T-\d+:[^\r\n]*)/m)?.[1];
    const status = task.match(/^- \*\*Status:\*\*\s*([^\r\n]*)/m)?.[1].trim();
    if (!heading || status !== "done") continue;
    doneTasks++;
    const requirements = task.match(
      /^- \*\*Requirements:\*\*([\s\S]*?)(?=^- \*\*|^#{1,3} |(?![\s\S]))/m,
    )?.[1] ?? "";
    for (const criterion of new Set(requirements.match(criterionPattern) ?? [])) {
      if (!covered.has(criterion)) {
        uncovered.set(criterion, [...(uncovered.get(criterion) ?? []), heading]);
      }
    }
  }
  if (uncovered.size) {
    console.error("Uncovered criteria in done tasks:");
    for (const [criterion, tasks] of uncovered) console.error(`- ${criterion}: ${tasks.join("; ")}`);
    console.error("Tests marked skip, todo, fixme or fail(s) do not count as coverage.");
    return 1;
  }
  console.log(`Traceability passed (${doneTasks} done tasks; all listed criteria have test titles).`);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`Traceability check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
