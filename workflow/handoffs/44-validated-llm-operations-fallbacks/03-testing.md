# Testing report

- **Agent:** testing
- **Issue:** #44, PLAN T-13 — request-capture harness correction
- **Spec IDs:** SYS-04.2 (existing boundary case); T-13 regression suite retains SYS-08.1–SYS-08.3, SEC-02.1, SEC-03.1–SEC-03.2, SEC-04.1, SEC-05.1, SEC-08.1–SEC-08.2
- **Date:** 2026-10-21
- **Branch:** feat/44-validated-llm-operations-fallbacks
- **Base commit:** e27913487c590f89a1163d8730213e5644774a2d (origin/master); committed original T-13 tests/report: 1f09991
- **Status:** completed

## Summary

Repaired a testing harness defect in the existing `SYS-04.2: 1000-codepoint exact query, 200-codepoint label and 128-codepoint reference remain intact` case. The test replaced the fixture transport callback with `mockResolvedValue`, which discarded the callback's request recorder. Its later `f.calls[0].json()` therefore inspected an absent request even when the operation returned valid AI output.

The override now records the received `Request` and returns the identical synthetic provider response. Both original product assertions remain unchanged: the operation must return AI mode and the captured wire data must exactly equal the full original input. No boundary value, expectation, criterion, interface, case count or product requirement changed. This repairs test instrumentation rather than relaxing an implementation requirement. No implementation-specific internals are inspected.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-04.2 boundary integrity | completed | Existing exact title above now reaches both unchanged assertions; complete LLM suite passes. |
| T-13 regression coverage | completed | `bun run test tests/integration/llm`: 3 files passed, 238 tests passed, no skips. |
| Required full verification | completed | Exact `bun run verify` exited 0; all 704 tests and subsequent traceability/spec/build/isolation checks passed. |

## Interfaces defined by tests

None added or changed. The module and trusted fake-transport interfaces remain those defined in `01-testing.md` and `tests/integration/llm/contracts.ts`. The correction uses the existing fixture's request-recording array and transport callback, without reading application implementation.

## Files changed

- `tests/integration/llm/validation.test.ts`: replaced the affected synthetic transport response override with a callback that restores `f.calls.push(request)` before returning that response.
- This new `03-testing.md` report.

No other tests, configuration, dependencies, source, specs, PLAN or earlier handoffs changed. The implementation-owned untracked LLM modules and `02-implementation.md` were neither read nor edited; unrelated `66-customer-catalogue-contracts/03-spec.md` was preserved. No commit was made.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run test tests/integration/llm` | passed | 3 files, 238 tests passed; 668 ms; no failures/skips. |
| `git diff --check` | passed | Exit 0; no whitespace errors. |
| `bun run verify` | passed | Exit 0 with escalated local Docker access. Lint/typecheck passed; Vitest: 25 files, 704 tests passed, no skips/failures, 193.56 seconds. Traceability passed for 15 done tasks. Specs passed with the existing three SYS-01/SYS-02/SYS-03 planning warnings. Production compilation/build and isolation checks passed, including 35 client artifacts. |

All provider calls in these tests use synthetic fake transport with unexpected global fetch blocked. No live provider, hosted database or secret file was accessed. Browser cases are outside this correction's scope; `bun run test:e2e` was not run.

## Open issues for the next step

No checks in the exact verification chain were left unreached. This report concerns the narrow harness correction; implementation review/security acceptance and the human's test-diff review/commit remain separate gates. The prior transient admission failures did not recur in this full run. The original `01-testing.md` remains the immutable failing-first report; this report records the repaired harness against the current workspace without reading or reviewing implementation source.

## Suspicious content found

None.

## Human corrections

The coordinator supplied the precise harness failure and authorized a testing-only repair. The original exact-input assertions were preserved. No implementation or review report/task was read.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | N/A | This is a testing instrumentation correction, not an independent implementation review. |

## Notes for reflection

- **What worked:** Capturing the actual transport `Request` preserves an observable wire assertion without inspecting implementation internals.
- **What needed guidance:** The coordinator identified that the response override replaced the fixture recorder.
- **What to change in the agent or skill:** Response overrides used by capture assertions must retain the transport recorder.
