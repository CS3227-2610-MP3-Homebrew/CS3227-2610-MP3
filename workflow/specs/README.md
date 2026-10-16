# Specifications

Write and agree specifications before implementation.

## Planned specifications

| File | Scope | Status |
| --- | --- | --- |
| `PRODUCT-SPEC.md` | Product description, users, roles and product scope. | Planned |
| `roles/CUSTOMER.md` | Customer capabilities and permissions (`CUS-nn`). | Planned |
| `roles/OWNER.md` | Café owner capabilities and permissions (`OWN-nn`). | Planned |
| `roles/ADMIN.md` | Admin capabilities and permissions (`ADM-nn`). | Planned |
| `ai/BREW-FINDER.md` | Brew Finder for customers. | Planned |
| `ai/PREP-ADVISOR.md` | Prep Advisor for café owners. | Planned |
| `ai/MODERATION-ASSISTANT.md` | Moderation Assistant for admins. | Planned |
| `TECHNICAL-SPEC.md` | Architecture, data model, row-level security, configuration and `SYS-nn` requirements. | Planned |
| `INTEGRATION-SPEC.md` | API contracts, exact LLM prompt text and LLM input/output schemas. | Planned |
| `AI-SECURITY-SPEC.md` | Attack surfaces, mitigations, usage control, security test plan and `SEC-nn` requirements. | Planned |

Role specs use `workflow/templates/role-spec.md`. AI feature specs use
`workflow/templates/ai-feature-spec.md`. The other specs use the coverage rules
below; no separate template is supplied for them.

## Requirement IDs

- Use `CUS` for customer, `OWN` for owner, `ADM` for admin, `SYS` for system and
  `SEC` for security requirements. Number each prefix from `01`.
- Acceptance criteria append `.n` to the requirement ID, for example `OWN-04.2`.
- Never reuse or renumber IDs. A removed requirement keeps its ID and is marked
  removed. Cross-reference an existing ID rather than assigning it again.
- GitHub issues, test names and commit scopes use these IDs.

## Coverage

A spec must cover the product description, users and roles, functional and
non-functional requirements, UI and use cases. It should also cover the data
model, APIs, security, edge cases and failure paths where relevant.

A spec must not contain implementation steps or an execution plan, leave anything
the team cares about to an agent's judgement, or ignore a feature's risk.
Acceptance criteria must be testable without asking the author.

## Approval and changes

The spec owner agrees the spec with the team before work starts from it. A spec
is approved when its PR is merged.

For changes: spec PR merged → tests for the affected IDs updated → code updated.
Code never moves ahead of its spec. Report ambiguity as `awaiting-decision`;
resolve it through the same change flow.
