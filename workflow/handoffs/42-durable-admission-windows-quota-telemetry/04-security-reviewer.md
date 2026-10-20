# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #43 (T-12), paired with #42 (T-11)
- **Spec IDs:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5; SEC-06.1, SEC-06.2, SEC-06.3
- **Date:** 2026-10-20
- **Branch:** feat/42-durable-admission-windows-quota-telemetry
- **Base commit:** d923954f61693437f0b2cb4f8edf12455d004277
- **Reviewed HEAD:** 235b5444b59cb0087e9e16b1582074f0dc2d2c63
- **Status:** completed
- **Overall:** pass
- **Implementation report:** workflow/handoffs/42-durable-admission-windows-quota-telemetry/02-implementation.md
- **Independent review:** workflow/handoffs/42-durable-admission-windows-quota-telemetry/03-reviewer.md

## Summary

No confirmed security findings in the reviewed scope.

Reviewed the committed merge-base diff against the supplied `upstream/master`, including the new admission migration, both server modules, acceptance tests and supplementary SDK tests. Git confirmed the supplied HEAD/base and no tracked working-tree changes before or after verification. The pre-existing untracked `03-reviewer.md` was preserved. Supporting unchanged configuration, session-client, core-schema/default-privilege, isolation-check and test-lifecycle code was inspected only to establish the relevant boundaries.

The public-schema RPC is deliberately executable only by `service_role`. Its security-definer implementation has an empty search path, explicitly qualified application objects, authoritative role/café checks, private RLS-enabled tables and no direct table grants to application roles. The production adapter uses the installed Supabase SDK and configured secret key, separately from the publishable-key session client. It introduces no direct application Postgres connection or dependency change.

Independent targeted verification passed 69 tests; exact `bun run verify` then passed all 466 tests, traceability/spec checks, production build and isolation checks. This assessment covers the admission infrastructure and dispatch seam; it does not approve merge/deploy or establish the security of future feature endpoints.

## Findings

None confirmed. No severity-ranked finding or fix request is supported by the reviewed control flow and executed checks.

## Acceptance criteria

References are repository-relative. Statuses describe this security assessment of the assigned criteria.

| Criterion | Status | Evidence |
| --- | --- | --- |
| SEC-06.1 | completed | Migration `supabase/migrations/20261020000001_usage_admission.sql:124` checks current actor role; `:133` derives the Prep café scope from authoritative owner/workspace/approval/suspension records. `:178` reserves actor minute/day limits and the additional café refresh/Admin run daily limits. Existing integration cases passed for concurrent scoped limits, reconstruction/module reload, actor isolation and day/minute boundaries. |
| SEC-06.2 | completed | Migration `:145` serializes each environment's complete decision with a transaction advisory lock; `:151` rejects duplicate admission IDs, `:155` binds existing operations to actor/feature/café, and `:162` enforces operation/global-minute/global-day/feature-minute provider caps. All bounds are checked before writes at `:190`. Concurrent duplicate, last-capacity, all-or-none denial, operation-bound, rollover and failed-attempt cases passed. Actual `service_role` success precedes ordinary-role denial assertions. `src/server/llm/usage.ts:88` makes no call/reservation for an already-authorized cached value; `:91` reserves before one callback and has no retry/refund loop. Installed SDK retry handling was inspected as described below. |
| SEC-06.3 | completed | `src/server/llm/usage.ts:26` validates all 13 explicit policy keys and maxima; `:37` strictly validates the request; `:64` denies invalid policy/environment/request, error responses, malformed RPC envelopes and exceptions. SQL independently validates policy/request at migration `:79`. Existing missing/invalid/zero-policy, denied/unavailable-admission, no-dispatch and partial/zero/unknown token tests passed. Returned token metadata is preserved; cost remains unknown rather than inferred from call counts. Moderation batch-size enforcement is a feature-input responsibility outside this pair. |
| SYS-09.1/.2/.3/.5 security implications | completed | Persistent identities/counters, environment separation, atomic reservation, database-clock UTC minutes/Singapore days, single-use admissions, exhausted-cap fallback, charged failures and unknown monetary consumption were assessed alongside SEC-06 and exercised by the existing 69 targeted cases. |

