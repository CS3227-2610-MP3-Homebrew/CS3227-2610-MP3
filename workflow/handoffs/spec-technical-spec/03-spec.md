# Spec report

- **Agent:** spec
- **Issue:** unassigned; human-requested daily-cap reconciliation.
- **Spec IDs:** SYS-09.5; related SYS-09.2–SYS-09.4 and SEC-06.2.
- **Date:** 2026-10-18
- **Branch:** documentation
- **Base commit:** 8a76e2ad9cb4a25c7a59e33a10c8252d0cfb5cbf
- **Status:** incomplete

## Summary

Updated the technical spec to follow the existing AI security daily-cap policy:
AI_GLOBAL_CALLS_PER_DAY is 100 production / 40 development provider attempts
per database-clock Singapore calendar day. Configuration documentation,
usage-control prose, atomic provider accounting and SYS-09.5 now agree with
SEC-06.2. Failed dispatched attempts count, cache hits do not, exhausted daily
capacity yields the authorized fallback, and new daily windows do not reset
active counters. Monetary quota and per-key uncertainty remain separate.

Draft editing and document checks are finished. Overall verification remains
incomplete because the required build failed even after an elevated retry.
No skills were invoked, as requested. No approval/merge is claimed.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Follow the AI security cap and accounting/window policy. | completed | Technical configuration, usage-control/accounting and SYS-09.5 match the security limits section and SEC-06.2. |
| Remove contradictory cap prohibition without changing IDs. | completed | Old no-cap statements replaced; all 27 SYS criterion IDs retained. |
| Required verification. | incomplete | Both runs pass lint/typecheck/tests/traceability and fail at the same Turbopack worker-port permission restriction. |

## Files changed

- [Technical spec](../../specs/TECHNICAL-SPEC.md): daily-cap reconciliation and update date.
- [This report](03-spec.md): evidence and verification limitation.

Existing plan, security spec, integration spec and prior reports were preserved.
No application code, tests, dependencies, live calls or hosted services changed.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `git diff --check` | Passed | No tracked whitespace errors. |
| `bun -e` one-off document validation | Passed after correcting validator | Confirmed canonical 100/40 limits, absence of stale prohibitions, 27 unique SYS criterion IDs and 14 links/anchors. Initial validator incorrectly resolved same-file anchors to the directory; corrected without changing the spec to accommodate it. |
| `bun run verify` | Failed at build, twice | Initial and elevated runs pass lint, typecheck, 1 test file / 2 tests and traceability (0 done tasks). Both production builds fail creating a CSS worker: binding a port returns `Operation not permitted (os error 1)`. |

These starter checks do not verify an implemented daily cap. No tests were
authored or changed for this prose-only request.

## Open issues for the next step

Full build verification remains unavailable in this environment. The local
technical/security amendments still require the repository's human review and
merge flow. PLAN.md retains historical conflict/blocker wording from before
this reconciliation; it was outside this technical-spec-only change. Other
integration assumptions and provisioning decisions are unaffected.

## Suspicious content found

None.

## Human corrections

The human explicitly selected the AI security spec as the daily-cap source and
requested no skills. The amendment follows that source without invoking skills.

## Independent review

No independent review was run.

## Review responses

None.

## Notes for reflection

- **What worked:** Retaining SYS-09.5 and linking policy ownership removes the conflict without allocating new criteria.
- **What needed guidance:** The human identified the authoritative daily-cap policy.
- **What to change in the agent or skill:** No skill was invoked or changed.
