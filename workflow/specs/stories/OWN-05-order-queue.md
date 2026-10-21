# OWN-05: Manage the order queue

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [roles](../PRODUCT-SPEC.md#roles-and-access), [orders and ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [state/race boundary](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [Customer orders](CUS-04-my-orders.md), [Customer pre-order](CUS-03-pre-order.md), [suspension](ADM-02-cafe-suspension.md), [collected-order review](CUS-05-review-order.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-05; High priority, MVP.
- **Requirement ownership:** This file owns OWN-05's queue actions. CUS-03 owns creation, CUS-04 owns Customer cancellation/read behavior, and ADM-02 owns suspension cancellations. The integration matrix is the shared state/race contract.

## Overview

Owners fulfil their café's pre-orders by accepting or rejecting pending orders,
marking accepted orders ready, then marking ready orders collected. The queue
uses retained purchase snapshots and current fulfilment state. No action
collects an online payment; Customers pay at pickup.

## Queue presentation and action fields

`/owner/orders` defaults to the active queue: pending, accepted and ready.
UI labels map `pending` to “New”, `ready` to “Ready for pick up”, and `collected`
to “Completed”; stored state names and shared transitions do not change.
Active filters are Active (default), New, Accepted and Ready for pick up.
The history view contains cancelled, rejected and collected orders, with an All
history filter plus individual state filters. Both views sort pickup instant
ascending, placement instant ascending, then order reference ascending, 10 per
page. The exact [owner queue boundary](../INTEGRATION-SPEC.md#owner-order-queue-boundary)
defines strict URL filters, page parsing and JSON projections.

Display retained purchase fields, current state and the customer name snapshotted
from the verified customer profile when the order was placed. This grants no
email, phone or general customer-profile access; later profile changes cannot
rewrite the retained name. Each successful accept/ready/collect/reject action
records its server event timestamp atomically with the state transition.

Rejection requires a nonblank reason of at most 100 whitespace-delimited words,
using ECMAScript whitespace boundaries. Trim surrounding whitespace, preserve
internal content and render it as inert text. Store it separately from suspension
cancellation reasons and expose it to that order's customer in My orders.
Acceptance/readiness/collection cannot supply a rejection reason. Repeat and
stale actions retain the shared 409 outcome; show “Order changed. Refresh to see
its current state.” and reload the selected queue page. No-café entry shows an
empty state with an application CTA. No-source is never represented as no orders.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses the demo-kit owner account.
- **What it can see and change:** Orders of its own café within its verified workspace; only the four owner transitions below. Suspension preserves owner management/read access while cancelling outstanding orders under ADM-02.
- **What it can never do:** Access another café/workspace's queue, rewrite order contents/prices/pickup, cancel as another Customer, edit reviews, revive terminal orders or override Admin suspension.

## Requirements

### `OWN-05`: Fulfil the café's pre-orders

- **User story:** As a café owner, I want an order queue where I can accept, reject, mark ready and mark collected, so that I can manage my café's orders.
- **Priority:** High
- **Risk:** High — concurrent owner, Customer and suspension actions can otherwise produce contradictory fulfilment or disclose private purchases.

#### Acceptance criteria

- **`OWN-05.1`:** Given the owner opens Order queue, when authorized source reads succeed, then the active/history state filters, labels, 10-item pages and ascending pickup/placement/reference ordering above apply and only its café's in-workspace orders are disclosed, with current fulfilment state and retained item/quantity/price/pickup information; live menu edits do not replace purchase snapshots.
- **`OWN-05.2`:** Given an own-café `pending` order, when the owner accepts it, then it becomes `accepted`; when the owner instead rejects a pending order, it becomes `rejected`. Rejection requires the customer-visible reason above; each transition records its timestamp and preserves purchase, customer-name and pickup snapshots.
- **`OWN-05.3`:** Given an own-café `accepted` order, when the owner marks it ready, then it becomes `ready`; given a `ready` order, marking it collected makes it `collected`, recording the corresponding timestamp and preserving its purchase snapshots.
- **`OWN-05.4`:** Given an in-scope order in any state other than the selected action's allowed prior state, when the owner requests that action, then `409 STATE_CONFLICT` is returned and nothing changes; repeated transitions, skipped stages and terminal-state revival are not permitted.
- **`OWN-05.5`:** Given a Customer cancellation and owner acceptance compete for one pending order, when they execute concurrently, then exactly one pending-state transition succeeds and the loser receives `409 STATE_CONFLICT`; the order cannot be both accepted and cancelled.
- **`OWN-05.6`:** Given owner collection competes with café suspension, when collection commits first, then the collected order is preserved; when suspension commits first, then the order is cancelled under ADM-02/CUS-04 and collection fails with `409 STATE_CONFLICT`. Un-suspension never revives a cancelled order.
- **`OWN-05.7`:** Given an owner action fails transactionally, when its response is returned, then the shared `500 INTERNAL_ERROR` applies with no partial order mutation; an order-source read failure uses `503 SOURCE_UNAVAILABLE`, not an empty successful queue.
- **`OWN-05.8`:** Given no session, a wrong role, or a missing/other-café/other-workspace order, when an owner queue JSON operation is requested, then the shared `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies respectively without disclosure or change; references never establish queue authority and RLS enforces parent-café scope.
- **`OWN-05.9`:** Given a collected own-café order, when subsequent order reads or the Customer's review eligibility are evaluated, then the stored state is `collected` and review eligibility is evaluated independently by CUS-05; queue actions neither create a review nor alter its text/visibility.
- **`OWN-05.10`:** Given a kit owner, when it reads or acts on its queue, then the same state/race rules apply only inside its kit; ordinary owner actions do not disclose main-workspace or other-kit orders.

#### Edge cases and failure paths

Terminal states are `collected`, `rejected` and `cancelled`; none is reopened.
Suspension atomically cancels pending/accepted/ready orders, preserves retained
records and owner access, and is not a general owner cancellation operation.
No automatic expiry or no-show transition is introduced. Shared origin,
strict-JSON, private/no-store and safe-error conventions apply to JSON actions.

#### Out of scope

Customer cancellation, Admin suspension, order rescheduling/item substitution,
refunds, online payment and automatic inventory or review actions.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/orders` | Own café active/history views, state filters, purchase/customer-name snapshots, rejection reasons and timestamps; 10-item pickup/placement-ordered pages, no-café CTA and source/conflict states | Accept/reject pending; mark accepted ready; mark ready collected | OWN-05 |

## Use cases

### `UC-OWN-05-1`: Fulfil a pickup order

- **Actor:** Signed-in Café owner.
- **Preconditions:** A pending own-café order within verified workspace.
- **Main success scenario:**
  1. Owner reads the pending order in its queue.
  2. Owner accepts; the order becomes accepted.
  3. Owner marks it ready; the order becomes ready.
  4. Following pickup, owner marks it collected; the order becomes collected.
- **Extensions:** Step 2: owner may reject instead, ending fulfilment; competing Customer cancellation can win. Steps 2–4: wrong current state returns a conflict without change. Step 4: suspension that commits first cancels the order and prevents collection. Every step denies foreign café/workspace targets.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read queue and order snapshots | Own café's orders in workspace | Customers' purchases are accessible only through that café's queue scope; unrelated orders denied |
| Accept/reject/mark ready/mark collected | Own café orders in the specified prior state | Same café scope only; no general Customer-account access |
| Rewrite purchase/pickup, revive terminal state or modify review | Denied | Denied |
| Admin suspension or Customer cancellation | No new owner permission | Separate ADM-02/CUS-04 authority |

## Out of scope

Additional lifecycle states or permissions beyond the shared transition matrix.
Navigation remains SYS-03; accessible/responsive core behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.

Retired IDs: ASM-01.
