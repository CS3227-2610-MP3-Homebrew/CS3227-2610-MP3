# ADM-02: Café suspension

- **Related specs:** [Product Admin stories](../PRODUCT-SPEC.md#admin), [architecture](../TECHNICAL-SPEC.md#architecture), [ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [RLS](../TECHNICAL-SPEC.md#rls-and-database-exposure), [workspace boundaries](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [schema vocabulary](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [applications](ADM-01-cafe-applications.md), [customer suspension-cancellation behaviour](CUS-04-my-orders.md#acceptance-criteria), [audit display](ADM-03-review-moderation.md#screens).
- **Role:** Admin

## Overview

Admins reversibly suspend approved cafés, controlling customer visibility and
new-order availability. Suspension applies the automatic cancellation rule for
outstanding uncollected orders in CUS-04.5, while retaining order records,
collected purchases and owner management access.
Suspension is independent of the `pending`, `approved`, `rejected` application
state. Customer eligibility is authoritative in
[SYS-05.3](../TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access)
and [Product roles](../PRODUCT-SPEC.md#roles-and-access).

## Access

- **How a user gets the role:** The main Admin is maintenance-created and kit Admins are demo-kit-created; sign-up cannot grant Admin.
- **What it can see and change:** Approved cafés and their suspension boolean in the Admin's own workspace, with identical main/kit operations under SYS-12.2/SYS-12.12.
- **What it can never do:** Cross workspace boundaries, approve through suspension, change roles, create Admins, delete orders, edit collected purchases or make unrelated menu/hour/review/order changes. Automatic cancellation under CUS-04.5 is a consequence of suspension, not general Admin order-edit permission.

## Requirements

### `ADM-02`: Suspend and un-suspend approved cafés

- **User story:** As an admin, I want to suspend and un-suspend cafés, so that I can control which cafés are visible to customers.
- **Priority:** High
- **Risk:** High — suspension must stop new business and cancel outstanding uncollected orders while preserving collected purchases, retained records and owner access.

#### Acceptance criteria

- **`ADM-02.1`:** Given an Admin session, when `/admin/cafes` is opened, then the server-rendered page lists only approved cafés in the Admin's workspace with suspension state, ordered by café name with ties by café reference, 20 per page with previous/next and page selection in URL query parameters; pending and rejected cafés do not appear on this screen and belong only to the Applications context in ADM-01.
- **`ADM-02.2`:** Given an in-scope approved café that is not suspended and a valid reason, when the Admin confirms `POST /api/admin/cafes/{cafeId}/suspension` with exactly `{suspended: true, reason}`, then the response is HTTP `200` with exactly `{requestId, suspended: true}` as JSON under the shared `Cache-Control: private, no-store` conventions, its suspension boolean becomes true and exactly one `suspend` Admin audit entry is committed in the same transaction; customer-scoped café reads under RLS/SYS-05.3 exclude it and therefore it is excluded from catalogue and Brew Finder candidates; it is ineligible for new orders, and CUS-03 owns enforcement that refuses order submission.
- **`ADM-02.3`:** Given an in-scope approved café that is suspended and a valid reason, when the Admin confirms the suspension route with exactly `{suspended: false, reason}`, then the response is HTTP `200` with exactly `{requestId, suspended: false}` as JSON under the shared `Cache-Control: private, no-store` conventions, its suspension boolean becomes false, it returns to customer-scoped café reads under RLS/SYS-05.3 and Product eligibility, and exactly one `un-suspend` Admin audit entry commits in the same transaction.
- **`ADM-02.4`:** Given a pending or rejected café, an already suspended café requested with `suspended: true`, or a non-suspended café requested with `suspended: false`, when the suspension route is called, then it returns `409 STATE_CONFLICT`, changes nothing and writes no Admin audit entry; `/admin/cafes` says the record changed and shows its current state. Concurrent identical transitions permit one success and one audit entry only.
- **`ADM-02.5`:** Given a suspension request, when its reason is blank after trimming whitespace, longer than 300 Unicode code points or fails integration `Reason`, then the route returns `400 INVALID_REQUEST` with no change or Admin audit entry; valid reasons retain their submitted whitespace and exact content and are shown as escaped plain text.
- **`ADM-02.6`:** Given no valid session, when the suspension route is called, then it returns `401 UNAUTHENTICATED`; given a Customer or Café owner session it returns `403 FORBIDDEN`; neither response discloses protected data, changes state or writes an Admin audit entry.
- **`ADM-02.7`:** Given an Admin and a missing café or a café in another workspace, when the suspension route is called, then both targets return indistinguishable `404 NOT_FOUND` responses with no change or Admin audit entry.
- **`ADM-02.8`:** Given a kit Admin and an approved café in its own kit, when it suspends or un-suspends with a valid reason, then the same operations, state checks and exactly-one transactional audit rules apply as for the main Admin, and the kit Admin's `/admin/cafes` contains only its kit's approved cafés.
- **`ADM-02.9`:** Given existing orders for a café, when it is successfully suspended, then the suspension operation applies [CUS-04.5](CUS-04-my-orders.md#acceptance-criteria)'s automatic cancellation and fixed customer-visible reason to every outstanding uncollected order, including accepted and ready orders, in that café's workspace only; order records and already collected orders remain, and owner management access remains available. Un-suspension restores café eligibility without restoring cancelled orders.
- **`ADM-02.10`:** Given a successful suspension-state change, when its effects are inspected, then menus, hours and reviews are neither deleted nor changed, orders are retained with only the suspension-cancellation effects linked in ADM-02.9, application state stays `approved`, and the café's owner plus workspace Admins can read the latest Admin-entered suspension reason; no other actor can read that private reason. CUS-04's fixed order cancellation reason does not expose the Admin's reason.
- **`ADM-02.11`:** Given a successful suspension-state change, when its audit entry is read in ADM-03's `/admin/audit`, then it contains the acting Admin, action, café reference, exact submitted reason and server timestamp, is append-only and is never automatically deleted; if the audit entry cannot commit, neither the suspension-state change nor its resulting order cancellations commit.
- **`ADM-02.12`:** Given a request to the suspension Route Handler, when its method, origin, media type, target reference or strict JSON violates the shared HTTP/`Ref` contracts, then the applicable shared error is returned with no change or Admin audit entry; missing/malformed/mismatched Origin returns `403 FORBIDDEN`, nonboolean suspended values and unknown fields return `400 INVALID_REQUEST`, and responses use the shared error shape and `Cache-Control: private, no-store`.
- **`ADM-02.13`:** Given an anonymous or wrong-role visitor to `/admin/cafes`, when the server renders the role area, then SYS-05.1 redirects the anonymous visitor and returns no protected café content to the wrong-role visitor; static loading shells contain no private records.

#### Edge cases and failure paths

The target is supplied only by the path; bodies contain only the suspension
boolean and reason. Every rejected/failed request has no Admin audit entry or
state change. Errors and source failures use the shared status mapping.
An empty approved-café list shows an empty state. Suspension never turns an
unapproved café into an approved one.

#### Out of scope

New-order checks and order lifecycles belong to CUS-03/CUS-04/OWN-05. The suspended-owner banner belongs to OWN-02. Application decisions belong to ADM-01.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/admin/cafes` | Workspace approved cafés, current suspension state, empty and conflict states; URL page selection | Previous/next; Suspend or Un-suspend, reason and confirmation | ADM-02 |

## Use cases

### `UC-ADM-02-1`: Change café suspension

- **Actor:** Admin within its own main or kit workspace.
- **Preconditions:** Valid Admin session; approved café in scope.
- **Main success scenario:**
  1. Admin opens `/admin/cafes` and selects Suspend or Un-suspend for an eligible current state.
  2. Admin enters a reason and confirms the suspension request.
  3. The system atomically changes the suspension boolean, applies CUS-04.5's uncollected-order cancellations when suspending, and writes one audit entry.
  4. The list shows the resulting state; customer eligibility changes, order records remain, collected orders stay unchanged and owner management access continues.
- **Extensions:** At step 2, invalid reason returns `400 INVALID_REQUEST`; at step 3, out-of-scope/missing targets return `404 NOT_FOUND`, a changed or non-approved state returns `409 STATE_CONFLICT` with current-state feedback, and transaction failure commits neither state nor audit.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Admin list/suspend/un-suspend | Authority is workspace-scoped | Approved cafés in the Admin's workspace only; outside scope is `404 NOT_FOUND` |
| Read latest suspension reason | Café owner may read their own café's latest reason | Admins in that workspace allowed; all other actors denied |
| Manage suspended café | Owner retains management of their own café | No new cross-owner or Admin order/menu access is granted |
| Edit audit history | Denied | Denied |

## Out of scope

CUS-03 must refuse new orders for a suspended café; CUS-04 owns customer-visible
suspension cancellation behaviour, while this story owns applying it through
the suspension mutation. Other fulfilment transitions remain OWN-05.
OWN-02 owns the owner-side suspension banner
and latest-reason display. Audit display
is [ADM-03](ADM-03-review-moderation.md). Accessible/responsive screens follow
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.
