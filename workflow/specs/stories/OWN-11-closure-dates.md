# OWN-11: Set one-off closure dates

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [owner stretch boundary](../INTEGRATION-SPEC.md#owner-stretch-operations-boundary), [owner café boundary](../INTEGRATION-SPEC.md#owner-cafe-management-boundary), [opening hours](OWN-02-cafe-profile-hours.md), [pickup rules](OWN-04-pickup-rules.md), [catalogue](CUS-01-browse-cafes.md), [café page](CUS-02-cafe-page.md), [pre-order](CUS-03-pre-order.md), [Singapore business time](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-11; Low priority, Stretch.
- **Requirement ownership:** This file owns closure dates and how they remove opening time. OWN-02 still owns weekly hours, OWN-04 the pickup cutoff and CUS-01–CUS-03 the Customer reads that apply the result.

## Overview

Weekly hours cannot express a holiday or a day away. Closure dates let an owner
close the café for whole Singapore dates without editing the weekly schedule.
Customers see the café as closed and cannot book pickups on those dates.

## Closure rules

A closure is a Singapore business date with an optional public note. The note
is trimmed, 0–100 Unicode code points, and rendered as inert text. Each café
has at most one closure per date; saving an existing date replaces its note.
New closures must be dated from today through today plus 365 days, and a café
can hold at most 30 closures dated today or later. Past closures are kept but
are neither listed nor editable.

A closure removes all opening time from 00:00 to 24:00 Singapore time on that
date. A weekly interval that overlaps the date is cut at the date boundary:
an overnight interval running into a closure date ends at 00:00, and that
00:00 becomes its continuous closing for the OWN-04 cutoff (last pickup is
00:00 minus the cutoff). An interval starting on a closure date and running
past midnight opens at 00:00 the next day.

The effect applies everywhere opening time is used: pickup slots, new-order
slot validation, open-now and open-at results, current open state and the next
opening time. The Customer café page lists closures within the seven-date
pickup horizon with their notes.

Existing orders on a closure date are unchanged. When saving a closure, the
owner is told how many pending, accepted or ready orders already have a pickup
on that date, so the owner can handle them in Order queue. Removing a closure
restores that date's weekly hours. Café profile holds a Closure dates section
for approved cafés.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Its own approved café's current and future closures inside its verified workspace, including during suspension.
- **What it can never do:** Close another café, change existing orders by adding a closure, edit past closures, approve its café or clear suspension.

## Requirements

### `OWN-11`: Close the café on chosen dates

- **User story:** As a café owner, I want to mark specific dates as closed, so that customers cannot book pickups on days I am away.
- **Priority:** Low
- **Risk:** Medium — wrong timezone or overnight handling could offer pickups on a closed date or hide valid ones.

#### Acceptance criteria

- **`OWN-11.1`:** Given the owner of an approved café, when it saves a closure date with a note, then the closure belongs only to its café, later reads list current and future closures in ascending date order, and saving an existing date replaces its note.
- **`OWN-11.2`:** Given a past date, a date after today plus 365 days, a 31st current or future closure, a note over 100 code points or a malformed date, when the owner saves it, then `400 INVALID_REQUEST` names the field and nothing is stored.
- **`OWN-11.3`:** Given a closure date, when Customer pickup slots are read or an order is submitted for that date, then no slot on that date is offered and a submitted pickup on it returns `409 STATE_CONFLICT` without creating an order.
- **`OWN-11.4`:** Given an overnight interval running into a closure date with a 15-minute cutoff, when slots are evaluated, then the interval ends at 00:00 of the closure date and the last pickup is 23:45 the previous date; an interval starting on the closure date opens at 00:00 the next date.
- **`OWN-11.5`:** Given a closure date, when open-now, open-at, current open state and next opening time are evaluated, then the café is closed throughout that Singapore date, the next opening skips it, and the café page lists closures within the seven-date horizon with their notes as inert text.
- **`OWN-11.6`:** Given pending, accepted or ready orders with pickup on a date, when the owner closes that date, then those orders are unchanged, the save response and UI report their count, and removing the closure restores that date's weekly-hours slots.
- **`OWN-11.7`:** Given a pending or rejected café, or an `expectedSuspensionVersion` that no longer matches, when the owner adds or removes a closure, then `409 STATE_CONFLICT` is returned with nothing changed; removing a closure that is missing or past returns `404 NOT_FOUND`; changes during suspension succeed without restoring Customer visibility.
- **`OWN-11.8`:** Given no session, a wrong role, or a missing or foreign café, when a closure operation is requested, then `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies without disclosure or change; main and kit owners stay inside their own workspace under server checks and RLS.

#### Edge cases and failure paths

Adjacent closure dates close a continuous span. A closure on today removes
slots still remaining today. Empty weekly hours stay closed regardless of
closures. Transaction failure returns `500 INTERNAL_ERROR` with no partial
change; source failure is `503 SOURCE_UNAVAILABLE`, never invented open time.

#### Out of scope

Partial-day closures, recurring holidays, imported public-holiday calendars,
automatic rejection of affected orders and Customer notifications.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Café profile, Closure dates section | Current and future closures with notes; affected-order count after saving | Add or update a closure; remove a closure | OWN-11 |
| Customer café page | Closures within the seven-date horizon with notes | None | OWN-11 |

## Use cases

### `UC-OWN-11-1`: Close for a public holiday

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own approved café with weekly hours.
- **Main success scenario:**
  1. Owner opens Café profile and adds a closure date with a note.
  2. The system validates and saves the closure for the owner's café.
  3. The owner sees how many active orders already fall on that date.
  4. Customers see the closure and get no pickup slots that date.
- **Extensions:** Step 2: invalid dates or too many closures are refused with a field message. Step 3: the owner handles affected orders through Order queue.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Add, update or remove current/future closures | Own approved café in verified workspace | Denied |
| Change existing orders through a closure | Denied | Denied |

## Out of scope

Weekly-hours changes, payment and new navigation.

## Assumptions

None.
