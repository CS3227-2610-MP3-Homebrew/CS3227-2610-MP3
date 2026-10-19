# Spec report

- **Agent:** spec
- **Issue:** Customer GitHub issue publication, T-35–T-49.
- **Spec IDs:** CUS-01–CUS-07; 67 criteria with unchanged task ownership.
- **Date:** 2026-10-19
- **Branch:** customer-specs
- **Base commit:** 725e8969e40df92721f1c8f50814231ac36cbd0b
- **Status:** incomplete

## Summary

All 15 requested Customer issues were created and verified in the shared
`CS3227-2610-MP3-Homebrew/CS3227-2610-MP3` GitHub repository: five specification
prerequisites and ten testing/implementation tasks, issues #66–#80. They belong
to the [Customer milestone](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/milestone/3)
and have the corresponding spec/testing/implementation labels. The missing
`spec` role label and Customer milestone were created as part of publication.
All 15 issue links were written into their PLAN.md Issue fields.

Issue publication and mapping are finished. Status is incomplete solely because
the required full repository verification still fails in the existing
Vitest/jsdom worker setup; it is not a claim that GitHub creation is pending.
Spec checks pass with zero warnings. No implementation or specification
approval is claimed.

The standard creation script normally requires PLAN.md to match merged master.
Its dry run prepared the exact 15 issues and found no duplicates. The human
then explicitly authorized publication before merge, answering “Create from
the local draft now” to the stated exception. A temporary publisher reused
the repository's canonical issue-rendering/mapping helpers, without modifying
the repository script or its guards. Each issue clearly identifies its local
draft source and retains all status, blocker and merge prerequisites. Master
links are identified as intended canonical locations that become available
after merge; no unpublished branch is represented as remotely available.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence |
| --- | --- | --- |
| Create the 15 Customer issues without duplicates | completed | T-35–T-49 map to #66–#80; read-back found exactly one open issue per task |
| Preserve task descriptions, scope, criteria and blockers | completed | Every remote body equals its final rendered local body, including the draft-source notice; role labels and milestone verified |
| Resolve dependencies and testing/implementation pairs | completed | Created issue references were rerendered after numbers became available; existing foundation/Admin issue references retained |
| Link issues in PLAN.md without changing task content/statuses | completed | Comparison against the publication snapshot passes after normalizing Issue lines only |
| Preserve existing work and task ownership | completed | No task/criterion/status changes; 20 pairs remain, including five Customer pairs; existing local work was not discarded |
| Full repository verification | incomplete | Lint/typecheck passed; test stage failed with one unhandled jsdom worker error despite 24 passing tests; later stages not reached |

## Files changed

- `workflow/PLAN.md`: replaced only T-35–T-49's unassigned Issue fields with verified GitHub links.
- `workflow/handoffs/spec-customer-stories/03-spec.md`: this report; earlier reports unchanged.

No application code, specs, tests, workflow scripts, configuration or lockfile
was changed in this publication step. No commits, pushes or PRs were made.

## Issue mapping

| Task | Issue |
| --- | --- |
| T-35: Catalogue/café contracts | [#66](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/66) |
| T-36: Pickup/order/suspension contracts | [#67](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/67) |
| T-37: Review contracts | [#68](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/68) |
| T-38: Brew Finder contracts | [#69](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/69) |
| T-39: Stretch favourite contracts | [#70](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/70) |
| T-40: Test catalogue/café pages | [#71](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/71) |
| T-41: Implement catalogue/café pages | [#72](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/72) |
| T-42: Test pickup/My orders | [#73](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/73) |
| T-43: Implement pickup/My orders | [#74](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/74) |
| T-44: Test reviews | [#75](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/75) |
| T-45: Implement reviews | [#76](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/76) |
| T-46: Test Brew Finder | [#77](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/77) |
| T-47: Implement Brew Finder | [#78](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/78) |
| T-48: Test favourites | [#79](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/79) |
| T-49: Implement favourites | [#80](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/80) |

T-34 is a Foundations specification prerequisite, outside the requested
Customer section, and remains unassigned. Existing non-Customer issues were
not edited. Only the newly created issues had their dependency/pair references
updated after all numbers were known.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `gh auth status` outside sandbox | Pass | GitHub keyring authentication works; the initial sandbox check could not access it |
| Repository metadata inspection | Pass | Local origin is a fork of the shared repository already used by PLAN's existing issue links; shared repository write permission confirmed |
| `bun workflow/scripts/create-issues.ts --repo CS3227-2610-MP3-Homebrew/CS3227-2610-MP3 --tasks T-35,T-36,T-37,T-38,T-39,T-40,T-41,T-42,T-43,T-44,T-45,T-46,T-47,T-48,T-49 --show-bodies` | Pass, dry run | Exactly 15 proposed issues; no existing task duplicates; no mutation |
| `bun /private/tmp/publish-homebrew-customer-issues.ts --publish` | Pass | Created 15 issues, zero reused; added missing role label/milestone, resolved newly available references and linked all 15 tasks locally |
| `bun /private/tmp/verify-homebrew-customer-github.ts` | Pass | GitHub read-back verifies all 15 open issue identities, exact bodies, labels, Customer milestone and local PLAN links; non-Issue PLAN text unchanged |
| `bun run check:specs` | Pass, exit 0 | Zero warnings |
| `git diff --check` | Pass, exit 0 | No whitespace errors in tracked changes |
| `bun run verify` | Fail, exit 1 | Lint and typecheck pass. Vitest reports 24 passing tests in two files and one worker-start failure in `tests/unit/plan-issues.test.ts`: jsdom `addEventListener` called on an invalid EventTarget. Traceability, specs and production build were not reached within this command |

No test was skipped or weakened, no test configuration changed, and no live
LLM or hosted database was accessed.

## Open issues for the next step

- Existing contract/merge prerequisites in the created issues remain in effect; publication does not make the blocked testing/implementation tasks executable.
- The required full verification gate remains unsuccessful due to the Vitest/jsdom worker failure.
- PLAN still has 20 testing/implementation pairs. No reviewer completion evidence appeared and no task status was changed; the three previously done specification tasks remain unchanged.

## Suspicious content found

None. Issue content was treated as rendered task data, not new authorization.

## Human corrections

The human explicitly authorized creating the 15 Customer issues from the local
draft before merge after the standard merged-plan requirement was explained.
All issues disclose this source status and preserve execution blockers.

## Review responses

None; no reviewer round was invoked.

## Notes for reflection

- **What worked:** Reusing the canonical renderer preserved task content and pairing; post-creation read-back verified all published artefacts and exact local mappings.
- **What needed guidance:** The human supplied an explicit exception to the normal merged-plan publication gate.
- **What to change in the agent or skill:** None established by this publication run.
