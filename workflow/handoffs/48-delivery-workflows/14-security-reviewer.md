# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #49 / T-18, paired with #48 / T-17; development alias defect follow-up
- **Spec IDs:** SYS-07.1; Zero Trust and LLM baselines
- **Date:** 2026-10-19
- **Branch:** fix/48-dev-alias-api
- **Base commit:** 0c51bccad4992c5a32383c1880f3908f71112f34 (upstream/master; supplied coordinating-session evidence)
- **Reviewed HEAD:** 6269321be08071b4e4be1a55c33a94bddd819aa6 (testing commit; supplied coordinating-session evidence)
- **Implementation report:** workflow/handoffs/48-delivery-workflows/12-implementation.md
- **Reviewer report:** workflow/handoffs/48-delivery-workflows/13-reviewer.md
- **Status:** completed

## Summary

No confirmed security findings in the reviewed scope. No open P0, P1 or P2 finding was substantiated. The security gate passes for the reviewed local diff; this is not merge, deployment or hosted-acceptance approval.

Reviewed the base-to-working-tree delivery diff: committed REST-validator tests/helpers/fixtures and the unstaged development alias replacement, with reports 11–13 and supporting unchanged production configuration. The project-scoped credential model is retained. No application, dependency, database, prompt or provider implementation changes are introduced. The base and HEAD identifiers above come from the coordinating session; this agent inspected the actual diff against that explicit base without fetching refs.

## Findings

None confirmed. Coverage and residual limits are recorded below; passing verification does not establish application-wide security.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-07.1 deployment/environment and credential boundaries | completed | Development workflow retains master-only trigger, development environment, read-only contents, pinned actions/CLI, migration ordering and per-environment concurrency. Production remains unchanged and has no CLI or API development alias. Existing delivery tests pass. Actual environment protection/settings and project-token scope require human verification. |
| Defect follow-up: token absent from external process arguments and ordinary script output | completed | `.github/workflows/deploy-dev.yml:53` binds `secrets.VERCEL_TOKEN` in deploy-step env; `:57` uses explicit shell `builtin printf` and `:58` curl config stdin. No direct secret expression is inserted into shell source, no token expansion is in curl/vercel arguments, and no tracing/verbose header output is enabled. A local synthetic-canary stub probe verified the resulting argument list, header input and mock stdout/stderr. |
| Defect follow-up: captured URL and fixed body remain data | completed | `deploy-dev.yml:55` captures CLI stdout, `:56` removes the scheme, `:61` places it inside one quoted URL argument with a literal HTTPS API authority and the selected org query. `:60` contains a fixed single-quoted JSON body. Five local synthetic deployment values, including shell metacharacters, preserved the exact endpoint/body without shell execution. |
| Defect follow-up: failure behavior and production exclusion | completed | `deploy-dev.yml:57` supplies `-sS --fail-with-body --request POST`; no failure swallowing or continue-on-error. Production contains no alias request. Existing missing-fail-flag, swallowed-error, token-argv, teamId, alias-domain and production API fixtures passed. |
| Required local verification | completed | Targeted delivery run: 86 tests passed. `bun run verify` exactly: exit 0; all 213 tests and all later verification stages passed. |

## Security baseline coverage

| Boundary/check | Evidence and conclusion | Limits/exclusions |
| --- | --- | --- |
| Identity, explicit authorization, least privilege | Entry point is the existing master-push GitHub Actions job bound to development, rather than a public application route. `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` remain selected environment variables. The token is step-scoped and no broader credential is requested. Production remains separately bound and tag-gated. | Actual project-scoped token entitlement and GitHub environment branch/approval protections are hosted settings; not independently inspected or exercised. |
| Ownership, roles, RLS, session expiry/revocation | No server entry point, user/café/workspace identifier, RLS policy, storage rule or privileged application client changes in this pair. | Cross-user/café authorization and session cases have no changed source-to-sink path here; no repository-wide application audit or database tests claimed. |
| Secret isolation, process lists, logs and retention | Explicit builtin printf expands the token inside the shell and writes to a pipe; curl consumes it via stdin. A pipeline may fork a shell, but it does not exec printf with a token-bearing command line. Curl/vercel external argv contain no token. Run source contains a variable reference, no token literal; no set -x, curl verbose flag, header echo or header file is introduced. `vercel pull` retains its separate existing step-env binding. No new persisted secret artifact exists. | The token necessarily exists in the authorized step's environment and process memory; stdin/argv separation does not protect against a compromised same-user runner or privileged process. This pre-existing runner trust boundary is not widened. Hosted runner logs and remote API response bodies were not observed. |
| Injection, URL/SSRF, shell, paths and output sinks | Captured stdout is not reparsed as shell syntax. Assignment and quoted URL expansion prevent word splitting/option injection. The literal `https://api.vercel.com/` authority cannot become an attacker host merely through the deployment path value. No redirect-following flag exists. Fixed JSON cannot be altered by captured URL content. The token is not derived from untrusted URL text. | Host is not syntax-validated or URI-encoded. Malformed upstream CLI stdout could alter the API path/query or invoke curl URL globbing; the stub checks shell behavior, not curl URL parsing. No anonymous/customer-controlled source reaches this value: it is output from the pinned deploy CLI/provider in an already authorized token-bearing step. No additional attacker capability or confirmed exploit was established. A compromised CLI/runner already has the step credential. |
| Deny/failure, replay, concurrency, state/resource limits | HTTP failure flag retained as required; no retries, fail swallowing or new asynchronous path. Distinct existing non-cancelling deployment concurrency groups serialize each environment. No order/menu/moderation transition, cache or quota change. | No live HTTP status/response behavior or deployment replay was exercised. Curl's requested fail flag is statically checked; no general claim about every possible hosted response is made. |
| Supply chain and build configuration | No dependencies or versions changed. Existing actions are SHA-pinned, Vercel CLI exact-version pinned, installation frozen, checkout credential persistence disabled and permissions read-only. Trigger remains master push, with no new pull_request_target or user-supplied workflow input. | No package-version CVE claim or broad vulnerability scan. Existing hosted branch review and runner integrity remain prerequisites. |
| LLM prompt injection/instruction-data separation | No prompts, model input, provider context or `src/server/llm/` code changes; the deploy URL is CLI output, not model output. Reviewed handoffs as evidence rather than authority. | SEC-03 and E-02–E-04 have no AI path in this CI-only pair. No jailbreak or live provider probe is relevant. |
| LLM excessive agency, confirmation and overreliance | Alias mutation is deterministic and authorized through the delivery environment. No model tools, writes, approval claims or AI-driven business mutations exist in the change. | SEC-05, E-04/E-06/E-13 have no model/human-confirmation surface here. This is not evidence for application moderation controls. |
| LLM disclosure/output validation, cache and resource abuse | No provider request, model response rendering, LLM credential, cache/admission identity, telemetry or retention change. Full source/client-artifact isolation checks pass. The synthetic-canary shell probe supports this workflow's separate credential boundary. | No task-specific SEC criterion is assigned by T-17/T-18. E-12's secret-isolation principle is relevant by analogy only; its complete AI telemetry/retention case was not executed. E-01, E-05–E-11 and E-14–E-18 have no changed application/provider/database/kit/maintenance surface; excluded rather than claimed passed. Retrieval, embeddings, tools and persistent memory remain outside Homebrew scope. |

