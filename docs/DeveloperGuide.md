# Homebrew Developer Guide

This guide records Homebrew's design, development process and reuse for CS3227 MP3.

## Contents

- [Acknowledgements](#acknowledgements)
- [Setting up, getting started](#setting-up-getting-started)
  - [Local demonstration data](#local-demonstration-data)
- [Development workflow](#development-workflow)
- [Data model and database schema](#data-model-and-database-schema)
- [Authentication and authorization](#authentication-and-authorization)
- [AI features and the shared LLM module](#ai-features-and-the-shared-llm-module)
- [Security](#security)
- [How to test](#how-to-test)
- [Deployment and environments](#deployment-and-environments)
- [Known limitations](#known-limitations)

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
| `evals/implement-issue/review.sh` | `.agents/skills/sdd-review/scripts/review.sh` | Adapted | Kept the fresh read-only Codex process and merge-base/working-tree scope. Uses the configured model and effort; replaced scores and in-place appending with a spec-based, separately numbered reviewer handoff. Added verification evidence, a three-round limit, secret exclusions, input-change checks and overwrite protection. The agent wrapper and skill metadata are new. |
| `.agents/skills/issue-extractor/SKILL.md` | `workflow/scripts/create-issues.ts` | Rewritten | Kept the ideas of never creating issues as part of an agent run, exact-title idempotency, resolving issue numbers at runtime and checking milestones. Replaced the generated per-section shell script with one TypeScript CLI over every PLAN.md task. It previews by default; `--apply` refuses to run unless the spec check passes, PLAN.md matches master and a human confirms at a terminal. Adds role labels, one milestone per plan section and optional PLAN.md Issue links. |
| `.agents/skills/update-user-guide/SKILL.md` | `workflow/agents/docs.md`, `.agents/skills/sdd-docs/SKILL.md` | Rewritten | Kept the ideas of documenting only implemented behaviour, updating sections in place without stale text, matching on-screen names and keeping the contents list in sync. Replaced the JavaFX-specific steps with a docs agent covering the User and Developer Guides, claim-to-evidence reporting, spec/code discrepancy handling and a ban on editing reflections. |

<!-- Add all later reuse to this table and update the totals above. -->

The shared LLM implementation reuses the three literal system messages from
[INTEGRATION-SPEC](../workflow/specs/INTEGRATION-SPEC.md#exact-feature-prompts-and-schemas)
as is in `src/server/llm/prompts.ts`; the acceptance fixture independently copies
the same contract into `tests/integration/llm/prompts.json`. This is internal
contract reuse, outside the five-file MP2 totals above.

## Setting up, getting started

Use Node.js 24, Bun 1.4.3 and a running Docker engine with the `docker` command
available. Install pinned dependencies from the repository root:

```bash
bun install --frozen-lockfile
bun run db:start
bun run db:reset
bun run db:check
```

The repository pins Supabase CLI 2.121.0 as a development dependency.
`scripts/database.ts` runs the installed CLI from the repository root and accepts
only these three actions, without extra arguments or target URLs:

| Command | Effect |
| --- | --- |
| `bun run db:start` | Starts the Docker-backed local Supabase project `homebrew`; succeeds when it is already running. |
| `bun run db:reset` | Recreates the local database and replays migrations with `--local --no-seed`. This discards local data. |
| `bun run db:check` | Inspects the local PostgreSQL catalogue and exits nonzero if any application table lacks RLS, listing the schema/table names. |

`supabase/config.toml` selects PostgreSQL 17, API port 54321 and database port
54322. The Data API is enabled for `public`, with automatic exposure of new
tables disabled. Auth is enabled locally; Studio, storage, realtime, local SMTP,
edge runtime, analytics and the pooler are disabled. Automatic seed execution is
disabled; migrations create the main workspace and install the Auth provisioning
trigger. These commands do not create demonstration accounts or domain data.

The wrapper captures CLI status output and omits generated credentials on success.
Failures show a bounded, filtered subset of diagnostics; this filter is heuristic.
The catalogue command uses `docker exec` against `supabase_db_homebrew`, with no
connection URL or credential lookup. These commands require local Docker access
and have no hosted target option.

Before starting the app, supply `APP_ENV=local`, `AI_PROVIDER=disabled`,
`NEXT_PUBLIC_SUPABASE_URL` for the local stack and its
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` through the development environment.
The request proxy validates this configuration even for the starter page;
missing or invalid values fail with `Invalid application configuration.` See
the [configuration contract](../workflow/specs/TECHNICAL-SPEC.md#configuration-names).
Run `bun run dev` and open <http://localhost:3000>. The current app still displays
the starter page.

### Local demonstration data

After local startup and migration replay, explicitly populate the demonstration
dataset from the repository root:

```bash
bun --conditions=react-server -e 'const { seedLocalDemonstration } = await import("./src/server/seeds/local.ts"); const result = await seedLocalDemonstration({ environment: "local", supabaseUrl: "http://127.0.0.1:54321", provider: "disabled" }); console.log(result.createdAccounts.length);'
```

This prints only the number of newly created accounts. The server-only entry
uses Docker/psql against the configured local container; it never follows a
linked project, supplied database URL or HTTP target. It accepts only local/CI,
fake/disabled AI and a plain loopback HTTP URL on the configured API port.
Hosted environments and other targets fail before database execution.

`supabase/local-demonstration.sql` is separate from migrations. One transaction
with an advisory lock creates five main-workspace accounts (two Customers, two
owners and one Admin), two approved, non-suspended cafés with menus/hours, and
two past orders with purchased items. Stable domain identities and timestamps
make replay reproducible. Inserts preserve existing data; mismatched account
identities cause failure. Passwords are random on first creation. The return
value contains credentials only for newly created accounts; replay neither
retrieves nor rotates existing passwords. Keep that return value out of logs,
guides and artifacts. The example intentionally omits credentials.

`db:reset` removes local data; re-run this explicit seed afterward if needed.
The demonstration dataset supplies no demo-kit provisioning, order fulfilment
lifecycle or sales interpretation. Hosted delivery applies migrations without
this seed; it does not ship demonstration passwords.

## Development workflow

The workflow files below implement the team's agreed development process.
Agents and `review.sh` use their configured model and effort.

### The per-feature loop, in order

1. A spec is approved when its PR is merged after unresolved points are
   resolved. Testing and implementation work only from specs on master.
2. The spec agent updates `workflow/PLAN.md` with testing/implementation pairs.
   Each pair covers up to three related stories of one role; an owner may ask
   for one story per pair. Every update reports the total pair count and
   reconciles task statuses from handoff evidence.
3. Each task becomes its own issue. The pair shares one branch, handoff folder
   and PR, named after the testing issue. The PR closes both issues.
4. The testing agent reads approved stories, linked contracts and only its own
   task, then writes failing acceptance tests. A human checks the tests against
   the criteria and commits them before implementation starts.
5. Implementation works on its task until the tests and `bun run verify` pass.
   It may add supplementary unit tests under `tests/unit/` for internal code it
   introduces, with no criterion IDs in titles. It never edits, skips or weakens
   the testing agent's tests, fixtures or test configuration; suspected errors
   go back to testing. A human commits the implementation.
6. The reviewer assesses code and the implementation handoff using a separate
   read-only CLI worker. The caller coordinates fixes and at most three review
   rounds per pair. The latest completed/pass report supplies completion evidence
   for close-out.
7. The security reviewer applies baseline checks to every pair, plus task SEC
   criteria and relevant AI-SECURITY-SPEC evaluation cases when present. It writes
   its own next `NN-security-reviewer.md` in the pair's folder and edits nothing else.
   P0/P1 findings return to implementation and independent review; required
   acceptance-test changes go to testing. A later review must pass again.
8. The docs agent documents implemented behaviour with evidence. Close-out checks
   the latest review and reports. With the latest review completed/pass, the pair
   session sets both tasks to `done`, then reruns `bun run verify`; e2e must also
   pass for browser-visible changes.
9. A human reviews the diff, opens and merges the PR through the branch ruleset's
   required `verify` check. Merging deploys to dev. Production deploys come from
   version tags and need a listed reviewer's approval.

If a spec is ambiguous, report `awaiting-decision`. The fix flows spec PR merged
→ PLAN.md updated by the spec agent → tests for affected IDs → code. Only the
spec agent changes plan content; the pair session changes its two Status lines.
Supported task statuses are `todo`, `blocked`, `awaiting-decision` and `done`.
Status reconciliation against reviewer evidence is session/spec-agent work,
without CI enforcement. Existing PLAN structural validation remains in verify.
Keep dates and workflow-state commentary out of specs, PLAN and spec templates;
task Status fields are PLAN's state metadata.

Minor changes (copy, styling or documentation fixes with no change in behaviour)
may skip the testing, review and docs steps.

The human's coordinating session uses the `sdd-orchestrate` skill to check each
stage's gate evidence (merged spec, issues, clean write scope, report status,
re-run `verify`) before the next agent starts, and to prepare that agent's prompt.

### Human gates

Humans approve every spec merge, every merge to `master` and every production
deploy. The branch ruleset requires `verify`, the human reviews the diff, and a
listed reviewer approves the production job. Agents never commit, push, open PRs or deploy.

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
| Testing may add devDependencies required by its tests and the corresponding bun.lock changes, listing each dependency and its purpose in its report. Stage 2 checks that package.json changes only devDependencies; runtime dependencies, scripts and other manifest edits are excluded. These additions are testing-owned alongside fixtures and test configuration. | Tests can use required database clients or parsers while preserving the testing and implementation write boundaries. |
| Test layout: use `tests/{unit,integration,e2e}/<area>/`, browser specs only under `tests/e2e/`, and `// @vitest-environment node` for database and route tests because Vitest defaults to jsdom. | Playwright reads only `tests/e2e/` and Vitest collects everything else, so one convention lives in the skills that generate plans and tests. |
| Local Supabase: agents use the fixed-target `bun run db:start`, `bun run db:reset` and `bun run db:check` wrappers; reset and delete bans apply to hosted databases; fixtures are testing-owned. | Migration replay needs a local reset. The wrapper rejects extra arguments and fixes reset to `--local --no-seed`. Prefix allow rules still match command prefixes, so humans review package scripts and configuration before approving them. |
| `verify` includes unit/integration tests and traceability; e2e runs separately in CI. CI splits `verify`'s steps into parallel jobs and shards Vitest across three runners with their own local Supabase, gathered by one required `verify` job. The testing agent's read boundary is instruction-level, not enforced. | Fast checks gate every change; Chromium exercises a production build separately. Parallel jobs cut a 5–9 minute serial run, mostly database tests, and keep CI time near-flat as tests grow; the gathering job stops a skipped or cancelled job from counting as a pass. Agent instructions restrict context, while the inherited sandbox still permits broader reads. |
| Agent instructions live in `workflow/agents/<name>.md`, with short Codex wrappers in `.codex/agents/` pointing to them; no Claude Code wrappers for now. | One place to change an agent; workflow files consolidated in `workflow/`. |
| Every agent writes its own numbered handoff, including each review round. | Preserves independent evidence without changing another agent’s report. |
| The reviewer uses a separate `codex exec --sandbox read-only` CLI process. Each launcher run from Codex needs human approval outside the sandbox, without an allow rule. | Codex ignores `sandbox_mode` in custom agent files, so the CLI process supplies the review sandbox; the wrapper inherits caller permissions. The launcher runs checks and saves a handoff. |
| The full loop applies to every issue except minor changes. | Consistent evidence across features without six agent runs for small fixes. |
| Spec PRs are merged after unresolved points are resolved on the PR; a spec is approved when its PR is merged. For foundation pairs (SYS-04 or later, or SEC IDs), stage 0 checks each requirement heading in TECHNICAL-SPEC.md or AI-SECURITY-SPEC.md on the selected review base (fetched when the branch is cut), no open assumptions beyond permitted unverifiable facts (currently TECHNICAL-SPEC ASM-01), and a passing `bun run check:specs`; no story file is required. | Keeps spec writing unblocked while ensuring work only starts from an agreed spec. |
| `bun run check:specs` runs inside `verify`. It checks that each criterion is defined once in its owning spec, that PLAN.md references and coverage are valid, that test titles name only defined criteria, that links and anchors resolve, and that this guide lists every workflow file. | Earlier plan validation was a one-off command whose results were lost, while specs, the plan and this guide drifted apart. A CI check gates structural consistency; reviewer-evidence reconciliation stays with the pair session and spec agent. Specs, PLAN and spec templates omit dates and workflow-state commentary. |
| Issues are generated from PLAN.md by `workflow/scripts/create-issues.ts`. Agents never create them; `--apply` needs a passing spec check, the merged plan and a human typing the repository name. The script calls `gh`, so the coordinating session requests approval to run it outside the sandbox at stage 1. | Issues copy, rather than redefine, the plan. Tying creation to the merged plan and a terminal confirmation keeps creation a human step that an agent cannot trigger by accident. |
| A testing/implementation pair is two issues on one branch and one PR named after the testing issue, covering up to three related stories of one role, or one story at the owner's request. | One pair keeps related tests, implementation and review evidence together; the PR closes both issues. The spec agent reports the pair count on every PLAN update. |
| The pair session sets both tasks to `done` after the latest completed/pass reviewer report, then reruns `bun run verify`; the spec agent reconciles statuses from handoffs on every PLAN update. | Completion follows reviewed evidence. CI does not enforce reviewer evidence; structural PLAN checks remain. |
| Agents default to `gpt-6.1-sol` at medium effort; the security-reviewer agent and the `review.sh` review worker stay at high effort. Change agent settings in `.codex/agents/*.toml` and launcher defaults in `.agents/skills/sdd-review/scripts/review.sh`; `REVIEW_MODEL` and `REVIEW_EFFORT` override the launcher defaults. | Keeps configuration in the wrappers and launcher. Medium effort shortens authoring runs; the two independent reviews keep high effort, where depth has caught real defects. `review.sh` requires the Codex CLI even for teammates using another assistant. |
| Implementation may add supplementary unit tests for introduced internal code under `tests/unit/`, without criterion IDs in titles, and never edits, skips or weakens testing-owned tests, fixtures or config. Files under `.github/workflows/` and other configuration are in scope when named in the task's File scope. Implementation may add one row per workflow file it creates to this guide's Workflow files table, with no other `docs/` edits; stage 3 checks this exception. | Acceptance coverage remains independent while internal code receives focused checks. |
| Merge gates are the branch ruleset's required `verify` check and the human's diff review; a listed reviewer approves the production job. | Keeps merge ownership with the human and production approval separate. |
| Codex allow rules let `bun run verify` and `bun run test:e2e` run outside the sandbox for a local port, and a browser for e2e; `guardrails.rules` forbids the commands `AGENTS.md` prohibits. `bun run db:start`, `bun run db:reset`, `bun run db:check`, `bun run test` and `bun install --frozen-lockfile` are also allowed for local Docker and lockfile installs. Additional forbidden commands are `supabase link`, `supabase db reset --linked`, `supabase db reset --db-url` and `supabase db dump`, including bunx and npx forms. | Verification must run for every agent, and forbidden rules back `AGENTS.md` instructions by matching command text only. Prefix rules match a command prefix, so extra arguments also match; the branch ruleset and human review are the real backstops. |

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
| `AGENTS.md` | Shared project rules, repository map, commands, spec discipline, implementation boundaries, security and Git rules. Includes task-scoped workflow/configuration files and workflow-table row additions. |
| `.codex/agents/implementation.toml` | Thin wrapper configuring the model and effort, loading workflow/agents/implementation.md, and disabling apps, plugins and memories. |
| `.agents/skills/spec-create/SKILL.md` | Drafts one story file from PRODUCT-SPEC.md using the applicable template; preserves IDs, ownership, assumptions, approval and change flow. |
| `.agents/skills/spec-create/agents/openai.yaml` | UI metadata and default prompt for the story-spec skill. |
| `.agents/skills/plan-create/SKILL.md` | Builds and updates the single workflow/PLAN.md with conventions, shared-design links and stable tasks, pairing test and implementation coverage. Requires `tests/{unit,integration,e2e}/<area>/`, browser specs only in `tests/e2e/`, and the Node environment directive for database/route tests. |
| `.agents/skills/plan-create/agents/openai.yaml` | UI metadata and default prompt for the product-plan skill. |
| `workflow/agents/implementation.md` | Implementation scope, three repair cycles per run, final-code verification, numbered handoff reports, and a separate-review-agent boundary. Includes task-scoped workflow/configuration files, workflow-table row additions, local Supabase scripts and testing-owned fixtures. |
| `workflow/agents/spec.md` | Full spec-agent instructions for cross-cutting specs, story specs, PLAN.md and its own handoff report. |
| `.codex/agents/spec.toml` | Thin wrapper loading the spec-agent instructions, configuring the model and effort, and disabling apps, plugins and memories. |
| `.agents/skills/sdd-implement/SKILL.md` | Implements one assigned implementation task from workflow/PLAN.md with the linked story spec and contracts, using the smallest coherent diff; loads relevant references and follows the implementation instructions for verification and handoff reports; allows supplementary internal unit tests while protecting testing-owned tests and forbidding spec authoring. Permits task-scoped workflow/configuration files and one table row per created workflow file, with no other docs/ edits. |
| `workflow/agents/testing.md` | Tests exactly one PLAN.md testing task from approved criteria and contracts, limits reads to exclude implementation and review reports, and writes its own failing-first handoff. Database tests target local Supabase, with connection failures expected until core-schema implementation and reported separately from broken tests. |
| `.codex/agents/testing.toml` | Thin wrapper loading testing.md, configuring the model and effort, and disabling apps, plugins and memories. |
| `workflow/agents/security-reviewer.md` | Review-only security instructions covering Zero Trust authorization, least privilege, trust boundaries and LLM threats; requires evidenced, severity-ranked findings and writes only its own NN-security-reviewer.md in the pair folder, applying baseline security checks plus task SEC criteria and relevant AI-SECURITY-SPEC evaluation cases when present. |
| `.codex/agents/security-reviewer.toml` | Thin wrapper loading the security-reviewer instructions, configuring the model and effort, and disabling apps, plugins and memories. |
| `.codex/agents/reviewer.toml` | Thin wrapper configuring the model and effort, loading reviewer.md and disabling apps, plugins and memories. |
| `workflow/agents/reviewer.md` | Review scope, launcher/worker boundary, report-only writes, caller-owned repair coordination and independent review status. |
| `.agents/skills/sdd-review/SKILL.md` | Spec-derived criterion review, meaningful test and technical-contract checks, wrapper/worker procedures and evidence-based verdict format. |
| `.agents/skills/sdd-review/agents/openai.yaml` | UI metadata and default prompt for the review skill. |
| `.agents/skills/sdd-review/scripts/review.sh` | Selects and prints upstream/master or origin/master (or validates an explicit ref), runs verify, invokes the configured model in a read-only CLI and saves a new NN-reviewer.md; Codex requires approval outside the sandbox per run. |
| `.agents/skills/sdd-test/SKILL.md` | Maps criteria to Given/When/Then cases, selects Vitest or Playwright using the installed Next.js guides, and uses minimal local/fake fixtures. Requires `tests/{unit,integration,e2e}/<area>/`, browser specs only in `tests/e2e/`, and `// @vitest-environment node` for database/route tests. |
| `workflow/scripts/check-traceability.ts` | Checks that every criterion in each done task's Requirements field appears in a test title under tests/; exits 1 with uncovered IDs and owning tasks. |
| `.agents/skills/sdd-implement/references/supabase.md` | Guidance for server identity checks, permissions, ownership, RLS, safe database access, versioned migrations and local-only verification. Uses the local Supabase scripts, bans hosted resets/deletions and linking, and keeps fixtures testing-owned. |
| `.agents/skills/sdd-implement/references/soc-llm.md` | Guidance for server-only SoC calls, INTEGRATION-SPEC transport rules, zero retries, bounded failures, output validation, credential protection and mocked verification. |
| `.agents/skills/session-log/SKILL.md` | Drafts one numbered session log, resolves author attribution, records key prompts and corrections, and limits scope, length and file changes. |
| `.codex/rules/allow.rules` | Lets `bun run verify` and `bun run test:e2e` run outside the sandbox for a local port, and a browser for e2e. Adds `bun run db:start`, `bun run db:reset`, `bun run db:check` and `bun run test` for local Supabase Docker, and `bun install --frozen-lockfile` for lockfile installs, with match/not_match examples. Prefix rules match a command prefix, so extra arguments also match; human review of package.json scripts and configs is the backstop, not exact enforcement. |
| `.codex/rules/guardrails.rules` | Forbids agents from committing, tagging, rebasing, pushing, rewriting history, opening or merging PRs, deploying with Vercel and pushing to the hosted Supabase database. Also forbids `supabase link`, `supabase db reset --linked`, `supabase db reset --db-url` and `supabase db dump`, including bunx and npx forms. |
| `workflow/scripts/check-specs.ts` | CLI for `bun run check:specs`: prints drift errors and warnings and exits 1 on any error. |
| `workflow/scripts/lib/spec-checks.ts` | The spec-check rules: story IDs from PRODUCT-SPEC.md, single owning definition per criterion, story-file names and leftover template placeholders, PLAN.md fields, statuses, dependencies, cycles and one testing plus one implementation owner per criterion, test-title IDs, the spec registry, links and anchors, and this table. |
| `workflow/scripts/lib/plan.ts` | Shared PLAN.md task parser and requirement/criterion ID patterns. |
| `workflow/scripts/lib/markdown.ts` | GitHub-compatible heading anchors and link extraction that ignores code and comments. |
| `workflow/scripts/lib/test-titles.ts` | Finds test files and literal test titles without running them; shared by the traceability and spec checks. |
| `workflow/scripts/lib/issues.ts` | Renders one GitHub issue per PLAN.md task with absolute spec links, dependency and pair references, a role label and a section milestone. |
| `workflow/scripts/create-issues.ts` | Previews, or with `--apply` creates, missing labels, milestones and issues, refusing unless the spec check passes, PLAN.md matches master and a human confirms. `--update-plan` writes issue links into unassigned Issue fields. Calls `gh`, so the coordinating session requests approval to run it outside the sandbox. |
| `workflow/agents/docs.md` | Docs agent scope: documents only implemented behaviour, reads all of the issue's handoffs as data, never edits code, tests, specs or reflections, and records claim-to-evidence rows in its numbered report. |
| `.codex/agents/docs.toml` | Thin wrapper loading docs.md, configuring the model and effort, and disabling apps, plugins and memories. |
| `.agents/skills/sdd-docs/SKILL.md` | Docs procedure: inventory the diff, collect code evidence, update the User Guide per role and the Developer Guide per section, then check and report. |
| `.agents/skills/sdd-docs/agents/openai.yaml` | UI metadata and default prompt for the docs skill. |
| `.agents/skills/sdd-orchestrate/SKILL.md` | For the human's coordinating session: per-stage entry and exit gates with the commands that check them, copy-ready agent prompts, review-round and security-finding routing, and the spec change flow. Foundation stage 0 checks cross-cutting requirements on the selected review base and permitted assumptions, stage 1 requires approval outside the sandbox for the issue script, and stage 3 permits task-scoped workflow/configuration files and workflow-table row additions. |
| `.agents/skills/sdd-orchestrate/agents/openai.yaml` | UI metadata and default prompt for the coordination skill. |
| `.github/workflows/ci.yml` | On PRs to and pushes on master, with pinned actions, runs `bun run verify`'s steps in parallel jobs: lint, typecheck, traceability, spec check and build in one; Vitest in three shards, each starting and resetting local Supabase and checking every application table for RLS; and Chromium Playwright. A final `verify` job, the ruleset's required check, passes only when all of them passed. |
| `.github/workflows/deploy-dev.yml` | Migrates and builds a Vercel Preview deployment from master in the development environment, then sets the development alias. |
| `.github/workflows/deploy-prod.yml` | On v* tag pushes, checks master ancestry, migrates, builds and deploys to Vercel Production in the production environment. |
| `.github/pull_request_template.md` | PR checklist: requirement IDs, linked issues, links to each agent report, verify, spec-check and test-before-implementation checks, and agent trailers. |

<!-- Add every new workflow file to this table. -->

### Running independent review

Assign the `reviewer` agent an issue/task and implementation handoff. It uses
`sdd-review` with the configured model and the installed Bun and Codex CLI:

```bash
bash .agents/skills/sdd-review/scripts/review.sh workflow/handoffs/<issue>-<slug>/NN-implementation.md [base-ref]
```

The base defaults to `upstream/master` when it resolves, otherwise `origin/master`.
The launcher prints the chosen ref and refuses a base that does not resolve to a
commit, including an explicit base. From a Codex session, run the launcher outside
the sandbox with the human's approval for each run; never add an allow rule or
reusable approval prefix. Codex ignores `sandbox_mode` in custom agent files,
which is why review runs as a separate `codex exec --sandbox read-only` worker.
Each run saves the next `NN-reviewer.md`;
existing handoffs stay unchanged. Read its status and verdict: command success
only means the report was saved. See [reviewer instructions](../workflow/agents/reviewer.md)
for verification, limits and caller-coordinated fixes.

## Architectural design

<!-- Describe the architecture, component responsibilities and request flow.
Include architecture and sequence diagrams for implemented use cases, and
class or component collaboration diagrams where useful. Link to workflow/specs/. -->

### Design decisions

| Decision | Why |
| --- | --- |
| Minimal pickup-slot rules (for example, a last pickup time before closing) are in the MVP; saving favourite cafés is a stretch goal. | Pickup slots must already fall within opening hours, and no core flow needs favourites. |

## Shared UI conventions

<!-- Describe shared components, design tokens, forms, loading and error states,
accessibility and responsive behaviour once implemented. -->

## Data model and database schema

The core migrations implement the structural and role-policy foundation of
[SYS-06](../workflow/specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls)
and [SYS-12.1–12.3](../workflow/specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits).
The [data ownership contract](../workflow/specs/TECHNICAL-SPEC.md#data-model-and-ownership)
also describes later product fields and permissions. Current tables store these
relationships and the shared fields needed for permission checks:

| Table | Implemented relationships and constraints |
| --- | --- |
| `workspaces` | UUID identity and `is_main`; a partial unique index allows at most one main workspace. Migration replay inserts exactly one. |
| `profiles` | UUID identity references `auth.users`; required workspace and protected role enum (`customer`, `owner`, `admin`). |
| `cafes` | UUID identity, workspace and owner profile; a composite foreign key requires the owner to share the café's workspace. `application_state` is `pending` (default), `approved` or `rejected`; independent `suspended` defaults to false. |
| `menu_items`, `opening_hours` | UUID identities and required café references; menu `name` and opening time `opens_at` support the narrow owner updates. |
| `orders` | UUID identity, customer profile and café references; a trigger rejects a customer/café workspace mismatch. `placed_at` stores an instant. |
| `order_items` | UUID identity; composite foreign keys require the parent order and menu item to belong to the same café. |
| `reviews` | UUID identity and customer reference; a composite foreign key ties the customer to the order. A unique order reference prevents a second review for that order. The café is derived through the order. `moderation_state` is `pending` (default), `kept` or `hidden`. |

Only profiles and cafés store workspace references. Menu items, opening hours,
orders, order items and reviews inherit their workspace through the café.
Profile and café workspace membership is immutable: changes raise
`Workspace membership cannot be reassigned`. The workspace-identity migration replaces
reverse-edge queries with that rule so an older transaction snapshot cannot
permit a parent workspace move.

Migrations are replayed in filename order:

1. `supabase/migrations/20261019000000_core_schema.sql` creates the eight core
   tables, identities, constraints, supporting indexes, main workspace and RLS/grants.
2. `supabase/migrations/20261019000001_default_privileges.sql` removes global
   default function/table/sequence grants for objects created by `postgres`.
3. `supabase/migrations/20261019000002_immutable_workspace_identity.sql` makes
   profile/café workspace membership immutable.
4. `supabase/migrations/20261020000000_role_matrix.sql` adds shared permission
   fields, scoped read/owner-update policies and protected Auth provisioning.
5. `supabase/migrations/20261020000001_usage_admission.sql` adds private AI usage
   counters, operation/admission identities and the restricted public admission RPC.

`private.ai_usage_counters` keys counts by environment, scope kind/identity,
feature, event and both window boundaries. `private.ai_usage_operations` binds
each operation to an actor, feature and optional café and retains its attempt
count. `private.ai_usage_admissions` retains successful single-use admission
identities and timestamps, referencing their operation. All three tables enable
RLS and revoke direct access from PUBLIC, anon, authenticated and service_role.

Demo-kit creation, remaining story fields and lifecycle transitions, feature
caches, AI audit persistence and retention cleanup remain later work.

## Authentication and authorization

The [RLS contract](../workflow/specs/TECHNICAL-SPEC.md#rls-and-database-exposure)
is implemented for the current domain tables. Policies resolve `auth.uid()`
against protected profiles and check workspace, role, ownership and parent
relationships. Every role, including Admin, is limited to its own workspace;
unauthenticated callers receive no domain access. Profiles remain readable only
by their own authenticated user, with no ordinary profile writes.

| Domain access within the actor's workspace | Customer | Café owner | Admin |
| --- | --- | --- | --- |
| Cafés | Approved and non-suspended only | Own cafés, including suspended ones | All cafés |
| Menu items and opening hours | Only for approved, non-suspended parent cafés | Own cafés only | Denied |
| Orders and order items | Own orders and their items | Own cafés' orders and their items | Denied |
| Reviews | Own reviews regardless of café eligibility/state; other Customers' pending/kept reviews only for eligible cafés | Denied | All reviews |
| Ordinary updates | Denied | Own menu `name` and opening-hours `opens_at` only | Denied |

The eligible cafés in the review row are approved and non-suspended. Parent
checks do not expose another Customer's underlying order when reading a review.
Column grants plus row `USING`/`WITH CHECK` policies constrain owner updates.
Generic inserts/deletes, approval/suspension/moderation changes, role escalation
and ownership/parent reassignment remain denied. Story-owned transactions are
not implemented by these policies.

`src/server/auth/signup.ts` validates selected `customer`/`owner` roles and a
trusted main-workspace identity with Zod; other metadata contributes no protected
authority. The database's Auth insert trigger independently accepts only those
two selections and resolves main from `workspaces`. It rejects other selected
roles, including Admin. An Auth insert with no selected role creates no protected
profile. Later metadata edits cannot change the protected profile. This is
backend provisioning; it adds no application sign-up endpoint or screen.

Local email confirmation is disabled in `supabase/config.toml`. The signup module
declares and validates confirmation-off for dev/prod, but does not configure or
monitor hosted Auth. The human verified **Confirm email** disabled in both
`homebrew-dev` and `homebrew-prod` under Authentication → Email provider, recorded
in [the implementation response](../workflow/handoffs/38-role-matrix-local-demonstration-seeds/05-implementation.md#summary)
and accepted by the [passing review](../workflow/handoffs/38-role-matrix-local-demonstration-seeds/06-reviewer.md#summary).
That is human configuration evidence; settings can drift afterward.

`src/server/auth/workspace.ts` supplies `authorizeWorkspace`, a fail-closed scope
prerequisite for an already authenticated, protected-profile-derived
`VerifiedActor`. Shape validation and workspace equality do not authenticate an
actor or authorize an operation. Callers must establish identity and enforce
role/ownership separately.

The session foundation implements the
[streaming authentication contract](../workflow/specs/TECHNICAL-SPEC.md#decisions-rendering-authentication-and-caches)
using `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.118.0, resolved in
`bun.lock`:

- `src/proxy.ts` invokes Auth `getUser()` to refresh sessions. It forwards
  refreshed cookies to the downstream request and browser response, retaining
  cookie options, unrelated cookies and the SSR adapter's response headers.
- `src/server/supabase/session-client.ts` creates a fresh request-bound client
  with the publishable key and request cookies, preserving RLS for ordinary
  queries. Server Component reads leave cookie persistence to the proxy.
- `src/server/auth/session.ts` exports `getVerifiedActor()`. Every call verifies
  Auth with `getUser()`, then reads and Zod-validates the matching protected
  profile's identity, workspace and role under RLS. Rejected authentication,
  missing/invalid profiles and profile-query errors grant no actor. Cached
  session data and user metadata supply no role or workspace authority.
- `src/server/auth/guard.ts` exports `withAuthorizedActor()`. Each protected
  operation independently checks the current actor, required role and a
  caller-supplied record-permission predicate before invoking its callback.
  Denials throw `Access denied.`; verification or predicate exceptions prevent
  the operation from running.
- `src/app/_components/role-gate.tsx` exports `RoleGate`, a Suspense-wrapped
  Server Component check. Callers supply a public fallback, required role,
  trusted unauthenticated redirect destination and protected children. Anonymous
  visitors redirect to that destination; wrong-role sessions receive no children.

Both `cacheComponents` and `partialPrefetching` remain enabled in `next.config.ts`;
there are no `instant = false` exceptions. Future route exceptions need their
route and reason recorded in the human's PR, as required by
[SYS-05.4](../workflow/specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access).
Future screens must keep private data out of public fallbacks/static shells and
perform protected reads behind the gate with independent near-data authorization.
Callers still own record/workspace predicates, RLS-bound queries and any endpoint's
input, origin and lifecycle rules. A prior proxy/UI check never authorizes a
later operation. This foundation adds no public account endpoint, redirect route,
role screen or navigation flow; AI consumers and kit/maintenance provisioning
remain later work.

## AI features and the shared LLM module

The server-only usage foundation implements
[durable admission](../workflow/specs/TECHNICAL-SPEC.md#admission-and-windows)
and the assigned [usage controls](../workflow/specs/AI-SECURITY-SPEC.md#sec-06--durable-bounded-usage).
It supplies an internal reservation and dispatch seam. Shared validated feature
operations, provider transport, durable AI result caches and content-free AI
audit are also implemented under `src/server/llm/`; there is no production
feature endpoint or AI screen consuming them yet.

The operations implement the shared
[LLM boundary](../workflow/specs/TECHNICAL-SPEC.md#llm-module),
[wire contract](../workflow/specs/INTEGRATION-SPEC.md#soclaas-transport) and
[bounded failure policy](../workflow/specs/AI-SECURITY-SPEC.md#disable-failure-and-fallback-behavior).
Reuse these server-only modules when adding a feature caller:

| Module/API | Implemented responsibility |
| --- | --- |
| `operations.ts`: `readAiRequest(request, feature, {maxReviews, requestId})` | Reads POST JSON with strict feature request schemas, a 65,536-byte UTF-8 body ceiling and cancellation. Returns parsed data or sanitized private/no-store errors for invalid method, media type, body or schema. It does not authenticate or authorize a request. |
| `operations.ts`: `runLlmOperation(options)` | Accepts an already-authorized source snapshot, validates it before effects, requests action admission, checks an optional eligible cache payload, then requests provider-attempt admission before one dispatch. Returns the correlated AI/fallback union. |
| `schemas.ts` | Strict Zod request/source/result validation, canonical JSON serialization and whole-result reference/evidence checks. Provider content must parse as one complete JSON object; unsupported completions, tools/functions and refusals are rejected. Unknown provider metadata is ignored. |
| `prompts.ts` | Fixed literal system messages from the integration contract. Variable source strings stay in the separate canonical JSON user message; they cannot select a prompt, destination or tool. |
| `transport.ts` | Validates provider/model/reasoning configuration and usage policy, constructs the configured `/v1/chat/completions` destination and supplies deterministic fake responses or one native `fetch` call. Requests are non-streaming, reject redirects and have no automatic retries or provider substitution. |

The three operations consume only the
[specified feature contexts](../workflow/specs/INTEGRATION-SPEC.md#exact-feature-prompts-and-schemas):
Brew query and café/item candidates, Prep dates and sales aggregates, or review
references/text for moderation. Extra source fields are rejected. Prep output
quantities and reason text are reconstructed from matched aggregates. Brew
references must match supplied café/item pairs; moderation must classify exactly
the supplied reviews. One invalid member rejects the complete result, including
cache payloads. These checks establish structure and references, not advice quality.

`AI_PROVIDER=disabled` and missing credentials in `soclaas` mode bypass admission,
cache and dispatch after source validation. Invalid configuration fails closed;
fake mode is prohibited in prod. Disable state is rechecked after asynchronous
work and before AI delivery. Serialized context and provider response bodies
each have a 65,536-byte ceiling. A 30-second deadline covers provider dispatch
and body reading; caller cancellation aborts that attempt, and overflow cancels
the reader. Cancellation cannot undo provider consumption already incurred.

The operation returns typed fallback identifiers from the
[result contract](../workflow/specs/INTEGRATION-SPEC.md#ai-routes-and-result-envelope):
`rating_sorted_catalogue`, `top_items` or `manual_queue`, with a reason of
`disabled`, `usage_limited`, `unavailable` or Brew's empty-source
`no_source_data`. Admission denial and provider 429 use `usage_limited`;
admission-service, transport and validation failures use `unavailable`.
These identifiers contain no fallback domain data and do not render a view.

Callers must bind `admit(stage)` to verified actor/scope and server-generated
operation/admission identities using the durable admission service below.
Eligible cache hits still require action admission but consume no provider
attempt. Optional cache callbacks operate only on data payloads; callers own
actor/workspace/café/model/source-version/expiry eligibility and current source
authorization. Moderation never reads or writes this cache. Invalid cache data
falls back without dispatch or a success write. The optional `recordUsage` hook
receives only validated supplied token counts; it supplies no persistent audit.

Feature routes call these operations through the cache and audit layer below
rather than directly. Endpoint integration still needs session/role/origin checks,
authorized source acquisition and current-eligibility rechecks before delivery,
ordinary authorized fallback reads, inert text rendering and separate authorized
human mutations. Prep aggregation windows and data sufficiency remain story-owned.

`src/server/llm/usage-client.ts` uses the installed `@supabase/supabase-js`
2.118.0 client with `NEXT_PUBLIC_SUPABASE_URL` and server-only
`SUPABASE_SECRET_KEY`. It calls only `public.reserve_ai_usage` and `public.ai_state` through
`.rpc(fn, args)`, with Data API retries and session persistence/refresh/URL
detection disabled. It is separate from the publishable-key, request-bound
session client. Application admission needs no direct PostgreSQL credential.
The RPC uses security-definer execution, an empty search path and qualified
application relations; only service_role receives its EXECUTE grant. Ordinary
clients cannot call it or access its private tables.

`createConfiguredUsageAdmission()` reads all 13 explicit
[AI policy keys](../workflow/specs/AI-SECURITY-SPEC.md#limits-and-configuration)
from the server environment. `parseUsageLimits()` accepts nonnegative safe
integers or digit strings, including zero, and rejects missing/invalid values.
It rejects per-operation maxima above two Brew attempts or one Prep/Moderation
attempt, and a moderation review maximum above 20. These are validation ceilings,
not configured dev/prod defaults. Moderation batch input enforcement remains a
feature-boundary responsibility. Zero denies the corresponding work; invalid
policy, request, environment or RPC result and database/transport errors deny
admission without returning raw database errors.

The admission object's `reserve()` operation accepts verified actor identity,
an authorized café when applicable, server-generated operation/admission UUIDs, a feature and an
action/refresh/run/provider-attempt event. Callers must establish session,
role/workspace/source permissions and action/refresh/run admission before
provider dispatch. SQL independently checks current actor role and, for Prep,
café ownership, workspace, approval and suspension. Provider-attempt admission
alone does not establish those caller responsibilities.

A transaction advisory lock serializes the complete decision per environment
across instances. The RPC checks every applicable bound before changing any
counter, operation or admission; denial changes none. Actions share actor
minute/day allowances, with additional café refresh/Admin run daily bounds.
Provider attempts reserve global minute/day and feature-minute capacity and
obey the operation bound. Duplicate successful admission identities are denied;
operation identities cannot move between actor, feature or café. Persisted
state survives instance reconstruction and module reload.

The database clock selects fixed half-open UTC minutes and Singapore calendar
days, each stored with explicit start/end boundaries. New windows preserve old
records. `databaseClock` is a trusted construction-time test option, never
accepted request input; production construction omits it, and SQL permits a
controlled timestamp only for local/CI. Namespaces are local, CI, dev and prod.

`dispatchWithAdmission()` reserves immediately before one provider callback;
denial/unavailability or a thrown callback returns an internal `fallback`
outcome. Admitted failures remain charged, with no retry/refund. An
already-authorized cached value returns without a reservation or callback;
this seam supplies no cache storage or eligibility check. Successful callbacks
preserve returned partial token counts, including zero; absent counts remain
unknown and cost is null. Counts do not measure monetary consumption or confirm
provider entitlement. The seam does not parse model output or render the
feature's non-AI fallback.

### AI caches, eligibility and audit

This layer implements [SYS-10](../workflow/specs/TECHNICAL-SPEC.md#sys-10--durable-feature-caches-and-audit),
[SEC-07](../workflow/specs/AI-SECURITY-SPEC.md#sec-07--safe-cache-reuse) and
[SEC-09](../workflow/specs/AI-SECURITY-SPEC.md#sec-09--content-free-audit-and-bounded-retention).

| Module/API | Implemented responsibility |
| --- | --- |
| `ai-state-client.ts`: `createConfiguredAiState()` | Production composition: secret-key RPC adapter, configured admission and a session-RLS eligibility read of approved, unsuspended cafés in the actor's workspace. |
| `ai-state.ts`: `runOperation(context, options)` | Entrypoint for feature routes. T-14's `runLlmOperation` sequences the stages; this layer supplies one admission per stage, cache reads, eligibility rechecks, audit and publication. Moderation has no result cache. |
| `ai-state.ts`: `readCache`, `writeCache`, `invoke`, `cleanup` | Lower-level repository operations. `invoke` takes a provider callback; prefer `runOperation` for new routes. `cleanup` deletes expired caches, 30-day AI audit and 7-day closed usage windows, preserving active state and never touching moderation audit. |
| `cache-identity.ts` | Canonical JSON (unsupported values fail closed), SHA-256 digests, cache keys and Brew/Prep source revisions from the [integration contract](../workflow/specs/INTEGRATION-SPEC.md#cache-payload-fingerprints-and-source-revisions). |
| `cache-schema.ts`, `ai-audit.ts` | Strict cache context, envelope and audit event validation, reusing T-14's result schemas. |

Callers supply a verified actor, a server-generated operation ID and an
authorized source snapshot; scope is never taken from request input. Brew
entries are scoped to the actor and expire after 10 minutes; Prep entries are
scoped to the café and business date and expire at the next Singapore midnight.
Every cache hit rechecks current role, ownership and café eligibility, both
through session RLS and inside the RPC. A refresh commits when its validated
result is durably stored: authorization, the readiness audit and the write run
first, so a failure leaves the earlier entry unchanged; a disable or
cancellation observed after the write suppresses only that response.

Audit rows hold only operation, actor, feature, time, outcome and provider
token counts when supplied. Outcomes are `started`, `cache`,
`provider_attempt`, `ready` (validated and authorized for delivery, not proof
of receipt), `fallback` and `denied`. A terminal fallback can still be recorded
after midnight or an eligibility change, bound to the operation's original
authorization; that binding grants no cache access or new dispatch.

Storage is three private, RLS-enabled tables with all privileges revoked,
reached only through the security-definer `public.ai_state` RPC that only
service_role may execute. Admin audit entries are separate and belong to the
moderation pair.

## Security

The eight core tables and three private usage tables explicitly enable RLS. Migrations revoke default
schema, table, sequence and function privileges, then grant the specific reads
and two owner-update columns described above. Private trigger functions use an
empty search path and qualified application relations; ordinary roles cannot
invoke them directly. The three security-definer permission predicates have
explicit authenticated execution grants and return scoped booleans; their
private schema is outside Data API exposure. They bypass parent RLS internally
while checking the protected actor and workspace. An event trigger enables
RLS on new non-extension tables in `public`; tables in other application schemas
still require explicit RLS.

`db:check` inspects ordinary and partitioned tables across application schemas,
including unexposed schemas. It excludes PostgreSQL system schemas, named
Supabase-managed schemas and extension-owned tables. A query/tooling failure also
exits nonzero. This checks RLS coverage; the separate role matrix tests check
current policy correctness. Future tables and consumers need their own tests. See the
[security specification](../workflow/specs/AI-SECURITY-SPEC.md) for later application
and AI requirements. The usage RPC described above is the deliberately exposed
AI infrastructure operation; no AI feature HTTP endpoint is implemented.

<!-- The allow rule runs package.json scripts and config files outside the
sandbox, so changes to package.json, next.config.ts, eslint.config.mjs and .codex/
need human review. Forbidden rules match command text, so they are a guardrail
rather than a complete block. -->

## How to test

Start local Supabase before running tests or full verification:

```bash
bun run db:start
bun run check:specs
bun run verify
```

`verify` runs lint, type generation/TypeScript, Vitest, traceability, specification
checks and the production build with source/client-artifact isolation checks.
Vitest includes database integration tests, so it requires Docker access and
resets local data twice during migration replay. `fileParallelism: false` in
`vitest.config.mts` serializes files so role/seed fixtures cannot race those
resets. Run database verification commands sequentially. Playwright remains a separate
`bun run test:e2e` command for browser acceptance.

The 28 cases in `tests/integration/schema/schema.test.ts` cover migration replay,
one main workspace, a valid core graph, Auth and orphan foreign keys, duplicate
reviews, cross-café order items and cross-workspace actor relationships. They also
inspect RLS/explicit grants and prove that the actual checker rejects a new
unexposed table without RLS, names it, then passes after RLS is enabled. Synthetic
graph fixtures run in rolled-back transactions; the catalogue fixture cleans up
its temporary schema. The local adapter uses Docker/psql without a hosted URL.

The 127 cases in `tests/{unit,integration}/roles-seeds/` cover the current role
matrix, protected main-workspace signup, workspace prerequisite, seed replay and
hosted-target/artifact exclusions. Real local Auth cases distinguish protected
profiles from forged raw metadata. RLS fixtures use two Customers, two owners
and an Admin in main and each of two synthetic kit workspaces, plus anonymous
callers. Forty mutable-field cases cover main→kit, kit→main and kit→kit: each
first proves that the actual owner can change the same menu name/opening time,
then observes that a foreign actor cannot change the stored value. Privileged
fixture setup/observation is separate from the attempted ordinary operation.
These fixtures do not implement public kit creation or maintenance provisioning.
Scope-helper tests do not establish actual AI source/cache/route isolation.

The 29 cases in `tests/{unit,integration}/auth/` cover rendering flags and the
absence of instant exceptions, proxy cookie propagation, protected-profile
authority, denial paths and independent read/mutation guards. A genuine local
Auth case refreshes an expired stored session through the actual proxy/client,
resolves its protected profile, then denies the retained cookie after deleting
the local user/profile.

The 14 production Chromium cases in `tests/e2e/auth/` exercise all three roles'
streaming, anonymous redirects, wrong-role denial and private-data-free shells,
expired/invalid sessions after prefetch, and direct guarded GET/POST access.
Playwright builds the root app on loopback port 3100 and a separate test-owned
production harness on 3101. The harness imports the real gate and guard but
controls session resolution; its routes, destination, messages and HTTP statuses
are fixtures. Actual Supabase Auth is covered separately by integration tests;
this is not one browser-to-Auth session test. Run `bun run test:e2e` after
verification, without concurrent builds or database resets.

The 69 cases in `tests/integration/usage/`, `tests/unit/usage/` and
`tests/unit/usage-internals.test.ts` cover durable admission, role grants,
concurrency, all-or-none denial, operation bounds, minute/day rollover,
configuration validation, no-dispatch failures and partial/unknown telemetry.
The local fixture executes named `public` RPC calls as actual service_role,
anon or authenticated; service_role success is a positive control and fixture
setup grants no privileges. Domain setup and controlled-clock queries remain
local Docker/psql operations. Separate installed-SDK tests use fake HTTP to
check the public RPC path, secret-key header, request body and safe errors.
Synthetic 429/timeout/transport/invalid-output exceptions prove one callback,
fallback and retained capacity; they do not exercise a provider response parser.
No live LLM, hosted database or real-credential Data API gateway call is tested.

The 238 cases in `tests/integration/llm/` cover shared HTTP parsing, exact prompts
and captured wire data, strict source/provider/cache schemas and references,
injection-as-data, aggregate-derived Prep evidence, admission ordering, typed
fallbacks, disable precedence, one-attempt failures, byte bounds, timeout and
cancellation. Synthetic transports block unexpected global fetch. These checks
do not establish live SoCLaaS compatibility, model quality, production endpoint
authorization, persistent cache isolation or browser rendering.

CI installs locked dependencies and runs `verify`'s steps and Chromium Playwright
in parallel jobs; each test shard and the browser job start and reset their own
local Supabase, and the test shards run `db:check`. Local verification
passes all 704 tests across 25 files and the production build, including isolation
checks for all 35 client artifacts. The prior session foundation verification
passed all 14 browser cases locally; the shared LLM layer adds no browser surface.
Remote CI execution remains unobserved. The implementation
handoff records a manual
two-session workspace concurrency check; that scenario is not a committed
automated regression.

If `db:check` reports `Local database catalogue unavailable. Check Docker and run
bun run db:start first.`, check that Docker is running and start the local stack.
`Application tables without RLS:` identifies tables requiring explicit RLS in
their migrations; disabling Data API exposure does not satisfy this check.

## Deployment and environments

The repository contains static delivery configuration for
[SYS-07.1](../workflow/specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
The [environment and delivery contract](../workflow/specs/TECHNICAL-SPEC.md#environments-and-delivery)
defines the required hosted setup. The workflows and local checks do not establish
that hosted settings are configured or that a deployment has succeeded.

| Trigger | Environment-bound job | Application target | Required database mapping |
| --- | --- | --- | --- |
| Push to `master` | `development`, in `deploy-dev.yml` | Vercel Preview, followed by alias `homebrew-cs3227-dev.vercel.app` | `homebrew-dev`, Singapore |
| Push of a `v*` tag | `production`, in `deploy-prod.yml` | Vercel Production | `homebrew-prod`, Singapore |

Each job sets up Supabase CLI 2.121.0 before Node 24 and repository Bun. Bun is
selected from `package.json`'s `packageManager` (currently `bun@1.4.3`); an
immediate version comparison fails the job on mismatch. Vercel CLI 64.5.0 is
installed globally. Actions are SHA-pinned, checkout does not persist credentials,
and repository permissions are `contents: read`. Distinct concurrency groups
`deploy-development` and `deploy-production` never cancel an in-progress run.

Production checks out full history, fetches `origin/master` and runs
`git merge-base --is-ancestor HEAD origin/master` before migrations. A tag
outside master's ancestry fails this check. Both workflows then follow this order:

1. Apply SQL migrations using the selected environment's `SUPABASE_DB_URL` with
   `supabase db push --db-url "$SUPABASE_DB_URL" --yes`. If `supabase/migrations`
   has no `.sql` files, log `No SQL migrations found; skipping migrations.` and
   continue. A migration failure stops deployment. No seed, reset or demo/local
   credentials are included.
2. Run `bun install --frozen-lockfile`, then `vercel pull --yes` for the job's
   target (`--environment=preview` or `--environment=production`).
3. Run `vercel build`, then `vercel deploy --prebuilt`; production adds `--prod`
   to both commands. Development captures the prebuilt deployment URL, removes
   its `https://` prefix and POSTs to
   `https://api.vercel.com/v2/deployments/<host>/aliases?teamId=<VERCEL_ORG_ID>`.
   The request uses the selected `VERCEL_ORG_ID` and a fixed JSON body,
   `{"alias":"homebrew-cs3227-dev.vercel.app"}`. It uses
   `curl -sS --fail-with-body` so HTTP error responses fail the step. Shell
   `builtin printf` supplies the Authorization header through `curl --config -`
   stdin, keeping the token out of external process arguments. The captured
   deployment host stays inside one quoted endpoint argument; the JSON body
   contains no captured text.

Migration and deployment share one environment-bound job, so the configured
production approval covers both. There is no manual-dispatch trigger; humans
can re-run an existing run for a redeploy. `ci.yml` only verifies/tests and has
no delivery credentials or deploy commands. `vercel.json` sets `regions: ["sin1"]`
and `git.deploymentEnabled: false`, disabling automatic Vercel Git deployments.

Credentials are supplied as follows; no values belong in documentation or source:

| Name | Human-configured location | Workflow scope |
| --- | --- | --- |
| `VERCEL_TOKEN` | Project-scoped secret in each GitHub environment | Step env on pull and deploy; the dev deploy step also sets the alias through the REST API using a header from stdin. The token is never an external process argument. |
| `SUPABASE_DB_URL` | Secret in each GitHub environment, for its selected database | Migration step only; passed through a quoted shell variable. |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Variables in each GitHub environment | Job env; both environments must identify the same Vercel project. |

Checkout, tool setup, global installation, ancestry checking, migrations,
`bun install` and `vercel build` have no `VERCEL_TOKEN` mapping. Build uses the
pulled settings without a token; see [Known limitations](#known-limitations).

Before the first delivery, a human must configure and verify the following
requirements from the delivery contract:

1. Create GitHub `development` and `production` environments. Allow only the
   `master` branch for development and only `v*` tags, no branches, for production.
   Add the team as required reviewers for production. Self-review and
   administrator bypass stay allowed: production approval is a release
   checkpoint, not a second review of changes already merged to `master`. YAML
   environment binding alone does not configure these protections.
2. Store the table's secrets and variables in their respective environments;
   keep no repository- or organization-level deploy-secret copies. Select the
   appropriate database for each `SUPABASE_DB_URL`: Supavisor shared-pooler
   session mode, port 5432, user `postgres.<project-ref>`, percent-encoded
   password. Do not use the direct database host or transaction mode/port 6543.
3. Use one Vercel Hobby project for Preview and Production, with `sin1` and Git
   deployments disabled as declared in `vercel.json`. Configure the production
   domain `homebrew-cs3227-prod.vercel.app`. Keep Standard Deployment
   Protection and add `homebrew-cs3227-dev.vercel.app` as a Deployment
   Protection Exception so the development alias is public; verify both
   domains and target mappings.
4. Use separate Singapore Supabase projects `homebrew-dev` and `homebrew-prod`.
   Set Vercel application values per target: dev in Preview, prod in Production,
   including separate SoC keys. Application secrets do not go in workflows.
   Use Secret type only for `SUPABASE_SECRET_KEY`, `SOCLAAS_API_KEY`,
   `CRON_SECRET` and `MAIN_ADMIN_PASSWORD`; other application values use Config
   type. Configure every target's values using the
   [configuration names](../workflow/specs/TECHNICAL-SPEC.md#configuration-names)
   and [AI policy table](../workflow/specs/AI-SECURITY-SPEC.md#limits-and-configuration).
   The delivery contract requires application secrets at request time, never
   build time; this configuration pair does not verify runtime consumers.
5. For maintenance, the contract reserves a production GitHub environment
   `CRON_SECRET` equal to Vercel Production's value. These workflows do not
   reference it or invoke maintenance; T-27 owns that extension.
6. A human merges reviewed changes to `master` for dev delivery, then creates
   and pushes a `v*` tag at a commit reachable from `master` for production.
   A listed reviewer approves the production environment job. Humans verify the
   approval, the migration result, application target/database/region and
   domain reachability from the resulting run before claiming deployed acceptance.

Agents never execute deployment workflows, Vercel commands or hosted migrations,
connect to either hosted database, or make live LLM probes. Hosted setup,
approval, execution and verification remain human-only. Local static delivery
tests live in `tests/unit/delivery/`; `bun run verify` runs them without executing
workflow commands or contacting hosted targets.

## Planned enhancements

<!-- List agreed enhancements and link to their specs or issues. -->

## Design considerations

<!-- Record tradeoffs, constraints and rejected designs with supporting evidence. -->

## Appendix: Requirements

<!-- Link to the user stories in workflow/specs/PRODUCT-SPEC.md, the story specs
and workflow/PLAN.md rather than copying requirements here. -->

## Known limitations

The database supplies structural relationships, the current domain role matrix,
protected Customer/owner Auth provisioning in main, and explicit local
demonstration data, session refresh/resolution and reusable streaming role gates.
Account/domain/AI screens and account HTTP flows, demo-kit creation, maintenance provisioning,
scheduled retention cleanup and remaining story fields/transitions are not yet
available. Durable usage admission, shared validated LLM operations/provider
transport and AI caches/audit are implemented internally, without an AI feature
endpoint or UI. Live provider compatibility and model
quality remain unverified; source authorization, persistent cache eligibility,
browser rendering and scheduled cleanup require their owning integrations. The admission service's
per-environment transaction lock serializes admissions; no production load test
has been run. Cleanup exists but nothing schedules it yet, and no monetary
quota guarantee is supplied.
The workspace helper requires trusted actor context and supplies only a scope
prerequisite; no actual AI source/cache/route consumer is implemented here.
Hosted confirmation-off evidence is the recorded human check, not automated
configuration or drift prevention. The catalogue check proves RLS is enabled;
the role matrix tests cover current policies, not future consumers. The
workspace-identity concurrency repair has manual two-session evidence and
single-transaction acceptance coverage; no concurrent regression is committed.
The authentication browser harness controls session resolution; separate actual
local Auth coverage proves expired-cookie refresh and deletion-based revocation,
not every logout/ban/password-change policy or its propagation time. Future
callers must integrate the gate and independently enforce domain permissions;
no production protected endpoint is supplied by the harness.

Delivery validation is local and static. It cannot prove hosted environment
protections, secret storage, Vercel/Supabase settings, runner PATH behavior or
migration/deployment outcomes. Exact pinned delivery CLIs were not executed by
agents. The token-free Vercel build from pulled settings remains unverified on
hosted runners; if the first human-run workflow establishes that authentication
is required, the human can add the token to that build step alone. Step-level
env limits direct token inheritance but does not isolate steps from compromised
tools on the same runner; CLI global installation is outside the application
lockfile. See the [security re-check](../workflow/handoffs/48-delivery-workflows/09-security-reviewer.md)
for the inspected fixes and remaining verification limits.
- Delivery validation in the repository is static. It cannot prove hosted environment protections, secret storage, Vercel or Supabase settings, or migration and deployment outcomes; humans check those on each delivery run.
- `VERCEL_TOKEN` is project-scoped. Vercel CLI commands that first look up the token's account, such as `vercel alias` and `vercel promote`, fail with "User not found", so the development alias is set through Vercel's REST API. Future delivery changes should use the REST API for those operations.
- Production approval allows self-review and administrator bypass, so it is a human release checkpoint rather than separation of duties: whoever pushes a `v*` tag can approve its deployment.
- Step-level `env` limits which steps receive the token but does not isolate steps from a compromised tool on the same runner, and the globally installed Vercel CLI is outside the application lockfile. See the [alias security review](../workflow/handoffs/48-delivery-workflows/14-security-reviewer.md).
