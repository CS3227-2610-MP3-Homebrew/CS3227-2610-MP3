# Testing report

- **Agent:** testing
- **Issue:** #40, PLAN T-09
- **Spec IDs:** SYS-05.1, SYS-05.2, SYS-05.4
- **Date:** 2026-10-20
- **Branch:** feat/40-proxy-refresh-streaming-role-gates
- **Base commit:** cdde1da375e6d3844255585ae0b7f1a87862710f
- **Status:** completed

## Summary

Completed test authoring for T-09: 29 Vitest cases and 14 production Playwright
cases. Final verification reports 27 expected missing-implementation failures
and 370 passes; all existing database tests pass, with no skipped tests. The two
new configuration/source checks pass. All 14 browser cases fail explicitly on
missing application modules after both production servers build and Chromium
starts successfully. This is failing-first evidence, not an implementation pass
or merge-ready result.

Only the assigned T-09 heading/body, its three criteria, linked technical
architecture/rendering contracts, shared workflow rules, installed Next.js guides,
existing tests/tooling and merged application/schema interfaces were read. No
implementation task body or implementation/reviewer report was read. No earlier
handoff exists in this pair directory.

No sign-up, sign-in or navigation screen contract is introduced. Browser URLs,
session cookies, denial responses and `/signed-out` are test-owned fixtures.
The application redirect destination remains supplied by the caller. No account
screen or public denial status/copy is specified by these tests.

## Acceptance criteria

Statuses below describe completed test authoring; behavior remains failing-first.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-05.1 | completed | `rendering.test.ts` asserts both actual Next.js flags remain true. Production browser cases cover customer, owner and admin request-time streaming, anonymous redirect, both other-role denials, and every role's prerendered shell. Missing RoleGate currently prevents behavioral assertions from being reached. |
| SYS-05.2 | completed | Mocked SSR Auth/profile/refresh contracts, 15 independent read/mutation guard cases, a genuine local Supabase signup/refresh/revocation fixture, prefetched expired/invalid sessions, and direct HTTP GET/POST harness calls. All fail on missing feature modules. |
| SYS-05.4 | completed | AST inspection of actual `src/app` exports finds no `instant = false` exception. The approved base has none and this pair needs none; no route-specific PR rationale is outstanding. Future exceptions would need route scope and human PR evidence, which a production build cannot supply. |

### Given/When/Then coverage

| Given / When | Then | Cases |
| --- | --- | --- |
| Each authorized role requests its fixture area while session resolution is delayed | Public fallback is visible without protected content, then the verified identity streams | 3 browser |
| Anonymous caller requests each role area | Redirect reaches the supplied fixture destination, with no protected content | 3 browser |
| Each area receives either of the other two roles | No protected region/identity or application-error fallback is rendered | 3 browser, each checking both other roles |
| Production prerender artifacts for all roles are inspected | Fallback exists and none of the three per-user identity canaries occurs | 1 browser artifact case |
| A valid session prefetched the customer shell, then expires or becomes invalid before navigation | Navigation rechecks authentication and redirects; no protected identity appears | 2 browser |
| SSR refresh supplies chunked cookies and clears an old cookie | All values/options reach browser cookies and refreshed values reach forwarded downstream request headers; unrelated cookies survive | 1 integration |
| Auth verifies a user whose metadata claims another role/workspace | Only the matching protected profile supplies customer, owner or admin authority | 3 integration |
| Auth rejects expired, invalid or absent authentication despite a cached session user | No verified actor or profile read is returned | 3 integration |
| Protected profile is missing, has an unsupported role, has an invalid workspace, or lookup is denied | No verified actor falls back to caller metadata | 4 integration |
| Genuine local Auth signup supplies a refreshable cookie whose stored expiry has elapsed | Actual proxy renews cookies; downstream actual session adapter resolves the same local user's protected profile; local revocation denies later access | 1 local integration |
| Direct read/mutation has a matching verified role and record permission | Authentication and permission verification precede the operation; the operation receives the verified actor | 6 unit |
| Direct read/mutation has no session or a wrong role | Operation never runs | 4 unit |
| Direct read/mutation targets another owner or workspace | Record authorization denies and operation never runs | 2 unit, each checking both records |
| Direct read/mutation encounters authentication/record-verification failure | Failure propagates without running the operation | 2 unit |
| An earlier successful protected operation is followed by an expired session | Later mutation rechecks the session and never runs | 1 unit |
| Direct GET/POST bypasses the role UI | Missing, expired, invalid and wrong-role sessions and foreign records are denied; valid permitted access returns the fixture identity | 2 browser HTTP |
| Actual configuration/source exports are inspected | Rendering flags stay true and no instant exception is introduced | 2 unit |

