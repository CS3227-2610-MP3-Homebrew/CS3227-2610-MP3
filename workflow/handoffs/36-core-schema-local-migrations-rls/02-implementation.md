# Implementation report

- **Agent:** implementation
- **Issue:** #37 / T-06 (paired with #36 / T-05)
- **Spec IDs:** SYS-06.1, SYS-06.2, SYS-12.1
- **Date:** 2026-10-19
- **Branch:** feat/36-core-schema-local-migrations-rls
- **Base commit:** 20bc8b0 (testing commit and implementation starting HEAD); approved spec base origin/master 123f012ce2df971ea9cdc9a1fab6f54379c08af0
- **Status:** completed

## Summary

Implemented the local Supabase lifecycle, eight core entities, relational and
workspace constraints, explicit grants/RLS, protected own-profile role lookup,
automatic RLS for new public tables, and a catalogue checker covering application
tables in unexposed/new schemas. CI now starts/resets local Supabase and checks
its catalogue before verification. The CLI is pinned to Supabase 2.121.0; the
wrapper fixes the local target, rejects additional arguments and suppresses
generated credential output. One main workspace is seeded by migrations.

Final local verification is complete: all 28 assigned schema tests and all 219
tests in `bun run verify` pass, together with lint, typecheck, traceability, specs,
the production build and artifact isolation. No acceptance tests, fixtures,
helpers, test configuration or testing-owned dependencies were changed. No
supplementary unit tests were added. No hosted database, deployment or live LLM
was used. Independent implementation/security reviews remain pending.

Repair cycles used: **1 of 3**. The first targeted run had 27 passes and one
five-second Vitest timeout in the reviews/orphan-profile case (8.18 seconds),
without a SQL assertion failure. The subsequent initial full verification passed
all 219 tests. An additional two-session local check then exposed a real
snapshot-dependent invariant defect: a `REPEATABLE READ` transaction established
its snapshot before a second transaction committed an order; the first
transaction's profile-workspace update missed that order and committed a
cross-workspace edge (psql exit 0, mismatch count 1). The repair adds immutable
profile/cafe workspace identity, consistent with denied workspace reassignment,
without adding any relocation operation. Previously applied migrations were
preserved; an additive migration replaces the reverse-edge lookup triggers.
The same reproducer now rejects the update (psql exit 3), leaves the profile
unchanged and reports zero mismatched edges. Synthetic records were cleaned up.
Final affected tests and full verification were rerun after that repair.

Product fields, signup provisioning, lifecycle rules and the complete role matrix
remain their assigned later tasks. This foundation grants only authenticated
own-profile SELECT; other product access stays denied. Reviews derive their cafe
through their order, and order-item composite foreign keys require the same cafe
for the order and menu item. Workspace columns exist only on Profiles and Cafes.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-06.1 | completed | All assigned schema cases pass: replay twice, valid core graph, Auth/FK orphan rejection, unique review/order and same-/cross-workspace cross-cafe order-item rejection. |
| SYS-06.2 | completed | Assigned catalogue/migration tests pass, including actual db:check fail/name/repair/pass for an unexposed table. Final standalone db:check passes. Rolled-back SQL also verifies automatic public-table RLS and absence of automatic table/function privileges. |
| SYS-12.1 | completed | Assigned one-main-workspace, workspace-column inheritance, cross-workspace actor insertion/reassignment and review/order consistency cases pass. Two-session REPEATABLE READ check rejects parent workspace movement with no partial invariant change. |
| T-06: local replay, integrity tests and catalogue CI checks | completed | Final local db:start, db:reset, db:check and 28/28 assigned tests pass. Existing CI workflow now invokes local start/reset/catalogue commands before verify; remote GitHub Actions execution was not performed. |
| T-06: bun run verify without hosted access | completed | Final exact command exits 0: 9 test files and 219 tests pass; lint, typecheck, traceability, specs, production build and 35-client-artifact isolation pass. |

## Files changed

