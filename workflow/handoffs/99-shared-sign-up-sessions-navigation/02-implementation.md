# Implementation report

- **Agent:** implementation
- **Issue:** #100 (T-51), paired with #99 (T-50)
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8
- **Date:** 2026-10-21
- **Branch:** feat/99-shared-sign-up-sessions-navigation
- **Base commit:** 5f1ebb3abc01c1f058ffd3ba26d0d3831731efc9
- **Status:** completed

## Summary

Implemented shared Customer/owner registration, all-role main/kit sign-in,
this-browser sign-out, verified account-state resolution, fixed destinations,
accessible account forms and role-only navigation. Role entry pages contain
only headings; the owner dashboard additionally reads the caller's café
existence through the session-bound client and supplies the specified no-café
application entry. They do not implement catalogue, orders, moderation,
applications, menu or dashboard-domain features.

The committed testing baseline is `5f1ebb3`; approved Shared specs have merge
evidence in `522936d` on the selected `upstream/master` base at `5cd29d2`.

Account requests use strict Zod fields, exact JSON envelopes/status mappings,
streamed byte-bounded bodies, trusted server-configured Origin, and isolated
provisional cookie buffers. Session cookies are committed only after protected
profile verification. Registration uses Auth admin identity creation without
role metadata, then one narrow service-role-only profile function selecting the
protected main workspace and rejecting Admin. The existing metadata-trigger
boundary and role/workspace policies are preserved. Only the newly returned
identity is eligible for one compensation attempt after profile failure.

The three repair cycles used were: (1) correct owner-entry JSX try/catch lint
structure and classify account source failures safely; (2) defer SSR-client
construction until account transport/field admission, because SDK session
listeners can load storage on construction; (3) use standard Next router
navigation/refresh and explicit request-time connection boundaries for session
rendering. The first full verify passed 915 tests and every later stage before
cycles 2/3; it is historical, not final-code evidence. The first browser run
passed 36 cases and failed six role matrices because full-document navigation
discarded the response body before Playwright could read it; it also exposed
SDK current-time access during partial prerendering. The final browser run
passed all 42 cases with these defects corrected. Final full verification
passed lint, typecheck, all 915 tests, traceability/spec checks, build and both
source/artifact isolation checks. Independent review remains pending.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-01.1 | completed | Labelled minimal form, unselected Customer/owner radios and Sign in link; production form case passes. |
| SYS-01.2 | completed | Shared client/server strict schemas normalize email only and enforce code-point/UTF-8 password bounds; account boundary and browser local-feedback cases pass. |
| SYS-01.3 | completed | Real Customer/owner HTTP registration passes, sets persistent cookies and creates the protected main-workspace role; role home matches the verified profile. |
| SYS-01.4 | completed | Deterministic duplicate/concurrent handler tests and real duplicate registration pass; existing identity/profile are unchanged. |
| SYS-01.5 | completed | Controlled profile failures test exactly one new-identity compensation attempt and both cleanup outcomes, with provisional clearance. |
| SYS-01.6 | completed | Completed-account/failed-initial-session handler case and fixed account-created notice browser case pass. |
| SYS-01.7 | completed | Pending, repeat-submit, retained email/role, cleared password, network, throttle and safe failure cases pass without app retries. |
| SYS-01.8 | completed | Active-account handler conflict and real registration/sign-in conflicts preserve the active browser cookies. |
| SYS-01.9 | completed | Exact method, Origin, media, malformed/strict body and byte-ceiling handler cases plus actual route transport denials pass. |
| SYS-02.1 | completed | Minimal sign-in form and Sign up link browser case passes. Create demo kit control evidence is excluded by the human correction below; no integrated demo acceptance is claimed. |
| SYS-02.2 | completed | Strict normalized email/nonempty unchanged password schemas and override denials pass, including existing short/whitespace passwords. |
| SYS-02.3 | completed | All six actual main/kit × Customer/owner/Admin browser matrices pass with protected-profile roles and fixed homes. |
| SYS-02.4 | completed | Generic credentials, pending, network, throttled/source and safe-exception cases pass. |
| SYS-02.5 | completed | Invalid/absent profiles and distinct profile-source failures pass controlled tests; established missing-profile browser state has usable Sign out and no navigation. |
| SYS-02.6 | completed | Anonymous versus invalid/revoked/source access-resolution cases pass; actual revoked identity goes to the session-ended notice. |
| SYS-02.7 | completed | Persistent-cookie browser restoration and actual expired-session refresh pass using local Supabase. |
| SYS-02.8 | completed | Local-scope revocation handler case and two separately signed-in browser case pass. |
| SYS-02.9 | completed | Failed-remote-revocation handler case clears local session with the truthful fixed warning; notice rendering passes. |
| SYS-02.10 | completed | Absent-session sign-out is idempotent; active-account conflicts pass deterministic and real HTTP cases. |
| SYS-02.11 | completed | Exact sign-in/sign-out transport/envelope/cookie effects pass handler and actual route cases. |
| SYS-03.1 | completed | Fixed role homes and preserved main/kit profile authority pass all role matrices. |
| SYS-03.2 | completed | Anonymous root/role destinations and verified root/account-form redirects pass browser cases. |
| SYS-03.3 | completed | Each main/kit role matrix redirects both other-role homes to the caller's own home; existing direct endpoint authorization cases pass. |
| SYS-03.4 | completed | Customer navigation exposes Browse cafés/My orders/Sign out only; domain content remains unimplemented. |
| SYS-03.5 | completed | Owner navigation and no-café dashboard/application entry pass both workspaces without fabricated domain data. |
| SYS-03.6 | completed | Admin moderation/applications/cafés/audit paths and Sign out pass both workspaces. |
| SYS-03.7 | completed | Query/body destination overrides are rejected or ignored; browser destinations and notice text come from fixed allowlists. |
| SYS-03.8 | completed | Controlled source outages resolve retry; invalid profiles resolve unavailable; established missing-profile browser visits never expose role navigation or loop to sign-in. |

