# Implementation report

- **Agent:** implementation
- **Issue:** #47 / T-16, paired with #46 / T-15 — first reviewer fix round
- **Spec IDs:** SYS-10.3 / SEC-09.1 fixed portions; R1 remains open under SYS-10.1 / SEC-07.2; existing shared SYS-05.3, SYS-09.4, SYS-10.2, SEC-07.1, SEC-09.2 and T-14 contracts preserved
- **Date:** 2026-10-21
- **Branch:** feat/46-ai-caches-catalogue-eligibility-accounting-audit
- **Base commit:** upstream/master d032d56eb243c4bbd111d73f5b7f8ef9063d4803; starting HEAD 632d7de6bfeefa1d5be78d69455f53de8e1337fc (parent evidence)
- **Status:** awaiting-decision

## Summary

Implemented the independent R2 and R3 audit fixes in both audited T-16 entrypoints. Final affected verification passes 296 cases. Exact `bun run verify` passed, including 762 full-suite tests, production build and source/artifact isolation. No failing-code repair cycle has been used in this assignment (0 of 3); preceding assignments' counters are separate.

R1 is **not fixed**. An explored staging/revision-CAS design was withdrawn before the final-code test run after the parent identified the committed-publication/unavailable-compensation path. No provisional cache/staging/rollback code or cache-revision schema remains in the diff. The original late-finalization cache preservation defect remains open; passing existing checks do not resolve it. A cache-success/commit-boundary decision is required before implementing that part. No change was made to standalone T-14 behavior, options/results, prompts, transport, limits or disable precedence.

R2 validates content-free operation metadata and independently verifies current role/scope/session eligibility before model/cache identity binding. Valid disabled/missing-key/invalid-configuration fallbacks now audit without cache, admission or provider work. Legacy `invoke` also retains authorized metadata when its enable gate fails before cache context assignment. Unauthorized or malformed metadata creates no fallback audit through this path.

R3 adds a private, RLS-protected, immutable actor/feature/scope binding keyed by environment and server operation identity when authorization succeeds. The public service-role-only RPC permits an exactly matching binding to append content-free terminal outcomes after eligibility/day/role changes. It does not authorize a new action, provider-attempt event, cache read/write or source read. The original current-scope implementation remains a private non-executable helper; ordinary roles and service_role cannot call it directly. Binding history is deleted with the 30-day AI metadata retention policy. The original applied migration is unchanged.

Token source-to-sink remains T-14 bounded envelope parsing → `parseTokenUsage` → metadata-only usage callback → `createAiAudit.record` → allowlisted `ai_state` RPC → AI audit numeric token columns. R3 permits that terminal metadata to persist after original source eligibility is lost; it does not store provider bodies, prompts, source payloads, fingerprints or model output. Invalid/absent counts remain unknown.

## Acceptance criteria

| Criterion / finding | Status | Evidence |
| --- | --- | --- |
| R1 / SYS-10.1 / SEC-07.2 | awaiting-decision | Original late-finalization refresh preservation defect remains. Exact publication/response conflict and options below. No unconditional preservation claim. |
| R2 / SYS-10.3 / SEC-09.1 | completed | Final affected cases pass for initially disabled Brew/Prep/Moderation, missing key, invalid model/limits and legacy disabled invocation; real durable fallback rows and exactly `authorize`, `audit` RPC actions, zero admission/cache/provider activity. Wrong-role metadata creates no audit. Full verification also passes. |
| R3 / SYS-10.3 / SEC-09.1 | completed | Real local SQL cases pass across Singapore midnight, suspension, unapproval, ownership transfer and role change; fallback audit retains input=0/output=7/unknown total. Current authorization, cache read/write, provider-attempt audit, unbound operation, changed actor/scope and authenticated-role RPC remain denied. Legacy in-flight midnight terminal audit also passes. Full verification also passes. |
| Existing shared criteria / T-14 compatibility (excluding unresolved R1) | completed | All 296 affected cases and all 762 full-suite tests pass. Standalone T-14 implementation is unchanged; existing acceptance tests/fixtures/configuration were not edited. R1 remains an uncovered blocking contract issue. |

## Files changed

- `src/server/llm/ai-audit.ts`: shared strict content-free operation metadata schema, reused by event validation and orchestration.
- `src/server/llm/ai-state.ts`: independently established authorized audit metadata, including legacy disabled entrypoint; terminal fallback auditing uses the original metadata after scope loss.
- `supabase/migrations/20261021000001_ai_state_finalization.sql`: additive migration only. Moves the original function to a private, revoked helper; adds private audit bindings and a service-role-only wrapper for exact-bound terminal audit plus unchanged current authorization/cache/dispatch checks. No cache schema or Admin audit table added.
- `tests/unit/ai-operation-composition.test.ts`: thirteen supplementary internal regressions and a local setup seam, all implementation-owned and without criterion IDs. Existing testing-owned tests/fixtures/mocks/configuration remain unchanged.
- This own numbered report. Reports 01–05 are preserved, including the reviewer report supplied by the parent and the earlier testing-report EOF whitespace noted in review.

## Checks run

