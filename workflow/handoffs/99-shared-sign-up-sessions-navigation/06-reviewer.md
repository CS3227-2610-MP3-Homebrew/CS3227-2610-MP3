# Reviewer report

- **Agent:** reviewer
- **Issue:** #100 (T-51), paired with #99 (T-50)
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8
- **Date:** 2026-10-21
- **Branch:** feat/99-shared-sign-up-sessions-navigation
- **Base ref:** upstream/master
- **Base commit:** 5cd29d2cedcafa5394b9aa6a0a32b0c585f2c5ff
- **Reviewed HEAD:** 5f1ebb3abc01c1f058ffd3ba26d0d3831731efc9
- **Implementation report:** workflow/handoffs/99-shared-sign-up-sessions-navigation/05-implementation.md
- **Review round:** 2
- **Model:** gpt-6.1-sol
- **Reasoning:** high
- **Status:** completed
- **Report destination:** workflow/handoffs/99-shared-sign-up-sessions-navigation/06-reviewer.md

## Summary

Independently reviewed the merge-base-to-working-tree changes, including untracked application, migration and supplementary test files. Assessment covered all 28 approved story criteria, linked account contracts, relevant technical foundations, existing acceptance tests and the round-2 adapter fixes. No staged changes or working-tree spec/PLAN changes were present.

Approval evidence is Shared-spec commit `522936d95e56348a731a575e387d5539fe6e1c26`, contained in the selected master base. The merge base equals the supplied base commit. HEAD contains the testing baseline and human demo-control correction; application implementation remains uncommitted.

R1 and R2 are resolved by the current implementation and meaningful real-SDK/fake-transport tests. No additional functional defect was confirmed.

**Overall:** fail
Full SYS-02.1 acceptance remains blocked on the explicitly deferred Create demo kit integration, although the adapter fixes and supplied verification pass.

Review status is completed because the assessment and required verification evidence were examined. It does not mean implementation acceptance, merge approval or deployment approval.

## Acceptance criteria

