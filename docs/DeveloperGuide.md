# Homebrew Developer Guide

This guide records Homebrew's design, development process and reuse for CS3227 MP3.

## Contents

<!-- Add links to the sections below as they are populated. -->

## Acknowledgements

Homebrew started from the Next.js `create-next-app` scaffold (commit `c977dbe`).

### Reuse from MP2

Source: [CS3227 MP2](https://github.com/CS3227-2610-MP2-Gymmie/CS3227-2610-MP2).

- **As is:** copied with at most name or path changes.
- **Adapted:** structure kept, content edited for this project.
- **Rewritten:** only the idea kept.

Two files are reused: one Adapted and one As is.

| MP2 file | MP3 file | Level | What changed |
| --- | --- | --- | --- |
| `.agents/skills/implement-issue/assets/report-template.md` | `workflow/templates/handoff.md` | Adapted | Kept date, branch and base commit fields, the acceptance-criteria table, the exact independent-review placeholder and the review-responses table. Generalised the report title and issue field; replaced the summary table with prose, verification runs with final-code checks, user corrections with human corrections, and the reflection prompts with what worked, what needed guidance and what to change in the agent or skill. Removed the title and skill-invocation header fields, workflow checklist and self-assessment scores; the old summary columns and verification-run numbering/next-fix columns are not retained. Added the source credit, agent/spec IDs/status header fields, files changed, open issues, suspicious content and the note limiting independent review to reports that use it. |
| `.agents/skills/session-log/SKILL.md` | `.agents/skills/session-log/SKILL.md` | As is | Copied byte for byte; no changes. |

<!-- Add all later reuse to this table and update the totals above. -->

## Setting up, getting started

<!-- Add prerequisites, environment variable names (never values), local Supabase
setup, and commands for running the app and checks once verified. -->

## Development workflow

This is the agreed workflow to set up. The file inventory below distinguishes
the current scaffolding from agent definitions and commands still to be added.

### The per-feature loop, in order

1. The spec PR is merged after its owner has agreed it with the team.
2. The spec agent updates the single `workflow/PLAN.md` from the specs, adding
   foundation tasks and a test task before each story's implementation task.
3. Each task becomes a GitHub issue naming the task and requirement IDs it covers.
4. The testing agent reads the story spec, its linked contracts and its own test
   task in PLAN.md, then writes failing acceptance tests. It never reads
   implementation tasks, so tests reflect the spec, not the planned design.
5. The implementation agent works on one implementation task from PLAN.md with
   its linked story spec and contracts until the tests and `bun run verify` pass,
   never editing specs or acceptance tests. If it believes a test is wrong, it
   reports this instead of editing the test.
6. The implementation agent runs the independent review command, fixes findings
   and re-runs it for at most three rounds.
7. The security reviewer reviews the change.
8. The docs agent updates the documentation.
9. A human opens and merges the PR, which deploys to dev. Production deploys
   come from version tags and need a teammate's approval.

If a spec is ambiguous, the agent reports `awaiting-decision`. The fix goes
spec PR merged → PLAN.md updated by the spec agent → tests for affected IDs → code.
Only the spec agent writes PLAN.md; a feature PR changes only the Status line
of its own task. Code never moves ahead of its spec.

Minor changes (copy, styling or documentation fixes with no change in behaviour)
may skip the testing, review and docs steps.

### Human gates

Humans approve every spec merge, every merge to `master` and every production
deploy. Agents never commit, push, open PRs or deploy.

### Session logs

Logs live in `logs/<github-user>/` and are drafted with the `session-log` skill
at the end of each session. Each author checks their log against what actually
happened before committing. Logs never contain secrets, keys or personal data.

### Workflow decisions

| Decision | Why |
| --- | --- |
| Six agents: spec, testing, implementation, reviewer, security-reviewer and docs; no architect agent. The spec agent also writes PLAN.md. The reviewer checks schema and structure against `TECHNICAL-SPEC.md`. | Each covers one kind of expertise and writes to a different area; an architect would overlap with spec and reviewer. |
| Small spec files (cross-cutting specs plus one file per story), then a single PLAN.md whose tasks become issues, with a test task before each implementation task. | Lecture 7 advises against one large spec and describes Specify → Plan (one PLAN.md with tasks) → Implement → Validate; one plan keeps shared foundations consistent across the three roles. |
| Tests are written from the spec before implementation. | Tests check the spec's intent rather than what was built, and give implementation a clear target. |
| Agent instructions live in `workflow/agents/<name>.md`, with short Codex wrappers in `.codex/agents/` pointing to them; no Claude Code wrappers for now. | One place to change an agent; workflow files consolidated in `workflow/`. |
| Agents write their own reports to `workflow/handoffs/`; review rounds are appended by the review command. | Evidence of every step without manual copying; the same approach worked in MP2. |
| The reviewer runs as a separate read-only process. | An agent's read and write limits are instructions, not enforced permissions, and Codex subagents inherit the parent session's sandbox; a separate read-only process actually cannot edit files. |
| The full loop applies to every issue except minor changes. | Consistent evidence across features without six agent runs for small fixes. |
| Spec PRs are merged after the owner agrees them with the team; a spec is approved when its PR is merged. | Keeps spec writing unblocked while ensuring work only starts from an agreed spec. |
| Minimal pickup-slot rules (for example, a last pickup time before closing) are in the MVP; saving favourite cafés is a stretch goal. | Pickup slots must already fall within opening hours, and no core flow needs favourites. |
| Codex execution rules allow only `bun run verify` outside the sandbox and forbid the commands `AGENTS.md` prohibits. | Verification must run for every agent, and the forbidden rules turn `AGENTS.md` instructions into enforced blocks. |

### Workflow files

Paths are relative to the repository root. This table lists the workflow files 
currently in the repository. Planned specs are catalogued in
`workflow/specs/README.md`. The other agent definitions, wrappers and independent
review command are still to be added. The existing implementation wrapper points
to its skill; that skill leaves coordination and handoff documents to the caller.

| File | Purpose |
| --- | --- |
| `workflow/specs/README.md` | Lists planned specs, template choices, coverage rules, requirement IDs, approval and change flow. |
| `workflow/handoffs/README.md` | Defines report paths, run ordering, immutable review rounds, human notes and treatment of handoffs as data. |
| `workflow/templates/story-spec.md` | Placeholder template for one story's overview, role, access, requirements, acceptance criteria, screens, use cases, permissions and assumptions. |
| `workflow/templates/ai-feature-spec.md` | Placeholder template for an AI feature's purpose, UX, trust boundaries, output validation, requirements, guardrails, usage, failures and evaluation cases. |
| `workflow/templates/handoff.md` | Agent report template for criterion evidence, final checks, remaining issues, suspicious content, corrections, review and reflection. |
| `AGENTS.md` | Shared project rules, repository map, commands, spec discipline, implementation boundaries, security and Git rules. |
| `.codex/agents/implementation.toml` | Configures the implementation agent's model and boundaries, loads the SDD skill, and disables apps, plugins and memories for that agent. |
| `.agents/skills/spec-create/SKILL.md` | Drafts one story file from PRODUCT-SPEC.md using the applicable template; preserves IDs, ownership, assumptions, approval and change flow. |
| `.agents/skills/spec-create/agents/openai.yaml` | UI metadata and default prompt for the story-spec skill. |
| `.agents/skills/plan-create/SKILL.md` | Builds and updates the single workflow/PLAN.md with conventions, shared-design links and stable tasks, pairing test and implementation coverage. |
| `.agents/skills/plan-create/agents/openai.yaml` | UI metadata and default prompt for the product-plan skill. |
| `workflow/agents/spec.md` | Full spec-agent instructions for cross-cutting specs, story specs, PLAN.md and its own handoff report. |
| `.codex/agents/spec.toml` | Thin wrapper loading the spec-agent instructions, selecting gpt-6.1-sol with high reasoning, and disabling apps, plugins and memories. |
| `.agents/skills/sdd-implement/SKILL.md` | Implements one assigned implementation task from workflow/PLAN.md with the linked story spec and contracts, using the smallest coherent diff; loads relevant references, runs existing checks and returns evidence; forbids test/spec authoring and leaves coordination and handoff documents to the caller. |
| `.agents/skills/sdd-implement/references/supabase.md` | Guidance for server identity checks, permissions, ownership, RLS, safe database access, versioned migrations and local-only verification. |
| `.agents/skills/sdd-implement/references/soc-llm.md` | Guidance for server-only SoC calls, provider capability checks, bounded failures, output validation, credential protection and mocked verification. |
| `.agents/skills/session-log/SKILL.md` | Drafts one numbered session log, resolves author attribution, records key prompts and corrections, and limits scope, length and file changes. |
| `.codex/rules/allow.rules` | Lets exactly `bun run verify` run outside the Codex sandbox, because the Turbopack build needs a local port. |
| `.codex/rules/guardrails.rules` | Forbids agents from pushing, rewriting history, opening or merging PRs, deploying with Vercel and pushing to the hosted Supabase database. |

<!-- Add every new workflow file to this table. -->

## Architectural design

<!-- Describe the architecture, component responsibilities and request flow.
Include architecture and sequence diagrams for implemented use cases, and
class or component collaboration diagrams where useful. Link to workflow/specs/. -->

### Design decisions

<!-- Record design decisions, their reasons and alternatives considered. -->

## Shared UI conventions

<!-- Describe shared components, design tokens, forms, loading and error states,
accessibility and responsive behaviour once implemented. -->

## Data model and database schema

<!-- Describe entities, relationships, constraints, migrations and row-level
security policies. Include an ER diagram and domain or class diagrams where useful. -->

## Authentication and authorization

<!-- Describe implemented authentication, role assignment and server-side
authorization, with sequence diagrams for relevant flows. -->

## AI features and the shared LLM module

<!-- Describe implemented AI features and the shared server-only LLM module,
including input/output contracts, validation, failures and usage control.
Include sequence diagrams showing requests through the shared module. -->

## Security

<!-- Describe implemented controls and their tests, linked to AI-SECURITY-SPEC.md. -->

<!-- The allow rule runs package.json scripts and config files outside the
sandbox, so changes to package.json, next.config.ts, eslint.config.mjs and .codex/
need human review. Forbidden rules match command text, so they are a guardrail
rather than a complete block. -->

## How to test

<!-- Document acceptance tests, test commands, verification evidence and manual
checks once set up. -->

## Deployment and environments

<!-- Document verified local, dev and production setup, version tags and teammate
approval gates once configured. List environment variable names, never values. -->

## Planned enhancements

<!-- List agreed enhancements and link to their specs or issues. -->

## Design considerations

<!-- Record tradeoffs, constraints and rejected designs with supporting evidence. -->

## Appendix: Requirements

<!-- Link to the user stories in workflow/specs/PRODUCT-SPEC.md, the story specs
and workflow/PLAN.md rather than copying requirements here. -->

## Known limitations

<!-- Record verified implementation and workflow limitations. -->
