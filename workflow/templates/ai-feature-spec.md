# [Story ID]: [Feature name]

- **Status:** [draft | approved]
- **Owner:** [owner]
- **Last updated:** [YYYY-MM-DD]
- **Related specs:** [links]
- **Role:** [role]

<!-- How to use:
Replace placeholders. Repeat the requirement block as needed.
Use one requirement per user-visible capability. Criteria must be testable
without asking the author. Describe behaviour, not implementation.
Open questions must be empty before approval.
Exact prompt text and schemas belong in INTEGRATION-SPEC.md.
-->

## Purpose

[User need, intended outcome, and why this needs an LLM rather than plain code.]

## User experience

- **Where it appears:** [screen and entry action]
- **What the user sees:** [output, loading and error states]
- **What the user must confirm:** [confirmation required before any effect]

## Inputs

All user-written text, including café descriptions and reviews, is untrusted.

| Input | Source | Trusted? | Limit | Handling before the LLM |
| --- | --- | --- | --- | --- |
| [input] | [source] | [yes/no and reason] | [limit] | [validation and handling] |

## What is never sent to the LLM

[Excluded data and reasons.]

## Output

- **Shape:** [expected content; link to schema in INTEGRATION-SPEC.md]
- **Validation:** [rules and rejection conditions; for example, IDs not present
  in the input are invalid]
- **Use:** Displayed as plain text only. [Where it is shown and how it is used.]

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

## Guardrails

| Threat | Control | SEC ID |
| --- | --- | --- |
| [threat] | [control and how it is checked] | [SEC-nn] |

## Usage control

- **LLM calls per user action:** [number and trigger]
- **Caching:** [what is cached, scope and expiry]
- **Limits:** [limits, enforcement and user feedback]

## Failure modes and fallbacks

| Failure | How it is detected | What the user sees |
| --- | --- | --- |
| LLM unavailable or disabled | [detection] | [fallback and message] |
| Output fails validation | [detection] | [fallback and message] |
| Rate limit reached | [detection] | [fallback and message] |

## Evaluation cases

Every adversarial case maps to a row in the guardrails table.

| ID | Input | Expected behaviour | Type (normal/edge/adversarial) |
| --- | --- | --- | --- |
| [case ID] | [input] | [observable outcome; guardrail row for adversarial cases] | [type] |

## Out of scope

[Excluded capabilities.]

## Assumptions

- **ASM-nn:** [Assumption; why it is needed; effect if wrong.]
<!-- Write "None" if there are no assumptions. -->

## Open questions

<!-- Resolve and remove all questions before approval. -->
[Unresolved questions.]