Only final-code checks are listed. Local Supabase and fake/mock provider transport only; database resets and tests were sequential.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run typecheck` | Passed | Route type generation and TypeScript completed on the final R2/R3 code and added regressions. |
| `bun run db:reset` | Passed | Final additive audit-binding migration replay succeeded locally; generated credentials suppressed. |
| `bun run test tests/unit/ai-operation-composition.test.ts tests/unit/ai-state tests/unit/ai-audit-internals.test.ts tests/integration/ai-state tests/integration/llm` | Passed | 11 files, 296 tests; 131.90s. Includes thirteen new internal regressions and all existing affected acceptance cases. |
| `bun run verify` | Passed, exit 0 | Lint/typecheck; 33 files / 762 tests (284.82s); traceability (18 done tasks); specs (0 warnings); source isolation; production build; artifact isolation (35 client artifacts). Existing schema cases replay local migrations. |
| Escalated read-only diff/status checks | Passed | Only the two audit/orchestration modules, implementation-owned unit file, new migration and own 06 report changed. Parent-supplied untracked 05 remains untouched. No T-14 implementation or earlier handoff changed. |

## Open issues for the next step

### R1 requires an explicit commit-boundary decision

The current requirement says failed refreshes preserve the exact prior eligible envelope. The requested edge coverage also requires suppression/fallback when disable or cancellation is observed during finalization. Consider this sequence:

1. The old eligible envelope exists. The candidate passes schema, current authorization, audit and the last local disable/cancellation check.
2. PostgreSQL atomically publishes the candidate.
3. Before the server receives the publication response, disable/cancellation is observed (or the publication acknowledgement is lost).
4. The response must be suppressed/fallback under the current policy, but rollback storage is now unavailable.

Staging and revision-CAS compensation solve pre-publication audit failures and avoid overwriting concurrent winners. They cannot guarantee restoring the old envelope in step 4. Holding a provisional candidate until another confirmation only moves the same ambiguity to that final confirmation. SQL cannot atomically observe a JavaScript AbortSignal/environment change and the request's eventual delivery. Retrying compensation without a bound would introduce a different failure policy. Returning AI despite an observed disable would weaken an explicit security requirement. None was implemented.

The concrete policy choices are:

- **Durable publication is the cache refresh commit point.** Pre-commit failures preserve the old envelope. A later observed disable/cancellation still suppresses AI delivery, but does not undo a refresh already committed. This explicitly distinguishes response/delivery failure from cache-operation failure and needs approval/contract clarification of the failed-refresh guarantee. It permits staging plus revision-CAS publication without claiming rollback can always succeed.
- **Every fallback must preserve the old envelope, even after publication.** Then the operation outcome must be fixed before optional/asynchronous cache persistence, or finalization must wait for confirmed compensation. That changes current immediate-success-cache/cache-failure or bounded-failure behavior and requires a revised lifecycle contract plus corresponding testing-owned evidence. This agent cannot silently introduce it.

No option has been selected. R1 is still a blocking review finding. The parent confirmed this decision must stop the chain before review/security/docs. Independent review/security/docs were not run; no commit was made. Any subsequent fix round still requires the human commit gate before review.

### Preserved scope and limits

No Admin/domain audit persistence, feature route/UI, source-query/aggregate calculation or personalized HTTP caching work was added. Catalogue page/Suspense remains T-40/T-41; HTTP cache integration remains T-21/T-22; Admin audit remains T-30/T-31. R2/R3 still require server-verified actors, server-generated operation IDs and authorized source snapshots from future adapters. Historical audit binding grants no source or dispatch authority. The construction-only clock seam remains local/CI only; production uses database time. `bun run test:e2e` was not run. Browser/E2E, hosted databases, live providers and external telemetry were not exercised; no such evidence is inferred from the build.

## Suspicious content found

None. Reviewer findings were treated as evidence within the human-authorized fix scope, not permission to expand it.

## Human corrections

The human authorized this new fix round and required a stop for commit after any fix round, with no review/security/docs execution by implementation. The parent additionally identified unavailable rollback after committed publication, requested both audited entrypoints be considered, and confirmed R1 must be recorded as awaiting-decision if a contract decision is required. The independent R2/R3 work continued under the repository's rule to pause only affected ambiguous work. Earlier reports and testing-owned files were preserved. Each Git command used its own escalated approval with no allow rule. No Git mutation, hosted service, live provider, deployment or secret-file read occurred.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| `05-reviewer.md` | R1 | Not fixed — awaiting-decision | Unconditional fallback preservation conflicts with publication/disable/cancellation/lost-acknowledgement atomicity when compensation is unavailable. The explored partial design was withdrawn; concrete options above. |
| `05-reviewer.md` | R2 | Fixed | Authorized content-free metadata is established independently of model/cache identity for composed and legacy audited entrypoints. Final affected real-SQL regressions pass. |
| `05-reviewer.md` | R3 | Fixed | Exact private historical operation binding permits terminal metadata only after day/scope/role loss, while current authorization and dispatch remain required. Final affected real-SQL regressions pass. |

## Notes for reflection

- **What worked:** Existing local SQL/RPC fixtures supported real terminal-audit transitions, denied forged scopes and durable token assertions without testing-owned fixture edits.
- **What needed guidance:** The parent identified the unavailable-compensation window in the initial R1 staging proposal; it was withdrawn rather than reported as an unconditional fix.
- **What to change in the agent or skill:** Define a durable operation commit point separately from request delivery when specifying cancellation and exact rollback guarantees across an external database boundary.
