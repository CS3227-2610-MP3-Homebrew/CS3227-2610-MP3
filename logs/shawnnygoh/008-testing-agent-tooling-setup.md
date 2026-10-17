# Testing Agent and Tooling Setup

## Goal
Add Homebrew's testing agent, test runners, traceability check and CI integration, then refine the agent's interface policy and execution-rule documentation.

## Scope
Four user-assistant task exchanges, including this log request; one focused testing-workflow task. Attribution uses the explicitly supplied username shawnnygoh.

## Key prompts
- "Add the testing agent and the test tooling." This requested the agent, skill, runners and workflow integration within a restricted file scope, preserving the Next.js block and leaving a local diff.
- "Where a criterion can only be reached through a module, the test may define the smallest interface it needs" replaced the initial interface prohibition so tests could establish minimal implementation targets while asserting spec behaviour.
- "the Codex rules row lost its guardrails half. Restore it" corrected the documentation to retain both allow-rule and forbidden-command explanations.

## Decisions and corrections
- Fetched upstream and created `feat/testing-agent` from `upstream/master`; confirmed a clean starting tree. Sandbox-denied Git writes succeeded after approval.
- Approved dependency downloads installed Vitest 5.0.5, Playwright 1.64.1 and the installed Next.js guides' support packages. Later changed `@types/node` to `^24`; `bun install` resolved 24.19.2.
- Added single-run, empty-suite-friendly scripts; verify runs lint, typecheck, unit/integration tests, traceability and build. CI runs Chromium e2e separately against a production build.
- The traceability self-check passed covered and uncovered fixtures. A temporary React smoke test passed; temporary samples were deleted. Empty Vitest passed. Playwright's sample and empty-suite runs failed during the production web-server build with a port-permission error, including an elevated retry. E2e success remains unverified; no build workaround was introduced. User ran `bun run test:e2e` locally outside Codex: production build and server start succeeded; exit 0 with no tests.
- Exact `bun run verify` passed, including after the requested revisions. The preserved Next.js block's requested checksums matched.
- User replaced the interface prohibition with black-box-first testing, minimal module interfaces reported under "Interfaces defined by tests", and permission to read merged application interfaces. Implementation tasks and implementation/review reports remain excluded; the skill points to the agent's rules.
- Added the failing-first exception to AGENTS.md's verify row. Corrected documentation for both allowed commands, prefix matching with extra arguments and human script/config review; then restored the guardrails rationale accidentally omitted from the decisions row.
- No commits, pushes, PRs, live LLM calls or hosted-service changes occurred.

## Files created or modified
- `package.json`, `bun.lock`
- `vitest.config.mts`, `playwright.config.ts`
- `tests/unit/check-traceability.test.ts`
- `workflow/scripts/check-traceability.ts`
- `.github/workflows/ci.yml`
- `.codex/rules/allow.rules`
- `workflow/agents/testing.md`, `.codex/agents/testing.toml`
- `.agents/skills/sdd-test/SKILL.md`
- `AGENTS.md`, `docs/DeveloperGuide.md`
