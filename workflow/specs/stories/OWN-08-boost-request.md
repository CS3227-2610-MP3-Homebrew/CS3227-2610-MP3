# OWN-08: Request a café boost

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [role boundaries](../PRODUCT-SPEC.md#roles-and-access), [navigation](../PRODUCT-SPEC.md#navigation-per-role), [data ownership/workspaces](../TECHNICAL-SPEC.md#data-model-and-ownership), [shared HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [stretch contract ownership](../INTEGRATION-SPEC.md#contract-dependencies), [owner boost boundary](../INTEGRATION-SPEC.md#owner-stretch-operations-boundary), [Admin source stories](../PRODUCT-SPEC.md#admin).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-08; Low priority, Stretch, outside MVP.
- **Requirement ownership:** This file owns OWN-08's owner boost request. ADM-06 owns Admin boost approval/rejection. No existing MVP navigation or catalogue-ranking contract is amended by this story.

## Overview

An owner can request additional café visibility through a boost associated
with a time-limited Featured badge and a recorded fee. This is an optional
stretch capability. The fee is a record only: Homebrew has no payment system
in MVP or stretch scope. Requesting a boost does not replace café approval or
lift suspension.

## Boost terms

- **Who can request:** the owner of an `approved`, non-suspended café. A
  pending, rejected or suspended café cannot request a boost.
- **Fee:** a fixed S$10.00 (1,000 SGD cents) recorded on each request. The
  owner cannot change it, and Homebrew collects no payment for it.
- **Lifecycle:** a request starts as `requested`. ADM-06's Admin decision makes
  it `approved` or `rejected`; the owner cannot decide, withdraw or edit it.
- **Featured window:** an approved boost is active from the Admin approval
  instant (`featuredFrom`) for exactly 7 days (`featuredUntil` = `featuredFrom`
  plus 168 hours), then expires. The window is never extended, including
  after suspension and un-suspension.
- **One open boost:** while the café has a `requested` boost or an active
  approved boost, another request is refused. After a rejection or expiry the
  owner may request again.
- **Customer effect:** while a boost is active and the café is
  Customer-eligible, the catalogue card and café page show a "Featured" badge.
  Catalogue ordering and filters do not change.
- **Placement:** a Featured boost panel on `/owner/dashboard` shows the current
  boost state, the recorded fee, the window and request history newest first,
  with a Request boost action when allowed. No navigation entry is added.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses the demo-kit owner account.
- **What it can see and change:** Requests a boost for its own café inside its verified workspace when the stretch feature is provided.
- **What it can never do:** Request for another café/workspace, approve its own request as an Admin, clear suspension, grant café approval, collect an online fee or gain access to other owners' boost records.

## Requirements

### `OWN-08`: Request optional Featured visibility

- **User story:** As a café owner, I want to request a boost with a time-limited Featured badge and a fee that is only recorded, so that I can request additional visibility for my café.
- **Priority:** Low
- **Risk:** Medium — visibility and fee records require ownership enforcement and must not imply real payment or override café eligibility.

#### Acceptance criteria

- **`OWN-08.1`:** Given the stretch boost feature is provided and an owner requests a boost for its café, when the request succeeds, then it is associated only with that verified owner's café/workspace, with a recorded fee and time-limited Featured intent; no payment is collected or payment-provider operation initiated.
- **`OWN-08.2`:** Given an owner boost request, when Admin approval or rejection is needed, then it is handled under ADM-06's separate Admin operation; an owner request does not grant Admin decision authority or change the café's application/suspension state.
- **`OWN-08.3`:** Given a café with a boost becomes Customer-ineligible through suspension or lack of approval, when Customer catalogue/detail/Brew Finder sources are evaluated, then ordinary eligibility still excludes it; a boost reference or badge does not bypass current role/workspace/café access checks.
- **`OWN-08.4`:** Given a Featured badge's defined active time has ended, when Customer-facing badge state is evaluated, then that boost does not provide an indefinite Featured badge; the request does not create perpetual visibility.
- **`OWN-08.5`:** Given no session, a wrong role, or a missing/foreign café, when an owner boost JSON operation is requested, then the shared `401 UNAUTHENTICATED`, `403 FORBIDDEN` or indistinguishable `404 NOT_FOUND` applies respectively without protected disclosure or change; main and kit owners remain confined to their verified workspace.
- **`OWN-08.6`:** Given an owner of an approved, non-suspended café with no open boost, when it requests a boost, then a `requested` boost is stored with `feeCents` 1000, currency SGD and server `requestedAt`; given a pending, rejected or suspended café, the request returns `409 STATE_CONFLICT` and stores nothing.
- **`OWN-08.7`:** Given the café already has a `requested` boost or an approved boost whose window has not ended, when the owner requests another, then `409 STATE_CONFLICT` is returned and nothing is stored; after rejection or expiry a new request succeeds.
- **`OWN-08.8`:** Given an ADM-06 approval at instant A, when Customer badge state is evaluated, then the café shows "Featured" only from A until A plus 168 hours and only while Customer-eligible; catalogue ordering and filter results are unchanged by any boost.
- **`OWN-08.9`:** Given the owner opens Dashboard, when its boost history loads, then the Featured boost panel shows each own boost newest first with state, recorded S$10.00 fee and window, offers Request boost only when OWN-08.6 and OWN-08.7 allow it, and shows another owner's boosts never.

#### Edge cases and failure paths

Stretch availability never removes the MVP's no-payment boundary. A failed
source read is not represented as a successful boost or a zero fee. Shared
origin, strict-JSON, safe-error and private/no-store conventions apply to JSON
requests. A fee record is not evidence of a paid or settled transaction.

#### Out of scope

Admin decisions (ADM-06), café approval/suspension (ADM-01/ADM-02), payments,
refunds, owner self-approval and changes to MVP catalogue ranking.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/dashboard`, Featured boost panel | Current boost state (`requested`, active, expired, `rejected`), recorded S$10.00 fee, Featured window, history newest first; protected failure states | Request boost when allowed | OWN-08 |

The panel sits inside the existing Dashboard. No navigation entry is added.

## Use cases

### `UC-OWN-08-1`: Request additional café visibility

- **Actor:** Signed-in Café owner.
- **Preconditions:** Stretch capability is provided; own café in verified workspace.
- **Main success scenario:**
  1. Owner enters the boost-request interaction for its café.
  2. Owner requests the time-limited Featured boost with a fee recorded only.
  3. The system checks ownership/workspace and records the request without collecting payment.
  4. Any Admin decision follows ADM-06; current café eligibility remains independently enforced.
- **Extensions:** Step 3: foreign scope is denied; failure creates no apparent success. Step 4: suspension/unapproved state cannot be bypassed and an expired boost cannot provide an indefinite badge.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Request café boost | Own café within verified workspace, stretch only | Denied |
| Approve/reject boost | Denied to owner | ADM-06 owns Admin decision authority |
| Process payment, self-approve café or clear suspension | Denied | Denied |

## Out of scope

Any in-app payment system, perpetual badge, new AI feature, additional Admin
permissions or new MVP screen/navigation. Storage/API contracts remain owned
by the shared technical/integration specifications rather than duplicated here.

## Assumptions

None.

Retired IDs: ASM-01.
