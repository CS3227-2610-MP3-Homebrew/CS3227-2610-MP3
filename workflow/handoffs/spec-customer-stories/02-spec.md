# Spec report

- **Agent:** spec
- **Issue:** None; requested Customer spec revisions and PLAN update.
- **Spec IDs:** CUS-01–CUS-07; all 67 Customer criteria; amended ADM-02.9–ADM-02.11; new tasks T-34–T-49.
- **Date:** 2026-10-19
- **Branch:** customer-specs
- **Base commit:** 725e8969e40df92721f1c8f50814231ac36cbd0b
- **Status:** awaiting-decision

## Summary

Applied the requested Customer revisions and added five Customer
testing/implementation pairs to `workflow/PLAN.md`. There are now **20 pairs**
across the product: 12 foundation, five Customer and three Admin pairs. The plan
has 49 tasks, including nine specification tasks. Every one of the 67 Customer
criteria has exactly one testing and one implementation owner.

The unfiltered catalogue includes all approved, non-suspended cafés in the
Customer's workspace, including closed cafés. Closed cards are greyed out but
remain clickable with the specified next-opening text. Open cafés in the final
30 minutes, including exactly 30 minutes before closing, show “closing soon”.
The existing approval/workspace boundary remains intact.

The human explicitly confirmed that suspension cancels all uncollected orders,
including accepted/ready orders, while collected orders remain unchanged.
CUS-04.5 now supplies the fixed customer-visible reason “Cafe is suspended”.
The Admin suspension spec and related plan tasks were amended to remove the
previous conflicting order-preservation rule. Records remain viewable, the
private Admin reason is not exposed and un-suspension does not revive cancelled
orders. Suspension/cancellations/audit share the existing transactional boundary.

ASM-01 is retired in all seven Customer stories: the approved risk assessments
are ordinary Risk fields, and CUS-02 no longer carries its unwanted assumption.
The separate, unconfirmed ASM-02 UI proposals in CUS-06/CUS-07 remain unchanged.
All source user stories, priorities and existing requirement/criterion IDs are
preserved; only CUS-01.9–CUS-01.11 were added.

Spec/link/coverage checks pass with zero warnings. The exact full verification
command failed in Vitest after lint/typecheck passed. Authoring is finished for
the requested revisions and plan allocation, but remaining domain decisions,
missing owning contracts and the failed verification gate prevent a completed
or implementation-ready claim. Customer specs are absent from local master;
the requested local plan entries do not authorize execution before spec merge.

## Acceptance criteria

These are authoring/traceability observations, not feature acceptance results.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence |
| --- | --- | --- |
| CUS-01.1, CUS-01.9–CUS-01.11: unfiltered and card states | completed | Includes closed eligible cafés; exact text patterns, clickable greyed cards, closing-soon boundary and filter-removal behaviour; temporary authoring checks pass |
| Customer ASM-01 revisions | completed | No active ASM-01 markers/list items remain; every file retains the retired ID; CUS-06/CUS-07 ASM-02 unchanged |
| CUS-04.5 and related CUS-03/ADM-02 suspension text | completed | Automatic uncollected-order cancellation, accepted/ready coverage, fixed reason, collected preservation and no revival; old conflicting clauses removed |
| Five Customer pairs, one owner per criterion and acyclic dependencies | completed | T-40/T-41, T-42/T-43, T-44/T-45, T-46/T-47, T-48/T-49; all 67 CUS criteria allocated once per role; zero-warning spec check |
| Missing contracts have spec-owned prerequisites | awaiting-decision | T-34–T-39 list the exact remaining account/catalogue/order/review/Brew/stretch decisions; all ten new execution tasks remain blocked |
| Preserve previous progress and unrelated work | completed | Existing T-01–T-33 Status/Issue/Requirements/Owner fields unchanged; earlier handoffs and initial bun.lock modification preserved byte-for-byte |
| Full repository verification | incomplete | Lint/typecheck passed; 24 tests passed in two files but one jsdom worker error failed the test stage; later verification stages were not reached |

