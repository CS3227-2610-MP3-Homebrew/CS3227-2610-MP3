# Spec report

- **Agent:** spec
- **Issue:** #66 (T-35), with related decision proposals for #67–#70 (T-36–T-39).
- **Spec IDs:** CUS-01–CUS-07; related ADM-02.9–ADM-02.11; missing owning inputs OWN-02–OWN-05.
- **Date:** 2026-10-20
- **Branch:** master
- **Base commit:** d923954f61693437f0b2cb4f8edf12455d004277
- **Status:** awaiting-decision

## Summary

Reviewed T-35–T-39 against the Customer stories, shared integration/data contracts,
Admin moderation/suspension rules and current foundation migrations. The tables
below are a concrete decision proposal for human review. Every recommendation
is provisional; none is an accepted requirement or implemented behaviour.
No specification, task status, application code or tests changed.

The Customer stories are present on local master. OWN-02–OWN-05 story files are
absent. The current schema provides relationships and access controls, not the
missing price, opening-hours, pickup and fulfilment contracts. Existing code is
not evidence that those product decisions have already been made.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Identify decisions for T-35–T-39 | completed | Task-by-task proposals below, linked to existing owning stories |
| Resolve product choices | awaiting-decision | Recommendations require human selection or amendment |
| Establish owner-side hours/menu/pickup/queue inputs | blocked | OWN-02–OWN-05 story files absent |
| Finalize and approve canonical contracts | incomplete | No story/shared-spec amendments or reviewed merge in this run |
| Promote task statuses | incomplete | PLAN.md unchanged; a decision proposal does not satisfy task acceptance |

## Decisions proposed for T-35: catalogue and café page

