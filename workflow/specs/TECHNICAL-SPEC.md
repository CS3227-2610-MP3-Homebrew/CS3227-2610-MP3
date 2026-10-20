# Homebrew technical specification

## Purpose and boundaries

This specification defines the shared architecture, data ownership, RLS,
configuration, environments, LLM module and usage-control mechanism for
[PRODUCT-SPEC.md](PRODUCT-SPEC.md). It allocates system requirements from
SYS-04; the shared sign-up, session and navigation stories remain in the product
specification. It supplies foundation contracts, not implementation steps.

Exact HTTP contracts, LLM prompts and LLM input/output schemas belong to the
[INTEGRATION-SPEC.md](INTEGRATION-SPEC.md). Attack surfaces,
mitigations, usage-limit values, kill-switch semantics
and the security test plan belong to
[AI-SECURITY-SPEC.md](AI-SECURITY-SPEC.md). Detailed order, café,
review, sales and account behavior belongs to the
[story specifications](README.md#specifications). Those documents must
resolve their contracts before dependent implementation; this specification
does not fill their gaps.

## Assumptions

Retired IDs: ASM-02–ASM-07.

**[ASSUMPTION ASM-01] Individual SoCLaaS key limits remain unobservable; use the
documented defaults only as planning assumptions.** A live probe returned 200
without rate-limit or cost headers and a key-info endpoint returned 404. Real
per-key limits cannot be established
without exhausting a key. The documented defaults are 90 requests/minute,
$80/day and $800/month, expressed in quota units and free for SoC students.
Rationale: these observations do not confirm either project key's entitlement.
Effect if wrong: app limits must be revised; they cannot promise quota safety
against an unknown smaller entitlement.

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

Supabase Auth uses email and password. Sign-up offers Customer or Café owner.
The maintenance job seeds the main Admin; each demo kit has a kit-scoped Admin.
Sign-up never creates an Admin. Email confirmation is off in both dev and prod. The authenticated user's protected profile supplies the application
role; caller-controlled sign-up metadata cannot grant Admin access. User-facing
account fields, role changes and multiple-role accounts remain story decisions.

### Decisions: rendering, authentication and caches

Keep `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`.
These framework defaults for new apps match the bundled documentation, are
slated to become mandatory in the next major release, and follow the pattern
of Vercel's with-supabase example. The framework behavior below follows the
installed Next.js documentation.

- Refresh Supabase sessions in `src/proxy.ts`. Recheck authentication and
  authorization near every protected data read or mutation; proxy and UI checks
  alone never establish access.
- Each role area checks authentication inside a Server Component wrapped in
  `Suspense` and redirects unauthenticated visitors. That component also checks
  the role before rendering protected content. Its loading shell contains no
  private data. Per-user and RLS-dependent reads stream behind `Suspense`.
- The MVP uses no `"use cache"` directive in `src/`. All catalogue reads use
  session-bound Supabase clients under RLS and stream behind `Suspense`. The
  MVP has no catalogue cache because caching gives no meaningful benefit at
  this scale and a cached read path would bypass RLS.
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
- Brew Finder's query cache, Prep Advisor's daily cache, rate limits and daily
  caps live in Postgres. Plain `"use cache"` uses per-instance memory
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
| Workspaces | Stable workspace identity; one main workspace and one workspace per demo kit. | Actor access is limited to their own workspace; no role, including Admin, gains cross-workspace access. | None for workspace identity and isolation. |
| Profiles | Workspace reference; Supabase Auth user reference and protected role: Customer, Café owner or Admin. | A user can access their own role/profile for the role UI. Untrusted writes cannot promote a role or create Admin accounts. No additional cross-profile access is granted. | Profile fields, multiple roles and later role changes: shared account stories. |
| Cafés | Workspace and owner profile references; application/approval state supporting pending, approval and rejection; suspension state; café profile, area and pickup-rule data. Approval and suspension are independent. | Owners access/manage only their own cafés; owner writes cannot self-approve or clear suspension. Customers read only approved, non-suspended cafés. Admins read applications/cafés and perform the product's approval/rejection and suspension/un-suspension operations. | Number of cafés per owner and profile fields: OWN-01–OWN-04. Application decisions and one-way approval: [ADM-01](stories/ADM-01-cafe-applications.md); rejection resubmission is OWN-01's owner action. Suspension and effects on existing orders/access: [ADM-02](stories/ADM-02-cafe-suspension.md). |
| Menu items | Café reference; item identity, name, DrinkType, integer SGD price cents and sold-out state; customer projections follow the [catalogue boundary](INTEGRATION-SPEC.md#customer-catalogue-and-detail-boundary). | Owners manage items only through their own café. Customer reads require parent eligibility and include sold-out items; new orders require available items. No extra Admin menu-write permission. | Owner edit validation, item removal/history management: OWN-03; customer eligibility/snapshots: CUS-01–CUS-03. |
| Opening hours | Café reference; weekly Singapore-local opening/closing intervals with explicit next-day closing and café pickup-cutoff offset, projected by the [customer boundary](INTEGRATION-SPEC.md#customer-catalogue-and-detail-boundary). | Owner management stays within their café. Customer reads require eligible parent; new pickup validation uses current intervals/rules. | Owner hour/rule edit contracts: OWN-02/OWN-04; Customer time/slot behaviour: CUS-01–CUS-03. |
| Orders | Customer/café references; placed/pickup instants, fulfilment state, café-name/price snapshots, total cents and fixed public cancellation reason under [CUS-03/CUS-04 transport](INTEGRATION-SPEC.md#customer-pickup-and-order-boundary). | Customers read their own retained purchases and cancel only pending; owners access only their café queue. Mutations satisfy story transitions/RLS. No unrelated Admin order access. | Owner queue action contracts: OWN-05; Customer creation/read/races: CUS-03–CUS-04; suspension transaction: ADM-02. |
| Order items | Parent order/menu-item identity, integer quantity 1–20 and immutable item-name/unit-price/line-total snapshots in SGD cents. | Access follows parent order; cross-customer or cross-café attachment is denied. Historical data remains readable after menu changes. | Snapshot creation: CUS-03; owner menu removal strategy: OWN-03; sales aggregation: OWN-06. |
| Order submission keys | Verified Customer, unique submission key, normalized creation request identity and resulting order reference. Successful key persists with order history. | Creation/key/items commit together. Only the owning authenticated Customer can obtain a replay through its ordinary order operation; no public key lookup or new role permission. | Exact idempotency request/conflict semantics: CUS-03 and [order boundary](INTEGRATION-SPEC.md#customer-pickup-and-order-boundary). |
| Reviews | Customer and collected-order references, café relationship, review content and moderation state (`pending`, `kept`, `hidden`) as defined by [ADM-03](stories/ADM-03-review-moderation.md); unique order reference prevents a second review for the same order. Review text and rating are immutable after creation; customers cannot edit or delete reviews in the MVP. | Review creation requires the caller's own collected order. Customers can read their own reviews and visible reviews of eligible cafés. Admins access the moderation queue and keep, hide or restore with a reason, never edit review text. Any further write/read permission remains denied until specified. | Fields and rating scale/formula: CUS-01–CUS-02 and CUS-05. Initial state and moderation transitions: [ADM-03](stories/ADM-03-review-moderation.md); AI label/action relationship: [ADM-04](stories/ADM-04-moderation-assistant.md). |
| Favourites (stretch only) | Unique Customer/café association, original server saved timestamp; workspace inherited through café and checked against Customer. | Personal Customer-only save/read with current catalogue eligibility independently enforced; no owner/Admin access, sharing, removal or public count. Ineligible associations persist without disclosing café content. | [CUS-07](stories/CUS-07-favourite-cafes.md) and [optional favourite boundary](INTEGRATION-SPEC.md#stretch-favourite-boundary). |
| AI usage counters and admission records | Environment, scope kind/identity, feature, event kind, window start/end, count and server-generated operation/admission identity. Scope/window identity is unique. | Server-only admission operations update counters atomically; clients cannot read or change counters directly. Ownership scopes derive from the verified actor/café. | Adopted usage-limit values: AI-SECURITY-SPEC; mechanism below. |
| AI caches | Environment, feature, scope identity, input fingerprint, model/contract version, source revision, creation/expiry or Singapore business date, and validated result. | Server-only reads/writes. Every hit repeats caller authorization; Prep Advisor entries are café-scoped; Brew Finder entries cannot cross actor scopes under the [cache scope decision](#cache-eligibility-and-scope). No client Data API access. | Exact feature payloads: INTEGRATION-SPEC; source selection and sales windows: AI/story specifications. |
| Audit rows | AI-use events: actor, feature/operation, timestamp and outcome; optional provider token counts when returned. Admin-action events: approve, reject, suspend, un-suspend, keep, hide and restore, each with acting Admin, target café or review reference, action, reason and timestamp. Admin-action entries are never deleted automatically. | Server-only insertion, append-only through application permissions; Admins can read the product's audit log. No user can forge actor/outcome or edit history through the Data API. AI-use rows never contain prompts or outputs. | Audit UI fields: [ADM-03](stories/ADM-03-review-moderation.md). AI retention: AI-SECURITY-SPEC. Admin reasons are separate from AI prompt/output payloads. |

Workspace references are stored on Profiles and Cafés only. Menu items,
opening hours, orders, order items and reviews inherit their workspace through
their café. Relations must not join actors or parent/child records across
workspaces. All server and RLS reads/writes, including Admin audit access, AI
source selection and AI cache access, enforce the verified actor's workspace
in addition to existing role/ownership rules. A kit Admin cannot access the main
workspace or another kit. Normal sign-ups always join the main workspace;
untrusted input cannot select or reassign a workspace.

The model intentionally does not decide account/café cardinality beyond each
café's single owner, owner edit/queue APIs, aggregate sales rules, or boost and
runtime-settings entities before their owning story contracts exist. Optional
favourite data is established solely by CUS-07 and does not add an MVP entity.

### Customer contract data and integrity

The [customer integration boundaries](INTEGRATION-SPEC.md#customer-catalogue-and-detail-boundary)
project domain data for CUS-01–CUS-07; they do not grant owner edit permissions.
Shared Area and DrinkType values are exact domain enums there, including
matcha and the Central/North/South/East/West area set. Monetary fields persist
integer SGD cents, never floating-point dollars; all customer amounts display
as dollars to exactly two decimal places. Customer ratings aggregate the
original visible ratings under CUS-01's single formula; rounded display means
never replace original ratings or determine tie order.

Orders preserve their original café-name/item-name/unit-price/quantity/pickup
snapshots after menu, price, hour and rule edits. Item references and histories
must survive removal from the current orderable menu; no cascading deletion
can erase a recorded purchase or its review. This does not select the owner's
menu deletion/archive UI. Current schema relationships alone do not constitute
the completed customer field/state model.

Relational uniqueness enforces successful Customer/submission-key identity,
one review per order and optional Customer/café favourite identity. Actor,
workspace and parent café derive from verified relationships. Business state
checks and transitions are atomic with those constraints, not form assertions.
Order creation/owner queue/customer cancellation and Admin suspension serialize
their competing café/order effects under the [shared race matrix](INTEGRATION-SPEC.md#customer-pickup-and-order-boundary).
Suspension alone applies pending/accepted/ready cancellations with its audit
transaction; there is no general Admin order-edit grant. Collected/rejected/
cancelled states and historical snapshots remain unchanged.

Review creation validates own collected state even after café suspension;
RLS permits that own-purchase operation without permitting the Customer to read
the restricted live café. A Customer can read its own hidden review; public
reads remain pending/kept only on eligible cafés. Original rating/text are
immutable under ADM-03; field limits come from CUS-05, not AI input limits.

Optional favourites persist across sessions/devices, enforce Customer ownership
and matching actor/café workspace in RLS, and allow no ownership transfer or
deletion operation through this feature. Saved-list projections and pagination
exclude currently ineligible cafés; retained associations reappear when eligible
again. Repeated saves preserve the unique association's original timestamp.
Neither the association nor its cached UI state grants café access. Ordinary
role operations continue to use session-bound RLS clients.

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
customers, two owners, a main Admin and a kit Admin across workspaces, including
cross-workspace and parent-child access and attempts to change ownership/protected state. The RLS catalogue check covers
new tables even when Data API exposure is disabled; hosted settings alone are
not evidence that a migration is safe.

## Environments and delivery

| Context | Application and database | LLM and delivery boundary |
| --- | --- | --- |
| Local development | Node 24 app with local Supabase in Docker. | Local fake or disabled provider for checks; no hosted database access. |
| CI tests/build | Local Supabase in Docker when database tests run. | No live LLM key; deterministic fake/disabled provider. Lint, typecheck and build run through `bun run verify`. |
| Dev | Single Vercel Hobby project, Preview target in `sin1`; Supabase `homebrew-dev`, Singapore. | Dev-only SoC LLM key. GitHub `development` environment deploys from `master`. |
| Prod | Same Vercel project, Production target in `sin1`; Supabase `homebrew-prod`, Singapore. | Separate prod-only SoC LLM key. GitHub `production` environment deploys from `v*` tags with a listed reviewer's approval. |

Application deployments occur only in GitHub Actions via the Vercel CLI.

- **GitHub environments and triggers:** `development` permits only the `master`
  branch and deploys on pushes to `master`. `production` permits only tags matching
  `v*`, no branches, and deploys on pushes of those tags; it refuses a tag whose
  commit is not reachable from `master`. Production requires a listed
  reviewer's approval; self-review and administrator bypass are allowed.
- **Credentials:** Each GitHub environment holds secrets `VERCEL_TOKEN` and
  `SUPABASE_DB_URL`, and variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.
  `VERCEL_TOKEN` is scoped to the Vercel project, so delivery never uses Vercel
  CLI commands that look up the token's account, such as `vercel alias` and
  `vercel promote`; it uses Vercel's REST API for those operations. The token
  is never passed as a process argument.
  Production also holds secret `CRON_SECRET`, equal to Vercel Production's value,
  used only for SYS-13's single post-deploy maintenance call. SYS-13 defines that call.
  There are no repository- or organization-level deploy secrets; only jobs
  bound to the selected environment read its credentials.
- **Database connection:** `SUPABASE_DB_URL` is the selected environment's
  Supavisor shared-pooler session-mode connection string: port 5432, user
  `postgres.<project-ref>` and a percent-encoded password. GitHub-hosted runners
  are IPv4-only; the direct `db.<project-ref>.supabase.co` host is IPv6 without
  the paid IPv4 add-on. Delivery never uses that direct host or transaction mode
  (port 6543).
- **Migration and deploy job:** Each environment has one job. Hosted migrations
  run first, only in Actions, using `supabase db push --db-url` with that
  environment's secret; a failed migration stops application deployment. With
  no migrations, the step applies nothing and deployment continues. The single
  production job gives one approval for both migration and deploy. Delivery
  paths never use `--include-seed`, seed files, `db reset` or demo/local
  credentials.
- **Application build:** The Vercel CLI is pinned to an exact version. Actions
  builds the application with CI's toolchain: Bun from `package.json`'s
  `packageManager` and Node 24. The sequence is
  `vercel pull --environment=<preview|production>`, `vercel build`, then
  `vercel deploy --prebuilt`; production alone adds `--prod` to both build and
  deploy. The build reads no Secret-type value: `vercel pull` cannot return
  Secret values, so application credentials are read at request time, never
  at build time.
- **Vercel project:** Dev is a Preview deployment aliased to
  `homebrew-cs3227-dev.vercel.app`; prod is a `--prod` deployment served at
  `homebrew-cs3227-prod.vercel.app`. `vercel.json` declares
  `"regions": ["sin1"]` and disables Vercel Git deployments. Standard
  Deployment Protection stays on, keeping other non-production domains behind
  a Vercel login; `homebrew-cs3227-dev.vercel.app` is a Deployment Protection
  Exception, so the dev alias is publicly reachable.
- **Application configuration:** Vercel project settings, rather than workflows,
  set application environment variables per target: Preview holds dev values
  and Production holds prod values. Only `SUPABASE_SECRET_KEY`, `SOCLAAS_API_KEY`,
  `CRON_SECRET` and `MAIN_ADMIN_PASSWORD` are Secret type. All other values are
  Config type: `NEXT_PUBLIC_` values, `APP_ENV`, `AI_PROVIDER`, `SOCLAAS_BASE_URL`,
  `SOCLAAS_MODEL`, `SOCLAAS_REASONING_EFFORT`, usage-limit keys, `DEMO_KITS_*` and
  `MAIN_ADMIN_EMAIL`. Both targets set every AI policy key in
  [AI-SECURITY-SPEC's limits table](AI-SECURITY-SPEC.md#limits-and-configuration),
  because missing policy configuration disables AI.
- **Workflow hygiene:** Workflows use `permissions: contents: read`, pin
  third-party actions to commit SHAs, and have one concurrency group per
  environment that never cancels an in-progress deploy.

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
| Usage limits | Configurable nonnegative integer call/action/refresh limits for each supported scope/window and environment. Values and meanings belong to AI-SECURITY-SPEC. |
| `AI_GLOBAL_CALLS_PER_DAY` | Server-only nonnegative integer global provider-attempt cap per environment/Singapore day, enforced atomically alongside other call limits. Values and validation policy belong to [AI-SECURITY-SPEC](AI-SECURITY-SPEC.md#limits-and-configuration). |
| `CRON_SECRET` | Server-only, environment-specific bearer secret for the maintenance endpoint; absent from responses and logs. |
| `MAIN_ADMIN_EMAIL` | Server-only email used only to create the main Admin if no account with that email exists. |
| `MAIN_ADMIN_PASSWORD` | Server-only initial password for that creation; maintenance never resets or updates an existing account. |
| `DEMO_KITS_PER_10_MINUTES` | Server-only global kit-creation cap: 5 kits per fixed 10-minute window, using durable Postgres counters and the database clock. |
| `DEMO_KITS_PER_DAY` | Server-only global kit-creation cap: 30 kits per Singapore calendar day, using the same durable Postgres counter/window mechanism as AI usage control. |
| Timezone | `Asia/Singapore` for daily resets and opening-hours/business-date calculations. |
| Deployment credentials | Each GitHub environment holds secrets `VERCEL_TOKEN` and `SUPABASE_DB_URL` and variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`; production also holds `CRON_SECRET` for SYS-13's single post-deploy maintenance call. Only jobs bound to that environment read them; no repository- or organization-level deploy secrets. See [delivery rules](#environments-and-delivery). Never part of public application configuration. |

### Configuration names

Application configuration uses `APP_ENV` (`local | ci | dev | prod`),
`SOCLAAS_MODEL` and `SOCLAAS_REASONING_EFFORT`. Limit configuration keys are
defined in [AI-SECURITY-SPEC](AI-SECURITY-SPEC.md#limits-and-configuration); deployment
credential names and their GitHub secret/variable scopes are defined in the
[delivery rules](#environments-and-delivery).

Supabase's projects use the publishable/secret key pair, Data API/RLS settings
above, and email confirmation off in both dev and prod. No custom SMTP or
production confirmation-on requirement is introduced.

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
inventing tokens or cost when absent. The authoritative
[AI security usage policy](AI-SECURITY-SPEC.md#limits-and-configuration) defines
per-user, per-feature, global-minute and global-daily limit values.
`AI_GLOBAL_CALLS_PER_DAY` limits provider attempts per Singapore calendar day;
these are call-count limits, not monetary budgets or guarantees about provider
quota consumption. Actual per-key quota confirmation remains unavailable.

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
result is unavailable. This counting mechanism does not define a user-facing
AI action.

The same atomic reservation includes the environment's global daily
provider-attempt counter alongside global-minute, feature and operation call
limits. Every dispatched attempt consumes daily capacity, including errors,
429s, timeouts and invalid output. Cache hits consume no provider-attempt
capacity. Daily-cap exhaustion denies dispatch and uses the authorized feature's
non-AI fallback. The database clock selects the Singapore-day window defined
above; midnight creates a new window, while restart/deploy/cleanup never reset
active capacity. Zero denies dispatch; missing/invalid required limit
configuration or unavailable admission fails closed with the fallback, following
the security policy. Local/CI checks use explicit synthetic caps and the fake
provider, never a dev/prod namespace or a live exhaustion probe.

The feature boundary records an authorized operation event before cache lookup;
a cache hit is distinguishable from a provider attempt. A manual refresh records
a separate refresh event, and a cache miss/rebuild records any actual dispatched
calls. The mechanism can independently enforce configured action, refresh and
call counters. Missing or invalid required limit configuration cannot authorize
a provider dispatch. No additional action/cache-hit/failure/refresh charging
policy is required. The usage limits and per-attempt provider reservation above
apply to every provider call.

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
aggregate-data version. Brew Finder entries expire after the duration defined in
[AI-SECURITY-SPEC](AI-SECURITY-SPEC.md#cache-rendering-and-human-confirmation);
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
- **SYS-06.3:** The two-customer/two-owner/main-Admin/kit-Admin/unauthenticated
  access matrix verifies each defined allow/deny boundary, including
  cross-workspace cases for every role, cross-owner records,
  parent-child rows, self-approval, role escalation and ownership reassignment.
  No unspecified permission is granted.
- **SYS-06.4:** Email/password sign-up accepts only Customer or Café owner;
  client metadata cannot create an Admin in any workspace. The maintenance job
  seeds the main Admin, each demo kit has its own kit-scoped Admin, and sign-up
  never creates an Admin. Email confirmation configuration is off in both dev
  and prod.

### SYS-07 — Environment and configuration isolation

- **SYS-07.1:** Deployment configuration maps `master`/`development` to Vercel
  Preview and `homebrew-dev`, and approved `v*`/`production` to Vercel Production
  and `homebrew-prod`; the single Vercel Hobby project uses `sin1` and Supabase
  projects use Singapore. App deploy and hosted migration paths exist only in
  GitHub Actions, with production reviewer approval, following the
  [environment and delivery rules](#environments-and-delivery).
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
  Exact remaining errors/kill-switch cases follow the security/integration
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
- **SYS-09.5:** Usage admission uses the adopted configured limits, including
  `AI_GLOBAL_CALLS_PER_DAY` under the
  [AI security usage policy](AI-SECURITY-SPEC.md#limits-and-configuration).
  Concurrent provider attempts cannot exceed the environment's daily cap;
  exhausted capacity denies dispatch and offers the authorized non-AI fallback.
  Every dispatched attempt, including failures, consumes daily capacity; cache
  hits make no attempt. Database-clock Singapore-midnight rollover creates a
  new daily window without resetting active counters. Limits/counts are never
  represented as measured monetary cost or confirmed provider entitlements.
  Returned token counts are preserved where present;
  missing cost/token information remains unknown. Provider 429 results use the
  non-AI fallback without requiring a real quota-exhaustion test.

### SYS-10 — Durable feature caches and audit

- **SYS-10.1:** Postgres stores eligible AI results under the
  [cache scope decision](#cache-eligibility-and-scope). Tests with a controlled
  clock check Brew Finder expiry at its
  [security-defined duration](AI-SECURITY-SPEC.md#cache-rendering-and-human-confirmation)
  and Prep Advisor's
  Singapore-midnight rollover, scope isolation, source/model/schema changes
  and manual refresh bypassing a cached result while retaining admission.
- **SYS-10.2:** Every cache hit rechecks role/ownership and current catalogue
  eligibility. A different actor/café or an invalidated source cannot receive
  a prior cached result; invalid provider outputs are not stored as successes.
- **SYS-10.3:** Authorized AI invocations record who, what, when and outcome,
  including cache/fallback/provider outcomes, without prompts or outputs.
  Ordinary clients cannot insert or mutate audit/counter/cache rows. Admin
  state changes record a separate Admin audit entry with action and reason.

### SYS-11 — Accessible responsive core flows

- **SYS-11.1:** [Core flows](#automated-accessibility-checks) have automated
  accessibility checks with no unresolved violations. This is not a claim of
  full WCAG 2.2 AA conformance; manual conformance assessment is not required.
- **SYS-11.2:** At 360 px and representative wider viewports, each core flow
  can be completed with readable labels/errors and reachable controls, without
  clipping, overlap or page-level horizontal scrolling under the
  [responsive decision](#responsive-core-flows). Tests do not impose an invented
  numeric performance target.

### SYS-12 — Workspaces and demo kits

- **SYS-12.1:** Local migrations provide a Workspaces entity with one main
  workspace and one workspace per demo kit. Only Profiles and Cafés store a
  workspace reference; menu items, opening hours, orders, order items and
  reviews inherit it through their café. Constraints prevent cross-workspace
  parent/child and actor/café relationships.
- **SYS-12.2:** Server authorization and RLS restrict every role's reads and
  writes to its own workspace, including Admin operations, AI source reads and
  AI caches. Main-to-kit, kit-to-main and kit-to-kit access is denied without
  relaxing any existing role/ownership boundary.
- **SYS-12.3:** Normal sign-ups always join the main workspace. Caller-supplied
  metadata/references cannot select or reassign a workspace or escalate a role;
  sign-up never creates an Admin in any workspace.
- **SYS-12.4:** The sign-in page offers **Create demo kit** without requiring a
  session. Successful `POST /api/demo-kits` creates a new isolated workspace
  and returns exactly three published sign-in accounts: Customer, Café owner
  and Admin. Emails are `customer-<code>@example.com`,
  `owner-<code>@example.com` and `admin-<code>@example.com`, with the same random
  code for the three accounts. All sign in through the normal sign-in screen.
- **SYS-12.5:** Each published account receives its own cryptographically
  secure random password of at least 16 characters. Passwords persist only as
  Supabase Auth stores them; they appear only in the creation response, shown
  once, never in logs, audit rows or later responses.
- **SYS-12.6:** Kit creation is all-or-nothing: failures leave no partial kit,
  workspace, seeded domain data or accounts, including the unpublished owner.
- **SYS-12.7:** Creation obeys both globally shared server-only configured caps:
  5 kits per fixed 10-minute window and 30 per Singapore calendar day. The same
  durable Postgres atomic counter/window mechanism as AI usage control enforces
  both across callers and app instances. Exhaustion returns 429 `RATE_LIMITED`
  with `Retry-After` and a clear message saying when to try again. Unavailable
  counters fail creation closed.
- **SYS-12.8:** Kit creation makes no LLM call. Kits never expire and are never
  deleted automatically.
- **SYS-12.9:** Inside each kit, the Customer has several collected orders still
  eligible for review and at least one order in another state. The published
  Café owner owns one approved, non-suspended café with a menu including a
  sold-out item, opening hours, pickup rules and about four weeks of sales
  history dated relative to kit creation, sufficient for non-trivial sales
  dashboard and Prep Advisor results. Seeded states and review eligibility use
  the owning CUS-03–CUS-05 and OWN-01–OWN-05 story contracts.
- **SYS-12.10:** Each kit also contains a second café with a pending application
  for Admin approval or rejection, owned by a separate seeded owner account
  with no published credentials. Its states follow OWN-01–OWN-05 and
  ADM-01–ADM-03.
- **SYS-12.11:** The approved café has pending reviews, including clearly
  synthetic spam, abusive and prompt-injection examples for moderation and
  Moderation Assistant. Their state names follow CUS-03–CUS-05,
  OWN-01–OWN-05 and ADM-01–ADM-03; seeded review text remains untrusted.
- **SYS-12.12:** A kit Admin has exactly the product's Admin operations within
  its kit, cannot create Admins or change roles, and retains all existing audit,
  reason, no-review-text-editing and reversible-action limits. AI per-user
  limits apply separately to each kit account; global AI caps are shared by
  main-workspace and kit accounts.

### SYS-13 — Daily maintenance

- **SYS-13.1:** The main workspace has at most one Admin, created only by
  maintenance. If a main-workspace Admin already exists, the step does nothing,
  even if `MAIN_ADMIN_EMAIL` changed. If none exists and no account uses
  `MAIN_ADMIN_EMAIL`, it creates the main Admin from server-only
  `MAIN_ADMIN_EMAIL` and `MAIN_ADMIN_PASSWORD`. If none exists but an account
  with that email exists in any role or workspace, it creates and changes
  nothing and reports a `conflict` outcome. It never updates, promotes, resets
  or deletes any account, preserving password changes made after first sign-in.
- **SYS-13.2:** Maintenance ensures one approved showcase café in the main
  workspace, with a menu and opening hours, owned by a seeded owner account
  whose random password is never shown. Normal sign-ups see a nonempty
  catalogue. Main-workspace applications may remain pending indefinitely;
  product documentation identifies demo kits as the end-to-end testing path.
- **SYS-13.3:** Server-only `GET /api/internal/maintenance` requires
  `Authorization: Bearer <CRON_SECRET>`. Missing/wrong secrets receive 401
  `UNAUTHENTICATED` and perform no work. The environment-specific server-only
  secret is compared in constant time.
- **SYS-13.4:** Production Vercel Cron invokes maintenance daily at about
  03:00 Singapore time using UTC cron `0 19 * * *`. The production deploy
  workflow invokes the same endpoint once after each successful deploy.
- **SYS-13.5:** Maintenance is idempotent: two successive runs have the same
  effect as one. It runs AI retention cleanup, ensure-main-Admin and
  ensure-showcase-café steps in that order; failure of any step does not stop
  later steps.
- **SYS-13.6:** Success follows the integration response
  `{requestId, steps: [{step, outcome, count}]}` with per-step outcome counts
  only, never secrets, emails or record contents.
- **SYS-13.7:** Missing `MAIN_ADMIN_EMAIL` or `MAIN_ADMIN_PASSWORD` reports a
  failure outcome for the main-Admin step; cleanup and showcase steps still run.
- **SYS-13.8:** Maintenance never touches demo kits, deletes user or domain
  data, resets passwords or calls the LLM. AI retention cleanup follows
  AI-SECURITY-SPEC and preserves active enforcement state.
