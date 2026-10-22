# Customer catalogue pair orchestration

## Goal
Coordinate T-40/#71 and T-41/#72 through tests, implementation, review, security assessment and documentation for CUS-01/CUS-02.

## Scope
Thirteen task-related user prompts, including continuation, commit and logging requests; one focused catalogue implementation workflow.

## Key prompts
- “Use the coordinator skill and help me create and implement T40 and T41” requested the paired workflow with specialised agents.
- “For now, do not run the full test suite. Only run the necessary test cases to show failure before implementation starts.” introduced a one-time focused-testing exception; the user also required the testing handoff to say done.
- “Only run the full test suite after documentation agent has sucessfully changed the necessary files.” moved documentation ahead of final full verification for this case, with paired-spec tests after implementation and no intervening tests before documentation.
- “If independent review has no major issues, do not run any test. Just give me the commit code.” stopped further test execution after successful review and requested staging/commit commands.

## Decisions and corrections
- Confirmed existing issues and approved contracts; reconciled T-41’s stale blocked status. Used branch `feat/71-customer-catalogue`. Humans committed tests; staged changes were distinguished from completed commits. Agents did not commit, push or merge.
- Corrected runtime diagnosis: missing Node on PATH selected Bun for Node-based runners. Explicit bundled Node 24 PATH worked. Earlier quiet verification runs were interrupted prematurely; normal runs took about eight minutes. Database-reset verification and browsers were serialized.
- Testing repaired missing router/document context, streaming timing assumptions and protected-shell assertions that confused caller-supplied route IDs with disclosed records. Stored-content/identity checks were strengthened. An intermittent existing auth-prefetch failure passed isolated/full reruns; cause remained unknown.
- Implemented catalogue/detail pages, strict APIs, Singapore hours, ratings, menus, public reviews and session-RLS reads. Review round one found special-key validation, microsecond ordering and 405-envelope defects. Focused regressions recorded 21 expected failures and six controls.
- Recorded one-time exceptions in handoffs using done without claiming full verification. Expanded runtime file ownership through the spec agent because Next stripped special keys before route parsing. Fixed all findings; paired tests passed 20/20 and 71/71.
- Security found no introduced confirmed vulnerability or P0/P1; pre-existing P2 direct review-table identifier disclosure remained unresolved. Documentation followed the authorised exception.
- Post-documentation full verification passed 974 tests; review round two passed without findings. No further test cases ran. A title-registration-only correction made traceability recognise existing coverage; structural checks passed for 34 done tasks. T-40/T-41 were closed locally and commit commands supplied.
- Later repository history shows human commits, CI migration corrections/rename and PR #132 merge; those later revisions were not reverified in this chat.

## Files created or modified
- `src/app/customer/cafes/`, `src/app/api/customer/cafes/`
- `src/lib/catalogue/`, `src/server/catalogue/`, `src/proxy.ts`, `next.config.ts`
- `supabase/migrations/20261022000000_customer_catalogue.sql` (subsequently renamed to `20261022000001_customer_catalogue.sql`)
- `tests/unit/catalogue/`, `tests/integration/catalogue/`, `tests/e2e/catalogue/`
- `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `README.md`
- `workflow/PLAN.md`, `workflow/handoffs/71-customer-catalogue/01–15` reports
