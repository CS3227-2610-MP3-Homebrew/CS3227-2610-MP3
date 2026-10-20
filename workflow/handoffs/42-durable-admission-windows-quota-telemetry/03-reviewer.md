# Reviewer report

- **Agent:** reviewer
- **Issue:** #43 (T-12), paired with #42 (T-11)
- **Spec IDs:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5; SEC-06.1, SEC-06.2, SEC-06.3
- **Date:** 2026-10-20
- **Branch:** feat/42-durable-admission-windows-quota-telemetry
- **Base commit:** d923954f61693437f0b2cb4f8edf12455d004277
- **Status:** completed
- **Implementation report:** workflow/handoffs/42-durable-admission-windows-quota-telemetry/02-implementation.md
- **Review round:** 1
- **Reviewed HEAD:** 235b5444b59cb0087e9e16b1582074f0dc2d2c63
- **Model:** gpt-6.1-sol
- **Reasoning:** medium

## Summary

Independently assessed T-12’s durable admission migration, server-only RPC adapter, dispatch/telemetry seam and meaningful acceptance tests against the seven assigned criteria and linked technical/security contracts.

The supplied base resolves to `upstream/master` and is HEAD’s merge base. The governing specs and task mappings exist on that base; no working-tree spec or PLAN changes alter those contracts. The working tree is clean. Approval evidence is the merged master contract and supplied review assignment; no separate approval record was supplied.

**Overall:** pass
All assigned criteria are supported by implementation and meaningful tests, the launcher’s final-code verification passed, and no blocking findings were identified.

## Acceptance criteria

References below are repository-relative.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-09.1 | completed | `supabase/migrations/20261020000001_usage_admission.sql:3` persists environment-keyed counters, operations and admissions. `src/server/llm/usage-client.ts:7` supplies the secret-key public RPC adapter. `tests/integration/usage/admission.test.ts:26` checks reconstruction/module reload and actor isolation; `:135` checks independent persisted environment namespaces. |
| SYS-09.2 | completed | Migration `:143` serializes decisions through a transaction advisory lock; `:192` checks all counters before mutation. Duplicate identities are rejected before reservation. `tests/integration/usage/admission.test.ts:45`, `:50`, `:58` and `:66` meaningfully assert duplicate exclusion, last-capacity concurrency and denied-reservation atomicity. |
| SYS-09.3 | completed | Migration `:145` obtains database time and derives explicit UTC minute/Singapore day boundaries. Window keys include both boundaries. `tests/integration/usage/admission.test.ts:74`, `:113`, `:120` and `:127` cover daily continuity, before/at/after boundaries, earlier-window preservation and application-clock skew. |
| SYS-09.5 | completed | Migration `:174` reserves global daily capacity alongside minute/feature capacity. `src/server/llm/usage.ts:84` handles cache, admission, single dispatch, fallback and unchanged token metadata. Tests at `tests/integration/usage/admission.test.ts:50`, `:120`, `:143`, `:166` and `tests/unit/usage/policy.test.ts:9`, `:34`, `:40`, `:46` cover exhaustion, rollover, charged failures, no retry, denied/unavailable admission and unknown/partial/zero telemetry. |
| SEC-06.1 | completed | Migration `:122` validates authoritative role/ownership; `:179` builds actor-wide action and additional refresh/run reservations. `tests/integration/usage/admission.test.ts:26`, `:74` and `:84` verify persistence, concurrent scoped caps and daily rollover. |
| SEC-06.2 | completed | Migration `:148` rejects reused admissions and binds operation identity to actor/feature/café; `:161` enforces operation/global/feature caps. RPC execution is explicitly restricted at `:222`. `tests/integration/usage/admission.test.ts:36`, `:45`, `:94`, `:106` and `tests/unit/usage/policy.test.ts:9` cover role denial, single-use identities, provider/operation limits and cache bypass of provider reservation. |
| SEC-06.3 | completed | `src/server/llm/usage.ts:26` validates all 13 explicit keys and policy maxima; `:64` fails closed on invalid requests, policy and RPC results. SQL independently validates policy. `tests/unit/usage/policy.test.ts:14`, `:20`, `:28`, `:34`, `:40`, `:46`, integration zero-limit cases at `admission.test.ts:150`, and supplementary cases at `tests/unit/usage-internals.test.ts:56`, `:67` support validation, no-dispatch and telemetry behavior. |

T-12’s task-level checks are also satisfied: the launcher’s complete verification passed, including tests, catalogue assertions and production build.

## Findings

### Blocking

None.

### Non-blocking

None.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` — launcher execution | Passed; supplied exit 0 | Read `/var/folders/1l/swk0__jd2s94s2gxch0nzp_r0000gn/T/tmp.XrjHPrcqK1/verify.log`: lint/typecheck passed; 22 test files and 466 tests passed; traceability passed; spec check reported zero warnings; production build and isolation checks passed, including 35 client artifacts. |
| `git rev-parse HEAD upstream/master`; `git merge-base HEAD upstream/master` | Matched supplied inputs | Confirmed reviewed HEAD, base commit and merge base. |
| `git status --porcelain=v1 --untracked-files=all` | Clean | No staged, unstaged or untracked changes. |
| `git diff --check d923954f61693437f0b2cb4f8edf12455d004277 -- . ':!**/.env*' ':!.env*'` | Passed | No whitespace errors. |
| Read-only diff, contract, implementation and test inspection | Completed | Inspected all ten changed files and supporting configuration/schema code. Compared master contracts with current specs; checked installed Next.js server-only guidance and Supabase retry configuration. |

The worker ran no tests, mutating checks or launcher. The implementation report’s additional targeted/database runs were treated as reported evidence, not independently rerun checks. No browser E2E, live provider or hosted database checks were performed.

## Open issues for the next step

No unresolved issue within the assigned criteria. Dedicated security review remains separate. Feature endpoint authorization, cache eligibility, fallback rendering, provider transport and retention belong to their separately assigned tasks.

This review does not approve a merge or deployment.

## Suspicious content found

None.

## Human corrections

The user required a read-only assessment using supplied launcher evidence. Returned the handoff content without writing files, launching `review.sh` or running mutating checks.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | First review round. |

## Notes for reflection

- **What worked:** Committed acceptance tests exercise actual database execution roles, concurrency, rollover and persistence; supplementary tests exercise the installed SDK against fake HTTP responses.
- **What needed guidance:** None during this assessment.
- **What to change in the agent or skill:** None identified.