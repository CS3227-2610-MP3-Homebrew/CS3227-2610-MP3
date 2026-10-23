# Implementation report

- **Agent:** implementation (single-agent mode, coordinating Claude Code session)
- **Issue:** #113 (T-57), paired with #112 (T-56)
- **Spec IDs:** OWN-03.1, OWN-03.2, OWN-03.3, OWN-03.4, OWN-03.5, OWN-03.6, OWN-03.7, OWN-03.8, OWN-03.9
- **Date:** 2026-10-23
- **Branch:** feat/112-owner-menu
- **Base commit:** 5db7219 (tests committed as fee8f6c)
- **Status:** completed

## Summary

Single-agent mode, chosen by the human for the rest of the pair after the T-56
tests were committed. This session wrote the implementation, the self-review
and the docs; no separate reviewer, security-reviewer or docs agent ran.

The owner Menu (`/owner/menu`) and its four JSON routes are implemented, along
with a migration that adds `owner_menu` (invoker read) and `owner_menu_write`
(definer create/save/remove under the café row lock, in the boundary's check
order) and narrows the existing `menu_owner_update` RLS policy to approved
cafés (OWN-03.9).

Two testing-owned tests needed a change, each because it contradicts a spec
criterion; the human commits them separately as `test(OWN-03): …`:

1. `tests/integration/roles-seeds/mutable-writes.test.ts` and
   `tests/integration/roles-seeds/rls.test.ts` (SYS-06.3, from T-08) used a
   café in its default `pending` state as the positive control for an owner's
   direct menu-name update. OWN-03.9 and the OWN-03 Permissions table now deny
   that write, and SYS-06.3 grants no unspecified permission. Each test now
   marks the menu's café approved before the positive control; opening-hours
   cases are unchanged. 21 cases failed before and all 101 pass after.
2. `tests/e2e/owner-menu/fixtures.ts` `post` passed bare `"text"` and `null`
   bodies to Playwright, which sends them as `application/octet-stream`. The
   shared transport contract (INTEGRATION-SPEC "Authorization and transport")
   requires 415 for a non-JSON media type, so the OWN-03.2/OWN-03.8 strict-body
   test received 415 instead of its intended 400. The helper now sends every
   body as `application/json` with `JSON.stringify`, which is what Playwright
   already did for objects; no assertion changed.

The local Supabase database is shared with another session working on OWN-09,
so instead of `bun run db:reset` the new migration was applied to the running
database with `psql` inside one transaction. All earlier migrations were already
applied there. The PR's CI `verify` applies migrations from scratch.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| OWN-03.1 | completed | `tests/e2e/owner-menu/http.spec.ts` own-menu read, paging, query and empty-page cases; `pages.spec.ts` list, paging and no-café CTA; `routes.test.ts` 503 source outage |
| OWN-03.2 | completed | `http.spec.ts` create, save, remove, duplicate, name-bound, strict-body and race cases; `pages.spec.ts` rename persists |
| OWN-03.3 | completed | `http.spec.ts` price bounds; `pages.spec.ts` `S$` two-decimal display; `permissions.test.ts` storage bounds |
| OWN-03.4 | completed | `http.spec.ts` DrinkType cases; `permissions.test.ts` storage bounds |
| OWN-03.5 | completed | `http.spec.ts` sold-out toggling with Customer ordering; `pages.spec.ts` sold-out toggle |
| OWN-03.6 | completed | `http.spec.ts` snapshots unchanged after rename, reprice, sell-out and removal |
| OWN-03.7 | completed | `http.spec.ts` suspended-café mutations and stale-version 409; `pages.spec.ts` overtaken edit opens `/owner/application` |
| OWN-03.8 | completed | `routes.test.ts` 401/403/Origin/415/413/400; `http.spec.ts` live 401/403, 404 scope and check order; `permissions.test.ts` direct RLS |
| OWN-03.9 | completed | `http.spec.ts` pending/rejected 409 with the approval message, check order and post-approval cases; `pages.spec.ts` keeps unsaved input; `permissions.test.ts` direct writes denied |

## Files changed

