# Testing report

- **Agent:** testing
- **Issue:** #112 (T-56); paired implementation task T-57 is #113
- **Spec IDs:** OWN-03.1, OWN-03.2, OWN-03.3, OWN-03.4, OWN-03.5, OWN-03.6, OWN-03.7, OWN-03.8, OWN-03.9
- **Date:** 2026-10-23
- **Branch:** feat/112-owner-menu
- **Base commit:** 5db7219
- **Status:** completed

## Summary

I wrote failing-first tests for all nine OWN-03 criteria. They test three
surfaces: the local Supabase RLS and storage constraints, the owner menu Route
Handlers with a mocked session and source, and the live HTTP and browser
behaviour against the production build with local Supabase fixtures. The tests
follow the INTEGRATION-SPEC "Owner menu boundary", including the approved-only
rule (OWN-03.9) and the stated mutation check order. Every failure is due to
missing implementation: the menu Route Handlers do not exist, the Menu page is
still a placeholder heading, and the current RLS lets the owner of a pending
café update menu names. No fixture or tooling failures remain. The pair is not
ready to merge until T-57 makes verify pass.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| OWN-03.1 own menu read | completed (failing-first) | http: "main/kit own-menu read returns only the owner's café items, including sold-out items, in code-point name order"; "menu pages hold 20 items with hasNextPage…"; "malformed, duplicate or unknown menu query keys give 400"; "an owner without a café reads an empty menu page…"; "owners of pending and rejected cafés still read their own menu items unchanged". routes: "an authorized owner menu source outage is a safe 503, never an empty menu". permissions: "direct menu reads expose a café's items to its owner in every application state…". pages: "Menu lists only the owner's items with names, drink types, S$ two-decimal prices and sold-out state in name order"; "Menu shows 20 items per page in name order"; "Menu without a café shows an empty state with an Apply for a café CTA". |
| OWN-03.2 add/edit/remove, duplicates, last committed | completed (failing-first) | http: create trims and defaults soldOut (main and kit) with owner and Customer reads; save preserves identity and leaves other items and cafés unchanged; removal deletes, repeat removal or save gives 404 with no upsert, and a re-created name gets a new identity; duplicate names give 409 (whitespace removal, Unicode lowercase, per café); 2–100 code-point names; strict bodies; concurrent saves are last-committed-wins with no mixed fields; concurrent duplicate creates produce one 201 and one 409; a save racing a removal cannot recreate the item. pages: "editing an item's name on the Menu page saves it…". |
| OWN-03.3 integer SGD cents and S$ display | completed (failing-first) | http: "prices are integer SGD cents from 1 to 1,000,000 inclusive…" (accepts 1 and 1,000,000; rejects 0, -1, 1,000,001, 4.5, 450.25, "450", null, true and 1e21, with no write). permissions: the storage CHECK rejects out-of-range values. pages: S$4.50, S$0.01, S$999.99, S$1.00. |
| OWN-03.4 shared DrinkType | completed (failing-first) | http: "every shared DrinkType value saves and reads back; unknown, differently cased or blank types give 400…". permissions: the storage CHECK rejects unknown types and out-of-range prices. |
| OWN-03.5 sold out stays visible, orders refused | completed (failing-first) | http: "toggling sold out keeps the item visible to Customers, refuses new orders containing it, and toggling off restores ordering"; "toggling sold out off on a suspended café does not make it orderable or visible; an all-sold-out menu stays visible…". pages: "turning the sold-out toggle on from the Menu page saves the item as sold out". |
| OWN-03.6 historical snapshots unchanged | completed (failing-first) | http: "renaming, repricing, selling out or removing an ordered item leaves existing order snapshots unchanged; new orders use current prices". It covers a Customer-created order and an arranged collected history order, a stale expected total (409), and a new order at the current price. |
| OWN-03.7 suspended café management | completed (failing-first) | http: "an approved suspended café's owner can create, save and remove items with the current version…"; "a menu mutation overtaken by suspension or un-suspension gives 409 with the suspension message…". pages: "a Menu edit overtaken by suspension opens /owner/application…". |
| OWN-03.8 401/403/404, forged parent, RLS | completed (failing-first) | routes: 401, 403 (customer and admin), Origin 403, 415, 65,536/65,537-byte bodies (400/413) and malformed JSON (400). http: live 401/403 with no disclosure; untrusted Origin gives 403; with no café, schema-valid mutations give 404 and invalid ones give 400; missing, foreign and other-workspace items give indistinguishable 404s; the approved-café check order is validation, then item, then suspension guard, then duplicate. permissions: foreign actors cannot write directly; forged item-parent moves and inserts are denied. pages: anonymous, customer and admin redirects; another owner's page shows no items. |
| OWN-03.9 pending/rejected → 409, no write | completed (failing-first) | http: pending and rejected cafés get create, save and remove 409 with "Menu changes are available once your café is approved." for own, foreign, other-workspace and missing items, with nothing written; validation (400) decides first; the approval conflict precedes stale-version and duplicate-name conflicts; after approval, suspended or not, the same mutations proceed. permissions: a pending or rejected owner cannot write directly. pages: pending and rejected Menu edits show the message, keep the unsaved input and write nothing. |

