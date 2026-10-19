# CUS-05: Review a collected order once

- **Related specs:** [Customer source stories](../PRODUCT-SPEC.md#customer), [review ownership and immutability](../TECHNICAL-SPEC.md#data-model-and-ownership), [relational integrity](../TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [workspace isolation](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [moderation owner](ADM-03-review-moderation.md), [own orders](CUS-04-my-orders.md), [café review display](CUS-02-cafe-page.md), [accessible responsive flows](../TECHNICAL-SPEC.md#accessibility-and-responsive-behavior).
- **Role:** Customer
- **Source:** [PRODUCT-SPEC.md, User stories → Customer](../PRODUCT-SPEC.md#customer), CUS-05; MVP.
- **Requirement ownership:** This file owns CUS-05 and its criteria. ADM-03 owns initial moderation state, visibility, moderation transitions and immutability; CUS-02 owns customer café-page display.

## Overview

A customer shares feedback for an order they have collected. A review belongs
to its collected order and customer; exactly one review is permitted per order.
The shared domain contract includes review text and a rating. Review creation
does not confer moderation authority or permit later editing/deletion in the
MVP.

## Access

- **How a user gets the role:** Chooses Customer at sign-up or signs in using a demo-kit Customer account.
- **What it can see and change:** Creates one review for an own collected order in its workspace and can read its own reviews under the technical ownership contract.
- **What it can never do:** Review another customer's order, review an uncollected order, create a second review for an order, edit/delete an existing review, set moderation state or read another workspace's records.

## Requirements

### `CUS-05`: Submit one review for an own collected order

- **User story:** As a customer, I want to review a collected order once per order, so that I can share feedback about my purchase.
- **Priority:** Medium
- **Risk:** High — forged or duplicate reviews damage feedback integrity, and customer-written text is untrusted content.

#### Acceptance criteria

- **`CUS-05.1`:** Given an own collected order without an existing review and a valid review submission, when the Customer submits the Review form, then exactly one review is created for that order, its Customer and its café in the same workspace.
- **`CUS-05.2`:** Given an order that has not been collected, when its Customer attempts to submit a review, then no review is created; an application-owned JSON mutation uses the shared `409 STATE_CONFLICT` boundary for an in-scope order in an ineligible state.
- **`CUS-05.3`:** Given an order already has a review, when a second submission is attempted, including concurrent submissions, then no second review can exist; the unique order reference required by SYS-06 enforces one review per order independently of the form UI.
- **`CUS-05.4`:** Given another customer's order, an order outside the workspace or a missing order, when a Customer attempts review creation through a JSON endpoint, then the shared indistinguishable `404 NOT_FOUND` boundary applies, without order disclosure or review creation.
- **`CUS-05.5`:** Given a valid review creation, when its stored relationships are inspected, then the author is derived from the session and the café/workspace from the authorized collected order; caller-supplied identities cannot attach the review to another author, order or café.
- **`CUS-05.6`:** Given a newly created review, when its moderation state and customer-visible eligibility are read, then ADM-03's initial `pending` state and post-moderation visibility rules apply; the Customer cannot choose `kept` or `hidden` during submission.
- **`CUS-05.7`:** Given any existing review, when its Customer attempts to edit its text/rating or delete it, then the operation is denied and the review remains unchanged under ADM-03; review creation is not an update/upsert permission.
- **`CUS-05.8`:** Given review text containing markup, executable content or instructions, when the submitted review is displayed or later classified, then it remains untrusted data and does not execute, change access or direct moderation actions; ADM-03/ADM-04 own moderation handling.
- **`CUS-05.9`:** Given no valid session or a wrong-role caller, when customer review creation is requested through a JSON endpoint, then the shared `401 UNAUTHENTICATED` or `403 FORBIDDEN` response applies, respectively, and no review is created.
- **`CUS-05.10`:** Given a request violating shared origin, method, body-size, media-type or strict-JSON rules, when it is validated, then the shared safe error applies with no review creation or rewrite of an existing review.

#### Edge cases and failure paths

One-review enforcement persists if moderation later hides or restores the
review: moderation does not delete it or release the order's unique reference.
Collection eligibility comes from the authoritative order state, never a
client assertion. Source failures cannot fabricate collection or review
eligibility. Demo-kit Customers follow the same constraints on their own kit's
collected orders.

#### Out of scope

Review moderation, its audit trail and AI classification belong to ADM-03 and
ADM-04. This requirement adds no customer edit/delete or owner reply feature.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Review form | Context of an own collected order and its review text/rating inputs | Submit one review for that order | CUS-05 |

## Use cases

### `UC-CUS-05-1`: Share feedback for a collected order

- **Actor:** Signed-in Customer who owns the order.
- **Preconditions:** Order is collected, belongs to the Customer's workspace and has no review.
- **Main success scenario:**
  1. Customer opens the Review form for the collected order.
  2. Customer supplies valid feedback and submits it.
  3. The system validates current ownership, collected state and one-review eligibility, then creates the review.
  4. The review follows ADM-03's pending/visibility policy and is readable as the Customer's own review.
- **Extensions:** At step 3, an uncollected order or existing review cannot produce another review; a missing/out-of-scope order fails without disclosure; concurrent submissions cannot create duplicates.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Create review | One per own collected order, in own workspace | Denied |
| Read own review | Allowed under technical ownership, including own non-public review | No additional read permission; café-page visible reviews remain CUS-02 |
| Edit/delete review or change moderation state | Denied | Denied |

## Out of scope

No rating scale, review length limit, reviewer-profile disclosure or domain
retention rule is inferred from AI prompt/schema limits. Those limits are not
customer review-field definitions. Order fulfilment remains OWN-05.

## Assumptions

None. Retired IDs: ASM-01.