## Zero Trust baseline coverage

| Boundary | Assessment and evidence | Limits |
| --- | --- | --- |
| Identity, authorization and role revocation | The new externally callable surface is `public.reserve_ai_usage`, not an HTTP handler or Server Action. Migration `:222` revokes execution from PUBLIC, anon, authenticated and service_role, then explicitly grants only service_role execution and public-schema USAGE. Existing local fixtures run the function under the actual selected role/JWT claims, without fixture grants; service_role admitted and anon/authenticated did not. SQL reads and share-locks the current actor profile and applicable café before admitting. | Service-role infrastructure trusts the server to supply the authenticated actor and server-generated operation/admission identities. UUID validation alone is not authentication. Session expiry, CSRF/origin checks, story authorization and authorization before cache/fallback access belong to the future feature boundary; there is no new feature caller in `src/`. |
| Ownership, workspace and privileged-client separation | Migration `:135` requires café ownership, matching owner/café workspace, approved application and unsuspended café. Other feature quota scopes derive from actor identity rather than caller-supplied scope fields; non-Prep café input is discarded. Existing operation identities cannot be reused under a different actor/feature/café. Global environment caps intentionally span workspaces. `src/server/llm/usage-client.ts:11` creates an independent secret-key client with session persistence/refresh/URL-session detection disabled; unchanged `src/server/supabase/session-client.ts` uses the publishable key and request cookies. | No café source data, sales, reviews or feature cache is returned by this RPC. Dedicated wrong-role/cross-owner/changed-state negative cases are not present in the usage suite; those SQL guards were assessed statically. No cross-workspace feature-data authorization is inferred from quota enforcement. |
| Least privilege, RLS and secrets | All three new private tables enable RLS and revoke all table privileges from PUBLIC/anon/authenticated/service_role at migration `:39`. The private schema already denies those roles USAGE. The deliberate security-definer function can access the tables as its owner without granting direct table access. Its empty search path and qualified application references prevent caller-controlled application-object resolution. The adapter allowlists only this RPC and imports `server-only`, as does the usage module. Installed Next.js server/client and data-security guidance was read before assessing that boundary. Source/client-artifact isolation checks passed. | The secret-key infrastructure capability is privileged by design; possession of the server credential is outside ordinary-client attacker prerequisites. No actual credential or `.env*` file was read. |
| Input and injection sinks | Zod restricts UUIDs, known features/events and exact request keys. SQL independently rejects extra fields and invalid policy/event/role combinations. Production uses `.rpc(fn, args)` with a constant allowlisted function name and structured JSON arguments; SQL contains no dynamic EXECUTE or caller-supplied identifiers. | No new HTML/Markdown, redirect, upload, path, shell or caller-controlled URL sink exists in application code. Test-only SQL/clock helpers target local Docker and are not supplied to the production adapter. The configured database URL is server configuration, not request input. |
| Replay, races, scope/window integrity and resource abuse | A per-environment transaction lock covers duplicate detection, operation checks, all counter checks and all mutations. A denial writes no counter/operation/admission; a statement error rolls back its writes. Unique environment/admission keys prevent replay. UTC minute and Singapore daily windows include explicit start/end identities; database time is taken after acquiring the lock. Construction-only `databaseClock` is omitted by production; strict request validation rejects injected clock/scope fields. SQL rejects non-null controlled time in dev/prod at `:83`. All relevant existing concurrency/window cases passed. | Serialization intentionally bounds throughput at one admission transaction per environment; no load test or destructive exhaustion probe was performed. No cleanup/reset surface is introduced. Operation IDs remain server-generated responsibilities for callers. |
| Errors, telemetry, dependencies and build | `src/server/llm/usage.ts:74` catches admission transport/database details and denies; dispatch failures fall back without exposing the error. The adapter reduces Data API errors to a fixed message. New persisted fields contain only quota identities/scopes/counts/windows, with no prompts, model output, provider bodies or keys; no new logging sink exists. The SDK fake-fetch test confirms the secret-key header, public RPC path and request body. The reviewed diff changes no package, lockfile, CI or build configuration. | SDK behavior was checked in installed source; no external advisory scan or repository-wide dependency audit was performed, and no CVE conclusion is claimed. Token metadata is returned to an internal caller without a new telemetry persistence sink; later provider parsing/audit projection remains separately owned. |