- `supabase/config.toml`: local project, PostgreSQL 17, migrations, Auth and Data API; automatic table exposure disabled; unused local services disabled; no secret values or dotenv references.
- `supabase/.gitignore`: excludes local CLI branch/temp state.
- `supabase/migrations/20261019000000_core_schema.sql`: core entities, stable identities, relational constraints/indexes, one main workspace, explicit grants/RLS, own-profile lookup and public-table auto-RLS trigger.
- `supabase/migrations/20261019000001_default_privileges.sql`: removes global automatic grants as well as schema defaults, including PostgreSQL's PUBLIC function EXECUTE default.
- `supabase/migrations/20261019000002_immutable_workspace_identity.sql`: additive concurrency repair replacing snapshot-dependent reverse-edge checks with immutable membership.
- `scripts/database.ts`: fixed local startup/reset/check commands, all-application-table catalogue query, argument guard and credential-output suppression.
- `package.json`, `bun.lock`: db:start/db:reset/db:check scripts and pinned Supabase CLI dependency; existing dependency entries preserved.
- `.github/workflows/ci.yml`: local startup, migration reset and catalogue steps before existing verify step.
- `workflow/handoffs/36-core-schema-local-migrations-rls/02-implementation.md`: this report.

## Checks run

Only final-code checks are listed below. Local commands used Docker Desktop and
the installed Node 24.19.0 runtime on PATH; machine-specific paths were not added
to repository configuration. Docker-dependent commands ran with approved local
socket access. Generated CLI credential output was suppressed.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` | Passed | Final three migrations replayed against local Supabase; exit 0. |
| `bun run db:start` | Passed | Final already-running local startup is idempotent; exit 0, credentials omitted. |
| `bun run db:check` | Passed | Every application table has RLS; exit 0. |
| `bun run test tests/integration/schema/schema.test.ts` | Passed | 1 file, 28/28 tests; 40.42 seconds, exit 0. Includes two resets and negative unexposed-table fail/repair/pass fixture. |
| `bun run verify` | Passed | Exit 0; lint/typecheck, 9 files/219 tests, traceability (7 done tasks), specs (0 warnings), build and isolation (35 client artifacts). |
| Two-session Python / local docker-psql REPEATABLE READ reproducer | Passed | Parent move rejected, profile unchanged, mismatched order edges 0; synthetic setup cleaned up. |
| Rolled-back local docker-psql transaction | Passed | Own-role lookup, cross-profile filtering, anonymous denial, denied profile writes, unchanged cafe workspace, automatic public-table RLS and no automatic table/function access. |
| `bun scripts/database.ts reset --linked` | Expected rejection | Exit 1 before invoking Supabase/Docker; additional target arguments rejected. |
| `git diff --check` and final scope inspection | Passed | No whitespace errors; only listed implementation/runtime/CI/report paths changed. Testing-owned files, specs, PLAN and guides untouched. |

## Open issues for the next step

- Independent implementation and security reviews are pending; completed here
  means implementation and local verification, without approval or merge.
- GitHub Actions itself was not run. Its new commands pass locally; workflow
  execution awaits the human-owned commit/PR process.
- The concurrency regression is evidenced by a manual two-session reproduction;
  no testing-owned acceptance suite was extended by implementation.
- The complete role matrix, ordinary signup/profile provisioning, domain fields
  and lifecycles, demo-kit provisioning and later infrastructure tables remain
  outside T-06. This report does not claim those behaviors are implemented.
- No current blocker or required product/spec decision. PLAN statuses were not
  edited by implementation. No commit, push or PR was performed.

## Suspicious content found

None.

## Human corrections

None to the approved behavior. The coordinator relayed existing human
authorization to continue T-06 after the testing commit and to make local Docker
available; no additional product contract was inferred.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Independent review has not run. |

## Notes for reflection

- **What worked:** Existing catalogue-discovered fixtures exercised the minimal schema without inventing later story fields; a real two-transaction check exposed a gap that single-transaction cases did not.
- **What needed guidance:** The coordinator arranged approved Docker availability; the original test timeout did not recur in either full verification or the final targeted suite.
- **What to change in the agent or skill:** A reusable transaction-isolation regression check would help detect snapshot-dependent constraint designs earlier. No instruction or skill file was changed.
