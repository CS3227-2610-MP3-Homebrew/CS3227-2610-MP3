# SYS-03: Role navigation

- **Related specs:** [Source story: PRODUCT-SPEC, User stories / Shared](../PRODUCT-SPEC.md#shared), [product screens](../PRODUCT-SPEC.md#navigation-per-role), [account destinations](../INTEGRATION-SPEC.md#account-browser-destinations), [streaming gates](../TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [role/RLS boundaries](../TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [workspace isolation](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [sign-up](SYS-01-sign-up.md), [sessions](SYS-02-sign-in-out.md), [Admin moderation home](ADM-03-review-moderation.md).
- **Role:** Signed-in Customer, Café owner or Admin

## Overview

Users enter a stable home and see only their role's MVP navigation. The Admin
home is the Moderation queue at `/admin/moderation`. Navigation offers entry
to existing product features; it does not add domain permissions or specify
their screen contents. Hidden links do not replace server authorization/RLS.

## Access

- **How a user gets the role:** Protected profile resolved after normal Customer/owner sign-up or existing main/kit provisioning; one fixed role per account.
- **What it can see and change:** Its own role navigation and authorized screens/records within its existing workspace under the owning stories.
- **What it can never do:** Select a new role/workspace, reach another role's protected content through a URL or prefetched shell, or gain permission by changing navigation inputs.

## Requirements

### `SYS-03`: Show navigation for the signed-in role

- **User story:** As a signed-in user, I want to see only my own role's screens and navigation, so that I can use the features appropriate to my role.
- **Priority:** High
- **Risk:** High — role navigation must resolve from verified authority and remain safe on direct links and session failures.

#### Acceptance criteria

- **`SYS-03.1`:** Given a verified Customer, Café owner or Admin profile, when `/` or that role's successful authentication destination is resolved, then the home is `/customer/cafes`, `/owner/dashboard` or `/admin/moderation` respectively under the [destination contract](../INTEGRATION-SPEC.md#account-browser-destinations). Main and kit accounts use the same paths inside their own workspaces; no client-supplied role/workspace selects the destination.
- **`SYS-03.2`:** Given an anonymous visitor, when `/` or a protected role screen is opened, then the browser is sent to `/sign-in` without protected content; expired/invalid sessions use SYS-02's session-ended destination. Given an already authenticated valid profile, opening `/sign-up` or `/sign-in` redirects to its role home without replacing the session.
- **`SYS-03.3`:** Given a valid signed-in profile requests another role's protected browser screen, when the SYS-05 role check runs, then it redirects to that caller's own role home without rendering the requested role's protected content. Domain API requests retain their existing 401/403/record-scope errors rather than receiving browser redirects.
- **`SYS-03.4`:** Given a Customer role screen, when navigation renders, then Browse cafés and My orders lead to the corresponding CUS-01/CUS-04 screens and Sign out uses SYS-02. Café page, Pre-order and Review form are reached contextually through their owning Customer flows, not new global screens; no owner/Admin or stretch navigation appears.
- **`SYS-03.5`:** Given a Café owner role screen, when navigation renders, then it offers Café application, Dashboard (including sales/Prep Advisor in their owning stories), Order queue, Menu, Café profile (including hours/pickup rules) and SYS-02 Sign out; no Customer/Admin or stretch navigation appears. Given the owner has no café, `/owner/dashboard` displays a minimal no-café state with a Café application link to `/owner/application` instead of fabricated sales/queue data; owner-domain form/status contents remain OWN-01–OWN-07's contracts.
- **`SYS-03.6`:** Given an Admin role screen, when navigation renders, then it offers Moderation queue (`/admin/moderation`, also home), Café applications (`/admin/applications`), Cafés (`/admin/cafes`), Audit log (`/admin/audit`) and SYS-02 Sign out; no Customer/owner or stretch links appear. Screen behavior and per-record permissions remain ADM-01–ADM-04's contracts.
- **`SYS-03.7`:** Given a requested destination in a query, body, form field or external link, when account login/home routing completes, then it always uses the server's fixed own-role home; it neither retains a requested path nor follows a supplied return URL. Account success responses use only the fixed destination allowlist, and unknown notice text cannot become rendered HTML, messages or a redirect target.
- **`SYS-03.8`:** Given profile/session verification is unavailable or a verified Auth user has an invalid/missing protected profile, when root/account/role navigation is resolved, then SYS-02's retry or account-unavailable state appears without protected role content or a fabricated home. No automatic role repair/selection or redirect loop through sign-in is introduced; Sign out remains available for the account-unavailable state.

#### Edge cases and failure paths

Navigation does not select a workspace: main/kit scope remains SYS-12. Every
direct protected read/mutation and streamed screen remains subject to SYS-05
and the owning role/record contract. A loading shell contains no protected data
or unverified role navigation. An owner without a café gets an application
entry point, not a sample café, created application, sales result or added
approval permission. Session-source errors cannot be mistaken for an empty
domain screen. The shell links the product's MVP screens; feature availability
does not change the fixed home into another role's route.

#### Out of scope

Role/workspace switching, account administration, stretch links, new domain
screens and return-to-requested-destination logic. Navigation defines screen
entry points, not café cardinality, application lifecycle, catalogue/queue
contents or additional domain API routes.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/` | Resolves anonymous versus verified role home; safe source/profile failures | Follow server-selected home/sign-in; explicit retry or Sign out on failure | SYS-03 |
| `/customer/cafes` role shell | Customer MVP navigation; CUS-01 owns Browse content | Browse cafés; My orders; Sign out; contextual flows remain Customer-owned | SYS-03 |
| `/owner/dashboard` role shell | Owner MVP navigation; no-café application entry state; domain dashboard otherwise owner-owned | Owner navigation; `/owner/application` entry; Sign out | SYS-03 |
| `/admin/moderation` role shell | Admin MVP navigation; ADM-03 owns moderation content | Moderation queue; Café applications; Cafés; Audit log; Sign out | SYS-03 |

## Use cases

### `UC-SYS-03-1`: Enter and navigate the correct role UI

- **Actor:** Signed-in Customer, Café owner or Admin.
- **Preconditions:** Valid session and protected profile in a main or kit workspace.
- **Main success scenario:**
  1. User opens `/` or completes authentication.
  2. The verified profile resolves the fixed role home.
  3. The home renders its role navigation after the SYS-05 checks.
  4. User selects an allowed navigation entry and reaches the owning role screen within existing record/workspace permissions.
- **Extensions:** Step 1: anonymous/expired sessions follow sign-in destinations. Step 2: source outage shows retry state; invalid profile shows account unavailable with Sign out. Step 3: owner without café sees application entry instead of fabricated dashboard data. Step 4: wrong-role URLs redirect to own home; ordinary domain denials retain their owning contracts. A caller-supplied return destination is ignored throughout.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Resolve role home/navigation | Verified protected profile's fixed role/workspace only | Cannot select another user's identity, role or workspace |
| Open role screen | Own role; underlying story/record scopes still required | No additional record permission implied by visible navigation |
| Open wrong-role browser URL | Redirect to own home without target content | No protected content from the requested role |
| Change role/workspace or access another workspace | Denied | Denied |

## Out of scope

Detailed role-screen content and data mutations, role changes, workspace
switching and stretch navigation. Existing foundation SYS-05/SYS-06/SYS-12
criteria retain technical ownership; this story owns the fixed destinations
and visible shell behavior. Core accessible/responsive behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.
