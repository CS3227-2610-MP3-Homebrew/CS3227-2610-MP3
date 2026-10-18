---
name: sdd-implement
description: Implement Homebrew features or fixes from an existing specification, trace acceptance criteria, and hand off verification gaps. Use for spec-driven implementation, not specification or acceptance-test authoring.
---

# Implement from a specification

Produce a local code diff for the assigned spec scope. This workflow does not
authorize editing specifications, authoring acceptance tests, deploying, or
changing hosted services. Supplementary unit tests are allowed as defined below. Follow workflow/agents/implementation.md for scope, repair limits and review boundaries, required
verification, and report rules, alongside applicable AGENTS.md.

## Establish scope

Read the assigned implementation task in workflow/PLAN.md and its linked approved
specs/contracts on master. Story tasks link workflow/specs/stories/; foundation
tasks may link cross-cutting specs without a story spec. If only a feature
name is supplied, locate the spec using repository conventions; do not assume a
spec directory exists. If no applicable spec exists, request its location or
content before implementing. Do not invent a substitute spec.

Map assigned requirements and acceptance criteria to affected code in working
context, without creating a plan file. Respect explicit non-goals. For ambiguity
or conflicts affecting behavior, authorization, or public contracts, report the
exact spec gap and pause affected work; continue independent, unambiguous work.
Make routine internal implementation choices without changing specified behavior.

## Read only relevant context

Inspect git status, package.json, affected code, and applicable repository rules.
Preserve existing changes. Follow AGENTS.md's installed Next.js documentation
requirement before writing Next.js code. If dependencies/docs are missing, install
locked dependencies within current permissions or report the blocked prerequisite.

Load the following references only when the assigned feature touches their scope:

- [Supabase](references/supabase.md): database access, schema/migrations, Auth,
  sessions, ownership, roles, or RLS policies.
- [SoC LLM](references/soc-llm.md): model requests, prompts, or handling
  generated output.

Do not load both references automatically. For a UI-only change, neither may be
needed. Discover actual schemas, environment variable names, and API versions
from the repository and spec rather than assuming them.

## Implement and verify

Implement that task with the smallest coherent diff. Follow
the project's stack conventions in AGENTS.md. Add only dependencies required by
the feature; the target stack does not imply every library is already installed.

Run the relevant existing tests and exactly `bun run verify` on final code,
following the bounded implementation/verification loop in workflow/agents/implementation.md.
You may add supplementary unit tests under `tests/unit/` for internal code you
introduce; their titles never contain criterion IDs. Never edit, skip, delete or
weaken the testing agent's tests, fixtures, mocks, snapshots, helpers or test
configuration. Do not run generators/snapshot-update modes or scaffold missing
Vitest/Playwright infrastructure. Use isolated existing
local test data and avoid paid LLM requests or remote database mutations.

Fix application defects exposed by existing checks. If tests conflict with the
spec or need changes, report them for the testing agent. Never alter assertions
to make checks pass. Inspect the final diff for unintended changes and secrets.

## Handoff

Write and finalize your own numbered implementation report using
workflow/templates/handoff.md and workflow/handoffs/README.md, as required by
workflow/agents/implementation.md. Include criterion evidence, changed paths,
final-code checks, loop counts, supplementary tests, and verification gaps
without authoring acceptance-test plans. Report implemented and verified behavior separately. Preserve
earlier reports and human notes; provide the report path and status.
Do not edit specs, perform formal review, invoke review tooling, or coordinate
other agents. Finalize the handoff for the review agent; pending review
does not prevent reporting verified implementation as completed.
