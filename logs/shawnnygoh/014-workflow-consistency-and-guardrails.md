# Workflow Consistency and Guardrails

## Goal
Align workflow files with team decisions, correct review safeguards and configuration guidance, and leave verified, uncommitted changes.

## Scope
Five task-focused user-assistant exchanges, including both logging requests, covering one workflow-consistency task.

## Key prompts
- “Make the workflow files consistent with each other and with the team's decisions below.” This assigned consistency across instructions, scripts, templates and documentation.
- “Request escalated permissions for every git command; don't try them in the sandbox first. Don't commit or push.” This constrained branch preparation and inspection.
- “Keep the existing prose about supplementary test titles.” This preserved the supplementary-test boundary while restoring a mechanical gate.
- “These are the baseline for every pair; the task's SEC criteria and relevant AI-SECURITY-SPEC evaluation cases are added on top when they exist.” This corrected security review's dependence on assigned SEC criteria.
- “Model names only in configuration.” This centralized settings and removed duplicated prose.

## Decisions and corrections
- Started clean, fetched upstream and created `chore/workflow-consistency` from `upstream/master` without tracking. The later follow-up also began clean on that branch. Every Git command requested escalation; the agent never committed or pushed.
- Initially standardized agents/review.sh on the agreed model/effort. Pairs are two issues sharing a testing-issue-named branch/PR, covering up to three related stories of one role, with a one-story owner option.
- The pair session marks both tasks done after the latest passing review and reruns verify; the spec agent reconciles evidence and reports pair counts. Removed the retired active status without CI evidence enforcement. Retained required verify, human diff review and teammate production approval.
- Added commit/tag/rebase guardrails; allowed internal supplementary unit tests without criterion IDs while protecting testing-owned files. Restored stage 3's `git status --porcelain -- tests/ | grep -v '^?? tests/unit/'` check alongside its prose.
- Initially narrowed security guidance too far. Restored Zero Trust and LLM baselines from upstream: every pair receives baseline checks plus applicable SEC criteria/evaluation cases. Aligned four summaries; retained own-report-only writes and the excluded-surfaces line. Reviewer instructions total 895 words.
- Review validates/prints its remote base and needs per-run escalated approval. Added REVIEW_MODEL/REVIEW_EFFORT overrides for both CLI options and prompt; kept TOML settings unchanged. Removed duplicate model names, retaining one Developer Guide decision row explaining configuration locations and the Codex CLI dependency.
- Initially removed all template dates; restored handoff Date after Spec IDs and restricted the date ban to specs, PLAN and spec templates. Corrected rules' command-text limitations and moved pickup-slot decisions into design decisions.
- Preserved the Next.js header and protected files. Fixed an invalid reference link. An initial port-binding failure cleared after backing up generated Turbopack cache. Latest exact verify passed: 24 tests, traceability, zero spec warnings and production build. Bash syntax, requested scans, mocked overrides and whitespace checks passed.

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
