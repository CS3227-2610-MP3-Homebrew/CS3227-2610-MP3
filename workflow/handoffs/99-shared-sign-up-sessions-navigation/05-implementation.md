# Implementation report

- **Agent:** implementation
- **Issue:** #100 (T-51), paired with #99 (T-50), review fix round
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8
- **Date:** 2026-10-21
- **Branch:** feat/99-shared-sign-up-sessions-navigation
- **Base commit:** 5f1ebb3abc01c1f058ffd3ba26d0d3831731efc9
- **Status:** completed

## Summary

Addressed functional review findings R1/R2 from `03-reviewer.md` without changing
the committed acceptance tests, fixtures or test configuration. Account profile
reads now explicitly disable PostgREST automatic retries. The read-only
session-client helper accepts an explicit database retry option; account access
opts out while other callers retain their previous defaults. The account HTTP
adapter sets `db.retry: false` for its session-bound client. Auth/session-refresh
options are unchanged.

A request-local fetch wrapper captures only a validated Retry-After value from
Auth responses before the SDK discards response headers. Throttle faults carry
that value through the existing safe HTTP envelope; absent/invalid values are
omitted. Validation accepts nonnegative safe integer delta-seconds and canonical
IMF-fixdate HTTP dates without inventing a delay or consulting the clock. Other
provider headers/bodies never enter the response. Captured state is consumed
once, cleared by later non-throttled Auth responses and isolated per request.

Added 27 supplementary internal unit cases using the real Supabase SDK with fake
fetch transport: profile network/503 request counts on both adapter/access
paths, sign-in/sign-up throttle header cases, and capture consumption/isolation.
Titles contain no criterion IDs; these supplement the existing acceptance suite.
The initial targeted run exposed one mistake in the new fake-response queue;
repair cycle 1 supplied its ordinary success response. The corrected targeted
run passed all 178 tests. No application repair cycles beyond the initial
R1/R2 implementation have been needed. Final full verification passed all 942
tests and later checks; production-browser regression passed all 42 cases on
the same code. Independent review of these fixes remains pending.

The security report `04-security-reviewer.md` is completed with no confirmed
findings/P0/P1. Its deployment/runtime limits and pre-existing proxy cookie
attribute limitation remain unchanged; no proxy cookie remediation is included.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-01.7 / R1 | completed | Account adapter uses PostgREST `db.retry: false`; real-SDK internal tests count exactly one profile request after network and HTTP 503 failure. |
| SYS-02.4 / R1 | completed | Sign-in profile-source failure returns the existing safe 503 after one request; no extra profile fetch/retry is observed. |
| SYS-03.8 / R1 | completed | Account-access resolver explicitly selects retry-disabled reads and returns its retry state after one network/503 profile request. Normal session verification/refresh is preserved. |
| SYS-01.7, SYS-02.4 / R2 | completed | Both registration and sign-in use the real SDK over fake Auth 429 transport; valid delay values are forwarded, absent/invalid values omitted, exact safe messages retained, and no provider-private header forwarded. |
| Existing Shared account/session/navigation behavior | completed | Final full verify passed 942 tests and every later stage; production-browser regression passed 42/42 including real expired-session refresh and six main/kit role matrices. Demo control remains excluded as explicitly recorded below. |
| SYS-02.1 integrated demo control | blocked | Full creation-control integration remains explicitly deferred to T-24/T-25 by the human correction; shared sign-in form ownership is unchanged. |

## Files changed

Changes in this fix round only (the preceding uncommitted implementation and
reports remain present):

- `src/server/auth/account-transport.ts`: server-only Auth header capture and safe Retry-After validation.
- `src/server/auth/account-adapter.ts`: retry-disabled account profile client and request-local transport/fault composition for session and privileged Auth operations.
- `src/server/auth/account-access.ts`: explicit opt-out of database retries for account resolution.
- `src/server/supabase/session-client.ts`: optional database retry setting, preserving defaults for existing callers.
- `src/server/auth/accounts.ts`: same validated Retry-After vocabulary at the final response boundary.
- `tests/unit/account-adapters/transport.test.ts`: 27 supplementary internal real-SDK/fake-transport tests, without criterion IDs.
- This new report; earlier numbered reports are unchanged.

No acceptance tests/fixtures/configuration, dependencies, migrations, UI,
specifications, PLAN, docs or proxy were changed in this fix round.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run test -- tests/unit/account-adapters/transport.test.ts tests/integration/accounts/accounts.test.ts tests/unit/navigation/access.test.ts tests/integration/auth/session-proxy.test.ts` | passed | 4/4 files, 178/178 tests; includes 27 new supplementary cases and existing account/access/proxy coverage. |
| `bun run lint` | passed | Exit 0. |
| `bun run verify` | passed, exit 0 | Lint/typecheck; 36/36 files and 942/942 tests (346.93s); traceability (20 done tasks), specs (0 warnings), production build and source/105-client-artifact isolation all passed. |
| `bun run test:e2e` | passed, exit 0 | 42/42 production-browser cases (40.0s), including 14 existing SYS-05 cases, real cookie refresh, local-session sign-out and all six main/kit role matrices. Both configured production builds succeeded. |
| `git diff --check` | passed | No tracked whitespace errors. |
| Excluded-path scope check | passed | Only the permitted new supplementary unit test appears in tests/configuration/manifest/PLAN/docs status. |

## Open issues for the next step

- Independent review of R1/R2 fixes has not run; implementation completion is not review/deployment approval.
- Full SYS-02.1 demo-control integration remains deferred to its owning tasks, not silently claimed by this fix.
- The security report's pre-existing proxy cookie-attribute/deployment/runtime limitations remain outside this fix's scope and are not represented as remediated.
- No hosted configuration, live provider fault or deployment was tested; transport faults are deterministic fake fetch responses through the installed real SDK.

## Suspicious content found

None.

## Human corrections

The human removed the SYS-02.1 “Create demo kit” presence test at gate 2 in
commit `5f1ebb3` after committing the testing baseline in `7fcf2e8`. T-24 owns
the sign-in creation-control evidence, and T-51 cannot satisfy it before T-25.
This fix preserves that correction and does not restore the removed test or
claim integrated demo-control/provisioning acceptance.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| `03-reviewer.md` | R1 | Fixed | Both account profile-read paths explicitly disable PostgREST retries; four real-SDK transport cases establish one request on network/503 failure. Existing session-refresh behavior/options are unchanged. |
| `03-reviewer.md` | R2 | Fixed | A request-local server fetch wrapper validates/captures the Auth delay before SDK error conversion and passes only it into the throttled fault. Sign-in/sign-up tests cover valid, absent and invalid headers, safe envelopes and omission of provider-private headers. |

Security report `04-security-reviewer.md` reported no confirmed findings/P0/P1;
its facts and limitations were inspected without converting them into new work.

## Notes for reflection

- **What worked:** Real-SDK fake-fetch tests expose transport behavior hidden by dependency-level mocks while preserving acceptance-test ownership.
- **What needed guidance:** Independent review identified retry defaults and discarded provider headers; the human correction remains explicit.
- **What to change in the agent or skill:** None established beyond the need to inspect SDK transport defaults for adapter integration.
