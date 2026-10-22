# Implementation report

- **Agent:** implementation (single-agent mode, coordinating Claude Code session)
- **Issue:** [#116](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/116) — PLAN.md T-60 (pair with testing issue #115, T-59)
- **Spec IDs:** OWN-05.1–OWN-05.10
- **Date:** 2026-10-22
- **Branch:** feat/115-owner-order-queue
- **Base commit:** eddd083 (testing commits 334250b and 95be23f)
- **Status:** completed

## Summary

Single-agent mode. This session wrote the T-59 tests, the T-60 implementation, the self-review below and the docs. No independent `review.sh` round ran.

The owner order queue at `/owner/orders` follows OWN-05 and the INTEGRATION-SPEC "Owner order queue boundary".

**Reads.** `GET /api/owner/orders` reads through `public.owner_order_queue`. It is a SECURITY INVOKER function under the existing `orders_read` RLS, so an owner sees only its own cafés' orders inside its workspace, including those of a suspended café. Queries are strict: `view`, `filter` and `page` each occur at most once, with exact enum spelling and the customer positive-decimal page parser. The proxy also checks the original URL, because Next can collapse duplicate keys. Pages hold 10 orders, sorted by pickup time, placement time and order ID, all ascending.

**Actions.** The four POST routes, `accept`, `reject`, `ready` and `collect`, all call `public.owner_order_action`. It is a SECURITY DEFINER function that does the following:
- It derives the owner from `auth.uid()` and the protected profile.
- It validates the action and the rejection reason again, using ECMAScript whitespace trimming and a 100-word limit.
- It locks the café row, then the order row (the T-29 rendezvous shared with Customer cancellation and ADM-02 suspension).
- It checks the single allowed prior state, then sets the state, its timestamp and any rejection reason together.

Wrong states return `409 STATE_CONFLICT` and missing or foreign orders return `404 NOT_FOUND`. No raw owner table write is granted.

**HTTP layer.** Handlers check the exact Origin, the JSON media type, the 64 KiB body ceiling and strict Zod bodies (`{}`, or `{reason}` for reject). They then check the verified owner role before making the RPC. Every response is `private, no-store`.

**UI.** The page has Active and History views, state filters and paging. Cards show state labels (New, Accepted, Ready for pick up, Completed, Rejected, Cancelled), the customer-name snapshot, items with quantity and unit price, the total, and Singapore-time events. The reject form requires a reason. A conflict announces the specified message and reloads the current page. An owner with no café sees an empty state with an **Apply for a café** link. All text renders as inert React text.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| OWN-05.1 | completed | `owner_order_queue` view/filter enums, 10+1 page fetch and ascending sort; `queueQuery` and proxy `markQueueQuery`; `page.tsx` filters, labels and no-café CTA. Tests: `tests/e2e/owner-queue/actions.spec.ts` ordering, filters, strict queries, snapshots and no-café cases; `pages.spec.ts` labels, history filters and CTA. |
| OWN-05.2 | completed | `owner_order_action` pending→accepted and pending→rejected with trimmed 1–100-word reason; `rejectSchema` and `emptySchema`. Tests: accept, reject trimming/limits/invalid bodies and customer-visible reason; UI reject flow. |
| OWN-05.3 | completed | accepted→ready and ready→collected, setting `ready_at` and `collected_at` and leaving snapshots unchanged. Tests: ready then collect with retained timestamps; UI flow. |
| OWN-05.4 | completed | Single allowed prior state per action; 409 with no write. Tests: full wrong-state matrix, repeated actions, stale UI conflict message; raw SQL transition denial in `tests/integration/owner-queue/permissions.test.ts`. |
| OWN-05.5 | completed | The café row lock, then the order `for update` lock, serialize against Customer cancellation. Tests: concurrent accept/cancel rounds. |
| OWN-05.6 | completed | The same café-then-order lock order as ADM-02 suspension; a terminal state is never revived. Tests: collect-first, suspend-first and concurrent orderings. |
| OWN-05.7 | completed | `source.ts` maps transport and read failures to 503 and failed mutations to 500; one statement per transition. Tests: `tests/integration/owner-queue/routes.test.ts`. |
| OWN-05.8 | completed | `http.ts` gates (Origin 403, media 415, body 413, Zod 400, role 401/403) and indistinguishable 404 for foreign orders; RLS scope. Tests: actions transport cases and `permissions.test.ts`. |
| OWN-05.9 | completed | Collect writes only order state and `collected_at`; no review table is touched. Tests: collecting creates or alters no review. |
| OWN-05.10 | completed | The workspace comes from the profile in both functions. Tests: kit owner and main owner isolation, fresh kit owner. |

## Files changed

- `supabase/migrations/20261023000100_owner_order_queue.sql`: `private.order_owner`, `private.owner_order_json`, `public.owner_order_queue` (invoker read) and `public.owner_order_action` (definer transitions), with execute grants to `authenticated` only.
- `src/server/owner-orders/{schema,query,source,http}.ts`: OwnerOrder schema, strict query parsing and proxy marking, session-bound RPC adapter with safe error mapping, and route handler logic.
- `src/app/api/owner/orders/route.ts` and `src/app/api/owner/orders/[orderId]/{accept,reject,ready,collect}/route.ts`: GET and POST handlers; other methods return 405 with `Allow`.
- `src/app/owner/orders/page.tsx` and `queue-list.tsx`: queue page and client card list.
- `src/proxy.ts`: matcher and `markQueueQuery` for `/api/owner/orders`.
- `docs/UserGuide.md`: section 5.2 "Run the order queue" and its contents entry.
- `docs/DeveloperGuide.md`: "Owner order queue" section.
- Test corrections, committed separately as `test(OWN-05)` 95be23f:
  - `tests/e2e/owner-queue/pages.spec.ts` now scopes the CTA link to `main`. The SYS-03 owner navigation always has a "Café application" link, which made the unscoped `/appl/i` query ambiguous under Playwright strict mode, so the test could never pass.
  - `tests/e2e/owner-queue/actions.spec.ts` now sends the JSON scalar `5` in place of the raw string `"x"`. Playwright sends a plain string body without a JSON content type, and INTEGRATION-SPEC requires `415 UNSUPPORTED_MEDIA_TYPE` for that, not the 400 the test expected.

## Self-review

I reviewed against `workflow/agents/reviewer.md` and the review skill's criteria, plus the baseline checks in `workflow/agents/security-reviewer.md`.

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| SR-1 | P0 | The migration failed under `db:reset`: `syntax error at end of input` at `owner_order_action`. PL/pgSQL ends an `IF` condition at the first bare `THEN`, so the `CASE … then` prior-state expression was cut short. Earlier passing DB tests had run against a partly migrated database. | Parenthesised the `CASE` expression and added a comment; `db:reset` succeeds. |
| SR-2 | P2 | Cards repeated the line total next to the order total. For a one-item order both read `S$9.00`, which made `OWN-05.1`'s price check ambiguous. | Cards now show quantity × unit price per item and one order total. |
| SR-3 | — | Checked: raw owner `update`/`delete` on `orders` is still denied, and both functions revoke `public`/`anon` execute. The definer function sets `search_path=''` and derives identity only from `auth.uid()`. The reason is stored and rendered as inert text. The page parser matches the customer parser. | No change. |
| SR-4 | P3 | Action handlers validate the body before checking the role, so an anonymous caller with an invalid body gets 400, not 401. The spec sets no precedence, and the customer order handlers use the same order. | No change; noted. |

No P0 or P1 finding remains open.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` (from this worktree) | pass | "Local Supabase reset succeeded." after SR-1 |
| `bunx vitest run tests/integration/owner-queue tests/unit` | pass | "Test Files 30 passed (30); Tests 416 passed (416)" |
| `bunx playwright test tests/e2e/owner-queue` | pass | "64 passed" |
| `bun run verify` | pass (exit 0) | Vitest "Test Files 64 passed (64); Tests 1161 passed (1161)"; "Traceability passed"; "Spec check passed (0 warning(s))."; build compiled; isolation checks passed |
| `bun run test:e2e` | pass (exit 0) | "568 passed (1.9m)" |

## Open issues for the next step

- T-60 depends on T-54, which is done only in PR #158 (feat/109-owner-cafe-setup). `bun run check:specs` rejects T-60 as `done` until T-54 is `done`, so this branch merges feat/109 before the Status close-out, and #158 must merge first.
- `docs/UserGuide.md` section 5 overlaps with the owner café (#158) and sales (#118) docs; the merge resolves the numbering.

## Suspicious content found

None.

## Human corrections

- The human chose single-agent mode for this pair.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None (self-review above) | — | — | — |

## Notes for reflection

- **What worked:** The end-to-end fixtures exercised the real SQL functions and caught both the migration error and the card ambiguity, which the mocked route tests could not.
- **What needed guidance:** A `db:reset` failure piped through `tail` let the following suite run on a partly migrated database. Check the reset exit status before running tests.
- **What to change in the agent or skill:** Make the testing skill scope page-level link assertions to `main`, because the shared role navigation is always present.
