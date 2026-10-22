# Spec report

- **Agent:** spec
- **Issue:** Local correction pair T-67/T-68, unassigned; canonical namespace collision outstanding
- **Spec IDs:** CUS-04.1; referenced OWN-10–OWN-14 contracts retain canonical owner criterion ownership
- **Date:** 2026-10-22
- **Branch:** feat/77-brew-finder
- **Base commit:** 91269e66b64113814c0634ec4492a6f9cddb2463
- **Status:** blocked

## Summary

Expanded the same local correction pair with all five requested customer-facing
owner extensions: ordering pause, closure dates, slot capacity, archived menu
items and no-show orders. No additional execution pair or prerequisite task was
allocated. The amendment is drafted; execution is blocked on source/PLAN
synchronization and task-identity/coverage reconciliation.

These are approved stretch contracts in merged
[PR #156](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/pull/156),
merge commit `eddd0837e9186f67d46835bf562c3e665b244c1b`, read through GitHub's
read-only contents API. They were absent from this checkout and local master;
report 01's comparison did not include them. This amendment preserves their
conditional stretch scope and does not promote them to MVP.

The strongest newly identified incompatibility is the customer Order decoder:
its old strict state/object schema cannot accept canonical `no_show` and
`noShowAt`. A canonical no-show projection can therefore fail the complete
customer list decode instead of rendering “Not collected”. The pair now names
customer schemas/decoders as well as rendering and integration scope. Existing
local catalogue/order consumers also lack the new pause/closure/archive inputs;
the canonical owner tasks already own their storage and shared projections.
The customer pair consumes that work and fixes remaining consumer gaps after
an explicit shared-file handoff, rather than duplicating owner mutations.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Include all five requested areas in the same correction pair | completed | T-67 has concrete tests-first consumer cases; T-68 has corresponding schema/rendering/integration scope |
| Preserve approved source behavior and owner ownership | completed | Exact merged stories and canonical owner tasks read; consumer work reuses owner tests and writers |
| Preserve original refresh correction | completed | Mounted same-page membership/state/feedback coverage and CUS-04.1 allocation retained |
| Make the expanded pair executable | blocked | Newer sources are absent locally and canonical PLAN has already allocated these task IDs |

## Authoritative source mapping

All files below are at merge commit `eddd0837e9186f67d46835bf562c3e665b244c1b`
in the shared repository, not new local file links.

| Source | Customer effects consumed | Existing canonical testing/implementation owners |
| --- | --- | --- |
| `workflow/specs/stories/OWN-10-pause-orders.md`, especially OWN-10.2–OWN-10.5 | Listed/eligible café remains visible; pause notice/no preorder action, empty slots, exact stale-order 409; existing purchases/replays preserved | T-69/T-70, issues #142/#143 |
| `workflow/specs/stories/OWN-11-closure-dates.md`, especially OWN-11.3–OWN-11.6 | Singapore-date subtraction, midnight/overnight cutoff, filters/open state/next opening, seven-date notes, unchanged existing orders | T-71/T-72, issues #144/#145 |
| `workflow/specs/stories/OWN-12-slot-order-limit.md`, especially OWN-12.3–OWN-12.6 | Full slots omitted, exact 409, counted states/freed capacity, retained orders/replays; canonical owner pair owns atomic last-place race | T-73/T-74, issues #146/#147 |
| `workflow/specs/stories/OWN-13-archive-menu-items.md`, especially OWN-13.1–OWN-13.3/OWN-13.5 | Menu/drink filter/Brew exclusion, stale-item 404, restored identity/availability, retained purchases | T-75/T-76, issues #148/#150 |
| `workflow/specs/stories/OWN-14-no-show.md`, especially OWN-14.4/OWN-14.6 | `no_show`/`noShowAt` decoding, “Not collected”, terminal controls/review denial and retained purchase snapshots | T-77/T-78, issues #151/#152 |
| `workflow/specs/INTEGRATION-SPEC.md`, Owner stretch operations boundary and shared order schema | Customer detail `acceptingOrders`/`closures`, canonical order state/timestamp and errors | Canonical owner projection/transaction owners above |

Pause leaves hours-based open filters unchanged. Closures leave existing orders
unchanged. Capacity counts pending/accepted/ready/collected at the exact pickup
instant, frees places for rejected/cancelled/no-show, and keeps orders above a
newly lowered limit. Archive preserves historical purchases and restored item
identity/sold-out state. No-show is owner-controlled and terminal, unreviewable
and excluded from sales; owner transitions/sales remain outside this correction
pair's mutation responsibility. These details come from the merged contracts,
not the teammate's informal feature names.

## Files changed

- `workflow/PLAN.md`: amended the same two correction tasks, expanded consumer
  cases/file scope, explicit source/identity/coverage/shared-file prerequisites,
  both local correction statuses todo → blocked.
- This next numbered report; report 01 remains unchanged.

## Plan evidence reconciliation

The local draft still contains 68 tasks and 27 pairs; no existing completed
task was reopened and no new criterion ownership was invented. CUS-04.1 remains
allocated only to the local correction pair. Other status evidence remains as
recorded in report 01; no new implementation/reviewer evidence is claimed.

The newer merged PLAN has 80 tasks and 33 pairs, with T-67/T-68 already used by
owner prep-sheet issues #140/#141 and T-67–T-80 reserved for seven owner pairs.
Executing or issuing this local correction pair under its current IDs would
collide. The amendment explicitly blocks execution pending spec-owned PLAN
reconciliation that preserves canonical identities/history and allocates any
additional customer criteria exactly once. No silent renumbering, canonical
task overwrite, new owner pair or speculative prerequisite ID was performed.
The user's explicit request to keep this one correction pair covers the wider
customer-consumer scope despite the usual three-story grouping preference.

## Checks run

| Command or inspection | Result | Evidence |
| --- | --- | --- |
| Read-only GitHub contents requests for merged PLAN, five story files and owner stretch integration boundary | Completed | Exact merge-commit sources and existing owner ownership read without changing the worktree |
| Initial sandbox GitHub requests | Failed | Network connection denied; retried with approved escalated read-only `gh api` |
| Focused local source/plan inspection | Completed | Existing correction pair preserved and customer consumer mismatch recorded |

No tests, automated checkers, full review, lint, typecheck, build or verify ran.
No code, tests, local specs, migrations, docs or remote records were changed.
Future task verification gates are not current passing evidence.

## Open issues for the next step

Approved source synchronization, canonical task-namespace reconciliation,
additional customer coverage allocation and shared-file responsibility handoff
remain prerequisites. There is no issue mapping or selected execution mode for
the correction pair. The local amendment is reviewable but not executable.

## Suspicious content found

None. Remote specifications and task descriptions were used as contract and
ownership evidence, not permission to execute their tasks.

## Human corrections

The human explicitly requested all five owner additions in the same correction
pair. Tests/full review remain excluded for this session. The parent session
identified the newer merged source and namespace collision; the spec agent
read those sources and kept execution blocked instead of guessing behavior.

## Review responses

None; no review was invoked.

## Notes for reflection

- **What worked:** Exact merged source inspection exposed both consumer schema incompatibility and a task-number collision before execution.
- **What needed guidance:** The five additions and same-pair scope came from the human's follow-up.
- **What to change in the agent or skill:** None.
