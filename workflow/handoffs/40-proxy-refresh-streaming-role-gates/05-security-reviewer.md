# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #40 / PLAN T-09 and #41 / PLAN T-10
- **Spec IDs:** SYS-05.1, SYS-05.2, SYS-05.4; baseline security assessment
- **Date:** 2026-10-20
- **Branch:** feat/40-proxy-refresh-streaming-role-gates
- **Base ref:** origin/master
- **Base commit:** cdde1da375e6d3844255585ae0b7f1a87862710f
- **Reviewed HEAD:** cdde1da375e6d3844255585ae0b7f1a87862710f
- **Status:** completed

## Summary

No confirmed security findings in the reviewed scope.

Reviewed the uncommitted session/authentication foundation, its new acceptance
fixtures and manifest/lockfile/configuration changes. The actual Auth check,
protected-profile authority, request-bound publishable-key clients and independent
operation predicates preserve the intended authorization boundaries. My fresh
`bun run verify` passed all 397 tests and every subsequent gate; my sequential
production browser run passed all 14 cases.

This is a scoped security review, not a claim that the application is secure or
approval to merge or deploy. No application, test, configuration or earlier
handoff file was changed by this reviewer.

## Findings

None confirmed. No finding IDs or remediation claims apply.

## Scope and contracts

HEAD, origin/master and their merge base all resolve to the base commit above.
Because the feature is entirely uncommitted, assessment included tracked diffs
and the complete untracked source/test/handoff inventory, rather than relying on
the commit diff alone. Inspected implementation:

- `src/proxy.ts`;
- `src/server/supabase/session-client.ts`;
- `src/server/auth/session.ts` and `guard.ts`;
- `src/app/_components/role-gate.tsx`;
- `package.json`, `bun.lock`, `playwright.config.ts` and new auth tests/harnesses.

Read PLAN T-09/T-10, TECHNICAL-SPEC's rendering/authentication decisions,
SYS-05.1/.2/.4, protected profile and RLS contracts, AI-SECURITY-SPEC's trust
boundaries/evaluation plan, and reports 01–04. The assigned pair has no explicit
SEC acceptance criteria. Supporting unchanged configuration, workspace guard,
profile schema/policies and role-matrix policies were inspected only to establish
the feature's trust boundaries. No pre-existing vulnerability was substantiated
in that supporting scope.

Read the installed Next.js Proxy, authentication-with-Cache-Components, cookies,
NextResponse, fetch, partialPrefetching and instant guidance before relying on
framework behavior. These establish request-time cookie reads behind Suspense,
upstream request-header forwarding, opt-in fetch caching, and the distinction
between navigation validation and authorization.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-05.1 | completed | `role-gate.tsx:14` checks verified identity and role before returning children, inside Suspense at line 23. Browser cases exercise all three roles, anonymous redirects, both other-role denials, delayed streaming and private-data-free prerendered shells. Both rendering flags remain enabled. |
| SYS-05.2 | completed | `proxy.ts:16` propagates refreshed cookie values/options and forwards the updated request headers at line 32. `session.ts:18` calls Auth and lines 23–29 validate the matching protected profile. `guard.ts:13` repeats verification and record authorization per call. Full verification includes all 29 auth tests, genuine local refresh and deletion-based revocation; browser cases deny stale prefetched sessions and independently guard GET/POST. |
| SYS-05.4 | completed | No instant=false exception was added. Actual-source rendering tests pass, and both production builds retain the rendering flags. |

## Zero Trust checklist evidence

