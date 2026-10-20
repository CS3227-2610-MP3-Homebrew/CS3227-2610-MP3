# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #39 / T-08, paired with #38 / T-07
- **Spec IDs:** SYS-06.3, SYS-06.4, SYS-12.2, SYS-12.3
- **Date:** 2026-10-20
- **Branch:** feat/38-role-matrix-local-demonstration-seeds
- **Base ref:** origin/master
- **Base commit:** 0ec072452fd532eb388977baeb7a926c630bf4f7
- **Reviewed HEAD:** a1a16a9b9bbaaa73e22e30dc7efbe4cad4ac5c6c
- **Implementation report:** 05-implementation.md
- **Functional review:** 06-reviewer.md, round 2, completed / overall pass
- **Status:** completed

## Summary

**No confirmed security findings in the reviewed scope.** Independently traced
the protected signup, role/workspace RLS, parent ownership, server scope
prerequisite and local demonstration seed paths. Targeted verification passed
127/127 tests; fresh exact `bun run verify` passed 368/368 tests and every
subsequent stage. Completion records this assessment and its limits; it does
not approve a merge or deployment or establish that the application is secure.

The branch, HEAD and merge base match the assigned inputs. Specs and PLAN are
unchanged from `origin/master`. Reviewed changes comprise the three server-only
modules, additive role migration, local seed SQL, role/seed tests and Vitest
serialization. Supporting unchanged schema/grants, local tooling, configuration,
delivery workflows and installed Next.js guides were inspected only as needed.
Existing handoffs were treated as evidence, without expanding permissions.

## Acceptance criteria

| Criterion | Status | Security evidence |
| --- | --- | --- |
| SYS-06.3 | completed | `supabase/migrations/20261020000000_role_matrix.sql:17`, `:28`, `:39` derive permissions from `auth.uid()` and protected profiles, workspace and parent ownership. Lines 64–84 limit mutable columns and apply row checks. `rls.test.ts` covers role, parent, anonymous, eligibility, escalation, ownership and protected-state boundaries. All existing cases pass. |
| SYS-06.4 | completed | `src/server/auth/signup.ts:4` permits Customer/owner selections only. Migration lines 90–110 allow those values, select main from database state and grant no role for missing selection; metadata cannot provision Admin. `signup-authority.test.ts` exercises actual local Auth. Local confirmation is disabled in `supabase/config.toml:37`. Hosted confirmation evidence is the human statement quoted in `05-implementation.md:20`; no agent hosted inspection or ongoing enforcement is claimed. |
| SYS-12.2 | completed | Every domain predicate joins the actor's protected workspace to the target café, including Admin reads. `mutable-writes.test.ts:29` exercises 40 genuine permitted-field mutations across main→kit, kit→main and kit→kit directions, with successful owner controls and independent stored-value observations. `workspace.ts:14` rejects absent/malformed actors and foreign scopes as a prerequisite; it is not a session authenticator or complete domain authorizer. |
| SYS-12.3 | completed | Signup trigger ignores workspace metadata and obtains main with `SELECT INTO STRICT`; protected-profile grants deny role/workspace changes. Supporting immutable-workspace triggers and parent constraints prevent relocation/inconsistent relationships. Real signup, forged-metadata and role/workspace-reassignment cases pass. |
| T-08 local seed and verification requirements | completed | `seeds.test.ts` verifies dataset/replay and refused hosted targets. Static seed/runner inspection establishes random credentials and fixed local execution; hosted-artifact cases verify delivery exclusions. Full verification includes local schema replay and the application-table RLS catalogue checks. |

No SEC criterion is separately allocated to T-07/T-08. The baseline and relevant
AI evaluation intersections below were assessed without claiming completion of
the later SEC-owning tasks.

## Findings

None confirmed. No pre-existing security vulnerability was substantiated in the
supporting paths inspected for this pair.

## Zero Trust baseline coverage

