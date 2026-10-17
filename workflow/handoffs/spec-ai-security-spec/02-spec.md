# Spec report

- **Agent:** spec
- **Issue:** None; human corrections to the AI security draft.
- **Spec IDs:** SEC-01–SEC-09; SYS-09.4–SYS-09.5; former AI-SECURITY-SPEC ASM-01–ASM-05 retired without reuse.
- **Date:** 2026-10-17
- **Branch:** master (existing checkout; no commit or Git mutation).
- **Base commit:** c0cb9e84b3fea618690900d38f5cf5f38a6148bb
- **Status:** incomplete

## Summary

All five requested document revisions are applied. Former ASM-01's limits,
ASM-04's zero retries/30-second attempt/64 KiB ceilings and ASM-05's retention
periods are confirmed decisions. ASM-02's global daily provider-call cap and
ASM-03's additional charging policy are removed. All five identifiers are
retired. This is confirmation of the human's policy choices, not evidence of a
merged spec PR.

TECHNICAL-SPEC's directly conflicting demands for a daily provider-call cap and
additional charging policy are aligned with the same human decisions. Existing
per-provider-attempt admission, RLS, cache scopes, windows and other system
requirements remain intact. The security criteria and evaluation rows no longer
depend on the removed charging table or cap.

Document editing is finished. Overall status is incomplete solely because the
required verification gate cannot run without the existing dependencies.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Adopt ASM-01, ASM-04 and ASM-05 as written. | completed | Limit table, failure ceilings and retention section now record confirmed decisions. |
| Remove ASM-02's addition and ASM-03's charging policy. | completed | No daily provider-call key, proposed values or charging table remains in the security spec. |
| Align directly conflicting technical requirements. | completed | Technical usage section and SYS-09.4–SYS-09.5 reflect the human decisions; all SYS criterion IDs preserved. |
| Preserve SEC IDs and retire assumptions. | completed | 9 requirement definitions and 19 criterion definitions remain; zero unconfirmed assumption markers in the security spec. |
| Run repository verification. | incomplete | Final `bun run verify` exits 127 at lint because `eslint` is unavailable. |

## Files changed

- `workflow/specs/AI-SECURITY-SPEC.md`: decisions, removed policies and dependent criteria/evaluations.
- `workflow/specs/TECHNICAL-SPEC.md`: directly affected policy references and SYS-09 criteria.
- `workflow/handoffs/spec-ai-security-spec/02-spec.md`: new report; report 01 preserved.

Existing logs and PLAN.md remain unchanged. No application code, tests, skills,
agents, credentials or hosted services were changed.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun -e` structural/reference check | Passed. | 9 SEC requirements, 19 criteria, 9 resolved links/anchors, no unconfirmed local assumptions or rejected daily-call key; technical criterion IDs match HEAD. |
| `bun run verify` on final specification changes | Failed, exit 127. | `eslint: command not found`; subsequent stages did not run. |

## Open issues for the next step

No further decision on ASM-01–ASM-05 is requested. Dependency installation is
needed for the repository gate. Missing integration/story schemas and the
existing TECHNICAL-SPEC ASM-01 provider-entitlement uncertainty are unchanged;
no monetary-quota guarantee is claimed.

PLAN.md still describes the earlier daily-call-cap/charging specification task
and will need reconciliation in its separate planning update. Removing the
additional charging policy leaves edge-event counting (cache hits and failed
refreshes) unspecified; this revision does not silently invent replacement
behavior for dependent tests or code. The human's adopted limit values remain.

## Suspicious content found

None.

## Human corrections

1. ASM-01: adopt as written; table values confirmed.
2. ASM-02: do not add; global daily provider-call cap removed.
3. ASM-03: no charging policy needed; additional policy/table removed.
4. ASM-04: adopt as written; safety ceilings confirmed.
5. ASM-05: adopt as written; retention periods confirmed.

## Independent review

None performed in this run.

## Review responses

None.

## Notes for reflection

- **What worked:** preserving IDs while amending directly affected contracts kept the revisions traceable.
- **What needed guidance:** the human selected the desired policy scope explicitly.
- **What to change in the agent or skill:** none.
