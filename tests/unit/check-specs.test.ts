// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { checkRepository } from "../../workflow/scripts/lib/spec-checks";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const task = (id: string, title: string, owner: string, requirements: string, dependsOn = "None", status = "todo") => `
### ${id}: ${title}

- **Depends on:** ${dependsOn}
- **Owner role:** ${owner}
- **Requirements:** ${requirements}
- **Description:** Synthetic.
- **Work:** Synthetic.
- **File scope:** Synthetic.
- **Acceptance criteria:**
  - [ ] Synthetic.
- **Status:** ${status}
- **Issue:** unassigned
`;

const baseline: Record<string, string> = {
  "workflow/specs/PRODUCT-SPEC.md": `# Product
## Product-level functional requirements
| CUS-01 | Repeated outside User stories, so not a duplicate story. |
## User stories
| ID | Story | Priority | Scope |
| --- | --- | --- | --- |
| CUS-01 | As a customer, I want to browse. | High | MVP |
## Assumptions
`,
  "workflow/specs/TECHNICAL-SPEC.md": `# Technical
## Requirements
### SYS-04 — Runtime boundaries
- **SYS-04.1:** Synthetic runtime criterion.
`,
  "workflow/specs/AI-SECURITY-SPEC.md": `# Security
### SEC-01 — Authorized operations
- **SEC-01.1:** Synthetic security criterion.
`,
  "workflow/specs/stories/CUS-01-browse-cafes.md": `# CUS-01: Browse cafés
See [technical runtime](../TECHNICAL-SPEC.md#sys-04--runtime-boundaries).
### \`CUS-01\`: Browse cafés
- **\`CUS-01.1\`:** Given a café, when browsing, then it is listed.
`,
  "workflow/PLAN.md": `# Plan
## Foundations
${task("T-01", "Test runtime", "testing", "SYS-04.1, SEC-01.1")}
${task("T-02", "Implement runtime", "implementation", "SYS-04.1, SEC-01.1", "T-01")}
## Customer
${task("T-03", "Test browsing", "testing", "CUS-01.1 — [CUS-01](specs/stories/CUS-01-browse-cafes.md)")}
${task("T-04", "Implement browsing", "implementation", "CUS-01.1", "T-03")}
`,
  "tests/unit/browse.test.ts": `test("CUS-01.1: lists an eligible café", () => {});`,
};

