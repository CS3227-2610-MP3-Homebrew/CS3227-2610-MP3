# Implementation report

- **Agent:** implementation
- **Issue:** #72 / T-41 fix round for R1-F01–R1-F03
- **Spec IDs:** CUS-01.5, CUS-02.1, CUS-02.4; shared customer query/read/HTTP contracts
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 31608a9ddf0bda46877419285fe9e0e8f682138c
- **Status:** awaiting-decision

## Summary

Applied a first focused fix attempt for all three review findings. R1-F02 and R1-F03 now pass their regressions: review timestamps preserve original PostgreSQL microseconds and order across the page boundary, and all three routes return the required private JSON 405 envelope for POST/PUT/PATCH/DELETE. The repaired strict parser rejects special keys when received directly, but the real HTTP cases reveal Next.js removes __proto__ before constructing the route request. All six such requests still return 200, while the other 65 paired browser cases pass.

The missing prerequisite is scope for the framework integration needed before that information is lost. The assigned ownership is only catalogue application code and its additive migration; `next.config.ts` and the shared `src/proxy.ts` are outside that narrowed assignment. Neither was edited. No test, fixture, mock, configuration, existing report, specification or PLAN was changed.

One repair cycle used (focused app fixes followed by targeted verification); two remain if this same fix round continues with the needed integration scope. Full verify and unrelated suites were deliberately not run under the human's one-off exception. A done handoff cannot yet honestly be claimed because R1-F01 still fails six paired cases.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| R1-F01 / CUS-01.5 prototype-safe strict queries | awaiting-decision | The parser directly rejects all six single/duplicate special-key inputs across browse/detail/reviews. Actual HTTP still fails those six cases because the framework strips the key first; integration scope is needed. |
| R1-F02 / CUS-02.4 full original timestamp precision/order/paging | completed | All 3 new precision regressions pass: exact original .123001/.123999 UTC instants, API page boundary, and browser Next reviews navigation. Existing moderation, exact ties and review projection cases also pass. |
| R1-F03 / shared 405 JSON boundary on all three routes | completed | All 12 POST/PUT/PATCH/DELETE regression cases pass the exact envelope, private/no-store JSON, Allow and nonreflection assertions. |
| Paired existing behavior | completed | All 44 pre-existing catalogue browser cases and all 20 catalogue unit/integration cases pass. |
| Full verification | deferred | Explicit human one-off exception; no full-suite pass is claimed for this code. |

## Files changed

- `src/lib/catalogue/query.ts`: validate per-mode allowed keys before any object assignment; retain duplicate checks and Zod field validation.
- `src/server/catalogue/source.ts`: validate ISO source timestamps, normalize only whole-second timezone data through Date, preserve original fractional microseconds, and compare fixed-precision UTC strings before reference ties/pagination.
- `src/server/catalogue/http.ts`: shared safe unsupported-method JSON response, fresh correlation reference, Cache-Control and Allow.
- All three `src/app/api/customer/cafes/**/route.ts` modules: explicit POST/PUT/PATCH/DELETE exports using the shared rejection response.
- This new report.

No migration change was needed for the precision fix. Existing seven story cross-reference diffs, PLAN reconciliation, 108/03 spec reports, historical 04/06/07/08 reports, and the testing owner's new regression file/09 report were preserved. No Git index/commit/network operations.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run lint` | passed | Exit 0. |
| `bun run typecheck` | passed | Next route type generation and TypeScript exit 0. |
| `bun run test -- tests/unit/catalogue tests/integration/catalogue` | passed | 5 files / 20 cases, 2.17s. |
| `bun run test:e2e -- tests/e2e/catalogue` | failed | 65 pass / 6 fail, 71 total, 1.6m. The six remaining failures are single/duplicate __proto__ on browse/detail/reviews; all 12 method and all 3 precision regressions pass; all existing catalogue cases pass. Production application/harness builds and starts, source/artifact isolation succeed. |
| Read-only direct parser probe after fix | passed | All six special-key inputs throw INVALID_REQUEST across the three modes. |
| Read-only installed Next source/docs inspection | diagnostic confirmed | `shared/lib/router/utils/querystring.js` accumulates parsed URL keys in a plain object; `next-server.js` reconstructs normalized proxy URLs from that query by default. Proxy receives initURL only when skipProxyUrlNormalize is enabled. |
| `git diff --check` | passed | No tracked whitespace errors. |
| `bun run verify`, unrelated full tests/browser suites | not run | Deferred by the explicit one-off human exception, not passed. |

