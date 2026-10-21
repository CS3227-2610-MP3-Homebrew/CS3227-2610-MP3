# Testing report

- **Agent:** testing
- **Issue:** #99 (T-50)
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8
- **Date:** 2026-10-21
- **Branch:** feat/99-shared-sign-up-sessions-navigation
- **Base commit:** 5cd29d2cedcafa5394b9aa6a0a32b0c585f2c5ff
- **Status:** completed

## Summary

Authored criterion-named tests for all 28 assigned criteria from the three
approved Shared stories and the Shared account HTTP/browser contracts. Tests
cover observable HTTP results, controlled account/provider effects, differentiated
access resolution, actual production-browser forms and notices, and local
main/kit role sessions/navigation. No application, specification or PLAN changes.

The final verification run passed lint/typecheck, then completed with 140
expected new missing-module failures and 775 existing passing tests. The browser
run completed with 29 new failing-first cases and all 14 existing SYS-05 browser
cases passing. Completed means test authoring and failing-first evidence; the
feature and full verification are not passing or ready to merge.

## Acceptance criteria

Each row describes completed test authoring, not successful feature acceptance.
All new browser cases currently fail because the account pages/routes do not
exist. Account fault cases fail at the missing account-handler module; access
resolution cases require the differentiated access module described below.

| Criterion | Status | Evidence (criterion-prefixed test title/group and expected outcome) |
| --- | --- | --- |
| SYS-01.1 | completed | `sign-up contains only labelled credentials and unselected Customer/owner choices`: minimal labelled inputs, neither role selected, permitted links/options only. |
| SYS-01.2 | completed | `strict sign-up fields reject invalid input`, `valid code-point/UTF-8 boundary password ... is preserved exactly`, and `sign-up invalid local fields ...`: strict body, Zod-style normalized email, roles, 8-code-point minimum/72-byte maximum and preserved passwords; no mutation on denial. |
| SYS-01.3 | completed | `customer/owner registration normalizes email ... main workspace`; `real customer/owner signup sets cookies ...`: exact response, protected main role, persistent cookies and fixed home. |
| SYS-01.4 | completed | `duplicate identity cannot be linked ...`, `concurrent duplicate registration has one winner ...`, real signup HTTP cases: generic 409, one profile, no winner deletion/reassignment. |
| SYS-01.5 | completed | `profile failure performs bounded new-identity cleanup; cleanup success=true/false`: only the newly created ID is removed once, exact 503/500 messages, no access/session, provisional clear in either outcome. |
| SYS-01.6 | completed | `complete profile survives initial-session failure ...` and fixed account-created notice: retained account, no role-session claim, exact sign-in destination/message. |
| SYS-01.7 | completed | `sign-up disables pending repeats ...`, `sign-up network failure ...`, Auth throttle/source/exception groups: one request, retained email/role, cleared password, exact safe feedback/delay rules. |
| SYS-01.8 | completed | `signUp active identity conflict preserves its session even without a valid profile`, real signup HTTP and authenticated account-form navigation: active account unchanged. |
| SYS-01.9 | completed | `signUp` method/Origin/media/JSON/UTF-8-size groups and actual sign-up route cases: exact 405/403/415/400/413, Allow POST, JSON/private-no-store, zero effects. |
| SYS-02.1 | completed | `sign-in minimal fields and sign-up entry`; separate `owning demo-control integration is present ...` case. Presence assertion only; kit provisioning/once-shown credentials remain with T-24/T-25. |
| SYS-02.2 | completed | `sign-in rejects invalid password`, `sign-in rejects unknown ... field`, `existing short/whitespace password ... stays unchanged`, local invalid-input case: strict credentials, no new-account minimum, no overrides. |
| SYS-02.3 | completed | Main/kit × Customer/owner/Admin protected-role integration cases and browser role/session matrix: exact home and profile authority, no role/workspace change or token JSON. |
| SYS-02.4 | completed | `unknown-email/wrong-password yields the same safe credential failure`; sign-in pending/network/throttle/source/exception cases: generic 401, no automatic retry, retained email/cleared password. |
| SYS-02.5 | completed | `absent/invalid protected profile ... clears provisional session without repair`, distinct profile outage, and browser established-identity/missing-profile case: exact unavailable/retry distinction, no home/repair and usable Sign out. |
| SYS-02.6 | completed | Access resolver absent/invalid/revoked/Auth outage groups; browser anonymous/revoked identity and fixed session-ended notice: absent versus expired destinations, safe failure without protected navigation. |
| SYS-02.7 | completed | Six browser main/kit role cases restore persistent cookies into a fresh context; `actual local Supabase expired cookie refresh retains own-role access`: real refresh with local Auth, fixed role home. |
| SYS-02.8 | completed | `sign-out revokes local scope only ...` and `signing out one browser preserves a separately signed-in browser`: local scope, exact response/cookie clearance and subsequent authentication requirement. |
| SYS-02.9 | completed | `failed remote revocation still clears browser session ...` and fixed sign-out-unconfirmed notice: truthful local-clear success alternative. |
| SYS-02.10 | completed | `absent-session sign-out succeeds idempotently ...`, active sign-in conflict, actual absent-session request: residual-cookie clear/idempotent success, active account preserved. |
| SYS-02.11 | completed | Sign-in/sign-out transport groups, exact-empty-object sign-out cases and actual routes: exact shared envelopes/no-store, no effects on denials, content-free errors. |
| SYS-03.1 | completed | Protected profile access cases, six account-handler roles/workspaces and browser role matrix: fixed Customer/owner/Admin homes in existing workspace. |
| SYS-03.2 | completed | Browser anonymous root/role requests and authenticated root/account-form matrix, access absent/session-ended cases: fixed redirects without replacement or role shell. |
| SYS-03.3 | completed | Each browser role matrix visits both other-role homes and expects own home; existing SYS-05 direct GET/POST authorization cases pass without being modified. |
| SYS-03.4 | completed | Customer main/kit browser matrix: Browse cafés/My orders exact links and Sign out; no other-role, contextual-global or stretch navigation. |
| SYS-03.5 | completed | Owner main/kit matrix: five required links, no-café application entry, no fabricated sales/queue data; domain forms/data unclaimed. |
| SYS-03.6 | completed | Admin main/kit matrix: exact moderation/applications/cafés/audit links and Sign out; no other-role/stretch entries. |
| SYS-03.7 | completed | Strict body override denials, browser query-return attempts, fixed notices and unknown HTML notice: fixed own-role destinations, inert unknown notice, no external redirect. |
| SYS-03.8 | completed | Differentiated Auth/profile fault resolution and missing-profile root/account/role browser case: retry/unavailable without fabricated actor/home, no repair/role choice/sign-in loop. |

