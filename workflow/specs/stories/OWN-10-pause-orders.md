# OWN-10: Pause and resume new pre-orders

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [owner stretch boundary](../INTEGRATION-SPEC.md#owner-stretch-operations-boundary), [owner café boundary](../INTEGRATION-SPEC.md#owner-cafe-management-boundary), [pickup and order boundary](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [pre-order](CUS-03-pre-order.md), [café page](CUS-02-cafe-page.md), [order queue](OWN-05-order-queue.md), [suspension](ADM-02-cafe-suspension.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-10; Medium priority, Stretch.
- **Requirement ownership:** This file owns the café-level pause switch and its effect on new pre-orders. CUS-03 still owns order creation; this story adds one refusal condition to it.

## Overview

A home café owner sometimes needs to stop taking orders at short notice, for
example when they are overwhelmed or stepping out, without rewriting their
weekly hours. Pausing stops new pre-orders; the café stays listed, and
existing orders continue through the queue as normal.

## Pause behavior

The café has an `ordersPaused` flag, `false` by default. Only the owner of an
`approved` café can change it, including while the café is suspended; a
pending or rejected café cannot. Setting the flag to its current value
succeeds without change. There is no automatic resume: the café stays paused
until the owner resumes it.

While paused:

- The café remains in the Customer catalogue, café page and Brew Finder
  sources under their existing eligibility rules. The café page shows "Not
  taking pre-orders right now." and no pre-order action.
- The Customer pickup-slot read returns an empty list.
- New order creation returns `409 STATE_CONFLICT` with "This café is not taking
  pre-orders right now." and creates nothing. An order-submission replay of an
  order created before the pause still returns that order.
- Existing orders keep their states, and every owner queue action and Customer
  cancellation continues to work.

Pausing and order creation serialize on the café: an order committed before the
pause remains; creation after the pause is refused. Resuming restores slot
offers subject to the current hours, closures, rules and limits. Order queue
shows the current state ("Taking pre-orders" or "Pre-orders paused") with a
Pause or Resume action.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Its own approved café's pause flag inside its verified workspace, including during suspension.
- **What it can never do:** Pause another café, cancel or change existing orders by pausing, approve its café, or clear suspension.

## Requirements

### `OWN-10`: Control whether the café takes new pre-orders

- **User story:** As a café owner, I want to pause and resume new pre-orders without changing my opening hours, so that I can stop taking orders when I am too busy or unavailable.
- **Priority:** Medium
- **Risk:** Medium — a missed race or scope error could accept orders while paused or block another café.

#### Acceptance criteria

- **`OWN-10.1`:** Given the owner of an approved café, when it pauses or resumes pre-orders, then `ordersPaused` is saved for its café only, subsequent owner café reads return it, and Order queue shows the matching state and action; repeating the current value succeeds without change.
- **`OWN-10.2`:** Given a paused eligible café, when a Customer reads the catalogue, café page and pickup slots, then the café is still listed, the café page shows "Not taking pre-orders right now." without a pre-order action, and pickup slots are an empty list.
- **`OWN-10.3`:** Given a paused café, when a Customer submits a new order, then `409 STATE_CONFLICT` with "This café is not taking pre-orders right now." is returned and no order or submission key is stored; given pause and creation race, exactly one ordering applies: an order committed first is kept, and creation after the pause is refused.
- **`OWN-10.4`:** Given existing orders in any state, when the café is paused or resumed, then their states, snapshots and timestamps are unchanged, owner queue actions and Customer cancellation still succeed, and a replay of an existing order's submission still returns it.
- **`OWN-10.5`:** Given a resumed café, when pickup slots are read, then slots return under the current hours, closures, pickup cutoff and slot limit, with none fabricated by resuming.
- **`OWN-10.6`:** Given a pending or rejected café, or an `expectedSuspensionVersion` that no longer matches, when the owner changes the flag, then `409 STATE_CONFLICT` is returned with nothing changed; given a suspended approved café, the change succeeds but neither clears suspension nor restores Customer visibility.
- **`OWN-10.7`:** Given no session, a wrong role, or a missing or foreign café, when the pause operation is requested, then `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies without disclosure or change; main and kit owners stay inside their own workspace under server checks and RLS.

#### Edge cases and failure paths

A transaction failure returns `500 INTERNAL_ERROR` with no change. Pausing
does not alter open-now or open-at results, which still follow opening hours.
Shared strict-JSON, same-origin and private/no-store conventions apply.

#### Out of scope

Scheduled or timed pauses, pause reasons shown to Customers, cancelling existing
orders and notifying Customers.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/orders` | "Taking pre-orders" or "Pre-orders paused" state | Pause; Resume | OWN-10 |
| Customer café page | "Not taking pre-orders right now." while paused | None while paused | OWN-10 |

## Use cases

### `UC-OWN-10-1`: Pause during a rush

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own approved café taking pre-orders.
- **Main success scenario:**
  1. Owner opens Order queue and selects Pause.
  2. The system saves the paused state for the owner's café.
  3. Customers see the café without pickup choices and cannot place orders.
  4. Later, the owner selects Resume and pickup choices return.
- **Extensions:** Step 2: a suspension-version change returns a conflict and shows current status. Step 3: an order committed before the pause stays in the queue.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Pause or resume pre-orders | Own approved café in verified workspace | Denied |
| Change existing orders by pausing | Denied | Denied |

## Out of scope

Payment, notifications, automatic resume and changes to opening hours.

## Assumptions

None.
