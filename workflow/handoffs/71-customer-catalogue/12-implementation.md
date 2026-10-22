# Implementation report

- **Agent:** implementation
- **Issue:** #72 / T-41 fix round for R1-F01–R1-F03
- **Spec IDs:** CUS-01.5, CUS-02.1, CUS-02.4; shared customer query/read/HTTP contracts
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 31608a9ddf0bda46877419285fe9e0e8f682138c
- **Status:** done

## Summary

Continued the same implementation fix round after 11-spec.md resolved the shared-file scope prerequisite. Historical 10-implementation.md remains unchanged. The prototype-safe parser, full-microsecond review order/serialization, and explicit JSON unsupported-method responses from the first fix attempt are retained.

The second attempt integrates original-query validation before Next's parsed-object URL reconstruction loses __proto__. `skipProxyUrlNormalize` gives the proxy the original URL; a catalogue-only helper applies the existing per-endpoint query schemas there. It deletes any caller-supplied internal validation-result header and always writes its own valid/invalid flag for every matching catalogue GET. The route consumes the invalid flag only after its unchanged Auth/session and Customer role checks, then repeats normal query parsing. No caller-supplied original-URL assertion is used. The existing account-route bypass, Auth refresh, original-cookie preservation, request cookie forwarding and response cookie/header propagation are unchanged.

An explicit `/api/customer/cafes/:path*` matcher covers these APIs even when an opaque café reference has an asset suffix excluded by the original general matcher. Thus those direct detail paths cannot evade flag replacement through the asset exclusion.

Repair cycles across this same fix round: **2 of 3 used**, comprising report 10's first app fix plus this proxy/runtime integration and paired recheck. No acceptance tests, fixtures, mocks, test configuration or migrations changed. Full verification and unrelated suites are deferred under the exact human one-off exception quoted below.

Final-code lint/typecheck and all 20 paired Vitest cases pass. The paired browser suite passes 71/71 in 1.5 minutes, including all 27 new regressions and all 44 existing catalogue cases. Status done follows the human one-off exception for implementation/paired verification; it does not claim a full-suite pass, independent acceptance or merge approval.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| R1-F01 / CUS-01.5 prototype-sensitive original query validation | done | All twelve strict-query regression cases pass, including all six single/duplicate __proto__ HTTP cases across browse/detail/reviews and six controls. |
| R1-F02 / CUS-02.4 original instant precision/order/paging | done | All three final precision regressions pass: original .123001/.123999 UTC instants, page-one/page-two boundary and browser Next reviews navigation. |
| R1-F03 / shared unsupported mutation-method responses | done | All twelve final method regressions pass across three endpoints and POST/PUT/PATCH/DELETE, including JSON envelope, correlation reference, private/no-store, Allow and safe-content checks. |
| Existing paired catalogue behaviors | done | Final 20 Vitest and all 44 pre-existing catalogue browser cases pass; current eligibility, role/workspace scope, ratings, filters, card/hours, review visibility and inert text retained. |
| Full verification | deferred | Explicit human one-off exception; no current-code full-suite pass is claimed. |

## Files changed

New continuation changes:

- `next.config.ts`: enable original proxy URL handling for strict query validation before framework loss.
- `src/proxy.ts`: invoke the catalogue-only query marker and explicitly include all catalogue API paths in the matcher; existing account/session transport logic is retained.
- `src/server/catalogue/proxy-query.ts`: classify only the three GET schemas, validate the original URL query, sanitize and replace the internal result flag.
- `src/server/catalogue/http.ts`: after independent Auth/Customer checks, reject the proxy-derived invalid-query flag with the existing safe 400 envelope.
- This new report.

The retained first-attempt changes in 10-implementation.md are `src/lib/catalogue/query.ts`, `src/server/catalogue/source.ts`, `src/server/catalogue/http.ts`, and the three catalogue route modules. They provide preassignment allowlists, lossless microsecond normalization/string ordering and four explicit unsupported mutation-method exports per route.

