# ADM-03: Review moderation and audit log

- **Related specs:** [Product Admin stories](../PRODUCT-SPEC.md#admin), [ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [RLS](../TECHNICAL-SPEC.md#rls-and-database-exposure), [workspace isolation](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [schema vocabulary](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [confirmation](../AI-SECURITY-SPEC.md#sec-05--human-control-and-no-model-authority), [retention](../AI-SECURITY-SPEC.md#sec-09--content-free-audit-and-bounded-retention), [Moderation Assistant](ADM-04-moderation-assistant.md).
- **Role:** Admin

## Overview

Reviews use post-moderation: a newly created `pending` review is visible on an
eligible café's customer page until hidden. Pending means not yet moderated;
`kept` reviews remain visible and `hidden` reviews are not customer-visible.
Only pending and kept reviews contribute to ratings and visible-review counts;
the formula belongs to CUS-01/CUS-02. Review
creation and field constraints belong to CUS-05.
Text and rating are immutable after creation; customers cannot edit or delete
reviews in the MVP. Moderation changes state only.

The audit screen displays all successful Admin state changes, including café
decisions and suspension actions from [ADM-01](ADM-01-cafe-applications.md) and
[ADM-02](ADM-02-cafe-suspension.md), without exposing review text or AI-use logs.

## Access

- **How a user gets the role:** Maintenance creates the main Admin; demo kits create kit Admins; sign-up cannot create Admins.
- **What it can see and change:** All reviews, including reviews of suspended cafés, and Admin-action audit entries in its own workspace only. Main and kit Admins have identical operations within their workspace under SYS-12.2/SYS-12.12.
- **What it can never do:** Cross workspace boundaries, edit review text/rating, create Admins, change roles, edit/delete audit history, or read unrelated orders or sales.

## Requirements

### `ADM-03`: Moderate reviews and inspect Admin audit history

- **User story:** As an admin, I want a moderation queue where I can keep, hide or restore reviews with a reason without editing them and have every action recorded in an audit log, so that I can moderate reviews accountably.
- **Priority:** High
- **Risk:** High — review visibility and accountability require exact transitions, scope checks and atomic audit writes.

#### Acceptance criteria

- **`ADM-03.1`:** Given a newly created review whose initial state is `pending`, when customer-scoped review reads under RLS and SYS-05.3 are performed for an eligible café, then they return `pending` and `kept` reviews and never `hidden` reviews; CUS-02 owns customer page display, and CUS-01/CUS-02 own the rating formula using only pending and kept reviews.
- **`ADM-03.2`:** Given an Admin session, when `/admin/moderation` is opened, then the server-rendered queue offers Pending, Kept and Hidden tabs listing only that workspace's reviews in the corresponding state, including reviews for suspended cafés, oldest submitted first with ties by review reference, previous/next controls and page size equal to `AI_MODERATION_REVIEWS_PER_CALL` in the [security limits](../AI-SECURITY-SPEC.md#limits-and-configuration); tab and page selection are URL query parameters.
- **`ADM-03.3`:** Given a review row in `/admin/moderation`, when it renders, then it shows café name, rating, unchanged review text as escaped plain text, submitted time in `Asia/Singapore` and state; Pending rows offer Keep and Hide, Kept rows Hide, and Hidden rows Restore, each opening a reason field with ADM-04's fixed quick-pick reasons and a confirm button.
- **`ADM-03.4`:** Given an in-scope `pending` review and a valid reason, when the Admin confirms `POST /api/admin/reviews/{reviewId}/moderation` with exactly `{action: "keep", reason}`, then the response is HTTP `200` with exactly `{requestId, moderationState: "kept"}` as JSON under the shared `Cache-Control: private, no-store` conventions, it becomes `kept`, remains customer-visible on an eligible café page, moves to the Kept tab and commits exactly one `keep` Admin audit entry in the same transaction.
- **`ADM-03.5`:** Given an in-scope `pending` or `kept` review and a valid reason, when the Admin confirms the moderation route with exactly `{action: "hide", reason}`, then the response is HTTP `200` with exactly `{requestId, moderationState: "hidden"}` as JSON under the shared `Cache-Control: private, no-store` conventions, it becomes `hidden`, ceases to be customer-visible, moves to the Hidden tab and commits exactly one `hide` Admin audit entry in the same transaction.
- **`ADM-03.6`:** Given an in-scope `hidden` review and a valid reason, when the Admin confirms the moderation route with exactly `{action: "restore", reason}`, then the response is HTTP `200` with exactly `{requestId, moderationState: "kept"}` as JSON under the shared `Cache-Control: private, no-store` conventions, it becomes `kept`, becomes customer-visible on an eligible café page, moves to the Kept tab and commits exactly one `restore` Admin audit entry in the same transaction.
- **`ADM-03.7`:** Given any state/action combination other than pending→kept by Keep, pending→hidden or kept→hidden by Hide, and hidden→kept by Restore, when the moderation route is called, then it returns `409 STATE_CONFLICT`, changes nothing and writes no Admin audit entry; the queue tells the Admin the record changed and shows its current state. Concurrent conflicting confirmations cannot both commit against the same prior state.
- **`ADM-03.8`:** Given a moderation request, when reason is blank after whitespace trimming, exceeds 300 Unicode code points or fails integration `Reason`, then it returns `400 INVALID_REQUEST` with no change or Admin audit entry; valid reasons are stored exactly as submitted, without trimming or rewriting, and rendered as escaped plain text.
- **`ADM-03.9`:** Given no valid session, when the moderation route is called, then it returns `401 UNAUTHENTICATED`; given a Customer or Café owner session it returns `403 FORBIDDEN`; neither call returns protected data, changes a review or writes an Admin audit entry.
- **`ADM-03.10`:** Given an Admin and a missing review or one outside its workspace, when the moderation route is called, then both cases return indistinguishable `404 NOT_FOUND`, change nothing and write no Admin audit entry; cross-workspace reviews and audit entries are absent from `/admin/moderation` and `/admin/audit`.
- **`ADM-03.11`:** Given a kit Admin and its kit's seeded pending reviews under SYS-12.11, when it reads the queue, keeps/hides/restores eligible reviews and reads `/admin/audit`, then the same state, reason and exactly-one transactional audit controls apply as in the main workspace and only its own kit's records are accessible.
- **`ADM-03.12`:** Given any successful moderation action, when stored review and audit data are compared before and after, then original review text and rating are unchanged and exactly one append-only Admin audit entry contains acting Admin, action, review reference, exact reason and server timestamp; every failed/rejected request writes none, and audit-write failure commits no moderation change.
- **`ADM-03.13`:** Given an Admin opens `/admin/audit`, when entries are rendered, then only its workspace's Admin-action entries appear, newest first with ties by entry reference, 50 per page with previous/next, and action filters `approve`, `reject`, `suspend`, `un-suspend`, `keep`, `hide`, `restore` or all; filter and page selection live in URL query parameters.
- **`ADM-03.14`:** Given an audit row, when `/admin/audit` renders it, then its columns show time in `Asia/Singapore`, acting Admin's email, action, target and exact reason as escaped plain text; café targets show café name, review targets show café name and review reference; no review text or internal AI-use audit event appears.
- **`ADM-03.15`:** Given Admin-action audit entries exist, when retention cleanup runs or a later action changes the same target, then every earlier Admin entry remains append-only and is never automatically deleted; AI cleanup cannot delete these entries under SEC-09.2.
- **`ADM-03.16`:** Given a request to the moderation Route Handler, when origin, method, media type, target `Ref` or strict JSON violates the shared contracts, then the shared status/error applies without state or Admin audit effects; missing/malformed/mismatched Origin gives `403 FORBIDDEN`, unknown actions or extra fields including any AI label give `400 INVALID_REQUEST`, and all responses follow the shared error shape and `Cache-Control: private, no-store`; the path alone selects the target and the body carries only action and reason.
- **`ADM-03.17`:** Given an anonymous or wrong-role visitor to `/admin/moderation` or `/admin/audit`, when the role area renders, then SYS-05.1 redirects the anonymous visitor and returns no protected content to the wrong-role visitor; private queue/audit data is absent from static loading shells.
- **`ADM-03.18`:** Given any customer review after creation, when customer edit or deletion is attempted, then it is denied and the text, rating and review remain unchanged; Admin moderation also never edits text/rating or deletes the review, as required by SEC-05.2.

#### Edge cases and failure paths

Empty tabs and audit filters show an empty state with navigation retained.
Server authorization and RLS repeat for each read and mutation; UI controls do
not establish permission. Shared HTTP failures and transactional failures leave
no Admin state change or audit entry. The audit screen is read-only. A review
on a suspended café remains in the Admin queue while customer café eligibility
continues to follow SYS-05.3.

#### Out of scope

AI classification is [ADM-04](ADM-04-moderation-assistant.md); it grants no
moderation authority. Review creation/fields are CUS-05 and customer rating
formulas/displays are CUS-01/CUS-02.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/admin/moderation` | Workspace Pending, Kept and Hidden tabs; café, rating, escaped review text, Singapore submitted time, state; empty/conflict states; URL tab/page | Previous/next; Keep/Hide on Pending, Hide on Kept, Restore on Hidden, reason quick-picks/custom input and per-review confirmation | ADM-03 |
| `/admin/audit` | Workspace Admin-action audit only; Singapore time, Admin email, action, café name and (for review targets) review reference, escaped reason; URL action filter/page | Filter by action/all; previous/next | ADM-03 |

## Use cases

### `UC-ADM-03-1`: Moderate one review

- **Actor:** Admin within its main or kit workspace.
- **Preconditions:** Valid Admin session; target review in scope.
- **Main success scenario:**
  1. Admin opens a queue tab and reads a review.
  2. Admin chooses an available action, selects/edits/types a reason and confirms that review.
  3. The moderation route validates scope, reason and current state, then atomically changes state and creates one audit entry.
  4. The review appears in its resulting tab with unchanged text and rating.
- **Extensions:** At step 2, invalid reason returns `400 INVALID_REQUEST`; at step 3, missing/out-of-workspace target gives `404 NOT_FOUND`, invalid current state gives `409 STATE_CONFLICT` with current-state feedback, and failure commits neither change nor audit.

### `UC-ADM-03-2`: Inspect Admin actions

- **Actor:** Admin within its workspace.
- **Preconditions:** Valid Admin session.
- **Main success scenario:**
  1. Admin opens `/admin/audit` and selects an action filter or all.
  2. The page shows only workspace Admin entries in the defined order with previous/next navigation.
- **Extensions:** At step 2, no matching entries gives an empty state; AI-use events never appear. At every step another workspace's records remain inaccessible.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Admin read/moderate reviews | Authority derives from workspace, not authorship | All reviews in the Admin's workspace, including suspended cafés; outside scope is `404 NOT_FOUND` |
| Admin read audit | Workspace entries only | Allowed only within own workspace, including acting Admin email solely for audit display; no unrelated profile access |
| Customer read review | Own reviews under the data model | Only pending/kept reviews on eligible café pages; no Admin audit access |
| Customer edit/delete review | Denied after creation | Denied |
| Admin edit review text/rating or audit history | Denied | Denied |

## Out of scope

CUS-05 owns creation, one-review-per-collected-order
eligibility and review fields; it must preserve the immutability and initial
pending state above. CUS-01/CUS-02 own rating
formulas and customer displays and must count only pending/kept reviews.
AI-use audit remains internal under SEC-09. Core accessibility and responsiveness
follow [SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.