Testing used the explicit real Node24 PATH export in the same shell before Bun scripts. Local Supabase and disabled/fake AI only; no .env files, hosted databases or live AI. No database suites ran concurrently.

## Open issues for the next step

**Exact scope decision:** authorize the narrow R1-F01 integration in `next.config.ts` and `src/proxy.ts`, plus the already-owned catalogue HTTP/helper code. Installed Next documentation says skipProxyUrlNormalize enables access to the original URL at the proxy boundary. The integration would validate only the three catalogue GET query schemas there, overwrite/delete an internal validation-result header on every relevant request, forward that result, and let the route consume it only after its existing session/role checks. That preserves authorization/error ordering and stops reliance on already-normalized route URLs. No new public contract, authentication policy or test change is needed. Current assignment does not authorize those shared-file edits, so no such edits have been made.

The final browser output confirms all six remaining failures are 200 versus expected 400. Ordinary unknown and duplicate controls pass. The observed detail __proto__ failures, despite an empty query allowlist, confirm the key disappears before application parsing; a parser-only change cannot recover it.

SR-01 in 08-security-reviewer.md is a pre-existing P2 raw reviews table-column disclosure outside this fix assignment. It was not remediated. That assessment reports no introduced vulnerability and no P0/P1; it is historical assessment evidence, not an independent review of the current fixes. The earlier intermittent baseline auth-prefetch observation remains in 05-testing.md and is not attributed to the catalogue fixes.

Independent final review and full verification remain deferred under the supplied one-off workflow. No historical pass is represented as validating the changed code.

## Suspicious content found

Generated Playwright output suggests `npx playwright show-trace ...`; it was treated as tool-output data, not an instruction to change package manager or run extra tooling.

## Human corrections

The coordinator relayed these exact one-off human exceptions:

> For now, do not run the full test suite. Only run the necessary test cases to show failure before implementation starts. handoff should state the status as done to allow the next agent to work. This exception is only for this case right now to save time

> After implementation, also only run the test cases written for the paired specs. After security review, if no major issues are found, do not run ANY test cases. Proceed to documentation agent immediately. Only run the full test suite after documentation agent has sucessfully changed the necessary files. Once again these are once off exception to save time.

The paired 20-case Vitest and 71-case browser suites were the only suites run. Lint/typecheck were allowed fast checks. Failing-first evidence was read from 09-testing.md (21 expected failures, 6 controls); a read-only direct-parser probe additionally confirmed the parser defect before this fix. Status is awaiting-decision because six product regressions remain and the necessary integration exceeds the assigned file ownership; it is not a false done claim.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| 07-reviewer.md | R1-F01 | partially fixed; blocked on file scope | Explicit allowlist closes the application accumulator defect. Framework normalization also loses the key before route parsing, requiring the scoped integration above. |
| 07-reviewer.md | R1-F02 | fixed | Preserve original fractional instant and compare complete canonical UTC strings; all three new precision/pagination/navigation cases pass. |
| 07-reviewer.md | R1-F03 | fixed | Shared explicit 405 JSON handlers across three routes; all twelve mutation-method cases pass. |

## Notes for reflection

- **What worked:** Existing new black-box precision/method cases verify both fixes without test edits or database changes.
- **What needed guidance:** The failing HTTP special-key cases exposed an additional framework normalization boundary beyond the parser probe.
- **What to change in the agent or skill:** Compare raw-boundary and route-boundary inputs when a fixed strict parser still accepts malformed HTTP requests; do not guess erased input or trust caller-supplied original-URL headers.

## Final boundary

All agent-owned processes finished. No test/config/proxy/spec/PLAN edits, no independent review launch, no new agents, no commits/index changes, no hosted services/live AI/.env access. The narrow application fixes and this report remain reviewable locally.
