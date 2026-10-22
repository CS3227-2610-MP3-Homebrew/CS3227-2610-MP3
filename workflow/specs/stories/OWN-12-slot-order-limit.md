# OWN-12: Limit orders per pickup slot

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [owner stretch boundary](../INTEGRATION-SPEC.md#owner-stretch-operations-boundary), [owner café boundary](../INTEGRATION-SPEC.md#owner-cafe-management-boundary), [pickup and order boundary](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [pickup rules](OWN-04-pickup-rules.md), [pre-order](CUS-03-pre-order.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-12; Low priority, Stretch.
- **Requirement ownership:** This file owns the per-slot order limit. CUS-03 still owns order creation and the 15-minute slot grid; this story adds one capacity condition, replacing the MVP's "no capacity reservation" only when the owner sets a limit.

## Overview

A one-person café can only make so many drinks in fifteen minutes. The owner
can set a maximum number of orders per pickup slot. Full slots stop being
offered, and nobody can book past the limit, even at the same moment.

## Limit rules

The café setting `maxOrdersPerSlot` is either `null` (no limit, the default)
or a JSON integer from 1 through 50. Only the owner of an `approved` café can
change it, including during suspension. It is saved on its own, separately
from the OWN-02/OWN-04 settings batch.

A slot's count is the number of own-café orders with exactly that `pickupAt`
in state `pending`, `accepted`, `ready` or `collected`. Rejected, cancelled and
no-show orders do not count, so a cancellation frees a place. A slot whose count
has reached the limit is omitted from pickup choices. Creating an order for a
full slot returns `409 STATE_CONFLICT` with "This pickup time is full. Choose
another time." Order creation serializes per café and slot, so concurrent
requests for the last place admit exactly one order.

Lowering the limit below a slot's current count keeps every existing order;
that slot simply stops being offered. Setting `null` removes the limit. The
limit sits in Café profile's pickup rules area.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Its own approved café's slot limit inside its verified workspace, including during suspension.
- **What it can never do:** Limit another café, cancel existing orders by lowering the limit, approve its café or clear suspension.

## Requirements

### `OWN-12`: Cap orders in each pickup slot

- **User story:** As a café owner, I want to limit how many orders can share one pickup slot, so that I am not overwhelmed at busy times.
- **Priority:** Low
- **Risk:** Medium — an unserialized count could overbook a slot, and a wrong count could hide free slots.

#### Acceptance criteria

- **`OWN-12.1`:** Given the owner of an approved café, when it saves a limit from 1 through 50 or `null`, then the value belongs only to its café, later owner reads return it, and later Customer slot reads and order validation use it.
- **`OWN-12.2`:** Given a limit of 0 or 51, a fractional number, a numeric string or a missing key, when the owner saves it, then `400 INVALID_REQUEST` is returned and nothing changes.
- **`OWN-12.3`:** Given a limit of 2 and a slot holding orders in pending and accepted states, when Customer pickup slots are read, then that slot is omitted while other permitted slots are still offered.
- **`OWN-12.4`:** Given a full slot, when a Customer submits an order for it, then `409 STATE_CONFLICT` with "This pickup time is full. Choose another time." is returned and nothing is stored; given concurrent submissions for a slot's last place, exactly one order is created.
- **`OWN-12.5`:** Given a full slot, when one of its orders becomes rejected, cancelled or no-show, then the slot is offered again; collected orders keep counting.
- **`OWN-12.6`:** Given existing orders exceeding a newly lowered limit, when the limit is saved, then every existing order is unchanged and the slot is not offered; saving `null` restores slots subject to hours, closures, cutoff and pause.
- **`OWN-12.7`:** Given a pending or rejected café, or an `expectedSuspensionVersion` that no longer matches, when the owner saves a limit, then `409 STATE_CONFLICT` is returned with nothing changed; saving during suspension succeeds without restoring Customer visibility.
- **`OWN-12.8`:** Given no session, a wrong role, or a missing or foreign café, when the limit operation is requested, then `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies without disclosure or change; main and kit owners stay inside their own workspace under server checks and RLS.

#### Edge cases and failure paths

A submission-key replay of an existing order returns it even when its slot is
now full. Slot counts never include another café's orders. Transaction
failure returns `500 INTERNAL_ERROR` with no partial change.

#### Out of scope

Item-based capacity, different limits per weekday or time, waitlists and
reserving places for the owner.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Café profile, pickup rules area | Current per-slot limit or "No limit" | Save a limit; remove the limit | OWN-12 |
| Customer pre-order | Only slots below the limit | Choose a slot | OWN-12 |

## Use cases

### `UC-OWN-12-1`: Cap the morning rush

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own approved café taking pre-orders.
- **Main success scenario:**
  1. Owner sets the limit to 3 orders per slot on Café profile.
  2. The system saves the limit for the owner's café.
  3. A slot with three active orders disappears from Customer choices.
  4. A cancellation in that slot makes it available again.
- **Extensions:** Step 2: an invalid value is refused. Step 3: two Customers racing for the last place get one order and one conflict.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Set or remove the per-slot limit | Own approved café in verified workspace | Denied |
| Cancel orders by lowering the limit | Denied | Denied |

## Out of scope

Payment, waitlists and new navigation.

## Assumptions

None.
