# OWN-03: Manage menu items and availability

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [roles](../PRODUCT-SPEC.md#roles-and-access), [data ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [menu/money vocabulary](../INTEGRATION-SPEC.md#customer-catalogue-and-detail-boundary), [order snapshots](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [Customer café page](CUS-02-cafe-page.md), [Customer pre-order](CUS-03-pre-order.md), [suspension](ADM-02-cafe-suspension.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-03; High priority, MVP.
- **Requirement ownership:** This file owns OWN-03's menu management. Customer menu presentation and order creation belong to CUS-02/CUS-03; OWN-06 owns sales calculations.

## Overview

Owners maintain menu offerings, their prices and sold-out state for their own
café. Sold-out items remain visible to eligible Customers but cannot be newly
ordered. Menu changes preserve existing purchases and do not approve or
un-suspend a café. SGD money and drink-type vocabulary use the shared contract.

## Item lifecycle and owner menu

Owners can add, edit and permanently remove their own café's items once its
café application is approved, including while that approved café is suspended.
While the café application is pending or rejected, every menu mutation is
refused with no write; menu reads are unaffected. Editable
fields are name, drink type, integer price cents and sold-out state; new items
default to available when soldOut is omitted. Stored names are trimmed and
2–100 Unicode code points. Item names within one café are
unique after removing all ECMAScript whitespace and applying Unicode lowercase
comparison. Description/type/price do not participate in duplicate detection.
Renaming preserves item identity and must satisfy the same uniqueness check.

Removal deletes the current menu row and immediately excludes it from later
customer menus, drink filters and AI candidates. It never deletes or rewrites
historical order lines: original item references and purchase snapshots survive
as immutable values without requiring a live menu row. Creating a same-named
item after removal produces a new identity; restoration is not supported.

`/owner/menu` orders items alphabetically by name, comparing Unicode code
points, then item reference ascending; pages contain 20 items. No-café entry
shows an empty state with an Apply for a café CTA. Read failures remain source
failures rather than empty menus. Ordinary concurrent mutations use the last
committed valid outcome. An update racing a deletion cannot recreate the deleted
item; missing items give 404, and duplicate-name races admit one valid winner.
Each mutation is atomic and preserves current owner/workspace authorization.
The shared expectedSuspensionVersion guard rejects a mutation overtaken by
suspension/un-suspension, shows current status on /owner/application and permits
a later explicit edit under the new version even while suspended.

### Known limitations

Drink archiving and restoration are outside MVP scope and may be considered
as later enhancements. No inventory, automatic stock or purchase-history
rewriting is introduced.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Menu items attached to its own café inside its verified workspace. Menu mutations require an approved café application, including owner management during suspension under ADM-02; a pending or rejected café's menu cannot be changed.
- **What it can never do:** Change the menu of a pending or rejected café, manage another café's menu, move items across cafés/workspaces, change Admin-controlled café eligibility, or rewrite historical order amounts/items.

## Requirements

### `OWN-03`: Maintain items, prices and sold-out state

- **User story:** As a café owner, I want to manage menu items, prices and a sold-out toggle, so that my menu reflects what I sell and its availability.
- **Priority:** High
- **Risk:** High — cross-café writes, incorrect money or availability changes can corrupt purchases or expose another owner's data.

#### Acceptance criteria

- **`OWN-03.1`:** Given an owner opens Menu for its café, when source reads succeed, then it sees only its own café's items with names, drink types, SGD prices and sold-out state, including items currently sold out.
- **`OWN-03.2`:** Given the owner saves a menu-item change, when saving succeeds, then add/edit/remove, duplicate-name checks and last-committed valid outcome follow the item lifecycle above, later own-menu reads return the saved item data and eligible Customer reads use the current menu projection; no item of another café changes.
- **`OWN-03.3`:** Given a menu price is saved, when it is persisted or returned as JSON, then it uses integer SGD cents between 1 and 1,000,000 inclusive under the shared money contract; displayed amounts use `S$` with exactly two decimal places and do not use floating-point dollar arithmetic for totals.
- **`OWN-03.4`:** Given an owner changes an item's drink type, when the save succeeds, then its value is one of the shared `DrinkType` enum values; an unknown type or a fractional/out-of-range stored-cent price is not persisted.
- **`OWN-03.5`:** Given an available own-menu item, when its owner successfully toggles sold out on, then subsequent eligible café-page reads still include it with sold-out state and CUS-03 refuses new orders containing it; toggling sold out off restores availability only subject to current café and order eligibility.
- **`OWN-03.6`:** Given orders already containing an item, when the owner later changes its name, price or sold-out state, then retained item-name/unit-price/quantity/line-total/order-total snapshots remain unchanged; a new order uses current menu validation and prices under CUS-03.
- **`OWN-03.7`:** Given a suspended café, when its owner manages the menu, then management remains available while Customer visibility stays blocked under ADM-02; no menu save approves the café or clears suspension.
- **`OWN-03.8`:** Given no session, a wrong role, or a missing/foreign café/item, when an owner menu JSON operation is requested, then the shared `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies respectively without protected disclosure or mutation; a forged item-parent relation is denied by server checks and RLS; a mutation by an owner whose café is pending or rejected is decided by OWN-03.9 instead of an item 404.
- **`OWN-03.9`:** Given an owner whose own café application is `pending` or `rejected`, when it requests a schema-valid menu create, save or remove, then the response is `409 STATE_CONFLICT` under the shared error shape with “Menu changes are available once your café is approved.”, whatever item reference is supplied, and nothing is written: no item is created, changed or removed; the Menu page shows that message and preserves the owner's unsaved input; the same request for an approved café, suspended or not, proceeds under OWN-03.2 and OWN-03.7, and owner menu reads are unchanged.

#### Edge cases and failure paths

An empty menu is not a source failure. All-sold-out menus remain visible to
eligible Customers without providing an orderable item. Price changes between
Customer confirmation and submission follow CUS-03's total-conflict rules;
menu management cannot bypass them. Main/kit menu access uses the same verified
workspace/ownership checks. Shared JSON errors are safe and private.

#### Out of scope

Automatic inventory, recipe/stock tracking, Customer orders, sales aggregation,
AI-applied menu changes and changing existing purchase snapshots.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Menu | Own items, names/types/prices, sold-out states; empty menu, validation and source-failure states | Add/edit/remove own items; toggle sold out; page alphabetically | OWN-03 |

## Use cases

### `UC-OWN-03-1`: Mark an item sold out

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own approved café, suspended or not, and available item in the verified workspace.
- **Main success scenario:**
  1. Owner opens Menu and selects its item.
  2. Owner turns the sold-out toggle on.
  3. The system checks current ownership and saves the item's sold-out state.
  4. Subsequent eligible Customer reads show the item as sold out; new orders cannot include it.
- **Extensions:** Step 3: foreign parent/item references are denied without changes. Step 4: existing purchases retain their original snapshots; a suspended café remains hidden irrespective of toggle state.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read menu data | Items of own café within workspace, in any application state | Denied, including a forged parent reference |
| Create, edit or remove items, prices or sold-out state | Items of own approved café within workspace, including while suspended; denied with no write while pending or rejected | Denied, including a forged parent reference |
| Change an existing purchase through menu editing | Denied | Denied |
| Approve café or clear suspension | Denied | Denied |
| Let AI apply a menu change | Denied | Denied |

## Out of scope

Additional payment, inventory or Admin menu-write features. Navigation belongs
to SYS-03; accessible/responsive core behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.

Retired IDs: ASM-01.
