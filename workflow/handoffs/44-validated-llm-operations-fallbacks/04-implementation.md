# Implementation report

- **Agent:** implementation
- **Issue:** #45, PLAN T-14; paired testing #44/T-13
- **Spec IDs:** SYS-04.2; SYS-08.1–SYS-08.3; SEC-02.1; SEC-03.1–SEC-03.2; SEC-04.1; SEC-05.1; SEC-08.1–SEC-08.2
- **Date:** 2026-10-21
- **Branch:** feat/44-validated-llm-operations-fallbacks
- **Base commit:** e27913487c590f89a1163d8730213e5644774a2d (origin/master); original tests 1f09991; human-committed fixture correction 4b0bb0c
- **Status:** completed

## Summary

Implemented and verified T-14's shared server-only validated LLM operations and request reader. This resumed run changed no application code. The narrow testing-owner request-capture correction in `03-testing.md`, committed by the human at 4b0bb0c, restored both original assertions without changing the boundary values or behavior. All 238 targeted cases and all 704 tests in exact `bun run verify` pass on the unchanged application modules. The earlier blocked `02-implementation.md` remains immutable history; its two usage-admission timeouts did not recur.

Repair cycles used: zero across initial and resumed implementation runs. No application workaround, test changes, dependency changes, supplementary tests or configuration changes were made. Completion denotes implementation and verification only; independent reviewer/security acceptance and human diff approval remain pending.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-04.2 | completed | All HTTP and validation cases in `tests/integration/llm/` pass: strict Zod request/source/provider/cache schemas, exact decoded Unicode content, valid dates/filters, bounded UTF-8 readers and safe HTTP errors. The repaired existing boundary case now reaches both unchanged assertions. |
| SYS-08.1 | completed | Passing operation cases capture action admission followed by one provider-attempt reservation and one configured dispatch; eligible cache needs no provider-attempt reservation. Existing durable usage suite also passes in full verification. |
| SYS-08.2 | completed | Exact fixed prompt/canonical object-key/configurable model/reasoning checks pass. Prep input contains aggregates only; output evidence and its exact reason text are server-built. Whole-result reference/evidence validation passes. |
| SYS-08.3 | completed | All three features pass exact disabled/missing-key/admission/429 typed fallbacks; Brew empty recommendable source makes no dispatch and yields no_source_data. |
| SEC-02.1 | completed | Strict nested input allowlists and exact captured contexts reject identity, order rows and private fields before effects. The adapter has no domain-query capability. |
| SEC-03.1 | completed | Direct/indirect/encoded/multilingual injections remain JSON data with exact fixed system prompts and unchanged permitted request capabilities. |
| SEC-03.2 | completed | Forged source references, evidence and invalid array members reject the complete result; source snapshots remain unchanged. |
| SEC-04.1 | completed | Provider envelope/plain-JSON/schema/semantic/cache gates reject malformed, oversized and unsupported completions. Inclusive 65,536-byte acceptance, overflow cancellation and no invalid success-cache writes pass. |
| SEC-05.1 | completed | Exact wire shape includes no tools/functions or domain-write capability; provider calls/refusals reject. Prep quantities are copied from authorized aggregates; no model-authored quantities/reasons are accepted. |
| SEC-08.1 | completed | Passing disable-before-cache/admission and disable-during-admission/cache/provider cases suppress dispatch, success delivery and relevant success-cache writes. |
| SEC-08.2 | completed | Passing one-attempt/no-retry HTTP/error/fallback paths, 30-second transport and body deadlines, bounded stream reads/cancellation and pre/mid-call disconnect cases. |
| T-14 task acceptance | completed | 238/238 shared-boundary cases pass; exact `bun run verify` exits 0 with 704/704 tests and all subsequent stages passing. No endpoint, story screen or live verification call was added. |

