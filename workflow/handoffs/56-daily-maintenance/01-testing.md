# Testing report

- **Agent:** testing (Codex, single-agent mode)
- **Issue:** #56, PLAN T-26; paired with #57/T-27
- **Spec IDs:** SYS-13.1–SYS-13.8, SEC-10.4, SEC-10.5
- **Date:** 2026-10-22
- **Branch:** feat/56-daily-maintenance
- **Base commit:** 8987018d5f30828404728e371d08e82114826ff6 (fetched upstream/master); HEAD 67cc86da3edcc41b19c04fc3117c36d03ed70160
- **Status:** completed

## Summary

Single-agent mode testing stage: authored 25 deterministic failing-first cases
in three test files, plus a typed internal-interface contract. Before the human
revision, the complete verification run passed lint/typecheck and reached 1,145
passing existing tests and 25 expected new failures. After the three requested
revisions, the targeted run still has 25 expected failures (12 HTTP, nine
provisioning, four configuration); lint, typecheck and traceability pass.
No implementation work has started. This is
completed test authoring, not passing implementation or merge evidence.

Approved SYS/SEC criteria and the maintenance integration contract are present
on upstream/master; working PLAN/specs have no diff against that base. The only
cross-cutting open ASSUMPTION is permitted TECHNICAL-SPEC ASM-01. Both issue dry-run
entries are `skip`; T-26/T-27 are `todo`. Existing retention and production
workflow prerequisites are present. Owner contracts OWN-01–OWN-03 and ADM-01
were read; local catalogue/menu/hour schema is present. The supplied branch was
reused; no branch/history mutation was performed.

## Acceptance criteria

All statuses below refer to authored cases and expected failing-first evidence.
Production behavior remains unimplemented.

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-13.1 | completed | Concurrent main Admin creation; correct initial password hash; retained identity and changed password after configured-email change; five existing-email role/workspace conflict cases with unchanged account/profile. |
| SYS-13.2 | completed | Same-query showcase pre-state; when initially absent, first run must create a new approved main café and call Auth creation, with at least one password checked; owner, menu and hours required. Random unpublished owner passwords absent from returned outcomes/domain records. |
| SYS-13.3 | completed | Five invalid/missing bearer cases, missing configured secret, shared private 401 envelope/no work; server-only and constant-time primitive inspection; GET/shared HTTP composition inspection. |
| SYS-13.4 | completed | Exact UTC cron and one production-environment post-deploy bearer call; no development call; no retry/verbose logging in that call. Static checks only. |
| SYS-13.5 | completed | Awaited cleanup/admin/showcase order, separate fault at each step, repeat/concurrent provisioning, retained state after second showcase run. |
| SYS-13.6 | completed | Exact top-level and step response keys, distinct ordered steps, numeric counts, private no-store response. |
| SYS-13.7 | completed | Email/password missing independently; main Admin failure outcome while the other handler steps succeed. |
| SYS-13.8 | completed | T-06 Fixture kit/owner/café/menu/hours preserved alongside every pre-existing public domain row; existing T-16 retention exercised through handler; composition requires importing `@/server/llm/ai-state` and calling `.cleanup()` next to the no-generation check. |
| SEC-10.4 | completed | Missing/wrong bearer and missing configuration fail before work; constant-time crypto primitive inspection, environment-bound workflow secret. E-17. |
| SEC-10.5 | completed | Count-only response shape and exception canaries absent from response/console captures; hidden showcase credentials absent from outcomes and domain snapshots. E-18. |

### Case inventory and observed failures

Every criterion-bearing `test()` title is a string literal. Parameter values are
in `describe()` groups. The three human-authorized revisions below are applied;
no other assertion changed. Case counts are unchanged: 12 + 9 + 4 = 25.

