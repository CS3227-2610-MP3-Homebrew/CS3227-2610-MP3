# Reviewer report

- **Agent:** reviewer
- **Issue:** #100 (T-51), paired with #99 (T-50)
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8
- **Date:** 2026-10-21
- **Branch:** feat/99-shared-sign-up-sessions-navigation
- **Base ref:** upstream/master
- **Base commit:** 861b6a819d9cdd93b6ac69faa85ff84861936b3c
- **Reviewed HEAD:** 6c47ff65d64e100bcf42665ba37760a8a352eb8f
- **Implementation report:** workflow/handoffs/99-shared-sign-up-sessions-navigation/05-implementation.md
- **Review round:** 3
- **Model:** gpt-6.1-sol
- **Reasoning:** high
- **Status:** completed
- **Report destination:** workflow/handoffs/99-shared-sign-up-sessions-navigation/07-reviewer.md

## Summary

Independently assessed T-51’s account/session/navigation implementation against all 28 approved criteria, linked integration contracts and relevant technical foundations. Inspected the merge-base-to-working-tree changes, including untracked implementation, migration and supplementary test files. No staged changes or working-tree spec/PLAN changes were present.

Approval evidence includes Shared-spec commit `522936d95e56348a731a575e387d5539fe6e1c26` and contract clarification `af34cb4e80ae01af86ff8c4f2ee109841e1e9186`, both contained in the selected master base. PR #124 merged the clarification in `861b6a8`; reviewed HEAD incorporates that base. The approved SYS-02.1 and T-51 contract now explicitly assign Create demo kit presence to SYS-12.4/T-24/T-25.

R1 and R2 remain resolved by the current code and meaningful SDK transport tests. R3 is resolved by the approved contract clarification. No additional blocking functional finding was confirmed.

**Overall:** pass
All 28 in-scope criteria are supported by implementation and meaningful tests, the supplied verification passed, and the previous demo-control blocker no longer belongs to SYS-02.1 acceptance.

This review does not approve a merge or deployment.

## Acceptance criteria

