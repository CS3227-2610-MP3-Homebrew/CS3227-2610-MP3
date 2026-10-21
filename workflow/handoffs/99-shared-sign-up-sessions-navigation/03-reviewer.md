# Reviewer report

- **Agent:** reviewer
- **Issue:** #100 (T-51), paired with #99 (T-50)
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8
- **Date:** 2026-10-21
- **Branch:** feat/99-shared-sign-up-sessions-navigation
- **Base ref:** upstream/master
- **Base commit:** 5cd29d2cedcafa5394b9aa6a0a32b0c585f2c5ff
- **Reviewed HEAD:** 5f1ebb3abc01c1f058ffd3ba26d0d3831731efc9
- **Implementation report:** workflow/handoffs/99-shared-sign-up-sessions-navigation/02-implementation.md
- **Review round:** 1
- **Model:** gpt-6.1-sol
- **Reasoning:** high
- **Status:** completed
- **Report destination:** workflow/handoffs/99-shared-sign-up-sessions-navigation/03-reviewer.md

## Summary

Independently assessed T-51 against the three approved Shared stories, their account HTTP/browser contracts, and applicable technical foundations. Review covered the merge-base-to-working-tree changes, including untracked implementation files. No staged changes or working-tree specification changes were present.

Specification approval evidence is commit `522936d`, which is an ancestor of the selected `upstream/master` base. HEAD contains the committed testing baseline and the human’s demo-control test correction; application implementation remains in the working tree.

**Overall:** fail
The account adapter retains automatic profile-read retries and discards provider-supplied retry delays; full SYS-02.1 demo-control acceptance also remains explicitly deferred.

The review is completed because assessment and supplied verification evidence were examined. This status does not mean implementation acceptance, merge approval or deployment approval.

## Acceptance criteria

