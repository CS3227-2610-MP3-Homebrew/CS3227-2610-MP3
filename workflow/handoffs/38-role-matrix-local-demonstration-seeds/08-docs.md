# Docs report

- **Agent:** docs
- **Issue:** #39 / T-08, paired with #38 / T-07
- **Spec IDs:** SYS-06.3, SYS-06.4, SYS-12.2, SYS-12.3
- **Date:** 2026-10-20
- **Branch:** feat/38-role-matrix-local-demonstration-seeds
- **Base commit:** 0ec072452fd532eb388977baeb7a926c630bf4f7 (`origin/master`)
- **Reviewed HEAD:** a1a16a9b9bbaaa73e22e30dc7efbe4cad4ac5c6c
- **Status:** completed

## Summary

Updated the User Guide's local-account limitation, the Developer Guide's
implemented foundation and README's product summary. Documentation now describes
the current domain permission matrix, protected Customer/owner Auth provisioning
in main, trusted actor/workspace prerequisite, explicit local demonstration data,
safe seed invocation and serialized test coverage. It preserves the absence of
account/domain/AI screens and the boundaries of later session, AI, kit and
maintenance tasks. No account credentials are published.

Read the root instructions, docs role and `sdd-docs` skill, approved technical
data/RLS/SYS-06/SYS-12 contracts and the assigned PLAN tasks, merge-base-to-working-
tree changes, supporting source/tests/configuration, and every report 01–07 in
this directory. Branch, HEAD and merge base match the supplied inputs; specs and
PLAN are unchanged from the approved base. Functional review `06-reviewer.md`
is completed / overall pass; security review `07-security-reviewer.md` is
completed with no confirmed findings. Earlier round-1 gaps are resolved in
those reports. These are documentation prerequisites, not merge approval.

Final `bun run check:specs` and exact `bun run verify` both pass. Verification
reaches all stages, including 368 tests, production build and 35 client-artifact
isolation checks. One wording repair cycle qualified the absent endpoint as an
**application** sign-up endpoint; both required checks were rerun afterward.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Document SYS-06.3's implemented domain permission boundaries | completed | Developer Guide's Authentication and authorization table matches the migration predicates/grants and passing role/mutable-write tests; detailed evidence below. |
| Document SYS-06.4 and SYS-12.3 provisioning, local seeds and confirmation evidence accurately | completed | Protected Auth trigger and signup helper support only Customer/owner in main. Seed descriptions follow the runner/SQL. Hosted settings are attributed exclusively to the recorded human check. |
| Document SYS-12.2's current workspace foundation and remaining integration limits | completed | Guide distinguishes trusted actor scope equality from authentication/domain authority; real domain RLS coverage is distinct from future AI consumers. |
| User Guide describes available behaviour without inventing UI | completed | Only its local-demonstration limitation changes. No navigation, account flow, endpoint, demo-kit screen or credentials are invented. |
| Required documentation checks | completed | Final standalone spec check: 0 warnings. Final exact verify: exit 0, all stages reached. |

### User Guide claim-to-evidence table

| New or changed statement | Code path and line, or passing test | Assessment |
| --- | --- | --- |
| §9: Local demonstration accounts require separate developer setup. | `supabase/config.toml:21` disables automatic seed execution; explicit entry `src/server/seeds/local.ts:18`; dataset `supabase/local-demonstration.sql:12`. Passing `SYS-06.3 SYS-06.4: local demonstration seeds replay with all roles, approved cafes, menus, hours and past orders`. | The default setup/reset does not create demonstration accounts; separate local invocation does. |
| §9: There is no demo-kit creation screen. | `src/app/page.tsx:3` is the starter page. `rg --files src/app` lists only `page.tsx`, `layout.tsx`, `globals.css` and `favicon.ico`; production build lists `/` and `/_not-found`. | No new browser surface exists. The unchanged no-account/domain/AI-screen statement remains accurate. |

### Developer Guide and README claim-to-evidence table

