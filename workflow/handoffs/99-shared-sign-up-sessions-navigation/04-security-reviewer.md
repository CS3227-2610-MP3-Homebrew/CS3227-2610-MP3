# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #100 (T-51), paired with #99 (T-50)
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8; applicable security baseline
- **Date:** 2026-10-21
- **Branch:** feat/99-shared-sign-up-sessions-navigation
- **Base ref:** upstream/master
- **Base commit:** 5cd29d2cedcafa5394b9aa6a0a32b0c585f2c5ff
- **Reviewed HEAD:** 5f1ebb3abc01c1f058ffd3ba26d0d3831731efc9
- **Status:** completed

## Summary

No confirmed security findings in the reviewed scope. No P0/P1 security finding
joins the implementation fix round. This is completion of the security
assessment, not a claim that the application is secure or ready to merge.

Reviewed the base-to-working-tree account/session/navigation implementation,
including untracked application files and the new profile-provisioning migration.
Supporting unchanged session clients, Auth guards, core schema and role-matrix
policies were inspected where they establish the trust boundary. The task has no
assigned SEC criterion ownership; applicable cross-cutting security controls and
evaluation cases are recorded below without claiming new SEC acceptance.

The independent review in `03-reviewer.md` has Overall fail for R1 (automatic
profile-read retries) and R2 (discarded Auth retry delays). Those remain unresolved
contract findings; this assessment does not override them. Its launcher ran
`bun run verify` successfully on the same tree. No application changes were made
during this assessment.

## Acceptance criteria

| Criterion/control | Status | Evidence and coverage limits |
| --- | --- | --- |
| Identity verification and deny-by-default access; SYS-02.3–SYS-02.6, SYS-03.1–SYS-03.3, SYS-03.8; E-01 authorization dimension | completed | `src/server/auth/account-access.ts:19` calls Auth `getUser`, then reads the caller's protected profile and validates identity, workspace UUID and permitted role. `src/app/_components/account-boundary.tsx:43` returns role navigation/content only for a matching verified role; other states receive fixed destinations or public failures. Owner dashboard independently verifies owner identity before its query. This does not substitute for domain entry-point authorization. |
| Role/workspace separation and ordinary RLS; SYS-01.2–SYS-01.4, SYS-02.3, SYS-03.7; E-16 kit authority dimension | completed | Strict request schemas accept no caller workspace/user/return destination; signup permits Customer/owner only. Sign-in resolves the existing protected profile without writes. `account-adapter.ts:79` uses the session-bound client; self-profile RLS is retained in the core migration. Owner café lookup includes both verified owner and workspace, under existing role-matrix RLS. No changed domain grants or cross-workspace privileged read was found. AI-source/cache and kit-provisioning parts of E-16 are outside this pair. |
| Privileged provisioning and least privilege; SYS-01.3–SYS-01.5 | completed | `account-adapter.ts:57` creates an Auth identity with no caller metadata, and passes only the returned ID to the narrow profile RPC. `supabase/migrations/20261021000001_account_signup.sql:4` uses an empty search path, qualified objects, Customer/owner allowlist and database-selected main workspace; execute is revoked from public/anon/authenticated and granted only to service_role. It inserts rather than upserts, preserving existing profiles. No service-role key reaches a client module. |
| Duplicate/concurrent signup and bounded compensation; SYS-01.4–SYS-01.6 | completed | `accounts.ts:77` stops on identity-creation error; only the identity returned by the current successful create operation can reach the single cleanup attempt at line 84. Duplicate handling never links, updates or deletes an existing identity. Completed-account/session failure retains the account and returns a fixed sign-in notice. Deterministic concurrency/cleanup assertions in `tests/integration/accounts/accounts.test.ts:71` and line 90 were inspected; launcher verification passed. |
| Request integrity, CSRF and input bounds; SYS-01.2, SYS-01.9, SYS-02.2, SYS-02.11; E-13 cross-site-cookie dimension | completed | `accounts.ts:41` requires POST, exact server-configured Origin and JSON media before identity effects; the adapter derives trust from server configuration, not Host/forwarding headers. Actual streamed bytes are capped at 65,536, UTF-8 decoding is fatal, and Zod strict objects reject unknown keys. `src/proxy.ts:10` bypasses account refresh so transport denials do not mutate sessions. The browser supplies no authorization authority. No SQL/command interpolation of account input exists. |
| Session success, active-account conflicts and local sign-out; SYS-01.8, SYS-02.5–SYS-02.10 | completed | Isolated staged/committed cookie maps in `account-adapter.ts:32` avoid persisting a new attempt before profile verification. Active identity conflict returns before commit. Failed attempts clear session cookies; successful sign-out uses `scope: "local"` and local clearance, with truthful unconfirmed-revocation notice on failure. `account-access.ts:17` and the proxy retain absent/expired distinctions without granting access. Normal refresh remains independently verified; existing issued-token lifetime is not misrepresented as instant revocation. Refresh attribute limitation is recorded below. |
| Injection, inert rendering and fixed destinations; SYS-03.7; E-06 rendering dimension | completed | Role homes, navigation and notice text are fixed application constants. Unknown notices render no notice; text is rendered through React rather than raw HTML. Client navigation accepts only fixed destinations. Account response errors contain safe constants and an opaque request ID, with no provider URL or input echo. No arbitrary URL fetch, HTML sink, shell execution or dynamic SQL was introduced. AI-output portions of E-06 are absent. |
| Secrets, errors, logs and private-cache isolation; SYS-01.9, SYS-02.11; E-12 disclosure dimension | completed | Account/server adapters use `server-only`; browser fields contain schemas/messages only. Account responses set `Cache-Control: private, no-store`. No account logging, credential/token JSON field, raw exception response, or shared user cache was introduced. Request-time UI boundaries use `connection()` and Suspense; fallback contains public status text only. Launcher source/client-artifact isolation checks passed. Handler synthetic-fault assertions were inspected; this was not a provider-log canary runtime exercise. |
| Resource/race/failure baseline | completed | Body/password limits, one new-identity compensation attempt, pending/repeat-submit guards, fail-closed profile checks and provider throttle mapping are present. No invented application signup throttle was required by the approved contract. R1/R2 in `03-reviewer.md` remain contract defects involving retry amplification and delay propagation; neither establishes a new privilege/data-disclosure path here. Hosted rate/retention settings were not inspected. |
| Dependency/configuration supply-chain baseline | completed | No dependency/lockfile/CI changes in the implementation diff. Trusted Origin is validated as a canonical HTTP(S) origin. Installed SDK behavior and relevant Next.js guides were inspected; no affected-version/reachable-CVE assertion is made. |
| LLM baseline: prompt injection, agency, disclosure, unsafe output, cost/limits and overreliance | completed | The changed account/navigation files introduce no SoCLaaS call, provider context, model output, tool, retrieval or persistent-memory path. No LLM decision can grant account roles or drive signup/sign-out. E-02–E-05 and E-07–E-11 provider-specific scenarios are excluded; unchanged `src/server/llm/` behavior is not re-audited. E-12/E-13/E-16 account-relevant dimensions are covered above. |
| Other AI-security evaluation cases | completed | E-14/E-15 kit creation and once-shown credentials, and E-17/E-18 maintenance authentication/disclosure are absent from this pair. No new kit creation, credential panel, maintenance endpoint or Admin provisioning was introduced. Exclusion is scope evidence, not acceptance of those cases. |

