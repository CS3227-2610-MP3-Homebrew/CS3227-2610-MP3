# Homebrew product specification

## Product overview

Homebrew is a web app for home cafés: people who sell drinks from home.
Customers find approved cafés and pre-order drinks for pickup. Customers pay at
pickup; the app has no payment system. Café owners manage their café, menu and
order queue. Admins approve cafés, suspend and un-suspend cafés, and moderate
reviews.

The product serves customers looking for pickup drinks, home café operators
managing their business, and admins maintaining the café and review listings.
Each role has its own simple UI and exactly one AI feature powered by the NUS
SoC LLM (SoCLaaS): Brew Finder for customers, Prep Advisor for café owners, and
Moderation Assistant for admins.

## Roles and access

| Role | Account and access boundary |
| --- | --- |
| Customer | Chooses Customer at sign-up. Sees only approved, non-suspended cafés and manages only their own orders and reviews. |
| Café owner | Chooses Café owner at sign-up. Manages only their own café, menu and orders. Their café is visible to customers only after admin approval and while not suspended. |
| Admin | The main Admin is seeded by the maintenance job; each demo kit has its own kit-scoped Admin. Sign-up never creates an Admin. Approves or rejects café applications, suspends and un-suspends cafés, and keeps, hides or restores reviews with a reason. |

There is one main workspace and one isolated workspace per demo kit. Normal
sign-ups join the main workspace. Every role, including Admin, reads and writes
only inside its own workspace, including through AI features and caches. Anyone
can choose **Create demo kit** on the sign-in page without signing in; creation
shows Customer, Café owner and Admin credentials once, for normal sign-in. Kit
Admins have the product's Admin operations only within their kit; they cannot
create Admins or change roles. Existing Admin reasons, audit, reversible actions
and the prohibition on editing review text apply. Kits never expire or undergo
automatic deletion. The main workspace has a showcase café for new sign-ups;
applications there may stay pending indefinitely. Demo kits are the end-to-end
testing path.

An un-suspended approved café becomes visible to customers again. Un-suspending
does not make an unapproved café visible to customers.

After sign-in, users see only their own role's screens and navigation. Role and
record access must be enforced server-side and by row-level security; hiding a
screen alone does not enforce permissions. Shared UI and behavior follow the
single responsibility principle (SRP) and don't repeat yourself (DRY).

## Navigation per role

| Role | MVP screens | Stretch screens |
| --- | --- | --- |
| Shared | Sign-in, including **Create demo kit**. | None. |
| Customer | Browse cafés, including the Brew Finder search box; Café page; Pre-order; My orders; Review form. | No separate screen specified for favourite cafés. |
| Café owner | Café application; Dashboard, including sales and the Prep Advisor panel; Order queue; Menu; Café profile, including opening hours and pickup rules. | No separate screen specified for requesting a boost. |
| Admin | Café applications; Cafés (suspend and un-suspend); Moderation queue, including the "Triage pending reviews" button; Audit log. | AI settings for on/off controls; Boost requests. |

## Product-level functional requirements

The IDs in the User stories section identify the product requirements. Detailed
story criteria and shared contracts belong in the specifications listed
below; this document does not supply missing behavioral decisions.

| IDs | Required product behavior |
| --- | --- |
| SYS-01–SYS-03 | Support sign-up with Customer or Café owner selection, sign-in, sign-out, and navigation restricted to the signed-in user's role. The maintenance job seeds the main Admin; each demo kit has a kit-scoped Admin; sign-up never creates an Admin. |
| CUS-01–CUS-02 | Browse approved, non-suspended cafés. Filter by open now or open at a chosen time, drink type and area. A café page shows its menu, including sold-out items, opening hours and visible reviews. |
| CUS-03–CUS-04 | Pre-order for a pickup slot within opening hours and the café's pickup rules, with payment at pickup. Customers view their own orders and may cancel before the café accepts the order. |
| CUS-05 | Permit a customer to review a collected order once per order. |
| CUS-06 | Brew Finder accepts a natural-language request in one search box and returns ranked café suggestions, each with a short reason and a suggested item. Its non-AI fallback is the filtered list sorted by rating. Suggestions remain within the customer's café access boundary. |
| OWN-01–OWN-04 | Accept a café registration application that remains pending until admin approval. Let the café owner manage their café profile, opening hours, menu items, prices, sold-out toggle and minimal pickup-slot rules, such as a last pickup time before closing. |
| OWN-05 | Provide the café owner with an order queue supporting accept, reject, mark ready and mark collected. |
| OWN-06 | Provide a sales dashboard with daily totals, top items and sales by day of week. |
| OWN-07 | Show Prep Advisor as a dashboard panel. It suggests which items to prepare more or less of by day of week, using aggregated sales only. Every suggestion quotes its supporting numbers. Nothing is applied automatically. Its non-AI fallback is the top-items table. |
| ADM-01–ADM-02 | Let admins approve or reject café applications with a reason and suspend and un-suspend cafés. An un-suspended approved café becomes visible to customers again; unapproved cafés remain hidden. |
| ADM-03 | Provide a moderation queue to keep, hide or restore reviews with a reason, never to edit review text. Record every keep, hide or restore action in an audit log. |
| ADM-04 | A "Triage pending reviews" button runs Moderation Assistant on pending reviews in batches. It classifies each review as ok, spam, abusive, off-topic or injection attempt, with a reason. The admin confirms every action. Its non-AI fallback is the manual queue. |
| CUS-07, OWN-08, ADM-05–ADM-06 | Stretch only: save favourite cafés; request a boost with a time-limited Featured badge and a fee that is only recorded; switch AI features on or off at runtime from the Admin page; approve or reject boost requests. |

