import { expect, test } from "vitest";
import { existingIssueNumbers, planIssue, setPlanIssue } from "../../workflow/scripts/lib/issues";
import { parsePlan } from "../../workflow/scripts/lib/plan";

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
