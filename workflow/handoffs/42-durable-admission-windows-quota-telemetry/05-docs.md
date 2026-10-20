# Docs report

- **Agent:** docs
- **Issue:** #43 (T-12), paired with #42 (T-11)
- **Spec IDs:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5; SEC-06.1, SEC-06.2, SEC-06.3
- **Date:** 2026-10-20
- **Branch:** feat/42-durable-admission-windows-quota-telemetry
- **Base commit:** d923954f61693437f0b2cb4f8edf12455d004277
- **Documentation HEAD:** 8db4dcc (implementation reviewed at 235b5444b59cb0087e9e16b1582074f0dc2d2c63)
- **Status:** completed

## Summary

Documented the implemented durable usage foundation after reading all four prior
handoffs, the merge-base diff, owning task/spec contracts, implementation and
tests. The independent reviewer and security reviewer both recorded completed/
pass assessments of the implementation. The Developer Guide now describes the
private durable state, restricted public RPC, secret-key SDK adapter, explicit
policy, atomic windows, dispatch/fallback seam and verification limits. Corrected
stale statements that all AI infrastructure and counters/admissions were future
work. Added a short infrastructure paragraph to the README product summary.

No new user-visible behavior exists: the User Guide remains accurate and
unchanged. No product-site page was edited under the assigned Stage 6 scope.
Required final checks passed, including all 466 tests and production build.
Documentation completion does not approve merge or deployment.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-09.1/.2/.3 | completed | Guide describes actual persistent state, all-or-none reservation, identities and database-clock windows; evidence below. |
| SYS-09.5; SEC-06.1/.2/.3 | completed | Guide describes explicit caps, scoped admission, no-dispatch errors, charged failures and unknown telemetry without claiming monetary enforcement or deployed defaults. |
| User Guide claim-to-evidence coverage | completed | No new or changed User Guide statements; no user-visible route, control, advice or error message was added. `src/app/page.tsx:3` still renders the starter screen, and the usage modules have no feature caller. |
| Final documentation verification | completed | Sequential `bun run check:specs` and exact `bun run verify` passed on frozen guide/README changes. |

### Claim-evidence traceability

Paths and line numbers refer to the reviewed implementation. Tests listed below
passed in this report's full verification. There are no new/changed User Guide
claims requiring individual rows.

| New/changed developer or README claim | Code/test evidence |
| --- | --- |
| Migration inventory now includes durable private counters, operation identity/attempts and single-use admission identity/timestamps; all three tables enable RLS and deny direct application-role access. | `supabase/migrations/20261020000001_usage_admission.sql:3`, `:15`, `:26`, `:39`; migration/schema suite passed. |
| README infrastructure summary: atomic persistent reservations, explicit caps and database minute/Singapore-day windows via restricted secret-key RPC. | Migration `:145`, `:147`, `:190`, `:203`, `:222`; `src/server/llm/usage-client.ts:7`; persistence/concurrency/window tests at `tests/integration/usage/admission.test.ts:26`, `:45`, `:50`, `:58`, `:113`, `:120`. |
| Installed supabase-js 2.118.0 uses URL/secret key, independent of request session client, public-only allowlisted RPC, disabled retries/session features and no application SQL credential. | `src/server/llm/usage-client.ts:1`, `:7`, `:11`, `:17`; `src/server/config/runtime.ts:88`; `src/server/supabase/session-client.ts`; `package.json:24`; installed-SDK fake HTTP test at `tests/unit/usage-internals.test.ts:29`. |
| RPC is security-definer with empty search path and qualified application relations; explicit EXECUTE grant only to service_role among application roles, with ordinary-role denial and service_role positive control. | Migration `:47`, `:51`, `:126`, `:222`; `tests/integration/usage/admission.test.ts:26`, `:36`. Function-owner/superuser execution is not represented as ordinary-client access. |
| Thirteen explicit server policy keys accept safe nonnegative integers/digit strings; zero is valid, missing/invalid policy denies, ceilings are 2/1/1 attempts and 20 reviews; no dev/prod defaults are installed by this factory. | `src/server/llm/usage.ts:4`, `:20`, `:26`, `:66`; `src/server/llm/usage-client.ts:24`; `tests/unit/usage/policy.test.ts:14`, `:20`, `:28`; zero-limit cases at `tests/integration/usage/admission.test.ts:150`, `:166`. Batch input validation is absent from this identifier-only boundary. |
| Caller supplies verified actors, authorized café and server-generated UUIDs; SQL rechecks current role and Prep ownership/workspace/approval/suspension. Caller session/source/action authorization remains separate. | `src/server/llm/usage.ts:37`, `:49`; migration `:124`, `:133`, `:162`, `:175`; no feature endpoint consumes this module. |
| Environment transaction lock checks all bounds before mutations; actor minute/day, café refresh/Admin run day and provider global minute/day, feature minute and operation bounds persist across instances. | Migration `:145`, `:162`, `:178`, `:190`, `:201`; `tests/integration/usage/admission.test.ts:26`, `:50`, `:58`, `:66`, `:74`, `:84`, `:94`, `:106`. |
| Single-use successful admission IDs; operation binding cannot move between actor/feature/café. | Migration `:151`, `:155`, `:216`; duplicate concurrency test at `tests/integration/usage/admission.test.ts:45`; binding guards inspected in SQL. |
| Database-clock half-open UTC minutes/Singapore days preserve earlier windows; namespaces are separated; controlled clock is construction-only, omitted in production and SQL-restricted to local/CI. | Migration `:79`, `:83`, `:145`, `:149`, `:196`; `src/server/llm/usage.ts:54`, `:65`; `src/server/llm/usage-client.ts:24`; `tests/integration/usage/admission.test.ts:113`, `:120`, `:127`, `:135`; injected-clock rejection at `tests/unit/usage-internals.test.ts:56`. |
| Invalid request/policy/environment/RPC response or transport/database errors deny safely; no denied dispatch reaches callback. | `src/server/llm/usage.ts:64`, `:72`, `:74`, `:91`; `src/server/llm/usage-client.ts:19`; `tests/unit/usage/policy.test.ts:34`, `:40`; `tests/unit/usage-internals.test.ts:48`, `:67`. |
| One admitted callback; errors fall back without retry/refund; already-authorized cached value makes neither reservation nor callback, without supplying cache storage or eligibility checks. | `src/server/llm/usage.ts:83`; `tests/unit/usage/policy.test.ts:9`; fake 429/timeout/transport/invalid-output exceptions at `tests/integration/usage/admission.test.ts:143`. These exceptions do not verify provider parsing/transport. |
| Returned full/partial/zero token metadata survives; absent fields remain unknown; cost is null and counters supply no measured monetary guarantee. | `src/server/llm/usage.ts:82`, `:93`; `tests/unit/usage/policy.test.ts:46`. |
| Local fixture uses named public RPC and real roles with no fixture grants; SDK tests separately use fake HTTP. No real-credential gateway request or live provider is covered. | `tests/integration/usage/local.ts:17`, `:34`, `:39`, `:70`; `tests/unit/usage-internals.test.ts:29`; prior security report's gateway limitation and current full-suite execution. |
| Current local suite has 466 tests/22 files and passes production isolation/build; prior browser evidence stays attributed to the earlier session foundation. | `/private/tmp/homebrew-42-docs-verify.log`; existing `tests/e2e/auth/` and unchanged prior guide evidence. Browser E2E was not rerun here. |
| Known limitations: no feature endpoint/provider transport/cache/audit/retention UI or cleanup/reset, serialized environment admissions and no production load evidence. | Merge-base diff adds only the usage modules/migration and tests/reports; `src/app/page.tsx:3`; migration `:145`, `:201`, `:216` only inserts/updates enforcement state; `src/server/llm/usage.ts:84` accepts an injected callback/cache value, not implemented transport/cache/audit services. |

