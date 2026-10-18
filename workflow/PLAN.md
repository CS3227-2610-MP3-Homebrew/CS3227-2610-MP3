# Homebrew product plan

Sources: [PRODUCT-SPEC.md](specs/PRODUCT-SPEC.md),
[TECHNICAL-SPEC.md](specs/TECHNICAL-SPEC.md),
[INTEGRATION-SPEC.md](specs/INTEGRATION-SPEC.md) and
[AI-SECURITY-SPEC.md](specs/AI-SECURITY-SPEC.md).
Foundations cover SYS-04–SYS-11 and SEC-01–SEC-09.

## Conventions

- Verified baseline: Next.js 16.4.2 App Router in `src/app/`, React 19.3.0,
  strict TypeScript, Tailwind 4 and Bun 1.4.3. `next.config.ts` enables
  cacheComponents and partialPrefetching; existing CI selects Node 24.
  Supabase SSR, Zod and `openai` are not installed; the tasks that need them
  add them.
- Vitest, Playwright and Testing Library are installed; `bun run test`,
  `bun run test:e2e` and `bun run check:traceability` exist. CI runs
  `bun run verify` and `bun run test:e2e`. Every implementation requires its own
  tests and `bun run verify`;
  testing records expected failing-first evidence. Database/accessibility tooling
  needed by a task remains part of that task's separate testing file scope.
- Follow [AGENTS.md](../AGENTS.md), [spec rules](specs/README.md),
  [handoff conventions](handoffs/README.md) and the [report template](templates/handoff.md).
  Tests use local Docker Supabase and fake/disabled LLM only. Hosted execution
  and deployment verification are human steps.
- No story specs exist. New file scopes below identify their owning tasks. Core
  schema uses the technical entities, relationships and ownership columns now; later story-specific fields,
  states and transitions arrive through additive migrations. Their absence does
  not block core schema, local seeds or the fixed role matrix. No screens or
  story behavior are added here.
- Serialize edits to migrations, `package.json`/`bun.lock` and
  `.github/workflows/ci.yml` with the current editor; this creates no functional
  dependency. Each pair owns its listed surface; later work extends it rather
  than duplicating it. Testing owns tests/fixtures/mocks; implementation owns
  application/configuration/migration code.
- `todo` means specified queued work subject to its explicit prerequisites;
  `blocked` means a named missing contract or required screen prevents execution;
  `awaiting-decision` means a human or spec decision is required; `done` means
  the task has completion evidence. Only Requirements fields allocate criteria:
  each has one testing and one implementation owner. Spec tasks replace neither.
  Each task fits one agent run. A test/implementation pair is two issues, one
  branch and one PR; the branch and handoff folder use the testing task's issue.
  A pair may cover up to three closely related stories of the same role that
  share screens or data; a role owner may ask for one story per pair. The session
  running a pair sets both tasks to `done` when the latest reviewer report passes.
  On every PLAN update, the spec agent reconciles statuses from handoff evidence.
  CI does not enforce these status rules. Issue mappings are recorded per task;
  dependencies below preserve parallel work.

## Assumptions