## LLM baseline and evaluation coverage

All new AI-facing code is under `src/server/llm/`. No SoCLaaS transport, prompt, model response parser, renderer, domain mutation or persistent AI-result cache is introduced.

| Baseline/case | Evidence and result | Exclusions |
| --- | --- | --- |
| Prompt injection; E-01–E-07 | The new RPC accepts bounded identifier/enum request structure and numeric policy, not user/menu/review/prompt text. It cannot promote model instructions to SQL, roles, café approvals, orders or review mutations. | No prompt/provider-context, human-confirmation, cross-user feature-data or rendering surface exists in this pair. Feature/provider/cache and endpoint security cases remain with their owning tasks. Retrieval, embeddings, tools and persistent memory are excluded by the security-reviewer instructions. |
| Excessive agency and overreliance | Only infrastructure counters/identities are mutated; no model output enters the RPC. `dispatchWithAdmission` returns an opaque result to its server caller and performs no business mutation. | It does not authenticate a feature request, validate model output, require human confirmation or establish answer quality. Future deterministic business checks cannot be replaced by quota success. |
| Sensitive data disclosure and unsafe output; relevant E-12 aspects | No content is sent to a provider or persisted/logged by this pair. Error-redaction and installed-SDK fake-fetch tests passed; source and 35-client-artifact isolation passed. Tokens remain partial/unknown where absent, and cost is null. | No actual model/client rendering sink or audit-retention job was tested. Admission records remain retained; closed-window cleanup and its seven-day deadline belong to T-15/T-16, which must preserve active counters and single-use state. No full E-12 retention or client canary claim is made. |
| Resource/cost abuse; E-08 | Existing concurrent actions/refreshes/runs, last global daily capacity, reconstruction/module reload and Singapore-midnight tests passed against local PostgreSQL. All provider attempt limits and the immutable successful admission IDs are durable. | No live quota/monetary guarantee, real provider exhaustion or production load test. |
| E-09: cache hit, second call, failed attempt, timeout and 429 | An already-authorized cache hit invokes neither reserve nor provider; every callback dispatch requires admission. Concurrent per-operation tests enforce two Brew attempts and one Prep/Moderation attempt. Synthetic 429/timeout/transport/invalid-output exceptions invoke one callback, retain consumed daily capacity and fall back. Adapter `db.retry: false` reaches PostgREST through installed `SupabaseClient.ts:401`/`PostgrestBuilder.ts:83`; installed `fetchWithRetry.ts` respects that flag and also excludes non-idempotent POST from automatic retries. | The invalid-output cases simulate a provider callback throwing; they do not test a response parser. No provider SDK exists here. Future T-14 transport must maintain zero retries and independently admit any permitted second Brew call. Persistent cache eligibility and preserving old entries after failed refresh belong to T-15/T-16. |
| E-11: missing/invalid/zero configuration and unavailable admission | All required policy validation cases, configured zero limits, missing policy, denied/unavailable admission, malformed RPC envelopes and injected request clock/scope cases passed. No denied/error path reaches the provider callback. | Serialized input/output byte ceilings, provider duration/abort handling and stopping subcalls after disconnect belong to T-13/T-14's transport/feature operations. The generic callback seam supplies no transport or cancellation mechanism and is not used by a feature endpoint yet. |
| E-10, E-13–E-17 | No feature disable/cache orchestration, cookie-authenticated feature/mutation endpoint, Admin confirmation, demo provisioning/credential display, kit-Admin domain operation or maintenance endpoint is added. | Those cases concern separately assigned controls; no approval, denial or implementation completeness is inferred for them. E-10's existing environment kill switch is a feature/provider orchestration responsibility, not merely a future runtime Admin setting. |