## Findings

### P0/P1

None confirmed in the reviewed scope.

### Other confirmed security findings

None. The separate functional review's R1 and R2 remain open and require their
normal workflow disposition.

## Files changed

Only this report. No code, tests, fixtures, configuration, other reports or
workflow state was edited.

## Checks run

| Command/inspection | Result | Evidence |
| --- | --- | --- |
| Latest reviewer launcher: `bun run verify` | Passed, reported by independent reviewer | `03-reviewer.md` records exit 0, lint/typecheck, 35 files/915 tests, traceability/specs, production build and source/client-artifact isolation. This assessment did not rerun it. |
| Implementation-reported `bun run test:e2e` | Reported passed, 42/42 | `02-implementation.md`; browser assertions were inspected, not rerun by this agent. |
| Git status, HEAD and merge-base inspection | Completed | HEAD `5f1ebb3`; merge-base equals selected base `5cd29d2`. Account implementation/migration remained uncommitted; preceding reports were present. |
| Static source-to-sink and migration/policy review | Completed | Traced credentials, caller role/workspace fields, Auth-returned identity, profile RPC, RLS reads, cookie staging, local revocation, safe errors and fixed render/navigation sinks. |
| Installed framework/SDK inspection | Completed | Next.js cookies/connection references and relevant authentication guidance; Supabase SSR cookie defaults and application of cookie options. |
| Targeted tests/runtime exploit | Not run | No suspected new high-severity vulnerability required a runtime confirmation. Static assessment and the existing fresh verification were sufficient for the conclusions stated. |

No full-suite rerun, database reset, external probe, hosted access, environment-file
read or live LLM call was performed.

## Open issues for the next step

- R1/R2 in `03-reviewer.md` are unresolved. The passing suite mocks account effects
  above portions of the SDK transport, so it does not establish retry/delay
  correctness in the production adapter.
- Pre-existing integration limitation: `src/proxy.ts` does not configure cookie
  security attributes, and the installed SSR defaults use `httpOnly: false` with
  no `secure` option. A normal refresh can therefore replace the stricter account
  route's cookie attributes. This proxy setting predates the pair. No browser
  script injection, HTTP deployment exposure or production HSTS state was
  established, so this is not presented as a confirmed exploitable regression.
  The account handler's initial HttpOnly/Secure settings alone do not establish
  those attributes across the complete session lifecycle.
- No hosted Auth configuration, deployment Origin/custom domain, TLS/HSTS,
  provider logs, distributed signup traffic or real provider outage was examined.
  Local browser results and dependency-level fault tests do not prove those
  deployment properties. No new numeric app throttle or retention policy is
  inferred from this review.
- Current domain pages are headings/entry shells; domain owners must continue
  enforcing authorization at each protected data/action entry point. Layout
  visibility is not authority for future domain operations.
- Full SYS-02.1 demo-control integration remains with T-24/T-25 per the human
  correction. This assessment does not require restoring the removed test or
  claim demo creation/provisioning acceptance.

## Suspicious content found

None.

## Human corrections

The human removed the SYS-02.1 Create demo kit presence test at gate 2 in commit
`5f1ebb3`: T-24 owns creation-control evidence and T-51 cannot satisfy it before
T-25. This review preserves that ownership and limits its assessment to the
shared account/session/navigation surface.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | Not applicable | Independent security assessment; no implementation edits. |

## Notes for reflection

- **What worked:** Explicit HTTP contracts and narrow profile provisioning made the identity-to-role trust boundary traceable; fresh independent verification supported the inspected assertions.
- **What needed guidance:** The human correction clarified demo-control evidence ownership. No new behavior or permission decision was needed for this security assessment.
- **What to change in the agent or skill:** None established by this run.
