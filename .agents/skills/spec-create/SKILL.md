---
name: spec-create
description: Draft or update one Homebrew story spec per user story from PRODUCT-SPEC.md, using workflow/templates and workflow/specs conventions. Use for story specification authoring, not product planning or implementation.
---

# Create story specifications

Turn each selected user story from PRODUCT-SPEC.md into one story file.
Author story specifications only. Do not implement features,
author executable tests, create issues, or dispatch agents.

## Read the source and workflow

1. Read applicable AGENTS.md instructions and
   [spec conventions](../../../workflow/specs/README.md).
2. Read the "User stories" section of workflow/specs/PRODUCT-SPEC.md.
   Preserve each story's text, ID, actor, goal, benefit, priority, and source section.
   Process all explicit stories unless a subset is requested. If the file or the
   selected story is absent, report `blocked` with the missing source; do not invent
   stories or generate empty feature documents. Do not ask clarification questions.
3. Read related existing specs before proposing requirements. The specification
   map in workflow/specs/README.md includes planned files: check whether each
   exists and distinguish missing prerequisites from available contracts.
4. Read the applicable template:
   - [Story specification](../../../workflow/templates/story-spec.md) for ordinary
     customer, owner, or admin stories.
   - [AI feature specification](../../../workflow/templates/ai-feature-spec.md)
     for Brew Finder, Prep Advisor, Moderation Assistant, or another explicitly
     requested LLM feature. Include relevant access/permissions from the story
     template or link an existing story spec that defines them.
   - Cross-cutting system/security requirements belong in TECHNICAL-SPEC.md or
     AI-SECURITY-SPEC.md under the coverage rules, outside this story-only skill.
5. Inspect relevant code, package.json, scripts, and framework documentation for
   technical context. Distinguish installed tooling from intended architecture.
   Follow repository restrictions on secrets, local services, and LLM calls.

## Check story scope before drafting

If a story bundles several independently testable capabilities, propose a split
in the spec agent's report under **Open issues for the next step**, mark the
result `awaiting-decision`, and do not draft the combined spec. Continue
independent work.

## Keep one file per story

Reuse the existing story file when updating. For new stories, use:

```text
workflow/specs/stories/<ID>-<slug>.md
```

Use the source story's ID as its primary requirement ID and filename identifier.
Create exactly one story deliverable per selected story. Keep different stories
separate. Use relative links to related specs. Do not automatically create all
planned specs, modify shared templates, or generate planning or summary files.

## Requirement identity and ownership

- Use `CUS-nn` for customer, `OWN-nn` for owner, `ADM-nn` for admin, `SYS-nn`
  for system, and `SEC-nn` for security requirements, beginning each prefix at
  `01`. AI requirements use their actor's prefix; do not invent an AI prefix.
- Scan existing specs, including removed requirements, before allocating the
  next unused ID. The source story's ID is its primary requirement ID.
- Use one requirement per user-visible capability. Acceptance criteria append
  `.n`, for example `OWN-04.1`. Do not introduce REQ/AC numbering schemes.
- Never reuse or renumber an ID. Preserve removed requirements with their IDs
  marked removed.
- Each requirement has one authoritative definition. Reuse and link an existing
  requirement where it already covers the story. In the story file, identify the
  owning spec for every requirement; label any reproduced context as a summary. New
  requirements may be owned by the story file and linked to their related
  product/system/security scope. Do not create competing definitions.
- If the story changes an existing requirement, draft its amendment in the
  existing owning spec only when that edit is in the assigned scope. Otherwise
  record the required amendment as `awaiting-decision` and block dependent tasks.
  Planning must not override approved behavior.

## Write the story spec

Adapt the applicable template to the individual story while retaining its
relevant sections and requirement-block structure. Do not turn a single-story
assignment into a full role or product specification.

