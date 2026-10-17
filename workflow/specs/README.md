# Specifications

Write and agree specifications before implementation.

## Planned specifications

Use several small spec files and one plan for the whole product:

```text
workflow/
  specs/
    PRODUCT-SPEC.md
    TECHNICAL-SPEC.md
    INTEGRATION-SPEC.md
    AI-SECURITY-SPEC.md
    stories/<ID>-<slug>.md
  PLAN.md
```

| File (relative to `workflow/specs/`) | Scope | Template | Status |
| --- | --- | --- | --- |
| `PRODUCT-SPEC.md` | Product overview; roles, including what each can and cannot access; navigation per role; and a "User stories" section grouped by role with each story's ID (for example `CUS-03`), story text and priority. This section is the source of story specs. | Coverage rules below; no separate template. | Written |
| `TECHNICAL-SPEC.md` | Architecture, data model, row-level security, configuration and `SYS-nn` requirements from `SYS-04`. | Coverage rules below; no separate template. | Planned |
| `INTEGRATION-SPEC.md` | API contracts, exact LLM prompt text and LLM input/output schemas. | Coverage rules below; no separate template. | Planned |
| `AI-SECURITY-SPEC.md` | Attack surfaces, mitigations, usage control, security test plan and `SEC-nn` requirements. | Coverage rules below; no separate template. | Planned |
| `stories/<ID>-<slug>.md` | One user story per file, with its story ID as its only requirement ID (`CUS-nn`, `OWN-nn`, `ADM-nn`, or `SYS-01`–`SYS-03` for shared user-facing stories: sign up, sign in, and role-based navigation). | `workflow/templates/story-spec.md` for ordinary stories; `workflow/templates/ai-feature-spec.md` for AI stories. | Planned |

Order of work: PRODUCT-SPEC → TECHNICAL-SPEC and INTEGRATION-SPEC → story specs
→ PLAN.md. Cover AI-SECURITY-SPEC.md before work depending on its contracts.
Foundation tasks can be planned once TECHNICAL-SPEC.md exists; story tasks are
added as story specs are written. Stories are single files, never folders.
Keep role coverage in the product spec and AI stories alongside ordinary stories.
Keep all task planning in workflow/PLAN.md; there are no per-story planning files.

The spec agent uses `spec-create` for story specs and `plan-create` for PLAN.md.
The plan contains verified conventions, links to shared design contracts, then
tasks in dependency order: foundation tasks first, then a test task followed by
its implementation task for each story. Every task becomes a GitHub issue.
Group tasks under "Foundations", "Customer", "Café owner", and "Admin", with Foundations first and each role's story test task followed by its implementation task, keeping `T-nn` IDs globally unique across sections and writing cross-section dependencies by task ID.
Only the spec agent writes PLAN.md. A feature PR changes only the Status line
of its own task. Plans link contracts rather than copying or redefining them.

## Requirement IDs

- Use `CUS` for customer, `OWN` for owner, `ADM` for admin, `SYS` for system and
  `SEC` for security requirements.
- Story IDs (`CUS/OWN/ADM-nn` and `SYS-01`–`SYS-03`) come only from
  PRODUCT-SPEC.md's "User stories" section. Add a new story there first,
  through a spec PR.
- Each story file defines exactly one requirement: its story ID. Report an
  extra capability as a split or new-story proposal, marked `awaiting-decision`,
  never as a new ID in the story file.
- System requirements continue from `SYS-04`. Only TECHNICAL-SPEC.md allocates
  new `SYS` IDs; only AI-SECURITY-SPEC.md allocates `SEC` IDs, from `SEC-01`.
- Acceptance criteria append `.n` to the requirement ID, for example `OWN-04.2`.
- Use cases in a story file use `UC-<ID>-n`, for example `UC-CUS-03-1`.
- Assumption IDs (`ASM-nn`) are numbered per file from `ASM-01` and never
  renumbered. Cite another file's assumption with its file name, for example
  `PRODUCT-SPEC ASM-02`, `CUS-03 ASM-01`, or `PLAN ASM-01`.
- Never reuse or renumber IDs. A removed requirement keeps its ID and is marked
  removed. Cross-reference an existing ID rather than assigning it again.
- GitHub issues, test names and commit scopes use these IDs.
- Task IDs in PLAN.md use `T-nn`, starting at `T-01`. Never reuse or renumber
  them; retain removed tasks with their IDs marked removed.

Parallel role PRs must not be able to claim the same ID.

## Agent inputs

The testing agent reads a story spec, the contracts it links to, and its own
test task in PLAN.md. It never reads implementation tasks, so tests reflect
the spec, not the planned design.

The implementation agent works on one implementation task from PLAN.md,
together with the linked story spec and contracts. Every acceptance criterion
in scope is covered by exactly one test task and one implementation task.
Shared work has one owner task; dependent tasks link it rather than duplicating it.

## Coverage

A spec must cover the product description, users and roles, functional and
non-functional requirements, UI and use cases. It should also cover the data
model, APIs, security, edge cases and failure paths where relevant.

A spec must not contain implementation steps or an execution plan, leave anything
the team cares about to an agent's judgement, or ignore a feature's risk.
Acceptance criteria must be testable without asking the author.

## Approval and changes

A spec is approved when its PR is merged. Specs carry no status, owner or
open questions. Unresolved points are listed in the spec agent's report under
**Open issues for the next step** and in the PR description, and resolved before
merge. Testing and implementation agents work only from specs on master.
Changes to an approved spec go through a new spec PR.

For changes: spec PR merged → PLAN.md updated by the spec agent → tests for the affected IDs updated → code updated.
Code never moves ahead of its spec. Report ambiguity as `awaiting-decision`;
resolve it through the same change flow.