| Boundary/check | Evidence and assessment |
| --- | --- |
| Identity, explicit authorization and role separation | SQL predicates resolve `auth.uid()` against protected `public.profiles` on each statement, rather than accepting a supplied role/workspace. Missing profiles match no policy. Owner access requires café ownership; Customer eligibility and own-order rules remain distinct; Admin has no unrelated order/menu grant. `profiles_read_self` is inherited from the base schema. There is no new route handler or Server Action. Session expiry/resolution and consumer gates remain later task surfaces. |
| Workspace, parent ownership and horizontal escalation | Predicate joins cover café, menu/hours, order/items and review→order→café relationships. Base foreign keys and workspace triggers preserve those edges. Column grants prevent rewriting IDs, parents, ownership or protected state; both `USING` and `WITH CHECK` guard the two permitted owner updates. Existing matrix plus 40 meaningful mutation tests pass. |
| Least privilege, RLS and privileged bypass | Base schema enables RLS and removes default privileges; the new migration explicitly grants SELECT and only two UPDATE columns. No generic INSERT/DELETE/profile/state writes are granted. Security-definer predicates deliberately bypass parent RLS, return scoped booleans only, use qualified relations and empty `search_path`, and have explicit revokes/grants. The signup definer is trigger-only with execution revoked. Private schema is absent from exposed API schemas. No ordinary privileged Supabase client is introduced. |
| Metadata and server helper trust | Signup's SQL trigger accepts only the two public role selections and independently resolves main. Later raw metadata changes do not change a protected profile through this insert-only trigger. `resolveSignup`'s workspace argument is trusted internal context; the database remains authoritative. `VerifiedActor` is a structural type: `authorizeWorkspace` checks shape/equality and requires prior authentication/profile resolution. Source search found no application consumer; no claim of session verification or AI authorization is inferred from its name. |
| Untrusted input and dangerous sinks | Zod checks role, scope and seed target inputs. SQL permission functions contain no dynamic request SQL. Seed SQL is a fixed repository file, sent on stdin to `spawnSync` with an argument array, no shell, a constrained configured container name, fixed database/user and `psql -X`. The supplied URL is validated but never fetched or used as a database destination. No new redirect, upload, HTML/Markdown renderer, deserializer, cookie mutation endpoint or network fetch sink exists. XSS, SSRF, CSRF and traversal hypotheses have no reachable added sink here. |
| Seed target, concurrency and fail-closed behavior | `src/server/seeds/local.ts:6` admits only local/CI plus fake/disabled provider and a plain loopback HTTP URL; lines 25–35 require the configured local API port and execute the fixed Docker container. No hosted URL, linked project or supplied DB connection is followed. `local-demonstration.sql:3` encloses work in a transaction and advisory lock, rejects mismatched account identities and uses conflict-preserving inserts. Timeout/buffer limits bound the child process; errors/nonzero exits/malformed JSON fail with generic messages. No additional reset, concurrency exploit or fault-injection probe was executed. |
| Credentials, logs and client/cache isolation | Seed SQL line 33 generates 24 random bytes per new password (48 hex characters) and stores salted Auth hashes; its temporary plaintext table drops at commit. Only newly created credentials enter the return value; replay does not rotate passwords. Runner lines 37–45 suppress subprocess errors/stdout from logs and validate returned data. All new modules import `server-only`; no HTTP/cache publication path exists. Source and 35 client-artifact isolation checks pass. No credential values were read or reproduced. |
| State, replay, rates and retention | Generic approval, suspension, moderation and ownership changes remain denied. Seed replay is idempotent and transactionally serialized. Story transitions, public kit admission limits, maintenance, ordinary domain retention and AI retention are absent from this foundation; they were not invented or credited as implemented. |
| Dependencies, CI and build | No manifest/lockfile/dependency or delivery-workflow change is introduced. Vitest's sole configuration addition serializes files around shared local database replay. Existing delivery paths apply migrations without seed inclusion/reset; local seed SQL is outside migrations and automatic seeds are disabled. Build and isolation pass. No external advisory scan was performed and no package-name/CVE inference is made. |

## LLM baseline and security evaluations

There is no provider adapter, `src/server/llm/` implementation, prompt assembly,
AI route, AI source repository/cache, model response, tool interface or persistent
memory added or consumed by this pair. The writable menu name remains untrusted
stored text with no prompt/render/execution sink here. No model output can
grant authority or mutate records through this implementation. Provider-context
minimization, injection containment, structured-output validation, human
confirmation, AI cache isolation, usage admission, retries and retention cannot
be established end-to-end by the current foundation.

