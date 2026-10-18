# Spec report

- **Agent:** spec
- **Issue:** None; Admin story review fixes.
- **Spec IDs:** ADM-01.2–ADM-01.3; ADM-02.2–ADM-02.3; ADM-03.1, ADM-03.4–ADM-03.6, ADM-03.14; ADM-04.14.
- **Date:** 2026-10-18
- **Branch:** docs/admin-story-specs
- **Base commit:** b5e7676 — Merge pull request #27 from shawnnygoh/docs/demo-access-spec
- **Status:** completed

## Summary

Applied the four requested review fixes to the existing Admin story files.
The 62 criteria retain their IDs and counts: ADM-01 13, ADM-02 13, ADM-03 18,
ADM-04 18. Exactly ten criterion definitions changed. Shared specs, PLAN.md and
the run-01 report remain byte-identical to the run-02 starting snapshot.
The coordinating session's final document checks and `bun run verify` passed.
No assumptions, additional routes, requirement IDs, code, tests, commits,
pushes or PRs were added. Completed describes authoring and verification,
not human approval or implementation acceptance.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Remove workflow facts from all four stories | completed | Removed parenthetical story-not-written notices, including wrapped variants and the equivalent standalone sentence; role dependencies remain plain IDs |
| ADM-02.2, ADM-02.3, ADM-03.1: customer access boundary | completed | Criteria assert customer-scoped reads under RLS/SYS-05.3; CUS-03 owns refusing suspended-café order submissions, CUS-02 page display, CUS-01/CUS-02 rating formulas |
| ADM-01.2, ADM-01.3, ADM-02.2, ADM-02.3, ADM-03.4, ADM-03.5, ADM-03.6: exact success contracts | completed | Seven HTTP 200 responses now contain exactly requestId and their resulting applicationState/suspended/moderationState, with shared JSON/private-no-store conventions |
| ADM-04.14 and supporting edge/failure/evaluation text | completed | A no-longer-pending selection returns 400 INVALID_REQUEST before admission; queue-changed feedback offers reload; Moderation Assistant never returns no_source_data |
| ADM-03.14 and audit screen/use case | completed | Review target is café name plus review reference; removed queue deep link and corresponding use-case step |
| Scope, links, criteria identity and repository verification | completed | Snapshot comparisons and document checks pass; coordinator reports `bun run verify` passed |

## Files changed

- `workflow/specs/stories/ADM-01-cafe-applications.md`: removed workflow notice; defined exact decision success bodies.
- `workflow/specs/stories/ADM-02-cafe-suspension.md`: removed workflow notices; specified customer-scoped eligibility/read effects, CUS-03 order-submission responsibility and exact suspension success bodies.
- `workflow/specs/stories/ADM-03-review-moderation.md`: removed workflow notices; specified customer-scoped review reads and owning customer stories, exact moderation success bodies, and audit targets without deep links.
- `workflow/specs/stories/ADM-04-moderation-assistant.md`: removed workflow notice; replaced unsupported empty-source fallback behavior with stale-selection validation and queue reload feedback in criterion ADM-04.14, edge cases, failure modes and evaluation case ADM-04-E12.
- `workflow/handoffs/spec-admin-stories/02-spec.md`: this new report; `01-spec.md` is unchanged.

### Review fixes and preserved boundaries

1. Story-file existence/workflow notices were removed without changing the
   dependency IDs or linking absent files.
2. Customer behavior is expressed as authorized data eligibility. Suspension
   excludes the café from customer-scoped reads and therefore catalogue/Brew
   Finder candidates; un-suspension restores those reads. New-order submission
   enforcement remains CUS-03. Pending/kept review reads exclude hidden reviews;
   display and rating formulas retain their owning customer stories.
3. Exact successful response bodies are `{requestId, applicationState: "approved"}`,
   `{requestId, applicationState: "rejected"}`, `{requestId, suspended: true}`,
   `{requestId, suspended: false}`, `{requestId, moderationState: "kept"}`,
   `{requestId, moderationState: "hidden"}`, and `{requestId, moderationState: "kept"}`
   for their seven respective actions. Existing transactional audit, reasons,
   role/workspace restrictions and failure behavior remain intact.
