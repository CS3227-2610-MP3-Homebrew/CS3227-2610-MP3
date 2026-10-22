# Owner Pairs: Tests and Implementation

## Goal
Publish the café owner specs PR, then start implementing the core owner stories OWN-01 to OWN-07 through their testing/implementation pairs.

## Scope
About eight user-assistant exchanges on one continuing task: the owner role's spec PR followed by four test/implementation pairs.

## Key prompts
- "Push the current commit onto origin, then craft a github pr for pushing the specs for the cafe owners role" asked for the spec branch to be pushed and PR #156 opened before feature work.
- "Do just the first 7 until OWN-07 ... Use just a single agent for OWN-02, 05,06 and 07, and use a ochestrator multi agent structure, or a implementer verifier multi agent structure" limited scope to OWN-01–OWN-07 and set modes: single-agent for OWN-05/06/07, implementer/verifier for the rest.
- "You have permission, you may create the PR and push it ... continue with the owner issues and features from the specs documents" authorised agent commits, pushes and PRs.
- "Continue with anything else that you can. Also, how can I test the current application for myself?" asked for parallel progress and local run instructions.

## Decisions and corrections
- The spec commit carried a `.claude/settings.json` change removing git/PR deny rules; it was flagged in PR #156. A history-rewriting amend was denied by permissions; the human amended and merged #156 themselves.
- Stretch pairs (T-62 onward, T-67–T-80) waited for #156; core pairs T-53/54, T-56/57, T-59/60 started first because their specs were already on master.
- OWN-02 shares pair T-53/T-54 with OWN-01/OWN-04, so the whole pair stayed in the multi-agent loop.
- `git commit` was denied while the deny rules remained; the human committed the T-53 tests and later removed the rules locally, after which commits and pushes were made.
- The testing agent flagged `/owner/cafe` (spec) versus `/owner/profile` (navigation); the implementation agent was told to build `/owner/cafe` and redirect the placeholder.
- A shared T-14 Prep fixture contradicted the new OWN-07.16 direction rule and was corrected in its own test commit.
- The Prep route was changed so disabled AI outranks `no_source_data`, matching the shared operation.
- Database-backed runs were serialized because worktrees share one local Supabase stack; an early overlapping unit run failed from contention and must be rerun.

## Files created or modified
- tests/e2e/owner-cafe/*, tests/integration/owner-cafe/*, workflow/handoffs/109-owner-cafe-setup/01-testing.md (testing agent; committed)
- tests/e2e/owner-queue/{fixtures,actions.spec,pages.spec}.ts, tests/integration/owner-queue/{routes,permissions}.test.ts, workflow/handoffs/115-owner-order-queue/01-testing.md (committed)
- supabase/migrations/20261023000100_owner_order_queue.sql, src/server/owner-orders/{query,schema,source,http}.ts, src/app/api/owner/orders/**/route.ts, src/app/owner/orders/{page,queue-list}.tsx, src/proxy.ts, docs/UserGuide.md, docs/DeveloperGuide.md (feat/115, uncommitted)
- tests/integration/llm/contracts.ts, tests/integration/owner-sales/fixtures.ts, tests/integration/prep-advisor/*.test.ts, tests/e2e/owner-sales/sales.spec.ts, workflow/handoffs/118-owner-sales-prep/01-testing.md (committed)
- supabase/migrations/20261023000200_owner_sales.sql, src/server/llm/schemas.ts, src/server/owner/{sales,prep-advisor}.ts, src/app/api/ai/prep-advisor/route.ts, src/app/api/owner/sales/route.ts, src/app/owner/dashboard/{page,prep-panel,sales-presentation}.tsx, docs/UserGuide.md, docs/DeveloperGuide.md (feat/118, uncommitted)
- logs/naa-siuuuu-ff/handoff.txt