The launcher’s fresh verification passed all unit/integration tests. Browser assertions were inspected; their 42/42 execution is reported in `05-implementation.md`, without a separate raw browser log supplied to this worker.

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-01.1 | completed | `src/app/_components/account-form.tsx:39` renders labelled credentials, unselected required Customer/owner choices and the Sign in link. Minimal fields/options are asserted at `tests/e2e/accounts/forms.spec.ts:4`. |
| SYS-01.2 | completed | `src/lib/accounts/fields.ts:3` implements email normalization, strict fields, password code-point/UTF-8 bounds and permitted roles. Browser validation reuses the schemas at `src/app/_components/account-form.tsx:23`. Invalid and boundary cases: `tests/integration/accounts/accounts.test.ts:63` and `:67`; browser feedback: `tests/e2e/accounts/forms.spec.ts:24`. |
| SYS-01.3 | completed | `src/server/auth/accounts.ts:76` completes identity/profile/session validation before persistence and role-home success. `src/server/auth/account-adapter.ts:62` and `supabase/migrations/20261021000001_account_signup.sql:4` provision permitted main-workspace profiles. Tests: `tests/integration/accounts/accounts.test.ts:42`, `tests/e2e/accounts/http.spec.ts:11`. |
| SYS-01.4 | completed | Identity-creation failure stops registration before profile mutation or compensation at `src/server/auth/accounts.ts:78`. Duplicate/concurrency assertions: `tests/integration/accounts/accounts.test.ts:71` and `:76`; existing-profile preservation: `tests/e2e/accounts/http.spec.ts:33`. |
| SYS-01.5 | completed | `src/server/auth/accounts.ts:84` attempts cleanup once using only the newly returned identity, clears provisional cookies and distinguishes cleanup outcomes. Both outcomes and bounded effects are asserted at `tests/integration/accounts/accounts.test.ts:90`. |
| SYS-01.6 | completed | `src/server/auth/accounts.ts:90` retains a completed account after initial-session failure, clears incomplete cookies and returns the fixed account-created destination. Tests: `tests/integration/accounts/accounts.test.ts:103`, `tests/e2e/accounts/forms.spec.ts:76`. |
| SYS-01.7 | completed | Pending/repeat protection and retained fields/password clearance: `src/app/_components/account-form.tsx:19`, `tests/e2e/accounts/forms.spec.ts:34` and `:56`. Retry-disabled profile reads: `src/server/auth/account-adapter.ts:41`. Validated throttle delay: `src/server/auth/account-transport.ts:4`, `src/server/auth/accounts.ts:38`. Real-SDK assertions: `tests/unit/account-adapters/transport.test.ts:39` and `:71`. |
| SYS-01.8 | completed | `src/server/auth/accounts.ts:74` rejects an active identity before account mutation or session commitment. Tests: `tests/integration/accounts/accounts.test.ts:110`, `tests/e2e/accounts/http.spec.ts:24`; authenticated form redirects: `tests/e2e/navigation/roles.spec.ts:49`. |
| SYS-01.9 | completed | `src/server/auth/accounts.ts:43` checks method, exact Origin, media, streamed byte limit and strict fields before identity operations. `src/app/api/auth/sign-up/route.ts:4` exports supported methods through this handler. Transport assertions: `tests/integration/accounts/accounts.test.ts:190`, `tests/e2e/accounts/http.spec.ts:44`. |
| SYS-02.1 | completed | `src/app/_components/account-form.tsx:39` provides labelled credentials, Sign in and Sign up without role/workspace/Remember me controls. Assertions: `tests/e2e/accounts/forms.spec.ts:15`. Approved clarification `af34cb4`, merged through `861b6a8`, assigns demo-control presence to SYS-12.4/T-24/T-25 and explicitly excludes it from T-51 acceptance. |
| SYS-02.2 | completed | `src/lib/accounts/fields.ts:6` accepts only normalized email and unchanged nonempty passwords within 72 UTF-8 bytes. Strict fields and short/whitespace passwords: `tests/integration/accounts/accounts.test.ts:117`, `:120` and `:123`; browser feedback: `tests/e2e/accounts/forms.spec.ts:24`. |
| SYS-02.3 | completed | `src/server/auth/accounts.ts:103` validates the protected profile before session commitment and fixed role-home selection. Main/kit role matrices: `tests/integration/accounts/accounts.test.ts:128`, `tests/e2e/navigation/roles.spec.ts:16`. |
| SYS-02.4 | completed | Generic credential failures: `tests/integration/accounts/accounts.test.ts:136`. Pending/network behavior: `tests/e2e/accounts/forms.spec.ts:34` and `:56`. Safe provider failures and throttles: `tests/integration/accounts/accounts.test.ts:155` and `:165`; real-SDK request counts/header propagation: `tests/unit/account-adapters/transport.test.ts:39` and `:71`. |
| SYS-02.5 | completed | `src/server/auth/accounts.ts:106` distinguishes profile-source failure from invalid profiles and clears provisional cookies. Established-account resolution: `src/server/auth/account-access.ts:25`. Tests: `tests/integration/accounts/accounts.test.ts:141` and `:148`, `tests/e2e/navigation/roles.spec.ts:73`. |
| SYS-02.6 | completed | `src/server/auth/account-access.ts:17` distinguishes absent, invalid and unavailable session sources. `src/app/_components/account-boundary.tsx:15` selects fixed browser outcomes. Tests: `tests/unit/navigation/access.test.ts:31`, `:35` and `:40`; browser cases: `tests/e2e/navigation/roles.spec.ts:67` and `:90`. |
| SYS-02.7 | completed | Normal persistent cookies and proxy refresh remain in use without a custom lifetime or Remember me setting. Persistent-storage restoration is asserted at `tests/e2e/navigation/roles.spec.ts:53`; actual local expired-cookie refresh at `:117`. Database retry options preserve existing Auth refresh options. |
| SYS-02.8 | completed | `src/server/auth/accounts.ts:67` requests local-scope revocation and clears browser cookies through `src/server/auth/account-adapter.ts:88`. Tests: `tests/integration/accounts/accounts.test.ts:173`, `tests/e2e/navigation/roles.spec.ts:102`; subsequent protected access is checked in the role matrix. |
| SYS-02.9 | completed | `src/server/auth/accounts.ts:69` and `:116` retain local clearance and return the fixed unconfirmed-revocation destination on remote failure. Tests: `tests/integration/accounts/accounts.test.ts:179`, `tests/e2e/accounts/forms.spec.ts:76`. |
| SYS-02.10 | completed | Absent-session sign-out clears residual cookies; active sign-in conflicts preserve the account. Tests: `tests/integration/accounts/accounts.test.ts:185` and `:110`; HTTP/browser assertions: `tests/e2e/accounts/http.spec.ts:24`, `tests/e2e/navigation/roles.spec.ts:113`. |
| SYS-02.11 | completed | Shared handler admission and exact private/no-store envelopes cover both endpoints. No application credential/provider logging was introduced. Tests: `tests/integration/accounts/accounts.test.ts:190` and `:220`; actual transport denials: `tests/e2e/accounts/http.spec.ts:44`. |
| SYS-03.1 | completed | `src/lib/accounts/fields.ts:8` defines fixed homes selected from verified profiles. Tests: `tests/unit/navigation/access.test.ts:57`, `tests/integration/accounts/accounts.test.ts:128`, `tests/e2e/navigation/roles.spec.ts:16`. |
| SYS-03.2 | completed | Root, account-entry and role gates at `src/app/_components/account-boundary.tsx:19`, `:27` and `:43` select specified destinations. Browser assertions: `tests/e2e/navigation/roles.spec.ts:49` and `:67`. |
| SYS-03.3 | completed | `src/app/_components/account-boundary.tsx:47` redirects wrong-role requests before returning the requested shell. Both other-role homes are exercised at `tests/e2e/navigation/roles.spec.ts:49`. Existing domain authorization remains unchanged. |
| SYS-03.4 | completed | Customer navigation contains Browse cafés, My orders and Sign out at `src/app/_components/account-boundary.tsx:39`. Required/excluded entries and exact destinations: `tests/e2e/navigation/roles.spec.ts:29` and `:36`. |
| SYS-03.5 | completed | Owner navigation is defined at `src/app/_components/account-boundary.tsx:40`. `src/app/owner/dashboard/page.tsx:10` independently verifies owner access before a session-bound owner/workspace café query and displays the minimal no-café application entry. Browser assertions: `tests/e2e/navigation/roles.spec.ts:44`. |
| SYS-03.6 | completed | Admin navigation has the specified entries and Sign out at `src/app/_components/account-boundary.tsx:41`. Exact paths and excluded other-role entries: `tests/e2e/navigation/roles.spec.ts:29` and `:41`. |
| SYS-03.7 | completed | Strict credential schemas reject destination overrides; role homes and notices use fixed allowlists. Code: `src/lib/accounts/fields.ts:6`, `src/app/_components/account-boundary.tsx:33`. Tests: `tests/integration/accounts/accounts.test.ts:120`, `tests/e2e/accounts/forms.spec.ts:82`, `tests/e2e/navigation/roles.spec.ts:19`. |
| SYS-03.8 | completed | `src/server/auth/account-access.ts:18` disables profile-read retries and distinguishes retry/unavailable states. `src/app/_components/account-boundary.tsx:12` exposes no protected shell and retains Sign out for unavailable accounts. Tests: `tests/unit/navigation/access.test.ts:40`, `:49` and `:53`, `tests/unit/account-adapters/transport.test.ts:39`, `tests/e2e/navigation/roles.spec.ts:73`. |