| New or changed claim / section | Implemented evidence | Limits preserved |
| --- | --- | --- |
| Setup distinguishes migrations/Auth trigger from explicit demonstration seeding. | `supabase/config.toml:21`; `supabase/migrations/20261020000000_role_matrix.sql:109`; `scripts/database.ts`; passing schema replay tests. | No automatic seed or browser account flow is claimed. |
| Local seed invocation prints only the new-account count and runs in server context. | `src/server/seeds/local.ts:1`, `:22`, `:45`; invocation calls `console.log(result.createdAccounts.length)` only. `02-implementation.md` records a passing direct Bun server-only invocation with the same input/entry and credentials omitted. | This docs run did not execute the standalone example; full verification exercises seeding through its existing tests. No email/password/key value is published. |
| Seed targets are local/CI, fake/disabled AI and plain loopback HTTP on the configured port; Docker target is fixed from local configuration. | `src/server/seeds/local.ts:6`, `:23`, `:25`, `:29`, `:33`; passing four hosted/environment target rejection cases in `tests/integration/roles-seeds/seeds.test.ts:48`. | URL validation does not dispatch HTTP or select a database URL. No hosted access is claimed. |
| Dataset has five main accounts across all roles, two approved/non-suspended cafés with menus/hours and two past purchased orders; stable data and replay. | `supabase/local-demonstration.sql:3`, `:12`, `:19`, `:53`, `:58`, `:66`, `:74`, `:78`; passing replay case in `seeds.test.ts:21`. | Seed SQL supplies no fulfilment state, sales semantics or kit creation. Existing rows are preserved; identity conflicts fail. |
| First-create passwords are random; only newly created credentials are returned; replay does not rotate/retrieve passwords. | `supabase/local-demonstration.sql:33`, `:44`, `:83`; `src/server/seeds/local.ts:37`, `:44`. | Sensitive return values are excluded from the guide/example output. Seed SQL is separate from migrations; hosted exclusions pass in `tests/unit/roles-seeds/hosted-artifacts.test.ts:7`. |
| Data model includes the new shared permission fields and fourth migration. | `supabase/migrations/20261020000000_role_matrix.sql:2`, `:5`, `:8`, `:9`, `:10`, `:11`. | Remaining story fields/transitions and AI tables stay deferred. Existing immutable workspace migration is described by name rather than incorrectly called the final migration. |
| Workspace-scoped café/menu/hour, order/item and review reads in the role table. | Migration `:17`, `:28`, `:39`, `:67`, `:79`, `:83`; passing `tests/integration/roles-seeds/rls.test.ts:6`, `:20`, `:36`, `:47`, `:58`, `:82`. | Admin has no unrelated menu/hour/order access; owner review access is denied. Reviews can be read independently of another Customer's private underlying order. |
| Only own menu name/opening time updates are granted; generic/protected/ownership/profile writes remain denied. | Migration `:60`, `:64`, `:73`, `:76`; passing `rls.test.ts:75`, `:111`, `:119`, `:128`, `:142`, `:151`, `:164`; mutable-field cases `tests/integration/roles-seeds/mutable-writes.test.ts:29`. | Approval/suspension/moderation transactions and ordinary insert/delete lifecycles are not implemented here. |
| Customer/owner-only protected Auth provisioning in main ignores forged authority metadata; no role selection creates no application profile. | `src/server/auth/signup.ts:4`, `:16`; migration `:90`, `:93`, `:96`, `:99`, `:102`; actual local Auth cases in `tests/integration/roles-seeds/signup-authority.test.ts:46`, `:55`, `:73`. | Existing Supabase Auth signup is distinct from an application sign-up endpoint/screen, neither of which is added. Later Auth metadata edits have no protected-profile update path. |
| Local and declared dev/prod confirmation-off are distinguished from effective hosted settings. | `supabase/config.toml:37`; `src/server/auth/signup.ts:5`, `:10`, `:27`; `05-implementation.md:20` records the human's “Verified disabled in both projects”; `06-reviewer.md` accepts that evidence. | Hosted settings were not inspected by this agent; the declaration/validator neither configures nor monitors hosted Auth. No drift prevention is claimed. |
| Workspace helper is a prerequisite using prior authenticated, protected-profile-derived actor context. | `src/server/auth/workspace.ts:10`, `:13`, `:14`; passing `tests/unit/roles-seeds/auth.test.ts:53`, `:62`. | Structural validity is not identity proof or complete role/record authorization. No session or AI consumer is present. |
| Private predicates use explicit grants, scoped booleans, empty search paths and qualified relations outside Data API exposure. | Migration `:17`, `:28`, `:39`, `:52`; `supabase/config.toml:6`. | Internal parent-RLS bypass does not grant broader domain access. Catalogue coverage is separate from policy correctness. |
| Test files serialize around database replay; role suite has 127 cases including 40 meaningful foreign mutable-field denials; full suite has 368 tests. | `vitest.config.mts:9`; role fixtures `tests/integration/roles-seeds/actors.ts:7`, `:11`, `:48`; `mutable-writes.test.ts:10`, `:29`, `:48`, `:63`; final verify passes 15 files / 368 cases. Role-suite count agrees with passing targeted security-review evidence in `07-security-reviewer.md`. | Privileged fixture setup/observation is separate from ordinary attempts. Tests establish current local policies, not future AI/cache/route integration, hosted delivery outcomes or kit/maintenance provisioning. |
| README product summary and Known limitations reflect the current backend foundation and absent screens. | Evidence above; source route inventory and final production route listing; later-task allocations in approved T-10/T-25/T-27. | No planned product screen, navigation or later integration is presented as available. |

