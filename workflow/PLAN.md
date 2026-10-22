# Homebrew product plan

Sources: [PRODUCT-SPEC.md](specs/PRODUCT-SPEC.md),
[TECHNICAL-SPEC.md](specs/TECHNICAL-SPEC.md),
[INTEGRATION-SPEC.md](specs/INTEGRATION-SPEC.md) and
[AI-SECURITY-SPEC.md](specs/AI-SECURITY-SPEC.md).
Admin story sources: [ADM-01](specs/stories/ADM-01-cafe-applications.md),
[ADM-02](specs/stories/ADM-02-cafe-suspension.md),
[ADM-03](specs/stories/ADM-03-review-moderation.md) and
[ADM-04](specs/stories/ADM-04-moderation-assistant.md).
Customer story sources: [CUS-01](specs/stories/CUS-01-browse-cafes.md),
[CUS-02](specs/stories/CUS-02-cafe-page.md),
[CUS-03](specs/stories/CUS-03-pre-order.md),
[CUS-04](specs/stories/CUS-04-my-orders.md),
[CUS-05](specs/stories/CUS-05-review-order.md),
[CUS-06](specs/stories/CUS-06-brew-finder.md) and
[CUS-07](specs/stories/CUS-07-favourite-cafes.md).
Owner story sources: [OWN-01](specs/stories/OWN-01-cafe-application.md),
[OWN-02](specs/stories/OWN-02-cafe-profile-hours.md),
[OWN-03](specs/stories/OWN-03-menu-management.md),
[OWN-04](specs/stories/OWN-04-pickup-rules.md),
[OWN-05](specs/stories/OWN-05-order-queue.md),
[OWN-06](specs/stories/OWN-06-sales-dashboard.md),
[OWN-07](specs/stories/OWN-07-prep-advisor.md) and
[OWN-08](specs/stories/OWN-08-boost-request.md).
Shared story sources: [SYS-01](specs/stories/SYS-01-sign-up.md),
[SYS-02](specs/stories/SYS-02-sign-in-out.md) and
[SYS-03](specs/stories/SYS-03-role-navigation.md).
Foundations cover SYS-04–SYS-13 and SEC-01–SEC-10 in 12 testing/implementation pairs; Shared adds one pair, Customer five, Café owner five and Admin three: 26 pairs total, with 14 specification tasks across 66 tasks.
Changed criteria and new tasks require their governing specs on master before execution; missing story contracts block the affected tasks.

## Conventions

- Verified baseline: Next.js 16.4.2 App Router in `src/app/`, React 19.3.0,
  strict TypeScript, Tailwind 4 and Bun 1.4.3. `next.config.ts` enables
  cacheComponents and partialPrefetching; existing CI selects Node 24.
  Supabase SSR, Supabase JS, Zod and `server-only` are installed. The shared
  server-only LLM module uses its existing transport; `openai` is not installed
  and owner integration reuses the installed operation instead of adding an SDK.
- Vitest, Playwright and Testing Library are installed; `bun run test`,
  `bun run test:e2e`, `bun run check:traceability` and `bun run check:specs` exist. CI runs
  `bun run verify` and `bun run test:e2e`. Every implementation requires its own
  tests and `bun run verify`;
  testing records expected failing-first evidence. Database/accessibility tooling
  needed by a task remains part of that task's separate testing file scope.
- Test paths use `tests/{unit,integration,e2e}/<area>/`; browser cases go under
  `tests/e2e/<area>/`. Database and route test files start with
  `// @vitest-environment node`; component tests can use the configured jsdom environment.
- Follow [AGENTS.md](../AGENTS.md), [spec rules](specs/README.md),
  [handoff conventions](handoffs/README.md) and the [report template](templates/handoff.md).
  Tests use local Docker Supabase and fake/disabled LLM only. Hosted execution
  and deployment verification are human steps.
- CUS-01–CUS-07, OWN-01–OWN-08 and ADM-01–ADM-04 story files exist.
  T-52/T-55/T-58 own the application/settings/menu/queue contracts; T-61/T-64
  retain the sales/advice/boost decisions. Dependent tasks require their
  governing contracts on master. New file scopes
  below identify their owning tasks. Core
  schema uses the technical entities, relationships and ownership columns now; later story-specific fields,
  states and transitions arrive through additive migrations. Their absence does
  not block core schema, local seeds or the fixed role matrix.
- Serialize edits to migrations, `package.json`/`bun.lock` and
  `.github/workflows/ci.yml` with the current editor; this creates no functional
  dependency. Each pair owns its listed surface; later work extends it rather
  than duplicating it. Testing owns tests/fixtures/mocks; implementation owns
  application/configuration/migration code.
- `todo` means specified queued work subject to its explicit prerequisites;
  `blocked` means a required contract, reviewed merge or screen prevents execution;
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

