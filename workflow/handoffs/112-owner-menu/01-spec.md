# Spec report

- **Agent:** spec
- **Issue:** #112 (T-56); T-57 is #113
- **Spec IDs:** OWN-03, OWN-03.8 (amended), OWN-03.9 (new)
- **Date:** 2026-10-23
- **Branch:** docs/112-own03-approved-only
- **Base commit:** 6a68ec2
- **Status:** completed

## Summary

Recorded the café-owner role owner's (naa-siuuuu-ff) decision, relayed by the
coordinating session: owner menu mutations require an approved café
application. That includes an approved café that is suspended (OWN-03.7 and
ADM-02 unchanged). Pending or rejected cafés get 409 STATE_CONFLICT with no
write. No-café behaviour and GET /api/owner/menu are unchanged. The amendment
is drafted and passes check:specs. It is not approved until a spec PR merges.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| OWN-03.9 added (new ID; existing IDs stable) | completed | Story spec diff; `bun run check:specs` passed |
| OWN-03.8 amended to defer pending/rejected mutations to OWN-03.9 | completed | Story spec diff |
| INTEGRATION-SPEC Owner menu boundary states approved-only rule, 409, no write and check order | completed | INTEGRATION-SPEC diff |
| PLAN T-56/T-57 requirement lists include OWN-03.9 | completed | PLAN diff; Status lines untouched |

New criterion text:

> **`OWN-03.9`:** Given an owner whose own café application is `pending` or `rejected`, when it requests a schema-valid menu create, save or remove, then the response is `409 STATE_CONFLICT` under the shared error shape with “Menu changes are available once your café is approved.”, whatever item reference is supplied, and nothing is written: no item is created, changed or removed; the Menu page shows that message and preserves the owner's unsaved input; the same request for an approved café, suspended or not, proceeds under OWN-03.2 and OWN-03.7, and owner menu reads are unchanged.

Text appended to OWN-03.8:

> ; a mutation by an owner whose café is pending or rejected is decided by OWN-03.9 instead of an item 404.

New INTEGRATION-SPEC paragraph (Owner menu boundary):

> Menu mutations are approved only: create, save and remove require the owner's café applicationState to be approved, including an approved café that is currently suspended. For a pending or rejected café, each mutation returns 409 STATE_CONFLICT with “Menu changes are available once your café is approved.” and writes nothing, matching the pending/wrong-state owner settings conflicts above. The Menu page shows that message and preserves unsaved input. The application-state check runs inside the same transaction as the write. GET /api/owner/menu is not restricted by application state. Mutation checks apply in this order, the first failure deciding the response: shared transport, session and role checks (401/403 and the other shared transport codes); request validation (400); no café (404); application state not approved (409), whatever item reference is supplied; missing or foreign item (404); expectedSuspensionVersion mismatch (409 with the suspension message above); then duplicate name (409).

## Files changed

- `workflow/specs/stories/OWN-03-menu-management.md`: lifecycle prose, Access bullets, OWN-03.8 clause, new OWN-03.9, UC-OWN-03-1 precondition, and the Permissions table (read and mutate rows now separate). Assumptions remain "None."
- `workflow/specs/INTEGRATION-SPEC.md`: new approved-only paragraph with check ordering in "Owner menu boundary".
- `workflow/PLAN.md`: T-56/T-57 Requirements lists include OWN-03.9. Their acceptance-criteria text says "nine" instead of "eight". No Status lines changed.
- `workflow/handoffs/112-owner-menu/01-spec.md`: this report.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | passed | "Spec check passed (0 warning(s))." |
| `bun run check:traceability` | passed | "Traceability passed (57 done tasks; all listed criteria have test titles)." T-56/T-57 are not done, so OWN-03.9 does not need a test title yet. |

## Open issues for the next step

- Resolved by the human (naa-siuuuu-ff, relayed by the orchestrator): the check
  order drafted in the INTEGRATION-SPEC paragraph is approved as written.
- Resolved by the human (naa-siuuuu-ff, relayed by the orchestrator): the
  pending/rejected 409 uses the fixed message “Menu changes are available once
  your café is approved.” The Menu page shows it and preserves unsaved input.
  It is now in OWN-03.9 and the Owner menu boundary paragraph, phrased like the
  existing suspension-mismatch message.
- PLAN pair count is unchanged at 35 pairs (84 tasks). On instruction, statuses were not reconciled in this run. T-56 remains `todo` and T-57 `blocked`; no 112/113 handoff evidence existed before this report.
- Approval requires merging a spec PR. T-56/T-57 work from master only after that.

## Suspicious content found

None.

## Human corrections

- Check order approved as drafted; no change made.
- Fixed 409 message and Menu-page unsaved-input behaviour added to OWN-03.9 and the INTEGRATION-SPEC paragraph; `bun run check:specs` rerun and passed.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | None |

## Notes for reflection

- **What worked:** Adding a new criterion ID kept existing IDs stable. Stating the full check order makes the 404/409 interplay deterministic for tests.
- **What needed guidance:** The ordering of approval-state vs item-404 and suspension-version checks was not covered by any existing convention.
- **What to change in the agent or skill:** spec-create could prompt authors to state the check order whenever a route has more than one 404/409 condition.