function check(overrides: Record<string, string | null> = {}) {
  const root = mkdtempSync(join(tmpdir(), "homebrew-specs-"));
  directories.push(root);
  for (const [path, content] of Object.entries({ ...baseline, ...overrides })) {
    if (content === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  const findings = checkRepository(root);
  return {
    errors: findings.filter((finding) => finding.level === "error").map((finding) => finding.message),
    warnings: findings.filter((finding) => finding.level === "warning").map((finding) => finding.message),
  };
}

test("check-specs: a consistent fixture has no errors or warnings", () => {
  expect(check()).toEqual({ errors: [], warnings: [] });
});

test("check-specs: reports duplicate, misplaced and orphan criterion definitions", () => {
  const { errors } = check({
    "workflow/specs/AI-SECURITY-SPEC.md": `# Security
### SEC-01 — Authorized operations
- **SEC-01.1:** Synthetic security criterion.
- **SEC-01.1:** Duplicate definition.
- **SYS-04.2:** Misplaced system criterion.
`,
    "workflow/specs/INTEGRATION-SPEC.md": "- **OWN-02.1:** Criterion for a story with no file.\n",
  });
  expect(errors).toContain("SEC-01.1 is already defined in workflow/specs/AI-SECURITY-SPEC.md.");
  expect(errors).toContain("SYS-04.2 must be defined in workflow/specs/TECHNICAL-SPEC.md.");
  expect(errors).toContain("OWN-02.1 has no owning spec; its requirement OWN-02 is undefined.");
});

test("check-specs: reports plan coverage, ownership and dependency violations", () => {
  const { errors, warnings } = check({
    "workflow/PLAN.md": `# Plan
## Foundations
${task("T-01", "Test runtime", "testing", "SYS-04.1, SEC-01.9")}
${task("T-02", "Implement runtime", "implementation", "SYS-04.1", "T-05", "done")}
${task("T-03", "Duplicate test", "testing", "SYS-04.1", "T-04")}
${task("T-04", "Spec prerequisite", "spec", "CUS-01.1, OWN-07", "T-03", "started")}
`,
  });
  expect(errors).toEqual(
    expect.arrayContaining([
      "T-01 lists undefined criterion SEC-01.9.",
      "T-02 depends on unknown task T-05.",
      "T-02 is done without an issue.",
      "T-04 has unknown status \"started\".",
      "T-04 is a spec task; spec tasks own no criteria (CUS-01.1).",
      "Reference to undefined requirement OWN-07.",
      "SYS-04.1 has 2 testing tasks: T-01, T-03.",
      "T-02 implements SYS-04.1 but does not depend on its test task T-01.",
      "SEC-01.9 has no implementation task (listed by T-01).",
      "Dependency cycle: T-03 → T-04 → T-03.",
    ]),
  );
  expect(warnings).toContain("SEC-01 has 1 criteria not planned in any PLAN.md task yet: SEC-01.1.");
});

test("check-specs: reports broken links and missing anchors outside handoffs", () => {
  const { errors } = check({
    "workflow/specs/stories/CUS-01-browse-cafes.md": `# CUS-01: Browse cafés
[ok](../TECHNICAL-SPEC.md#sys-04--runtime-boundaries) [gone](../MISSING.md)
[bad anchor](../TECHNICAL-SPEC.md#sys-05) \`[in code](../MISSING.md)\` [web](https://example.com/x)
### \`CUS-01\`: Browse cafés
- **\`CUS-01.1\`:** Given a café, when browsing, then it is listed.
`,
    "workflow/handoffs/1-x/01-spec.md": "[history may break](../../nowhere.md)\n",
    "docs/Guide.md": "```\n[fenced](missing.md)\n```\n[escape](../../outside.md)\n",
  });
  expect(errors).toEqual([
    "Link ../../outside.md leaves the repository.",
    "Broken link ../MISSING.md.",
    "Link ../TECHNICAL-SPEC.md#sys-05 names a missing heading #sys-05.",
  ]);
});

test("check-specs: reports story-file, placeholder and test-title drift", () => {
  const { errors } = check({
    "workflow/templates/story-spec.md": "# [Story ID]: [Title]\n",
    "workflow/specs/stories/CUS-01-browse-cafes.md": `# [Story ID]: Browse cafés
### \`CUS-01\`: Browse cafés
- **\`CUS-01.1\`:** Given a café, when browsing, then it is listed (see CUS-01.4).
`,
    "workflow/specs/stories/CUS-01-duplicate.md": "### `CUS-01`: Again\n",
    "workflow/specs/stories/CUS-09-not-a-story.md": "### `CUS-09`: Unlisted\n",
    "workflow/specs/stories/Bad_Name.md": "# Bad\n",
    "tests/unit/browse.test.ts": `test("CUS-01.7: cites a criterion nobody defined", () => {});`,
  });
  expect(errors).toEqual(
    expect.arrayContaining([
      "Template placeholder [Story ID] remains.",
      "Reference to undefined criterion CUS-01.4.",
      "Story files are named <ID>-<lowercase-slug>.md.",
      "CUS-01 already has a story file: workflow/specs/stories/CUS-01-browse-cafes.md.",
      "CUS-09 is not a story in PRODUCT-SPEC.md's User stories section.",
      'Test title "CUS-01.7: cites a criterion nobody defined" names undefined criterion CUS-01.7.',
    ]),
  );
});

test("check-specs: reports registry status and Developer Guide inventory drift", () => {
  const { errors, warnings } = check({
    "workflow/specs/README.md": `| File | Scope | Template | Status |
| --- | --- | --- | --- |
| \`AI-SECURITY-SPEC.md\` | Security. | None. | Planned |
| \`INTEGRATION-SPEC.md\` | Integration. | None. | Written |
| \`stories/<ID>-<slug>.md\` | Stories. | Story. | Planned |
`,
    "workflow/agents/docs.md": "# Docs agent\n",
    "workflow/agents/spec.md": "# Spec agent\n",
    "docs/DeveloperGuide.md": "| `workflow/agents/spec.md` | Listed. |\n",
  });
  expect(warnings).toContain("AI-SECURITY-SPEC.md exists but is still marked Planned.");
  expect(errors).toContain("INTEGRATION-SPEC.md is marked Written but does not exist.");
  expect(errors).toContain("Workflow file workflow/specs/README.md is missing from the workflow files table.");
  expect(errors).toContain("Workflow file workflow/agents/docs.md is missing from the workflow files table.");
  expect(errors).not.toContain("Workflow file workflow/agents/spec.md is missing from the workflow files table.");
});
