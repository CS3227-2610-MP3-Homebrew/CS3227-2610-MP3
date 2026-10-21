# Owner specifications, plan and GitHub issues

## Goal
Draft the owner stories from Homebrew's product specification, add their work to the product plan, and publish the corresponding GitHub issues.

## Scope
Five task-related user-assistant interactions, including a mid-task correction and this logging request; one connected specification, planning and issue-publication workflow.

## Key prompts
- “Write the owner specs listed in product spec” requested one specification per owner story, using the product specification as the source.
- “Accept all suggestions, add specs to plan.md” accepted the draft proposals and extended the work to task allocation in the single product plan.
- “Add created owner issues to github” explicitly authorized publishing the owner plan tasks to GitHub and recording their issue links.

## Decisions and corrections
- Created OWN-01–OWN-08: seven MVP stories and stretch boost requests, with 68 acceptance criteria, access/permissions, screens and use cases. Prep Advisor includes aggregate-only inputs, supporting figures, guardrails, fallbacks and 12 evaluation cases.
- Accepted the eight proposed risk ratings and retired each story's ASM-01. Missing field, lifecycle, analytics and boost contracts had no proposed values; they remain explicit specification prerequisites rather than invented defaults.
- Added T-52–T-66: five contract tasks and five testing/implementation pairs. The plan now has 66 tasks and 26 pairs. Every owner criterion has exactly one test and one implementation owner; relevant cross-role prerequisites were linked without changing existing statuses or criterion assignments.
- The user corrected the proposed reconciliation with “keep T15 and T16 marked as done”. Both remain done; the latest incomplete/fail reviewer report and later implementation fixes were disclosed without claiming a new reviewer pass.
- Created issues #108–#122 in `CS3227-2610-MP3-Homebrew/CS3227-2610-MP3`, under the Café owner milestone, with role labels and pair/dependency references. Remote readback verified every issue body. PLAN now links all 15 issues.
- Issue bodies include local criteria snapshots and preserve publication/execution gates because owner specs and new plan entries are not on master. No commit, push, PR, merge, deployment or feature execution occurred.
- Spec checks passed with zero warnings after planning and linking; traceability passed for 20 existing done tasks, and tracked whitespace checks passed. Full verification, builds and feature tests were not run. Sandboxed GitHub reads failed to connect; approved network retries succeeded.

## Files created or modified
- `workflow/specs/stories/OWN-01-cafe-application.md`
- `workflow/specs/stories/OWN-02-cafe-profile-hours.md`
- `workflow/specs/stories/OWN-03-menu-management.md`
- `workflow/specs/stories/OWN-04-pickup-rules.md`
- `workflow/specs/stories/OWN-05-order-queue.md`
- `workflow/specs/stories/OWN-06-sales-dashboard.md`
- `workflow/specs/stories/OWN-07-prep-advisor.md`
- `workflow/specs/stories/OWN-08-boost-request.md`
- `workflow/PLAN.md`
- `workflow/handoffs/spec-owner-stories/01-spec.md`, `02-spec.md`, `03-spec.md`
