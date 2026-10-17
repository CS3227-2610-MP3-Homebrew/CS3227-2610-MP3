# Product specification and workflow decisions

## Goal
Remove spec lifecycle metadata from the workflow, draft Homebrew's product specification, and revise it with the team's decisions. Preserve a local diff without committing, pushing or opening a PR.

## Scope
Three user-assistant work exchanges covering one connected task: workflow cleanup, product specification drafting and revision, and this session log.

## Key prompts
- "Team decision: a spec on master is approved because its PR was merged, so specs no longer carry Status, Owner or Open questions." This replaced document metadata with merge-based approval and moved unresolved points into handoffs and PR descriptions.
- "Draft only PRODUCT-SPEC.md: no other specs, no story specs and no PLAN.md." This bounded the delegated spec agent's first run to the product document and its report.
- "We've decided to resolve the open issues for PRODUCT-SPEC.md." This supplied product decisions for a second spec-agent run while preserving the first report.
- "Stories are kept as listed; no splits for now." This rejected proposed future story splits and preserved the supplied story boundaries and IDs.

## Decisions and corrections
- The parent edited templates, skills, spec-agent instructions, the spec README and limited Developer Guide wording; the spec agent authored the product document and both reports. Assumptions remain in specs; gaps, unknown owners and proposed splits go in reports. Testing and implementation use only specs on master; task Status remains.
- The product contains 24 stories: Shared 3, Customer 7, Café owner 8 and Admin 6; 20 MVP and 4 stretch, with one AI feature per role.
- Boosts OWN-08 and ADM-06 were confirmed stretch, removing ASM-01. ADM-02 now permits suspension and un-suspension; an approved café becomes visible again when un-suspended.
- SoC LLM access is free for SoC students. Dollar amounts represent quota units, including daily caps of $5 prod/$2 dev, while the $0 cost requirement remains. ASM-02 concerns only unconfirmed actual per-key limits.
- The second report records the four human decisions and routes remaining details to story specs, TECHNICAL-SPEC, INTEGRATION-SPEC or AI-SECURITY-SPEC. Actual per-key limits belong in TECHNICAL-SPEC. Report 01 remains unchanged; report 02 is completed.
- Exact `bun run verify` passed after both work rounds. Scope, story and whitespace checks passed; checker corrections addressed table selection, "As an" grammar and whole-word spending matching. No commits, pushes or PRs occurred.

## Files created or modified
- `workflow/templates/story-spec.md`
- `workflow/templates/ai-feature-spec.md`
- `.agents/skills/spec-create/SKILL.md`
- `.agents/skills/plan-create/SKILL.md`
- `workflow/agents/spec.md`
- `workflow/specs/README.md`
- `docs/DeveloperGuide.md`
- `workflow/specs/PRODUCT-SPEC.md`
- `workflow/handoffs/spec-product-spec/01-spec.md`
- `workflow/handoffs/spec-product-spec/02-spec.md`