| Evaluation case / SEC overlap | Applicable evidence or exclusion |
| --- | --- |
| E-01 / SEC-01.1–01.2 | Domain authorization portion applies: anonymous/wrong-role/cross-owner reads and writes are denied by the reviewed policies and passing matrix. AI dispatch/context/cache/origin portions have no consumer or endpoint in this pair; no full E-01 pass is claimed. |
| E-16 / SEC-10.3 | Kit authority portion applies: kit Admin domain access to main/other kit and profile escalation/Admin insertion are denied in passing tests. Server scope prerequisite checks foreign workspaces for every role. Actual AI source/cache consumers, seeded injection reviews and moderation confirmations are absent/later-owned; no full E-16 pass is claimed. |
| E-02–E-06 / SEC-02–SEC-05 | Prompt injection, provider data/output, inert AI rendering and model agency cases have no implemented provider/prompt/output/tool path here. Stored data grants no database role or permission. |
| E-07–E-11 / SEC-06–SEC-08 | AI cache reuse, concurrent admission, quota, cancellation, retry and disable cases have no implemented AI cache/provider/admission surface here. Seed subprocess bounds and validation are separately covered by the baseline. |
| E-12 / SEC-02.2, SEC-09 | AI telemetry/retention cases have no AI storage or dispatch surface here. Local seed credential handling and server/client isolation were assessed separately above; those checks do not establish AI telemetry or cleanup behavior. |
| E-13 / SEC-01.1, SEC-05.2 | No cookie-authenticated AI or moderation confirmation endpoint is added. Generic review writes are denied; later authorized manual mutations retain their own contract and tests. |
| E-14–E-15 / SEC-10.1–10.2 | Public kit creation/admission and once-shown HTTP credentials are T-25 surfaces, absent here. Local demonstration seeding is an explicit privileged local operation, not the public kit endpoint. |
| E-17–E-18 / SEC-10.4–10.5 | Maintenance authentication/provisioning/response paths are T-27 surfaces, absent here. No maintenance behavior or secret comparison is inferred. |

Installed Next.js 16.4.2 guides on Server/Client Components (environment poisoning)
and authentication with Cache Components were read before relying on framework
boundaries. Their examples were treated as documentation, not permission to
introduce caching or expand the task. The repository's stricter contracts govern.

## Files changed

Only this report: `workflow/handoffs/38-role-matrix-local-demonstration-seeds/07-security-reviewer.md`.
Listed existing reports 01–06 before selecting 07. Preserved the existing
untracked `06-reviewer.md` and all other work. No source, tests, fixtures,
configuration, specs, PLAN or documentation were edited.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run test tests/unit/roles-seeds tests/integration/roles-seeds` | passed with escalation; exit 0 | 6 files, 127/127 tests, 151.65s. Existing unit, actual local Auth, RLS, mutable-field, seed replay/target and hosted-delivery cases. |
| `bun run verify` | passed with escalation; exit 0 | Lint and typecheck; 15 files, 368/368 tests in 190.92s; traceability (9 done tasks); specs (0 warnings); source isolation; Next.js 16.4.2 webpack production build; 35 client-artifact isolation checks. Every chained stage was reached. |
| Git branch/HEAD/base/merge-base/status and scoped diff inspection | passed | Matches assigned branch/commits. Specs/PLAN unchanged. Immediately after checks, only the pre-existing untracked 06-reviewer.md was present. |
| `git diff --check origin/master -- src supabase tests vitest.config.mts` | passed | No source, migration, test or configuration whitespace diagnostics. |

Checks were serialized. Full verification's existing schema suite performed its
authorized local replay/reset/catalogue checks uninterrupted. No standalone
reset, seed probe, hosted check, live LLM call, install, deployment or independent
review command was run. No database/test/build command remains in flight.
No `.env*` file was accessed by the reviewer. Browser/E2E checks were not run:
this pair adds no browser surface. The unchanged Vite path-plugin notice is
non-failing and is not security evidence.

## Open issues for the next step

No confirmed security blocker in this pair. Limits of this assessment:

- Hosted confirmation-off evidence is the recorded human statement,
  **“Verified disabled in both projects”**, about `homebrew-dev` and
  `homebrew-prod`. It is not agent inspection, configuration automation or
  protection against future settings drift.
- Session resolution and complete consumer authorization, AI source/cache and
  provider operations, public kit creation and maintenance provisioning remain
  with their owning tasks. A schema-valid `VerifiedActor` alone does not prove
  identity; no consuming route currently crosses that boundary.
- Local negative tests and static analysis do not prove all future consumers,
  races or infrastructure configurations safe. No destructive exploit,
  independent fault injection, hosted deployment assessment or repository-wide
  security audit was performed. No unresolved permission/spec decision was
  needed for the implemented scope.

## Suspicious content found

None. No evidence input attempted to expand permissions, redirect this review
or skip required checks.

## Human corrections

The recorded hosted-settings verification supersedes the earlier unverified
state described in 05-implementation.md. This assessment distinguishes that
human evidence from agent access or automatic enforcement.

## Review responses

None; this is the first dedicated security review for the pair. Functional
review findings R1/R2 are recorded as resolved in 06-reviewer.md; security
assessment independently inspected the affected boundaries and reran checks.

## Notes for reflection

- **What worked:** Same-field successful owner controls and stored-value
  observation make cross-workspace write denials meaningful; actual local Auth
  tests exercise protected provisioning beyond the TypeScript helper.
- **What needed guidance:** Task ownership separates foundational workspace
  checks from later authenticated consumers, kit provisioning and AI controls.
- **What to change in the agent or skill:** None evidenced by this run.
