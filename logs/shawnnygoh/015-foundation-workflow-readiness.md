# Foundation Workflow Readiness

## Goal
Prepare the foundation testing/implementation workflow and its execution rules, then refine the guide and base-ref checks while preserving the local diff.

## Scope
Three task exchanges in one focused workflow-readiness session, including this log request.

## Key prompts
- "Work in this main session and edit the files directly; don't use custom agents." This kept the workflow corrections in the coordinating session without delegation.
- "Keep every other rule and its wording; change only what each item needs." This constrained the changes to the identified foundation blockers.
- "My previous instruction to keep model names out of prose was wrong for that row." This restored the team's single agreed prose location for model defaults.
- "Use the same base as `review.sh`: `upstream/master` when it resolves, otherwise `origin/master`, fetched when the branch is cut." This corrected stale local-master checks in the fork setup.
- "Don't run `bun run verify`; I'll run it in my own terminal." This limited follow-up verification to the requested searches and spec check.

## Decisions and corrections
- Approved escalated fetch and branch creation established `chore/foundation-readiness` at `80a9986aa29cb7f98ad1a2f2681aba495006ee28`. No agents, commits or PRs were used.
- Implementation gained task-scoped workflow/configuration ownership and permission to add only workflow-inventory rows to the guide. Test-generation skills specify area directories, browser-only e2e placement and Node directives for database/route tests.
- Local Supabase guidance uses future core-schema scripts, preserves testing-owned fixtures and distinguishes expected connection failures. Rules allow those scripts and forbid linking, hosted reset forms and dumps, including bunx/npx forms. A sandbox-blocked rule-formatting write succeeded after escalation.
- Initial full verification passed: 24 tests, traceability, spec checks and build. After guide wording changes, normal and escalated verification failed at Turbopack's local-port binding; preceding stages passed. The security-reviewer's blanket database-reset ban remained unchanged because its file was outside the allowed edit set.
- Follow-up restored the model row, selected the review base for story/foundation checks and branch creation, corrected the guide path, and separated test-layout/local-Supabase decisions with reasons and the requested hosted-project safeguards. Type-regeneration detail was removed from the guide.
- Follow-up spec checks passed with zero warnings; searches found one prose model row and five remote-master lines, with no bare local-master command. AGENTS.md remained 991 words. Diff whitespace checks and skill validation passed; the same eleven edited paths remained before this log. Full verification was not rerun during follow-up.

## Files created or modified
- AGENTS.md
- workflow/agents/implementation.md
- workflow/agents/testing.md
- .agents/skills/sdd-implement/SKILL.md
- .agents/skills/sdd-implement/references/supabase.md
- .agents/skills/sdd-test/SKILL.md
- .agents/skills/plan-create/SKILL.md
- .agents/skills/sdd-orchestrate/SKILL.md
- .codex/rules/allow.rules
- .codex/rules/guardrails.rules
- docs/DeveloperGuide.md
