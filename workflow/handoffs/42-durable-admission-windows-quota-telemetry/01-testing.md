# Testing report

- **Agent:** testing
- **Issue:** #42 (T-11)
- **Spec IDs:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5; SEC-06.1, SEC-06.2, SEC-06.3
- **Date:** 2026-10-20
- **Branch:** feat/42-durable-admission-windows-quota-telemetry
- **Base commit:** 7c25a2f (upstream/master; coordinator gate evidence)
- **Status:** completed

## Summary

Authored 64 failing-first acceptance cases: 41 local-database integration cases and 23 policy/dispatch cases. Every new case fails at the explicit missing `src/server/llm/usage.ts` assertion. Test authoring is completed; implementation and merge readiness are not completed. Database reservations, privilege assertions and provider dispatch assertions have not executed beyond that missing-module guard.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-09.1 | completed | Tests define actual service_role success, new-instance/module-reload persistence, actor isolation and local/CI configuration namespaces. |
| SYS-09.2 | completed | Concurrent duplicate identity, last-capacity race, denial preserving operation counters and denial preserving global/feature counters. |
| SYS-09.3 | completed | Before/at/after UTC minute and Singapore midnight, old-window preservation, daily action/refresh/run continuity across minutes, default database clock despite skewed application Date. |
| SYS-09.5 | completed | Global daily capacity, fake failure/429 consumption without retry/refund, denied/unavailable admission fallback, returned/partial/zero tokens and unknown cost/tokens. |
| SEC-06.1 | completed | Concurrent actor action/minute/day, café refresh/day and Admin run/day caps; zero cases and midnight boundaries. |
| SEC-06.2 | completed | Global/feature minute, daily and per-operation bounds; duplicate IDs; already-authorized cache hit makes no provider attempt or reservation; ordinary roles denied after successful service_role positive control. |
| SEC-06.3 | completed | All 13 keys missing/invalid, explicit zero, accepted integer/environment-string limits, policy maxima, null policy and unavailable/denied admission. |

Statuses above describe authored cases and documented failing-first evidence, not successful implementation assertions. Detailed failure titles appear below.

## Files changed

- `tests/unit/usage/contracts.ts`: deferred-import module contract, request/RPC/provider types and explicit synthetic limits.
- `tests/unit/usage/policy.test.ts`: configuration, fallback/cache and telemetry cases.
- `tests/integration/usage/local.ts`: asynchronous public-schema RPC adapter backed by local Docker/psql, synthetic database clock and persisted Customer/Owner/Admin/café fixtures.
- `tests/integration/usage/admission.test.ts`: durable database admission, roles, races, scopes, windows, failed attempts and zero limits.
- `workflow/handoffs/42-durable-admission-windows-quota-telemetry/01-testing.md`: this report.

No dependency, configuration or package manifest changes. Previously declared Supabase/yaml packages were installed by the coordinator with frozen lockfile after the initial incomplete installation was detected.

## Interfaces defined by tests

The smallest server module is `src/server/llm/usage.ts`:

- `parseUsageLimits(input: Record<string, unknown>): Limits | null`: all 13 explicit policy keys; numeric or environment-string nonnegative integers normalize to numbers, missing/invalid/unsafe maxima return null.
- `createUsageAdmission({environment, limits, rpc, databaseClock?}): {reserve(request): Promise<{admitted: boolean}>}`. Environment is local/CI in the tests. Requests contain server-generated admission/operation identity, verified actor identity, authorized café identity when applicable, feature and action/refresh/run/provider_attempt event.
- `rpc(fn: string, args: Record<string, unknown>): Promise<{data: unknown; error: {message: string; code?: string} | null}>`: Supabase `.rpc(fn, args)`-shaped dependency. The local adapter accepts only unqualified function/named-argument identifiers and executes `SELECT * FROM public.<fn>(<named args>)` under the selected role/JWT claims. Its `data` is the table-returning function's rows, matching a table-returning Data API RPC response. Each invocation uses a fresh committed local connection, so the atomic reservation must occur inside the RPC. Production can use the configured Supabase URL/secret-key Data API; no direct application PostgreSQL credential or arbitrary-SQL admission dependency is required.
- `databaseClock?: () => Promise<string>`: trusted construction-time server dependency seam, never a request input. The fixture obtains its controlled timestamp by querying local PostgreSQL; omitted clock must use database time. Synthetic per-process windows preserve exact boundary offsets, isolate repeated runs and require no usage-table cleanup or counter reset.
- `dispatchWithAdmission({admission, request, provider, cached?})`: returns success/fallback and optional token/cost metadata, reserves immediately before the fake provider callback, handles denial/unavailability/failure with fallback, and has no automatic retry. `cached` represents an already-authorized eligible result from the feature boundary; this does not define cache eligibility, request authorization or story-specific fallback rendering.

Exact TypeScript signatures are in `contracts.ts`. No production function name or feature HTTP/client contract is invented; the RPC callable is explicitly in public, the Data API-exposed schema. Vitest mocks only the `server-only` poison marker, consistent with existing server tests.

## Fixture and permission limits

