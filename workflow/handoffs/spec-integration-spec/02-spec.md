# Spec report

- **Agent:** spec
- **Issue:** Unassigned; human follow-up on integration assumptions.
- **Spec IDs:** SYS-08–SYS-10; SEC-01, SEC-04, SEC-08. References only; no new requirement ownership.
- **Date:** 2026-10-17
- **Branch:** documentation
- **Base commit:** 8a76e2ad9cb4a25c7a59e33a10c8252d0cfb5cbf
- **Status:** awaiting-decision

## Summary

Recorded human adoption of ASM-01, ASM-03 and ASM-04 in the integration spec.
These are now confirmed decisions, with their assumption IDs retired without
renumbering. ASM-02, ASM-05 and ASM-06 remain assumptions as requested.
Business dates and times explicitly use Asia/Singapore (UTC+08:00); business
date/weekday derivation converts instants to Singapore time first. UTC `Instant`
wire serialization is retained. The prior report is preserved.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Adopt ASM-01 and ASM-04 as written. | completed | HTTP and provider sections now name confirmed decisions; proposed contract contents retained. |
| Adopt ASM-03 with Singapore business-time interpretation. | completed | Schema section explicitly covers business dates, weekdays, hours, pickup times, sales-day grouping, daily windows and cache expiry in Asia/Singapore. Story-owned business rules remain external dependencies. |
| Preserve ASM-02, ASM-05 and ASM-06. | completed | Only these three active assumption markers/summary rows remain; identifiers unchanged. |
| Resolve all remaining assumptions and approve spec. | awaiting-decision | Three assumptions and missing story contracts remain; no merged spec PR is claimed. |

## Files changed

- [Integration specification](../../specs/INTEGRATION-SPEC.md): confirmed decisions, retired IDs and Singapore interpretation.
- [This report](02-spec.md): follow-up evidence.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git status --short` | Passed | Integration spec and handoff directory remain untracked local deliverables. |
| `bun -e` document validation | Passed | Exactly ASM-02/05/06 remain active; adopted IDs removed from assumption rows; Singapore clarification present; eight links/anchors resolve; balanced code fences; no trailing whitespace. |
| `git diff --check` | Passed | No tracked whitespace errors; one-off validation separately covers the untracked spec. |

`bun run verify` was not rerun for this prose-only follow-up. The previous
report records passing lint/typecheck/tests/traceability and two production
build failures caused by Turbopack's worker-port permission restriction.
No runtime, tests, dependencies or infrastructure changed in this follow-up.

## Open issues for the next step

ASM-02 (AI HTTP routes/envelopes), ASM-05 (prompts/feature schemas) and ASM-06
(cache identity/payload) remain unconfirmed. Missing story-owned domain contracts
remain listed in the specification. Full build verification remains unavailable
from the previous run. Confirmed decisions do not establish provider compatibility
or constitute a merged spec PR.

## Suspicious content found

None.

## Human corrections

The human adopted ASM-01 and ASM-04 as written; adopted ASM-03 with Singapore
business-time interpretation; retained ASM-02, ASM-05 and ASM-06 as assumptions.
The specification reflects each decision.

## Independent review

No independent review was run.

## Review responses

None.

## Notes for reflection

- **What worked:** Stable assumption IDs preserve the decision history without renumbering remaining proposals.
- **What needed guidance:** The human supplied the explicit decision set and Singapore clarification.
- **What to change in the agent or skill:** None established by this follow-up.
