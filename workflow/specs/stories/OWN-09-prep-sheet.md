# OWN-09: Print today's prep sheet

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [order queue](OWN-05-order-queue.md), [owner stretch boundary](../INTEGRATION-SPEC.md#owner-stretch-operations-boundary), [order snapshots and states](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [Singapore business time](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [role navigation](SYS-03-role-navigation.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-09; Medium priority, Stretch.
- **Requirement ownership:** This file owns the read-only prep sheet. OWN-05 owns order states and queue actions; OWN-07's AI Prep Advisor is a separate, unrelated feature.

## Overview

On a busy day, an owner needs one list of what to make for today's pickups.
The prep sheet totals the items in today's accepted orders and lists those
orders by pickup time, in a layout that prints cleanly. It is deterministic,
uses no AI and changes no records.

## Sheet contents

The sheet covers the current Singapore business date. It includes only own-café
orders in the `accepted` state whose `pickupAt`, converted to Singapore time,
falls on that date. Pending orders are not yet committed, and ready orders are
already prepared, so neither is included.

- **Item totals:** order lines grouped by retained item reference, each with the
  summed quantity and the number of included orders containing it. The name
  shown is the item-name snapshot from the most recently placed included order.
  Sort by quantity descending, then name ascending by Unicode code point, then
  item reference ascending.
- **Orders:** each included order with its Singapore pickup time (`HH:mm`), the
  retained customer name and its item names and quantities. Sort by pickup
  instant, placement instant, then order reference, all ascending.
- **Pending notice:** when own-café `pending` orders also have pickup today, the
  sheet states "N new orders for today are not included until accepted."
- **Header:** the business date and the server time the sheet was generated.

Prices, totals, emails, phone numbers and customer references never appear.
`/owner/orders/prep-sheet` is reached from a Prep sheet link on Order queue; no
navigation entry is added. A Print action opens the browser print dialog. The
print layout hides navigation and actions and keeps the header, item totals
and orders. Reloading the page refreshes the sheet.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Reads its own café's accepted orders for today inside its verified workspace; changes nothing.
- **What it can never do:** Read another café's or workspace's orders, change any order or menu record, or see customer contact details.

## Requirements

### `OWN-09`: Prepare from today's accepted orders

- **User story:** As a café owner, I want a printable prep sheet totalling the items in today's accepted orders, so that I can prepare drinks for today's pickups.
- **Priority:** Medium
- **Risk:** Medium — wrong date boundaries or scope could omit orders or disclose another café's purchases.

#### Acceptance criteria

- **`OWN-09.1`:** Given own-café orders in every state with pickups today and on other dates, when the owner opens the prep sheet, then only `accepted` orders whose Singapore pickup date is today are included, and item totals group by retained item reference with summed quantity and order count in the sort order above.
- **`OWN-09.2`:** Given included orders, when the order list renders, then each shows its Singapore `HH:mm` pickup time, retained customer name and item names with quantities, sorted by pickup instant, placement instant and order reference, and no price, total, email, phone or customer reference appears.
- **`OWN-09.3`:** Given own-café `pending` orders with pickup today, when the sheet renders, then they are excluded from totals and the list and the notice states how many are waiting for acceptance.
- **`OWN-09.4`:** Given accepted orders at 23:45 today and 00:00 tomorrow in Singapore time, when the sheet is built, then the first is included and the second excluded regardless of browser or host timezone.
- **`OWN-09.5`:** Given the owner opens or prints the sheet, when it renders, then no order, menu or café record changes and the print layout shows the business date, generation time, item totals and orders without navigation or actions.
- **`OWN-09.6`:** Given no accepted orders for today, no café, or an unavailable order source, when the sheet is requested, then it shows "No accepted orders for today.", the no-café empty state with an Apply for a café link, or the shared `503 SOURCE_UNAVAILABLE` failure respectively, never an empty sheet for a source failure.
- **`OWN-09.7`:** Given no session, a wrong role, or main and kit owners, when the prep-sheet JSON read is requested, then `401 UNAUTHENTICATED` or `403 FORBIDDEN` apply without disclosure, and each owner sees only its own café inside its own workspace under server checks and RLS.

#### Edge cases and failure paths

An order accepted after the sheet loads appears on reload, not live. Orders
whose pickup belongs to an overnight interval but falls after midnight belong
to the next date. Items renamed or removed after ordering keep their retained
snapshot names. Shared private/no-store and safe-error conventions apply.

#### Out of scope

Live updates, per-slot batching, ingredient or recipe breakdowns, prices, and
marking orders ready from the sheet.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/orders/prep-sheet` | Business date, generation time, item totals, today's accepted orders, pending notice, empty/no-café/source-failure states | Print; reload; return to Order queue | OWN-09 |
| `/owner/orders` | Prep sheet link | Open the prep sheet | OWN-09 |

## Use cases

### `UC-OWN-09-1`: Print the morning prep sheet

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own approved café with accepted orders for today.
- **Main success scenario:**
  1. Owner opens Order queue and selects Prep sheet.
  2. The system authorizes the owner and reads today's accepted own-café orders.
  3. The sheet shows item totals and orders by pickup time.
  4. Owner selects Print and prints the sheet.
- **Extensions:** Step 2: an unavailable source shows a safe failure. Step 3: no accepted orders shows the empty message; pending orders appear only in the notice.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read today's prep sheet | Own café's accepted orders in verified workspace | Denied |
| Change orders or menu from the sheet | Denied | Denied |

## Out of scope

AI generation, inventory, new navigation and any order mutation.

## Assumptions

None.
