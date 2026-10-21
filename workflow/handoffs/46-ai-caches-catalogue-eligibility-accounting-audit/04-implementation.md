# Implementation report

- **Agent:** implementation
- **Issue:** #47 / T-16 composition follow-up, paired with #46 / T-15
- **Spec IDs:** shared SYS-05.3; SYS-09.4; SYS-10.1–SYS-10.3; SEC-07.1–SEC-07.2; SEC-09.1–SEC-09.2; existing T-14 SYS-08/SEC transport and validation contracts preserved
- **Date:** 2026-10-21
- **Branch:** feat/46-ai-caches-catalogue-eligibility-accounting-audit
- **Base commit:** 8cf237a (parent's clean preflight; merged upstream/master including T-14 PR #102); prior T-16 commit ebe1e6c
- **Status:** completed

## Summary

This is a new human-authorized follow-up after T-14 merged, not a retry of report 03. Added `createAiState(...).runOperation(context, options)` so future server feature boundaries use one composed operation rather than nesting the legacy `invoke` with `runLlmOperation`. The configured state factory exposes this method without additional composition in a route. Existing standalone entrypoint argument/response shapes, prompts, transport bounds, no-retry policy and fallback behavior remain unchanged; no T-14 public-behavior decision was required.

The call graph is `createConfiguredAiState().runOperation` → T-14 `runOperationWithLifecycle` → T-16 admission/cache/eligibility/audit callbacks. T-14 alone owns source/provider validation, configuration/disable precedence, stage order, cancellation/timeout and transport. Its action stage maps to one Brew action, one Prep refresh when requested, or one Moderation run; its provider stage maps to one provider-attempt reservation. T-16's old callback-based `invoke` remains compatible for existing callers and is not invoked by the composed path. The composed path does not repeat the legacy operation preflight/disable gate; scope/schema validation and database authorization remain independent safeguards.

The exact token path is bounded T-14 provider-envelope parsing → `parseTokenUsage` → internal `providerUsage` lifecycle observer → metadata-only `usage` local variable → `createAiAudit.record` → existing `ai_state` RPC → `private.ai_audit_events.input_tokens/output_tokens/total_tokens`. Valid counts accompanying a rejected feature result reach its fallback audit. Missing/invalid counts remain unknown; no cost is inferred. Cache hits never reuse prior provider counts. No provider contents are copied into audit. T-14's existing public `recordUsage` callback retains its prior success-only behavior.

The first affected run passed 282 cases; the final affected suite passed 283 cases after completion of helper reuse and the final compatibility case. Exact `bun run verify` passed after this report draft, including all 749 full-suite tests, production build and artifact isolation. No failing-code repair cycle has been used in this follow-up (0 of 3); the previous report's two repair batches belong to that earlier assignment. No migrations, dependencies, acceptance tests, fixtures, mocks, test configuration, specs, PLAN or earlier reports were changed.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Human composition requirement / SYS-09.4 | completed | Passing composition cases inspect real durable admission rows: Brew action/provider once, Prep refresh/provider once, Moderation run/provider once; cache hit has one action and no provider attempt. Transport dispatch counts match. |
| SYS-10.1 / SEC-07.1 | completed | Passing composed provider-to-cache reuse and changed-model rejection; all existing canonical identity, source/model/contract scope invalidation and exact expiry cases pass. |
| SYS-10.2 / SYS-05.3 shared portion | completed | Existing strict provider/cache result, ownership/role/current eligibility, mid-generation suspension and session-RLS/AST cases pass using shared feature-result gates plus cache-specific predicates. |
| SYS-10.3 AI-use / SEC-09.1 | completed | Passing composed cases inspect persisted zero/partial token counts, unknown totals, cache/fallback/success/denied events, canary exclusion, unavailable storage and uncached Moderation audit. |
| SEC-07.2 shared portion | completed | Passing successful replacement and denied/429/invalid refresh preservation cases; composed disabled/final-audit-disable precedence passes. Existing no-use-cache and cache-isolation cases pass. |
| SEC-09.2 | completed | Cleanup implementation/migrations unchanged; all existing due-retention, active counter/admission/operation preservation and unrelated moderation-row preservation cases pass. |
| T-14 compatibility and reuse | completed | All existing T-14 acceptance cases and the supplementary success-only public usage-callback case pass. No fixed prompt, transport, public Options/Result shape or public fallback contract changed. |

## Files changed

- `src/server/llm/operations.ts`: shared internal lifecycle hooks for configuration identity, sanitized provider usage and authorized/audited delivery; standalone `runLlmOperation` delegates without hooks and preserves its public behavior. The existing state/disable check runs after an awaited composed delivery hook too.
- `src/server/llm/ai-state.ts`: composed `runOperation` entrypoint for Brew, Prep and uncached Moderation, one reservation per T-14 stage, metadata-only usage audit, configured cache identities and final current eligibility. Legacy direct cache/invoke behavior remains available.
- `src/server/llm/schemas.ts`: exposes existing identical scalar/filter validators for reuse; no rule changes.
- `src/server/llm/cache-schema.ts`: removes copied feature-result schemas/semantics, Prep source schema and equivalent scalar/filter validators in favor of T-14's helpers. Cache-specific catalogue/current-filter checks remain additional predicates.
- `src/server/llm/cache-identity.ts`: removes its duplicate code-point comparator and reuses T-14's. Its stricter canonical JSON implementation remains because it additionally rejects unsupported JavaScript values, cycles and object prototypes; those rejection semantics are not identical to the transport serializer.
- `tests/unit/ai-operation-composition.test.ts`: supplementary implementation-owned internal tests with local durable admission/audit evidence, refresh preservation, transient moderation, token handling, canaries, configuration-change/disable/storage failure and standalone callback compatibility. No criterion IDs in titles.
- This next numbered implementation handoff; reports 01–03 preserved.

## Checks run

These checks ran on the final code using local Supabase and mock/fake providers only. This report draft preceded exact `bun run verify` as requested, and was updated afterward with actual results. Report-only edits do not invalidate verification.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run test tests/unit/ai-operation-composition.test.ts tests/unit/ai-state tests/unit/ai-audit-internals.test.ts tests/integration/ai-state tests/integration/llm` | Passed | 11 files, 283 tests; 91.69s. Includes real local SQL admission/audit rows and mock provider transport. |
| `bun run verify` | Passed, exit 0 | Lint; typecheck; 33 files / 749 tests (226.91s); traceability (18 done tasks); spec check (0 warnings); source isolation; production build; artifact isolation (35 client artifacts). Existing schema checks also replay local migrations. |
| Escalated read-only `git diff` and `git status --short` | Passed | Only five authorized server modules, the supplementary unit file and this handoff changed; no acceptance tests/fixtures/configuration or unrelated files changed. |

## Open issues for the next step

No implementation blocker remains. Final affected tests and exact full verification passed. No public-behavior change requiring a spec decision was needed. Independent reviewer/security review and the human implementation commit remain pending. Future feature adapters still supply verified session actors, server-generated operation identities and fresh authorized catalogue/sales/review snapshots; this change supplies no feature routes, source-query calculations, story lifecycle or UI. Moderation keeps advice transient and creates only AI-use audit events.

The human's accepted Gate-2 deferrals remain: catalogue page/Suspense evidence belongs to T-40/T-41; personalized HTTP-response cache integration belongs to T-21/T-22; Admin/domain audit storage and Admin action entries belong to T-30/T-31. No Admin audit table was added. `bun run test:e2e` was not run. Browser, hosted-service, live-provider and external-telemetry checks were not performed; none is inferred from the passing build. The preexisting construction-only local/CI database clock seam remains; production composition does not inject a clock. Only supported provider envelopes supply usage; rejected HTTP/provider envelopes without accepted usage retain unknown counts.

## Suspicious content found

None. Stale PLAN wording about separate moderation domain audit storage remains superseded task data under the human's explicit scope decision.

## Human corrections

The human requested composition only after T-14 merged from master, required provider token counts in durable AI audit and reuse of identical helpers, and prohibited silently changing T-14 public behavior. This assignment preserves those boundaries. The parent clarified mapping Moderation's action stage to the durable `run` event/daily cap and confirmed one exact final-code verify after writing this report draft is sufficient. All Git commands used individual escalated approval, with no allow rule; no Git mutation, commit, PR, deployment or live provider call occurred. Database commands are sequential.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Independent review has not run. |

## Notes for reflection

- **What worked:** T-14's existing admission/cache seams let the new entrypoint use one sequencing owner while T-16 supplies durable repositories; existing audit token columns required no migration.
- **What needed guidance:** The parent reinforced the Moderation run-event mapping and the report-before-verify ordering.
- **What to change in the agent or skill:** Record explicit composition seams when separately implemented shared services merge, including durable metadata propagation and compatibility evidence.
