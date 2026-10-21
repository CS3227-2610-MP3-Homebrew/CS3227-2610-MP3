# OWN-04: Set minimal pickup-slot rules

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [roles](../PRODUCT-SPEC.md#roles-and-access), [data ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [pickup and order boundary](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [profile/hours](OWN-02-cafe-profile-hours.md), [Customer pre-order](CUS-03-pre-order.md), [suspension](ADM-02-cafe-suspension.md).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-04; Medium priority, MVP.
- **Requirement ownership:** This file owns OWN-04's pickup-rule editing. OWN-02 owns weekly hours; CUS-03 and the integration boundary own slot generation and new-order validation.

## Overview

Owners set the minimal rule governing how close to closing a pickup may occur.
The established rule is a café-level integer cutoff offset, 0–180 minutes
before continuous closing, default 15. This story manages that rule without
changing the Customer slot grid, lead time, horizon or existing orders.

## Settings save boundary

The cutoff field is `pickupCutoffMinutes`; it is a strict JSON integer from
0 through 180, defaulting to 15 for a newly submitted café when omitted from
its pickup settings object. It is saved together with description and weekly
hours under the [owner café boundary](../INTEGRATION-SPEC.md#owner-cafe-management-boundary),
not through an independent partial-save endpoint. Invalid settings or persistence
failure roll back every part of the batch. Pending cafés cannot edit; rejected
cafés resubmit all application fields; approved cafés save allowed settings
without reapproval. Last committed ordinary settings save wins. The suspension-version guard rejects
an in-flight batch overtaken by an Admin suspension change and shows current
status on /owner/application; subsequent explicit management remains allowed. No café yields
an empty state with an application CTA. Saved order pickup instants never change.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses the demo-kit owner account.
- **What it can see and change:** Its own café's cutoff rule inside its verified workspace, including during suspension under ADM-02.
- **What it can never do:** Edit other cafés/workspaces, set a Customer-specific exception, override Admin eligibility or change a retained order's pickup instant.

## Requirements

### `OWN-04`: Maintain the café's last-pickup cutoff

- **User story:** As a café owner, I want to set minimal pickup-slot rules, such as a last pickup time before closing, so that pickup options follow my café's rules.
- **Priority:** Medium
- **Risk:** High — incorrect cutoff or timezone handling can admit pickups outside permitted hours or alter existing commitments.

#### Acceptance criteria

- **`OWN-04.1`:** Given the owner reads Café profile's pickup rules, when source reads succeed, then the current café cutoff offset is shown in minutes before closing, with the shared 15-minute default where the default applies.
- **`OWN-04.2`:** Given the owner saves an integer cutoff from 0 through 180 minutes inclusive, when saving succeeds, then the rule belongs only to its café, subsequent owner reads return it, and subsequent Customer slot/order validation uses that current value under CUS-03.
- **`OWN-04.3`:** Given a fractional, negative or above-180 cutoff, when an owner attempts to save it, then the invalid rule is not persisted; numeric JSON strings do not bypass shared strict input typing.
- **`OWN-04.4`:** Given a continuous opening interval and saved offset, when permitted pickup times are evaluated, then last pickup is closing minus that offset, equality at cutoff is permitted, and closing itself remains excluded even with offset zero; Singapore-local/overnight interpretation follows the shared boundary.
- **`OWN-04.5`:** Given a cutoff that leaves no permitted slot within an interval, when Customer slot choices are obtained, then no slot from that interval is offered; the system does not extend hours, relax the cutoff or invent capacity reservations.
- **`OWN-04.6`:** Given an existing order, when the owner changes the cutoff, then its pickup instant and purchase snapshots remain unchanged; new orders revalidate current hours/rules, including stale displayed slots, under CUS-03.
- **`OWN-04.7`:** Given an approved suspended café, when its owner changes pickup rules, then owner management remains available but suspension and Customer invisibility remain under ADM-02; an edit cannot approve a pending/rejected café.
- **`OWN-04.8`:** Given no session, a wrong role, or a missing/foreign café, when an owner pickup-rule JSON operation is requested, then the shared `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies respectively without disclosure or change; main and kit access both enforce owner/workspace scope server-side and through RLS.

#### Edge cases and failure paths

Adjacent opening intervals use their continuous closing, not an artificial
cutoff at their internal boundary. Empty hours produce no slots regardless of
cutoff. The 15-minute grid, seven-date horizon, 15-minute lead time and no
capacity reservation are CUS-03 contracts, not configurable permissions added
here. Source failures do not reset the rule to a default or fabricate slots.

#### Out of scope

Slot capacity, bookings outside hours, custom slot durations, per-item rules,
rescheduling, holiday overrides and modifying retained orders.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Café profile, pickup rules section | Own current last-pickup offset in minutes; validation/source-failure states; hours belong to OWN-02 | Read/save cutoff offset | OWN-04 |

## Use cases

### `UC-OWN-04-1`: Change the last-pickup rule

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own café in verified workspace.
- **Main success scenario:**
  1. Owner opens pickup rules in Café profile.
  2. Owner selects an integer cutoff within 0–180 minutes and saves.
  3. The system checks scope and persists the café rule.
  4. Subsequent Customer slot choices and new orders observe the changed cutoff.
- **Extensions:** Step 2: invalid offset cannot persist. Step 3: foreign scope is denied. Step 4: no remaining slots gives empty choices, existing orders retain their pickup, and suspension continues to block new orders.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read/save pickup cutoff | Own café within workspace | Denied |
| Change weekly opening hours | OWN-02's separate management permission | Denied |
| Override existing orders or Admin café state | Denied | Denied |

## Out of scope

Extra rule types or additional screens. Navigation remains SYS-03; accessible/
responsive core behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.

Retired IDs: ASM-01.
