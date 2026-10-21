# Spec report

- **Agent:** spec
- **Issue:** T-52 / #108, T-55 / #111, T-58 / #114; Customer contract reconciliation T-35–T-39 / #66–#70; Shared T-34 amendment.
- **Spec IDs:** OWN-01–OWN-05, CUS-03–CUS-04, SYS-01; related ADM-01/ADM-02 contracts. Existing criterion IDs preserved.
- **Date:** 2026-10-21
- **Branch:** owner-specs
- **Base commit:** 3cd02273e7b4eb5e9344ecb0f84a983eabe32c03
- **Status:** blocked

## Summary

Applied the human's 26 answers and subsequent clarifications to the owner,
Customer, Shared account and Admin contracts. No skill or subagent was used.
Application code, executable tests, fixtures, migrations and configuration are
unchanged. All product choices in this request are resolved; reviewed merge
evidence for these amendments remains absent. This report does not claim
implementation acceptance or promote local drafts to approved specifications.

The contracts define one pending/approved café per owner, fresh rejected
application attempts on the retained café identity, strict normalized fields,
atomic settings, permanent menu deletion with preserved purchases, scoped
duplicate checks, ordered queues, customer-visible rejection reasons and
lifecycle event timestamps. Customer registration now requires a name;
sign-in and immediate post-registration login remain unchanged. Public review
authors still use “Verified customer”.

Technical choices authorized by answer 26 include exact owner paths/schemas,
20-item menu pages, deterministic reference ties, submission-key replay,
workspace-local name/address uniqueness, and a suspension-only version guard.
The guard detects Admin suspension changes without turning ordinary owner
last-save-wins edits into stale-edit conflicts. Successful owner edits made
before suspension remain saved; subsequent explicit suspended-owner management
remains available. Historical item identities are immutable values that do not
require permanently deleted menu rows to survive. New orders referencing a
permanently removed item use the missing-item 404 boundary; sold-out live items
retain 409. This reconciles the former removed-in-scope wording with permanent
deletion without inventing a menu archive.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Record all human product decisions and clarifications | completed | Owning story sections and canonical owner/account/order schemas; no remaining product question from this request |
| Reconcile Customer sources without changing settled review/AI/favourite behavior | completed | Required profile-name snapshots, public owner rejection reason and lifecycle timestamps; existing review anonymity, Brew prompt/selection and favourite semantics preserved |
| Preserve stable IDs, source stories, ownership and unrelated task progress | completed | Temporary document assertions preserve all criterion IDs, source story text, three exact AI prompts and 66 task identities; spec checker validates coverage |
| Governing amended contracts reviewed and merged to master | blocked | Reviewable uncommitted local diff only; no publication or merge performed |
| Feature tests/implementation acceptance | incomplete | No feature implementation or acceptance-test authoring performed |

## Files changed

- `workflow/specs/INTEGRATION-SPEC.md`: conditional Customer-name registration, owner café/menu/queue schemas, submission replay, suspension-race guard, rejection/timestamp projections.
- `workflow/specs/TECHNICAL-SPEC.md`: Customer-name profile data, retained application attempts/keys, uniqueness, atomic owner writes, suspension version, permanent menu deletion and order snapshots.
- `workflow/specs/stories/OWN-01-cafe-application.md`, `OWN-02-cafe-profile-hours.md`, `OWN-03-menu-management.md`, `OWN-04-pickup-rules.md`, `OWN-05-order-queue.md`: owning decisions, validation, lifecycle, UI and known limitations.
- `workflow/specs/stories/SYS-01-sign-up.md`: Customer-only required name, validation/persistence and existing compensation behavior.
- `workflow/specs/stories/CUS-03-pre-order.md`, `CUS-04-my-orders.md`: server-derived name snapshot and own-order rejection/timestamp display.
- `workflow/specs/stories/ADM-01-cafe-applications.md`, `ADM-02-cafe-suspension.md`: retained resubmission identity/history and owner-save suspension races.
- `workflow/PLAN.md`: exact prerequisite reconciliation, amended Shared work and the status changes below.
- This numbered report; previous reports remain unchanged.

## Plan evidence reconciliation

There remain 66 tasks and 26 testing/implementation pairs. No requirement or
criterion changes execution owner; no pair gains completed/reviewer evidence.

