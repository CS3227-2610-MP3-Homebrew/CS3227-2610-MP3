# Implementation report

- **Agent:** implementation (single-agent mode, coordinating Claude Code session)
- **Issue:** [#119](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/119) — PLAN.md T-63 (pair with testing issue #118, T-62)
- **Spec IDs:** OWN-06.1–OWN-06.11, OWN-07.1–OWN-07.16
- **Date:** 2026-10-22
- **Branch:** feat/118-owner-sales-prep
- **Base commit:** eddd083, then merged with feat/115-owner-order-queue (testing commits 7584209, 50fd8cc, 99572af and 07e7c25)
- **Status:** completed

## Summary

Single-agent mode. This session wrote the T-62 tests, the T-63 implementation, the self-review below and the docs. No independent `review.sh` round ran.

**Sales Dashboard (OWN-06).** `GET /api/owner/sales` and `/owner/dashboard` read `public.owner_sales`, a SECURITY INVOKER function under session-bound RLS. A sale is an own-café `collected` order, dated by the Singapore date of `collected_at` and measured only from retained order and line snapshots. The Dashboard shows three views over the 28 business dates ending today:
- daily order count and revenue, with zero-filled days
- the top 10 items by quantity, then revenue, then reference, named by their latest retained name
- weekday totals

An owner with no café gets `sales: null` and the no-café state. A source failure returns 503, never zeros.

**Prep Advisor (OWN-07).** `POST /api/ai/prep-advisor` checks, in order:
1. the exact Origin
2. the strict `{cafeId, refresh}` body (shared `readAiRequest`)
3. the verified session and the owner role
4. `public.owner_prep_source`, which re-authorizes the café against the owner and workspace and returns `NOT_FOUND` otherwise

The source is aggregate-only. It covers the 28 completed dates before today, needs at least 7 distinct sale dates, ranks at most 10 current-menu candidates, and returns seven zero-filled weekday rows for each. Insufficient data gives the `no_source_data` fallback, or `disabled` when AI is off. Otherwise the shared `runOperation` handles admission, cache, provider, validation and audit, with the café and business date as cache scope.

`src/server/llm/schemas.ts` adds the OWN-07.16 direction rule to result validation, in exact BigInt arithmetic: `more` needs 7 × the weekday quantity to exceed the item's total, and `less` needs it to fall below. One failing suggestion rejects the whole result, which falls back. The panel renders item names from the authorized sales read, server-quoted reasons as inert text, the empty-advice state, a bounded manual refresh, and typed fallbacks with the top-items table. No suggestion is ever applied.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| OWN-06.1–OWN-06.11 | completed | `owner_sales` daily/top/weekday aggregation, `ownerSalesSchema`, `salesGet` and the Dashboard page. Tests: `tests/e2e/owner-sales/sales.spec.ts`, 14 passed. |
| OWN-07.1, OWN-07.8 (browser) | completed | `PrepPanel` disabled fallback with top items and no apply action. Tests: `sales.spec.ts` Prep panel cases. |
| OWN-07.2, OWN-07.8–OWN-07.12 | completed | `createPrepHandler` gate order and typed fallbacks. Tests: `tests/integration/prep-advisor/route.test.ts`. |
| OWN-07.3, OWN-07.12, OWN-07.15 | completed | `owner_prep_source` authorization, aggregate-only input, sufficiency and candidate ranking. Tests: `tests/integration/prep-advisor/source.test.ts`, 9 passed. |
| OWN-07.4, OWN-07.5, OWN-07.10, OWN-07.13, OWN-07.16 | completed | Shared result validation plus the new direction check. Tests: `tests/integration/prep-advisor/validation.test.ts` and `tests/integration/llm`. |
| OWN-07.6, OWN-07.7, OWN-07.14 | completed | Shared `runOperation` cache and refresh semantics, scoped by café and business date. Tests: `tests/integration/prep-advisor/cache.test.ts`. |

## Files changed

- `supabase/migrations/20261023000200_owner_sales.sql`: `private.sales_owner`, `private.sale_lines`, `public.owner_sales` and `public.owner_prep_source`, all invoker reads, with execute granted to `authenticated` only.
- `src/server/owner/sales.ts`: sales and Prep source adapters with strict decoding, plus the sales route logic.
- `src/server/owner/prep-advisor.ts`: Prep Advisor handler.
- `src/app/api/owner/sales/route.ts` and `src/app/api/ai/prep-advisor/route.ts`: route handlers.
- `src/server/llm/schemas.ts`: the OWN-07.16 direction-consistency check.
- `src/app/owner/dashboard/{page,prep-panel,sales-presentation}.tsx`: Dashboard sales views and the Prep panel.
- `docs/UserGuide.md` and `docs/DeveloperGuide.md`: owner sales and Prep Advisor sections.
- Test corrections, committed separately:
  - `test(OWN-07)` 7584209 aligns the T-14 Prep fixture in `tests/integration/llm/contracts.ts` with OWN-07.16. Its "more" suggestion broke the direction rule.
  - `test(OWN-07)` 07e7c25 converts the loop-generated OWN-07.9 and OWN-07.14 cases in `route.test.ts` and `cache.test.ts` to `test.each` with literal `%s` titles. `check:traceability` ignores interpolated titles, so those criteria counted as uncovered. The assertions are unchanged.
  - `test(OWN-07)` 99572af fixes `tests/integration/prep-advisor/source.test.ts`. E17 inserted line quantity 50, which the `order_items` 1–20 quantity check rejects, so the fixture failed before reaching its assertion; it now uses 20. Each database-backed source test also gets a 60 s timeout, following `seeds.test.ts`, because each fixture order spawns several local `psql` calls and the tests overran Vitest's 5 s default.

## Self-review

I reviewed against `workflow/agents/reviewer.md` and the review skill's criteria. Because this is an AI endpoint, I also applied the baseline checks in `workflow/agents/security-reviewer.md` and the OWN-07 evaluation cases.

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| SR-1 | P2 | Five Prep source tests failed: one fixture violated the quantity check, and the others overran the 5 s timeout. | Test-only correction 99572af; all 9 pass. |
| SR-2 | — | Trust boundary. The request body carries only `cafeId` and `refresh`. Ownership and workspace are re-checked in SQL under RLS. Provider context is the aggregate input only, with no order IDs, customer data or other cafés (E11 canary test). The output passes strict evidence and direction validation before display, and model text never selects the item name. No route writes domain data. Errors use the shared safe messages, and non-POST methods return 405. | No change. |
| SR-3 | — | Item names are owner-controlled labels and do reach the provider. They are treated as data under the shared T-14 prompt and render as inert text (E09). | No change. |
| SR-5 | P2 | On a café with no sales, the Prep fallback's empty top-items table repeated the Dashboard's "No completed sales in the last 28 days.". `OWN-06.11` then failed intermittently, whenever the async panel rendered before the assertion. | `TopItemsTable` takes an `emptyText` prop, and the Prep fallback shows "No sold items to show yet." |
| SR-4 | P3 | `owner_sales` picks the owner's café with `order by c.id limit 1`. OWN-01 allows one pending or approved café per owner, so the result is deterministic. | No change; noted. |

No P0 or P1 finding remains open.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` (from this worktree) | pass | "Local Supabase reset succeeded." |
| `bunx vitest run tests/integration/prep-advisor tests/integration/owner-sales tests/unit` | 5 failed before 99572af; pass after | `source.test.ts` "Tests 9 passed (9)" after the fix |
| `bunx playwright test tests/e2e/owner-sales` | pass | "14 passed" |
| `bun run verify` (before the merge) | pass (exit 0) | Vitest "Test Files 66 passed (66); Tests 1197 passed (1197)"; "Traceability passed"; "Spec check passed (0 warning(s))."; build compiled |
| `bun run verify` (merged tree, before SR-5) | pass (exit 0) | Vitest "Test Files 71 passed (71); Tests 1250 passed (1250)"; "Traceability passed (51 done tasks; …)"; "Spec check passed (0 warning(s))."; build compiled |
| `bun run test:e2e` (merged tree, before SR-5) | fail | "1 failed, 719 passed": `OWN-06.11` strict-mode duplicate text (SR-5) |
| `bun run lint`, `bun run typecheck` (after SR-5) | pass | eslint clean; "Types generated successfully" |
| `bunx playwright test tests/e2e/owner-sales --repeat-each=3` (after SR-5) | pass | "42 passed" |
| `bun run test:e2e` (final merged tree) | pass (exit 0) | "720 passed (2.4m)" |

## Open issues for the next step

- T-63 depends on T-54 (PR #158), T-60 (PR #165) and T-57, the menu pair, which has not started. `bun run check:specs` rejects a `done` T-63 until all three are `done`, so T-63 stays `blocked`. T-62 can close. This branch stacks on feat/115-owner-order-queue.
- Excluding archived menu items from Prep candidates waits for OWN-13; today only rows still in `menu_items` qualify.

## Suspicious content found

None.

## Human corrections

- The human chose single-agent mode for this pair.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None (self-review above) | — | — | — |

## Notes for reflection

- **What worked:** Real-database source tests exercised the SQL ranking, sufficiency and authorization directly, and the E11 canaries made the aggregate-only boundary checkable.
- **What needed guidance:** A fixture that broke a schema CHECK was reported only as "fixture SQL failed; details omitted". Finding the cause meant reading the live constraints.
- **What to change in the agent or skill:** The testing skill should tell authors to check fixture values against schema CHECK constraints, and to set explicit timeouts for tests that create many rows through `localSql`.
