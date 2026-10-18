# Workflow Consistency and Guardrails

## Goal
Align workflow files with the team's decisions, restore a mechanical test-scope gate, and leave a verified, uncommitted diff.

## Scope
Three task-focused user-assistant exchanges, including this logging request, covering one workflow-consistency task.

## Key prompts
- “Make the workflow files consistent with each other and with the team's decisions below.” This required applying settled decisions across instructions, scripts, templates and documentation.
- “Request escalated permissions for every git command; don't try them in the sandbox first. Don't commit or push.” This constrained branch preparation and inspection to approved Git execution.
- “Keep the existing prose about supplementary test titles. Change nothing else, then run `bun run verify` (exactly as written) and report the result and `git status --short`.” This restricted the correction to restoring the mechanical stage 3 check.

## Decisions and corrections
- Confirmed an empty working tree, fetched upstream and created `chore/workflow-consistency` from `upstream/master` without tracking. Every Git command requested escalation; nothing was committed or pushed.
- Standardized all agents and review.sh on gpt-6.1-sol/high. Pairs are two issues sharing a branch/PR named after testing, covering up to three related stories of one role, with a one-story owner option.
- The pair session sets both tasks done after the latest passing review and reruns verify; the spec agent reconciles evidence and reports pair counts on every PLAN update. Removed the retired active status without adding CI evidence enforcement.
- Kept the required verify branch gate, human diff review and teammate production approval. Security writes only its numbered report, checks task SEC criteria/evaluation cases, and excludes retrieval, embeddings, tools and persistent memory in one line.
- Review selects upstream/master, otherwise origin/master, prints/validates the base and requires per-run approval outside the sandbox. Added commit/tag/rebase guardrails. Allowed supplementary internal unit tests without criterion IDs while protecting testing-owned files.
- Removed template dates, retained required Status fields, and reduced AGENTS.md to 945 words with its first nine lines byte-identical. Preserved all 34 protected files. Updated generated issue text and the PR checklist too.
- Fixed a new reference's invalid heading. Verification initially failed on port binding; moving the generated Turbopack cache to a temporary backup allowed the approved verification run to pass.
- The user corrected the prose-only stage 3 gate: added `git status --porcelain -- tests/ | grep -v '^?? tests/unit/'`, escaping the table pipe. Changed nothing else in that follow-up. Exact verify passed again: 24 tests, traceability, zero spec warnings, complete guide inventory and production build. Bash syntax, wording scan and whitespace checks passed.

## Files created or modified
- `AGENTS.md`, `docs/DeveloperGuide.md`, `.github/pull_request_template.md`
- `.codex/agents/{implementation,reviewer,docs}.toml`, `.codex/rules/guardrails.rules`
- `.agents/skills/{plan-create,spec-create,sdd-implement,sdd-orchestrate,sdd-review}/SKILL.md`
- `.agents/skills/sdd-review/scripts/review.sh`
- `.agents/skills/sdd-implement/references/{soc-llm,supabase}.md`
- `workflow/agents/{implementation,reviewer,security-reviewer,spec,testing}.md`
- `workflow/handoffs/README.md`, `workflow/templates/{story-spec,ai-feature-spec,handoff}.md`
- `workflow/scripts/lib/{plan,spec-checks,issues}.ts`
- `tests/unit/{check-specs,plan-issues}.test.ts`
