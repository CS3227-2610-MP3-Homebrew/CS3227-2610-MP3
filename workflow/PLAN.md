# Homebrew product plan

Last updated: 2026-10-17.

Sources: merged, approved [PRODUCT-SPEC.md](specs/PRODUCT-SPEC.md) and
[TECHNICAL-SPEC.md](specs/TECHNICAL-SPEC.md). Foundations cover SYS-04–SYS-11.
INTEGRATION-SPEC.md and AI-SECURITY-SPEC.md remain unwritten prerequisites;
no story specs exist. This draft awaits human review and merge.

## Conventions

- Verified baseline: Next.js 16.4.2 App Router in `src/app/`, React 19.3.0,
  strict TypeScript, Tailwind 4 and Bun 1.4.3. `next.config.ts` enables
  cacheComponents and partialPrefetching; existing CI selects Node 24.
  Supabase/SSR, Zod and openai are intended integrations, not installed dependencies.
- Vitest, Playwright and a `test` script are absent. Their separate workflow
  PR must merge before any testing/implementation pair executes; this is a
  global prerequisite, not a task here. Suite commands follow that PR;
  `bun run test` is proposed. Every implementation requires its own tests
  and `bun run verify`; testing records expected failing-first evidence.
- Follow [AGENTS.md](../AGENTS.md), [spec rules](specs/README.md),
  [handoff conventions](handoffs/README.md) and the [report template](templates/handoff.md).
  Tests use local Docker Supabase and fake/disabled LLM only. Hosted execution
  and deployment verification are human steps.
- New file scopes below are proposed. Core schema uses the approved technical
  entities, relationships and ownership columns now; later story-specific fields,
  states and transitions arrive through additive migrations. Their absence does
  not block core schema, local seeds or the fixed role matrix. No screens or
  story behavior are added here.
- Serialize edits to migrations, `package.json`/`bun.lock` and
  `.github/workflows/ci.yml` with the current editor; this creates no functional
  dependency. Each pair owns its listed surface; later work extends it rather
  than duplicating it. Testing owns tests/fixtures/mocks; implementation owns
  application/configuration/migration code.
- `todo` means specified queued work subject to the global tooling prerequisite.
  `blocked` means named missing integration/security contracts or core screens.
  Only Requirements fields allocate criteria: each has one testing and one
  implementation owner. Spec tasks replace neither. Each task fits one agent run;
  each test/implementation pair shares one branch and one PR (two issues, one PR),
  because master's required `verify` check runs tests and a failing-first test PR
  cannot merge alone. Issues remain unassigned. Dependencies below preserve parallel work.

## Shared design

