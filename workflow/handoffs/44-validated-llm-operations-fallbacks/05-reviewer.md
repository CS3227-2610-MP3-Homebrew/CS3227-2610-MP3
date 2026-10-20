# Reviewer report

- **Agent:** reviewer
- **Issue:** #45 / T-14; paired testing #44 / T-13
- **Spec IDs:** SYS-04.2; SYS-08.1–SYS-08.3; SEC-02.1; SEC-03.1–SEC-03.2; SEC-04.1; SEC-05.1; SEC-08.1–SEC-08.2
- **Date:** 2026-10-21
- **Branch:** feat/44-validated-llm-operations-fallbacks
- **Base commit:** e27913487c590f89a1163d8730213e5644774a2d (`origin/master`)
- **Reviewed HEAD:** 9060b7dafb66cab9d63f4d2df23d75b95985aef2
- **Implementation report:** workflow/handoffs/44-validated-llm-operations-fallbacks/04-implementation.md
- **Review round:** 1
- **Model:** gpt-6.1-sol
- **Reasoning:** medium
- **Status:** completed

## Summary

Independently assessed T-14’s shared server-only operations, request reader, schemas, prompts and transport against the approved contracts present on `origin/master`. Reviewed the merge-base-to-working-tree changes, meaningful acceptance assertions and supporting unchanged configuration/admission code.

The supplied base resolves to the merge base of the reviewed HEAD. TECHNICAL-SPEC, INTEGRATION-SPEC, AI-SECURITY-SPEC and PLAN are present on that base and have no working-tree changes. This establishes the merged contract baseline used for assessment; separate remote approval metadata was not queried.

**Overall:** pass
All assigned criteria are supported by implementation and meaningful passing tests, with no blocking findings and successful launcher verification.

The unrelated untracked `workflow/handoffs/66-customer-catalogue-contracts/03-spec.md` was inspected and remains outside this pair’s implementation scope. The testing-owner capture correction preserves both original behavioral assertions.

## Acceptance criteria

