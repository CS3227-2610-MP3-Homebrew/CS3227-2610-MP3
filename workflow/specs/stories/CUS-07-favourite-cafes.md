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

The [stretch favourite boundary](../INTEGRATION-SPEC.md#stretch-favourite-boundary)
defines exact schemas and paths, with [personal persistence/RLS](../TECHNICAL-SPEC.md#customer-contract-data-and-integrity).
Save controls appear within Browse cafés and Café page; a Saved view within
Browse provides return access, with no separate screen. Associations persist
server-side across sign-out and devices and are unique per Customer/café.

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

- **`CUS-07.1`:** Given the stretch feature is provided, a signed-in Customer and an eligible workspace café, when it is saved through the strict favourite request, then one persistent personal association is created without changing the café; repeat/concurrent saves are idempotent successes preserving its original server saved time, after rechecking eligibility.
- **`CUS-07.2`:** Given saved eligible cafés, when the Customer returns to Browse's Saved view, including after sign-out or on another device, then its personal list is ordered by saved time descending then café reference ascending, 20 per page, and each currently eligible café opens through CUS-02; Save is available in existing Browse/Café page contexts without adding a screen.
- **`CUS-07.3`:** Given another customer's identity or another workspace's café reference is supplied, when favourite saving is requested, then the server does not create a favourite for that other customer or associate an out-of-workspace café; request references do not establish permission.
- **`CUS-07.4`:** Given a saved café becomes suspended or otherwise ineligible, when favourites are read or the saved reference is followed/re-saved, then current SYS-05 checks omit its details from list/pagination and reject ineligible record requests without disclosure; the association remains and reappears at its original saved position if the café becomes eligible again.
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
| Browse cafés including Saved view; Café page | Personal saved state and currently eligible saved cafés | Save favourite; read paginated Saved view; return to an eligible saved café | CUS-07 |

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
are outside this contract. Optional favourite storage/API does not make this
feature part of the MVP; no removal endpoint is supplied.

## Assumptions

None. Retired IDs: ASM-01–ASM-02.