Evidence above concerns the shared adapter's assigned boundaries. Source acquisition, actor/role/current record authorization and fallback-domain reads remain deterministic endpoint/domain responsibilities, rather than authority inferred from model output.

## Files changed

Application diff established in the initial implementation and unchanged in this resumed run:

- `src/server/llm/operations.ts`: correlated feature result/fallback envelopes, action and provider-attempt admission seams, cache payload validation, disable rechecks, single bounded dispatch and shared strict HTTP reader. Default configuration uses the existing server configuration validator. An optional internal hook retains content-free supplied token counts for the accounting owner.
- `src/server/llm/schemas.ts`: strict Zod feature/request/provider/cache gates, Unicode/calendar/filter bounds, whole-result reference/evidence semantics, canonical object-key serialization and safe optional token parsing.
- `src/server/llm/prompts.ts`: exact literal integration-contract system messages, never interpolated with untrusted source content.
- `src/server/llm/transport.ts`: configured provider/destination and existing usage-policy validation, exactly-one-v1 endpoint, deterministic fake behavior, bounded cancellable response reading and single native HTTP transport. No OpenAI SDK is installed or used; the native adapter contains no automatic retry loop, redirects are disabled, and failure never substitutes another provider.

This resumed run adds only this `04-implementation.md`. It preserves `02-implementation.md`, all testing-owned files, package/configuration files and unrelated untracked `workflow/handoffs/66-customer-catalogue-contracts/03-spec.md`. No specs, PLAN, docs, endpoints, UI, migrations, story source queries, sales calculations, persistent cache repositories or audit repositories changed. No supplementary tests were added.

## Checks run

Only final-code checks from this resumed implementation run are listed.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run test tests/integration/llm` | passed | 3 files; 238 tests passed, no failures/skips; 653 ms. Synthetic transports only; unexpected global fetch is blocked by the test harness. |
| `bun run verify` | passed | Exact bare command with escalated local Docker access exited 0. Lint/typecheck passed; 25 files and 704 tests passed with no failures/skips; Vitest duration 216.75 seconds. Traceability passed for 15 done tasks. Specs passed with 3 existing SYS-01/SYS-02/SYS-03 planning warnings. Production build, application-source isolation and all 35 client-artifact isolation checks passed. |
| `git diff --check` | passed | No whitespace errors. |
| Scope inspection (`git status --short`, tracked diff and source inspection) | passed | No tracked application/test/config changes in the resumed run; only assigned untracked modules/reports plus preserved unrelated report. All four modules import server-only; provider fetch remains inside src/server/llm; no source logging or fixed external provider destination added. |

No check in the exact verification chain was left unreached. Browser tests are outside this shared server-only task; `bun run test:e2e` was not run. No live LLM provider, hosted database, secret file or deployment was accessed.

## Open issues for the next step

None blocking this implementation handoff. Independent review, security review and human diff approval are pending. Live SoCLaaS compatibility, classification accuracy, ranking quality and advice usefulness remain unverified; schema/reference validation does not prove natural-language quality. Story-owned source selection/sufficiency/current eligibility checks and T-16's persistent scope/version/expiry/accounting/audit repositories remain outside T-14. Cache read/write and admission seams accept only trusted server-constructed bindings, never HTTP-supplied callbacks or provider configuration.

## Suspicious content found

None. Injection content in acceptance fixtures was treated as data, not agent instructions.

## Human corrections

The coordinator supplied testing-owned correction evidence and human commit 4b0bb0c and requested resuming verification without application changes. Both original Unicode boundary assertions were preserved. This run followed that scope and independently reran the targeted suite and required full verification.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | N/A | Independent review pending. |

## Notes for reflection

- **What worked:** Exact contract-derived cases verified all three operations and their failure paths without live provider calls or acceptance-test edits.
- **What needed guidance:** The testing owner repaired the fixture recorder; the human reviewed and committed that correction before resumed verification.
- **What to change in the agent or skill:** None established by this resumed run.
