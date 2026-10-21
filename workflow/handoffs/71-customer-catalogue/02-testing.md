# Testing report

- **Agent:** testing
- **Issue:** #71 / T-40 verification gate follow-up
- **Spec IDs:** CUS-01.1–CUS-01.11; CUS-02.1–CUS-02.9
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 5b026e2
- **Status:** completed

## Summary

The human requested fixing verification runtime/setup before reviewing the tests. Existing staged T-40 files and the immutable 01-testing.md report were preserved, as were uncommitted customer-story/spec handoff changes. No implementation task or implementation/reviewer report was read.

Correction to 01-testing.md: its minute-scale no-output runs were interrupted prematurely. That observation did not establish a hang; the coordinator identified the existing documented 5–9 minute serial verification duration. This follow-up allows the suite to finish.

The full browser run identified a genuine test race: streamed authentication redirects could navigate Chromium away before `page.goto()` response bodies were retrieved (`Network.getResponseBody: No resource with given identifier found`). The owned shell test now reads the raw HTML through `page.request.get()` with the same browser-session cookies, then performs its browser navigation separately. All protected-name/reference and rendered-content assertions remain intact.

No speculative fixture retry or assertion weakening was introduced. The installed Node 24 runtime runs the existing Vitest/Playwright tooling successfully. Verification gate tooling/setup is resolved; the gate remains red solely because implementation is absent. Bun 1.4.3 is still the package manager and runs the repository scripts. An explicit exported PATH in the same command shell is necessary; the prior temporary custom-shell wrapper did not produce the equivalent environment in nested scripts.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| All assigned T-40 criterion cases | completed | Existing criterion mapping and interfaces in 01-testing.md remain authoritative. Final verify: 20 expected failures, 954 passes. Final catalogue browser run: 41 expected implementation failures, 3 protected-shell passes. No criterion assertion was weakened. |
| Preserve expected implementation failures | completed | No implementation or acceptance assertion was removed or weakened. |
| Diagnose verification gate | completed | Explicit Node24 PATH export fixes runner selection; complete verify exits only for expected absent implementation. Browser shell-response race repaired and all 3 affected cases pass in the final whole-catalogue run. |

## Files changed

- `tests/e2e/catalogue/pages.spec.ts`: replace race-prone Chromium response-body retrieval with cookie-sharing APIRequestContext raw-shell reads followed by browser navigation; preserve all assertions.
- This new report.

No runtime dependencies, package scripts, source, migrations, specification, PLAN or documentation changed. No commits or index modifications. Staged original files remain staged; the test repair is an additional unstaged diff.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Bundled Node Vitest run --reporter=verbose | diagnostic interrupted | Roughly ten existing AI-operation/database composition cases passed with progress, taking 1–11 seconds each. Diagnostic stopped intentionally (130) before starting the required command. |
| `bun run db:check` (escalated) | passed | Every application table has RLS. |
| Explicit Node PATH export, then `bun run test:e2e` exactly (before browser repair) | failed with diagnosed test race | Full suite: 129 passed, 43 failed in 3.4m; all 128 baseline cases pass. Catalogue: 41 expected implementation failures, 1 pass, 2 response-body races subsequently repaired. Both production build/start web servers succeeded. |
| Explicit Node PATH export, then `bun run test:e2e -- tests/e2e/catalogue` (final code) | expected failure | 44 cases collected/run with 4 workers: 41 expected missing-implementation failures, 3 passed in 1.5m; no runner, DB, fixture SQL, baseline or protocol errors. Both production build/start web servers succeeded. |
| Final `bun run lint` and `bun run typecheck` | passed | Both exit 0 after browser-only repair. Full Vitest inputs unchanged from the required verify run. |
| `bun run check:traceability` | passed | Separate command after verify chain stopped: 32 done tasks, all criterion titles present. Coordinator independently confirmed the same. |
| `bun run check:specs` | passed | Separate command after verify chain stopped: 0 warnings. Coordinator independently confirmed the same. |
| `git diff --check` | passed | No whitespace errors. |
| Explicit Node PATH export, then `bun run verify` exactly | expected failure | Lint/typecheck passed. Vitest completed in 477.30s: 39 files passed, 5 catalogue files failed; 954 tests passed and only the 20 known missing-implementation cases failed (974 total). No runner, DB, unhandled-worker or other failures. Exit 1 from test/verify; chained traceability, spec check and build were not reached. |

Runtime setup uses the explicit command shell export:

```sh
export PATH=/Users/taiayovelapang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
bun run verify
```

All database/test commands requiring Docker access run escalated with the normal approval tool. No credentials or .env files are read or printed by the agent. No hosted service or live AI is used. Browser verification follows Vitest sequentially because the existing schema suite resets the shared local database.

## Full browser result before the shell-test repair

With the same explicit Node PATH export, `bun run test:e2e` ran the full 172-case suite in 3.4 minutes: 129 passed and 43 failed. All 128 existing baseline cases passed. Among 44 catalogue cases, one passed, 41 failed at expected missing implementation boundaries and two failed from the identified response-body retrieval race. There were no local Supabase/SQL setup failures, collection failures or baseline failures.

The 41 expected catalogue failures split into 27 absent-route/framework-404 failures and 14 absent `public.cafes.area` fixture prerequisites. Those fixture prerequisites are missing product schema, not evidence that downstream assertions executed. The prior intermittent local database errors do not reproduce with browser tests run strictly after verification's schema resets.

The final whole-catalogue run after the repair completed: 41 expected failures and all three shell cases passed, with no tooling/setup failures. Full verify predates only the browser response-body repair; Vitest inputs are unchanged. Final lint/typecheck cover the repaired browser code separately.

## Open issues for the next step

Only expected missing catalogue implementation remains. All three repaired shell browser checks pass. Testing authoring is completed with deterministic failing-first evidence; this does not mark T-40/T-41 done in PLAN or approve the implementation. The product still cannot meet the detailed criteria until its routes, public fields, card and clock logic exist. This is failing-first test-authoring completion, not a passing implementation or merge approval.

## Suspicious content found

Generated `.next/playwright-results/.../error-context.md` contains boilerplate instructions: “Explain why, be concise, respect Playwright best practices” and “Provide a snippet of code with the fix, if possible.” These are tool-output data, not task instructions. The test repair follows the human's explicitly authorized verification task and the observed protocol error.

## Human corrections

The human explicitly requested fixing the verification gate first. This follow-up diagnoses tooling and setup within testing scope; T-41 remains untouched and unauthorized at this stage.

## Review responses

None.

## Notes for reflection

- **What worked:** Explicit Node24 PATH export yields 954 baseline Vitest passes; sequential browser execution yields all 128 baseline browser passes and stable local fixtures.
- **What needed guidance:** Coordinator confirmed explicit PATH export and the documented 5–9 minute serial verification runtime; earlier no-output interruption was premature.
- **What to change in the agent or skill:** Keep shared-database browser tests sequential with migration-reset verification; verify child runtime selection and allow documented suite duration. Read raw streamed HTML through APIRequestContext before browser redirects invalidate Chromium response handles.

## Final stage boundary

All agent-owned processes finished. No test assertions, criteria or skips changed. No source, migration, specification, PLAN, package scripts, dependencies or documentation were edited. No commits, index changes or T-41 work. The original staged tests/report remain staged; the browser fix and this new report are reviewable local changes. Human review and test commit remain the next authorized workflow gate.