## Files changed

None.

## Findings

### Blocking

None.

### Non-blocking

None.

## Checks run

| Command or inspection | Result | Evidence |
| --- | --- | --- |
| Launcher: `bun run verify` | Passed, exit 0 | Supplied `/var/folders/1l/swk0__jd2s94s2gxch0nzp_r0000gn/T/tmp.aTrGJ6D8ld/verify.log`: lint, type generation/typecheck, 36 files/942 tests, traceability, specs, production build and source/105-client-artifact isolation passed. |
| Implementation-reported: `bun run test:e2e` | Reported passed, 42/42 | `05-implementation.md`, Checks run. Worker inspected browser assertions but did not rerun browsers or receive a separate raw browser log. |
| Worker: Git status, HEAD/base resolution, merge-base, tracked diffs and untracked-file inspection | Completed | Local HEAD/base match supplied commits; merge-base equals supplied base. Included untracked implementation, migration and supplementary tests. No staged changes. |
| Worker: `git merge-base --is-ancestor 522936d95e56348a731a575e387d5539fe6e1c26 upstream/master` | Passed, exit 0 | Original approved Shared contracts are contained in the selected master base. |
| Worker: `git merge-base --is-ancestor af34cb4e80ae01af86ff8c4f2ee109841e1e9186 upstream/master` | Passed, exit 0 | Demo-control contract clarification is contained in the selected master base; merge evidence is PR #124 at `861b6a8`. |
| Worker: `git diff upstream/master -- workflow/specs workflow/PLAN.md` | No differences | Working-tree contracts and PLAN match the approved base. |
| Worker: `git diff HEAD -- tests playwright.config.ts vitest.config.mts` | No tracked differences | Committed acceptance tests/configuration remain unchanged. Supplementary untracked tests were inspected separately. |
| Worker: `git diff --check upstream/master -- . ':(exclude)**/.env*'` | Passed, exit 0 | No tracked whitespace errors; this does not check untracked-file whitespace. |
| Worker: implementation, tests, migration, configuration and installed framework/SDK inspection | Completed | Traced all criteria and prior findings. Read relevant installed Next.js authentication, cookies, connection and route-handler guidance; inspected SDK database retry propagation and supporting profile/RLS foundations. |