## Files changed

- `workflow/specs/stories/CUS-01-browse-cafes.md`: unfiltered/card-state behaviour, three appended criteria, retired ASM-01.
- `workflow/specs/stories/CUS-02-cafe-page.md`: removed active ASM-01 marker/entry; retained the template's risk assessment and retired its ID.
- `workflow/specs/stories/CUS-03-pre-order.md`: retired ASM-01 and replaced the outdated suspension-preservation summaries with links to CUS-04.5.
- `workflow/specs/stories/CUS-04-my-orders.md`: revised CUS-04.5 and supporting overview, screen, permissions, failure/use-case text; retired ASM-01.
- `workflow/specs/stories/CUS-05-review-order.md`: retired ASM-01.
- `workflow/specs/stories/CUS-06-brew-finder.md`: retired ASM-01; ASM-02 unchanged.
- `workflow/specs/stories/CUS-07-favourite-cafes.md`: retired ASM-01; ASM-02 unchanged.
- `workflow/specs/stories/ADM-02-cafe-suspension.md`: reconciled suspension effects, transactional rollback and private/public reason distinction; existing IDs/counts retained.
- `workflow/PLAN.md`: Customer source links, six spec prerequisites and five pairs; aligned existing Admin suspension work and local-fixture prerequisites without changing their ownership, issues or statuses.
- `workflow/handoffs/spec-customer-stories/02-spec.md`: this report. Run 01 is unchanged.

No application code, tests, fixtures, package configuration, shared specs,
guides or agent/skill definitions changed. `bun.lock` was already modified at
the start and was not edited. No commit, issue, PR, deployment or hosted-service
operation was performed.

## Plan allocation and status reconciliation

| Tasks | Scope | Status |
| --- | --- | --- |
| T-34 | Shared account/role story and public contracts | awaiting-decision |
| T-35 | Catalogue/filter/rating/café-page contracts | awaiting-decision |
| T-36 | Pickup/order lifecycle, race and suspension contracts | awaiting-decision |
| T-37 | Review fields/submission contracts | awaiting-decision |
| T-38 | Brew selection, result count, empty-model and ASM-02 decisions | awaiting-decision |
| T-39 | Stretch favourite data/API/persistence and ASM-02 decisions | awaiting-decision |
| T-40/T-41 | CUS-01.1–CUS-01.11, CUS-02.1–CUS-02.9 | blocked |
| T-42/T-43 | CUS-03.1–CUS-03.8, CUS-04.1–CUS-04.8 | blocked |
| T-44/T-45 | CUS-05.1–CUS-05.10 | blocked |
| T-46/T-47 | CUS-06.1–CUS-06.16 | blocked |
| T-48/T-49 | CUS-07.1–CUS-07.5, stretch | blocked |

Handoff inventory contains no reviewer/security-reviewer execution reports.
The latest existing plan issue-mapping report also records no executed pairs.
No pair was promoted to done. Existing spec tasks T-01, T-02 and T-23 remain
done based on their existing master contracts/spec handoffs; the 30 existing
execution task statuses and issue links are preserved.

