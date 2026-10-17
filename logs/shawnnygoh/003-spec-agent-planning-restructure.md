# Spec Agent and Planning Restructure

## Goal
Set up Homebrew's spec agent and restructure specification and planning guidance around small story files and one product-wide plan. Preserve applicable existing wording and leave a reviewable local diff without committing.

## Scope
Three user-assistant task exchanges, including this log request; one focused workflow task with follow-up refinements and session logging.

## Key prompts
- "Set up the spec agent and restructure specs and planning to follow this structure: several small spec files, then one PLAN.md with tasks." This established the cross-cutting specs, single-file stories, and shared plan whose tasks become issues.
- "Another team member wrote it; keep its rules and wording wherever they still apply, and move its PLAN.md and TASK.md guidance into the new plan-create skill instead of rewriting it from scratch." This required preserving the existing author's applicable rules and crediting the planning guidance moved into the new skill.
- "Within each role, list each story's test task followed by its implementation task." This refined the plan into Foundations, Customer, Café owner, and Admin sections while retaining globally unique task IDs and cross-section dependencies by ID.

## Decisions and corrections
- Changes were limited to the requested Markdown, YAML, and TOML files; no application code, product specs, story specs, or actual PLAN.md were created. No commits, pushes, or PRs were made.
- PRODUCT-SPEC.md's User stories section became the source of story specs. Requirement and task IDs remain stable; testing agents read their own test tasks and linked specs, never implementation tasks.
- Only the spec agent authors PLAN.md; feature PRs may change only their task's Status line. Missing contracts become spec-owned prerequisites.
- Added the spec-agent instructions and thin TOML wrapper using gpt-6.1-sol with high reasoning and apps, plugins, and memories disabled.
- The sandbox initially blocked git mv and a skill-file write; both succeeded after permission requests. Git recognizes the template rename.
- The follow-up changed only the AI template's title and refined task grouping in plan-create and the specs README.
- Verification passed after the initial changes and follow-up: lint, typecheck, and build. TOML parsing, Next.js rules, skill metadata and links, file scope, and whitespace checks passed. The stale-reference scan found only the required historical TASK.md credit.
- During session logging, verification passed lint and typecheck but failed the build because Turbopack could not bind a local port (Operation not permitted). Retrying with escalated permission produced the same failure; application files were left unchanged.
- Attribution uses the user-provided GitHub username shawnnygoh.

## Files created or modified
- AGENTS.md
- docs/DeveloperGuide.md
- workflow/templates/role-spec.md → workflow/templates/story-spec.md
- workflow/templates/ai-feature-spec.md
- workflow/specs/README.md
- workflow/handoffs/README.md
- workflow/agents/spec.md
- .codex/agents/spec.toml
- .agents/skills/spec-create/SKILL.md
- .agents/skills/spec-create/agents/openai.yaml
- .agents/skills/plan-create/SKILL.md
- .agents/skills/plan-create/agents/openai.yaml
- .agents/skills/sdd-implement/SKILL.md
