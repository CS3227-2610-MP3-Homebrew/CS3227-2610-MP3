# Implementation Agent

## Goal
Create a repository-scoped implementation agent tailored to Homebrew's stack, then refine its spec-driven workflow, context loading, verification, and handoff boundaries.

## Scope
Seven user-assistant exchanges including this logging request, covering one evolving agent-configuration task across October 16–17, 2026.

## Key prompts
- “create a specialised implementation agent that only modifies the code” — Established an implementation-only role for the TypeScript/Next.js, Tailwind/shadcn, Supabase, Zod, SoC LLM, Vitest/Playwright, and deployment stack.
- “It will work in a SDD workflow” and “It DOES NOT create test cases.” — Made specifications the implementation source of truth and assigned test authoring to another agent.
- “split this agent up to make it leaner so as to not waste context token” — Requested advice on extracting reusable skills and loading specialised guidance selectively.
- “move instructions to workflow/agents” and “use gpt-6.1-sol instead” — Requested alignment with the repository's evolving workflow, alongside handoff reporting, loop limits, and verification rules.
- “it does not do its own review” — Assigned formal review to a separate future review agent instead of the implementation agent.

## Decisions and corrections
- Created a project-scoped Codex agent with code/configuration/migration scope and no commits, deployments, or hosted database changes.
- Required existing specs, acceptance-criterion mapping, and escalation of material gaps. Prohibited creating or modifying tests, fixtures, mocks, snapshots, or test infrastructure; reading/running existing tests remains allowed.
- Adopted one lean agent plus an SDD skill and conditionally loaded Supabase/SoC references. Core instruction text initially shrank from 1,197 to 243 words; always-loaded skill text still consumes context.
- Later moved role instructions into workflow/agents/implementation.md and retained a thin TOML wrapper. Selected gpt-6.1-sol with medium reasoning.
- Required numbered reports using the workflow handoff template, final-code tests plus bun run verify, and at most three repair cycles per run.
- Corrected the initial review orchestration requirement: implementation now verifies, writes its handoff, and stops. Pending review does not block implementation completion; caller-assigned review fixes require a later run. No review agent was created.
- TOML, reference/path, and diff checks passed during relevant edits. Skill validation could not run because PyYAML was unavailable. Later bun run verify attempts failed because Bun was unavailable; application verification was not claimed.
- Protected agent/skill writes required approved escalation. GitHub attribution initially failed inside the sandbox and succeeded after escalation.

## Files created or modified
- `.codex/agents/implementation.toml`
- `.agents/skills/sdd-implement/SKILL.md`
- `.agents/skills/sdd-implement/references/supabase.md`
- `.agents/skills/sdd-implement/references/soc-llm.md`
- `workflow/agents/implementation.md`
- `workflow/handoffs/README.md`
- `AGENTS.md`
- `docs/DeveloperGuide.md`