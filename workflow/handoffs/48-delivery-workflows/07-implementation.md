# Implementation report

- **Agent:** implementation
- **Issue:** #49, PLAN T-18 (paired with T-17/#48)
- **Spec IDs:** SYS-07.1
- **Date:** 2026-10-19
- **Branch:** feat/48-delivery-workflows
- **Base commit:** dd0fb3af846268b37a5624c28505f8abe9381fc8 (`upstream/master`); fix round starts from c99a86ca2e0112f083e341a2a758c22c18016668.
- **Status:** completed

## Summary

Addressed SR-01 and the separate toolchain observation in `06-security-reviewer.md` within the two deployment workflows. VERCEL_TOKEN is removed from job-level env and supplied only to Vercel pull and deployment steps; the development deployment step also sets the alias using its quoted captured URL. Build, checkout, tool setup, global CLI installation, migrations and application dependency installation have no VERCEL_TOKEN mapping. Job-level VERCEL_ORG_ID and VERCEL_PROJECT_ID remain environment variables, not secrets. Authentication remains through env, with no --token argument.

Supabase setup now runs before Node setup and repository Bun setup in both workflows. The step immediately following setup-bun compares the running Bun version with package.json's packageManager and fails on mismatch. The repository declares bun@1.4.3; setup-bun continues to discover that declaration without a hard-coded version input. Existing SHA/CLI pins, triggers, ancestry enforcement, migrations, target/production flags and concurrency are unchanged.

All 64 existing delivery tests and the full required verification passed on final code, including 98 tests and the production build. Repair cycles used: 0 of 3. No tests, documentation, specifications, PLAN, dependencies, previous handoffs or other configuration were edited. No workflow, Vercel/Supabase CLI, hosted service/API, database or live provider was executed or contacted. No CLI installation was executed; delivery commands remain YAML only. Independent review/security reruns and documentation were not started; this report records local implementation completion, not review approval or hosted acceptance.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-07.1 / T-18: Static workflow tests and `bun run verify` pass | completed | Existing development/production repository, CI hygiene, Vercel configuration and synthetic validator cases pass: 64 delivery tests. Full verify exits 0 with 98 tests and every stage reached. |
| SYS-07.1 / T-18: Human execution/hosted verification remains required before deployed acceptance | completed | Hosted configuration, workflow execution, restored PATH behavior on hosted runners and API authentication outcomes remain unavailable to agents, as recorded below. |
| SR-01: Restrict Vercel token to API steps | completed | Diff inspection: only pull and deploy have step env token mappings; the dev deploy step also executes alias. No root/job token mapping or build token mapping. The development URL remains shell-local and quoted at alias use. |
| Toolchain observation: Restore repository Bun after Supabase setup | completed | Both YAML step lists order Supabase, Node 24, setup-bun, then version guard. The exact guard was executed locally and exited 0; setup-bun reads packageManager. Actual hosted composite/PATH execution remains unverified. |

## Files changed

- `.github/workflows/deploy-dev.yml`: scope token to pull/deploy-and-alias; reorder tool setup; add immediate Bun version guard.
- `.github/workflows/deploy-prod.yml`: scope token to pull/deploy; reorder tool setup; add immediate Bun version guard.
- `workflow/handoffs/48-delivery-workflows/07-implementation.md`: this report.

No supplementary tests or dependency changes were introduced. `ci.yml`, `vercel.json`, tests, docs and earlier reports remain unchanged.

## Checks run

Only checks actually run on final code are listed here.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run test -- tests/unit/delivery/delivery.test.ts` (escalated for sibling-worktree cache writes) | exit 0 | One test file; 64 passed. Existing tests/fixtures/helpers were unchanged. |
| `bun run verify` (exact command, escalated for sibling-worktree build/cache writes) | exit 0 | eslint; next typegen and tsc; four test files/98 tests; traceability (3 done tasks); spec validation (0 warnings); Next.js 16.4.2 production build and 4 static pages all passed. |
| `test "bun@$(bun --version)" = "$(node -p "require('./package.json').packageManager")"` | exit 0, empty output | The exact YAML guard succeeds against the local repository toolchain. No workflow or delivery command was executed. |
| `git diff HEAD -- .github/workflows/` | exit 0 | Inspected complete workflow diff for token scope, order, immediate guard and unchanged migration/target behavior. |
| `git diff --check` | exit 0, empty output | No whitespace errors. |

The existing Vite tsconfig-paths advisory was informational. No verify stage was skipped or not reached. No browser/e2e checks ran because this pair changes static delivery configuration only.

## Open issues for the next step

No local implementation blocker remains. This fix round awaits human diff review and subsequent independent review/security assessment; no such assessment was run here. PLAN task statuses remain unchanged.

Vercel build deliberately has no token: the human selected a local build from pulled settings. If the first hosted run shows build requires authentication, only the human would then add the token to that one step. This contingency has not been exercised, and local static tests cannot establish pinned Vercel CLI authentication behavior.

Hosted verification is unavailable to agents. GitHub environment allowed refs, teammate approval, self-review/admin-bypass settings and environment-only credential storage still require human evidence. So do Vercel target/project configuration, domain/protection/region and Secret/Config settings, Supabase project/region/session-pooler secret contents, actual tag rejection/approval/migration/deployment outcomes, and the restored Bun version on hosted runners. No secret values or .env* files were read. Global CLI transitive supply chain and exact CLI runtime behavior were not tested. CRON_SECRET and post-deploy maintenance remain T-27/SYS-13 work.

## Suspicious content found

None encountered in this fix round. The prior reviewer report records an external request to inspect environment files; it was treated as historical data, not followed. No .env* file or credential value was read.

## Human corrections

The current human prompt replaces the earlier job-level token decision with step-level API-only token scope. It also selects Supabase-before-Node-before-Bun ordering and an immediate packageManager comparison guard. Scope is limited to the two workflows and this report; no test, Developer Guide, spec or other file was changed. The requested stop before review, security, docs and commit is preserved.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| workflow/handoffs/48-delivery-workflows/06-security-reviewer.md | SR-01 — P2 medium | fixed | Removed job-level VERCEL_TOKEN; only pull/deploy steps receive step-level secrets.VERCEL_TOKEN, including alias in the development deployment step. Build and unrelated installation/setup/migration steps receive no token mapping. Env-var authentication retained. |
| workflow/handoffs/48-delivery-workflows/06-security-reviewer.md | Open issue: non-security toolchain observation (no finding ID) | fixed | Moved pinned Supabase setup before Node 24 and repository setup-bun. Added immediate fail-on-mismatch comparison with package.json packageManager; no hard-coded Bun input. The exact guard succeeds locally. |

The earlier `05-reviewer.md` remains unchanged; no new reviewer/security verdict is asserted.

## Notes for reflection

- **What worked:** Existing static delivery tests remained intact and full verification passed with the smaller credential boundary.
- **What needed guidance:** The human explicitly authorized the token-scope correction and the toolchain ordering/guard while reserving hosted authentication decisions.
- **What to change in the agent or skill:** None evidenced by this run.
