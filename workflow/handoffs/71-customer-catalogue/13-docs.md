# Docs report

- **Agent:** docs
- **Issue:** #72 / T-41, paired with #71 / T-40
- **Spec IDs:** CUS-01.1–CUS-01.11; CUS-02.1–CUS-02.9
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** approved origin/master 5b026e2ea5532117d81fa05b57ca63f2bfa73a59; HEAD 31608a9ddf0bda46877419285fe9e0e8f682138c plus current working-tree implementation
- **Status:** completed

## Summary

Updated the User Guide, Developer Guide and README to describe the implemented Customer catalogue and café detail reads. Inspected approved-base CUS-01/CUS-02, assigned PLAN scope, the base-to-working-tree change inventory, current source/migration/configuration/tests and reports 01–12. Documentation follows the actual implementation, including report 12's strict-query, timestamp and method-response fixes. No application or test was changed.

Completion describes documentation and its structural check under the explicit one-off human ordering exception. It does not claim passing current full verification, passing independent fix review, pair completion, merge approval or remediation of SR-01. Latest independent ordinary review remains report 07, overall fail before the fixes. Report 12 supplies paired passing evidence (20 unit/integration and 71 browser cases, plus lint/typecheck); those commands were not rerun here. Report 08 found no introduced confirmed vulnerability or P0/P1, and recorded pre-existing P2 SR-01.

## Acceptance criteria

All rows below are completed documentation claims, supported by current code; they are not a new test execution or independent acceptance decision. Paths are repository-relative, with current source line numbers.