The launcher’s fresh verification passed the unit/integration suite. Browser assertions were inspected; their final 42/42 execution is implementation-reported, without a separate browser execution log supplied to this worker.

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-01.1 | completed | `src/app/_components/account-form.tsx:39` provides labelled credentials, required unselected Customer/owner choices and Sign in link. Browser assertions: `tests/e2e/accounts/forms.spec.ts:4`. |
| SYS-01.2 | completed | `src/lib/accounts/fields.ts:3` implements normalized email, strict fields, code-point minimum and UTF-8 byte maximum; browser validation uses the same schemas at `src/app/_components/account-form.tsx:23`. Boundary assertions: `tests/integration/accounts/accounts.test.ts:50`; browser feedback: `tests/e2e/accounts/forms.spec.ts:24`. |
| SYS-01.3 | completed | `src/server/auth/accounts.ts:76` verifies account/profile/session before persistence. `src/server/auth/account-adapter.ts:62` and `supabase/migrations/20261021000001_account_signup.sql:4` provision only permitted main-workspace profiles. Tests: `tests/integration/accounts/accounts.test.ts:42`, `tests/e2e/accounts/http.spec.ts:11`. |
| SYS-01.4 | completed | `src/server/auth/accounts.ts:78` stops on duplicate identity failure before profile creation or compensation. Duplicate/concurrency assertions: `tests/integration/accounts/accounts.test.ts:72`; actual existing-profile preservation: `tests/e2e/accounts/http.spec.ts:33`. |
| SYS-01.5 | completed | `src/server/auth/accounts.ts:84` attempts cleanup once using only the newly returned identity and clears provisional cookies. Both cleanup outcomes: `tests/integration/accounts/accounts.test.ts:90`. |
| SYS-01.6 | completed | `src/server/auth/accounts.ts:90` retains the completed account after initial-session failure and returns the fixed account-created destination. Tests: `tests/integration/accounts/accounts.test.ts:103`, `tests/e2e/accounts/forms.spec.ts:76`. |
| SYS-01.7 | completed | Pending protection, retained fields and password clearance: `src/app/_components/account-form.tsx:19`, `tests/e2e/accounts/forms.spec.ts:34`. Retry-disabled profile reads: `src/server/auth/account-adapter.ts:41`. Validated throttle delay forwarding: `src/server/auth/account-transport.ts:4`, `src/server/auth/accounts.ts:38`. Real-SDK fault assertions: `tests/unit/account-adapters/transport.test.ts:38` and `:70`. R1/R2 resolved. |
| SYS-01.8 | completed | `src/server/auth/accounts.ts:74` rejects an active identity before account mutation or session commitment. Tests: `tests/integration/accounts/accounts.test.ts:110`, `tests/e2e/accounts/http.spec.ts:24`. |
| SYS-01.9 | completed | `src/server/auth/accounts.ts:43` checks method, exact Origin, media, actual streamed bytes and strict fields before identity operations. Route handlers export supported framework methods. Tests: `tests/integration/accounts/accounts.test.ts:190`, `tests/e2e/accounts/http.spec.ts:43`. |
| SYS-02.1 | blocked | Shared minimal sign-in is implemented at `src/app/_components/account-form.tsx:39` and tested at `tests/e2e/accounts/forms.spec.ts:15`. Create demo kit is absent. Human commit `5f1ebb3` defers presence evidence to T-24/T-25; full criterion acceptance remains outstanding. See R3. |
| SYS-02.2 | completed | `src/lib/accounts/fields.ts:6` accepts only normalized email and unchanged nonempty passwords within 72 bytes. Invalid, unknown-field and short/whitespace-password assertions: `tests/integration/accounts/accounts.test.ts:117`; browser validation: `tests/e2e/accounts/forms.spec.ts:24`. |
| SYS-02.3 | completed | `src/server/auth/accounts.ts:103` resolves and validates the protected profile before committing the session or selecting its fixed home. Main/kit role matrices: `tests/integration/accounts/accounts.test.ts:127`, `tests/e2e/navigation/roles.spec.ts:15`. |
| SYS-02.4 | completed | Generic credentials and safe failures: `tests/integration/accounts/accounts.test.ts:136`; pending/network behavior: `tests/e2e/accounts/forms.spec.ts:34`. Production adapter single-request and throttle-header behavior now has real-SDK coverage at `tests/unit/account-adapters/transport.test.ts:38` and `:70`. R1/R2 resolved. |
| SYS-02.5 | completed | `src/server/auth/accounts.ts:106` distinguishes profile-source failures from invalid profiles and clears provisional cookies. Established-session resolution: `src/server/auth/account-access.ts:25`. Tests: `tests/integration/accounts/accounts.test.ts:141`, `tests/e2e/navigation/roles.spec.ts:73`. |
| SYS-02.6 | completed | `src/server/auth/account-access.ts:17` distinguishes absent, invalid and unavailable session sources. `src/app/_components/account-boundary.tsx:15` selects fixed browser outcomes. Tests: `tests/unit/navigation/access.test.ts:31`, `tests/e2e/navigation/roles.spec.ts:67` and `:90`. |
| SYS-02.7 | completed | Normal persistent cookies and proxy refresh remain in use without a custom session lifetime. Browser restoration assertions: `tests/e2e/navigation/roles.spec.ts:53`; actual local expired-cookie refresh: `:117`. Database retry options do not change Auth refresh options. |
| SYS-02.8 | completed | `src/server/auth/accounts.ts:67` requests local-scope revocation and clears local cookies through `src/server/auth/account-adapter.ts:88`. Tests: `tests/integration/accounts/accounts.test.ts:173`, `tests/e2e/navigation/roles.spec.ts:102`. |
| SYS-02.9 | completed | `src/server/auth/accounts.ts:69` and `:115` preserve local clearance with the fixed unconfirmed-revocation destination on remote failure. Tests: `tests/integration/accounts/accounts.test.ts:179`, `tests/e2e/accounts/forms.spec.ts:76`. |
| SYS-02.10 | completed | Absent-session sign-out clears residual cookies; active sign-in conflicts preserve the account. Tests: `tests/integration/accounts/accounts.test.ts:185` and `:110`; actual HTTP assertions: `tests/e2e/accounts/http.spec.ts:24`, `tests/e2e/navigation/roles.spec.ts:113`. |
| SYS-02.11 | completed | Shared handler admission, exact response envelopes and private/no-store responses apply to both endpoints. No application credential/provider logging was introduced. Tests: `tests/integration/accounts/accounts.test.ts:190` and `:220`; actual transport denials: `tests/e2e/accounts/http.spec.ts:43`. |
| SYS-03.1 | completed | Fixed homes are defined at `src/lib/accounts/fields.ts:8` and selected from verified profiles. Tests: `tests/unit/navigation/access.test.ts:57`, `tests/e2e/navigation/roles.spec.ts:15`. |
| SYS-03.2 | completed | Root, account-entry and role gates at `src/app/_components/account-boundary.tsx:19`, `:27` and `:43` enforce specified destinations. Browser assertions: `tests/e2e/navigation/roles.spec.ts:49` and `:67`. |
| SYS-03.3 | completed | `src/app/_components/account-boundary.tsx:47` redirects wrong-role access before returning the requested shell. Both other-role homes are checked at `tests/e2e/navigation/roles.spec.ts:49`. Existing domain authorization remains unchanged. |
| SYS-03.4 | completed | Customer navigation contains Browse cafés, My orders and Sign out at `src/app/_components/account-boundary.tsx:39`. Exact destinations and excluded links: `tests/e2e/navigation/roles.spec.ts:29` and `:36`. |
| SYS-03.5 | completed | Owner navigation is defined at `src/app/_components/account-boundary.tsx:40`. `src/app/owner/dashboard/page.tsx:10` independently verifies the owner and uses a session-bound owner/workspace café query before displaying the no-café application entry. Browser assertions: `tests/e2e/navigation/roles.spec.ts:44`. |
| SYS-03.6 | completed | Admin navigation and Sign out use the specified entries at `src/app/_components/account-boundary.tsx:41`. Exact paths: `tests/e2e/navigation/roles.spec.ts:41`. |
| SYS-03.7 | completed | Strict credential schemas reject destination overrides; role homes, notices and browser navigation use fixed allowlists. Code: `src/lib/accounts/fields.ts:6`, `src/app/_components/account-boundary.tsx:33`. Tests: `tests/integration/accounts/accounts.test.ts:120`, `tests/e2e/accounts/forms.spec.ts:82`, `tests/e2e/navigation/roles.spec.ts:19`. |
| SYS-03.8 | completed | `src/server/auth/account-access.ts:18` explicitly disables profile-read retries and returns differentiated retry/unavailable states. Failure rendering at `src/app/_components/account-boundary.tsx:12` exposes no role shell and retains Sign out for unavailable accounts. Tests: `tests/unit/navigation/access.test.ts:40`, `tests/unit/account-adapters/transport.test.ts:38`, `tests/e2e/navigation/roles.spec.ts:73`. R1 resolved. |