## Files changed

- `tests/integration/accounts/contracts.ts`: minimal typed fault-test interface and synthetic inputs.
- `tests/integration/accounts/accounts.test.ts`: 125 controlled HTTP/account-effect cases.
- `tests/unit/navigation/access.test.ts`: differentiated Auth/profile access resolution cases using mocked existing Supabase/headers boundaries.
- `tests/e2e/accounts/forms.spec.ts`: accessible forms, local feedback, pending/submission failures and fixed/inert notices.
- `tests/e2e/accounts/http.spec.ts`: actual account route results, transport denials, local registration and active-account cookie preservation.
- `tests/e2e/accounts/local.ts`: local-only CLI configuration, randomized SQL identities/profiles and cleanup; no environment-file reads or credential output.
- `tests/e2e/navigation/roles.spec.ts`: main/kit role navigation, persistent restored sessions, genuine local refresh/revocation, no-café owner state and local-only sign-out.
- `playwright.config.ts`: supplies real local Supabase keys captured from local CLI to the production browser server, allowing real local sessions instead of the earlier synthetic publishable-key placeholder; no hosted targets.
- This report.

No dependency additions; `package.json` and `bun.lock` are unchanged.

## Interfaces defined by tests

Black-box HTTP/browser contracts are primary. Controlled faults need two small
server-only seams; neither accepts request-supplied authority.