| Boundary/check | Evidence and assessment |
| --- | --- |
| Explicit identity verification; expiry/revocation | Every `getVerifiedActor` call creates a request-bound client and invokes actual `auth.getUser`, not cached getSession authority (`session.ts:15–21`). The installed Auth adapter sends a bearer-authenticated `/user` request. Errors, absent users and invalid IDs grant no actor. The local integration case refreshes an expired stored session through the actual SSR/Auth adapters, verifies the downstream actor and denies the retained cookie after deleting its local user/profile. Mocked expired/invalid/absent sessions cannot fall back to cached session data. This does not establish every future account-revocation lifecycle or its latency. |
| Protected role/workspace authority | `session.ts:23–33` selects only id, workspace_id and role, filters by verified Auth identity, validates UUIDs/role with Zod and checks returned identity equality. Auth metadata cannot promote a role or select a workspace. Supporting profile RLS permits self reads only; authenticated callers have no generic profile update/insert authority. Existing local signup/role tests exercise metadata forgery and protected-profile boundaries. |
| Per-operation authorization; horizontal/vertical isolation | `guard.ts:13–16` obtains a fresh actor, matches the required role and requires an exact true record predicate before invoking the callback. Missing/wrong-role sessions, foreign ownership/workspaces and failed/throwing verification deny execution. A prior successful UI check cannot authorize a later failed session. Existing local RLS matrix tests also deny cross-owner/workspace access and role escalation, including Admin workspace isolation. The generic helper does not itself define domain record policies; that remains each server caller's responsibility. |
| Least privilege and RLS | Both clients use only the validated publishable configuration (`session-client.ts:10–16`, `proxy.ts:10–15`). No secret/service-role client or RLS bypass is introduced. The session client is instantiated per call and binds reads to request cookies; there is no shared session singleton. Supporting database policies derive identity/role/workspace from protected records. |
| Cookie and header boundaries | `proxy.ts:17–22` retains all SSR cookie updates/options and only adapter-produced response headers. `NextResponse.next({ request: { headers } })` forwards refreshed cookies upstream; it does not copy request cookies into ordinary response headers. Unit integration assertions cover chunks, clearing, options and preservation of an unrelated cookie. The real refresh integration covers actual renewed cookies and downstream identity. Cookie encoding and options come from the installed SSR adapter, not caller input. |
| Cache isolation and private shells | No use-cache directive or persistent authentication cache was added. Installed SSR code supplies private/no-store cache prevention when writing refreshed cookies (`@supabase/ssr/src/cookies.ts:645–670`), and `proxy.ts:21–36` preserves those headers. Request cookie reads make session-dependent rendering dynamic. Browser tests inspect prerendered shells and exercise invalid/expired sessions after prefetch. Cache-header values themselves are supported by static control-flow evidence, not an explicit runtime header assertion. |
| Proxy bypass and fail-closed behavior | Proxy only transports refreshes; its ignored Auth result never grants protected access. Protected helpers independently authenticate, so the matcher and a preceding proxy success are not authorization decisions. Missing/malformed profiles and database errors return no actor; thrown verification/predicate failures prevent operations. Wrong-role gates return no children. Configuration failures use the existing safe configuration error. |
| Injection, redirects and request integrity | The sole new database query uses a parameterized equality filter on a Zod-validated Auth UUID. No new SQL construction, shell execution, HTML/Markdown interpretation, upload, path or caller-selected fetch sink exists in production feature code. The redirect destination and fallback are server-caller props; there is no public query/form mapping into them. No production mutation endpoint or account flow is introduced, so CSRF/origin rules and lifecycle-specific races cannot be assessed as implemented public behavior here. |
| Secrets, errors, logging and retention | Feature modules expose a narrow actor and do not log tokens, profiles, credentials or raw Auth failures. All auth/client/gate helpers are server-only; proxy is a server entry point. Existing configuration validation rejects private keys in the publishable slot. Source and client-artifact isolation checks passed. No new audit, retention or persistent content store exists. No dotenv file was read, printed or edited. |
| Replay, bounds and concurrency | A stale UI result is not reused as a later authorization result. No new order/menu/moderation transition, provider dispatch, admission counter or shared mutable session store is introduced. Existing normal session refresh behavior is delegated to Supabase. General future endpoint limits and atomic domain transitions are outside this foundation pair; tests do not establish arbitrary concurrent lifecycle safety. |
| Dependencies/build exposure | Added locked runtime packages are @supabase/ssr 0.12.7 and @supabase/supabase-js 2.118.0 plus their locked transitive dependencies. Inspected their reachable SSR cookie/Auth code and the manifest/lock diff. No application install script, deployment workflow, external script source or CI permission change is introduced. Browser aliases and controlled session code remain under the separate test harness; production app code imports neither. No external advisory query or package-wide vulnerability audit was performed, and no CVE conclusion is inferred from names alone. |

## LLM baseline and evaluation cases

No LLM/provider entry point is introduced or called by this pair. There is no
prompt construction, provider context, generated output, AI cache, model-driven
mutation, tool, retrieval, embedding or persistent memory in the reviewed path.
No live LLM call was made. The baseline was applied with these scope distinctions:

