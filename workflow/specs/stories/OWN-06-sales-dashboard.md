# OWN-06: View café sales

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [roles](../PRODUCT-SPEC.md#roles-and-access), [data ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [Singapore business time](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [historical order snapshots](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [owner sales read boundary](../INTEGRATION-SPEC.md#owner-sales-boundary), [contract ownership](../INTEGRATION-SPEC.md#contract-dependencies), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [role navigation](SYS-03-role-navigation.md), [Prep Advisor](OWN-07-prep-advisor.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-06; Medium priority, MVP.
- **Requirement ownership:** This file owns OWN-06's daily totals, top items and weekday sales. OWN-07 consumes café aggregates and uses the ordinary top-items table as its fallback; it does not own a competing sales calculation.

## Overview

The owner Dashboard brings daily totals, top items and sales by day of week
together so owners can understand sales. Every result is restricted to the
owner's café/workspace and uses Singapore business time. The ordinary top-items
table remains useful when AI is disabled, limited or unavailable; viewing
sales does not require a provider call or create a payment system.

## Sales source and views

A sale is an own-café order in the `collected` state. Customers pay at pickup,
so collection is the only event that represents a completed sale; pending,
accepted, ready, rejected and cancelled orders never count, and neither do
no-show orders under [OWN-14](OWN-14-no-show.md). A sale's business date is the
Singapore date of its `collectedAt` instant. Amounts and quantities come only
from the order's retained `totalCents` and line snapshots (item reference,
item name, quantity and line total), never from current menu prices.

The Dashboard period is the 28 Singapore business dates ending with today's
business date inclusive: `from` is today minus 27 days and `through` is today.
Today's partial sales are included. Every view below uses this one period.

- **Daily totals:** exactly 28 rows, one per business date in the period,
  newest date first. Each row shows the number of collected orders and the
  sum of their `totalCents`. Dates without sales show 0 orders and S$0.00.
- **Top items:** collected order lines grouped by retained item reference.
  Each row shows quantity sold (sum of line quantities) and revenue (sum of
  line totals). Rank by quantity descending, then revenue descending, then
  item reference ascending by Unicode code point. Show at most the first 10
  rows with their 1-based rank. The displayed name is the item-name snapshot
  of that item's most recent collected line in the period (latest
  `collectedAt`, then greatest order reference). Removed or archived items
  remain in history; renamed items keep one row under their retained reference.
- **Sales by day of week:** exactly seven rows, Monday through Sunday, each
  with collected order count, item quantity and revenue for that weekday's
  four dates in the period. Weekdays without sales show zeros.

When the period contains no collected orders, the Dashboard shows "No
completed sales in the last 28 days." in place of the three views. The read
still returns zero-filled daily and weekday rows and an empty top-items list;
this is distinct from no café and from an unavailable source.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses the demo-kit owner account.
- **What it can see and change:** Read-only sales views for its own café inside its verified workspace. Prep advice is a separate OWN-07 operation.
- **What it can never do:** Read another café/workspace's sales, use Admin status as sales authority, edit purchase history through a report or infer payment settlement from an in-app online payment record.

## Requirements

### `OWN-06`: Show daily, item and weekday sales views

- **User story:** As a café owner, I want a sales dashboard with daily totals, top items and sales by day of week, so that I can understand my café's sales.
- **Priority:** Medium
- **Risk:** High — private commercial aggregates and inconsistent purchase/time calculations could mislead owners and contaminate Prep Advisor evidence.

#### Acceptance criteria

