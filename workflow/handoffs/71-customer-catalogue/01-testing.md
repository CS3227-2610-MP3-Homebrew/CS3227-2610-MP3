# Testing report

- **Agent:** testing
- **Issue:** #71 / T-40
- **Spec IDs:** CUS-01.1–CUS-01.11; CUS-02.1–CUS-02.9
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 5b026e2 (origin/master)
- **Status:** incomplete

Test cases are authored for every assigned criterion, but full verification remains incomplete because the required script stalls and browser cases include setup/runtime failures. Expected missing-implementation failures remain active; no implementation work is authorized in this stage.

## Summary

Authored criterion-named catalogue/detail acceptance tests from the approved origin/master CUS-01/CUS-02 and their integration/technical contracts. No application, migration, specification, PLAN, documentation or dependency changes. Existing customer-spec edits and the #108 spec handoff were preserved. Only T-40's PLAN body was extracted; no implementation task or implementation/reviewer report was read.

The suite contains 20 focused Vitest cases and 44 Playwright cases. The focused Node run reports 20 expected missing-implementation failures. The initial 43-case Node browser run reports 40 failures and three passing protected-page/shell cases. Several browser cases stop at absent public schema fields or transient local database/tooling errors, so their downstream behavior assertions have not executed. This is test-authoring evidence, never evidence that the product criteria pass.

## Acceptance criteria

All rows describe completed case authoring. Failure boundaries and unexecuted assertions remain explicit below.

| Criterion | Status | Evidence (test title or family; intended outcome) |
| --- | --- | --- |
| CUS-01.1 | completed | `exact mean sorting precedes displayed rounding, count and reference ties, with half-up precision`; `all eligible open/closed cafes paginate 20...`; `visible ratings...hide/restore`; source-outage route cases. HTTP reads currently 404. |
| CUS-01.2 | completed | Seven `Singapore opening/30-minute/closing boundary` cases; overnight Sunday/week wrap, adjacent continuity and absent-hours cases. Fixed instants include opening inclusive and closing exclusive. Missing clock module. |
| CUS-01.3 | completed | `chosen Singapore minute converts to UTC independently of host timezone`; browser `Open at converts Singapore minute...` verifies canonical UTC query and exclusive closing. Clock module/area schema absent. |
| CUS-01.4 | completed | Six exact drink-type sold-out match cases, active area/time AND and a nonmatching type. Area schema absent before assertions. |
| CUS-01.5 | completed | Five exact area cases and 17 strict query rejection cases covering case/whitespace, nullable-string, incompatible time fields, invalid date/precision, invalid page syntax/overflow and duplicate/unknown keys. Query cases had mixed missing-route and local tooling failures; area setup lacks area field. |
| CUS-01.6 | completed | `direct and stale reads repeat indistinguishable current eligibility checks`; browser closed-card navigation. Initial browse is 404, later stale assertions unreached. |
| CUS-01.7 | completed | Isolated kit catalogue versus foreign kit; added main/kit bidirectional list/detail case. Main/kit targeted run fails on the absent catalogue endpoint (404). |
| CUS-01.8 | completed | Anonymous/owner/admin JSON cases and browser protected-page/static-shell cases; import-graph session-client/Suspense inspection and an actual render with the session-client source deliberately unresolved. Browser shell cases all pass; APIs absent. |
| CUS-01.9 | completed | Two synchronous card cases assert canonical Singapore text/empty schedule and enabled link; fixed clock next-opening cases; browser grey/dim clickable closed card. Card module/area schema absent. |
| CUS-01.10 | completed | Above/at/below 30 minutes, closing instant and adjacent continuity; two card label cases. Missing clock/card modules. |
| CUS-01.11 | completed | `closed unscheduled card remains clickable, Open now removes it, removal and Reset restore all`; unavailable area schema prevents browser assertions. |
| CUS-02.1 | completed | Public exact detail projection, Unicode menu order, integer-cent S$ display, canonical hour order, rating summary, empty collections and safe source failure. Detail endpoint/area schema absent. |
| CUS-02.2 | completed | `public detail shows cents, sold-out items...` asserts both sold-out and available rows. Area fixture fails before menu/UI assertions. |
| CUS-02.3 | completed | Timezone-independent conversion and browser timezone America/Los_Angeles, Singapore weekly/overnight hours. Clock/area missing. |
| CUS-02.4 | completed | Pending/kept-only exact public review projection, newest/reference pagination, hidden/foreign exclusion and empty collection cases. Review endpoint absent; one pagination attempt failed fixture SQL before HTTP. |
| CUS-02.5 | completed | Local hide/restore state mutations with subsequent list/detail/review reads and unchanged original content. Initial reviews endpoint 404; state changes not reached. |
| CUS-02.6 | completed | Missing/pending/rejected/suspended/foreign direct detail and reviews reads must all yield 404 NOT_FOUND. Initial eligible browse 404 prevents later assertions. |
| CUS-02.7 | completed | Suspension between initial list/detail and subsequent direct reads. Initial browse 404 prevents suspension phase. |
| CUS-02.8 | completed | HTML/instruction text in description/menu/reviews, no injected image or execution, original stored review unchanged. Area setup failure precedes rendering. |
| CUS-02.9 | completed | Three API role cases, three passing browser/static-shell role cases, source graph scope check. APIs absent; page-shell controls pass. |

