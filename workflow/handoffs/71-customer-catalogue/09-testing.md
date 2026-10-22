# Testing report

- **Agent:** testing
- **Issue:** #71 / T-40 additional contract regressions
- **Spec IDs:** CUS-01.5, CUS-02.1, CUS-02.4; linked customer query/read and shared HTTP contracts
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 31608a9ddf0bda46877419285fe9e0e8f682138c (existing uncommitted application implementation is an input)
- **Status:** done

## Summary

Authored 27 black-box browser-runner HTTP/page regression cases from approved origin/master CUS-01/CUS-02 and their linked INTEGRATION-SPEC query, original submission ordering and application-owned JSON HTTP conventions. No application implementation or existing test was changed. This run does not assess the separately scoped raw-review-column security concern.

Only T-40's PLAN task body was extracted. Handoff filenames were listed solely to choose the next number; no implementation, reviewer or security-reviewer report contents or T-41 task body were read. Existing application/SQL/PLAN/spec/report changes were preserved. Human review and commit of these new tests remain the stage boundary before implementation fixes.

## Acceptance criteria

| Criterion / linked contract | Status | Evidence / expected result |
| --- | --- | --- |
| CUS-01.5 strict query keys | done | All 12 cases authored/run: 6 ordinary unknown/duplicate/undeclared controls pass; 6 single/duplicate __proto__ cases return 200 instead of required 400. Includes empty detail query allowlist. |
| CUS-02.4 original submission ordering | done | All 3 cases fail at expected product assertions after database precision proof passes: older low-reference row appears at item 20, public timestamp truncates to .123Z, and later review is absent from browser page one. |
| CUS-02.1 / CUS-02.4 / CUS-01.5 with shared HTTP boundary | done | All 12 unsupported-method cases receive 405 but fail because Cache-Control is absent instead of private,no-store. Exact JSON/Allow/safe-message assertions remain active but are not reached after that first failure. No HEAD/OPTIONS policy is asserted. |

## Files changed

- `tests/e2e/catalogue/contracts-regression.spec.ts`: all 27 new cases and its minimal local precision fixture.
- This new report.

No existing test, application, migration, runtime/test configuration, specification, PLAN, documentation, dependency or earlier report edits. No skip, assertion weakening, commit or index operation. No new application module interface.

## Criterion-to-case evidence

- Twelve strict-query cases: four each for browse, detail and reviews. Three endpoint families each include `unknown=x`, `__proto__=x`, `__proto__=x&__proto__=y`; browse/reviews additionally cover `page=1&page=2`, while detail covers the undeclared `page=1` field. Every failure expects the exact shared 400 error envelope/no-store JSON boundary through the existing failure helper.
- Twelve unsupported-method cases: each endpoint family crossed with POST, PUT, PATCH and DELETE. Requests have an authenticated Customer, same-origin header and JSON body, avoiding unrelated auth/Origin/media failures. The response must advertise GET and must not advertise the unsupported verb. It may advertise framework-supported HEAD/OPTIONS: no new policy or exact Allow list is invented. Submitted text, target café/name and account identifiers must not appear in the error body.
- `CUS-02.4: original sub-millisecond submission order determines the 20-review page boundary before reference ties`: 19 newer reviews occupy the first 19 positions. The later microsecond review must be page-one item 20; the earlier one must be the only page-two item. Stable UUID suffixes 000000000001 (earlier) and 000000000002 (later), scoped to a fresh random café prefix, deliberately make reference ordering disagree with timestamp ordering. A truncating implementation cannot pass by random reference order.
- `CUS-02.4: public review UTC timestamps retain the original microsecond instants`: both pages are read together independently of ordering and the original UTC instants are asserted without JavaScript Date conversion. Equivalent trailing fractional zeros are allowed; millisecond truncation is not.
- `CUS-02.4: café review navigation preserves original sub-millisecond ordering across pages`: the later original review is visible on the first page and the earlier one absent, then Next reviews reaches page=2 where the earlier one appears and later one is absent.

The precision fixture verifies PostgreSQL retained both original six-digit fractional instants via a local SQL projection before any application read. Existing fixture overrides insert the deterministic pair references; fixture setup never round-trips those timestamps through JavaScript Date. All other generated reviews use an equal newer timestamp and the specified ascending reference tie order.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Explicit Node24 PATH export, then `bun run verify` exactly | interrupted by explicit human override | Exit 130 after agent sent SIGINT. Lint/typecheck passed; Vitest had printed RUN but no final result summary. Traceability, spec check and build stages in this verify chain were not reached. This does not validate the new Playwright cases. |
| Explicit Node24 PATH export, then `bun run test:e2e -- tests/e2e/catalogue/contracts-regression.spec.ts` | expected failing-first result | Exit 1: 27 cases run with 4 workers, 21 expected product failures and 6 passing controls in 1.5 minutes. No skips, fixture/SQL/auth/tooling failures or unhandled runner errors. Production test-server build/start succeeded as part of this focused command, independently of the unrun verify build stage. |

