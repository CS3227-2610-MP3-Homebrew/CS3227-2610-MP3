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

- **`CUS-01.1`:** Given a signed-in Customer and approved, non-suspended cafés in its workspace, when Browse cafés is opened without any filters, then all those eligible cafés are included in the browsable main view, including cafés that are currently closed, without submitting an AI request; pending, rejected, suspended and other-workspace cafés remain excluded from customer-scoped reads and display.
- **`CUS-01.2`:** Given cafés whose opening schedules unambiguously include or exclude the current Singapore time, when the Customer selects Open now, then only eligible cafés open at that time are returned; a café closed at that time is excluded.
- **`CUS-01.3`:** Given a chosen Singapore date/time unambiguously inside one café's opening interval and outside another's, when the Customer selects Open at that time, then the open eligible café matches and the closed café does not, irrespective of browser or deployment-host timezone.
- **`CUS-01.4`:** Given eligible cafés with menu drink types, when the Customer filters by a drink type, then returned cafés match that drink type and cafés without it are excluded; the filter never makes an ineligible café visible.
- **`CUS-01.5`:** Given eligible cafés in different areas, when the Customer filters by an area, then only cafés matching the selected area are returned.
- **`CUS-01.6`:** Given a displayed café, when the Customer opens it, then CUS-02 supplies its café page after current eligibility and workspace checks; an old browse result cannot grant access after suspension.
- **`CUS-01.7`:** Given a Customer in a demo kit, when the same browse/filter actions are used, then only that kit's eligible catalogue is returned; the main showcase café and other kits' cafés are absent.
- **`CUS-01.8`:** Given no valid session or a wrong-role visitor, when protected browse content is requested, then SYS-05's authentication/role controls supply no protected catalogue content; customer-specific data is absent from a static loading shell.
- **`CUS-01.9`:** Given an eligible café is currently closed and has a next scheduled opening, when its card appears in the unfiltered main view, then the card is greyed out but remains clickable, and its bottom text follows “Cafe opens at X time”, with “X time” replaced by that café's next opening time in Singapore time; opening the card still uses CUS-02's current eligibility checks.
- **`CUS-01.10`:** Given an eligible café is open and its current opening interval ends within the next 30 minutes, including exactly 30 minutes from now, when its card is shown, then the bottom text reads “closing soon”; an open café with more than 30 minutes remaining does not show this label, and a closed café follows CUS-01.9 instead.
- **`CUS-01.11`:** Given an eligible café is currently closed and appears in the unfiltered main view, when Open now is selected, then it is excluded from that filtered result; removing the filter returns it to the unfiltered catalogue as a greyed-out clickable card.

#### Edge cases and failure paths

Closed styling does not disable the link or change catalogue eligibility. A
closing-soon label does not itself change opening hours or pickup rules.
An empty authorized catalogue or filter result contains no fabricated cafés.
Source-read failure follows the shared `SOURCE_UNAVAILABLE` boundary rather than
being represented as a successful empty result. Eligibility is rechecked for
each read. Review states eligible for rating inputs are owned by
[ADM-03](ADM-03-review-moderation.md#overview): only pending and kept reviews
contribute, never hidden reviews. This summary does not define a rating formula.

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
