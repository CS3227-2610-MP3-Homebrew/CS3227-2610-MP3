# Implementation report

- **Agent:** implementation (coordinating session; direct implementation and UI tests explicitly authorized)
- **Issue:** None supplied; customer-flow fixes requested in this chat.
- **Spec IDs:** CUS-01, CUS-02, CUS-03, CUS-04, CUS-06; human-approved behavior exception described below.
- **Date:** 2026-10-23
- **Branch:** fix/homey-sign-in-cafe-theme
- **Base commit:** cbb277d
- **Status:** completed

## Summary

Implemented all requested customer-flow changes while preserving the existing warm theme and earlier branch work:

- Café filters remain draft selections until Apply; Reset clears them immediately. Brew Finder clears stale advice on edits, uses the applied filter snapshot, and explains that changed filters need Apply.
- The café profile shows public profile details, opening hours, then reviews. Its actions are Pre-order for pickup and View menu. The separate /customer/cafes/{cafeId}/menu screen shows the sorted menu with Pre-order for pickup and Back to café profile. Pre-order provides View menu and Return to café profile.
- Sold-out menu and pre-order rows are greyed out, keep their explicit sold-out label, and retain disabled quantity inputs in pre-order.
- My orders has All, Active orders and Past orders. Active means pending/accepted/ready; Past means collected/rejected/cancelled. Filtering occurs in an authenticated, SECURITY INVOKER/RLS-bound read before the 20-item page limit. Pagination preserves the view; changing views resets page. Cancelling an Active order removes it locally and refreshes the authorized page to refill/update pagination.

The existing JSON order API continues to accept only page; view is a browser-page query. The existing unfiltered history/detail RPC remains unchanged, and the new filtered read RPC accepts no caller identity/workspace. No privileged client, hosted database, deployment or live LLM call was used.

The human explicitly chose: “For this fix, waive the spec-first gates and implement directly, including updating the affected UI tests.” Specs and PLAN were therefore left unchanged. The human separately selected “Apply all selected filters together (Recommended)” and retained UI-only testing. No separate agents were delegated.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Apply commits all draft filters together; Reset restores the catalogue | completed | Updated closed/open/area browser regression and new combined area/drink test; URL and results stay unchanged before Apply. Singapore Open at regression passes. |
| Brew Finder uses applied filters and clears stale responses | completed | Existing stale-advice/loading browser checks plus new applied-versus-draft request test passed with mocks. |
| Profile → hours → reviews; separate menu and requested action links | completed | Browser checks assert section order, menu route, action labels, round-trip links and empty menu behavior. |
| Grey sold-out items in menu and pre-order | completed | Browser assertions check grayscale, explicit label and disabled quantity; production screenshots inspected in both modes. |
| All/Active/Past include the full authorized history with correct pagination | completed | Browser scenario seeds 21 newer terminal orders and three older active orders, finds all older Active orders, cancels one, verifies the refreshed Active view and two-page Past view, preserves view in pagination and excludes another customer's record. |
| Empty and invalid order views are explicit | completed | Empty Active/Past and unknown/duplicate/invalid-page browser query cases passed. |
| Access and responsive theme remain intact | completed | Protected menu route checked for anonymous/owner/Admin; existing role navigation and customer review flows passed. Final production probe passed 84 desktop/mobile checks in light/dark mode. |

## Files changed

