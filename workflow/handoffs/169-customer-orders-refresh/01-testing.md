# Testing report

- **Agent:** testing (Codex, single-agent mode)
- **Issue:** [#169](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/169), T-81; paired issue [#170](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/170), T-82
- **Spec IDs:** CUS-04.1; supplementary preservation of existing CUS-04.2/CUS-04.3 cancellation behavior
- **Date:** 2026-10-23
- **Branch:** fix/169-customer-orders-refresh
- **Base commit:** 85c6e2fb9f5486fc89b9a39869dd5bfe03e2569d (origin/master)
- **Status:** completed -- changed manually

## Summary

Single-agent mode. Test authoring is complete: twelve new component cases
deliver fresh authorized order projections to an already mounted OrderList,
and the existing browser history case has stronger snapshot, lifecycle,
reason and control assertions. Application code has not changed.

The final full `bun run verify` run passed lint and typecheck, then failed
with nine expected refresh regressions and five unrelated existing test
timeouts. Rerunning all four affected existing suites passed 47 of 48 cases;
the existing demo-kit plaintext-password scan still exceeded its five-second
limit. This is an unexpected verification failure, so the orchestrator's
stage 2 gate has not passed.

The order browser suite passed 87 of 88 cases. Its unchanged pagination
case timed out during sign-in after fixture setup under four workers, then
passed separately with one worker and the original assertions and timeout.
The strengthened history test passed in the broad run. Neither the full
verify command nor the full browser command is reported as passing.

T-82 implementation, self-review, documentation and close-out have not started.
Both PLAN statuses remain unchanged. No commit or PR was created.

## Acceptance criteria

Statuses below describe testing work and recorded evidence, not passing
application behavior or completion of the pair.

| Criterion | Status | Evidence |
| --- | --- | --- |
| T-81: related tests change first; named failing-first evidence for fresh same-page membership, state, reasons and timestamps | completed | Nine failures in `tests/unit/orders/order-list.test.tsx`; no application diff against origin/master |
| T-81 / CUS-04.1: retain complete scoped display coverage and existing cancellation behavior | completed | Mounted rerenders cover membership/order and four MVP owner transitions, suspension reasons, retained timestamps/snapshots and current Cancel/Review controls; existing API ownership/workspace/pagination and cancellation assertions remain intact |
| T-81: record verify and relevant browser results using local fixtures and fake/disabled AI | completed | Actual results and remaining failures recorded below; all database access was local Supabase and provider behavior was mocked/fake or disabled |
| Orchestrator stage 2: all verification failures are expected missing implementation | blocked | Existing SYS-12.5 / SEC-10.2 scan times out in both the full run and focused retry |
| Single-agent implementation prerequisite: human review and commit of tests | blocked | Tests and this report remain uncommitted |

## Files changed

- `tests/unit/orders/order-list.test.tsx`: twelve new synchronous client-component
  tests, with synthetic canonical Order records and mocked cancellation fetches.
- `tests/e2e/orders/pages.spec.ts`: additional assertions in the existing
  suspension/rejection history test for every rendered order's retained café,
  items, quantities, prices, SGD total, state, lifecycle attributes and controls.
  The real Admin suspension case continues to exclude private Admin feedback
  from both the page and authorized response.
- `workflow/handoffs/169-customer-orders-refresh/01-testing.md`: this report.

No fixtures, application code, specifications, PLAN content, package manifest,
lockfile, or testing configuration changed. No devDependencies were added.
The pre-existing untracked
`workflow/handoffs/spec-customer-owner-alignment/05-spec.md` was preserved.

## Criterion-to-case evidence

All new cases are in `tests/unit/orders/order-list.test.tsx`. Rerendering the
same component delivers new props without unmounting, changing a page number
or reloading a document. The browser history test verifies actual authorized
read/render behavior; it is not claimed as soft-refresh evidence.

### Expected failing-first cases

Each row names an actual failing test from the final full verify run.

| Test title | Observed failure / expected outcome |
| --- | --- |
| CUS-04.1: a fresh same-page payload adds a newly placed order to an already mounted empty view | Old “No orders yet.” remains; the new order and its retained purchase should appear |
| CUS-04.1: a fresh same-page 20-order collection replaces membership in newest-first and tied-reference order | Old last record remains and newest record is absent; delivered membership/order, including a subsequent empty collection, should replace the old collection |
| CUS-04.1: a fresh same-page payload can reorder existing records without changing page number | Newer delivered record is absent before retained history; expected order is newer, then older |
| CUS-04.1: delivered pending to accepted updates the mounted state, feedback, controls and retained lifecycle snapshots | New “Accepted at” is absent; accepted state/timestamp should appear and Cancel should disappear |
| CUS-04.1: delivered accepted to ready updates the mounted state, feedback, controls and retained lifecycle snapshots | New “Ready at” is absent; accepted timestamp and snapshots should remain with the new ready state/time |
| CUS-04.1: delivered ready to collected updates the mounted state, feedback, controls and retained lifecycle snapshots | New “Collected at” is absent; earlier timestamps/snapshots should remain and Review order should appear |
| CUS-04.1: delivered pending to rejected updates the mounted state, feedback, controls and retained lifecycle snapshots | New rejection reason is absent; rejected state/time and inert owner reason should appear without Cancel/Review actions |
| CUS-04.1: fresh suspension cancellations keep prior timestamps, public reason and retained terminal purchases separate from owner feedback | Fixed public suspension reasons are absent after fresh cancelled records arrive; previous lifecycle timestamps and terminal purchases should remain, with owner rejection text separate |
| CUS-04.1 CUS-04.2: a new delivered owner state stays current while an outstanding cancellation loses with a conflict | Old pending state remains after a delivered accepted payload and 409 cancellation response; current accepted state should remain without a Cancel action |

The transition cases also assert retained café/item/quantity/unit-price/line-total
snapshots, exact `S$9.00` totals, Singapore time rendering and lifecycle datetime
attributes, inert markup, absent inappropriate actions, and the existing collected
order review-link destination. No review creation, owner mutation, stretch
state, polling, realtime channel or automatic delivery requirement was added.

### Passing cancellation preservation cases

These three cases passed in the final full verify run:

- `CUS-04.2: confirmed cancellation updates immediately without another server payload`
- `CUS-04.2 CUS-04.3: pending cancellation prevents duplicate requests and conflict leaves the last confirmed state intact`
- `CUS-04.2: an unconfirmed network failure reports safely without pretending cancellation succeeded`

Existing `tests/e2e/orders/reads-cancellation.spec.ts`, `creation.spec.ts` and
`transport.spec.ts` were not edited. Their named CUS-04.1 scoped projection,
20-record pagination, strict query, ownership, kit/main-workspace and role
checks remain present. Existing cancellation success, terminal conflicts,
duplicate cancellation, real suspension and transport checks remain present.
All of these order browser cases passed either in the broad run or, for the
single pagination timeout, its separate retry; the broad run itself failed.

## Interfaces defined by tests

None. Tests use the merged synchronous export
`OrderList({ initialOrders }: { initialOrders: Order[] })` from
`src/app/customer/orders/order-list.tsx`, its existing canonical Order type and
the existing cancellation HTTP contract. No new application interface is imposed.
The installed Next.js Vitest and Playwright guides were read before authoring.

## Checks run

For the final verification and browser runs, PATH included the bundled Node
24.19.0 runtime at
`/Users/taiayovelapang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`.
Commands still used Bun and the existing package scripts. The full verify run
also set `DEBUG_PRINT_LIMIT=300` to shorten diagnostic DOM output; it did not
change assertions, configuration or timeouts.

| Command / check | Result | Evidence |
| --- | --- | --- |
| `git fetch origin master` and selected-base resolution | passed | No upstream/master exists; origin/master resolves to the base commit above |
| Merged CUS-04 spec and PLAN gates | passed | CUS-04 is a product story; merged story history is nonempty, no unresolved ASSUMPTION marker, no local spec/PLAN diff; T-36/T-43/T-58/T-60 are done |
| `bun workflow/scripts/create-issues.ts --repo CS3227-2610-MP3-Homebrew/CS3227-2610-MP3 --tasks T-81,T-82 --base origin/master` | passed, read-only | Both tasks printed `skip`, with issues #169 and #170; exit 0 |
| `bun run db:start` | passed | Local Supabase start succeeded; generated credentials omitted |
| Stage 2 manifest comparison against HEAD | passed | Existing devDependencies and all other package fields unchanged; no dependency or lockfile diff |
| `bun run verify` | failed, expected and unexpected failures | Lint and typecheck passed; 80 test files, 75 passed / 5 failed; 1,351 tests passed / 14 failed, comprising the nine refresh failures and five existing timeouts below; exit 1 |
| `bun run test tests/integration/brew-finder/durable.test.ts tests/integration/demo-kits/kit.test.ts tests/integration/demo-kits/provision.test.ts tests/integration/ai-state/cache.test.ts` | failed on one existing timeout | 3 files passed / 1 failed; 47 tests passed / 1 failed; only the demo-kit plaintext-password scan still timed out |
| `bun run check:traceability` | passed, separately | 55 done tasks; all listed criteria have test titles |
| `bun run check:specs` | passed, separately | Zero warnings |
| `bun run test:e2e tests/e2e/orders` | failed on one existing timeout | Production build and isolation/artifact checks succeeded; Chromium 87 passed / 1 failed in four minutes; strengthened history test passed; unchanged pagination case exceeded 30 seconds during sign-in |
| `bun run test:e2e tests/e2e/orders/reads-cancellation.spec.ts --grep 'own snapshot history paginates' --workers=1` | passed | Production build succeeded; one case passed in 27.4 seconds with original assertions and timeout |
| `git diff --quiet origin/master -- src workflow/specs workflow/PLAN.md package.json bun.lock vitest.config.mts playwright.config.ts` | passed | Protected application/spec/PLAN/tooling paths unchanged |
| `git diff --check` | passed | No whitespace errors |

Because verify stopped at tests, its subsequent traceability, spec and build
steps did not run within that command. Traceability/spec checks passed
separately, and the production build passed through Playwright's configured
web server. Full verify is not green. No independent review, self-review,
documentation or close-out checks have been performed.

### Existing timeout failures, separated from refresh regressions

| Existing file / exact failing test | Full verify | Focused retry |
| --- | --- | --- |
| `tests/integration/brew-finder/durable.test.ts` — CUS-06.8 CUS-06.12: E16 open-state boundary invalidates cache even with unchanged candidate content | 60-second timeout | passed |
| `tests/integration/ai-state/cache.test.ts` — SYS-05.3, SYS-10.2, SEC-07.1: cafe suspended during fake generation never returns or stores AI result | 30-second timeout | passed |
| `tests/integration/demo-kits/kit.test.ts` — SYS-12.5 SEC-10.2: plaintext passwords occur in no persisted application row, Auth metadata, cache or audit | 5-second timeout | failed again: 5-second timeout, 5,772 ms measured |
| `tests/integration/demo-kits/kit.test.ts` — SYS-12.9: review-eligible collected orders, other states and four weeks of item sales are relative to creation | 5-second timeout | passed |
| `tests/integration/demo-kits/provision.test.ts`, case 4 — SYS-12.6: failed Auth or seed creation leaves no workspace, published/unpublished account or domain rows | 5-second timeout | passed |

The persistent scan performs separate local SQL queries per table/account.
The observed failure is a timeout, not a failed assertion finding a plaintext
password. Its source and test configuration are unchanged and outside T-81's
file scope. A local database wait-state diagnostic showed no blocked query at
the sampled instant; this does not establish a root cause for the timeouts.

### Preliminary tooling observation

The initial shell had Bun but no Node on PATH. An initial focused run fell
back to Bun and failed before test collection with jsdom's EventTarget error.
An initial verify attempt passed lint/typecheck and was interrupted at test
startup to correct that runtime selection. With the bundled Node runtime,
the focused new suite ran with nine expected failures / three passes; the
final full run above independently reproduced all nine failures after the
timestamp/reason assertions were ordered to expose their precise stale fields.

## Open issues for the next step

- The stage 2 requirement that verification fail only for missing implementation
  is unmet because the unchanged demo-kit scan still times out. No tests,
  fixtures or configuration were weakened to bypass it.
- The broad order browser run failed, although its sole failing pagination case
  passed separately with one worker. Resource sensitivity remains a limitation
  of the broad run's evidence.
- Human review and a test commit are absent. The single-agent orchestrator skill
  explicitly requires: “Stop for the human to read and commit the tests”.
- T-82's application work remains unstarted. No specification ambiguity or new
  interface decision was found for the scoped refresh correction.
- Both PLAN statuses remain `todo`; the pair has no completion/self-review evidence.

## Suspicious content found

None. Inert markup in synthetic order feedback is adversarial test data.

## Human corrections

The human selected the orchestrator skill and single-agent workflow for this pair.

## Review responses

None. Review has not run.

## Notes for reflection

- **What worked:** Mounted component rerenders reproduce stale membership,
  lifecycle times, reasons and state without introducing an automatic-refresh
  requirement or owner mutation implementation.
- **What needed guidance:** The existing shell needed an explicit installed
  Node runtime for jsdom; existing timeout failures needed separate diagnosis.
- **What to change in the agent or skill:** No workflow changes made. Runtime
  availability and the broad suite's existing timing limits remain useful
  prerequisites to establish before future pairs.
