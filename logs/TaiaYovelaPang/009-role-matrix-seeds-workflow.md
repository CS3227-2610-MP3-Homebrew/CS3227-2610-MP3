# Role matrix and local seed workflow

## Goal
Test and implement T-07/T-08 (#38/#39) through the SDD workflow, covering role permissions, protected signup, workspace isolation and local demonstration seeds. Complete independent reviews, documentation and PLAN reconciliation.

## Scope
Nine task exchanges, including this log request and excluding setup context and inline approvals; one focused feature pair and its close-out.

## Key prompts
- "Use sdd-orchestrator skill to help me add test and implement T07 and T08" requested coordinated spec-derived testing and implementation through the repository's gates.
- "Give me the commands to add and commit the changes to github" requested copyable commands while keeping commits and pushes with the human.
- "Log the chat" requested this concise session record.

## Decisions and corrections
- The human authorized testing, implementation, functional/security review and docs agents. Work used `feat/38-role-matrix-local-demonstration-seeds`, based on approved `origin/master` specs. Human commits separated testing, implementation and review responses; agents left reviewable diffs.
- Initial testing added 87 cases. Clean failing-first verification passed lint/typecheck, with 57 expected failures and 271 passes. Removed unsupported restrictions on local password artifacts/seed return values, replaced identity-column positive writes with permitted fields, and added actual local Auth authority tests. Serialized Vitest files because existing schema tests reset the shared local database.
- Implementation added scoped RLS, protected Customer/owner provisioning into main, server-only guards and transactional, replayable local seeds with random first-create credentials. Account screens, session gates, AI consumers, kit creation and maintenance remained later tasks; checks used local Supabase and no live LLM.
- Review round one failed: hosted confirmation-off declarations lacked effective-setting evidence, and cross-workspace updates used an ungranted identity column. Testing added 40 real mutable-field cases with successful owner controls and stored-value checks; all 368 tests passed.
- The human initially answered "Not yet verified", then explicitly confirmed "Verified disabled in both projects" for Confirm email in `homebrew-dev` and `homebrew-prod`. The response report distinguished human inspection from automation. Round two passed; security review found no confirmed findings in scope.
- Recovered interrupted-reset interference and a later stopped Docker daemon before clean checks. Clarified documentation to say no *application* signup endpoint, preserving Supabase Auth's existing endpoint. Final verification passed 368 tests, traceability for 11 done tasks, zero spec warnings, build and isolation. Only T-07/T-08 Status lines became `done`; human close-out commit `08cbd6a` was observed.

## Files created or modified
- `src/server/auth/{signup,workspace}.ts`; `src/server/seeds/local.ts`.
- `supabase/migrations/20261020000000_role_matrix.sql`; `supabase/local-demonstration.sql`.
- `tests/integration/roles-seeds/{actors.ts,rls.test.ts,seeds.test.ts,signup-authority.test.ts,mutable-writes.test.ts}`.
- `tests/unit/roles-seeds/{auth.test.ts,contracts.ts,hosted-artifacts.test.ts}`; `vitest.config.mts`.
- `README.md`; `docs/{DeveloperGuide,UserGuide}.md`; `workflow/PLAN.md`.
- `workflow/handoffs/38-role-matrix-local-demonstration-seeds/{01-testing,02-implementation,03-reviewer,04-testing,05-implementation,06-reviewer,07-security-reviewer,08-docs}.md`.