- [Architecture/rendering/authentication](specs/TECHNICAL-SPEC.md#architecture),
  [rendering decisions](specs/TECHNICAL-SPEC.md#decisions-rendering-authentication-and-caches),
  [data/ownership](specs/TECHNICAL-SPEC.md#data-model-and-ownership),
  [RLS/exposure](specs/TECHNICAL-SPEC.md#rls-and-database-exposure).
- [Environments/delivery](specs/TECHNICAL-SPEC.md#environments-and-delivery),
  [configuration](specs/TECHNICAL-SPEC.md#configuration),
  [LLM boundary](specs/TECHNICAL-SPEC.md#llm-module),
  [admission/windows](specs/TECHNICAL-SPEC.md#admission-and-windows),
  [accounting](specs/TECHNICAL-SPEC.md#provider-call-accounting),
  [cache scopes](specs/TECHNICAL-SPEC.md#cache-eligibility-and-scope),
  [accessibility/responsiveness](specs/TECHNICAL-SPEC.md#accessibility-and-responsive-behavior).
- Missing planned INTEGRATION-SPEC.md: T-01 owns proposed API/error, prompt,
  provider and cache-schema contracts. Missing planned AI-SECURITY-SPEC.md:
  T-02 owns proposed security/charging/kill-switch contracts and the Admin
  provisioning proposal. Both use the existing
  [planned-spec registry](specs/README.md#planned-specifications) until written.
  No missing-document links or contracts are fabricated.

## Foundations

### T-01: Specify integration contracts

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** SYS-04, SYS-08, SYS-10 — [contract boundaries](specs/TECHNICAL-SPEC.md#purpose-and-boundaries); prerequisite, no criterion ownership.
- **Description:** Define shared contracts reserved by the [LLM design](specs/TECHNICAL-SPEC.md#llm-module).
- **Work:** Draft HTTP/errors, three feature prompts/input/output/fallback schemas, provider requests and cache payload/fingerprint/source-version contracts. Link story-owned details without inventing them.
- **File scope:** Proposed `workflow/specs/INTEGRATION-SPEC.md` and own handoff.
- **Prerequisite:** Approved product/technical sources; dependent execution waits for this spec on master.
- **Acceptance criteria:**
  - [ ] Contracts are traceable; remaining story/security gaps are explicit.
  - [ ] Human-reviewed spec merges before dependent execution.
- **Status:** todo
- **Issue:** unassigned

### T-02: Specify AI security and production Admin provisioning

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** SYS-06, SYS-08–SYS-10 — [security boundary](specs/TECHNICAL-SPEC.md#purpose-and-boundaries); prerequisite, no criterion ownership.
- **Description:** Resolve [usage/security policy](specs/TECHNICAL-SPEC.md#usage-control-and-cache-enforcement) and credential-safe seed-only Admin provisioning.
- **Work:** Specify final limits/keys, daily call caps, action/cache-hit/refresh charging, kill-switch/error precedence, safeguards, retention and security tests. **[ASSUMPTION ASM-01] Proposed, awaiting approval:** provision production seed Admins through a human-triggered production-environment workflow using environment secrets. Rationale: preserve seed-only creation without committed credentials. Effect if rejected: replace this provisioning contract before implementation; local seed/RLS work continues.
- **File scope:** Proposed `workflow/specs/AI-SECURITY-SPEC.md` and own handoff; no workflow execution.
- **Prerequisite:** Drafting may proceed; human decides ASM-01 before spec approval/provisioning implementation. Dependent AI execution waits for the approved spec on master.
- **Acceptance criteria:**
  - [ ] Final policies preserve fixed technical windows/accounting and quota uncertainty.
  - [ ] Human approves or replaces ASM-01; approved spec merges without credentials or known hosted passwords.
- **Status:** todo
- **Issue:** unassigned

### T-03: Test runtime, configuration and import isolation

- **Depends on:** None
- **Owner role:** testing
- **Requirements:** SYS-04.1, SYS-04.3; SYS-07.2, SYS-07.3 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Verify [configuration](specs/TECHNICAL-SPEC.md#configuration) and server/client boundaries.
- **Work:** Test stack/runtime declarations, invalid environment/provider combinations, prod fake refusal, missing-key disablement/fallback availability, key-free local fake mode, local-only Supabase, distinct dev/prod bindings and secret redaction. Negative fixtures reject openai outside server-only `src/server/llm/` and privileged client imports/artifacts.
- **File scope:** Proposed `tests/foundations/config/` and synthetic configuration/import fixtures.
- **Prerequisite:** Global test tooling; no live keys or hosted checks.
- **Acceptance criteria:**
  - [ ] Contract-derived positive/negative tests and synthetic artifact scans record expected failures.
  - [ ] `bun run verify` result is recorded.
- **Status:** todo
- **Issue:** unassigned

### T-04: Implement runtime, configuration and import isolation

- **Depends on:** T-03
- **Owner role:** implementation
- **Requirements:** SYS-04.1, SYS-04.3; SYS-07.2, SYS-07.3 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Establish [validated configuration](specs/TECHNICAL-SPEC.md#configuration) and import checks.
- **Work:** Align declared stack/Node 24; add server-only Zod configuration, public allowlist, environment isolation/redaction and the openai import-boundary check. Preserve missing-key disablement and fake/disabled selection; defer final policy/kill-switch contracts to T-02.
- **File scope:** Existing manifest/lockfile, TypeScript/Next/ESLint configuration and CI; proposed `src/server/` config and `scripts/` boundary checks.
- **Prerequisite:** T-03 evidence and global tooling; shared-file serialization applies.
- **Acceptance criteria:**
  - [ ] Configuration/import/artifact tests pass with synthetic credentials.
  - [ ] `bun run verify` passes; no secrets enter client/error/audit output.
- **Status:** todo
- **Issue:** unassigned

### T-05: Test core schema, local migrations and RLS catalogue

- **Depends on:** T-04
- **Owner role:** testing
- **Requirements:** SYS-06.1, SYS-06.2 — [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls).
- **Description:** Verify the fixed [core entities/relationships](specs/TECHNICAL-SPEC.md#data-model-and-ownership) independently of later story fields.
- **Work:** Test local replay and core profiles/cafés/menu/hours/orders/items/reviews relationships, unique review-per-order and cross-café order-item rejection. Catalogue fixtures must fail for any application table lacking RLS, including unexposed/new infrastructure tables; verify explicit RLS/grants. Counter/admission and cache/audit tables belong to their later pairs.
- **File scope:** Proposed `tests/foundations/schema/` and local migration/catalogue fixtures.
- **Prerequisite:** Global tooling; story-specific fields, states and transitions are later additive work, not blockers.
- **Acceptance criteria:**
  - [ ] Core relational cases and negative unexposed-table catalogue fixture record expected failures.
  - [ ] Local-only replay and verification results are recorded.
- **Status:** todo
- **Issue:** unassigned

### T-06: Implement core schema, local migrations and RLS catalogue

- **Depends on:** T-05, T-04
- **Owner role:** implementation
- **Requirements:** SYS-06.1, SYS-06.2 — [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls).
- **Description:** Build fixed [data/RLS foundations](specs/TECHNICAL-SPEC.md#rls-and-database-exposure).
- **Work:** Add local Supabase lifecycle/migration tooling and core profiles/cafés/menu/hours/orders/items/reviews with ownership references/integrity constraints. Define explicit RLS/grants and baseline role-lookup access; add CI's all-table catalogue check. Counter/admission tables belong to T-12; cache/audit tables to T-16. Later story fields/lifecycles are additive.
- **File scope:** Proposed `supabase/config.toml`, `supabase/migrations/`, `scripts/` database checks; existing manifest/lockfile and CI.
- **Prerequisite:** T-05 evidence; serialize shared files.
- **Acceptance criteria:**
  - [ ] Local replay, integrity tests and catalogue CI checks pass.
  - [ ] `bun run verify` passes without hosted access.
- **Status:** todo
- **Issue:** unassigned

### T-07: Test role matrix and local demonstration seeds

- **Depends on:** T-06
- **Owner role:** testing
- **Requirements:** SYS-06.3, SYS-06.4 — [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls).
- **Description:** Verify defined [role/record boundaries](specs/TECHNICAL-SPEC.md#rls-and-database-exposure) and local seeds.
- **Work:** Test two customers/two owners/Admin/unauthenticated callers, parent-child access, cross-owner records, self-approval, role escalation and ownership reassignment. Test Customer/owner-only account role acceptance, metadata refusing Admin, seed-only Admin creation and confirmation-off declarations. Local seed replay includes all roles, approved cafés, menus/hours and past orders; hosted seed targets/password artifacts are rejected.
- **File scope:** Proposed `tests/foundations/roles-seeds/` and local multi-actor/demo fixtures.
- **Prerequisite:** Global tooling; production Admin provisioning is excluded and does not block these tests.
- **Acceptance criteria:**
  - [ ] Every fixed allow/deny boundary and local seed requirement has recorded tests.
  - [ ] No unspecified permission or story lifecycle is inferred.
- **Status:** todo
- **Issue:** unassigned

### T-08: Implement role matrix and local demonstration seeds

- **Depends on:** T-07, T-06
- **Owner role:** implementation
- **Requirements:** SYS-06.3, SYS-06.4 — [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls).
- **Description:** Complete fixed [role protections](specs/TECHNICAL-SPEC.md#data-model-and-ownership) and reproducible local data.
- **Work:** Complete technical allow/deny policies and protected role/account enforcement; seed local demo accounts for every role, approved cafés with menus/hours and past orders. Keep confirmation off in dev/prod configuration. Reject hosted seed execution and exclude demo passwords from hosted artifacts. Production Admin credentials remain T-02's proposal; add no sign-up screen or unspecified lifecycle.
- **File scope:** Proposed additive policy migrations, local seed script/data and server-only role guards; local Supabase configuration.
- **Prerequisite:** T-07 evidence; no dependency on the production provisioning decision.
- **Acceptance criteria:**
  - [ ] Full local matrix/account/seed checks and catalogue checks pass.
  - [ ] `bun run verify` passes; known passwords never ship to hosted projects.
- **Status:** todo
- **Issue:** unassigned

### T-09: Test proxy refresh and streaming role gates

- **Depends on:** T-06, T-04
- **Owner role:** testing
- **Requirements:** SYS-05.1, SYS-05.2, SYS-05.4 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access).
- **Description:** Verify [request-time authentication](specs/TECHNICAL-SPEC.md#decisions-rendering-authentication-and-caches) without account screens.
- **Work:** Use local sessions and component/route harnesses for cookie refresh propagation, unauthenticated redirect, wrong-role denial, expired/invalid prefetched sessions and independent guarded data/mutation access. Assert private data is absent from shells, both rendering flags remain true and instant=false exceptions are per-route with PR reasons. Do not invent a public redirect destination.
- **File scope:** Proposed `tests/foundations/auth/` and local session/harness fixtures.
- **Prerequisite:** Global tooling; no sign-up/sign-in/navigation screen prerequisite.
- **Acceptance criteria:**
  - [ ] Session, gate, shell and exception cases have recorded tests/evidence.
  - [ ] No SYS-01–SYS-03 screen contract is introduced.
- **Status:** todo
- **Issue:** unassigned

### T-10: Implement proxy refresh and streaming role gates

- **Depends on:** T-09, T-06, T-04
- **Owner role:** implementation
- **Requirements:** SYS-05.1, SYS-05.2, SYS-05.4 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access).
- **Description:** Implement the fixed [proxy/Suspense auth boundary](specs/TECHNICAL-SPEC.md#decisions-rendering-authentication-and-caches).
- **Work:** Add session-bound clients, proxy cookie refresh, reusable Suspense-wrapped Server Component role gates and near-data guards. Preserve rendering flags and private-data-free shells; restrict instant=false to justified routes. Public destination/route integration belongs to later account/navigation stories; no screens are added.
- **File scope:** Proposed `src/proxy.ts`, `src/server/` Supabase/auth modules and `src/app/` gate components; existing manifest/lockfile for required SSR support.
- **Prerequisite:** T-09 evidence; serialize shared files.
- **Acceptance criteria:**
  - [ ] Local gate/refresh/direct-access tests pass; exception route/reasons are recorded for human PR review.
  - [ ] `bun run verify` passes; no app-wide rendering opt-out.
- **Status:** todo
- **Issue:** unassigned

### T-11: Test durable admission, windows and quota telemetry

- **Depends on:** T-06
- **Owner role:** testing
- **Requirements:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5 — [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement).
- **Description:** Verify fixed [atomic admission/window mechanics](specs/TECHNICAL-SPEC.md#admission-and-windows).
- **Work:** With synthetic configured caps, test independent instances/restarts, concurrent all-or-none multi-scope reservations, duplicate identities and before/at/after minute/Singapore-midnight boundaries. Verify daily call-count enforcement, preserved returned tokens, unknown absent cost/tokens and fake-429 non-AI fallback using a local provider harness. No real quota exhaustion or final production values.
- **File scope:** Proposed `tests/foundations/usage/` and local concurrency/clock/provider fixtures.
- **Prerequisite:** Global tooling; final values/AI-action policy remain T-02, not blockers for these mechanics.
- **Acceptance criteria:**
  - [ ] Concurrency, persistence, boundary, telemetry and fake-429 cases record deterministic results.
  - [ ] No cleanup reset or fabricated monetary cost is assumed.
- **Status:** todo
- **Issue:** unassigned

### T-12: Implement durable admission, windows and quota telemetry

- **Depends on:** T-11, T-06
- **Owner role:** implementation
- **Requirements:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5 — [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement).
- **Description:** Implement the [durable admission mechanism](specs/TECHNICAL-SPEC.md#provider-call-accounting) independently of final policy.
- **Work:** Add server-only Postgres counters/admissions and atomic reservations with environment/scope/event/window identities. Derive scopes from verified actors, fail closed for invalid required caps, preserve unknown telemetry and expose fake-429 fallback behavior through the local seam. Use database-clock fixed minutes/Singapore days; no real caps or AI-action charging are selected.
- **File scope:** Proposed usage migrations and `src/server/llm/` admission/telemetry modules.
- **Prerequisite:** T-11 evidence; serialize migrations.
- **Acceptance criteria:**
  - [ ] Atomicity/window/telemetry/fallback tests and catalogue checks pass.
  - [ ] `bun run verify` passes without live calls.
- **Status:** todo
- **Issue:** unassigned

### T-13: Test validated LLM operations and fallbacks

- **Depends on:** T-01, T-02, T-12
- **Owner role:** testing
- **Requirements:** SYS-04.2; SYS-08.1, SYS-08.2, SYS-08.3 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-08](specs/TECHNICAL-SPEC.md#sys-08--llm-isolation-and-validated-fallbacks).
- **Description:** Verify shared [LLM/validation boundaries](specs/TECHNICAL-SPEC.md#llm-module) after contracts merge.
- **Work:** Test contract-derived request/config/provider/cache validation and three deterministic feature operations, configurable model/reasoning, aggregate-only Prep input and no tools/writes. Test missing-key/disabled/denied/unavailable/fake-429 fallbacks and approved kill-switch/errors. Fallbacks are rating-sorted filtered catalogue, top-items table and manual queue; no screen implementation is tested here.
- **File scope:** Proposed `tests/foundations/llm/` and contract-derived fake/invalid fixtures.
- **Prerequisite:** BLOCKED: INTEGRATION-SPEC.md schemas/prompts/errors and AI-SECURITY-SPEC.md kill-switch/failure policy must merge; story-specific fields remain linked external contracts.
- **Acceptance criteria:**
  - [ ] Each malformed boundary rejects before effects/results; all three operations/fallbacks have deterministic tests.
  - [ ] Evidence traces exact cases to approved contracts; no live SoCLaaS call.
- **Status:** blocked
- **Issue:** unassigned

### T-14: Implement validated LLM operations and fallbacks

- **Depends on:** T-13, T-01, T-02, T-12
- **Owner role:** implementation
- **Requirements:** SYS-04.2; SYS-08.1, SYS-08.2, SYS-08.3 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-08](specs/TECHNICAL-SPEC.md#sys-08--llm-isolation-and-validated-fallbacks).
- **Description:** Build shared [provider/validation adapters](specs/TECHNICAL-SPEC.md#llm-module), consuming story-owned data.
- **Work:** Add server-only shared Zod gates and thin feature/provider operations, fake/disabled behavior and approved fallback envelopes. Route every dispatch through admission; accept authorized source snapshots/aggregates without implementing story queries, sales calculations, endpoints or UI. Keep provider/cache schemas authoritative and LLMs tool/write-free.
- **File scope:** Proposed `src/server/llm/` adapters and shared schemas under `src/server/`; existing manifest/lockfile for required packages.
- **Prerequisite:** BLOCKED: merged INTEGRATION-SPEC.md and AI-SECURITY-SPEC.md contracts named in T-13; T-13 evidence.
- **Acceptance criteria:**
  - [ ] Shared boundary/provider/operation/fallback tests pass with fake transports.
  - [ ] `bun run verify` passes; no live verification call or story screen is added.
- **Status:** blocked
- **Issue:** unassigned

### T-15: Test AI caches, catalogue eligibility, accounting and audit

- **Depends on:** T-01, T-02, T-12
- **Owner role:** testing
- **Requirements:** SYS-05.3; SYS-09.4; SYS-10.1, SYS-10.2, SYS-10.3 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SYS-10](specs/TECHNICAL-SPEC.md#sys-10--durable-feature-caches-and-audit).
- **Description:** Verify [cache eligibility/scopes](specs/TECHNICAL-SPEC.md#cache-eligibility-and-scope) and per-attempt/audit behavior.
- **Work:** Test session-RLS streamed catalogue and no use cache directive; suspension/unapproval, actor/café isolation, TTL/midnight/version/source changes, refresh with admission and invalid payload rejection. Check cache hits reserve no call, each retry/failure attempt reserves separately, final action/refresh charges and actor/time/outcome audit without prompts/outputs. Check separate moderation action/reason and denied client infrastructure writes.
- **File scope:** Proposed `tests/foundations/ai-state/`, local clock/cache/accounting/audit fixtures.
- **Prerequisite:** BLOCKED: INTEGRATION-SPEC.md cache/fingerprint/outcome schemas and AI-SECURITY-SPEC.md final limits/charging/retention must merge. Use approved source/moderation contracts for final field cases.
- **Acceptance criteria:**
  - [ ] Cache/eligibility/accounting/audit cases trace to contracts with controlled local evidence.
  - [ ] Reusable repository tests need no completed LLM feature implementation.
- **Status:** blocked
- **Issue:** unassigned

### T-16: Implement AI caches, catalogue eligibility, accounting and audit

- **Depends on:** T-15, T-01, T-02, T-12
- **Owner role:** implementation
- **Requirements:** SYS-05.3; SYS-09.4; SYS-10.1, SYS-10.2, SYS-10.3 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SYS-10](specs/TECHNICAL-SPEC.md#sys-10--durable-feature-caches-and-audit).
- **Description:** Build shared [durable cache/accounting repositories](specs/TECHNICAL-SPEC.md#usage-control-and-cache-enforcement) independently of feature adapters.
- **Work:** Add authorized Postgres cache/audit storage, validated repository operations, session-RLS current-catalogue eligibility and approved action/refresh charging around per-attempt reservations. Recheck current ownership/source eligibility on every hit; record AI outcomes and separate moderation action/reason. No Next catalogue cache, prompt/output audit data or story lifecycle/UI work.
- **File scope:** Proposed cache/audit migrations and `src/server/` eligibility plus `src/server/llm/` repositories; no feature-adapter ownership overlap.
- **Prerequisite:** BLOCKED: merged integration/security contracts named in T-15; T-15 evidence. T-14 is not a prerequisite.
- **Acceptance criteria:**
  - [ ] Repository/eligibility/accounting/audit tests and catalogue checks pass locally.
  - [ ] `bun run verify` passes; ordinary clients cannot forge infrastructure rows.
- **Status:** blocked
- **Issue:** unassigned

### T-17: Test delivery workflow configuration

- **Depends on:** T-04, T-06
- **Owner role:** testing
- **Requirements:** SYS-07.1 — [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Statically verify [environment/delivery mappings](specs/TECHNICAL-SPEC.md#environments-and-delivery).
- **Work:** Check master/development → Preview/homebrew-dev, approved v*/production → Production/homebrew-prod, single Hobby project, sin1/Singapore declarations, separated environment credentials and teammate production approval. Deploy/migration paths must be Actions-only and exclude local seed passwords. Do not execute workflows or contact hosted services.
- **File scope:** Proposed `tests/foundations/delivery/` and synthetic workflow fixtures.
- **Prerequisite:** Global tooling; actual project settings/deploy evidence are human-only.
- **Acceptance criteria:**
  - [ ] Static mappings/approval/credential-boundary tests record results.
  - [ ] Hosted verification is explicitly recorded as unavailable to agents.
- **Status:** todo
- **Issue:** unassigned

### T-18: Implement delivery workflow configuration

- **Depends on:** T-17, T-04, T-06
- **Owner role:** implementation
- **Requirements:** SYS-07.1 — [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Author [Actions deploy/migration workflows](specs/TECHNICAL-SPEC.md#environments-and-delivery); humans execute them.
- **Work:** Write environment-bound application/hosted migration workflows and runtime/region mappings with production approval protection. Exclude local demos/credentials; do not implement unapproved Admin provisioning. Record the human step to configure protections/regions, approve/execute workflows and verify hosted targets/migrations. Agents never run deploy, vercel or supabase db push.
- **File scope:** Proposed delivery files under `.github/workflows/` and non-secret Vercel configuration; serialize shared CI edits.
- **Prerequisite:** T-17 evidence; human environment protection/setup before deployment.
- **Acceptance criteria:**
  - [ ] Static workflow tests and `bun run verify` pass.
  - [ ] Human execution/hosted verification remains required before claiming deployed acceptance.
- **Status:** todo
- **Issue:** unassigned

### T-19: Test accessibility and responsive core flows

- **Depends on:** None
- **Owner role:** testing
- **Requirements:** SYS-11.1, SYS-11.2 — [SYS-11](specs/TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).
- **Description:** Verify [defined core flows](specs/TECHNICAL-SPEC.md#accessibility-and-responsive-behavior) once screens exist.
- **Work:** Cover sign-up/sign-in/navigation, browsing/pickup/reviews, café/menu/orders, application/moderation and three AI panels/fallbacks. Require no unresolved automated accessibility violations; complete flows at 360 px and representative wider viewports with readable labels/errors, reachable controls and no clipping/overlap/page-level horizontal scrolling. No full-conformance/manual-assessment or invented performance target.
- **File scope:** Proposed `tests/foundations/core-ui/` browser checks and local/fake fixtures.
- **Prerequisite:** BLOCKED: merged core story specs/screens for SYS-01–SYS-03, CUS-01–CUS-06, OWN-01–OWN-07 and ADM-01–ADM-04; global tooling.
- **Acceptance criteria:**
  - [ ] Every technical core flow has accessibility and viewport completion evidence.
  - [ ] Tests create no missing screens or new product requirements.
- **Status:** blocked
- **Issue:** unassigned

### T-20: Implement accessibility and responsive corrections

- **Depends on:** T-19
- **Owner role:** implementation
- **Requirements:** SYS-11.1, SYS-11.2 — [SYS-11](specs/TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).
- **Description:** Correct existing screens against [core-flow UI criteria](specs/TECHNICAL-SPEC.md#accessibility-and-responsive-behavior).
- **Work:** Resolve the automated accessibility and 360 px/wider layout/control findings using existing Tailwind tokens/components. Preserve labels, errors and reachable controls; no new screen, full-conformance claim or performance threshold.
- **File scope:** Existing `src/app/` screens/styles once merged; proposed shared presentation fixes only.
- **Prerequisite:** BLOCKED: core specs/screens for SYS-01–SYS-03, CUS-01–CUS-06, OWN-01–OWN-07 and ADM-01–ADM-04; T-19 evidence.
- **Acceptance criteria:**
  - [ ] Core automated accessibility checks have no unresolved violations; viewport flow checks pass.
  - [ ] `bun run verify` passes with local data/fake AI.
- **Status:** blocked
- **Issue:** unassigned

## Customer

Story tasks are added as story specs merge.

## Café owner

Story tasks are added as story specs merge.

## Admin

Story tasks are added as story specs merge.
