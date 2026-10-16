---
name: spec-create
description: Draft or update Homebrew user-story specifications using workflow/templates and workflow/specs conventions, producing SPEC.md, PLAN.md, and TASK.md per story before implementation.
---

# Create specifications, plans, and tasks

Turn each selected developer-guide user story into three linked documents.
Author specifications and planning documents only. Do not implement features,
author executable tests, create issues, or dispatch agents.

## Read the source and workflow

1. Read applicable AGENTS.md instructions and
   [spec conventions](../../../workflow/specs/README.md).
2. Locate the developer guide in the supplied location or repository docs.
   Preserve each story's text, actor, goal, benefit, and source section. Process
   all explicit stories unless a subset is requested. If the guide or story text
   is absent, report `blocked` with the missing source; do not invent stories or
   generate empty feature documents. Do not ask clarification questions.
3. Read related existing specs before proposing requirements. The specification
   map in workflow/specs/README.md includes planned files: check whether each
   exists and distinguish missing prerequisites from available contracts.
4. Read the applicable template:
   - [Role specification](../../../workflow/templates/role-spec.md) for ordinary
     customer, owner, or admin capabilities.
   - [AI feature specification](../../../workflow/templates/ai-feature-spec.md)
     for Brew Finder, Prep Advisor, Moderation Assistant, or another explicitly
     requested LLM feature. Include relevant access/permissions from the role
     template or link an existing role spec that defines them.
   - For system/security stories, use the relevant coverage rules and planned
     TECHNICAL-SPEC.md or AI-SECURITY-SPEC.md scope; no template exists for them.
5. Inspect relevant code, package.json, scripts, and framework documentation for
   technical planning. Distinguish installed tooling from intended architecture.
   Follow repository restrictions on secrets, local services, and LLM calls.

## Keep three files per story

Reuse an existing story folder when updating. For new stories, use:

```text
workflow/specs/stories/<story-id>-<short-kebab-title>/
  SPEC.md
  PLAN.md
  TASK.md
```

This story-bundle directory supplements the product, role, AI, technical,
integration, and security documents listed in workflow/specs/README.md; it does
not replace or rename them. Use a supplied story ID when present. Otherwise use
its primary requirement ID as the folder identifier after allocating that ID.

Create exactly these three story deliverables. Keep different stories separate.
Use relative links between files and related specs. Do not automatically create
all planned specs, modify shared templates, or generate a fourth summary file.

## Requirement identity and ownership

- Use `CUS-nn` for customer, `OWN-nn` for owner, `ADM-nn` for admin, `SYS-nn`
  for system, and `SEC-nn` for security requirements, beginning each prefix at
  `01`. AI requirements use their actor's prefix; do not invent an AI prefix.
- Scan existing specs, including story bundles and removed requirements, before
  allocating the next unused ID. Keep requirement and source-story IDs distinct.
- Use one requirement per user-visible capability. Acceptance criteria append
  `.n`, for example `OWN-04.1`. Do not introduce REQ/AC numbering schemes.
- Never reuse or renumber an ID. Preserve removed requirements with their IDs
  marked removed. Qualify task IDs by story when linking between bundles.
- Each requirement has one authoritative definition. Reuse and link an existing
  requirement where it already covers the story. In SPEC.md, identify the owning
  spec for every requirement; label any reproduced context as a summary. New
  requirements may be owned by the story SPEC.md and linked to their related
  role/AI/system/security scope. Do not create competing definitions.
- If the story changes an existing requirement, draft its amendment in the
  existing owning spec only when that edit is in the assigned scope. Otherwise
  record the required amendment as `awaiting-decision` and block dependent tasks.
  Do not use PLAN.md or TASK.md to override approved behavior.

## 1. Write SPEC.md

Adapt the applicable template to the individual story while retaining its
relevant sections and requirement-block structure. Do not turn a single-story
assignment into a full role or product specification.

Start with title and metadata: **Status** (`draft` or `approved`), **Owner**,
**Last updated** (`YYYY-MM-DD`), **Related specs**, and **Role** for AI features.
Include source story/path/section and requirement ownership links. Do not invent
an owner; mark an unknown owner as `[ASSUMPTION]` and list it under Open questions.

For role stories, include:

- **Role overview and purpose:** user need, benefit, and relevant functional and
  nonfunctional needs.
- **Access:** how the role is obtained, allowed scope, and prohibited actions.
- **Requirements:** each ID and title, original user story, priority, and risk
  with a reason. Nest testable Given/When/Then **Acceptance criteria**, **Edge
  cases and failure paths**, and **Out of scope** under each requirement, as in
  the template. Cross-reference requirements defined in other owning specs.
- **Screens:** content/states, actions, and requirement IDs in the template table.
- **Use cases:** `UC-<PREFIX>-nn`, actor, preconditions, numbered success scenario,
  and extensions linked to scenario steps.
- **Permissions:** own-data and other-users'-data action scopes in a table.
- **Role-level out of scope** and **Open questions**.