Only synthetic domain fixture insertion runs as postgres. Every admission RPC executes only a public-schema function under `SET LOCAL ROLE service_role`; the positive assertion must succeed. The ordinary-client cases run as anon or authenticated; authenticated carries the actual fixture Customer's JWT role/sub and subject setting. service_role carries no user subject. No fixture grants/revokes privileges or alters usage tables. Missing service_role grants must therefore fail the success case locally once implementation exists.

All providers are synthetic callbacks; no live LLM or hosted database is used. Permission/admission/concurrency assertions are currently unexecuted because their module does not exist. No implementation-level result is inferred from their existence.

## Checks run

All four test files were frozen before the final targeted run, followed sequentially by exact `bun run verify`. No test edit followed either launch. Full logs are retained below.

| Command | Result | Evidence |
| --- | --- | --- |
| bun run test tests/unit/usage tests/integration/usage | expected exit 1 | 64 failed / 64, all explicit missing usage-module assertion; 595 ms. `/private/tmp/homebrew-42-rpc-testing-targeted.log`. |
| bun run verify | expected exit 1 at tests | lint passed; next typegen and tsc passed; 64 failed / 368 passed / 432 total, 2 failed and 15 passed files; 183.96 seconds. `/private/tmp/homebrew-42-rpc-testing-verify.log`. |

Every existing test passed. All 64 new failures are expected missing-implementation failures, with no observed tooling failures in these final runs. Database privilege, named RPC invocation, atomic reservation, clock and provider assertions remain unexecuted behind the missing-module guard.

Verification stopped at tests: check:traceability, check:specs and build were not reached in this final pipeline. No browser case was authored for this foundation task, so test:e2e was not run. No build or full-verification success is claimed. Earlier diagnostic/snapshot runs have been superseded by these final frozen-file results.

## Every expected failing case

All rows below have the same observed failure: `Missing implementation: src/server/llm/usage.ts`. None reaches provider/database assertions. The full targeted output is `/private/tmp/homebrew-42-rpc-testing-targeted.log`.

