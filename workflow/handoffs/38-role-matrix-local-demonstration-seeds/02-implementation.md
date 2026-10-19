# Implementation report

- **Agent:** implementation
- **Issue:** #39, PLAN T-08 — Implement role matrix and local demonstration seeds; paired with #38 / T-07
- **Spec IDs:** SYS-06.3, SYS-06.4, SYS-12.2, SYS-12.3
- **Date:** 2026-10-20
- **Branch:** feat/38-role-matrix-local-demonstration-seeds
- **Base commit:** 0ec072452fd532eb388977baeb7a926c630bf4f7 (`origin/master`)
- **Status:** completed

## Summary

Implemented the approved foundation permission matrix, protected Customer/owner
signup provisioning, main-workspace selection, server workspace prerequisite and
replayable local demonstration data. All 87 assigned cases pass. Exact
`bun run verify` passes all 328 cases, traceability, specs, source isolation,
production build and client-artifact isolation. Standalone `db:check` passes.
No repair cycles were needed after initial implementation. Independent review
is pending; this report does not mark PLAN tasks done or approve the diff.

The working tree was clean at testing commit
`04a4ea4621c81695ece1f379d03dd02cf01f9076` before implementation. Approved specs
match `origin/master`; T-06 foundations and committed T-07 tests were available.
Inputs included the implementation instructions, `sdd-implement` and its
Supabase reference, T-08, technical data/RLS/SYS-06/SYS-12 contracts, relevant
product/integration and ADM-03 read-permission contracts, the testing handoff and
its committed tests. The installed Next.js authentication-with-Cache-Components
guide was read before writing server modules; no route/rendering changes were
needed.

Read predicates derive identity from `auth.uid()` and protected profiles, then
check workspace, role, ownership and parent eligibility. Private security-definer
predicates permit review reads independently of otherwise-private underlying
orders. Only the specific predicates have authenticated execution grants;
their schema remains outside Data API exposure. Owner updates use both RLS and
column grants on menu name/opening time. Generic ownership, protected-state,
profile and unspecified lifecycle mutations remain denied.

Auth's insert trigger accepts only selected `customer`/`owner` roles for profile
provisioning and always resolves main from the database. Other metadata cannot
grant workspace/Admin authority. Platform inserts without a selected role create
no application profile, preserving privileged fixture and future provisioning
compatibility. Changing Auth metadata later does not change protected profiles.

Local seeding uses only the configured Docker container, without a database URL,
linked project or HTTP dispatch. It rejects hosted environments, non-loopback
URLs, unexpected local ports and live providers before database execution.
One advisory-locked transaction creates five local Auth accounts spanning all
roles, two approved cafés, menus/hours and two past orders with purchased items.
Domain identities/timestamps are fixed; replay preserves data and passwords.
New passwords are random, never committed, and returned only for newly created
accounts. No credential output is logged or included in errors. Seed SQL is
outside migrations and automatic seeding remains disabled.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-06.3 | completed | All 50 `roles-seeds/rls.test.ts` cases pass: own protected profiles; permitted and denied domain reads; Customer café/review visibility; owner menu/hour updates; protected writes; parent ownership; anonymous, cross-owner and every-role cross-workspace denials. Existing schema/integrity cases also pass. |
| SYS-06.4 | completed | Signup/configuration unit cases, six actual local Auth cases, local seed replay/target cases and both hosted-delivery artifact cases pass. Local TOML already disables confirmation; explicit dev/prod application declarations and their validator require false. No Admin signup profile can be provisioned. |
| SYS-12.2 | completed | Real local RLS main→kit, kit→main and kit→kit cases pass for every role and inherited domain row. Workspace prerequisite cases pass for Customer/owner/Admin and absent authentication. Actual future AI storage/cache/route consumption is outside this foundation's implemented surface. |
| SYS-12.3 | completed | Pure resolver and actual local Auth signup establish protected Customer/owner authority only in main despite forged workspace/Admin metadata; profile workspace/role mutations are denied. |
| T-08: full local matrix/account/seed and catalogue checks | completed | Assigned 87 cases pass; migration replay and standalone `bun run db:check` pass. Direct server-only seed entry replay succeeds. |
| T-08: full verification and hosted credential exclusion | completed | Exact `bun run verify` exits 0: 328 tests pass, then traceability/spec/build/isolation checks pass. Existing hosted-delivery exclusion cases pass. No known demonstration password was added to any artifact. |

## Files changed

