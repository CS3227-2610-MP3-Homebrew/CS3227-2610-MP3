# Implementation report

- **Agent:** implementation
- **Issue:** #47 / T-16, paired with #46 / T-15
- **Spec IDs:** shared portions of SYS-05.3; SYS-09.4; SYS-10.1, SYS-10.2, SYS-10.3; SEC-07.1, SEC-07.2, SEC-09.1, SEC-09.2
- **Date:** 2026-10-21
- **Branch:** feat/46-ai-caches-catalogue-eligibility-accounting-audit
- **Base commit:** 0c2ecbd74f37ead47b160b87aa11b4f0574349df (parent preflight evidence); testing commit edc2143
- **Status:** completed

## Summary

Implemented durable Brew/Prep cache identities, strict source/result/envelope validation, scope authorization, database-clock expiry, refresh preservation, per-dispatch usage admission, content-free AI audit and bounded cleanup. Production composition uses the installed Supabase SDK through the restricted public infrastructure RPC and session-bound RLS for eligibility. Moderation Assistant has a reusable content-free audit API and no reusable result cache. No Admin/domain audit table was created.

Final verification passed: all 36 affected cases and all 502 full-suite cases pass, including exact `bun run verify` through production build and artifact isolation. Two repair batches were used: SQL expiry-expression syntax correction, then shared moderation-audit and derived-workspace contract corrections. The initial focused/full checks ran without the failed migration, and a diagnostic reset overlapped the initial full run; these failed attempts establish no behavioral pass and are not listed as final-code checks. All final reset/test commands were sequential. No acceptance tests, fixtures, configuration, dependencies, specs or PLAN were edited. Pending independent review does not change the implementation-completed status; no review or commit is claimed.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-05.3 (shared portion) | completed | Assigned catalogue AST/session-RLS cases and cache/mid-generation suspension/unapproval cases pass. Catalogue page/Suspense remains with T-40/T-41. |
| SYS-09.4 | completed | Assigned cache-hit zero-provider-reservation, refresh admission and success/429/failure one-reservation cases pass. |
| SYS-10.1 | completed | Assigned canonical/hash, source/model/contract/scope invalidation, durable reconstruction, exact Brew/Prep expiry and refresh cases pass. |
| SYS-10.2 | completed | Assigned role/ownership/current eligibility, foreign/invalid result and persisted corruption cases pass. Strict Zod schemas and semantic checks reject complete invalid results. |
| SYS-10.3 (AI-use portion) | completed | Assigned metadata/outcome and ordinary-role infrastructure-denial cases pass. Supplementary SDK test plus rollback-only local service_role SQL check prove moderation AI-use audit and optional token metadata. Admin action audit remains with T-30/T-31. |
| SEC-07.1 | completed | Assigned cache identity/current-role/ownership/eligibility, corruption and infrastructure permission cases pass. |
| SEC-07.2 (shared portion) | completed | Assigned failed/denied/invalid refresh preservation, later expiry/ownership and invalid data cases pass; no-use-cache inspection passes. Personalized HTTP caching remains with T-21/T-22. |
| SEC-09.1 | completed | Assigned success/cache/denial/failure content-canary and unavailable-storage fail-closed cases pass. Supplementary strict metadata, partial-token, deployed-clock and SDK cases pass. |
| SEC-09.2 | completed | Assigned first-due cleanup/30-day audit/seven-day closed usage, active state/duplicate admission/operation bound, physical cache removal and unrelated moderation-row preservation cases pass. |

## Files changed

- `src/server/llm/cache-identity.ts`: canonical serialization, exact hashing and reference-set source revisions.
- `src/server/llm/cache-schema.ts`: strict context/source/envelope and feature-result schema/semantic validation.
- `src/server/llm/ai-state.ts`: authorized durable cache lifecycle, per-attempt admission, refresh handling and cleanup.
- `src/server/llm/ai-audit.ts`: content-free AI audit for Brew, Prep and transient Moderation Assistant, including partial returned token counts.
- `src/server/llm/ai-state-client.ts`: production session-RLS and configured Supabase composition, without test-clock injection.
- `src/server/llm/usage-client.ts`: explicit allowlist addition for the AI-state infrastructure RPC; no generic SQL capability.
- `supabase/migrations/20261021000000_ai_state.sql`: private cache/AI audit tables, RLS/grants, restricted RPC, authoritative time, independent role/workspace/ownership checks and narrowly scoped retention cleanup. Workspace references remain stored only on Profiles and Cafés.
- `tests/unit/ai-audit-internals.test.ts`: supplementary internal SDK, content rejection, partial token and deployed-clock checks; no criterion IDs in titles.
- This numbered implementation handoff.