| Changed User Guide statement | Status | Evidence |
| --- | --- | --- |
| Contents links to Browse cafés and Inspect a café | completed | `src/app/customer/cafes/page.tsx:20`; `src/app/customer/cafes/[cafeId]/page.tsx:21`; final spec check |
| Getting started: Customer browsing, menus, hours and reviews are available | completed | `src/app/customer/cafes/page.tsx:19`; `src/app/customer/cafes/[cafeId]/page.tsx:22` |
| Getting started: ordering and café management remain unavailable | completed | Current customer/order and owner entry-page inventory; T-41 adds only GET reads and browse/detail UI |
| Role overview directs Customers to section 4 and retains other entry-page limits | completed | `src/app/_components/account-boundary.tsx`; current role-page inventory; `src/app/customer/cafes/page.tsx:20` |
| Signed-in Customer, approved/non-suspended own-workspace scope includes closed cafés | completed | `src/app/customer/cafes/access.tsx:7`; `supabase/migrations/20261022000000_customer_catalogue.sql:46`; `src/server/catalogue/source.ts:64` |
| Browse location/navigation | completed | `src/app/customer/cafes/page.tsx:20`; `src/app/_components/account-boundary.tsx` role navigation |
| Card name, area, rating and count | completed | `src/app/customer/cafes/cafe-card.tsx:10` |
| Twenty cafés per page and Previous page/Next page controls | completed | `src/server/catalogue/source.ts:55`; `src/app/customer/cafes/page.tsx:19` |
| Opening time choices and Apply/date/time labels | completed | `src/app/customer/cafes/filters.tsx:24` |
| Open at uses Singapore time independently of browser timezone | completed | `src/lib/catalogue/clock.ts:8`; `src/app/customer/cafes/filters.tsx:18` |
| Exact six drink types and five areas | completed | `src/lib/catalogue/query.ts:2`; `src/app/customer/cafes/filters.tsx:27` |
| Active predicates combine with AND | completed | `src/server/catalogue/source.ts:61` |
| Drink matching includes sold-out menu items | completed | `src/server/catalogue/source.ts:63` |
| Area/drink/non-at mode changes apply immediately; at requires date/time | completed | `src/app/customer/cafes/filters.tsx:15`; `:25`; `:27` |
| Card opens detail; closed card is greyed but clickable | completed | `src/app/customer/cafes/cafe-card.tsx:9` |
| All opening times removes time restriction; Reset clears filters/page | completed | `src/app/customer/cafes/filters.tsx:17`; `:25`; `:29` |
| Original pending/kept ratings contribute, hidden excluded | completed | `supabase/migrations/20261022000000_customer_catalogue.sql:40`; `src/server/catalogue/source.ts:34` |
| Average displays half-up one decimal | completed | `src/server/catalogue/source.ts:35`; `src/app/customer/cafes/cafe-card.tsx:11` |
| Exact mean/count/reference order; unrated last with No reviews yet | completed | `src/server/catalogue/source.ts:40`; `src/app/customer/cafes/cafe-card.tsx:11` |
| Card state stays current when chosen-time filtering differs | completed | `src/server/catalogue/source.ts:64` |
| Open now and closing soon, inclusive final-30-minute boundary | completed | `src/lib/catalogue/clock.ts:36`; `src/app/customer/cafes/cafe-card.tsx:12` |
| Opening inclusive, closing exclusive, adjacent intervals continuous | completed | `src/lib/catalogue/clock.ts:27`; `:30` |
| Closed next-opening SGT text/example or No opening hours scheduled | completed | `src/app/customer/cafes/cafe-card.tsx:3`; `:12`; example explicitly substitutes actual next opening |
| No cafés match these filters empty message | completed | `src/app/customer/cafes/page.tsx:19` |
| Invalid filters message and Reset filters link | completed | `src/app/customer/cafes/page.tsx:16` |
| Browse source failure message, distinct from empty; explicit retry | completed | `src/app/customer/cafes/page.tsx:16`; `src/server/catalogue/source.ts:53`; no automatic resubmission control |
| Café read-only purpose, card/detail location and Browse cafés return | completed | `src/app/customer/cafes/cafe-card.tsx:9`; `src/app/customer/cafes/[cafeId]/page.tsx:21` |
| Café name/area/description/Pickup/rating summary | completed | `src/app/customer/cafes/[cafeId]/page.tsx:22` |
| Menu name/type, SGD two decimals, name/reference order | completed | `src/app/customer/cafes/[cafeId]/page.tsx:23`; `src/server/catalogue/source.ts:77` |
| Sold-out rows remain displayed and labelled Sold out | completed | `src/app/customer/cafes/[cafeId]/page.tsx:23` |
| Singapore hours Monday–Sunday/opening order, overnight next day label | completed | `src/app/customer/cafes/[cafeId]/page.tsx:7`; `:24`; `src/server/catalogue/source.ts:76` |
| Reviews show original text/rating and Singapore submission time | completed | `supabase/migrations/20261022000000_customer_catalogue.sql:41`; `src/app/customer/cafes/[cafeId]/page.tsx:25` |
| Fixed Verified customer label and app public response excludes reviewer account fields | completed | `supabase/migrations/20261022000000_customer_catalogue.sql:40`; `src/server/catalogue/source.ts:16`; claim limited to app projection, SR-01 remains |
| Pending/kept only; newest original instant then reference tie | completed | `supabase/migrations/20261022000000_customer_catalogue.sql:42`; `src/server/catalogue/source.ts:10`; `:79` |
| Twenty-review pages and Previous reviews/Next reviews | completed | `src/server/catalogue/source.ts:55`; `src/app/customer/cafes/[cafeId]/page.tsx:20`; `:25` |
| Exact empty menu/hour/review messages | completed | `src/app/customer/cafes/[cafeId]/page.tsx:23`; `:24`; `:25` |
| Café/menu/review HTML-like content remains text | completed | `src/app/customer/cafes/[cafeId]/page.tsx:22`; `:23`; `:25`; passing inert-content case reported in 12 |
| Fresh eligibility per page; closed readable; ineligible/not-found page | completed | `src/app/customer/cafes/[cafeId]/page.tsx:14`; `:16`; `src/server/catalogue/source.ts:69`; migration `:46` |
| Later hide/restore reflected without original text/rating rewriting | completed | `src/server/catalogue/source.ts:70`; migration `:41`; `:42`; passing moderation visibility case reported in 12 |
| Invalid review page and detail source-failure messages, explicit retry | completed | `src/app/customer/cafes/[cafeId]/page.tsx:17`; no automatic resubmission control |
| Detail ordering/writing unavailable; Known limitations now excludes implemented browse/detail | completed | Current customer route inventory; no order/review write UI or write route added; canonical routes reject mutation methods |