## Files changed

- `tests/unit/catalogue/clock.test.ts`: fixed Singapore time policy cases.
- `tests/unit/catalogue/card.test.tsx`: deterministic synchronous card text/link cases.
- `tests/integration/catalogue/source.test.ts`: canonical GET route source failures through existing mocked auth/session-client boundaries; no new domain read API.
- `tests/integration/catalogue/streaming.test.ts`: actual browse Page/Layout rendering with an unresolved session client; expects shell emission before catalogue source readiness. Fails because the heading-only browse page performs no source read.
- `tests/integration/catalogue/rendering.test.ts`: page import graph reaches session-bound client, existing role shell reaches Suspense, no use-cache directive in reachable page graph. This inspection is supplementary: it cannot alone prove streamed response timing.
- `tests/e2e/catalogue/fixtures.ts`: synthetic local fixture adapters and canonical HTTP reads, reusing existing account/moderation setup.
- `tests/e2e/catalogue/http.spec.ts`: catalogue/detail/review HTTP contracts.
- `tests/e2e/catalogue/pages.spec.ts`: public page/filter/inert-text/static-shell flows.
- This handoff.

No dependencies added. Fixture field aliases are schema setup adapters, not a new domain schema contract. Missing fields are reported explicitly rather than added by tests. Fixtures persist synthetic isolated workspaces, following the existing append-only-review/audit fixture convention.

## Interfaces defined by tests

Black-box HTTP/page routes and schemas come directly from the approved integration contract. Two smaller seams are necessary for fixed time boundaries and synchronous card output:

1. `src/server/catalogue/clock.ts`: `openingState(hours: {weekday:number, opensAt:string, closesAt:string, closesNextDay:boolean}[], now:string): {isOpen:boolean, closingSoon:boolean, nextOpeningAt:string|null}`; `singaporeMinuteToInstant(date:string, minute:string): string`. Inputs are trusted explicit clock instants, never caller authorization or a replacement for the database clock in Open now reads.
2. `src/app/customer/cafes/cafe-card.tsx`: default synchronous React component with `{cafe: CafeCard}` props, using the approved CafeCard schema. Exact label/link assertions follow CUS-01.