## Files changed

None.

## Findings

### Blocking

- **R3 — P2 — Full demo-control integration remains unavailable.**  
  **Location:** `src/app/_components/account-form.tsx:51`; `workflow/specs/stories/SYS-02-sign-in-out.md:31`.  
  **Affected criterion/contract:** SYS-02.1; T-51’s full integrated acceptance.  
  **Impact:** The shared sign-in form is usable, but full criterion acceptance cannot be established because its required Create demo kit control is absent.  
  **Evidence:** The form ends with the Sign up link. `tests/e2e/accounts/forms.spec.ts:15` tests only the minimal shared form. Human commit `5f1ebb3` explicitly removed the separate presence test and assigned its evidence to T-24/T-25. `05-implementation.md` correctly records the criterion as blocked.  
  **Fix direction:** Resolve the integration and presence evidence through its owning T-24/T-25 work before claiming full SYS-02.1 acceptance. This finding preserves the human ownership decision and does not request restoration of the removed test within this fix round.

### Non-blocking

None.

## Checks run

| Command or inspection | Result | Evidence |
| --- | --- | --- |
| Launcher: `bun run verify` | Passed, exit 0 | Supplied `/var/folders/1l/swk0__jd2s94s2gxch0nzp_r0000gn/T/tmp.3tjsAIW7yU/verify.log`: lint, type generation/typecheck, 36 files/942 tests, traceability, specs, production build and source/105-client-artifact isolation all passed. |
| Implementation-reported: `bun run test:e2e` | Reported passed, 42/42 | `05-implementation.md`, Checks run. Browser assertions were inspected; the worker did not rerun browsers or receive the raw browser log. |
| Worker: Git status, HEAD/base resolution, merge-base and tracked/untracked diff inspection | Completed | Supplied HEAD/base match local refs; merge-base equals the supplied base. Included untracked implementation, migration and supplementary tests. No staged changes. |
| Worker: `git merge-base --is-ancestor 522936d upstream/master` | Passed | Approved Shared-spec commit is contained in the selected master base. |
| Worker: `git diff upstream/master -- workflow/specs workflow/PLAN.md` | No differences | Working-tree specs and PLAN match the approved base. |
| Worker: `git diff HEAD -- tests playwright.config.ts vitest.config.mts` | No tracked differences | Committed acceptance tests/configuration remain unchanged after the human correction. New supplementary tests were inspected separately. |
| Worker: `git diff --check upstream/master -- . ':!**/.env*' ':!.env*'` | Passed | No tracked whitespace errors. This does not validate untracked-file whitespace. |
| Worker: Code, tests, migrations, configuration and installed framework/SDK inspection | Completed | Traced all criteria and R1/R2 through implementation and meaningful assertions. Read installed Next.js authentication-with-Cache-Components, cookies, connection and route-handler guidance; inspected Supabase database retry propagation. |

