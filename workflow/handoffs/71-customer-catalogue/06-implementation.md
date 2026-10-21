# Implementation report

- **Agent:** implementation
- **Issue:** #72 / T-41, paired with #71 / T-40
- **Spec IDs:** CUS-01.1–CUS-01.11; CUS-02.1–CUS-02.9
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 31608a9 (approved contracts on origin/master 5b026e2)
- **Status:** completed

## Summary

Resumed T-41 after the human committed the testing owner's corrected streaming and protected-shell harnesses in 31608a9. The earlier 04-implementation.md remains unchanged as historical evidence. The application and migration are unchanged from that run; no further implementation repair was needed. This run adds only this new report, preserving all testing-owned files and unrelated local changes.

The implementation supplies customer browse/detail pages and canonical catalogue, detail and public-review GET routes; strict query validation; Singapore opening states and filters; exact visible-rating order and one-decimal half-up display; public menu/hour/review projections; and additive database fields with a session-RLS snapshot read. The read RPC is SECURITY INVOKER. Its narrow review/café predicate does not grant access to another customer's orders or identity. Closed cards stay clickable and dimmed; source failures remain safe failures. No catalogue caching, AI call or unrelated owner/Admin feature was added.

The corrected testing handoff 05-testing.md reports full verify passing 974/974 and a final full browser pass of 172/172 on this unchanged application tree. This run independently ran exactly `bun run verify` with the real Node24 PATH: exit 0, 44 files / 974 tests pass in 492.45 seconds, with lint, typecheck, traceability, spec validation, production build and source/client-artifact isolation all passing. The latest full browser result is reused because neither application nor testing code changes in this run. T-41 implementation and verification are completed; this is not independent review or merge approval.

Repair cycles this resumed run: **0**. No supplementary tests were authored. The prior run's three repair cycles remain documented in 04-implementation.md and were not silently reset within that run.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| CUS-01.1 | completed | `tests/e2e/catalogue/http.spec.ts`: exact unrounded mean/count/reference order, half-up display, null ratings, 20-row pagination, eligible open/closed projection and moderation changes. Latest full browser evidence in 05-testing.md passes. |
| CUS-01.2, CUS-01.10 | completed | `tests/unit/catalogue/clock.test.ts`: opening/closing boundaries, exact final-30-minute edge, overnight/week boundary, adjacent intervals and absent hours. Included in passing 05 full verify and this run's full verify. |
| CUS-01.3 | completed | `tests/e2e/catalogue/pages.spec.ts`: Singapore chosen minute conversion under America/Los_Angeles, open-at selection versus current closed card state; clock unit test independently varies host timezone. |
| CUS-01.4, CUS-01.5 | completed | Catalogue HTTP tests cover all six drink enums, sold-out matches, five areas, AND filtering and strict unknown/duplicate/time/page rejection. |
| CUS-01.6, CUS-01.7 | completed | Catalogue HTTP tests verify current/stale eligibility and main/kit isolation; later page/API reads do not treat browse results as authorization. |
| CUS-01.8, CUS-02.9 | completed | Corrected `streaming.test.ts` proves shell emission with unresolved session-RLS read and no actor/workspace content. Browser anonymous/owner/Admin cases reject stored café/menu/review/account sentinels in raw HTML and rendered DOM on browse and detail. JSON role/session denial cases also pass. |
| CUS-01.9, CUS-01.11 | completed | Card unit and browser page cases verify canonical next-opening/no-schedule text, greyed clickable cards, Open-now removal, removal/reset restoration and no AI requests. |
| CUS-02.1, CUS-02.2, CUS-02.3 | completed | Detail API/browser cases verify exact public fields, menu/hour order, integer cents rendered to two decimals, sold-out rows and Singapore hours. |
| CUS-02.4, CUS-02.5 | completed | HTTP cases verify original pending/kept review projection, hidden exclusion, fixed anonymous author label, newest/reference pagination, and hide/restore without rewriting originals. |
| CUS-02.6, CUS-02.7 | completed | HTTP missing/pending/rejected/suspended/foreign and stale reads share NOT_FOUND while later catalogue eligibility is refreshed. |
| CUS-02.8 | completed | Detail browser case renders attack strings as inert unchanged text; no injected image/script and no review content mutation. |
| Required implementation verification | completed | Fresh exact `bun run verify` passes all stages, 974/974 tests. Relevant latest full browser evidence: 172/172 passes, 05-testing.md, unchanged application/tests. |

