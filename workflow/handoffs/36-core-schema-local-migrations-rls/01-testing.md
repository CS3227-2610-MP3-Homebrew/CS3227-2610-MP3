# Testing report

- **Agent:** testing
- **Issue:** #36 / T-05
- **Spec IDs:** SYS-06.1, SYS-06.2, SYS-12.1
- **Date:** 2026-10-19
- **Branch:** feat/36-core-schema-local-migrations-rls
- **Base commit:** 123f012ce2df971ea9cdc9a1fab6f54379c08af0 (HEAD and origin/master)
- **Status:** completed

## Summary

Authored 28 local PostgreSQL acceptance cases for the approved core relational,
workspace and RLS catalogue contracts. Test authoring is completed with expected
failing-first evidence; neither database implementation nor full verification
passes. The final exact verification run passes lint and typecheck, then reports
28 expected schema failures and 191 existing passing tests, with no unhandled
errors. The missing implementation is one absent `db:reset` script and the absent
`supabase/config.toml`/local schema. No database query or migration actually ran.

Only T-05 was extracted from PLAN. No implementation task or implementation/review
report was read. The assigned scope was extended explicitly by the human for a
one-line Node environment directive on the existing workflow unit test; its
assertions were unchanged.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-06.1 | completed | Replay, valid graph, Auth FK, 11 orphan relationships, unique review/order, same-workspace and cross-workspace cross-cafe item rejection cases authored; expected missing-implementation failures below. |
| SYS-06.2 | completed | All-application-table catalogue/ACL assertion, explicit migration RLS/grants assertions, and actual `db:check` negative-unexposed-table fail/repair/pass fixture authored. Expected failure occurs before DB setup. |
| SYS-12.1 | completed | Exactly one main workspace after each reset, only Profiles/Cafes store workspace references, inherited child relationships, cross-workspace actor insertion/reassignment and review/cafe consistency cases authored. Expected missing-implementation failures below. |
| T-05: core relational and negative unexposed-table failures recorded | completed | All 28 final-code failing cases and reasons are recorded below. |
| T-05: local-only replay and verification recorded | completed | First replay fails with `Script not found "db:reset"`; no hosted target, URL, dotenv file or live provider is used. |

### Criterion-to-case and failing-first evidence

`R` means the first replay returned status 1 with `error: Script not found "db:reset"`.
`C` means the test failed at the explicit precondition
`Missing implementation: local supabase/config.toml: expected false to be true`.
Every case below was collected and failed in the final `bun run verify`; none was
skipped. These are missing implementation failures, not successful SQL execution.

