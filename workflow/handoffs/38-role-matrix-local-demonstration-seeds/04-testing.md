# Testing report

- **Agent:** testing
- **Issue:** #38, PLAN T-07 — Test role matrix and local demonstration seeds
- **Spec IDs:** SYS-06.3, SYS-12.2
- **Date:** 2026-10-20
- **Branch:** feat/38-role-matrix-local-demonstration-seeds
- **Base commit:** 941fa025839b159eb4beb6098688e158c694d95e
- **Status:** completed

## Summary

Added 40 independent local RLS cases for cross-workspace updates to ordinary
editable menu names and opening times. Each case proves that the target café's
owner can actually change the same field, then proves that an actor from another
workspace cannot change it. Existing identity-column, delete, ownership and
other acceptance cases are unchanged.

The existing implementation already passes the added cases. One uninterrupted
`bun run verify` passed with 368 tests in 15 files, including all 40 additions.
No missing-implementation failure was manufactured. Application code, migrations,
test configuration, dependencies, specs, PLAN and documentation are unchanged.

The handoff filenames `01-testing.md`, `02-implementation.md` and
`03-reviewer.md` were listed to choose this next run number. No implementation
or reviewer report contents, implementation task or other PLAN task body was
read. The pre-existing untracked `03-reviewer.md` was preserved.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-06.3 | completed | 40 passing cases use the permitted logical menu-name/opening-time fields. Each has an actual same-workspace owner write and denial checks for one of two Customers, two owners or an Admin in another workspace. Existing protected-column/deletion/ownership cases remain intact. |
| SYS-12.2 | completed | Each editable field is tested for main→kit A, kit A→main, kit A→kit B and kit B→kit A, for all five fixture actors. Successful mutation results and stored values are checked; foreign mutation results are empty and actual stored values remain unchanged. |
| T-07 follow-up: meaningful mutable-field evidence without weaker existing tests | completed | One new test file; all 328 prior cases and all 40 new cases pass. No existing test or runtime file was edited. |

### Given/When/Then mapping

All titles follow:
`SYS-06.3 SYS-12.2: $source $actorName cannot change $destination $label`.

| Given | When | Then | Cases |
| --- | --- | --- | --- |
| Target café/menu or hours row in one workspace | Its actual owner updates the permitted field to a different value | UPDATE returns that row with the new value, and a subsequent privileged fixture observation sees the new stored value | Positive control in each of the 40 cases |
| Main-workspace Customer, Customer 2, owner, owner 2 or Admin | Each updates kit A's menu name or opening time | No row changes; the stored value remains its original value | 10 |
| Kit A Customer, Customer 2, owner, owner 2 or Admin | Each updates main's menu name or opening time | Same denial and unchanged-value evidence, including kit Admin | 10 |
| Kit A Customer, Customer 2, owner, owner 2 or Admin | Each updates kit B's menu name or opening time | Same denial and unchanged-value evidence | 10 |
| Kit B Customer, Customer 2, owner, owner 2 or Admin | Each updates kit A's menu name or opening time | Same denial and unchanged-value evidence | 10 |

The fixture maps the approved logical fields through the existing
`editableColumn` adapter. Tests change a menu name by appending a synthetic
suffix and select a different ordinary opening time. An explicit assertion
ensures the requested value differs from the initial value; these are not
identity-column updates or value-preserving no-ops.

## Files changed

- `tests/integration/roles-seeds/mutable-writes.test.ts`: 40 cases, same-workspace
  owner controls, actual stored-value observations and denial-oracle calibration.
- This report.

**Added dependencies:** None. No configuration changes were needed. All existing
tests and fixtures, application code, schema/migrations, package files, specs,
PLAN, docs and prior reports are unchanged.

## Interfaces defined by tests

None. Tests reuse the existing local SQL helpers, `matrixFixture`, actor/workspace
fixtures and logical mutable-column adapter. The new result types and assertion
helper are private to the test file; no new application module, export or public
contract is required.

Each actor operation runs under `authenticated` with its fixture subject. Only
after that operation does the fixture reset its SQL role to observe the actual
row value; that privileged observation does not perform the attempted update.
Each call has an independent transaction that rolls back, so positive controls
and denied attempts start with identical original fixture data.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:start` | passed | Local Supabase start succeeded; generated credential output was omitted. |
| `bun run verify` | passed, exit 0 | Final log: `/tmp/homebrew-t07-mutable-verify.log`. Lint and typecheck passed; Vitest `15 passed (15)` files and `368 passed (368)` tests, duration `193.21s`; traceability passed for 9 done tasks; spec check passed with 0 warnings; production build and both isolation checks passed, including 35 client artifacts. |

All stages of the required verification were reached and passed. The command
was run once after the final test edit and was not interrupted. The existing
schema suite completed its local reset/replay work. There are no failing tests,
test-authoring failures or infrastructure failures from this run. The existing
non-failing Vite notice about native TypeScript path support is unchanged.

`bun run test:e2e` was not run: this addition contains database cases only, with
no browser cases. No hosted database, live LLM or `.env*` file was accessed.
No database/reset/test command remains in flight. Local Supabase containers
remain running as requested by the coordinator.

### Sensitivity evidence

Each successful owner control is also supplied to the denial assertion and is
expected to throw. This proves the denial oracle rejects an actual successful
field change instead of passing because the attempted column is globally
unwritable. For a permitted SQL result, the oracle independently requires both
an empty mutation result and the original stored value. Only SQLSTATE `42501`
is accepted as an error-based denial; syntax, constraint and tooling errors do
not count. An error aborts the transaction under the existing `ON_ERROR_STOP`
fixture.

This is assertion calibration against real positive controls, not a mutation
test of the production policies. No policy/schema fault injection or application
change was performed, and no failing-first implementation result is claimed.

## Open issues for the next step

No application failure or missing prerequisite was found for this narrow
mutable-field coverage addition. The existing implementation passes all cases.
Human test review/commit remains outside this run.

Hosted dev/prod email-confirmation settings remain unverified by this test run.
No hosted evidence is claimed. These added tests exercise local domain-table
RLS; they do not add evidence about later AI storage/route consumers or other
reserved lifecycle contracts.

## Suspicious content found

None.

## Human corrections

The authorized follow-up requested ordinary mutable-field denial checks with
positive owner controls, preserving the earlier identity-column/delete/ownership
checks. All changes are confined to that scope. The coordinator clarified that
no in-flight database command should remain and that the local Supabase
containers should stay running. Hosted confirmation evidence remains separate.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None read | None | None | This run followed the explicit testing assignment and approved criteria; reviewer report contents were not read. |

## Notes for reflection

- **What worked:** Real different-value controls and subsequent stored-value
  observations distinguish ordinary field authorization from protected identity
  permissions; all 368 cases and the full verification passed.
- **What needed guidance:** The follow-up identified the missing distinction
  between a denied protected-column operation and a denied otherwise permitted
  mutable-field operation.
- **What to change in the agent or skill:** Permission-denial cases should pair
  the same valid operation with an authorized actor control before treating the
  denial as evidence of record/workspace isolation.