## Files changed

- `tests/unit/auth/contracts.ts` — deferred missing-module checks, minimal exported interfaces and synthetic verified actor.
- `tests/unit/auth/guards.test.ts` — 15 near-data guard cases.
- `tests/unit/auth/rendering.test.ts` — actual configuration and AST export checks.
- `tests/integration/auth/session-proxy.test.ts` — 11 SSR Auth/profile/cookie cases with deterministic mocks.
- `tests/integration/auth/local-session.test.ts` — local-only genuine Auth/session fixture; captures local CLI configuration in memory without printing credentials, sets `APP_ENV=local` and `AI_PROVIDER=disabled`, and removes its profile before its Auth user to respect the merged FK.
- `tests/e2e/auth/role-gates.spec.js` — 14 production browser/artifact/HTTP cases. Plain JavaScript avoids the installed Bun/Playwright TypeScript loader defect without changing tooling or acceptance assertions.
- `tests/e2e/auth/harness/next.config.ts` — production fixture configuration, real-subject aliases, and controlled session-source replacement.
- `tests/e2e/auth/harness/tsconfig.json` — isolated fixture type/build configuration and output under root `.next/auth-harness`.
- `tests/e2e/auth/harness/subjects.d.ts` — declared minimal interfaces for the browser subjects.
- `tests/e2e/auth/harness/session.ts` — test-only delayed valid/expired/invalid session resolver.
- `tests/e2e/auth/harness/missing-role-gate.tsx` and `missing-guard.ts` — fail-closed placeholders that permit the pre-implementation production fixture build; explicit existence assertions prevent these from satisfying acceptance tests.
- `tests/e2e/auth/harness/protected-content.tsx` — async Server Component invoking the actual guarded-operation boundary.
- `tests/e2e/auth/harness/app/layout.tsx` and `app/page.tsx` — minimal document and links for real partial prefetching.
- `tests/e2e/auth/harness/app/{customer,owner,admin}/page.tsx` — caller-supplied fallback/redirect and protected child fixtures for each role.
- `tests/e2e/auth/harness/app/signed-out/page.tsx` — test-only redirect destination.
- `tests/e2e/auth/harness/app/api/protected/route.ts` — test-only direct GET/POST adapters invoking the actual guard independently of UI/proxy.
- `playwright.config.ts` — retains the existing root production server and adds the production fixture server on loopback port 3101.
- `workflow/handoffs/40-proxy-refresh-streaming-role-gates/01-testing.md` — this report.

No application/spec/PLAN/docs changes, commits or dependency additions. No runtime
or devDependency was added; existing tooling suffices. Generated builds, browser
traces and results remain under ignored `.next/`; Chromium was installed in the
tool cache, not added to the repository.

## Interfaces defined by tests

All are internal foundation interfaces within the approved architecture, not
public screen/HTTP contracts. `Role` is `customer | owner | admin`, and
`VerifiedActor` reuses the merged `{ id, workspaceId, role }` shape.