Paths below are repository-relative.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-04.2 | completed | `src/server/llm/schemas.ts:5` defines bounded, strict request/source/result schemas; `operations.ts:125` implements bounded HTTP parsing and sanitized errors. `tests/integration/llm/http.test.ts` tests required fields, types, enums, dates, exact Unicode content and inclusive byte limits. `validation.test.ts` exercises nested input, provider and cache rejection. |
| SYS-08.1 | completed | `operations.ts:60` admits the action; `operations.ts:69` reserves the single provider attempt before configured dispatch. `operations.test.ts` asserts the admission sequence, exactly one captured request and cache hits without provider reservation for both cacheable features. |
| SYS-08.2 | completed | `operations.ts:87` constructs the configured model/reasoning request with fixed system prompt and canonical JSON data. `schemas.ts:24` accepts aggregate-only Prep input; `schemas.ts:55` validates feature results and reconstructs Prep evidence/reasons from source quantities. Tests assert configurable transport, exact contexts, evidence order, generated reason bounds and corrupted-cache rejection. |
| SYS-08.3 | completed | `operations.ts:41` builds correlated typed fallbacks. `operations.test.ts` checks all three features for disabled/missing-key, denied/unavailable admission and provider 429, with exact fallback reasons/discriminators. Empty Brew candidates produce `no_source_data` without dispatch. |
| SEC-02.1 | completed | Strict nested source schemas reject extra identity/order/private fields before admission. Exact-wire assertions in `operations.test.ts` prove that only permitted feature context is transmitted. Prep sends aggregates; moderation sends review references/text without reviewer identity. |
| SEC-03.1 | completed | `src/server/llm/prompts.ts` contains fixed literal messages; `operations.ts:89` separates them from serialized source data. Injection cases cover direct, indirect, encoded, role-delimiter and multilingual content while asserting unchanged prompts and permitted wire fields. Independent literal comparison matched all three implementation prompts and fixtures against approved master text. |
| SEC-03.2 | completed | `schemas.ts:55` enforces whole-result source-reference validation. `validation.test.ts` rejects foreign/wrong-parent references, duplicate/missing classifications, invalid evidence and mixed valid/invalid members. Injection tests confirm unchanged source snapshots and no enlarged request capabilities. |
| SEC-04.1 | completed | `operations.ts:101` reads bounded provider bytes before envelope/content parsing; `schemas.ts:55` validates provider/cache semantics. Validation tests cover malformed JSON, fences, trailing content, extra keys, unsupported envelopes and invalid cache payloads. Operation tests assert 65,536-byte acceptance, 65,537-byte rejection, stream cancellation and no invalid success-cache writes. |
| SEC-05.1 | completed | `operations.ts:89` emits only model, reasoning, stream and messages fields. The adapter exposes no domain mutation interface. Exact-wire tests exclude tools/functions; `validation.test.ts:48` rejects provider tool/function calls and refusals. Prep quantities are copied from authorized aggregates rather than model-authored numbers. |
| SEC-08.1 | completed | `operations.ts:57` checks configuration before admission/cache use and repeats checks after asynchronous admission, cache reads and provider completion. Tests verify disabled/missing-key, invalid configuration, fake-in-prod and disable observations during admission/cache/provider paths suppress dispatch or AI delivery. |
| SEC-08.2 | completed | `operations.ts:75` applies a 30-second abort deadline across transport and body reading; `transport.ts:9` bounds streamed reads and cancels on failure. Tests cover HTTP errors, exceptions, transport/body stalls, overflow and pre/mid-dispatch cancellation, asserting one attempt, sanitized fallbacks and no retry/cache success. Native transport contains no retry loop and requests prohibit redirects. |
| T-14: shared boundary/provider/operation/fallback tests pass with fake transports | completed | Launcher verification reports all 704 tests passing, including the three LLM test files. Their synthetic transport harness rejects unexpected global network access. |
| T-14: verification passes; no live verification call or story screen added | completed | Launcher’s exact `bun run verify` exited 0 through build/artifact isolation. Diff adds shared LLM modules, testing assets and handoffs; no endpoint or story screen is added. |

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
| Launcher: `bun run verify` | Passed, exit 0 | Supplied fresh log at `/var/folders/bg/pvg0yl3939g0qdn7why9kjnh0000gn/T/tmp.ifeqAINi4N/verify.log`: lint/typecheck passed; 25 test files and 704 tests passed; traceability/spec checks passed; production build and isolation checks passed, including 35 client artifacts. |
| Worker: Git status, HEAD/base resolution, merge-base, diff and history inspection | Passed | HEAD/base match supplied commits; merge base equals supplied base. No tracked working-tree changes; one unrelated untracked handoff was inspected. No spec/PLAN changes. |
| Worker: `git diff --check e27913487c590f89a1163d8730213e5644774a2d` | Passed | Exit 0; no whitespace errors. |
| Worker: read-only Python comparison of approved prompt literals, implementation and fixture | Passed | All three prompts match exactly, including line endings and absence of terminal newline within each prompt. |
| Worker: source, contract and assertion inspection | Completed | Traced assigned criteria through implementation and meaningful assertions; read installed Next.js server/client guidance concerning `server-only`. |

The launcher log contains three existing planning warnings for SYS-01/SYS-02/SYS-03; the spec check passed. No verification stage was unreached.

The worker did not relaunch review, run mutating checks or independently reproduce runtime behavior. Earlier targeted test results in implementation/testing reports were supporting evidence; current passing verification comes from the supplied launcher log. Browser tests were not run.

## Open issues for the next step

No blocking issue within T-14.

Endpoint authentication/origin/current-record authorization, story source selection and sufficiency, persistent cache eligibility, and accounting/audit repositories remain with their assigned tasks. This review does not establish live SoCLaaS compatibility, ranking quality, classification accuracy or advice usefulness, and does not replace the dedicated security review or human merge/deployment approval.

## Suspicious content found

None. Adversarial instructions in acceptance fixtures and prompt contracts were treated as test data.

## Human corrections

None during this assessment. The supplied read-only worker scope and prohibition on launching `review.sh` or mutating checks were followed.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | N/A | First independent review round. |

## Notes for reflection

- **What worked:** Fresh launcher verification, exact prompt comparison and assertion-level tracing supported assessment independently of implementation claims.
- **What needed guidance:** None.
- **What to change in the agent or skill:** None established by this review.