- **`OWN-06.1`:** Given an owner with a café opens `/owner/dashboard`, when its authorized sales source is available, then the Dashboard contains daily totals, a top-items table and sales by day of week for that café only; reading these views does not modify any order, menu or café record.
- **`OWN-06.2`:** Given a displayed business date or weekday derived from an instant, when sales are grouped for display, then the instant is converted to `Asia/Singapore` first; weekdays use the shared Monday-through-Sunday meaning irrespective of browser/host timezone.
- **`OWN-06.3`:** Given a displayed monetary sales amount, when it is rendered, then arithmetic uses retained SGD-cent amounts and the shared `S$` two-decimal money representation; current menu prices do not rewrite the historical purchase amounts used by the sales source.
- **`OWN-06.4`:** Given AI is disabled, its quota exhausted or the provider unavailable, when the owner opens the sales Dashboard, then daily totals, top items and weekday sales remain available from authorized domain data without requiring AI success; OWN-07's fallback displays this ordinary top-items table.
- **`OWN-06.5`:** Given an owner without a café opens the Dashboard, when the no-café state is resolved, then SYS-03.5's application link appears instead of fabricated sales; a source outage is a safe source-failure state rather than a false zero-sales result.
- **`OWN-06.6`:** Given no session, a wrong role, or a missing/foreign café, when an owner sales JSON read is requested, then shared `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies respectively without protected sales or fallback disclosure; source reads remain under owner/workspace authorization and RLS.
- **`OWN-06.7`:** Given main and kit owners, when each reads sales, then each view includes only its own café inside its verified workspace, never showcase/other-kit/other-owner aggregates; caller-supplied café/workspace references cannot expand scope.
- **`OWN-06.8`:** Given own-café orders in every state, when sales are aggregated, then only `collected` orders count, each dated by the Singapore business date of its `collectedAt`; an order placed or picked up on one date but collected on the next counts on the collection date.
- **`OWN-06.9`:** Given the current Singapore business date, when daily totals are read, then exactly 28 rows from today minus 27 days through today appear newest first, each with collected order count and summed retained `totalCents`, and dates without sales show 0 orders and S$0.00.
- **`OWN-06.10`:** Given collected lines in the period, when top items are read, then rows group by retained item reference, rank by quantity descending, revenue descending, then item reference ascending, show at most 10 rows with 1-based ranks, and display the most recent collected line's item-name snapshot, including renamed, removed and archived items.
- **`OWN-06.11`:** Given collected orders in the period, when sales by day of week are read, then exactly seven Monday-through-Sunday rows show order count, item quantity and revenue with zeros for weekdays without sales; with no collected orders in the period, the Dashboard shows the no-sales message instead of the three views.

#### Edge cases and failure paths

No-café, no sales and unavailable source are distinct conditions. A source
failure is not converted to zero totals or an invented top item. Retained
purchase snapshots remain independent of subsequent menu changes. Main and
kit views use the same business-time and ownership boundaries. JSON endpoints
follow shared private/no-store and safe-source-error conventions.

#### Out of scope

Payment processing, profit/cost accounting, forecasts, cross-café comparisons,
purchase-history editing, owner-chosen periods (CSV export is
[OWN-15](OWN-15-sales-export.md)) and AI generation (OWN-07).

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/dashboard`, sales area | Daily totals, top-items table, weekday sales; distinct no-café/no-sales/source-failure conditions; Prep panel belongs to OWN-07 | Read own sales | OWN-06 |

## Use cases

### `UC-OWN-06-1`: Understand the café's sales

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own café and authorized sales source available.
- **Main success scenario:**
  1. Owner opens Dashboard.
  2. The system checks café ownership/workspace and obtains sales data.
  3. Owner reads daily totals, top items and weekday sales in Singapore business time.
  4. Owner uses the information for its own business decisions; no records change.
- **Extensions:** Step 1: no café follows SYS-03.5. Step 2: foreign scope is denied; unavailable data produces a safe source failure. Step 3: disabled/unavailable AI does not remove the ordinary sales views.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read sales aggregates | Own café in verified workspace | Denied for unrelated cafés/workspaces, including unrelated Admins |
| View top-items fallback | Same authorized café sales scope | Denied outside scope |
| Change source purchases, menu or café through report | Denied | Denied |

## Out of scope

Exports (owned by [OWN-15](OWN-15-sales-export.md)), new analytics screens,
custom periods, provider-dependent arithmetic or automatic business changes. Core accessible/responsive behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.

Retired IDs: ASM-01.
