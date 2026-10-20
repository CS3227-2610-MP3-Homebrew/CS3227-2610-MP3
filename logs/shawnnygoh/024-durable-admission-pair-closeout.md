# Durable Admission Pair Close-out

## Goal
Test and implement T-11 (#42)/T-12 (#43), then complete independent review, security review, documentation and PLAN reconciliation through the SDD workflow.

## Scope
Eight task/log user-assistant exchanges covering one focused pair. Attribution: user-provided GitHub username `shawnnygoh`.

## Key prompts
- “Use the sdd-orchestrate skill to test and implement T-11 (#42) and T-12 (#43).” This assigned the pair and authorized the five specialist agents through the workflow gates.
- “Test admission operations as `service_role`, not only as `postgres`, so a missing grant fails locally.” This required executable privilege evidence matching the production credential boundary.
- “Use the installed supabase-js secret-key client for the production `rpc` adapter; don’t add or upgrade Supabase packages.” This constrained production composition after the upstream dependency merge.

## Decisions and corrections
- Used the requested branch and handoff directory, with direct escalated requests for Git, GitHub, installation and review commands. Humans committed each gated diff and merged upstream; agents did not commit.
- Restored missing declared tooling with frozen-lockfile installation. Corrected test API usage, isolated persisted synthetic clock windows between runs, supplied real authenticated JWT subjects and removed subjects from service-role fixtures. Repeated verification after final fixture edits resolved a snapshot-evidence gap.
- The human rejected the arbitrary-SQL application seam at Gate 2: available application credentials support the Supabase Data API. Testing replaced it with `.rpc(fn, args)` and local named calls to `public` functions under actual roles. Domain/clock queries stayed local; clock overrides remained trusted construction options. Revised uncommitted tests and `01-testing.md` in place as explicitly requested.
- Preserved acceptance tests during implementation. Added private RLS-protected usage state and narrow service-role RPC grants; production used installed SDK 2.118.0 without package changes. Focused verification passed 69 tests; independent review and security review passed, with no confirmed security findings in scope.
- Documented infrastructure without claiming available AI screens/endpoints; User Guide stayed unchanged. Corrected factory-versus-`reserve()` wording and reran documentation checks.
- Set only T-11/T-12 Status fields to `done`. Final `bun run verify` passed 466 tests and production build; spec checking passed with three warnings about unplanned SYS-01–SYS-03 criteria. E2E was explicitly unnecessary. Human close-out commit: `0884746`.

## Files created or modified
- `src/server/llm/usage.ts`, `src/server/llm/usage-client.ts`
- `supabase/migrations/20261020000001_usage_admission.sql`
- `tests/integration/usage/admission.test.ts`, `tests/integration/usage/local.ts`
- `tests/unit/usage/contracts.ts`, `tests/unit/usage/policy.test.ts`, `tests/unit/usage-internals.test.ts`
- `README.md`, `docs/DeveloperGuide.md`, `workflow/PLAN.md`
- `workflow/handoffs/42-durable-admission-windows-quota-telemetry/`: `01-testing.md`, `02-implementation.md`, `03-reviewer.md`, `04-security-reviewer.md`, `05-docs.md`