All assigned criteria have passing evidence. No implementation acceptance gap or outstanding spec decision remains. Independent reviews have not yet run.

## Files changed

This resumed run changes only `workflow/handoffs/71-customer-catalogue/06-implementation.md`.

The reviewable T-41 application diff from the earlier run remains:

- `src/app/customer/cafes/page.tsx`, `access.tsx`, `cafe-card.tsx`, `filters.tsx`, `[cafeId]/page.tsx`.
- `src/app/api/customer/cafes/route.ts`, `[cafeId]/route.ts`, `[cafeId]/reviews/route.ts`.
- `src/server/catalogue/{source,http,clock,query}.ts`.
- `src/lib/catalogue/{clock,query}.ts`.
- `supabase/migrations/20261022000000_customer_catalogue.sql`.

Preserved the existing PLAN status reconciliation, seven customer-story cross-reference additions, 108-owner-customer-contracts/02-spec.md, 71-customer-catalogue/03-spec.md and all historical reports. No tests, fixtures, mocks, configuration, dependencies, specs, PLAN, other documentation, Git index or commits changed in this run.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Explicit Node24 PATH export, then `bun run verify` exactly | passed | Exit 0. Lint/typecheck; 44 files / 974 tests in 492.45s; traceability (32 done tasks); spec check (0 warnings); optimized production build; source and artifact isolation (114 client artifacts). Local Supabase only. |
| Relevant full `bun run test:e2e` (testing-owner evidence reused) | passed | 05-testing.md final unchanged full replay: 172/172, 2.7m; all 128 baseline and 44 catalogue cases, no skips. No application/test changes since that run. |
| `git diff --check` | passed | No whitespace errors. |

The Node24 runtime directory is prepended to PATH in the same shell before invoking the Bun script. No .env files are read, no hosted database is used, and no live AI calls are made. Database verification runs serially with browser testing. Report-only edits do not invalidate the unchanged-code evidence.

## Open issues for the next step

None blocking implementation completion. Independent implementation review and security review are pending; completion does not imply their approval or set PLAN tasks done.

The testing handoff records an earlier intermittent existing auth-harness failure: SYS-05.2 invalid-session prefetch once retained the protected fixture region after a cookie change (171/172 first full run). The unchanged focused case then passed, followed by the unchanged full 172/172 replay. Its cause remains undetermined; it is not dismissed as harmless route metadata. Evidence is preserved in 05-testing.md and `/tmp/t40-05-baseline-initial/`. This implementation run makes no unrelated auth/test change.

The historical raw-renderer context and caller-path blanket assertions in 04-implementation.md were corrected by the testing owner without changing the approved protected-content contract. The stronger stored-record/actor assertions now pass. No spec decision remains outstanding for T-41.

## Suspicious content found

None newly encountered. Testing handoff content was treated as evidence, not permission to edit tests or expand implementation scope.

## Human corrections

The human committed the corrected testing files and explicitly resumed the coordinator workflow. The coordinator assigned this verification/handoff continuation, with unchanged application code and preserved historical reports.

## Review responses

None; independent review has not yet run.

## Notes for reflection

- **What worked:** Corrected raw-render context and distinct protected-record markers make the existing session-RLS implementation observable without changing product behavior.
- **What needed guidance:** The coordinator confirmed the unchanged full browser evidence could be reused while this agent reruns the mandatory exact verify command.
- **What to change in the agent or skill:** Preserve original failure evidence and distinguish caller-supplied route metadata from protected stored content; keep the separate auth-harness intermittency visible.

## Final stage boundary

The agent-owned verification process finished with exit 0. Application, migrations and tests remain unchanged during this continuation; only this new report was authored. No commits, index changes, independent review launch, hosted database access, live AI calls or .env file access. The local application diff is ready for independent review. Historical 04-implementation.md remains unchanged.
