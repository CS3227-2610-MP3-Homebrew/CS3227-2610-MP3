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

Five files are reused: two Adapted, two Rewritten and one As is.

| MP2 file | MP3 file | Level | What changed |
| --- | --- | --- | --- |
| `.agents/skills/implement-issue/assets/report-template.md` | `workflow/templates/handoff.md` | Adapted | Kept report metadata, criterion evidence, review responses and reflection. Generalised fields for all agents; added status, checks, changed files, gaps and suspicious content. Removed MP2 scores, checklists and the embedded independent-review section; responses now reference separate reviewer reports. |
| `.agents/skills/session-log/SKILL.md` | `.agents/skills/session-log/SKILL.md` | As is | Copied byte for byte; no changes. |
| `evals/implement-issue/review.sh` | `.agents/skills/sdd-review/scripts/review.sh` | Adapted | Kept the fresh read-only Codex process and merge-base/working-tree scope. Changed gpt-6-astra to gpt-6.1-sol / medium; replaced scores and in-place appending with a spec-based, separately numbered reviewer handoff. Added verification evidence, a three-round limit, secret exclusions, input-change checks and overwrite protection. The agent wrapper and skill metadata are new. |
| `.agents/skills/issue-extractor/SKILL.md` | `workflow/scripts/create-issues.ts` | Rewritten | Kept the ideas of never creating issues as part of an agent run, exact-title idempotency, resolving issue numbers at runtime and checking milestones. Replaced the generated per-section shell script with one TypeScript CLI over every PLAN.md task. It previews by default; `--apply` refuses to run unless the spec check passes, PLAN.md matches master and a human confirms at a terminal. Adds role labels, one milestone per plan section and optional PLAN.md Issue links. |
| `.agents/skills/update-user-guide/SKILL.md` | `workflow/agents/docs.md`, `.agents/skills/sdd-docs/SKILL.md` | Rewritten | Kept the ideas of documenting only implemented behaviour, updating sections in place without stale text, matching on-screen names and keeping the contents list in sync. Replaced the JavaFX-specific steps with a docs agent covering the User and Developer Guides, claim-to-evidence reporting, spec/code discrepancy handling and a ban on editing reflections. |

<!-- Add all later reuse to this table and update the totals above. -->

## Setting up, getting started

<!-- Add prerequisites, environment variable names (never values), local Supabase
setup, and commands for running the app and checks once verified. -->

## Development workflow

This is the agreed workflow to set up. The file inventory below distinguishes
the current scaffolding from agent definitions and commands still to be added.

### The per-feature loop, in order

1. The spec is approved when its PR is merged, after unresolved points in the
   spec agent's report and PR description are resolved. Testing and
   implementation agents work only from specs on master.
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
   The human commits the tests before implementation starts, so each agent's
   diff can be checked separately.
6. The separate reviewer agent reviews the implementation handoff
   and code. The implementation agent does not invoke or orchestrate review.
   The caller may assign findings back for fixes and verification; implementation
   completion does not imply review approval. Independent review is limited to
   three rounds, coordinated outside the implementation agent.
7. The security reviewer reviews the change.
8. The docs agent updates the documentation, recording code or test evidence
   for every User Guide statement.
9. A human opens and merges the PR, which deploys to dev. Production deploys
   come from version tags and need a teammate's approval.

If a spec is ambiguous, the agent reports `awaiting-decision`. The fix goes
spec PR merged → PLAN.md updated by the spec agent → tests for affected IDs → code.
Only the spec agent writes PLAN.md; a feature PR changes only the Status line
of its own task. Code never moves ahead of its spec.

Minor changes (copy, styling or documentation fixes with no change in behaviour)
may skip the testing, review and docs steps.