## Checks run

All commands below ran after the final application/migration changes, using only local Supabase and fake provider callbacks. Report-only edits do not change this evidence.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` | Passed | Final migration replay succeeded; generated credentials suppressed. |
| `bun run test tests/unit/ai-state tests/integration/ai-state tests/unit/ai-audit-internals.test.ts` | Passed | 7 files, 36 tests; duration 70.29s. Includes all 33 assigned shared cases plus three supplementary internal cases. |
| `bun run verify` | Passed, exit 0 | Lint/typecheck; 29 files, 502 tests (208.11s); traceability (16 done tasks), spec check (0 warnings); source isolation; Next.js production build; artifact isolation (35 client artifacts). The existing schema suite also replays local migrations twice. |
| Rollback-only local `psql` check under `service_role` | Passed | Moderation AI audit insertion returned true; moderation cache outcome rejected; input=0/output=7/absent total preserved exactly. Transaction rolled back. |
| Escalated read-only `git status --short` and tracked adapter diff inspection | Passed | Only listed implementation/migration/internal-test/handoff paths; no acceptance tests, fixtures, specs or PLAN changes. |

`bun run test:e2e` was not run. No browser/feature-adapter evidence is inferred from the production build.

## Open issues for the next step

No shared implementation blocker remains. Independent reviewer and security review have not run. The human implementation commit remains the next gate before review. Catalogue streaming, personalized HTTP caching and Admin/domain audit behavior are deferred under the explicit human scope decision. Existing shared acceptance tests remain authoritative. This implementation does not supply feature endpoints, source-query/aggregate calculation adapters, story UI or domain mutations. Audit token counts are optional validated metadata supplied through the standalone audit API; absent counts remain null, and no monetary cost is inferred. Feature adapters remain responsible for verified session actors, server-generated operation identities, authorized fresh source/filter/aggregate snapshots and configured model/prompt preimages. This repository does not invent unfinished catalogue/sales queries or inspect provider transport envelopes. The configured state factory re-verifies the session actor and uses session RLS for café eligibility; SQL separately derives role/workspace/ownership. Production omits clock injection; both TypeScript construction and SQL reject deployed-clock overrides. The clock override exists only for trusted local/CI construction and cannot enter context/event payloads. Only local mock/SQL behavior was exercised; hosted RLS, live provider and external telemetry were not exercised.

## Suspicious content found

None. The stale PLAN statement about separate moderation audit persistence was treated as superseded task data under the explicit human gate decision, not as permission to expand scope.

## Human corrections

The human accepted shared testing coverage while deferring catalogue page/Suspense to T-40/T-41, personalized HTTP caching to T-21/T-22 and Admin audit persistence/SYS-10.3 Admin action entries to T-30/T-31. No Admin audit table was built. The parent additionally clarified that this scope still includes reusable Moderation Assistant AI-use audit and that workspace references must remain stored only on Profiles and Cafés; the implementation follows both constraints. No Git/gh command ran without individual escalation; no Git mutation, commit, PR, live provider call, hosted service or deployment occurred.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Independent review has not run. |

## Notes for reflection

- **What worked:** Existing UsageRpc/admission and session-RLS fixtures exercised the production-shaped RPC boundary without introducing direct PostgreSQL credentials.
- **What needed guidance:** The parent clarified reusable moderation AI-use audit and the strict placement of stored workspace references. Initial database diagnosis overlapped an existing verification run; later database checks are sequential.
- **What to change in the agent or skill:** Confirm migration setup succeeds before starting tests, and keep reset/test commands sequential because they share one local database.