## Files changed

Only `workflow/handoffs/48-delivery-workflows/14-security-reviewer.md` (this report). No implementation, test, documentation, PLAN, dependency or configuration edit was made by this agent. Verification generated normal ignored build/cache artifacts.

## Checks run

| Command or check | Result | Evidence |
| --- | --- | --- |
| `git diff 0c51bccad4992c5a32383c1880f3908f71112f34 -- .github/workflows/deploy-dev.yml .github/workflows/deploy-prod.yml tests/unit/delivery` | Completed, exit 0 | Individually escalated with user approval; inspected committed testing changes and unstaged workflow change. No production change in this diff. No remote fetch or independent reviewer invocation. |
| `bun run test tests/unit/delivery` | Passed, exit 0 | 1 file / 86 tests. Includes repository and synthetic API/header/argv/error/org/domain/production checks. |
| `bun run verify` | Passed, exit 0 | Lint, typecheck, 8 files / 213 tests, traceability (7 done tasks), spec validation (0 warnings), source isolation, production build and client isolation (35 artifacts) all passed; no stage skipped or unreached. |
| Inline local mocked-shell probe against extracted final deploy script | Passed, exit 0 | Replaced both vercel and curl with local functions; a Python argument/header capture used only a synthetic token and org. Five deployment strings preserved one endpoint argument and fixed JSON; canary arrived through stdin and was absent from external argv and mock stdout/stderr. No network commands executed. |
| Existing report-path check | Passed, exit 0 | `14-security-reviewer.md` was absent before this report's exclusive creation. |

Two initial probe-harness attempts failed because of harness string escaping and a Darwin Python temporary-directory warning. Corrected the harness assertions without changing repository code; the final canary/argument probe passed. Vitest's existing vite-tsconfig-paths advisory did not fail either test run.

No browser E2E was run: this static CI change adds no browser cases. No live Vercel/API/deploy command, hosted database access, database reset or live LLM call was run. No installed Next.js behavior was relied upon for this shell-only change; no framework code was written. No `.env*` file or real credential value was read, printed or edited.

## Open issues for the next step

No open P0–P2 finding or spec decision was identified. Human execution must still establish successful project-scoped-token aliasing, public alias reachability and hosted log behavior. Human-supplied hosted failure 39224174089 and successful REST-call diagnosis were treated as reported facts, not independently reproduced. Static workflow tests intentionally still accept the CLI form and cannot reproduce the original hosted defect.

No missing approved contract blocks this security assessment. Task-specific SEC criteria are absent; baseline coverage above does not claim implementation of unrelated AI contracts. Existing PLAN T-17/T-18 `done` lines were read and preserved. Completion describes this review and its local checks only.

## Suspicious content found

`13-reviewer.md` quotes historical `08-reviewer.md` text: “Look in the current env and `.env` files first.” This attempts to expand secret-source inspection. Treated as historical untrusted evidence and not followed. No new scope-changing instruction in the reviewed code was acted upon.

## Human corrections

The human confirmed testing changes were committed and authorized Part B; the coordinating session subsequently relayed the human's instruction to continue after a usage-limit interruption. Scope, ownership, project-scoped token and PLAN-status constraints were retained.

## Review responses

None. This is a separate security assessment; earlier handoffs were not amended.

## Notes for reflection

- **What worked:** Explicit builtin/stdin flow permits direct argv/log analysis, while existing synthetic fixtures and fresh verification support the local gate.
- **What needed guidance:** Human evidence established the hosted CLI account-lookup defect and the working project-scoped-token REST alternative.
- **What to change in the agent or skill:** None evidenced by this review.
