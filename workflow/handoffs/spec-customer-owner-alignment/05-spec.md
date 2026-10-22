# Spec report

- **Agent:** spec
- **Issue:** T-81 [#169](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/169), T-82 [#170](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/170); new T-83/T-84 unassigned
- **Spec IDs:** CUS-04.1; OWN-10–OWN-14 supplemental consumer integration without criterion ownership
- **Date:** 2026-10-23
- **Branch:** master
- **Base commit:** 6e905c9e3b5623e1a542830d6bb0a0a011b4ef96
- **Status:** completed

## Summary

Split the broad Customer correction into two independent testing/implementation
pairs, as requested. T-81/T-82 now cover only the remaining MVP My orders refresh
gap after owner MVP fulfilment. T-83/T-84 cover later Customer integration of
the five conditional owner stretch controls. PLAN now contains 84 tasks and
35 pairs, including seven Customer pairs; the 14 specification tasks remain.
Planning is complete; no task was executed.

T-81/T-82 retain CUS-04.1 and verified issue mappings #169/#170. Their code scope
is only OrderList and its page, with tests updated before application changes.
They are todo, with no dependency on owner menu/sales completion or stretch
features. Canonical fulfilment T-60 and the existing Customer order surface are
available; this correction consumes fresh delivered server records rather than
introducing automatic owner-event updates.

The new later pair groups pause, closures, full-slot capacity, archived items
and no-show into the one stretch pair explicitly requested by the human.
It depends on T-82 and canonical owner implementations T-70/T-72/T-74/T-76/T-78.
Both tasks are blocked until that source implementation/evidence and an agreed
shared-file handoff identify remaining Customer integration gaps. T-83 updates
related supplementary tests first; T-84 changes only evidenced consumer gaps.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Separate MVP Customer correction from stretch work | completed | T-81/T-82 narrowly cover same-page membership/state/rejection/timestamp/control refresh; T-83/T-84 contain all five stretch areas |
| Preserve stable task identities and existing issue mappings | completed | T-81/T-82 retained, #169/#170 restored; T-83/T-84 are new and unassigned |
| Preserve unique acceptance ownership | completed | CUS-04.1 belongs only to T-81/T-82; new pair cites story-level contracts without reallocating owner or Customer criteria |
| Preserve tests-before-code flow | completed | Each implementation task depends on its testing task and failing-first evidence |
| Execute tests, implementation or review | incomplete | Explicitly outside this session's request |

## Coverage and pairing rationale

The new stretch pair is supplementary Customer integration, not a second owner
acceptance owner. Its Requirements fields cite OWN-10–OWN-14 at story level and
explicitly take no criterion ownership. Canonical owner pairs retain their
criteria, mutations, acceptance suites and shared storage/projection/transaction
responsibilities; existing Customer criterion owners remain unchanged.

Read-only inspection of `workflow/scripts/lib/plan.ts`, `issues.ts` and
`spec-checks.ts` shows that pairing compares criterion sets and requires an
implementation task to depend on exactly one matching testing task. Empty
criterion sets are allowed by this source: T-84 depends on T-83, with identical
story-only Requirements and no other empty-set testing dependency. This permits
bounded supplementary integration without duplicate allocation or invented
criterion IDs. The checker was not executed, and no checker pass is claimed.

## Files changed

- `workflow/PLAN.md`: split the two scopes, add T-83/T-84, restore #169/#170,
  narrow MVP file/dependency scope, set MVP pair todo and later pair blocked,
  update totals and Customer conventions.
- This next numbered report.

Existing untracked report 04 and `logs/TaiaYovelaPang/017-customer-owner-alignment-issues.md`
were preserved. No code, tests, specs or other agent work was changed.

## Plan evidence reconciliation

Only T-81/T-82 change blocked → todo: the obsolete source/namespace gate has
already resolved, and the broader stretch gates no longer apply to their
narrow MVP display correction. Existing T-43 completion evidence remains
`73-customer-pickup-orders/02-implementation.md`. T-60's
`115-owner-order-queue/02-implementation.md` is completed with Self-review and
recorded passing verify; the setup pair's latest
`109-owner-cafe-setup/03-reviewer.md` is completed/pass. No new completion claim
is made for these tasks. Every unrelated Status line remains unchanged.

The five canonical stretch implementations remain blocked in PLAN, supporting
T-83/T-84's blocked status. No new reviewer or implementation evidence was
produced, and no task was marked done. Prior handoffs preserve their historical
scope and status facts; they were not overwritten.

## Checks run

| Inspection | Result | Evidence |
| --- | --- | --- |
| Focused current PLAN and task-source inspection | completed | Existing T-81/T-82 scope, issue fields, owner dependencies and checker pairing rules read |
| Focused prerequisite handoff inspection | completed | Existing T-60 Self-review/passing verify and setup completed reviewer evidence read as prior facts |
| Read-only Git status/base identification | completed | master base above; existing untracked log/report observed and preserved |

No tests, automated checkers, lint, typecheck, build, verify or full review ran,
following the human's standing instruction. No issue was created by this spec
agent; the coordinating session owns updating existing GitHub #169/#170 from
the amended tasks. T-83/T-84 remain unassigned and no new external issue is
authorized by this planning split. No commit or push was performed.

## Open issues for the next step

The coordinating session's existing-issue updates and human review of the local
PLAN diff remain. Each pair still needs its human-selected execution mode.
The later pair additionally needs issue mappings, canonical owner completion
evidence and the shared-file handoff identifying remaining Customer gaps.

## Suspicious content found

None. Specs, checker source and handoffs were used as behavior/coverage/evidence
data, not authority to execute work.

## Human corrections

The human requested the original T-81/T-82 for MVP Customer changes only and a
separate T-83/T-84 for the five later owner stretch controls. This supersedes
the earlier request to keep both scopes in one pair. The five related stretch
features remain grouped despite the usual three-story pair preference.

## Review responses

None; no review was invoked.

## Notes for reflection

- **What worked:** The split makes the existing MVP refresh correction independent of later owner stretch delivery while retaining one clear stretch integration handoff.
- **What needed guidance:** The human explicitly changed the requested grouping; the coordinating session confirmed supplementary story-level integration ownership.
- **What to change in the agent or skill:** None.