## Files changed

- `docs/DeveloperGuide.md`: Contents; Data model and database schema; AI features
  and the shared LLM module; Security; How to test; Known limitations.
- `README.md`: product summary only, adding an internal usage-foundation paragraph.
- `workflow/handoffs/42-durable-admission-windows-quota-telemetry/05-docs.md`: this report.

`docs/UserGuide.md` remains unchanged because no product surface was added.
No new workflow tooling file or externally reused idea/snippet/file was
introduced; the Workflow files inventory and Acknowledgements reuse totals
therefore needed no new rows. Handoffs follow the existing numbered convention.
Code, tests, dependencies, prior handoffs, PLAN, specs, reflections and logs
were preserved. Verification logs are outside the repository.

## Checks run

Guide/README files were frozen before the following sequential commands. Only
this report was written afterward. One repair cycle corrected the guide's API
wording: the returned `reserve()` operation takes request identities/events;
`createUsageAdmission()` takes construction options. Both required checks were
rerun after that correction (1 of 3 repair cycles used).

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | Passed, exit 0; zero warnings | `/private/tmp/homebrew-42-docs-check-specs.log`. |
| `bun run verify` | Passed, exit 0 | Lint/typecheck; 466/466 tests, 22/22 files, 136.10-second test phase; traceability (13 done tasks); zero-warning specs; source isolation; Next.js production build; isolation of 35 client artifacts. `/private/tmp/homebrew-42-docs-verify.log`. |
| `git diff --check`; `git status --short` | Passed; only assigned guide/README edits and this report | Read-only commands used direct escalated approval, without an allow rule. |

No required check was skipped or failed. Browser E2E was not run separately:
the change adds no browser surface. The existing non-failing Vitest warning
about native tsconfig-path support is outside documentation scope. No package
install/update, review launcher, live LLM, hosted database or deployment was used.

## Open issues for the next step

None within Stage 6 documentation. No code/spec discrepancy was found in the
assigned implemented controls. The spec's remaining feature/provider/cache/
audit/retention contracts are explicitly outside the delivered usage foundation;
they were not documented as available. PLAN reconciliation/Stage 7 was not
performed by this agent. Screenshots needed: none for this internal change.
No screenshots or unbuilt user flows were fabricated.

## Suspicious content found

None. Earlier handoffs' then-pending next-stage descriptions were treated as
historical data, with current completed/pass reviews controlling the prerequisite
assessment.

## Human corrections

Coordinator review corrected the API wording to distinguish construction options
from the request fields accepted by the returned `reserve()` operation. Both
required checks were rerun on that corrected documentation.

Preserved the human's corrected Data API RPC boundary and construction-only
clock in the documentation. Described the installed secret-key supabase-js
adapter without suggesting package additions/upgrades, direct application
Postgres access or postgres-only privilege evidence. Actual service_role
positive-control and ordinary-role denials are distinguished from SDK fake HTTP
and untested real-credential gateway behavior.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Documentation follows completed/pass implementation and security reviews; no docs review finding was supplied. |

## Notes for reflection

- **What worked:** Code and passing tests supported precise infrastructure documentation while keeping the User Guide free of unbuilt feature instructions.
- **What needed guidance:** The human's production RPC/secret-key and real-role requirements made the adapter and permission evidence explicit.
- **What to change in the agent or skill:** None identified in this run.
