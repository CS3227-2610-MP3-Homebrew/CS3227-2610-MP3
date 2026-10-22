# OWN-13: Archive and restore menu items

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [owner stretch boundary](../INTEGRATION-SPEC.md#owner-stretch-operations-boundary), [owner menu boundary](../INTEGRATION-SPEC.md#owner-menu-boundary), [menu management](OWN-03-menu-management.md), [catalogue](CUS-01-browse-cafes.md), [café page](CUS-02-cafe-page.md), [pre-order](CUS-03-pre-order.md), [Brew Finder](CUS-06-brew-finder.md), [Prep Advisor](OWN-07-prep-advisor.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-13; Low priority, Stretch.
- **Requirement ownership:** This file owns the archive and restore operations. OWN-03 still owns adding, editing, sold-out state and permanent removal; OWN-03 lists archiving as a later enhancement, which this story provides.

## Overview

Seasonal drinks come and go. Permanently removing an item loses its setup,
while marking it sold out still shows it to Customers. Archiving hides an item
from Customers but keeps it on the owner's Menu, ready to restore with the same
name, type, price and sold-out state.

## Archive rules

Each menu item has an `archived` flag, `false` by default. Archive changes it
to `true` and restore to `false`; archiving an archived item or restoring an
active one returns `409 STATE_CONFLICT`. Both keep the item's identity, name,
drink type, price and sold-out state.

An archived item is absent from everything Customers and AI read: café-page
menus, drink-type filters, Brew Finder candidates and Prep Advisor candidates.
A new order naming it returns the same `404 NOT_FOUND` as a missing item.
Existing orders and their snapshots are unchanged, and Dashboard sales history
still includes the item.

The owner's Menu lists archived items in the existing name/reference order with
an "Archived" label and Restore action. Archived items can still be edited or
permanently removed under OWN-03. Name uniqueness keeps including archived
items, so restoring never creates a duplicate. Archive and restore use the
shared `expectedSuspensionVersion` guard and remain available during suspension.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Its own café's menu items, archived or not, inside its verified workspace, including during suspension.
- **What it can never do:** Archive another café's items, rewrite historical order lines, approve its café or clear suspension.

## Requirements

### `OWN-13`: Hide and bring back menu items

- **User story:** As a café owner, I want to archive and restore menu items, so that I can hide seasonal drinks without deleting them.
- **Priority:** Low
- **Risk:** Medium — an archived item leaking into Customer or AI reads, or being ordered, would sell something the owner withdrew.

#### Acceptance criteria

- **`OWN-13.1`:** Given an active own-menu item, when the owner archives it, then later Customer café-page menus, drink-type filter options, Brew Finder candidates and Prep Advisor candidates exclude it.
- **`OWN-13.2`:** Given an archived item, when a Customer submits an order containing it, then the same `404 NOT_FOUND` as a missing item is returned and no order is stored.
- **`OWN-13.3`:** Given an archived item, when the owner restores it, then it returns to Customer reads with the same identity, name, drink type, price and sold-out state it had when archived.
- **`OWN-13.4`:** Given the owner opens Menu, when archived items exist, then they appear in the usual order with an "Archived" label and Restore action, can still be edited or permanently removed, and a new item cannot reuse an archived item's name.
- **`OWN-13.5`:** Given orders or sales history containing an item, when it is archived or restored, then order snapshots are unchanged and the Dashboard still counts its past collected sales.
- **`OWN-13.6`:** Given an already-archived item to archive, an active item to restore, or an `expectedSuspensionVersion` that no longer matches, when the owner sends the operation, then `409 STATE_CONFLICT` is returned with nothing changed; during suspension the operations succeed without restoring Customer visibility.
- **`OWN-13.7`:** Given no session, a wrong role, or a missing or foreign café or item, when archive or restore is requested, then `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies without disclosure or change; main and kit owners stay inside their own workspace under server checks and RLS.

#### Edge cases and failure paths

A Customer holding an earlier menu view gets the missing-item failure, not a
partial order. A permanently removed item cannot be restored. Transaction
failure returns `500 INTERNAL_ERROR` with no partial change.

#### Out of scope

Scheduled archiving, bulk archive, restoring permanently removed items and
showing archived items to Customers as "coming back".

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/menu` | Active and archived items; "Archived" label | Archive; Restore; existing edit and remove | OWN-13 |

## Use cases

### `UC-OWN-13-1`: Retire a seasonal drink

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own café with an active seasonal item.
- **Main success scenario:**
  1. Owner selects Archive on the item in Menu.
  2. The system archives it; Customers no longer see or order it.
  3. Next season, the owner selects Restore.
  4. The item returns to Customers unchanged.
- **Extensions:** Step 2: a suspension-version change returns a conflict and shows current status.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Archive or restore an item | Own café's items in verified workspace | Denied |
| Change historical order lines | Denied | Denied |

## Out of scope

Inventory, automatic archiving and new navigation.

## Assumptions

None.
