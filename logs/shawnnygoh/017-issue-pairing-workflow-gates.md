# Issue Pairing and Workflow Gates

## Goal
Fix three workflow gaps before issue creation: pair tasks by Requirements, permit testing-owned devDependencies, and broaden the implementation scope gate. Record the work under the user-provided GitHub username `shawnnygoh`.

## Scope
Two task-focused user-assistant exchanges covering one workflow maintenance task and its session log.

## Key prompts
- “Fix three workflow gaps before we create issues. Work in this main session; don't use a custom agent.” This required direct edits in the main session before generating issues.
- “Pair a testing and an implementation task only when the implementation depends on it and the criterion IDs in their Requirements fields are the same set.” This distinguished paired tests from other testing prerequisites, especially for T-33.
- “Allow the testing agent to add `devDependencies` its own tests need (with the `bun.lock` change), listing each and why in its report.” This expanded testing scope while preserving runtime dependencies, scripts, and other manifest fields.
- “Run `bun run verify` exactly as written: no pipes or redirects. If it fails at the build binding a port, stop and tell me rather than retrying.” This defined verification and the stopping condition.

## Decisions and corrections
- Ran both branch commands with separate escalated approvals, creating `chore/issue-pairing-and-gates` from `upstream/master`. Used no custom agents and made no commits.
- Shared the criterion-set pairing logic between issue rendering and spec validation. Added T-33-shaped and invalid-pair regression cases; eight assertions failed before the fix, and all 26 targeted tests passed afterward.
- Added testing dependency permissions, implementation ownership protection, one Developer Guide decision row, and a Stage 2 manifest check. Exercised the check against allowed additions and forbidden manifest changes.
- Replaced Stage 3's diff check with the requested porcelain status command. Preserved its tests/docs checks, AGENTS.md, PLAN.md, and the model-name decision row.
- A sandboxed write to the orchestration skill was denied; reran that edit with escalated approval.
- `bun run verify` passed: 34 tests across three files, traceability, spec validation with zero warnings, and production build. The approved issue preview showed T-30↔T-31 and T-32↔T-33 only; nothing was created. Final status contained exactly the nine requested modified files before logging.

## Files created or modified
- `.agents/skills/plan-create/SKILL.md`
- `.agents/skills/sdd-orchestrate/SKILL.md`
- `docs/DeveloperGuide.md`
- `tests/unit/check-specs.test.ts`
- `tests/unit/plan-issues.test.ts`
- `workflow/agents/implementation.md`
- `workflow/agents/testing.md`
- `workflow/scripts/lib/issues.ts`
- `workflow/scripts/lib/spec-checks.ts`