| Criterion | Test title after criterion prefix | Given / When / expected Then | Actual failure |
| --- | --- | --- | --- |
| SYS-06.1 SYS-12.1 | local migrations replay twice and preserve the core schema and main workspace | Fresh local reset twice; eight entities, identical constraints, exactly one main workspace each time. | R |
| SYS-06.1 SYS-12.1 | valid core relationships persist within one inherited workspace | Synthetic related actors/cafes/menu/hours/order/item/review; valid inserts succeed. | C |
| SYS-06.1 | profiles reference Supabase Auth and reject an orphan Auth user | Profile/Auth FK; absent Auth user update is rejected. | C |
| SYS-06.1 | profiles rejects an orphan workspaces reference | Valid graph; absent workspace update is rejected. | C |
| SYS-06.1 | cafes rejects an orphan workspaces reference | Valid graph; absent workspace update is rejected. | C |
| SYS-06.1 | cafes rejects an orphan profiles reference | Valid graph; absent owner update is rejected. | C |
| SYS-06.1 | menu_items rejects an orphan cafes reference | Valid graph; absent cafe update is rejected. | C |
| SYS-06.1 | opening_hours rejects an orphan cafes reference | Valid graph; absent cafe update is rejected. | C |
| SYS-06.1 | orders rejects an orphan profiles reference | Valid graph; absent customer update is rejected. | C |
| SYS-06.1 | orders rejects an orphan cafes reference | Valid graph; absent cafe update is rejected. | C |
| SYS-06.1 | order_items rejects an orphan orders reference | Valid graph; absent order update is rejected. | C |
| SYS-06.1 | order_items rejects an orphan menu_items reference | Valid graph; absent menu item update is rejected. | C |
| SYS-06.1 | reviews rejects an orphan orders reference | Valid graph; absent order update is rejected. | C |
| SYS-06.1 | reviews rejects an orphan profiles reference | Valid graph; absent customer update is rejected. | C |
| SYS-06.1 | a second review for the same order is rejected | Existing review; new identity with same order is rejected. | C |
| SYS-06.1 SYS-12.1 | order items reject a menu item from otherMenu | Same-workspace other cafe's item cannot join the order. | C |
| SYS-06.1 SYS-12.1 | order items reject a menu item from kitMenu | Other-workspace cafe's item cannot join the order. | C |
| SYS-12.1 | only profiles and cafes store workspace references and children inherit through cafes | Inspect FKs/columns; only Profiles/Cafes reference Workspaces, child FK paths reach Cafe. | C |
| SYS-12.1 | cafes rejects a cross-workspace actor relationship | Cafe workspace differs from owner's workspace; insert rejected. | C |
| SYS-12.1 | orders rejects a cross-workspace actor relationship | Cafe workspace differs from customer's workspace; insert rejected. | C |
| SYS-12.1 | reviews rejects a cross-workspace actor relationship | Review actor differs from order/cafe workspace; insert rejected. | C |
| SYS-12.1 | cafes cannot reassign its actor to another workspace | Existing graph; cross-workspace owner reassignment rejected. | C |
| SYS-12.1 | orders cannot reassign its actor to another workspace | Existing graph; cross-workspace customer reassignment rejected. | C |
| SYS-12.1 | reviews cannot reassign its actor to another workspace | Existing graph; cross-workspace customer reassignment rejected. | C |
| SYS-12.1 | a review cannot join its order to a cafe in another workspace | Direct review/cafe reference cannot disagree with order workspace; a schema deriving cafe only through order has no independent edge to corrupt. | C |
| SYS-06.2 | every application table has RLS and explicit table privileges | Inspect all non-system/non-extension application tables; all have RLS and explicit ACLs, actual db:check exits zero. | C |
| SYS-06.2 | migrations explicitly enable RLS and define schema, table and function grants | Inspect migration SQL with comments removed; explicit RLS per table and explicit grants/revokes exist. | C |
| SYS-06.2 | catalogue checker rejects a new unexposed infrastructure table without RLS and accepts it after enabling RLS | Random unexposed application schema/table without RLS causes actual db:check to fail and name it; enabling RLS makes db:check succeed; finally cleanup. | C |

## Files changed

- `tests/integration/schema/local-database.ts`: local-only Docker/psql runner,
  independent catalogue inspection and minimal transactional synthetic fixture adapter.
- `tests/integration/schema/schema.test.ts`: 28 criterion-named acceptance cases.
- `tests/unit/plan-issues.test.ts`: human-approved single Node environment directive;
  no test assertion changes.
- `workflow/handoffs/36-core-schema-local-migrations-rls/01-testing.md`: this report.

No devDependency was added. The existing declared `yaml@2.9.1` installation was
restored with `bun install --frozen-lockfile`; package.json and bun.lock are unchanged.
No production application, script, migration, spec, PLAN or guide was edited.

## Interfaces defined by tests

No production TypeScript module path, export or signature is defined or imported.
The observable surfaces are local PostgreSQL, migration files and one minimal
catalogue command needed for SYS-06.2:

- `bun run db:check`: targets only local Supabase, exits 0 when every application
  table has RLS, exits nonzero if any application table lacks RLS, and identifies
  the offending schema and table in stdout/stderr. Exposure is irrelevant: a
  newly created, non-extension, unexposed schema is included. A missing command
  cannot satisfy the negative test because it must name the fixture and then
  pass after RLS is enabled.
- Existing specified replay surface `bun run db:reset`: local migrations replay
  from an empty local application database, exit 0 on success. The testing-agent
  instructions provide `bun run db:start` before local DB runs; neither script
  exists at this base and no start was attempted.
- Local stack setup reads only `supabase/config.toml`'s `project_id` and connects
  via `docker exec -i supabase_db_<project_id> psql ... -U postgres -d postgres`.
  No credentials, environment file or externally supplied URL are consulted.
- Minimal test-only SQL fixture mapping: logical entities resolve to tables
  `workspaces`, `profiles`, `cafes` (or `cafés`), `menu_items`, `opening_hours`
  (or `cafe_opening_hours`), `orders`, `order_items`, `reviews`. Schema names,
  primary/FK column names, composite keys, scalar types and defaults are discovered
  from PostgreSQL rather than fixed application contracts. Roles use `role` or
  `app_role`; enum labels containing owner/customer are discovered, with text
  representations `owner`/`customer` as the minimal fallback.