No worker test, build or database commands were run. `review.sh` was not launched. No files were written, environment files read, hosted services accessed or live LLM calls made. No provider fault was reproduced independently at runtime.

## Open issues for the next step

- Full SYS-02.1 acceptance remains blocked on the deferred T-24/T-25 demo-control integration.
- Browser execution is supported by the implementation report rather than a separately supplied execution log. Browser source-outage rendering has resolver/component inspection evidence rather than an independently observed browser outage run.
- The existing security report predates the round-2 adapter changes. This functional assessment does not substitute for a security review of those changes.
- Hosted Auth settings, deployed Origin configuration, TLS/HSTS and live provider behavior were not assessed. The pre-existing proxy cookie-attribute limitation recorded in `04-security-reviewer.md` remains outside these fixes.
- Role entry pages remain shells; domain behavior is not accepted by this review.

## Suspicious content found

None.

## Human corrections

Human commit `5f1ebb3` removed the SYS-02.1 Create demo kit presence test and states that T-24 owns those cases and T-51 cannot satisfy them before T-25 exists.

This assessment preserves that ownership decision, does not request restoration of the removed test, and records full SYS-02.1 acceptance as blocked.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| `03-reviewer.md` | R1 | Fixed | `src/server/auth/account-adapter.ts:41` disables database retries. `src/server/auth/account-access.ts:18` explicitly requests retry-disabled reads through `src/server/supabase/session-client.ts:14`. Four real-SDK cases at `tests/unit/account-adapters/transport.test.ts:38` count exactly one profile request after network/503 failures across both paths. Launcher verification passes. |
| `03-reviewer.md` | R2 | Fixed | Request-local transport capture at `src/server/auth/account-transport.ts:17` preserves only a validated Auth retry delay before SDK error conversion. Adapter fault composition and final response validation forward it safely. Real-SDK sign-in/sign-up cases at `tests/unit/account-adapters/transport.test.ts:70` cover valid, absent and invalid delays; `:84` covers isolation, consumption and clearing. Launcher verification passes. |

## Notes for reflection

- **What worked:** Real-SDK fake-transport assertions close the integration gaps previously hidden by dependency-level mocks.
- **What needed guidance:** The existing human correction establishes demo-control ownership while leaving full criterion acceptance explicitly deferred.
- **What to change in the agent or skill:** None established by this round.