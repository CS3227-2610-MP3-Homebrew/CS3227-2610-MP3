# Menu Pair from Spec Amendment to Close-out

## Goal
Pick up from handoff-3 and finish the last owner MVP pair, OWN-03 menu management (T-56/T-57), before the deadline. That meant amending the spec, writing tests, implementing, and producing docs and close-out evidence.

## Scope
About ten user-assistant exchanges on one task: the OWN-03 menu pair, plus a side question about parallel sessions.

## Key prompts
- "Read the handoff-03.txt in logs, and continue": resumed the multi-agent loop from handoff-3, starting with the approved-only spec amendment.
- "Priority now is to finish all the features in time. Also at the end of each PR, add a session log": set the deadline as the priority and made a session log part of every PR's close-out.
- "Put the remaining time into the menu pair … If you tell me which ones are still open, I can work out the shortest path to the deadline.": asked for an exact list of open owner MVP work so the remaining time could be planned.
- "Fix the failures, let me know what I need to decide. Just know that another session is working on OWN-09": approved the committed tests and handed implementation to this session (single-agent mode). It also warned that the local database is shared.

## Decisions and corrections
- The spec agent drafted OWN-03.9: menu changes only for approved cafés, including suspended ones; pending or rejected cafés get 409 with no write. The human approved the drafted check order and chose a fixed message. They gave no wording, so the session used "Menu changes are available once your café is approved." and flagged it in the PR. PR #177 merged.
- The human allowed this session to commit, push and open the spec PR.
- The human asked whether other sessions could work in parallel. feat/115 and feat/118 were already merged. A parallel OWN-08 session would need the human's decision on ADM-06 first, and could only do spec work while the database was busy.
- Only OWN-03 was open among the owner MVP stories. T-63 had merged but was still `blocked` in PLAN.md and was closed out with this pair.
- The T-56 tests passed the stage 2 gate and were committed as `test(OWN-03)` (fee8f6c).
- Implementation found that OWN-03.9 contradicts two SYS-06.3 role-matrix tests. They used a pending café as the case where an owner may update menu names directly. The session set that café to approved in both tests; this awaits the human's approval as a separate test commit.
- A Playwright helper sent the bodies `"text"` and `null` as octet-stream, so the server returned 415, not the intended 400. The helper now sends explicit JSON.
- Self-review found a SECURITY DEFINER approval-check function that worked as an oracle for whether any café is approved. It was replaced with an inline check that runs under the caller's own access rules.
- The shared database was not reset, because of the parallel OWN-09 session. The migration was applied with psql instead.

## Files created or modified
- workflow/specs/stories/OWN-03-menu-management.md
- workflow/specs/INTEGRATION-SPEC.md
- workflow/PLAN.md
- workflow/handoffs/112-owner-menu/01-spec.md
- workflow/handoffs/112-owner-menu/02-testing.md
- workflow/handoffs/112-owner-menu/03-implementation.md
- tests/integration/owner-menu/ and tests/e2e/owner-menu/ (new suites)
- tests/integration/roles-seeds/mutable-writes.test.ts
- tests/integration/roles-seeds/rls.test.ts
- supabase/migrations/20261023000450_owner_menu.sql
- src/lib/owner/menu-input.ts
- src/server/owner/menu.ts, menu-http.ts, menu-query.ts
- src/app/api/owner/menu/ (three route files)
- src/app/owner/menu/page.tsx, menu-editor.tsx
- src/proxy.ts
- docs/UserGuide.md, docs/DeveloperGuide.md