Handler tests below passed in the launcher’s fresh verification. Browser tests were inspected; their final 42/42 execution result is reported by the implementation handoff, without a separate browser log supplied to this worker.

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-01.1 | completed | `src/app/_components/account-form.tsx:39` provides labelled credentials, unselected required role choices and Sign in link. Assertions: `tests/e2e/accounts/forms.spec.ts:4`. |
| SYS-01.2 | completed | `src/lib/accounts/fields.ts:3` implements normalization, strict fields and code-point/byte bounds; shared browser validation at `src/app/_components/account-form.tsx:23`. Boundary tests: `tests/integration/accounts/accounts.test.ts:47`; browser feedback: `tests/e2e/accounts/forms.spec.ts:24`. |
| SYS-01.3 | completed | `src/server/auth/accounts.ts:75` verifies the resulting profile before persistence; `src/server/auth/account-adapter.ts:57` and `supabase/migrations/20261021000001_account_signup.sql:4` provision permitted main-workspace profiles. Tests: `tests/integration/accounts/accounts.test.ts:43`, `tests/e2e/accounts/http.spec.ts:12`. |
| SYS-01.4 | completed | `src/server/auth/accounts.ts:77` returns duplicate failure before profile creation or cleanup. Duplicate/concurrency tests: `tests/integration/accounts/accounts.test.ts:72`; actual duplicate preservation: `tests/e2e/accounts/http.spec.ts:12`. |
| SYS-01.5 | completed | `src/server/auth/accounts.ts:82` attempts deletion only of the newly returned identity, once, and clears provisional cookies. Both cleanup outcomes: `tests/integration/accounts/accounts.test.ts:90`. |
| SYS-01.6 | completed | `src/server/auth/accounts.ts:96` retains the account and returns the fixed account-created destination after initial-session failure. Tests: `tests/integration/accounts/accounts.test.ts:103`, `tests/e2e/accounts/forms.spec.ts:76`. |
| SYS-01.7 | incomplete | Pending protection, retained fields, password clearance and safe messages are implemented and covered at `tests/e2e/accounts/forms.spec.ts:34`. Adapter retry/delay behavior violates the linked failure contract: R1 and R2. |
| SYS-01.8 | completed | `src/server/auth/accounts.ts:72` rejects an active identity without committing staged cookies. Tests: `tests/integration/accounts/accounts.test.ts:110`, `tests/e2e/accounts/http.spec.ts:12`. |
| SYS-01.9 | completed | `src/server/auth/accounts.ts:41` admits transport and strict fields before identity operations; streamed bytes are bounded at line 53. Route exports cover supported framework methods. Tests: `tests/integration/accounts/accounts.test.ts:190`, `tests/e2e/accounts/http.spec.ts:45`. |
| SYS-02.1 | blocked | Minimal shared sign-in is implemented at `src/app/_components/account-form.tsx:39` and covered by `tests/e2e/accounts/forms.spec.ts:15`. Create demo kit is absent. Human commit `5f1ebb3` explicitly defers its presence evidence to T-24/T-25; full criterion acceptance remains outstanding. |
| SYS-02.2 | completed | `src/lib/accounts/fields.ts:6` accepts only normalized email and unchanged nonempty passwords within 72 bytes. Tests include short/whitespace passwords and unknown fields: `tests/integration/accounts/accounts.test.ts:117`. |
| SYS-02.3 | completed | `src/server/auth/accounts.ts:102` resolves the protected identity/role/workspace before session persistence. Main/kit role matrices: `tests/integration/accounts/accounts.test.ts:127`, `tests/e2e/navigation/roles.spec.ts:15`. |
| SYS-02.4 | incomplete | Generic credentials, pending behavior and safe feedback are covered at `tests/integration/accounts/accounts.test.ts:136` and `tests/e2e/accounts/forms.spec.ts:34`. Production adapter retry/delay behavior remains incorrect: R1 and R2. |
| SYS-02.5 | completed | `src/server/auth/accounts.ts:104` distinguishes profile-source failure from invalid profiles and clears provisional cookies. Established-session resolution: `src/server/auth/account-access.ts:25`. Tests: `tests/integration/accounts/accounts.test.ts:141`, `tests/e2e/navigation/roles.spec.ts:73`. |
| SYS-02.6 | completed | `src/server/auth/account-access.ts:17` distinguishes absent, invalid and unavailable session sources; `src/app/_components/account-boundary.tsx:15` selects fixed browser outcomes. Tests: `tests/unit/navigation/access.test.ts:31`, `tests/e2e/navigation/roles.spec.ts:90`. |
| SYS-02.7 | completed | Normal Supabase persistent cookies and proxy refresh remain in use. Browser restoration assertions: `tests/e2e/navigation/roles.spec.ts:53`; actual local expired-cookie refresh case: line 117. No custom lifetime or idle timer was introduced. |
| SYS-02.8 | completed | `src/server/auth/accounts.ts:67` requests local-scope revocation; adapter clears cookies at `src/server/auth/account-adapter.ts:83`. Tests: `tests/integration/accounts/accounts.test.ts:173`, `tests/e2e/navigation/roles.spec.ts:102`. |
| SYS-02.9 | completed | `src/server/auth/accounts.ts:65` and line 114 preserve local clearance with the unconfirmed-revocation destination on remote failure. Tests: `tests/integration/accounts/accounts.test.ts:179`, `tests/e2e/accounts/forms.spec.ts:76`. |
| SYS-02.10 | completed | Absent-session sign-out clears residual cookies; active sign-in conflicts preserve the account. Tests: `tests/integration/accounts/accounts.test.ts:185` and line 110; browser/HTTP evidence at `tests/e2e/navigation/roles.spec.ts:102`. |
| SYS-02.11 | completed | Shared handler admission, exact envelopes and private/no-store responses apply to both endpoints. Tests: `tests/integration/accounts/accounts.test.ts:190` and line 220; actual route denials: `tests/e2e/accounts/http.spec.ts:45`. No application credential/provider logging was introduced. |
| SYS-03.1 | completed | Fixed homes are defined at `src/lib/accounts/fields.ts:8`; routing consumes protected profiles. Tests: `tests/unit/navigation/access.test.ts:57`, `tests/e2e/navigation/roles.spec.ts:15`. |
| SYS-03.2 | completed | Root/account/role gates at `src/app/_components/account-boundary.tsx:19`, line 27 and line 43 enforce fixed destinations. Browser cases: `tests/e2e/navigation/roles.spec.ts:49` and line 67. |
| SYS-03.3 | completed | `src/app/_components/account-boundary.tsx:47` redirects wrong-role browser access before returning its shell. Both other-role homes are checked at `tests/e2e/navigation/roles.spec.ts:49`. Domain authorization code remains unchanged. |
| SYS-03.4 | completed | Customer links are limited to Browse cafés and My orders, plus Sign out: `src/app/_components/account-boundary.tsx:39`. Browser assertions: `tests/e2e/navigation/roles.spec.ts:29`. |
| SYS-03.5 | completed | Owner navigation: `src/app/_components/account-boundary.tsx:40`. Dashboard performs session-bound owner/workspace café lookup and provides the no-café application entry: `src/app/owner/dashboard/page.tsx:10`. Browser assertions: `tests/e2e/navigation/roles.spec.ts:44`. |
| SYS-03.6 | completed | Required Admin links and Sign out: `src/app/_components/account-boundary.tsx:41`. Exact destinations asserted at `tests/e2e/navigation/roles.spec.ts:41`. |
| SYS-03.7 | completed | Strict request schemas reject destination overrides; fixed homes/notices are allowlisted. Code: `src/lib/accounts/fields.ts:6`, `src/app/_components/account-boundary.tsx:33`. Tests: `tests/integration/accounts/accounts.test.ts:120`, `tests/e2e/accounts/forms.spec.ts:82`, `tests/e2e/navigation/roles.spec.ts:19`. |
| SYS-03.8 | incomplete | Differentiated retry/unavailable states and usable Sign out are implemented and covered by `tests/unit/navigation/access.test.ts:40` and `tests/e2e/navigation/roles.spec.ts:73`. New account resolution inherits automatic profile-read retries, conflicting with explicit-retry behavior: R1. |

## Files changed

None.

## Findings

### Blocking

