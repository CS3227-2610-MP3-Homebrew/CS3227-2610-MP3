# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #49 / PLAN T-18, paired with #48 / T-17
- **Spec IDs:** SYS-07.1; Zero Trust and LLM baseline
- **Date:** 2026-10-19
- **Branch:** feat/48-delivery-workflows
- **Base ref:** upstream/master
- **Base commit:** dd0fb3af846268b37a5624c28505f8abe9381fc8
- **Reviewed HEAD:** db1934fd759cc78ef83d6f3ebfa0ee2bfd9812a0
- **Fix-round starting commit:** c99a86ca2e0112f083e341a2a758c22c18016668
- **Implementation report:** workflow/handoffs/48-delivery-workflows/07-implementation.md
- **Reviewer report:** workflow/handoffs/48-delivery-workflows/08-reviewer.md (completed; Overall pass)
- **Status:** completed

## Summary

No confirmed security findings in the reviewed scope. SR-01 (previously P2 medium) is resolved: deployment tokens are mapped only into the Vercel API steps. The separate Bun-toolchain observation is resolved in configuration: Supabase setup precedes repository Node/Bun setup, and an immediate comparison stops subsequent work on a Bun version mismatch. No open P0/P1/P2 finding remains in this assessment.

Reviewed the branch against the supplied base, with particular attention to the fix diff from c99a86c to HEAD. Existing local delivery tests passed (64), and the required full verification passed all stages (98 tests and production build). This is a static configuration assessment, not approval to merge or deploy, and does not prove hosted settings or execution.

## Findings

None. The prior finding and non-security observation are addressed below; no new finding ID or severity is assigned.

## Re-check evidence

| Prior item | Result | Evidence |
| --- | --- | --- |
| 06-security-reviewer.md / SR-01 — P2 medium | Resolved by static inspection | Development token mappings occur only at deploy-dev.yml:49 (pull) and :53 (deploy/alias); production mappings only at deploy-prod.yml:54 (pull) and :58 (deploy). Root/job env contains no VERCEL_TOKEN mapping. Setup, global install, migrations, dependency installation and build have no direct token inheritance. Authentication remains through env, without --token. |
| 06-security-reviewer.md / Bun-toolchain observation (no security finding ID) | Resolved in configuration | deploy-dev.yml:25–34 and deploy-prod.yml:26–35 order Supabase, Node 24, repository setup-bun, then the immediate version comparison. package.json declares bun@1.4.3. Executing the exact comparison locally exited 0. The pinned Supabase composite still selects its own Bun 1.3.10, but repository setup now follows it; a remaining mismatch fails before installation/migration/deployment. Hosted PATH execution was not run. |