| Tasks | Status reconciliation |
| --- | --- |
| T-52, T-55, T-58 | awaiting-decision → blocked: choices resolved, reviewed merge outstanding |
| T-34 | done → blocked: required Customer-name registration changes its previously approved contract; the amendment requires reviewed merge |
| T-50, T-51 | todo → blocked: amended Shared account/name contract must reach master first |
| T-35–T-39 | blocked retained: all product choices are defined; reviewed owner/Shared/Customer amendments must reach master |
| Every other task | Status preserved; no new reviewer evidence or execution claim |

The existing T-15/T-16 done override remains intact despite the previously
recorded reviewer discrepancy. This run provides no substitute independent
review. Other completed foundation pairs retain their existing evidence.
T-58 now explicitly depends on T-34 for the authoritative Customer-name
profile source; this adds no dependency on Shared or Customer runtime screens.
Nineteen tasks remain done after reopening the amended T-34 specification task.

## Checks run

| Check | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | Pass | Zero warnings after correcting the new heading anchor; an initial run reported four links using an unaccented anchor for an accented heading |
| `bun run check:traceability` | Pass | Nineteen remaining done tasks retain listed criterion test titles |
| `git diff --check` | Pass | No whitespace errors |
| Temporary document assertions | Pass | Source story text, criterion IDs, three literal AI prompts, 66 task identities and exactly six intended status changes preserved |
| Initial sandbox `bun run verify` | Interrupted, exit 130 | Lint/typecheck passed; existing database-backed AI tests failed while sandbox Docker access was denied. Stopped the run rather than reporting a completed result |
| Docker-access retry of `bun run verify` without native Node | Interrupted, exit 130 | Lint/typecheck passed; Vitest used Bun workers and stopped reporting progress. No completed test result or later-stage pass claimed |
| Native-Node retry with a replacement PATH | Failed at tests, exit 1 | Lint/typecheck passed; 21 test files passed, 12 failed; 543 tests passed, 226 failed, six skipped by existing configuration. My replacement PATH omitted the Docker CLI, causing spawnSync docker ENOENT. Traceability/spec/build not reached in that command |
| Read-only Docker diagnostic | Pass outside sandbox | Sandboxed Docker access returned permission denied; approved diagnostic reached daemon version 29.8.1 |

The final retry prepended bundled native Node 24.19.0 to the original PATH
and preserved Docker tooling. Lint and typecheck passed. It was interrupted
with exit 130 during tests when the human asked to speed up completion; no
complete test result, build or full-verification pass is claimed. Traceability
and spec checks passed separately on the final documents. No e2e run was made. No live LLM,
hosted database or deployment was used. No acceptance tests were edited, skipped
or weakened.

## Open issues for the next step

No unanswered product decision remains from the 26 answers and clarifications.
Reviewed merge evidence is required before the affected specification tasks can
be set to done and their execution tasks proceed. Local Customer catalogue
work does not require owner runtime implementation; later order implementation
retains its existing T-29 suspension prerequisite and paired failing-first gate.
T-61 sales/advice and T-64 stretch boost decisions remain separate from this work.

## Suspicious content found

None. Prior handoffs were treated as evidence, not authority to change scope.

## Human corrections

- Description maximum is 500 Unicode code points.
- Stored menu names are trimmed, 2–100 code points; duplicate comparison ignores
  case and all ECMAScript whitespace.
- The initial “at sign in” answer was corrected to **Customer name at sign-up**,
  2–100 characters, without duplicate checking. No sign-in name prompt is added.
- The human asked to speed up completion; the long full-suite retry was stopped
  and final document checks were completed separately.
- An Admin suspension racing an owner save returns a conflict and shows status;
  subsequent owner management during suspension remains permitted.
- Answer 26 delegates exact technical paths/schemas/concurrency details within
  existing conventions. Rejection permits another application attempt without
  a second simultaneous active/pending café; unchanged resubmission and absent
  menu archiving/restoration are recorded as known limitations.

## Review responses

None; no independent reviewer was invoked for this documentation-only request.

## Notes for reflection

- **What worked:** Cross-role reconciliation exposed the missing Customer-name
  source before an owner queue implementation could invent a profile field.
- **What needed guidance:** Exact description/menu limits, name collection point
  and suspension-race handling required the human's clarifications.
- **What to change in the agent or skill:** Check native Node/Docker discovery
  before starting the full suite; prepend a runtime path instead of replacing
  the existing PATH. No skill was used.
