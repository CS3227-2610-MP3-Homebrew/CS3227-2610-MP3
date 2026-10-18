# Drift Checks, Issue Script and Docs Agent

## Goal
Explore the repository and team context, then complete the outstanding workflow tasks that need no pending decisions, prioritising tooling and skills that keep future agents from drifting away from the specs and process.

## Scope
Three user-assistant exchanges in one focused task: workflow tooling and agent setup, then this log.

## Key prompts
- "I need you to explore the codebase, and the context I have given you, so that you can start doing some of the tasks that are still not done ... (just develop what we are sure of, leave the things that still need decisions for later)." This asked for progress on the team todo list without settling open questions such as role assignments.
- "my priority is to prevent drift, so instead you can also focus on writing skills, and creating workflow plans to ensure that future agents follow proper software engineering principles once the specs of the applciation have been decided." This turned the session toward mechanical checks, gate definitions and agent instructions rather than application code.

## Decisions and corrections
- Bun was not installed. The user chose a system-wide Homebrew install (`brew install oven-sh/bun/bun`) over a scratchpad-only binary or skipping verification.
- The assistant did not edit specs or PLAN.md, because only the spec agent writes them. It reported drift there instead: PLAN.md still describes a SYS-09.5/SEC-06.2 daily-cap conflict that TECHNICAL-SPEC on master has already resolved, and still calls INTEGRATION-SPEC and the security amendment unmerged. INTEGRATION-SPEC was merged with ASM-02/05/06 open, and the spec registry marks two written specs as Planned.
- Application code, deploy workflows (T-17/T-18) and story specs were deferred. They need issues, testing-first tasks, unknown secret names or role decisions.
- The spec agent's one-off `bun -e` plan validator became a permanent `bun run check:specs` inside `verify`. On the current repository it found the same 22 tasks and 46 criteria.
- The issue script was rewritten from MP2's issue-extractor idea. It previews by default, and `--apply` requires a passing spec check, PLAN.md matching master and a human typing the repository name.
- The assistant proposed naming each testing/implementation pair's branch, handoff folder and PR after the testing task's issue number. This is flagged for team confirmation.
- The assistant wrote the unit tests for the workflow tooling itself rather than through the testing agent. This is flagged for team agreement.
- The traceability script's test-title tokenizer was moved into a shared library without changing its behaviour. `bun run verify` passed on the final tree (11 tests).

## Files created or modified
- `workflow/scripts/check-specs.ts`
- `workflow/scripts/create-issues.ts`
- `workflow/scripts/check-traceability.ts`
- `workflow/scripts/lib/spec-checks.ts`
- `workflow/scripts/lib/plan.ts`
- `workflow/scripts/lib/markdown.ts`
- `workflow/scripts/lib/test-titles.ts`
- `workflow/scripts/lib/issues.ts`
- `tests/unit/check-specs.test.ts`
- `tests/unit/plan-issues.test.ts`
- `workflow/agents/docs.md`
- `.codex/agents/docs.toml`
- `.agents/skills/sdd-docs/SKILL.md`
- `.agents/skills/sdd-docs/agents/openai.yaml`
- `.agents/skills/sdd-orchestrate/SKILL.md`
- `.agents/skills/sdd-orchestrate/agents/openai.yaml`
- `.github/pull_request_template.md`
- `workflow/handoffs/README.md`
- `docs/DeveloperGuide.md`
- `AGENTS.md`
- `package.json`
- `.codex/rules/allow.rules`