| Module | Export and signature | Required observable behavior |
| --- | --- | --- |
| `src/proxy.ts` | `proxy(request: NextRequest): Promise<NextResponse>` | Actual Supabase SSR session verification/refresh and cookie propagation to the forwarded request and returned response. |
| `src/server/auth/session.ts` | `getVerifiedActor(): Promise<VerifiedActor \| null>` | Request-time verified Auth identity plus its protected profile; no trust in cached session user metadata, no actor for rejected authentication or unusable/denied profile. |
| `src/server/auth/guard.ts` | `withAuthorizedActor<T>({ role, authorize: (actor) => boolean \| Promise<boolean>, operation: (actor) => T \| Promise<T> }): Promise<T>` | Independently resolves current actor and role, checks the supplied record-permission predicate and only then runs the operation; denial/failure rejects. The predicate is a caller-owned domain permission check, not a new generic owner/Admin policy. |
| `src/app/_components/role-gate.tsx` | `RoleGate({ role, unauthenticatedRedirectTo: string, fallback: ReactNode, children: ReactNode }): ReactNode` | Owns the Suspense-wrapped Server Component auth/role check, renders fallback while waiting, redirects anonymous callers to the supplied destination, and renders children only for the matching verified role. |

The browser fixture replaces only the session module's source of controlled
states; it imports the actual RoleGate and guard. Actual SSR/profile behavior is
separately covered by integration mocks and the genuine local session case.
No async Server Component is directly invoked in Vitest. The installed Next.js
Vitest, Playwright, Proxy, cookies, connection, authentication-with-Cache-Components,
partialPrefetching and instant guides informed the fixture design.

## Checks run

Only final-code checks are listed here. Escalation was used for Docker access.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | expected failing-first, exit 1 | Lint and typecheck passed. `Test Files 3 failed \| 16 passed (19)`; `Tests 27 failed \| 370 passed (397)`; duration 198.43s. All failures are the missing-module cases below. No skips or existing-suite failures. |
| `bun run lint` | passed | Final standalone confirmation exited 0 after fixture cleanup adjustments. |
| `bun run typecheck` | passed | `next typegen` succeeded and `tsc --noEmit` exited 0 after fixture cleanup adjustments. |
| `bun run check:traceability` | passed | `Traceability passed (11 done tasks; all listed criteria have test titles).` |
| `bun run check:specs` | passed | `Spec check passed (0 warning(s)).` |
| `bun run test:e2e` | expected failing-first, exit 1 | Both configured production servers built/started and Chromium launched; all 14 cases failed explicitly on missing RoleGate (12) or guard (2). |

Within `verify`, traceability, spec check and build were not reached because
Vitest exited 1. The first two ran independently; root production build and the
separate harness production build ran successfully inside the final browser
command. This does not make the full `verify` command pass.

### Complete expected-failure inventory

Each row expands exactly over its listed parameters; it identifies all 27
Vitest and all 14 Playwright failures. Titles have the stated criterion prefix.

