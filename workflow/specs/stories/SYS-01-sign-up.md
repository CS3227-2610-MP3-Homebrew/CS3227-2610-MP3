# SYS-01: Sign up

- **Related specs:** [Source story: PRODUCT-SPEC, User stories / Shared](../PRODUCT-SPEC.md#shared), [account HTTP contract](../INTEGRATION-SPEC.md#shared-account-contracts), [role/workspace enforcement](../TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [main workspace](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [sessions](SYS-02-sign-in-out.md), [role homes](SYS-03-role-navigation.md).
- **Role:** New user choosing Customer or Café owner

## Overview

A new user creates an email/password account with one fixed role and enters
that role's Homebrew home. Sign-up collects credentials, role and a required name for Customers only.
Customer names are trimmed, 2–100 Unicode code points and need not be unique;
the server stores the name on the protected profile for order-name snapshots. No confirmation email or additional onboarding screen is
required. Normal sign-ups join the main workspace; demo-kit provisioning is a
separate contract.

## Access

- **How a user gets the role:** Explicitly selects Customer or Café owner at sign-up; neither is preselected. The role is fixed for this account in the MVP.
- **What it can see and change:** Its own sign-up inputs and resulting session; protected profile creation is limited to the validated selection and main workspace under SYS-06/SYS-12.
- **What it can never do:** Create an Admin, select/reassign a workspace, change another account, change roles or use another user's identity. Admin creation remains with maintenance/demo provisioning.

## Requirements

### `SYS-01`: Create an account in a chosen role

- **User story:** As a new user, I want to sign up and choose Customer or Café owner, so that I can use Homebrew in my chosen role.
- **Priority:** High
- **Risk:** High — credential handling, partial provisioning and role selection must not create unauthorized or unusable application access.

#### Acceptance criteria

- **`SYS-01.1`:** Given an anonymous visitor to `/sign-up`, when the form renders, then it contains labelled email and password inputs, required Customer/Café owner selection with neither selected, a Sign up submit action and Sign in link to `/sign-in`; a labelled Customer name input is shown and required only when Customer is selected, and there is no password confirmation, Admin option or workspace control.
- **`SYS-01.2`:** Given submitted sign-up fields, when validation runs, then both browser feedback and the server enforce the [account field contract](../INTEGRATION-SPEC.md#account-fields-and-validation): normalized valid email, password of at least 8 Unicode code points and at most 72 UTF-8 bytes without trimming/composition rules, exactly `customer` or `owner`, and a trimmed 2–100-code-point customerName only for Customer registration, without uniqueness checking; owner requests must omit that key. Invalid fields show field feedback, return `400 INVALID_REQUEST` server-side and create no account. Unknown fields, including workspace/identity/metadata overrides, are invalid.
- **`SYS-01.3`:** Given valid unused credentials and an explicit permitted role, when `POST /api/auth/sign-up` completes account/profile/session creation, then the response is HTTP `200` with exactly `{requestId, redirectTo}`, sets the persistent session cookies, and the browser opens SYS-03's home for that role. Customer registration persists the validated name together with the protected profile before reporting success; name/profile persistence failure follows SYS-01.5. The role comes from the protected profile and the account is in the main workspace under SYS-06/SYS-12; email confirmation is off and no extra onboarding screen intervenes.
- **`SYS-01.4`:** Given an already registered email, when registration is submitted, then the response is `409 STATE_CONFLICT` with exactly the shared error envelope and message “Unable to create account. Try signing in.”; the existing account, role, workspace and session are not changed. There is no implicit account linking or role reassignment.
- **`SYS-01.5`:** Given Auth creates a new account but protected-profile creation fails, when the request is completed, then no successful registration or application access is reported, removal of only the Auth identity newly created by that request is attempted, and the safe retry failure from the [partial creation contract](../INTEGRATION-SPEC.md#account-results-and-failures) is displayed. If removal fails, the response explicitly reports account setup failure, grants no application access and performs no automatic repeated registration or profile repair.
- **`SYS-01.6`:** Given account and protected profile creation succeed but initial session establishment fails, when the sign-up request returns, then the account is retained, no authenticated role-home outcome is claimed, and HTTP `200` with exactly `{requestId, redirectTo: "/sign-in?notice=account-created"}` leads to “Account created. Sign in to continue.” and the ordinary sign-in form.
- **`SYS-01.7`:** Given a submitted registration is pending, when the form is observed or clicked again, then repeat submission is disabled; after a submitted request fails, email/role/customer name remain, the password is cleared and safe feedback is shown. Temporary Auth/rate-limit errors use the linked safe error mapping without automatic retry, provider detail, submitted values or validation-library dumps.
- **`SYS-01.8`:** Given an already authenticated caller posts sign-up, when the request reaches the account operation, then it returns `409 STATE_CONFLICT` without replacing the active account or creating another account. Browser visits to account forms follow SYS-03, including its profile/source failure states.
- **`SYS-01.9`:** Given malformed/oversized requests, wrong media type, an unsupported method or missing/malformed/mismatched Origin, when the sign-up endpoint is requested, then the exact [account transport contract](../INTEGRATION-SPEC.md#account-transport-and-routes) returns the shared 400/413/415/405/403 error respectively before account mutation, with private/no-store JSON and no credential/token response.

#### Edge cases and failure paths

The server applies the same validation regardless of browser controls. Concurrent
duplicate registration cannot replace an existing identity; a duplicate response
does not authorize deleting that identity during cleanup. Partial creation never
grants application access without a valid protected profile; profile-creation
failure clears this attempt's provisional session cookies regardless of cleanup
outcome. A network failure
without a confirmed response is a safe retry error, not proof that an account
was or was not created; a later duplicate follows SYS-01.4. No automatic retry,
new idempotency service or account-repair screen is added.

#### Out of scope

Later customer-name editing, password confirmation, email verification, account editing,
password recovery/change, deletion, role switching and multiple roles per
account. Demo kits and Admin provisioning remain SYS-12/SYS-13.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/sign-up` | Email/password, unselected required role options, conditional required Customer name, field errors, pending, safe registration/setup/retry failures | Sign up; Sign in | SYS-01 |
| `/sign-in?notice=account-created` | Account-created/sign-in-needed message and ordinary sign-in form | Sign in under SYS-02 | SYS-01; SYS-02 owns sign-in |

## Use cases

### `UC-SYS-01-1`: Create a Customer or Café owner account

- **Actor:** New user.
- **Preconditions:** No authenticated account is active in this browser; email is not registered.
- **Main success scenario:**
  1. User opens `/sign-up`, enters email/password, explicitly selects a role and supplies the required name when choosing Customer.
  2. User submits; browser and server validate the fields under the account contract.
  3. The account and protected main-workspace profile are created and the session is established.
  4. The browser follows the server's role-home destination.
- **Extensions:** Step 2: invalid fields show field errors with no account creation. Step 3: duplicate email gives the generic sign-in suggestion; profile failure triggers bounded cleanup of only the new identity and safe failure, including explicit failed-cleanup feedback. Step 3: completed profile but missing initial session retains the account and leads to sign-in with the account-created notice. Any submitted failure retains email/role and clears the password.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Register anonymously | New credentials and explicit Customer/owner choice; main workspace only | Cannot claim/replace existing identity or profile |
| Cleanup failed profile creation | Only the Auth identity newly created by this request | Existing accounts are never deleted or changed |
| Create Admin/change role/workspace | Denied | Denied |

## Out of scope

Account lifecycle additions listed above; café registration details remain the
owner stories. Core accessible/responsive behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).
SYS-06/SYS-12 remain authoritative for technical authorization and RLS;
these criteria own the sign-up experience and HTTP integration only.

## Assumptions

None.