4. Moderation triage requires a nonempty, currently pending, in-scope selection.
   A no-longer-pending selection returns `400 INVALID_REQUEST` before admission
   with no call/change/Admin-audit effect and queue-changed/reload feedback.
   The disabled, usage_limited and unavailable fallbacks are unchanged.
   Audit review targets show café name plus review reference without linking
   to the queue.

No shared SYS/SEC criterion was amended in run 02. Shared changes and existing
PLAN ownership recorded in run 01 remain unchanged; this run does not allocate
new task ownership or change PLAN.

## Checks run

All eight requested acceptance checks passed. Exit 1 on a negative `rg`
search means no matches, as required. No criteria were added or renumbered:
the baseline comparison found exactly ten modified definitions, listed above,
with unchanged counts of 13, 13, 18 and 18. It also confirmed shared specs,
PLAN.md and `01-spec.md` are byte-identical to the run-02 starting snapshot.

The temporary Bun link checker verified all 63 story-relative links and
their heading anchors using GitHub slugs; it additionally verified the 58
existing shared-spec links. No relative link remains unverified. Exact source
user stories, one requirement per story, sequential criterion IDs and
Given/when/then format also passed.

| Check | Result | Evidence |
| --- | --- | --- |
| `git status --short` | Pass | Exactly the same six entries as run 01 |
| Workflow-state phrase search | Pass | No matches across workflow/specs |
| `no_source_data` search | Pass | Both matches explicitly say Moderation Assistant never returns it |
| Response-body search | Pass | Exact bodies appear in the seven specified criteria |
| Audit-link search | Pass | No matches; audit targets display café name and review reference |
| Criterion ID pipeline and baseline comparison | Pass | Each ID once; 13/13/18/18; same IDs as the starting snapshot |
| Relative-link checker | Pass | All 63 story links resolve to existing files/headings |
| `bun run verify` | Pass | Lint/typecheck, 8 tests, traceability (3 done tasks), production build |

### Working-tree output

```text
$ git branch --show-current
docs/admin-story-specs
[exit 0]

$ git status --short
 M workflow/specs/AI-SECURITY-SPEC.md
 M workflow/specs/INTEGRATION-SPEC.md
 M workflow/specs/PRODUCT-SPEC.md
 M workflow/specs/TECHNICAL-SPEC.md
?? workflow/handoffs/spec-admin-stories/
?? workflow/specs/stories/
[exit 0]
```

### Document-check output

The required `rg` checks were executed by the temporary Bun runner;
the exact commands, output and exit statuses follow.

