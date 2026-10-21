---
name: sdd-docs
description: Update Homebrew's User Guide, Developer Guide and README for one reviewed issue, documenting only implemented behaviour and recording claim-to-evidence traceability. Use for documentation, not implementation, tests, specs or reflections.
---

# Document a reviewed change

Follow [the docs agent](../../../workflow/agents/docs.md) for scope, inputs,
content rules, verification and reporting.

## 1. Inventory what changed

From the merge-base-to-working-tree diff and the issue's handoffs, list:

- **User-visible changes:** routes and screens per role, navigation entries,
  buttons and field labels, validation and error messages, statuses, limits,
  AI labels and fallbacks, and removed or renamed behaviour.
- **Developer-visible changes:** modules and their responsibilities, schema,
  migrations and RLS policies, configuration variable names, commands, tests,
  security controls, workflow files and any reused material.

Leave out anything the diff does not contain. Earlier reports may describe
work that later failed review; the final code decides.

## 2. Collect evidence from the code

For each user-visible item, find the exact wording in `src/app/` (route folders,
headings, labels, `aria-label`s, messages) and the rule behind it in `src/server/`
or migrations. Prefer a passing test that asserts the behaviour. Record
`path:line` or the test name for every claim. If a detail cannot be confirmed,
leave it out of the guide and note it in your report.

## 3. Update the User Guide

Keep the existing numbered structure: shared account sections, then one section
per role, then AI features, reference, limitations and troubleshooting. For each
feature, write:

1. One sentence on what it does and who can use it.
2. **Where:** the navigation path, using on-screen names.
3. Numbered steps a peer tester can follow.
4. What the user sees on success, and each error or limit message, quoted exactly.
5. For AI features: that results are AI-generated advice, what the fallback
   shows, and the limits a user can reach.

Update the table of contents. Correct or remove stale steps in place.

## 4. Update the Developer Guide

- Fill the section that matches the change (architecture, data model,
  authentication, AI module, security, testing, deployment), linking the
  owning spec sections instead of restating them.
- Use Mermaid diagrams only for flows the code implements.
- Add each new workflow file to the workflow files table and each reuse to
  Acknowledgements, updating the reuse totals.
- Record verified limitations under Known limitations.

## 5. Check and report

Re-read every changed sentence against its evidence row. Run
`bun run check:specs` (not `verify`; docs edits change no code), then write the report the docs agent
defines, including the claim-evidence table and screenshots a human should capture.
