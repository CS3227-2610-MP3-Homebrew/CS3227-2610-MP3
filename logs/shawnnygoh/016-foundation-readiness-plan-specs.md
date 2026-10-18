# Foundation Readiness Plan and Specs

## Goal
Update the product plan and six specifications through the spec agent after the foundation-readiness workflow PR merged, then record the session for user-provided GitHub attribution `shawnnygoh`.

## Scope
Two task exchanges covering one focused plan/specification update and its session log.

## Key prompts
- “Use the spec agent to update `workflow/PLAN.md` and the specs below.” This assigned the work to the configured spec agent and bounded it to the listed planning and specification changes.
- “Run this after the workflow PR `chore/foundation-readiness` has merged.” This made merge confirmation a prerequisite for starting the edits.
- “Request escalated permissions (my approval) for these two commands; don't try them inside the sandbox first:” This required explicit approval for fetching upstream and creating the requested branch.
- “Leave every Status as it is.” This preserved progress metadata while dependencies and prerequisites changed.
- “Leave SYS-12.9 unchanged.” This protected the existing seeded-order criterion from the wording cleanup.

## Decisions and corrections
- Confirmed workflow PR #31 merged at `ab53b90`. Both requested Git commands ran successfully with escalated approval; work proceeded on `docs/plan-foundation-readiness`.
- Confirmed the merged plan skill specifies the layer/area test layout before delegating the edits to the spec agent.
- Standardized test scopes, assigned local database scripts and CI startup to T-06, clarified T-05 failing-first connection failures, and revised delivery, demo-kit and maintenance dependencies and prerequisites.
- Updated ownership ranges, retention references, evaluation-table continuity, integration links and moderation wording without adding IDs. Preserved all 33 task Status fields and SYS-12.9. The plan retains 15 testing/implementation pairs: 12 foundation and three Admin pairs.
- Parent diff review caught the remaining E-14 table gap, an extra final blank line and prose wrapping; the spec agent corrected them before verification.
- `bun run check:specs` passed with zero errors and warnings. Exact `bun run verify` passed all stages, including 24 tests across three files and the production build. Vite emitted a nonblocking TypeScript-path plugin advisory.
- The retired-path scan returned no matches. Four remaining wording hits describe runtime disable precedence, Pending reviews and catalogue-cache constraints. Whitespace and requested file-scope checks passed. No commit was made.

## Files created or modified
- `workflow/PLAN.md`
- `workflow/specs/AI-SECURITY-SPEC.md`
- `workflow/specs/TECHNICAL-SPEC.md`
- `workflow/specs/INTEGRATION-SPEC.md`
- `workflow/specs/PRODUCT-SPEC.md`
- `workflow/specs/stories/ADM-03-review-moderation.md`
- `workflow/specs/README.md`
- `workflow/handoffs/spec-foundation-readiness/01-spec.md`
