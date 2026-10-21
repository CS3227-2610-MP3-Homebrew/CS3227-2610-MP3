# Spec report

- **Agent:** spec
- **Issue:** None; owner specification acceptance and PLAN update requested in this chat.
- **Spec IDs:** OWN-01–OWN-08; all 68 existing owner acceptance criteria. New plan tasks T-52–T-66.
- **Date:** 2026-10-21
- **Branch:** owner-specs
- **Base commit:** cb2bb8e11ee03fc016fc203ec56661ec8d7b9790
- **Status:** completed

## Summary

Added all eight owner stories to `workflow/PLAN.md` in five
testing/implementation pairs, with five separate specification prerequisites.
The plan now has 66 tasks: 26 testing/implementation pairs and 14 spec tasks.
All 68 owner criteria have exactly one testing and one implementation owner;
none of the pre-existing criterion assignments was changed.

The human accepted the suggestions in the owner drafts. The eight proposed
risk ratings are now ordinary statements, and each file's ASM-01 is retired
without renumbering or changing story text, priorities, scope or criteria.
The earlier report listed missing application, analytics and boost contracts
without proposing values. Acceptance supplies no omitted field limit, sales
window, baseline, café count or boost fee/duration. Those details now have
explicit spec-owned plan tasks rather than implementation defaults.

The human separately requested that T-15 and T-16 remain done. Both retain
that status. All 51 pre-existing statuses, issues, titles, requirement sets,
work descriptions, file scopes and acceptance checklists are preserved.
Only dependency/prerequisite fields of affected existing tasks were updated.
No task was executed or marked newly completed by this planning run.

Completed describes the requested acceptance bookkeeping and reviewable
local plan, not resolved product contracts, a merged specification or feature
acceptance. The owner files remain absent from local master; future execution
still requires governing specs on master and paired failing-first evidence.
No commit, push, issue, PR, merge, deployment, hosted access or live LLM call
was performed. Report 01 is unchanged.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Accept the eight existing proposed risk assessments | completed | Each owner file removes its inline assumption marker and lists ASM-01 as retired; exact before/after assertions permit no other story change |
| Plan all owner criterion coverage | completed | 68 owner criteria each have one test and one implementation owner; repository checker reports zero warnings |
| Preserve existing task identities and progress | completed | All 51 pre-existing IDs, titles, statuses, issues, requirements, work, file scopes and checklists match the starting snapshot |
| Keep T-15/T-16 done | completed | Both Status fields remain done, as explicitly requested by the human |
| Link shared and cross-role prerequisites | completed | Fifteen existing tasks gain only dependency/prerequisite links; complete task graph remains acyclic |
| Distinguish planning from implementation readiness | completed | Five spec tasks are awaiting-decision, ten new execution tasks blocked; source-on-master and paired-test gates are explicit |

## Files changed

- [PLAN.md](../../PLAN.md): owner source links, verified installed-tooling correction, five contract tasks, five execution pairs, 26-pair/66-task counts and cross-role prerequisite mapping.
- [OWN-01](../../specs/stories/OWN-01-cafe-application.md), [OWN-02](../../specs/stories/OWN-02-cafe-profile-hours.md), [OWN-03](../../specs/stories/OWN-03-menu-management.md), [OWN-04](../../specs/stories/OWN-04-pickup-rules.md), [OWN-05](../../specs/stories/OWN-05-order-queue.md), [OWN-06](../../specs/stories/OWN-06-sales-dashboard.md), [OWN-07](../../specs/stories/OWN-07-prep-advisor.md), [OWN-08](../../specs/stories/OWN-08-boost-request.md): accepted risk assumption markers removed; ASM-01 retired; all other content preserved.
- `workflow/handoffs/spec-owner-stories/02-spec.md`: this report.

No shared specification, application code, tests, configuration, guides,
templates, agent instructions, skills or previous handoff was modified.

## Plan allocation

| Owner scope | Contract task | Test / implementation pair | Criteria |
| --- | --- | --- | --- |
| Café application, profile/hours, pickup rules: OWN-01/OWN-02/OWN-04 | T-52 | T-53 / T-54 | 24 |
| Menu: OWN-03 | T-55 | T-56 / T-57 | 8 |
| Queue: OWN-05 | T-58 | T-59 / T-60 | 10 |
| Sales and Prep Advisor: OWN-06/OWN-07 | T-61 | T-62 / T-63 | 21 |
| Stretch boost request: OWN-08 | T-64 | T-65 / T-66 | 5 |

T-52/T-55/T-58 can specify independent owner domains; T-61 uses menu-history
and queue-source decisions. T-64 names the separate missing ADM-06 contract
without allocating Admin criteria to an owner pair. Test-owned local fixtures
allow owner test authoring without creating a dependency cycle through Admin
decisions or Customer order creation. The four MVP owner runtime owners are
T-54 setup/profile/pickup, T-57 menu, T-60 queue and T-63 Dashboard/Prep.

