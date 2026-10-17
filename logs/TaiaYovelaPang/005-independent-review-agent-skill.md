# Independent Review Agent and Skill

## Goal
Create an independent Homebrew reviewer that checks implementation changes against approved specs, acceptance criteria, tests and technical contracts, adapting MP2's review script into a skill.

## Scope
Three task-bearing user-assistant exchanges covering creation, workflow corrections and this session log.

## Key prompts
> "Help me create a review agent that will conduct an independent review of the code changes made by the implementation agent and whether it fulfils the acceptance criteria etc listed in the relevant specs."

This established a separate reviewer responsible for checking implementation evidence against the approved requirements.

> "Use GPT-6.1 sol medium for the model and reasoning capabilities."

This fixed the model and reasoning settings for both the wrapper and independent CLI worker.

> "Adapt the following review.sh file (taken from MP2, file path: evals/implement-issue/review.sh) as a new skill that this review agent will call. Record the changes made in the acknowledgment section of the developer guide"

This required reuse of the MP2 workflow with explicit attribution and adaptation notes.

> "Do no append the review output to implementation handoff. Instead create your own handoff document."

This corrected the initial design to save independent reviewer reports without modifying implementation handoffs.

> "Follow existing agents implementations and split into sections. Lastly, cut down on unnecessary wordings or repetition between all the documents."

This requested consistent agent sections and shorter, linked instructions.

## Decisions and corrections
- Added the reviewer wrapper, sectioned instructions and sdd-review skill. Kept assessment in a fresh read-only Codex process; the launcher runs verification and saves the response.
- Replaced embedded review rounds with separate numbered `NN-reviewer.md` handoffs. Numbering spans all agents in an issue; at most three assessment rounds are allowed. Prerequisite-failure reports do not consume a round.
- Updated the shared handoff rules/template and implementation references. Existing historical reports remained unchanged. Review responses now reference reviewer reports and finding IDs.
- Required spec-derived criterion coverage, meaningful test evidence, technical-contract checks, severity-ranked findings and explicit verification limits. Distinguished review completion from a passing verdict.
- Shortened instructions and guide text, removed a duplicate guide inventory entry and revised MP2 acknowledgements.
- Network restrictions required escalated official-documentation retrieval and GitHub identity lookup. Protected skill-file shell writes failed; patch edits succeeded.
- Bun validated YAML/TOML because the bundled skill validator lacked PyYAML. Shell syntax and diff checks passed. Fourteen isolated checks using real Git and simulated Codex/verification passed for the final launcher. No live review was performed.
- `bun run verify` passed lint, typecheck, two tests and traceability, then failed at production build because Turbopack could not bind a local port, including the escalated retry. Overall status remained incomplete. No commits or pushes were made.

## Files created or modified
- `.codex/agents/reviewer.toml`
- `workflow/agents/reviewer.md`
- `.agents/skills/sdd-review/SKILL.md`
- `.agents/skills/sdd-review/agents/openai.yaml`
- `.agents/skills/sdd-review/scripts/review.sh`
- `workflow/handoffs/README.md`
- `workflow/templates/handoff.md`
- `workflow/agents/implementation.md`
- `.agents/skills/sdd-implement/SKILL.md`
- `docs/DeveloperGuide.md`
