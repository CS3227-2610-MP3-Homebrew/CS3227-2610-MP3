# Implementation report

- **Agent:** implementation
- **Issue:** #43 (T-12), paired with #42 (T-11)
- **Spec IDs:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5; SEC-06.1, SEC-06.2, SEC-06.3
- **Date:** 2026-10-20
- **Branch:** feat/42-durable-admission-windows-quota-telemetry
- **Base commit:** 8f39d4b (coordinator-confirmed HEAD merging upstream/master; committed T-11 tests in fbb8b81)
- **Status:** completed

## Summary

Implemented durable all-or-none usage admission through a public-schema, table-returning Supabase RPC. The production adapter uses installed @supabase/supabase-js 2.118.0 with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, independent of ordinary session clients. No package or lockfile changes, direct application Postgres connection, live provider request or hosted database access occurred.

The RPC validates policy and authoritative actor/feature/cafe relationships. A transaction advisory lock per environment serializes the complete capacity decision across instances. All applicable counters are checked before any mutation. Private counter, operation and admission tables have RLS enabled and explicit revocations; only public-schema USAGE and this RPC's EXECUTE are granted to service_role. Ordinary client roles have no RPC execution permission or usage table privileges. Operation attempt limits and single-use admission identities survive reconstruction; minutes and Singapore days have independent explicit start/end identities. Token metadata remains partial/unknown when absent; failed dispatches stay charged without retry or refund.

Initial implementation passed the executable targeted and full checks without a code repair cycle (0 of 3 used). Sandbox-only attempts at database reset, database tests and catalogue access could not access required local runtime/Docker resources; their escalated reruns succeeded. Those setup permission failures were not application test failures. Final successful logs are retained below. Independent review/security review and the human commit gate remain pending; this status describes implementation and verification only.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-09.1 | completed | All 41 local database admission cases passed, including actual service_role success, reconstructed instance/module reload persistence, actor isolation and independent local/CI namespaces. No app database SQL/credential seam was introduced. |
| SYS-09.2 | completed | Concurrent duplicate admission has exactly one success; last-capacity race admits only remaining capacity; denied multi-scope and operation reservations preserve other capacity. All counters and successful identities change in the same SQL statement transaction. |
| SYS-09.3 | completed | Before/at/after minute and Singapore-midnight assertions passed, including old-window preservation and action/refresh/run daily continuity. Omitted construction clock uses PostgreSQL clock_timestamp; skewed application Date does not change membership. Window identity includes both boundaries so day and minute buckets starting together stay distinct. |
| SYS-09.5 | completed | Daily global exhaustion/race/rollover and fake 429/timeout/transport/invalid-output cases passed. Denied/unavailable admission dispatches no provider callback. Returned full/partial/zero token counts survive; absent tokens and monetary cost remain unknown. |
| SEC-06.1 | completed | Concurrent actor minute/day, cafe refresh/day and Admin run/day caps, zero cases and midnight tests passed. SQL verifies actor role and derives cafe scope by authoritative owner/workspace/approved/unsuspended records. Refresh/run events also consume the actor-wide action limits. |
| SEC-06.2 | completed | Provider global-minute/global-day/feature-minute and operation bounds, duplicate identities and authorized-cache-hit no-dispatch cases passed. Actual service_role positive control succeeded before anon/authenticated denial checks; no fixture privilege grants were added. |
| SEC-06.3 | completed | All 13 required configuration values normalize from explicit integer/environment strings; missing/invalid values fail closed. Zero and per-operation/review policy maxima tests passed. Extra request scope/clock fields and malformed RPC envelopes fail closed in supplementary tests. |
| T-12 catalogue/full verification | completed | Full suite passed 466/466 across 22 files, including migration replay twice and every-table RLS/explicit ACL checks. Exact bun run verify completed through production build and client-artifact isolation. Separate bun run db:check passed. |

## Files changed