The source-outage tests mock existing `getVerifiedActor` and `createSessionClient` exports. Browser selectors use accessible time/area comboboxes, labelled date/time inputs, Apply and Reset actions; these accessible control shapes are test interaction assumptions, not additional spec-owned field names. The visual grey check accepts grayscale/dimming; a different compliant CSS treatment would require test adaptation. Card cases avoid browser clock manipulation; boundary arithmetic uses fixed instants. The browser chosen-date case derives a date two Singapore days after the local database clock so its scheduled interval is deterministically closed now, then queries a fixed 09:00 Singapore opening on that date.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` (initial) | failed typecheck | Four implicit-any callbacks; corrected by typed catalogue response. |
| `bun run verify` (subsequent bare runs) | interrupted at Vitest | Lint and typecheck passed; Vitest printed RUN but no file results for several minutes. Agent-owned runs interrupted (exit 130). Chained traceability/spec/build not reached. |
| `bun run db:check` | failed in sandbox | Local database catalogue unavailable. |
| `bun run db:start` (escalated) | passed | Local Supabase start succeeded; generated credentials omitted. No hosted service or live AI used. |
| `bun run test:e2e` | failed collection | Existing and new TS files report AggregateError/Unexpected ! under Bun. Production web servers build/start before collection failure; no browser case ran in this bare attempt. |
| `bun run test:e2e -- tests/e2e/catalogue` | failed collection | Same Bun loader issue. Baseline moderation-only list also fails, confirming repository/runtime-wide problem. |
| Bundled Node Playwright `--list tests/e2e/catalogue` | passed | 43 initial cases collected. |
| Bundled Node Vitest `run tests/unit/catalogue tests/integration/catalogue` | expected failure | 5 files failed; 20 tests failed; no unhandled errors. Eleven missing clock module, four missing card module, three missing routes, one browse import graph lacks session client, one streaming probe finds no request-scoped read. |
| Bundled Node Playwright `test tests/e2e/catalogue --workers=1` | failed | Initial 43 cases: 40 failed, 3 passed in 2.5 minutes. The final added main/kit case ran separately and failed on framework 404. Public routes return framework 404, public area column is absent, some local account SQL/Supabase worker setup failures occurred. Three anonymous/owner/admin static-shell cases pass. |
| `bun run check:traceability` | passed | 32 done tasks; all listed criteria have test titles. |
| `bun run check:specs` | passed | 0 warnings. |
| `git diff --check` | passed | No whitespace errors. |
| Final `bun run lint` / `bun run typecheck` | passed | Both exited 0 after the streaming probe was added. |
| Bundled Node Playwright main/kit targeted case | expected failure | One failed; eligible kit list expected 200 and received framework 404. Main-account phase was not reached. |
| Final bare `bun run verify` with bundled Node on PATH | interrupted | Lint/typecheck passed; again stalled after Vitest RUN. Interrupted exit 130. Chained traceability/spec/build not reached. This run preceded the final one-case streaming probe; final lint/typecheck and focused Node Vitest verify that addition separately. |

Bundled Node path: `/Users/taiayovelapang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`. A temporary shell wrapper outside the repository added its bin directory to PATH for final required-script verification; no runtime/package configuration was changed. This did not resolve the Bun-script runner failures: final bare verify again stalled after Vitest RUN and was interrupted (exit 130); a script-based targeted browser run still failed collection. Direct Node runner commands succeed in collecting/executing cases. The Bun-only focused run additionally exposed a jsdom EventTarget worker error for the card tests; direct Node Vitest removes it.

## Open issues for the next step

- Catalogue implementation, public menu/hour/profile fields, canonical routes and detail page are absent. Expected failing tests remain active. Pair is unready to merge.
- A missing route or missing fixture field is failing-first evidence of absent implementation, not evidence that downstream behavior assertions executed.
- Local Supabase/SQL availability failures during some browser workers are tooling/setup failures, not product assertion results. They are not counted as expected implementation failures.
- The actual streaming probe is now present and fails at the absent source read. Its subsequent pending-source assertions cannot run until catalogue data access exists. Successful delayed catalogue streaming is therefore still unverified.
- T-41 was not read, started or edited. Human review and test commit remain the next workflow gate.

## Suspicious content found

None.

## Human corrections

Coordinator relayed explicit human authorization for T-40 only despite the paired task status; stop after testing for human review/test commit. Uncommitted customer-story changes were treated as cross-reference reconciliation; behavior came from origin/master.

## Review responses

None.

## Notes for reflection

- **What worked:** Canonical route/public schemas supplied exact observable assertions without inventing a domain read module.
- **What needed guidance:** Bundled Node location from coordinator resolved Bun-specific browser collection and jsdom worker errors.
- **What to change in the agent or skill:** Expose the installed Node runtime on PATH for Bun scripts that invoke Node-based test runners; record environment/runtime separately from product failures.