| File / exact title after criterion prefix | Cases | Expected failing-first reason |
| --- | --- | --- |
| http: missing or wrong bearer returns private 401 before any work | 5 | Missing src/server/maintenance/index.ts. |
| http: missing configured secret fails closed even with a supplied bearer | 1 | Same missing module. |
| http: authorized request awaits ordered steps and returns only counts | 1 | Same missing module. |
| http: a step exception is sanitized and every later step still runs | 3 | Same missing module. |
| http: authorized maintenance invokes the existing retention repository without generating AI content | 1 | Same missing module, before retention fixture setup. |
| http: main Admin configuration failure remains an outcome while cleanup and showcase succeed | 1 | Same missing module. |
| provision: maintenance creates one main Admin concurrently and preserves its changed password and identity after email changes | 1 | Same missing module, before provisioning fixture setup. |
| provision: existing configured-email account yields conflict without promotion reset or other changes | 5 | Same missing module. Groups: customer/main, customer/kit, owner/main, owner/kit, admin/kit. |
| provision: missing main Admin setting reports failure without creating or changing accounts | 2 | Same missing module. Groups: email, password. |
| provision: showcase is approved main-only with menu hours and hidden random owner credentials while kits and existing domain rows are preserved | 1 | Same missing module. |
| configuration: server-only maintenance uses the constant-time crypto comparison primitive | 1 | Missing maintenance feature directory. |
| configuration: production GET route composes maintenance with shared HTTP primitives and retention without generation | 1 | Missing maintenance GET route. |
| configuration: production cron schedules the maintenance endpoint at 19:00 UTC daily | 1 | Vercel config has no matching cron (observed empty list). |
| configuration: production workflow calls maintenance exactly once after successful deploy with its environment secret | 1 | Existing production workflow has zero maintenance calls. |

Full criterion-prefixed titles and executable assertions are in the three files.
All 25 failures have the above missing-implementation reasons; none is reported
as a passing runtime assertion. Local provisioning fixtures after the missing
module guard have not yet executed, so their runtime validity remains to be
confirmed when implementation exists.

## Interfaces defined by tests

`tests/integration/maintenance/contracts.ts` defines the smallest injected seams
under `src/server/maintenance/index.ts`, outside shared HTTP primitives:

- `createMaintenanceHandler({secret?, cleanup, ensureMainAdmin, ensureShowcase})`
  returns `(request: Request) => Promise<Response>`. Each step returns
  `Promise<{outcome: string, count: number}>`; handler execution is sequential.
  Test fixtures use `success` and `failure`; thrown step errors become a safe
  `failure` outcome with count zero. Returned step labels are nonempty strings
  with distinct identities; tests do not prescribe their exact spelling.
- `ensureMainAdmin({auth, rpc, email?, password?})` and
  `ensureShowcase({auth, rpc})` return the same outcome/count type.
  `auth` exposes only Supabase Admin `createUser`; `rpc` is the existing RPC
  signature from usage tests. Conflicts are `{outcome: "conflict", count: 0}`;
  missing main Admin configuration is `{outcome: "failure", count: 0}`.
  SQL RPC names/arguments are implementation-owned.

The real route statically composes the feature with shared primitives from
`src/server/http/`. Local provisioning uses loopback-only Supabase configuration
and `rpcAs()` against Docker Postgres. No dotenv file is read. Main Admin fixture
roles are temporarily changed under local postgres and restored in `finally`,
preserving FK identities and Auth rows. New synthetic Admin identities are
cleaned up by the test. Kit fixtures use T-06 `Fixture`, independently of T-25.
The retention test reuses T-16's clock-controlled repository and owns only its
invocation through the maintenance handler, not SEC-09.2 retention policy.

## Files changed

- `tests/integration/maintenance/contracts.ts`: typed module seams and synthetic bearer request helper.
- `tests/integration/maintenance/http.test.ts`: 12 handler/retention cases.
- `tests/integration/maintenance/provision.test.ts`: nine local provisioning cases.
- `tests/integration/maintenance/configuration.test.ts`: four static security/route/trigger cases.
- This report.

