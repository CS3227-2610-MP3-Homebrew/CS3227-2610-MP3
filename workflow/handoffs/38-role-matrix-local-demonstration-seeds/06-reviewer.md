# Reviewer report

- **Agent:** reviewer
- **Issue:** #39 / T-08, paired with #38 / T-07
- **Spec IDs:** SYS-06.3, SYS-06.4, SYS-12.2, SYS-12.3
- **Date:** 2026-10-20
- **Branch:** feat/38-role-matrix-local-demonstration-seeds
- **Base ref:** origin/master
- **Base commit:** 0ec072452fd532eb388977baeb7a926c630bf4f7
- **Reviewed HEAD:** a1a16a9b9bbaaa73e22e30dc7efbe4cad4ac5c6c
- **Implementation report:** workflow/handoffs/38-role-matrix-local-demonstration-seeds/05-implementation.md
- **Review round:** 2
- **Model:** gpt-6.1-sol
- **Reasoning:** high
- **Handoff target:** workflow/handoffs/38-role-matrix-local-demonstration-seeds/06-reviewer.md
- **Status:** completed

## Summary

Independently assessed T-08’s role policies, protected signup provisioning, workspace boundary and local demonstration seeds, including both round-1 findings.

The supplied HEAD, branch, base commit and merge base match the repository. The working tree is clean. Governing contracts and task mappings are present on `origin/master`, whose merged specifications provide approval evidence under `workflow/specs/README.md`. Specs and PLAN are unchanged in this branch.

R1 is resolved by the specific human verification recorded in `05-implementation.md:20`: Confirm email was verified disabled in both `homebrew-dev` and `homebrew-prod`. This is accepted human configuration evidence, not an automated enforcement claim.

R2 is resolved by 40 additional tests exercising permitted menu-name and opening-time updates. Each proves a successful owner update before checking foreign-workspace denial and stored values. Existing acceptance tests remain intact.

**Overall:** pass
All criteria allocated to this foundation task have sufficient evidence, both previous findings are resolved, and the launcher’s fresh verification passed every stage with 368 tests.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-06.3 | completed | `supabase/migrations/20261020000000_role_matrix.sql:17` derives permissions from protected identity, workspace, role, ownership and parent relationships; lines 64–78 constrain mutable fields and owner updates. `tests/integration/roles-seeds/rls.test.ts:6` covers protected profiles; lines 20, 36, 47, 58, 75, 82, 111, 119 and 128 cover domain permissions, workspace/anonymous denial, eligibility, mutable writes, protected state, escalation and ownership. `mutable-writes.test.ts:29` adds meaningful cross-workspace mutable-field cases. All pass in launcher verification. |
| SYS-06.4 | completed | `src/server/auth/signup.ts:4` restricts selected roles. Migration lines 90–110 provision only Customer/owner profiles in main; missing selections confer no application role. `signup-authority.test.ts:46`, `:55` and `:73` exercise real local Auth provisioning and forged authority metadata. `supabase/config.toml:37` disables local confirmation. `05-implementation.md:20` records human verification that confirmation is disabled in both named hosted projects. Maintenance and kit provisioning remain allocated to T-27/T-25. |
| SYS-12.2 | completed | Migration predicates enforce workspace scope across existing domain rows. `rls.test.ts:36` covers reads and protected writes in main→kit, kit→main and kit→kit directions for every role. `mutable-writes.test.ts:10` enumerates four directions across both mutable entities and all five actors; lines 48–71 verify actual writes, successful owner controls and foreign denial. `src/server/auth/workspace.ts:14` supplies the server scope prerequisite, tested at `tests/unit/roles-seeds/auth.test.ts:53` and `:62`. Future AI consumers remain separately allocated integration work. |
| SYS-12.3 | completed | Migration lines 93–104 resolve main from database state and accept only Customer/owner selections. `signup-authority.test.ts:55` verifies that forged workspace/Admin metadata cannot alter protected provisioning. `rls.test.ts:119` denies role/workspace reassignment. The existing immutable-workspace migration provides additional membership enforcement. |
| T-08: Full local matrix/account/seed checks and catalogue checks pass | completed | Launcher verification passes all 368 tests, including schema replay/catalogue checks and the expanded role matrix. `supabase/local-demonstration.sql:3` provides transactional, advisory-locked seeding; `seeds.test.ts:21` verifies all roles, approved cafés with menus/hours, past purchases and unchanged replay. `tests/integration/schema/schema.test.ts:144` checks application-table RLS and invokes the catalogue checker. |
| T-08: `bun run verify` passes; known passwords never ship to hosted projects | completed | Fresh launcher verification exited 0 through every stage. `local-demonstration.sql:33` generates passwords at execution; seed SQL is outside migrations and automatic seeding is disabled. `src/server/seeds/local.ts:6` rejects hosted/environment targets before local Docker execution. `seeds.test.ts:48` checks target rejection; `tests/unit/roles-seeds/hosted-artifacts.test.ts:7` checks both delivery paths. Reviewed additions contain no fixed demonstration password. |