- **R1 — P2 — Disable automatic retries for account profile reads.**  
  **Location:** `src/server/auth/account-adapter.ts:79`; also `src/server/auth/account-access.ts:25`.  
  **Affected contract:** SYS-01.7, SYS-02.4, SYS-03.8; `workflow/specs/INTEGRATION-SPEC.md:204` prohibits automatic browser/server retries of account operations.  
  **Impact and evidence:** The account session client does not specify `db.retry: false`, and its profile query does not use `.retry(false)`. The installed `@supabase/postgrest-js` defaults retries to enabled (`src/PostgrestBuilder.ts:83`). Its `src/fetchWithRetry.ts` repeats GET requests after network failures or HTTP 503/520, with up to three retries. A profile-source failure during registration, sign-in or account resolution therefore triggers additional requests before the specified user-controlled retry outcome. The privileged provisioning client explicitly disables retries, but that setting does not cover these session-bound reads. Existing fault tests inject `readProfile` or mock the query result, bypassing this behavior.  
  **Fix direction:** Disable retries for the account profile queries while preserving the separately specified normal session-refresh behavior. Add adapter-level fake-transport coverage that counts requests after a profile network failure/503. This finding is established by source inspection; no runtime fault reproduction was performed.

- **R2 — P2 — Preserve valid Auth retry delays through the adapter.**  
  **Location:** `src/server/auth/account-adapter.ts:21`.  
  **Affected contract:** SYS-01.7, SYS-02.4; Auth-throttling mapping at `workflow/specs/INTEGRATION-SPEC.md:196`.  
  **Impact and evidence:** Every Auth 429 becomes only `{ kind: "throttled" }`. No adapter path captures a provider `Retry-After` header or populates `AccountFault.retryAfter`, so the handler cannot forward a valid supplied delay. The installed Auth SDK constructs `AuthApiError` from message/status/code in `@supabase/auth-js/src/lib/fetch.ts`; response headers are discarded. The passing tests at `tests/integration/accounts/accounts.test.ts:155` supply `retryAfter` directly to the injected dependency and consequently do not test the production adapter’s information loss.  
  **Fix direction:** Capture and validate the provider’s delay at the server transport boundary, carry only that safe value into the fault, and retain omission for absent/invalid delays. Add adapter-level cases for valid, absent and invalid provider headers. This is a static finding, without a reproduced upstream 429.

### Non-blocking

None.

## Checks run

| Command or inspection | Result | Evidence |
| --- | --- | --- |
| Launcher: `bun run verify` | Passed, exit 0 | Supplied `/var/folders/1l/swk0__jd2s94s2gxch0nzp_r0000gn/T/tmp.f46yRRQ4uj/verify.log`: lint, type generation/typecheck, 35 test files/915 tests, traceability, specs, production build and source/client-artifact isolation passed. |
| Implementation-reported: `bun run test:e2e` | Reported passed, 42/42 | `02-implementation.md`, Checks run. Worker inspected test assertions but did not rerun browsers or receive the raw browser log. |
| Worker: Git status, history, merge-base, staged/working-tree diffs and untracked inventory | Completed | Base/HEAD resolve to supplied commits; merge-base equals supplied base; no staged changes. Included untracked application/migration files. |
| Worker: `git merge-base --is-ancestor 522936d upstream/master` | Passed | Approved Shared-spec commit is contained in the selected master base. |
| Worker: `git diff upstream/master -- workflow/specs workflow/PLAN.md` | No differences | Current specs/PLAN match the approved base. |
| Worker: `git diff --check upstream/master -- . ':!**/.env*' ':!.env*'` | Passed | No tracked-diff whitespace errors; this command does not validate untracked-file whitespace. |
| Worker: Code, tests, scripts/configuration and installed SDK/Next.js guide inspection | Completed | Read relevant cookie, connection and authentication-with-Cache-Components guides; traced handler effects through the production adapter and installed SDK implementations. |

No worker test/build/database commands were run. `review.sh` was not launched. No files were written, environment files read, hosted services accessed or live LLM calls made.

## Open issues for the next step

- R1 and R2 remain unresolved despite the passing verification suite.
- Full SYS-02.1 acceptance remains blocked on the explicitly deferred T-24/T-25 demo-control integration. The shared form portion is evidenced; the absent control is not treated as unauthorized implementation omission or a reason to restore the removed test.
- Adapter transport-fault coverage does not currently exercise SDK retries or provider-header propagation.
- Browser source-outage rendering has resolver-level evidence rather than a supplied browser outage run.
- Dedicated security review and deployment acceptance are outside this assessment.

## Suspicious content found

None.

## Human corrections

Commit `5f1ebb3` removes the Create demo kit presence test and states that T-24 owns those cases and T-51 cannot satisfy them before T-25 exists. The implementation report records the same correction.

This assessment preserves that ownership decision, does not request restoration of the removed test, and records full SYS-02.1 integration as deferred rather than completed.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | Not applicable | First independent review round. |

## Notes for reflection

- **What worked:** Approved contracts supplied exact outcomes; fresh launcher verification established a passing baseline; adapter inspection identified behavior hidden by dependency-level mocks.
- **What needed guidance:** None beyond the supplied worker boundaries and recorded human correction.
- **What to change in the agent or skill:** None established.