Controlled handler/access tests verify provider faults and compensation;
production-browser tests verify real cookies, local Auth, rendering and
navigation. Provider-outage rendering is supported by resolver-level evidence,
not a live service outage. Final full verification passed on the same code as
the successful browser run.

## Files changed

- `src/lib/accounts/fields.ts`: shared field schemas, fixed homes/notices and safe messages; no credentials or server configuration.
- `src/server/auth/accounts.ts`: injected account HTTP boundary, transport validation, safe outcomes and bounded compensation.
- `src/server/auth/account-adapter.ts`: server Supabase composition, privileged identity/profile provisioning and isolated session-cookie staging.
- `src/server/auth/account-access.ts`: request-time Auth/profile verification distinguishing anonymous, session-ended, unavailable and retry outcomes.
- `src/app/api/auth/{sign-up,sign-in,sign-out}/route.ts`: POST handlers and explicit unsupported-method envelopes.
- `src/app/_components/{account-boundary,account-form,sign-out}.tsx`: public fallback, verified role shells, accessible forms and explicit Sign out.
- `src/app/{sign-up,sign-in}/page.tsx`, `src/app/page.tsx`: account surfaces and root home resolution.
- `src/app/{customer,owner,admin}/layout.tsx` and role entry `page.tsx` files: role-only navigation and minimal entry headings; owner dashboard supplies the no-café state.
- `src/proxy.ts`: account routes own their cookie admission; failed verification retains incoming session evidence for the downstream gate.
- `supabase/migrations/20261021000001_account_signup.sql`: service-role-only, Customer/owner-only, main-workspace profile provisioning; no new table grants or broader end-user privileges.
- This report. No dependency/configuration/test/spec/PLAN/docs edits or supplementary tests.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run test:e2e` | passed | 42/42 production-browser cases, 39.1s; includes all 14 existing SYS-05 cases and 28 current Shared cases. Both configured production builds succeeded. |
| `bun run verify` | passed, exit 0 | Lint/typecheck passed; 35/35 Vitest files and 915/915 tests passed (376.18s); traceability passed (20 done tasks), specs passed (0 warnings), production build passed, source and 105-client-artifact isolation checks passed. |
| `git diff --check` | passed | No whitespace errors. |
| Scope check of tests, testing config, package manifest/lock, PLAN and docs | passed | No changes in testing-owned or other excluded paths. |

The additive migration applied successfully through `bun run db:reset` before
verification; real registration/browser cases then exercised its profile function.

## Open issues for the next step

- Independent review/security review have not run. Implementation completion is not review or deployment approval.
- Create demo kit creation-control evidence remains T-24/T-25-owned, per the human correction. Shared sign-in is available as its mounting surface; no placeholder or duplicate provisioning flow was added.
- Domain entry pages intentionally have only headings; domain features remain their owning pairs' work.
- Account deployment Origin comes from server-only `APP_ORIGIN` (an exact canonical HTTP(S) origin), otherwise platform `VERCEL_URL`; local/CI defaults use loopback plus the server's `PORT`. Custom-domain deployments require their canonical `APP_ORIGIN`. Caller Host/forwarding headers never establish trust.
- Local-only databases and disabled/fake LLM paths were used; no hosted Auth setting or deployment acceptance is claimed.

## Suspicious content found

None.

## Human corrections

At gate 2 the human committed tests in `7fcf2e8` and `5f1ebb3` and removed the
SYS-02.1 “Create demo kit” presence test. T-24 owns the sign-in creation-control
evidence, and T-51 cannot satisfy it before T-25. The committed correction was
preserved; no testing file was modified or test restored. This implementation
claims the shared sign-in form/integration surface only, not integrated demo
creation-control or provisioning acceptance. References to a separate presence
test in the earlier immutable testing report are superseded by this correction.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | Not applicable | Independent review pending. |

## Notes for reflection

- **What worked:** Approved HTTP contracts and committed controlled-fault tests provided exact outcomes; real local browser cases exercised main/kit roles and cookie refresh.
- **What needed guidance:** Human correction clarified demo-control evidence ownership. Installed Next.js guides identified the explicit request-time boundary needed for SDK time access.
- **What to change in the agent or skill:** None established beyond the recorded bounded repair history.
