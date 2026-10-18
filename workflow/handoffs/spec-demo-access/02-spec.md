# Spec report

- **Agent:** spec
- **Issue:** none (spec task T-23, run 02)
- **Spec IDs:** SYS-13.1; T-26/T-27 prerequisites and status
- **Date:** 2026-10-18
- **Branch:** docs/demo-access-spec
- **Base commit:** 1b092f97b5df7fdfc4f455c97b5077a0dd987996
- **Status:** completed

## Summary

Applied the human resolution of run 01's main-Admin collision issue. SYS-13.1
now permits at most one main-workspace Admin, created only by maintenance.
An existing main Admin makes the step a no-op even if the configured email
changes. With no main Admin, maintenance creates one only when the configured
email is unused; an account using that email in any role/workspace produces
`conflict` with no creation or changes. Maintenance never updates, promotes,
resets or deletes any account.

T-26/T-27 are `blocked` on T-25 and the showcase's owning café/menu/hours
contracts. T-26 no longer links to a handoff report. PRODUCT-SPEC contains no
exactly-one-main-Admin claim and required no revision. Run 01's report is
unchanged. The draft revision is complete; human review/merge and the main
session's full section 4 verification remain separate gates.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-13.1 matches the supplied human decision | completed | Technical criterion explicitly covers existing Admin, changed configuration, unused email, cross-role/workspace email conflict and no account mutation. |
| PRODUCT-SPEC main-Admin cardinality wording | completed | Inspection found no exactly-one-main-Admin claim; file hash unchanged. |
| T-26/T-27 contract prerequisites and blocked status | completed | Both depend on T-25 and owning showcase café/menu/hours contracts; no unresolved-decision or handoff prerequisite remains. |
| T-24–T-27 status expectations | completed | All four tasks are blocked; T-23 remains done. |
| Preservation and criterion ownership | completed | Run 01 report and other specs unchanged; all 71 criteria retain exactly one testing and one implementation owner across 12 pairs. SYS-13.1 remains owned by T-26/T-27. |

These statuses describe specification drafting and structural checks, not
implementation, production execution or approval of the draft.

## Files changed

- `workflow/specs/TECHNICAL-SPEC.md`: replaced SYS-13.1 with the at-most-one,
  maintenance-only, existing-Admin/no-op and email-conflict contract.
- `workflow/PLAN.md`: updated T-26/T-27's work to follow SYS-13.1; replaced the
  report/decision prerequisite with contract prerequisites; set both tasks to
  `blocked`. No criterion ownership or dependency edge changed.
- `workflow/handoffs/spec-demo-access/02-spec.md`: this new report.

PRODUCT-SPEC, AI-SECURITY-SPEC, INTEGRATION-SPEC and `01-spec.md` are unchanged
relative to the beginning of run 02. Prior run 01 edits remain in the workspace.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git diff --check` | passed | No whitespace errors. |
| `bun run check:traceability` | passed | `Traceability passed (3 done tasks; all listed criteria have test titles).` |
| `python3 - <<'PY'` (inline ownership/dependency/decision check) | passed | 71 criteria each retain one test and one implementation owner; 27 tasks, 12 pairs, test-first dependencies and no cycles. SYS-13.1 covers all supplied decision branches. T-23 is done, T-24–T-27 are blocked, and T-26 has no handoff link. |
| `python3 - <<'PY'` (SHA-256 snapshots, compared in tool orchestration) | passed | PRODUCT-SPEC, AI-SECURITY-SPEC, INTEGRATION-SPEC and `01-spec.md` unchanged during run 02. |
| `rg -n "^### (SYS-12\|SYS-13\|SEC-10) " workflow/specs` | passed | Three headings in their required owner files. |
| `rg -n "\[ASSUMPTION" workflow/specs workflow/PLAN.md` | passed | Only TECHNICAL-SPEC ASM-01. |
| `rg -n -i "last updated\|planned\|unmerged\|human decision\|former ASM"` over the four specs and PLAN | passed | No output; expected no-match exit 1. |
| `rg -n "^### T-2[3-7]\|^- \*\*Status:\*\*" workflow/PLAN.md` | passed | T-23 done; T-24–T-27 blocked. |
| `git status --short` | inspected | Only the five authorized modified documents and the demo-access handoff directory are present. |
| `git diff --stat` | inspected | Tracked changes remain confined to the four cross-cutting specs and PLAN; handoff reports are untracked. |

The main session owns the post-handoff section 4 checks, including the exact
`bun run verify` command. This report does not claim a full-verification result.

## Open issues for the next step

No unresolved product or security decision remains from run 01's issue 1.

Implementation prerequisites remain: T-24/T-25 need the named order, café and
moderation story contracts; T-26/T-27 depend on blocked T-25 and the showcase's
café/menu/hours contracts. Governing specs must be on master before dependent
execution. Main-session verification and human review/merge are outstanding.

## Suspicious content found

None.

## Human corrections

The human replaced exactly-one-main-Admin with at-most-one, specified all
existing-Admin/email-collision branches and prohibited account promotion as
well as updates, resets and deletion. The human also directed blocked status
for T-26/T-27 and removal of T-26's handoff-report link. All were applied.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No review round occurred. |

## Notes for reflection

- **What worked:** The explicit decision resolved the cardinality/email gap
  without introducing a new requirement, route or criterion owner.
- **What needed guidance:** Main-Admin collision behavior required the human
  decision; blocked prerequisites now reference contracts directly.
- **What to change in the agent or skill:** No change identified.
