# Implementation report

- **Agent:** implementation (Codex, coordinating session)
- **Issue:** #57 / T-27, paired with #56 / T-26
- **Spec IDs:** SYS-13.1–SYS-13.8; SEC-10.4, SEC-10.5
- **Date:** 2026-10-22
- **Branch:** feat/56-daily-maintenance
- **Base commit:** 8987018d5f30828404728e371d08e82114826ff6 (`upstream/master`); reviewed HEAD 39f259a
- **Status:** completed

## Summary

Single-agent mode: implemented maintenance, reviewed the diff against the approved
base, and updated the guides. The human's testing commit `2202e78` is present and
upstream/master is an ancestor of HEAD. The working tree was clean at stage entry.
Migration `20261022000005_daily_maintenance.sql` sorts after master's latest
`20261022000004_customer_reviews.sql`; no existing migration was edited.

Final frozen-tree verification passed: all 1,175 tests across 67 files, lint,
typecheck, traceability for 46 done tasks, spec validation, production build and
source/135-client-artifact isolation checks passed. Both T-26/T-27 Status lines
are done. The maintenance route is dynamic/server-rendered on demand.

Three focused implementation repair cycles fixed reservation release, an
unsupported explicit Next.js runtime export, and main Admin email normalization.
The installed guide confirms Cache Components uses the default Node.js runtime.
The earlier full run that first reached build passed 1,174 tests but failed on
that route export; the final run above supersedes it. Final targeted checks
pass 116 tests across maintenance, supplementary internal regressions and existing
delivery checks. Close-out also exposed a traceability-tokenizer issue; the
human's pre-approved grouping-only correction moves two intact configuration
tests before regex-heavy tests. No existing assertion, test title, fixture,
test configuration, spec, agent or skill file changed. No dependency was added.
No independent reviewer or security-reviewer process was invoked in this
human-selected single-agent mode.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-13.1 | completed | Main-Admin prepare/publication serializes under Postgres advisory locks; existing main Admin is a no-op, existing configured email is a conflict, and only a newly marked confirmed Auth identity is published. T-26 concurrent creation, cross-role/workspace conflicts and changed-password/email cases pass. |
| SYS-13.2 | completed | Transactional main showcase owner/café/menu/hours publication; 192-bit random unpublished password goes only to Auth. Strengthened showcase pre-state/creation/non-vacuous credential case passes. |
| SYS-13.3 | completed | `src/server/maintenance/index.ts:23` hashes equal-size buffers and calls `timingSafeEqual` before work; route and exact-path proxy bypass preserve lazy initialization. Five bearer cases and missing-config case pass. |
| SYS-13.4 | completed | `vercel.json` UTC daily cron plus one environment-bound post-success production call in `.github/workflows/deploy-prod.yml:60`. Static trigger cases and existing delivery checks pass; no hosted execution claimed. |
| SYS-13.5 | completed | Sequential awaited cleanup/main-admin/showcase steps with isolated catch/validation; repeated provisioning is a no-op. Consecutive targeted runs pass after lease-release repair; final-code targeted checks also pass after the runtime-export fix. |
| SYS-13.6 | completed | Shared private/no-store JSON with requestId and projected validated step/outcome/count only. Exact response-shape test and malformed-internal-outcome supplementary test pass. |
| SYS-13.7 | completed | Missing/invalid main Admin configuration yields failure; other steps remain independent. Both missing-setting cases and continuation case pass. |
| SYS-13.8 | completed | Only main provisioning writes; no user/domain deletion, password update/reset, kit provisioning or model operation. Real T-16 retention invocation, kit/domain snapshots and no-generation static checks pass. |
| SEC-10.4 | completed | Constant-time bearer admission, service-only RPCs/RLS-protected reservations, environment-scoped server secret; missing/wrong bearer has no work. E-17 and supplementary lazy route test pass. |
| SEC-10.5 | completed | Response is an allow-listed projection; Auth/RPC failures are swallowed without logging values; passwords never enter publication RPCs or application tables. E-18 response/console canaries and hidden-owner credential tests pass. |

The criteria rows record the targeted/static evidence; the final full verify
result below supplies the overall implementation gate.

## Files changed

- `src/server/maintenance/index.ts`: server-only bearer admission, bounded response
  projection, independent ordered steps and Auth/RPC provisioning.
- `src/app/api/internal/maintenance/route.ts`: lazy runtime configuration and
  privileged-client composition; direct T-16 `createAiState().cleanup()` call.