For AI stories, retain the AI template's **Purpose** (including why an LLM is
needed), **User experience**, **Inputs** table (source, trust, limit, handling),
**What is never sent to the LLM**, **Output** (shape, validation, plain-text use),
**Requirements** with the same nested blocks, **Guardrails** (threat/control/SEC
ID), **Usage control**, **Failure modes and fallbacks**, **Evaluation cases**,
**Out of scope**, and **Open questions**. Cover unavailable/disabled LLM,
invalid output, and rate limits. Map each adversarial evaluation case to a
specific guardrail row. Treat user-written content as untrusted.

Exact prompt text and LLM input/output schemas belong in INTEGRATION-SPEC.md;
architecture, data model, RLS, and configuration belong in TECHNICAL-SPEC.md;
shared attack surfaces and security controls belong in AI-SECURITY-SPEC.md.
Link relevant sections. If a required contract is absent, identify the missing
section and dependency without fabricating an existing link or duplicating a
canonical contract in a story spec. Plan an explicitly owned prerequisite.

Keep implementation steps and execution sequencing out of SPEC.md. Include
observable behavior and nonfunctional constraints where relevant; do not invent
performance targets, access rules, or product scope.

### Assumptions, gaps, and approval

Mark every inferred statement inline as `[ASSUMPTION ASM-nnn]`, including in
PLAN.md and TASK.md. Add an **Assumptions** list with rationale and impact, or
`None`. Assumptions are proposals, not accepted requirements. Record conflicts,
missing behavior, unconfirmed priorities/risks, and consequential assumptions
under **Open questions**, with affected IDs. Do not silently resolve them or ask
the user questions; report them as `awaiting-decision` and block affected work.
Continue independent drafting.

New specs and proposed changes are `draft`. A spec is `approved` only when its
spec PR has been merged; never infer approval from document completeness or
claim a merge without evidence. An edited approved spec becomes a draft pending
the change flow. Open questions must be empty and behavioral assumptions resolved
before approval. Implementation waits for approval. For changes, preserve:
**spec PR merged → tests for affected IDs updated → code updated**.

## 2. Write PLAN.md

Link SPEC.md, authoritative requirement definitions, and related contracts.
Include:

- **Scope and traceability:** requirement and criterion IDs covered.
- **Current context:** verified modules, routes, data structures, integrations,
  and tooling. Mark new paths and capabilities as proposed.
- **Proposed approach:** necessary changes by layer and consequential design
  choices. Link authoritative API/schema/prompt/security contracts; record
  missing contracts as prerequisites. Planning must not resolve spec gaps.
- **Sequence and dependencies:** approval, contract/spec prerequisites, test
  authoring or updates, implementation, then verification/review. State what can
  proceed independently and what depends on another story.
- **Verification:** acceptance coverage, available checks and manual evidence,
  missing tooling, and Bun commands appropriate to the repository. Include
  `bun run verify` as the repository completion check; do not claim it has passed
  while merely planning. Use local Supabase and mocks/fake LLM providers only.
- **Risks and decisions:** inline assumption IDs, blockers, and relevant migration
  or delivery considerations. Production actions remain human-owned.

## 3. Write TASK.md

Link SPEC.md and PLAN.md. Use stable `T-nnn` IDs and Markdown checkboxes. For each
bounded task, provide:

- **Objective and context:** deliverable and precise source sections.
- **Owner and file scope:** role, existing/proposed files, and shared-file
  sequencing. Do not imply that a future testing or spec agent is installed.
- **Requirement/criterion IDs:** the same CUS/OWN/ADM/SYS/SEC IDs, plus applicable
  inline assumption markers.
- **Inputs and dependencies:** prerequisite task IDs, contract locations, approval
  gates, and status (`blocked`, `awaiting-decision`, `incomplete`, or `completed`).
  An unchecked task is not completed; state what makes it executable.
- **Work:** concrete steps and linked interface details, sufficient without the
  previous agent's conversation.
- **Completion and evidence:** observable result, checks, and required evidence.

Each execution task must be suitable for a GitHub issue naming its covered IDs;
link a known issue or mark it unassigned without creating one. Drafting tasks does
not authorize execution. Keep test/fixture/mock/infrastructure authoring in
separate testing tasks; implementation tasks may run existing checks. Keep prose
specification/contract work separate from implementation. Shared work has one
owner and other stories depend on it rather than duplicating it.

Do not assign commits, PRs, merges, or deploys to agents. For issue-scoped agent
runs, reference the existing handoff workflow and
[report template](../../../workflow/templates/handoff.md) as a later execution
obligation; do not generate a handoff as a fourth story document.

## 4. Review the documents and report

Check all three files agree: every requirement has testable criteria, each
criterion has planned work and verification, IDs are unique or linked to their
owner, template coverage is present, and assumptions/blockers propagate to
related tasks. Check dependencies are acyclic and links resolve, with missing
planned documents explicitly labeled. Replace template placeholders; record
unknowns as assumptions or decisions instead of fabricated facts. On updates,
preserve IDs, unrelated edits, and task progress unless invalidated by the change.

Report overall status using AGENTS.md's `completed`, `blocked`,
`awaiting-decision`, or `incomplete`, with paths, covered IDs, actual checks,
and remaining decisions. Distinguish completed draft authoring from approval or
implementation. Report facts rather than instructions in handoffs, preserve
existing review rounds, and never claim planned checks were run.
