# CUS-02: View a café page

- **Related specs:** [Customer source stories](../PRODUCT-SPEC.md#customer), [catalogue access](../TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [data ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [workspace isolation](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [Singapore time](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [review visibility](ADM-03-review-moderation.md#overview), [browse](CUS-01-browse-cafes.md), [pre-order](CUS-03-pre-order.md), [review creation](CUS-05-review-order.md), [accessible responsive flows](../TECHNICAL-SPEC.md#accessibility-and-responsive-behavior).
- **Role:** Customer
- **Source:** [PRODUCT-SPEC.md, User stories → Customer](../PRODUCT-SPEC.md#customer), CUS-02; MVP.
- **Requirement ownership:** This file owns CUS-02 and its criteria. Menu/profile/hour management remains OWN-02–OWN-04, review moderation ADM-03, and order submission CUS-03.

## Overview

A customer inspects a café's menu, including sold-out items, opening hours and
visible reviews before deciding what to order and when to visit. The page
inherits catalogue eligibility, workspace scope and Singapore time semantics;
it cannot expose private owner information or hidden reviews.

## Access

- **How a user gets the role:** Chooses Customer at sign-up or signs in with a demo-kit Customer account.
- **What it can see and change:** Reads the customer-visible page of an approved, non-suspended café in its own workspace. Reading changes no business record.
- **What it can never do:** Read ineligible or other-workspace café pages, hidden reviews or private owner/Admin fields; edit a café, menu, hours or another customer's review.

## Requirements

### `CUS-02`: Inspect café menu, hours and visible reviews

- **User story:** As a customer, I want to view a café page with its menu, including sold-out items, opening hours and visible reviews, so that I can decide what to order and when to visit.
- **Priority:** High
- **Risk:** High — stale eligibility or incorrect review filtering exposes restricted information; unclear availability misleads order choices.

#### Acceptance criteria

- **`CUS-02.1`:** Given an eligible café in the signed-in Customer's workspace, when its café page is opened, then it shows that café's menu and prices, opening hours and customer-visible reviews using the authorized café's data.
- **`CUS-02.2`:** Given an eligible café with both sold-out and available menu items, when its page is read, then both appear and sold-out items are identified as sold out; sold-out items are not silently removed from the displayed menu.
- **`CUS-02.3`:** Given opening hours for the café, when the page displays them, then they use the Singapore business-time interpretation from INTEGRATION-SPEC rather than the browser's local timezone.
- **`CUS-02.4`:** Given pending, kept and hidden reviews for an eligible café, when the customer-visible review section is read, then pending and kept reviews are available and hidden reviews are absent, under ADM-03; reviews from another café or workspace are not included.
- **`CUS-02.5`:** Given a review hidden or restored through ADM-03, when a subsequent authorized café-page read occurs, then its visibility reflects that moderation state; hiding or restoring does not rewrite the original rating or review text.
- **`CUS-02.6`:** Given a missing, pending, rejected, suspended or other-workspace café reference, when a Customer attempts a direct café-page read, then no protected café, menu, hours or reviews are disclosed; JSON record reads use the shared indistinguishable `404 NOT_FOUND` scope boundary.
- **`CUS-02.7`:** Given a café seen earlier in browse or AI results, when it becomes ineligible before a later page read, then the page rechecks eligibility and does not use the old result as authorization.
- **`CUS-02.8`:** Given customer-visible café, menu or review text containing HTML, scripts or instructions, when it is displayed, then it remains inert text and does not execute or grant access; review text and rating remain unchanged by reading.
- **`CUS-02.9`:** Given an anonymous or wrong-role page visitor, when protected page content is requested, then SYS-05's authentication and role boundary supplies no protected content, including in the static loading shell.

#### Edge cases and failure paths

A café with no menu items or no visible reviews has an empty corresponding
collection, without fabricated items/reviews. A closed but approved,
non-suspended café remains eligible for page reading: being open is a CUS-01
filter, while pickup validity belongs to CUS-03/OWN-04. Source failure follows
the shared safe failure boundary and does not imply an empty menu or no reviews.

#### Out of scope

Creating reviews belongs to CUS-05; hiding/restoring and moderation audit belong
to ADM-03. This page does not grant menu or profile editing.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Café page | Authorized café menu/prices, sold-out indicators, opening hours and visible reviews | Inspect menu, hours and reviews; proceed to the product's Pre-order flow under CUS-03 | CUS-02 |

## Use cases

### `UC-CUS-02-1`: Inspect a café before ordering

- **Actor:** Signed-in Customer.
- **Preconditions:** Café is approved, non-suspended and within the Customer's workspace.
- **Main success scenario:**
  1. Customer opens a café from browsing or Brew Finder.
  2. The system rechecks eligibility and displays its menu, sold-out state, hours and visible reviews.
  3. Customer reads the information and chooses whether to enter CUS-03's Pre-order flow.
- **Extensions:** At step 2, an ineligible/missing/out-of-workspace café returns no protected data; absent menu items or visible reviews produce empty collections; source failure produces the shared safe failure.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read café/menu/hours | Own workspace determines scope | Eligible cafés in that workspace only |
| Read café reviews | Own-review access remains governed by the technical ownership contract | Only pending/kept reviews on an eligible café page; hidden reviews and other-workspace records denied |
| Edit café, menu, hours or reviews through this page | Denied | Denied |

## Out of scope

No additional café-profile fields, reviewer identity disclosure, rating formula,
payment flow or independent review mutation is introduced. Customer page
reading does not expand the owner/Admin permissions defined elsewhere.

## Assumptions

None. Retired IDs: ASM-01.