| Case/baseline | Applicability and evidence |
| --- | --- |
| E-01; authorization baseline | Applicable foundation intersection: anonymous/wrong-role/direct-access denial, foreign-owner/workspace predicates and supporting RLS matrix are exercised. There is no AI context/cache/dispatch surface, so this is not claimed as full SEC-01 or full AI E-01 acceptance. |
| E-16; workspace authority baseline | Applicable foundation intersection: actor workspace comes from protected profile, guard predicates receive it, and existing RLS tests deny main/kit/cross-kit escalation for every role. No kit provisioning, AI source/cache or seeded-review interpretation is added; full E-16 is not claimed. |
| E-11 and E-12; safe failure/secret isolation baseline | Applicable foundation intersections: invalid config/Auth/profile and failed record checks deny; no token logging/client propagation is introduced; isolation checks pass. There is no AI transport, provider admission, context canary or retention process in scope. Full AI evaluation cases remain excluded. |
| Prompt injection, excessive agency and overreliance; E-02–E-06 | No untrusted text is turned into provider instructions, executable output or permissions. No model or human-confirmation mutation flow exists here. Excluded as absent surfaces, not as tests passed. |
| Provider disclosure, AI output validation and cost/resource limits; E-07–E-10 | No provider payload, model response, AI cache, budget, retry or dispatch path exists. Excluded as absent surfaces; ordinary session checks are covered above. |
| E-13–E-15 and E-17–E-18 | No production cookie-authenticated AI/mutation endpoint, moderation confirmation, demo-kit creation or maintenance endpoint is added. These feature evaluations are outside this pair. Test-only GET/POST handlers demonstrate guard invocation and do not establish a production HTTP/security contract. |

No additional SEC obligations or missing public destinations were invented.

## Files changed

Only `workflow/handoffs/40-proxy-refresh-streaming-role-gates/05-security-reviewer.md`.
Verification produced ordinary ignored build/test artifacts. Source, acceptance
tests, configuration and previous handoffs were preserved.

## Checks run

All runtime results below are this security reviewer's own fresh runs on the
reviewed working tree. Verification finished before browser builds began.

| Command | Result | Evidence |
| --- | --- | --- |
| `git branch --show-current`, `git rev-parse HEAD origin/master`, `git merge-base origin/master HEAD` | passed | Expected branch; all commits resolve to cdde1da375e6d3844255585ae0b7f1a87862710f. |
| Tracked diff and complete untracked inventory/source inspection | completed | Included the uncommitted feature, test harness and reports 01–04, with supporting unchanged trust-boundary code as described above. |
| `git diff --check` | passed, exit 0 | No whitespace errors in tracked changes; untracked source inspected separately. |
| `bun run verify` | passed, exit 0 | Lint and typecheck passed; 19 files / 397 tests passed in 185.13s; traceability passed for 11 done tasks; specs passed with zero warnings; source isolation, production build and isolation of 35 client artifacts passed. All verification stages reached. Includes the 29 auth tests and actual local Supabase refresh/revocation case. |
| `bun run test:e2e` | passed, exit 0 | All 14 Chromium production cases passed in 42.2s, with root and controlled-session harness production servers. |

No required check is unrun or failed. Existing tests used the approved local
Supabase stack and loopback services with escalated permission. No independent
review launcher, hosted database, external probe, dependency installation,
deployment or git mutation was run. An optional sandboxed process-list diagnostic
was unavailable (`ps`: operation not permitted); no conclusion depends on it.

## Open issues for the next step

No confirmed security finding, blocker or spec decision remains within this
pair's assigned foundation scope.

Coverage limits: browser cases control session resolution while running the real
gate/guard; actual Supabase Auth refresh is exercised separately by directly
invoking the real proxy/session modules with a request-cookie adapter. This is
not a single browser-to-Auth end-to-end session test. Deletion-based revocation
does not establish every logout/ban/password-change policy or propagation time.
SSR cache-header preservation was inspected statically rather than asserted by
an existing test. No hosted deployment behavior or external advisory feed was
assessed.

Future callers still own trusted redirect/fallback construction, near-data
record/workspace predicates, RLS-bound queries and any endpoint-specific input,
origin and lifecycle rules. The foundation cannot make an arbitrary caller's
callback safe. These are scope limits, not evidenced vulnerabilities or newly
invented acceptance requirements. PLAN state and final integration coordination
belong to the coordinating session.

## Suspicious content found

None. No reviewed content attempted to expand permissions, skip checks or change
the assigned scope.

## Human corrections

The task conveyed the human's authorization for reviewer, security-reviewer and
docs work with all feature changes left uncommitted. This report records that
context; no staging, commit, PR or other permission expansion occurred.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Security review only; no source fixes. |

## Notes for reflection

- **What worked:** Actual local Auth integration and production browser tests
  provided complementary evidence; serial verification avoided shared database
  resets and build-output races.
- **What needed guidance:** The task supplied the uncommitted diff/base mapping
  and local-service permission boundary; no behavioral clarification was needed.
- **What to change in the agent or skill:** None identified in this run.
