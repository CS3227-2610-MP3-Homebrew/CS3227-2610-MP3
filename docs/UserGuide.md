# Homebrew User Guide

## Table of contents

- [1. Getting started](#1-getting-started)
- [2. Navigating Homebrew](#2-navigating-homebrew)
- [3. Your account (all roles)](#3-your-account-all-roles)
- [4. Customer guide](#4-customer-guide)
- [5. Café owner guide](#5-café-owner-guide)
- [6. Admin guide](#6-admin-guide)
  - [6.1 Moderate a review](#61-moderate-a-review)
  - [6.2 Inspect the audit log](#62-inspect-the-audit-log)
  - [6.3 Decide a café application](#63-decide-a-café-application)
  - [6.4 Suspend or un-suspend a café](#64-suspend-or-un-suspend-a-café)
- [7. AI features](#7-ai-features)
- [8. Reference](#8-reference)
- [9. Known limitations](#9-known-limitations)
- [10. Troubleshooting](#10-troubleshooting)

## 1. Getting started

Homebrew provides sign-up, sign-in, sign-out and navigation for your account's
role. Admins can decide café applications, suspend or un-suspend approved cafés,
manually moderate reviews and inspect their workspace’s audit log.
Customer browsing/ordering and owner café-management screens are not yet available.

### 1.1 What you need

Open the app address supplied by your team. Opening `/` sends an anonymous
visitor to Sign in and a verified signed-in user to their role's home.

### 1.2 Create an account

**Where:** Sign in → **Sign up**, or `/sign-up`.

1. Enter your **Email** and **Password**.
2. Under **Choose your role**, choose **Customer** or **Café owner**. Neither is
   selected for you; Admin is not a sign-up option.
3. Select **Sign up**. While the request runs, the form is disabled and shows
   “Please wait…”.
4. Successful registration signs you in and opens Browse cafés for a Customer,
   or Dashboard for a Café owner.

Use a valid email address, at most 254 characters after surrounding spaces are
removed and letters converted to lowercase. A new password needs at least eight
Unicode code points and at most 72 UTF-8 bytes; some characters use several
bytes. Password spaces and letter case are preserved.

Invalid local fields show “Enter a valid email address.”, “Use at least 8
characters and at most 72 UTF-8 bytes.” or “Choose Customer or Café owner.”
After a submitted failure, email and role remain, but the password clears.

If creation succeeds but the initial session cannot be established, Sign in
shows “Account created. Sign in to continue.” Use the account you just created.

### 1.3 Sign in and sign out

**Where:** `/sign-in`; **Sign out** is in each role's navigation.

1. Enter your **Email** and **Password**, then select **Sign in**. You do not
   choose a role or workspace.
2. A successful sign-in opens the home for your existing account. Existing main
   and demo-kit credentials use the same form and retain their assigned role.
3. Select **Sign out** to end this browser's session and return to Sign in.
   A separately signed-in browser is not deliberately signed out.

Unknown email and incorrect password both show “Email or password is incorrect.”
Invalid local sign-in passwords show “Enter your password (at most 72 UTF-8
bytes).” While a request is pending the form is disabled; after a submitted
failure your email remains and your password clears.

A verified session can persist across browser reopening while it can still be
refreshed. There is no Remember me option or custom idle timer. If the session
ends, Sign in shows “Your session ended. Sign in again.”

If local sign-out succeeds but remote revocation cannot be confirmed, Sign in
shows “Signed out of this browser; session revocation could not be confirmed.”
A failed network request instead shows “Unable to complete the request. Try
again.” and does not confirm that sign-out succeeded.

### 1.4 Roles at a glance

| Account role | Home | Navigation entries, plus Sign out |
| --- | --- | --- |
| Customer | Browse cafés (`/customer/cafes`) | Browse cafés; My orders |
| Café owner | Dashboard (`/owner/dashboard`) | Café application; Dashboard; Order queue; Menu; Café profile |
| Admin | Moderation queue (`/admin/moderation`) | Moderation queue; Café applications; Cafés; Audit log |

The Admin entries provide the tools described in section 6.
Customer and owner entries currently open role page headings or the owner no-café state.

### 1.5 Demo accounts for testers

Existing demo-kit credentials can sign in, but this build has no Create demo kit
control or credential display. Obtain approved test credentials through your
team; this guide publishes no credentials.

## 2. Navigating Homebrew

Use your role's navigation links after signing in. Opening `/`, Sign in or Sign
up while your account is verified returns you to your role's home. Opening
another role's page also returns you to your own home. A supplied return URL
does not change the destination, and there is no role/workspace switcher.

While account verification runs, the public loading state says “Checking
account…”. Role navigation appears only after verification succeeds.

## 3. Your account (all roles)

If you see “Account access is unavailable. Sign out and try again.”, use the
**Sign out** button. This state does not offer a new role choice or automatically
repair the account.

If you see “Account service is temporarily unavailable. Try again.”, try again
explicitly after the service recovers. On the standalone failure screen, **Try
again** reloads the page; on a form, submit again when ready. There is no
automatic resubmission.

## 4. Customer guide

### 4.1 Customer features at a glance

Customer navigation is available as listed above. Catalogue results, café
details, pickup ordering and reviews are not yet implemented on these pages.

## 5. Café owner guide

### 5.1 Café owner features at a glance

**Where:** **Dashboard** → **Café application**.

1. Sign in as a Café owner and open Dashboard.
2. If your account has no café, it shows “You do not have a café yet.”
3. Select **Café application** to open the application entry page at
   `/owner/application`.

The entry page currently contains a heading; it does not submit an application.
Sales, order queue, menu and café profile tools are not yet implemented here.

## 6. Admin guide

### 6.1 Moderate a review

Admins can moderate reviews in their own workspace, including reviews for
suspended cafés. Existing main and demo-kit Admin accounts use the same controls.

**Where:** Admin navigation → **Moderation queue**, or `/admin/moderation`.

1. Select **Pending**, **Kept** or **Hidden**. Pending opens by default.
2. Read the café name, rating, unchanged review text, Singapore submission time
   and state. Rows show oldest submissions first, with review reference breaking
   ties. Use **Previous** and **Next**; tab and page remain in the URL. Page size
   is configured by the operator, from 1 to 20 reviews.
3. Select **Keep** or **Hide** on Pending, **Hide** on Kept, or **Restore** on
   Hidden. Enter the **Keep reason**, **Hide reason** or **Restore reason**.
4. Type a reason or select **Looks fine**, **Spam**, **Abusive**, **Off-topic**
   or **Prompt-injection attempt**, then edit it if needed. These are fixed
   application choices. A reason must contain non-whitespace text and be at
   most 300 Unicode code points; otherwise “Enter a reason of 1–300 characters.”
   appears. Valid reasons retain their spaces and wording exactly.
5. Select **Confirm Keep**, **Confirm Hide** or **Confirm Restore**. **Cancel**
   closes the reason controls without submitting. Opening controls or selecting
   a reason alone does not moderate the review. While saving, “Saving…” appears
   and the action controls are disabled.
6. After success, the queue refreshes. Keep moves Pending to Kept, Hide moves
   Pending or Kept to Hidden, and Restore moves Hidden to Kept. Text and rating
   stay unchanged; each successful action records one audit entry. A failed
   action changes neither the review nor its audit history.

An empty tab says “No reviews in this tab.” If another action changed the review,
“Review record changed. Current state: pending.” (or `kept` / `hidden`) appears;
review the refreshed row before choosing another action. Save failures show
“Unable to save. Check your reason and try again.” or “Unable to save. Try again.”
A loading queue says “Loading reviews…”. If loading fails, “Unable to load
reviews.” provides **Try again**.

### 6.2 Inspect the audit log

The read-only audit log shows Admin actions in your workspace.

**Where:** Admin navigation → **Audit log**, or `/admin/audit`.

1. Select **all**, **approve**, **reject**, **suspend**, **un-suspend**, **keep**,
   **hide** or **restore**. These filters display recorded actions; they do not
   perform café actions.
2. Read **Time (Singapore)**, **Admin** (the acting Admin’s email), **Action**,
   **Target** and **Reason**. Targets show the café name and the café or review
   reference. Review text and internal AI-use events do
   not appear here. Reasons display as plain text.
3. Use **Previous** and **Next** for 50-entry pages, newest first with entry
   reference breaking ties. Filter and page remain in the URL.

No matches shows “No audit entries.” with filter navigation retained. Loading
shows “Loading audit…”. A failure shows “Unable to load audit entries.” with
**Try again**. Earlier entries remain when a later action changes the same
review; the screen offers no history editing or deletion.

### 6.3 Decide a café application

Admins can approve or reject pending applications in their own workspace.
Main and demo-kit Admins use the same controls within their own workspace.

**Where:** Admin navigation → **Café applications**, or `/admin/applications`.

1. Read the pending applications, oldest submission first. Each shows the café
   name, description, area, pickup address, weekly Singapore hours, pickup cutoff
   and submission time. Use **Previous** and **Next** for 20-row pages; the page
   stays in the URL.
2. Choose **Approve** or **Reject**, enter a nonblank reason of at most 300
   characters, then select **Confirm Approve** or **Confirm Reject**. **Cancel**
   closes the controls without saving.
3. After success, the application leaves the pending list and its action appears
   in **Audit log**. Approved, non-suspended cafés become eligible for customer
   access; rejected cafés remain hidden. Approval cannot be reversed here.

Reasons retain their submitted text and spacing. They are private to that café's
owner and Admins in its workspace. The audit log displays them as plain text.
An empty queue shows “No pending applications.” Loading shows “Loading cafés…”.

### 6.4 Suspend or un-suspend a café

Admins can change the suspension state of approved cafés in their own workspace.

**Where:** Admin navigation → **Cafés**, or `/admin/cafes` (heading **Approved cafés**).

1. Find the café in the alphabetical list and read **Suspension state**. Use
   **Previous** and **Next** for 20-row pages. Pending/rejected applications do
   not appear in this list.
2. Choose **Suspend** or **Un-suspend**, enter a nonblank reason of at most 300
   characters, then select the corresponding **Confirm** button.
3. The row shows its new state and opposite action, and **Audit log** records
   the change. Suspension hides the café from customer access and cancels its
   outstanding pending, accepted and ready orders with “Cafe is suspended”.
   Collected purchases and existing menu/hour/review records remain unchanged.
   Un-suspension restores eligibility without reviving cancelled orders.

The Admin reason remains private; the fixed cancellation reason does not reveal
it. Owner access to retained café records remains available. Owner management
screens and Customer order displays are still outside this build.
An empty list shows “No approved cafés.” Loading shows “Loading cafés…”.

Both café screens show “Enter a reason of 1–300 characters.” for an invalid
reason. A stale confirmation reports the current state, for example “Café record
changed. Current state: rejected.”, and refreshes the list. A failed save shows “Unable to
save. Check your reason and try again.” or “Unable to save. Try again.” A list
source failure shows “Unable to load cafés.” with **Try again**; it is not an
empty-list result. Failed actions do not leave a partial state change or audit.

## 7. AI features

No AI feature screen is available in this build.

## 8. Reference

Sign-in accepts an existing nonempty password up to 72 UTF-8 bytes, without
applying sign-up's eight-code-point minimum or changing its spaces/case.

## 9. Known limitations

Customer and Café owner domain tools remain entry shells.
Demo-kit creation, account password/email changes,
password reset, account deletion, role/workspace switching and all-device
sign-out are not available in the current account UI.

## 10. Troubleshooting

| Message | What to do |
| --- | --- |
| “Unable to create account. Try signing in.” | Try Sign in rather than assuming a new account was created. |
| “Unable to complete account setup. Try again.” | Retry sign-up explicitly when ready. |
| “Account setup could not be completed. Try signing in; account access is unavailable until setup is resolved.” | Try Sign in; access may remain unavailable until setup is resolved. |
| “Too many attempts. Try again later.” | Wait before trying again. |
| “An account is already signed in.” | Use that account or sign out before signing in to another. |
| “Check the account fields and try again.” | Review the email, password and sign-up role, then submit again. |
| “Unable to complete the request. Try again.” | Check connectivity and retry explicitly; the message does not confirm success. |