- `supabase/migrations/20261020000000_role_matrix.sql`: additive café application/suspension, review moderation, menu name, opening time and order timing fields; scoped private predicates, explicit grants/RLS and protected Auth signup trigger. Applied migrations were preserved.
- `supabase/local-demonstration.sql`: local-only transactional Auth/profile/domain seed data, first-create random credentials, identity-conflict checks and idempotent inserts.
- `src/server/auth/signup.ts`: Zod-validated role selection, trusted main-workspace result and confirmation-off declarations/validation.
- `src/server/auth/workspace.ts`: server-only verified-actor type and fail-closed workspace prerequisite.
- `src/server/seeds/local.ts`: validated local-only Docker administration entry, protected SQL result parsing and credential-safe failures.
- This report.

No tests, fixtures, mocks, test configuration, dependencies, package scripts,
lockfile, specs, PLAN, docs, workflow scripts or delivery workflows were changed.
No supplementary unit tests were added; committed acceptance coverage exercised
the introduced boundaries.

## Checks run

Only final-code results are listed below; no application code changed afterward.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` | passed with escalation | Explicit local reset replayed all migrations successfully; generated platform credentials were omitted. |
| `bun run test tests/unit/roles-seeds tests/integration/roles-seeds` | passed with escalation | 5 files, 87/87 cases, 113.59s. Includes actual local Auth and SQL RLS, local replay and target rejection. |
| `bun run verify` | passed with escalation | Lint and typecheck passed; 14 files, 328/328 tests, 171.34s; traceability passed (9 done tasks); specs passed (0 warnings); source isolation passed; Next.js 16.4.2 webpack production build passed with Cache Components/Partial Prefetching enabled; 35 client artifacts passed isolation. No chained check was skipped or unreached. |
| Direct seed invocation below | passed with escalation | Local demonstration seed replay succeeded; 0 new accounts; generated credentials omitted. This verifies the ordinary Bun server-only entry outside Vitest's import mock. |
| `bun run db:check` | passed with escalation | Every application table has RLS. Run after direct seed replay. |
| `git diff --check` and scope inspection | passed | No whitespace diagnostics; only owned implementation paths and this report are added. |

Verified direct invocation, which deliberately prints only a count:

```sh
bun --conditions=react-server -e 'const { seedLocalDemonstration } = await import("./src/server/seeds/local.ts"); const result = await seedLocalDemonstration({ environment: "local", supabaseUrl: "http://127.0.0.1:54321", provider: "disabled" }); console.log(`Local demonstration seed succeeded; ${result.createdAccounts.length} new accounts. Credentials omitted.`);'
```

The returned `createdAccounts` contains local credentials only on initial
creation; the verified command does not display them. A replay never retrieves
or rotates existing passwords. Checks use local Supabase and no LLM provider.
`bun run test:e2e` was not run: there are no new account/browser routes or
browser acceptance cases in this task. The existing non-failing Vite path-plugin
notice was not treated as acceptance evidence. Verification/reset operations
were serialized and allowed to finish; no reset was interrupted.

## Open issues for the next step

- Independent functional/security review and human diff review/commit remain
  pending. No commit, push, PR, hosted database or deployment operation occurred.
- Dev/prod declarations are validated application configuration, not evidence of
  actual hosted Supabase Auth settings. Hosted configuration was not accessed.
- The workspace helper takes an already authenticated, protected-profile-derived
  actor and establishes only scope. Session resolution/role gates belong to
  T-10; consumers must also enforce their operation's role/ownership permission.
  No consumer or persistent AI cache/storage exists in this task, so actual
  source/cache/route integration remains with the later owning tasks.
- Main/kit provisioning and maintenance remain T-25/T-27; local seed Admins are
  explicit local administration only. No kit creation, hosted Admin provisioning
  or maintenance route was implemented.
- Account HTTP/UI/lifecycle behavior, owner café editable fields, order/review
  creation/transitions and Admin decision/moderation/audit transactions remain
  story-owned. Only fixed logical permission/timing fields were added; the
  minimal past seed orders do not claim a new fulfilment lifecycle or sales
  interpretation.
- All local database commands have finished; no background database check or
  reset remains running from this implementation run.

## Suspicious content found

None.

## Human corrections

The human manually committed the testing work before authorizing continuation.
Implementation started from that clean committed test baseline. No further
human correction changed implementation scope or behavior in this run.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Independent review has not run. |

## Notes for reflection

- **What worked:** Real local Auth and RLS acceptance cases distinguished valid
  authority/allowed reads from baseline denial. All 87 assigned cases and 241
  existing cases pass without test changes.
- **What needed guidance:** The task boundary explicitly separates a workspace
  prerequisite from future AI consumers and reserves story lifecycle writes;
  implementation preserved those limits rather than introducing generic CRUD.
- **What to change in the agent or skill:** None established by this run.