Start with title and metadata: **Last updated** (`YYYY-MM-DD`), **Related specs**,
and **Role**. Include source story/path/section and requirement ownership links.
Do not invent an owner; record unknown owners in the spec agent's report under
**Open issues for the next step**, marked `awaiting-decision`.

For ordinary stories, include:

- **Overview:** user need, benefit, and relevant functional and
  nonfunctional needs.
- **Access:** how the role is obtained, allowed scope, and prohibited actions
  needed for this story.
- **Requirements:** each ID and title, original user story, priority, and risk
  with a reason. Nest testable Given/When/Then **Acceptance criteria**, **Edge
  cases and failure paths**, and **Out of scope** under each requirement, as in
  the template. Cross-reference requirements defined in other owning specs.
- **Screens:** content/states, actions, and requirement IDs in the template table.
- **Use cases:** `UC-<PREFIX>-nn`, actor, preconditions, numbered success scenario,
  and extensions linked to scenario steps.
- **Permissions:** own-data and other-users'-data action scopes needed for this
  story in a table.
- **Out of scope** and **Assumptions**.

For AI stories, retain the AI template's **Purpose** (including why an LLM is
needed), **User experience**, **Inputs** table (source, trust, limit, handling),
**What is never sent to the LLM**, **Output** (shape, validation, plain-text use),
**Requirements** with the same nested blocks, **Guardrails** (threat/control/SEC
ID), **Usage control**, **Failure modes and fallbacks**, **Evaluation cases**,
**Out of scope** and **Assumptions**. Cover unavailable/disabled
LLM, invalid output, and rate limits. Map each adversarial evaluation case to a
specific guardrail row. Treat user-written content as untrusted.

Exact prompt text and LLM input/output schemas belong in INTEGRATION-SPEC.md;
architecture, data model, RLS, and configuration belong in TECHNICAL-SPEC.md;
shared attack surfaces and security controls belong in AI-SECURITY-SPEC.md.
Link relevant sections. If a required contract is absent, identify the missing
section and dependency without fabricating an existing link or duplicating a
canonical contract in a story spec. Report the need for a spec-owned prerequisite
for product planning; this skill does not write the plan.

Keep implementation steps and execution sequencing out of the story spec. Include
observable behavior and nonfunctional constraints where relevant; do not invent
performance targets, access rules, or product scope.

### Assumptions, gaps, and approval

Mark every inferred statement inline as `[ASSUMPTION ASM-nn]`. Add an
**Assumptions** list with rationale and impact, or `None`. Assumptions are
proposals, not accepted requirements. Record gaps, conflicts, missing behavior,
and unconfirmed priorities/risks with affected IDs in the spec agent's report
under **Open issues for the next step**, never in the spec. Also report decisions
needed on consequential assumptions there. Do not silently resolve them or ask
the user questions; mark them `awaiting-decision` and block affected work.
Continue independent drafting.

A spec is approved only when its spec PR has been merged; never infer approval
from document completeness or claim a merge without evidence. Changes to an
approved spec go through a new spec PR. Unresolved points are also listed in the
PR description and resolved, along with behavioral assumptions, before merge.
Testing and implementation agents work only from specs on master. For changes,
preserve:
**spec PR merged → PLAN.md updated by the spec agent → tests for affected IDs
updated → code updated**.

## Review the story file and report

Check every requirement has testable criteria, IDs are unique or linked to their
owner, template coverage is present, and no placeholders remain. Check links
resolve, with missing planned documents explicitly labeled. Record unknowns as
assumptions or decisions instead of fabricated facts. On updates, preserve IDs
and unrelated edits. Report missing contracts and affected IDs for planning.

Report overall status using AGENTS.md's `completed`, `blocked`,
`awaiting-decision`, or `incomplete`, with paths, covered IDs, actual checks,
and remaining decisions. Distinguish completed draft authoring from approval or
implementation. Report facts rather than instructions in handoffs, preserve
existing review rounds, and never claim planned checks were run.
