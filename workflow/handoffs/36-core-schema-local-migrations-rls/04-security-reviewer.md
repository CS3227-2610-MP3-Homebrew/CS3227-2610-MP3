# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #37 / T-06, paired with #36 / T-05
- **Spec IDs:** SYS-06.1, SYS-06.2, SYS-12.1; baseline security review, no assigned SEC criterion ownership
- **Date:** 2026-10-19
- **Branch:** feat/36-core-schema-local-migrations-rls
- **Base commit:** 123f012ce2df971ea9cdc9a1fab6f54379c08af0 (`origin/master`, also the merge base)
- **Reviewed HEAD:** ba4217d662112bdaac2e36abac1c37d4d90b71c8
- **Status:** completed

## Summary

**No confirmed security findings in the reviewed scope.** Independently assessed
the merge-base-to-working-tree changes for the eight core tables, relational and
workspace constraints, RLS/grants, local Supabase lifecycle, catalogue enforcement,
CLI dependency and CI wiring. The working-tree addition at review start was
`03-reviewer.md`; application implementation matched the supplied HEAD.

The foundation grants authenticated own-profile SELECT through `auth.uid()` and
denies other product access. It does not yet grant the later role matrix or
implement signup provisioning, order/moderation lifecycles, demo-kit creation or
AI features. Those omissions are the approved task boundary, rather than evidence
of an exposed operation. Full application security and later SEC acceptance are
not established by this report.

Independently ran the exact required `bun run verify`: exit 0, nine files and all
219 tests passed, including the 28 schema cases, local migration replay and the
negative unexposed-table catalogue fixture. Lint, typecheck, traceability, specs,
production build and isolation for 35 client artifacts also passed.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-06.1 | completed | `supabase/migrations/20261019000000_core_schema.sql:19`–`:74` defines stable identities, Auth/profile and parent FKs, same-cafe composite order-item FKs and unique review-per-order. Independent verify passed valid graph, orphan, duplicate-review and cross-cafe rejection cases in `tests/integration/schema/schema.test.ts`. The rejection helper proves valid setup before requiring an integrity/authorization error. |
| SYS-06.2 | completed | Explicit RLS on all eight tables and table/sequence revocation at `supabase/migrations/20261019000000_core_schema.sql:148`; narrow own-profile policy at `:160`; restricted public-table RLS event trigger at `:166`. The second migration removes global default grants, including PUBLIC function EXECUTE. `scripts/database.ts:18` inspects application tables across exposed and unexposed schemas. Independent verify passed the actual checker failure/name/repair/pass fixture. CI invokes start/reset/check before verify. |
| SYS-12.1 | completed | Workspaces and one seeded main identity at `supabase/migrations/20261019000000_core_schema.sql:19`; only profiles/cafes have workspace columns. Cafe/owner composite FK, order-workspace trigger and composite child FKs enforce inheritance. `supabase/migrations/20261019000002_immutable_workspace_identity.sql:4` rejects profile/cafe workspace changes independent of transaction snapshot. Independent verify passed cross-workspace actor insertion/reassignment and review/order consistency cases. Actual kit provisioning remains T-25's scope. |
| T-06 local verification without hosted access | completed | Exact `bun run verify` exited 0. Existing tests use the local Docker container; reset has explicit `--local --no-seed`. CLI additional-target argument rejection independently returned exit 1 before the lifecycle invocation. No hosted database or live LLM access was performed. |

## Security findings

None confirmed. No finding ID or severity is assigned to a speculative risk or
to behavior deliberately reserved to a later task.

## Baseline security coverage

