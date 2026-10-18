---
name: sdd-test
description: Write spec-derived tests for one Homebrew testing task from workflow/PLAN.md and record failing-first evidence. Use for test authoring, not implementation or specification changes.
---

# SDD testing

Read [the testing agent](../../../workflow/agents/testing.md) for input, read,
write, test-contract and reporting rules.

## Turn criteria into cases

For every criterion in the task's Requirements field, map its observable
behaviour to Given/When/Then cases. Include the specified happy path, boundaries,
edge cases, permission denials and failure/fallback paths. Record the mapping
in the testing report with test titles and expected outcomes.

Follow testing.md's test-contract rules for choosing black-box surfaces,
defining module interfaces and handling behavioural gaps or ambiguities.

## Choose the test level

Read the installed Next.js guides before writing tests:

- `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`
- `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`

Use the layout `tests/{unit,integration,e2e}/<area>/`.
Use Vitest under `tests/unit/<area>/` for isolated rules and synchronous components;
use `tests/integration/<area>/` for contract interactions, route boundaries and local
database behaviour. The guide supports synchronous Server and Client Components
with React Testing Library; async Server Components must be tested end-to-end.
Use Playwright only under `tests/e2e/<area>/` for those and browser-visible flows
against the configured production build. Browser specs must never go outside
`tests/e2e/`: Playwright reads only that tree, and Vitest collects the other
test/spec files. Database and route tests must set
`// @vitest-environment node` at the top of each file because Vitest defaults to
jsdom. Prefer user-observable assertions and accessible
roles/labels over private implementation details.

## Fixtures and execution

Use minimal synthetic fixtures, local Supabase only and the fake/disabled LLM
provider only. Control clocks, concurrency and provider errors where the contract
requires deterministic evidence. Never call a live LLM or hosted service.
Do not use snapshot tests of agent-written output; assert the specified behaviour
and contracts directly.

Follow testing.md for verification and failing-first reporting.