Literal-title coverage, counted with `workflow/scripts/lib/test-titles.ts` over the new files: OWN-03.1 ×9, OWN-03.2 ×10, OWN-03.3 ×3, OWN-03.4 ×2, OWN-03.5 ×3, OWN-03.6 ×1, OWN-03.7 ×5, OWN-03.8 ×21, OWN-03.9 ×8. `test.each` titles use literal strings.

## Files changed

- `tests/integration/owner-menu/fixtures.ts`: local menu fixtures that reuse the owner-café, moderation and account fixtures. They include `arrangeItem`, `cafeIn`, row and snapshot readers, the spec messages, DrinkType values and a code-point comparator. All arranged rows stay within the CHECK constraints in `supabase/migrations/` (drink_type enum, price_cents 1..1,000,000). Names are 2–100 code points and unique per café.
- `tests/integration/owner-menu/permissions.test.ts`: RLS and storage tests against local Supabase, with explicit 120–180 s timeouts.
- `tests/integration/owner-menu/routes.test.ts`: Route Handler transport tests with mocked session, origin and session client (node environment).
- `tests/e2e/owner-menu/fixtures.ts`: Playwright HTTP helpers and envelope assertions.
- `tests/e2e/owner-menu/http.spec.ts`: live HTTP cases against the production build and local Supabase. It reuses `tests/e2e/orders/fixtures.ts` for Customer orders and claims no CUS criterion.
- `tests/e2e/owner-menu/pages.spec.ts`: browser cases, with every assertion scoped to the `main` landmark.
- `workflow/handoffs/112-owner-menu/02-testing.md`: this report.

No package.json, bun.lock, test configuration, src, migration, spec, PLAN or docs changes. No devDependencies were added. I ran `bun install --frozen-lockfile` in the new worktree, which had no `node_modules`. The lockfile did not change.

## Interfaces defined by tests

- Route Handler files at the spec paths, with the dynamic segment named `itemId`:
  - `src/app/api/owner/menu/route.ts`, exporting `GET` and `POST`
  - `src/app/api/owner/menu/[itemId]/route.ts`, exporting `POST`
  - `src/app/api/owner/menu/[itemId]/remove/route.ts`, exporting `POST`
