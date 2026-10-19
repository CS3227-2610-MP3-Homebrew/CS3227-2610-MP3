# CUS-04: View and cancel own orders

- **Related specs:** [Customer source stories](../PRODUCT-SPEC.md#customer), [order ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [RLS](../TECHNICAL-SPEC.md#rls-and-database-exposure), [workspace isolation](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [suspension and existing orders](ADM-02-cafe-suspension.md#acceptance-criteria), [pre-order](CUS-03-pre-order.md), [collected-order review](CUS-05-review-order.md), [accessible responsive flows](../TECHNICAL-SPEC.md#accessibility-and-responsive-behavior).
- **Role:** Customer
- **Source:** [PRODUCT-SPEC.md, User stories → Customer](../PRODUCT-SPEC.md#customer), CUS-04; MVP.
- **Requirement ownership:** This file owns CUS-04 and its criteria. Order creation belongs to CUS-03, owner fulfilment to OWN-05 and review submission to CUS-05.

## Overview

Customers manage pickup plans by viewing their own orders and cancelling before
the café accepts an order. Reading or cancelling requires both customer
ownership and workspace scope. Suspending a café automatically cancels its
outstanding orders that have not yet been collected, including accepted and
ready orders. My orders retains these orders and shows the cancellation reason
“Cafe is suspended”. Already collected orders remain unchanged.

## Access

- **How a user gets the role:** Chooses Customer at sign-up or signs in with a demo-kit Customer account.
- **What it can see and change:** Reads its own orders and associated order items within its workspace; cancels an eligible own order before café acceptance.
- **What it can never do:** Read/cancel another customer's orders, cross workspaces, accept/reject/ready/collect an order as its owner, or use cancellation to modify café data.

## Requirements

### `CUS-04`: View own orders and cancel before acceptance

- **User story:** As a customer, I want to view my orders and cancel an order before the café accepts it, so that I can manage my pickup plans.
- **Priority:** High
- **Risk:** High — ownership failures disclose purchases, unauthorized customer cancellation breaks fulfilment commitments, and suspension must cancel every outstanding uncollected order without altering collected purchases.

#### Acceptance criteria

- **`CUS-04.1`:** Given a signed-in Customer with orders, when My orders is opened, then it returns only orders belonging to that Customer in its workspace and their associated order items, without another customer's orders.
- **`CUS-04.2`:** Given a newly placed own order that the café has not accepted and that has not otherwise ended, when the Customer cancels it, then the order is cancelled and a subsequent own-order read reflects cancellation.
- **`CUS-04.3`:** Given an order the café has already accepted, when the Customer attempts cancellation, then it does not cancel or otherwise change the order; an application-owned JSON mutation uses the shared `409 STATE_CONFLICT` boundary.
- **`CUS-04.4`:** Given another customer's order, an order in another workspace or a missing order reference, when a Customer attempts to read or cancel it through a JSON endpoint, then the same shared `404 NOT_FOUND` boundary applies without protected order disclosure or mutation.
- **`CUS-04.5`:** Given outstanding own orders for a café that have not yet been collected, including unaccepted, accepted and ready orders, when that café is successfully suspended under ADM-02, then those orders are automatically cancelled without requiring a customer action, remain available through My orders, and display the cancellation reason “Cafe is suspended”; already collected orders remain unchanged, and later un-suspension does not restore the cancelled orders.
- **`CUS-04.6`:** Given a kit Customer, when it reads or cancels its kit orders, then the same ownership and cancellation rules apply and no main-workspace or other-kit order is accessible.
- **`CUS-04.7`:** Given no valid session or a wrong-role caller, when protected order reads or customer cancellation are requested, then server role checks supply no protected data or mutation; JSON endpoints return `401 UNAUTHENTICATED` or `403 FORBIDDEN`, respectively, under the shared contract.
- **`CUS-04.8`:** Given a cancellation request violating shared origin, method, JSON or media-type rules, when it is checked, then the shared error response applies without changing the order; a hidden/disabled button does not replace server enforcement.

#### Edge cases and failure paths

A Customer with no orders receives an empty own-order collection. Failure to
read the authorized source is a safe source failure, not proof that the
Customer has no orders. All reads and cancellation attempts repeat server
ownership checks and RLS. Viewing orders neither marks them collected nor
creates a review.

The suspension cancellation is a system consequence of an authorized Admin
suspension, not a new Customer permission to cancel an accepted/ready order.
The displayed cancellation reason is fixed application text. It does not
disclose the Admin's private free-text suspension reason.

#### Out of scope

Creating orders is CUS-03; reviewing a collected order is CUS-05. Owner queue
actions remain OWN-05. This story adds no order editing, refund or payment flow.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| My orders | Customer's own orders, their current fulfilment state and associated order items; suspension-cancelled orders show “Cafe is suspended” | View orders and cancellation reason; cancel before café acceptance | CUS-04 |

## Use cases

### `UC-CUS-04-1`: Cancel an unaccepted order

- **Actor:** Signed-in Customer who owns the order.
- **Preconditions:** Order is in the same workspace, has not been accepted and has not otherwise ended.
- **Main success scenario:**
  1. Customer opens My orders.
  2. The system returns the Customer's own orders.
  3. Customer cancels an eligible order.
  4. The system checks ownership and current cancellation eligibility, then changes that order to cancelled.
  5. My orders reflects the cancellation.
- **Extensions:** At step 2, no orders returns an empty collection; an order cancelled by café suspension remains listed with “Cafe is suspended”. At step 4, a Customer cannot cancel an already accepted order; a missing or out-of-scope reference receives the shared record-scope failure with no mutation. Successful café suspension instead cancels outstanding uncollected orders automatically under CUS-04.5.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read orders and order items | Own orders in own workspace | Denied, including another Customer in the same workspace |
| Cancel order | Eligible own order before café acceptance | Denied |
| Read suspension cancellation reason | Fixed “Cafe is suspended” reason for own automatically cancelled order | Another customer's order and the Admin's private suspension reason remain denied |
| Perform café fulfilment actions | Denied | Denied |

## Out of scope

No additional order states, historical retention policy or owner queue
permission is introduced. The fixed order cancellation reason is distinct from
the private administrative suspension reason under ADM-02.

## Assumptions

None. Retired IDs: ASM-01.