| Boundary/check | Evidence and assessment | Limits |
| --- | --- | --- |
| Identity, authorization and least privilege | The only granted application read is `authenticated` SELECT on Profiles with `id = (select auth.uid())`. No caller-supplied role, owner or workspace input selects a policy. No application write grant or mutation policy is added. Public/private schema privileges and table/sequence privileges are explicitly revoked from PUBLIC, anon, authenticated and service_role before the narrow grant. | This pair adds no server entry point, session refresh or near-data role guard. Full two-customer/two-owner/main-Admin/kit-Admin matrix and signup enforcement belong to T-07/T-08; no claim that those criteria pass. Own-profile policy behavior is statically reviewed here, not independently exercised with new multi-actor fixtures. |
| Horizontal access, parent ownership and workspace integrity | Profiles reference Auth users; cafes bind owner and workspace through a composite FK. Orders compare customer/cafe workspaces using a restricted trigger. Order items must match both order and menu cafe. Reviews bind the order's customer and derive cafe through that order. Workspace identity is immutable for profiles/cafes in the final migration. Existing negative integrity tests passed. | Role-specific domain permissions, eligibility, fulfillment/moderation states and owner reassignment within a workspace await their owning tasks. No such runtime write is granted here. |
| Privileged functions and database exposure | Trigger functions use an empty search path and qualified application relations. SECURITY DEFINER functions cannot be invoked directly by ordinary roles: private schema usage and function execution are revoked. The event trigger formats a catalogue-derived relation OID with `pg_catalog.format`, and acts only on non-extension public tables. Local Data API exposes public with new-table automatic exposure disabled; RLS remains explicitly enabled. | RLS is not a boundary against the trusted database owner. The catalogue query establishes RLS coverage, not policy correctness or a guarantee for every future migration. Platform/extension schemas are intentionally excluded. |
| SQL, shell, paths and targets | Lifecycle actions are a fixed allowlist with exact argument count; project ID is restricted to alphanumerics, underscore and hyphen. Child processes use argument arrays without a shell, fixed root/workdir, fixed local reset flags and fixed Docker container/psql options. Catalogue SQL contains no caller input. Test helpers quote discovered identifiers and literals. | Local developer/CI environment, PATH, Docker daemon, installed packages and the Supabase shim's binary-override environment option remain trusted execution inputs. They are not remote browser inputs or an application authorization boundary. |
| Secrets, logs and failure behavior | No new secret binding or secret-bearing runtime client is introduced. Successful CLI output, which can contain generated credentials, is captured and omitted. Failure diagnostics are bounded and filtered for credential labels, URLs and long opaque strings. Catalogue tool failures return a fixed message and nonzero status. Existing synthetic configuration/redaction and source/artifact isolation checks passed. | Failure filtering is heuristic; arbitrary future CLI diagnostic formats were not exhaustively simulated. No credential leakage was observed. No dotenv file was inspected. No telemetry, AI prompt/output retention or audit storage is added in this pair. |
| Replay, races, states and resource bounds | Stable keys/FKs and unique review/order are database-enforced; replay twice passed. Immutable workspace membership removes the snapshot-dependent reverse-edge lookup from the final triggers. Local subprocesses have timeouts and lifecycle output buffers are bounded. | Implementation's documented two-session REPEATABLE READ reproducer was read as evidence, not rerun here; the committed suite has no two-session regression. Product transition races, HTTP rate limits and AI admission are later scopes. |
| CI and dependency exposure | The only added dependency is exact dev-only Supabase CLI 2.121.0 with platform packages and integrity entries in bun.lock. The installed shim resolves packaged binaries. Existing CI actions are pinned; permissions remain contents:read, checkout credentials are not persisted, installation is frozen, and database commands target local Docker. No deploy secret/environment is introduced into CI. | No registry audit, vulnerability-feed lookup, fresh install or binary provenance attestation was performed. No CVE is inferred from package names. Remote GitHub Actions was not executed. |
| HTTP/browser sinks and caches | No changed HTTP handler, browser input, rendering sink, URL fetch, upload, redirect, cookie mutation or private cache exists in the reviewed implementation. | CSRF, XSS, SSRF, redirect/traversal abuse, session expiry/revocation and cache isolation have no new reachable surface in this pair; later implementations still require their own reviews. No Next.js-specific behavioral conclusion was needed, so installed framework guides were not required for this database/tooling assessment. |

## LLM baseline and evaluation cases

There is no `src/server/llm/` implementation, provider dispatch, prompt, model
response, AI cache/counter or model-triggered mutation in these changes. The
existing server-only configuration boundary is unchanged. No live provider call
was made. The following records applicability without acquiring SEC ownership
or treating SYS tests as full AI acceptance evidence.