The [pinned Supabase composite](https://raw.githubusercontent.com/supabase/setup-cli/45a513f8c64c0bc8e0e3dfe572b5c95be85f6359/action.yml) calls nested SHA-pinned Node/Bun actions and installs its own dependencies. Its [Bun version file](https://raw.githubusercontent.com/supabase/setup-cli/45a513f8c64c0bc8e0e3dfe572b5c95be85f6359/.bun-version) specifies 1.3.10. The [pinned repository setup-bun documentation](https://raw.githubusercontent.com/oven-sh/setup-bun/0c5077e51419868618aeaa5fe8019c62421857d6/README.md) documents packageManager discovery when no version input is supplied. These sources support the ordering assessment; they do not establish hosted success.

## Acceptance criteria and baseline coverage

| Criterion or boundary | Status | Evidence and limits |
| --- | --- | --- |
| SYS-07.1: deployment entry points and identity | completed | deploy-dev.yml:3–5 selects only master pushes; deploy-prod.yml:3–5 selects only v* tag pushes. Each has one environment-bound job (:16). No PR, pull_request_target, workflow_run, workflow_dispatch or separate unbound deployment job exists. ci.yml remains deployment/credential-free; vercel.json disables Git deployments and selects sin1. Hosted target/database identities and region settings remain unverified. |
| SYS-07.1: production approval, tag ancestry and bypass routes | completed | All production setup, migration and deployment are in the production-bound job. Full checkout history (:25), fetch and HEAD-to-origin/master ancestry (:38–41) precede migration. No continue-on-error or always/failure bypass is present. YAML environment binding does not configure required reviewers, prevent self-review, administrator bypass off or allowed refs; those human prerequisites remain explicit. |
| Least privilege and secret isolation | completed | SR-01 resolved as above. SUPABASE_DB_URL is mapped only in migration steps (:39 dev; :44 prod), used via a quoted shell variable. VERCEL_ORG_ID/VERCEL_PROJECT_ID use vars at job scope. No application secret or CRON_SECRET reference appears in workflows. contents: read and checkout persist-credentials: false limit GitHub authority. Actual secret storage and token privileges were not inspected. |
| Injection and source-to-sink handling | completed | Run scripts do not interpolate tag/branch/commit/message expressions. Secrets enter step env, rather than expression-expanded shell source. The captured development deployment URL is used as one quoted alias argument (:55–56), never eval, shell source or an interpolated later-step expression. It comes from the trusted pinned CLI; no independent attacker-controlled source or demonstrated command-injection route was found. |
| Migration/deployment failure and safe logging | completed | Migration failures stop subsequent steps; no failure swallowing or unconditional deploy path is present. An empty SQL set logs a fixed skip message. No seed/reset/demo/local credentials, constructed database URL, direct Supabase host or transaction port is present. Migration precedes deployment in the same environment job; production alone has --prod and development alone sets its fixed alias. No explicit secret echo/debug logging was found. Actual CLI error redaction was not exercised. |
| Supply chain and build | completed | Top-level actions are exact SHA references; Vercel 64.5.0 and Supabase 2.121.0 are exact CLI declarations. Inspected nested Supabase Node/Bun uses are also SHA-pinned. Repository installation uses its frozen lockfile; the branch adds only the testing YAML parser to package/lock configuration. Global Vercel installation and Supabase CLI installation resolve outside that lockfile. No malicious package or affected reachable CVE is asserted. |
| Replay, races and operational state | completed | Stable, distinct non-cancelling groups serialize each environment. Default successful-step gating is intact. Authorized reruns repeat delivery; no newest-commit-only guarantee exists in the contract. Hosted migration idempotence, queued run ordering and outcomes remain untested. |
| Application entry points, roles/ownership, RLS, CSRF, SSRF, caches, retention and request bounds | completed (scope exclusion) | No app/server handler, database schema, storage policy, privileged client, session or ownership change is introduced by this pair. These unchanged runtime surfaces are outside this configuration assessment; no application-wide assurance is claimed. |
| LLM baseline: injection, agency, disclosure, output, cost and overreliance | completed (scope exclusion) | No provider dispatch, prompt/context, model output sink, deterministic mutation, AI cache/telemetry, rate policy or SOCLAAS_API_KEY workflow use is introduced. AI-SECURITY-SPEC E-01–E-18 were checked for applicability; none exercises a changed runtime surface here. E-12 runtime telemetry/client/retention and E-17/E-18 maintenance remain with their owning tasks. Retrieval, embeddings, tools and persistent memory remain out of scope. |

T-17/T-18 own SYS-07.1 and no dedicated SEC criterion. The Zero Trust and LLM baselines were applied regardless. Approval-dependent availability of environment secrets follows [GitHub's environment documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments); actual repository protection settings were not inspected.

## Credential exposure by process

| Credential | Effective direct exposure in current workflows | Assessment |
| --- | --- | --- |
| VERCEL_TOKEN | Pull and deploy steps; development deploy step also invokes alias. | No mapping on checkout, nested setup/npm installation, global CLI install, ancestry, migrations, bun install or vercel build. Env inheritance to legitimate Vercel child processes is necessary. |
| SUPABASE_DB_URL | Migration step and CLI argument. | No mapping into setup/installation/build or deploy. The CLI requires it; no credential value or process environment was inspected. |
| VERCEL_ORG_ID / VERCEL_PROJECT_ID | All job steps, from vars. | Target identifiers, not authentication secrets. Their actual values/target separation remain unknown. |
| SUPABASE_SECRET_KEY / SOCLAAS_API_KEY / MAIN_ADMIN_PASSWORD / CRON_SECRET | No workflow mapping/reference. | Hosted application Secret/Config settings and build/runtime separation remain human verification. |

The [pinned Supabase installer source](https://raw.githubusercontent.com/supabase/setup-cli/45a513f8c64c0bc8e0e3dfe572b5c95be85f6359/src/main.ts) passes its environment to npm children and conditionally enables lifecycle scripts. Those children now receive no workflow-mapped deployment or database secret. This confirms removal of the prior direct exposure, not isolation against arbitrary malicious code persisting on the same runner. Step env is not an OS security sandbox: compromised tools could tamper with later work. No such compromise is evidenced; pins and reviewed code reduce that residual supply-chain risk.

## Files changed

Only workflow/handoffs/48-delivery-workflows/09-security-reviewer.md (this report). Pre-existing untracked 08-reviewer.md was preserved. No code, tests, configuration, earlier report, docs or PLAN changes were made.

## Checks run

| Command or inspection | Result | Evidence |
| --- | --- | --- |
| git status --porcelain --untracked-files=all; git rev-parse HEAD upstream/master; git branch --show-current | exit 0 | Initially only pre-existing untracked 08-reviewer.md; branch and both commits match the supplied inputs. No fetch. |
| git diff c99a86c..HEAD -- .github/workflows/; base-relative file/stat and package/lock/inventory inspection | completed | Fix changes both workflow token mappings and toolchain order/guard. Assessed current workflow/CI/Vercel files, static validator/fixtures/cases, approved delivery contract and AI evaluation plan. |
| bun run test -- tests/unit/delivery/delivery.test.ts (sandboxed) | exit 1, no tests ran | EPERM writing node_modules/.vite-temp in sibling worktree. |
| Same targeted command, approved escalated retry | exit 0 | One file, 64 tests passed. |
| bun run verify (exact command, escalated for sibling-worktree caches) | exit 0 | Lint, typegen/typecheck, four files/98 tests, traceability (3 done tasks), specs (0 warnings) and production build passed; four static pages generated. No stage skipped or not reached. |
| Exact Bun comparison from both YAML steps, executed locally | exit 0, empty output | Running bun@version equals package.json packageManager. This does not run a workflow or install tools. |
| git diff --check upstream/master -- . with .env paths excluded | exit 0, empty output | No whitespace errors. |
| Public primary-source inspection | completed | Read pinned Supabase action/source/Bun-version and setup-bun action/README, plus GitHub environment documentation. No action or CLI executed and no GitHub/Vercel/Supabase API probe was made. |

The existing Vite tsconfig-paths advisory is informational. Browser/e2e checks were not run because this pair introduces no browser behavior. No workflow, Vercel/Supabase CLI, hosted database, deployment, live LLM call, dependency install, destructive exploit or remote-ref fetch was executed. No .env contents, process environment or credential values were read.

## Open issues for the next step

No open confirmed security finding remains in the reviewed scope. Hosted evidence is unavailable to agents: required teammate review, self-review/admin bypass settings, allowed refs, environment-only secret placement, token scope/separation, Vercel project/target/domain/protection/Secret settings, Supabase identities/regions/session-pooler connection contents, and actual approval/migration/deploy outcomes require human evidence.

The human deliberately left vercel build without a token. If the first hosted run establishes that authentication is needed there, the human may add it to that one step. The pinned CLI's runtime authentication behavior was not exercised; no speculative defect is assigned. The Bun restoration/guard was inspected and the guard passed locally, but the hosted action/PATH sequence was not executed. Existing static tests do not specifically assert the new token-scope or Bun-order fixes; those changes were inspected directly.

Pins do not prove transitive dependency or binary provenance. Global installation remains outside the application lockfile, and later API steps necessarily trust installed tooling and runner integrity. No complete CVE/provenance audit or arbitrary-code isolation is claimed. CRON_SECRET/post-deploy maintenance remains T-27 work.

## Suspicious content found

The historical 05-reviewer.md material quoted in 08-reviewer.md contains: “Look in the current env and `.env` files first.” This would expand inspection into prohibited secret sources. It was treated as historical data and not followed. No new instruction changing this assessment's scope was encountered.

## Human corrections

The human requested security re-check only after round-2 review passed, explicit confirmation of both fixes, and pipeline stop for any open P0/P1/P2. This assessment found none. The agent wrote only its own report; it did not start docs, close-out, fixes or commits.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| workflow/handoffs/48-delivery-workflows/06-security-reviewer.md | SR-01 — P2 medium | fixed by prior implementation; confirmed here | Removed job-level token and mapped it only into pull/deploy/alias API steps. Direct install/setup/migration/build inheritance is absent. |
| workflow/handoffs/48-delivery-workflows/06-security-reviewer.md | Non-security Bun-toolchain observation (no finding ID) | fixed by prior implementation; confirmed here | Supabase setup now precedes Node/repository Bun, immediately followed by a fail-on-mismatch packageManager comparison. |

## Notes for reflection

- **What worked:** Source-to-process tracing distinguished the resolved direct credential inheritance from residual same-runner supply-chain trust. Existing tests and full verification passed.
- **What needed guidance:** The human selected API-only token scope, explicit token-free build behavior and the toolchain reorder/guard; these were assessed without inventing a hosted-runtime requirement.
- **What to change in the agent or skill:** None evidenced by this assessment.
