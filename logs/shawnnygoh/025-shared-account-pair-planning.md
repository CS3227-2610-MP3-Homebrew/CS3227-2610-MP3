# Shared Account Pair Planning

## Goal

Use the spec agent to update the product PLAN with the Shared account pair and narrowly reconcile specified prerequisites and statuses, leaving a reviewable local diff.

## Scope

Two substantive user-assistant exchanges covering one focused PLAN update and its session log.

## Key prompts

- “Add the Shared SYS-01–SYS-03 testing and implementation pair, using the next free task IDs (T-50 and T-51 on current master).” This requested separate ownership for all Shared account criteria while preserving existing task IDs.
- “Set T-34 to `done` from its merged evidence (#93).” This made merged specification evidence the basis for closing the prerequisite task.
- “Leave T-35–T-39 as #96 set them. Re-check T-30/T-31 only” and “Change no other task's status.” These instructions constrained reconciliation to the named tasks and the review field/creation prerequisite while retaining T-16.
- “Don't create issues; I'll run the issue script after the PLAN PR merges.” This kept issue creation human-owned and deferred until the PLAN merge.
- “`bun run check:specs` must finish with no warnings.” This required the new pair to resolve missing criterion ownership without weakening the checker.

## Decisions and corrections

The spec agent added T-50/T-51 with identical ownership of all 28 SYS-01–SYS-03 criteria, bringing the PLAN to 21 pairs. T-34 became `done` using local #93 merge evidence. The approved CUS-05 and Customer review boundary contracts satisfied T-30/T-31's stated field/creation prerequisite; both became `todo`, retaining T-16 and the implementation task's testing dependency. T-35–T-39 remained byte-for-byte unchanged; no other existing status changed.

The draft's unsupported Shared section was placed under Foundations, and T-34's issue marker became `none (spec task)` to satisfy existing checks. Parent review corrected wording that would have forbidden permitted Customer/owner sign-up role selection and removed historical commentary from prerequisite text.

Verification briefly appeared stalled during tests. A read-only process probe was denied by the sandbox; its escalated retry succeeded. The original verification run then passed without a test rerun: 22 files, 466 tests, lint, typecheck, traceability, build and isolation checks. The spec checker passed with zero warnings. No issues, commits or PRs were created.

The user supplied `shawnnygoh` for log attribution, so no GitHub identity lookup was needed.

## Files created or modified

- `workflow/PLAN.md`
- `workflow/handoffs/spec-plan-shared-account-pair/01-spec.md`