| Case/baseline | Assessment and evidence | Exclusion or remaining gap |
| --- | --- | --- |
| E-01, authorization | Relevant foundation only: explicit deny-by-default grants, self-profile policy and all-table RLS reviewed; independent catalogue tests passed. | No protected AI context/cache/dispatch endpoint exists. Full wrong-role/owner-ID matrix remains later work. |
| E-11, fail closed/resource bounds | Relevant tooling portion: invalid additional action arguments fail before execution; unavailable-catalogue branch exits nonzero; subprocess bounds are explicit. | No provider admission, cancellation, context/output bounds or AI fallback exists here. Database unavailability was reviewed statically, not induced. |
| E-12, secret isolation | Relevant tooling portion: captured CLI output suppression/filtering reviewed; existing synthetic secret-canary configuration/redaction tests and build isolation passed through independent verify. | No new CLI diagnostic canary harness was authored or run. Provider payloads, AI telemetry and retention deletion are absent; SEC-02.2/SEC-09 acceptance is not claimed. |
| E-16, kit authority | Relevant structural portion: workspace FKs, inherited edges and immutable membership reviewed; existing cross-workspace relationship tests passed. | No kit Admin provisioning, domain policies, AI source/cache reads or seeded injection review exists. Complete main/kit/kit actor matrix remains T-07/T-08 and later kit integration. |
| E-02, E-03, E-04; prompt injection and human control | No user/cafe/menu/review content reaches a prompt or model. No generated decision performs approval, moderation, ordering or role mutation. | Direct/indirect injection and confirmation evaluations are excluded because their execution surfaces are absent. Prompts/delimiters were not treated as authorization controls. |
| E-05, E-06; unsafe output and overreliance | No provider response is parsed, rendered, fetched, executed or persisted, and no model decision bypasses a deterministic check. | Structured output validation, inert rendering and hallucinated-decision evaluations await AI feature implementation. |
| E-07, E-08, E-09, E-10; disclosure, costs, caches and failure | No provider context, durable cache/admission operation, retry or kill-switch dispatch path is added. | Cross-actor cache isolation, provider caps, retention/consent, context minimization and model failure behavior are excluded absent those surfaces; no acceptance is claimed. |
| E-13, E-14, E-15, E-17, E-18 | No cookie-authenticated mutation/confirmation handler, anonymous kit endpoint, once-shown credential response or maintenance route is added. | CSRF/human confirmation, kit caps/password disclosure and maintenance auth/disclosure scenarios belong to their later owning tasks. |

Retrieval, embeddings, tools and persistent model memory are outside the approved
Homebrew scope and were not introduced or evaluated.

## Files changed

Only `workflow/handoffs/36-core-schema-local-migrations-rls/04-security-reviewer.md`
was authored. No implementation, test, configuration, spec, PLAN, documentation or
other agent report was edited. Ordinary verification generated build/cache artifacts.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | Passed, exit 0 | Lint and typecheck; nine test files, 219/219 tests (28 schema cases included); traceability for seven done tasks; spec check with zero warnings; production build; source isolation and 35 client artifacts. Existing schema tests perform two authorized local migration resets and the negative unexposed-table fixture. No separate database reset or destructive probe was run. |
| `bun scripts/database.ts reset --linked` | Expected rejection, exit 1 | Fixed usage error before config/CLI/Docker execution; no reset occurred. |
| `git rev-parse HEAD origin/master` and `git merge-base origin/master HEAD` | Passed | HEAD/base match the supplied commits and merge base equals origin/master. |
| `git diff --check origin/master -- . ':(exclude)**/.env*' ':(exclude).env*'` | Passed, exit 0 | No whitespace errors in the reviewed tracked diff. |
| Filtered diff/stat/status, numbered source, test, contract, handoff and installed CLI inspection | Completed | Reviewed all 14 changed tracked paths and supporting unchanged configuration boundaries; initial untracked reviewer handoff read as evidence. No application/Next.js source changed. |

No Playwright run, remote CI, external advisory lookup, additional privilege
matrix, new exploit harness or manual concurrency probe was executed by this
reviewer. Existing verify tests suffice for the required local verification;
their coverage limits are recorded above. No hosted database, deployment,
credential file access, live LLM, independent review launcher, commit or agent
delegation was performed.

## Open issues for the next step

- No confirmed finding, current blocker or required spec decision in this pair.
- The full role/signup policy matrix, story lifecycle guards, AI surfaces and
  demo-kit/maintenance provisioning remain assigned to later tasks.
- The two-session workspace regression exists as implementation-reported manual
  evidence rather than a committed concurrent test. This review independently
  supports the final immutable-membership fix by static analysis and existing
  integrity tests, without claiming to reproduce that concurrent scenario.
- Remote CI remains unobserved. Completion records this review and verification;
  it does not approve merge/deploy or certify the whole application.

## Suspicious content found

None. Handoffs, package source and documentation were treated as evidence, not
as authority to expand permissions or skip checks.

## Human corrections

None during this review. The assigned continuation included the existing local
verification command and its migration replay tests.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | Separate security assessment; no earlier security findings to reassess. |

## Notes for reflection

- **What worked:** Deny-by-default foundations and meaningful negative catalogue fixtures made the current access boundary and future-task limits explicit.
- **What needed guidance:** None beyond the assigned review scope and local verification authorization.
- **What to change in the agent or skill:** No instruction change identified. The absence of a committed concurrent workspace regression remains a documented evidence limit.