- Main-workspace fixture discriminator: `is_main` boolean, or `kind`, `type`,
  `workspace_kind`, `workspace_type` containing `main` (case discovered for enums).
  Synthetic additional workspaces use false or a demo/kit enum label, with `demo`
  as the text fallback. This is test setup for the specified main-vs-kit distinction,
  not a new product field or public API requirement. Fixture cohorts cover two
  different synthetic workspaces; the migration's actual main workspace is counted
  independently on each replay.
- Auth-user fixture setup uses local Supabase's `auth.users` UUID identity.
  Transactions are rolled back and valid setup is proved separately before every
  expected mutation rejection. Tooling/syntax failures cannot satisfy rejection
  assertions, which require integrity/authorization SQLSTATEs.
- Application catalogue excludes `pg_*`, `information_schema`, extension-owned
  tables and Supabase-managed schemas `auth`, `storage`, `realtime`, `_realtime`,
  `supabase_functions`, `supabase_migrations`, `extensions`, `graphql`,
  `graphql_public`, `vault`, `net`, `cron`, `pgsodium`, `pgsodium_masks`.
  Every other schema is included, including the random unexposed fixture schema.

## Checks run

Only commands actually run are listed. Final-code results are distinguished from
earlier tooling diagnosis.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` (final code) | Expected failing-first, exit 1 | Lint passed; Next type generation and TypeScript passed; Vitest `1 failed / 8 passed` files, `28 failed / 191 passed` tests; no unhandled errors. All failures are R/C above. |
| `bun run test tests/unit/plan-issues.test.ts` (approved final directive) | Passed | `1 passed` file, `10 passed` tests. |
| `bun run check:traceability` (final code, separately) | Passed | `Traceability passed (7 done tasks; all listed criteria have test titles).` |
| `bun run check:specs` (final code, separately) | Passed | `Spec check passed (0 warning(s)).` |
| `bun run test tests/integration/schema/schema.test.ts` (earlier 24-case draft) | Expected failing-first | 24 collected failures: missing reset/config; isolated run had no worker error. Superseded by the 28-case final verify evidence. |
| `bun run verify` (initial installed dependencies) | Tooling failure, resolved | Lint passed; typecheck stopped at pre-existing `TS2307 Cannot find module 'yaml'` in workflow-contract.ts. |
| `bun install --frozen-lockfile` | Restored existing declared dependency | First sandbox run failed tempdir EPERM; approved escalated rerun installed yaml@2.9.1 with unchanged manifests/lock. |
| `bun run test tests/unit/plan-issues.test.ts` (before directive) | Existing environment error, resolved | Isolated file reproduced jsdom EventTarget worker error before test collection, independently of schema imports. |

The final exact verify chain stopped during tests. Traceability and spec checks
were not reached in that chain but passed separately as shown. Build and build
isolation/artifact checks were not reached or independently run. No browser cases
were authored, so `bun run test:e2e` was not run. Local replay was attempted by its
acceptance test but no migration was applied because `db:reset` is absent. SQL
fixture syntax and actual constraint behavior still require the future local
stack to execute; successful lint/typechecking does not establish runtime SQL
correctness or database behavior.

## Open issues for the next step

The local Supabase configuration, core migrations, `db:start`, `db:reset` and
`db:check` are absent at this base. The 28 test failures remain in place. The
negative unexposed-table fixture has fail/pass assertions but could not create
its table or invoke the checker yet. No test was skipped or weakened.

No behavior/spec decision was invented for story fields, lifecycle states,
profile/cafe cardinality, user-facing account contracts, AI tables or the full
role RLS matrix. These tests cover only the assigned core contracts; the later
role matrix is not evidence from this report. The pair is unready to merge.

## Suspicious content found

None.

## Human corrections

- Human explicitly approved the prerequisite scope extension, relayed by the
  coordinating session: add only `// @vitest-environment node` to
  `tests/unit/plan-issues.test.ts` to resolve its independently reproduced
  jsdom pre-collection error. The isolated 10 tests pass afterward and final
  verification has no worker error. No assertions or semantics changed.
- Coordinator requested an exact one-main-workspace assertion instead of a
  presence count; the replay case now counts exactly one main discriminator
  after each reset, with the minimal fixture representation documented above.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No review report read. |

## Notes for reflection

- **What worked:** Direct local-only catalogue/mutation surfaces avoid production
  module dependencies, and setup is checked before rejection assertions.
- **What needed guidance:** Exact main-workspace counting and the explicit human
  scope extension for the unrelated pre-existing test environment failure.
- **What to change in the agent or skill:** A database testing fixture convention
  for logical entity/discriminator mappings would reduce uncertainty where specs
  intentionally leave SQL names/types internal; no change was made to those rules.
