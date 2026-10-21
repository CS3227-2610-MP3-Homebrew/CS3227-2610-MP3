# Testing report

- **Agent:** testing
- **Issue:** #58 / T-28; paired implementation #59 / T-29
- **Spec IDs:** ADM-01.1–ADM-01.13; ADM-02.1–ADM-02.13
- **Date:** 2026-10-22
- **Branch:** feat/58-cafe-applications-suspension
- **Base commit:** c4a46f497443c7eaff765d59b7eedf0a910825c2 (upstream/master and HEAD)
- **Status:** completed

## Summary

Single-agent mode, testing stage only. Authored 132 production-browser/HTTP cases
and 11 Vitest cases from the approved stories and linked contracts. Browser
initial failing-first result: 126 expected failures and six passing role gates. The three
local database permission/history cases pass independently and in the full suite.
Initial `bun run verify` passed lint/typecheck, then stopped at eight expected
missing-Route-Handler failures (957 tests passed). No feature implementation or
PLAN status changes were made. Test authoring is completed; the pair is incomplete
pending the human's test commit and implementation.

Before the test commit, human review identified four cases reaching Owner-pair
runtime surfaces. Those cases now arrange resubmission/collection through local
contract fixtures and assert private-reason/continued-owner access through direct
RLS reads. Only Admin routes/pages are exercised. The correction and its latest
verification results are recorded under Human corrections.
The correction's complete `bun run verify` again passed lint/typecheck and
reported 957 passed / eight expected missing-route failures (344.39s).

## Acceptance criteria

The status below describes **test authoring**, not implemented feature acceptance.
All cases retain their assertions; there are no skips or expected-failure annotations.
File keys: H = `tests/e2e/cafe-eligibility/http.spec.ts`,
S = `tests/e2e/cafe-eligibility/screens.spec.ts`,
R = `tests/integration/cafe-eligibility/routes.test.ts`,
P = `tests/integration/cafe-eligibility/permissions.test.ts`.
Every test title carries its criterion IDs. Parameter values and operation/main/kit
contexts in the source distinguish each generated case.

