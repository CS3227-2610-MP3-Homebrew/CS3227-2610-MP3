# Docs report

- **Agent:** docs
- **Issue:** #37 / T-06, paired with #36 / T-05
- **Spec IDs:** SYS-06.1, SYS-06.2, SYS-12.1
- **Date:** 2026-10-19
- **Branch:** feat/36-core-schema-local-migrations-rls
- **Base commit:** 123f012ce2df971ea9cdc9a1fab6f54379c08af0 (`origin/master`); implementation HEAD ba4217d662112bdaac2e36abac1c37d4d90b71c8
- **Status:** completed

## Summary

Documented the reviewed core database foundation, local Supabase commands,
workspace integrity, baseline access controls, catalogue enforcement and test
limits. Corrected the README summary's implication that product screens already
exist. The User Guide now identifies the starter screen and current availability;
it adds no invented feature flow, account credentials or screenshots.

Read the assigned PLAN pair, linked technical contracts, merge-base change
inventory, all four prior pair reports and the implementation/tests. Independent
review `03-reviewer.md` is completed with Overall pass; the separate
`04-security-reviewer.md` is completed with no confirmed findings. No code/spec
discrepancy was found within this documentation scope. Remote CI, hosted signup,
full role policies, demo-kit creation, domain lifecycles and AI behavior remain
outside the documented implementation.

Both required commands passed on the final guide content. Exact verification
passed all 219 tests, production build and isolation checks. Documentation
required no repair cycle. Completion records documentation evidence and does not
approve merge or deployment.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-06.1 documentation | completed | Developer Guide data-model table matches eight core tables, foreign/composite keys and unique review/order; final schema tests pass. |
| SYS-06.2 documentation | completed | Developer Guide describes explicit RLS/grants, own-profile access, public-table RLS trigger, cross-schema catalogue check and CI wiring, with coverage limits. |
| SYS-12.1 documentation | completed | Developer Guide explains one main workspace after replay, workspace references only on profiles/cafes, inherited child workspace and immutable membership. Actual kit creation is explicitly later work. |
| User Guide claim traceability | completed | Statement-level evidence below; no new user flow is claimed. |
| Required final documentation checks | completed | Standalone check:specs exits 0; exact verify exits 0, all 219 tests and build pass. |

### User Guide claim-evidence table

| New or changed statement | Evidence |
| --- | --- |
| Contents links identify Getting started and Known limitations. | Existing matching numbered headings in `docs/UserGuide.md:8` and `:75`; final `bun run check:specs` passes. |
| The current home page displays the Next.js starter screen. | `src/app/page.tsx:3`, `:9` and `:16` render the starter logo and edit-page heading; production build lists only `/` and `/_not-found`. |
| Product instructions will be added as usable features become available. | Editorial scope statement for the existing role-section placeholders; no current behavior or future availability date is claimed. The current page implementation is `src/app/page.tsx:3`. |
| The current build has no signup/sign-in, customer, owner, admin or AI screens. | `rg --files src/app` finds only page, layout, stylesheet and favicon; `src/app/page.tsx:3` is the starter page. Final build lists `/` and `/_not-found` only. |
| Database setup provides no demo accounts or demo-kit creation screen. | `supabase/config.toml:21` disables seed files; the only seeded application row is the main workspace at `supabase/migrations/20261019000000_core_schema.sql:24`; `scripts/database.ts:47` fixes reset to `--local --no-seed`; no account-insert migration or kit route/screen exists. |

### Developer Guide and README evidence