Existing T-19–T-22 accessibility/security integration, T-24–T-27 demo/maintenance,
T-35–T-37 Customer contract reconciliation, T-28/T-29 Admin café eligibility
and T-32/T-33 moderation source prerequisites now name their corresponding
owner contracts or surfaces. Shared SYS/SEC ownership is unchanged. Shared
schema/layout/migration edits remain serialized between their explicit owners.

## Evidence reconciliation

There are 26 pairs total: Foundations 12, Shared one, Customer five,
Café owner five and Admin three. Twenty tasks remain done, four todo,
37 blocked and five awaiting-decision. All pre-existing statuses are unchanged.

| Existing done pair | Latest general reviewer report | Reconciliation |
| --- | --- | --- |
| T-03/T-04 | `34-runtime-configuration-import-isolation/05-reviewer.md`: completed/pass | Done preserved |
| T-05/T-06 | `36-core-schema-local-migrations-rls/03-reviewer.md`: completed/pass | Done preserved |
| T-07/T-08 | `38-role-matrix-local-demonstration-seeds/06-reviewer.md`: completed/pass | Done preserved |
| T-09/T-10 | `40-proxy-refresh-streaming-role-gates/04-reviewer.md`: completed/pass | Done preserved |
| T-11/T-12 | `42-durable-admission-windows-quota-telemetry/03-reviewer.md`: completed/pass | Done preserved |
| T-13/T-14 | `44-validated-llm-operations-fallbacks/05-reviewer.md`: completed/pass | Done preserved |
| T-15/T-16 | `46-ai-caches-catalogue-eligibility-accounting-audit/05-reviewer.md`: incomplete/fail | Done preserved under this chat's explicit human instruction; no later passing reviewer report is present |
| T-17/T-18 | `48-delivery-workflows/13-reviewer.md`: completed/pass | Done preserved |

The later T-16 implementation report `07-implementation.md` records completed
fixes and passing verification while explicitly leaving independent review
pending. It is implementation evidence, not a replacement reviewer pass.
The human's status instruction is recorded without fabricating that evidence.
The four existing done spec tasks T-01/T-02/T-23/T-34 remain unchanged.
No new reviewer report exists for other pairs and no pair was promoted.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | Pass, exit 0; zero warnings | All owner coverage allocated; task fields, IDs, pair coverage, links/anchors and dependency checks pass |
| `bun run check:traceability` | Pass, exit 0 | Twenty existing done tasks have their listed criterion test titles; not owner implementation-test evidence |
| `git diff --check` | Pass, exit 0 | No tracked whitespace errors |
| Temporary Python plan/story assertions | Pass | 66 stable task IDs, 26 pairs, 14 spec tasks, all 68 owner criteria assigned once to each execution role, acyclic dependencies; all old statuses/issues/requirements/work/scopes/checklists preserved; eight story diffs limited to accepted risk assumption retirement |
| Local master tree inspection | Source gate recorded | Selected OWN-01/OWN-07 files absent from master; branch and starting master share base cb2bb8e |
| Working-tree scope inspection | Pass | Only PLAN is modified among tracked paths; owner story files and owner handoff directory remain the new artifacts |

Full `bun run verify`, lint, typecheck, build, unit/integration/browser tests and
live evaluations were not run for this spec/planning-only change. Every future
testing/implementation task explicitly requires exact `bun run verify` evidence
and relevant browser checks; planning does not claim those checks already ran.
Temporary assertions and starting snapshots are outside the repository.

## Open issues for the next step

- T-52/T-55/T-58/T-61/T-64 enumerate the application/profile/menu/queue/analytics/
  advice/boost details still absent from source contracts, as listed in report
  01. Each is awaiting-decision, and its test/implementation pair is blocked.
  Risk proposals from report 01 are resolved by the human's acceptance.
- The owner specs have no reviewed merge evidence on master yet. Local
  acceptance and plan allocation do not execute the spec publication flow.
- ADM-06 has a product story but no detailed story/decision contract; the
  optional owner boost pair records that separate dependency without inventing
  Admin behavior or promoting the feature to MVP.
- New tasks have unassigned issues; no issue creation was requested or done.
- T-15/T-16 retain done under the explicit human override despite the recorded
  latest reviewer discrepancy. No later reviewer approval is claimed.

## Suspicious content found

None. Handoff findings were treated as evidence rather than permission to
change scope or execute tasks.

## Human corrections

- “Accept all suggestions, add specs to plan.md”: accepted the eight proposed
  risk assessments and added every owner story/criterion to the single plan.
- “keep T15 and T16 marked as done”: preserved both done statuses and all other
  pre-existing statuses; the reviewer-evidence discrepancy is disclosed above.

## Review responses

None; no reviewer round was invoked in this planning run.

## Notes for reflection

- **What worked:** Explicit criterion allocation and snapshot comparisons verified complete owner coverage without changing existing task identities or progress.
- **What needed guidance:** The human clarified the desired T-15/T-16 statuses during reconciliation; this is distinguished from missing reviewer evidence.
- **What to change in the agent or skill:** None identified for this run.