| Criterion | Status | Evidence (Given / When / Then cases) |
| --- | --- | --- |
| ADM-01.1 | completed | S: “only workspace rows … 20-row URL pagination and stable ties”, “empty list … retains previous/next controls”, “application details and reason confirmation …”. Pending-only queue; submitted time then reference; 21 eligible records, page reload, Previous/Next, foreign-workspace exclusion, application fields and confirmation. |
| ADM-01.2 | completed | H: main/kit approve “pending decision commits exact response and one attributable audit; customer RLS changes”; S: confirmed Approve removes row. Exact 200 JSON/private headers and customer eligibility. |
| ADM-01.3 | completed | Same H family with reject, and S confirmed Reject. Exact rejected response, hidden from customer and one reject audit. |
| ADM-01.4 | completed | H: seven invalid and three valid Unicode/whitespace reason variants per operation; S: real approve/reject audit preserves exact text and escapes markup. |
| ADM-01.5 | completed | H: anonymous/customer/owner denials with unchanged snapshots. R: actual decision POST absent-session/wrong-role checks before domain source access. P: raw SQL cannot self-approve. |
| ADM-01.6 | completed | H: main/kit “foreign and absent targets are indistinguishable”; same response apart from requestId, no target/audit effects; includes opaque and 128-code-point references. |
| ADM-01.7 | completed | H: kit approve/reject follows same transaction and audit assertions as main; S: workspace queue excludes foreign records; real audit uses authenticated workspace scope. |
| ADM-01.8 | completed | H: approved/rejected × approve/reject conflict matrix; identical concurrent requests and competing approve/reject admit one winner/one audit. S: stale confirmation reports record changed and rejected current state. |
| ADM-01.9 | completed | H: actor/workspace/action/target/exact reason/server-time audit and injected audit-insert rollback; S: real decision audit display including reference/time; P: append-only/no forged inserts, preserved earlier actions and AI cleanup retention. |
| ADM-01.10 | completed | S: direct owner/workspace-Admin RLS reads return exact latest decision/suspension reasons; Customer, unrelated-owner and foreign reads disclose neither. Escaped rendering remains covered on the ADM audit page; Owner rendering belongs to its pair. P: direct audit RLS excludes non-Admin and foreign actors. |
| ADM-01.11 | completed | S: contract-derived local resubmission fixture returns the retained café to pending with a later submission time; ADM queue orders it after an older pending fixture, earlier audit remains unchanged and the owner retains RLS access to the prior reason. No Owner submission endpoint is exercised. |
| ADM-01.12 | completed | H: unsupported methods/Allow, Origin matrix, media/JSON/body ceiling/Ref, strict unknown/missing/wrong-type fields and exact private error envelope, unchanged snapshots. R: actual decision handler mismatched-Origin denial. |
| ADM-01.13 | completed | S: anonymous/customer/owner raw response and rendered page omit private markers/table; anonymous redirects to sign-in. All three application role-gate cases pass. |
| ADM-02.1 | completed | S: approved-only workspace queue, café name/reference ties, 20 rows and URL page/reload/Previous/Next, suspension controls and empty state. |
| ADM-02.2 | completed | H: main/kit suspend exact 200 JSON/private headers, approved state retained, one audit, customer RLS exclusion, version increment. S: confirmed Suspend exposes Un-suspend. New-order refusal remains owned by CUS-03. |
| ADM-02.3 | completed | H: main/kit un-suspend exact response, customer RLS eligibility restored and one un-suspend audit/version increment. S: confirmation restores Suspend control. |
| ADM-02.4 | completed | H: pending/rejected × current/desired boolean and approved no-op matrix with no effects; identical concurrent transitions produce one commit. S: stale suspended-state feedback. |
| ADM-02.5 | completed | H: invalid/valid reason variants including 300/301 Unicode code points and exact whitespace; S: real suspend/un-suspend audit escaped exact reason. |
| ADM-02.6 | completed | H and R: anonymous/customer/owner denial without domain effects; P: ordinary direct writes cannot clear suspension. |
| ADM-02.7 | completed | H: main/kit foreign and missing references produce indistinguishable private 404 envelopes without target changes. |
| ADM-02.8 | completed | H: kit suspend/un-suspend uses identical audit/version/eligibility assertions; S: kit approved-café queue excludes other workspaces. |
| ADM-02.9 | completed | H: all six order states, every pending/accepted/ready cancellation with fixed reason/time, terminal rows unchanged, other kit untouched, retained records and no revival. Audit-failure and order-update-failure rollback cover the whole transaction. S: collected/ready local fixtures prove suspension preserves collected and cancels ready without revival; owner retains direct RLS access. Owner collection endpoint transitions/conflicts belong to the Owner pair. |
| ADM-02.10 | completed | H: approved state retained and no revival; S: nonempty menu/hour/review snapshots unchanged, retained orders, own-owner RLS access during suspension and latest private reason isolation; P: private audit reason/direct-write controls. |
| ADM-02.11 | completed | H: attributable exactly-one audit/server timestamp, injected audit failure rolls back café/orders, injected cancellation failure leaves no audit or partial cancellation. S: real audit reference/reason/time display. P: immutable retained café audit history. |
| ADM-02.12 | completed | H: full shared HTTP/Ref/strict JSON error matrix, including nonboolean suspended values and unknown identity/scope fields; R: actual handler wrong-Origin denial. |
| ADM-02.13 | completed | S: anonymous/customer/owner raw/rendered gates on approved-café screen. All three café role-gate cases pass. |

## Files changed

- `tests/integration/cafe-eligibility/fixtures.ts`: local synthetic café/order fixture adapters; reuse foundation account/SQL/audit helpers. No product schema is installed by tests.
- `tests/integration/cafe-eligibility/permissions.test.ts`: three real local database history/privacy/write-denial cases.
- `tests/integration/cafe-eligibility/routes.test.ts`: eight direct POST Route Handler authorization/Origin cases; existing session/origin/source adapters are mocked, with domain source access prohibited for denied requests.
- `tests/e2e/cafe-eligibility/helpers.ts`: mutation helper for the two specified routes.
- `tests/e2e/cafe-eligibility/http.spec.ts`: exact HTTP contracts, transitions, concurrency, eligibility, audit and cancellation/rollback cases.
- `tests/e2e/cafe-eligibility/screens.spec.ts`: queues, details, pagination, role gates, confirmation/conflict feedback, reason/audit/resubmission/preservation and collection-ordering cases.
- `tests/integration/moderation/fixtures.ts`: export the existing workspace-account fixture function for reuse; its implementation and existing tests are unchanged.
- `tests/e2e/accounts/local.ts`: expose the existing local SQL command's raw status/stdout/SQLSTATE details through `localSqlResult`; the existing `localSql` wrapper retains its redacted-error/string-return behaviour. This avoids importing a Vitest-only helper into Playwright.
- This report.

