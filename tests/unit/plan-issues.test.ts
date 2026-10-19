// @vitest-environment node
import { expect, test } from "vitest";
import { existingIssueNumbers, needsIssue, pairedTasks, planIssue, setPlanIssue } from "../../workflow/scripts/lib/issues";
import { parsePlan, taskStatus, taskStatuses } from "../../workflow/scripts/lib/plan";

const repoUrl = "https://github.com/example/homebrew";
const plan = `# Plan
## Foundations

### T-01: Test the boundary

- **Depends on:** None
- **Owner role:** testing
- **Requirements:** SYS-04.1 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime)
- **Description:** See [the plan rules](#conventions) and [web](https://example.com/a).
- **Work:** First line
  continues here.
- **File scope:** Proposed \`tests/foundations/\`.
- **Prerequisite:** None.
- **Acceptance criteria:**
  - [ ] Expected failures recorded.
- **Status:** todo
- **Issue:** unassigned

### T-02: Implement the boundary

- **Depends on:** T-01
- **Owner role:** implementation
- **Requirements:** SYS-04.1
- **Description:** Build it.
- **Work:** Build it.
- **File scope:** \`src/server/\`.
- **Acceptance criteria:**
  - [ ] \`bun run verify\` passes.
- **Status:** todo
- **Issue:** unassigned
`;

test("Issues: plan fields, sections and continuation lines are parsed", () => {
  const [first, second] = parsePlan(plan);
  expect(first).toMatchObject({ id: "T-01", title: "Test the boundary", section: "Foundations", removed: false });
  expect(first.fields.get("Work")).toBe("First line\n  continues here.");
  expect(second.fields.get("Acceptance criteria")).toBe("\n  - [ ] `bun run verify` passes.");
});

test("Issues: bodies use absolute links, pair tasks and resolve known dependency numbers", () => {
  const tasks = parsePlan(plan);
  const testing = planIssue(tasks[0], tasks, { repoUrl, branch: "master", issueNumbers: new Map() });
  expect(testing).toMatchObject({ title: "T-01: Test the boundary", labels: ["testing"], milestone: "Foundations" });
  expect(testing.body).toContain(`[T-01](${repoUrl}/blob/master/workflow/PLAN.md#t-01-test-the-boundary)`);
  expect(testing.body).toContain(`[SYS-04](${repoUrl}/blob/master/workflow/specs/TECHNICAL-SPEC.md#sys-04--runtime)`);
  expect(testing.body).toContain(`[the plan rules](${repoUrl}/blob/master/workflow/PLAN.md#conventions)`);
  expect(testing.body).toContain("[web](https://example.com/a)");
  expect(testing.body).toContain("First line\ncontinues here.");
  expect(testing.body).toContain("## Prerequisite");
  expect(testing.body).toContain("Shares one branch and one PR with T-02 (issue not created yet)");

  const implementation = planIssue(tasks[1], tasks, { repoUrl, branch: "master", issueNumbers: new Map([["T-01", 7]]) });
  expect(implementation.body).toContain("**Depends on:** T-01 (#7)");
  expect(implementation.body).not.toContain("## Prerequisite");
  expect(implementation.body).toContain("- [ ] `bun run verify` passes.");
  expect(implementation.body).toContain("named after its issue. The PR closes both issues.");
});

test("Issues: existing issues match by task prefix and only unassigned Issue lines change", () => {
  const tasks = parsePlan(plan);
  const numbers = existingIssueNumbers(tasks, [
    { number: 3, title: "T-02: Renamed by a human" },
    { number: 4, title: "Unrelated T-01: mention" },
  ]);
  expect([...numbers]).toEqual([["T-02", 3]]);
  const updated = setPlanIssue(plan, "T-02", 3, repoUrl);
  expect(updated).toContain(`- **Issue:** [#3](${repoUrl}/issues/3)`);
  expect(updated.match(/- \*\*Issue:\*\* unassigned/g)).toHaveLength(1);
  expect(setPlanIssue(updated, "T-02", 9, repoUrl)).toBe(updated);
});

test("Issues: extra testing prerequisites do not pair with a T-33-shaped task", () => {
  const tasks = parsePlan(`# Plan
## Admin
### T-30: Test manual moderation
- **Owner role:** testing
- **Requirements:** ADM-03.1
### T-31: Implement manual moderation
- **Owner role:** implementation
- **Requirements:** ADM-03.1
- **Depends on:** T-30
### T-32: Test assistant
- **Owner role:** testing
- **Requirements:** ADM-04.1, ADM-04.2 — assistant criteria
- **Depends on:** T-30, T-31
### T-33: Implement assistant
- **Owner role:** implementation
- **Requirements:** ADM-04.2, ADM-04.1, ADM-04.1
- **Depends on:** T-32, T-30, T-31
`);
  expect(tasks.map((task) => pairedTasks(task, tasks))).toEqual([["T-31"], ["T-30"], ["T-33"], ["T-32"]]);
  for (const [index, pair] of [[0, "T-31"], [3, "T-32"]] as const) {
    const issue = planIssue(tasks[index], tasks, { repoUrl, branch: "master", issueNumbers: new Map() });
    expect(issue.body.split("\n").find((line) => line.startsWith("- Shares"))).toBe(
      `- Shares one branch and one PR with ${pair} (issue not created yet); the testing task runs first, and the branch, handoff folder and PR are named after its issue. The PR closes both issues.`,
    );
  }
});

test.each(["SYS-04.1, SEC-01.1", "SEC-01.1", "None"])(
  "Issues: unequal Requirements sets do not pair (%s)",
  (requirements) => {
    const tasks = parsePlan(plan.replace("- **Requirements:** SYS-04.1\n", `- **Requirements:** ${requirements}\n`));
    expect(tasks.map((task) => pairedTasks(task, tasks))).toEqual([[], []]);
  },
);

test("Issues: matching Requirements still need a dependency", () => {
  const tasks = parsePlan(plan.replace("- **Depends on:** T-01", "- **Depends on:** None"));
  expect(tasks.map((task) => pairedTasks(task, tasks))).toEqual([[], []]);
});

test("Issues: only unassigned, non-removed tasks need an issue", () => {
  const tasks = parsePlan(
    setPlanIssue(plan, "T-01", 5, repoUrl)
      .replace("### T-02: Implement the boundary", "### T-02: Implement the boundary (removed)")
      .concat("\n### T-03: Specify a contract\n\n- **Issue:** none (spec task)\n"),
  );
  expect(tasks.map(needsIssue)).toEqual([false, false, false]);
  expect(parsePlan(plan).map(needsIssue)).toEqual([true, true]);
});

test("Plan: supported task statuses survive parsing", () => {
  expect(taskStatuses).toEqual(["todo", "blocked", "awaiting-decision", "done"]);
  for (const status of taskStatuses) {
    const [task] = parsePlan(plan.replaceAll("- **Status:** todo", `- **Status:** ${status}`));
    expect(taskStatus(task)).toBe(status);
  }
});
