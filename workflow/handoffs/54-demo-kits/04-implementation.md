# Implementation report

- **Agent:** implementation (Codex, single-agent continuation)
- **Issue:** #55 / T-25, paired with #54 / T-24; integration with CUS-03/CUS-04
- **Spec IDs:** SYS-12.4–SYS-12.12; SEC-10.1–SEC-10.3; CUS-03/CUS-04 compatibility
- **Date:** 2026-10-22
- **Branch:** feat/54-demo-kits
- **Base commit:** pre-merge HEAD `5ee40644e9420109fa293f2fbf4b17e2327cad53`
- **Merge source:** `upstream/master`, MERGE_HEAD `402329bd6cd1dd2b7fa4e6297e7aebc012d62114` (PR #138)
- **Status:** completed

## Summary

Single-agent mode. The human merged upstream/master and requested resolution of three documentation conflicts plus the demo-kit/customer-orders migration collision. This continuation preserves the incoming CUS-03 implementation and tests, combines both documentation sides, and moves the demo migration after CUS-03. No test file or assertion was changed. The merge remains uncommitted for the human.

The initial merge reconciliation passed reset, a rolled-back smoke check, full verify (1,137 tests) and full browser coverage (442 tests). The human then removed the unused duplicate `item_name` column; fresh reset, verify (1,137 tests) and demo-kits/orders browser specs (91 tests) all passed for that final simplification. Those earlier checks are historical evidence only. Earlier reports describe the pre-merge tree; their successful results and the prior security review are historical evidence, not fresh independent review of this merge resolution.

## Acceptance criteria

| Requested outcome | Status | Evidence |
| --- | --- | --- |
| Resolve README/User Guide/Developer Guide conflicts while keeping both sides' content | completed | Combined demo creation, Moderation Assistant and isolated-workspace information with CUS-03 pickup, history and cancellation documentation. Removed conflict markers and reconciled stale availability/name statements; the new Customer order sections remain. |
| Unique migration version, no overlapping column creation | completed | `20261022000002_customer_orders.sql` remains unchanged. Demo migration is renamed `20261022000003_demo_kits.sql`; it adds no table columns and reuses CUS-03’s canonical `order_items.name`. The unused `item_name` ALTER and both insert fields/values are removed. |
| Canonical seed columns/types/triggers/constraints | completed | Seed items fill `item_ref`, canonical `name`, quantity and bigint price/line snapshots. Orders explicitly store `SGD`; money variables use bigint. The kit Customer profile has valid protected name `Demo Customer`. Existing CUS-03 live-menu/reference trigger, historical reference behavior, FKs, RPCs and grants remain unchanged. |
| Preserve test assertions | completed | No test files edited. Final tracked/staged test-source SHA256 equals the initial digest, and `git diff --exit-code -- tests` passes. Test sources and assertions are unchanged. |
| Required final reset, verify and demo-kits/orders browser specs | completed | Fresh reset and exact verify passed; all 91 selected browser tests passed after removal of the duplicate snapshot column. Prior full browser evidence remains historical. |
| Leave merge ready for human commit | completed | Final simplification verified; resolution files prepared for staging with explicit escalated approval. No commit, merge continuation or history rewrite performed. |

## Files changed

This continuation changes only:

- `README.md`: combined product summary retaining demo kits, advisory moderation and new Customer ordering/history/cancellation; corrected name availability for new kits.
- `docs/UserGuide.md`: combined limitations and preserved role/demo/order instructions; reconciled stale introductory/availability text and named-kit behavior.
- `docs/DeveloperGuide.md`: combined limitations/architecture documentation, migration rename and canonical seed ownership; corrected new-kit name provisioning statements.
- `supabase/migrations/20261022000002_demo_kits.sql` → `20261022000003_demo_kits.sql`: ordered migration, duplicate ALTER removal, canonical seed adaptation; final form adds no columns and uses only canonical item snapshots.
- `workflow/handoffs/54-demo-kits/04-implementation.md`: this report.

All other staged changes were already present from the human's upstream merge and were preserved. Previous handoffs and tests are untouched.

## Checks run

| Command / check | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` (escalated, local only) | passed | Fresh CUS-03 then demo migration replay succeeded after removal of the only `item_name` ALTER TABLE. Generated credentials omitted. |
| `bun run verify` (escalated) | passed | Lint, typecheck, 60 test files / 1,137 tests (406.83s), traceability (42 done tasks), specs (0 warnings), production build and isolation (128 client artifacts) passed on the final simplified migration. |
| `bun run test:e2e -- tests/e2e/demo-kits tests/e2e/orders` (escalated) | passed | 91 tests passed (1.3m) on the local production build with disabled AI. |
| Test-source preservation | passed | SHA256 `dd7bf1b97011616876c3b1f8f3b046d56c8608eb2a43bfcb437acd194f02f5eb`, aggregating sorted tracked/staged test paths and contents, excluding generated browser harness/build artifacts. Final digest matches; `git diff --exit-code -- tests` returns 0. |
| Incoming CUS-03 preservation | passed | `git diff --exit-code MERGE_HEAD -- supabase/migrations/20261022000002_customer_orders.sql` returns 0. |
| Documentation/migration inventory | passed | No conflict markers in the three docs; all headings from both index sides retained; every migration filename version is unique. |

## Self-review

- CUS-03 owns `orders` pickup/name/lifecycle fields and bigint totals, and `order_items` quantity/price/line totals plus `name` and `item_ref`. Demo creation no longer competes with those definitions.
- Seed inserts use canonical `name` for the sole item-name snapshot; no application code reads `item_name`, so the unused duplicate column has been removed. Explicit original/live item IDs satisfy the existing reference trigger and cross-café FK; the CUS-03 historical deletion behavior remains intact.
- New kit Customers receive a trimmed, valid protected name, so CUS-03's deterministic account-setup guard permits ordering. Ordinary signup and older unnamed accounts retain their existing limitation; no profile-repair operation was introduced.
- Existing kit publication/admission/compensation RPC permissions, empty search paths, workspace/role checks, no-LLM behavior and credential handling are unchanged. No new grants, test changes or runtime dependencies were added.

The initial reconciliation required no repair cycles. Fresh requested checks passed for the human-directed simplification without repair cycles; no tests or assertions were edited.

## Open issues for the next step

Only the human merge commit remains. Final resolution staging requires separate escalated approval because it writes `.git/index`. The existing bounded Auth compensation/crash-outage coverage limitation remains as recorded in the previous security review and Developer Guide; this merge does not change it. Hosted migrations and deployment were not performed.

## Suspicious content found

The existing synthetic injection review remains untrusted domain content. Its text was not treated as an instruction; no new suspicious scope-changing input was followed.

## Human corrections

The human explicitly authorized combining both documentation sides, renaming the branch's demo migration and removing overlapping ALTER statements despite the general rule against rewriting applied migrations. Only the local database was reset; hosted history was not altered. The human prohibited test assertion changes and requested exact reset/verify/full-e2e evidence, this new `04-implementation.md`, and a stop before committing the merge.

The human subsequently directed removal of unused `order_items.item_name`, because canonical `name` already holds the snapshot and no application consumer needs the duplicate. Removed the ALTER and both seed insert fields/values, corrected the Developer Guide, and reran reset/verify plus the demo-kits/orders browser scope; all passed. No test corrections or assertion changes were needed.

## Review responses

No new independent security-review run was requested or performed for this merge. The earlier `03-security-reviewer.md` applies to its recorded pre-merge tree and is preserved unchanged.

## Notes for reflection

- **What worked:** Canonical snapshot population and protected name provisioning allow the existing CUS-03 RPC to consume demo data without changing its contracts or tests.
- **What needed guidance:** Both feature branches independently chose migration version 002 and defined overlapping snapshots; the human supplied explicit reconciliation scope.
- **What to change in the agent or skill:** Reconcile concurrent migration versions and ownership before integration, and verify seeded data through the consuming feature's canonical RPC as well as seed checks.
