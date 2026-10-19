# CUS-07: Save favourite cafés

- **Related specs:** [Customer source stories](../PRODUCT-SPEC.md#customer), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [role boundaries](../PRODUCT-SPEC.md#roles-and-access), [product navigation](../PRODUCT-SPEC.md#navigation-per-role), [workspace isolation](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [catalogue eligibility](../TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [browse](CUS-01-browse-cafes.md), [café page](CUS-02-cafe-page.md).
- **Role:** Customer
- **Source:** [PRODUCT-SPEC.md, User stories → Customer](../PRODUCT-SPEC.md#customer), CUS-07; Stretch, outside MVP.
- **Requirement ownership:** This file owns CUS-07 and its criteria. It does not grant catalogue access beyond SYS-05/SYS-12 or introduce an additional product screen.

## Overview

Customers save favourite cafés so they can return to cafés they like. This is
the product's optional customer feature. A favourite is personal to its
Customer and does not alter the café or confer access to an otherwise
ineligible café.

## Access

- **How a user gets the role:** Chooses Customer at sign-up or signs in with a demo-kit Customer account.
- **What it can see and change:** Saves its own favourite café associations inside its workspace; returning to café content still requires current catalogue eligibility.
- **What it can never do:** Save for another customer or workspace, disclose another customer's favourites, modify a café, or use a saved reference to bypass café eligibility.

## Requirements

### `CUS-07`: Save favourite cafés for return visits

- **User story:** As a customer, I want to save favourite cafés, so that I can return to cafés I like.
- **Priority:** Low
- **Risk:** Medium — personal saved associations require ownership checks, and stale references must not bypass catalogue restrictions.

#### Acceptance criteria

- **`CUS-07.1`:** Given the stretch feature is provided, a signed-in Customer and an eligible café in its workspace, when the Customer saves the café as a favourite, then that association belongs to the verified Customer and workspace without changing the café.
- **`CUS-07.2`:** Given a Customer has saved an eligible café, when it returns to its saved favourites, then it can identify that café and open its currently authorized page through CUS-02.
- **`CUS-07.3`:** Given another customer's identity or another workspace's café reference is supplied, when favourite saving is requested, then the server does not create a favourite for that other customer or associate an out-of-workspace café; request references do not establish permission.
- **`CUS-07.4`:** Given a saved café later becomes suspended or otherwise ineligible, when the saved reference is used to read café content, then the current SYS-05 eligibility checks apply and no restricted café content is disclosed.
- **`CUS-07.5`:** Given no valid session or a wrong-role caller, when customer favourite saving is requested through a JSON endpoint, then the shared `401 UNAUTHENTICATED` or `403 FORBIDDEN` response applies, respectively, without changing favourites.

#### Edge cases and failure paths

Main and kit accounts use their respective workspace scopes. Favourite actions
do not approve or un-suspend cafés. Shared JSON transport, origin and validation
failures produce safe errors without changing personal saved associations.
No separate Favourites screen is established by the product navigation contract.

#### Out of scope

This requirement adds no boost, Featured badge, rating change, payment or
owner/Admin favourite-management permission.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Existing customer catalogue context; [ASSUMPTION ASM-02] Browse cafés and Café page | Personal saved state for an eligible café | Save favourite; return to an eligible saved café | CUS-07 |

## Use cases

### `UC-CUS-07-1`: Save a café for a later visit

- **Actor:** Signed-in Customer.
- **Preconditions:** Stretch feature is provided; café is eligible and in the Customer's workspace.
- **Main success scenario:**
  1. Customer finds an eligible café.
  2. Customer saves it as a favourite.
  3. The system records the association for the verified Customer only.
  4. Customer later returns to the saved café and the system checks current eligibility before showing its page.
- **Extensions:** At step 3, a forged actor/workspace cannot change another customer's favourites. At step 4, changed eligibility prevents restricted café disclosure even though the reference was saved earlier.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Save/read favourites for return visits | Own Customer associations within own workspace | Another customer's favourites denied |
| Read a saved café's content | Current catalogue eligibility still required | Other-workspace or ineligible café data denied |
| Alter café or its eligibility | Denied | Denied |

## Out of scope

Removing favourites, sharing favourites, notifications and an additional screen
are not defined by this story's source. No favourite storage/API contract is
inferred from the MVP data model.

## Assumptions

- **ASM-02:** Save/return controls appear in existing Browse cafés and Café page contexts. The product specifies no separate screen; placement is a proposal, and a different decision changes the Screens entry without expanding data access.

Retired IDs: ASM-01.
