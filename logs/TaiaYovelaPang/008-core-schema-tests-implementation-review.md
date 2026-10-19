# Core schema tests, implementation and review

## Goal
Add tests and implement T-05/T-06 through the SDD orchestration workflow, then complete review, security review, documentation and PLAN reconciliation.

## Scope
Six user-assistant exchanges covering one focused task and its session log.

## Key prompts
- "Use sdd-orchestrator skill to help me add test and implement T05 and T06" requested the project's gated testing and implementation workflow for the core database foundation.
- "Log" requested a persistent summary of the session's work, decisions and evidence.

## Decisions and corrections
- Spec and issue gates passed against fetched `origin/master`; T-05/#36 and T-06/#37 share `feat/36-core-schema-local-migrations-rls`. The user authorized the testing and implementation agents, then continued through the named review and documentation stages.
- Testing authored 28 cases for SYS-06.1, SYS-06.2 and SYS-12.1. Failing-first verification recorded missing local configuration/reset implementation. Frozen dependency installation restored the already-declared `yaml` dependency. The user approved a one-line Node environment directive for the existing plan-issues test, fixing its independently reproduced jsdom crash without changing assertions.
- The coordinator requested an exact one-main-workspace assertion. Tests defined the minimal local `db:check` interface and retained expected failures until implementation.
- The human committed testing as `20bc8b0` before implementation and implementation as `ba4217d` before review. Docker Desktop was started with approval; database work remained local.
- Implementation added eight core entities, workspace/relational constraints, explicit RLS/grants, baseline own-profile access, pinned Supabase tooling and CI checks. A manual two-transaction check exposed a snapshot-dependent workspace gap; an additive migration made profile/café workspace membership immutable. The repaired reproducer passed; no automated concurrent regression was added. An initial test timeout did not recur in final verification.
- Independent review passed without findings; security review reported no confirmed findings in scope. Documentation was updated from code/test evidence. Both PLAN statuses became `done`; final `bun run verify` passed all 219 tests, lint, typecheck, traceability, specs, build and artifact isolation. Browser tests and remote CI were not run; no browser behavior changed.
- Documentation, PLAN changes and review handoffs remain uncommitted for human review. Agents made no commits, PRs or deployments.

## Files created or modified
- `tests/integration/schema/local-database.ts`, `tests/integration/schema/schema.test.ts`
- `tests/unit/plan-issues.test.ts`
- `scripts/database.ts`
- `supabase/config.toml`, `supabase/.gitignore`
- `supabase/migrations/20261019000000_core_schema.sql`
- `supabase/migrations/20261019000001_default_privileges.sql`
- `supabase/migrations/20261019000002_immutable_workspace_identity.sql`
- `package.json`, `bun.lock`, `.github/workflows/ci.yml`
- `README.md`, `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `workflow/PLAN.md`
- `workflow/handoffs/36-core-schema-local-migrations-rls/01-testing.md`
- `workflow/handoffs/36-core-schema-local-migrations-rls/02-implementation.md`
- `workflow/handoffs/36-core-schema-local-migrations-rls/03-reviewer.md`
- `workflow/handoffs/36-core-schema-local-migrations-rls/04-security-reviewer.md`
- `workflow/handoffs/36-core-schema-local-migrations-rls/05-docs.md`