The human's coordinating session uses the `sdd-orchestrate` skill to check each
stage's gate evidence (merged spec, issues, clean write scope, report status,
re-run `verify`) before the next agent starts, and to prepare that agent's prompt.

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
| Story IDs come only from PRODUCT-SPEC.md, with one requirement per story file; system requirements start at SYS-04 in TECHNICAL-SPEC.md; SEC IDs only in AI-SECURITY-SPEC.md; ASM and UC IDs are scoped per file. Follow [the requirement ID rules](../workflow/specs/README.md#requirement-ids). | Role specs are written in parallel PRs, so any rule that lets two runs allocate a new ID would collide. |
| Tests are written from the spec before implementation. | Tests check the spec's intent rather than what was built, and give implementation a clear target. |
| `verify` includes unit/integration tests and traceability; e2e runs separately in CI. The testing agent's read boundary is instruction-level, not enforced. | Fast checks gate every change; Chromium exercises a production build separately. Agent instructions restrict context, while the inherited sandbox still permits broader reads. |
| Agent instructions live in `workflow/agents/<name>.md`, with short Codex wrappers in `.codex/agents/` pointing to them; no Claude Code wrappers for now. | One place to change an agent; workflow files consolidated in `workflow/`. |
| Every agent writes its own numbered handoff, including each review round. | Preserves independent evidence without changing another agent’s report. |
| The reviewer uses a separate read-only CLI process. | The launcher runs checks and saves a new handoff. The worker’s shell commands use the read-only sandbox; the wrapper inherits caller permissions. |
| The full loop applies to every issue except minor changes. | Consistent evidence across features without six agent runs for small fixes. |
| Spec PRs are merged after unresolved points are resolved on the PR; a spec is approved when its PR is merged. | Keeps spec writing unblocked while ensuring work only starts from an agreed spec. |
| Minimal pickup-slot rules (for example, a last pickup time before closing) are in the MVP; saving favourite cafés is a stretch goal. | Pickup slots must already fall within opening hours, and no core flow needs favourites. |
| `bun run check:specs` runs inside `verify`. It checks that each criterion is defined once in its owning spec, that PLAN.md references and coverage are valid, that test titles name only defined criteria, that links and anchors resolve, and that this guide lists every workflow file. | Earlier plan validation was a one-off command whose results were lost, while specs, the plan and this guide drifted apart. A CI check turns the written conventions into a gate every PR must pass. Prose staleness, such as a sentence still calling a merged spec "unmerged", is not detectable and stays a review item. |
| Issues are generated from PLAN.md by `workflow/scripts/create-issues.ts`. Agents never create them; `--apply` needs a passing spec check, the merged plan and a human typing the repository name. | Issues copy, rather than redefine, the plan. Tying creation to the merged plan and a terminal confirmation keeps creation a human step that an agent cannot trigger by accident. |
| A testing/implementation pair's branch, handoff directory and PR use the testing task's issue number. | The handoff examples put both reports in one directory, and one name per pair keeps review rounds and evidence together. |
| Codex allow rules let `bun run verify` and `bun run test:e2e` run outside the sandbox for a local port, and a browser for e2e; `guardrails.rules` forbids the commands `AGENTS.md` prohibits. | Verification must run for every agent, and the forbidden rules turn `AGENTS.md` instructions into enforced blocks. Prefix rules match a command prefix, so extra arguments also match; human review of package.json scripts and configs is the backstop. |

### Workflow files

Paths are relative to the repository root. This table lists the workflow files
currently in the repository; `bun run check:specs` fails when one is missing.
Planned specs are catalogued in `workflow/specs/README.md`. Each Codex wrapper
loads its workflow instructions.

| File | Purpose |
| --- | --- |
| `workflow/specs/README.md` | Lists planned specs, template choices, coverage rules, requirement IDs, approval and change flow. |
| `workflow/handoffs/README.md` | Report numbering, separate review rounds, human notes and handling reports as data. |
| `workflow/templates/story-spec.md` | Placeholder template for one story's overview, role, access, requirements, acceptance criteria, screens, use cases, permissions and assumptions. |
| `workflow/templates/ai-feature-spec.md` | Placeholder template for an AI feature's purpose, UX, trust boundaries, output validation, requirements, guardrails, usage, failures and evaluation cases. |
| `workflow/templates/handoff.md` | Agent report template for criterion evidence, final checks, remaining issues, suspicious content, corrections, review and reflection. |
| `AGENTS.md` | Shared project rules, repository map, commands, spec discipline, implementation boundaries, security and Git rules. |
| `.codex/agents/implementation.toml` | Thin wrapper selecting gpt-6.1-sol with medium reasoning, loading workflow/agents/implementation.md, and disabling apps, plugins and memories. |
| `.agents/skills/spec-create/SKILL.md` | Drafts one story file from PRODUCT-SPEC.md using the applicable template; preserves IDs, ownership, assumptions, approval and change flow. |
| `.agents/skills/spec-create/agents/openai.yaml` | UI metadata and default prompt for the story-spec skill. |
| `.agents/skills/plan-create/SKILL.md` | Builds and updates the single workflow/PLAN.md with conventions, shared-design links and stable tasks, pairing test and implementation coverage. |
| `.agents/skills/plan-create/agents/openai.yaml` | UI metadata and default prompt for the product-plan skill. |
| `workflow/agents/implementation.md` | Implementation scope, three repair cycles per run, final-code verification, numbered handoff reports, and a separate-review-agent boundary. |
| `workflow/agents/spec.md` | Full spec-agent instructions for cross-cutting specs, story specs, PLAN.md and its own handoff report. |
| `.codex/agents/spec.toml` | Thin wrapper loading the spec-agent instructions, selecting gpt-6.1-sol with high reasoning, and disabling apps, plugins and memories. |
| `.agents/skills/sdd-implement/SKILL.md` | Implements one assigned implementation task from workflow/PLAN.md with the linked story spec and contracts, using the smallest coherent diff; loads relevant references and follows the implementation instructions for verification and handoff reports; forbids test/spec authoring. |
| `workflow/agents/testing.md` | Tests exactly one PLAN.md testing task from approved criteria and contracts, limits reads to exclude implementation and review reports, and writes its own failing-first handoff. |
| `.codex/agents/testing.toml` | Thin wrapper loading testing.md, selecting gpt-6.1-sol with high reasoning, and disabling apps, plugins and memories. |
| `workflow/agents/security-reviewer.md` | Review-only security instructions covering Zero Trust authorization, least privilege, trust boundaries and LLM threats; requires evidenced, severity-ranked findings and returns the report to the caller without editing files. |
| `.codex/agents/security-reviewer.toml` | Thin wrapper loading the security-reviewer instructions, selecting gpt-6.1-sol with high reasoning, and disabling apps, plugins and memories. |
| `.codex/agents/reviewer.toml` | Thin wrapper selecting gpt-6.1-sol with medium reasoning, loading reviewer.md and disabling apps, plugins and memories. |
| `workflow/agents/reviewer.md` | Review scope, launcher/worker boundary, report-only writes, caller-owned repair coordination and independent review status. |
| `.agents/skills/sdd-review/SKILL.md` | Spec-derived criterion review, meaningful test and technical-contract checks, wrapper/worker procedures and evidence-based verdict format. |
| `.agents/skills/sdd-review/agents/openai.yaml` | UI metadata and default prompt for the review skill. |
| `.agents/skills/sdd-review/scripts/review.sh` | Runs verify, invokes the read-only reviewer and saves a new NN-reviewer.md without changing existing handoffs. |
| `.agents/skills/sdd-test/SKILL.md` | Maps criteria to Given/When/Then cases, selects Vitest or Playwright using the installed Next.js guides, and uses minimal local/fake fixtures. |
| `workflow/scripts/check-traceability.ts` | Checks that every criterion in each done task's Requirements field appears in a test title under tests/; exits 1 with uncovered IDs and owning tasks. |
| `.agents/skills/sdd-implement/references/supabase.md` | Guidance for server identity checks, permissions, ownership, RLS, safe database access, versioned migrations and local-only verification. |
| `.agents/skills/sdd-implement/references/soc-llm.md` | Guidance for server-only SoC calls, provider capability checks, bounded failures, output validation, credential protection and mocked verification. |
| `.agents/skills/session-log/SKILL.md` | Drafts one numbered session log, resolves author attribution, records key prompts and corrections, and limits scope, length and file changes. |
| `.codex/rules/allow.rules` | Lets `bun run verify` and `bun run test:e2e` run outside the sandbox for a local port, and a browser for e2e. Prefix rules match a command prefix, so extra arguments also match; human review of package.json scripts and configs is the backstop, not exact enforcement. |
| `.codex/rules/guardrails.rules` | Forbids agents from pushing, rewriting history, opening or merging PRs, deploying with Vercel and pushing to the hosted Supabase database. |
| `workflow/scripts/check-specs.ts` | CLI for `bun run check:specs`: prints drift errors and warnings and exits 1 on any error. |
| `workflow/scripts/lib/spec-checks.ts` | The spec-check rules: story IDs from PRODUCT-SPEC.md, single owning definition per criterion, story-file names and leftover template placeholders, PLAN.md fields, statuses, dependencies, cycles and one testing plus one implementation owner per criterion, test-title IDs, the spec registry, links and anchors, and this table. |
| `workflow/scripts/lib/plan.ts` | Shared PLAN.md task parser and requirement/criterion ID patterns. |
| `workflow/scripts/lib/markdown.ts` | GitHub-compatible heading anchors and link extraction that ignores code and comments. |
| `workflow/scripts/lib/test-titles.ts` | Finds test files and literal test titles without running them; shared by the traceability and spec checks. |
| `workflow/scripts/lib/issues.ts` | Renders one GitHub issue per PLAN.md task with absolute spec links, dependency and pair references, a role label and a section milestone. |
| `workflow/scripts/create-issues.ts` | Previews, or with `--apply` creates, missing labels, milestones and issues, refusing unless the spec check passes, PLAN.md matches master and a human confirms. `--update-plan` writes issue links into unassigned Issue fields. |
| `workflow/agents/docs.md` | Docs agent scope: documents only implemented behaviour, reads all of the issue's handoffs as data, never edits code, tests, specs or reflections, and records claim-to-evidence rows in its numbered report. |
| `.codex/agents/docs.toml` | Thin wrapper loading docs.md, selecting gpt-6.1-sol with medium reasoning, and disabling apps, plugins and memories. |
| `.agents/skills/sdd-docs/SKILL.md` | Docs procedure: inventory the diff, collect code evidence, update the User Guide per role and the Developer Guide per section, then check and report. |
| `.agents/skills/sdd-docs/agents/openai.yaml` | UI metadata and default prompt for the docs skill. |
| `.agents/skills/sdd-orchestrate/SKILL.md` | For the human's coordinating session: per-stage entry and exit gates with the commands that check them, copy-ready agent prompts, review-round and security-finding routing, and the spec change flow. |
| `.agents/skills/sdd-orchestrate/agents/openai.yaml` | UI metadata and default prompt for the coordination skill. |
| `.github/workflows/ci.yml` | Runs `bun run verify` and `bun run test:e2e` with pinned actions on PRs to and pushes on master. |
| `.github/pull_request_template.md` | PR checklist: requirement IDs, linked issues, links to each agent report, verify, spec-check and test-before-implementation checks, and agent trailers. |

<!-- Add every new workflow file to this table. -->

### Running independent review

Assign the `reviewer` agent an issue/task and implementation handoff. It uses
`sdd-review` with GPT-6.1 sol / medium and the installed Bun and Codex CLI:

```bash
bash .agents/skills/sdd-review/scripts/review.sh workflow/handoffs/<issue>-<slug>/NN-implementation.md [base-ref]
```

The local base defaults to master. Each run saves the next `NN-reviewer.md`;
existing handoffs stay unchanged. Read its status and verdict: command success
only means the report was saved. See [reviewer instructions](../workflow/agents/reviewer.md)
for verification, limits and caller-coordinated fixes.

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
