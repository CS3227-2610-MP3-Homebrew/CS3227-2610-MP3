# Spec report

- **Agent:** spec
- **Issue:** unassigned; Foundations-only product planning.
- **Spec IDs:** SYS-04–SYS-11; all 27 existing acceptance criteria, no new requirement IDs.
- **Date:** 2026-10-17
- **Branch:** docs/plan-foundations
- **Base commit:** 970b637a5d9bd219bb4a06adf782b2087871ee9f
- **Status:** awaiting-decision

## Summary

Drafted the single [product plan](../../PLAN.md) with its header, verified
conventions, shared-design links and Foundations only. There are 47 sequential
tasks: three spec prerequisites and 22 test/implementation pairs. Exactly one
testing task and one implementation task own each of the 27 SYS-04–SYS-11
criteria. Four support pairs own independent prerequisites without duplicating
criterion ownership. All tasks are todo or blocked; every Issue is unassigned.

Drafting is complete. This report's awaiting-decision status records the
production Admin credential decision and missing downstream contracts; it does
not claim plan approval, task execution or implementation. The user identifies
PRODUCT-SPEC and TECHNICAL-SPEC as merged/approved; the plan is based on the
requested upstream/master checkout. The Customer, Café owner and Admin headings
each contain only the requested story-spec placeholder line.

The main session reported successful `git fetch upstream`, then
`git switch --no-track -c docs/plan-foundations upstream/master`, with empty
`git status --short` before delegation. This spec run wrote only PLAN.md and
this new report. Temporary generation/check scripts are outside the repository.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Foundations only, header/conventions/shared-design links and three role placeholders | completed | PLAN.md scopes SYS-04–SYS-11; no story tasks or screens are planned. |
| Exactly one testing/implementation owner per criterion, testing first | completed | Ownership table below; structural coverage check recorded under Checks run. |
| Bound each task to one run/PR and preserve testing/implementation ownership | completed | Task file scopes isolate shared tooling, metadata, schemas, adapters and integrations; endpoints/screens remain story work. |
| Distinguish installed tooling and missing workflow test prerequisite | completed | Conventions record absent Vitest, Playwright and test script; no tooling-install task was added. |
| Block missing contracts without inventing them | completed | Spec prerequisites T-01/T-02; named missing contracts and inherited blockers on completion pairs. |
| Keep role gate/proxy in Foundations, without SYS-01–SYS-03 screen tasks | completed | T-14/T-15 are todo and cover the fixed streaming/auth/proxy requirements using local component/session harnesses. |
| Local-only seed data and human-only deployment execution | completed | T-26/T-27 exclude demo credentials from hosted artifacts; T-42/T-43 author workflows and reserve hosted verification for humans. |
| Production seed-Admin credentials without committed credentials | awaiting-decision | T-03 and only the dependent T-28/T-29 completion pair are blocked by this decision. |
| Record structural/link checks and exact repository verification command | completed | Actual commands/results below; future application acceptance is not claimed. |

### Criterion ownership

