# Spec report

- **Agent:** spec
- **Issue:** none (spec consistency task)
- **Spec IDs:** SYS-04–SYS-11 and SEC-01–SEC-09; product/story IDs referenced without new criterion ownership.
- **Date:** 2026-10-18
- **Branch:** docs/spec-consistency
- **Base commit:** 8793a9fc1b0d5ea1efebafc3861b48a805760f8a
- **Status:** completed

## Summary

Applied A1–A7 to the four cross-cutting specs, specification registry and product
plan. Contracts retain their behavior, routes, schemas, prompt text and limit
values, apart from the explicitly removed daily monetary budgets. AI security
owns usage-limit values; technical documentation links those values and retains
the enforcement mechanism. PLAN contains 23 tasks and **10 foundation
test/implementation pairs**: T-03/T-04 through T-21/T-22. T-23 owns the separate
hosted-account and daily-maintenance specification without defining its design.

Document checks pass. The main session ran all eight requested checks and
reported successful repository verification and the expected status/scan output.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| A1: remove update dates. | completed | Removed the four update lines from technical, integration, security and PLAN. |
| A2: describe existing specifications accurately. | completed | Registry heading/anchors and cross-cutting statuses agree; supporting-spec references contain no stale existence or drafting claims; installed-tooling prose lives in PLAN. |
| A3: remove decision narration and retain external uncertainty. | completed | Retired IDs are listed per file; only TECHNICAL-SPEC ASM-01 remains open. Rationale and operative rules are preserved without decision dates. |
| A4: apply integration contracts. | completed | ASM-02/05/06 statements are plain contracts; Brew empty-result reconciliation is a story dependency. All nine fenced contracts and the inline Prep reason are unchanged. |
| A5: centralize usage limits. | completed | Product usage paragraph links security values and technical key uncertainty; monetary budgets are absent. Technical/integration cache-duration references link the unchanged security duration. Security retains one sentence denying a monetary-quota guarantee. |
| A6: align registry workflow rules. | completed | Open-assumption exception, pair ownership, two issues/one branch/one PR, testing-issue naming, grouping and reviewer-based completion rules are stated. Stories registry row is unchanged. |
| A7: refresh PLAN. | completed | Header contains sources; tooling/status conventions agree; stale conflict gates removed; T-01/T-02 are done with spec-task issue mappings; T-11–T-16 are todo; T-19–T-22 remain blocked; T-23 is todo. |
| Full repository verification. | completed | Main session ran exact `bun run verify`, exit 0; all eight requested checks have the expected results. |

## Files changed

- `workflow/specs/README.md`: registry, assumptions and pair rules.
- `workflow/specs/PRODUCT-SPEC.md`: supporting-spec references, usage requirement and retired assumptions.
- `workflow/specs/TECHNICAL-SPEC.md`: factual rationale, authoritative limit links and enforcement wording.
- `workflow/specs/INTEGRATION-SPEC.md`: operative contract wording, retired assumptions and story dependency.
- `workflow/specs/AI-SECURITY-SPEC.md`: operative policy wording, exclusive usage values, cache duration and retired assumptions.
- `workflow/PLAN.md`: conventions, reconciled tasks and T-23.
- `workflow/handoffs/spec-consistency/01-spec.md`: this report.

## Checks run

Only checks personally run by this agent are listed below.

| Command/check | Result | Evidence |
| --- | --- | --- |
| One-off `bun -` structural validator | Passed | 23 unique tasks; 10 foundation pairs; 46 criteria and 92 unique criterion/role allocations; implementation/test dependencies and DAG valid; requested status map; 145 local links/anchors resolve; no trailing whitespace. |
| One-off `bun -` preservation validator on final specs | Passed | Nine integration fences byte-identical to HEAD; product stories, all 19 SEC criteria and inline Prep reason unchanged. SYS IDs preserved. Only SYS-08.3 existing-contract wording and SYS-10.1 authoritative-duration reference differ, preserving meaning. |
| `git diff --check` | Passed | No whitespace errors. |
| Requested stale-wording scan across specs and PLAN | Passed | No matches; rg exit 1. |
| Requested proposal-wording scan across four cross-cutting specs | Passed | No matches; rg exit 1. |
| Requested removed-dollar-budget scan across specs and PLAN | Passed | No matches; rg exit 1. |
| Active-assumption scan across specs | Passed | Only TECHNICAL-SPEC ASM-01 at line 25. |
| Handoff evidence inspection | Passed | Existing spec handoffs explain the stale PLAN gates; no feature-pair reviewer completion evidence exists. Explicit task-status inputs are applied without marking any feature pair done. |

These document checks are not evidence of implemented foundation behavior.

### Main-session verification evidence

The main session supplied the following results after the specification and PLAN
edits. This agent did not run these checks on its behalf.

| Requested check | Result reported by main session |
| --- | --- |
| 1. `bun run verify` | Exit 0: ESLint, Next type generation/TypeScript, Vitest (1 file, 8 tests), traceability (2 done tasks; listed criteria have test titles), production build. Existing nonblocking vite-tsconfig-paths warning reports native Vite path support. |
| 2. `git status --short` | Exactly the six modified specification/PLAN files and the untracked `workflow/handoffs/spec-consistency/` folder. |
| 3. Stale-wording scan | No output; rg exit 1 as expected. |
| 4. Proposal-wording scan | No output; rg exit 1 as expected. |
| 5. Removed-dollar-budget scan | No output; rg exit 1 as expected. |
| 6. Assumption scan | Only `workflow/specs/TECHNICAL-SPEC.md:25`, ASM-01. |
| 7. PLAN status scan | T-01/T-02 done; T-03–T-18 and T-23 todo; T-19–T-22 blocked. |
| 8. `git diff --stat` | Six tracked files; 208 insertions, 258 deletions. Per-file changed-line totals: PLAN 143, AI security 58, integration 93, product 58, README 26, technical 88. The report is untracked and is excluded from this stat. |

## Open issues for the next step

- No requested content change was prevented by the preservation constraint.
  Integration story-owned dependencies and TECHNICAL-SPEC ASM-01 remain explicit;
  this cleanup supplies no missing product behavior or verified provider entitlement.
- Hosted account and daily-maintenance design belongs to T-23. This run records
  its scope without selecting its contracts.

## Suspicious content found

None. Historical handoff descriptions were treated as evidence, not authorization.

## Human corrections

H1–H6 and A1–A7 supplied the operative contract, value ownership, pairing,
completion and retirement decisions. The prompt's PLAN header and status rules
override the corresponding plan-create defaults for this run.

## Review responses

None.

## Notes for reflection

- **What worked:** Byte comparisons and criterion ownership checks made contract preservation reviewable.
- **What needed guidance:** The supplied decisions resolve the assumption and daily-budget wording; hosted design remains separately scoped.
- **What to change in the agent or skill:** The separate workflow change can align plan-create with the supplied header, pair and status rules; no skill or agent file changed here.