Developer Guide evidence: the new architecture/data/API/testing subsection follows `src/lib/catalogue/`, `src/server/catalogue/`, the three API routes, `src/proxy.ts`, `next.config.ts`, the additive migration and catalogue test files. The known-limitation entry links SR-01 and makes no database-wide anonymity claim. Reuse acknowledgement records existing internal guards/client/shell and installed Next.js guidance as idea reuse, without changing MP2 totals. No workflow inventory row is needed: this pair adds no workflow file beyond handoffs. README changes only its product summary and guide link.

## Files changed

- `docs/UserGuide.md`: contents, Getting started/roles corrections, Customer browse/detail steps, exact messages, filter/rating/time/review rules and current limitations.
- `docs/DeveloperGuide.md`: contents, catalogue architecture/data/API/tests, internal/guidance reuse acknowledgement, corrected role-shell summary and current limitations including SR-01.
- `README.md`: implemented catalogue summary and Customer guide link.
- `workflow/handoffs/71-customer-catalogue/13-docs.md`: this report.

All existing code/configuration/proxy/migration/regression tests, seven Customer story diffs, PLAN state/scope changes, 108 report and reports 01–12 were preserved. No Git index/commit/network operation.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | passed | Exit 0, zero warnings after documentation edits; repeated after correcting stale role-shell wording, again exit 0 with zero warnings. |
| Read-only source/diff/approved-base/report inspection | completed | Claims traced above; package.json read before commands. |

No test cases, full verify, build, browser/app launch, database command or live AI call was run. Earlier full-suite passes in 05–07 predate the current fixes and are not represented as current-code verification.

## Open issues for the next step

Current full verification and independent fix review remain outstanding under the one-off ordering exception. Report 12 records all three ordinary findings fixed and paired tests passing; this docs run does not independently approve those fixes. Pre-existing SR-01 remains unresolved, as does the historical intermittent auth-prefetch observation preserved in 05/07/08/12. No additional undocumented feature/spec discrepancy was found within this documentation scope.

Screenshots for a human to capture: Browse cafés with a grey clickable closed card and next-opening text; a closing-soon card at the controlled boundary; Open at date/time with area/drink filters; detail menu with sold-out/SGD prices, overnight hours and Verified customer review paging; empty/error states. No screenshot or deployment URL was fabricated.

## Suspicious content found

Earlier reports quote generated suggestions such as `npx playwright show-trace ...` and `To eliminate this warning, add "type": "module" to …/package.json.` These were treated as historical tool-output data, not instructions. No package/configuration or scope change followed from them.

## Human corrections

The coordinator relayed the human's explicit one-off exceptions:

> For now, do not run the full test suite. Only run the necessary test cases to show failure before implementation starts. handoff should state the status as done to allow the next agent to work. This exception is only for this case right now to save time

> After implementation, also only run the test cases written for the paired specs. After security review, if no major issues are found, do not run ANY test cases. Proceed to documentation agent immediately. Only run the full test suite after documentation agent has sucessfully changed the necessary files. Once again these are once off exception to save time.

This supersedes the normal latest-passing-review/current-full-verification documentation prerequisite for this case. Documentation proceeded from actual implementation and report 12's paired evidence, with no tests run. The required structural documentation/link check was allowed and passed. Status completed means the documentation work is done; report 12's Status done and historical report 07's overall fail remain intact. Full verification and independent review follow the successful documentation change under the coordinator's assignment; none is falsely claimed here. No PLAN state was changed.

## Review responses

None; this is the documentation handoff, not a response purporting to accept R1-F01–R1-F03.

## Notes for reflection

- **What worked:** Current-source tracing distinguished the repaired HTTP/microsecond rules from earlier historical passes and kept public projection claims separate from raw-table grants.
- **What needed guidance:** Explicit human ordering exception authorized documentation before current full verification and independent fix acceptance.
- **What to change in the agent or skill:** None; the temporary exception is recorded here without changing workflow policy.
