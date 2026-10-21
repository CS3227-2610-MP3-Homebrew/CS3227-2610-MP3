# OWN-06: View café sales

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [roles](../PRODUCT-SPEC.md#roles-and-access), [data ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [Singapore business time](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [historical order snapshots](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [contract ownership](../INTEGRATION-SPEC.md#contract-dependencies), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [role navigation](SYS-03-role-navigation.md), [Prep Advisor](OWN-07-prep-advisor.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-06; Medium priority, MVP.
- **Requirement ownership:** This file owns OWN-06's daily totals, top items and weekday sales. OWN-07 consumes café aggregates and uses the ordinary top-items table as its fallback; it does not own a competing sales calculation.

## Overview

The owner Dashboard brings daily totals, top items and sales by day of week
together so owners can understand sales. Every result is restricted to the
owner's café/workspace and uses Singapore business time. The ordinary top-items
table remains useful when AI is disabled, limited or unavailable; viewing
sales does not require a provider call or create a payment system.

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

#### Edge cases and failure paths

No-café, no sales and unavailable source are distinct conditions. A source
failure is not converted to zero totals or an invented top item. Retained
purchase snapshots remain independent of subsequent menu changes. Main and
kit views use the same business-time and ownership boundaries. JSON endpoints
follow shared private/no-store and safe-source-error conventions.

#### Out of scope

Payment processing, profit/cost accounting, forecasts, cross-café comparisons,
purchase-history editing and AI generation (OWN-07).

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

Exports, new analytics screens, provider-dependent arithmetic or automatic
business changes. Core accessible/responsive behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.

Retired IDs: ASM-01.
