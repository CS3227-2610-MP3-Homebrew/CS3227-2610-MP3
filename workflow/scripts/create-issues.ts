// Create one GitHub issue per PLAN.md task, plus role labels and one milestone
// per plan section. Dry run by default; --apply needs a human at a terminal.
// Idea adapted from MP2's issue-extractor skill; see Developer Guide credits.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { existingIssueNumbers, needsIssue, planIssue, roleLabels, setPlanIssue } from "./lib/issues";
import { parsePlan } from "./lib/plan";
import { checkRepository } from "./lib/spec-checks";

const usage = `Usage: bun workflow/scripts/create-issues.ts --repo OWNER/NAME [options]

  --tasks T-03,T-04  Only these tasks (default: every task whose Issue field is unassigned).
  --base REF         Ref whose PLAN.md must match the working copy (default: master).
  --show-bodies      Print each new issue body in the dry run.
  --apply            Create missing labels, milestones and issues (asks to confirm).
  --update-plan      Write known issue links into unassigned PLAN.md Issue fields.`;

const planPath = "workflow/PLAN.md";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : undefined;
}

function run(command: string, args: string[], input?: string): string {
  const result = spawnSync(command, args, { encoding: "utf8", input });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.slice(0, 3).join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function main(): number {
  const repo = option("--repo");
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    console.error(usage);
    return 2;
  }
  const apply = process.argv.includes("--apply");
  const base = option("--base") ?? "master";
  const only = option("--tasks")?.split(",").map((id) => id.trim());
  const repoUrl = `https://github.com/${repo}`;
  let plan = readFileSync(planPath, "utf8");
  const allTasks = parsePlan(plan);
  const selected = allTasks.filter((task) => !only || only.includes(task.id));
  for (const task of selected.filter((task) => !needsIssue(task))) {
    console.log(`skip    ${task.id}: Issue field is "${task.fields.get("Issue")?.trim()}"`);
  }
  const tasks = selected.filter(needsIssue);
  const unknown = only?.filter((id) => !allTasks.some((task) => task.id === id)) ?? [];
  if (unknown.length) {
    console.error(`Unknown tasks: ${unknown.join(", ")}.`);
    return 2;
  }

  const issues: { number: number; title: string }[] = JSON.parse(
    run("gh", ["issue", "list", "-R", repo, "--state", "all", "--limit", "1000", "--json", "number,title"]),
  );
  const labels = new Set<string>(
    JSON.parse(run("gh", ["label", "list", "-R", repo, "--limit", "500", "--json", "name"])).map(
      (label: { name: string }) => label.name,
    ),
  );
  const milestones = new Set<string>(
    JSON.parse(run("gh", ["api", `repos/${repo}/milestones?state=all&per_page=100`])).map(
      (milestone: { title: string }) => milestone.title,
    ),
  );
  // Issue links always use the default branch; --base may be a remote-tracking ref.
  const branch = run("gh", ["repo", "view", repo, "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"]).trim();
  const numbers = existingIssueNumbers(allTasks, issues);
  const missing = tasks.filter((task) => !numbers.has(task.id));
  const planned = missing.map((task) => planIssue(task, allTasks, { repoUrl, branch, issueNumbers: numbers }));
  const newLabels = [...new Set(planned.flatMap((issue) => issue.labels))].filter((label) => !labels.has(label));
  const newMilestones = [...new Set(planned.map((issue) => issue.milestone))].filter((title) => !milestones.has(title));

  for (const task of tasks.filter((task) => numbers.has(task.id))) {
    console.log(`skip    ${task.id}: already #${numbers.get(task.id)}`);
  }
  for (const label of newLabels) console.log(`label   ${label}`);
  for (const title of newMilestones) console.log(`milestone ${title}`);
  for (const issue of planned) {
    console.log(`create  ${issue.title}  [${issue.labels.join(", ")}] (${issue.milestone})`);
    if (process.argv.includes("--show-bodies")) console.log(`\n${issue.body}\n${"-".repeat(72)}`);
  }

  if (apply && planned.length) {
    // Gates: a consistent plan, the approved plan, and a human confirmation.
    const errors = checkRepository(".").filter((finding) => finding.level === "error");
    if (errors.length) {
      console.error(`Refusing to create issues: bun run check:specs reports ${errors.length} error(s).`);
      return 1;
    }
    if (run("git", ["show", `${base}:${planPath}`]) !== plan) {
      console.error(`Refusing to create issues: ${planPath} differs from ${base}. Create issues only from the merged plan.`);
      return 1;
    }
    if (!process.stdin.isTTY) {
      console.error("Refusing to create issues without an interactive terminal; a human must confirm.");
      return 1;
    }
    const answer = prompt(`Type ${repo} to create ${planned.length} issue(s) there:`);
    if (answer !== repo) {
      console.error("Not confirmed; nothing created.");
      return 1;
    }
    for (const label of newLabels) {
      const { color, description } = roleLabels[label];
      run("gh", ["label", "create", label, "-R", repo, "--color", color, "--description", description]);
    }
    for (const title of newMilestones) {
      run("gh", ["api", `repos/${repo}/milestones`, "-f", `title=${title}`, "-f", `description=PLAN.md section: ${title}`]);
    }
    const bodies = new Map<string, string>();
    for (const task of missing) {
      // Re-render so dependencies created earlier in this run get their numbers.
      const issue = planIssue(task, allTasks, { repoUrl, branch, issueNumbers: numbers });
      const args = ["issue", "create", "-R", repo, "--title", issue.title, "--body-file", "-", "--milestone", issue.milestone];
      for (const label of issue.labels) args.push("--label", label);
      const url = run("gh", args, issue.body).trim();
      numbers.set(task.id, Number(url.split("/").pop()));
      bodies.set(task.id, issue.body);
      console.log(`created ${issue.title}: ${url}`);
    }
    // Earlier issues may reference tasks created later in this run, such as a testing task's pair.
    for (const task of missing) {
      const body = planIssue(task, allTasks, { repoUrl, branch, issueNumbers: numbers }).body;
      if (body === bodies.get(task.id)) continue;
      run("gh", ["issue", "edit", String(numbers.get(task.id)), "-R", repo, "--body-file", "-"], body);
      console.log(`linked  ${task.id}: updated references in #${numbers.get(task.id)}`);
    }
  } else if (planned.length) {
    console.log(`\nDry run: nothing created. Re-run with --apply to create ${planned.length} issue(s).`);
  }

  if (process.argv.includes("--update-plan")) {
    const before = plan;
    for (const [taskId, number] of numbers) plan = setPlanIssue(plan, taskId, number, repoUrl);
    if (plan !== before) {
      writeFileSync(planPath, plan);
      console.log(`Updated Issue fields in ${planPath}; review the diff and commit it in a PR.`);
    }
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`create-issues failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
