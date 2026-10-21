# ADM-01: Café applications

- **Related specs:** [Product Admin stories](../PRODUCT-SPEC.md#admin), [architecture](../TECHNICAL-SPEC.md#architecture), [data ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [RLS](../TECHNICAL-SPEC.md#rls-and-database-exposure), [workspace boundaries](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [schema vocabulary](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [suspension](ADM-02-cafe-suspension.md), [audit display](ADM-03-review-moderation.md#screens).
- **Role:** Admin

## Overview

Admins admit or reject pending café applications with an accountable reason.
Approval is one-way; suspension is the reversible control for approved cafés.
Customer catalogue eligibility remains owned by [SYS-05.3](../TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access).
Pending and rejected cafés are never customer-visible.

## Owner submission reconciliation

OWN-01 retains one café identity per owner with at most one pending/approved
café. Rejected applications permit a fresh attempt with all fields editable
and no required field change; the café reference and prior decision audit
remain intact. Each fresh attempt receives a new submission timestamp for this
story's oldest-first pending queue. Latest decision reason remains visible
to its owner until a later approval or rejection replaces it. Application
details are name, description, area, pickup address, weekly hours and pickup
settings under the strict owner café boundary; these do not expand Admin writes.

## Access

- **How a user gets the role:** Maintenance creates the main Admin; demo-kit creation creates kit Admins. Sign-up never grants Admin.
- **What it can see and change:** Applications and decisions in the verified Admin's workspace only, under server authorization and RLS (SYS-12.2, SYS-12.12). Main and kit Admins have identical operations within their own workspace.
- **What it can never do:** Access another workspace, create Admins, change roles, un-approve a café, reverse rejection or self-authorize using a request reference.

## Requirements

### `ADM-01`: Decide café applications

- **User story:** As an admin, I want to approve or reject café applications with a reason, so that I can manage which cafés are admitted.
- **Priority:** High
- **Risk:** High — incorrect admission or scope checks expose a café or another workspace's records.

#### Acceptance criteria

- **`ADM-01.1`:** Given an Admin session, when `/admin/applications` is opened, then the server-rendered page lists only workspace-local `pending` applications, oldest submitted first with ties by café reference, 20 per page with previous/next controls, the application details defined by OWN-01, and Approve and Reject actions with a reason field; page selection is in URL query parameters.
- **`ADM-01.2`:** Given an in-scope `pending` application and a valid reason, when the Admin confirms Approve through `POST /api/admin/cafes/{cafeId}/decision` with exactly `{decision: "approve", reason}`, then the response is HTTP `200` with exactly `{requestId, applicationState: "approved"}` as JSON under the shared `Cache-Control: private, no-store` conventions, the application becomes `approved`, leaves the pending queue, and the approved, non-suspended café is eligible for customer visibility under SYS-05.3; exactly one `approve` Admin audit entry commits in the same transaction.
- **`ADM-01.3`:** Given an in-scope `pending` application and a valid reason, when the Admin confirms Reject through `POST /api/admin/cafes/{cafeId}/decision` with exactly `{decision: "reject", reason}`, then the response is HTTP `200` with exactly `{requestId, applicationState: "rejected"}` as JSON under the shared `Cache-Control: private, no-store` conventions, the application becomes `rejected`, leaves the pending queue and remains customer-hidden; exactly one `reject` Admin audit entry commits in the same transaction.
- **`ADM-01.4`:** Given a decision request to `POST /api/admin/cafes/{cafeId}/decision`, when the reason is blank after trimming whitespace, exceeds 300 Unicode code points, or fails the integration `Reason` type, then the response is `400 INVALID_REQUEST`, no café state changes and no Admin audit entry is written; a nonblank reason of at most 300 code points is stored exactly as submitted, including surrounding whitespace, and displayed as escaped plain text.
- **`ADM-01.5`:** Given no valid session, when the decision route is called, then it returns `401 UNAUTHENTICATED` without protected data, state change or Admin audit entry; given a Customer or Café owner session, the same request returns `403 FORBIDDEN` with the same absence of effects.
- **`ADM-01.6`:** Given an Admin session and a missing café or a café outside its workspace, when `POST /api/admin/cafes/{cafeId}/decision` is called, then both cases return indistinguishable `404 NOT_FOUND` responses and write no state change or Admin audit entry.
- **`ADM-01.7`:** Given a kit Admin and its kit's pending application, when it approves or rejects with a valid reason through the decision route, then the same state, reason and exactly-one transactional audit rules apply as for a main Admin; `/admin/applications` and subsequent audit access expose only that kit.
- **`ADM-01.8`:** Given an in-scope application already `approved` or `rejected`, when either decision is requested through the decision route, then it returns `409 STATE_CONFLICT`, changes nothing and writes no Admin audit entry; `/admin/applications` tells the Admin the record changed and shows its current state. Concurrent decisions permit only one successful transition and one audit entry.
- **`ADM-01.9`:** Given a successful decision, when its audit entry is inspected through ADM-03's `/admin/audit`, then it identifies the acting Admin, action, target café reference, exact submitted reason and server timestamp; the entry is append-only and is never automatically deleted. A failure to commit the audit entry leaves the decision uncommitted.
- **`ADM-01.10`:** Given a café's decision history, when the latest decision reason is read, then only that café's owner and Admins in its workspace can read it, as escaped plain text; customers, unrelated owners and actors in other workspaces cannot read it.
- **`ADM-01.11`:** Given an owner resubmits a rejected application under OWN-01 and its state returns to `pending`, when `/admin/applications` is read, then that application reappears as pending in submission order and earlier decision audit entries remain intact; no Admin action reverses rejection or approval.
- **`ADM-01.12`:** Given a request to the decision Route Handler, when its method, origin, media type, JSON body or target reference violates the shared HTTP or `Ref` contract, then the applicable shared error/status is returned and no state change or Admin audit entry occurs; a missing, malformed or mismatched Origin returns `403 FORBIDDEN`, unknown fields or invalid decision values return `400 INVALID_REQUEST`, and responses use the shared error shape and `Cache-Control: private, no-store`.
- **`ADM-01.13`:** Given an anonymous or wrong-role visitor to `/admin/applications`, when the server renders the role area, then SYS-05.1 redirects the anonymous visitor and supplies no protected content to the wrong-role visitor; no protected application data appears in a static loading shell.

#### Edge cases and failure paths

Strict JSON bodies carry only decision and reason; the target comes only from
the path. Shared [HTTP status mappings](../INTEGRATION-SPEC.md#authorization-and-transport)
cover unsupported methods, oversized bodies, source and unexpected failures.
Every failed or rejected request writes no Admin audit entry. Transaction
failure cannot leave a decision without its audit entry. Empty queues preserve
their page controls and show that there are no pending applications.

#### Out of scope

Application fields, owner submission/resubmission and owner-side reason display
belong to OWN-01. Suspension belongs to ADM-02;
audit log display belongs to ADM-03.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/admin/applications` | Workspace pending queue, application details defined by OWN-01, empty state, current state after conflicts; URL page selection | Previous/next; Approve or Reject, enter reason, confirm | ADM-01 |

## Use cases

### `UC-ADM-01-1`: Decide a pending application

- **Actor:** Admin, main or kit within its workspace.
- **Preconditions:** Valid Admin session; pending application in scope.
- **Main success scenario:**
  1. Admin opens `/admin/applications` and reads the application details.
  2. Admin chooses Approve or Reject, enters a reason and confirms.
  3. The decision route validates current scope/state and atomically records the decision and one audit entry.
  4. The queue no longer lists the decided application; its decision appears in ADM-03's audit log.
- **Extensions:** At step 2, invalid reason returns `400 INVALID_REQUEST`; at step 3, missing/out-of-workspace target returns `404 NOT_FOUND`, changed state returns `409 STATE_CONFLICT` with current-state feedback, and transaction failure leaves no decision or audit entry.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Admin read/decide application | Workspace-scoped Admin authority | Allowed only for cafés in the Admin's workspace; outside scope is `404 NOT_FOUND` |
| Read latest café decision reason | Café owner may read their own café's latest reason | Workspace Admins allowed; everyone else denied |
| Modify a decision or audit history | Denied | Denied; approval is one-way, rejection reversal is not an Admin operation |

## Out of scope

OWN-01 owns the application details, rejected-application edit/resubmission and
owner-side latest-decision-reason display. No owner routes or fields are added.
Audit display is [ADM-03](ADM-03-review-moderation.md); this story owns decision
audit creation only. Role navigation and accessible/responsive core behavior
follow [SYS-05](../TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access)
and [SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.
