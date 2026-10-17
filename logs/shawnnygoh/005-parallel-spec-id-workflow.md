# Parallel Spec ID Workflow

## Goal
Update the specification workflow documentation so parallel role PRs cannot allocate conflicting requirement IDs. Align templates, skills, agent instructions and project documentation with the canonical rules.

## Scope
Two user-assistant exchanges covering one focused documentation task and its session log.

## Key prompts
> Docs-only change to the spec workflow rules so parallel spec PRs can never claim the same ID. Do not use the spec agent.

This limited the work to workflow documentation and required direct editing without delegating to the spec agent.

> workflow/specs/README.md is canonical; other files must agree with it and may point to it rather than repeat it.

This established one authoritative source for ID allocation and cross-file references.

> Keep the existing voice and wrapping; change only what these items need.

This constrained the diff to the requested corrections and preserved the surrounding document structure.

## Decisions and corrections
- Story IDs come only from PRODUCT-SPEC.md's User stories section. Each story file defines exactly one requirement; extra capabilities become split or new-story proposals marked awaiting-decision.
- TECHNICAL-SPEC.md alone allocates system requirements from SYS-04; AI-SECURITY-SPEC.md alone allocates SEC IDs from SEC-01. Use cases include their story ID; assumptions are numbered per file and cited across files with the file name.
- Removed allocation and unknown-owner guidance from spec-create, updated both templates, and removed PLAN header status. Changed the report wording to "overall result" so the requested lowercase status search is empty; case-insensitive matches are only task Status references.
- Updated Node.js to 24 and the Admin overview to approval, suspension, un-suspension and review moderation.
- The seven numbered items named eight files; only those eight were changed before this log. Protected files were untouched, and no agent was delegated, commit made, push run or PR opened.
- All requested searches met their conditions. git diff --check passed; bun run verify passed lint, typecheck and production build. Next.js warned about an ignored package-lock.json outside the repository. No additional conflicting ID rules were found.
- Used the explicitly supplied username shawnnygoh for log attribution without querying GitHub.

## Files created or modified
- workflow/specs/README.md
- workflow/templates/story-spec.md
- workflow/templates/ai-feature-spec.md
- .agents/skills/spec-create/SKILL.md
- .agents/skills/plan-create/SKILL.md
- workflow/agents/spec.md
- README.md
- docs/DeveloperGuide.md
