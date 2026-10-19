# CUS-03: Pre-order for pickup

- **Related specs:** [Customer source stories](../PRODUCT-SPEC.md#customer), [product pickup use case](../PRODUCT-SPEC.md#top-level-use-cases), [order ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [RLS](../TECHNICAL-SPEC.md#rls-and-database-exposure), [workspace isolation](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [Singapore time](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [suspension effects](ADM-02-cafe-suspension.md#acceptance-criteria), [café page](CUS-02-cafe-page.md), [own orders](CUS-04-my-orders.md), [accessible responsive flows](../TECHNICAL-SPEC.md#accessibility-and-responsive-behavior).
- **Role:** Customer
- **Source:** [PRODUCT-SPEC.md, User stories → Customer](../PRODUCT-SPEC.md#customer), CUS-03; MVP.
- **Requirement ownership:** This file owns CUS-03 and its criteria. Owner pickup-rule editing belongs to OWN-04, owner fulfilment actions to OWN-05, and customer viewing/cancellation to CUS-04.

## Overview

Customers choose drinks from one eligible café and place a pre-order for pickup
inside its opening hours and pickup rules. Payment happens at pickup; Homebrew
does not collect payment. The server must independently enforce the Customer's
identity, café eligibility and pickup constraints when creating an order.

## Access

- **How a user gets the role:** Chooses Customer at sign-up or signs in with the Customer credentials from a demo kit.
- **What it can see and change:** Creates its own order for an eligible café in its own workspace. Menu and hours reads follow CUS-02 and SYS-05.
- **What it can never do:** Create an order for another customer or workspace, attach items from another café or another customer's order, bypass pickup rules, accept/fulfil an order or change café eligibility.

## Requirements

### `CUS-03`: Place a pickup pre-order with payment at pickup

- **User story:** As a customer, I want to pre-order with a pickup slot inside opening hours and the café's pickup rules and pay at pickup, so that I can arrange to collect my drinks.
- **Priority:** High
- **Risk:** High — unauthorized orders or invalid pickup times create incorrect commitments for customers and owners.

#### Acceptance criteria

- **`CUS-03.1`:** Given a signed-in Customer, an eligible café and a valid selection of that café's drinks and pickup slot, when the Customer places a pre-order, then an order is created for that Customer and café in the same workspace and can be read through CUS-04.
- **`CUS-03.2`:** Given the café's opening hours and pickup rules, when pickup options are offered and an order is submitted, then the selected pickup slot must satisfy both constraints using Singapore business time; a slot unambiguously outside opening hours or beyond the café's configured last pickup time cannot create an order.
- **`CUS-03.3`:** Given a café has become suspended or is not approved before order submission, when a Customer attempts to pre-order, then no new order is created even if an earlier café page or Brew Finder suggestion was eligible.
- **`CUS-03.4`:** Given a submission with a café or menu item outside the Customer's workspace, an item belonging to another café, or an attempt to attach an item to another customer's order, when the server checks scope and relational ownership, then the request creates no order or order-item association and discloses no protected foreign record.
- **`CUS-03.5`:** Given an authenticated Customer, when an order is created, then the customer identity is derived from its verified session; a caller-supplied actor or workspace cannot create an order for someone else.
- **`CUS-03.6`:** Given a successful pre-order, when the Customer completes this flow, then payment is due at pickup and no in-app payment, card collection or payment-provider action is required or performed.
- **`CUS-03.7`:** Given no valid session or a Café owner/Admin session, when customer order creation is requested through an application-owned JSON endpoint, then the shared `401 UNAUTHENTICATED` or `403 FORBIDDEN` response applies, respectively, with no created order or order items.
- **`CUS-03.8`:** Given a JSON submission that violates shared method, origin, media-type, body-size or strict-validation rules, when the request is checked, then the shared error response applies and no order or order items are created; browser controls alone do not enforce these checks.

#### Edge cases and failure paths

Pickup validation occurs server-side rather than relying only on displayed
options. Missing or out-of-scope record requests follow the shared
`404 NOT_FOUND` boundary; authorized source failure follows
`503 SOURCE_UNAVAILABLE`. Suspension cancels outstanding uncollected orders
under [CUS-04.5](CUS-04-my-orders.md#acceptance-criteria) and
[ADM-02](ADM-02-cafe-suspension.md#acceptance-criteria); it does not permit new
orders for a suspended café or change already collected orders.

#### Out of scope

Owner acceptance, rejection, readiness and collection are OWN-05. Customer
cancellation is CUS-04. This requirement does not add delivery, online payment
or an AI ordering action.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Pre-order | Selected café/drinks, pickup choices constrained by opening hours and pickup rules, payment-at-pickup information | Choose drinks and pickup slot; place pre-order | CUS-03 |

## Use cases

### `UC-CUS-03-1`: Arrange a pickup

- **Actor:** Signed-in Customer.
- **Preconditions:** Eligible café and valid menu selection; opening hours and pickup rules permit the selected slot.
- **Main success scenario:**
  1. Customer selects drinks from a café and opens Pre-order.
  2. Customer selects a permitted pickup slot.
  3. Customer submits the pre-order.
  4. The system checks current Customer/workspace scope, café eligibility and pickup validity, then creates the Customer's order.
  5. The order is available in CUS-04; payment remains at pickup.
- **Extensions:** At step 4, invalid scope, an ineligible café or an invalid pickup slot creates no order; shared transport/authentication failures return the corresponding safe error. Suspension after creation follows CUS-04.5's automatic cancellation rule for uncollected orders.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Create order/order items | Own Customer session only; items must belong to the selected workspace café | Cannot create for another customer or attach to another customer's order |
| Read catalogue for selection | Own workspace's eligible cafés under CUS-02 | No private owner or other-workspace data |
| Accept/reject/ready/collect orders; change pickup rules | Denied | Denied |

## Out of scope

This story supplies no permission for changing roles, prices, menus or business
hours. Owner pickup-rule configuration remains OWN-04 and fulfilment remains
OWN-05; historical sales treatment belongs to OWN-06.

## Assumptions

None. Retired IDs: ASM-01.