Preserved all seven customer-story cross-reference diffs, PLAN reconciliation/scope update, 108 contract report, 03/11 spec reports, 04–10 historical reports, and the testing owner's new regression file/09 report. No tests, fixtures, mocks, dependencies, other documentation, unrelated authentication behavior, Git index or commits changed.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run lint` | passed | Exit 0 on final app/config changes. |
| `bun run typecheck` | passed | Next route type generation and TypeScript exit 0. |
| `bun run test -- tests/unit/catalogue tests/integration/catalogue` | passed | 5 files / 20 cases in 2.39s. |
| `bun run test:e2e -- tests/e2e/catalogue` | passed | 71/71 in 1.5m, exit 0, including all 27 new regressions and all 44 existing catalogue cases, no skips. Existing production application/harness builds and starts succeed, with source/artifact isolation checks. |
| `git diff --check` | passed | No tracked whitespace errors. |
| Installed Next proxy documentation and runtime/matcher inspection | completed | Original-URL flag, request-header forwarding and explicit matcher support read before shared integration edits; coverage of opaque asset-suffix café references addressed. |
| `bun run verify`, unrelated unit/integration/browser suites | not run | Explicitly deferred under the human one-off exception; not passed. |

Every Node-based command uses the real Node24 PATH export in the same shell before Bun scripts. Local Supabase and disabled/fake AI only. Browser testing follows the focused Vitest suite serially. No .env files, hosted databases, live AI calls or network Git operations.

## Open issues for the next step

No unresolved assigned implementation finding remains after the final paired pass. No current-code full verification or independent fix review has occurred; both remain explicitly deferred under the human one-off sequence. No extra test command was run after the paired success.

SR-01 in 08-security-reviewer.md is a pre-existing P2 direct reviews-table identifier disclosure outside this fix assignment. It remains unmodified. That historical assessment reports no introduced vulnerability and no P0/P1; it predates this ordinary-review fix and is not represented as a fresh security assessment. The coordinator retains the supplied one-off sequence through documentation before broader verification/review.

The earlier intermittent existing auth-prefetch baseline observation remains recorded in 05-testing.md; no unrelated fix or harmlessness claim is made here. The current focused suite does not test the entire application/auth harness.

## Suspicious content found

None newly encountered. Installed documentation and earlier reports were treated as implementation evidence, not permission to broaden the scope beyond 11-spec.md and the coordinator's assignment.

## Human corrections

The coordinator relayed these exact one-off human exceptions:

> For now, do not run the full test suite. Only run the necessary test cases to show failure before implementation starts. handoff should state the status as done to allow the next agent to work. This exception is only for this case right now to save time

> After implementation, also only run the test cases written for the paired specs. After security review, if no major issues are found, do not run ANY test cases. Proceed to documentation agent immediately. Only run the full test suite after documentation agent has sucessfully changed the necessary files. Once again these are once off exception to save time.

Only the assigned 20-case catalogue Vitest and 71-case catalogue browser suites, plus allowed lint/typecheck, run for this continuation. Full verify is deferred, not passed. The report uses Status: done after actual paired completion, without implying a full-suite pass, final independent review, PLAN status change or merge approval.

The scope prerequisite in report 10 was resolved by 11-spec.md naming next.config.ts/src/proxy.ts for this narrow integration; no public contract or permission changed.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| 07-reviewer.md | R1-F01 | fixed | Explicit per-schema allowlist plus original-query proxy validation, sanitized result flag and direct API matcher coverage. All twelve strict-query regressions pass. Route authentication still precedes query error responses. |
| 07-reviewer.md | R1-F02 | fixed | Full original fractional instant survives UTC normalization and complete timestamp ordering before page slicing; all three final precision/order/page-navigation regressions pass. |
| 07-reviewer.md | R1-F03 | fixed | Shared safe 405 correlation/error JSON, no-store and Allow across three routes and four mutation verbs; all twelve final method regressions pass. |

## Notes for reflection

- **What worked:** Separating early original-input validation from later authenticated response handling preserves the existing access boundary while retaining erased query information.
- **What needed guidance:** The spec owner explicitly resolved shared runtime file ownership without changing the approved public behavior.
- **What to change in the agent or skill:** Include proxy matcher exclusions in any assessment of internal request metadata; sanitize caller values and retain independent route authorization.

## Final boundary

All agent-owned processes finished. The paired 20-case Vitest and 71-case browser suites pass, along with lint/typecheck. Two of three repair cycles were used across reports 10/12. No full verify or unrelated test suite was run, and none is claimed as passing on the changed code. No post-success test/review/security command was launched. Historical reports, acceptance tests/fixtures/mocks/configuration, specs, PLAN and unrelated work are preserved. No commits/index changes, new agents, hosted database, live AI or .env access. The local diff is ready for the coordinator’s next authorized stage.
