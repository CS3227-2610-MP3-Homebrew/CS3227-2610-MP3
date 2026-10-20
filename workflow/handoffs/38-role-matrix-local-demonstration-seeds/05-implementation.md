# Implementation report

- **Agent:** implementation
- **Issue:** #39 / T-08, paired with #38 / T-07; response to review round 1
- **Spec IDs:** SYS-06.3, SYS-06.4, SYS-12.2, SYS-12.3
- **Date:** 2026-10-20
- **Branch:** feat/38-role-matrix-local-demonstration-seeds
- **Base commit:** 0ec072452fd532eb388977baeb7a926c630bf4f7 (`origin/master`)
- **Response baseline HEAD:** 1302b5fbd5c896a3951f58fb3459e7537925d3b9
- **Status:** completed

## Summary

Responded to R1 and R2 from `03-reviewer.md` using accepted human configuration
verification and the committed testing follow-up. No application defect was
found by this response run, and no application/configuration/test change was
needed. This run adds only this report. Independent reviewer acceptance of the
responses remains pending; this is not a passing round-2 review or a PLAN update.

R1 now has the non-secret human verification explicitly accepted by the
reviewer's fix direction. On 2026-10-20 (Asia/Singapore), the coordinator asked:
"Have you now checked that Confirm email is disabled in both homebrew-dev and
homebrew-prod under Supabase Authentication → Email provider?" The human answered
exactly: **"Verified disabled in both projects"**. The coordinator supplied that
response during this run. This establishes the effective settings by human
inspection, not by agent access or an automated configuration consumer.

R2's evidence gap is addressed by 40 committed tests in
`tests/integration/roles-seeds/mutable-writes.test.ts`, described in
`04-testing.md`. A fresh targeted run passes all 40. A fresh exact
`bun run verify` passes all 368 tests and every subsequent check. Standalone
`bun run db:check` also passes. Code repair cycles used: **0**.

The initial targeted invocation failed all 40 cases during fixture catalogue
setup because Docker's local socket was absent; no policy assertion was
reached. The first `db:start` attempt confirmed the same infrastructure problem.
Normal escalated Docker Desktop launch followed by local `db:start` restored
the stack without configuration changes. The successful checks below followed
that recovery. No application or test change was used to resolve the failure.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-06.3 | completed | Existing role/ownership/protected-state cases and all 40 new mutable-field cases pass in the final 368-case verification. Each new case proves the real owner can change the same permitted field before asserting foreign-actor denial. |
| SYS-06.4 | completed | Actual local Auth/signup/seed and hosted-delivery exclusion cases pass. The human explicitly verified Confirm email disabled in both `homebrew-dev` and `homebrew-prod` at the hosted Email provider settings, as quoted above. The application declarations are not treated as effective hosted-setting evidence. |
| SYS-12.2 | completed | New cases cover menu name and opening time for main→kit A, kit A→main, kit A→kit B and kit B→kit A, each for two Customers, two owners and an Admin. Mutation results and stored values establish no foreign change. Existing domain read/write and server workspace-prerequisite cases pass. Later AI source/cache consumers remain outside this foundation's implemented surface. |
| SYS-12.3 | completed | Existing protected-profile signup/main-workspace and workspace/role-reassignment cases pass in the final verification; application/migration code remains unchanged from the reviewed implementation. |
| T-08: full local matrix/account/seed and catalogue checks | completed | Targeted 40/40 pass, full 368/368 pass, standalone catalogue check passes. |
| T-08: exact verification and hosted credential exclusion | completed | Exact `bun run verify` exits 0 through lint, typecheck, tests, traceability, specs, build and both isolation stages. Existing local-only seed and hosted-artifact cases pass; this response adds no credentials or runtime files. |

## Files changed

- `workflow/handoffs/38-role-matrix-local-demonstration-seeds/05-implementation.md`: this review-response report only.

Listed `01-testing.md`, `02-implementation.md`, `03-reviewer.md` and
`04-testing.md` before choosing the next report number. Earlier reports are
preserved. The response baseline was clean. The scoped comparison from reviewed
implementation commit `941fa025839b159eb4beb6098688e158c694d95e` to response HEAD
shows no changes to `src/`, `supabase/`, `package.json`, `bun.lock` or
`vitest.config.mts`. The testing-owned additions were already committed in
`1302b5f`; this agent did not edit them. No specs, PLAN, docs, workflow scripts,
dependencies or configuration were changed.

