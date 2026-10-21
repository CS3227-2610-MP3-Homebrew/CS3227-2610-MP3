# Testing report

- **Agent:** testing
- **Issue:** #46 / T-15
- **Spec IDs:** SYS-05.3; SYS-09.4; SYS-10.1, SYS-10.2, SYS-10.3; SEC-07.1, SEC-07.2, SEC-09.1, SEC-09.2
- **Date:** 2026-10-21
- **Branch:** feat/46-ai-caches-catalogue-eligibility-accounting-audit
- **Base commit:** 0c2ecbd74f37ead47b160b87aa11b4f0574349df (coordinating session's approved preflight evidence; no Git command run by this agent)
- **Status:** incomplete

## Summary

Authored 33 spec-derived shared-state cases: five canonical-identity cases, fifteen cache cases, seven accounting/audit cases, three permissions/retention cases, two direct session-RLS cases and one no-use-cache inspection. Shared test authoring is complete; full assigned coverage is incomplete because the merged application has no customer catalogue page or AI feature HTTP adapter on which to prove streamed catalogue reads or personalized HTTP/shared-cache behavior. No story UI or lifecycle interface was invented.

Final verification passes lint/typecheck and stops at the expected missing-implementation tests. The new state/identity modules do not exist. The failing-first result establishes missing interfaces only: assertions after those guards, including new SQL fixture operations, are not executed evidence of correctness and will require execution after implementation. No live provider, hosted database, secret file, Git/gh command, commit, PR or deployment was used.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-05.3 | incomplete | Passing no-use-cache AST inspection plus two direct local session-RLS cafe/menu/hour eligibility regressions. Cache-hit and mid-generation eligibility cases authored with missing-module failures. Catalogue page/Suspense streaming evidence remains unavailable. |
| SYS-09.4 | completed | Authored cache-hit zero-provider-reservation, one reservation per success/429/failure attempt, distinguishable refresh admission and denied refresh cases. Expected missing ai-state module failures; no extra charging-policy or retry policy introduced. |
| SYS-10.1 | completed | Authored exact canonical/hash preimages, durable envelope recreation, Brew 10-minute half-open TTL, Prep Singapore midnight, actor/environment/cafe/day/model/contract/source invalidation, and successful refresh replacement. Expected missing-module failures. |
| SYS-10.2 | completed | Authored current RLS eligibility and same-actor role-change checks, Prep ownership, foreign/invalid provider output rejection and persisted-payload corruption positive-control/read-miss case. Expected missing ai-state module failures. |
| SYS-10.3 | completed | Authored actor/feature/time/outcome audit, cache/fallback/provider events and ordinary-role infrastructure SELECT/INSERT/UPDATE/DELETE denial with privileged fixture positive controls. Separate domain confirmation/audit creation is outside this shared task. |
| SEC-07.1 | completed | Authored cache scope/version/source/expiry/eligibility checks and SQL-role infrastructure denial. Expected missing-module failures. |
| SEC-07.2 | incomplete | Failed/denied/invalid refresh preserves exact earlier envelope and returns fallback; later ownership/expiry checked; invalid stored/provider data rejected. No-use-cache inspection passes. Personalized HTTP response/public-cache isolation cannot yet be exercised without feature HTTP adapters. |
| SEC-09.1 | completed | Authored success/cache/denial/failure events, synthetic query/provider-error canaries across AI audit, returned error/result and console log/error/warn capture, and unavailable audit/admission fail-closed dispatch. Expected missing ai-state module failures. |
| SEC-09.2 | completed | Authored clock-controlled cache deletion next daily run, 30-day audit and 7-day closed-window boundaries, active counter/operation/admission snapshots, duplicate-admission rejection and preserved operation bound. Synthetic moderation table preservation is a limited cleanup fixture check, not evidence of implemented Admin audit persistence. |

“Completed” rows describe test authoring, not passing implementation behavior. Overall status remains incomplete for the explicit integration coverage gaps above. The pair is not ready to merge.

## Files changed

- `tests/unit/ai-state/contracts.ts`: minimal server-module interfaces and missing-implementation guards.
- `tests/unit/ai-state/identity.test.ts`: five canonical JSON/digest/source identity cases.
- `tests/unit/ai-state/catalogue-policy.test.ts`: AST inspection for use-cache directives in source files, including function scopes; excludes symlinks and secret files.
- `tests/integration/ai-state/fixtures.ts`: synthetic Brew/Prep snapshots, local database clock normalized to RFC3339 Z, existing local RPC/admission adapters, RLS eligibility projection and privileged fixture-only SQL introspection.
- `tests/integration/ai-state/cache.test.ts`: fifteen scope/expiry/refresh/validation cases.
- `tests/integration/ai-state/accounting-audit.test.ts`: seven accounting/audit/fail-closed cases.
- `tests/integration/ai-state/permissions-retention.test.ts`: three role-denial and retention cases.
- `tests/integration/ai-state/catalogue-rls.test.ts`: two independent local RLS eligibility regressions.
- This report.

No dependencies, package changes, test configuration files, implementation files, migrations, specifications or PLAN edits.

## Interfaces defined by tests

The exact TypeScript signatures and context/envelope shapes are in `tests/unit/ai-state/contracts.ts`:

| Server module | Export/signature |
| --- | --- |
| `src/server/llm/cache-identity.ts` | `canonicalJson(value: unknown): string`; `digest(value: unknown): string`; `brewSourceRevision(source: Record<string, unknown>): string`; `cacheKey(preimage: Record<string, unknown>): string` |
| `src/server/llm/ai-state.ts` | `createAiState({environment, rpc, admission, databaseClock, eligibleCafeIds}): State` |
| Returned State | `readCache(context): Promise<Envelope|null>`; `writeCache(context, result: unknown): Promise<boolean>`; `invoke(context, {refresh?, provider: () => Promise<unknown>}): Promise<{outcome: "cache"|"success"|"fallback", data?: Result}>`; `cleanup(): Promise<void>` |

Context is server-internal: operation/actor identity, optional cafe identity, cache feature, authorized scope, input/source snapshots and model/contract identity preimages. Feature values in cache contexts are `brew_finder`/`prep_advisor`; the existing usage admission API uses `brew-finder`/`prep-advisor`. Envelope is the strict integration-spec version-1 payload. Provider callbacks return candidate feature results, not live transport envelopes; transport belongs to its own task.

Construction uses the existing merged UsageRpc and UsageAdmission contracts. RPC fixtures execute only public-schema table-returning RPCs under local PostgreSQL service_role. No arbitrary SQL production API is introduced. SQL helpers are privileged test fixtures only. The construction-only database clock reads a fixed synthetic instant from local PostgreSQL and normalizes it to UTC Z. Eligibility uses the actor's actual local authenticated SQL role/RLS. Server authorization remains required; caller-supplied scope never grants it.

Synthetic Brew source fields encode the linked source contract: catalogue cafe identity/name/area/eligibility, intervals/current opening state/next boundary, all menu references/names/drink types/sold-out flags, rating sum/count, candidate snapshots and selection-order arrays. Synthetic Prep source is the specified PrepInput with period and aggregate identity/label/count. These snapshots exercise shared cache mechanics without unfinished story adapters, source calculations or UI.

New cache/audit storage table names are discovered, not prescribed. The retention checks reuse the already merged `private.ai_usage_counters` table and existing usage row semantics. Structured cache payloads are discovered through their stored feature-result object before fixture corruption. Audit rows are recognized by outcome metadata; operation identifiers connect assertions to one synthetic invocation.

## Criterion-to-case and failing-first inventory

All 30 cases below fail at a deliberate missing-module guard, before behavior assertions. `I` means missing `src/server/llm/cache-identity.ts`; `S` means missing `src/server/llm/ai-state.ts`. Exact expanded titles are in the verification log.

| File / case title (parameter expansions stated) | Criteria | Failure |
| --- | --- | --- |
| identity: canonical JSON sorts recursively by code point and hashes exact UTF-8 | SYS-10.1 | I |
| identity: exact query whitespace case Unicode and ranking order never merge | SYS-10.1 | I |
| identity: canonical identities reject nonfinite JSON numbers | SYS-10.1 | I |
| identity: cache key hashes precisely the specified identity preimage | SYS-10.1, SEC-07.1 | I |
| identity: source sets sort by reference but selection order and every catalogue field invalidate | SYS-10.1, SEC-07.1 | I |
| cache: validated Brew envelope persists across repository instances with exact ten-minute expiry | SYS-10.1 | S |
| cache: Prep expires precisely at Singapore midnight without cleanup | SYS-10.1, SEC-07.1 | S |
| cache: actor environment source model and contract mismatches miss (also same actor's protected role changes) | SYS-10.1, SYS-10.2, SEC-07.1 | S |
| cache: Prep cafe ownership business day and aggregate content isolate reuse | SYS-10.1, SYS-10.2, SEC-07.1 | S |
| cache: RLS eligibility change blocks existing Brew result — suspended=true / application_state='pending' (2 cases) | SYS-05.3, SYS-10.2, SEC-07.1 | S |
| cache: cafe suspended during fake generation never returns or stores AI result | SYS-05.3, SYS-10.2, SEC-07.1 | S |
| cache: invalid provider payload is never stored as success — foreign references / unknown field / nonarray suggestions (3 cases) | SYS-10.2, SEC-07.2 | S |
| cache: refresh bypasses cache retains admission replaces only successful result | SYS-10.1, SYS-09.4, SEC-07.2 | S |
| cache: refresh returns fallback and preserves eligible old envelope — failure / denied / invalid (3 cases) | SYS-10.1, SEC-07.2 | S |
| cache: corrupt persisted payload is revalidated as a miss | SYS-10.2, SEC-07.1, SEC-07.2 | S |
| accounting/audit: cache hit records operation outcome with no provider reservation | SYS-09.4, SYS-10.3, SEC-09.1 | S |
| accounting/audit: each dispatch has exactly one reservation and content-free audit — success / 429 / failure (3 cases) | SYS-09.4, SYS-10.3, SEC-09.1 | S |
| accounting/audit: admitted actor denial records safe outcome without provider dispatch | SYS-10.3, SEC-09.1 | S |
| accounting/audit: unavailable storage fails closed before dispatch — audit / admission (2 cases) | SEC-09.1 | S |
| permissions/retention: all ordinary roles cannot forge read or mutate AI infrastructure | SYS-10.3, SEC-07.1, SEC-09.2 | S |
| permissions/retention: first due maintenance deletes expired caches 30-day audits and 7-day closed usage while preserving active reservations | SEC-09.2 | S |
| permissions/retention: AI cleanup preserves separate moderation audit rows | SEC-09.2 | S |

Three new cases pass: no-use-cache inspection (SYS-05.3/SEC-07.2), and subsequent session-RLS cafe/menu/hour reads after suspension or unapproval (SYS-05.3).

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` (final frozen files, escalated local execution) | Expected failure, exit 1 | Lint and typecheck pass. Vitest: 30 failed / 469 passed, 499 total; 4 files failed / 24 passed, 28 total. All 30 failures explicitly identify missing ai-state/cache-identity modules. Duration 179.31s. |
| `bun run check:traceability` (separate final-code run) | Passed | 16 done tasks; all listed criteria have test titles. |
| `bun run check:specs` (separate final-code run) | Passed | 0 warnings. |

The verification chain did not reach traceability, specs or production build because unit/integration tests intentionally failed. Traceability and specs were run separately on the frozen files as recorded above. No build pass is claimed. No browser cases were authored; `bun run test:e2e` was not run. Catalogue streaming and personalized HTTP-cache assertions remain uncovered, rather than being inferred from a production build or unrelated auth harness.

Local setup: initial sandboxed `bun run db:start` failed with CLI filesystem access restrictions. Escalated `bun run db:start` and `bun run db:reset` succeeded; generated credentials were suppressed. The initial sandboxed verify passed lint/typecheck but failed many existing database cases on Docker access. Escalated verification removed those tooling failures. These setup failures are separate from intended missing-implementation failures. No hosted service was used.

Final verification transcript: `/private/tmp/homebrew-t15-verify.log`. Final auxiliary-check output: `/private/tmp/homebrew-t15-checks.log`.

## Open issues for the next step

- SYS-05.3 catalogue streaming/Suspense and actual session-client catalogue integration are not testable against a merged catalogue page: it does not exist. Local SQL/RLS positive controls prove visibility policy, not the page's rendering or client selection.
- SEC-07.2 personalized HTTP/shared-public-cache behavior is not testable without the feature HTTP adapter. The AST inspection proves only the framework directive restriction.
- The 30 expected missing-module failures do not validate assertions or fixture code after the guard. Static review found and corrected a SELECT-only helper being used for fixture mutation, PostgreSQL clock representation and an unchanged source-boundary mutation. Runtime evidence for those later paths remains unavailable until the modules exist.
- The synthetic private moderation audit table checks that AI cleanup leaves unrelated domain records intact. It does not prove Admin mutation transactions, audit creation, real moderation audit schema retention, domain permissions or confirmation security.
- Console output/error and returned-data canaries are covered locally; no live observability service or telemetry collector is exercised.
- Shared tests are independent of T-14 feature transport and unfinished story adapters. No implementation, story UI/lifecycle work or downstream delegation was started.

## Suspicious content found

None.

## Human corrections

The coordinating session preserved the human's stop-at-each-gate requirement and clarified that shared tests do not own story UI/lifecycle. No scope expansion was performed.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No reviewer agent/report was invoked or read. |

## Notes for reflection

- **What worked:** Existing usage admission/RPC and real session-RLS fixtures make shared state tests independent of feature adapters; explicit missing-module guards distinguish failing-first implementation work from module-resolution tooling problems.
- **What needed guidance:** Coordinating-session static inspection caught an unchanged next-boundary mutation; shared catalogue/public-cache coverage required explicit partial status.
- **What to change in the agent or skill:** Complete static fixture review before freezing one final verification run; missing-module guards cannot establish later fixture correctness.