Retired IDs: ASM-01. Demo-access and maintenance contracts are specified by T-23.

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
- Demo access: [workspaces/kits](specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits),
  [maintenance](specs/TECHNICAL-SPEC.md#sys-13--daily-maintenance),
  [shared routes](specs/INTEGRATION-SPEC.md#demo-access-and-maintenance-routes) and
  [safeguards](specs/AI-SECURITY-SPEC.md#sec-10--demo-access-and-maintenance-safeguards).
  T-05/T-06 own SYS-12.1; T-07/T-08 own SYS-12.2/12.3 and amended
  SYS-06.3/06.4. T-24/T-25 own SYS-12.4–12.12 and SEC-10.1–10.3;
  T-26/T-27 own SYS-13.1–13.8 and SEC-10.4/10.5. T-15/T-16 retain
  amended SEC-09.2 cleanup ownership; maintenance invokes that cleanup.
- SEC ownership extends existing pairs: T-11/T-12 own SEC-06.1/06.2/06.3;
  T-13/T-14 own SEC-02.1, SEC-03.1/03.2, SEC-04.1, SEC-05.1, SEC-08.1/08.2;
  T-15/T-16 own SEC-07.1/07.2 and SEC-09.1/09.2. New T-21/T-22 own application
  integration criteria SEC-01.1/01.2, SEC-02.2, SEC-04.2 and SEC-05.2 after
  story endpoints/screens exist, including T-63 Prep Advisor. Other tasks may exercise a shared control
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
- **File scope:** Proposed `tests/{unit,integration,e2e}/config/` and synthetic configuration/import fixtures.
- **Prerequisite:** Existing test tooling; no live keys or hosted checks.
- **Acceptance criteria:**
  - [x] Contract-derived positive/negative tests and synthetic artifact scans record expected failures.
  - [x] `bun run verify` result is recorded.
- **Status:** done
- **Issue:** [#34](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/34)

### T-04: Implement runtime, configuration and import isolation

- **Depends on:** T-03
- **Owner role:** implementation
- **Requirements:** SYS-04.1, SYS-04.3; SYS-07.2, SYS-07.3 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Establish [validated configuration](specs/TECHNICAL-SPEC.md#configuration) and import checks.
- **Work:** Align declared stack/Node 24; add server-only Zod configuration, public allowlist, environment isolation/redaction and the openai import-boundary check. Preserve missing-key disablement and fake/disabled selection; policy/kill-switch orchestration belongs to T-12/T-14 under the linked security contracts.
- **File scope:** Existing manifest/lockfile, TypeScript/Next/ESLint configuration and CI; proposed `src/server/` config and `scripts/` boundary checks.
- **Prerequisite:** T-03 evidence; shared-file serialization applies.
- **Acceptance criteria:**
  - [x] Configuration/import/artifact tests pass with synthetic credentials.
  - [x] `bun run verify` passes; no secrets enter client/error/audit output.
- **Status:** done
- **Issue:** [#35](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/35)

### T-05: Test core schema, local migrations and RLS catalogue

- **Depends on:** T-04
- **Owner role:** testing
- **Requirements:** SYS-06.1, SYS-06.2; SYS-12.1 — [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [SYS-12](specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits).
- **Description:** Verify the fixed [core entities/relationships](specs/TECHNICAL-SPEC.md#data-model-and-ownership) independently of later story fields.
- **Work:** Target the local Supabase stack provided by T-06; connection failures before T-06 exists are expected failing-first results. Test local replay and core workspaces/profiles/cafés/menu/hours/orders/items/reviews relationships, unique review-per-order and cross-café order-item rejection. Catalogue fixtures must fail for any application table lacking RLS, including unexposed/new infrastructure tables; verify explicit RLS/grants. Verify workspace references only on profiles/cafés and inherited workspace consistency for café children. Counter/admission and cache/audit tables belong to their later pairs.
- **File scope:** Proposed `tests/{unit,integration,e2e}/schema/` and local migration/catalogue fixtures.
- **Prerequisite:** SYS-12 schema contract on master; existing test tooling; T-06 provides the local Supabase stack, so connection failures before it exists are expected failing-first results; story-specific fields, states and transitions are later additive work, not blockers.
- **Acceptance criteria:**
  - [ ] Core relational cases and negative unexposed-table catalogue fixture record expected failures.
  - [ ] Local-only replay and verification results are recorded.
- **Status:** done
- **Issue:** [#36](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/36)

### T-06: Implement core schema, local migrations and RLS catalogue

- **Depends on:** T-05, T-04
- **Owner role:** implementation
- **Requirements:** SYS-06.1, SYS-06.2; SYS-12.1 — [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [SYS-12](specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits).
- **Description:** Build fixed [data/RLS foundations](specs/TECHNICAL-SPEC.md#rls-and-database-exposure).
- **Work:** Add local-only `db:start` and `db:reset` package scripts and a CI step that starts local Supabase before database tests. Add local Supabase lifecycle/migration tooling and core workspaces/profiles/cafés/menu/hours/orders/items/reviews with ownership references/integrity constraints. Add the Workspaces entity, workspace references only on profiles/cafés and inherited-workspace consistency constraints. Define explicit RLS/grants and baseline role-lookup access; add CI's all-table catalogue check. Counter/admission tables belong to T-12; cache/audit tables to T-16. Later story fields/lifecycles are additive.
- **File scope:** Proposed `supabase/config.toml`, `supabase/migrations/`, `scripts/` database checks; existing `package.json`/`bun.lock` for local-only `db:start` and `db:reset` scripts, and `.github/workflows/ci.yml` for the local Supabase startup step and catalogue check.
- **Prerequisite:** SYS-12 schema contract on master; T-05 evidence; serialize shared files.
- **Acceptance criteria:**
  - [ ] Local replay, integrity tests and catalogue CI checks pass.
  - [ ] `bun run verify` passes without hosted access.
- **Status:** done
- **Issue:** [#37](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/37)

### T-07: Test role matrix and local demonstration seeds

- **Depends on:** T-06
- **Owner role:** testing
- **Requirements:** SYS-06.3, SYS-06.4; SYS-12.2, SYS-12.3 — [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [SYS-12](specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits).
- **Description:** Verify defined [role/record boundaries](specs/TECHNICAL-SPEC.md#rls-and-database-exposure) and local seeds.
- **Work:** Test two customers/two owners/main Admin/kit Admin/unauthenticated callers, parent-child access, cross-owner records, self-approval, role escalation and ownership reassignment. Test Customer/owner-only account role acceptance, metadata refusing Admin, the maintenance-created main Admin/kit-scoped Admin distinction and refusal of Admin sign-up and confirmation-off declarations. Test main-to-kit, kit-to-main and kit-to-kit denial server-side and under RLS, including AI sources/caches; normal sign-up always selects the main workspace and untrusted metadata cannot change it. Local seed replay includes all roles, approved cafés, menus/hours and past orders; hosted seed targets/password artifacts are rejected.
- **File scope:** Proposed `tests/{unit,integration,e2e}/roles-seeds/` and local multi-actor/demo fixtures.
- **Prerequisite:** Amended SYS-06.3/06.4 and SYS-12 isolation contracts on master; global tooling; T-25 owns kit creation and T-27 owns production maintenance provisioning; local matrix fixtures exercise authority without duplicating those owners.
- **Acceptance criteria:**
  - [ ] Every fixed allow/deny boundary and local seed requirement has recorded tests.
  - [ ] No unspecified permission or story lifecycle is inferred.
- **Status:** done
- **Issue:** [#38](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/38)

### T-08: Implement role matrix and local demonstration seeds

- **Depends on:** T-07, T-06
- **Owner role:** implementation
- **Requirements:** SYS-06.3, SYS-06.4; SYS-12.2, SYS-12.3 — [SYS-06](specs/TECHNICAL-SPEC.md#sys-06--relational-integrity-roles-and-rls), [SYS-12](specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits).
- **Description:** Complete fixed [role protections](specs/TECHNICAL-SPEC.md#data-model-and-ownership) and reproducible local data.
- **Work:** Complete technical allow/deny policies and protected role/account enforcement across main and kit workspaces, including Admin, parent-child and AI-source/cache isolation. Ensure normal sign-ups join main and cannot select/reassign workspace; seed local demo accounts for every role, approved cafés with menus/hours and past orders. Keep confirmation off in dev/prod configuration. Reject hosted seed execution and exclude demo passwords from hosted artifacts. T-25 owns kit creation; T-27 owns maintenance provisioning. Add no ordinary sign-up screen or unspecified lifecycle.
- **File scope:** Proposed additive policy migrations, local seed script/data and server-only role guards; local Supabase configuration.
- **Prerequisite:** Amended SYS-06.3/06.4 and SYS-12 isolation contracts on master; T-07 evidence; T-25/T-27 retain kit/maintenance provisioning ownership.
- **Acceptance criteria:**
  - [ ] Full local matrix/account/seed checks and catalogue checks pass.
  - [ ] `bun run verify` passes; known passwords never ship to hosted projects.
- **Status:** done
- **Issue:** [#39](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/39)

### T-09: Test proxy refresh and streaming role gates

- **Depends on:** T-06, T-04
- **Owner role:** testing
- **Requirements:** SYS-05.1, SYS-05.2, SYS-05.4 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access).
- **Description:** Verify [request-time authentication](specs/TECHNICAL-SPEC.md#decisions-rendering-authentication-and-caches) without account screens.
- **Work:** Use local sessions and component/route harnesses for cookie refresh propagation, unauthenticated redirect, wrong-role denial, expired/invalid prefetched sessions and independent guarded data/mutation access. Assert private data is absent from shells, both rendering flags remain true and instant=false exceptions are per-route with PR reasons. Do not invent a public redirect destination.
- **File scope:** Proposed `tests/{unit,integration,e2e}/auth/` and local session/harness fixtures.
- **Prerequisite:** Existing test tooling; no sign-up/sign-in/navigation screen prerequisite.
- **Acceptance criteria:**
  - [ ] Session, gate, shell and exception cases have recorded tests/evidence.
  - [ ] No SYS-01–SYS-03 screen contract is introduced.
- **Status:** done
- **Issue:** [#40](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/40)

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
- **Status:** done
- **Issue:** [#41](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/41)

### T-11: Test durable admission, windows and quota telemetry

- **Depends on:** T-06, T-02
- **Owner role:** testing
- **Requirements:** SYS-09.1, SYS-09.2, SYS-09.3, SYS-09.5; SEC-06.1, SEC-06.2, SEC-06.3 — [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SEC-06](specs/AI-SECURITY-SPEC.md#sec-06--durable-bounded-usage).
- **Description:** Verify fixed [atomic admission/window mechanics](specs/TECHNICAL-SPEC.md#admission-and-windows).
- **Work:** With synthetic configured caps, test independent instances/restarts, concurrent all-or-none reservations, user/action/refresh/run and provider-attempt limits, duplicate identities and minute/Singapore-midnight boundaries. Derive configuration validity and zero/missing/invalid-limit cases from the security limits contract. Test daily provider-cap exhaustion/concurrency/rollover, failed-attempt accounting, preserved returned tokens, unknown absent cost/tokens and fake-429/denied/unavailable-admission fallback. No real quota exhaustion or monetary guarantee.
- **File scope:** Proposed `tests/{unit,integration,e2e}/usage/` and local concurrency/clock/provider fixtures.
- **Prerequisite:** T-06 provides local schema; tests follow the consistent technical/security daily-cap contracts linked above.
- **Acceptance criteria:**
  - [ ] Concurrency, persistence, boundary, telemetry and fake-429 cases record deterministic results.
  - [ ] No cleanup reset or fabricated monetary cost is assumed.
- **Status:** done
- **Issue:** [#42](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/42)

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
- **Status:** done
- **Issue:** [#43](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/43)

### T-13: Test validated LLM operations and fallbacks

- **Depends on:** T-01, T-02, T-12
- **Owner role:** testing
- **Requirements:** SYS-04.2; SYS-08.1, SYS-08.2, SYS-08.3; SEC-02.1, SEC-03.1, SEC-03.2, SEC-04.1, SEC-05.1, SEC-08.1, SEC-08.2 — [SYS-04](specs/TECHNICAL-SPEC.md#sys-04--runtime-and-application-boundaries), [SYS-08](specs/TECHNICAL-SPEC.md#sys-08--llm-isolation-and-validated-fallbacks), [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Verify shared [LLM/validation boundaries](specs/TECHNICAL-SPEC.md#llm-module) under the linked contracts.
- **Work:** Test the linked integration HTTP/provider/feature schemas and exact data-separated prompts using fake transport. Include direct/indirect/multilingual injection, feature input allowlists, aggregate-only Prep input, references/evidence, strict whole-result rejection, no tools/writes and no invalid success-cache write. Test configured model/reasoning, disable precedence before cache/dispatch/return, no retries, bounded timeout/overflow/cancellation, empty-source handling and safe typed fallbacks. Follow security evaluation cases for these owned criteria; no screen implementation is tested here.
- **File scope:** Proposed `tests/{unit,integration,e2e}/llm/` and contract-derived fake/invalid fixtures.
- **Prerequisite:** T-12 provides admission. Story-owned fields remain dependencies of affected endpoints; shared operation tests use contract-derived authorized input snapshots.
- **Acceptance criteria:**
  - [ ] Each malformed boundary rejects before effects/results; all three operations/fallbacks have deterministic tests.
  - [ ] Evidence traces exact cases to approved contracts; no live SoCLaaS call.
- **Status:** done
- **Issue:** [#44](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/44)

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
- **Status:** done
- **Issue:** [#45](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/45)

### T-15: Test AI caches, catalogue eligibility, accounting and audit

- **Depends on:** T-01, T-02, T-12
- **Owner role:** testing
- **Requirements:** SYS-05.3; SYS-09.4; SYS-10.1, SYS-10.2, SYS-10.3; SEC-07.1, SEC-07.2, SEC-09.1, SEC-09.2 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SYS-10](specs/TECHNICAL-SPEC.md#sys-10--durable-feature-caches-and-audit), [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Verify [cache eligibility/scopes](specs/TECHNICAL-SPEC.md#cache-eligibility-and-scope) and per-attempt/audit behavior.
- **Work:** Test the no use cache directive and session-RLS catalogue eligibility; suspension/unapproval, actor/café isolation, TTL/Singapore-midnight/version/source changes, exact canonical fingerprints, failed refresh preserving an eligible old entry, refresh admission and invalid payload rejection. Check cache hits reserve no call and every permitted dispatch/failure has one reservation, without retry or extra charging-policy tests. Test content-free actor/time/outcome audit, denial/failure events, unavailable-storage fail-closed behavior, denied client infrastructure writes and clock-controlled retention cleanup preserving active state. Keep separate moderation audit records outside AI cleanup. Catalogue page streaming belongs to T-40/T-41, personalized HTTP response caching to T-21/T-22 and Admin audit entries to T-30/T-31; domain confirmation security belongs to T-21/T-22.
- **File scope:** Proposed `tests/{unit,integration,e2e}/ai-state/`, local clock/cache/accounting/audit fixtures.
- **Prerequisite:** T-12 admission is required. Catalogue/sales source fields remain story-owned; shared repository tests use contract-derived source snapshots and the linked retention/refresh policy.
- **Acceptance criteria:**
  - [ ] Cache/eligibility/accounting/audit cases trace to contracts with controlled local evidence.
  - [ ] Reusable repository tests need no completed LLM feature implementation.
- **Status:** done
- **Issue:** [#46](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/46)

### T-16: Implement AI caches, catalogue eligibility, accounting and audit

- **Depends on:** T-15, T-01, T-02, T-12
- **Owner role:** implementation
- **Requirements:** SYS-05.3; SYS-09.4; SYS-10.1, SYS-10.2, SYS-10.3; SEC-07.1, SEC-07.2, SEC-09.1, SEC-09.2 — [SYS-05](specs/TECHNICAL-SPEC.md#sys-05--streaming-authentication-and-catalogue-access), [SYS-09](specs/TECHNICAL-SPEC.md#sys-09--durable-usage-enforcement), [SYS-10](specs/TECHNICAL-SPEC.md#sys-10--durable-feature-caches-and-audit), [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Build shared [durable cache/accounting repositories](specs/TECHNICAL-SPEC.md#usage-control-and-cache-enforcement) independently of feature adapters.
- **Work:** Add authorized Postgres cache/audit storage and validated repositories using approved fingerprint/source/model/contract identities. Recheck current ownership/source eligibility on every hit; enforce expiry, preserve eligible results on failed refresh and integrate admission without an extra charging policy. Record content-free AI outcomes, fail closed when required storage is unavailable, and add local cleanup honoring security retention without resetting active state or deleting moderation audit. Admin audit persistence belongs to T-31. No Next catalogue cache, prompt/output audit data or story lifecycle/UI work.
- **File scope:** Proposed cache/audit migrations and `src/server/` eligibility plus `src/server/llm/` repositories; no feature-adapter ownership overlap.
- **Prerequisite:** T-12 admission and T-15 evidence under the linked integration/security contracts. T-14 is not a prerequisite.
- **Acceptance criteria:**
  - [ ] Repository/eligibility/accounting/audit tests and catalogue checks pass locally.
  - [ ] `bun run verify` passes; ordinary clients cannot forge infrastructure rows.
- **Status:** done
- **Issue:** [#47](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/47)

### T-17: Test delivery workflow configuration

- **Depends on:** None
- **Owner role:** testing
- **Requirements:** SYS-07.1 — [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Statically verify [environment/delivery mappings](specs/TECHNICAL-SPEC.md#environments-and-delivery).
- **Work:** Check master/development → Preview/homebrew-dev, approved v*/production → Production/homebrew-prod, single Hobby project, sin1/Singapore declarations, separated environment credentials and the production approval binding. Deploy/migration paths must be Actions-only and exclude local seed passwords. Do not execute workflows or contact hosted services.
- **File scope:** Proposed `tests/{unit,integration,e2e}/delivery/` and synthetic workflow fixtures.
- **Prerequisite:** Existing test tooling; static workflow fixtures need no runtime or database foundation; actual project settings/deploy evidence are human-only.
- **Acceptance criteria:**
  - [ ] Static mappings/approval/credential-boundary tests record results.
  - [ ] Hosted verification is explicitly recorded as unavailable to agents.
- **Status:** done
- **Issue:** [#48](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/48)

### T-18: Implement delivery workflow configuration

- **Depends on:** T-17
- **Owner role:** implementation
- **Requirements:** SYS-07.1 — [SYS-07](specs/TECHNICAL-SPEC.md#sys-07--environment-and-configuration-isolation).
- **Description:** Author [Actions deploy/migration workflows](specs/TECHNICAL-SPEC.md#environments-and-delivery); humans execute them.
- **Work:** Write environment-bound application/hosted migration workflows and runtime/region mappings with production approval protection. Exclude local demos/credentials; T-25 owns demo-kit creation and T-27 extends this production workflow with its post-deploy maintenance call and adds Vercel Cron, without duplicating workflow ownership. Record the human step to configure protections/regions, approve/execute workflows and verify hosted targets/migrations. Agents never run deploy, vercel or supabase db push.
- **File scope:** Proposed delivery files under `.github/workflows/` and non-secret Vercel configuration; serialize shared CI edits.
- **Prerequisite:** T-17 evidence only; runtime/database foundation tasks are not prerequisites for authoring static delivery configuration; human environment protection/setup before deployment.
- **Acceptance criteria:**
  - [ ] Static workflow tests and `bun run verify` pass.
  - [ ] Human execution/hosted verification remains required before claiming deployed acceptance.
- **Status:** done
- **Issue:** [#49](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/49)

### T-19: Test accessibility and responsive core flows

- **Depends on:** T-51, T-41, T-43, T-45, T-47, T-54, T-57, T-60, T-63, T-29, T-31, T-33
- **Owner role:** testing
- **Requirements:** SYS-11.1, SYS-11.2 — [SYS-11](specs/TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).
- **Description:** Verify [defined core flows](specs/TECHNICAL-SPEC.md#accessibility-and-responsive-behavior) once screens exist.
- **Work:** Cover sign-up/sign-in/navigation, browsing/pickup/reviews, café/menu/orders, application/moderation and three AI panels/fallbacks. Require no unresolved automated accessibility violations; complete flows at 360 px and representative wider viewports with readable labels/errors, reachable controls and no clipping/overlap/page-level horizontal scrolling. No full-conformance/manual-assessment or invented performance target.
- **File scope:** Proposed `tests/e2e/core-ui/` browser checks and local/fake fixtures.
- **Prerequisite:** BLOCKED: merged core story specs/screens for SYS-01–SYS-03, CUS-01–CUS-06, OWN-01–OWN-07 and ADM-01–ADM-04; accessibility-specific testing dependencies belong to this testing task. Owner core surfaces are T-54 (application/profile/pickup), T-57 (menu), T-60 (queue) and T-63 (sales/Prep); their contract prerequisites remain explicit in their own tasks.
- **Acceptance criteria:**
  - [ ] Every technical core flow has accessibility and viewport completion evidence.
  - [ ] Tests create no missing screens or new product requirements.
- **Status:** blocked
- **Issue:** [#50](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/50)

### T-20: Implement accessibility and responsive corrections

- **Depends on:** T-19
- **Owner role:** implementation
- **Requirements:** SYS-11.1, SYS-11.2 — [SYS-11](specs/TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).
- **Description:** Correct existing screens against [core-flow UI criteria](specs/TECHNICAL-SPEC.md#accessibility-and-responsive-behavior).
- **Work:** Resolve the automated accessibility and 360 px/wider layout/control findings using existing Tailwind tokens/components. Preserve labels, errors and reachable controls; no new screen, full-conformance claim or performance threshold.
- **File scope:** Existing `src/app/` screens/styles; proposed shared presentation fixes only.
- **Prerequisite:** BLOCKED: core specs/screens for SYS-01–SYS-03, CUS-01–CUS-06, OWN-01–OWN-07 and ADM-01–ADM-04; T-19 evidence. Owner surface prerequisites are supplied through T-19 and its T-54/T-57/T-60/T-63 dependencies; corrections extend those owners rather than recreating their screens.
- **Acceptance criteria:**
  - [ ] Core automated accessibility checks have no unresolved violations; viewport flow checks pass.
  - [ ] `bun run verify` passes with local data/fake AI.
- **Status:** blocked
- **Issue:** [#51](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/51)

### T-21: Test application AI authorization, rendering and human confirmation

- **Depends on:** T-08, T-10, T-14, T-16, T-47, T-63, T-33
- **Owner role:** testing
- **Requirements:** SEC-01.1, SEC-01.2, SEC-02.2, SEC-04.2, SEC-05.2 — [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Verify application integration of [AI trust boundaries](specs/AI-SECURITY-SPEC.md#assets-actors-and-trust-boundaries) and [human confirmation](specs/AI-SECURITY-SPEC.md#cache-rendering-and-human-confirmation) after the ordinary domain flows exist.
- **Work:** Exercise every AI endpoint with anonymous/wrong-role/cross-owner/forged-reference/cross-origin requests; assert authorized RLS source selection and no unrelated Admin sales/order access. Scan provider requests, client artifacts, errors and telemetry with synthetic secret/session canaries. Verify whole-result rejection for forged IDs/labels/evidence and inert rendering/no fetching of HTML/script/URL payloads. Exercise explicit per-review Admin confirmation, reason/current-state checks, preserved review text and separate audit, including stale/forged advice. Check that personalized AI responses never enter a shared public cache (SEC-07.2's HTTP part). Use the linked security evaluation cases; ordinary story behavior is a prerequisite, not new scope.
- **File scope:** Proposed `tests/{unit,integration,e2e}/ai-security/` route/database cases and browser cases under `tests/e2e/ai-security/`, with synthetic local/fake fixtures; extend existing shared test infrastructure without duplicating its owners.
- **Prerequisite:** BLOCKED: T-01/T-02 contracts must be consistent and merged, T-08/T-10/T-14/T-16 must exist, and merged CUS-01/CUS-02/CUS-05/CUS-06, OWN-06/OWN-07, ADM-03/ADM-04 specs and their required source/query/endpoint/rendering/confirmation surfaces must exist. Account sessions use the existing foundation harness. No missing product rule may be inferred. Owner sales/Prep source, endpoint and rendering are owned by T-63 after T-61 contracts; T-47 and T-33 supply the other two AI features. This pair retains shared SEC ownership.
- **Acceptance criteria:**
  - [ ] Each owned SEC criterion has deterministic local/fake negative and positive evidence, including browser rendering and stale confirmation cases.
  - [ ] Failing-first results and `bun run verify`/`bun run test:e2e` results are recorded without live provider or hosted access.
- **Status:** blocked
- **Issue:** [#52](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/52)

### T-22: Integrate application AI authorization, rendering and human confirmation

- **Depends on:** T-21, T-08, T-10, T-14, T-16
- **Owner role:** implementation
- **Requirements:** SEC-01.1, SEC-01.2, SEC-02.2, SEC-04.2, SEC-05.2 — [SEC criteria](specs/AI-SECURITY-SPEC.md#security-requirements-and-acceptance-criteria).
- **Description:** Connect the shared AI controls to existing authorized application flows under the approved [HTTP](specs/INTEGRATION-SPEC.md#shared-http-boundary) and [security](specs/AI-SECURITY-SPEC.md#cache-rendering-and-human-confirmation) contracts.
- **Work:** Connect approved endpoints to verified session/role/scope and same-origin gates, authorized RLS source reads, minimal validated feature operations and safe result/error rendering. Close canary leakage paths and reject whole invalid results without executable text or model-driven fetches. Serve AI results as private, uncacheable responses. Integrate explicit per-review confirmation with existing domain validation and T-31's Admin audit persistence, preserving text and requiring a reason. Reuse prior guards/adapters/repositories; do not recreate story queries, domain lifecycles, screens or infrastructure owned by earlier tasks.
- **File scope:** Existing story route/UI/domain surfaces; shared server-boundary fixes under `src/server/` as required. T-14 retains provider/schema ownership and T-16 persistent cache/audit ownership; serialize shared edits.
- **Prerequisite:** BLOCKED: all T-21 contract/surface prerequisites and T-21 failing-first evidence. Missing story contracts remain blockers; no new product behavior is authorized by this task. T-21 includes T-63 owner Prep integration and the T-47/T-33 AI surfaces; this task fixes shared boundaries without acquiring their story criteria.
- **Acceptance criteria:**
  - [ ] All T-21 application security cases pass; no role expansion, automatic moderation, executable model text or secret/content leakage.
  - [ ] `bun run verify` and `bun run test:e2e` pass with local Supabase/fake AI; no live verification or deployment.
- **Status:** blocked
- **Issue:** [#53](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/53)

### T-23: Specify peer-tester demo access and daily maintenance

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** SYS-06, SYS-12, SYS-13, SEC-09, SEC-10 — specification only, no testing/implementation criterion ownership; [SYS-12/SYS-13](specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [SEC-10](specs/AI-SECURITY-SPEC.md#sec-10--demo-access-and-maintenance-safeguards).
- **Description:** Specify how peer testers access every role on production without team action and without interfering with each other, plus a daily maintenance job.
- **Work:** Specified SYS-12 workspace/demo-kit and SYS-13 daily-maintenance contracts, SEC-10 safeguards, POST /api/demo-kits and GET /api/internal/maintenance, with unique criterion ownership and story prerequisites in this plan.
- **File scope:** `workflow/specs/PRODUCT-SPEC.md`, `workflow/specs/TECHNICAL-SPEC.md`, `workflow/specs/AI-SECURITY-SPEC.md`, `workflow/specs/INTEGRATION-SPEC.md`, `workflow/PLAN.md` and `workflow/handoffs/spec-demo-access/01-spec.md`.
- **Acceptance criteria:**
  - [x] Cross-cutting contracts, ownership mapping and dependent task prerequisites are recorded.
- **Status:** done
- **Issue:** none (spec task)

### T-24: Test demo kits

- **Depends on:** T-08, T-10, T-12, T-29, T-31, T-52, T-55, T-58, T-61, T-51
- **Owner role:** testing
- **Requirements:** SYS-12.4, SYS-12.5, SYS-12.6, SYS-12.7, SYS-12.8, SYS-12.9, SYS-12.10, SYS-12.11, SYS-12.12; SEC-10.1, SEC-10.2, SEC-10.3 — [SYS-12](specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [SEC-10](specs/AI-SECURITY-SPEC.md#sec-10--demo-access-and-maintenance-safeguards).
- **Description:** Test anonymous production demo access under the [shared route contract](specs/INTEGRATION-SPEC.md#demo-access-and-maintenance-routes), using local Supabase and fake AI.
- **Work:** Derive failing-first cases for the sign-in creation control, three once-shown normal-sign-in accounts, email/code pattern, secure distinct passwords, Auth-only persistence, no credential logging/later responses and all-or-nothing rollback. Test concurrent global 10-minute/day caps, rollover, restart, unavailable counters, 429/Retry-After, no LLM call, no expiry/deletion, kit-scoped Admin operations and per-account/shared-global AI limits. Verify all seeded content and relative sales history against the owning stories, including unpublished-owner and untrusted synthetic review cases. Reuse T-08 isolation guards and T-12 counters rather than assigning their criteria again.
- **File scope:** Proposed `tests/{unit,integration,e2e}/demo-kits/`, local rollback/concurrency/clock/Auth fixtures and browser cases under `tests/e2e/demo-kits/`; testing owns all fixtures/mocks.
- **Prerequisite:** BLOCKED until CUS-03–CUS-05, OWN-01–OWN-05 and ADM-01–ADM-03 story specs are on master. SYS-12/SEC-10/route contracts must also be on master; normal sign-in/creation-control integration requires the owning SYS-02 sign-in screen contract and surface. Seed sales sufficiency follows OWN-06/OWN-07 source/aggregation contracts before that evidence can run. T-08, T-10 and T-12 supply shared isolation, sessions and counters; T-29 and T-31 provide kit Admin operations and the review states used by seeded-content checks. Owner prerequisites map to T-52 setup, T-55 menu, T-58 queue and T-61 sales/Prep contracts. T-51 supplies sign-in; source sufficiency cannot be inferred from a seeded date span alone.
- **Acceptance criteria:**
  - [ ] Every owned criterion has deterministic local/fake failing-first evidence, including rollback, concurrent limits, one-time credentials and seeded-content cases.
  - [ ] `bun run verify` and relevant `bun run test:e2e` results are recorded without hosted or live-provider access.
- **Status:** blocked
- **Issue:** [#54](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/54)

### T-25: Implement demo kits

- **Depends on:** T-24, T-08, T-10, T-12, T-29, T-31, T-63, T-51
- **Owner role:** implementation
- **Requirements:** SYS-12.4, SYS-12.5, SYS-12.6, SYS-12.7, SYS-12.8, SYS-12.9, SYS-12.10, SYS-12.11, SYS-12.12; SEC-10.1, SEC-10.2, SEC-10.3 — [SYS-12](specs/TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [SEC-10](specs/AI-SECURITY-SPEC.md#sec-10--demo-access-and-maintenance-safeguards).
- **Description:** Implement self-service demo kits under the [shared route contract](specs/INTEGRATION-SPEC.md#demo-access-and-maintenance-routes).
- **Work:** Add the sign-in Create demo kit control and POST /api/demo-kits with one-time credential display, secure account/code generation, Supabase Auth-only password storage and atomic complete-kit creation/rollback. Extend T-12's durable counter/window mechanism for both global kit caps, fail closed and return the specified 429/Retry-After response. Seed the kit's Customer, approved owner/café/menu/hours/pickup rules/relative sales history, separate unpublished owner/pending application and untrusted pending reviews using owning-story states. Apply existing kit Admin controls, account/global AI limits, no LLM call and no automatic expiry/deletion. Reuse T-08 isolation and T-10 session gates; author no tests or ordinary sign-in lifecycle.
- **File scope:** Proposed `src/app/api/demo-kits/route.ts`, server-only kit provisioning and additive migrations; existing sign-in screen after its owning story exists. Serialize migrations/shared configuration; no hosted execution.
- **Prerequisite:** BLOCKED until CUS-03–CUS-05, OWN-01–OWN-05 and ADM-01–ADM-03 story specs are on master, plus all T-24 contract/surface prerequisites and its failing-first evidence; T-29 and T-31 provide kit Admin operations and the review states used by seeded-content checks. T-24 maps owner contract prerequisites to T-52/T-55/T-58/T-61. T-51 supplies sign-in and T-63 brings T-54/T-57/T-60 owner source/schema integration; kit creation retains its own SYS/SEC criteria.
- **Acceptance criteria:**
  - [ ] T-24's owned credential, creation, rollback, limit, seed and authority cases pass.
  - [ ] `bun run verify` and relevant `bun run test:e2e` pass with local Supabase/fake AI.
- **Status:** blocked
- **Issue:** [#55](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/55)

### T-26: Test daily maintenance

- **Depends on:** T-16, T-18, T-52, T-55
- **Owner role:** testing
- **Requirements:** SYS-13.1, SYS-13.2, SYS-13.3, SYS-13.4, SYS-13.5, SYS-13.6, SYS-13.7, SYS-13.8; SEC-10.4, SEC-10.5 — [SYS-13](specs/TECHNICAL-SPEC.md#sys-13--daily-maintenance), [SEC-10](specs/AI-SECURITY-SPEC.md#sec-10--demo-access-and-maintenance-safeguards).
- **Description:** Test the [maintenance route](specs/INTEGRATION-SPEC.md#demo-access-and-maintenance-routes) and production trigger configuration locally.
- **Work:** Derive cases for constant-time bearer comparison, missing/wrong secret 401/no work, ordered independent steps, consecutive-run idempotence, at-most-one maintenance-created main Admin, no-op when one exists even after a configured-email change, creation only when no Admin or matching account exists, cross-role/workspace email-conflict outcomes with no changes, preserved changed passwords, missing main-Admin settings, showcase café/hidden owner credentials, count-only sanitized responses and no kit/user/domain deletion, password reset or LLM call. Exercise T-16 cleanup through the endpoint without taking SEC-09.2 ownership. Statically verify daily UTC cron and exactly one post-successful-production-deploy call extending T-18's workflow, with environment-specific server-only secrets. Test kit no-touch under SYS-13.8 using a T-06 workspace fixture, independently of demo-kit provisioning. Use synthetic secrets and local seeded data; do not execute hosted triggers.
- **File scope:** Proposed `tests/{unit,integration,e2e}/maintenance/` local endpoint/clock/fault fixtures including a T-06 workspace fixture for SYS-13.8 kit no-touch, and static Vercel/workflow checks; testing owns fixtures/mocks.
- **Prerequisite:** SYS-13/SEC-10/route contracts on master, T-16 cleanup, T-18 workflow and a T-06 workspace fixture for SYS-13.8 kit no-touch; T-25 provisioning is not a prerequisite. The owning café/menu/hours story contracts for showcase data (OWN-01–OWN-03 and ADM-01) are on master. Showcase owner contract prerequisites are T-52 setup/profile/hours and T-55 menu; approved local contract fixtures allow testing before the owner editing screens.
- **Acceptance criteria:**
  - [ ] Owned route, step independence, idempotence, credential preservation/redaction and static trigger cases have deterministic failing-first evidence.
  - [ ] `bun run verify` result is recorded; production scheduling/deploy execution evidence remains human-owned.
- **Status:** todo
- **Issue:** [#56](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/56)

### T-27: Implement daily maintenance

- **Depends on:** T-26, T-16, T-18, T-54, T-57
- **Owner role:** implementation
- **Requirements:** SYS-13.1, SYS-13.2, SYS-13.3, SYS-13.4, SYS-13.5, SYS-13.6, SYS-13.7, SYS-13.8; SEC-10.4, SEC-10.5 — [SYS-13](specs/TECHNICAL-SPEC.md#sys-13--daily-maintenance), [SEC-10](specs/AI-SECURITY-SPEC.md#sec-10--demo-access-and-maintenance-safeguards).
- **Description:** Add the [maintenance route](specs/INTEGRATION-SPEC.md#demo-access-and-maintenance-routes) and extend delivery triggers.
- **Work:** Add GET /api/internal/maintenance with server-only environment-specific bearer authentication, constant-time comparison and count-only sanitized outcomes. Invoke T-16's retention cleanup, ensure at most one main Admin under SYS-13.1, retaining an existing main Admin regardless of configured-email changes and reporting conflict without changes when the email is already used but no main Admin exists, then ensure the main showcase café/hidden owner. Preserve step order and independence, idempotence, changed passwords and every no-touch/no-delete/no-LLM restriction. Missing main-Admin variables report that step's failure while other steps run. Add the Vercel production cron entry and extend T-18's production deploy workflow with one maintenance call after each successful deploy; reuse its workflow/configuration ownership rather than recreating it. No tests or hosted execution.
- **File scope:** Proposed `src/app/api/internal/maintenance/route.ts` and server-only maintenance modules; Vercel cron configuration; extend existing `.github/workflows/` production deployment from T-18. Serialize shared workflow/configuration edits.
- **Prerequisite:** BLOCKED on the owning café/menu/hours story contracts for showcase data (OWN-01–OWN-03 and ADM-01); T-26 evidence and all its contract prerequisites; T-16 and T-18; SYS-13.8 kit no-touch uses T-26's T-06 workspace fixture, without a T-25 prerequisite. Human approval/execution remains required for production delivery. T-26 maps the owner contract prerequisites to T-52/T-55; T-54/T-57 provide their domain schema/management implementation for showcase provisioning without requiring unrelated owner sales/queue screens.
- **Acceptance criteria:**
  - [ ] T-26's owned maintenance and static trigger cases pass; existing cleanup tests retain their owner.
  - [ ] `bun run verify` passes locally; no deployment, live provider or hosted database verification is claimed.
- **Status:** blocked
- **Issue:** [#57](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/57)

### T-34: Specify shared account and role-navigation contracts

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** SYS-01, SYS-02, SYS-03 — [Shared source stories](specs/PRODUCT-SPEC.md#shared); specification prerequisite only, no criterion ownership.
- **Description:** Define the shared account inputs, session outcomes and role navigation needed by customer screens, preserving the technical role/workspace boundaries.
- **Work:** Specify account fields/validation, sign-in/sign-out and redirect/session failure contracts in one story file per Shared story; preserve Customer/owner sign-up only, main-workspace assignment, kit sign-in and seed-only Admins. Link existing SYS-05/SYS-06 contracts instead of redefining them. Identify the separate future test/implementation owners for these Shared stories without assigning their criteria to a Customer pair.
- **File scope:** Proposed story files `workflow/specs/stories/SYS-01-sign-up.md`, `SYS-02-sign-in-out.md`, `SYS-03-role-navigation.md`; relevant shared account contract sections in `workflow/specs/INTEGRATION-SPEC.md`; own handoff only.
- **Prerequisite:** Source stories and technical role/session boundaries exists; account field/redirect/session-error decisions and their human approval are required. 
- **Acceptance criteria:**
  - [ ] All three source IDs have authoritative story/HTTP/navigation contracts with no invented account lifecycle or permission.
  - [ ] The specification changes have reviewed merge evidence on master before dependent testing/implementation; `bun run check:specs` and `bun run verify` results are recorded in the spec handoff, without claiming implementation acceptance.
- **Status:** done
- **Issue:** none (spec task)

One pair owns the 28 Shared account/session/navigation criteria. T-08 retains
technical role/workspace enforcement, T-10 proxy refresh and streaming gates,
and T-25/T-27 demo/maintenance provisioning. Role-domain screens keep their
existing owners; Shared supplies account forms and role shells/entry points.

### T-50: Test Shared sign-up, sessions and role navigation

- **Depends on:** T-34, T-08, T-10
- **Owner role:** testing
- **Requirements:** SYS-01.1, SYS-01.2, SYS-01.3, SYS-01.4, SYS-01.5, SYS-01.6, SYS-01.7, SYS-01.8, SYS-01.9; SYS-02.1, SYS-02.2, SYS-02.3, SYS-02.4, SYS-02.5, SYS-02.6, SYS-02.7, SYS-02.8, SYS-02.9, SYS-02.10, SYS-02.11; SYS-03.1, SYS-03.2, SYS-03.3, SYS-03.4, SYS-03.5, SYS-03.6, SYS-03.7, SYS-03.8 — [sign-up criteria](specs/stories/SYS-01-sign-up.md#acceptance-criteria), [session criteria](specs/stories/SYS-02-sign-in-out.md#acceptance-criteria), [navigation criteria](specs/stories/SYS-03-role-navigation.md#acceptance-criteria).
- **Description:** Derive failing-first tests from [SYS-01](specs/stories/SYS-01-sign-up.md#requirements), [SYS-02](specs/stories/SYS-02-sign-in-out.md#requirements) and [SYS-03](specs/stories/SYS-03-role-navigation.md#requirements), using the canonical [account HTTP/browser contracts](specs/INTEGRATION-SPEC.md#shared-account-contracts).
- **Work:** Cover minimal labelled forms, explicit Customer/owner selection, exact email/password/strict-body validation, pending/repeat-submit behavior, retained email/role and cleared passwords after submitted failure. Test complete registration, duplicate/concurrent registration, bounded cleanup of only the newly created identity after profile failure (including failed cleanup), completed-account/failed-session notice and active-account conflict. Cover normal main/kit sign-in for all roles, generic bad credentials, absent/invalid profiles versus source outages, provisional-cookie clearance, persistent cookie/refresh behavior, expired versus absent sessions, local/idempotent sign-out and unconfirmed remote revocation. Exercise exact account routes, methods/Origin/body/media failures, cookie effects, private/no-store responses and content-free errors/logs. Test fixed homes, root/account-form/wrong-role redirects, role-only MVP navigation, inert allowlisted notices, ignored return destinations, no-café owner application entry and safe retry/account-unavailable states without protected shell content. Use local synthetic multi-role/main/kit sessions, controlled Auth/profile faults and foundation fixtures; leave the Create demo kit control's presence (SYS-12.4), kit creation and once-shown credential behavior to T-24/T-25. Domain content may use testing-owned shells/fixtures without implementing or claiming domain criteria.
- **File scope:** Proposed `tests/{unit,integration,e2e}/accounts/` and `tests/{unit,integration,e2e}/navigation/`, with browser cases only under `tests/e2e/accounts/` and `tests/e2e/navigation/`; testing-owned synthetic account/session/profile/cookie and fault fixtures. Database/route files use `// @vitest-environment node`. Extend existing local Supabase/session/role harnesses; testing owns required fixtures/mocks/test configuration.
- **Prerequisite:** T-34 Shared story/account contracts on master; T-08/T-10 provide role/workspace/session/streaming foundations. Main/kit credentials can use local fixtures without T-25 provisioning. T-24/T-25 own the Create demo kit control (SYS-12.4) and credential flow mounted on the shared sign-in surface, including its presence evidence; account test authoring does not depend on kit creation. Customer/owner/Admin domain content is outside this pair and is not a prerequisite for isolated shell tests.
- **Acceptance criteria:**
  - [ ] All 28 listed criteria have deterministic named tests and recorded failing-first evidence, including partial provisioning, cookie/session/source failures, transport denials, main/kit role navigation and fixed destinations.
  - [ ] Tests preserve foundation SYS/SEC and role-domain criterion ownership, use local Supabase/synthetic faults only and distinguish shell evidence from later demo-control/domain integration evidence.
  - [ ] `bun run verify` and relevant `bun run test:e2e` results are recorded; the issue-scoped report follows the [handoff conventions](handoffs/README.md) and [template](templates/handoff.md).
- **Status:** done
- **Issue:** [#99](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/99)

### T-51: Implement Shared sign-up, sessions and role navigation

- **Depends on:** T-50, T-34, T-08, T-10
- **Owner role:** implementation
- **Requirements:** SYS-01.1, SYS-01.2, SYS-01.3, SYS-01.4, SYS-01.5, SYS-01.6, SYS-01.7, SYS-01.8, SYS-01.9; SYS-02.1, SYS-02.2, SYS-02.3, SYS-02.4, SYS-02.5, SYS-02.6, SYS-02.7, SYS-02.8, SYS-02.9, SYS-02.10, SYS-02.11; SYS-03.1, SYS-03.2, SYS-03.3, SYS-03.4, SYS-03.5, SYS-03.6, SYS-03.7, SYS-03.8 — [sign-up criteria](specs/stories/SYS-01-sign-up.md#acceptance-criteria), [session criteria](specs/stories/SYS-02-sign-in-out.md#acceptance-criteria), [navigation criteria](specs/stories/SYS-03-role-navigation.md#acceptance-criteria).
- **Description:** Implement the [Shared account experience](specs/INTEGRATION-SPEC.md#shared-account-contracts) and [own-role navigation](specs/stories/SYS-03-role-navigation.md#requirements), reusing protected profile/workspace enforcement and request-time authentication.
- **Work:** Add `/sign-up`, `/sign-in` and the three specified `/api/auth/sign-up`, `/api/auth/sign-in`, `/api/auth/sign-out` POST handlers with strict server Zod validation, exact transport/errors/no-store results and server-set/cleared cookies. Integrate Customer/owner-only main-workspace registration with the existing protected profile boundary, safe duplicate/partial-creation compensation, explicit completed-account/failed-session outcome and unchanged active-account conflicts. Resolve main/kit sign-in through the verified profile before persistent session success; separate bad credentials, source outages and unavailable profiles, and clear only the failed attempt's provisional cookies. Implement this-browser/idempotent sign-out with honest remote-revocation uncertainty. Add form pending/field/safe failure states and fixed notice text. Integrate root/role/account-form routing, fixed own-role homes, role-only MVP navigation and the minimal owner no-café application entry, using T-10 gates and no protected data in unverified shells. Leave a place on the sign-in page for T-25's Create demo kit control (SYS-12.4) without rendering, duplicating or stubbing it. Reuse existing domain pages when present; own only role shells/entry points, without fabricating catalogue, sales, queue or moderation data. Preserve domain API errors and separate authorization; add no return-to, role/workspace switching or account lifecycle beyond these specs.
- **File scope:** Proposed `src/app/sign-up/`, `src/app/sign-in/`, `src/app/api/auth/{sign-up,sign-in,sign-out}/route.ts`, shared account/navigation components and server-only account/session adapters under `src/server/auth/`; extend existing `src/app/page.tsx`, role layouts/shells under `src/app/{customer,owner,admin}/`, `src/app/_components/role-gate.tsx` and `src/proxy.ts` only as needed for approved destinations/session outcomes. Additive protected-profile provisioning migrations only if required by SYS-01; preserve T-08 ownership. Serialize shared auth/layout/migration edits with foundation and role owners. No acceptance tests/fixtures/mocks, domain screen content or demo provisioning authoring.
- **Prerequisite:** T-50 failing-first evidence and merged T-34 contracts; reuse T-08/T-10 protections. T-25 supplies the Create demo kit control under SYS-12.4; role stories supply domain content independently. Local account/session/shell implementation uses fixtures for existing main/kit roles and does not require demo provisioning or domain screens first; SYS-02.1 acceptance does not include the demo-kit control.
- **Acceptance criteria:**
  - [ ] T-50's 28-criterion suite passes, including exact account/cookie outcomes, safe partial creation and source failures, fixed homes and role-only navigation. The Create demo kit control is SYS-12.4's evidence under T-24/T-25.
  - [ ] Existing role/workspace/RLS/session protections and domain ownership remain intact; no unapproved role/workspace assignment, caller-selected redirect, secret response/log data, automatic retry or fabricated domain data is introduced.
  - [ ] `bun run verify` and relevant `bun run test:e2e` pass with local Supabase only; the issue-scoped [handoff](templates/handoff.md) records actual checks and integration evidence.
- **Status:** done
- **Issue:** [#100](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/100)

## Customer

Customer pairs cover catalogue browsing/details, pickup orders, collected-order
reviews, Brew Finder and stretch favourites. Each pair owns only its listed CUS
criteria; foundation SYS/SEC owners remain unchanged. Specification prerequisites
define missing contracts rather than selecting product behaviour in this plan.
T-29 owns the suspension mutation and its automatic order cancellation; the
Customer order pair owns the retained My orders display and customer actions.
The catalogue and manual Admin review fixtures can be prepared independently
once their respective contracts exist. T-29 uses order fixtures under the
order contract without depending on Customer order creation/screens; T-43 can
then consume its suspension effect without a dependency cycle.

### T-35: Finalize customer catalogue and café-page contracts

- **Depends on:** T-52, T-55, T-34
- **Owner role:** spec
- **Requirements:** CUS-01, CUS-02 — [browse](specs/stories/CUS-01-browse-cafes.md), [café page](specs/stories/CUS-02-cafe-page.md); specification prerequisite only, no criterion ownership.
- **Description:** Complete deterministic browse, rating and café-detail contracts while retaining the specified unfiltered closed-café and closing-soon behaviour.
- **Work:** Resolve strict filter fields/values/normalization/combination/reset, Singapore date/time and opening-interval boundaries/overnight rules, and sold-out-only drink matches with the owning hours/menu contracts. Define one authoritative rating formula, unrated handling, ties, display precision and catalogue/review ordering/pagination. Specify customer-visible profile/menu/review fields, reviewer disclosure, money representation, customer page paths and read schemas. Retain CUS-01.9/CUS-01.10 labels, greyed but clickable closed cards and exactly-30-minute closing-soon inclusion; resolve absent next-opening schedules and opening-time text formatting without inventing a time. Amend integration/cache source inputs only from those decisions.
- **File scope:** Existing CUS-01/CUS-02 story files; customer catalogue/detail sections in `workflow/specs/INTEGRATION-SPEC.md` and relevant `TECHNICAL-SPEC.md` data-model references; own handoff. OWN-02/OWN-03 hours/menu definitions are required owning-role inputs, not application work in this task.
- **Prerequisite:** T-34 and the T-52/T-55 owner profile/hour/menu contracts are defined in the canonical boundaries on master. Customer reads consume those definitions; no owner runtime screen is required.
- **Acceptance criteria:**
  - [x] Catalogue filters, card states, next-opening failure cases, ratings and café-page responses are testable and have one authoritative owner.
  - [x] The specification changes have reviewed merge evidence on master before dependent testing/implementation; `bun run check:specs` and `bun run verify` results are recorded in the spec handoff, without claiming implementation acceptance.
- **Status:** done
- **Issue:** [#66](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/66)

### T-36: Finalize pickup, order and suspension-cancellation contracts

- **Depends on:** T-52, T-55, T-58
- **Owner role:** spec
- **Requirements:** CUS-03, CUS-04, ADM-02 — [pre-order](specs/stories/CUS-03-pre-order.md), [own orders](specs/stories/CUS-04-my-orders.md), [suspension](specs/stories/ADM-02-cafe-suspension.md); specification prerequisite only, no criterion ownership.
- **Description:** Complete the shared order lifecycle needed by Customer ordering and Admin suspension without weakening the confirmed all-uncollected cancellation rule.
- **Work:** Resolve pickup representations/intervals/horizon/past and boundary rules, quantities, sold-out eligibility, price snapshots/totals, duplicate submissions, customer order paths/read/write schemas and display ordering. Reconcile authoritative order state names/transitions with OWN-04/OWN-05 and later menu/hour changes with OWN-02/OWN-03. Define acceptance/cancellation and collection/suspension races, already terminal-order treatment and transactional failure responses. Preserve automatic suspension cancellation of every outstanding uncollected order including accepted/ready, fixed customer reason, unchanged collected purchases and no revival on un-suspension; separate this fixed reason from the private Admin reason. Keep suspension mutation/transaction ownership with T-28/T-29 and Customer display/actions with T-42/T-43.
- **File scope:** Existing CUS-03/CUS-04 and only the related ADM-02 suspension clauses; corresponding order/API/data-model sections in `workflow/specs/INTEGRATION-SPEC.md` and `TECHNICAL-SPEC.md`; own handoff. OWN-02–OWN-05 supply the authoritative owner inputs through their canonical boundaries.
- **Prerequisite:** T-52/T-55/T-58 contracts on master define current menu/hour/cutoff validation, profile-name snapshots, rejection reasons, timestamps and order/suspension races. Local fixtures suffice without owner runtime screens.
- **Acceptance criteria:**
  - [x] Order/pickup schemas, complete state/race/error matrix and suspension rollback/visibility responsibilities agree across the owning specs.
  - [x] The specification changes have reviewed merge evidence on master before dependent testing/implementation; `bun run check:specs` and `bun run verify` results are recorded in the spec handoff, without claiming implementation acceptance.
- **Status:** done
- **Issue:** [#67](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/67)

### T-37: Finalize customer review submission contracts

- **Depends on:** T-36, T-58
- **Owner role:** spec
- **Requirements:** CUS-05 — [review story](specs/stories/CUS-05-review-order.md); specification prerequisite only, no criterion ownership.
- **Description:** Define a valid review payload and public submission/read contract, retaining own-collected-once-only and ADM-03 immutability/post-moderation.
- **Work:** Resolve rating scale/type, text requiredness/length/normalization, duplicate submission outcomes, input feedback and customer review paths/schemas. Clarify review creation after café suspension while preserving collected purchases. Keep pending/kept/hidden visibility and immutable text/rating owned by ADM-03; integration Label/Reason bounds are not customer input limits. Make the canonical field contract sufficient for contract-derived local moderation fixtures without requiring a Customer review screen first.
- **File scope:** Existing `workflow/specs/stories/CUS-05-review-order.md`; corresponding review sections in `workflow/specs/INTEGRATION-SPEC.md` and `TECHNICAL-SPEC.md`; own handoff only.
- **Prerequisite:** T-36/T-58 contracts on master supply canonical collected-order eligibility. Review fields, post-suspension eligibility and once-only rules remain authoritative in CUS-05; local collected-order fixtures suffice.
- **Acceptance criteria:**
  - [x] Valid/invalid review payloads, source eligibility and duplicate outcomes are explicit and do not conflict with ADM-03.
  - [x] The specification changes have reviewed merge evidence on master before dependent testing/implementation; `bun run check:specs` and `bun run verify` results are recorded in the spec handoff, without claiming implementation acceptance.
- **Status:** done
- **Issue:** [#68](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/68)

### T-38: Finalize Brew Finder selection and empty-result contracts

- **Depends on:** T-35
- **Owner role:** spec
- **Requirements:** CUS-06 — [Brew Finder](specs/stories/CUS-06-brew-finder.md); specification prerequisite only, no criterion ownership.
- **Description:** Resolve the remaining feature-specific source/result decisions while preserving the fixed integration prompt, one-call sequence and security controls.
- **Work:** Define candidate selection/size/order, item availability rules, recommendation count, and customer/envelope treatment of an empty model suggestions array from a nonempty source. Preserve CUS-06's explicit-submit/loading interaction. Reconcile CatalogueFilters, rating fallback and source fingerprint inputs with T-35 and update only affected canonical integration/cache contracts; never invent a fallback reason or infer model quality from schema validity.
- **File scope:** Existing CUS-06 story; Brew Finder and matching cache-source sections of `workflow/specs/INTEGRATION-SPEC.md`; own handoff only.
- **Prerequisite:** T-35 catalogue/menu/hour contracts supply deterministic candidate availability and rating order. Canonical Brew selection/count, explicit-submit/loading and empty-result semantics remain unchanged.
- **Acceptance criteria:**
  - [x] Candidate/result/empty-source versus empty-model cases and UI triggers are independently testable with unchanged security limits.
  - [x] The specification changes have reviewed merge evidence on master before dependent testing/implementation; `bun run check:specs` and `bun run verify` results are recorded in the spec handoff, without claiming implementation acceptance.
- **Status:** done
- **Issue:** [#69](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/69)

### T-39: Finalize stretch favourite contracts

- **Depends on:** T-35
- **Owner role:** spec
- **Requirements:** CUS-07 — [favourites](specs/stories/CUS-07-favourite-cafes.md); specification prerequisite only, no criterion ownership.
- **Description:** Define optional favourite saving and return access without adding an MVP entity or granting broader catalogue access.
- **Work:** Resolve personal storage/RLS, strict save/read schemas and endpoint paths, repeat-save outcomes, persistence and ineligible/re-eligible café handling. Preserve CUS-07 placement in existing customer contexts and exclusion of removal; any removal scope amendment follows the source-story change process. Keep favourite reads personal and current café eligibility independently enforced.
- **File scope:** Existing CUS-07 story and matching stretch data/API sections of `workflow/specs/TECHNICAL-SPEC.md` and `INTEGRATION-SPEC.md`; PRODUCT-SPEC only if a human-approved scope amendment is needed; own handoff.
- **Prerequisite:** T-35 catalogue contracts supply current eligibility and café identity. Persistent personal saving, repeat-save success, ineligible omission/reappearance and no-removal scope remain canonical; stretch scope does not block MVP.
- **Acceptance criteria:**
  - [x] The optional favourite schema, ownership and return behaviour are testable without inventing removal/sharing/payment behaviour.
  - [x] The specification changes have reviewed merge evidence on master before dependent testing/implementation; `bun run check:specs` and `bun run verify` results are recorded in the spec handoff, without claiming implementation acceptance.
- **Status:** done
- **Issue:** [#70](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/70)

### T-40: Test customer catalogue and café pages

- **Depends on:** T-34, T-35, T-08, T-10, T-16
- **Owner role:** testing
- **Requirements:** CUS-01.1, CUS-01.2, CUS-01.3, CUS-01.4, CUS-01.5, CUS-01.6, CUS-01.7, CUS-01.8, CUS-01.9, CUS-01.10, CUS-01.11 — [CUS-01 criteria](specs/stories/CUS-01-browse-cafes.md#acceptance-criteria); CUS-02.1, CUS-02.2, CUS-02.3, CUS-02.4, CUS-02.5, CUS-02.6, CUS-02.7, CUS-02.8, CUS-02.9 — [CUS-02 criteria](specs/stories/CUS-02-cafe-page.md#acceptance-criteria).
- **Description:** Derive failing-first tests from [browse criteria](specs/stories/CUS-01-browse-cafes.md#acceptance-criteria) and [café-page criteria](specs/stories/CUS-02-cafe-page.md#acceptance-criteria).
- **Work:** Cover all eligible cafés in the unfiltered view, including closed cafés; greyed cards remain clickable and show next-opening text. Control the Singapore clock for closed/open and just above/at/below 30 minutes before closing, closing-soon text and transitions to closed. Cover time/drink/area filters and filter removal, source failure versus empty data, menu/prices/sold-out display, opening hours, pending/kept reviews and hidden exclusion, moderation visibility changes, inert content, main/kit isolation, stale eligibility and anonymous/wrong-role protected shells. Show catalogue reads use session-bound RLS clients and stream behind Suspense (SYS-05.3's page part). Use only the finalized T-35 filter/rating/field/API definitions, and local fixtures for moderation state changes rather than requiring Admin screens.
- **File scope:** Proposed `tests/unit/catalogue/`, `tests/integration/catalogue/`, `tests/e2e/catalogue/` and testing-owned synthetic café/menu/hour/review/clock fixtures. Route/database files use the node environment directive; component tests may use jsdom.
- **Prerequisite:** T-34/T-35 contracts and governing specs on master; T-08/T-10 role/session/RLS gates and T-16 catalogue eligibility. No live AI or hosted source is needed.
- **Acceptance criteria:**
  - [ ] Every listed criterion has named deterministic tests and recorded failing-first evidence; gaps are reported without guessing behaviour.
  - [ ] The card/text/time-boundary and main/kit assertions are deterministic and criterion-owned; no invented filter/rating behaviours.
  - [ ] Record `bun run verify` and relevant `bun run test:e2e` results using local Supabase and fake/disabled AI only; write the issue-scoped [handoff](templates/handoff.md) under the [handoff conventions](handoffs/README.md).
- **Status:** done
- **Issue:** [#71](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/71)

### T-41: Implement customer catalogue and café pages

- **Depends on:** T-40, T-34, T-35, T-08, T-10, T-16
- **Owner role:** implementation
- **Requirements:** CUS-01.1, CUS-01.2, CUS-01.3, CUS-01.4, CUS-01.5, CUS-01.6, CUS-01.7, CUS-01.8, CUS-01.9, CUS-01.10, CUS-01.11 — [CUS-01 criteria](specs/stories/CUS-01-browse-cafes.md#acceptance-criteria); CUS-02.1, CUS-02.2, CUS-02.3, CUS-02.4, CUS-02.5, CUS-02.6, CUS-02.7, CUS-02.8, CUS-02.9 — [CUS-02 criteria](specs/stories/CUS-02-cafe-page.md#acceptance-criteria).
- **Description:** Implement [customer browse/screens](specs/stories/CUS-01-browse-cafes.md#screens) and [café details](specs/stories/CUS-02-cafe-page.md#screens) with current session-bound RLS reads.
- **Work:** Build the customer catalogue/detail surfaces and strict read/filter contracts supplied by T-35. Show all eligible cafés unfiltered, grey out closed cards without disabling links, render next-opening and final-30-minute labels, and apply the specified Singapore-time filters. Read menus/prices/sold-out state, hours and visible reviews under current eligibility. Supply the one canonical rating-sorted filtered catalogue for later Brew fallback without a separate algorithm. Reuse streaming role gates and accessible components; do not add catalogue caching or AI calls.
- **File scope:** Proposed customer catalogue/detail pages within `src/app/` at the T-35 contract paths, `src/server/catalogue/`, reusable customer components and necessary additive catalogue policies/fields. Required runtime integration in `next.config.ts` and `src/proxy.ts` is limited to preserving original query keys for strict validation on the three catalogue GET endpoints, while preserving shared authentication, role gates and session refresh behavior. Serialize shared migrations and shared runtime integration with existing owners. No acceptance tests/fixtures/mocks or unrelated role screens.
- **Prerequisite:** T-40 failing-first evidence and T-34/T-35 finalized contracts on master; T-08/T-10/T-16 foundations.
- **Acceptance criteria:**
  - [ ] All T-40 criteria pass, including clickable closed cards, exact labels, current eligibility and review confidentiality.
  - [ ] The paired test task's criterion suite and relevant `bun run test:e2e` pass; `bun run verify` passes and the issue-scoped [handoff](templates/handoff.md) records actual checks and review gaps.
- **Status:** done
- **Issue:** [#72](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/72)

### T-42: Test customer pickup orders and cancellation display

- **Depends on:** T-34, T-36, T-41, T-08, T-10, T-16
- **Owner role:** testing
- **Requirements:** CUS-03.1, CUS-03.2, CUS-03.3, CUS-03.4, CUS-03.5, CUS-03.6, CUS-03.7, CUS-03.8 — [CUS-03 criteria](specs/stories/CUS-03-pre-order.md#acceptance-criteria); CUS-04.1, CUS-04.2, CUS-04.3, CUS-04.4, CUS-04.5, CUS-04.6, CUS-04.7, CUS-04.8 — [CUS-04 criteria](specs/stories/CUS-04-my-orders.md#acceptance-criteria).
- **Description:** Derive failing-first tests for [pickup orders](specs/stories/CUS-03-pre-order.md#acceptance-criteria) and [own-order management](specs/stories/CUS-04-my-orders.md#acceptance-criteria).
- **Work:** Cover own single-café order creation, exact finalized pickup validity/availability/price/submission cases, payment at pickup without payment processing, wrong actor/item/café/workspace denials and stale café suspension. Cover own-order reads, pre-acceptance customer cancellation, denial after acceptance and strict HTTP failures. For CUS-04.5, exercise T-29's authorized suspension effect with unaccepted/accepted/ready/collected local fixtures and verify retained own orders, fixed cancellation reason, unchanged collected purchases, no revival on un-suspension and no private Admin-reason disclosure. Keep cancellation transaction/rollback assertions owned by the ADM pair; Customer cases own visibility/actions. Record unavailable integration surfaces separately from failing-first domain tests.
- **File scope:** Proposed `tests/unit/orders/`, `tests/integration/orders/`, `tests/e2e/orders/` and testing-owned local order/item/pickup/clock/suspension fixtures. Route/database cases use the node environment directive.
- **Prerequisite:** T-34/T-36 and owning menu/hour/pickup/queue contracts on master; T-41 catalogue and T-08/T-10/T-16 foundations. Actual suspension-integration assertions use T-29 when available; test authoring may record expected absence before it exists.
- **Acceptance criteria:**
  - [ ] Every listed criterion has named deterministic tests and recorded failing-first evidence; gaps are reported without guessing behaviour.
  - [ ] No test grants Customer acceptance/collection or generic Admin order-write permission; CUS-04.5 uses the fixed public cancellation reason.
  - [ ] Record `bun run verify` and relevant `bun run test:e2e` results using local Supabase and fake/disabled AI only; write the issue-scoped [handoff](templates/handoff.md) under the [handoff conventions](handoffs/README.md).
- **Status:**to-do
- **Issue:** [#73](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/73)

### T-43: Implement customer pickup orders and My orders

- **Depends on:** T-42, T-29, T-34, T-36, T-41, T-08, T-10, T-16
- **Owner role:** implementation
- **Requirements:** CUS-03.1, CUS-03.2, CUS-03.3, CUS-03.4, CUS-03.5, CUS-03.6, CUS-03.7, CUS-03.8 — [CUS-03 criteria](specs/stories/CUS-03-pre-order.md#acceptance-criteria); CUS-04.1, CUS-04.2, CUS-04.3, CUS-04.4, CUS-04.5, CUS-04.6, CUS-04.7, CUS-04.8 — [CUS-04 criteria](specs/stories/CUS-04-my-orders.md#acceptance-criteria).
- **Description:** Implement [Pre-order](specs/stories/CUS-03-pre-order.md#screens) and [My orders](specs/stories/CUS-04-my-orders.md#screens), consuming the authoritative suspension operation.
- **Work:** Create/read own orders and order items through finalized schemas, server-derived Customer/workspace, current café/item/pickup validation and the agreed duplicate/race handling. Provide payment-at-pickup information and customer cancellation only in permitted pre-acceptance states. Render retained automatically cancelled orders with the fixed suspension reason while leaving the private Admin reason inaccessible. Consume T-29's suspension cancellation instead of implementing a second suspension writer; Customer mutation permissions do not expand to accepted/ready orders. Preserve collected purchases and no revival semantics.
- **File scope:** Proposed Pre-order/My orders pages and order route handlers within `src/app/` at T-36 paths, `src/server/orders/`, customer components and additive order policies/fields beyond T-29's suspension-cancellation storage. Serialize order migrations with T-29; no acceptance tests/fixtures/mocks or Admin/owner queue screens.
- **Prerequisite:** T-42 failing-first evidence; T-34/T-36 contracts on master; T-29 suspension mutation and T-41 catalogue surfaces. T-29 may use local contract-derived order fixtures and does not depend on this task.
- **Acceptance criteria:**
  - [ ] T-42's full suite passes, including actual suspension cancellation display, ownership and unchanged collected purchases.
  - [ ] The paired test task's criterion suite and relevant `bun run test:e2e` pass; `bun run verify` passes and the issue-scoped [handoff](templates/handoff.md) records actual checks and review gaps.
- **Status:** to-do
- **Issue:** [#74](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/74)

### T-44: Test collected-order reviews

- **Depends on:** T-34, T-36, T-37, T-43, T-08, T-10
- **Owner role:** testing
- **Requirements:** CUS-05.1, CUS-05.2, CUS-05.3, CUS-05.4, CUS-05.5, CUS-05.6, CUS-05.7, CUS-05.8, CUS-05.9, CUS-05.10 — [CUS-05 criteria](specs/stories/CUS-05-review-order.md#acceptance-criteria).
- **Description:** Derive failing-first tests from the [collected-order review criteria](specs/stories/CUS-05-review-order.md#acceptance-criteria).
- **Work:** Cover finalized rating/text bounds and exact submission responses, own collected-order eligibility, uncollected/foreign/workspace/missing orders, server-derived relationships, unique order constraint and concurrent duplicate submission. Assert pending initial moderation, denied state injection/edit/delete, immutable text/rating, inert malicious text and unchanged one-review eligibility after hide/restore. Exercise all main/kit/auth/origin/strict-input failures with contract-derived fixtures; this pair does not own moderation or rating formulas.
- **File scope:** Proposed `tests/unit/reviews/`, `tests/integration/reviews/`, `tests/e2e/reviews/` and testing-owned review/order/provider-free adversarial fixtures; route/database cases use the node environment directive.
- **Prerequisite:** T-34/T-36/T-37 reviewed contracts on master, T-43 own-order surface and T-08/T-10 foundations. ADM-03 provides existing pending/immutability definitions; manual moderation UI is not required for fixture-based cases.
- **Acceptance criteria:**
  - [ ] Every listed criterion has named deterministic tests and recorded failing-first evidence; gaps are reported without guessing behaviour.
  - [ ] Concurrent submissions cannot produce a second review; testing uses approved domain bounds rather than LLM text limits.
  - [ ] Record `bun run verify` and relevant `bun run test:e2e` results using local Supabase and fake/disabled AI only; write the issue-scoped [handoff](templates/handoff.md) under the [handoff conventions](handoffs/README.md).
- **Status:** to-do
- **Issue:** [#75](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/75)

### T-45: Implement collected-order review submission

- **Depends on:** T-44, T-34, T-36, T-37, T-43, T-08, T-10
- **Owner role:** implementation
- **Requirements:** CUS-05.1, CUS-05.2, CUS-05.3, CUS-05.4, CUS-05.5, CUS-05.6, CUS-05.7, CUS-05.8, CUS-05.9, CUS-05.10 — [CUS-05 criteria](specs/stories/CUS-05-review-order.md#acceptance-criteria).
- **Description:** Implement the [Customer Review form](specs/stories/CUS-05-review-order.md#screens) and authorized create/read operations without adding customer moderation or edit/delete.
- **Work:** Use T-37's finalized fields/routes/schemas, current own-collected-order checks and server-derived author/order/café relationships. Persist one review per order under the existing unique constraint, preserve exact approved text/rating handling and initialize moderation under ADM-03. Expose only own-review reads and the existing visible café reviews; deny edit/delete/state manipulation. Reuse order/session/RLS and plain-text rendering, leaving manual moderation/AI to their existing owners.
- **File scope:** Proposed Review form and review route handlers under `src/app/` at T-37 paths, `src/server/reviews/`, customer components and necessary additive review migrations/policies. Serialize with T-31's moderation fields/policies and T-43 order storage; no acceptance tests/fixtures/mocks or Admin UI.
- **Prerequisite:** T-44 failing-first evidence, T-37 contract on master and T-43 own orders with canonical collection states. Review creation is independent of manual moderation screen implementation.
- **Acceptance criteria:**
  - [ ] T-44's full suite passes for creation, concurrent uniqueness, session/workspace/ownership and immutable post-submission data.
  - [ ] The paired test task's criterion suite and relevant `bun run test:e2e` pass; `bun run verify` passes and the issue-scoped [handoff](templates/handoff.md) records actual checks and review gaps.
- **Status:** to-do
- **Issue:** [#76](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/76)

### T-46: Test Brew Finder search and fallbacks

- **Depends on:** T-34, T-35, T-38, T-41, T-08, T-10, T-12, T-14, T-16
- **Owner role:** testing
- **Requirements:** CUS-06.1, CUS-06.2, CUS-06.3, CUS-06.4, CUS-06.5, CUS-06.6, CUS-06.7, CUS-06.8, CUS-06.9, CUS-06.10, CUS-06.11, CUS-06.12, CUS-06.13, CUS-06.14, CUS-06.15, CUS-06.16 — [CUS-06 criteria](specs/stories/CUS-06-brew-finder.md#acceptance-criteria).
- **Description:** Derive failing-first route/browser/evaluation cases from [Brew Finder criteria](specs/stories/CUS-06-brew-finder.md#acceptance-criteria), [guardrails](specs/stories/CUS-06-brew-finder.md#guardrails) and its canonical integration/security contracts.
- **Work:** Cover finalized submit/loading interaction, query/filter boundaries, candidate/item/count and empty-model decisions, exact AI/fallback envelopes and the ordinary rating-sorted catalogue. Capture the exact fixed prompt/data boundary with fake providers; test ranking references/reasons/inert rendering, whole-result rejection, same-actor exact-input/source/version cache validity and 10-minute expiry, disable before cache/delivery, usage caps, one-call/no-retry failures and source-unavailable versus empty source. Exercise main/kit/role/origin/stale eligibility and separate café/order authorization, content-free accounting and CUS-06-E01–E13 injection/quality cases. Existing foundation pairs retain SYS/SEC ownership; human quality evaluation uses examples without a live call or invented score.
- **File scope:** Proposed `tests/unit/brew-finder/`, `tests/integration/brew-finder/`, `tests/e2e/brew-finder/` and testing-owned fake provider/source/cache/clock/limit/adversarial fixtures and evaluation records. Route/database cases use the node environment directive.
- **Prerequisite:** T-34/T-35/T-38 contracts on master; T-41 catalogue/fallback and T-08/T-10/T-12/T-14/T-16 controls. Actual separate order-authorization acceptance uses T-43; test cases can be authored before that integration is available.
- **Acceptance criteria:**
  - [ ] Every listed criterion has named deterministic tests and recorded failing-first evidence; gaps are reported without guessing behaviour.
  - [ ] All 13 evaluation cases have explicit evidence; no cache/provider/result can grant record access or an order write.
  - [ ] Record `bun run verify` and relevant `bun run test:e2e` results using local Supabase and fake/disabled AI only; write the issue-scoped [handoff](templates/handoff.md) under the [handoff conventions](handoffs/README.md).
- **Status:** to-do
- **Issue:** [#77](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/77)

### T-47: Implement Brew Finder search integration

- **Depends on:** T-46, T-34, T-35, T-38, T-41, T-43, T-08, T-10, T-12, T-14, T-16
- **Owner role:** implementation
- **Requirements:** CUS-06.1, CUS-06.2, CUS-06.3, CUS-06.4, CUS-06.5, CUS-06.6, CUS-06.7, CUS-06.8, CUS-06.9, CUS-06.10, CUS-06.11, CUS-06.12, CUS-06.13, CUS-06.14, CUS-06.15, CUS-06.16 — [CUS-06 criteria](specs/stories/CUS-06-brew-finder.md#acceptance-criteria).
- **Description:** Integrate [Brew Finder](specs/stories/CUS-06-brew-finder.md#user-experience) into Browse cafés using the existing [AI route/envelope](specs/INTEGRATION-SPEC.md#ai-routes-and-result-envelope).
- **Work:** Add the existing specified `POST /api/ai/brew-finder` boundary with strict query/filter/session/role/origin validation and authorized deterministic catalogue selection. Call only T-14's server-only fixed Brew operation, T-12 admission and T-16 cache/audit services. Implement T-38's finalized UI/selection/empty-result choices, safe ranked plain-text advice and typed catalogue fallback messages; reuse T-41's canonical rating/filter logic rather than duplicating it. Preserve same-actor 10-minute cache validity, current eligibility and disable precedence, one admitted provider call/no retries and content-free accounting. Opening/pre-ordering independently uses T-41/T-43 authorization.
- **File scope:** Proposed `src/app/api/ai/brew-finder/route.ts`, Browse cafés interaction components in T-41's customer area, authorized source adapter under `src/server/catalogue/`, and necessary integration of existing `src/server/llm/` operations. Serialize shared catalogue edits with T-41; no new prompts/provider transport/quota policy or acceptance tests/fixtures/mocks.
- **Prerequisite:** T-46 failing-first evidence; T-34/T-35/T-38 contracts on master; T-41 catalogue and T-43 separate order authorization, plus foundation controls. No hosted LLM access is required.
- **Acceptance criteria:**
  - [ ] T-46's full criterion/evaluation suite passes with fake/disabled AI and independent catalogue/order authorization.
  - [ ] The paired test task's criterion suite and relevant `bun run test:e2e` pass; `bun run verify` passes and the issue-scoped [handoff](templates/handoff.md) records actual checks and review gaps.
- **Status:** to-do
- **Issue:** [#78](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/78)

### T-48: Test stretch favourite saving

- **Depends on:** T-34, T-35, T-39, T-41, T-08, T-10
- **Owner role:** testing
- **Requirements:** CUS-07.1, CUS-07.2, CUS-07.3, CUS-07.4, CUS-07.5 — [CUS-07 criteria](specs/stories/CUS-07-favourite-cafes.md#acceptance-criteria).
- **Description:** Derive failing-first tests for [personal favourite saving and return access](specs/stories/CUS-07-favourite-cafes.md#acceptance-criteria), outside MVP.
- **Work:** Cover finalized save/read/persistence/repeat-save and ineligible/re-eligible behaviour, approved placement, personal Customer associations, unchanged café data, forged actor/workspace and session/role/strict-origin denials. Verify a saved reference cannot disclose a suspended/ineligible/other-workspace café and does not reveal the Admin reason or another Customer's saved associations. Do not infer removal, sharing or a new screen.
- **File scope:** Proposed `tests/unit/favourites/`, `tests/integration/favourites/`, `tests/e2e/favourites/` and testing-owned Customer/café/saved-association fixtures; route/database cases use the node environment directive.
- **Prerequisite:** T-34/T-35/T-39 stretch contracts on master, T-41 customer catalogue and T-08/T-10 foundations; optional scope does not block MVP pairs.
- **Acceptance criteria:**
  - [ ] Every listed criterion has named deterministic tests and recorded failing-first evidence; gaps are reported without guessing behaviour.
  - [ ] Favourite tests use the approved stretch schema and never expand catalogue permissions or add unapproved removal/sharing.
  - [ ] Record `bun run verify` and relevant `bun run test:e2e` results using local Supabase and fake/disabled AI only; write the issue-scoped [handoff](templates/handoff.md) under the [handoff conventions](handoffs/README.md).
- **Status:** to-do
- **Issue:** [#79](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/79)

### T-49: Implement stretch favourite saving

- **Depends on:** T-48, T-34, T-35, T-39, T-41, T-08, T-10
- **Owner role:** implementation
- **Requirements:** CUS-07.1, CUS-07.2, CUS-07.3, CUS-07.4, CUS-07.5 — [CUS-07 criteria](specs/stories/CUS-07-favourite-cafes.md#acceptance-criteria).
- **Description:** Implement the optional [CUS-07 save/return experience](specs/stories/CUS-07-favourite-cafes.md#screens) from its finalized personal-data contract.
- **Work:** Add only T-39's approved favourite storage/RLS/API/UI placement and repeat-save/persistence handling. Derive actor/workspace from the session, retain personal association scope and recheck café eligibility for return navigation. Reuse T-41's current café reads; never treat a favourite as an access grant or modify café/rating/boost data. No removal or separate screen is added unless the governing source/story contract explicitly authorizes it.
- **File scope:** Proposed customer components and favourite routes under `src/app/` at T-39 paths, `src/server/favourites/`, and additive favourite schema/RLS migrations. Serialize shared catalogue/UI edits with T-41; no acceptance tests/fixtures/mocks or owner/Admin features.
- **Prerequisite:** T-48 failing-first evidence, finalized T-39 stretch contract on master and T-41 catalogue/current-eligibility reads.
- **Acceptance criteria:**
  - [ ] T-48's full suite passes with personal/workspace isolation and no saved-reference eligibility bypass.
  - [ ] The paired test task's criterion suite and relevant `bun run test:e2e` pass; `bun run verify` passes and the issue-scoped [handoff](templates/handoff.md) records actual checks and review gaps.
- **Status:** to-do
- **Issue:** [#80](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/80)


## Café owner

Five pairs cover café setup/profile/pickup rules (OWN-01/OWN-02/OWN-04), menu
(OWN-03), fulfilment queue (OWN-05), sales/Prep Advisor (OWN-06/OWN-07) and stretch
boost requests (OWN-08). Each pair owns only its listed story criteria. Shared
SYS/SEC criteria retain their foundation owners. Contract tasks T-52, T-55,
T-58, T-61 and T-64 own specification completion, not executable coverage.

Setup, menu and queue contracts can be drafted independently. Sales/advice
contracts use menu-history and queue source decisions; boost decisions also
require ADM-06. Local authorized fixtures permit owner tests before Customer
order creation or Admin decision screens, avoiding a cycle through T-29/T-43.
Owner application/profile layout is owned by T-54, menu by T-57, queue by T-60
and Dashboard sales/Prep by T-63; T-66 extends the selected owner surface only
for stretch. Shared-file edits are serialized, and missing contracts never
become implementation choices. Execution requires governing specs on master;
implementation also requires the paired failing-first evidence.

### T-52: Finalize owner café application, profile and pickup contracts

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** OWN-01, OWN-02, OWN-04 — [OWN-01](specs/stories/OWN-01-cafe-application.md#acceptance-criteria), [OWN-02](specs/stories/OWN-02-cafe-profile-hours.md#acceptance-criteria), [OWN-04](specs/stories/OWN-04-pickup-rules.md#acceptance-criteria); specification prerequisite only, no criterion ownership.
- **Description:** Complete the owner setup contracts reserved by the [integration dependency map](specs/INTEGRATION-SPEC.md#contract-dependencies), preserving approval/suspension independence and the existing Customer hours/pickup vocabulary.
- **Work:** Resolve café cardinality, application/profile editable fields and validation, first/duplicate submission, rejected-application editing/resubmission and submission ordering. Define current-state/concurrent-save behavior, exact owner read/save/resubmit paths and strict request/success/error schemas. Specify owner no-café states, application/latest-decision display and suspension/reason surfaces without exposing private Admin reasons to Customers. Retain established Singapore weekly/overnight intervals, empty hours, cutoff bounds/default, unchanged order snapshots and owner management during suspension. Put domain behavior in its owning story, API contracts in INTEGRATION-SPEC and data/RLS constraints in TECHNICAL-SPEC; do not resolve decisions in PLAN.
- **File scope:** Existing OWN-01/OWN-02/OWN-04 story files and their owning sections of `workflow/specs/INTEGRATION-SPEC.md` and `TECHNICAL-SPEC.md`; own numbered spec handoff. No application, tests or unrelated story changes.
- **Prerequisite:** Application/profile/hour/cutoff fields, atomic saves and suspension-race feedback are defined in OWN-01/OWN-02/OWN-04 and the canonical owner café boundary on master.
- **Acceptance criteria:**
  - [x] Application/profile/hour/cutoff boundaries are deterministic, preserve source IDs and have no unresolved behavioral assumptions; any changed criteria remain in their owning files.
  - [x] Reviewed governing contracts are on master before dependent testing/implementation; `bun run check:specs` and `bun run check:traceability` results and remaining decisions are recorded in the spec handoff.
- **Status:** done
- **Issue:** [#108](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/108)

### T-53: Test owner café application, profile, hours and pickup rules

- **Depends on:** T-52, T-34, T-08, T-10
- **Owner role:** testing
- **Requirements:** OWN-01.1, OWN-01.2, OWN-01.3, OWN-01.4, OWN-01.5, OWN-01.6, OWN-01.7, OWN-01.8; OWN-02.1, OWN-02.2, OWN-02.3, OWN-02.4, OWN-02.5, OWN-02.6, OWN-02.7, OWN-02.8; OWN-04.1, OWN-04.2, OWN-04.3, OWN-04.4, OWN-04.5, OWN-04.6, OWN-04.7, OWN-04.8 — [OWN-01](specs/stories/OWN-01-cafe-application.md#acceptance-criteria), [OWN-02](specs/stories/OWN-02-cafe-profile-hours.md#acceptance-criteria), [OWN-04](specs/stories/OWN-04-pickup-rules.md#acceptance-criteria).
- **Description:** Derive failing-first coverage for owner setup from OWN-01/OWN-02/OWN-04 and their finalized [HTTP](specs/INTEGRATION-SPEC.md#authorization-and-transport), [hours](specs/INTEGRATION-SPEC.md#customer-catalogue-and-detail-boundary) and [pickup](specs/INTEGRATION-SPEC.md#customer-pickup-and-order-boundary) contracts.
- **Work:** Cover all 24 listed criteria: verified owner/workspace application submission, pending/approved/rejected display and latest private decision reason, resubmission preserving audit history, no self-approval or suspension clearing, profile persistence, Singapore weekly/overnight/week-boundary/adjacent/empty hours, invalid overlap/duration, cutoff 0/180/default and invalid inputs, no-slots outcomes and immutable existing orders. Test anonymous/wrong-role/foreign targets, kit/main isolation, direct RLS denials, source versus absent-data states and shared JSON protection. Use authoritative local application/decision/order fixtures rather than requiring T-29 Admin mutations or T-43 Customer creation. Extend coverage only from T-52-approved amendments, not implementation task details.
- **File scope:** Proposed `tests/{unit,integration,e2e}/owner-cafe/`, testing-owned local state/clock/decision/order fixtures and browser cases under `tests/e2e/owner-cafe/`; database/route Vitest files use `// @vitest-environment node`. Reuse existing role/session harnesses.
- **Prerequisite:** T-52 contracts and all governing owner specs on master; T-34 account/navigation contract and T-08/T-10 role/RLS/session gates. T-51 provides the role shell for final browser integration; missing owner screens are expected failing-first targets, not fixture authoring by implementation.
- **Acceptance criteria:**
  - [ ] Every listed criterion has named positive/negative failing-first evidence, including main/kit access and time boundaries; no additional permission or owner/cardinality rule is inferred.
  - [ ] Exact `bun run verify` and relevant `bun run test:e2e` outcomes, checks not reached and expected missing implementation are recorded in the issue-scoped [handoff](templates/handoff.md), using local Supabase/fake or disabled AI only.
- **Status:** todo
- **Issue:** [#109](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/109)

### T-54: Implement owner café application, profile, hours and pickup rules

- **Depends on:** T-53, T-52, T-51, T-08, T-10
- **Owner role:** implementation
- **Requirements:** OWN-01.1, OWN-01.2, OWN-01.3, OWN-01.4, OWN-01.5, OWN-01.6, OWN-01.7, OWN-01.8; OWN-02.1, OWN-02.2, OWN-02.3, OWN-02.4, OWN-02.5, OWN-02.6, OWN-02.7, OWN-02.8; OWN-04.1, OWN-04.2, OWN-04.3, OWN-04.4, OWN-04.5, OWN-04.6, OWN-04.7, OWN-04.8 — [OWN-01](specs/stories/OWN-01-cafe-application.md#acceptance-criteria), [OWN-02](specs/stories/OWN-02-cafe-profile-hours.md#acceptance-criteria), [OWN-04](specs/stories/OWN-04-pickup-rules.md#acceptance-criteria).
- **Description:** Implement owner setup using the owning stories and T-52 contracts, reusing the [data/RLS model](specs/TECHNICAL-SPEC.md#data-model-and-ownership) and [role navigation](specs/stories/SYS-03-role-navigation.md).
- **Work:** Add `/owner/application`, owner profile/hour/cutoff surfaces and the shared owner-domain layout beneath T-51 role navigation. Implement only the approved submission/resubmission and edit/read contracts with strict server validation, same-origin mutation protection, verified owner/workspace and RLS. Persist permitted own data, show application/decision/suspension context and protect Admin-controlled states. Reuse the established interval/cutoff semantics, enforce no-café/source-error distinctions and preserve order snapshots. Add only required additive domain/policy constraints; reuse guards/session-bound clients rather than adding a privileged generic CRUD boundary. Customer/Admin flows and menu/queue/sales content keep their separate owners.
- **File scope:** Proposed `src/app/owner/application/`, owner profile/hour/pickup surfaces and shared owner-domain layout under `src/app/owner/`; owner Route Handlers only at T-52-approved paths; server-only domain modules under proposed `src/server/owner/`; additive `supabase/migrations/`. Serialize profile/layout/migration edits; no tests/fixtures/mocks.
- **Prerequisite:** T-53 failing-first evidence, T-52 contracts on master, T-51 role shell and T-08/T-10 access/session infrastructure. Local decision/order fixtures permit acceptance before Admin or Customer mutation screens exist; no dependency on T-29/T-43.
- **Acceptance criteria:**
  - [ ] T-53 coverage passes for all 24 criteria and any formally approved amendments, including private reason scope, suspension access, time/cutoff validation and immutable purchases.
  - [ ] Exact `bun run verify` and relevant `bun run test:e2e` pass; issue-scoped [handoff](templates/handoff.md) records actual evidence and any external surface limit. Acceptance tests/configuration/fixtures are unchanged.
- **Status:** todo
- **Issue:** [#110](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/110)

### T-55: Finalize owner menu lifecycle and edit contracts

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** OWN-03 — [OWN-03](specs/stories/OWN-03-menu-management.md#acceptance-criteria); specification prerequisite only, no criterion ownership.
- **Description:** Complete OWN-03 menu edit/history contracts while preserving the [shared money/type and Customer menu boundary](specs/INTEGRATION-SPEC.md#customer-catalogue-and-detail-boundary).
- **Work:** Resolve add/edit/remove actions, names/validation/normalization/duplicates, initial sold-out state, removal/history retention and source identity after rename/removal. Define owner list ordering/pagination, no-café behavior, concurrency and exact read/mutation request/success/error schemas. Preserve integer SGD cents, shared DrinkType values, sold-out inclusion in Customer views, unavailable-item refusal for new orders and historical purchase snapshots. Record data/RLS and transport in their canonical shared specs; do not introduce inventory, payment or new Admin write access.
- **File scope:** Existing OWN-03 story; owner-menu sections in `workflow/specs/INTEGRATION-SPEC.md` and menu/history/RLS sections in `TECHNICAL-SPEC.md`; own spec handoff. No code/tests.
- **Prerequisite:** OWN-03 and the owner menu boundary on master define lifecycle, normalized names, permanent removal, alphabetical pages, last-valid-commit concurrency and preserved purchase snapshots.
- **Acceptance criteria:**
  - [x] One authoritative menu lifecycle/edit contract covers ordinary and failure/concurrent paths without rewriting purchases or broadening access.
  - [x] Reviewed contracts are on master before dependent execution; spec/traceability checks and decisions are recorded in the spec handoff.
- **Status:** done
- **Issue:** [#111](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/111)

### T-56: Test owner menu prices, items and sold-out state

- **Depends on:** T-55, T-08, T-10
- **Owner role:** testing
- **Requirements:** OWN-03.1, OWN-03.2, OWN-03.3, OWN-03.4, OWN-03.5, OWN-03.6, OWN-03.7, OWN-03.8 — [OWN-03](specs/stories/OWN-03-menu-management.md#acceptance-criteria).
- **Description:** Derive failing-first tests for all OWN-03 criteria and the finalized menu boundary, independently of Customer order screens.
- **Work:** Cover own menu reads/persistence, shared drink enums, integer price bounds and exact SGD formatting, sold-out on/off and Customer-visible sold-out items, new-order refusal and unchanged historical snapshots. Exercise missing/foreign item and café targets, forged parents, main/kit isolation, suspended-owner access, empty/all-sold-out menus and safe source/JSON failures. Add menu lifecycle/removal/concurrency cases only from T-55-approved contracts. Use local authorized café/order fixtures; reuse Customer/shared assertions without taking their criterion ownership.
- **File scope:** Proposed `tests/{unit,integration,e2e}/owner-menu/`, testing-owned local menu/history/fault fixtures and browser cases under `tests/e2e/owner-menu/`; database/route tests declare node environment.
- **Prerequisite:** T-55 and governing specs on master, T-08/T-10 infrastructure; T-54 supplies owner-domain layout for final browser integration. Test authoring may use local café fixtures before setup UI is implemented.
- **Acceptance criteria:**
  - [ ] All eight listed OWN-03 criteria have named failing-first cases; no unspecified deletion/history behavior is inferred.
  - [ ] Exact `bun run verify` and relevant `bun run test:e2e` outcomes are recorded in an issue-scoped handoff with local-only fixtures.
- **Status:** todo
- **Issue:** [#112](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/112)

### T-57: Implement owner menu management

- **Depends on:** T-56, T-55, T-54, T-08, T-10
- **Owner role:** implementation
- **Requirements:** OWN-03.1, OWN-03.2, OWN-03.3, OWN-03.4, OWN-03.5, OWN-03.6, OWN-03.7, OWN-03.8 — [OWN-03](specs/stories/OWN-03-menu-management.md#acceptance-criteria).
- **Description:** Implement the owner Menu surface and approved menu operations, reusing T-54 owner layout and the [purchase snapshot boundary](specs/INTEGRATION-SPEC.md#customer-pickup-and-order-boundary).
- **Work:** Add own-menu reads and approved add/edit/remove/price/sold-out controls with server validation, current parent ownership/workspace checks, RLS and shared HTTP errors. Preserve cents/type vocabulary, visible sold-out items, stale-price/new-order validation and immutable purchase snapshots. Apply only T-55-approved removal/history/concurrency semantics. Keep suspension/approval independent and reuse the existing role/session clients; no inventory, Customer order UI or AI menu-write authority.
- **File scope:** Proposed owner Menu surface under `src/app/owner/`, T-55-approved owner menu Route Handlers, menu domain modules under `src/server/owner/` and additive menu/policy migrations. Serialize shared owner layout and migrations; no tests/fixtures/mocks.
- **Prerequisite:** T-56 failing-first evidence, T-55 contracts on master, T-54 owner setup/layout and T-08/T-10 authorization/session controls.
- **Acceptance criteria:**
  - [ ] T-56 suite passes, including all eight OWN-03 criteria, cross-parent denial, availability changes and retained purchase snapshots.
  - [ ] Exact `bun run verify` and relevant browser checks pass; an issue-scoped handoff records results without hosted services or acceptance-test edits.
- **Status:** blocked
- **Issue:** [#113](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/113)

### T-58: Finalize owner order queue read and action contracts

- **Depends on:** T-34
- **Owner role:** spec
- **Requirements:** OWN-05 — [OWN-05](specs/stories/OWN-05-order-queue.md#acceptance-criteria); specification prerequisite only, no criterion ownership.
- **Description:** Complete OWN-05 queue presentation/transport without changing the established [order transition/race matrix](specs/INTEGRATION-SPEC.md#customer-pickup-and-order-boundary).
- **Work:** Resolve queue state filters, ordering/pagination, displayed purchase/customer fields, rejection-reason policy, no-café and stale-action feedback. Define exact owner read/action paths, strict request/success/error schemas and transaction concurrency rules. Preserve pending→accepted/rejected, accepted→ready, ready→collected, terminal-state conflicts, acceptance/cancellation race and collection/suspension serialization. Any source timestamp needed by subsequent sales decisions is an explicit canonical contract amendment, not an implementation inference. Queue scope grants no general Customer-profile access, new payment operation or invented order audit.
- **File scope:** Existing OWN-05 and owning order sections of `workflow/specs/INTEGRATION-SPEC.md` and `TECHNICAL-SPEC.md`; own spec handoff. Other story behavior changes require its owning specification scope; no application/tests.
- **Prerequisite:** OWN-05 and the owner queue boundary on master define filters, 10-item ordering, profile-name snapshots, required public-to-customer rejection reasons and timestamps. SYS-01 supplies Customer name at registration; no T-29/T-43 runtime prerequisite is introduced.
- **Acceptance criteria:**
  - [x] Owner queue contracts are exact and consistent with every current shared state/race outcome and minimum necessary Customer disclosure.
  - [x] Governing reviewed contracts are on master before dependent execution; spec/traceability results and unresolved decisions are recorded.
- **Status:** done
- **Issue:** [#114](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/114)

### T-59: Test owner order queue and fulfilment races

- **Depends on:** T-58, T-08, T-10
- **Owner role:** testing
- **Requirements:** OWN-05.1, OWN-05.2, OWN-05.3, OWN-05.4, OWN-05.5, OWN-05.6, OWN-05.7, OWN-05.8, OWN-05.9, OWN-05.10 — [OWN-05](specs/stories/OWN-05-order-queue.md#acceptance-criteria).
- **Description:** Derive failing-first OWN-05 queue coverage from the [story criteria](specs/stories/OWN-05-order-queue.md#acceptance-criteria) and T-58 contracts using local purchases.
- **Work:** Cover scoped queue reads and snapshots; accept/reject pending, mark accepted ready and mark ready collected; wrong-state/repeat/skip/terminal conflicts; exactly-one pending winner against Customer cancellation; collection-before/after suspension and no revival; rollback/source failures; review eligibility without review mutation; main/kit/session/role/foreign-parent denials and direct RLS. Test presentation, private fields and rejection reasons only as specified by T-58. Local atomic actor fixtures exercise races without requiring the Customer/Admin screens; preserve separate CUS/ADM/SYS/SEC ownership.
- **File scope:** Proposed `tests/{unit,integration,e2e}/owner-queue/`, local state/race/fault fixtures and browser cases under `tests/e2e/owner-queue/`; route/database files declare node environment. Reuse existing role harnesses.
- **Prerequisite:** T-58/governing contracts on master and T-08/T-10 controls; T-54 supplies final owner layout. T-29/T-43 screens are not prerequisites for fixture-based transition/race testing.
- **Acceptance criteria:**
  - [ ] All ten listed OWN-05 criteria have named failing-first cases, including both race orderings, no partial mutation and indistinguishable foreign references.
  - [ ] Exact `bun run verify` and relevant `bun run test:e2e` results are recorded in an issue-scoped handoff; tests use only local Supabase/fake or disabled AI.
- **Status:** todo
- **Issue:** [#115](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/115)

### T-60: Implement owner order queue

- **Depends on:** T-59, T-58, T-54, T-08, T-10
- **Owner role:** implementation
- **Requirements:** OWN-05.1, OWN-05.2, OWN-05.3, OWN-05.4, OWN-05.5, OWN-05.6, OWN-05.7, OWN-05.8, OWN-05.9, OWN-05.10 — [OWN-05](specs/stories/OWN-05-order-queue.md#acceptance-criteria).
- **Description:** Implement own-café queue reads and the four approved actions with [current-state and race enforcement](specs/INTEGRATION-SPEC.md#customer-pickup-and-order-boundary).
- **Work:** Add the queue and T-58-approved read/mutation handlers with strict server validation, same-origin/session/role/owner/workspace checks and session-bound RLS. Implement only the four transitions with atomic current café/order checks shared with Customer cancellation and ADM-02 suspension. Preserve snapshots, terminal orders, source failures and private reason rules; render only specified fields/filter/page/conflict states. No generic order rewrite, new audit requirement, review mutation or Customer/Admin surface. Reuse T-54 layout and shared guards; any authorized source timestamp follows the canonical contract.
- **File scope:** Proposed Order queue surface under `src/app/owner/`, T-58-approved owner queue Route Handlers and server-only queue transactions under `src/server/owner/`; additive order/state/policy migrations as required. Serialize shared order transactions with T-29/T-43; no tests/fixtures/mocks.
- **Prerequisite:** T-59 failing-first evidence, T-58 contracts on master and T-54 owner layout. Canonical local fixtures permit implementation independently of Customer creation and Admin UI; shared race behavior remains one canonical transaction contract.
- **Acceptance criteria:**
  - [ ] T-59 suite passes for all ten OWN-05 criteria, exact state/race outcomes and scoped private queue data without modifying purchase snapshots.
  - [ ] Exact `bun run verify` and relevant browser checks pass; the issue-scoped handoff records evidence and confirms testing-owned files are unchanged.
- **Status:** blocked
- **Issue:** [#116](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/116)

### T-61: Finalize sales aggregates and Prep Advisor decision contracts

- **Depends on:** T-55, T-58
- **Owner role:** spec
- **Requirements:** OWN-06, OWN-07 — [OWN-06](specs/stories/OWN-06-sales-dashboard.md#acceptance-criteria), [OWN-07](specs/stories/OWN-07-prep-advisor.md#acceptance-criteria); specification prerequisite only, no criterion ownership.
- **Description:** Complete OWN-06 sales and OWN-07 sufficiency/direction contracts within the existing [aggregate-only Prep schema](specs/INTEGRATION-SPEC.md#prep-advisor--own-07).
- **Work:** Resolve included order states, reporting period/ranges, business-date event and required source timestamp, daily/weekday metrics, top-item ranking/ties/limits, zero/missing-day handling and historical identity after menu rename/removal. Define the canonical source/read schema and Dashboard read boundary in shared specs. Resolve inclusive Prep period, nonempty-history sufficiency, more/less comparison/baseline, cross-weekday evidence meaning and normal directional-quality evaluation examples. Preserve Singapore time, immutable SGD snapshots, aggregate-only provider context, deterministic quoted numbers and all existing security/usage/cache/envelope limits. Any needed queue-source amendment belongs explicitly to OWN-05 with stable IDs and coverage updates; no forecast/confidence/extra call or new schema is implied.
- **File scope:** Existing OWN-06/OWN-07, canonical sales/Prep sections of `workflow/specs/TECHNICAL-SPEC.md` and `INTEGRATION-SPEC.md`; narrowly related OWN-05 source-event amendment only if required by the chosen sales contract; own spec handoff. No application or executable tests.
- **Prerequisite:** Human analytics/advice decisions, T-55 menu-history and T-58 queue/source contracts; security limits/prompt/output schema are available. Source/model/schema validation alone does not settle directional correctness. Coordinate the SYS-12 seed sufficiency contract without duplicating demo provisioning.
- **Acceptance criteria:**
  - [ ] Sales figures, top-item fallback and Prep sufficiency/direction can be independently evaluated with explicit normal/edge fixtures; no invented threshold or business window remains.
  - [ ] Reviewed contracts and all related criterion/coverage amendments are on master before dependent execution; spec/traceability outcomes and evaluation limits are recorded.
- **Status:** awaiting-decision
- **Issue:** [#117](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/117)

### T-62: Test owner sales Dashboard and Prep Advisor

- **Depends on:** T-61, T-08, T-10, T-12, T-14, T-16
- **Owner role:** testing
- **Requirements:** OWN-06.1, OWN-06.2, OWN-06.3, OWN-06.4, OWN-06.5, OWN-06.6, OWN-06.7; OWN-07.1, OWN-07.2, OWN-07.3, OWN-07.4, OWN-07.5, OWN-07.6, OWN-07.7, OWN-07.8, OWN-07.9, OWN-07.10, OWN-07.11, OWN-07.12, OWN-07.13, OWN-07.14 — [OWN-06](specs/stories/OWN-06-sales-dashboard.md#acceptance-criteria), [OWN-07](specs/stories/OWN-07-prep-advisor.md#acceptance-criteria).
- **Description:** Derive failing-first coverage for all OWN-06/OWN-07 criteria and [Prep evaluation cases](specs/stories/OWN-07-prep-advisor.md#evaluation-cases), consuming shared AI infrastructure.
- **Work:** Cover three scoped sales views, source-backed SGD amounts, Singapore date/weekday boundaries, renamed/removed-item history under T-61, no-café/no-sales/source failures and AI-independent top items. Cover strict Prep request/authorized aggregate-only provider context, exact quoted evidence, complete rejection, empty suggestions/source, sufficiency/direction fixtures, same-café/date/source/version cache, bounded manual refresh and failed-refresh preservation, disabled/limited/unavailable fallbacks, source 503, no domain writes, inert label injection, forged evidence and content-free audit. Exercise all 12 existing evaluation cases plus T-61-approved quality cases with fake captures; distinguish deterministic safety from quality. Reuse T-12/T-14/T-16 tests without reallocating their SYS/SEC criteria.
- **File scope:** Proposed `tests/{unit,integration,e2e}/owner-sales/` and `tests/{unit,integration,e2e}/prep-advisor/`, controlled local sales/clock/cache/failure fixtures and evaluation evidence; browser files only under respective `tests/e2e/` directories; database/route files declare node environment.
- **Prerequisite:** T-61 and all governing specs on master, plus shared access/session, admission, validated LLM operations and cache/audit repositories. Local sales fixtures permit failing-first tests before queue/menu UI integration; no demo-kit or live-provider prerequisite.
- **Acceptance criteria:**
  - [ ] Every one of the 21 listed story criteria has named failing-first coverage; all Prep adversarial cases map to guardrails and normal direction examples follow the approved comparison contract.
  - [ ] Exact `bun run verify` and relevant browser results plus fake-provider/evaluation limits are recorded in an issue-scoped handoff without live calls or hosted data.
- **Status:** blocked
- **Issue:** [#118](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/118)

### T-63: Implement owner sales Dashboard and Prep Advisor

- **Depends on:** T-62, T-61, T-54, T-57, T-60, T-08, T-10, T-12, T-14, T-16
- **Owner role:** implementation
- **Requirements:** OWN-06.1, OWN-06.2, OWN-06.3, OWN-06.4, OWN-06.5, OWN-06.6, OWN-06.7; OWN-07.1, OWN-07.2, OWN-07.3, OWN-07.4, OWN-07.5, OWN-07.6, OWN-07.7, OWN-07.8, OWN-07.9, OWN-07.10, OWN-07.11, OWN-07.12, OWN-07.13, OWN-07.14 — [OWN-06](specs/stories/OWN-06-sales-dashboard.md#acceptance-criteria), [OWN-07](specs/stories/OWN-07-prep-advisor.md#acceptance-criteria).
- **Description:** Implement Dashboard sales and the advisory Prep panel using the [shared AI HTTP envelope](specs/INTEGRATION-SPEC.md#ai-routes-and-result-envelope), existing server-only operations and [cache eligibility](specs/TECHNICAL-SPEC.md#cache-eligibility-and-scope).
- **Work:** Build authorized source aggregates and daily/top-item/weekday views exactly under T-61, preserving retained purchase amounts and Singapore time. Add `POST /api/ai/prep-advisor` with strict café/refresh selection, current owner/workspace/RLS source checks and the existing shared controls before provider/cache/fallback use. Construct only canonical aggregate inputs; reuse T-14 prompt/schema/operation and T-12/T-16 admission/cache/audit. Render AI-labelled item/weekday/more-less advice and server-quoted evidence as escaped text, empty advice, loading, explicit bounded refresh and typed safe top-items fallback; never apply a suggestion. Ordinary sales remain usable without AI, and unavailable source never becomes invented zero data. No duplicated provider transport, policy/storage or T-21/T-22 SEC ownership.
- **File scope:** Proposed owner Dashboard sales/Prep components under `src/app/owner/dashboard/`, `src/app/api/ai/prep-advisor/route.ts`, T-61-approved Dashboard read boundary and server-only sales/Prep source adapters under `src/server/owner/`; required additive aggregate-source migrations. Reuse `src/server/llm/` repositories without changing canonical policy/prompt/schema by inference; no tests/fixtures/mocks.
- **Prerequisite:** T-62 failing-first evidence, T-61 contracts on master, T-54 owner layout, T-57 menu-history and T-60 queue/source semantics plus shared T-08/T-10/T-12/T-14/T-16 infrastructure. T-25 provisioning and T-21/T-22 later cross-feature acceptance are not prerequisites.
- **Acceptance criteria:**
  - [ ] T-62 suite passes for all 21 criteria; ordinary sales and every authorized fallback remain useful; advice quotes only source numbers and changes no domain record.
  - [ ] Exact `bun run verify` and relevant browser tests pass; issue-scoped handoff records controlled fake-provider/evaluation evidence and any quality limitations.
- **Status:** blocked
- **Issue:** [#119](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/119)

### T-64: Finalize stretch owner boost contracts

- **Depends on:** None
- **Owner role:** spec
- **Requirements:** OWN-08 — [OWN-08](specs/stories/OWN-08-boost-request.md#acceptance-criteria); specification prerequisite only, no criterion ownership.
- **Description:** Complete the optional OWN-08 request boundary and identify the separate ADM-06 decision dependency, preserving [stretch-only scope](specs/PRODUCT-SPEC.md#mvp-and-stretch-scope).
- **Work:** Resolve request eligibility/lifecycle/duplicates/resubmission, fee amount/currency/source, active duration/start/end/expiry, badge display and any permitted catalogue effect, owner UI placement and exact read/mutation schemas. Specify technical boost data/RLS and integration owner boundary only from approved decisions. ADM-06 owns Admin decisions and activation consequences; its story/decision contract is a named prerequisite, not an owner self-approval permission. A missing Admin source file is reported without fabricating a link or assigning ADM criteria to this owner pair. Preserve fee-record-only/no-payment and ordinary Customer café/workspace eligibility; do not add MVP navigation or a new screen by inference.
- **File scope:** Existing OWN-08, owning optional boost sections of `workflow/specs/TECHNICAL-SPEC.md` and `INTEGRATION-SPEC.md`, own spec handoff. ADM-06 story authoring/coverage belongs to its Admin specification owner and is not included in this owner task.
- **Prerequisite:** Human boost term/placement decisions and an approved ADM-06 story/decision contract; PRODUCT-SPEC contains ADM-06 but no story file exists. Source owner request/no-payment boundaries already exist.
- **Acceptance criteria:**
  - [ ] Owner request, recorded fee and time-limited badge terms are exact, coordinate with ADM-06 and preserve existing Customer eligibility and MVP navigation.
  - [ ] Reviewed owner/shared/Admin dependency contracts are on master before execution; spec/traceability results and any missing ADM-06 prerequisite are reported.
- **Status:** awaiting-decision
- **Issue:** [#120](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/120)

### T-65: Test stretch owner boost requests

- **Depends on:** T-64, T-54, T-08, T-10
- **Owner role:** testing
- **Requirements:** OWN-08.1, OWN-08.2, OWN-08.3, OWN-08.4, OWN-08.5 — [OWN-08](specs/stories/OWN-08-boost-request.md#acceptance-criteria).
- **Description:** Derive failing-first tests for the optional [OWN-08 boundary](specs/stories/OWN-08-boost-request.md#requirements) after boost terms and ADM-06 coordination are specified.
- **Work:** Cover own/workspace-only requests, fee recorded without payment/provider action, no owner Admin decision authority, unchanged approval/suspension, ordinary Customer eligibility, badge expiry and shared session/role/foreign-record failures. Test lifecycle/duplicates/time/placement only as resolved by T-64 and the separate ADM-06 contract. Use local decision/time fixtures; do not implement Admin boost UI, allocate its criteria, change ranking without a governing amendment or require live payment.
- **File scope:** Proposed `tests/{unit,integration,e2e}/owner-boosts/`, testing-owned optional boost/clock/decision fixtures; browser files under `tests/e2e/owner-boosts/`; database/route files declare node environment.
- **Prerequisite:** T-64, OWN-08/shared and separate ADM-06 decision contracts on master; T-54 owner surface and T-08/T-10 access controls. Local Admin-decision fixtures may support failing-first tests; end-to-end decision integration additionally needs the separately owned Admin surface.
- **Acceptance criteria:**
  - [ ] All five listed OWN-08 criteria have named failing-first cases with explicit clock/scope/fee-only assertions; optional behavior does not enter MVP.
  - [ ] Exact `bun run verify` and relevant browser outcomes are recorded in the issue-scoped handoff with no payment, deployment or hosted execution.
- **Status:** blocked
- **Issue:** [#121](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/121)

### T-66: Implement stretch owner boost requests

- **Depends on:** T-65, T-64, T-54, T-08, T-10
- **Owner role:** implementation
- **Requirements:** OWN-08.1, OWN-08.2, OWN-08.3, OWN-08.4, OWN-08.5 — [OWN-08](specs/stories/OWN-08-boost-request.md#acceptance-criteria).
- **Description:** Implement the optional owner boost request using the approved OWN-08 technical/integration and ADM-06 coordination contracts.
- **Work:** Extend only the approved existing owner surface and add T-64-approved request/read handlers, validation and scoped boost persistence/RLS. Record the specified fee without charging it; apply only authorized lifecycle/time/badge behavior consistent with the separate Admin decision contract. Recheck current café/workspace eligibility for any public badge surface; a request cannot approve/un-suspend or confer Admin authority. Do not author Admin decisions/screens, payment logic, arbitrary catalogue ranking or new MVP navigation. Serialize shared café/profile/migration edits with T-54 and Admin boost ownership.
- **File scope:** Approved optional owner interaction under `src/app/owner/`, T-64-approved owner boost Route Handlers and server-only boost domain code under `src/server/owner/`, additive boost/RLS migrations; Customer badge projection only if the canonical approved contract assigns that owner surface. No tests/fixtures/mocks or Admin boost implementation.
- **Prerequisite:** T-65 failing-first evidence, T-64/OWN-08/shared/ADM-06 contracts on master and T-54 owner surface; separately owned Admin decision integration is required before claiming end-to-end boost activation. Missing Admin behavior is not implemented as an owner workaround.
- **Acceptance criteria:**
  - [ ] T-65 suite passes for all five OWN-08 criteria; recorded fee triggers no payment and expired/ineligible badges confer no visibility.
  - [ ] Exact `bun run verify` and relevant browser checks pass; the issue-scoped handoff identifies separately owned Admin integration evidence and leaves acceptance tests unchanged.
- **Status:** blocked
- **Issue:** [#122](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/122)

## Admin

The café eligibility pair shares café state and Admin-action audit data across
ADM-01/ADM-02. The manual moderation pair owns the audit screen for every Admin
action; the café pair owns creation of its decision/suspension entries and the
assertions for those stories, including their later display through that screen.
These two pairs can prepare independent local fixtures against their contracts;
café tests can be authored failing-first before the audit screen exists, while
T-29 completion explicitly depends on T-31 for café audit-display acceptance.
ADM-04 follows the
ADM-03 pair and reuses its confirmation route. Shared SYS/SEC criteria retain
their foundation owners; the Admin tasks own only the listed ADM criteria.
Missing story contracts below block execution, not criterion allocation.

### T-28: Test café applications and suspension

- **Depends on:** T-08, T-10, T-16, T-36, T-52, T-58
- **Owner role:** testing
- **Requirements:** ADM-01.1, ADM-01.2, ADM-01.3, ADM-01.4, ADM-01.5, ADM-01.6, ADM-01.7, ADM-01.8, ADM-01.9, ADM-01.10, ADM-01.11, ADM-01.12, ADM-01.13; ADM-02.1, ADM-02.2, ADM-02.3, ADM-02.4, ADM-02.5, ADM-02.6, ADM-02.7, ADM-02.8, ADM-02.9, ADM-02.10, ADM-02.11, ADM-02.12, ADM-02.13 — [applications criteria](specs/stories/ADM-01-cafe-applications.md#acceptance-criteria), [suspension criteria](specs/stories/ADM-02-cafe-suspension.md#acceptance-criteria).
- **Description:** Derive failing-first coverage for the [applications](specs/stories/ADM-01-cafe-applications.md#screens) and [approved-cafés](specs/stories/ADM-02-cafe-suspension.md#screens) screens, domain transitions and accountable workspace-scoped mutations.
- **Work:** Test both queues' ordering, ties, 20-row URL pagination, empty/conflict states, reason controls and private-data-free role gates. Cover approve/reject and suspend/un-suspend exact HTTP success bodies, strict shared HTTP/Ref validation, exact reason preservation/escaped display, session/role/workspace denials and indistinguishable missing/foreign targets. Exercise one-way decisions, owner resubmission, invalid/current-state and concurrent decisions/transitions, exactly-one atomic audit and rollback on audit failure, append-only retention and owner/Admin-only latest reasons. Assert customer RLS eligibility changes, unchanged application state, menus/hours/reviews and retained order records on suspension. Test automatic cancellation of every outstanding uncollected order, including accepted/ready, with the fixed CUS-04.5 reason; unchanged collected orders, no revival after un-suspension, private Admin-reason isolation and owner management access. The suspension/cancellation/audit transaction rolls back together on failure; this pair owns that mutation and its transaction assertions, while T-42/T-43 own Customer display/actions. Keep café audit-entry assertions here; T-30/T-31 own the common audit screen, not these criterion IDs. Use local main/kit fixtures and shared foundation session/RLS/audit harnesses.
- **File scope:** Proposed `tests/{unit,integration,e2e}/cafe-eligibility/` unit and local database/route cases, browser cases under `tests/e2e/cafe-eligibility/`, and synthetic café/application/order/audit fixtures; extend existing testing infrastructure without duplicating its owners. Tests may exercise `/admin/audit` after T-31 supplies it; testing owns all fixtures/mocks.
- **Prerequisite:** T-52/T-58/T-36 governing café/application/order contracts and T-08/T-10/T-16 foundations are on master; T-31 supplies the Admin audit surface. Contract-derived local order fixtures avoid a T-43 runtime dependency.
- **Acceptance criteria:**
  - [ ] Every listed ADM criterion has named deterministic tests and recorded failing-first evidence, including races, rollback, main/kit isolation and customer eligibility.
  - [ ] Café audit persistence and later T-31 display assertions preserve the criterion ownership above; unresolved contract/surface prerequisites are recorded.
  - [ ] `bun run verify` and relevant `bun run test:e2e` results are recorded with local Supabase only; the issue-scoped report follows the [handoff conventions](handoffs/README.md) and [template](templates/handoff.md).
- **Status:** done
- **Issue:** [#58](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/58)

### T-29: Implement café applications and suspension

- **Depends on:** T-28, T-08, T-10, T-16, T-31, T-52, T-58, T-36
- **Owner role:** implementation
- **Requirements:** ADM-01.1, ADM-01.2, ADM-01.3, ADM-01.4, ADM-01.5, ADM-01.6, ADM-01.7, ADM-01.8, ADM-01.9, ADM-01.10, ADM-01.11, ADM-01.12, ADM-01.13; ADM-02.1, ADM-02.2, ADM-02.3, ADM-02.4, ADM-02.5, ADM-02.6, ADM-02.7, ADM-02.8, ADM-02.9, ADM-02.10, ADM-02.11, ADM-02.12, ADM-02.13 — [applications criteria](specs/stories/ADM-01-cafe-applications.md#acceptance-criteria), [suspension criteria](specs/stories/ADM-02-cafe-suspension.md#acceptance-criteria).
- **Description:** Implement workspace-scoped [application decisions](specs/stories/ADM-01-cafe-applications.md#requirements) and [reversible suspension](specs/stories/ADM-02-cafe-suspension.md#requirements), reusing the [shared HTTP boundary](specs/INTEGRATION-SPEC.md#authorization-and-transport) and [RLS contracts](specs/TECHNICAL-SPEC.md#rls-and-database-exposure).
- **Work:** Add `/admin/applications` and `/admin/cafes` with specified ordering, pagination, reason/confirmation, empty/conflict feedback and Suspense-wrapped role gates. Add `POST /api/admin/cafes/{cafeId}/decision` and `/suspension` with server-side Zod, session/role/workspace/current-state and exact-origin checks, strict bodies and exact responses. Apply one-way approval/rejection and independent approved-café suspension atomically with one T-16 Admin-action entry, rolling back both on failure. Preserve submitted reasons, restrict latest-reason reads, update customer RLS eligibility and retain order records, collected purchases and owner management access. This task owns the suspension-triggered cancellation writer/storage: automatically cancel every outstanding uncollected order under CUS-04.5, including accepted/ready, and persist the fixed public reason separately from the private Admin reason. Commit suspension, cancellations and one audit entry together; un-suspension never revives cancellations. T-43 consumes these effects rather than adding another suspension writer. Consume owner submission/resubmission and management contracts; do not author their screens or customer order lifecycles. T-31 owns audit display; this pair supplies its café entries and integration evidence without duplicating the screen.
- **File scope:** Proposed `src/app/admin/applications/`, `src/app/admin/cafes/`, `src/app/api/admin/cafes/[cafeId]/decision/route.ts`, `src/app/api/admin/cafes/[cafeId]/suspension/route.ts`, server-only café operations under `src/server/` and additive migrations/policies, including suspension cancellation state/reason storage consumed by T-43. Serialize order schema edits with T-43; do not implement Customer order screens. Reuse foundation gates/repositories; serialize shared Admin layout and migration edits with T-31. No tests/fixtures/mocks or owner/customer screen authoring.
- **Prerequisite:** The OWN-01/OWN-02/OWN-05 and T-36 order contracts named in T-28 are on master; T-28 failing-first evidence is required. T-16 supplies eligibility storage; T-31 supplies Admin audit storage and the audit screen needed for café audit-display acceptance. Canonical order fixtures permit suspension evidence before T-43; T-29 does not depend on Customer order creation/screens. Missing contracts are not implementation choices. The owner prerequisite tasks are T-52/T-58 and Customer order reconciliation is T-36; T-31 still owns Admin audit storage/display and local fixtures avoid any T-43 cycle.
- **Acceptance criteria:**
  - [ ] T-28's owned state, HTTP, reason, access, concurrency, rollback and preservation cases pass; audit-display acceptance is evidenced when T-31 is available.
  - [ ] No self-approval, cross-workspace access, un-approval, Admin rejection reversal or generic order/menu-edit permission is added; suspension cancellation is only the defined system consequence.
  - [ ] `bun run verify` and relevant `bun run test:e2e` pass locally; the issue-scoped [handoff](templates/handoff.md) records actual evidence and remaining external surfaces.
- **Status:** done
- **Issue:** [#59](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/59)

### T-30: Test moderation queue and Admin audit log

- **Depends on:** T-08, T-10, T-16
- **Owner role:** testing
- **Requirements:** ADM-03.1, ADM-03.2, ADM-03.3, ADM-03.4, ADM-03.5, ADM-03.6, ADM-03.7, ADM-03.8, ADM-03.9, ADM-03.10, ADM-03.11, ADM-03.12, ADM-03.13, ADM-03.14, ADM-03.15, ADM-03.16, ADM-03.17, ADM-03.18 — [ADM-03 criteria](specs/stories/ADM-03-review-moderation.md#acceptance-criteria).
- **Description:** Derive failing-first tests for [manual moderation and audit screens](specs/stories/ADM-03-review-moderation.md#screens), [permissions](specs/stories/ADM-03-review-moderation.md#permissions) and the ordinary moderation route, independently of AI triage.
- **Work:** Test initial pending/kept customer RLS visibility and hidden exclusion without inventing rating formulas. Cover Pending/Kept/Hidden tabs, security-configured page size, URL state, ordering/ties, suspended-café reviews, Singapore timestamps, row fields, escaped content and the fixed quick-pick reasons linked from [ADM-04](specs/stories/ADM-04-moderation-assistant.md#user-experience). Test the full Keep/Hide/Restore transition matrix and exact responses, reason bounds/preservation, strict HTTP/origin/Ref/action-only bodies, session/role/workspace denials, stale/concurrent actions and audit rollback. Assert immutable text/rating, denied customer edit/delete and unchanged reviews on failures. Test workspace audit order, 50-row URL pagination/action filters, seven action types, exact columns/target labels, scoped Admin-email access, excluded review text/AI events, append-only history and retention. Use contract-derived local café-action audit fixtures without requiring café mutations to be implemented or claiming their ADM criteria.
- **File scope:** Proposed `tests/{unit,integration,e2e}/moderation/` and `tests/{unit,integration,e2e}/audit/` unit and local database/route cases, with browser cases under `tests/e2e/moderation/` and `tests/e2e/audit/`; testing-owned synthetic review/café/Admin audit and retention fixtures. Extend shared foundation harnesses.
- **Prerequisite:** The [CUS-05 review contract](specs/stories/CUS-05-review-order.md#requirements) and [Customer review boundary](specs/INTEGRATION-SPEC.md#customer-review-boundary) define rating/text limits, exact text preservation, collected-order eligibility, strict creation/read schemas, duplicate/conflict outcomes and initial pending state while preserving ADM-03 immutability. Contract-derived local review fixtures suffice for this pair; T-45 Customer review creation/screens are not a prerequisite. CUS-01/CUS-02 rating formulas/customer display remain outside this pair, with its customer-read assertions bounded by RLS/SYS-05.3. T-08/T-10 supply workspace/session/streaming gates, T-16 eligibility and AI cleanup repositories. ADM-04 already supplies the fixed quick-pick text; AI execution is not a dependency.
- **Acceptance criteria:**
  - [ ] All 18 ADM-03 criteria have deterministic named failing-first cases, including transition races, atomic audit, workspace isolation, customer immutability and retention.
  - [ ] Common audit-screen tests cover every action without taking café criterion ownership; no tests infer review field limits or rating formulas.
  - [ ] `bun run verify` and relevant `bun run test:e2e` results and the issue-scoped [handoff](templates/handoff.md) are recorded with local data only.
- **Status:** done
- **Issue:** [#60](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/60)

### T-31: Implement moderation queue and Admin audit log

- **Depends on:** T-30, T-08, T-10, T-16
- **Owner role:** implementation
- **Requirements:** ADM-03.1, ADM-03.2, ADM-03.3, ADM-03.4, ADM-03.5, ADM-03.6, ADM-03.7, ADM-03.8, ADM-03.9, ADM-03.10, ADM-03.11, ADM-03.12, ADM-03.13, ADM-03.14, ADM-03.15, ADM-03.16, ADM-03.17, ADM-03.18 — [ADM-03 criteria](specs/stories/ADM-03-review-moderation.md#acceptance-criteria).
- **Description:** Implement [manual moderation](specs/stories/ADM-03-review-moderation.md#requirements) and the shared read-only [Admin audit screen](specs/stories/ADM-03-review-moderation.md#screens) using foundation guards and audit persistence.
- **Work:** Add `/admin/moderation` and `/admin/audit` with the specified tabs/filters, ordering/ties, URL pagination, Singapore display, escaped row fields, empty/conflict states and streaming role gates. Implement `POST /api/admin/reviews/{reviewId}/moderation` with strict action/reason-only validation, same-origin/session/workspace/current-state checks and exact shared errors/success bodies. Apply only pending→kept, pending/kept→hidden and hidden→kept, atomically with one append-only Admin-action entry; failure changes neither. Own the append-only Admin audit storage that T-29 and T-22 reuse (SYS-10.3's Admin audit entry). Provide per-review reason controls with the fixed ADM-04 app-text quick picks, not model-authored reasons. Enforce immutable review text/rating, denied customer edit/delete and customer RLS visibility. Render all seven Admin action types, including T-29's café entries when available, with scoped acting-Admin email and no review text or AI-use events. Keep audit history outside AI cleanup; author no review creation, rating formulas or AI triage.
- **File scope:** Proposed `src/app/admin/moderation/`, `src/app/admin/audit/`, `src/app/api/admin/reviews/[reviewId]/moderation/route.ts`, server-only review/audit queries and transactional operations under `src/server/`, additive review/policy migrations. Add the Admin audit storage here; serialize shared layout/migrations with T-29. No tests/fixtures/mocks.
- **Prerequisite:** T-30 failing-first evidence and T-16 eligibility repositories are required. The [CUS-05 review contract](specs/stories/CUS-05-review-order.md#requirements) and [Customer review boundary](specs/INTEGRATION-SPEC.md#customer-review-boundary) define the review field/creation constraints, initial pending state and immutability used by this pair. T-08/T-10/T-16 provide shared access, streaming and eligibility infrastructure. Local review fixtures allow this task before T-45, avoiding a cycle through T-29/T-43. T-29 café operations may be integrated later; the common audit display is independently implementable from the ADM-01/ADM-02 audit contracts and local fixtures.
- **Acceptance criteria:**
  - [ ] T-30's 18-criterion suite passes, including immutable reviews, exact transitions/errors, one atomic audit, role/workspace denial and all audit display/retention cases.
  - [ ] T-28's café audit-display cases can consume this screen without duplicated screen or criterion ownership; T-32/T-33 can reuse ordinary per-review confirmation.
  - [ ] `bun run verify` and relevant `bun run test:e2e` pass locally; the issue-scoped [handoff](templates/handoff.md) records actual checks without hosted execution.
- **Status:** done
- **Issue:** [#61](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/61)

### T-32: Test Moderation Assistant

- **Depends on:** T-30, T-31, T-08, T-10, T-12, T-14, T-16, T-37
- **Owner role:** testing
- **Requirements:** ADM-04.1, ADM-04.2, ADM-04.3, ADM-04.4, ADM-04.5, ADM-04.6, ADM-04.7, ADM-04.8, ADM-04.9, ADM-04.10, ADM-04.11, ADM-04.12, ADM-04.13, ADM-04.14, ADM-04.15, ADM-04.16, ADM-04.17, ADM-04.18 — [ADM-04 criteria](specs/stories/ADM-04-moderation-assistant.md#acceptance-criteria).
- **Description:** Derive failing-first route/browser tests and evaluation evidence for the advisory [Moderation Assistant experience](specs/stories/ADM-04-moderation-assistant.md#user-experience), consuming the [fixed prompt/schema](specs/INTEGRATION-SPEC.md#moderation-assistant--adm-04) and [security evaluations](specs/AI-SECURITY-SPEC.md#security-evaluation-plan).
- **Work:** Cover the Pending-only button, empty disablement/loading, exactly one current-page request, configured batch/action/run/call bounds and no automatic pagination/splitting/retry. Test complete five-label results, inert AI-suggestion rendering/highlights without selection/mutation, fixed editable app-text reasons and no copying of model reasons. Exercise ordinary per-review confirmation, invalid reasons, forged-label fields, stale-state conflict/removal and remaining-suggestion lifetime through one action/reload/page change. Cover main/kit session/role/workspace/origin/strict-body/source denials before admission; empty/duplicate/oversized/no-longer-pending selection is invalid, never no_source_data. Use fake captures/results for minimal encoded review-only context, injection containment, whole-result rejection, no cache/persistence, disabled/usage_limited/unavailable fallbacks, source-unavailable 503, bounded failures and content-free internal AI audit distinct from Admin audit. Reuse shared limit/provider/audit tests without claiming their SYS/SEC criteria. Record ADM-04's human-labelled evaluation cases and quality assessment without a live call or invented accuracy target.
- **File scope:** Proposed `tests/{unit,integration,e2e}/moderation-assistant/` route cases and browser cases under `tests/e2e/moderation-assistant/`, synthetic adversarial review/provider responses, controlled limit/clock/storage-fault fixtures and human-labelled evaluation records owned by testing. Extend T-30's manual-flow fixtures; do not read implementation tasks as a test-design source.
- **Prerequisite:** T-37/CUS-05 review fields and collection-source contracts and completed T-30/T-31 moderation/audit surfaces, with T-08/T-10/T-12/T-14/T-16 foundations. Contract-derived local reviews suffice without Customer/owner runtime screens, kit provisioning or live AI.
- **Acceptance criteria:**
  - [ ] Every ADM-04 criterion has deterministic named failing-first coverage; ADM-04-E01–E13 evaluation evidence distinguishes boundary assertions from classification-quality assessment.
  - [ ] No unauthorized fallback, live provider call, automatic moderation, persisted suggestion, model-authored Admin reason or duplicate SYS/SEC ownership is introduced.
  - [ ] `bun run verify` and relevant `bun run test:e2e` results are recorded using local Supabase/fake AI in the issue-scoped [handoff](templates/handoff.md).
- **Status:** todo
- **Issue:** [#62](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/62)

### T-33: Implement Moderation Assistant

- **Depends on:** T-32, T-30, T-31, T-08, T-10, T-12, T-14, T-16, T-37
- **Owner role:** implementation
- **Requirements:** ADM-04.1, ADM-04.2, ADM-04.3, ADM-04.4, ADM-04.5, ADM-04.6, ADM-04.7, ADM-04.8, ADM-04.9, ADM-04.10, ADM-04.11, ADM-04.12, ADM-04.13, ADM-04.14, ADM-04.15, ADM-04.16, ADM-04.17, ADM-04.18 — [ADM-04 criteria](specs/stories/ADM-04-moderation-assistant.md#acceptance-criteria).
- **Description:** Integrate advisory [review triage](specs/stories/ADM-04-moderation-assistant.md#requirements) into T-31's manual queue through the existing [AI HTTP envelope](specs/INTEGRATION-SPEC.md#ai-routes-and-result-envelope), shared LLM operation and [guardrails](specs/stories/ADM-04-moderation-assistant.md#guardrails).
- **Work:** Add `POST /api/ai/moderation` with strict JSON/Ref/session/role/origin/workspace and currently pending selection checks before admission. Read authoritative review references/text under RLS and call only T-14's server-only moderation operation with T-12 admission and T-16 content-free accounting. Reuse the exact prompt/schema and unchanged envelopes; reject the whole invalid result, honor disable/limit/failure precedence and never cache suggestions. Add the Pending-only current-page button/loading, escaped AI labels/reasons and advisory highlights, typed safe fallback explanations and queue-changed/reload handling. Keep suggestions transient with specified action/page lifetime. Reuse T-31's fixed editable quick picks and ordinary action/reason-only confirmation; never copy model reasons, preselect/submit actions or provide apply-all. Preserve immutable text/rating and independent stale/forged confirmation checks and separate Admin audit. No new provider transport, prompts, quotas, runtime AI settings or automatic moderation.
- **File scope:** Proposed `src/app/api/ai/moderation/route.ts` and server-only authorized moderation-source adapter under `src/server/`; extend existing T-31 `src/app/admin/moderation/` with a browser interaction boundary. Reuse T-14 `src/server/llm/` operation and T-12/T-16 repositories; serialize shared queue/repository edits. No tests/fixtures/mocks or audit-screen reimplementation.
- **Prerequisite:** The same T-37/CUS-05 source contract and T-30/T-31 queue/confirmation prerequisites as T-32 are met; T-32 failing-first evidence and the shared T-08/T-10/T-12/T-14/T-16 controls are required. No dependence on T-21/T-22's later cross-feature security integration; those tasks retain their separate SEC ownership. T-37 explicitly supplies the review-source dependency and inherits T-58 owner collection-state ownership; owner runtime UI remains outside this Admin pair.
- **Acceptance criteria:**
  - [ ] T-32's full ADM-04 suite passes, including main/kit boundaries, transient complete results, injection/forged/stale advice, exact fallback/error behavior and explicit per-review control.
  - [ ] AI-use events remain content-free/internal and never become Admin-action audit entries; ordinary manual moderation remains usable on every authorized fallback.
  - [ ] `bun run verify` and relevant `bun run test:e2e` pass with local Supabase/fake AI; the issue-scoped [handoff](templates/handoff.md) reports checks and evaluation limits without live calls or deployment.
- **Status:** todo
- **Issue:** [#63](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/63)
