# Exclude Skipped Tests from Traceability Coverage

## Goal
Prevent skipped, pending and expected-failure test titles from satisfying coverage for criteria in done PLAN tasks. Add focused regression tests and leave a reviewable local diff.

## Scope
Three task-related user-assistant exchanges covering one focused workflow-script fix and its session log.

## Key prompts
- "This task changes one workflow script and its unit test. It changes no application code, specs, PLAN.md, agents, skills or docs." This restricted the implementation to the traceability checker and its existing unit test.
- "A title still parses through the same modifier chain, but a test whose chain includes `skip`, `todo`, `fixme`, `fails` or `fail` contributes **no** coverage." This defined the exclusion rule while preserving existing parsing behavior.
- "Add tests that use the existing `check()` helper and its fixture plan. Keep the existing two tests unchanged." This required regressions for all five excluded modifiers and a passing `only`/`concurrent` case without replacing existing coverage.
- "Do not commit, push or open a PR, and do not write a session log yet. I'll review the diff first." This reserved publication and review for the user; the subsequent explicit session-log request authorized this log.

## Decisions and corrections
- The initial working tree was clean. The first fetch failed because the sandbox could not write `.git/FETCH_HEAD`; an escalated retry succeeded, but work then stopped under the original stop-on-failure instruction.
- The user subsequently requested escalated approval for both Git commands and authorized continuation if both succeeded. Fetch and branch creation succeeded on `fix/traceability-skipped-tests` from `upstream/master`.
- Added five exclusion cases and one passing modifier case. Before the script fix, the targeted test run produced five expected failures and three passes: excluded test titles incorrectly returned exit 0.
- Added a coverage-exclusion flag while preserving modifier-chain parsing, plus the exact requested explanatory stderr line and a comment explaining the exclusions.
- `bun run verify` exited 0: lint, typecheck, all eight tests, traceability and the production build passed. Traceability reported zero done tasks in the repository plan.
- The required final status listed exactly the two requested modified files. The diff contained 36 insertions and one deletion across two files.
- Retained the known limitation: `describe.skip` blocks and conditional `test.skip()` calls inside test bodies are not detected. No scope tracking was added; no unresolved uncertainties were reported.
- No commit, push or PR was made. The user supplied `shawnnygoh` as attribution for this log.

## Files created or modified
- `workflow/scripts/check-traceability.ts`
- `tests/unit/check-traceability.test.ts`
