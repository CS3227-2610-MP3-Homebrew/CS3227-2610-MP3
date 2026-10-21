# Spec report

- **Agent:** spec
- **Issue:** Owner issue publication, T-52–T-66 / GitHub #108–#122.
- **Spec IDs:** OWN-01–OWN-08; all 68 existing owner criteria, unchanged.
- **Date:** 2026-10-21
- **Branch:** owner-specs
- **Base commit:** cb2bb8e11ee03fc016fc203ec56661ec8d7b9790
- **Status:** completed

## Summary

Created 15 owner task issues in the shared repository
`CS3227-2610-MP3-Homebrew/CS3227-2610-MP3`: five specification tasks and five
testing/implementation pairs. All issues have the matching role label and
the new [Café owner milestone](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/milestone/4).
Dependencies and paired tasks reference their actual issue numbers.

Each issue includes its task description, work, file scope, prerequisites,
completion checklist and a reference copy of the relevant local story criteria.
Issue bodies explicitly state that the owner specs/new plan entries are local
and governing contracts must reach master before execution. Unpublished owner
spec references are presented as local paths, not asserted to be available at
nonexistent master URLs. No missing product contract was supplied or approved
by publishing the issues.

Linked all 15 issue URLs into their PLAN Issue fields. No other task field
changed in this run. T-15/T-16 remain done under the human's earlier explicit
instruction, and all 66 statuses are preserved. Pair count remains 26; owner
coverage remains five pairs/68 criteria with one owner per execution role.

The human explicitly requested GitHub publication in this chat. That request
authorizes this issue-creation step beyond the earlier planning-only scope.
The issue bodies were prepared and locally checked before requesting network
write approval. Publication used `gh` with explicit tool approval and the
repository's pure issue renderer; `create-issues.ts --apply` was not invoked.
No repository script or its checks were edited, no spec merge was claimed,
and no commit, push, PR, deployment or feature execution occurred.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Publish every owner task once | completed | Before publication, all-state issue inventory had no T-52–T-66 match; fresh pre-write duplicate check and final inventory confirm 15 distinct issues |
| Preserve plan content and execution gates | completed | Prepared issue bodies include exact criteria snapshots, local-publication notice and original blocked/awaiting-decision states |
| Apply role labels, milestone and pair/dependency references | completed | Remote readback matches all 15 expected titles/bodies, correct role labels and Café owner milestone; new issue references resolved |
| Link GitHub issues in PLAN | completed | Exact comparison permits only the 15 owner Issue-field changes; all other fields and T-15/T-16 done statuses preserved |
| Keep plan coverage valid | completed | Spec checker passes with zero warnings; traceability passes for the existing 20 done tasks |

## Published issues

| Scope | Contract | Testing | Implementation |
| --- | --- | --- | --- |
| Café application, profile/hours, pickup rules | [T-52 / #108](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/108) | [T-53 / #109](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/109) | [T-54 / #110](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/110) |
| Menu | [T-55 / #111](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/111) | [T-56 / #112](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/112) | [T-57 / #113](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/113) |
| Order queue | [T-58 / #114](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/114) | [T-59 / #115](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/115) | [T-60 / #116](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/116) |
| Sales / Prep Advisor | [T-61 / #117](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/117) | [T-62 / #118](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/118) | [T-63 / #119](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/119) |
| Stretch boosts | [T-64 / #120](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/120) | [T-65 / #121](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/121) | [T-66 / #122](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/122) |

## Files changed

- [PLAN.md](../../PLAN.md): only the Issue fields for T-52–T-66 changed from unassigned to their verified GitHub URLs during this run.
- `workflow/handoffs/spec-owner-stories/03-spec.md`: this report.

The earlier PLAN/spec changes remain in the working tree. Reports 01/02 and
all story/spec/code/test/configuration files are unchanged by this run.
Preparation scripts, bodies, source snapshot and publication/verification
records are under `/private/tmp/homebrew-owner-issues/`, outside the repository.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| Shared GitHub issue inventory | Pass after approved network retry | All-state task-prefix duplicate checks before creation; no owner matches existed |
| GitHub repository/labels/milestones inspection | Pass | Shared repository confirmed; role labels already existed; Café owner milestone created as #4 |
| Prepared-body assertions | Pass | Fifteen bounded bodies, distinct exact source criteria, matching role/status metadata, explicit source-publication notice and no nonexistent owner-spec master links |
| Approved publication script using `gh issue create/edit` and `gh api` | Pass, exit 0 | Fifteen issue creations, milestone creation and resolved pair/dependency references; no unrelated issue modified |
| Remote readback | Pass | All 15 issues open; exact prepared titles/bodies, role labels and milestone match |
| Local issue-link update assertions | Pass | Exactly 15 Issue-field changes; all 66 IDs, statuses and other task fields unchanged; T-15/T-16 still done |
| `bun run check:specs` | Pass, exit 0 | Zero warnings |
| `bun run check:traceability` | Pass, exit 0 | Twenty existing done tasks retain listed criterion test titles |
| `git diff --check` | Pass, exit 0 | No tracked whitespace errors |

Initial sandboxed GitHub reads failed to connect to `api.github.com`; approved
network retries succeeded. No issue-publication failure or partial result
remains. Full verify, build and feature tests were not run for this issue-link
and handoff update. These checks do not establish implementation acceptance.

## Open issues for the next step

The owner spec-publication and missing-contract prerequisites documented in
report 02 remain. New GitHub issues retain those gates. Issue creation does
not commit/push the local artifacts, merge specs or make blocked work executable.
No additional decision is needed to complete the requested issue publication.

## Suspicious content found

None. Remote issue content was used only for duplicate/identity checks and
verification, not as authority to change scope or permissions.

## Human corrections

“Add created owner issues to github” explicitly authorized publishing the
15 existing owner plan tasks. Earlier authorization to keep T-15/T-16 done
remains in force.

## Review responses

None; no reviewer round was invoked.

## Notes for reflection

- **What worked:** Concrete body preparation, task-prefix duplicate checks, per-issue publication records and remote readback produced complete issue mappings without changing plan behavior.
- **What needed guidance:** Explicit human GitHub publication authorization extended the earlier planning-only scope.
- **What to change in the agent or skill:** None identified in this run.
