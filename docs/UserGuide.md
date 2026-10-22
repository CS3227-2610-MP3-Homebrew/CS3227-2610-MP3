# Homebrew User Guide

## Table of contents

- [1. Getting started](#1-getting-started)
  - [1.5 Demo accounts for testers](#15-demo-accounts-for-testers)
- [2. Navigating Homebrew](#2-navigating-homebrew)
- [3. Your account (all roles)](#3-your-account-all-roles)
- [4. Customer guide](#4-customer-guide)
  - [4.1 Browse cafés](#41-browse-cafés)
  - [4.2 Inspect a café](#42-inspect-a-café)
  - [4.3 Pre-order for pickup](#43-pre-order-for-pickup)
  - [4.4 View and cancel your orders](#44-view-and-cancel-your-orders)
  - [4.5 Review a collected order](#45-review-a-collected-order)
- [5. Café owner guide](#5-café-owner-guide)
- [6. Admin guide](#6-admin-guide)
  - [6.1 Moderate a review](#61-moderate-a-review)
  - [6.2 Inspect the audit log](#62-inspect-the-audit-log)
  - [6.3 Decide a café application](#63-decide-a-café-application)
  - [6.4 Suspend or un-suspend a café](#64-suspend-or-un-suspend-a-café)
- [7. AI features](#7-ai-features)
  - [7.1 Triage pending reviews](#71-triage-pending-reviews)
- [8. Reference](#8-reference)
- [9. Known limitations](#9-known-limitations)
- [10. Troubleshooting](#10-troubleshooting)

## 1. Getting started

Homebrew provides sign-up, sign-in, sign-out and navigation for your account's
role. Admins can decide café applications, suspend or un-suspend approved cafés,
manually moderate reviews and inspect their workspace’s audit log. Customers
can browse cafés, inspect menus, opening hours and public reviews, place pickup
pre-orders with a valid protected account name, read order history, cancel pending orders, and review collected purchases.
Owner café management tools are not yet available.

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

Browse cafés provides the Customer tools in section 4; Moderation queue and
Audit log provide the Admin tools in section 6. My orders provides retained
purchases and pending-order cancellation; the remaining owner entries open
role page headings.

### 1.5 Demo accounts for testers

Anyone can create a separate demo workspace with Customer, Café owner and Admin
accounts without signing in.

**Where:** Sign in → **Try Homebrew** → **Create demo kit**.

1. Select **Create demo kit**. While the button is disabled, the page says
   “Creating your demo kit…”.
2. Save all three sets of **Email** and **Password** details before leaving the
   page. The page says “Save these credentials now. They are shown only here,
   once. Use the sign-in form above for each account.” Reloading or leaving
   clears the display; credentials cannot be retrieved later.
3. Enter one account's details in the ordinary sign-in form. To try another
   role, select **Sign out**, then sign in with that account's saved details.
4. As Customer, browse the approved café and its menu, including a sold-out item.
   As Admin, inspect the pending second café application and the clearly
   synthetic pending reviews. Approval, suspension and moderation controls use
   the ordinary reasons, confirmations and audit log within your kit.

Each kit also has about four weeks of sample collected purchases, unreviewed
collected orders and a pending order. New kit Customers can use Pre-order for
pickup and My orders, including pending-order cancellation. Review submission,
the owner queue and sales/Prep Advisor screens remain unavailable in this build. The pending café's separate owner has no published
credentials. Kits have no automatic expiry or deletion, and creating a kit
makes no AI request. Kit accounts keep their own AI user allowances while the
application's global AI limits remain shared.

Creation is limited across users to at most five kits per fixed ten-minute
window and thirty per Singapore calendar day. A refusal says “Demo kit limit
reached. Try again in N seconds.”, with the actual wait replacing N. Wait before
trying again. A temporary failure says “Demo kit service is temporarily
unavailable. Try again.” No account credentials are shown on failure.

After a successful maintenance run, ordinary main-workspace Customers can browse
**Homebrew Showcase**, an approved café with a menu and weekly opening hours.
Its seeded owner's credentials are not published. Use a demo kit for end-to-end
testing across roles: main-workspace café applications may remain pending
indefinitely. Maintenance preserves existing accounts and passwords and does
not delete or reset your kit.

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

### 4.1 Browse cafés

Signed-in Customers can browse approved, non-suspended cafés in their own
workspace, including closed cafés.

**Where:** Customer navigation → **Browse cafés**, or `/customer/cafes`.

1. Read café cards showing name, area, average rating and visible review count.
   Results show 20 cafés per page; use **Previous page** and **Next page**.
2. Choose **Opening time**: **All opening times**, **Open now**, or **Open at**.
   For Open at, enter **Date (Singapore)** and **Time**, then select **Apply**.
   The chosen time uses Singapore time regardless of your browser's timezone.
3. Optionally choose **Drink type** (coffee, matcha, tea, chocolate, juice or
   other) and **Area** (Central, North, South, East or West). All active filters
   must match. A drink type matches even if its menu item is sold out.
   Changing area, drink type or an opening mode other than Open at applies it
   immediately; completing Open at requires its date and time.
4. Select a card to inspect the café. Closed cards are greyed out but clickable.
   Select **All opening times** to remove the time filter, or **Reset** to clear
   every filter and return to the first page.

Ratings use the original ratings of pending and kept reviews, excluding hidden
reviews. The average displays one decimal place, rounding halves upward. Cafés
sort by the unrounded average, then more visible reviews, then café reference;
cafés without reviews appear last and show “No reviews yet”.

Card status describes the current time, even when Open at filters a future time.
Open cafés show “Open now”, or “closing soon” during the final 30 minutes,
including exactly 30 minutes before closing. Opening time is included and
closing time excluded; adjoining opening intervals remain continuous. Closed
cards show “Cafe opens at 24 Oct 2026, 9:00 AM SGT” (with the actual next opening)
or “No opening hours scheduled”.

No matches shows “No cafés match these filters.” Invalid URL filters show
“Invalid filters. Reset filters to try again.” with **Reset filters**. A source
failure shows “Cafés are temporarily unavailable. Try again.” rather than an
empty result; retry the page explicitly when ready.

### 4.2 Inspect a café

Customers can read the café's public information without placing an order.

**Where:** **Browse cafés** → select a café card, or `/customer/cafes/{cafeId}`.

1. Read the café name, area, description, **Pickup** address and rating summary.
2. Under **Menu**, read item names, drink types and SGD prices shown as `S$`
   amounts with exactly two decimal places. Items are ordered by name, then
   item reference; sold-out items remain visible with **Sold out**.
3. Read **Opening hours (SGT)**, ordered Monday to Sunday and by opening time.
   Overnight intervals include “(next day)”; these times use Singapore time.
4. Under **Reviews**, read original review text, rating out of five and Singapore
   submission time. The page labels each author **Verified customer**. Its public
   review response omits reviewer account names, emails and account identifiers.
   Only pending and kept reviews appear, newest first, with review reference
   breaking exact submission-time ties. Use **Previous reviews** and **Next
   reviews** for 20-review pages.
5. Select **Browse cafés** to return to the catalogue.

An empty menu shows “No menu items available.”; absent hours show “No opening
hours scheduled”; no visible reviews shows “No reviews yet”. Café, menu and
review content displays as text, including any HTML-like wording.

Each page read rechecks current eligibility. A closed café remains readable,
but a missing, unapproved, suspended or other-workspace café shows a not-found
page. A later read reflects reviews hidden or restored by an Admin without
rewriting their original text or rating. Invalid review pagination shows
“Invalid review page.” A source failure shows “Café information is temporarily
unavailable. Try again.”; retry explicitly when ready.

Choose **Pre-order for pickup** to select drinks and a pickup time. To review
a collected purchase, open **My orders** and follow section 4.5.

### 4.3 Pre-order for pickup

Customers with a valid name stored on their protected account can pre-order
drinks from one eligible café and pay at pickup.

**Where:** **Browse cafés** → select a café → **Pre-order for pickup**,
or `/customer/cafes/{cafeId}/pre-order`.

1. Under **Choose drinks**, enter quantities for the drinks you want. Zero leaves
   a drink unselected; a purchase permits 1–20 distinct drinks, each with quantity
   1–20. Sold-out drinks remain visible with disabled quantity controls.
2. Choose **Pickup time (Singapore)**. Choices cover today and the next six
   Singapore dates, on a 15-minute grid with at least 15 minutes' notice. They
   follow opening hours and the café's pickup cutoff; closing itself is excluded.
3. Review **Total**, shown in SGD with two decimal places, and select **Place
   pre-order**. The button shows “Placing order…” during submission. Success
   opens **My orders** with a pending order and retained drink/price details.
4. Pay at the counter when collecting your drinks. The form states “Payment at
   pickup. Pay at the counter when you collect your drinks.”

No available choices shows “No valid pickup slots are available within the next
seven dates.” and disables submission. Invalid selections show “Choose 1–20
drinks, quantities from 1–20, and a pickup slot.” A changed menu, price, pickup
rule or order state reports “The order, menu prices or pickup availability
changed. Review the current details before submitting again.” Use **Review
current menu and pickup choices** before resubmitting. The server repeats the
checks; an earlier café page does not guarantee a successful purchase.

An uncertain submission reports “Unable to confirm this order. Try again with
the same selection; a retry will not create a duplicate.” Retry on that form
without reloading to retain its submission key. If the pre-order source cannot
be read, the page shows “Pre-order information is temporarily unavailable. Try
again.”

**Account limitation:** current sign-up and older unnamed accounts do not
populate the required Customer name. New demo-kit Customers have a protected
name and can order. Unnamed accounts receive “Customer name is
unavailable. Account setup must be completed before ordering.” and no order is
created. There is no account-name repair control in this build; the available
ordering flow is available to new demo-kit Customers and named local test accounts.

### 4.4 View and cancel your orders

Customers can read their own order history and cancel pending orders.

**Where:** Customer navigation → **My orders**, or `/customer/orders`.

1. Read the retained café name, order reference, state, drinks, quantities, unit
   prices, line totals and overall SGD total. Pickup and lifecycle times use
   Singapore time (SGT). Later menu, price or opening-hour changes do not rewrite
   these purchase details.
2. Orders appear newest first, with order reference breaking placement-time
   ties. Use **Previous orders** and **Next orders** for 20-order pages.
3. For a pending order, select **Cancel order**. The button shows “Updating…”
   while saving; success changes the state to cancelled and displays **Cancelled
   at**. Accepted, ready, collected, rejected and cancelled orders have no
   cancellation button. A stale cancellation returns the state-conflict message
   described above and changes nothing.
4. Automatically cancelled pending/accepted/ready orders remain listed with
   “Cafe is suspended”. The Admin's private explanation is not shown. Collected
   purchases and prior terminal orders remain unchanged; un-suspension does not
   revive orders. Owner-rejected history displays its rejection reason as text.

An empty history shows “No orders yet.” A read failure shows “Order information
is temporarily unavailable. Try again.” rather than an empty collection. Invalid
pagination shows “Invalid orders page.” If a cancellation cannot be confirmed,
the page reports “Unable to confirm cancellation. Refresh to check the current
order before trying again.”

### 4.5 Review a collected order

Customers can submit one review for each of their own collected orders.

**Where:** Customer navigation → **My orders** → **Review order** on a collected
purchase, or `/customer/orders/{orderId}/review` for that purchase.

1. Read the retained café name, order reference, state and collected time on
   **Review your order**. A collected purchase remains reviewable after café
   suspension or removal of its original menu items; this does not reopen the
   restricted café page.
2. Choose **Rating** from 1 to 5 and enter **Review text**. Text must be nonblank
   and at most 1,000 Unicode code points; the counter shows the current count.
   Valid text, including spaces and newlines, is preserved exactly.
3. Select **Submit review**. Controls are disabled and “Submitting…” appears
   while the request is in progress.
4. Success shows **Your submitted review**, its rating, original text,
   moderation state and submission time in Singapore time. The initial state is
   pending. Reopening the page shows the existing review, including a hidden
   review. Submitted reviews cannot be edited or deleted, and hiding/restoring
   does not allow another review for the order.

Invalid fields retain your entered values and show “Choose an integer rating
from 1 to 5 and enter nonblank review text of 1–1,000 Unicode code points.”
Correct the fields and submit again. An uncollected purchase has no review
control in My orders; opening its review page says “This order must be collected
before you can submit a review.”

If another submission or state change wins first, the form says “This order is
not collected or already has a review. Refresh to check your order and submitted
review.” Use **Refresh review status** to read current information. If submission
cannot be confirmed, it says “Unable to confirm submission. Refresh to check
your submitted review before trying again.” Refresh and check for an existing
review before retrying. A page read failure says “Review information is
temporarily unavailable. Try again.”

Review text displays as plain text. Public café reviews continue to use
“Verified customer” and show only pending/kept reviews for an eligible café.
Owner fulfilment is not yet available, so collected examples currently use
local test fixtures.

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
it. Owner access to retained café records remains available. Customers see the
fixed reason in **My orders**. Owner management screens remain outside this build.
An empty list shows “No approved cafés.” Loading shows “Loading cafés…”.

Both café screens show “Enter a reason of 1–300 characters.” for an invalid
reason. A stale confirmation reports the current state, for example “Café record
changed. Current state: rejected.”, and refreshes the list. A failed save shows “Unable to
save. Check your reason and try again.” or “Unable to save. Try again.” A list
source failure shows “Unable to load cafés.” with **Try again**; it is not an
empty-list result. Failed actions do not leave a partial state change or audit.

## 7. AI features

### 7.1 Triage pending reviews

Moderation Assistant gives Admins AI-generated classification advice for pending
reviews in their own workspace, including existing demo-kit accounts.

**Where:** Admin navigation → **Moderation queue** → **Pending**.

1. Select **Triage pending reviews**. An empty page disables it; Kept and Hidden
   have no triage button. One click submits only the current page, with no
   automatic pagination or retries. The operator configures 1–20 reviews per page.
2. While “Triaging reviews…” appears, the button is disabled. Successful advice
   appears beside each review as **AI suggestion**, with a label and reason.
   Labels are `ok`, `spam`, `abusive`, `off-topic` and `injection attempt`.
   Keep is highlighted for `ok`; Hide is highlighted for the other labels.
   Advice does not select or submit any action.
3. Read the review and advice, then choose an ordinary per-review action using
   section 6.1. Enter your own reason or edit a fixed quick pick, and explicitly
   confirm. The AI reason is never copied into your reason or audit entry.
4. Acting on one review leaves the remaining suggestions on that page. Reloading
   or changing page discards advice. A conflicting action removes the affected
   suggestion and shows the review's current state.

Usage limits apply per Admin and across the environment; one click permits at
most one provider attempt. If AI cannot run, the manual queue remains usable:

| Message | Meaning |
| --- | --- |
| “AI triage is disabled. You can still review each item manually.” | AI is disabled or live credentials are absent. |
| “The AI usage limit was reached. You can still review each item manually.” | An applicable usage cap or provider limit denied work. |
| “AI triage is unavailable. You can still review each item manually.” | AI processing, validation or bookkeeping failed. |
| “The queue changed. Reload before triaging.” | The submitted selection is no longer valid; select **Reload queue**. |
| “Unable to triage reviews. Reload and try again.” | The request could not obtain a successful response; reload explicitly. |

AI suggestions can be wrong. Local checks use fake responses and do not measure
classification accuracy. Brew Finder and Prep Advisor screens remain unavailable.

## 8. Reference

Sign-in accepts an existing nonempty password up to 72 UTF-8 bytes, without
applying sign-up's eight-code-point minimum or changing its spaces/case.

## 9. Known limitations

Favourites and Café owner domain tools remain entry shells or unavailable.
Customer ordering requires the protected account name described in [Pre-order for pickup](#43-pre-order-for-pickup). New demo
kits supply it; current signup and older unnamed accounts do not. Owner
fulfilment actions are not available, so accepted/ready/collected examples use
seeded kit purchases or local test fixtures. Account password/email changes,
password reset, account deletion, role/workspace switching and all-device
sign-out are not available in the current account UI.

## 10. Troubleshooting

| Message | What to do |
| --- | --- |
| “Unable to create account. Try signing in.” | Try Sign in rather than assuming a new account was created. |
| “Unable to complete account setup. Try again.” | Retry sign-up explicitly when ready. |
| “Account setup could not be completed. Try signing in; account access is unavailable until setup is resolved.” | Try Sign in; access may remain unavailable until setup is resolved. |
| “Too many attempts. Try again later.” | Wait before trying again. |
| “Demo kit limit reached. Try again in N seconds.” | Wait for the displayed duration before creating another kit. |
| “Demo kit service is temporarily unavailable. Try again.” | Retry creation later; only a successful response supplies credentials. |
| “An account is already signed in.” | Use that account or sign out before signing in to another. |
| “Check the account fields and try again.” | Review the email, password and sign-up role, then submit again. |
| “Unable to complete the request. Try again.” | Check connectivity and retry explicitly; the message does not confirm success. |