## Checks run

Successful checks below ran on the final unchanged application/test code.
Infrastructure failure history is recorded in Summary rather than treated as
an application acceptance result.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:start` | passed with escalation after normal Docker launch | Local Supabase started successfully; generated credentials omitted. |
| `bun run test tests/integration/roles-seeds/mutable-writes.test.ts` | passed with escalation | 1 file, 40/40 tests, 36.86s. |
| `bun run verify` | passed with escalation, exit 0 | Lint/typecheck passed; 15 files, 368/368 tests, 195.29s; traceability passed (9 done tasks); spec check passed (0 warnings); source isolation passed; Next.js 16.4.2 webpack production build passed with Cache Components and Partial Prefetching enabled; 35 client artifacts passed isolation. Every chained stage was reached. |
| `bun run db:check` | passed with escalation | Every application table has RLS. Run after full verification completed. |
| Git baseline/scope inspection and `git diff --check` | passed | Confirmed branch, full HEAD, approved merge base, clean starting tree and no runtime/config changes since the reviewed implementation. No whitespace diagnostics. |

The full run was uninterrupted; database/reset operations were serialized.
All commands have finished and local Supabase remains running. No hosted
database/settings, live LLM or `.env*` file was accessed by the agent.
`bun run test:e2e` was not run: this response changes no browser surface and the
added cases are SQL integration cases. The existing non-failing Vite path-plugin
notice is unchanged and is not acceptance evidence.

## Open issues for the next step

- Human review/commit of this report and independent reviewer assessment of
  these responses remain pending. No commit, push, PR or deployment operation
  was performed; PLAN statuses were not changed.
- Hosted confirmation evidence is the quoted human check on 2026-10-20. The
  application declaration/validator does not configure or monitor hosted Auth;
  hosted settings can drift. No automated enforcement is claimed.
- Actual AI source/cache route consumption, session resolution, demo-kit
  creation, maintenance provisioning and reserved story lifecycles remain with
  their existing owning tasks. This report does not claim those integrations.
- No remaining implementation blocker was found for this assigned response;
  no database/reset/test command remains in flight.

## Suspicious content found

None.

## Human corrections

The human initially reported hosted confirmation settings as "Not yet verified";
R1 remained open during independent R2 work. The later explicit verification
"Verified disabled in both projects" supplied the missing prerequisite for R1.
The response records that human evidence without accessing hosted settings or
substituting synthetic application declarations for effective configuration.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| `03-reviewer.md`, round 1 | R1 — authoritative dev/prod confirmation-off evidence | Fixed by accepted human evidence; no code change | The human explicitly verified Confirm email disabled in both named hosted projects at Authentication → Email provider on 2026-10-20, as quoted in Summary. The review fix direction accepts human verification. No agent hosted inspection or automated enforcement is claimed. |
| `03-reviewer.md`, round 1 | R2 — cross-workspace updates used an ungranted column | Fixed by committed testing-owned evidence; no application change | `mutable-writes.test.ts:6` selects menu/hour fields; lines 10–14 enumerate all 40 role/direction combinations; lines 43–46 require a different value; lines 48–58 execute the real update and independently observe stored data; lines 63–71 prove owner success, calibrate the denial assertion and check foreign denial. These are the fields granted at migration lines 64–65 and guarded at lines 73–78. Fresh targeted 40/40 and full 368/368 checks pass. Existing protected-column/ownership/delete cases remain unchanged. |

## Notes for reflection

- **What worked:** Testing-owned different-value controls distinguish row policy
  denial from column-privilege denial. Accepted human inspection supplies the
  hosted-setting evidence without exceeding the agent's local-only boundary.
- **What needed guidance:** The first implementation report overstated
  SYS-06.4 completion while acknowledging absent hosted evidence. This response
  separates declarations, human-verified effective settings and automation.
- **What to change in the agent or skill:** Configuration claims should identify
  their effective source; negative permission cases should pair the same valid
  operation with a successful authorized control.
