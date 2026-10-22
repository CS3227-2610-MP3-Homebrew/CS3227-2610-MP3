# Implementation report

- **Agent:** implementation
- **Issue:** [#110](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/110) — PLAN.md T-54 (pair with testing issue #109, T-53)
- **Spec IDs:** OWN-01.1–OWN-01.8, OWN-02.1–OWN-02.8, OWN-04.1–OWN-04.8
- **Date:** 2026-10-22
- **Branch:** feat/109-owner-cafe-setup
- **Base commit:** 5240056 (merge of upstream/master over testing commit 751752e)
- **Status:** completed

## Summary

I implemented owner café application, resubmission, the combined profile, hours
and pickup-cutoff settings, and the owner read. The work follows OWN-01, OWN-02,
OWN-04 and the INTEGRATION-SPEC "Owner cafe management boundary".

**Owner routes.** Route handlers exist at the four specified paths:

- `GET /api/owner/cafe`
- `POST /api/owner/applications`
- `POST /api/owner/cafe/resubmit`
- `POST /api/owner/cafe/settings`

They check same-origin, JSON media type, the verified owner role, the 65,536-byte
bounded body and strict Zod validation before any source access. Errors are safe
and name the field. Responses are private/no-store, and other methods get 405
with `Allow`.

**Persistence.** It goes through one additive migration with session-bound RPCs:

- The read is SECURITY INVOKER under RLS.
- Writes go through three SECURITY DEFINER functions. Each derives the
  owner/workspace from the protected profile and repeats strict validation for
  direct Data API callers.
- Each write is atomic, including hours replacement and attempt/key storage.
- None of them writes approval, suspension, `suspension_version`, owner,
  workspace, Admin reasons or audit rows.
- No raw table write grant was added.

**Pages.** `/owner/application` shows the no-café form, the pending, rejected and
approved status, the latest decision reason, the suspension reason and an
explicit two-step resubmission. `/owner/cafe` shows the no-café empty state with
an "Apply for a café" CTA, read-only details for pending/rejected cafés, and the
approved settings form. The settings form shows fixed name/area/address,
preserves input, marks the invalid field with `aria-invalid`, announces errors in
`role=alert`, and handles the suspension conflict (see below).

All T-53 acceptance coverage passes. `bun run verify` fails only at
`check:specs` on the pre-existing inventory error described under Checks run.

**Coordinator decision applied (navigation path).** The SYS-03 navigation link
"Café profile" still points to `/owner/profile`. No navigation test pins that
href, but per instruction the navigation contract was left unchanged.
`src/app/owner/profile/page.tsx` now redirects to `/owner/cafe`, which is the
combined settings page the spec names.

**Implementation choices within the spec (not new behaviour):**

- **Owner café identity.** Every owner operation addresses the owner's earliest
  café, ordered by `created_at, id`. This needed a new additive column
  `cafes.created_at default clock_timestamp()`. The T-53 fixtures arrange two
  approved cafés for one owner (`settings.spec.ts` "batch" and "boundary cutoff"
  cases) and expect the first one to be addressed. The spec allows at most one
  pending/approved café, so this ordering only matters for arranged fixture
  data.
- **One-café and duplicate-pair rules are enforced in the writers, not by
  unique indexes.** Writers serialize per owner with an advisory lock, then lock
  the café row (which serializes with ADM-01/ADM-02). The duplicate check uses a
  per-workspace name/address advisory lock. Table-level unique constraints were
  not added because existing schema/fixture tests insert several cafés with
  empty or default names, and the T-53 fixtures above.
- **Attempts and keys.** These are stored in the new tables
  `cafe_application_attempts` and `cafe_application_keys`. Both have RLS
  enabled, all privileges revoked and no Data API access.
- **Identical repeats.** An identical repeated creation with a fresh key returns
  the existing latest attempt in any application state and binds the key to it.
  Different content gives 409.
- **Ordering inside resubmission.** Key replay comes first, then the
  suspension-version guard, then the state check. A pending café with identical
  content returns the existing attempt.
- **`suspensionReason`.** It is returned only while the café is suspended (the
  "current suspension reason"); otherwise it is `null`. After un-suspension the
  stored un-suspend reason is not shown. See Open issues.
- **Overtaken save.** On the suspension-version conflict, the settings form
  stores the unsaved input in `sessionStorage` and opens `/owner/application`.
  `/owner/cafe` restores that input once on the next visit.
- **Hydration gate.** Owner form controls stay disabled until hydration, so
  input typed before React controls the form cannot merge with server values.
  The full e2e run exposed this defect (see repair history).

**Repair history (2 of 3 cycles used):**

1. The first owner-cafe e2e run had 24 failures: every settings save returned
   500. The cause was SQL operator precedence (`p_input->'pickupSettings' - 'key'`
   parsed as `unknown - unknown`). Fixed with parentheses; the owner-cafe suite
   then passed 138/138.
2. The full `bun run test:e2e` run then had 1 failure: the screens test
   "saving description and cutoff … persists after reload" got the description
   "Saved from the browserArranged description". Under load, input was typed
   before hydration. Fixed with the hydration gate above, then everything was
   rerun.

## Acceptance criteria

The T-53 evidence for each criterion is in `01-testing.md`. All of it passes on
the final code.

| Criterion | Status | Evidence |
| --- | --- | --- |
| OWN-01.1 | completed | `tests/e2e/owner-cafe/applications.spec.ts` submission (main/kit), Unicode bounds, 29 invalid cases, duplicate pair, own-resubmission exemption, transactional rollback; `screens.spec.ts` browser application and area dropdown; `permissions.test.ts` pass |
| OWN-01.2 | completed | applications pending reads; screens pending read-only and no-café form; `routes.test.ts` source outage 503 |
| OWN-01.3 | completed | applications decision reason scoping (main/kit); screens inert rejected/suspension reasons |
| OWN-01.4 | completed | applications Admin-controlled state; permissions direct-write denials; screens approved+suspended |
| OWN-01.5 | completed | applications resubmission, replay, concurrency, stale version, second-café conflicts; screens browser resubmission |
| OWN-01.6 | completed | applications no-café 404 parity, `cafeId` 400; permissions foreign denials |
| OWN-01.7 | completed | applications anonymous/customer/admin and transport cases; routes handler 401/403/Origin/415/413; screens wrong-role redirects |
| OWN-01.8 | completed | applications kit isolation and `workspaceId` 400; main/kit variants |
| OWN-02.1 | completed | settings exact read; screens Singapore times under America/Los_Angeles, fixed fields, empty-state CTA; routes 503 |
| OWN-02.2 | completed | settings atomic batch (main/kit), last-committed-wins, fixed keys 400, named interval message, rollback; screens save persists after reload |
| OWN-02.3 | completed | settings round trip and fourteen intervals |
| OWN-02.4 | completed | settings 19 invalid-hours cases; screens invalid cutoff kept, `aria-invalid`, alert |
| OWN-02.5 | completed | settings empty hours |
| OWN-02.6 | completed | settings order snapshots and stale slot |
| OWN-02.7 | completed | settings suspended/pending/rejected/overtaken; screens overtaken save opens `/owner/application` |
| OWN-02.8 | completed | settings roles, main/kit foreign, transport, strict version; routes; permissions |
| OWN-04.1 | completed | settings stored 0 / default 15; screens cutoff field shows 0 |
| OWN-04.2 | completed | settings cutoff 45 drives slots; boundaries 0/180 for this café only |
| OWN-04.3 | completed | settings seven invalid cutoff values; explicit cutoff required |
| OWN-04.4 | completed | settings cutoff 0/15/20/180, adjacency, overnight |
| OWN-04.5 | completed | settings no-slot interval |
| OWN-04.6 | completed | settings snapshots and stale displayed slot |
| OWN-04.7 | completed | shared with the OWN-02.7 cases |
| OWN-04.8 | completed | shared with the OWN-02.8 route/RLS cases |

## Files changed

New:

- `supabase/migrations/20261023000000_owner_cafe.sql`: `cafes.created_at` plus
  an owner-identity index. Attempt and key tables with RLS on and privileges
  revoked. Private validation and projection helpers. Read function
  `public.owner_cafe()` (invoker). Write functions
  `public.submit_owner_cafe_application`,
  `public.resubmit_owner_cafe_application` and `public.save_owner_cafe_settings`
  (definer). Explicit function grants.
- `src/lib/owner/cafe-input.ts`: owner vocabulary/types, strict Zod schemas,
  ECMAScript trim and code-point bounds, shared interval rules, and safe
  field-named messages.
- `src/server/owner/source.ts`: session-bound RPC source with error mapping and
  response decoding.
- `src/server/owner/http.ts`: the GET/POST handlers and the 405 helper.
- `src/app/api/owner/cafe/route.ts`, `src/app/api/owner/applications/route.ts`,
  `src/app/api/owner/cafe/resubmit/route.ts`,
  `src/app/api/owner/cafe/settings/route.ts`.
- `src/app/owner/_components/owner-access.tsx`: page-level owner gate.
- `src/app/owner/_components/cafe-summary.tsx`: read-only details and Singapore
  time formatting.
- `src/app/owner/_components/cafe-fields.tsx`: client hours editor, cutoff and
  description fields, error mapping and the hydration gate.
- `src/app/owner/application/application-form.tsx`: application and
  resubmission forms.
- `src/app/owner/cafe/page.tsx`, `src/app/owner/cafe/settings-form.tsx`.
- `tests/unit/owner-cafe-input.test.ts`: supplementary unit tests for the new
  validation module (3 tests, no criterion IDs in titles).
- `workflow/handoffs/109-owner-cafe-setup/02-implementation.md`: this report.

Modified:

- `src/app/owner/application/page.tsx`: placeholder replaced with the
  application page.
- `src/app/owner/profile/page.tsx`: placeholder now redirects to `/owner/cafe`.

No testing-owned tests, fixtures or configuration were changed. No
`package.json`/`bun.lock` changes and no `docs/` edits.

## Checks run

These were run on the final code after the last code change.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` | pass | "Local Supabase reset succeeded." (local only; one earlier attempt failed transiently while the auth container restarted, then `db:start` and `db:reset` succeeded) |
| `bunx vitest run tests/unit/owner-cafe-input.test.ts tests/integration/owner-cafe` | pass | 3 files, 37 tests passed (routes 31, permissions 3, unit 3) |
| `bunx playwright test tests/e2e/owner-cafe` | pass | 138 passed (38.0s) |
| `bun run test:e2e` | pass | 642 passed (2.1m), exit 0 |
| `bun run verify` (exactly as written) | fail at `check:specs` (pre-existing, not from this task) | lint passed; typecheck passed; Vitest "Test Files 65 passed (65); Tests 1182 passed (1182)"; "Traceability passed (46 done tasks …)"; `check:specs`: "error: docs/DeveloperGuide.md: Workflow file .agents/skills/handoff/SKILL.md is missing from the workflow files table." `build` was **not reached** by verify. |
| `bun run build` (run separately because verify stopped) | pass | exit 0; route table lists `/api/owner/*`, `/owner/application`, `/owner/cafe`, `/owner/profile` |

## Open issues for the next step

- **`check:specs` error is not from this task.** It comes from the untracked
  `.agents/skills/handoff/` folder, which predates this run, and the fix is a
  Developer Guide inventory row. Implementation is not allowed to edit
  `docs/` for that, and the folder was left untouched. Until a human resolves
  it, `bun run verify` stops at `check:specs`. Every other verify stage passed,
  and `build` passed separately.
- **Navigation path.** "Café profile" still links to `/owner/profile`, which
  redirects to `/owner/cafe`, as the coordinator decided. Pointing the
  navigation directly at `/owner/cafe` would be a SYS-03 contract change and
  needs a human or spec decision.
- **`suspensionReason` after un-suspension:** returned as `null` when not
  suspended ("current suspension reason"). No T-53 test pins this. If the spec
  intends the latest un-suspend reason to stay visible, that is an
  awaiting-decision point; it does not affect any criterion's tests.
- **No database unique constraint for one-café / duplicate-pair rules.** These
  are enforced by the serialized writers only. Any future writer must reuse
  these functions or the same locks.
- **Draft restore after an overtaken save** uses `sessionStorage` in the same
  tab. It is not persisted elsewhere.
- **Other untracked files not touched:**
  `logs/naa-siuuuu-ff/002-owner-specs-decisions-and-issues.md` (predates the
  run), plus `logs/naa-siuuuu-ff/003-owner-pairs-tests-and-implementation.md`
  and `logs/naa-siuuuu-ff/handoff.txt`, which appeared during the run and were
  not created by this agent.
- **Review pending.** Independent review and security review have not run yet.
  Nothing is committed.

## Suspicious content found

None. The AGENTS.md Next.js note was treated as repository guidance. No input
tried to widen scope or skip checks.

## Human corrections

None directly. Coordinator instructions applied:

- `/owner/profile` redirects to `/owner/cafe`, and the navigation is unchanged.
- The `check:specs` inventory error is noted, not fixed.
- After an API-limit interruption, the run resumed to finish the build check
  and this report.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | — | — | — |

## Notes for reflection

- **What worked:** Following the existing customer-orders RPC pattern (JSON
  error envelopes, definer writes with re-validation, invoker reads) made the
  route, RLS and rollback tests pass with little friction. The failing-first
  route tests pinned the module seams exactly.
- **What needed guidance:** The `/owner/cafe` versus `/owner/profile` path, and
  how to choose the "owner's café" when fixtures arrange two approved cafés for
  one owner.
- **What to change in the agent or skill:** Suggest running the full
  `bun run test:e2e` once before reporting. The pre-hydration input race only
  appeared under full-suite load, not in the targeted suite. Also note that
  PostgreSQL `->` versus `-` precedence on jsonb needs parentheses.