## Files changed

- `docs/UserGuide.md`: §9 Known limitations corrects the stale absence-of-demo-accounts statement while preserving UI limits.
- `docs/DeveloperGuide.md`: contents/setup plus Local demonstration data; Data model and database schema; Authentication and authorization; Security; How to test; Known limitations. Removed stale baseline-only/no-provisioning/no-role-access text in place.
- `README.md`: product summary only.
- `workflow/handoffs/38-role-matrix-local-demonstration-seeds/08-docs.md`: this report.

Listed reports 01–07 before choosing 08. Preserved existing untracked
`06-reviewer.md` and `07-security-reviewer.md` and all previous reports. No code,
tests, configuration, specs, PLAN, workflows, reflections or logs were edited.
No new external reuse was identified; the existing Acknowledgements table/totals
remain unchanged. No new workflow file requiring an inventory row was created;
this report follows the existing handoff convention.

## Checks run

Only final-documentation checks are listed here.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | passed; exit 0 | `Spec check passed (0 warning(s)).` Run after the final endpoint wording fix. |
| `bun run verify` | passed with escalation; exit 0 | Lint/typecheck passed; 15 files / 368 tests passed in 170.40s; traceability passed (9 done tasks); specs passed (0 warnings); source isolation passed; Next.js 16.4.2 webpack production build passed; 35 client artifacts passed isolation. All chained stages were reached. |
| `git diff --check -- docs/UserGuide.md docs/DeveloperGuide.md README.md` | passed | No whitespace diagnostics in the changed guides/summary. |
| Branch/base/HEAD, route inventory and final owned-path scope inspection | passed | Assigned branch and commits match; no application browser route was added. Only the four owned documentation/report paths were changed by this run. |

Read `package.json` before checks. Both exact verify runs finished without
interruption; the second followed the final wording fix. No further guide
change followed that final run. Tests' local replay/reset work was serialized.
The existing non-failing Vite path-plugin notice is unchanged and is not treated
as acceptance evidence. No database/test/build command remains in flight, and
local Supabase is left running.

No standalone seed/reset or `test:e2e` was run by this docs agent. There is no new
browser surface or browser acceptance case. No `.env*` access, hosted database
or hosted settings inspection, live LLM call, deployment, Git mutation, review
command or agent delegation/message was performed.

## Open issues for the next step

No documentation blocker or code/spec discrepancy was found for this reviewed
scope. No screenshots are needed: this pair adds no browser surface.

Session resolution/streaming gates, actual AI source/cache/route consumers,
demo-kit creation, maintenance provisioning and reserved story lifecycles remain
later tasks. Hosted confirmation evidence is the recorded human check and can
drift. Local tests and static checks do not establish hosted delivery outcomes.
PLAN status reconciliation remains outside this docs agent's write scope; T-07
and T-08 statuses were not changed. Human diff review/commit/merge remain human
gates; this report approves none of those actions.

## Suspicious content found

None. Evidence inputs did not attempt to expand this task's permissions or skip
required checks.

## Human corrections

No new product behaviour was requested. The coordinator requested “application
sign-up endpoint” to distinguish the absent application surface from the
existing Supabase Auth `/auth/v1/signup` boundary. Applied the wording change
after the first successful verify finished, then reran both required checks.
The previously recorded human hosted-settings verification remains attributed
to that human evidence alone.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None for this docs run | None | None | Functional/security reports 06/07 are prerequisites and were preserved. |

## Notes for reflection

- **What worked:** Code/test evidence supported a concise role matrix and a credential-omitting seed example while preserving the distinction between backend foundations and available screens.
- **What needed guidance:** The coordinator identified an ambiguous endpoint claim; qualifying it as an application endpoint preserved the existing Supabase Auth boundary accurately.
- **What to change in the agent or skill:** None established by this run.