No dependencies added; package.json and bun.lock are unchanged. Scope is tests
and this report only. No application, workflow, docs, spec or PLAN files changed.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git fetch upstream` | passed, escalated approval | Current upstream/master resolved to the base above. |
| `bun workflow/scripts/create-issues.ts --repo CS3227-2610-MP3-Homebrew/CS3227-2610-MP3 --tasks T-26,T-27` | passed, escalated approval | Both tasks printed `skip` with #56/#57. Dry run only. |
| `bun run check:specs` | passed | 0 warnings; also rerun after test authoring. |
| `bun run db:start` | passed | Local start succeeded; generated credentials omitted. |
| `bun run db:reset` | passed | Local reset succeeded; generated credentials omitted. |
| `bun run db:check` | passed | Every application table has RLS. |
| `bun run verify` (before human revision) | expected failing-first exit 1 | Lint and typecheck passed. 65 files: 62 passed, three new files failed. 1,170 tests: 1,145 passed, 25 new failures. Duration 373.44s. Not rerun after the revision; latest requested checks follow. |
| `bun run test tests/integration/maintenance` | expected exit 1 | After human revision: three files, 25 failures (12 HTTP, nine provisioning, four configuration), all missing-implementation reasons listed above; 782ms. Empty bearer group now displays as `""`. New wiring/showcase assertions remain behind missing-implementation guards and have not executed yet. |
| `bun run lint` | passed | Rerun after the human revision, exit 0. |
| `bun run typecheck` | passed | Rerun after the human revision; generated route types and tsc completed, exit 0. |
| `bun run check:traceability` | passed | Rerun after the human revision: 44 done tasks, all listed criteria have test titles. No statuses changed. |
| Stage-2 Bun manifest assertion | passed | Existing devDependencies and all other manifest fields unchanged. |
| `git diff --check` and scope status | passed | Only four new maintenance test files and this report. |

Verify's traceability, spec and build steps were not reached because tests
returned exit 1. Traceability/spec were run separately as recorded above.
Build was not run separately. No browser-visible cases were added, so
`bun run test:e2e` was not run. A read-only `ps` diagnostic was denied by the
sandbox during the suite's quiet period; no escalation or substitute process
inspection was attempted, and the suite subsequently finished normally.

## Open issues for the next step

Human review and test commit are outstanding. The single-agent implementation
stage has not begun. Production scheduling, deployment, hosted database and
trigger execution evidence remain human-owned and unclaimed. Security runtime
and persistence checks remain expected failures until implementation exists.

## Suspicious content found

None.

## Human corrections

- Before the test commit, the human explicitly requested three revisions in
  this same report and branch: (1) retain the existing assertions and require
  a T-16 `@/server/llm/ai-state` import plus a `.cleanup()` call beside the
  no-generation check, closing the injected-parameter-name match gap;
  (2) capture the showcase pre-state with the same query and, when empty,
  assert that the first run creates a new approved main café and calls
  `auth.createUser`, then require at least one password for the existing
  credential checks; (3) use `JSON.stringify(authorization)` for bearer
  `describe()` groups so the empty-string case is titled. All three are applied.
  Every criterion-bearing test title remains a string literal; no other
  assertion changed. Requested checks were rerun with the results above.
  Case counts remain 25; implementation stays unstarted and the human test
  review/commit stop remains in place. No new report was created.
- Applied the human's initial string-literal test-title and `describe()` grouping
  requirement throughout; maintenance seams stay outside `src/server/http/`.
- During drafting, the cron fixture treats absent `crons` as an empty list,
  retaining the exact expected cron assertion; failure is an assertion rather
  than a property-access exception.
- During drafting, the main Admin fixture was corrected to temporarily change
  existing local fixture roles and restore them, rather than deleting profiles
  with possible FK dependants. No assertion was removed, loosened or changed.
- Existing committed tests are untouched. No additional test correction approval
  was needed; no live LLM, hosted target or trigger was used.

## Review responses

None; testing stage before implementation/self-review.

## Notes for reflection

- **What worked:** Approved contracts and local shared fixtures allowed standalone maintenance tests without demo-kit provisioning or owner screens.
- **What needed guidance:** Human constraints specified literal titles, HTTP placement and explicit commit stops.
- **What to change in the agent or skill:** None established by this run.
