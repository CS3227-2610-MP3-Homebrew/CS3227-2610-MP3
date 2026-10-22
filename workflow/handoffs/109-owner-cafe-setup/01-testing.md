# Testing report

- **Agent:** testing
- **Issue:** [#109](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/109) — PLAN.md T-53
- **Spec IDs:** OWN-01.1–OWN-01.8, OWN-02.1–OWN-02.8, OWN-04.1–OWN-04.8
- **Date:** 2026-10-22
- **Branch:** feat/109-owner-cafe-setup
- **Base commit:** 8987018
- **Status:** completed

## Summary

I wrote failing-first coverage for owner café application, profile/hours and
pickup-cutoff rules. It is derived from OWN-01, OWN-02, OWN-04 and the
INTEGRATION-SPEC owner café management, catalogue/hours, pickup/order and HTTP
transport boundaries. The coverage has three layers:

- Black-box HTTP and browser cases run under Playwright against the production
  build and local Supabase.
- Vitest route-boundary cases call the specified route modules directly.
- Vitest direct-RLS cases run under local Supabase.

Admin decisions, suspensions and existing orders are set up as stored local
fixtures. They do not go through the T-29 Admin routes or T-43 Customer
creation. Every failure comes from missing owner routes and pages
(`/api/owner/*`, `/owner/cafe` and the `/owner/application` content). None
comes from broken fixtures or tooling. The read boundary was respected: no
implementation tasks or reports were read, and no earlier spec report exists in
this handoff folder.

## Acceptance criteria

All tests carry their criterion IDs in their titles. "Positive" means a
specified success path. "Negative" means a denial, invalid input or conflict.

| Criterion | Status | Evidence (test titles abbreviated; files under `tests/`) |
| --- | --- | --- |
| OWN-01.1 | completed (failing-first) | e2e/owner-cafe/applications: main/kit "submission commits normalized fields atomically … hidden from Customer sources" (exact OwnerCafe, default cutoff 15, owner/workspace row, Customer detail 404, list, session RLS and `customer_catalogue_source`, which stands in for the Brew Finder source); Unicode code-point boundaries; 29 "`<case>` is rejected whole without a café, hours or persisted key" cases (missing keys, lengths, area enum, cutoff typing, overlap, caller-supplied owner/workspace/state/decision/timestamp/cafeId keys, failed key reusable); duplicate name/address pair across owners incl. rejected identity, generic 409, name-only duplicates valid, cross-workspace allowed; own-resubmission exemption; transactional hours failure 500 rolls back application and key. integration/owner-cafe/permissions: direct reads restricted to owner. screens: browser application from `/owner/application`; area dropdown of exactly five areas. |
| OWN-01.2 | completed (failing-first) | applications: repeated reads leave the café `pending`; pending settings/resubmit give 409 with no change. screens: pending read-only with no submit/save control, unchanged after two visits; `/owner/application` no-café form. integration/owner-cafe/routes: owner source outage is a 503, never `cafe: null`. |
| OWN-01.3 | completed (failing-first) | applications: main/kit rejected then approved state, latest reason and `decidedAt`; other owners in the same or another workspace get `cafe: null` without the reason. screens: rejected reason and suspension reason render as inert text (no script/img execution) and are hidden from another owner. |
| OWN-01.4 | completed (failing-first) | applications: "pending, approved and suspended state is Admin-controlled …" (suspended save keeps `suspended`/version and Customer stays hidden; un-suspend restores visibility). permissions: direct SQL cannot self-approve, clear suspension, bump the version, transfer the café, forge reasons, or insert an approved/foreign café. screens: approved+suspended display. |
| OWN-01.5 | completed (failing-first) | applications: main/kit resubmission keeps the same `cafeId`, gets a fresh later `submittedAt`, keeps audit intact, keeps the previous rejection reason visible and stays Customer-hidden; key replay; pending identical gives 200, different gives 409; all fields changeable; concurrent identical resubmissions give one result; mismatched `expectedSuspensionVersion` gives 409 with the exact message and no write; first-submission replay and normalized equivalence; reused key with different content gives 409; second café gives 409 when pending, approved or rejected; concurrent distinct gives 201+409; concurrent identical gives 201+200. screens: browser resubmission. |
| OWN-01.6 | completed (failing-first) | applications: no-café resubmit and settings give identical 404 bodies; supplied `cafeId` gives 400; foreign café unchanged. permissions: foreign-owner/kit direct reads and writes denied. |
| OWN-01.7 | completed (failing-first) | applications: anonymous 401 and customer/admin 403 on GET, applications and resubmit, with no disclosure or change; cross-origin/missing Origin 403, 415, malformed 400, 413, 405 with `Allow`, unknown query 400. routes: handler-level 401/403 before source reads, Origin, 415, and 65,536/65,537-byte bounds. screens: anonymous/customer/admin browsers get no content and are redirected. |
| OWN-01.8 | completed (failing-first) | applications: kit café stored in the kit workspace and invisible to main; a `workspaceId` key gives 400; main/kit variants of OWN-01.1, OWN-01.3 and OWN-01.5. |
| OWN-02.1 | completed (failing-first) | settings: exact stored read, hours sorted by weekday/opening, overnight and 24-hour intervals. screens: `/owner/cafe` under browser timezone America/Los_Angeles shows Singapore times (22:00/02:00/07:05/08:55) and not 06:00/07:00; fixed name/address are not textboxes; no-café empty state with "Apply for a café" link to `/owner/application`. routes: source outage 503. |
| OWN-02.2 | completed (failing-first) | settings: main/kit atomic batch (trimmed description keeps its line break; name/area/address/state/version unchanged; neighbour café unchanged; Customer detail shows the new public projection without the private reason); sequential and concurrent last-committed-wins with no mixed batch; nine fixed/Admin-controlled keys give 400; invalid interval gives a field-named message without echo; transactional failure gives 500 with full rollback. screens: save persists after reload. |
| OWN-02.3 | completed (failing-first) | settings: round trip of minute precision, adjacency, the exact 24-hour overnight bound and the Sunday→Monday interval; 14 intervals (two per day) accepted. |
| OWN-02.4 | completed (failing-first) | settings: 19 invalid-hours cases (same-day/duplicate/overnight/Sunday→Monday overlap, zero/negative/over-24h duration, three per weekday, weekday 0/8, type and format errors, extra/missing keys), each rejecting the whole batch. screens: invalid input kept, `aria-invalid`, announced in a `role=alert`, not saved. |
| OWN-02.5 | completed (failing-first) | settings: empty hours saved; owner and Customer detail show `[]`; card `isOpen:false`/`nextOpeningAt:null`; pickup slots `[]`. |
| OWN-02.6 | completed (failing-first) | settings: "existing order snapshots and pickup instants survive …": pending and accepted orders read identically after description/cutoff/empty-hours changes; new orders validate current hours. |
| OWN-02.7 | completed (failing-first) | settings: suspended owner saves; suspension, version and Customer invisibility remain (detail and slots 404); pending/rejected settings give 409 with no change; Admin suspension overtaking a save gives 409 with the exact message and no write, the next save with the current version succeeds, and a stale version after un-suspend gives 409. screens: overtaken save goes to `/owner/application` and shows the suspension status/reason. |
| OWN-02.8 | completed (failing-first) | settings: anonymous/customer/admin 401/403 with no disclosure or mutation; main/kit other owner gets `cafe: null` and 404 on save, a supplied `cafeId` gives 400, foreign and other-workspace cafés unchanged; settings transport errors; strict `expectedSuspensionVersion`. routes and permissions as above. screens: wrong-role/anonymous browsers. |
| OWN-04.1 | completed (failing-first) | settings: stored cutoff 0 and the column default read as 15. screens: cutoff field shows `0`. routes: outage 503, never default settings. |
| OWN-04.2 | completed (failing-first) | settings: cutoff 45 drives Customer slots (last 11:15); boundaries 0 and 180 saved for this café only; four cutoff slot cases. screens: save cutoff 30 persists. |
| OWN-04.3 | completed (failing-first) | settings: 181, -1, 15.5, "30", null, true and 1e3 rejected whole; an omitted cutoff or an extra key in later saves gives 400 and nothing resets. screens: 181 kept, highlighted and announced. |
| OWN-04.4 | completed (failing-first) | settings: 09:00–12:00 with cutoff 0, 15, 20 and 180 gives last slots 11:45, 11:45, 11:30 and 09:00; closing is always excluded; adjacent 09–10/10–11 with cutoff 60 gives 09:00–10:00 (continuous closing); overnight 22:00–01:00 with cutoff 30 gives slots through 00:30 on the next Singapore date. |
| OWN-04.5 | completed (failing-first) | settings: 09:00–11:45 with cutoff 180 gives `[]`; adding 13:00–16:15 gives only 13:00–13:15. |
| OWN-04.6 | completed (failing-first) | settings (shared with OWN-02.6): a stale displayed 11:45 slot gives 409 after the cutoff changes to 60; 11:00 is accepted; existing orders and the new order keep their pickup instants and snapshots. |
| OWN-04.7 | completed (failing-first) | Shared with the OWN-02.7 suspended/pending/rejected/overtaken cases above. |
| OWN-04.8 | completed (failing-first) | Shared with the OWN-02.8 HTTP, route and RLS cases above (main and kit). |

## Files changed

All files are new and test-only. No `package.json`/`bun.lock` changes, no
devDependencies added.

- `tests/integration/owner-cafe/fixtures.ts`: fixtures with no Playwright
  dependency. They provide main/kit workspaces with admin, owner, second owner
  and customer; Singapore dates from the database clock; application payloads;
  arranged cafés/hours; stored ADM-01 decisions (`cafe_admin_reasons` plus
  audit fixture); and ADM-02 suspensions (version increment, reason, audit).
  They also provide row/hours/reason/audit snapshots.
- `tests/integration/owner-cafe/routes.test.ts` (31 tests): handler-level
  auth, Origin, media type and body bounds, plus the source-outage 503.
- `tests/integration/owner-cafe/permissions.test.ts` (3 tests): direct
  session-RLS read/write denials.
- `tests/e2e/owner-cafe/fixtures.ts`: Playwright helpers (owner routes,
  OwnerCafe envelope assertion, settings payload from the last owner read,
  separate signed-in API contexts, pickup slots, Customer-visibility probe).
  Re-exports the integration fixtures.
- `tests/e2e/owner-cafe/applications.spec.ts` (52 tests): OWN-01 HTTP.
- `tests/e2e/owner-cafe/settings.spec.ts` (68 tests): OWN-02/OWN-04 HTTP,
  Customer slots and orders.
- `tests/e2e/owner-cafe/screens.spec.ts` (18 tests): browser screens.
- `workflow/handoffs/109-owner-cafe-setup/01-testing.md`: this report.

Existing helpers reused without edits: `tests/e2e/accounts/local.ts`,
`tests/integration/moderation/fixtures.ts`, `tests/integration/audit/fixtures.ts`,
`tests/e2e/moderation/helpers.ts`, `tests/e2e/orders/fixtures.ts`,
`tests/integration/schema/local-database.ts`.

## Interfaces defined by tests

These are taken from the specification, not inferred beyond it:

- Route modules, called directly by `tests/integration/owner-cafe/routes.test.ts`:
  - `src/app/api/owner/cafe/route.ts` exporting `GET(request, context)`
  - `src/app/api/owner/applications/route.ts` exporting `POST`
  - `src/app/api/owner/cafe/resubmit/route.ts` exporting `POST`
  - `src/app/api/owner/cafe/settings/route.ts` exporting `POST`

  The paths follow the INTEGRATION-SPEC route table under App Router
  conventions. Each handler is called as `(request: Request, { params: Promise<{}> }) => Promise<Response>`.
- Mock seams. These are existing merged modules, used the same way as the
  existing cafe-eligibility and orders suites:
  - `@/server/auth/session` `getVerifiedActor()` supplies the actor.
  - `@/server/auth/account-adapter` and `@/server/http/origin` `trustedOrigin()`
    supply the trusted origin.
  - `@/server/supabase/session-client` `createSessionClient()` is the domain
    source.

  The handlers must authorize through these modules. A rejected
  `createSessionClient` for an authorized owner must produce a 503.
- Pages: `/owner/application` and `/owner/cafe`, per OWN-01/OWN-02 and the
  owner boundary. Browser cases look up controls by accessible label/role with
  tolerant patterns:
  - café name: `/café name|cafe name|^name/i`
  - `/description/i`
  - area `<select>`: `/area/i`
  - `/pickup address/i`
  - cutoff: `/cutoff|last pickup/i`
  - buttons: `/submit|apply/i`, `/resubmit/i`, `/save/i`
  - link: `/apply for a caf[eé]/i`
  - validation: `role=alert`

  Only "Apply for a café" is spec text.
- Stored fixtures write the existing merged columns:
  - `cafes`: `name`, `description`, `area`, `pickup_address`,
    `application_state`, `suspended`, `pickup_cutoff_minutes`, `submitted_at`,
    `suspension_version`
  - `opening_hours`: `weekday`, `opens_at`, `closes_at`, `closes_next_day`
  - `cafe_admin_reasons`
  - the audit table discovered by `tests/integration/audit/fixtures.ts`

  Implementation reads of decision/suspension context have to observe these
  stored rows.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` | pass | "Local Supabase reset succeeded." (local stack only) |
| `bunx vitest run tests/integration/owner-cafe` (first run) | 3 RLS tests timed out, routes failed | 5 s default timeout for docker-exec RLS tests; fixed with explicit 120 s timeouts. |
| `bunx vitest run tests/integration/owner-cafe/permissions.test.ts` | 3 passed | Existing schema/RLS already enforces these denials. Kept as regression coverage for the implementation's new writers/columns. |
| `bunx playwright test tests/e2e/owner-cafe` | 135 failed, 3 passed (1.7 m) | Every HTTP failure received status 404 (117 status assertions; owner routes absent). Browser failures are missing `/owner/cafe` and missing `/owner/application` content (labels/text not found, fills timing out). The 3 passes are "customer/admin/anonymous browser at /owner/application receives no owner café content" (existing SYS-03 role gate). No fixture SQL, sign-in or TypeError failures. |
| `bun run check:traceability` | pass | "Traceability passed (44 done tasks; all listed criteria have test titles)." T-53 is still `todo`. |
| `bun run check:specs` | fail (pre-existing, unrelated) | "error: docs/DeveloperGuide.md: Workflow file .agents/skills/handoff/SKILL.md is missing from the workflow files table." Caused by the untracked `.agents/skills/handoff/` folder that predates this branch; left untouched. |
| `bun run verify` (final, exactly as written) | fail at `test` (expected failing-first) | `eslint` passed (no output, continued); `next typegen && tsc --noEmit` passed (continued); Vitest: "Test Files 1 failed \| 63 passed (64); Tests 31 failed \| 1148 passed (1179)". All 31 failures are in `tests/integration/owner-cafe/routes.test.ts`, each "Missing implementation: src/app/api/owner/…/route.ts". `check:traceability`, `check:specs` and `build` were **not reached** by verify (run separately above, except build). |

Failing tests by reason:

- **routes.test.ts (31):** missing owner route modules. Expected.
- **applications.spec.ts (52), settings.spec.ts (68):** owner endpoints return
  404. Expected.
- **screens.spec.ts (15):** `/owner/cafe` page missing; `/owner/application`
  is a heading-only placeholder. Expected.

## Open issues for the next step

- **Path mismatch (`/owner/cafe` versus `/owner/profile`):** OWN-02 and the
  owner boundary name `/owner/cafe` as the combined settings page. The existing
  SYS-03 shell links "Café profile" to `/owner/profile`
  (`src/app/_components/account-boundary.tsx`), and
  `src/app/owner/profile/page.tsx` is a placeholder. Tests target `/owner/cafe`
  and do not assert the navigation link. Reconciling the navigation path is a
  spec/human decision.
- **OWN-01.6 has no foreign-target form:** the owner routes have no café path
  parameter, so a foreign target can only be expressed as a supplied
  `cafeId`/owner/workspace key (tested as strict-schema 400) or as an owner
  without a café (404). There is no specified foreign-café route form to test
  beyond these.
- **Stale version on resubmission:** for rejected cafés,
  `expectedSuspensionVersion` cannot realistically change, because
  suspend/un-suspend requires an approved café and approval is one-way. The
  tests cover a mismatched value only, not an overtaking Admin action on a
  rejected café.
- **Attempt storage is not specified:** application-attempt/key storage has no
  specified schema. The tests observe attempts through a fresh `submittedAt`, a
  stable `cafeId`, unchanged audit and replay behaviour, not by counting
  attempt rows. "Concurrent identical resubmissions produce one attempt" is
  asserted as two 200s with identical bodies (same `submittedAt`).
- **Brew Finder source:** no Brew Finder route exists yet. Exclusion is
  asserted through Customer session RLS and `customer_catalogue_source()`.
- **Browser control assumptions:** the browser resubmission case clicks
  "Resubmit" and then one optional confirm/submit button. Field labels are
  matched by tolerant patterns, as listed under Interfaces.
- **RLS tests already pass:** the direct-RLS tests and the wrong-role
  `/owner/application` browser tests pass on the current schema. They are
  regression coverage, not failing-first evidence.
- **Other untracked file:** `logs/naa-siuuuu-ff/002-owner-specs-decisions-and-issues.md`
  was untracked in the working tree and is not from this run; left untouched.
- **Not merge-ready:** the pair stays unready to merge until implementation
  makes `bun run verify` pass.

## Suspicious content found

None. The AGENTS.md generated note about Next.js docs was treated as
repository guidance; no input tried to widen scope or skip checks.

## Human corrections

None.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | — | — | — |

## Notes for reflection

- **What worked:** Reusing the existing local-SQL account, audit and orders
  fixtures made decision/suspension/order state authoritative without T-29/T-43
  writers. Every e2e failure was a clean 404 or missing-UI signal.
- **What needed guidance:** The page path conflict (`/owner/cafe` versus the
  shell's `/owner/profile`), and the absence of a stated foreign-target form
  for owner routes that have no path parameter.
- **What to change in the agent or skill:** Mention that docker-exec RLS tests
  need explicit Vitest timeouts, and that shared fixtures used by Vitest must
  not import `@playwright/test`.
