# OWN-15: Export sales as CSV

- **Related specs:** [Owner source stories](../PRODUCT-SPEC.md#café-owner), [stretch scope](../PRODUCT-SPEC.md#mvp-and-stretch-scope), [owner stretch boundary](../INTEGRATION-SPEC.md#owner-stretch-operations-boundary), [owner sales boundary](../INTEGRATION-SPEC.md#owner-sales-boundary), [sales Dashboard](OWN-06-sales-dashboard.md), [order snapshots](../INTEGRATION-SPEC.md#customer-pickup-and-order-boundary), [Singapore business time](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport).
- **Role:** Café owner
- **Source:** [PRODUCT-SPEC.md, User stories → Café owner](../PRODUCT-SPEC.md#café-owner), OWN-15; Low priority, Stretch.
- **Requirement ownership:** This file owns the CSV export. It uses OWN-06's sale definition and adds no new sales calculation.

## Overview

Owners keep their own records for tax or planning. The export downloads every
completed sale line for a chosen period as a CSV file that opens in a
spreadsheet. It contains no customer data and can't be used to run formulas.

## Export format

The owner picks `from` and `through` Singapore business dates. Both are
required; `from` must not be after `through`, `through` must not be after
today, and the range is at most 92 dates inclusive. The Dashboard form
defaults to the Dashboard period, today minus 27 days through today.

The file has one row per order line of each own-café `collected` order whose
`collectedAt` Singapore date falls in the range, using OWN-06's sale definition.
Columns, in order, with this exact header row:

`business_date,collected_at,order_id,item_id,item_name,quantity,unit_price_sgd,line_total_sgd`

- `business_date`: `YYYY-MM-DD` Singapore date of `collectedAt`.
- `collected_at`: Singapore local `YYYY-MM-DDTHH:mm:ss+08:00`.
- `order_id`, `item_id`, `item_name`: retained references and item-name snapshot.
- `quantity`: integer.
- `unit_price_sgd`, `line_total_sgd`: retained cents as decimal dollars with
  exactly two places and no symbol, for example `4.50`.

Rows sort by `collected_at`, `order_id` and `item_id`, all ascending. The file
is UTF-8 with a byte-order mark and CRLF line endings, following RFC 4180: a
field containing a comma, double quote, CR or LF is wrapped in double quotes
with inner quotes doubled. Any text field starting with `=`, `+`, `-`, `@`, tab
or CR is prefixed with a single quote (`'`) so spreadsheets treat it as text.
A range without sales produces the header row only.

The response is an attachment named `homebrew-sales-{from}-to-{through}.csv`
with `Cache-Control: private, no-store`. Customer names, emails and phone
numbers never appear.

## Access

- **How a user gets the role:** Chooses Café owner at sign-up or uses a demo-kit owner account.
- **What it can see and change:** Downloads its own café's completed sale lines inside its verified workspace; changes nothing.
- **What it can never do:** Export another café's or workspace's sales, include customer identity, or change orders.

## Requirements

### `OWN-15`: Download completed sales for a period

- **User story:** As a café owner, I want to export my café's completed sales for a chosen period as a CSV file, so that I can keep my own records.
- **Priority:** Low
- **Risk:** Medium — a file leaving the app can leak customer data or carry spreadsheet formula injection from untrusted item names.

#### Acceptance criteria

- **`OWN-15.1`:** Given own-café orders in every state, when the owner exports a valid range, then the file has exactly one row per line of each `collected` order whose Singapore `collectedAt` date is in range, and no other order appears.
- **`OWN-15.2`:** Given exported rows, when the file is read, then it starts with a UTF-8 byte-order mark and the exact header row, uses CRLF line endings, formats dates, times and two-place amounts as above from retained snapshots, and sorts by `collected_at`, `order_id`, `item_id`.
- **`OWN-15.3`:** Given item names containing commas, double quotes, line breaks or a leading `=`, `+`, `-`, `@`, tab or CR, when they are exported, then RFC 4180 quoting applies and formula-leading fields carry a single-quote prefix, so no field is interpreted as a formula.
- **`OWN-15.4`:** Given a missing or malformed date, `from` after `through`, `through` after today, a range over 92 dates or an unknown query key, when export is requested, then `400 INVALID_REQUEST` is returned without a file.
- **`OWN-15.5`:** Given a valid range without sales, when exported, then the file contains only the byte-order mark and header row.
- **`OWN-15.6`:** Given a successful export, when its response is inspected, then it is an attachment named `homebrew-sales-{from}-to-{through}.csv` with `Cache-Control: private, no-store`, and no customer name, email, phone or customer reference appears.
- **`OWN-15.7`:** Given no session, a wrong role, an owner without a café, or main and kit owners, when export is requested, then `401 UNAUTHENTICATED`, `403 FORBIDDEN` or `404 NOT_FOUND` applies without a file, and each owner exports only its own café inside its own workspace under server checks and RLS.

#### Edge cases and failure paths

Renamed, removed or archived items export their retained snapshot names. A
source failure returns `503 SOURCE_UNAVAILABLE`, never a partial or header-only
file. The export does not consume AI quota.

#### Out of scope

Other formats, scheduled exports, customer-level data, tax calculations and
exporting non-collected orders.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| `/owner/dashboard`, Export sales form | From and through dates defaulting to the Dashboard period; inline validation errors | Download CSV | OWN-15 |

## Use cases

### `UC-OWN-15-1`: Download last month's sales

- **Actor:** Signed-in Café owner.
- **Preconditions:** Own café with collected orders.
- **Main success scenario:**
  1. Owner opens Dashboard and enters a from and through date.
  2. Owner selects Download CSV.
  3. The system authorizes the owner, validates the range and returns the file.
  4. Owner opens it in a spreadsheet.
- **Extensions:** Step 3: an invalid range shows an inline error; an unavailable source shows a safe failure without a file.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Export completed sale lines | Own café in verified workspace | Denied |
| Export customer identity | Denied | Denied |

## Out of scope

Payment, accounting integrations and new navigation.

## Assumptions

None.