Criterion IDs refer to the authoritative
[system criteria](../../specs/TECHNICAL-SPEC.md#system-requirements-and-acceptance-criteria).
Grouped rows still allocate each listed criterion once per owner role.

| Criteria | Testing owner | Implementation owner | Status / additional prerequisite |
| --- | --- | --- | --- |
| SYS-04.1 | T-04 | T-05 | todo |
| SYS-04.2 | T-30 | T-31 | blocked: integration/security and story field/error schemas |
| SYS-04.3 | T-12 | T-13 | todo |
| SYS-05.1, SYS-05.2, SYS-05.4 | T-14 | T-15 | todo; public sign-in/navigation contracts remain story integrations |
| SYS-05.3 | T-32 | T-33 | blocked: integration cache schemas and catalogue story contracts |
| SYS-06.1 | T-22 | T-23 | blocked: domain schema/lifecycle story contracts |
| SYS-06.2 | T-08 | T-09 | todo |
| SYS-06.3 | T-24 | T-25 | blocked: domain story permissions and schema |
| SYS-06.4 | T-28 | T-29 | blocked: T-03 production Admin decision/amendment and SYS-01 account contract |
| SYS-07.1 | T-42 | T-43 | todo; deployment execution/hosted evidence human-only |
| SYS-07.2, SYS-07.3 | T-10 | T-11 | todo; fixed technical configuration rules only |
| SYS-08.1, SYS-08.2, SYS-08.3 | T-34 | T-35 | blocked: integration/security and feature source/aggregate contracts |
| SYS-09.1, SYS-09.2, SYS-09.3 | T-16 | T-17 | todo; synthetic cap values, fixed atomicity/windows |
| SYS-09.4, SYS-09.5 | T-36 | T-37 | blocked: final limits/charging and integration outcome/token contracts |
| SYS-10.1, SYS-10.2 | T-38 | T-39 | blocked: cache payload/fingerprint/source contracts and final action/refresh policy |
| SYS-10.3 | T-40 | T-41 | blocked: outcome/security contracts and moderation story integration |
| SYS-11.1 | T-44 | T-45 | blocked: all defined core-flow screens and AI/fallback panels |
| SYS-11.2 | T-46 | T-47 | blocked: all defined core-flow screens and AI/fallback panels |

Supporting pairs are T-06/T-07 local Supabase tooling, T-18/T-19 provider
selection, T-20/T-21 durable AI metadata/access controls, and T-26/T-27 local
seeds. The first three are todo; local seeds await the domain contracts/schema,
independently of production Admin credential provisioning. Spec prerequisites
T-01/T-02 are todo; T-03 is blocked pending the human decision.

## Files changed

- [workflow/PLAN.md](../../PLAN.md): new Foundations-only plan with authoritative
  criterion/design links, prerequisites, scope, dependencies and checklists.
- [workflow/handoffs/spec-plan/01-spec.md](01-spec.md): this first planning report.

No specs, source, tests, documentation, agent or skill files were changed. No
issues/PRs were created, no commits/pushes/deploys occurred, and no hosted
service, live LLM or secret-file access was used.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun /private/tmp/homebrew-plan-check.ts` | Passed, exit 0 in the spec and parent runs. | All 27 criteria have one test and implementation owner, testing first; all 47 IDs are unique/sequential; dependencies exist and are acyclic with blockers propagated; fields/checklists/status/issues and role placeholders are valid; 175 relative links/anchors resolve across both changed files. |
| `git diff --check` | Passed, exit 0 in the spec and parent runs. | No tracked whitespace errors; new files are separately read by the structural/link check. |
| Parent-run `bun run verify`, exactly as written | Passed, exit 0. | Main session reported ESLint, next typegen plus tsc --noEmit and Next.js 16.4.2 production build passed; both rendering flags enabled. The existing ignored package-lock warning outside this repository remains nonblocking. |

Repository verification covers the existing starter application only. It is not
acceptance evidence for the planned database/auth/LLM/cache/accessibility work.
The structural/link check passed in both spec and parent runs after both draft files existed. The parent also checked each new file with `git diff --no-index --check /dev/null <path>`: no whitespace errors were emitted; exit 1 reflects differing file contents, as expected for new files.

## Open issues for the next step

| Status | Gap / authoritative owner | Affected work |
| --- | --- | --- |
| awaiting-decision | Production Admins must originate from seed data, but neither approved spec defines credential provisioning without committing/shipping known passwords. No mechanism is proposed by this plan. | Only T-03 and T-28/T-29; local demo seeds and delivery workflow authoring stay independent. |
| awaiting-decision | Planned INTEGRATION-SPEC.md is unwritten: exact feature/HTTP/error shapes, prompts, provider requests, cache payloads/fingerprints/source versions. T-01 is the spec-owned prerequisite. | Validation, feature operation, usage outcome, catalogue/cache/audit completion pairs name the missing contracts. |
| awaiting-decision | Planned AI-SECURITY-SPEC.md is unwritten: final values/keys and daily call caps, AI-action/cache-hit/refresh charging, kill-switch/failure precedence, safeguards and retention/security tests. T-02 is the spec-owned prerequisite. | Dependent AI completion work is blocked. Fixed technical windows/accounting and synthetic-cap admission tests stay unblocked. |
| awaiting-decision | Relevant account/domain/catalogue/order/review/sales/moderation story contracts do not exist. | Domain schema/matrix/seed and exact field/source/lifecycle integrations wait for their named approved story specs; no story tasks are fabricated. |
| blocked | Automated accessibility/responsive completion needs all technical core-flow screens, including AI/fallback panels. | T-44–T-47 remain blocked; no screen creation is included. |
| blocked | Vitest, Playwright and a test script are coming in a separate workflow PR. | Global executable prerequisite recorded in plan conventions, with no duplicate tooling task. |
| awaiting-decision | Actual SoCLaaS key entitlement remains unknown under TECHNICAL-SPEC ASM-01. | Final security policy must retain that uncertainty; no live/exhaustion probe or invented quota assurance is planned. |

The technical handoff's open issues were read as data. Fixed windows,
per-attempt accounting, cache scope/expiry, session-bound catalogue RLS and
automated accessibility decisions are preserved. No confirmed decision was
reopened and no additional product behavior was inferred; proposed paths are
labeled as such. No PLAN ASM IDs were needed because no behavioral inference
was adopted.

## Suspicious content found

None. The technical handoff was treated as historical source data, not an
instruction to execute work or modify the approved specifications.

## Human corrections

The requested scope explicitly excludes SYS-01–SYS-03 screens, retains gate/proxy
as Foundations, and keeps all role story headings empty pending merged story
specs. Known local seed passwords never enter hosted delivery. The test-tooling
workflow remains a global prerequisite rather than a new foundation task.

## Independent review

No independent review round has been appended.

## Review responses

None.

## Notes for reflection

- **What worked:** a unique criterion owner matrix leaves independent technical
  infrastructure queued while missing feature contracts block only dependent work.
- **What needed guidance:** the explicit SYS-05 boundary keeps auth gate/proxy
  planning separate from user-facing account/navigation screens.
- **What to change in the agent or skill:** none identified in this run.