- `supabase/migrations/20261020000001_usage_admission.sql`: additive private infrastructure tables, constraints/indexes/RLS/revocations, actor/scope checks, atomic public RPC and deliberate service_role-only grants. Existing applied migrations remain unchanged.
- `src/server/llm/usage.ts`: server-only Zod request/policy validation, RPC admission, construction-only clock seam, dispatch/cache/fallback and token projection.
- `src/server/llm/usage-client.ts`: installed secret-key Supabase client with public RPC, no persisted/refreshed/browser session, disabled Data API automatic retries, callable allowlist and safe error projection; lazy configured admission factory omits controlled clock.
- `tests/unit/usage-internals.test.ts`: five supplementary internal tests without criterion IDs. They exercise the installed SDK against fake fetch, secret-key public RPC path/body, safe errors, rejection of extra request clock/scope fields, malformed RPC envelopes and non-provider dispatch prevention.
- `workflow/handoffs/42-durable-admission-windows-quota-telemetry/02-implementation.md`: this report.

No testing-owned acceptance tests, fixtures/configuration, specifications, PLAN, dependency declarations/lockfile or guides were changed.

## Checks run

Implementation and supplementary test files were frozen before the final targeted run and subsequent sequential full verification. No code edit followed either run. Local DB access used escalated execution after sandbox permission failures; only the local configured Docker/Supabase stack was accessed.

| Command | Result | Evidence |
| --- | --- | --- |
| bun run db:reset | passed | Final migration reset succeeded; `/private/tmp/homebrew-42-implementation-db-reset.log`. Full verify later also replayed local migrations twice through the existing schema suite. |
| bun run test tests/unit/usage tests/unit/usage-internals.test.ts tests/integration/usage | passed | 69/69 tests, 3/3 files, 16.76 seconds. Includes every committed usage acceptance case and five supplementary internal cases; `/private/tmp/homebrew-42-implementation-targeted.log`. |
| bun run verify | passed | Lint and typecheck passed; 466/466 tests, 22/22 files, test duration 161.17 seconds; traceability passed (13 done tasks), spec check passed (0 warnings), application-source isolation, Next.js production build and 35-client-artifact isolation passed. `/private/tmp/homebrew-42-implementation-verify.log`. |
| bun run db:check | passed | Every application table has RLS; `/private/tmp/homebrew-42-implementation-db-check.log`. |

`test:e2e` was not run separately: this server infrastructure task introduced no browser surface, and no usage browser cases exist. No live provider/exhaustion probe was run. All checks in the required verify pipeline were reached and passed.

## Open issues for the next step

Independent reviewer/security-reviewer reports and human review/commit remain pending. No implementation blocker or unresolved assigned criterion remains. Story endpoint/session authorization, moderation batch input validation, provider transport/output contracts, feature cache eligibility/fallback rendering, audit persistence and maintenance/retention remain with their separately assigned tasks. This implementation supplies no public HTTP endpoint or client-callable usage object.

Per-environment admission serialization is intentional at the adopted small configured caps; it trades per-environment throughput for a compact all-or-none transaction. Admission state is retained without cleanup/reset; no cleanup job or monetary guarantee was introduced. The controlled timestamp option is restricted in SQL to local/CI and never appears in production construction or accepted request input.

## Suspicious content found

None.

## Human corrections

Applied the human Gate 2 correction: use the committed Supabase `.rpc(fn, args)` seam and public Data API callable instead of arbitrary SQL/direct app Postgres credentials. Existing domain fixture and clock queries remain testing-owned and unchanged. The controlled clock is a trusted construction-time server option; strict request validation rejects clock/scope injection and production composition omits it.

Applied the stage 3 direction to use the already-installed @supabase/supabase-js secret-key client after the upstream merge; no Supabase package was added or upgraded. Applied the original service_role grant warning: the actual service_role positive control executed successfully, while anon/authenticated remained denied, without fixture grants.

All explicit git commands were requested directly with escalation and without allow rules. No git/gh/install/review command was attempted in the sandbox. No commits, pushes, PRs or formal review commands occurred.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Independent review has not run for this implementation. |

## Notes for reflection

- **What worked:** The committed public-RPC seam exercised service_role privileges directly and all 64 acceptance cases passed once the module/migration existed; the installed SDK was independently exercised with fake HTTP responses.
- **What needed guidance:** The human identified the production Data API constraint and pre-existing service_role privilege revocations before implementation; both informed the narrow public RPC design.
- **What to change in the agent or skill:** None identified for this run. Local Docker/Supabase checks require the runtime/socket permissions provided by escalated verification.
