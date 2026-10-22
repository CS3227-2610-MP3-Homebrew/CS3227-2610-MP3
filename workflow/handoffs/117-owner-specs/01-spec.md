# Spec report

- **Agent:** spec (run in the human's coordinating Claude Code session)
- **Issue:** T-61 / #117 and T-64 / #120; new tasks T-67–T-80 / #140–#148, #150–#154
- **Spec IDs:** OWN-06.8–OWN-06.11, OWN-07.15–OWN-07.16, OWN-08.6–OWN-08.9, OWN-09–OWN-15 (all criteria)
- **Date:** 2026-10-22
- **Branch:** docs/117-owner-specs
- **Base commit:** e2cb3ce
- **Status:** completed

## Summary

The Café owner asked for the open owner decisions to be resolved and for specs
and issues for seven new owner features. The human delegated the decisions
that T-61 and T-64 reserved for a human, so the decisions below were made in
this session and are recorded here for review before merge.

- **T-61 (OWN-06/OWN-07):** a sale is a `collected` order dated by the
  Singapore date of `collectedAt`. The Dashboard covers 28 business dates
  ending today, with zero-filled daily and weekday rows and a top-10 item
  ranking by quantity, revenue, then item reference. Prep Advisor uses the 28
  completed dates before today, at most 10 current, non-archived items with all
  seven weekday aggregates, needs sales on at least 7 distinct dates, and
  rejects any suggestion whose direction contradicts the item's weekday average
  (`7 × q` versus total). The exact prompt and contract version `"1"` are
  unchanged, because `tests/integration/llm/prompts.json` pins the prompt text.
- **T-64 (OWN-08):** fixed S$10.00 recorded fee, approved non-suspended cafés
  only, one open boost at a time, 7-day Featured window from the ADM-06
  approval instant, badge only with no ranking change, panel on Dashboard.
- **New stretch stories:** OWN-09 prep sheet, OWN-10 pause new orders, OWN-11
  closure dates, OWN-12 per-slot order limit, OWN-13 archive/restore menu
  items, OWN-14 no-show, OWN-15 sales CSV export. Each is a separate pair at
  the owner's request. None adds navigation entries, AI or payment.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| T-61: sales figures, top-item fallback and Prep sufficiency/direction can be evaluated with explicit fixtures | completed | OWN-06 "Sales source and views", OWN-06.8–.11; OWN-07 "Prep source and decision basis", OWN-07.15–.16, evaluation cases E13–E17; INTEGRATION-SPEC "Owner sales boundary" |
| T-61: contracts on master before dependent execution | awaiting-decision | On this branch only; merge is a human step |
| T-64: request, fee and badge terms exact and coordinated with ADM-06 | completed | OWN-08 "Boost terms", OWN-08.6–.9; INTEGRATION-SPEC "Owner stretch operations boundary" |
| T-64: missing ADM-06 prerequisite reported | completed | See Open issues |
| New stories traced to PRODUCT-SPEC, story files, PLAN and issues | completed | PRODUCT-SPEC User stories rows OWN-09–OWN-15; seven story files; T-67–T-80 with issue links |

## Files changed

- `workflow/specs/PRODUCT-SPEC.md`: OWN-09–OWN-15 stories, requirements row,
  use case, navigation note and stretch count.
- `workflow/specs/stories/OWN-06`, `OWN-07`, `OWN-08`: decisions and new
  criteria as above.
- `workflow/specs/stories/OWN-09` to `OWN-15`: new story specs.
- `workflow/specs/INTEGRATION-SPEC.md`: owner sales boundary, owner stretch
  operations boundary, `no_show` state and matrix rows, pickup-slot cross
  references, Prep source pointer and direction validation, dependency rows.
- `workflow/specs/TECHNICAL-SPEC.md`: boost and closure entities, sale event,
  owner stretch operations integrity.
- `workflow/PLAN.md`: T-61 and T-64 done; T-62 todo; T-62/T-63 and T-65/T-66
  requirement lists extended; T-67–T-80 added with issue links; header counts
  now 33 pairs and 80 tasks.

Statuses reconciled: T-61 and T-64 done (spec tasks; their dependencies are
done). T-62 todo, because its dependencies T-61, T-08, T-10, T-12, T-14 and
T-16 are done. T-65 stays blocked on T-54 and the missing ADM-06 story. New
testing tasks are todo; new implementation tasks are blocked on their tests.
No testing or implementation task was promoted to done.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | failed, 1 error | The error is `.agents/skills/handoff/SKILL.md` missing from the Developer Guide inventory. That folder is untracked, predates this branch and is not part of this change. |
| `bun workflow/scripts/check-specs.ts <copy without .agents/skills/handoff>` | passed | "Spec check passed (0 warning(s))." |
| `bun run check:traceability` | passed | "Traceability passed (44 done tasks; all listed criteria have test titles)." |
| `git diff --check` | passed | No whitespace errors |

`bun run verify` was not run: this change edits only Markdown specs and the
plan, and no code or tests changed.

## Open issues for the next step

- **ADM-06 story missing.** OWN-08's activation depends on an Admin approval
  that sets `featuredFrom`/`featuredUntil` as defined in the owner stretch
  boundary. The Admin role owner needs to write ADM-06 consistent with it before
  T-65/T-66 can complete end to end.
- **Customer contracts touched.** OWN-10, OWN-11, OWN-12, OWN-13 and OWN-14 add
  Customer-visible effects (paused café message, closures, full slots, hidden
  archived items, `no_show`/"Not collected"). They are owned by the new owner
  stories and the integration spec, but the Customer role owner should review
  them because T-70, T-72, T-74, T-76 and T-78 change Customer code from
  T-41/T-43.
- **Issues created before merge.** At the owner's request, issues #140–#148 and
  #150–#154 were created from this branch, bypassing `create-issues.ts`'s
  merged-plan gate. Their PLAN and spec links resolve after this branch merges.
  Testing and implementation still wait until the specs are on master.

## Suspicious content found

None.

## Human corrections

The human chose all seven suggested features, one test/implementation pair
per feature, and delegated the T-61/T-64 decisions.

## Review responses

None.

## Notes for reflection

- **What worked:** The checker's root argument allowed a clean check without
  touching the unrelated untracked skill folder.
- **What needed guidance:** Feature selection and issue shape.
- **What to change in the agent or skill:** None.