```text
$ rg -n "not yet written" workflow/specs/
[exit 1]

$ rg -n "no_source_data" workflow/specs/stories/ADM-04-moderation-assistant.md
85:- **`ADM-04.14`:** Given a triage selection whose reviews are no longer all pending, when `POST /api/ai/moderation` validates it, then it returns `400 INVALID_REQUEST` before admission, performs no provider call, state change or Admin-action audit write, and the page tells the Admin the queue changed and offers reload; an empty, duplicate or oversized selection also returns `400 INVALID_REQUEST` before admission. A valid selection is nonempty, currently pending and in scope; Moderation Assistant never returns `no_source_data`.
99:Moderation Assistant never returns `no_source_data`. No fallback writes a review
[exit 0]

$ rg -n "applicationState|moderationState|requestId, suspended" workflow/specs/stories/
workflow/specs/stories/ADM-02-cafe-suspension.md:32:- **`ADM-02.2`:** Given an in-scope approved café that is not suspended and a valid reason, when the Admin confirms `POST /api/admin/cafes/{cafeId}/suspension` with exactly `{suspended: true, reason}`, then the response is HTTP `200` with exactly `{requestId, suspended: true}` as JSON under the shared `Cache-Control: private, no-store` conventions, its suspension boolean becomes true and exactly one `suspend` Admin audit entry is committed in the same transaction; customer-scoped café reads under RLS/SYS-05.3 exclude it and therefore it is excluded from catalogue and Brew Finder candidates; it is ineligible for new orders, and CUS-03 owns enforcement that refuses order submission.
workflow/specs/stories/ADM-02-cafe-suspension.md:33:- **`ADM-02.3`:** Given an in-scope approved café that is suspended and a valid reason, when the Admin confirms the suspension route with exactly `{suspended: false, reason}`, then the response is HTTP `200` with exactly `{requestId, suspended: false}` as JSON under the shared `Cache-Control: private, no-store` conventions, its suspension boolean becomes false, it returns to customer-scoped café reads under RLS/SYS-05.3 and Product eligibility, and exactly one `un-suspend` Admin audit entry commits in the same transaction.
workflow/specs/stories/ADM-03-review-moderation.md:40:- **`ADM-03.4`:** Given an in-scope `pending` review and a valid reason, when the Admin confirms `POST /api/admin/reviews/{reviewId}/moderation` with exactly `{action: "keep", reason}`, then the response is HTTP `200` with exactly `{requestId, moderationState: "kept"}` as JSON under the shared `Cache-Control: private, no-store` conventions, it becomes `kept`, remains customer-visible on an eligible café page, moves to the Kept tab and commits exactly one `keep` Admin audit entry in the same transaction.
workflow/specs/stories/ADM-03-review-moderation.md:41:- **`ADM-03.5`:** Given an in-scope `pending` or `kept` review and a valid reason, when the Admin confirms the moderation route with exactly `{action: "hide", reason}`, then the response is HTTP `200` with exactly `{requestId, moderationState: "hidden"}` as JSON under the shared `Cache-Control: private, no-store` conventions, it becomes `hidden`, ceases to be customer-visible, moves to the Hidden tab and commits exactly one `hide` Admin audit entry in the same transaction.
workflow/specs/stories/ADM-03-review-moderation.md:42:- **`ADM-03.6`:** Given an in-scope `hidden` review and a valid reason, when the Admin confirms the moderation route with exactly `{action: "restore", reason}`, then the response is HTTP `200` with exactly `{requestId, moderationState: "kept"}` as JSON under the shared `Cache-Control: private, no-store` conventions, it becomes `kept`, becomes customer-visible on an eligible café page, moves to the Kept tab and commits exactly one `restore` Admin audit entry in the same transaction.
workflow/specs/stories/ADM-01-cafe-applications.md:30:- **`ADM-01.2`:** Given an in-scope `pending` application and a valid reason, when the Admin confirms Approve through `POST /api/admin/cafes/{cafeId}/decision` with exactly `{decision: "approve", reason}`, then the response is HTTP `200` with exactly `{requestId, applicationState: "approved"}` as JSON under the shared `Cache-Control: private, no-store` conventions, the application becomes `approved`, leaves the pending queue, and the approved, non-suspended café is eligible for customer visibility under SYS-05.3; exactly one `approve` Admin audit entry commits in the same transaction.
workflow/specs/stories/ADM-01-cafe-applications.md:31:- **`ADM-01.3`:** Given an in-scope `pending` application and a valid reason, when the Admin confirms Reject through `POST /api/admin/cafes/{cafeId}/decision` with exactly `{decision: "reject", reason}`, then the response is HTTP `200` with exactly `{requestId, applicationState: "rejected"}` as JSON under the shared `Cache-Control: private, no-store` conventions, the application becomes `rejected`, leaves the pending queue and remains customer-hidden; exactly one `reject` Admin audit entry commits in the same transaction.
[exit 0]

$ rg -n "link" workflow/specs/stories/ADM-03-review-moderation.md
[exit 1]

$ rg -o '^- \*\*`ADM-0[1-4].[0-9]+`' workflow/specs/stories/ | sort | uniq -c
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.10`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.11`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.12`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.13`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.1`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.2`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.3`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.4`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.5`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.6`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.7`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.8`
   1 workflow/specs/stories/ADM-01-cafe-applications.md:- **`ADM-01.9`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.10`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.11`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.12`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.13`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.1`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.2`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.3`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.4`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.5`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.6`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.7`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.8`
   1 workflow/specs/stories/ADM-02-cafe-suspension.md:- **`ADM-02.9`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.10`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.11`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.12`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.13`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.14`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.15`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.16`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.17`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.18`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.1`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.2`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.3`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.4`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.5`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.6`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.7`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.8`
   1 workflow/specs/stories/ADM-03-review-moderation.md:- **`ADM-03.9`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.10`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.11`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.12`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.13`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.14`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.15`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.16`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.17`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.18`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.1`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.2`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.3`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.4`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.5`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.6`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.7`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.8`
   1 workflow/specs/stories/ADM-04-moderation-assistant.md:- **`ADM-04.9`
[exit 0]

$ bun /private/tmp/check-admin-specs.ts
ADM-01-cafe-applications.md: 13 sequential unique criteria; one requirement; source story exact
ADM-02-cafe-suspension.md: 13 sequential unique criteria; one requirement; source story exact
ADM-03-review-moderation.md: 18 sequential unique criteria; one requirement; source story exact
ADM-04-moderation-assistant.md: 18 sequential unique criteria; one requirement; source story exact
Relative links verified: 63
PASS: exact file scope, criterion format/identity, source stories and relative heading links
Shared-spec relative links verified (including every edited line): 58
[exit 0]

$ Baseline comparison of criterion IDs and protected paths
PASS: criterion identities preserved; shared specs, run01 handoff and PLAN unchanged
[exit 0]
```

