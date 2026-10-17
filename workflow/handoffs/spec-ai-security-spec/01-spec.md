# Spec report

- **Agent:** spec
- **Issue:** None; human request to draft the project's AI security specification.
- **Spec IDs:** SEC-01–SEC-09; 19 acceptance criteria; AI-SECURITY-SPEC ASM-01–ASM-05.
- **Date:** 2026-10-17
- **Branch:** master (existing checkout; no commit or Git mutation).
- **Base commit:** c0cb9e84b3fea618690900d38f5cf5f38a6148bb
- **Status:** awaiting-decision

## Summary

Drafted the shared AI security specification for Brew Finder, Prep Advisor and
Moderation Assistant. It defines a project-specific threat model, input and
output boundaries, human confirmation, usage/refresh charging, disable and
failure precedence, cache safety, sanitized audit, proposed retention and 13
adversarial evaluation scenarios. Architecture/RLS/cache mechanics retain their
existing technical owner; exact integration and story contracts are not invented.

Draft authoring is finished. Five policy assumptions require human decisions;
approval, implementation and security-test coverage are not claimed. The
story-spec skill was read for workflow context, then its explicit cross-cutting
exclusion was respected by following the specification README coverage rules.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Fit existing product roles, three AI features, fallbacks and technical ownership. | completed | Feature data table and linked technical boundaries; no extra AI feature or permission. |
| Allocate unique SEC and criterion IDs and make controls observable. | completed | 9 SEC requirements, 19 unique criteria and 13 mapped evaluation scenarios; structural check passed. |
| Mark consequential proposals rather than claim approval. | completed | Five inline assumption markers and matching rationale/impact table. |
| Validate local Markdown references. | completed | All 9 relative links, including target anchors, resolved. |
| Run the mandatory repository gate. | incomplete | `bun run verify` exited 127 at lint: `eslint: command not found`; later stages did not execute. |
| Resolve policy choices and dependent schemas before implementation. | awaiting-decision | Assumptions and missing contracts below. |

## Files changed

- `workflow/specs/AI-SECURITY-SPEC.md`: new cross-cutting security draft.
- `workflow/handoffs/spec-ai-security-spec/01-spec.md`: this report.

The existing untracked session log was preserved. No plan, existing spec,
application code, test, skill, agent, credential file or hosted service changed.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | Failed before checks could run. | Exit 127: lint could not find `eslint`. Dependencies are absent; no application verification success is claimed. |
| `git diff --check` | Passed for tracked diff. | Exit 0; new files received the separate whitespace checks below. |
| `git diff --no-index --check /dev/null <new-file>` for both new files | No whitespace diagnostics after removing a Markdown hard-break's trailing spaces. | Both checks exited 1 for a new-file difference; no whitespace errors were reported. |
| `bun -e` document validation | Passed. | 9 unique requirements, 19 unique criterion definitions, 5 unique assumption markers and 9 resolved relative links/anchors. |

The installed Next.js documentation path was absent as well. No framework code
was written; existing technical contracts supplied the framework context.
No live provider, hosted database or deployment checks occurred. No executable
tests were authored. Dependency installation was not needed to author this draft.

## Open issues for the next step

| Source | Decision or missing contract | Affected requirements |
| --- | --- | --- |
| ASM-01 | Adopt or revise product-proposed caps and additional per-feature minute/per-action caps. | SEC-06 |
| ASM-02 | Adopt or revise daily provider-attempt caps of 100 prod / 40 dev. A call-count cap cannot prove the product's $5/$2 quota budgets without verified pricing and a per-call bound; actual per-key entitlements remain unknown. | SEC-06; existing TECHNICAL-SPEC ASM-01 |
| ASM-03 | Adopt or revise action/cache-hit/refresh/run charging, including retained charges on failures and downstream call denials. | SEC-06, SEC-07 |
| ASM-04 | Adopt or revise zero automatic retries, 30-second attempt timeout and 64 KiB feature-context/response ceilings. | SEC-04, SEC-06, SEC-08 |
| ASM-05 | Adopt or revise AI audit retention (30 days), expired-cache deletion (within 24 hours) and closed-window counter/admission retention (7 days). | SEC-09 |
| Missing INTEGRATION-SPEC | Exact schemas, trusted prompts/data encoding, transport/error contracts, field limits, source fingerprints and allowed Brew Finder subcall sequence. | SEC-02–SEC-04, SEC-06–SEC-08 |
| Missing story contracts | Eligible catalogue/suggested-item details, rating sorting, sales aggregates/minimum data, pending-review lifecycle and mutation/state semantics. Runtime Admin AI-control scope/propagation remains stretch. | SEC-01–SEC-08 |
| Existing PLAN T-02 proposal | Production Admin provisioning is not an AI security requirement and remains unapproved PLAN ASM-01; no hosted workflow, seed credential scheme or new provisioning permission was added by this assignment. | Existing SYS-06/SYS-07 ownership |
| Missing dependencies | `bun run verify` cannot run successfully until the existing project's dependencies are installed. | Repository verification gate |

The draft does not resolve provider retention/training policy or promise deletion
from provider infrastructure/backups. Moderation/domain-data retention remains
separately owned. No spec PR, approval or merge is claimed.

## Suspicious content found

None.

## Human corrections

None.

## Independent review

No independent review was performed in this run.

## Review responses

None.

## Notes for reflection

- **What worked:** existing product and technical contracts supplied clear
  boundaries; assumptions made the remaining policy choices reviewable.
- **What needed guidance:** quota budgets lack a verified monetary measurement
  path, so enforcing call counts cannot establish a dollar-budget guarantee.
- **What to change in the agent or skill:** none required; cross-cutting coverage
  belongs to the README rather than the story-only skill.
