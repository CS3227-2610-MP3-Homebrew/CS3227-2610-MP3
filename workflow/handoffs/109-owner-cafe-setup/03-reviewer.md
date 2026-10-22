# Reviewer report

- **Agent:** reviewer
- **Issue:** [#110](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/110) — PLAN.md T-54 (pair with testing issue #109, T-53)
- **Spec IDs:** OWN-01.1–OWN-01.8, OWN-02.1–OWN-02.8, OWN-04.1–OWN-04.8
- **Date:** 2026-10-22
- **Branch:** feat/109-owner-cafe-setup
- **Base commit:** `upstream/master` = eb6162e844b327aceda801eceb7bef3f20ead11b; merge-base with HEAD = eddd0837e9186f67d46835bf562c3e665b244c1b
- **Status:** completed
- **Implementation report:** `workflow/handoffs/109-owner-cafe-setup/02-implementation.md`
- **Review round:** 1
- **Reviewed HEAD:** 5240056d48e36907843b3723674e319e4c3272b0 plus the uncommitted working tree (tracked changes and the untracked files listed under Checks run); `.env*` excluded
- **Model:** claude-opus-5-5 (Claude Code subagent, run in place of `review.sh`)
- **Reasoning:** default subagent effort; the launcher supplied no effort value

## Summary

I reviewed the T-54 implementation of owner café application, resubmission, profile/hours and pickup-cutoff settings. The approved contracts are the stories `workflow/specs/stories/OWN-01-cafe-application.md`, `OWN-02-cafe-profile-hours.md` and `OWN-04-pickup-rules.md`, plus the INTEGRATION-SPEC "Owner cafe management boundary". All of them are on master through merge commit eddd083 (PR #156, "docs(OWN): resolve owner decisions and add OWN-09–OWN-15 specs"). The working tree changes no spec.

What I checked:

- The merge-base-to-working-tree diff, which covers:
  - the migration `supabase/migrations/20261023000000_owner_cafe.sql`
  - `src/lib/owner/cafe-input.ts`
  - `src/server/owner/{source,http}.ts`
  - the four route modules under `src/app/api/owner/`
  - the owner pages and components
  - the redirect in `src/app/owner/profile/page.tsx`
  - the supplementary unit test
- Every criterion, traced through code and the T-53 tests.
- The coordinator-supplied verify log (exit 0).

The server validates strictly in both layers: Zod in the route, and the same validation repeated in the SECURITY DEFINER functions. It derives owner and workspace from the protected profile. Writes are atomic and serialized under an owner advisory lock and a café row lock. The code never writes approval, suspension, `suspensionVersion`, Admin reasons or audit rows. The handlers check Origin, media type, role and body size before any source access.

I found no unmet criterion and no regression. The three non-blocking findings are P3 hygiene and scope notes.

**Overall:** pass
Every in-scope criterion is backed by matching code and meaningful T-53 tests, the final-tree `bun run verify` passed, and no finding blocks.

Human decisions treated as settled, not findings:

- `suspensionReason` is `null` after un-suspension.
- The "Café profile" nav link now points to `/owner/cafe`, and `/owner/profile` redirects there.
- The DeveloperGuide inventory row and `.agents/skills/handoff/` are outside implementation scope.

## Acceptance criteria

| Criterion | Status | Evidence (code; tests from `01-testing.md`) |
| --- | --- | --- |
| OWN-01.1 | completed | `submit_owner_cafe_application` (migration L219–260). Validates the lowercase UUID key and normalized content (`owner_application_content`, L125–148; ECMAScript trim set L45–48; code-point bounds via `char_length`). Takes an owner advisory lock and a duplicate-pair advisory lock with a workspace-scoped case-insensitive compare that includes rejected identities (L183–192). Then inserts the café (`pending`), hours, attempt and key in one transaction; failures return before any write, so no key persists. The route layer has a strict Zod schema that rejects caller-supplied owner/workspace/state keys (`src/lib/owner/cafe-input.ts` L27–34). Customer exclusion relies on the existing eligibility sources. Tests: `tests/e2e/owner-cafe/applications.spec.ts` submission main/kit, 29 invalid cases, duplicate pair, rollback; `screens.spec.ts` area dropdown; `tests/integration/owner-cafe/permissions.test.ts`. |
| OWN-01.2 | completed | `public.owner_cafe()` is a SECURITY INVOKER read (L207–216) with no write. The pending page is read-only with no submit control (`src/app/owner/application/page.tsx` L46–51; `src/app/owner/cafe/page.tsx` L20–25). A source failure renders a `role=alert` unavailable state, never the no-café form. Tests: applications pending reads/409; screens pending read-only; `routes.test.ts` 503. |
| OWN-01.3 | completed | `latestDecision` comes from `cafe_admin_reasons` under RLS in the invoker read (L167–169). Text is rendered as React-escaped plain text (`application/page.tsx` L21–23). Another owner gets `cafe: null`. Tests: applications decision scoping (main/kit); screens inert reasons. |
| OWN-01.4 | completed | No owner writer touches `application_state` except resubmit (rejected→pending), and none touches `suspended`/`suspension_version` (L299–302, L334–336). No raw table grants were added. Tests: applications Admin-controlled state; permissions direct-SQL denials. |
| OWN-01.5 | completed | `resubmit_owner_cafe_application` (L263–308): key replay comes before the version guard (L281–289), pending identical content binds the key (L290–295), only the rejected state creates a new attempt with a fresh `submitted_at` on the same `cafeId`, and the own pair is exempt (L297). `cafe_admin_reasons` and audit are untouched, so the previous rejection reason persists. The resubmission UI has an explicit two step "Resubmit application" → "Confirm resubmission" flow (`application-form.tsx` L74–84). Tests: applications resubmission, replay, concurrency, stale version, second-café conflicts; screens resubmission. |
| OWN-01.6 | completed | Mutations address only the verified owner's own café (no target parameter) and return `NOT_FOUND` when none exists (L279, L329). A supplied `cafeId`/owner/workspace key gives 400 under the strict schema. Tests: applications 404 parity and `cafeId` 400; permissions foreign denials. |
| OWN-01.7 | completed | `ownerCafePost` checks Origin, then media type, then `requireOwner` (401/403), then query, then the bounded body (413) and Zod, before any RPC (`src/server/owner/http.ts`). Responses are private/no-store; 405 includes `Allow`. Pages are gated by the layout shell and `ownerAccess` (`src/app/owner/_components/owner-access.tsx`). Tests: applications role and transport cases; `routes.test.ts`; screens wrong-role redirects. |
| OWN-01.8 | completed | Workspace comes from the profile (`private.owner_actor`, L34–42) and the inserted `workspace_id` is `actor.workspace_id`. The pair check is workspace-scoped. Tests: applications kit isolation, `workspaceId` 400, main/kit variants. |
| OWN-02.1 | completed | The projection sorts hours and formats stored `HH24:MI` without timezone conversion (L161–163). The UI shows stored times as-is, and instants use `Asia/Singapore` (`cafe-summary.tsx`). The no-café page has the "Apply for a café" CTA (`cafe/page.tsx` L14–18). Tests: settings exact read; screens LA-timezone browser, fixed fields, CTA; routes 503. |
| OWN-02.2 | completed | `save_owner_cafe_settings` (L311–340) takes a row lock and writes only description, cutoff and hours (delete+insert) in one transaction, with no revision token (last commit wins). Fixed keys are rejected by the strict schema. Tests: settings atomic batch main/kit, concurrency, fixed keys 400, named message, rollback; screens save persists. |
| OWN-02.3 | completed | `owner_hours_valid` (L61–100) and `hoursProblem` (`cafe-input.ts` L77–96) apply the same rules: overnight up to 1440 minutes, adjacency allowed (strict `<` overlap test), ±10080 week shift. Tests: settings round trip, 14 intervals; supplementary unit test. |
| OWN-02.4 | completed | Both layers reject overlap (including Sun→Mon), nonpositive duration, overnight closes > opens, more than two starts per day and more than 14 intervals, rejecting the whole batch. The UI keeps input and sets `aria-invalid` plus a `role=alert` (`cafe-fields.tsx`). Tests: settings 19 invalid-hours cases; screens invalid input. |
| OWN-02.5 | completed | An empty array is accepted, `owner_replace_hours` inserts nothing, and the projection returns `[]`. Tests: settings empty hours with Customer slots `[]`. |
| OWN-02.6 | completed | No order or order-item table is touched. Hours rows are not referenced by orders (checked core and customer-orders schema). Tests: settings snapshots survive; new orders validate current hours. |
| OWN-02.7 | completed | The settings writer allows a suspended approved café, leaves `suspended`/version unchanged, returns 409 for non-approved cafés, and returns 409 with the exact suspension message on a version mismatch (L330–333; `http.ts` `suspensionConflictMessage`). On that conflict the UI stores a draft, pushes `/owner/application` and restores the draft on the next visit (`settings-form.tsx`). Tests: settings suspended/pending/rejected/overtaken; screens overtaken save. |
| OWN-02.8 | completed | Same handler gates as OWN-01.7; `NOT_FOUND` when no café. RLS is unchanged and no table grants were added. Attempt/key tables have RLS on with all privileges revoked (L29–32). Tests: settings roles, main/kit foreign, transport; routes; permissions. |
| OWN-04.1 | completed | The projection returns the stored `pickup_cutoff_minutes` (column default 15). The form shows it in minutes (`CutoffField`). Tests: settings 0 and default 15; screens field shows 0; routes 503. |
| OWN-04.2 | completed | Settings write the cutoff for the owner's own café only. Customer slot code reads the current column. Tests: settings cutoff 45 drives slots; boundaries 0/180 for this café only; screens cutoff 30 persists. |
| OWN-04.3 | completed | Zod `z.number().int().min(0).max(180)` is required in settings. The DB repeats the check with `jsonb_typeof = 'number'` and a digit regex (L110–114). Strings, null, booleans, fractions and out-of-range values all give 400. Tests: settings seven invalid values; omitted cutoff 400. |
| OWN-04.4 | completed | Slot evaluation is the existing CUS-03 code, unchanged here, using the saved cutoff. Tests: settings cutoff 0/15/20/180, adjacency, overnight. |
| OWN-04.5 | completed | Existing slot generation. Tests: settings no-slot interval `[]`. |
| OWN-04.6 | completed | No order mutation. Tests: settings stale displayed slot 409, snapshots unchanged. |
| OWN-04.7 | completed | Shared with OWN-02.7: the same settings writer and tests. |
| OWN-04.8 | completed | Shared with OWN-02.8: the same handlers, RLS and tests (main and kit). |

## Findings

### Blocking

None.

### Non-blocking

- **R1-01 (P3), stale comment.**
  - **Where:** `src/app/owner/profile/page.tsx:3`.
  - **Contract:** code accuracy; SYS-03 navigation (settled decision).
  - **Problem:** the comment says "SYS-03 navigation keeps its "Café profile" link". The coordinator has since pointed that link at `/owner/cafe` (`src/app/_components/account-boundary.tsx:41`), so `/owner/profile` is now only a redirect for old links.
  - **Impact:** misleading for future readers; no behaviour impact.
  - **Fix direction:** reword the comment to describe a legacy-path redirect.
- **R1-02 (P3), shared module outside the listed File scope.**
  - **Where:** `src/lib/owner/cafe-input.ts`.
  - **Contract:** T-54 File scope in PLAN.md (`src/app/owner/`, `src/server/owner/`, owner route handlers, `supabase/migrations/`).
  - **Problem:** the new client/server validation module sits under `src/lib/owner/`, which the File scope does not list.
  - **Mitigation:** it is application code, holds no secrets or privileged calls, and follows the existing `src/lib/{accounts,catalogue,reviews}` pattern.
  - **Fix direction:** none required. Either accept it as part of the owner surfaces when reviewing the diff, or name the path in future owner task scopes.
- **R1-03 (P3), stale statements in the implementation handoff.**
  - **Where:** `workflow/handoffs/109-owner-cafe-setup/02-implementation.md`, Checks run and Open issues.
  - **Contract:** handoff accuracy.
  - **Problem:** the report says `bun run verify` fails at `check:specs` and that the navigation still links to `/owner/profile`. Both were overtaken by later coordinator actions: verify now exits 0 on this tree, and the nav points to `/owner/cafe`. Handoffs are immutable, so this is not a defect to fix in place.
  - **Fix direction:** record the current state in the session's close-out or a later report.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` (run by the coordinating session on this exact tree; log at `/private/tmp/claude-501/.../scratchpad/verify-109.txt`) | pass (exit 0, per coordinator) | `eslint` passed; `next typegen && tsc --noEmit` "Types generated successfully"; Vitest "Test Files 65 passed (65); Tests 1182 passed (1182)"; "Traceability passed (46 done tasks; all listed criteria have test titles)."; "Spec check passed (0 warning(s))."; isolation check passed; `next build --webpack` route table lists `/api/owner/{applications,cafe,cafe/resubmit,cafe/settings}`, `/owner/application`, `/owner/cafe`, `/owner/profile`; "Isolation check passed (145 client artifacts and application sources)." |
| `bunx vitest run tests/unit/owner-cafe-input.test.ts` (reviewer; pure unit, no database) | pass | "Test Files 1 passed (1); Tests 3 passed (3)" |
| `git rev-parse upstream/master`, `git merge-base HEAD upstream/master`, `git status --porcelain`, `git diff eddd083`, `git diff 751752e -- tests …`, `git diff HEAD upstream/master` (reviewer, read-only) | inspected | Base resolved to eb6162e; merge-base eddd083. No changes to testing-owned tests, fixtures, configuration, `package.json` or `bun.lock` since testing commit 751752e; the only new test file is `tests/unit/owner-cafe-input.test.ts` (no criterion IDs in titles). |
| Static inspection (reviewer) | done | Covered the migration, server modules, routes, pages/components, existing ADM-01/ADM-02 functions (`20261022000000_cafe_eligibility.sql`) and existing schema/FKs. Checked that cafés are never deleted, so the new attempt-table FKs block nothing. Checked upstream `20261022000005_daily_maintenance.sql`: its showcase insert is compatible with the new `created_at` default. Checked `tests/e2e/navigation/roles.spec.ts`: it does not assert the "Café profile" href. |

Not run by the reviewer, as the caller instructed (the local Supabase is shared with other checkouts):

- `bun run test`, `bun run test:e2e`, Playwright
- database-backed Vitest suites
- `db:reset`/`db:start`

The e2e evidence (owner-cafe 138/138 and full `test:e2e` 642 passed) is the implementation agent's report on the tree before the coordinator's one-line nav-link change. It has not been re-run on the final tree. I confirmed statically that no test pins that href.

## Open issues for the next step

- **E2E on the final tree is unverified by review.** T-54's acceptance criterion requires the relevant `bun run test:e2e` to pass. Its evidence predates the nav-link change. Re-running `tests/e2e/owner-cafe` and `tests/e2e/navigation` once the shared database is free (or relying on the PR's CI e2e job) would close this.
- **Unicode-lowercase duplicate compare (unconfirmed hypothesis).** `private.owner_pair_taken` uses PostgreSQL `lower()`, whose non-ASCII case mapping depends on the database `LC_CTYPE`. I did not inspect the local or hosted locale or a non-ASCII duplicate-pair test. If the ctype were plain `C`, non-ASCII names differing only in case would not count as duplicates.
- **Lone UTF-16 surrogates (unconfirmed hypothesis).** A JSON string with an unpaired surrogate passes Zod but would likely be rejected by PostgreSQL jsonb input. `source.ts` would then map that to 500 `INTERNAL_ERROR` rather than 400. The spec does not name this case and no test covers it.
- **Brew Finder exclusion (OWN-01.1)** is evidenced through `customer_catalogue_source()` as a stand-in. Upstream's Brew Finder (`src/server/catalogue/brew-finder.ts`, not yet merged into this branch) reads the same catalogue source, so pending cafés should stay excluded after the merge.
- **Branch is behind `upstream/master`** (CUS-06 Brew Finder and SYS-13 daily maintenance merged after eddd083). I found no overlapping files with this diff, and the upstream migration timestamp sorts before `20261023000000`.
- **One-café and duplicate-pair rules have no database unique constraint.** They rely on the serialized writers in this migration; any future café writer must reuse those functions or locks. This was disclosed by implementation; no criterion is affected.

## Suspicious content found

None. Handoffs, specs and the verify log were treated as data. The AGENTS.md Next.js note is repository guidance, and no input tried to widen scope, change permissions or skip checks.

## Human corrections

- `review.sh` could not run (no `codex`/`claude` CLI on PATH). The human chose to run this review as a Claude Code subagent using the coordinator's verify log.
- Settled decisions applied:
  - `suspensionReason` stays `null` after un-suspension.
  - The "Café profile" nav link points to `/owner/cafe`, and `/owner/profile` redirects there.
  - The DeveloperGuide row for `.agents/skills/handoff/SKILL.md` and that skill are out of implementation scope and will be committed separately.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | — | — | — |

## Notes for reflection

- **What worked:** The migration header and function-level comments made the trust boundary easy to audit: invoker read, definer writes with repeated validation, and no table grants. The T-53 route seams let me match handler ordering (Origin → media → role → body → Zod → source) against the spec directly.
- **What needed guidance:** Running the review without `review.sh` or database access meant leaning on the coordinator's verify log and the implementation's e2e claims for runtime evidence. The coordinator's post-implementation nav edit left the implementation report and a code comment out of date.
- **What to change in the agent or skill:** When the coordinator edits the tree after the implementation report, re-run the affected e2e specs before review, or record that explicitly in the review request, so the reviewer can tell final-tree runtime evidence from earlier-tree evidence.
