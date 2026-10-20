# Reviewer report

- **Agent:** reviewer
- **Issue:** #39 / T-08, paired with #38 / T-07
- **Spec IDs:** SYS-06.3, SYS-06.4, SYS-12.2, SYS-12.3
- **Date:** 2026-10-20
- **Branch:** feat/38-role-matrix-local-demonstration-seeds
- **Base ref:** origin/master
- **Base commit:** 0ec072452fd532eb388977baeb7a926c630bf4f7
- **Reviewed HEAD:** 941fa025839b159eb4beb6098688e158c694d95e
- **Implementation report:** workflow/handoffs/38-role-matrix-local-demonstration-seeds/02-implementation.md
- **Review round:** 1
- **Model:** gpt-6.1-sol
- **Reasoning:** high
- **Status:** completed

## Summary

Independently reviewed T-08’s role policies, protected signup provisioning, workspace prerequisite and local demonstration seeds against the approved technical contracts and paired acceptance tests.

The supplied base resolves to `origin/master` and is the merge base. Governing specs and PLAN are present there and unchanged in the reviewed working tree. HEAD matches the supplied commit; there are no staged, unstaged or untracked changes. Implementation preserved the committed testing files and configuration.

The launcher’s final-code `bun run verify` exited 0, with 328 tests passing. Two acceptance-evidence gaps remain.

**Overall:** fail

Dev/prod email-confirmation settings are unverified, and the cross-workspace update cases exercise an ungranted column instead of the permitted mutable fields.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-06.3 | incomplete | `supabase/migrations/20261020000000_role_matrix.sql:17` derives permissions from protected profiles, workspace, ownership and parent relationships. `tests/integration/roles-seeds/rls.test.ts:6` covers protected profiles; lines 20, 58, 75, 82 and 111 cover domain reads, eligibility, owner updates, review visibility and protected writes. Cross-workspace update coverage has the R2 gap. |
| SYS-06.4 | incomplete | `src/server/auth/signup.ts:4` restricts selected roles; migration line 90 provisions Customer/owner profiles in main. Actual Auth cases at `tests/integration/roles-seeds/signup-authority.test.ts:46` verify provisioning and forged metadata. Local TOML disables confirmation. Dev/prod declarations and validator tests do not establish effective project settings; see R1. Maintenance and kit provisioning remain explicitly allocated to T-27/T-25. |
| SYS-12.2 | incomplete | Migration predicates enforce workspace scope on existing domain rows. `src/server/auth/workspace.ts:14` provides the server scope prerequisite, tested at `tests/unit/roles-seeds/auth.test.ts:53`. RLS read cases cover main→kit, kit→main and kit→kit for every role. Cross-workspace update coverage has the R2 gap. Actual AI storage and route consumption are later-task integration evidence. |
| SYS-12.3 | completed | Migration lines 93–104 resolve main from protected database state and accept only Customer/owner selections. `signup-authority.test.ts:55` tests forged workspace/Admin metadata. `rls.test.ts:119` denies profile role/workspace reassignment; the existing immutable-workspace migration additionally protects membership. |
| T-08: Full local matrix/account/seed checks and catalogue checks pass | incomplete | Launcher verification passes the existing suites, including schema/catalogue checks and seed replay. `supabase/local-demonstration.sql:3` provides transactional, advisory-locked seeding; `seeds.test.ts:21` checks roles, approved cafés, menus, hours, past purchases and replay. R2 prevents complete acceptance of the write-matrix evidence. |
| T-08: `bun run verify` passes; known passwords never ship to hosted projects | completed | Launcher verification exited 0. Seed passwords are generated at execution in `local-demonstration.sql:33`; seed SQL is outside migrations and automatic seeding is disabled. `src/server/seeds/local.ts:6` rejects hosted/environment targets before Docker execution. `tests/unit/roles-seeds/hosted-artifacts.test.ts:7` checks both delivery workflows. No fixed demonstration password appears in the reviewed additions. |

## Findings

### Blocking