- `supabase/migrations/20261023000450_owner_menu.sql`: `owner_menu`, `owner_menu_write`, `private.menu_name_key`, `private.menu_item_json`; `menu_owner_update` policy limited to approved cafés. Timestamp chosen to avoid colliding with a parallel OWN-09 migration.
- `src/lib/owner/menu-input.ts`: Zod bodies, approval message, dollar/cent conversion by string parsing.
- `src/server/owner/menu.ts`, `menu-http.ts`, `menu-query.ts`: RPC source, route handling and strict `page` parsing.
- `src/app/api/owner/menu/route.ts`, `[itemId]/route.ts`, `[itemId]/remove/route.ts`: route handlers.
- `src/proxy.ts`: registers the menu query marker, as for the order queue.
- `src/app/owner/menu/page.tsx`, `menu-editor.tsx`: Menu page and client editor.
- `docs/UserGuide.md`: new section 5.6 Manage your menu; at-a-glance, navigation and known-limitation lines updated.
- `docs/DeveloperGuide.md`: new Owner menu section; `menu_items` schema row notes the approved-café rule.
- `workflow/PLAN.md`: Status lines of T-56, T-57 and T-63 set to `done` (T-63 merged in PR #167 but was still `blocked`).
- Test changes (separate commit): `tests/integration/roles-seeds/mutable-writes.test.ts`, `tests/integration/roles-seeds/rls.test.ts`, `tests/e2e/owner-menu/fixtures.ts`.

## Self-review

Reviewed the diff against `workflow/agents/reviewer.md` criteria and the
security reviewer's baseline (authorization, trust boundaries, input
validation, data exposure).

| Finding | Severity | Fix |
| --- | --- | --- |
| SR-1: a first draft used a SECURITY DEFINER helper `private.menu_cafe_approved(uuid)` granted to `authenticated` for the RLS policy. Any signed-in user could call it as an oracle for whether an arbitrary café ID is approved. | P2 | Replaced with an inline `exists` on `public.cafes` inside the policy, which runs under the caller's own `cafes_read` RLS; the helper and its grant were removed. Integration suites rerun: 140 passed. |
| SR-2: duplicate-name uniqueness is enforced by the café row lock inside `owner_menu_write`, not by a unique index. A direct Data API `update … set name` by an approved owner (the SYS-06 grant) can still create a duplicate. | P3 | Not changed. A unique index on the derived key could fail on existing seeded data and the route path is serialized; recorded under Open issues. |
| SR-3: item references are compared as text (`id::text = p_item_ref`), so a non-UUID reference gives the same 404 as a missing item, not a cast error. | — | Intended (opaque references); verified by the OWN-03.8 indistinguishable-404 test. |
| SR-4: owner identity, workspace and café are always derived in SQL from `auth.uid()`; no client-supplied café, owner or workspace field is accepted (strict schemas reject them). | — | No change. |
| SR-5: user text renders only through React, so item names stay inert; error bodies use fixed messages and never echo input. | — | No change. |

No P0/P1 findings remain open.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run typecheck` | passed | no errors |
| `bun run lint` | passed | no findings |
| `bunx vitest run tests/integration/owner-menu tests/integration/roles-seeds` | passed | 140 passed |
| `bun run test:e2e tests/e2e/owner-menu` | passed | 44 passed |
| `bun run verify` | passed | lint and typecheck clean; vitest 83 files, 1406 tests passed; "Traceability passed (60 done tasks; all listed criteria have test titles)."; "Spec check passed (0 warning(s))."; isolation checks and `next build` succeeded |
| `bun run test:e2e` | passed | 785 passed (2.6m), full suite on the final tree |

## Open issues for the next step

- SR-2 (P3): direct-API duplicate menu names by an approved owner are not blocked by a database constraint.
- Earlier security P3s from the owner pairs, SR-01 (opening_hours update grant) and SR-02 (unbounded submission-key binding), still need a spec decision; this pair does not change them.
- The final checks ran against a shared local database with the migration applied by `psql`, not after `bun run db:reset`.

## Suspicious content found

None.

## Human corrections

- The human approved the T-56 tests and asked for the failures to be fixed, which this session took as the choice of single-agent mode for implementation, self-review and docs.
- The human noted that another session is working on OWN-09 in parallel, so the shared database was not reset.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | — | — | Single-agent mode; self-review above. |

## Notes for reflection

- **What worked:** reading the committed tests before coding fixed every interface (route paths, mocked modules, messages, page roles) up front; the menu suites passed on the first full run apart from one test-helper defect.
- **What needed guidance:** a new spec rule (OWN-03.9) contradicted an older foundation test's positive control; the spec amendment did not list affected existing tests.
- **What to change in the agent or skill:** when a spec amendment narrows a permission, the spec agent could list existing tests whose positive controls depend on the old permission.
