# Implementation report

- **Agent:** implementation
- **Issue:** #45, PLAN T-14; paired testing #44/T-13
- **Spec IDs:** SYS-04.2; SYS-08.1–SYS-08.3; SEC-02.1; SEC-03.1–SEC-03.2; SEC-04.1; SEC-05.1; SEC-08.1–SEC-08.2
- **Date:** 2026-10-21
- **Branch:** feat/44-validated-llm-operations-fallbacks
- **Base commit:** e27913487c590f89a1163d8730213e5644774a2d (origin/master)
- **Status:** blocked

## Summary

Implemented the shared server-only operation and request-reader boundaries. Targeted acceptance verification passes 237 of 238 cases. The remaining case reaches a successful AI result, then fails in test-owned capture code: `validation.test.ts:137` replaces the transport implementation with `mockResolvedValue`, discarding the fixture implementation that populates `calls`, while line 139 reads `f.calls[0].json()`. The undefined capture is independent of application behavior. Tests/fixtures were preserved. This run stops for testing-owner correction rather than editing acceptance assertions or adding test-specific application behavior.

The initial implementation has had zero repair cycles. The coordinator independently confirmed the fixture defect and requested stopping the unchanged-code elevated verification rerun so the testing owner can correct only the transport capture. Independent review and security review remain pending. This is not implementation acceptance or merge approval.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-04.2 | blocked | All HTTP cases pass; 115/116 source/provider/cache validation cases pass. The Unicode boundary case succeeds at its product assertion and fails at the test-owned request-capture access described above. |
| SYS-08.1 | completed | Passing operation tests capture action/provider-attempt admission and one configured dispatch; eligible cache uses action admission only. |
| SYS-08.2 | completed | Passing exact prompt/canonical object-key/configuration tests; strict per-feature results and server-built Prep evidence/reason. |
| SYS-08.3 | completed | Passing disabled/missing-key/admission/429 typed fallback cases for all features; Brew empty-source case. |
| SEC-02.1 | completed | Passing strict nested snapshot allowlists and exact captured minimal contexts; no domain query capability. |
| SEC-03.1, SEC-03.2 | completed | Passing direct/indirect/multilingual injection-as-data and forged-reference/whole-result rejection cases. |
| SEC-04.1 | completed | Passing malformed/envelope/schema/semantic/cache gates; 65,536-byte limit and overflow cancellation; invalid data never reaches success cache. |
| SEC-05.1 | completed | Passing no-tools/function calls/domain writes and copied evidence quantities; provider metadata never reaches browser envelopes. |
| SEC-08.1 | completed | Passing disable-before-cache, after-admission, during-cache and after-provider checks. |
| SEC-08.2 | completed | Passing single-dispatch/no-retry error paths, 30-second transport/body bounds, overflow reader cancellation and pre/mid-call disconnect cases. |

Criteria marked completed describe targeted evidence only; task-level completion is blocked by the acceptance fixture and full verification result below.

## Files changed

- `src/server/llm/operations.ts`: typed feature/fallback orchestration, existing usage-admission seam, cache payload gates, disable rechecks and bounded shared HTTP reader. Optional server-only content-free token usage hook for the accounting owner. Endpoints still own session/origin/role/current eligibility checks.
- `src/server/llm/schemas.ts`: strict Zod input/request/provider/result schemas, Unicode lengths/calendar dates, semantic references/evidence, canonical object-key serialization and optional safe provider token parsing.
- `src/server/llm/prompts.ts`: exact literal messages extracted from the approved integration contract, independently of the testing fixture.
- `src/server/llm/transport.ts`: configuration and existing usage-policy validation, exactly-one-v1 destination, deterministic fake provider, single native fetch transport with no retries, and bounded/cancellable UTF-8 reader.
- This report.

No dependencies, acceptance tests, fixtures, test configuration, specs, PLAN, docs, endpoints, UI, database schema or persistent cache/audit repositories changed. Preserved unrelated untracked `workflow/handoffs/66-customer-catalogue-contracts/03-spec.md`. Native fetch avoids an SDK dependency and has no SDK retry mechanism; redirect following is disabled on provider requests. No supplementary tests were added.

## Checks run

Only final-code checks are listed.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run test tests/integration/llm` | failed: acceptance fixture | 2 passed/1 failed files; 237 passed/1 failed tests. Only failure is test-owned undefined capture in `validation.test.ts:139`; product AI assertion immediately before it passes. |
| `bun run verify` | failed in tests | Lint/typecheck passed; 23 passed/2 failed files; 701 passed/3 failed tests (704 total), 223.77 seconds. Failure 1 is the test-owned Unicode capture defect; failures 2–3 are existing usage-admission timeouts (`zero AI_PREP_REFRESHES_PER_DAY denies its relevant work` and `zero AI_MODERATION_RUNS_PER_DAY denies its relevant work`). |
| `bun run verify` (elevated rerun) | interrupted at coordinator request | Lint/typecheck passed again; LLM fixture failure reproduced. Interrupted with exit 130 while tests remained in progress once the coordinator independently confirmed the required fixture correction. No final totals or complete database result are claimed for this rerun. |
| `git diff --check` | passed | No whitespace errors reported. |

## Open issues for the next step

The testing-owned Unicode request-capture defect blocks full acceptance verification. No test modification or application-side mock introspection was performed. The initial full verification stopped at tests; traceability, spec checks and build were not reached. The two database timeouts remain unresolved and were not classified as application regressions. The unchanged-code elevated rerun was deliberately stopped at the coordinator’s request after the test prerequisite was confirmed. No standalone build or browser suite was run. Live SoCLaaS compatibility, ranking quality, classification accuracy and advice usefulness are unverified; checks use synthetic transports/fake mode only. Current-record eligibility, source selection/sufficiency, persistent cache identity/expiry and accounting/audit persistence remain with their owning tasks.

## Suspicious content found

None. Injection strings in acceptance fixtures and literal prompt contract were treated as data.

## Human corrections

Parent supplied the committed acceptance manifest and repaired local database startup evidence. After independently confirming the fixture defect, the coordinator requested stopping the elevated rerun and returning control for a narrow testing-owner capture correction, preserving every behavioral assertion. The rerun was interrupted with exit 130; no hosted services or secret files were accessed.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Independent review pending. |

## Notes for reflection

- **What worked:** Reading the contract and strict test surface produced passing behavior in 237 targeted cases without changing acceptance assets.
- **What needed guidance:** The final acceptance case needs its testing-owned transport capture preserved when overriding its response.
- **What to change in the agent or skill:** None established by this run.