- **R1 — P2 — Dev/prod confirmation-off settings lack authoritative evidence.**  
  **Location:** `src/server/auth/signup.ts:10`; `tests/unit/roles-seeds/auth.test.ts:37`.  
  **Affected contract:** SYS-06.4; T-08’s requirement to keep confirmation off in dev/prod configuration.  
  **Evidence:** `authConfiguration` hardcodes two false values and explicitly states that hosted Auth settings are configured separately. Repository references show no configuration consumer. The tests pass synthetic booleans to `validateAuthConfiguration`; they neither inspect the exported declaration nor establish either Supabase project’s setting. `supabase/config.toml:37` establishes local configuration only. The implementation report also acknowledges that hosted settings were not verified.  
  **Impact:** Verification can pass regardless of whether dev or prod requires email confirmation. This portion of SYS-06.4 remains unverified; this finding does not assert that confirmation is currently enabled.  
  **Fix direction:** Supply authoritative, non-secret configuration evidence for both projects, through an applicable configuration artifact or accepted human verification. Tests should exercise the actual configuration source where it is repository-managed.

- **R2 — P2 — Cross-workspace update tests use an ungranted column.**  
  **Location:** `tests/integration/roles-seeds/rls.test.ts:42`; grants at `supabase/migrations/20261020000000_role_matrix.sql:64`.  
  **Affected contracts:** SYS-06.3 and SYS-12.2; T-07/T-08’s required cross-workspace write matrix.  
  **Evidence:** Every cross-workspace update uses `id=id`. Authenticated users receive UPDATE grants only for menu-item `name` and opening-hours `opens_at`. Consequently, these updates are denied by column privileges independently of the row-update policies. The same-workspace owner-update cases correctly use permitted columns at `rls.test.ts:75`, but cross-workspace cases do not.  
  **Impact:** The passing cross-workspace update cases do not demonstrate denial of the writes that ordinary owners can perform. Static inspection supports the current policies’ correctness, but the required write-boundary test evidence is incomplete.  
  **Fix direction:** Have testing-owned cases attempt updates to permitted menu/hour fields across main→kit, kit→main and kit→kit, with valid same-workspace controls. Retain ownership/protected-column denial cases separately.

### Non-blocking

None.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Launcher: `bun run verify` | passed; supplied exit 0 | Read `/var/folders/bg/pvg0yl3939g0qdn7why9kjnh0000gn/T/tmp.oUOgdA73Q6/verify.log`: lint, typecheck, 14 test files / 328 tests, traceability, specs, source isolation, production build and 35 client-artifact isolation checks passed. |
| Worker: Git status, HEAD/base resolution, merge-base and scoped diff inspection | passed | Supplied commits match; working tree is clean. Reviewed merge-base-to-working-tree additions and supporting unchanged code, excluding `.env*`. |
| Worker: `git diff 04a4ea4621c81695ece1f379d03dd02cf01f9076 HEAD -- tests vitest.config.mts` | passed | Empty diff confirms implementation preserved the committed acceptance suite and testing configuration. |
| Worker: `git diff --check 0ec072452fd532eb388977baeb7a926c630bf4f7 -- . ':!**/.env*' ':!.env*'` | passed | No whitespace diagnostics. |
| Worker: source, contract and test inspection | completed | Read applicable instructions/template, approved criteria, migration grants/policies, signup and seed modules, paired tests, existing schema enforcement and installed Next.js authentication-with-Cache-Components guide. |

The worker ran no tests, resets, builds, seed operations or other mutating checks, and did not launch `review.sh`. Implementation-reported standalone checks were read as evidence and were not independently rerun.

No hosted configuration, hosted database or live LLM was accessed. Browser/E2E checks were not run; this task introduces no browser routes. This functional review does not replace the dedicated security review.

## Open issues for the next step

- R1 leaves the dev/prod confirmation portion of SYS-06.4 unverified.
- R2 leaves meaningful cross-workspace update evidence incomplete.
- AI source/cache consumers, session resolution, maintenance provisioning and demo-kit creation remain with their allocated tasks. The current workspace helper establishes a prerequisite only.

## Suspicious content found

None.

## Human corrections

None.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | First independent review round. |

## Notes for reflection

- **What worked:** Real local Auth and SQL-role tests provide substantial evidence beyond pure helper tests; launcher verification reached every required stage.
- **What needed guidance:** Distinguishing configuration declarations from effective settings, and column-permission rejection from row-policy enforcement.
- **What to change in the agent or skill:** Require negative write tests to exercise a column permitted in the corresponding positive control.