### Repository verification output

`bun run verify` was executed exactly as written. The existing Vitest
tsconfig-paths advisory did not fail verification. These checks do not claim
implemented Admin behavior, human approval or deployed acceptance.

```text
$ bun run verify
$ bun run lint && bun run typecheck && bun run test && bun run check:traceability && bun run build
$ eslint
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
$ vitest run --passWithNoTests
The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.

 RUN  v5.0.5 /Users/shawnnygoh/github-repos/homebrew


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  17:52:09
   Duration  297ms (tests 89%, import 6%, worker 2%, transform 2%)

$ bun workflow/scripts/check-traceability.ts
Traceability passed (3 done tasks; all listed criteria have test titles).
$ next build
▲ Next.js 16.4.2 (Turbopack)
✓ Running next.config.ts took 22ms
- Cache Components enabled
- Partial Prefetching enabled

  Creating an optimized production build ...
✓ Compiled successfully in 684ms
  Running TypeScript ...
  Finished TypeScript in 1626ms ...
  Collecting page data using 5 workers ...
  Generating static pages using 5 workers (0/4) ...
  Generating static pages using 5 workers (1/4) 
  Generating static pages using 5 workers (2/4) 
  Generating static pages using 5 workers (3/4) 
✓ Generating static pages using 5 workers (4/4) in 683ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
└ ○ /_not-found


○  (Static)  prerendered as static content

[exit 0]
```

## Open issues for the next step

None. No assumptions or clarification requests were introduced.

## Suspicious content found

None.

## Human corrections

The run-02 request supplied the four review fixes and constrained this run to
the four story files and a new report. Those instructions were followed;
shared specs, PLAN, templates, skills, agents, code, tests and run 01 were
preserved.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| User-provided review fixes | Workflow facts | fixed | Removed existence notices while retaining plain dependency IDs |
| User-provided review fixes | Customer acceptance boundary | fixed | Assert RLS/SYS-05.3 data reads and retain customer-story UI/order ownership |
| User-provided review fixes | Missing exact mutation success bodies | fixed | Seven exact HTTP 200 JSON response bodies specified |
| User-provided review fixes | Moderation source fallback and audit deep link | fixed | Reject no-longer-pending selections before admission; display café name/review reference without deep link |

## Notes for reflection

- **What worked:** Snapshot comparison isolated run-02 edits despite the broader existing run-01 working diff.
- **What needed guidance:** The review fixes supplied exact ownership and transport decisions; no clarification was needed.
- **What to change in the agent or skill:** None in this scope.