Retired IDs: ASM-01. Hosted account contracts belong to T-23.

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
- Integration: [HTTP/errors/fallbacks](specs/INTEGRATION-SPEC.md#shared-http-boundary),
  [bounds/Singapore interpretation](specs/INTEGRATION-SPEC.md#schema-vocabulary-and-bounds),
  [provider wire contract](specs/INTEGRATION-SPEC.md#soclaas-transport),
  [prompts/schemas](specs/INTEGRATION-SPEC.md#exact-feature-prompts-and-schemas),
  [cache identity/payload](specs/INTEGRATION-SPEC.md#cache-payload-fingerprints-and-source-revisions).
  T-01 defines shared integration contracts and identifies
  [story dependencies](specs/INTEGRATION-SPEC.md#contract-dependencies).
- Security: [trust boundaries](specs/AI-SECURITY-SPEC.md#assets-actors-and-trust-boundaries),
  [data allowlists](specs/AI-SECURITY-SPEC.md#feature-data-boundaries),
  [limits/configuration](specs/AI-SECURITY-SPEC.md#limits-and-configuration),
  [disable/fallback precedence](specs/AI-SECURITY-SPEC.md#disable-failure-and-fallback-behavior),
  [retention](specs/AI-SECURITY-SPEC.md#audit-retention-and-operational-response),
  [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria)
  and [evaluation cases](specs/AI-SECURITY-SPEC.md#security-evaluation-plan).
- SEC ownership extends existing pairs: T-11/T-12 own SEC-06.1/06.2/06.3;
  T-13/T-14 own SEC-02.1, SEC-03.1/03.2, SEC-04.1, SEC-05.1, SEC-08.1/08.2;
  T-15/T-16 own SEC-07.1/07.2 and SEC-09.1/09.2. New T-21/T-22 own application
  integration criteria SEC-01.1/01.2, SEC-02.2, SEC-04.2 and SEC-05.2 after
  story endpoints/screens exist. Other tasks may exercise a shared control
  without acquiring that criterion's ownership.

## Foundations

### T-01: Specify integration contracts

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** SYS-04, SYS-08, SYS-10 — [contract boundaries](specs/TECHNICAL-SPEC.md#purpose-and-boundaries); prerequisite, no criterion ownership.
- **Description:** Define the [integration contracts](specs/INTEGRATION-SPEC.md) reserved by the shared LLM design.
- **Work:** The integration spec defines HTTP conventions, bounds/Singapore-time interpretation, provider transport, routes/envelopes, exact prompts/schemas and cache identities. Its Contract dependencies table reserves story-owned fields and behavior to their owners.
- **File scope:** Existing `workflow/specs/INTEGRATION-SPEC.md` and own handoff.
- **Prerequisite:** None for shared integration contracts; affected endpoints require the story contracts identified in the integration spec.
- **Acceptance criteria:**
  - [x] Contracts are traceable; remaining story/security gaps are explicit.
  - [x] Human-reviewed spec merges before dependent execution.
- **Status:** done
- **Issue:** none (spec task)

### T-02: Specify AI security and reconcile the daily cap

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** SYS-06, SYS-08–SYS-10 — [security boundary](specs/TECHNICAL-SPEC.md#purpose-and-boundaries); prerequisite, no criterion ownership.
- **Description:** Define the [security policy](specs/AI-SECURITY-SPEC.md) and consistent technical daily-cap contract.
- **Work:** The security and technical specs on master agree on daily provider-call admission, fixed windows, per-attempt accounting and quota uncertainty. The security spec defines limits, kill switch, no-retry/bounded failures, retention and evaluations; no additional charging policy is required. PLAN ASM-01 is retired; hosted account contracts belong to T-23.
- **File scope:** Existing `workflow/specs/AI-SECURITY-SPEC.md`, affected usage-control/SYS-09.5 sections of `workflow/specs/TECHNICAL-SPEC.md`, and own handoff; no workflow execution.
- **Prerequisite:** None for daily-cap reconciliation; hosted account specification is scoped to T-23 and local seed/RLS work remains independent.
- **Acceptance criteria:**
  - [x] Security and technical criteria agree on daily-cap admission while preserving fixed windows, per-attempt accounting and quota uncertainty.
  - [x] Hosted account contracts are assigned to T-23; no credentials or known hosted passwords are specified here.
- **Status:** done
- **Issue:** none (spec task)

### T-03: Test runtime, configuration and import isolation

- **Depends on:** None
- **Owner role:** testing
- **Requirements:** SYS-04.1, SYS-04.3; SYS-07.2, SYS-07.3 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Verify [configuration](specs/TECHNICAL-SPEC.md#configuration) and server/client boundaries.
- **Work:** Test stack/runtime declarations, invalid environment/provider combinations, prod fake refusal, missing-key disablement/fallback availability, key-free local fake mode, local-only Supabase, distinct dev/prod bindings and secret redaction. Negative fixtures reject openai outside server-only `src/server/llm/` and privileged client imports/artifacts.
- **File scope:** Proposed `tests/foundations/config/` and synthetic configuration/import fixtures.
- **Prerequisite:** Existing test tooling; no live keys or hosted checks.
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
- **Work:** Align declared stack/Node 24; add server-only Zod configuration, public allowlist, environment isolation/redaction and the openai import-boundary check. Preserve missing-key disablement and fake/disabled selection; policy/kill-switch orchestration belongs to T-12/T-14 under the linked security contracts.
- **File scope:** Existing manifest/lockfile, TypeScript/Next/ESLint configuration and CI; proposed `src/server/` config and `scripts/` boundary checks.
- **Prerequisite:** T-03 evidence; shared-file serialization applies.
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
- **Prerequisite:** Existing test tooling; story-specific fields, states and transitions are later additive work, not blockers.
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
- **Work:** Complete technical allow/deny policies and protected role/account enforcement; seed local demo accounts for every role, approved cafés with menus/hours and past orders. Keep confirmation off in dev/prod configuration. Reject hosted seed execution and exclude demo passwords from hosted artifacts. Hosted account contracts belong to T-23; add no sign-up screen or unspecified lifecycle.
- **File scope:** Proposed additive policy migrations, local seed script/data and server-only role guards; local Supabase configuration.
- **Prerequisite:** T-07 evidence; hosted account contracts belong to T-23.
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
- **Prerequisite:** Existing test tooling; no sign-up/sign-in/navigation screen prerequisite.
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

- **Depends on:** T-06, T-02
- **Owner role:** testing
- **Requirements:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5; SEC-06.1, SEC-06.2, SEC-06.3 — [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SEC-06](specs/AI-SECURITY-SPEC.md#sec-06--durable-bounded-usage).
- **Description:** Verify fixed [atomic admission/window mechanics](specs/TECHNICAL-SPEC.md#admission-and-windows).
- **Work:** With synthetic configured caps, test independent instances/restarts, concurrent all-or-none reservations, user/action/refresh/run and provider-attempt limits, duplicate identities and minute/Singapore-midnight boundaries. Derive configuration validity and zero/missing/invalid-limit cases from the security limits contract. Test daily provider-cap exhaustion/concurrency/rollover, failed-attempt accounting, preserved returned tokens, unknown absent cost/tokens and fake-429/denied/unavailable-admission fallback. No real quota exhaustion or monetary guarantee.
- **File scope:** Proposed `tests/foundations/usage/` and local concurrency/clock/provider fixtures.
- **Prerequisite:** T-06 provides local schema; tests follow the consistent technical/security daily-cap contracts linked above.
- **Acceptance criteria:**
  - [ ] Concurrency, persistence, boundary, telemetry and fake-429 cases record deterministic results.
  - [ ] No cleanup reset or fabricated monetary cost is assumed.
- **Status:** todo
- **Issue:** unassigned

### T-12: Implement durable admission, windows and quota telemetry

- **Depends on:** T-11, T-06, T-02
- **Owner role:** implementation
- **Requirements:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5; SEC-06.1, SEC-06.2, SEC-06.3 — [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SEC-06](specs/AI-SECURITY-SPEC.md#sec-06--durable-bounded-usage).
- **Description:** Implement [durable admission](specs/TECHNICAL-SPEC.md#provider-call-accounting) and the reconciled [usage policy](specs/AI-SECURITY-SPEC.md#limits-and-configuration).
- **Work:** Add server-only Postgres counters/admissions and atomic reservations with environment/scope/event/window identities. Enforce the approved configurable user/action/refresh/run and per-attempt limits, including the daily provider cap. Derive scopes from verified actors, fail closed for invalid required caps/unavailable admission, preserve unknown telemetry and expose fake-429 fallback behavior through the local seam. Use database-clock fixed minutes/Singapore days; add no extra charging policy or monetary accounting.
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
- **Requirements:** SYS-04.2; SYS-08.1, SYS-08.2, SYS-08.3; SEC-02.1, SEC-03.1, SEC-03.2, SEC-04.1, SEC-05.1, SEC-08.1, SEC-08.2 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-08](specs/TECHNICAL-SPEC.md#sys-08--llm-isolation-and-validated-fallbacks), [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Verify shared [LLM/validation boundaries](specs/TECHNICAL-SPEC.md#llm-module) under the linked contracts.
- **Work:** Test the linked integration HTTP/provider/feature schemas and exact data-separated prompts using fake transport. Include direct/indirect/multilingual injection, feature input allowlists, aggregate-only Prep input, references/evidence, strict whole-result rejection, no tools/writes and no invalid success-cache write. Test configured model/reasoning, disable precedence before cache/dispatch/return, no retries, bounded timeout/overflow/cancellation, empty-source handling and safe typed fallbacks. Follow security evaluation cases for these owned criteria; no screen implementation is tested here.
- **File scope:** Proposed `tests/foundations/llm/` and contract-derived fake/invalid fixtures.
- **Prerequisite:** T-12 provides admission. Story-owned fields remain dependencies of affected endpoints; shared operation tests use contract-derived authorized input snapshots.
- **Acceptance criteria:**
  - [ ] Each malformed boundary rejects before effects/results; all three operations/fallbacks have deterministic tests.
  - [ ] Evidence traces exact cases to approved contracts; no live SoCLaaS call.
- **Status:** todo
- **Issue:** unassigned

### T-14: Implement validated LLM operations and fallbacks

- **Depends on:** T-13, T-01, T-02, T-12
- **Owner role:** implementation
- **Requirements:** SYS-04.2; SYS-08.1, SYS-08.2, SYS-08.3; SEC-02.1, SEC-03.1, SEC-03.2, SEC-04.1, SEC-05.1, SEC-08.1, SEC-08.2 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-08](specs/TECHNICAL-SPEC.md#sys-08--llm-isolation-and-validated-fallbacks), [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Build shared [provider/validation adapters](specs/TECHNICAL-SPEC.md#llm-module), consuming story-owned data.
- **Work:** Add server-only Zod feature/provider gates, exact fixed prompts with JSON data separation, authorized minimal context selection, validated references/evidence and typed fallback envelopes from the approved integration contract. Implement configurable single-call non-streaming transport, fake/disabled behavior, zero SDK retries, bounded transport/cancellation and disable rechecks. Route every dispatch through admission; invalid output cannot write a success cache or mutate domain records. Accept authorized snapshots/aggregates without implementing story queries, sales calculations, endpoints or UI. T-16 owns persistent cache/audit repositories.
- **File scope:** Proposed `src/server/llm/` adapters and shared schemas under `src/server/`; existing manifest/lockfile for required packages.
- **Prerequisite:** T-12 admission and T-13 evidence under the linked integration/security contracts.
- **Acceptance criteria:**
  - [ ] Shared boundary/provider/operation/fallback tests pass with fake transports.
  - [ ] `bun run verify` passes; no live verification call or story screen is added.
- **Status:** todo
- **Issue:** unassigned

### T-15: Test AI caches, catalogue eligibility, accounting and audit

- **Depends on:** T-01, T-02, T-12
- **Owner role:** testing
- **Requirements:** SYS-05.3; SYS-09.4; SYS-10.1, SYS-10.2, SYS-10.3; SEC-07.1, SEC-07.2, SEC-09.1, SEC-09.2 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SYS-10](specs/TECHNICAL-SPEC.md#sys-10--durable-feature-caches-and-audit), [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Verify [cache eligibility/scopes](specs/TECHNICAL-SPEC.md#cache-eligibility-and-scope) and per-attempt/audit behavior.
- **Work:** Test session-RLS streamed catalogue and no use cache directive; suspension/unapproval, actor/café isolation, TTL/Singapore-midnight/version/source changes, exact canonical fingerprints, failed refresh preserving an eligible old entry, refresh admission and invalid payload rejection. Check cache hits reserve no call and every permitted dispatch/failure has one reservation, without retry or extra charging-policy tests. Test content-free actor/time/outcome audit, denial/failure events, unavailable-storage fail-closed behavior, denied client infrastructure writes and clock-controlled retention cleanup preserving active state. Keep separate moderation audit records outside AI cleanup; domain confirmation security belongs to T-21/T-22.
- **File scope:** Proposed `tests/foundations/ai-state/`, local clock/cache/accounting/audit fixtures.
- **Prerequisite:** T-12 admission is required. Catalogue/sales source fields remain story-owned; shared repository tests use contract-derived source snapshots and the linked retention/refresh policy.
- **Acceptance criteria:**
  - [ ] Cache/eligibility/accounting/audit cases trace to contracts with controlled local evidence.
  - [ ] Reusable repository tests need no completed LLM feature implementation.
- **Status:** todo
- **Issue:** unassigned

### T-16: Implement AI caches, catalogue eligibility, accounting and audit

- **Depends on:** T-15, T-01, T-02, T-12
- **Owner role:** implementation
- **Requirements:** SYS-05.3; SYS-09.4; SYS-10.1, SYS-10.2, SYS-10.3; SEC-07.1, SEC-07.2, SEC-09.1, SEC-09.2 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SYS-10](specs/TECHNICAL-SPEC.md#sys-10--durable-feature-caches-and-audit), [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Build shared [durable cache/accounting repositories](specs/TECHNICAL-SPEC.md#usage-control-and-cache-enforcement) independently of feature adapters.
- **Work:** Add authorized Postgres cache/audit storage and validated repositories using approved fingerprint/source/model/contract identities. Recheck current ownership/source eligibility on every hit; enforce expiry, preserve eligible results on failed refresh and integrate admission without an extra charging policy. Record content-free AI outcomes, fail closed when required storage is unavailable, and add local cleanup honoring security retention without resetting active state or deleting moderation audit. Support separate moderation audit persistence; T-22 connects its human-confirmed domain action. No Next catalogue cache, prompt/output audit data or story lifecycle/UI work.
- **File scope:** Proposed cache/audit migrations and `src/server/` eligibility plus `src/server/llm/` repositories; no feature-adapter ownership overlap.
- **Prerequisite:** T-12 admission and T-15 evidence under the linked integration/security contracts. T-14 is not a prerequisite.
- **Acceptance criteria:**
  - [ ] Repository/eligibility/accounting/audit tests and catalogue checks pass locally.
  - [ ] `bun run verify` passes; ordinary clients cannot forge infrastructure rows.
- **Status:** todo
- **Issue:** unassigned

### T-17: Test delivery workflow configuration

- **Depends on:** T-04, T-06
- **Owner role:** testing
- **Requirements:** SYS-07.1 — [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Statically verify [environment/delivery mappings](specs/TECHNICAL-SPEC.md#environments-and-delivery).
- **Work:** Check master/development → Preview/homebrew-dev, approved v*/production → Production/homebrew-prod, single Hobby project, sin1/Singapore declarations, separated environment credentials and teammate production approval. Deploy/migration paths must be Actions-only and exclude local seed passwords. Do not execute workflows or contact hosted services.
- **File scope:** Proposed `tests/foundations/delivery/` and synthetic workflow fixtures.
- **Prerequisite:** Existing test tooling; actual project settings/deploy evidence are human-only.
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
- **Work:** Write environment-bound application/hosted migration workflows and runtime/region mappings with production approval protection. Exclude local demos/credentials; hosted account contracts belong to T-23. Record the human step to configure protections/regions, approve/execute workflows and verify hosted targets/migrations. Agents never run deploy, vercel or supabase db push.
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
- **Prerequisite:** BLOCKED: merged core story specs/screens for SYS-01–SYS-03, CUS-01–CUS-06, OWN-01–OWN-07 and ADM-01–ADM-04; accessibility-specific testing dependencies belong to this testing task.
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

### T-21: Test application AI authorization, rendering and human confirmation

- **Depends on:** T-08, T-10, T-14, T-16
- **Owner role:** testing
- **Requirements:** SEC-01.1, SEC-01.2, SEC-02.2, SEC-04.2, SEC-05.2 — [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Verify application integration of [AI trust boundaries](specs/AI-SECURITY-SPEC.md#assets-actors-and-trust-boundaries) and [human confirmation](specs/AI-SECURITY-SPEC.md#cache-rendering-and-human-confirmation) after the ordinary domain flows exist.
- **Work:** Exercise every AI endpoint with anonymous/wrong-role/cross-owner/forged-reference/cross-origin requests; assert authorized RLS source selection and no unrelated Admin sales/order access. Scan provider requests, client artifacts, errors and telemetry with synthetic secret/session canaries. Verify whole-result rejection for forged IDs/labels/evidence and inert rendering/no fetching of HTML/script/URL payloads. Exercise explicit per-review Admin confirmation, reason/current-state checks, preserved review text and separate audit, including stale/forged advice. Use the linked security evaluation cases; ordinary story behavior is a prerequisite, not new scope.
- **File scope:** Proposed `tests/foundations/ai-security/` route/database/browser integration cases and synthetic local/fake fixtures; extend existing shared test infrastructure without duplicating its owners.
- **Prerequisite:** BLOCKED: T-01/T-02 contracts must be consistent and merged, T-08/T-10/T-14/T-16 must exist, and merged CUS-01/CUS-02/CUS-05/CUS-06, OWN-06/OWN-07, ADM-03/ADM-04 specs and their required source/query/endpoint/rendering/confirmation surfaces must exist. Account sessions use the existing foundation harness. No missing product rule may be inferred.
- **Acceptance criteria:**
  - [ ] Each owned SEC criterion has deterministic local/fake negative and positive evidence, including browser rendering and stale confirmation cases.
  - [ ] Failing-first results and `bun run verify`/`bun run test:e2e` results are recorded without live provider or hosted access.
- **Status:** blocked
- **Issue:** unassigned

### T-22: Integrate application AI authorization, rendering and human confirmation

- **Depends on:** T-21, T-08, T-10, T-14, T-16
- **Owner role:** implementation
- **Requirements:** SEC-01.1, SEC-01.2, SEC-02.2, SEC-04.2, SEC-05.2 — [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Connect the shared AI controls to existing authorized application flows under the approved [HTTP](specs/INTEGRATION-SPEC.md#shared-http-boundary) and [security](specs/AI-SECURITY-SPEC.md#cache-rendering-and-human-confirmation) contracts.
- **Work:** Connect approved endpoints to verified session/role/scope and same-origin gates, authorized RLS source reads, minimal validated feature operations and safe result/error rendering. Close canary leakage paths and reject whole invalid results without executable text or model-driven fetches. Integrate explicit per-review confirmation with existing domain validation and T-16's audit persistence, preserving text and requiring a reason. Reuse prior guards/adapters/repositories; do not recreate story queries, domain lifecycles, screens or infrastructure owned by earlier tasks.
- **File scope:** Existing story route/UI/domain surfaces once merged; shared server-boundary fixes under `src/server/` as required. T-14 retains provider/schema ownership and T-16 persistent cache/audit ownership; serialize shared edits.
- **Prerequisite:** BLOCKED: all T-21 contract/surface prerequisites and T-21 failing-first evidence. Missing story contracts remain blockers; no new product behavior is authorized by this task.
- **Acceptance criteria:**
  - [ ] All T-21 application security cases pass; no role expansion, automatic moderation, executable model text or secret/content leakage.
  - [ ] `bun run verify` and `bun run test:e2e` pass with local Supabase/fake AI; no live verification or deployment.
- **Status:** blocked
- **Issue:** unassigned

### T-23: Specify peer-tester demo access and daily maintenance

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** SYS-06, SYS-07 — prerequisite, no criterion ownership; [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Specify how peer testers access every role on production without team action and without interfering with each other, plus a daily maintenance job.
- **Work:** Contracts to be specified by the spec agent from human decisions recorded in its prompt.
- **File scope:** `workflow/specs/PRODUCT-SPEC.md`, `workflow/specs/TECHNICAL-SPEC.md`, `workflow/specs/AI-SECURITY-SPEC.md` and `workflow/PLAN.md`.
- **Acceptance criteria:**
  - [ ] Human-reviewed spec merged; affected T-05–T-08, T-16–T-18 updated.
- **Status:** todo
- **Issue:** unassigned

## Customer

Story tasks are added as story specs merge.

## Café owner

Story tasks are added as story specs merge.

## Admin

Story tasks are added as story specs merge.