## Files changed

Only `workflow/handoffs/42-durable-admission-windows-quota-telemetry/04-security-reviewer.md` was created. Application code, tests, fixtures, migrations, configuration, prior reports, PLAN and specs were preserved.

## Checks run

Implementation/test files were unchanged throughout the following sequential runs. Full logs are retained under `/private/tmp/`. Existing full-suite local migration replay was permitted; no separate reset command was invoked.

| Command/check | Result | Evidence |
| --- | --- | --- |
| Read-only Git scope/HEAD/base/status inspection | Passed | HEAD and merge base matched the supplied commits. Before/after verification, tracked staged/unstaged diffs were empty; only the prior untracked `03-reviewer.md` existed. Final committed diff whitespace check passed. All Git invocations used requested escalation, without an allow rule. |
| `bun run test tests/unit/usage tests/unit/usage-internals.test.ts tests/integration/usage` | Passed, exit 0 | 69/69 tests, 3/3 files, 14.16 seconds; `/private/tmp/homebrew-42-security-targeted.log`. Includes 41 local role/atomicity/window cases, 23 policy/dispatch cases and five supplementary internal cases. |
| `bun run verify` | Passed, exit 0 | Lint/typecheck passed; 466/466 tests in 22 files, 142.05-second test phase; traceability passed (13 done tasks); specs passed with zero warnings; source isolation, Next.js production build and isolation of 35 client artifacts passed. `/private/tmp/homebrew-42-security-verify.log`. |
| Supporting source/installed framework and SDK inspection | Completed | Reviewed the relevant installed Next.js server-only guidance and Supabase retry propagation/implementation; inspected session-client separation, private-schema/default grants, local-only test lifecycle and relevant contracts. |

No required verification check was skipped or failed. Browser E2E was not run separately because this change adds no browser surface or usage browser test. No independent `review.sh`, package installation/update, fetch, live LLM call, hosted database access, external probe or destructive exploit was performed.

## Open issues for the next step

No confirmed vulnerability or unresolved decision within this pair's assigned scope. Future callers must establish session/role/workspace/source authorization and server-generated identities before using this internal API. Action/refresh/run admission and disable/policy gates occur at those feature boundaries; provider-attempt admission alone does not establish them. Provider context/output validation, timeouts/cancellation, feature cache eligibility, audit persistence and closed-window retention remain with their separately assigned tasks. Their absence here is a coverage boundary, not evidence that those later controls passed.

The local permission evidence uses actual PostgreSQL execution roles and public-schema named RPC calls; the installed SDK uses fake HTTP. No end-to-end Data API gateway request with real credentials was made. No finding is concealed by that limitation, but deployed gateway configuration was not assessed.

Completion records review and verification only; findings are not inferred to be fixed, and merge/deployment is not approved by this report.

## Suspicious content found

None.

## Human corrections

Assessed the human's production-adapter constraints explicitly: Supabase Data API RPC under the installed secret-key SDK client; no arbitrary-SQL application seam, new direct Postgres credential, package addition or upgrade. Verified the construction-only clock and real service_role success/ordinary-role denial requirements. No test, fixture or prior handoff was changed during this review.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Dedicated security assessment; no implementation edits. |

## Notes for reflection

- **What worked:** Positive service_role controls, ordinary-role denial and local concurrency/window tests made the privilege and atomicity boundaries executable; installed SDK source confirmed retry configuration independently of comments.
- **What needed guidance:** The human's Data API and pre-existing service-role revocation constraints clarified the production boundary and informed the evidence required.
- **What to change in the agent or skill:** None identified in this run.
