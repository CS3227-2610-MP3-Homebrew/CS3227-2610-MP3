# OWN-14: Mark uncollected orders as no-shows

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [owner stretch boundary](../INTEGRATION-SPEC.md#owner-stretch-operations-boundary), [order queue boundary](../INTEGRATION-SPEC.md#owner-order-queue-boundary), [shared order states](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [order queue](OWN-05-order-queue.md), [My orders](CUS-04-my-orders.md), [reviews](CUS-05-review-order.md), [sales](OWN-06-sales-dashboard.md), [suspension](ADM-02-cafe-suspension.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-14; Low priority, Stretch.
- **Requirement ownership:** This file owns the `no_show` state and the owner action that sets it. OWN-05 still owns the four MVP transitions; OWN-05 lists no-show as excluded from the MVP, and this story adds it.

## Overview

Sometimes a Customer never collects. Without a no-show state, the order stays
in the active queue forever. The owner can close such an order as a no-show
once its pickup time has passed, keeping the queue clean and the history honest.

## No-show rules

`no_show` is a terminal order state. The owner can set it on an own-café order
in `accepted` or `ready` state once the database clock is at or after the
order's `pickupAt`. The transition records `noShowAt` atomically with the
state; purchase, customer-name and pickup snapshots are unchanged. Before the
pickup time, the action returns `409 STATE_CONFLICT` with "This order's pickup
time has not passed yet." Every other state returns the shared `409
STATE_CONFLICT`.

No-show competes with collection and Admin suspension on the same order;
exactly one transition wins and the loser gets `409 STATE_CONFLICT`. Suspension
and un-suspension leave `no_show` orders unchanged.

The owner sees the label "No-show", a Mark no-show action on eligible active
orders, and a `no_show` history filter. Customers see their order as "Not
collected" in My orders. A no-show order is not reviewable, because reviews
need `collected`, and it never counts as a sale.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Its own café's accepted or ready orders after their pickup time, inside its verified workspace.
- **What it can never do:** Mark another café's orders, revive a terminal order, change snapshots or penalize the Customer's account.

## Requirements

### `OWN-14`: Close orders that were never collected

- **User story:** As a café owner, I want to mark an uncollected order as a no-show after its pickup time, so that my queue and records show orders that were never collected.
- **Priority:** Low
- **Risk:** Medium — an early or racing no-show could close an order the Customer is about to collect.

#### Acceptance criteria

- **`OWN-14.1`:** Given an own-café `accepted` or `ready` order whose `pickupAt` has passed, when the owner marks it no-show, then it becomes `no_show` with `noShowAt` recorded and every snapshot unchanged.
- **`OWN-14.2`:** Given an accepted or ready order before its `pickupAt`, when the owner marks it no-show, then `409 STATE_CONFLICT` with "This order's pickup time has not passed yet." is returned and nothing changes; given any other state, the shared `409 STATE_CONFLICT` applies.
- **`OWN-14.3`:** Given no-show competes with collection or Admin suspension on one order, when they execute concurrently, then exactly one transition succeeds and the other returns `409 STATE_CONFLICT`.
- **`OWN-14.4`:** Given a `no_show` order, when any owner action, Customer cancellation, suspension or un-suspension follows, then the order stays `no_show` with its timestamps.
- **`OWN-14.5`:** Given `no_show` orders, when the owner reads queue history, then they show as "No-show" and the `no_show` filter returns them; the active view excludes them.
- **`OWN-14.6`:** Given a Customer's `no_show` order, when it reads My orders, then the order shows "Not collected", no review can be submitted for it, and the owner Dashboard never counts it as a sale.
- **`OWN-14.7`:** Given no session, a wrong role, or a missing or foreign order, when the no-show action is requested, then `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies without disclosure or change; main and kit owners stay inside their own workspace under server checks and RLS.

#### Edge cases and failure paths

Pending orders cannot become no-shows; the owner accepts or rejects them
first. Transaction failure returns `500 INTERNAL_ERROR` with no partial change.
No automatic no-show is introduced.

#### Out of scope

Automatic no-show marking, Customer penalties or bans, fees and notifications.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/orders` | Mark no-show on eligible active orders; "No-show" label and filter in history | Mark no-show | OWN-14 |
| Customer My orders | "Not collected" for no-show orders | None | OWN-14 |

## Use cases

### `UC-OWN-14-1`: Close a forgotten pickup

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own ready order whose pickup time has passed.
- **Main success scenario:**
  1. Owner selects Mark no-show on the order in Order queue.
  2. The system checks state and pickup time and records the no-show.
  3. The order leaves the active view and appears in history as "No-show".
- **Extensions:** Step 2: before pickup time, or after the Customer collected it first, the owner sees a conflict and the queue reloads.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Mark an order no-show | Own café's accepted/ready orders after pickup time | Denied |
| Revive or edit a terminal order | Denied | Denied |

## Out of scope

Payment, refunds, penalties and new navigation.

## Assumptions

None.
