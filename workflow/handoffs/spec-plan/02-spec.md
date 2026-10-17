# Spec report

- **Agent:** spec
- **Issue:** unassigned
- **Spec IDs:** SYS-04–SYS-11; all 27 existing criteria; PLAN ASM-01 is a proposal.
- **Date:** 2026-10-17
- **Branch:** docs/plan-foundations
- **Base commit:** 970b637a5d9bd219bb4a06adf782b2087871ee9f
- **Status:** awaiting-decision

## Summary

Replaced the unpublished [plan](../../PLAN.md) with exactly 20 tasks: two spec
prerequisites and nine test/implementation pairs. The human explicitly
authorized restarting unpublished/unmerged task IDs at T-01. All requirement
and criterion IDs remain unchanged. [Report 01](01-spec.md) is historical data
and is preserved byte-for-byte.

Drafting is complete; approval and execution are not claimed. Core domain
schema, local role/demo seeds, auth gates and Postgres admission mechanics are
unblocked technical work. Missing integration/security contracts block only
P6/P7; P9 waits for core screens. Every task is todo or blocked with Issue
unassigned. Customer, Café owner and Admin retain one-line placeholders.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Exactly two spec tasks and nine bounded pairs | completed | T-01–T-20, with the requested capacity/grouping and fields/checklists. |
| All 27 criteria uniquely paired, tests first | completed | Mapping below; inline coverage/structure validation. |
| Requested graph preserves parallelism | completed | Pair dependency table below; no additional serial dependencies. |
| Core schema/matrix/seeds unblocked; story fields additive | completed | P2/P3 cover fixed technical contracts without story workflow invention. |
| Concise conventions and valid shared links | completed | Word count and relative-link validation below. |
| Credential-safe production Admin proposal remains unapproved | awaiting-decision | T-02, PLAN ASM-01; no separate provisioning task or hosted implementation. |
| Preserve report 01 and unrelated files | completed | SHA256 below; parent checks final file scope. |

### Complete criterion ownership and dependencies