1. `src/server/auth/accounts.ts` exports
   `createAccountHandlers(dependencies: AccountDependencies): AccountHandlers`.
   The complete signatures are in `tests/integration/accounts/contracts.ts`.
   Handlers `signUp`, `signIn`, `signOut` accept a standard `Request` and return
   `Promise<Response>`. Trusted construction inputs are `trustedOrigin` and
   `mainWorkspaceId`; effects are current identity, create identity/profile,
   delete newly created identity, sign in, read protected profile, persist/clear
   session, and revoke session with `scope: "local"`. Result faults distinguish
   credentials, duplicate, unavailable, throttled (optional provider delay), and
   unexpected failures. Actor shape is `{id,workspaceId,role}`. This seam asserts
   observable results and bounded side effects, not a Supabase implementation.
2. `src/server/auth/account-access.ts` exports
   `resolveAccountAccess(): Promise<Access>`, using the existing server
   Supabase/session source. `Access` is `{kind:"verified", actor}` or
   `{kind:"anonymous"|"session-ended"|"unavailable"|"retry"}`. Tests mock only
   Auth/profile/cookie sources and assert the specified safe distinctions.

Browser tests use the approved routes and accessible labels. Owner navigation
links whose exact paths are not in the Shared contract are asserted by their
specified visible labels; only the approved `/owner/application` entry is pinned.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:start` | passed | Local Supabase start succeeded; generated credentials omitted. |
| `bun run db:check` | passed | Local catalogue check passed: every application table has RLS. |
| Local fixture smoke checks (kit Admin and main Customer with real local Auth password login) | passed after approved Docker access | Synthetic identity/profile created in each workspace, local Auth login verified, cleanup completed; credentials omitted. Main check was rerun after the database-resetting suite completed. |
| `bun run verify` (first attempt) | failed at lint; corrected | Three `no-assign-module-variable` naming violations in new tests; renamed locals. Later checks not reached in that attempt. |
| `bun run verify` (second attempt) | failed at typecheck; corrected | Test-case header union inferred optional `undefined` values; added explicit `Record<string,string>` typing. Later checks not reached in that attempt. |
| `bun run verify` (final authored tests) | expected failing-first, exit 1 at tests | Lint and typecheck passed. Test files: 2 failed / 33 passed (35); tests: 140 failed / 775 passed (915); duration 320.37s. All 125 account failures are missing `src/server/auth/accounts.ts`; all 15 access failures are missing `src/server/auth/account-access.ts`. No existing test failed. |
| `bun run test:e2e` | expected failing-first, exit 1 | Both configured production builds succeeded; 43 cases collected, 29 new failures on missing account pages/routes, 14 existing SYS-05 browser tests passed; 1.4 minutes. |
| `bun run check:traceability` | passed independently | `Traceability passed (20 done tasks; all listed criteria have test titles).` |
| `bun run check:specs` | passed independently | `Spec check passed (0 warning(s)).` |
| `git diff --check` | passed | No whitespace errors. |

The verification chain stopped at tests, so its later traceability/spec/build
stages were not reached. Independent traceability/spec results and the browser
server's successful builds do not imply the full chain passed. The earlier
lint/type errors were test-authoring errors and were corrected before the final
run; the final failures are exclusively the expected missing implementation.

## Open issues for the next step

- Shared account implementation is absent; all new tests remain failing-first.
- SYS-02.1 demo-control integration has its own presence test. This report claims
  no demo provisioning or credential-panel acceptance and no role-domain content.
- Account/source faults are deterministic at the handler/access seams. Actual
  cookie persistence, refresh, revocation and browser rendering use real local
  Supabase; provider-outage rendering has access-resolution evidence rather than
  a hosted/service-outage browser injection.
- Browser cookie restoration represents reopening with persistent storage;
  no numeric hosted lifetime or custom idle timer is assumed.
- A main-account fixture smoke attempt during the full suite could not query
  local state; the independent repeat after verification completed passed.
- No behavior/permission/public-contract gap or suspicious instruction was found.

## Suspicious content found

None.

## Human corrections

The human authorized delegation through named agents. No test behavior correction.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | Not applicable | Testing precedes implementation and review. |

## Notes for reflection

- **What worked:** Approved Shared HTTP contracts supplied deterministic status,
  message, field and destination expectations; existing local session fixtures
  provided a genuine Auth/refresh approach without hosted access.
- **What needed guidance:** No product decision; local Docker access required
  sandbox approval for the standalone fixture smoke check.
- **What to change in the agent or skill:** None established by this run.
