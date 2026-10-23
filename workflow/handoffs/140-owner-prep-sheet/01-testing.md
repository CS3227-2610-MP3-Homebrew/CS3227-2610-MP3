# Testing report

- **Agent:** testing (single-agent mode, coordinating session: Claude)
- **Issue:** [#140](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/140) (T-67)
- **Spec IDs:** OWN-09.1, OWN-09.2, OWN-09.3, OWN-09.4, OWN-09.5, OWN-09.6, OWN-09.7
- **Date:** 2026-10-23
- **Branch:** feat/140-owner-prep-sheet
- **Base commit:** 5db7219
- **Status:** incomplete

## Summary

Single-agent mode. Failing-first tests for the OWN-09 prep sheet are written
against the OWN-09 story and INTEGRATION-SPEC "Prep sheet (OWN-09)" contract
(`GET /api/owner/prep-sheet`, `PrepSheet`). All seven criteria have named cases.
The local Supabase database is shared with a concurrent OWN-03 session, so by
human instruction no `db:reset`, database test, `bun run verify` or
`bun run test:e2e` has run yet. Status stays `incomplete` until those runs are
recorded.

## Acceptance criteria

| Criterion | Status | Evidence (test name) |
| --- | --- | --- |
| OWN-09.1 | completed (authored) | e2e `OWN-09.1: only accepted orders with a Singapore pickup date of today are included`; `OWN-09.1: item totals group by retained reference, keep the latest placed snapshot name and sort by quantity, code-point name, then reference`; page `OWN-09.1 OWN-09.2 OWN-09.4: …` |
| OWN-09.2 | completed (authored) | e2e `OWN-09.2: orders sort by pickup instant, placement instant, then reference and carry only time, customer name and item lines`; page `OWN-09.1 OWN-09.2 OWN-09.4: …` |
| OWN-09.3 | completed (authored) | e2e `OWN-09.3: pending orders for today are excluded and counted; …`; page `OWN-09.3: the page states how many pending orders for today are not included` |
| OWN-09.4 | completed (authored) | e2e `OWN-09.4: an accepted order at 23:45 today is included and one at 00:00 tomorrow is excluded`; page case runs with browser timezone `America/Los_Angeles` |
| OWN-09.5 | completed (authored) | e2e `OWN-09.5: reading the sheet changes no order, menu or café record`; page `OWN-09.5: Print opens the print dialog, …`; `OWN-09.5: Order queue links to the prep sheet without a navigation entry, …` |
| OWN-09.6 | completed (authored) | e2e `OWN-09.6: no accepted orders gives an empty sheet …`; page `OWN-09.6: an owner without a café sees the no-café state …`; integration `OWN-09.6: an unavailable session source …`, `… failed prep-sheet read result …`, `… malformed source payload …` (all 503) |
| OWN-09.7 | completed (authored) | e2e `OWN-09.7: no session is 401, wrong roles are 403, query keys are 400 and other methods are 405`; `OWN-09.7: main and kit owners each see only their own café's orders`; page `OWN-09.7: anonymous and wrong-role visits …`; integration `OWN-09.7: missing sessions and wrong roles are refused before any source access` |

Case design (Given/When/Then summary):

- Selection: orders in all six states with pickup today plus accepted orders
  yesterday and tomorrow; only the accepted-today order appears.
- Item totals: a renamed reference across two placements takes the later
  placement's name; equal quantities sort `Zebra` before `apple` (code point,
  not locale); equal names sort by reference; removed menu rows (`live: false`)
  still count from retained snapshots.
- Orders: pickup, then placement, then reference tie-breaks; line arrays sorted
  by item reference (shared snapshot rule); strict object keys exclude price,
  total, email, phone and customer reference.
- Pending notice: two pending today and one pending tomorrow give
  `pendingTodayCount: 2` and the exact sentence "2 new orders for today are not
  included until accepted."
- Midnight: 23:45 today included, 00:00 tomorrow excluded.
- Print: `window.print` stubbed and counted; print media hides every
  `navigation` landmark, the Print button and the Order queue link while the
  date, "generated" text, totals and orders remain; record snapshot unchanged.

## Interfaces defined by tests

- Page accessible structure: an `h1` matching /prep sheet/i; headings matching
  /item totals/i and /^orders/i; a button matching /print/i; inside `main`, a
  link matching /order queue/i to `/owner/orders`; the business date rendered as
  `YYYY-MM-DD`; text matching /generated/i for the generation time.
- Order queue: a link matching /prep sheet/i inside `main`, not inside any
  navigation landmark.
- The route module `src/app/api/owner/prep-sheet/route.ts` exports `GET`; it
  reads through `@/server/supabase/session-client` `createSessionClient` and
  `@/server/auth/session` `getVerifiedActor` (the existing owner pattern).

## Files changed

- `tests/integration/owner-prep-sheet/fixtures.ts` — owner café fixture with retained orders at chosen pickup/placement instants (reuses moderation and owner-sales fixtures).
- `tests/integration/owner-prep-sheet/route.test.ts` — node-environment route tests with mocked session/source for 401/403/503.
- `tests/e2e/owner-prep-sheet/prep-sheet.spec.ts` — HTTP and page cases.
- No devDependencies added; `package.json` and `bun.lock` unchanged.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run lint` | pass | eslint exited with no output |
| `bun run typecheck` | pass | "Types generated successfully"; tsc no errors |
| `bunx vitest run tests/integration/owner-prep-sheet/route.test.ts` | 4 failed (expected) | each fails at `Missing implementation: src/app/api/owner/prep-sheet/route.ts` |
| `bunx playwright test tests/e2e/owner-prep-sheet --list` | parsed | "Total: 15 tests in 1 file"; no server started |

Not run (shared database in use by the OWN-03 session, by human instruction):
`bun run db:reset`, `bun run verify`, `bun run test:e2e`.

## Open issues for the next step

- Run `bun run verify` and `bun run test:e2e` once the database is free and
  record the failing-first results here or in the implementation report.
- Host-timezone independence (OWN-09.4) is exercised through database-side
  Singapore conversion and a non-Singapore browser timezone; the Next server's
  host timezone is fixed by the shared Playwright configuration and is not
  varied by these tests.
- The page-level `503 SOURCE_UNAVAILABLE` state cannot be induced against a
  live local database; it is covered at the route boundary.

## Suspicious content found

None.

## Human corrections

- Human chose OWN-09 as the one stretch feature, single-agent mode, and
  deferring all database-backed runs until the concurrent OWN-03 session
  releases the shared local database.

## Review responses

None.

## Notes for reflection

- **What worked:** Reusing the owner-sales fixture helpers gave Singapore-time instants without new tooling.
- **What needed guidance:** Database sharing between concurrent sessions.
- **What to change in the agent or skill:** Testing instructions could name a procedure for authoring while the shared local database is busy.