| Failing test title (criterion included) | Observed reason |
| --- | --- |
| SYS-09.1, SYS-09.2: service_role admits successfully and a reconstructed instance retains consumed capacity | Missing usage module; assertions not reached. |
| SYS-09.1, SEC-06.2: anon cannot authorize admissions | Missing usage module; assertions not reached. |
| SYS-09.1, SEC-06.2: authenticated cannot authorize admissions | Missing usage module; assertions not reached. |
| SYS-09.2, SEC-06.2: duplicate admission identity authorizes exactly one concurrent dispatch | Missing usage module; assertions not reached. |
| SYS-09.2, SYS-09.5, SEC-06.2: daily last-capacity race admits exactly remaining capacity across instances | Missing usage module; assertions not reached. |
| SYS-09.2, SEC-06.2: denied multi-scope reservation leaves every other counter unchanged | Missing usage module; assertions not reached. |
| SYS-09.2, SEC-06.2: operation denial cannot spend remaining global or feature capacity | Missing usage module; assertions not reached. |
| SEC-06.1, SYS-09.3: AI_USER_ACTIONS_PER_DAY survives minute rollover and opens only at Singapore midnight | Missing usage module; assertions not reached. |
| SEC-06.1, SYS-09.3: AI_PREP_REFRESHES_PER_DAY survives minute rollover and opens only at Singapore midnight | Missing usage module; assertions not reached. |
| SEC-06.1, SYS-09.3: AI_MODERATION_RUNS_PER_DAY survives minute rollover and opens only at Singapore midnight | Missing usage module; assertions not reached. |
| SEC-06.1: concurrent AI_USER_ACTIONS_PER_MINUTE enforces actor or café scope | Missing usage module; assertions not reached. |
| SEC-06.1: concurrent AI_USER_ACTIONS_PER_DAY enforces actor or café scope | Missing usage module; assertions not reached. |
| SEC-06.1: concurrent AI_PREP_REFRESHES_PER_DAY enforces actor or café scope | Missing usage module; assertions not reached. |
| SEC-06.1: concurrent AI_MODERATION_RUNS_PER_DAY enforces actor or café scope | Missing usage module; assertions not reached. |
| SEC-06.2: AI_GLOBAL_CALLS_PER_MINUTE blocks excess provider attempts | Missing usage module; assertions not reached. |
| SEC-06.2: AI_BREW_FINDER_CALLS_PER_MINUTE blocks excess provider attempts | Missing usage module; assertions not reached. |
| SEC-06.2: AI_PREP_ADVISOR_CALLS_PER_MINUTE blocks excess provider attempts | Missing usage module; assertions not reached. |
| SEC-06.2: AI_MODERATION_CALLS_PER_MINUTE blocks excess provider attempts | Missing usage module; assertions not reached. |
| SEC-06.2: brew-finder operation has at most 2 independently admitted calls | Missing usage module; assertions not reached. |
| SEC-06.2: prep-advisor operation has at most 1 independently admitted calls | Missing usage module; assertions not reached. |
| SEC-06.2: moderation-assistant operation has at most 1 independently admitted calls | Missing usage module; assertions not reached. |
| SYS-09.3, SEC-06.1: fixed minute half-open boundary has independent counters before/at/after | Missing usage module; assertions not reached. |
| SYS-09.3, SYS-09.5, SEC-06.2: Singapore midnight creates new daily capacity and preserves the earlier day | Missing usage module; assertions not reached. |
| SYS-09.1, SYS-09.3: default membership uses database time despite an incorrect app clock | Missing usage module; assertions not reached. |
| SYS-09.1: local and CI configurations use independent persisted namespaces | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.2: fake 429 falls back without retry or refund | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.2: fake timeout falls back without retry or refund | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.2: fake transport falls back without retry or refund | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.2: fake invalid output falls back without retry or refund | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_GLOBAL_CALLS_PER_MINUTE denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_BREW_FINDER_CALLS_PER_MINUTE denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_PREP_ADVISOR_CALLS_PER_MINUTE denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_MODERATION_CALLS_PER_MINUTE denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_BREW_FINDER_CALLS_PER_ACTION denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_PREP_ADVISOR_CALLS_PER_ACTION denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_MODERATION_CALLS_PER_ACTION denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_USER_ACTIONS_PER_MINUTE denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_USER_ACTIONS_PER_DAY denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_PREP_REFRESHES_PER_DAY denies its relevant work | Missing usage module; assertions not reached. |
| SEC-06.3: zero AI_MODERATION_RUNS_PER_DAY denies its relevant work | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.3: zero daily cap prevents a provider call | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.2: an authorized cache hit makes no reservation or provider attempt | Missing usage module; assertions not reached. |
| SEC-06.3: all explicitly configured nonnegative integers, including zero, validate | Missing usage module; assertions not reached. |
| SEC-06.3: AI_GLOBAL_CALLS_PER_MINUTE missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_GLOBAL_CALLS_PER_DAY missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_USER_ACTIONS_PER_MINUTE missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_USER_ACTIONS_PER_DAY missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_BREW_FINDER_CALLS_PER_MINUTE missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_PREP_ADVISOR_CALLS_PER_MINUTE missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_MODERATION_CALLS_PER_MINUTE missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_BREW_FINDER_CALLS_PER_ACTION missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_PREP_ADVISOR_CALLS_PER_ACTION missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_MODERATION_CALLS_PER_ACTION missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_PREP_REFRESHES_PER_DAY missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_MODERATION_RUNS_PER_DAY missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: AI_MODERATION_REVIEWS_PER_CALL missing or invalid cannot remove the limit | Missing usage module; assertions not reached. |
| SEC-06.3: rejects unsafe maximum AI_BREW_FINDER_CALLS_PER_ACTION=3 | Missing usage module; assertions not reached. |
| SEC-06.3: rejects unsafe maximum AI_PREP_ADVISOR_CALLS_PER_ACTION=2 | Missing usage module; assertions not reached. |
| SEC-06.3: rejects unsafe maximum AI_MODERATION_CALLS_PER_ACTION=2 | Missing usage module; assertions not reached. |
| SEC-06.3: rejects unsafe maximum AI_MODERATION_REVIEWS_PER_CALL=21 | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.3: missing policy prevents dispatch with an authorized fallback | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.3: denied/unavailable admission (false) dispatches nothing | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.3: denied/unavailable admission (unavailable) dispatches nothing | Missing usage module; assertions not reached. |
| SYS-09.5, SEC-06.3: returned tokens survive and absent tokens/cost remain unknown | Missing usage module; assertions not reached. |

## Open issues for the next step

The usage module, durable SQL operations and intentional service_role grants do not exist yet. No test has established successful admission, denied ordinary-client access, dispatch safety or measured quota behavior. The pair remains unready to merge. No behavioral/spec decision gap was identified within the assigned foundation criteria. Story endpoint authorization/cache eligibility/fallback UI and unrelated AI criteria are outside this task's assertions.

## Suspicious content found

None.

## Human corrections

Human Gate 2 correction: replace the arbitrary SQL admission dependency with Supabase `.rpc(fn, args)` because TECHNICAL-SPEC supplies `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` for the Data API, without a direct app Postgres credential. The revised fixture calls table-returning functions only in public via named arguments under the same roles/JWT contexts. The human explicitly authorized updating this uncommitted `01-testing.md` in place instead of creating a new numbered report. Domain fixture setup and clock queries remain local; the controlled clock is a construction-time trusted server option only.

The human required actual admission operations as service_role because core migrations revoke its privileges. Tests include a service_role positive control and ordinary-role denials, without fixture grants. Coordinator review identified repeat-run clock isolation and authenticated JWT-context validity; fixtures now isolate synthetic windows and attach an actual Customer subject only to authenticated calls.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No numbered reviewer report read. |

## Notes for reflection

- **What worked:** deferred imports expose all 64 expected failures while permitting lint/typecheck; real service-role queries preserve grant failures.
- **What needed guidance:** per-process window isolation and authenticated JWT fixture context were clarified during coordinator gate inspection.
- **What to change in the agent or skill:** document that shared local database verification runs must be serialized and that role-denial fixtures need actual JWT subjects.