Source: [T-35](../../PLAN.md#t-35-finalize-customer-catalogue-and-café-page-contracts),
[CUS-01](../../specs/stories/CUS-01-browse-cafes.md),
[CUS-02](../../specs/stories/CUS-02-cafe-page.md).

| Choice | Recommended decision and observable result |
| --- | --- |
| Filter combination | One time mode: all, open now, or open at a chosen Singapore date/time. One optional drink type and one optional area; combine active filters with AND. Reset clears all three. Open-at requires a date and minute, never a browser-local interpretation. |
| Filter vocabulary | Drink types: `coffee`, `tea`, `chocolate`, `juice`, `other`. Areas: `central`, `east`, `north`, `north_east`, `west`. Use exact lowercase enum values; reject unknown values, extra fields and numeric/string coercion. Owner menu/profile contracts must adopt the same vocabulary before finalization. |
| Strict filter object | `{timeMode: "all" | "now" | "at", at: Instant | null, drinkType: enum | null, area: enum | null}`. Require `at` only for mode `at`; otherwise require null. Reset has mode `all` and all other fields null. Chosen local date/minute converts to UTC `Instant` at the boundary. |
| Drink matching | A café matches a drink type if its current menu contains that type, even if all matching items are sold out. The café page still shows sold-out items; order eligibility and AI suggested-item availability are separate checks. |
| Hours and boundaries | Proposed owner contract: weekly Singapore intervals, opening inclusive and closing exclusive, with an explicit next-day closing flag for overnight intervals. Reject zero-length/overlapping intervals; adjacent intervals count as continuous opening. A café with no intervals is closed. |
| Closed-card text | Preserve greyed but clickable cards and “Cafe opens at X time”. Render X as `D MMM YYYY, h:mm AM/PM SGT`. With no next scheduled opening, show “No opening hours scheduled”, without inventing a time. Preserve “closing soon” when remaining open time is greater than zero and at most 30 minutes. |
| Ratings | Arithmetic mean of original ratings from pending/kept reviews only; zero visible reviews gives null and “No reviews yet”. Display one decimal with half-up rounding; sort by the unrounded mean descending, then visible-review count descending, then café reference ascending. Unrated cafés follow rated cafés. T-37 supplies the proposed 1–5 input scale. |
| Catalogue/review lists | Catalogue uses that rating order, 20 cafés per page; visible reviews use submission time descending then review reference ascending, 20 per page. Page numbers start at 1; an out-of-range valid page is empty. Empty data differs from source failure. |
| Customer-visible fields | Café: reference, name, description, area, public pickup address, hours and rating/count. Menu: reference, name, drink type, price and sold-out flag. Reviews: reference, rating, unchanged text and submission time. Label authors “Verified customer”; disclose no author ID, email or account profile. Owners must confirm which address/profile fields are public. |
| Money | SGD integer cents on storage/wire; display two decimals, e.g. `S$4.50`. No floating-point price arithmetic. Proposed menu prices: 1–1,000,000 cents. Owner menu contract owns validation and edit limits. |

## Decisions proposed for T-36: pickup, orders and suspension

Source: [T-36](../../PLAN.md#t-36-finalize-pickup-order-and-suspension-cancellation-contracts),
[CUS-03](../../specs/stories/CUS-03-pre-order.md),
[CUS-04](../../specs/stories/CUS-04-my-orders.md),
[ADM-02](../../specs/stories/ADM-02-cafe-suspension.md).

| Choice | Recommended decision and observable result |
| --- | --- |
| Pickup grid | Proposed owner contract: 15-minute slots aligned to Singapore midnight, today and the next six Singapore dates. A slot must be at least 15 minutes after the database clock, inside an opening interval and no later than its last-pickup cutoff. No capacity/stock reservation is implied. |
| Cutoff | Proposed owner field: integer minutes before interval closing, 0–180, default 15. Equality at the cutoff is allowed, but closing remains exclusive, including when the cutoff is zero. Overnight slots use the actual pickup date/instant; dates beyond the horizon are excluded. |
| Item quantities | One café per order, 1–20 distinct item lines and integer quantity 1–10 per line. Duplicate item references are invalid. Sold-out/removed items cannot be ordered. The server repeats all checks at commit. |
| Prices/history | Server computes unit-price snapshots, item-name snapshots, line totals and total in SGD cents. Submitted displayed total is a required confirmation value; if current prices produce a different total, return `409 STATE_CONFLICT` and require review/resubmission. Existing orders retain snapshots after menu/price changes. |
| Canonical lifecycle | Proposed queue contract: `pending → accepted → ready → collected`; owner rejection is `pending → rejected`; Customer cancellation is `pending → cancelled`. Collected/rejected/cancelled are terminal. No automatic no-show/expiry state. Repeat or invalid transitions return `409 STATE_CONFLICT`. OWN-05 must own owner actions; Customer specs reference them. |
| Duplicate creation | A client-generated UUID submission key is scoped to the verified Customer. The same key and same normalized request returns the original order without creating another; different content gives `409 STATE_CONFLICT`. Create order, items and key atomically; retain key with order history. Replays cannot mutate/revive an order or bypass current session/ownership checks. |
| Later owner edits | Hours/pickup/menu changes affect new orders only. Existing orders remain commitments with original pickup and item/price snapshots; suspension is the explicit cancellation exception. No retrospective rescheduling. |
| Competing actions | Serialize on the café and order state. If Customer cancellation wins, acceptance fails; if acceptance wins, Customer cancellation fails. If collection commits first, suspension preserves that collected order; if suspension commits first, the order is cancelled and collection fails. A creation committed before suspension is included in cancellation; one after suspension is denied. |
| Suspension | Existing confirmed rule remains: cancel pending/accepted/ready orders, preserve terminal orders, show fixed “Cafe is suspended”, never expose the private Admin reason, never revive on un-suspension. Café change, cancellations and exactly one Admin audit entry commit together or all roll back. T-29 remains the suspension writer. |
| Own-order display | Newest placed first, then order reference ascending, 20 per page. Show café-name snapshot, pickup time, state, item/price snapshots, total and fixed cancellation reason when applicable. Preserve own historical purchases after suspension without exposing the restricted live café page. |

## Decisions proposed for T-37: review submission

Source: [T-37](../../PLAN.md#t-37-finalize-customer-review-submission-contracts),
[CUS-05](../../specs/stories/CUS-05-review-order.md),
[ADM-03](../../specs/stories/ADM-03-review-moderation.md).

| Choice | Recommended decision and observable result |
| --- | --- |
| Rating and text | Require integer rating 1–5 and nonblank text of 1–1,000 Unicode code points. Whitespace-only text is invalid; validate trimmed nonblankness but store the exact original valid text, including whitespace/newlines. No HTML interpretation, truncation or Unicode normalization. These are proposed customer limits, independent of AI Label/Reason bounds. |
| Eligibility | One review per own collected order; verify collection from the canonical OWN-05 state. Allow submission from My orders even after café suspension, because the collected purchase remains valid. Public display still requires current café eligibility. |
| Duplicate/validation feedback | Every second submission, including identical retries and concurrent submissions, returns `409 STATE_CONFLICT`; never upsert. Invalid fields use shared `400 INVALID_REQUEST` with safe messages; keep entered text in the form for correction. |
| Moderation | Preserve the existing initially pending, pending/kept visible, hidden excluded policy and immutable text/rating. Own-review reads can confirm a prior submission, including a hidden review; public review DTOs disclose no reviewer identity. |

## Decisions proposed for T-38: Brew Finder

Source: [T-38](../../PLAN.md#t-38-finalize-brew-finder-selection-and-empty-result-contracts),
[CUS-06](../../specs/stories/CUS-06-brew-finder.md),
[canonical prompt/envelope](../../specs/INTEGRATION-SPEC.md).

| Choice | Recommended decision and observable result |
| --- | --- |
| Trigger | Confirm CUS-06 ASM-02: explicit Search/Enter submission, loading indicator while pending, no request while typing, no concurrent duplicate submit from the same pending form. Filter edits clear prior advice; they do not automatically call AI. |
| Candidate selection | Apply the exact ordinary filters and rating ordering. Exclude cafés with no currently available matching item; if drink type is selected, eligible suggested items must match it. Take the first 20 remaining cafés; for each, take up to 20 available matching items ordered by name then item reference. These deliberate selection caps must be visible in the contract; context overflow still uses the existing unavailable fallback without text truncation. |
| Ranking and count | Accept 0–5 distinct café suggestions, bounded by supplied candidate count, one supplied available item each. The model chooses ranking; server validates references, pairing, availability and bounds. Keep the literal prompt and one-call/no-retry sequence. |
| Empty source | No recommendable candidates means no provider call and existing `no_source_data` fallback. The ordinary filtered catalogue may still contain sold-out-only cafés. CUS-06.6 currently implies that list is empty; the proposed amendment must explicitly distinguish catalogue matches from recommendable candidates. |
| Empty model result | A valid empty suggestions array from a nonempty source is HTTP 200 `mode: "ai"` with empty suggestions. Show “No close match found” and the ordinary rating-sorted filtered catalogue separately. Do not invent a new fallback reason, call the model again or fabricate recommendations. This validated result may use the normal same-actor cache. |
| Source/cache identity | Include all filter-relevant hours/menu/area/eligibility state, rating sum/count and deterministic selection/order inputs, plus selected candidate/item content. Relative open-now filters need current interval/selection state, so clock-boundary changes cannot reuse stale advice. Recheck all results/items before delivery. Bump Brew's semantic contract identity when adopting these changes; preserve the shared envelope and other features' identities. |

## Decisions proposed for T-39: stretch favourites

Source: [T-39](../../PLAN.md#t-39-finalize-stretch-favourite-contracts),
[CUS-07](../../specs/stories/CUS-07-favourite-cafes.md).

| Choice | Recommended decision and observable result |
| --- | --- |
| Scope and placement | Keep this feature stretch. Confirm CUS-07 ASM-02: Save controls in Browse/Café page and a Saved view within Browse. No additional screen. Removal remains outside this proposal; adding it needs an explicit source-story scope amendment. |
| Persistence | Server-persisted unique Customer/café association with server timestamp, survives sign-out and devices. Derive workspace from actor/café; enforce matching workspaces and personal ownership through RLS. No public favourite counts or sharing. |
| Repeat save | Saving an already-saved currently eligible café is an idempotent success and preserves original saved time. Recheck current eligibility even on repeated saves. |
| Changed eligibility | Retain association but omit ineligible cafés and their details from saved results. When eligible again, show them automatically. Direct café reads still enforce current scope. Saved list sorts saved time descending then café reference ascending, 20 per page. |

## Proposed public boundary shape

These paths and shapes are proposals for the canonical INTEGRATION-SPEC, not
new permissions or existing endpoints. All use the existing strict JSON,
origin, private/no-store and shared error contracts. Actor/workspace/price
authority never comes from the client. Page paths remain subject to T-34's
shared navigation contract, which this assignment does not resolve.

| Task | Proposed page paths | Proposed JSON boundary |
| --- | --- | --- |
| T-35 | `/customer/cafes`, `/customer/cafes/{cafeId}` | `GET /api/customer/cafes` with the explicit filter/page query; `GET /api/customer/cafes/{cafeId}` for profile/menu/hours; `GET /api/customer/cafes/{cafeId}/reviews?page=…`. Query scalars have explicit parsing and duplicate/unknown keys are rejected. |
| T-36 | `/customer/cafes/{cafeId}/pre-order`, `/customer/orders` | `GET /api/customer/cafes/{cafeId}/pickup-slots`; `POST /api/customer/orders` with `{cafeId, pickupAt, items: [{itemId, quantity}], expectedTotalCents, submissionKey}`; `GET /api/customer/orders?page=…`; `GET /api/customer/orders/{orderId}`; `POST /api/customer/orders/{orderId}/cancel` with `{}`. |
| T-37 | `/customer/orders/{orderId}/review` | `POST /api/customer/orders/{orderId}/review` with `{rating, text}`; `GET` at the same route for the Customer's existing review. |
| T-38 | Brew Finder within Browse | Existing `POST /api/ai/brew-finder` with `{query, filters}` and unchanged envelope. |
| T-39 | Saved view within Browse | `POST /api/customer/favourites` with `{cafeId}`; `GET /api/customer/favourites?page=…`; no deletion endpoint in this scope. |

Proposed successes: creation returns HTTP 201 `{requestId, order}` or
`{requestId, review}`; order replay returns HTTP 200 `{requestId, order}`;
cancellation returns HTTP 200 `{requestId, order}`; favourite save/repeat returns
HTTP 200 `{requestId, saved: true}`. Read collections use
`{requestId, items, page, pageSize: 20, hasNextPage}`; item DTOs expose only
the fields agreed above. Exact DTO field names/types, owner profile/menu
validation and query grammar still need canonical drafting after product
selection; this table alone is insufficient for acceptance-test authoring.

## Files changed

Only this numbered decision report was added. Existing reports remain intact.
PLAN.md and all authoritative specs retain their current contents/statuses.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | Failed at tests, exit 1 | Lint and typecheck passed. Vitest: 13 files passed, six failed; 267 tests passed, 124 failed, six skipped by existing configuration. Database tests reported a missing local Docker socket. Traceability, specs and build were not reached within this command. |
| `bun run check:specs` | Passed, exit 0 | Zero warnings; run separately after verification stopped. |
| `bun run check:traceability` | Passed, exit 0 | 13 existing done tasks have their listed criterion test titles; no task promoted. |
| `git diff --check` | Passed, exit 0 | No tracked whitespace errors; only the new report directory is untracked. |
| Local report-link target check | Passed, exit 0 | All 15 relative file targets exist. |

The bundled native Node executable directory was added to this command's PATH
to satisfy the repository's Node runtime; no runtime/configuration file changed.
No feature acceptance or implementation completion is asserted by this proposal.
No separate build or browser test was run. The existing skipped tests were not
changed. Local Docker/PostgreSQL startup is outside this decision-report work.

## Open issues for the next step

- Human selection/amendment of the proposed decisions, including the numerical
  limits, public pickup address, review-after-suspension permission and omission
  of favourite removal, remains outstanding.
- OWN-02–OWN-05 must define the owning hours/menu/pickup/queue contracts. Their
  proposed shared decisions above are not substitute owner story specs.
- T-34 remains the owner of shared account/navigation choices. Its scope is
  unchanged; proposed Customer URLs must agree with it.
- Ratings in T-35 and review scale in T-37 need coordinated drafting. No PLAN
  dependency or acceptance-criterion ownership changed in this report.
- Selected decisions still require story/canonical-contract amendments,
  reviewed merge evidence, and a subsequent evidence-based PLAN update before
  dependent tests/implementation. T-35–T-39 remain awaiting-decision.
- No implementation, Git publication, live AI request, database access or
  deployment was attempted.

## Suspicious content found

None.

## Human corrections

None in this run. Previously confirmed closed-card and suspension behaviour
was preserved in the proposals above.

## Review responses

None; no implementation review was invoked.

## Notes for reflection

- **What worked:** Existing owning specs distinguish fixed behaviour from
  missing decisions; the empty-source/empty-model cases expose a necessary
  CUS-06.6 amendment before tests can be written.
- **What needed guidance:** Product defaults and absent owner contracts.
- **What to change in the agent or skill:** None established in this run.