## Non-functional requirements

### Security and AI safeguards

- Protect all three AI features against direct and indirect prompt injection.
- Give LLMs no tools and no write access. A human confirms every AI suggestion
  that changes data; no AI result grants access or bypasses role restrictions.
- Enforce data access server-side and with row-level security.
- Provide an environment setting that disables all AI features without code
  changes. This MVP kill switch is separate from the stretch runtime Admin UI.
- Preserve a non-AI fallback for every AI feature.

Detailed safeguards, kill-switch behavior, usage limits and enforcement belong
in [AI-SECURITY-SPEC.md](AI-SECURITY-SPEC.md) and
[TECHNICAL-SPEC.md](TECHNICAL-SPEC.md). Exact LLM prompts and input/output
schemas belong in [INTEGRATION-SPEC.md](INTEGRATION-SPEC.md).

### Usage control

The SoC LLM quota must not be easy to exhaust during normal use or peer testing.
Usage control includes per-user and per-feature limits, caching and a global
daily provider-call cap, with the non-AI fallbacks specified above. Values belong
to [AI-SECURITY-SPEC limits](AI-SECURITY-SPEC.md#limits-and-configuration);
unverifiable per-key limits are recorded in
[TECHNICAL-SPEC ASM-01](TECHNICAL-SPEC.md#assumptions).

### Environments, cost and UI

- Peer testers reach every role on production through isolated demo kits without team action after submission.
- Keep dev and prod deployments, databases and LLM keys separate.
- Operate at $0 cost, using free tiers only.
- Provide a simple, responsive and accessible UI with separate screens and
  navigation for each role.

## Top-level use cases

| Use case | Actor and trigger | Required result and constraints | Story IDs |
| --- | --- | --- | --- |
| Access a role's UI | A user signs up or signs in. | Sign-up offers Customer and Café owner only; sign-in leads to the user's own role screens. Users can sign out. The maintenance job seeds the main Admin; demo kits provide kit-scoped Admins; sign-up never creates an Admin. | SYS-01–SYS-03 |
| Find a café and drink | A customer browses, filters or enters a natural-language request. | Show eligible cafés; café pages include menus, sold-out items, hours and visible reviews. Brew Finder gives ranked suggestions with reasons and suggested items, or the filtered list sorted by rating. | CUS-01–CUS-02, CUS-06 |
| Arrange a pickup | A customer chooses drinks and a pickup slot. | Create a pre-order within the café's hours and pickup rules, with payment at pickup. The customer can view their orders and cancel before acceptance. | CUS-03–CUS-04 |
| Review a pickup | A customer reviews a collected order. | Allow one review per collected order, limited to the customer's own order. | CUS-05 |
| Set up a café | A café owner applies and manages their café information. | Keep the application pending until approval; manage profile, hours, menu, prices, sold-out state and pickup rules within the café owner's access boundary. | OWN-01–OWN-04 |
| Fulfil pre-orders | A café owner uses the order queue. | Support accept, reject, mark ready and mark collected for their own café's orders. | OWN-05 |
| Understand sales and preparation | A café owner opens the dashboard. | Show daily totals, top items and sales by day of week. Prep Advisor uses only aggregated sales and quotes numbers; no suggestion is applied automatically. The fallback is the top-items table. | OWN-06–OWN-07 |
| Manage café eligibility | An admin reviews applications, suspends a café or un-suspends a café. | Approve or reject applications with a reason; suspended cafés are not visible to customers. An un-suspended approved café becomes visible to customers again; an unapproved café remains hidden. | ADM-01–ADM-02 |
| Moderate reviews | An admin reviews the queue or requests AI triage. | Classify pending reviews with reasons or use the manual queue; the admin confirms each action. Keep, hide or restore with a reason, retain review text, and record moderation actions in the audit log. | ADM-03–ADM-04 |
| Use optional features | A customer saves a favourite, a café owner requests a boost, or an admin manages boosts or runtime AI settings. | Provide only the stretch capabilities listed in the User stories section; a boost fee is recorded without adding a payment system. | CUS-07, OWN-08, ADM-05–ADM-06 |

## MVP and stretch scope

The MVP comprises 20 stories: all Shared stories, CUS-01–CUS-06,
OWN-01–OWN-07 and ADM-01–ADM-04. It includes exactly the three role-specific AI
features, their non-AI fallbacks, security and usage control, and the environment
kill switch.

Four stories are stretch: favourite cafés (CUS-07), requesting a boost (OWN-08),
runtime Admin AI controls (ADM-05) and boost decisions (ADM-06). There is no
in-app payment system in either scope.

## User stories

### Shared

| ID | Story | Priority | Scope |
| --- | --- | --- | --- |
| SYS-01 | As a new user, I want to sign up and choose Customer or Café owner, so that I can use Homebrew in my chosen role. | High | MVP |
| SYS-02 | As a user, I want to sign in and sign out, so that I can access and end my account session. | High | MVP |
| SYS-03 | As a signed-in user, I want to see only my own role's screens and navigation, so that I can use the features appropriate to my role. | High | MVP |

### Customer

| ID | Story | Priority | Scope |
| --- | --- | --- | --- |
| CUS-01 | As a customer, I want to browse approved cafés and filter by open now or open at a chosen time, drink type and area, so that I can find a café matching my needs. | High | MVP |
| CUS-02 | As a customer, I want to view a café page with its menu, including sold-out items, opening hours and visible reviews, so that I can decide what to order and when to visit. | High | MVP |
| CUS-03 | As a customer, I want to pre-order with a pickup slot inside opening hours and the café's pickup rules and pay at pickup, so that I can arrange to collect my drinks. | High | MVP |
| CUS-04 | As a customer, I want to view my orders and cancel an order before the café accepts it, so that I can manage my pickup plans. | High | MVP |
| CUS-05 | As a customer, I want to review a collected order once per order, so that I can share feedback about my purchase. | Medium | MVP |
| CUS-06 | As a customer, I want to describe what I want in one Brew Finder natural-language search box and receive ranked café suggestions with a short reason and a suggested item for each, with a filtered list sorted by rating as the fallback, so that I can find a suitable café and drink. | High | MVP |
| CUS-07 | As a customer, I want to save favourite cafés, so that I can return to cafés I like. | Low | Stretch |

### Café owner

| ID | Story | Priority | Scope |
| --- | --- | --- | --- |
| OWN-01 | As a café owner, I want to apply to register a café that stays pending until an admin approves it, so that my café can become available to customers after approval. | High | MVP |
| OWN-02 | As a café owner, I want to manage my café profile and opening hours, so that customers can see my café's information and hours. | High | MVP |
| OWN-03 | As a café owner, I want to manage menu items, prices and a sold-out toggle, so that my menu reflects what I sell and its availability. | High | MVP |
| OWN-04 | As a café owner, I want to set minimal pickup-slot rules, such as a last pickup time before closing, so that pickup options follow my café's rules. | Medium | MVP |
| OWN-05 | As a café owner, I want an order queue where I can accept, reject, mark ready and mark collected, so that I can manage my café's orders. | High | MVP |
| OWN-06 | As a café owner, I want a sales dashboard with daily totals, top items and sales by day of week, so that I can understand my café's sales. | Medium | MVP |
| OWN-07 | As a café owner, I want a Prep Advisor dashboard panel that suggests which items to prepare more or less of by day of week using aggregated sales only, quotes each suggestion's numbers, applies nothing automatically and falls back to the top-items table, so that I can make preparation decisions. | High | MVP |
| OWN-08 | As a café owner, I want to request a boost with a time-limited Featured badge and a fee that is only recorded, so that I can request additional visibility for my café. | Low | Stretch |

### Admin

| ID | Story | Priority | Scope |
| --- | --- | --- | --- |
| ADM-01 | As an admin, I want to approve or reject café applications with a reason, so that I can manage which cafés are admitted. | High | MVP |
| ADM-02 | As an admin, I want to suspend and un-suspend cafés, so that I can control which cafés are visible to customers. | High | MVP |
| ADM-03 | As an admin, I want a moderation queue where I can keep, hide or restore reviews with a reason without editing them and have every action recorded in an audit log, so that I can moderate reviews accountably. | High | MVP |
| ADM-04 | As an admin, I want a Moderation Assistant "Triage pending reviews" button that classifies pending reviews in batches as ok, spam, abusive, off-topic or injection attempt with a reason for each, requires my confirmation for every action and falls back to the manual queue, so that I can assess reviews with assistance. | High | MVP |
| ADM-05 | As an admin, I want to turn AI features on or off at runtime from the Admin page, so that I can control their availability. | Low | Stretch |
| ADM-06 | As an admin, I want to approve or reject boost requests, so that I can manage which requested boosts proceed. | Low | Stretch |

## Assumptions

Retired IDs: ASM-01–ASM-02. Per-key quota uncertainty is recorded in
[TECHNICAL-SPEC ASM-01](TECHNICAL-SPEC.md#assumptions).

## Supporting specifications

| Document | Authoritative scope |
| --- | --- |
| [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md) | Architecture, data model, row-level security, configuration, environments and usage-control enforcement. |
| [INTEGRATION-SPEC.md](INTEGRATION-SPEC.md) | API contracts, exact LLM prompts and LLM input/output schemas. |
| [AI-SECURITY-SPEC.md](AI-SECURITY-SPEC.md) | AI attack surfaces, mitigations, environment kill switch, usage-control limits and security test plan. |
| [Story specifications](README.md#specifications) in `stories/<ID>-<slug>.md` | One story specification per source story, including testable acceptance criteria, relevant edge cases and failure paths, linked to shared contracts. |
