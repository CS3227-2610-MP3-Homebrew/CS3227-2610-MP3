# Foundations Plan and Capacity Revision

## Goal
Create a Foundations-only product plan from approved specifications using the spec agent and plan-create, then revise its capacity and dependencies after human review.

## Scope
Three task exchanges: initial planning, a correction run, and this log; one focused planning session.

## Key prompts
- “Setup (main session): run `git fetch upstream`, then `git switch --no-track -c docs/plan-foundations upstream/master`.” This established the approved baseline and review branch before delegation.
- “Add no Customer, Café owner or Admin tasks yet: story specs don't exist.” This restricted the plan to technical Foundations while preserving role placeholders.
- “Plan at most 9 Foundations pairs plus 2 spec prerequisite tasks, grouped by deliverable so independent pairs can run in parallel once the database pair merges.” This corrected excessive fragmentation and human PR overhead.
- “The plan is unmerged, so regenerate it with task IDs from T-01; no IDs have been published.” This explicitly authorized replacing the first draft's task identities.

## Decisions and corrections
- Git fetch and branch creation initially encountered sandbox permission errors; approved retries succeeded. The starting working tree was clean.
- The first spec-agent run produced 47 tasks. Human review rejected that capacity; run 02 regenerated exactly 20 tasks: two spec prerequisites and nine test/implementation pairs.
- The nine deliverables are project, database, access matrix/local seeds, auth, usage admission, LLM/fallbacks, caches/eligibility/audit, delivery, and accessibility/responsiveness. All 27 SYS-04–SYS-11 criteria have exactly one test owner and one implementation owner, tests first.
- Core schema, fixed integrity constraints, access matrix and local seeds are unblocked. Later story fields, states and transitions use additive migrations. Sign-up/sign-in screens remain excluded; proxy refresh and Suspense role gates remain Foundations.
- Dependencies are P1→P2; P3/P4/P5 follow P2, with P4 also following P1; P6/P7 independently follow both specs and P5; P8 follows P1/P2. P9 waits for core screens. Shared-file edits serialize without extra functional dependencies.
- Production Admin provisioning moved into AI-SECURITY-SPEC, removing its separate task. A manually triggered production-environment workflow using environment secrets remains an unapproved proposal. Local passwords never ship to hosted projects.
- P6/P7 await integration/security contracts; P5 can verify fixed mechanics with synthetic caps. Missing test tooling is a global prerequisite, not another task. Tasks use todo/blocked and unassigned issues.
- Conventions were reduced to 260 words. Coverage, sequential IDs, acyclic dependencies, 72 relative links and whitespace checks passed; `bun run verify` passed in both runs.
- Run 02 preserved report 01 and every unrelated existing file byte-for-byte. No commits, PRs, deployments, hosted database access or live LLM calls occurred.
- App check scripts move to `scripts/`: `workflow/scripts/` holds human-reviewed review tooling that runs outside the sandbox; implementation agents do not edit workflow files.
- Each task fits one agent run; each test/implementation pair shares one branch and one PR (two issues), because master's required `verify` check runs tests and a failing-first test PR cannot merge alone.

## Files created or modified
- `workflow/PLAN.md`
- `workflow/handoffs/spec-plan/01-spec.md`
- `workflow/handoffs/spec-plan/02-spec.md`
