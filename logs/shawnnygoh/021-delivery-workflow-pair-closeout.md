# Delivery Workflow Pair Close-out

## Goal
Run Homebrew's T-17/T-18 foundation pair (#48/#49, SYS-07.1) through testing, implementation, review, security, documentation and local close-out, with human review stops.

## Scope
Eight task-related user–assistant exchanges covering one focused delivery-workflow pair and this log.

## Key prompts
- “Go through stage 2 (testing), then stop for my review. Don't start implementation.” This required failing-first evidence before separately authorized implementation.
- “Remove `VERCEL_TOKEN` from job-level `env`.” This replaced the earlier credential decision to limit token exposure to API steps.
- “Stop on any open P0/P1/P2 finding.” This made security clearance a prerequisite for documentation and close-out.
- “Set T-17 and T-18 Status to `done` in `workflow/PLAN.md` (only those two lines).” This bounded close-out metadata changes and required final verification.

## Decisions and corrections
- Used `../homebrew-48`, branch `feat/48-delivery-workflows`, and user-provided attribution `shawnnygoh`; no account lookup. Initial base/spec checks passed, and the escalated issue check printed `skip` for both tasks.
- Testing added a YAML devDependency and static workflow/configuration checks with synthetic positive/negative fixtures. Three initial failures correctly identified absent development/production jobs and `vercel.json`.
- Renamed `02-testing.md` to `03-testing.md` and changed its two self-references because `02-spec.md` already existed.
- Implemented the selected workflow names, Vercel 64.5.0, Supabase 2.121.0, pinned actions, Node 24 and packageManager Bun. CI and testing-owned files remained unchanged.
- The assistant mistakenly interrupted the first review. A rerun returned a blocking Bun observation but saved no report because `Overall: fail.` failed launcher validation. The human merged the separate validator fix; upstream merges above the feature commit were expected.
- Security finding SR-01 (P2) exposed job-level token inheritance. The authorized fix scoped tokens to pull/deploy/dev-alias steps, leaving build token-free. Hosted build authentication remains a human first-run decision.
- Supabase setup's Bun 1.3.10 override was corrected by running it before repository Node/Bun setup and adding an immediate packageManager version guard.
- Review round 2 passed; security re-check confirmed both fixes resolved with no open findings. Docs added evidence-backed delivery/setup guidance, tidied the production workflow row and added one README pointer; User Guide stayed unchanged.
- Changed exactly the two PLAN Status lines to `done`. Final `bun run verify` passed 98 tests, traceability for five done tasks, specs and build after an escalated cache-permission retry. Hosted setup/execution remains unverified. Agents made no commits or deployments; human commits enabled stage transitions.

## Files created or modified
- `tests/unit/delivery/{delivery.test,workflow-contract,workflow-fixtures}.ts`
- `.github/workflows/{deploy-dev,deploy-prod}.yml`
- `vercel.json`, `package.json`, `bun.lock`
- `docs/DeveloperGuide.md`, `README.md`, `workflow/PLAN.md`
- `workflow/handoffs/48-delivery-workflows/{03-testing,04-implementation,05-reviewer,06-security-reviewer,07-implementation,08-reviewer,09-security-reviewer,10-docs}.md`
