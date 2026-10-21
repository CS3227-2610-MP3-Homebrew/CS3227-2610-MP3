# Implementation report

- **Agent:** implementation
- **Issue:** #47 / T-16, paired with #46 / T-15 — R1 follow-up
- **Spec IDs:** SYS-10.1, SYS-10.3, SEC-07.2, SEC-09.1; existing shared criteria preserved
- **Date:** 2026-10-21
- **Branch:** feat/46-ai-caches-catalogue-eligibility-accounting-audit
- **Base commit:** Starting HEAD a4cc709, including upstream/master PR104 (parent evidence)
- **Status:** completed

## Summary

Implemented the human-selected durable-publication commit point in both T-16 audited entrypoints. Final affected verification passed 309 tests. Exact `bun run verify` passed on final code, including all 775 tests and production artifact isolation. Repair cycles used: 1 of 3. Initial affected run passed 306 tests. A subsequent focused hardening batch guarded the legacy post-commit enable callback from introducing an unapproved fallback and added concurrency/broken-configuration evidence; final affected checks passed 309 tests and exact full verification passed. No failing check was bypassed; the initial passing 306-test run preceded this final hardening batch.

The composed T-14 lifecycle validates provider output and captures sanitized token usage, while T-16 buffers the validated cache candidate. Current authorization, content-free readiness audit and a final current authorization/configuration/cancellation check precede publication. One service-role RPC transaction rechecks current database role/workspace/café/day and source eligibility, then atomically publishes. No earlier cache replacement or compensating rollback occurs. Concurrent successful publications serialize through the cache primary-key upsert; a failed/suppressed operation cannot restore stale state over another writer.

`ready` is a content-free provider-stage event meaning validated and authorized for delivery/publication. It does not assert successful response delivery. Both T-16 entrypoints use it instead of recording `success` before a response is known. Observed suppression records `fallback` when audit storage is available; audit failure cannot create a false success row. This is the successful pre-publication audit work: its precise success claim is validation/readiness, never delivery. Normal delivery evidence is the returned typed AI result together with durable `ready` token metadata and, for cached features, the committed envelope; normal Brew/Prep/Moderation internal cases assert delivery and durable token metadata, with Brew/Prep also asserting cache contents. No durable response-delivery success is claimed, because publication/audit cannot atomically commit receipt by the caller. Normal returned operation result types remain unchanged. Cache audit events remain facts about reuse. After acknowledged publication, the composed lifecycle only suppresses for observed disable/cancellation. A lost acknowledgement also permits fallback with the committed cache retained. Both post-commit configuration readers swallow invalid/throwing configuration observations unless a disabled state is actually observed; a broken callback cannot add another post-commit failure category. A malformed write acknowledgement is explicitly treated as lost acknowledgement: the client cannot establish whether the write committed. No post-publication authorization/readback or fallible success audit changes the response. Standalone T-14 behavior without lifecycle hooks is preserved.

Merged the finalization migration directly into the original AI-state migration and removed the second file under explicit human authorization for these unhosted migrations. The single service-only RPC includes historical exact operation bindings, current authorization, audit, cache operations and cleanup; no renamed/wrapped private RPC remains. RLS/revocations, 30-day binding/audit retention and 7-day closed accounting retention remain. Historical bindings allow only terminal content-free auditing and never current cache/dispatch access. `ready` requires current authorization.

Provider token path remains bounded T-14 envelope parsing → sanitized token callback → T-16 readiness/fallback metadata → strict audit schema → service-only SQL → numeric token columns. Prompts, outputs and provider bodies never enter audit records.

## Acceptance criteria

| Criterion / finding | Status | Evidence |
| --- | --- | --- |
| R1 / SYS-10.1 / SEC-07.2 | completed | Final affected tests pass: audit/storage failure preserves exact old envelope; disable/cancel before commit preserves it; post-commit disable/cancel/lost acknowledgement retains replacement; concurrent later publication survives. No suppressed response creates a success audit. Exact full verification passed. |
| SYS-10.3 / SEC-09.1 | completed | Final affected readiness/fallback durable rows retain input=0/output=7, unknown total; R2/R3 disabled and midnight/eligibility/ownership/role cases pass. Exact full verification passed. |
| Existing composition / T-14 compatibility | completed | Final affected single-stage reservations, provider/cache/moderation, standalone usage callback and existing T-14 tests pass. Exact full verification passed. |

## Files changed

- `src/server/llm/ai-state.ts`: buffered publication, final authorization/readiness audit before cache mutation, legacy equivalent, truthful suppression audit.
- `src/server/llm/operations.ts`: internal publication callback after readiness; only disable/cancel suppression after acknowledged commit. Public standalone lifecycle unchanged.
- `src/server/llm/ai-audit.ts`: content-free `ready` event validation.
- `supabase/migrations/20261021000000_ai_state.sql`: coherent consolidation of protected bindings and existing cache/audit RPC; readiness event.
- `supabase/migrations/20261021000001_ai_state_finalization.sql`: removed under explicit human consolidation authorization.
- `tests/unit/ai-operation-composition.test.ts`: implementation-owned internal regressions only; testing-owned files untouched.
- This report; earlier handoffs preserved.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` | Passed | Clean local Supabase migration replay; credentials omitted. No subsequent SQL changes. |
| `bun run test tests/unit/ai-operation-composition.test.ts tests/unit/ai-state tests/unit/ai-audit-internals.test.ts tests/integration/ai-state tests/integration/llm` | Passed | Final code: 11 files, 309 tests, 206.30 seconds. Local Supabase and fake providers only. |
| `bun run verify` | Passed, exit 0 | Lint; Next route type generation/TypeScript; 33 files / 775 tests (409.77 seconds); traceability; specs (zero warnings); source isolation; webpack production build; isolation of 35 client artifacts. |
| Scoped escalated `git diff --check` | Passed | Application, migrations, own internal tests and report have no whitespace errors. Earlier immutable reports untouched. |

## Open issues for the next step

No implementation blocker remains. Independent parent verification and review are pending; implementation completion is not approval. Human commit is the next gate after this implementation fix round; no downstream review/security/docs executed.

Catalogue UI/Suspense (T-40/T-41), personalized HTTP caching (T-21/T-22), Admin/domain audit storage (T-30/T-31), feature adapters/source queries and maintenance route integration remain deferred. Server callers still supply verified actors, generated operation IDs and authorized snapshots. The trusted clock seam remains construction-only local/CI; deployed clocks are database-authoritative. No browser, hosted DB or live-provider evidence is claimed.

## Suspicious content found

None. Review findings were treated as evidence, not scope authority.

## Human corrections

The human selected durable publication as commit, expressly allowed fallback on lost publication acknowledgement, prohibited success outcomes for suppressed responses, and authorized consolidation/removal of the two unhosted migrations despite the usual additive-migration rule. R2/R3 and prior scope deferrals were preserved. No commit, deployment, hosted service or secret-file access occurred.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| `05-reviewer.md` | R1 | Fixed | Readiness/audit/authorization failures precede atomic publication; post-commit disable/cancel/lost acknowledgement suppress delivery and retain committed cache without false success audit. |
| `05-reviewer.md` | R2 / R3 | Preserved and verified | Metadata-independent disabled audit and exact-bound terminal audit retained in consolidated RPC. |

## Notes for reflection

- **What worked:** Explicit commit semantics avoid unsafe compensating writes and distinguish durable cache state from response delivery.
- **What needed guidance:** Human commit-point and migration-consolidation decisions resolved the earlier ambiguity.
- **What to change in the agent or skill:** None identified in this follow-up.
