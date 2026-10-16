---
name: sdd-implement
description: Implement Homebrew features or fixes from an existing specification, trace acceptance criteria, and hand off verification gaps. Use for spec-driven implementation, not specification authoring or test creation.
---

# Implement from a specification

Produce a local code diff for the assigned spec scope. This workflow does not
authorize editing specifications, authoring tests, deploying, or changing hosted
services. Follow the implementation agent's boundaries and applicable AGENTS.md.

## Establish scope

Read the supplied feature spec and its linked contracts/tasks. If only a feature
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
- [SoC LLM](references/soc-llm.md): model requests, prompts, streaming, or handling
  generated output.

Do not load both references automatically. For a UI-only change, neither may be
needed. Discover actual schemas, environment variable names, and API versions
from the repository and spec rather than assuming them.

## Implement and verify

Implement assigned acceptance criteria with the smallest coherent diff. Follow
the project's stack conventions in AGENTS.md. Add only dependencies required by
the feature; the target stack does not imply every library is already installed.

Inspect available scripts and run appropriate lint, type-check, build, and
existing targeted tests. Do not create or change tests, fixtures, mocks, snapshots,
test helpers, or test configuration, or run generators/snapshot-update modes.
Do not scaffold missing Vitest/Playwright infrastructure. Use isolated existing
local test data and avoid paid LLM requests or remote database mutations.

Fix application defects exposed by existing checks. If tests conflict with the
spec or need changes, report them for the testing agent. Never alter assertions
to make checks pass. Inspect the final diff for unintended changes and secrets.

## Handoff

Return a concise response identifying:

- Implemented, partial, or blocked criteria, with spec identifiers when available.
- Changed files and interfaces.
- Checks actually run and their outcomes; distinguish unverified behavior from
  verified behavior and report missing prerequisites.
- Risks or uncovered behavior for the testing agent, without authoring test cases
  or a test plan.

Do not edit the spec or create a handoff document, spawn another agent, or send
messages to one. The caller owns coordination.