No worker test, build, database or other mutating checks were run. `review.sh` was not launched. No files were written, environment files read, hosted services accessed or live LLM calls made. Runtime provider faults were not independently reproduced.

## Open issues for the next step

- Browser execution is implementation-reported; no separate raw browser log was supplied. Source-outage browser rendering has resolver tests and component inspection rather than an independently observed browser outage run.
- `05-implementation.md` records the earlier demo-control blocker. The subsequently approved master clarification supersedes that scope statement; SYS-12.4 acceptance remains with T-24/T-25.
- The dedicated security report predates the adapter fixes. This functional assessment does not replace security review of those changes.
- Hosted Auth settings, deployment Origin configuration, TLS/HSTS and live provider behavior were not assessed. The pre-existing proxy cookie-attribute limitation recorded in `04-security-reviewer.md` is not represented as remediated.
- Role entry pages remain shells; this review accepts their account/navigation behavior without claiming role-domain implementation.

## Suspicious content found

None.

## Human corrections

Human commit `5f1ebb3` removed the Create demo kit presence test and assigned its evidence to T-24/T-25.

Approved clarification `af34cb4`, merged into master through PR #124 at `861b6a8`, subsequently amended SYS-02.1 and T-51 to explicitly exclude demo-control presence from this pair’s acceptance. This round applies that approved contract and resolves R3 without requiring restoration of the removed test.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| `03-reviewer.md` | R1 | Fixed; revalidated | `src/server/auth/account-adapter.ts:41` disables database retries. `src/server/auth/account-access.ts:18` requests retry-disabled reads through the session helper. Four real-SDK cases at `tests/unit/account-adapters/transport.test.ts:39` assert exactly one profile request after network/503 failures across both paths. Fresh launcher verification passes. |
| `03-reviewer.md` | R2 | Fixed; revalidated | Request-local capture at `src/server/auth/account-transport.ts:17` preserves only validated Auth retry delays before SDK error conversion. Tests at `tests/unit/account-adapters/transport.test.ts:71` assert forwarding/omission and safe envelopes; `:84` covers consumption, isolation and clearing. Fresh launcher verification passes. |
| `06-reviewer.md` | R3 | Fixed through approved contract clarification | `af34cb4`, merged through `861b6a8`, assigns demo-control presence to SYS-12.4/T-24/T-25 and excludes it from SYS-02.1/T-51 acceptance. Existing minimal sign-in implementation and assertions satisfy the revised approved criterion. No demo-control implementation is claimed. |

## Notes for reflection

- **What worked:** Exact approved contracts and real-SDK transport assertions supported independent assessment beyond criterion titles and dependency-level mocks.
- **What needed guidance:** The merged clarification resolved the prior demo-control ownership blocker.
- **What to change in the agent or skill:** None established by this round.