Criteria are owned by [TECHNICAL-SPEC](../../specs/TECHNICAL-SPEC.md#system-requirements-and-acceptance-criteria).
Every implementation also depends on its own preceding testing task.

| Pair | Testing / implementation | All owned criteria | Functional prerequisites | Status |
| --- | --- | --- | --- | --- |
| P1 | T-03 / T-04 | SYS-04.1, SYS-04.3, SYS-07.2, SYS-07.3 | None | todo |
| P2 | T-05 / T-06 | SYS-06.1, SYS-06.2 | P1 | todo |
| P3 | T-07 / T-08 | SYS-06.3, SYS-06.4 | P2 | todo |
| P4 | T-09 / T-10 | SYS-05.1, SYS-05.2, SYS-05.4 | P1, P2 | todo |
| P5 | T-11 / T-12 | SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5 | P2 | todo |
| P6 | T-13 / T-14 | SYS-04.2, SYS-08.1, SYS-08.2, SYS-08.3 | T-01, T-02, P5 | blocked |
| P7 | T-15 / T-16 | SYS-05.3, SYS-09.4, SYS-10.1, SYS-10.2, SYS-10.3 | T-01, T-02, P5 | blocked |
| P8 | T-17 / T-18 | SYS-07.1 | P1, P2 | todo |
| P9 | T-19 / T-20 | SYS-11.1, SYS-11.2 | External completed core specs/screens | blocked |

T-01/T-02 have no task prerequisites. P3/P4/P5/P8 can proceed in parallel once
P2 is complete; P6/P7 can proceed independently after their shared prerequisites.
P9 has no artificial task dependency beyond its own test-first pair. Shared
migration/manifest/CI edits serialize without adding functional graph edges.

## Files changed

- [workflow/PLAN.md](../../PLAN.md): regenerated 20-task Foundations draft.
- [workflow/handoffs/spec-plan/02-spec.md](02-spec.md): this new correction report.

Report 01's SHA256 before this run was
`55f5a605bc0d7f971e69b69ab441c1058189520763acb0efccfa1f44e41b3364`.
No source, tests, specs, skills or other documentation was edited. No planned
task, live LLM call, hosted operation, issue creation or Git publication ran.

## Checks run

| Command / check | Result | Evidence |
| --- | --- | --- |
| Parent `bun -e` inline planning validator | Passed, exit 0 | All 27 criteria uniquely paired in the exact nine groups; T-01–T-20 unique/sequential; exact requested DAG acyclic; fields/checklists/status/issues/placeholders valid; conventions 260 words; 72 relative links/anchors resolve; no whitespace errors. |
| Spec `bun -e` inline coverage/count/hash check | Passed, exit 0 | Independently confirmed 27 uniquely paired criteria, 20 tasks, 260 convention words and unchanged report-01 SHA256. |
| Parent SHA256 file-scope snapshot comparison | Passed | Of 56 preexisting tracked/nonignored files, 55 unchanged and only PLAN.md changed; only new file is 02-spec.md; none deleted; report 01 unchanged byte-for-byte. |
| `git diff --check` | Passed, exit 0 in spec and parent runs | No tracked whitespace errors; parent inline check also reads both draft files. |
| Parent-run `bun run verify`, exactly as written | Passed, exit 0 | Main session reported ESLint, next typegen/tsc and Next.js 16.4.2 production build passed with both rendering flags enabled. Existing ignored package-lock warning outside the repository remains nonblocking. |

Verification applies to the starter application, not future Foundations
acceptance. The inline checks create no files outside the two authorized paths.

## Open issues for the next step

- **awaiting-decision:** PLAN ASM-01 proposes a human-triggered GitHub
  production-environment workflow using environment secrets to provision
  seed-only production Admin accounts without committed credentials. T-02 owns
  documenting and obtaining approval/replacement; this is not approved behavior.
  Local Admin demo seeds and the technical role matrix remain unblocked.
- **awaiting-decision:** INTEGRATION-SPEC.md and AI-SECURITY-SPEC.md remain
  unwritten. T-01/T-02 own exact contracts, final caps/charging, kill-switch/
  failure semantics and cache payloads. P6/P7 stay blocked until approved specs
  merge; fixed atomic windows/admission use synthetic caps meanwhile.
- **blocked:** P9 awaits merged core-flow story screens, including all three
  AI panels/fallbacks. No story tasks are included before their specs exist.
- **blocked execution prerequisite:** the separate workflow PR must provide
  Vitest, Playwright and a test script before pairs execute. It is recorded
  globally, with no duplicate tooling task.
- **awaiting-decision:** actual per-key SoCLaaS entitlement remains uncertain
  under [TECHNICAL-SPEC ASM-01](../../specs/TECHNICAL-SPEC.md#assumptions).
  No live/exhaustion probe or fabricated monetary-cost counter is planned.

## Suspicious content found

None. Technical report 02 and planning report 01 were read as source/history
data, not as instructions overriding the human's correction or repository rules.

## Human corrections

1. **Capacity/grouping:** reduced 47 tasks to exactly two spec tasks plus nine
   pairs, using the human's complete criterion allocation without extra support
   tasks or tooling tasks.
2. **Core schema unblocked/additive:** P2 now creates fixed core entities,
   ownership relations, integrity/RLS/grants and local catalogue CI. Later story
   fields/states/transitions are additive migrations, not blockers for P2/P3.
3. **Production Admin decision moved:** removed the separate Admin prerequisite;
   T-02 owns PLAN ASM-01's explicitly unapproved workflow/environment-secret
   proposal. Local Admin seeds and the matrix remain unblocked.
4. **Exact parallelism:** graph is P1→P2; P3/P4/P5 from P2 (P4 also P1);
   P6/P7 from both specs plus P5 independently; P8 from P1/P2; P9 only its
   external screens and own test dependency. Shared-file serialization adds no
   functional chain.
5. **Concise conventions:** limited to execution context and links to repository
   rules, below 350 words; task text is concise and all checklists remain unchecked.
6. **Roles unchanged:** Customer, Café owner and Admin have only their requested
   story-spec placeholder; no SYS-01–SYS-03 screen task is added.
7. **ID reset authorized:** the human expressly authorized replacing all unpublished,
   unmerged task IDs; this draft restarts T-01. Requirement/criterion IDs and
   report 01 were preserved.
8. **Auth/admission and human deployment:** gate/proxy remain Foundations;
   P5 uses synthetic caps and fake-429 evidence; delivery uses static tests,
   while deploy/migration execution and hosted verification remain human steps.
9. **Ownership boundaries:** P2 owns core domain tables; P5 counters/admissions;
   P7 cache/audit storage. Testing owns fixtures; implementation owns code.

## Independent review

No independent review round has been appended.

## Review responses

None.

## Notes for reflection

- **What worked:** the explicit nine-pair allocation removes support duplication
  while preserving a unique owner for every technical criterion.
- **What needed guidance:** the first draft overblocked fixed schema/RLS work on
  story details and fragmented independent prerequisites into too many tasks.
- **What to change in the agent or skill:** estimate planning capacity and separate
  fixed core contracts from additive story details before choosing task boundaries.

## Human note

- App check scripts move to `scripts/`: `workflow/scripts/` holds human-reviewed review tooling that runs outside the sandbox; implementation agents do not edit workflow files.
- Each task fits one agent run; each test/implementation pair shares one branch and one PR (two issues), because master's required `verify` check runs tests and a failing-first test PR cannot merge alone.