- `src/proxy.ts`: exact maintenance path bypasses cookie-session refresh.
- `supabase/migrations/20261022000005_daily_maintenance.sql`: private reservation
  table and two service-only empty-search-path provisioning RPCs. No password
  storage, account reset/delete, kit/domain cleanup or ordinary-client grants.
- `vercel.json`: daily production maintenance cron at `0 19 * * *` UTC.
- `.github/workflows/deploy-prod.yml`: one successful-deploy maintenance GET to
  the specified canonical production domain, bearer via stdin, no retry, safe
  count-only outcome inspection. No new workflow file was created.
- `tests/unit/maintenance/handler.test.ts`, `route.test.ts`: five supplementary
  internal regression cases, without criterion IDs in their titles.
- `tests/integration/maintenance/configuration.test.ts`: pre-approved grouping-only
  correction; two intact SYS-13.4 tests moved before regex-heavy tests. No
  assertion/title changed; the human commits this correction separately.
- `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `README.md`: implemented behavior,
  configuration, trigger wiring, recovery limits and code-to-claim links.
- This report and only the T-26/T-27 Status lines in `workflow/PLAN.md` for close-out.

## Self-review

**Overall:** pass

Final frozen-tree verification passes and all assigned criteria have evidence.
No open P0/P1 finding remains in this self-reviewed scope.

Scope: base-to-working-tree code/configuration/migration changes, with the committed
T-26 tests read as evidence. This applies reviewer criteria and the security
reviewer's Zero Trust/LLM baseline in the coordinating session; it is not an
independent review. No separate reviewer/security report is represented as present.

### Findings and fixes

| Finding | Priority | Evidence and fix | Validation |
| --- | --- | --- | --- |
| SR-01 | P2 | Successful main Admin publication initially left the two-minute reservation active. A repeated test run removed its own new Admin fixture, then could not recreate one immediately. Publication now sets `lease_until=null` in the same transaction as inserting the Admin profile (`20261022000005_daily_maintenance.sql:78`). | One initial repeat failed at `provision.test.ts:36` (zero Admin rows). One focused repair followed by local reset and two consecutive 115/115 targeted runs; no testing-owned file changed. |
| SR-02 | P2 | A draft deploy call used the individual deployment URL, which does not establish accessibility under the specified Standard Deployment Protection setup. Final code retains the existing deploy step and calls the contract's canonical production domain. | Production trigger and existing delivery tests pass; hosted reachability remains human-owned. |
| SR-03 | P2 | A draft curl header placed the bearer in external process arguments. Final workflow uses shell builtin `printf` feeding `curl --header @-` through stdin, with no verbose/trace/retry option. | Static trigger tests and shell syntax validation pass; no workflow command was executed. |
| SR-04 | P2 | First full verify passed all tests, then webpack rejected the explicit `runtime = "nodejs"` route export with Cache Components. Removed the export as required by the installed runtime guide; Node.js is the default. | Second focused repair; affected 115/115 tests and full 1,174/1,174 verify pass on final code. Build lists maintenance as a dynamic route. |
| SR-05 | P2 | Once T-26/T-27 were marked done, the traceability tokenizer missed SYS-13.4 titles because quote characters inside earlier regex literals desynchronized its string scanner. Applied the human's pre-approved grouping-only correction: moved the two complete SYS-13.4 tests before regex-heavy tests. No assertion or title changed, and no checker was modified. | Byte-for-byte whole-block comparison confirms movement only. Targeted/full checks and traceability for 46 done tasks pass; the separate correction commit is human-owned. |
| SR-06 | P2 | Main admission compared configured emails case-insensitively but publication matched the stored reservation email exactly. Normalize the validated main Admin email to lowercase before both reservation and Auth creation, avoiding inconsistent canonicalization. | Third focused implementation repair; new internal canonical-email regression, all 116 targeted tests and final full verify pass. |

No open P0/P1 finding was identified in this scope. Remaining hosted/recovery
coverage limits are stated below rather than treated as completed runtime checks.

### Security baseline coverage

- **Identity/authorization and least privilege:** The exact endpoint bypasses
  session refresh and independently checks the environment bearer before any
  cleanup/configuration/privileged client. Hashing ensures equal-length buffers
  for `timingSafeEqual`. Ordinary clients have neither table access nor RPC
  execute grants. A local PostgreSQL privilege query confirms anon/authenticated
  cannot execute either RPC or read the table, while service_role can execute
  both RPCs but cannot read the table directly. Both security-definer functions use an empty search path and
  main workspace selected from database state, never from request data.
- **Role/workspace separation:** New main Admin publication requires the
  reservation token in privileged Auth app metadata, matching confirmed identity,
  unexpired/fenced claim, no existing profile and no existing main Admin. Existing
  main Admin/account cases perform no account/role/password writes. Kit rows are
  never publication targets. No role selection or account-management HTTP API
  was added.
- **Untrusted inputs/outputs:** Zod validates configuration and RPC outcomes.
  The HTTP route accepts no caller-supplied target, role, email, SQL or URL.
  SQL uses typed parameters and no dynamic query execution. Responses project
  fixed step names plus validated outcome/count, using shared private/no-store
  helpers. Unsupported authorized methods execute no work. No HTML sink exists.
- **Races/replay:** Main admission and both publications serialize under an
  advisory transaction lock. Main Auth creation has a two-minute fenced claim;
  losing calls do not create identities. Showcase shares one private identity
  namespace and publishes owner/café/menu/hours in one transaction, reconciling
  its own marked Auth identity. Repeat successes do not modify existing records.
- **Secrets/telemetry (E-17/E-18):** Only environment variable names appear in
  committed code/docs. No raw Auth/RPC exception is logged or serialized.
  Passwords go to Auth Admin creation only, never SQL publication/reservation
  arguments or application storage. Count-only response/exception canaries and
  hidden-owner credential checks pass. No `.env*` file was read, printed or edited.
- **Retention and AI:** Route imports T-16's repository and calls only `cleanup()`.
  It supplies a denied admission stub and empty eligibility callback because
  cleanup uses neither. No operation/transport/prompt is invoked; no model data
  enters authorization, roles, SQL or output. Existing T-16 tests retain ownership
  of retention deadlines and active counter/reservation preservation. Prompt
  injection, generated-output rendering, tools and model overreliance have no
  new reachable surface in this feature.
- **Delivery/supply chain:** No dependency/action was added or updated. Existing
  environment approval, pinned actions, minimal permissions and deploy sequence
  remain intact; one no-retry call follows success. Secret stays environment-bound
  and out of external process arguments. Shell commands were syntax-checked only.

## Documentation and claim-to-evidence

User Guide section 1.5 was extended in place; its existing contents entry remains
valid. Developer Guide adds Daily maintenance to its contents, updates the
existing workflow inventory row and stale cleanup/planned-maintenance language,
and records internal reuse without changing MP2 totals. README adds the product
summary and guide link. Reflections, logs and product-site pages are untouched.

| Claim | Evidence |
| --- | --- |
| User Guide 1.5: ordinary main Customers can browse approved Homebrew Showcase with menu/hours after maintenance. | Migration lines 83–89; strengthened T-26 showcase case; existing main workspace catalogue/RLS eligibility. |
| User Guide 1.5: showcase owner credentials are not published. | `src/server/maintenance/index.ts:54` Auth-only random password; handler lines 29–38 projects counts; T-26 hidden-password check. |
| User Guide 1.5: use demo kits across roles; main applications may remain pending indefinitely. | Existing demo-kit creation flow and kit contracts; maintenance migration inserts only its own main showcase and never updates pending applications. |
| User Guide 1.5: existing accounts/passwords and kits are preserved. | Main no-op/conflict SQL branches, no Auth update/delete API capability; T-26 changed-password, conflict and whole-domain/kit snapshot cases. |
| Developer Guide: bearer/private responses, ordered independent outcomes and count semantics. | Feature lines 17–38; route lines 27–36; T-26 HTTP cases and supplementary internal projection tests. Cleanup count is completed invocations, because T-16 returns void. |
| Developer Guide: service-only reservations, fencing, protected identity markers and recovery limits. | Migration lines 2–10, 15–48, 52–96; feature lines 42–67. Lost main-Admin creation/publication is documented as conflict, not automatic adoption or deletion. |
| Developer Guide/README: cron and one post-deploy production call, hosted execution unverified. | `vercel.json`; production workflow lines 60–68; T-26 configuration tests. No deployment or hosted probe occurred. |
| Developer Guide: no model call or domain/kit cleanup. | Route calls `state.cleanup()` only; provisioning RPCs perform only scoped insertion/reservation updates, no domain delete/reset; T-26 no-generation/retention/kit cases. |

Human screenshots to capture after an approved deployment: main Customer Browse
cafés and Homebrew Showcase menu/hours; the approved production job and sanitized
three-step outcomes; production cron settings. None was fabricated or captured
from a hosted target in this run.

## Checks run

| Command / inspection | Result | Evidence |
| --- | --- | --- |
| `git merge-base --is-ancestor upstream/master HEAD`; commit/scope inspection | passed | Approved base is merged, human testing commit exists, clean tree at start. |
| `bun run db:reset` | passed | Local migration/reset succeeds; generated credentials omitted. |
| `bun run test tests/integration/maintenance tests/unit/maintenance tests/unit/delivery` | passed | Final code/grouping: six files, 116 tests, 21.71s. Earlier immediate consecutive runs after lease release also passed (20.78s and 21.54s), without reset between them. |
| `bun run verify` | passed, exit 0 | Frozen final tree: lint/typecheck, 67 files / 1,175 tests (425.09s test phase), traceability (46 done tasks), spec check (zero warnings), production webpack build, and source/135-client-artifact isolation pass. Includes final email normalization, corrected grouping and both tasks done. |
| `bun run lint`; `bun run typecheck` | passed | Standalone runs after final email normalization also exited 0. |
| Grouping-only byte comparison against HEAD | passed | Complete SYS-13.4 test blocks moved unchanged; no assertion or title changes. |
| `bun run check:specs` | passed | Updated guides/links/workflow inventory, zero warnings. |
| `bun run check:traceability` after close-out | passed | 46 done tasks; every listed criterion has a recognized executable test title. |
| Production workflow `bash -n` via parsed run steps | passed | Shell syntax only; no curl, deploy, hosted migration or trigger executed. |
| Local PostgreSQL `has_function_privilege` / `has_table_privilege` query | passed, escalated approval after Docker socket denial | anon/authenticated: both RPCs false, table SELECT false; service_role: both RPCs true, table SELECT false. No credential or domain content selected. |
| `git diff --check`; committed-test diff | passed | No whitespace issue; only the pre-approved grouping diff in `configuration.test.ts`. Other committed T-26 tests/fixtures and `01-testing.md` are untouched. |

No browser UI was added or changed. The proxy exception is confined to the
maintenance API; this pair uses HTTP/local-database/static checks and does not
run `bun run test:e2e`. No live provider, hosted database, deployment, Vercel
command, hosted cron or GitHub workflow was executed. No network or git write
command was needed during implementation. The local Docker privilege inspection
needed escalation because the sandbox denied its Docker socket access; it was
approved and completed against local Postgres only.

## Open issues for the next step

No implementation or close-out blocker remains; final human commits are outstanding.
Auth creation and profile publication are separate service operations: an interrupted main Admin creation/publication
can leave a roleless identity whose email must report conflict on later runs.
The implementation never promotes, resets or deletes that existing account.
Showcase can reconcile its own marked unpublished identity. These recovery
branches were inspected statically; no production failure recovery is claimed.
Hosted schedule/production-domain reachability, environment secrets and deployment
approval/execution remain human-owned. Final commits have not been made.

## Suspicious content found

None.

## Human corrections

- The human confirmed that tests are committed and upstream/master is merged,
  requested implementation through final commits, and required new migration
  versions to sort after master's latest. Those prerequisites were checked;
  only `20261022000005_daily_maintenance.sql` was added.
- Earlier human test revisions remain in committed `01-testing.md`, which is
  untouched. At close-out, applied the human's explicit pre-approval for grouping
  corrections that change no assertion: moved both intact SYS-13.4 configuration
  tests above regex-heavy tests because the traceability tokenizer otherwise
  misses their literal titles. All assertions and titles remain byte-for-byte
  unchanged; case counts are 25 acceptance plus five supplementary internal
  cases. The human commits the grouping correction separately. No test was
  skipped, removed or weakened; no checker was changed. Supplementary internal
  tests have no criterion-bearing titles.
- Single-agent mode, shared HTTP primitives, no live/hosted execution, synthetic
  test credentials and the final human commit stop were preserved.

## Review responses

None. Self-review evidence is above; no independent review was requested.

## Final human commits

All use trailer `Agent: Codex`. No commit, push, tag or PR action was performed.

1. Separate `test(SYS-13)` grouping correction: only
   `tests/integration/maintenance/configuration.test.ts`.
2. `feat(SYS-13)` implementation: application/proxy code, migration, production
   workflow/cron configuration, supplementary unit tests and this report.
3. `docs(SYS-13)`: User Guide, Developer Guide and README.
4. Status-line close-out: only the two T-26/T-27 Status lines in PLAN.md.

## Notes for reflection

- **What worked:** T-26's explicit seams and local fixtures drove implementation without changing acceptance assertions; repeated execution found a durable-state lifecycle bug.
- **What needed guidance:** Human clarified the two test-strengthening gaps before commit and migration ordering before implementation.
- **What to change in the agent or skill:** Repeated local provisioning checks are useful evidence for reservation release, beyond a clean-reset run.
