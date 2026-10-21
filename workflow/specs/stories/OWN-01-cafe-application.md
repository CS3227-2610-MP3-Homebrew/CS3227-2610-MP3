# OWN-01: Apply to register a café

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [roles](../PRODUCT-SPEC.md#roles-and-access), [data ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [role navigation](SYS-03-role-navigation.md), [Admin decisions](ADM-01-cafe-applications.md), [suspension](ADM-02-cafe-suspension.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-01; High priority, MVP.
- **Requirement ownership:** This file owns OWN-01. ADM-01 owns approval/rejection and decision audit; SYS-01–SYS-03 own account access and navigation.

## Overview

An owner applies to register a home café and can distinguish its application
state from customer visibility. Submission leaves the café pending; only an
Admin decision can approve it. Rejection is followed by owner resubmission,
not an Admin reversal. Approval and suspension remain independent.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or signs in with the demo kit's Café owner account. Becoming an owner does not approve a café.
- **What it can see and change:** Its own café application and latest decision reason within its verified workspace; submission and rejected-application resubmission are owner operations.
- **What it can never do:** Apply for another owner/workspace, change ownership, self-approve, clear suspension, create an Admin or edit decision/audit history. Server authorization and RLS enforce these boundaries.

## Requirements

### `OWN-01`: Submit and follow a café application

- **User story:** As a café owner, I want to apply to register a café that stays pending until an admin approves it, so that my café can become available to customers after approval.
- **Priority:** High
- **Risk:** High — forged ownership or approval could expose an unapproved café or another workspace's records.

#### Acceptance criteria

- **`OWN-01.1`:** Given a signed-in owner submitting a café registration application, when submission succeeds, then the application belongs to that verified owner/workspace, is `pending`, and does not appear in Customer catalogue, café-detail or Brew Finder sources.
- **`OWN-01.2`:** Given the owner's pending application, when the owner reads Café application at `/owner/application`, then its pending state is shown and neither opening the screen nor editing owner-managed café data approves it.
- **`OWN-01.3`:** Given an Admin approves or rejects the owner's application under ADM-01, when the owner next reads the application, then it shows the resulting `approved` or `rejected` state and the latest decision reason as escaped plain text; another owner's decision reason is not disclosed.
- **`OWN-01.4`:** Given an approved café, when its customer eligibility is evaluated, then it is eligible only while not suspended; an owner application/profile write cannot change the Admin-controlled approval or suspension state.
- **`OWN-01.5`:** Given the owner resubmits its rejected application, when resubmission succeeds, then it returns to `pending`, remains Customer-invisible, and earlier decision audit entries remain intact under ADM-01.11; resubmission does not itself approve the café.
- **`OWN-01.6`:** Given a missing or other-owner/other-workspace café target, when an owner application JSON operation addresses it, then the shared indistinguishable `404 NOT_FOUND` record-scope response applies without protected disclosure or change; a supplied owner/workspace reference grants no authority.
- **`OWN-01.7`:** Given no valid session or a Customer/Admin session, when an owner application JSON operation is requested, then it returns `401 UNAUTHENTICATED` or `403 FORBIDDEN` respectively without application disclosure or change; browser entry follows SYS-03.
- **`OWN-01.8`:** Given a kit owner, when it submits or reads an application, then the same lifecycle and ownership rules apply inside its kit only; normal sign-up belongs to the main workspace and cannot choose a kit through request data.

#### Edge cases and failure paths

Pending applications can remain pending indefinitely in the main workspace;
no elapsed time grants approval. Shared HTTP errors remain safe and private,
and source failures are not displayed as an absent application. The no-café
Dashboard entry/link belongs to SYS-03.5. Application state does not overwrite
or erase suspension, existing café data or Admin audit history.

#### Out of scope

Admin decisions/reasons/audit creation (ADM-01), suspension (ADM-02), owner
account registration (SYS-01) and profile/menu/pickup editing (OWN-02–OWN-04).

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/application` | Café registration context, own application state and latest Admin decision reason; protected loading/source-failure states | Submit application; read state/reason; resubmit a rejected application | OWN-01 |

## Use cases

### `UC-OWN-01-1`: Apply for customer visibility

- **Actor:** Signed-in Café owner.
- **Preconditions:** Verified owner role and workspace.
- **Main success scenario:**
  1. Owner opens Café application and submits a registration application.
  2. The system associates the pending application with the verified owner and workspace.
  3. Owner reads its pending state while the café remains hidden from customers.
  4. Following an ADM-01 decision, owner reads the resulting state and latest reason.
- **Extensions:** Step 1: wrong-role browser access follows SYS-03. Step 2: an out-of-scope target is denied without a write. Step 3: waiting does not approve. Step 4: rejection permits owner resubmission back to pending; approval still requires no suspension for customer visibility.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Submit/read/resubmit application | Owner's café, verified workspace only | Denied |
| Read latest decision reason | Owner's own café | Workspace Admin access belongs to ADM-01; unrelated owners/Customers denied |
| Approve/reject or change suspension | Denied to owner | Admin operations retain ADM-01/ADM-02 scopes |
| Change ownership, workspace or audit history | Denied | Denied |

## Out of scope

Automatic approval, application expiry, owner role promotion, ownership transfer
and extra Admin powers. Accessible/responsive core behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.

Retired IDs: ASM-01.