| Claims/sections | Implementation or passing-test evidence |
| --- | --- |
| Local prerequisites, pinned toolchain and database commands | `package.json:5` specifies Bun and Node; scripts at `:17` and Supabase devDependency at `:46`; `scripts/database.ts:30` uses Docker and `:45` invokes the installed CLI. Implementation report's final lifecycle checks passed. |
| Fixed local targets, extra-argument rejection, reset and credential-output handling | `scripts/database.ts:7`, `:12`, `:30`, `:47`, `:49`, `:53` and `:55`; security reviewer independently confirmed extra-target rejection. Successful output is omitted and failure filtering remains heuristic. |
| Local services, ports, no seeds and API exposure configuration | `supabase/config.toml:1`, `:3`, `:11`, `:21`, `:28` and `:39`. No hosted behavior is inferred from local configuration. |
| Eight entities, stable identities, main workspace, roles and integrity constraints | `supabase/migrations/20261019000000_core_schema.sql:17`, `:19`, `:27`, `:34`, `:41`, `:47`, `:52`, `:60`, `:70` and `:90`; passing schema tests for replay, valid graph, Auth/FK orphans, duplicate review and cross-cafe items. |
| Workspace inheritance, immutable profile/cafe membership and exact error | Core migration's FK paths and order-workspace trigger; `supabase/migrations/20261019000002_immutable_workspace_identity.sql:4`, `:8`, `:20`; passing SYS-12.1 inherited-workspace and cross-workspace relationship cases. Manual concurrency evidence remains attributed to `02-implementation.md`. |
| Explicit RLS, own-profile SELECT, restricted trigger functions and future-object protections | Core migration `:2`, `:90`, `:106`, `:148`, `:156`, `:160`, `:166`; `20261019000001_default_privileges.sql:3`; passing migration/catalogue tests. This does not establish the later role matrix. |
| All-application-table checker, exclusions, fixed messages and fail-closed behavior | `scripts/database.ts:18`, `:21`, `:23`, `:26`, `:34`, `:40`, `:43`; passing `SYS-06.2: catalogue checker rejects a new unexposed infrastructure table without RLS and accepts it after enabling RLS`. |
| CI commands and workflow inventory correction | `.github/workflows/ci.yml:28` through its existing verify/e2e steps; the existing inventory row was corrected, and no workflow file was added by docs. Remote execution is unobserved. |
| Verification chain, resets, synthetic fixtures, 28 schema cases and 219 total tests | `package.json:10`, `:12`, `:16`, `:24`; `tests/integration/schema/schema.test.ts:7`, `:28`, `:168`; `tests/integration/schema/local-database.ts:26`, `:150`, `:152`; fresh exact verify results below. |
| README implemented-foundation summary and later product roles | Eight-table migrations and tooling above; `src/app/page.tsx:3` and final route listing establish the current starter UI. Existing product roles are now labeled planned. |

## Files changed

- `docs/UserGuide.md`: contents links; sections 1 and 9 describe the current
  starter screen and lack of role/account/demo/AI screens.
- `docs/DeveloperGuide.md`: contents; local setup; corrected local-Supabase
  workflow decision and existing CI inventory row; data model; authentication;
  security; testing/troubleshooting; known limitations.
- `README.md`: product summary and planned-role label.
- `workflow/handoffs/36-core-schema-local-migrations-rls/05-docs.md`: this report.

Acknowledgements/reuse totals are unchanged: this change introduces no reused
external idea, file or snippet. Existing MP2 attribution remains intact. Product
site pages, reflections/logs, PLAN, specs, prior handoffs, implementation,
configuration and tests were preserved.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | Passed, exit 0 | `Spec check passed (0 warning(s)).` |
| `bun run verify` | Passed, exit 0 | Lint; Next type generation and TypeScript; nine files/219 tests; traceability for seven done tasks; specs with zero warnings; production build; application-source and 35-client-artifact isolation. |
| `git diff --check` | Passed, exit 0 | No whitespace errors in the documentation diff before report creation. |
| Final diff/status and source inspection | Completed | Only assigned documentation and this report authored by docs; pre-existing review reports retained. |

Docker-dependent verification used approved escalated execution. Schema tests
replayed local migrations twice and ran the negative/repair catalogue fixture.
No separate lifecycle commands, Playwright, remote CI, application server,
hosted database, live LLM or deployment was run by docs. No environment file or
secret value was read, printed or edited. No check was skipped or weakened.

## Open issues for the next step

None blocking documentation. No screenshots are required for this pair, which
adds no browser feature. The Developer Guide records absent later role/signup,
demo, domain and AI behavior, the missing committed concurrent regression,
heuristic CLI diagnostic filtering and unobserved remote CI. Existing hosted
delivery limitations remain in place. PLAN completion is coordinator-owned.

## Suspicious content found

None. Handoffs and package output were treated as evidence; no input was used to
expand write scope or skip checks.

## Human corrections

None during this documentation run.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No documentation finding or separate review was invoked. |

## Notes for reflection

- **What worked:** Database source and passing acceptance cases supported precise
  structural documentation while the starter route made current UI limits clear.
- **What needed guidance:** None beyond the assigned pair and write scope.
- **What to change in the agent or skill:** No change identified from this run.
