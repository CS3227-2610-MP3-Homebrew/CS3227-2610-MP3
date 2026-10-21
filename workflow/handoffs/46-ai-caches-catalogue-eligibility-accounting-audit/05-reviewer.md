# Reviewer report

- **Agent:** reviewer
- **Issue:** #47 / T-16, paired with #46 / T-15
- **Spec IDs:** SYS-05.3; SYS-09.4; SYS-10.1–SYS-10.3; SEC-07.1–SEC-07.2; SEC-09.1–SEC-09.2
- **Date:** 2026-10-21
- **Branch:** feat/46-ai-caches-catalogue-eligibility-accounting-audit
- **Base ref:** upstream/master
- **Base commit:** d032d56eb243c4bbd111d73f5b7f8ef9063d4803
- **Reviewed HEAD:** 632d7de6bfeefa1d5be78d69455f53de8e1337fc
- **Implementation report:** workflow/handoffs/46-ai-caches-catalogue-eligibility-accounting-audit/04-implementation.md
- **Review round:** 1
- **Model:** gpt-6.1-sol
- **Reasoning:** high
- **Status:** incomplete
- **Report path:** workflow/handoffs/46-ai-caches-catalogue-eligibility-accounting-audit/05-reviewer.md — content returned for launcher persistence; no file written.

## Summary

Independently assessed the merge-base-to-working-tree changes, supporting code, specifications, meaningful test assertions and supplied verification log. HEAD and base match the supplied commits; the working tree is clean, including untracked files.

The approved contract was derived from specifications on `upstream/master`. No working-tree specification or PLAN differences exist. Master’s merge of PR #103 records the scope split: catalogue page streaming, personalized HTTP caching and Admin audit persistence belong to later tasks.

**Overall:** fail
Three blocking findings violate failed-refresh preservation and complete fallback/failure auditing despite successful launcher verification.

The assessment is finished. Status remains incomplete because a worker whole-diff whitespace check returned exit 2; application, migration and test whitespace checks passed separately.

## Acceptance criteria

Statuses cover this pair’s portions under the scope split merged on master.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-05.3 | completed | Session-bound eligibility projection in `src/server/llm/ai-state-client.ts:20`; current eligibility checks in `ai-state.ts:68`. Meaningful AST, session-RLS, suspension/unapproval and mid-generation tests in `tests/unit/ai-state/catalogue-policy.test.ts:7`, `tests/integration/ai-state/catalogue-rls.test.ts:5` and `cache.test.ts:52`. Page/Suspense coverage belongs to T-40/T-41. |
| SYS-09.4 | completed | Separate action/refresh/run and provider reservations in `ai-state.ts:159`. Durable admission assertions in `tests/unit/ai-operation-composition.test.ts:36`, `:54`, `:69` and `:85`; callback failure/cache-hit assertions in `tests/integration/ai-state/accounting-audit.test.ts:7`. |
| SYS-10.1 | incomplete | Canonical identity, durable storage, expiry and ordinary refresh cases have meaningful coverage in `tests/unit/ai-state/identity.test.ts:9` and `tests/integration/ai-state/cache.test.ts:9`. Finalization failure can nevertheless replace the old cache: R1. |
| SYS-10.2 | completed | Feature-result validation in `cache-schema.ts:38`; role/ownership/workspace checks in migration `20261021000000_ai_state.sql:83`. Tests cover current eligibility, scope changes, invalid outputs and persisted corruption in `cache.test.ts:27`, `:44`, `:52`, `:66` and `:91`. |
| SYS-10.3 | incomplete | Content-free storage and ordinary-client denials are covered by `accounting-audit.test.ts:15`, `permissions-retention.test.ts:11` and composition token assertions. Authorized fallback/failure outcomes are omitted in R2 and R3. Admin-action entries belong to T-30/T-31. |
| SEC-07.1 | completed | Scoped fingerprints and keys in `cache-identity.ts:28`; current access checks in `ai-state.ts:68` and the SQL RPC. Meaningful isolation, invalidation, expiry and infrastructure permission assertions exist in `identity.test.ts:26`, `cache.test.ts:21` and `permissions-retention.test.ts:11`. |
| SEC-07.2 | incomplete | Provider failure, denial and invalid-result refresh preservation are tested in `cache.test.ts:80` and `ai-operation-composition.test.ts:69`. Final audit/delivery failures are uncovered and violate preservation: R1. Personalized HTTP caching belongs to T-21/T-22. |
| SEC-09.1 | incomplete | Canary exclusion and unavailable-storage dispatch prevention have meaningful coverage in `accounting-audit.test.ts:15`, `:46` and `ai-operation-composition.test.ts:114`. Initial disabled/configuration fallbacks and post-admission eligibility/day changes lose terminal audit outcomes: R2 and R3. |
| SEC-09.2 | completed | Narrow cleanup implementation at migration `20261021000000_ai_state.sql:61`; tests at `permissions-retention.test.ts:46` and `:90` inspect physical deletion, deadlines, unchanged active counters/admissions, duplicate rejection and preservation of synthetic separate moderation history. Scheduling remains outside this repository task. |

## Findings

### Blocking