- The mocked route tests replace existing modules: `@/server/auth/session` (`getVerifiedActor`), `@/server/http/origin` and `@/server/auth/account-adapter` (`trustedOrigin`), and `@/server/supabase/session-client` (`createSessionClient`). The mocks only take effect if the handlers obtain session, origin and source through these modules.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` (before database suites; run twice) | passed | "Local Supabase reset succeeded. Generated credentials are omitted." Docker Desktop was not running at first. I started it locally (`open -a Docker`); the first reset attempt before that failed with a Docker daemon connection error. |
| `bunx vitest run tests/integration/owner-menu/permissions.test.ts` | failed (expected) | 1 failed, 4 passed. Failing test: "OWN-03.9: an owner whose café is pending or rejected cannot … through direct writes": `update public.menu_items set name=… expected '1' to be '0'`. The existing `20261020000000_role_matrix.sql` grant `update (name)` and the `menu_owner_update` policy do not check application state. |
| `bunx vitest run tests/integration/owner-menu/routes.test.ts` | failed (expected) | 34 of 34 failed, each with "Missing implementation: src/app/api/owner/menu/…/route.ts". |
| `bun run test:e2e tests/e2e/owner-menu` | failed (expected) | 40 failed, 4 passed. All 32 HTTP cases fail because `/api/owner/menu*` returns Next's 404 (status 404, or Next's `private, no-cache, no-store…` header where a 404 was expected). The 8 failing page cases fail because the placeholder `/owner/menu` has no items, CTA or editable fields. The 4 passing cases are the anonymous, customer and admin redirect cases and the other-owner page case, which the existing role layout and placeholder already satisfy. |
| `bun run verify` | failed (expected) at `bun run test` | lint passed (`$ eslint` with no findings). Typecheck passed (`✓ Types generated successfully`, no tsc errors). Test failed: "Test Files 2 failed \| 81 passed (83); Tests 35 failed \| 1371 passed (1406)". All 35 failures are in `tests/integration/owner-menu/`: 34 in routes.test.ts (missing route files) and 1 in permissions.test.ts (the OWN-03.9 direct write above). No other suite failed. |
| `bun run check:traceability` (run separately) | passed | "Traceability passed (57 done tasks; all listed criteria have test titles)." |
| `bun run check:specs` (run separately) | passed | "Spec check passed (0 warning(s))." |

Checks not reached inside `bun run verify`: `check:traceability`, `check:specs` and `build`. The first two passed when run on their own. `build` ran only as the Playwright web server step, where it succeeded and the app served.

## Open issues for the next step

- The UI price-entry unit (dollars vs cents) is not specified. Browser cases therefore never type a price. They edit names and the sold-out control only, and price display is asserted from arranged rows.
- The browser cases assume accessible structures the spec does not name. Items appear as list items or table rows whose text includes the name. The name is in an editable textbox, optionally behind an "Edit" button. A button labelled "Save" sits in the field's form. Sold-out state is a checkbox or switch named "sold out", or "sold out" text. These are role and label assumptions, not behaviour inferences.
- The OWN-03.9 direct-write denial comes from the OWN-03 Permissions table ("denied with no write while pending or rejected"). It needs a tighter RLS policy or grant than the existing role matrix provides.
- A non-UUID path reference (`not-a-server-reference`) is expected to give the same 404 as other missing items, following the opaque `Ref` definition.
- Not covered: 405 handling for unsupported methods, and a forced transactional failure during a menu mutation. The menu boundary states that no partial mutation remains but does not fix the status code for that case.
- The local Supabase database is shared across checkouts. The database suites and Playwright ran one at a time from this worktree after a reset.

## Suspicious content found

None.

## Human corrections

None.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | None |

## Notes for reflection

- **What worked:** Reusing the owner-café, orders and moderation fixtures kept setup within schema constraints; none of the 44 e2e cases failed on fixture SQL. The explicit check order in the boundary made each ordering assertion deterministic.
- **What needed guidance:** The Menu page's control structure and price-entry unit are not specified, so the browser cases rely on generic accessible roles.
- **What to change in the agent or skill:** sdd-test could advise checking whether Docker and local Supabase are running before database suites, and installing dependencies in a fresh worktree first.
