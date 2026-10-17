# Homebrew technical specification

## Purpose and boundaries

This specification defines the shared architecture, data ownership, RLS,
configuration, environments, LLM module and usage-control mechanism for
[PRODUCT-SPEC.md](PRODUCT-SPEC.md). It allocates system requirements from
SYS-04; the shared sign-up, session and navigation stories remain in the product
specification. It supplies foundation contracts, not implementation steps.

Exact HTTP contracts, LLM prompts and LLM input/output schemas belong to the
planned [INTEGRATION-SPEC.md](README.md#planned-specifications). Attack surfaces,
mitigations, usage-limit values, kill-switch semantics
and the security test plan belong to
[AI-SECURITY-SPEC.md](AI-SECURITY-SPEC.md). Detailed order, café,
review, sales and account behavior belongs to the planned
[story specifications](README.md#planned-specifications). Those documents must
resolve their contracts before dependent implementation; this specification
does not fill their gaps.

## Assumptions

ASM-01 is the sole remaining assumption. Former ASM-02–ASM-07 were confirmed
as decisions (with the accessibility amendment below); their IDs are retired
and must never be reused.

**[ASSUMPTION ASM-01] Individual SoCLaaS key limits remain unobservable; use the
documented defaults only as planning assumptions.** The team supplied a live
probe on 17 October 2026 returning 200 without rate-limit or cost headers and
a key-info endpoint returning 404. Real per-key limits cannot be established
without exhausting a key. The documented defaults are 90 requests/minute,
$80/day and $800/month, expressed in quota units and free for SoC students.
Rationale: these observations do not confirm either project key's entitlement.
Effect if wrong: app limits must be revised; they cannot promise quota safety
against an unknown smaller entitlement. This assumption replaces dependence on
PRODUCT-SPEC ASM-02; no new live probe is required or authorized.

## Architecture

The application uses Next.js 16.4.2 App Router under `src/app/`, strict
TypeScript, Tailwind 4, Bun 1.4.3 for package management and tooling, and Node 24
for the deployed runtime. Server Components are the default; Client Components
provide browser interaction. Backend HTTP endpoints are Next.js Route Handlers.
Shared presentation, validation and domain logic follow SRP and DRY.

| Boundary | Responsibility |
| --- | --- |
| `src/app/` | Role screens, streaming UI and HTTP adapters; no privileged client-side operations. |
| `src/proxy.ts` | Supabase session refresh and propagation of refreshed cookies; not the final authorization boundary. |
| Server-only data/domain modules under `src/server/` | Authenticate the caller, validate with Zod, enforce role and record ownership, and perform authorized database operations. Exact internal filenames outside the LLM module are implementation choices. |
| Supabase PostgreSQL and Auth | Email/password sessions, relational data, constraints, RLS and durable AI caches/counters. |
| `src/server/llm/` | The sole boundary for the `openai` package and all SoCLaaS calls; provider selection, validated feature operations, usage admission, caching and audit outcomes. |
| Vercel | The Node application, including its dynamic routes and server-only modules. |
| GitHub Pages | Static product site only; no application server behavior or secrets. |

Zod validates every untrusted boundary: browser/form/HTTP input, configuration,
external provider responses, and database/cache data entering an application
contract. Database constraints remain authoritative for relational integrity;
client validation is supplemental. Exact validation schemas and HTTP error
contracts belong to INTEGRATION-SPEC and the relevant story specifications.

Supabase Auth uses email and password. Sign-up offers Customer or Café owner;
Admin accounts come only from seed data. Email confirmation is off in both dev
and prod. The authenticated user's protected profile supplies the application
role; caller-controlled sign-up metadata cannot grant Admin access. User-facing
account fields, role changes and multiple-role accounts remain story decisions.

### Decisions: rendering, authentication and caches

Keep `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`.
The team selected the framework default for new apps: it matches the bundled
docs agents read, is slated to become mandatory in the next major release, and follows
the pattern of Vercel's own with-supabase example. The new-app/example rationale
is supplied by the team; the specific framework behavior below was checked in
the installed Next.js documentation.

- Refresh Supabase sessions in `src/proxy.ts`. Recheck authentication and
  authorization near every protected data read or mutation; proxy and UI checks
  alone never establish access.
- Each role area checks authentication inside a Server Component wrapped in
  `Suspense` and redirects unauthenticated visitors. That component also checks
  the role before rendering protected content. Its loading shell contains no
  private data. Per-user and RLS-dependent reads stream behind `Suspense`.
- The MVP uses no `"use cache"` directive in `src/`. All catalogue reads use
  session-bound Supabase clients under RLS and stream behind `Suspense`. The
  team removed catalogue caching because it provided no meaningful benefit at
  this scale and the proposed path required bypassing RLS.
- If catalogue caching is introduced in future, its cookie-less Supabase client
  must use the publishable key under RLS. A secret key must never be used inside
  or passed to a `"use cache"` scope. This future constraint does not introduce
  catalogue caching into the MVP.
- Current café eligibility is rechecked through session-bound RLS reads before
  returning customer catalogue/AI results, including results from Postgres AI
  caches. A stale AI cache entry cannot make an ineligible café visible.
- `export const instant = false` is allowed only as a per-route exception
  recorded with its route and reason in the PR. It must be placed as low as
  possible; no app-wide opt-out substitutes for the selected rendering pattern.
  This export changes navigation/static-shell validation, not permissions.
- Brew Finder's 10-minute query cache, Prep Advisor's daily cache, rate limits
  and daily caps live in Postgres. Plain `"use cache"` uses per-instance memory
  and cannot guarantee persistence across serverless invocations. Persistent
  enforcement never relies on process memory or the Next.js cache store.

The installed documentation confirms that Cache Components requires the Node.js
runtime, supports a static shell plus streamed dynamic content, and disallows
route `runtime` exports with this mode, including `runtime = 'nodejs'`.
Partial Prefetching requires Cache Components. Session reads belong behind
`Suspense`; `instant` validation is development-only at the default warning
level, so a passing production build alone does not validate authenticated
navigation behavior.

Bundled sources, relative to the repository root:

- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/partialPrefetching.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`
- `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`

## Data model and ownership

The entities below are logical contracts; column names, SQL types and exact
schemas are not API contracts. Every persisted entity has a stable identity;
ownership and relationships are enforced by foreign keys and constraints, not
solely by supplied request identifiers. Timestamps represent instants; business
dates and opening-hours calculations use `Asia/Singapore`.

| Entity | Fixed data and relationships | Ownership and RLS policy intent | Dependency intentionally left to story specs |
| --- | --- | --- | --- |
| Profiles | Supabase Auth user reference and protected role: Customer, Café owner or Admin. | A user can access their own role/profile for the role UI. Untrusted writes cannot promote a role or create Admin accounts. No additional cross-profile access is granted. | Profile fields, multiple roles and later role changes: shared account stories. |
| Cafés | Owner profile reference; application/approval state supporting pending, approval and rejection; suspension state; café profile, area and pickup-rule data. Approval and suspension are independent. | Owners access/manage only their own cafés; owner writes cannot self-approve or clear suspension. Customers read only approved, non-suspended cafés. Admins read applications/cafés and perform the product's approval/rejection and suspension/un-suspension operations. | Number of cafés per owner, profile fields, reapplication/reapproval, and effects on existing orders/access: OWN-01–OWN-04 and ADM-01–ADM-02. |
| Menu items | Café reference; item identity, name, drink type, price and availability/sold-out state. | Owners manage items only through their own café. Customer reads are restricted by parent café eligibility and include sold-out items. No extra Admin menu-write permission is implied. | Item fields, price representation, categories, deletion/history and sold-out ordering eligibility: OWN-03 and CUS-01–CUS-03. |
| Opening hours | Café reference and Singapore-local opening/closing information. | Owners manage only their café's hours. Customer reads require eligible parent café. | Overnight/boundary rules and changes affecting pickups: OWN-02, OWN-04 and CUS-01–CUS-03. |
| Orders | Customer profile and café references, pickup timing and fulfilment state; payment occurs at pickup without a payment integration. | Customers access only their own orders; owners access orders only for their café. Authorized mutations must satisfy story transitions as well as RLS. No unrelated Admin order access is granted. | Exact states/transitions, cancellation races, rejection/no-show behavior, duplicate submission and later café/hour changes: CUS-03–CUS-04 and OWN-05. |
| Order items | Parent order and menu-item identity, quantity and data required to represent the ordered purchase. | Access follows the parent order. A customer cannot attach items to another customer's order or mix an item from another café. Owner access follows ownership of the order's café. | Historical item/price snapshots and sales treatment when menus change: CUS-03 and OWN-06. |
| Reviews | Customer and collected-order references, café relationship, review content and moderation state; unique order reference prevents a second review for the same order. | Review creation requires the caller's own collected order. Customers can read their own reviews and visible reviews of eligible cafés. Admins access the moderation queue and hide/restore with a reason, never edit review text. Any further write/read permission remains denied until specified. | Fields, rating scale/formula, initial state, editing/deletion, restore and label/action relationship: CUS-02, CUS-05 and ADM-03–ADM-04. |
| AI usage counters and admission records | Environment, scope kind/identity, feature, event kind, window start/end, count and server-generated operation/admission identity. Scope/window identity is unique. | Server-only admission operations update counters atomically; clients cannot read or change counters directly. Ownership scopes derive from the verified actor/café. | Adopted usage-limit values: AI-SECURITY-SPEC; mechanism below. |
| AI caches | Environment, feature, scope identity, input fingerprint, model/contract version, source revision, creation/expiry or Singapore business date, and validated result. | Server-only reads/writes. Every hit repeats caller authorization; Prep Advisor entries are café-scoped; Brew Finder entries cannot cross actor scopes under the [cache scope decision](#cache-eligibility-and-scope). No client Data API access. | Exact feature payloads: INTEGRATION-SPEC; source selection and sales windows: AI/story specifications. |
| Audit rows | AI-use events: actor, feature/operation, timestamp and outcome; optional provider token counts when returned. Review-moderation events: acting Admin, review reference, hide/restore action, reason and timestamp. | Server-only insertion, append-only through application permissions; Admins can read the product's audit log. No user can forge actor/outcome or edit history through the Data API. AI-use rows never contain prompts or outputs. | Audit UI fields and any retention/deletion policy: ADM-03/ADM-04 and AI-SECURITY-SPEC. Moderation reasons are separate from AI prompt/output payloads. |

The model intentionally does not decide account/café cardinality beyond each
café's single owner, enumerate a full order/review lifecycle, define aggregate
sales rules, or add favourite/boost/runtime-settings entities before their
stretch story contracts exist.

### RLS and database exposure

Every application table, including infrastructure tables for caches, counters,
admissions and audit, has RLS enabled. Supabase Data API is on, automatic
exposure of new tables is off, and automatic RLS is on. Migrations nevertheless
state `enable row level security` and table/schema/function grants explicitly.
No table becomes browser-accessible solely because it exists.

Policies combine verified role, actor identity, record ownership and parent
relationships. Reads and writes use the applicable policy/`WITH CHECK` checks;
an update cannot transfer a café, order or review to evade ownership checks.
Approval, suspension and roles cannot be changed through a generic owner/profile
write. Unspecified permissions are denied; they are not an implicit Admin
superuser grant. Protected operations also authorize server-side.

All catalogue and ordinary user operations use session-bound RLS clients.
The Supabase secret key is reserved only for seed/migration administration or
server-only AI counters, admissions, caches and audit operations. It must not
replace RLS for catalogue or ordinary role operations. Server-only AI functions
that bypass RLS validate actor/scope and expose only their allowed operation.

CI queries the local database catalogue and fails if any application table lacks
RLS. CI also exercises a deny/allow matrix for unauthenticated callers, two
customers, two owners and a seeded Admin, including parent-child access and
attempts to change ownership/protected state. The RLS catalogue check covers
new tables even when Data API exposure is disabled; hosted settings alone are
not evidence that a migration is safe.

## Environments and delivery

| Context | Application and database | LLM and delivery boundary |
| --- | --- | --- |
| Local development | Node 24 app with local Supabase in Docker. | Local fake or disabled provider for checks; no hosted database access. |
| CI tests/build | Local Supabase in Docker when database tests run. | No live LLM key; deterministic fake/disabled provider. Lint, typecheck and build run through `bun run verify`. |
| Dev | Single Vercel Hobby project, Preview target in `sin1`; Supabase `homebrew-dev`, Singapore. | Dev-only SoC LLM key. GitHub `development` environment deploys from `master`. |
| Prod | Same Vercel project, Production target in `sin1`; Supabase `homebrew-prod`, Singapore. | Separate prod-only SoC LLM key. GitHub `production` environment deploys from `v*` tags with a teammate's approval. |

Application deployments occur only in GitHub Actions via the Vercel CLI.
Hosted migrations occur only in GitHub Actions via
`supabase db push --db-url`, with the selected environment's database URL.
Agents never connect to either hosted database, run deployment commands or
perform a live LLM probe. All tests and agent verification use local Supabase;
neither a Preview deployment nor a tag grants an agent permission to access it.
The static product site remains on GitHub Pages. Operation uses free tiers only,
consistent with the product's $0 cost constraint; this document creates no paid
cache or observability dependency.

## Configuration

Configuration is parsed by server-only Zod validation before use. Public settings
are explicitly allowlisted. Secrets are never emitted in errors, client bundles,
logs, cache keys or audit rows. Environment separation is checked from explicit
deployment configuration, not inferred from an API key's contents.

| Variable/configuration | Visibility and meaning |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe URL for the selected Supabase environment, local during development/tests. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | New client-safe Supabase publishable key; never an old privileged service key. |
| `SUPABASE_SECRET_KEY` | New server-only Supabase secret key; never prefixed `NEXT_PUBLIC_`. Used only for seed/migration administration or server-only AI counters, admissions, caches and audit operations. |
| `AI_PROVIDER` | `soclaas`, `fake` or `disabled`. `fake` is refused in prod. Missing `SOCLAAS_API_KEY` makes live AI disabled; every feature retains its non-AI fallback. Detailed disable precedence/kill-switch behavior belongs to AI-SECURITY-SPEC. |
| `SOCLAAS_BASE_URL` | Server-only OpenAI-compatible SoCLaaS endpoint configuration. |
| `SOCLAAS_API_KEY` | Server-only environment-specific key, never shared between dev and prod; absent from CI. |
| Model and reasoning configuration | Team-tested model `qwen3.5:9b` with `reasoning_effort: "none"`; the model remains configurable. Exact provider request schema belongs to INTEGRATION-SPEC. |
| Environment identity | Distinguishes local, CI, dev and prod; selects the correct provider/database/limit configuration and cache/counter namespace. |
| Usage limits | Configurable nonnegative integer call/action/refresh limits for each supported scope/window and environment. Final values and meanings belong to AI-SECURITY-SPEC; no proposed product number becomes final by appearing here. |
| Timezone | `Asia/Singapore` for daily resets and opening-hours/business-date calculations. |
| Deployment credentials | Environment-specific Supabase migration database URL and Vercel deployment credentials held only in GitHub environment secrets for Actions. Never part of public application configuration. |

### Configuration names

Application configuration uses `APP_ENV` (`local | ci | dev | prod`),
`SOCLAAS_MODEL` and `SOCLAAS_REASONING_EFFORT`. Limit configuration keys and
exact deployment credential names remain for AI-SECURITY-SPEC/delivery
configuration.

Supabase's projects use the publishable/secret key pair, Data API/RLS settings
above, and email confirmation off in both dev and prod. No custom SMTP or
production confirmation-on requirement is introduced.

The starter manifest currently includes Next.js, React, TypeScript and Tailwind.
Zod, `openai`, Supabase client/SSR support, shadcn/ui, Vitest and Playwright are
target dependencies rather than evidence of installed integrations. In
particular, shadcn/ui, Vitest, Playwright and `@supabase/ssr` are not yet installed.
Dependency installation and test authoring are outside this specification PR.

## LLM module

Only `src/server/llm/` imports or calls the `openai` package. It is server-only
and provides feature operations for Brew Finder, Prep Advisor and Moderation
Assistant; callers do not pass arbitrary prompts or provider credentials.

| Logical module responsibility inside `src/server/llm/` | Contract |
| --- | --- |
| Configuration and provider selection | Validate environment/provider/model configuration; select SoCLaaS, deterministic fake or disabled behavior. Fake cannot run in prod. |
| Feature orchestration | Recheck actor/role/scope, gather only authorized feature inputs, consult Postgres cache and request usage admission before dispatch. Prep Advisor receives aggregated sales only. |
| Provider adapter | Own the `openai` client and OpenAI-compatible request/response transport; record returned token counts when present. All dispatch attempts pass through usage admission. |
| Validation | Validate feature inputs and provider/cache results with Zod; reject invalid results rather than allowing them into domain writes or UI. Exact schemas/prompts remain in INTEGRATION-SPEC. |
| Usage/cache repository | Atomic Postgres admission, durable scope/window counters and authorized feature-cache lookup/write. |
| Audit and fallback result | Record actor, feature, time and outcome without prompt/output content; expose a typed result that lets each feature show its product fallback. Exact result/error shape belongs to INTEGRATION-SPEC. |

These are module boundaries, not mandated filenames or implementation steps.
LLMs have no tools and no write access. AI suggestions do not authorize a record
read or mutation. User/admin confirmation remains necessary for data-changing
suggestions. Feature fallbacks are the filtered catalogue sorted by rating
(Brew Finder), top-items table (Prep Advisor) and manual queue (Moderation
Assistant). A provider 429 takes the fallback path. Other failure and kill-switch
semantics are owned by AI-SECURITY-SPEC, with exact transport mapping in
INTEGRATION-SPEC; this specification does not invent retry policies.

## Usage-control and cache enforcement

Per-key quota uncertainty is recorded in TECHNICAL-SPEC ASM-01.

The app enforces caps below documented defaults and handles provider throttling
through fallbacks. It stores token counts from responses where present, without
inventing tokens or cost when absent. Because provider cost is not reported,
the product's proposed $5/$2 daily quota budgets remain planning inputs, not
measurable spend counters. The human decision on 2026-10-17 removes the proposed
global daily provider-call cap; no replacement cap or monetary guarantee is
introduced. Adopted per-user, per-feature and global-minute limits are defined
in [AI-SECURITY-SPEC.md](AI-SECURITY-SPEC.md#limits-and-configuration).
Actual per-key quota confirmation is still unavailable.

### Admission and windows

Postgres owns the following durable records: counters keyed by environment,
scope, feature, event type and window; admission/operation identities; and
feature cache entries. Supported scopes include global environment, actor,
feature, actor-feature and café-feature for daily Prep Advisor reuse/refresh.
The server derives scope identities from the authenticated actor and authorized
records, never directly from untrusted input. Limit values come from validated
configuration.

#### Rate windows

Rate windows use fixed, half-open minute buckets and daily windows use half-open
Singapore calendar days. A minute is the UTC epoch-aligned 60-second interval
containing the database timestamp; a day is midnight through the following
midnight in `Asia/Singapore`. The database clock determines window membership.
New windows have independent counters; expiry/cleanup is not a reset mechanism
and requires no midnight job. This shared clock and explicit boundaries allow
deterministic concurrent enforcement.

#### Provider-call accounting

Provider calls are charged by dispatch attempt, with an atomic reservation
immediately before each attempt. In one transaction, the admission operation
checks every applicable limit and increments/reserves all applicable call
counters only if all have capacity. A denial changes none of those counters
and makes no call. A dispatched attempt remains charged on 429, timeout,
transport failure or invalid output; no refund is inferred. A retry or second
call requires its own admission. Reusing the same admission identity does not
authorize a second dispatch. The provider may have consumed quota even when the
result is unavailable. This confirmed counting mechanism does not define a
user-facing AI action.

The feature boundary records an authorized operation event before cache lookup;
a cache hit is distinguishable from a provider attempt. A manual refresh records
a separate refresh event, and a cache miss/rebuild records any actual dispatched
calls. The mechanism can independently enforce configured action, refresh and
call counters. Missing or invalid required limit configuration cannot authorize
a provider dispatch. The human decision on 2026-10-17 removes the additional
action/cache-hit/failure/refresh charging-policy requirement. It does not remove
the adopted usage limits or the per-attempt provider reservation above. No
provider call bypasses its reservation.

If Postgres admission cannot be established, no provider call is dispatched and
the feature uses its non-AI fallback. Concurrent serverless invocations share
the same atomic admission state; an app restart or deploy does not restore quota.
Retention/cleanup of counter, admission and audit history remains an
AI-SECURITY-SPEC decision and cannot change the active window's enforcement.

### Cache eligibility and scope

Only validated successful feature results are eligible for AI cache storage.
Cache access rechecks role, ownership and current source eligibility. Cache keys
include environment, feature, authorized scope, an input fingerprint, model and
contract version, and relevant source revision; no secret is a key component.
Invalid/expired/mismatched entries are misses. Raw query content is not placed
in usage/audit records. The cache payload's exact validated schema belongs to
INTEGRATION-SPEC.

Brew Finder cache reuse is limited to the same actor and authorized input/source
snapshot; Prep Advisor reuse is limited to the same café, business date and
aggregate-data version. Brew Finder entries expire 10 minutes after creation;
Prep Advisor entries expire at the next Singapore midnight, with a successful
authorized manual refresh replacing the eligible daily result. Manual refresh
bypasses the existing result, not admission. Moderation Assistant has no reusable
result cache defined here. These scopes avoid sharing user queries or stale
eligibility across users and keep owner sales isolated. Exact query
canonicalization, source revision inputs and minimum sales data depend on
INTEGRATION-SPEC and CUS-06/OWN-06/OWN-07. Old source eligibility is never
sufficient to return a suspended/unapproved café.

## Accessibility and responsive behavior

### Automated accessibility checks

Core flows have automated accessibility checks with no unresolved violations.
Core flows are sign-up/sign-in/role navigation, café browsing and pickup
ordering, collected-order review, café/menu/order management, and
application/review moderation, including the three AI panels and fallbacks.
This requirement does not claim full WCAG 2.2 AA conformance and does not require
manual conformance assessment.

### Responsive core flows

Core flows remain usable from a 360 px viewport width. At 360 px and wider,
information, labels, errors and required controls remain reachable without
clipped/overlapping content; ordinary pages do not require horizontal scrolling
to complete a core flow. No numeric performance, latency, throughput or
availability target is introduced.

## System requirements and acceptance criteria

### SYS-04 — Runtime and application boundaries

- **SYS-04.1:** The application uses Next.js 16.4.2 App Router under `src/app/`,
  strict TypeScript and Tailwind 4; tooling declares Bun 1.4.3 and deployment
  selects Node 24. `bun run verify` passes.
- **SYS-04.2:** Untrusted request/configuration/provider/cache boundaries have
  server-side Zod validation. Invalid data cannot reach a protected mutation or
  a validated AI result; exact field/error cases trace to integration/story
  contracts before dependent tests are authored.
- **SYS-04.3:** Client bundles do not include secret credentials, privileged
  database operations or `openai`. An import-boundary check permits `openai`
  imports only inside server-only `src/server/llm/`.

### SYS-05 — Streaming authentication and catalogue access

- **SYS-05.1:** Both rendering flags remain true. Each role area performs its
  auth/role check inside a Suspense-wrapped Server Component; unauthenticated
  access redirects and a wrong-role session receives no protected content.
  Per-user/RLS-dependent data is absent from static shells and streams only
  after authorized request-time reads.
- **SYS-05.2:** Supabase session refresh occurs in `src/proxy.ts` with cookie
  propagation; direct protected route/mutation access independently verifies
  the session and record permissions. An expired/invalid session cannot gain
  access through a prefetched shell.
- **SYS-05.3:** Inspection finds no `"use cache"` directive in `src/` for the
  MVP. All catalogue reads use session-bound RLS clients and stream behind
  `Suspense`. Suspending/unapproving a café prevents subsequent customer
  catalogue/AI results from returning it, including through a Postgres AI cache.
- **SYS-05.4:** Each `export const instant = false` is confined to its route
  and has a reason in its PR.

### SYS-06 — Relational integrity, roles and RLS

- **SYS-06.1:** Local migrations produce the entities/relationships in the data
  model, including a unique review-per-order constraint. A second review for the
  same order or an order item from another café is rejected by authorized
  database/domain enforcement.
- **SYS-06.2:** CI's local database catalogue check finds RLS enabled on every
  application table, including newly added/unexposed infrastructure tables.
  Migrations explicitly define RLS and grants; an unexposed table does not
  bypass the check.
- **SYS-06.3:** The two-customer/two-owner/Admin/unauthenticated access matrix
  verifies each defined allow/deny boundary, including cross-owner records,
  parent-child rows, self-approval, role escalation and ownership reassignment.
  No unspecified permission is granted.
- **SYS-06.4:** Email/password sign-up accepts only Customer or Café owner;
  client metadata cannot create an Admin. Admin accounts originate from seed
  data, and email confirmation configuration is off in both dev and prod.

### SYS-07 — Environment and configuration isolation

- **SYS-07.1:** Deployment configuration maps `master`/`development` to Vercel
  Preview and `homebrew-dev`, and approved `v*`/`production` to Vercel Production
  and `homebrew-prod`; the single Vercel Hobby project uses `sin1` and Supabase
  projects use Singapore. App deploy and hosted migration paths exist only in
  GitHub Actions, with production teammate approval.
- **SYS-07.2:** Configuration validation rejects invalid environment/provider
  combinations and refuses fake in prod. In `soclaas` mode, a missing live key
  disables live AI and the feature fallbacks remain available. Local/CI fake
  mode requires no live key. CI has no live LLM key; local development/tests
  address local Docker Supabase only.
- **SYS-07.3:** Dev and prod use distinct Supabase settings and SoC LLM secret
  bindings. Only the URL and publishable key are public; secret keys and
  migration/deploy credentials are absent from generated client artifacts and
  error/audit output. Validation uses fake credentials/configuration, not live
  key probes or hosted database access.

### SYS-08 — LLM isolation and validated fallbacks

- **SYS-08.1:** Every AI dispatch goes through the LLM module's configured
  provider adapter and usage admission. Deterministic fake-provider checks
  exercise the three feature operations without network calls to SoCLaaS.
- **SYS-08.2:** Model/reasoning configuration can change without feature code
  changes. Prep Advisor input contains aggregated sales only. Zod validation
  rejects invalid provider/cache results; LLM operations have no tools or
  direct write access.
- **SYS-08.3:** With a missing key in `soclaas` mode, disabled provider,
  denied/unavailable admission, or a fake provider 429, Brew Finder offers its
  filtered list sorted by rating,
  Prep Advisor its top-items table and Moderation Assistant its manual queue.
  Exact remaining errors/kill-switch cases await the security/integration
  contracts rather than a new fallback policy here.

### SYS-09 — Durable usage enforcement

- **SYS-09.1:** Independent app instances use the same Postgres counters and
  admissions; a restart/deploy does not reset them. Configured scope/window
  values can differ between dev and prod without changing feature code.
- **SYS-09.2:** Under concurrent admissions at a configured cap, dispatched
  calls never exceed remaining capacity; a denied multi-scope reservation
  increments none of its counters. A duplicate admission identity cannot
  authorize a second dispatch, following the
  [provider-call accounting decision](#provider-call-accounting).
- **SYS-09.3:** Clock-controlled checks cover just before, at and after minute
  and Singapore-midnight boundaries under the
  [rate-window decision](#rate-windows). The new day gets a new counter namespace
  without a cleanup job resetting the previous day.
- **SYS-09.4:** A cache hit makes no provider-call reservation. Each actual
  attempted call, including a second call/retry and a failed/429 attempt, has
  its own reservation under the
  [provider-call accounting decision](#provider-call-accounting). Action/refresh
  events remain distinguishable without an additional charging policy.
- **SYS-09.5:** Usage admission uses the adopted configured limits, never
  fabricated monetary cost or a global daily provider-call cap.
  Returned token counts are preserved where present;
  missing cost/token information remains unknown. Provider 429 results use the
  non-AI fallback without requiring a real quota-exhaustion test.

### SYS-10 — Durable feature caches and audit

- **SYS-10.1:** Postgres stores eligible AI results under the
  [cache scope decision](#cache-eligibility-and-scope). Tests with a controlled
  clock check Brew Finder expiry at 10 minutes and Prep Advisor's
  Singapore-midnight rollover, scope isolation, source/model/schema changes
  and manual refresh bypassing a cached result while retaining admission.
- **SYS-10.2:** Every cache hit rechecks role/ownership and current catalogue
  eligibility. A different actor/café or an invalidated source cannot receive
  a prior cached result; invalid provider outputs are not stored as successes.
- **SYS-10.3:** Authorized AI invocations record who, what, when and outcome,
  including cache/fallback/provider outcomes, without prompts or outputs.
  Ordinary clients cannot insert or mutate audit/counter/cache rows. Admin
  hide/restore operations record the separate moderation action and reason.

### SYS-11 — Accessible responsive core flows

- **SYS-11.1:** [Core flows](#automated-accessibility-checks) have automated
  accessibility checks with no unresolved violations. This is not a claim of
  full WCAG 2.2 AA conformance; manual conformance assessment is not required.
- **SYS-11.2:** At 360 px and representative wider viewports, each core flow
  can be completed with readable labels/errors and reachable controls, without
  clipping, overlap or page-level horizontal scrolling under the
  [responsive decision](#responsive-core-flows). Tests do not impose an invented
  numeric performance target.

The requirements describe future acceptance evidence. Existing starter
verification does not establish that unimplemented architecture, integrations,
RLS policies or accessibility flows already satisfy these criteria.