T-29 remains the single suspension mutation/cancellation writer. T-43 consumes
it and owns customer order actions/display. Manual Admin moderation can use
contract-derived local review fixtures after T-37, so T-31 does not require
T-45's review form. This avoids the otherwise circular chain through the
shared audit screen, suspension, customer orders and review creation. Customer
catalogue, review/moderation fixture preparation and unrelated foundation work
retain the independent progress allowed by their own contracts.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | Pass, exit 0 | Spec check passed with zero warnings; task fields, criterion ownership, links and dependency graph accepted |
| `bun run verify` | Fail, exit 1 | ESLint and Next type generation/TypeScript passed. Vitest reported 24 passing tests in two files and one unhandled fork-worker start failure in `tests/unit/plan-issues.test.ts`: jsdom `addEventListener` called on an invalid EventTarget. Traceability, spec checks and production build were not reached within this command |
| `bun run check:traceability` | Pass, exit 0 | Three existing done tasks have their listed test titles; no Customer implementation coverage is claimed |
| `bun /private/tmp/homebrew-customer-revision-check.ts` | Pass, exit 0 | 49 tasks, 20 pairs, nine spec tasks; all 67 Customer criteria owned once per role; original task statuses/issues/requirements/owners preserved; behaviour and assumption retirement checks; initial lockfile/shared specs/earlier handoff hashes unchanged |
| `bun /private/tmp/homebrew-customer-spec-check.ts` | Pass, exit 0 | Exact source stories/priorities, one requirement per story, sequential Given/When/Then criteria, template/use-case/assumption coverage and all 88 Customer relative links/anchors |
| `git diff --check` | Pass, exit 0 | No whitespace errors in tracked changes |
| Local master tree inspection | Expected Customer source absence | `git show master:workflow/specs/stories/CUS-01-browse-cafes.md` reports the file is absent from master; no approval/merge inference was made |

Temporary scripts only inspect authoring/plan consistency and do not add
acceptance tests to the repository. No test configuration was changed or test
skipped to claim a passing gate. No separate production build or end-to-end
test was run in this revision session.

## Open issues for the next step

- The exact remaining domain gaps listed in [run 01](01-spec.md#open-issues-for-the-next-step) are now assigned to T-34–T-39. ASM-01 risk confirmation and the suspension-preservation decision are resolved and are no longer open.
- T-35 still needs strict filter/rating/display contracts, hours/menu ownership, opening/closing/overnight boundaries, and what to show when a closed café has no next opening scheduled. The confirmed main-view/card behaviour is not awaiting a decision.
- T-36 still needs complete order/pickup schemas and canonical states, treatment of already terminal orders and simultaneous collection/suspension or acceptance/cancellation. Automatic cancellation of outstanding uncollected orders, including accepted/ready, and unchanged collected purchases are confirmed; it is not a Customer permission to cancel an accepted order manually.
- T-37 still needs review field limits/rating type and submission/duplicate contracts. T-38 needs Brew source/result decisions and CUS-06 ASM-02. T-39 needs the stretch storage/API/persistence contract and CUS-07 ASM-02.
- Shared SYS-01–SYS-03 and owner story files remain absent. Product/shared technical boundaries are available; their missing detailed contracts are prerequisites rather than planning guesses. T-34 owns Shared specification completion; T-35/T-36 identify the required owning owner contracts.
- Customer changes and the ADM-02 amendment require reviewed spec merge before dependent testing/implementation; the local plan was requested in this session and keeps all affected execution tasks blocked.
- Full verification remains unsuccessful because of the Vitest/jsdom worker failure. A passing lint/typecheck or spec check does not substitute for the required full gate.

## Suspicious content found

None.

## Human corrections

- Adopted ASM-01 for CUS-01/CUS-03–CUS-07 and removed the unwanted CUS-02 assumption.
- Added the requested unfiltered closed-café and final-30-minute card behaviour.
- Clarification received: “Yes, cancel all uncollected orders” in response to the explicit accepted/ready-order cancellation and collected-order preservation question. The revised rules and linked Admin amendment reflect that answer.
- Added customer tasks to PLAN.md as requested; missing decisions remain named specification prerequisites rather than inferred product behaviour.

## Review responses

None; no independent reviewer round was invoked.

## Notes for reflection

- **What worked:** One clarification resolved the consequential suspension boundary; shared ownership and dependency checks caught no cycle or duplicate criterion owner.
- **What needed guidance:** The human supplied concrete card states and replaced the previous suspension-preservation rule; other domain/public-contract gaps remain explicit.
- **What to change in the agent or skill:** None established by this run; verification limitations were recorded without changing unrelated tests or configuration.