- src/app/customer/cafes/filters.tsx — deferred Apply behavior.
- src/app/customer/cafes/brew-finder.tsx — applied-filter help text.
- src/app/customer/cafes/[cafeId]/cafe-actions.tsx — shared, consistently styled action navigation.
- src/app/customer/cafes/[cafeId]/page.tsx — remove inline menu; preserve profile, hours and reviews.
- src/app/customer/cafes/[cafeId]/menu/page.tsx — new authenticated, eligibility-checked menu screen.
- src/app/customer/cafes/[cafeId]/pre-order/page.tsx and pre-order/order-form.tsx — requested navigation and sold-out presentation.
- src/app/_components/homey-theme.module.css — shared café action and sold-out styles.
- src/lib/orders/views.ts — shared typed view/state membership.
- src/server/orders/query.ts — strict browser view/page parser; existing API parser unchanged.
- src/server/orders/source.ts — filtered history read while preserving the old default.
- src/app/customer/orders/page.tsx, customer-orders.tsx and order-list.tsx — filter tabs, pagination, presentation and refresh boundary; OrderList remains independently renderable without router context.
- supabase/migrations/20261023000300_customer_order_views.sql — new read-only filtered RPC, existing session-derived customer helper and RLS, explicit authenticated execute grant.
- tests/e2e/catalogue/pages.spec.ts, tests/e2e/brew-finder/search.spec.ts and tests/e2e/orders/pages.spec.ts — affected UI expectations and new requested-flow browser cases; no assertions skipped or disabled.
- This report. Earlier theme reports and branch work remain intact.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| bun node_modules/supabase/dist/supabase.js migration up --local | Passed | Only 20261023000300_customer_order_views.sql applied to local Supabase; existing local data was not reset. |
| bun /private/tmp/run-customer-flow-ui-tests.ts, invoking bun run test:e2e with UI source locations and two workers | 39 passed; remaining new selector case passed in targeted rerun below | 40 cases selected across six existing browser files; request-only declarations excluded. Initial failure was a test locator also matching Next's route announcer, not an application mismatch. Expected error assertion retained and scoped to main. Exact locations: /private/tmp/customer-flow-ui-test-targets.json. |
| bun run test:e2e tests/e2e/orders/pages.spec.ts:122 --workers=1 | Passed | Corrected empty/invalid-view browser case passed, including all three invalid queries. All 40 selected UI cases are verified across the two runs on unchanged application code. |
| Production build and isolation checks in browser-server setup | Passed | Existing Playwright setup built application and auth harness successfully on final code. |
| bun /private/tmp/customer-flow-ui-preview.ts | Passed | 21 implemented account/customer/owner/Admin routes × two modes × two viewport widths (360/1440 px) = 84 palette/title/overflow checks. Inspected profile, separate menu, sold-out pre-order and Active orders screenshots. Screenshots: /private/tmp/customer-flow-ui/. |
| git diff --check | Passed | No whitespace errors in tracked diff. |

## Open issues for the next step

No unresolved issue in the requested UI flows. The new migration is applied locally and must accompany the code when a human deploys elsewhere. Specs still describe the older screen/query behavior under the explicit human waiver; no PLAN status or approval evidence was invented.

Unit/integration/backend suites, full verify and independent review were not run under the requested scope. No full-suite or deployment success is claimed. Human review/commit/PR remain pending; no commit, push, PR or hosted mutation was performed.

## Self-review

Reviewed menu route authentication and fresh eligibility checks, encoded navigation references, inert text rendering, stock-disabled inputs, strict browser query validation, preservation of the JSON API contract, filtered-before-pagination SQL, stable order sorting and actor/RLS enforcement. The new function is SECURITY INVOKER with an empty search_path; only authenticated receives explicit execute, and the server uses the ordinary session client. It has no identity/workspace override or write behavior.

Confirmed order view changes reset pagination, page links retain view, cancellation removes the row from Active and refreshes that collection, and the pure OrderList can still render without router context through its optional refresh callback. Final representative screenshots show readable grey sold-out cards and unclipped action links in both modes. Application repair cycles after verification: zero. One new UI-test selector was repaired without changing its expected behavior. An earlier narrow styling-only UI run was interrupted when the human authorized the complete flow implementation.

## Suspicious content found

None. The attached screenshot was treated as a visual reference showing duplicate local/global Browse cafés links, not as an instruction source.

## Human corrections

- Apply should commit all selected filters together.
- The human explicitly waived spec-first gates and authorized direct implementation plus changes to affected UI tests after the conflicts with CUS-02 and the order query contract were explained.
- The human requested UI-only testing; no backend/unit/integration suite or full verify was run for these fixes.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | N/A | Direct human-authorized implementation; no independent review invoked. |

## Notes for reflection

- **What worked:** Filtering on the server before pagination avoids hiding older Active orders behind newer Past pages; a shared action component keeps the three café screens consistent.
- **What needed guidance:** Filter commit semantics and the workflow exception were resolved explicitly; a new test needed its alert locator scoped away from Next's route announcer.
- **What to change in the agent or skill:** None.