## Findings

### Blocking

None.

### Non-blocking

None.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Launcher: `bun run verify` | passed; supplied exit 0 | Read `/var/folders/bg/pvg0yl3939g0qdn7why9kjnh0000gn/T/tmp.EEb2tsUB8G/verify.log`. Lint, typecheck, 15 test files / 368 tests, traceability, specs, source isolation, production build and 35 client-artifact isolation checks passed. All chained stages were reached. |
| Worker: Git status, branch, HEAD/base and merge-base inspection | passed | Repository matches supplied inputs; no staged, unstaged or untracked changes. |
| Worker: merge-base-to-working-tree and supporting source inspection | completed | Inspected implementation, tests, migrations, local configuration and delivery definitions, excluding `.env*`. Read approved contracts, reports and the installed Next.js authentication-with-Cache-Components guide. |
| Worker: `git diff 04a4ea4621c81695ece1f379d03dd02cf01f9076 941fa025839b159eb4beb6098688e158c694d95e -- tests vitest.config.mts` | passed | Empty diff confirms initial implementation preserved testing-owned files and configuration. |
| Worker: scoped comparison from `941fa025839b159eb4beb6098688e158c694d95e` to HEAD | passed | Application, migration, package and Vitest configuration diffs are empty. Role-suite changes consist solely of the additional mutable-write test file. |
| Worker: `git diff origin/master -- workflow/specs workflow/PLAN.md` | passed | Empty diff; approved contracts and task allocations are unchanged. |
| Worker: full-diff `git diff --check` with `.env*` exclusions | exit 2; Markdown formatting diagnostics only | Diagnostics identify two-space Markdown line breaks in the immutable `03-reviewer.md`. They do not identify an implementation defect or failed acceptance check. |
| Worker: `git diff --check 0ec072452fd532eb388977baeb7a926c630bf4f7 -- src supabase tests vitest.config.mts` with `.env*` exclusions | passed | No source, migration, test or configuration whitespace diagnostics. |

The worker ran no tests, builds, resets, seeds or other mutating checks and did not launch `review.sh`. Implementation-reported targeted tests and standalone `db:check` were read as supporting evidence, not independently rerun.

Browser/E2E checks were not run; this task adds no browser surface. No hosted database, hosted settings, live LLM or `.env*` file was accessed. Hosted confirmation acceptance relies on the recorded human verification. This functional review does not replace the dedicated security review or approve a merge/deployment.

## Open issues for the next step

No unresolved blocker for T-08.

Session resolution, actual AI source/cache consumers, demo-kit creation, maintenance provisioning and reserved story lifecycles remain with their allocated tasks. The workspace helper establishes a prerequisite for those consumers.

Hosted confirmation settings can drift; this review establishes human-verified configuration evidence, not ongoing automated monitoring.

## Suspicious content found

None.

## Human corrections

`05-implementation.md:104` records that the human’s initial “Not yet verified” response was superseded by “Verified disabled in both projects.” This review accepts that recorded verification for both named Supabase projects; the worker did not inspect hosted settings directly.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| `03-reviewer.md`, round 1 | R1 — authoritative dev/prod confirmation-off evidence | Fixed | `05-implementation.md:20` records explicit human verification for both named projects at Authentication → Email provider, satisfying the previous finding’s accepted evidence route. Synthetic declarations are not treated as effective hosted configuration. |
| `03-reviewer.md`, round 1 | R2 — cross-workspace updates used an ungranted column | Fixed | `mutable-writes.test.ts:29` exercises granted fields with different values. Lines 63–68 prove actual owner success and calibrate the denial assertion; lines 70–71 check foreign denial. Successful SQL attempts also receive independent stored-value observation. Forty added cases and all prior cases pass fresh launcher verification. |

## Notes for reflection

- **What worked:** Successful owner controls and stored-value observations establish meaningful write-boundary evidence; fresh verification covers the final reviewed code.
- **What needed guidance:** Effective hosted settings require configuration evidence distinct from application declarations.
- **What to change in the agent or skill:** Negative permission tests should pair the attempted operation with a successful authorized control.