- **R1 — P2: A failed refresh can replace the earlier valid cache.**  
  **Location:** [ai-state.ts:174](/Users/shawnnygoh/github-repos/homebrew/src/server/llm/ai-state.ts:174), [operations.ts:145](/Users/shawnnygoh/github-repos/homebrew/src/server/llm/operations.ts:145).  
  **Affected contracts:** SYS-10.1, SEC-07.2; integration/security failed-refresh preservation.  
  Cache replacement commits before `beforeReturn` performs final authorization and success auditing. If that audit fails, the request returns `fallback/unavailable`, but the SQL upsert has already overwritten the earlier result. There is no rollback or restoration.  
  **Evidence:** A read-only, in-memory probe using the real TypeScript modules and mocked RPC seeded an empty valid Prep result, then refreshed with valid nonempty advice while rejecting only the success audit. The operation returned fallback; `oldEnvelopeUnchanged` was `false`, and the replacement advice remained stored. The actual migration performs an unconditional conflict update at line 168. Existing preservation tests cover provider failure/429, denial and invalid output, not finalization failure.  
  **Fix direction:** Make replacement conditional on successful refresh finalization, preserving the earlier envelope whenever finalization returns fallback. Add regression coverage for final audit failure and disable/cancellation during finalization.

- **R2 — P2: Initially disabled operations omit their fallback audit entirely.**  
  **Location:** [operations.ts:63](/Users/shawnnygoh/github-repos/homebrew/src/server/llm/operations.ts:63), [ai-state.ts:203](/Users/shawnnygoh/github-repos/homebrew/src/server/llm/ai-state.ts:203).  
  **Affected criteria:** SYS-10.3, SEC-09.1.  
  Audit context `c` is populated only by `bindIdentity`, which runs only for enabled configuration. With initially disabled AI—or configuration rejected before binding—the operation returns a fallback with `c` unset, so no fallback audit is attempted even when the supplied actor/context is valid and audit storage is available.  
  **Evidence:** The read-only in-memory probe returned `fallback/disabled` with `rpcCalls: []` and `events: []`. The disabled test at `ai-operation-composition.test.ts:102` asserts no admission/transport but does not assert a fallback audit.  
  **Fix direction:** Establish validated operation metadata and authorization independently of enabled model/cache identity, then record authorized fallback outcomes while preserving disable precedence over cache access and dispatch.

- **R3 — P2: Prep failure auditing is rejected after midnight or eligibility loss.**  
  **Location:** [20261021000000_ai_state.sql:95](/Users/shawnnygoh/github-repos/homebrew/supabase/migrations/20261021000000_ai_state.sql:95).  
  **Affected criteria:** SYS-10.3, SEC-09.1.  
  The RPC requires the Prep scope’s business date to equal the current database day and the café to remain approved, unsuspended and owned by the actor **before** reaching its audit branch. An operation admitted before Singapore midnight cannot record its fallback afterward using its original scope. Suspension or ownership loss during generation has the same effect. Storage can remain healthy while terminal outcomes and returned token counts are discarded.  
  **Evidence:** Static control-flow inspection shows the date/eligibility rejection at lines 95–102 precedes audit insertion at lines 107–121. `runOperation` attempts fallback auditing at `ai-state.ts:206`, retries in its catch, then suppresses the rejection. Existing boundary tests examine cache expiry and cleanup, not terminal auditing across an in-flight transition. This finding was not reproduced against PostgreSQL during the read-only review.  
  **Fix direction:** Permit content-free terminal auditing tied to an already-authorized operation after its original scope becomes ineligible, while retaining current eligibility requirements for reads, writes and dispatch. Add midnight and mid-generation eligibility-change audit tests.

### Non-blocking

None.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| **Launcher:** `bun run verify` | Passed, supplied exit 0 | Fresh `/var/folders/1l/swk0__jd2s94s2gxch0nzp_r0000gn/T/tmp.hELtWja5uM/verify.log`: lint, typecheck, 33 files / 749 tests, traceability, specification check with zero warnings, source isolation, production build and isolation of 35 client artifacts. |
| **Worker:** read-only Git status, ref, merge-base and diff inspection | Passed | Clean staged/unstaged/untracked state; supplied HEAD/base confirmed; all 23 changed paths assessed. Specifications and PLAN match master. |
| **Worker:** specification, implementation, test and installed Next.js guide inspection | Finished | Traced criteria through code and assertions; consulted installed `use cache` and authentication/Cache Components guides. |
| **Worker:** `node -e …` in-memory operation probes | Executed successfully; exposed R1 and R2 | Real modules transpiled in memory; mocked configuration/RPC/admission/transport; no files, database records or network calls created. |
| **Worker:** `git diff --check <base> -- . ':!**/.env*'` | Failed, exit 2 | Extra blank lines at EOF in `01-testing.md:138` and `02-testing.md:143`. Earlier handoffs were left unchanged. |
| **Worker:** `git diff --check <base> -- src/server/llm supabase/migrations tests` | Passed | No whitespace errors in application, migration or test changes. |

An initial heredoc probe could not execute because the read-only sandbox prohibited the shell’s temporary file; the equivalent probe subsequently ran using `node -e`.

No `review.sh`, mutating checks, database operations, browser/E2E tests, hosted services, live providers or external telemetry checks were run by this worker. PostgreSQL behavior is supported by static inspection and the launcher’s existing suite, not fresh worker reproduction.

## Open issues for the next step

R1–R3 remain unresolved. The passing suite lacks coverage for the identified finalization and audit transitions. The whole-diff whitespace diagnostic also remains nonzero in earlier immutable handoffs.

Catalogue page streaming, personalized HTTP caching, Admin audit persistence and daily maintenance integration remain with their assigned later tasks. This assessment does not approve a merge or deployment.

## Suspicious content found

None.

## Human corrections

None.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | First independent review; no fixes performed. |

## Notes for reflection

- **What worked:** Fresh launcher verification and durable-row assertions provided useful baseline evidence; in-memory probes isolated uncovered finalization behavior without mutation.
- **What needed guidance:** None.
- **What to change in the agent or skill:** Include terminal-audit and post-cache-write failure transitions in shared lifecycle review coverage.