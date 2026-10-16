# [Role] specification

- **Status:** [draft | approved]
- **Owner:** [owner]
- **Last updated:** [YYYY-MM-DD]
- **Related specs:** [links]

<!-- How to use:
Replace placeholders. Repeat the requirement and use-case blocks as needed.
Use one requirement per user-visible capability. Criteria must be testable
without asking the author. Describe behaviour, not implementation.
Open questions must be empty before approval.
-->

## Role overview

[Who uses this role, why, and its functional and non-functional needs.]

## Access

- **How a user gets the role:** [entry and approval conditions]
- **What it can see and change:** [scope]
- **What it can never do:** [boundaries]

## Requirements

### `<PREFIX>-01`: [Title]

- **User story:** As a [role], I want [capability], so that [outcome].
- **Priority:** [priority]
- **Risk:** [risk level] — [one-line reason]

#### Acceptance criteria

- **`<PREFIX>-01.1`:** Given [context], when [action], then [observable result].
- **`<PREFIX>-01.2`:** Given [context], when [action], then [observable result].

#### Edge cases and failure paths

[Conditions and expected behaviour.]

#### Out of scope

[Exclusions for this requirement.]

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| [screen] | [content and states] | [actions] | [IDs] |

## Use cases

### `UC-<PREFIX>-01`: [Title]

- **Actor:** [actor]
- **Preconditions:** [conditions]
- **Main success scenario:**
  1. [Actor action.]
  2. [Observable system response.]
- **Extensions:** [alternate and failure paths, linked to scenario steps]

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| [action] | [allowed scope or denied] | [allowed scope or denied] |

## Role-level out of scope

[Excluded capabilities.]

## Open questions

<!-- Resolve and remove all questions before approval. -->
[Unresolved questions.]
