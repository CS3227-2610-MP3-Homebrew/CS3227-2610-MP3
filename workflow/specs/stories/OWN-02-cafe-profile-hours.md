# OWN-02: Manage café profile and opening hours

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [roles](../PRODUCT-SPEC.md#roles-and-access), [data ownership/RLS](../TECHNICAL-SPEC.md#data-model-and-ownership), [catalogue and hours vocabulary](../INTEGRATION-SPEC.md#customer-catalogue-and-detail-boundary), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [order snapshots](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [Customer café page](CUS-02-cafe-page.md), [application](OWN-01-cafe-application.md), [pickup rules](OWN-04-pickup-rules.md), [suspension](ADM-02-cafe-suspension.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-02; High priority, MVP.
- **Requirement ownership:** This file owns OWN-02's owner profile/hour management. CUS-01–CUS-03 own customer display, open-time filtering and pickup validation; OWN-04 owns the cutoff rule.

## Overview

Owners keep their own café information and recurring opening hours accurate.
Hours use the shared Singapore-local weekly-interval contract, including
overnight opening. Customer visibility still requires approval without
suspension. Public profile projections remain defined by the catalogue
contract; editing conveys no additional access or approval authority.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Its own café profile and opening hours in its verified workspace. ADM-02 preserves owner management access during suspension.
- **What it can never do:** Edit another café/workspace, change owner/workspace/approval/suspension, read unrelated private records, or alter retained order snapshots through a profile/hour edit.

## Requirements

### `OWN-02`: Maintain café information and weekly hours

- **User story:** As a café owner, I want to manage my café profile and opening hours, so that customers can see my café's information and hours.
- **Priority:** High
- **Risk:** High — incorrect scope or time handling can expose another café or offer pickups outside its opening intervals.

#### Acceptance criteria

- **`OWN-02.1`:** Given the owner opens Café profile for its own café, when source reads succeed, then it sees that café's stored profile and weekly opening hours, using Singapore local dates/times regardless of browser or host timezone.
- **`OWN-02.2`:** Given the owner saves a profile change, when the save succeeds, then subsequent own-profile reads return the saved information and subsequent eligible Customer café reads use the current public projection; no other café changes and private Admin reasons never become public profile data.
- **`OWN-02.3`:** Given weekly intervals satisfying the shared `OpeningInterval` contract, when the owner saves hours, then later reads preserve weekday, minute-precision opening/closing times and explicit next-day closing; opening is inclusive, closing exclusive, and adjacent intervals form continuous opening under the shared contract.
- **`OWN-02.4`:** Given overlapping intervals, a nonpositive duration, or an overnight duration exceeding the shared 24-hour bound, when the owner attempts to save them, then the invalid hours are not persisted; overlap checks include Sunday-to-Monday and do not depend on browser timezone.
- **`OWN-02.5`:** Given an empty weekly-hours list, when it is saved and the café is read, then hours are empty and the café is closed with no next opening or pickup slots under the Customer contracts; no opening interval is fabricated.
- **`OWN-02.6`:** Given an existing order, when the owner later changes café information or hours, then its original café-name, pickup, item-name and price snapshots remain unchanged under CUS-03; subsequent new-order submission validates the current hours.
- **`OWN-02.7`:** Given a suspended café, when its owner manages its profile/hours, then owner management remains available under ADM-02, while the changes neither clear suspension nor restore Customer visibility; pending/rejected cafés likewise cannot become approved by editing.
- **`OWN-02.8`:** Given an anonymous caller, wrong-role caller, or missing/foreign café, when an owner profile/hour JSON operation is requested, then the shared `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies respectively without disclosure or mutation; direct database access obeys the same ownership/workspace boundary under RLS.

#### Edge cases and failure paths

Overnight intervals, including the week boundary, retain the exact shared
meaning. Empty hours are a closed schedule, not a source outage. Profile or
hours-source failure does not fabricate saved data or reset hours. JSON errors
follow shared private/no-store and safe-error conventions. Main/kit owners
have identical operations within their own workspace.

#### Out of scope

Approval/suspension, menu prices/availability (OWN-03), pickup-cutoff editing
(OWN-04), holiday/exception calendars and editing existing purchases.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Café profile | Own stored café information, recurring weekly/overnight hours, empty schedule and source-failure states; pickup-rule content belongs to OWN-04 | Read/save profile; read/save weekly opening hours | OWN-02 |

## Use cases

### `UC-OWN-02-1`: Update a café's weekly hours

- **Actor:** Signed-in Café owner.
- **Preconditions:** An own café in the verified workspace.
- **Main success scenario:**
  1. Owner opens Café profile and reads its current information/hours.
  2. Owner changes weekly opening intervals and saves.
  3. The system checks ownership and shared interval validity and persists the hours.
  4. Owner reads the saved schedule; eligible Customer reads and new pickup validation use it.
- **Extensions:** Step 2: empty hours intentionally leave the café closed. Step 3: overlap/invalid duration prevents saving; foreign targets are denied. Step 4: suspension still prevents Customer visibility and existing order snapshots remain unchanged.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read/save profile and hours | Own café within verified workspace, including while suspended | Denied |
| Read Customer-facing information | Subject to the Customer story's separate role/eligibility contract | No new owner permission |
| Change approval/suspension, owner or workspace | Denied | Denied |
| Rewrite existing order snapshots | Denied | Denied |

## Out of scope

New screens, ownership transfer, holiday exceptions or automatic changes to
orders. Shared role navigation remains SYS-03 and accessible/responsive core
behavior remains [SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.

Retired IDs: ASM-01.
