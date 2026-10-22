# CUS-01: Browse and filter cafés

- **Related specs:** [Customer source stories](../PRODUCT-SPEC.md#customer), [role boundaries](../PRODUCT-SPEC.md#roles-and-access), [catalogue access](../TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [data ownership](../TECHNICAL-SPEC.md#data-model-and-ownership), [workspace isolation](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [time interpretation](../INTEGRATION-SPEC.md#schema-vocabulary-and-bounds), [review visibility](ADM-03-review-moderation.md#overview), [café page](CUS-02-cafe-page.md), [Brew Finder](CUS-06-brew-finder.md), [accessible responsive flows](../TECHNICAL-SPEC.md#accessibility-and-responsive-behavior).
- **Role:** Customer
- **Source:** [PRODUCT-SPEC.md, User stories → Customer](../PRODUCT-SPEC.md#customer), CUS-01; MVP.
- **Requirement ownership:** This file owns CUS-01 and its criteria. Catalogue eligibility and workspace isolation remain SYS-05/SYS-12; café details belong to CUS-02; AI ranking belongs to CUS-06.

## Overview

Customers browse home cafés and narrow the catalogue by opening time, drink type
and area. Only approved, non-suspended cafés in the customer's workspace may
appear. The unfiltered main view includes all such cafés, whether open or
closed. Closed cafés are greyed out but remain clickable, with their next
opening time at the bottom of the card. Open cafés within 30 minutes of closing
show a closing-soon label at the bottom. Browsing remains available independently
of Brew Finder or provider availability. Opening-time interpretation uses
`Asia/Singapore` under the shared integration contract.

The exact filter/read schemas, page paths, enum spelling, pagination and time
representation are in the [customer catalogue boundary](../INTEGRATION-SPEC.md#customer-catalogue-and-detail-boundary).
Drink choices are coffee, matcha, tea, chocolate, juice and other; area choices
are Central, North, South, East and West. One time mode and optional drink/area
filters combine with AND. Reset clears them to the unfiltered catalogue.

CUS-01 owns the rating formula: the arithmetic mean of original ratings from
pending and kept reviews, excluding hidden reviews. No visible reviews gives
null and “No reviews yet”. Display rated means to one decimal with half-up
rounding. Catalogue and non-AI fallback ordering compares unrounded means
descending, visible-review count descending, then café reference ascending by
Unicode code point; unrated cafés follow rated cafés. CUS-05 owns input ratings.
The shared read boundary projects this formula; CUS-06 does not redefine it.

## Related domain contracts

The [owner profile/hour contract](../INTEGRATION-SPEC.md#owner-cafe-management-boundary)
supplies current profile fields and weekly hours, with at most two intervals per
starting weekday/fourteen per week and no duplicate or overlapping intervals.
The [owner menu contract](../INTEGRATION-SPEC.md#owner-menu-boundary) supplies
current drink types: permanent removal excludes an item from subsequent drink
matches, while a live sold-out item still participates. These owner constraints
do not change Customer eligibility, AND filtering or the single rating order.

## Access

- **How a user gets the role:** Chooses Customer at sign-up; a demo kit also supplies a Customer account for normal sign-in. Normal sign-ups use the main workspace; kit accounts use their own kit workspace.
- **What it can see and change:** Reads eligible cafés and changes its browse filters within its workspace. This story changes no café, menu, review or order data.
- **What it can never do:** Read another workspace, pending/rejected/suspended cafés, private owner data or Admin decision reasons; alter café eligibility or bypass server authorization/RLS through filters.

## Requirements

### `CUS-01`: Browse approved cafés with filters

- **User story:** As a customer, I want to browse approved cafés and filter by open now or open at a chosen time, drink type and area, so that I can find a café matching my needs.
- **Priority:** High
- **Risk:** High — eligibility mistakes disclose restricted cafés, and incorrect time filtering misleads pickup planning.

#### Acceptance criteria

- **`CUS-01.1`:** Given a signed-in Customer and approved, non-suspended cafés in its workspace, when `/customer/cafes` is opened without filters, then all eligible cafés are browsable in the rating order defined above, 20 per page, including closed cafés, without an AI request; pending, rejected, suspended and other-workspace cafés remain excluded. Ratings use the defined visible-only formula, null/unrated handling, precision and tie order, including after moderation changes.
- **`CUS-01.2`:** Given eligible cafés with weekly Singapore opening intervals, when Open now is selected, then only cafés open at the database clock match, including the opening instant and excluding closing; overnight and week-boundary intervals follow the canonical hours contract, adjacent intervals count as continuous opening and absent schedules do not match.
- **`CUS-01.3`:** Given a chosen Singapore date/minute, when Open at is selected, then the UI converts it to the canonical UTC minute instant and the server applies the same inclusive-opening/exclusive-closing and overnight rules at that instant, irrespective of browser/host timezone; card states still describe now.
- **`CUS-01.4`:** Given eligible cafés with menu drink types, when coffee, matcha, tea, chocolate, juice or other is selected, then cafés containing that exact type match, including sold-out-only matches, and cafés without it do not; active time/area predicates combine with AND and no filter makes an ineligible café visible.
- **`CUS-01.5`:** Given eligible cafés in Central, North, South, East and West, when an area is selected, then only exact matches remain with other active predicates; invalid enum spellings, incompatible time fields, unknown/duplicate query keys and invalid pages fail with `400 INVALID_REQUEST` under the strict filter/query contract rather than silently changing filters.
- **`CUS-01.6`:** Given a displayed café, when the Customer opens it, then CUS-02 supplies its café page after current eligibility and workspace checks; an old browse result cannot grant access after suspension.
- **`CUS-01.7`:** Given a Customer in a demo kit, when the same browse/filter actions are used, then only that kit's eligible catalogue is returned; the main showcase café and other kits' cafés are absent.
- **`CUS-01.8`:** Given no valid session or a wrong-role visitor, when protected browse content is requested, then SYS-05's authentication/role controls supply no protected catalogue content; customer-specific data is absent from a static loading shell.
- **`CUS-01.9`:** Given an eligible café is currently closed, when its card appears in the unfiltered main view, then it is greyed out but clickable; with a next opening its bottom text follows “Cafe opens at X time”, substituting `D MMM YYYY, h:mm AM/PM SGT`, and with no scheduled opening it shows “No opening hours scheduled”; no invented time appears and opening the card repeats CUS-02's eligibility checks.
- **`CUS-01.10`:** Given an eligible café is open and its current opening interval ends within the next 30 minutes, including exactly 30 minutes from now, when its card is shown, then the bottom text reads “closing soon”; an open café with more than 30 minutes remaining does not show this label, and a closed café follows CUS-01.9 instead.
- **`CUS-01.11`:** Given a closed eligible café in the unfiltered view, when Open now is selected, then it is excluded; removing that filter restores it when other filters permit, and Reset clears all filters to restore the complete eligible catalogue including its greyed-out clickable card.

#### Edge cases and failure paths

Closed styling does not disable the link or change catalogue eligibility. A
closing-soon label does not itself change opening hours or pickup rules.
An empty authorized catalogue or filter result contains no fabricated cafés.
Source-read failure follows the shared `SOURCE_UNAVAILABLE` boundary rather than
being represented as a successful empty result. Eligibility is rechecked for
each read. Review states eligible for rating inputs are owned by
[ADM-03](ADM-03-review-moderation.md#overview): only pending and kept reviews
contribute, never hidden reviews. CUS-01's formula above is authoritative.

#### Out of scope

Natural-language ranking is CUS-06; café details are CUS-02. This requirement
adds no owner/Admin write operation or anonymous catalogue permission.

## Screens

| Screen | What it shows | Actions | Requirement IDs |
| --- | --- | --- | --- |
| Browse cafés | Unfiltered eligible catalogue includes open and closed cafés; closed cards are greyed out/clickable with next-opening text at the bottom; open cards in their final 30 minutes show “closing soon”; opening-time, drink-type and area filters; Brew Finder under CUS-06 | Browse; select/remove filters; open café, including a closed café | CUS-01 |

## Use cases

### `UC-CUS-01-1`: Find an eligible café

- **Actor:** Signed-in Customer.
- **Preconditions:** Customer session in the main or a kit workspace; catalogue source is available.
- **Main success scenario:**
  1. Customer opens Browse cafés.
  2. The system returns all currently eligible workspace cafés in the unfiltered view, with closed/closing-soon card states.
  3. Customer selects an opening-time, drink-type or area filter.
  4. The system returns eligible matches for that filter.
  5. Customer opens a café through CUS-02.
- **Extensions:** At step 2 or 4, no matches returns an empty set; source failure returns the shared safe failure without fabricated records. At step 5, a café that has become ineligible is no longer accessible.

## Permissions

| Action | Own data | Other users' data |
| --- | --- | --- |
| Read/filter catalogue | Own session/workspace determines scope | Read approved, non-suspended cafés and their customer-visible catalogue data in that workspace only |
| Change catalogue records or eligibility | Denied | Denied |
| Read private orders, owner fields or Admin reasons through browsing | No additional permission | Denied |

## Out of scope

Maps, distance/location services, delivery, payments and additional filter types
are not introduced. Shared account lifecycle belongs to SYS-01–SYS-03. Rating
sorting used by Brew Finder's fallback is linked from CUS-06 rather than
establishing a second ranking system here.

## Assumptions

None. Retired IDs: ASM-01.