| Criterion | Test title / exact parameter expansion | Count | Actual failure reason |
| --- | --- | --- | --- |
| SYS-05.2 | `direct {read,mutation} independently authenticates {customer,owner,admin} and checks record permission` | 6 | `Missing implementation: src/server/auth/guard.ts` |
| SYS-05.2 | `direct {read,mutation} denies absent or wrong-role sessions before private work ({null, owner actor})`; owner actor is the exported fixture with role changed to owner | 4 | Same missing guard |
| SYS-05.2 | `direct {read,mutation} denies another owner's or workspace's record` | 2 | Same missing guard |
| SYS-05.2 | `direct {read,mutation} fails closed when session or record verification fails` | 2 | Same missing guard |
| SYS-05.2 | `a successful earlier UI/proxy check does not authorize a later expired-session mutation` | 1 | Same missing guard |
| SYS-05.2 | `src/proxy.ts propagates every refreshed cookie to downstream request and browser response` | 1 | `Missing implementation: src/proxy.ts` |
| SYS-05.2 | `a verified Auth user resolves protected-profile {customer,owner,admin} rather than caller metadata` | 3 | `Missing implementation: src/server/auth/session.ts` |
| SYS-05.2 | `{expired,invalid,absent} Auth verification cannot be rescued by a cached getSession user` | 3 | Same missing session module |
| SYS-05.2 | `missing or invalid protected profile {null, unsupported-role profile, invalid-workspace profile} never grants a role`; values are the three explicit fixtures in `session-proxy.test.ts` | 3 | Same missing session module |
| SYS-05.2 | `profile lookup denial cannot fall back to Auth metadata` | 1 | Same missing session module |
| SYS-05.2 | `genuine local Supabase session refresh reaches downstream session verification and preserves protected-profile authority` | 1 | Missing proxy, before local user/session provisioning; genuine session assertions not yet reached |
| SYS-05.1 | `{customer,owner,admin} streams private data only after request-time authorization` | 3 | `Missing implementation: RoleGate` |
| SYS-05.1 | `unauthenticated {customer,owner,admin} access redirects to the fixture-supplied destination` | 3 | Same missing RoleGate |
| SYS-05.1 | `wrong-role sessions receive no {customer,owner,admin} protected content` | 3 | Same missing RoleGate |
| SYS-05.1 | `all role prerendered shells contain fallback and no per-user data` | 1 | Same missing RoleGate, before accepting placeholder artifacts |
| SYS-05.2 | `a prefetched shell cannot authorize an {expired,invalid} session` | 2 | Same missing RoleGate |
| SYS-05.2 | `direct {GET,POST} handler independently denies missing, wrong-role and foreign records` | 2 | `Missing implementation: guarded operations` |

Final Vitest failure totals by missing module: guard 15, session 10, proxy 2.
The two passing new cases are `SYS-05.1: cacheComponents and partialPrefetching
remain enabled` and `SYS-05.4: no app-wide instant opt-out exists and this pair
introduces no route exceptions requiring PR reasons`.

### Corrected environment/test-tooling attempts

Earlier attempts encountered an absent Docker daemon, then a fixture config
import-resolution error, Bun/Playwright parsing TypeScript browser specs as
JavaScript, and absent pinned Chromium. Docker was started by the coordinating
session; `bun run db:start` succeeded with credentials omitted. The fixture config
uses explicit rendering flags, the browser spec uses `.js`, and pinned Chromium
was installed. None of these issues remains in the final failure classification.
Read-only local Docker/SQL diagnostics showed healthy containers and a successful
178 ms Bun subprocess query while the existing reset-heavy suites ran. No
parallel database reset or duplicate fixture writes were started.

## Open issues for the next step

No missing spec decision or testing prerequisite remains. The four internal
feature modules above are absent on the approved base; behavioral assertions
beyond their existence checks, including actual local session provisioning and
prefetch navigation, remain unexecuted until implementation exists. Required
Supabase SSR runtime support is not installed on the base and is implementation
scope, not a test devDependency.

The pair remains unready to merge while verification and browser acceptance
cases fail. No live LLM call, hosted database access, dotenv read/edit, deployment,
commit or PR action occurred. All work is left as an uncommitted local diff under
the human's authorization conveyed by the coordinating session.

## Suspicious content found

None.

## Human corrections

None. The coordinating session identified the merged `AI_PROVIDER` configuration
name and requested genuine local session coverage; fixtures use that name with
the disabled provider and include that coverage.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No reviewer report was read. |

## Notes for reflection

- **What worked:** Deferred subject imports make missing implementation explicit while lint/typecheck still pass; separate actual SSR integration and production rendering surfaces keep controlled session timing out of production code.
- **What needed guidance:** The coordinating session clarified local-session evidence and the merged configuration variable name. Installed-tool probing exposed a Bun browser-spec loader limitation and missing Chromium.
- **What to change in the agent or skill:** A preflight for Docker readiness, browser availability and a one-case Playwright discovery check would expose environment/tooling constraints before full verification.
