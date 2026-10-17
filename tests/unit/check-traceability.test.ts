// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function check(titles: string) {
  const directory = mkdtempSync(join(tmpdir(), "homebrew-traceability-"));
  directories.push(directory);
  const tests = join(directory, "tests");
  mkdirSync(join(tests, "e2e"), { recursive: true });
  const plan = join(directory, "PLAN.md");
  writeFileSync(plan, `# Fixture plan
### T-01: Test a synthetic requirement
- **Requirements:** SYS-06.2, CUS-03.1, SYS-06.20
- **Description:** Mentions SEC-01.9 outside Requirements.
- **Status:** done
### T-02: Implement a synthetic requirement
- **Requirements:** SYS-06.2
- **Status:** done
### T-03: Pending
- **Requirements:** OWN-04.1
- **Status:** todo
### T-04: Blocked
- **Requirements:** ADM-01.1
- **Status:** blocked
`);
  writeFileSync(join(tests, "e2e", "fixture.spec.ts"), titles);
  return spawnSync("bun", [resolve("workflow/scripts/check-traceability.ts"), plan, tests], {
    encoding: "utf8",
  });
}

test("Traceability: uncovered criteria exit 1 and identify every owning done task", () => {
  const result = check(`
    // test('SYS-06.2: commented out', () => {});
    /* it('CUS-03.1: also commented out', () => {}); */
    const fixture = "test('SYS-06.2: not a title', () => {})";
    test.describe('SYS-06.2: suite title alone is not coverage', () => {});
    test('SYS-06.20: distinct criterion', () => { const id = 'CUS-03.1'; });
  `);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("SYS-06.2: T-01: Test a synthetic requirement; T-02: Implement a synthetic requirement");
  expect(result.stderr).toContain("CUS-03.1: T-01: Test a synthetic requirement");
  expect(result.stderr).not.toMatch(/SYS-06\.20:|OWN-04\.1|ADM-01\.1|SEC-01\.9/);
});

test("Traceability: literal test titles cover criteria and exit 0", () => {
  const result = check(`
    test('SYS-06.2: allowed behaviour', () => {});
    it.each([1, 2])('CUS-03.1: edge case %s', () => {});
    test("SYS-06.20: separate boundary", () => {});
  `);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Traceability passed (2 done tasks");
  expect(result.stderr).toBe("");
});
