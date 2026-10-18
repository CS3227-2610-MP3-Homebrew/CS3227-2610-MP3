import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { criterionPattern } from "./lib/plan";
import { testFiles, testTitles } from "./lib/test-titles";

// Optional paths let the self-check exercise the CLI against isolated fixtures.
const planPath = resolve(process.argv[2] ?? "workflow/PLAN.md");
const testsPath = resolve(process.argv[3] ?? "tests");

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
