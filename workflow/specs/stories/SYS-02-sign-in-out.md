# SYS-02: Sign in and sign out

- **Related specs:** [Source story: PRODUCT-SPEC, User stories / Shared](../PRODUCT-SPEC.md#shared), [account HTTP contract](../INTEGRATION-SPEC.md#shared-account-contracts), [streaming authentication](../TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [roles](../TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [demo accounts](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [sign-up](SYS-01-sign-up.md), [role navigation](SYS-03-role-navigation.md).
- **Role:** Customer, Café owner or Admin ending or starting their own session

## Overview

All accounts, including main and demo-kit Admins, use the same email/password
sign-in. Sessions use Supabase's normal persistent cookie/refresh behavior,
without a Remember me checkbox or custom idle timer. Sign out ends this
browser's session and describes remote-revocation uncertainty honestly.

## Access

- **How a user gets the role:** Customer/owner sign-up or existing maintenance/demo provisioning; credentials never select or change a role. The protected profile resolves role/workspace.
- **What it can see and change:** Its current browser session and its own role home after verification; kit credentials sign in to their existing kit workspace.
- **What it can never do:** Switch workspace/role by supplying login fields, select an Admin role at sign-up, end other browsers' sessions through this flow, or read protected data on a failed check.

## Requirements

### `SYS-02`: Start and end an account session

- **User story:** As a user, I want to sign in and sign out, so that I can access and end my account session.
- **Priority:** High
- **Risk:** High — credential errors, cookie effects and unavailable verification must not expose protected data or falsely claim session completion.

#### Acceptance criteria

- **`SYS-02.1`:** Given an anonymous visitor opens `/sign-in`, when it renders, then labelled email/password inputs, Sign in, a Sign up link to `/sign-up` and the existing Create demo kit control are present; there is no role/workspace selector or Remember me checkbox. Demo creation and once-shown credentials remain SYS-12/SEC-10's contract rather than a second account provisioning flow.
- **`SYS-02.2`:** Given a sign-in submission, when browser feedback and server validation run, then email uses the [account field contract](../INTEGRATION-SPEC.md#account-fields-and-validation), password is nonempty and at most 72 UTF-8 bytes without trimming or a new-account minimum, and exactly `{email,password}` is accepted. Invalid fields show field errors and server `400 INVALID_REQUEST`; unknown keys are rejected.
- **`SYS-02.3`:** Given valid credentials and a valid protected profile, when `POST /api/auth/sign-in` succeeds, then HTTP `200` returns exactly `{requestId, redirectTo}`, persistent session cookies are set and the browser opens SYS-03's own-role home. The same flow works for main and kit Customer/owner/Admin accounts without changing their role/workspace, returning tokens in JSON or retaining a requested destination.
- **`SYS-02.4`:** Given an unknown email or incorrect password, when sign-in is attempted, then both return `401 UNAUTHENTICATED` with “Email or password is incorrect.” and no protected content or role home. While submission is pending repeat submission is disabled; after a submitted failure email remains and password clears. Temporary service/throttle errors use the safe linked retry mapping with no automatic retry or provider detail.
- **`SYS-02.5`:** Given a verified Auth user with no valid protected profile, when sign-in or subsequent account resolution completes, then no role home or application access is granted and the account-unavailable state offers Sign out; no role choice or automatic repair is added. An unavailable verification source instead shows the distinct retry state under the [account result contract](../INTEGRATION-SPEC.md#account-results-and-failures).
- **`SYS-02.6`:** Given an expired/invalid session while accessing a protected browser screen, when the SYS-05 gate runs, then the destination is `/sign-in?notice=session-ended`, showing “Your session ended. Sign in again.” with no protected content. An anonymous visitor without a session goes to `/sign-in`. A temporary Auth/profile-service outage shows a plain retry state with no protected content, no automatic retry and no bad-password claim; protected JSON endpoints retain their defined safe error semantics.
- **`SYS-02.7`:** Given a successful sign-in and no explicit sign-out, when the browser closes/reopens and Supabase can still verify/refresh the session, then the user can return to their own role UI without another credential entry; no app-specific lifetime, idle timer or Remember me choice is introduced. Expired/invalid/revoked access still follows SYS-05 and SYS-02.6.
- **`SYS-02.8`:** Given this browser has a session, when Sign out submits `POST /api/auth/sign-out` with exactly `{}` and remote local-session revocation succeeds, then this browser's session cookies clear, HTTP `200` returns exactly `{requestId, redirectTo: "/sign-in"}`, and the browser opens sign-in. Other browser sessions are not deliberately revoked; subsequent protected requests from this browser require authentication under SYS-05.
- **`SYS-02.9`:** Given the sign-out endpoint is reached but remote revocation fails, when its response returns, then this browser's cookies still clear and HTTP `200` with exactly `{requestId, redirectTo: "/sign-in?notice=sign-out-unconfirmed"}` shows “Signed out of this browser; session revocation could not be confirmed.” No all-device sign-out or immediate revocation of previously issued access tokens is claimed.
- **`SYS-02.10`:** Given no local session, when the valid sign-out request is submitted, then it idempotently returns HTTP `200` with exactly `{requestId, redirectTo: "/sign-in"}` and clears any residual session cookies. Given an authenticated caller posts sign-in, the endpoint instead returns `409 STATE_CONFLICT` without replacing that account; browser form visits follow SYS-03.
- **`SYS-02.11`:** Given either session endpoint receives malformed/oversized JSON, wrong media type, unsupported method or invalid Origin, when requested, then the [account transport contract](../INTEGRATION-SPEC.md#account-transport-and-routes) supplies the shared 400/413/415/405/403 failure respectively without sign-in/sign-out effects. All responses are private/no-store; passwords, tokens, cookies and provider exceptions are absent from JSON and logs.

#### Edge cases and failure paths

Only a valid server response confirms cookie/session effects. A browser network
failure without a response shows a safe retry error and never claims sign-out
or sign-in succeeded. A reachable sign-out endpoint distinguishes remote
revocation failure from failure to submit the request. Passwords are not
retained after a submitted request fails; invalid local input has field
feedback. Credentials alone do not establish the persistent session: a new
attempt's profile validation/source failure clears provisional cookies and
shows account unavailable or retry, with no role redirect. Sign out is usable
even without cookies through its idempotent absent-session behavior. An
already-active account's 409 path never replaces or clears that session.
Back/prefetch navigation cannot restore access through private data
in static shells under SYS-05; this story adds no separate cache mechanism.

#### Out of scope

Password reset/change, email change, account deletion, social login, magic
links, role switching, cross-workspace login choices, custom lifetime settings
and global sign-out. Demo provisioning is SYS-12; refresh/streaming guards are
SYS-05 and are consumed rather than redefined here.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/sign-in` | Email/password, pending/field/credential/retry errors; fixed notice messages from the account contract | Sign in; Sign up; existing Create demo kit under SYS-12 | SYS-02 |
| Account-unavailable state | Safe unavailable message without role data or protected content | Sign out | SYS-02 |
| Session-source retry state | Safe service-unavailable message without protected content | Retry explicitly | SYS-02 |
| Role navigation | Sign out control for any role | Sign out from this browser | SYS-02; SYS-03 owns navigation |

## Use cases

### `UC-SYS-02-1`: Sign in using normal or kit credentials

- **Actor:** Existing Customer, Café owner or Admin.
- **Preconditions:** No active authenticated account in this browser; account credentials exist.
- **Main success scenario:**
  1. User opens `/sign-in`, enters email/password and submits.
  2. The server validates credentials and resolves the protected profile.
  3. Persistent session cookies are set and the response supplies the own-role destination.
  4. The browser opens that home within the account's existing workspace.
- **Extensions:** Step 1: field errors prevent valid submission. Step 2: unknown email/wrong password share the generic 401; source outages show retry feedback; missing/invalid profile gives account unavailable with Sign out. A failure clears password and keeps email. Expired later access returns to sign-in with the session-ended notice.

### `UC-SYS-02-2`: End this browser's session

- **Actor:** Any signed-in role, including an Auth user denied application access because of an invalid profile.
- **Preconditions:** Account endpoint reachable; a session may or may not exist locally.
- **Main success scenario:**
  1. User chooses Sign out.
  2. The same-origin endpoint revokes this session remotely and clears this browser's cookies.
  3. The browser follows the response to sign-in.
- **Extensions:** Step 2: absent session still clears residual cookies and succeeds. Remote revocation failure still clears local cookies and leads to the explicit unconfirmed-revocation notice. If no response is received, the browser reports failure without claiming sign-out. Invalid transport is rejected without session mutation.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Sign in | Credentials plus verified protected profile resolve only that account/workspace | No role/workspace/identity override |
| Sign out | This browser's local session and its corresponding remote session only | No global/all-browser revocation |
| Access after invalid/missing profile | Sign out only; no application role access | Denied |
| Read protected records | Existing role/workspace/record contracts apply after verification | No permission added by successful login alone |

## Out of scope

Credential/account lifecycle additions above and demo account creation logic.
Core accessible/responsive behavior follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.