**Dependencies added:** None. `package.json` and `bun.lock` are unchanged.

### Interfaces defined by tests

No new private production module API. Direct tests load the two specified
Next Route Handler paths and call their normal POST export with promised
`{cafeId}` params. Browser tests use the approved Admin routes and existing audit
screen. Owner-produced states are contract-derived local fixtures; owner reason
and retained-record access are queried directly under authenticated RLS.
Fixture SQL column aliases are adapters for local setup, not public HTTP contracts.
Rich café/order fixtures fail explicitly when their product storage is absent.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git status --short --branch` | passed | Correct requested branch, initially clean. HEAD equals selected base. |
| `git fetch upstream` (escalated approval) | passed | Current upstream/master resolved to base above. |
| Spec history/assumption/base diff checks | passed | Merged Admin story history; no `ASSUMPTION` marker; no spec/PLAN diff against upstream/master. Both story IDs exist in PRODUCT-SPEC. |
| `bun workflow/scripts/create-issues.ts --repo CS3227-2610-MP3-Homebrew/CS3227-2610-MP3 --tasks T-28,T-29` (escalated approval) | passed | Both tasks reported `skip` with issues #58 and #59. |
| `bun run check:specs` | passed | `Spec check passed (0 warning(s)).` |
| `bun run db:start`, then `bun run db:reset` | passed | Local Supabase start/reset succeeded; no hosted target or dotenv read. |
| `bun run lint` | passed | Final standalone check exited 0. |
| `bun run typecheck` | passed | Standalone run exited 0; final verify also passed route type generation and TypeScript with all new tests present. |
| Stage 2 manifest check from sdd-orchestrate | passed | Existing devDependencies preserved; all other package.json fields unchanged. No lockfile change. |
| `bun run test tests/integration/cafe-eligibility/permissions.test.ts --reporter=verbose` (escalated approval) | passed | 1 file, 3 tests passed, 8.48s. |
| `bun run test:e2e tests/e2e/cafe-eligibility --workers=2` | expected failing-first | 132 cases: 126 failed, 6 passed, 3.2m. Production application/harness builds started successfully; AI provider disabled. Failure catalogue below. |
| `bun run verify` (initial complete run, escalated) | expected failing-first | Lint/typecheck passed. Vitest: 1 failed / 40 passed files; 8 failed / 957 passed tests; 357.46s. All eight failures are missing café Route Handlers. Verify stopped at test, so its traceability, spec and build steps did not run. |
| `bun run check:traceability` (standalone) | passed | `Traceability passed (32 done tasks; all listed criteria have test titles).` |
| `bun run check:specs` (final standalone) | passed | `Spec check passed (0 warning(s)).` |
| `git diff --check` and final scope inspection | passed | Only test paths, the shared fixture export and this report changed; no package/lockfile or production changes. |

Two earlier sandboxed verify attempts were interrupted after lint/typecheck
and a period with no Vitest case output. They have no completed test result.
The initial complete run took nearly six minutes and advanced between worker processes;
there is no established evidence that the earlier silence was a sandbox defect.
An initial browser launch was interrupted before any case ran so the full
Vitest suite and its database reset could not race browser fixtures; its exit
130 is not counted as failing-first evidence.

### Failing-first evidence and unavailable surfaces

The 126 browser failures belong to these parameterized families (all instances
remain enabled in their source):

| Family / criteria | Actual first failure | Why expected |
| --- | --- | --- |
| H pending approve/reject main/kit, decision conflicts, reason variants, role denials, target denials, concurrent decisions, decision audit rollback; ADM-01.2–ADM-01.10/ADM-01.12 as titled | Missing routes return 404 instead of the required status/JSON/private headers. Expected-404 cases also fail their private JSON/header assertions. | Neither café decision Route Handler nor its transaction exists. |
| H suspension conflicts, reason variants, role/target denials, identical transition race; ADM-02.4–ADM-02.8/ADM-02.12 as titled | Same missing-route 404/status/header failures. | Suspension Route Handler absent. |
| H shared method/Origin/media/JSON/strict-field/body/Ref matrices, both operation contexts; ADM-01.12/ADM-02.12 | Route 404 instead of applicable 400/403/405/413/415 and shared private JSON. | Ordinary café HTTP boundary absent. |
| H main/kit suspend/un-suspend version/eligibility cases; S queue/details/confirmation/stale/resubmission/preservation families; ADM-01.1/ADM-01.7/ADM-01.8/ADM-01.11 and ADM-02.1–ADM-02.4/ADM-02.8/ADM-02.10 as titled | `Missing implementation: public.cafes needs description for contract-derived fixtures`. | Owner application details/submission/settings/version storage has not been added. These cases do not fabricate production schema. |
| H cancellation/no-revival, audit rollback during suspension, cancellation failure rollback; S collection-before/after schedules; ADM-02.9–ADM-02.11 | `Missing implementation: public.orders needs state/status/order_state for contract-derived fixtures`. | Canonical order lifecycle storage absent. No live customer ordering surface is needed for H transaction fixtures. |
| S empty application/approved-café queues; ADM-01.1/ADM-02.1 | No empty-state element found. | Both pages are heading-only placeholders. |
| S real approve/reject/suspend/un-suspend audit and latest-reason privacy; ADM-01.4/ADM-01.9/ADM-01.10/ADM-02.5/ADM-02.10/ADM-02.11 | Real mutation returns 404 before audit/private-reason assertions can run. | Café writers absent; existing audit fixture success alone is not claimed as mutation evidence. |

Six S anonymous/wrong-role gates pass, projecting ADM-01.13 and ADM-02.13.
The three P cases pass for existing shared audit/RLS infrastructure; they use
synthetic stored café audit entries and do not prove a café mutation commits.
No browser failure was caused by database connectivity, sign-in tooling,
TypeScript compilation or a live LLM/provider call.

The initial complete Vitest run's eight failed cases are all in R. Each stopped at the
explicit missing-file assertion for the specified decision/suspension Route
Handler, before any authorization assertion or domain source call:

| Test title | Criterion IDs | Failure |
| --- | --- | --- |
| actual decision handler refuses an absent session before reading domain data | ADM-01.5, ADM-02.6 | decision/route.ts absent |
| actual decision handler refuses customer before reading domain data | ADM-01.5, ADM-02.6 | decision/route.ts absent |
| actual decision handler refuses owner before reading domain data | ADM-01.5, ADM-02.6 | decision/route.ts absent |
| actual decision handler rejects a mismatched Origin | ADM-01.12, ADM-02.12 | decision/route.ts absent |
| actual suspension handler refuses an absent session before reading domain data | ADM-01.5, ADM-02.6 | suspension/route.ts absent |
| actual suspension handler refuses customer before reading domain data | ADM-01.5, ADM-02.6 | suspension/route.ts absent |
| actual suspension handler refuses owner before reading domain data | ADM-01.5, ADM-02.6 | suspension/route.ts absent |
| actual suspension handler rejects a mismatched Origin | ADM-01.12, ADM-02.12 | suspension/route.ts absent |

No other test failed. All 40 existing/new passing files, including P, passed
in that run. The application and auth-harness production builds passed
as part of browser setup; this does not change verify's unreached build status.

## Open issues for the next step

- Pair remains unready to merge. Human test review/commit is the requested stop;
  implementation has not started and both PLAN statuses remain `todo`.
- Missing café/order storage and Admin mutation/page implementation remain the
  expected failing-first gaps. T-28 no longer depends on Owner runtime endpoints;
  resubmitted and collected states are arranged using merged-contract fixtures.
- The existing `/admin/audit` renders the café name but does not render café
  target references; the real café-audit tests retain the ADM-01.9/ADM-02.11
  reference assertion. This is a visible acceptance gap even after writers exist.
- Queue tie verification observes real action targets; its synthetic 409 browser
  response prevents that ordering observation from changing stored state. Other
  state/conflict/confirmation tests use real server responses.
- Owner submission/settings/collection behaviour and owner-page rendering belong
  to the Owner pairs. T-28 retains the resulting ADM queue, state preservation,
  suspension cancellation, reason isolation and direct RLS access assertions.

## Suspicious content found

None.

## Human corrections

The human requested removal of four tests' T-54/T-60 runtime dependencies before
the test commit. Updated the existing report as explicitly requested:

- Private reasons: removed owner read/page calls; query latest reason fields
  directly as owner and workspace Admin, checking exact text, and verify denial
  or no disclosure for Customer/unrelated-owner/foreign actors.
- Resubmission: replace the Owner API call with `resubmittedApplication`, which
  arranges pending state/new submitted timestamp on the retained café. Compare
  the ADM queue position against an older local pending fixture and retain prior
  decision history/reason assertions.
- Preservation/access: remove the Owner settings request; retain unchanged
  menu/hour/review/order assertions and direct owner RLS café/menu/hour/order reads.
- Collection: create collected and ready order fixtures directly; only call ADM
  suspend/un-suspend and assert unchanged collected, fixed ready cancellation
  reason and no revival. No assertion of the Owner collect endpoint's 409 remains.

The first correction browser launch failed before collecting tests because a
Vitest-only SQL helper was imported into Playwright. This was a testing-tooling
error, not expected missing implementation; it was fixed by reusing/extending the
framework-neutral account SQL helper and is not counted as failing-first evidence.

The corrected four-case run reached all four cases and failed only on the
expected missing ADM route/storage prerequisites:

| Revised case | Actual first failure |
| --- | --- |
| ADM-01.10 ADM-02.10 latest private reasons through RLS | decision route returned 404 instead of 200 |
| ADM-01.11 resubmitted application fixture in queue | café description storage absent |
| ADM-02.9 ADM-02.10 preservation and owner RLS access | café description storage absent |
| ADM-02.9 collected/ready fixture preservation and no revival | order state storage absent |

Command: `bun run test:e2e tests/e2e/cafe-eligibility/screens.spec.ts --grep 'latest private reasons|resubmitted application fixture|owner RLS access|collected fixture' --workers=2`.
No owner endpoint/page was requested by these cases.

| Correction check | Result |
| --- | --- |
| `bun run verify` | Lint/typecheck passed; 40 passing files and one failing file, 957 passed / eight expected missing-Route-Handler failures; 344.39s. Traceability/spec/build not reached within verify. |
| `bun run check:traceability` | Passed separately: 32 done tasks; listed criteria have test titles. |
| `bun run check:specs` | Passed separately: zero warnings. |
| Stage 2 manifest check | Passed again; no package.json/bun.lock changes. |
| Owner-reference scan | No `/api/owner` or `/owner/application` reference remains in screens.spec.ts. |

Final affected-case confirmation on the reviewable tree: the same command ran
exactly four tests, all four failed at the same expected missing-implementation
points listed above. Both production builds succeeded. No Owner runtime call,
Vitest import failure or other tooling failure remained. Assertions after these
missing prerequisites are authored but not yet exercised successfully.
`git diff --check` and final scope inspection also passed. Test correction is
completed; the pair remains incomplete pending the human test commit and feature
implementation. No production, spec or PLAN changes were made.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Testing stage; no review invoked. |

## Notes for reflection

- **What worked:** Existing local account, SQL, session-bound RLS and audit fixtures supported real database coverage without hosted access or dependencies.
- **What needed guidance:** The full suite emits little intermediate output and took 357.46s; early runs were interrupted prematurely. Checking worker progress established that the final run was active.
- **What to change in the agent or skill:** Keep cross-story producer states in contract-derived fixtures when the testing task depends on their contracts, rather than introducing dependencies on the owning pair's runtime endpoints.


## Browser failure inventory

Historical initial-run inventory, before the four Owner-runtime corrections.
Each line is one failed case from that completed 132-case run, with its criterion
IDs in the original test title and its observed missing-implementation reason.
Line locations refer to that run; titles and describe contexts identify cases.

- tests/e2e/cafe-eligibility/http.spec.ts:14:7 › main approve › ADM-01.2 ADM-01.3 ADM-01.7 ADM-01.9: pending decision commits exact response and one attributable audit; customer RLS changes — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:14:7 › main reject › ADM-01.2 ADM-01.3 ADM-01.7 ADM-01.9: pending decision commits exact response and one attributable audit; customer RLS changes — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:14:7 › kit approve › ADM-01.2 ADM-01.3 ADM-01.7 ADM-01.9: pending decision commits exact response and one attributable audit; customer RLS changes — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:14:7 › kit reject › ADM-01.2 ADM-01.3 ADM-01.7 ADM-01.9: pending decision commits exact response and one attributable audit; customer RLS changes — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:30:7 › main › ADM-02.2 ADM-02.3 ADM-02.8 ADM-02.10 ADM-02.11: suspend and un-suspend change eligibility and version with exact transactional audit — café detail/version storage absent.
- tests/e2e/cafe-eligibility/http.spec.ts:30:7 › kit › ADM-02.2 ADM-02.3 ADM-02.8 ADM-02.10 ADM-02.11: suspend and un-suspend change eligibility and version with exact transactional audit — café detail/version storage absent.
- tests/e2e/cafe-eligibility/http.spec.ts:47:7 › ADM-01.8: approved cannot approve, preserving state and audit — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:47:7 › ADM-01.8: approved cannot reject, preserving state and audit — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:47:7 › ADM-01.8: rejected cannot approve, preserving state and audit — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:47:7 › ADM-01.8: rejected cannot reject, preserving state and audit — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: pending/false to false conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: pending/false to true conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: pending/true to false conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: pending/true to true conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: approved/false to false conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: approved/true to true conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: rejected/false to false conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: rejected/false to true conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: rejected/true to false conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:54:7 › ADM-02.4: rejected/true to true conflicts without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › decision › ADM-01.4 ADM-02.5: invalid reason "" has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › decision › ADM-01.4 ADM-02.5: invalid reason " \n\t ﻿" has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › decision › ADM-01.4 ADM-02.5: invalid reason "😀😀😀😀😀😀😀 has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › decision › ADM-01.4 ADM-02.5: invalid reason null has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › decision › ADM-01.4 ADM-02.5: invalid reason 1 has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › decision › ADM-01.4 ADM-02.5: invalid reason {} has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › decision › ADM-01.4 ADM-02.5: invalid reason [] has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:65:60 › decision › ADM-01.4 ADM-02.5: preserves valid reason 😀😀😀😀😀😀 exactly — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:65:60 › decision › ADM-01.4 ADM-02.5: preserves valid reason x exactly — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:65:60 › decision › ADM-01.4 ADM-02.5: preserves valid reason   Human <b>r exactly — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:69:71 › decision › ADM-01.5 ADM-02.6: anonymous is denied without state or audit effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:69:71 › decision › ADM-01.5 ADM-02.6: customer is denied without state or audit effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:69:71 › decision › ADM-01.5 ADM-02.6: owner is denied without state or audit effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:73:40 › decision › ADM-01.6 ADM-02.7: main foreign and absent targets are indistinguishable — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:73:40 › decision › ADM-01.6 ADM-02.7: kit foreign and absent targets are indistinguishable — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:80:7 › decision › ADM-01.8 ADM-02.4: concurrent identical transitions commit one state and audit only — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:87:7 › decision › ADM-01.9 ADM-02.11: audit failure rolls back cafe and every cancellation atomically — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: GET returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: PUT returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: PATCH returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: DELETE returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: OPTIONS returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: HEAD returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: origin  returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: origin null returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: origin invalid returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: origin https://evil.example returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: origin http://127.0.0.1:3100/path returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: missing Origin returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: wrong media returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: malformed JSON returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: oversized body returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: oversized Ref returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 0 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 1 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 2 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 3 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 4 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 5 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 6 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 7 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 8 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › decision › ADM-01.12 ADM-02.12: strict body 9 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › suspension › ADM-01.4 ADM-02.5: invalid reason "" has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › suspension › ADM-01.4 ADM-02.5: invalid reason " \n\t ﻿" has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › suspension › ADM-01.4 ADM-02.5: invalid reason "😀😀😀😀😀😀😀 has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › suspension › ADM-01.4 ADM-02.5: invalid reason null has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › suspension › ADM-01.4 ADM-02.5: invalid reason 1 has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › suspension › ADM-01.4 ADM-02.5: invalid reason {} has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:61:89 › suspension › ADM-01.4 ADM-02.5: invalid reason [] has no effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:65:60 › suspension › ADM-01.4 ADM-02.5: preserves valid reason 😀😀😀😀😀😀 exactly — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:65:60 › suspension › ADM-01.4 ADM-02.5: preserves valid reason x exactly — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:65:60 › suspension › ADM-01.4 ADM-02.5: preserves valid reason   Human <b>r exactly — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:69:71 › suspension › ADM-01.5 ADM-02.6: anonymous is denied without state or audit effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:69:71 › suspension › ADM-01.5 ADM-02.6: customer is denied without state or audit effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:69:71 › suspension › ADM-01.5 ADM-02.6: owner is denied without state or audit effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:73:40 › suspension › ADM-01.6 ADM-02.7: main foreign and absent targets are indistinguishable — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:73:40 › suspension › ADM-01.6 ADM-02.7: kit foreign and absent targets are indistinguishable — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:80:7 › suspension › ADM-01.8 ADM-02.4: concurrent identical transitions commit one state and audit only — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:87:7 › suspension › ADM-01.9 ADM-02.11: audit failure rolls back cafe and every cancellation atomically — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: GET returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: PUT returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: PATCH returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: DELETE returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: OPTIONS returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: HEAD returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: origin  returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: origin null returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: origin invalid returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: origin https://evil.example returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: origin http://127.0.0.1:3100/path returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: missing Origin returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: wrong media returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: malformed JSON returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: oversized body returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: oversized Ref returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 0 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 1 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 2 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 3 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 4 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 5 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 6 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 7 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 8 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 9 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:106:35 › suspension › ADM-01.12 ADM-02.12: strict body 10 returns shared HTTP error without effects — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:116:5 › ADM-01.8: competing approval and rejection have one winner and one attributable audit — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/http.spec.ts:124:5 › ADM-02.9 ADM-02.10: suspension cancels every outstanding order only, preserves terminal records and never revives — order lifecycle storage absent.
- tests/e2e/cafe-eligibility/http.spec.ts:141:5 › ADM-02.9 ADM-02.11: failure updating one outstanding order rolls back cafe, other orders and audit — order lifecycle storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:19:7 › /admin/applications › ADM-01.1 ADM-01.7 ADM-02.1 ADM-02.8: only workspace rows in the required state with 20-row URL pagination and stable ties — café detail/version storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:63:7 › /admin/applications › ADM-01.1 ADM-02.1: empty list shows an empty state and retains previous/next controls — placeholder page has no empty state.
- tests/e2e/cafe-eligibility/screens.spec.ts:19:7 › /admin/cafes › ADM-01.1 ADM-01.7 ADM-02.1 ADM-02.8: only workspace rows in the required state with 20-row URL pagination and stable ties — café detail/version storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:63:7 › /admin/cafes › ADM-01.1 ADM-02.1: empty list shows an empty state and retains previous/next controls — placeholder page has no empty state.
- tests/e2e/cafe-eligibility/screens.spec.ts:78:5 › ADM-01.1 ADM-01.2 ADM-01.3: application details and reason confirmation decide and remove a row — café detail/version storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:89:5 › ADM-02.1 ADM-02.2 ADM-02.3: confirmed Suspend and Un-suspend controls reflect current state — café detail/version storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:96:59 › ADM-01.8 ADM-02.4: stale decision confirmation reports record changed and current state — café detail/version storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:96:59 › ADM-01.8 ADM-02.4: stale suspension confirmation reports record changed and current state — café detail/version storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:106:83 › ADM-01.4 ADM-01.9 ADM-02.5 ADM-02.11: approve real audit displays acting Admin, target, escaped exact reason and timestamp — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/screens.spec.ts:106:83 › ADM-01.4 ADM-01.9 ADM-02.5 ADM-02.11: reject real audit displays acting Admin, target, escaped exact reason and timestamp — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/screens.spec.ts:106:83 › ADM-01.4 ADM-01.9 ADM-02.5 ADM-02.11: suspend real audit displays acting Admin, target, escaped exact reason and timestamp — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/screens.spec.ts:106:83 › ADM-01.4 ADM-01.9 ADM-02.5 ADM-02.11: un-suspend real audit displays acting Admin, target, escaped exact reason and timestamp — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/screens.spec.ts:119:5 › ADM-01.10 ADM-02.10: latest private reasons reach own owner and workspace Admin but no customer, unrelated owner or foreign Admin — route absent: HTTP 404 / missing shared JSON headers.
- tests/e2e/cafe-eligibility/screens.spec.ts:141:5 › ADM-01.11: owner resubmission re-enters queue at new submission position with old reason/history retained — café detail/version storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:158:5 › ADM-02.9 ADM-02.10: suspension preserves menu, hours, reviews and owner management with retained orders — café detail/version storage absent.
- tests/e2e/cafe-eligibility/screens.spec.ts:179:5 › ADM-02.9: collection before suspension stays collected; suspension before collection conflicts — order lifecycle storage absent.