Runtime setup before Node-based scripts:

```sh
export PATH=/Users/taiayovelapang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
bun run verify
```

Per the explicit one-time human exception, full verification was stopped and only the 27-case new regression file is run. The interrupted verify session exited before that focused browser command started; whole-catalogue and unrelated full suites are not run. No live AI, hosted database or agent .env-file access is used. Docker/server commands use normal escalation. Prior 974/172 passes from earlier reports do not validate the 27 newly authored cases.

## Open issues for the next step

Status done refers only to regression test authoring under the explicit one-time human exception, not product correctness or passing verification. All 21 failures are expected product-contract failures; no testing setup or execution failure remains in the focused run. Application behavior was not fixed and the pair is not ready to merge from this evidence alone.

Observed failing boundaries:

1. Browse, detail and reviews each accept both `__proto__=x` and `__proto__=x&__proto__=y` with HTTP 200 rather than 400 INVALID_REQUEST (6 cases). The error-envelope/no-store assertions after status are consequently unreached in those cases. Ordinary unknown-key cases, duplicate valid page keys and the forbidden detail page query all pass (6 controls).
2. All 12 POST/PUT/PATCH/DELETE requests get HTTP 405, but `Cache-Control` is undefined rather than `private, no-store`. That is the observed first failure. The later JSON content type/body/requestId/Allow/safe-content assertions remain in the tests but did not execute after the header failure; they are not claimed independently verified.
3. All three precision fixture SQL assertions pass, proving PostgreSQL retained `2026-01-01T00:00:00.123001Z` and `2026-01-01T00:00:00.123999Z`. The HTTP page sizes and hasNextPage assertions pass, but page-one item 20 is the older stable reference ending `000000000001`, not the later one ending `000000000002`. Public later submittedAt is `2026-01-01T00:00:00.123Z`, failing the original microsecond instant assertion. The browser cannot find the later original review on page one; its subsequent Next reviews navigation assertions are unreached. No fixture error is counted as a product failure.

Unused checks under the one-time exception: no completed full Vitest result, no verify-chain traceability/spec/build result, no whole-catalogue 71-case run, and no unrelated full e2e suite. No follow-up broad checks or retries were performed after the focused result. Prior 974/172 pass evidence remains historical and does not validate these new regressions.

## Suspicious content found

None. No implementation/review/security report contents were read.

## Human corrections

Coordinator assigned only these three contract regression groups and authorized new test authoring before the implementation fix round. The human subsequently gave this exact one-time exception:

> For now, do not run the full test suite. Only run the necessary test cases to show failure before implementation starts. handoff should state the status as done to allow the next agent to work. This exception is only for this case right now to save time

The active full verify was immediately interrupted (130). Whole-catalogue/full-suite plans were cancelled. Only the new focused regression file is executed, and this report uses Status: done exactly as requested for test-authoring completion. No PLAN status is changed and no passing product/full-suite claim follows from that status.

After the focused result, the human supplied a second exact one-time workflow exception:

> After implementation, also only run the test cases written for the paired specs. After security review, if no major issues are found, do not run ANY test cases. Proceed to documentation agent immediately. Only run the full test suite after documentation agent has sucessfully changed the necessary files. Once again these are once off exception to save time.

No further test command was run after this exception. Full checks are deferred to the post-documentation stage under that human instruction; this testing report does not certify a later implementation, review or security result. No previous review/security report or PLAN status was edited.

## Review responses

None.

## Notes for reflection

- **What worked:** Existing public routes and synthetic local fixtures yielded 21 deterministic product failures and 6 passing controls, without an application seam or fixture failure.
- **What needed guidance:** The narrowly assigned gaps identify contract areas; tests were derived from approved master behavior rather than report contents.
- **What to change in the agent or skill:** Precision fixtures should deliberately oppose timestamp and reference ordering and prove original database precision before exercising pagination.

## Final boundary

All agent-owned sessions finished: interrupted verify exited 130 before the focused browser run began; focused browser runner exited 1 with the documented expected failures. Only the new regression file and this report were authored. Existing tests, application/migration/spec/PLAN/report changes and the Git index were preserved. No implementation fix or commit was made. Human review/commit of the new tests is the next stage boundary.
