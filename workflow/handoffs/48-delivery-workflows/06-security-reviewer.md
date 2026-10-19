# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #49 / PLAN T-18, paired with #48 / T-17
- **Spec IDs:** SYS-07.1; Zero Trust and LLM baseline
- **Date:** 2026-10-19
- **Branch:** feat/48-delivery-workflows
- **Base ref:** upstream/master
- **Base commit:** dd0fb3af846268b37a5624c28505f8abe9381fc8
- **Reviewed HEAD:** 09fdf8d09de9a91b9727e3305aa8a77c4bdb9a48
- **Implementation report:** workflow/handoffs/48-delivery-workflows/04-implementation.md
- **Reviewer report:** workflow/handoffs/48-delivery-workflows/05-reviewer.md (completed; Overall pass)
- **Status:** completed

## Summary

Assessed the branch diff against the supplied review base, approved SYS-07.1 delivery contract, existing static tests and supporting unchanged CI/package configuration. One confirmed security finding, SR-01 (P2), concerns unnecessary deployment-token exposure to installation and other non-deployment processes. This audit is completed; the finding is unresolved. No fix, merge or deployment approval is implied.

Both deployment jobs bind all ordinary migration/deployment commands to their selected GitHub environment. No separate unapproved production path is present in the reviewed configuration. Actual environment protections and hosted outcomes remain unavailable to agents. Local verification passed all 98 tests and the production build.

## Findings

### SR-01 — P2 medium: deployment token reaches unrelated setup and dependency-install processes

**Location:** `.github/workflows/deploy-dev.yml:19` and `.github/workflows/deploy-prod.yml:19`, `jobs.deploy.env.VERCEL_TOKEN`; consumers include development lines 23–44 and production lines 23–49.

**Boundary and static evidence:** Both jobs export the deployment token before checkout and tool setup. Every action and shell step consequently inherits deployment authority, including Supabase CLI setup, global Vercel installation, migration, project dependency installation and build. The database secret is correctly limited to the migration step; the Vercel token has no corresponding restriction.

This is a reachable install-time exposure, not an assumption that every dependency executes lifecycle scripts. The exact pinned [Supabase action source](https://raw.githubusercontent.com/supabase/setup-cli/45a513f8c64c0bc8e0e3dfe572b5c95be85f6359/src/main.ts) installs the requested CLI through npm without a package lock and explicitly passes its process environment to child processes (lines 273–312). If package metadata declares installation hooks, that action enables npm installation scripts. Thus those processes also receive the unrelated Vercel token. Its [composite action](https://raw.githubusercontent.com/supabase/setup-cli/45a513f8c64c0bc8e0e3dfe572b5c95be85f6359/action.yml) additionally installs its own dependencies. The global Vercel install is separate from the repository lockfile; the application install/build inherit the token as well.

**Attacker prerequisites and impact:** An attacker able to introduce executable code through an eligible installation hook or a dependency executed during build can read and exfiltrate the token without needing it for that dependency's task. The attacker could then reuse it outside GitHub's approval boundary to perform Vercel operations allowed by that token. Exact token scope, lifetime and whether both environment tokens authorize the same project's Production target were not inspected; no cross-target or database access is asserted.

**Compensating controls considered:** Production approval must release environment secrets before the job begins; SHA-pinned actions, exact top-level CLI versions, a frozen application lockfile, Bun's lifecycle restrictions, reviewed master code and a fresh hosted runner reduce prerequisites. They do not isolate the token from child processes, and the Supabase installer resolves its CLI dependency tree at execution time. GitHub log masking does not prevent outbound token reuse. The production ancestry step follows setup/CLI installation, so it does not constrain these earlier consumers. This finding does not claim any command runs before GitHub grants production approval.

**Decision context:** Job-level Vercel environment variables were explicitly selected by the human. This implementation follows that choice and the spec's job-level environment boundary; SR-01 is a baseline least-privilege security finding about the resulting source-to-process exposure, not an allegation of spec noncompliance or a reason to change an instruction silently.

**Confidence and reproduction:** High confidence in token inheritance and pinned-installer behavior; exploitability requires supply-chain or build-code compromise. Static reproduction is to trace job env into each step, then follow the pinned installer's explicit child environment. No malicious script, synthetic workflow execution, token access or exfiltration was performed.

**Fix direction for a separately authorized round:** Reconsider the job-level secret decision and restrict Vercel authentication to steps that need Vercel API access, retaining environment-variable authentication rather than a command-line token. Exclude the token from setup, installers, migrations and application build children wherever possible; do not claim environment scoping alone isolates third-party code sharing the same runner.

**Suggested regression coverage for testing:** With synthetic credentials only, inspect effective credential scope for each installation/migration/build step and the required authenticated Vercel steps. Retain SYS-07.1 environment binding and failure-gating assertions. There is no dedicated SEC criterion owned by this pair.

## Acceptance criteria and baseline coverage

| Criterion or boundary | Status | Evidence and limits |
| --- | --- | --- |
| SYS-07.1: deployment entry points and identity | completed | Only master pushes select development; only v* tag pushes select production. Each has one environment-bound job. No PR, workflow_dispatch, workflow_run or pull_request_target deployment entry exists. Git deployments are disabled in vercel.json. |
| SYS-07.1: approval and ancestry | completed | Production migration and deployment share the production job. Full history plus fetch and tag-to-master merge-base check precede migration. Default success gating is intact; no continue-on-error or always bypass. Hosted teammate approval, prevent-self-review, administrator bypass off and allowed branch/tag rules are unverified prerequisites, not properties proved by environment: production. |
| Least privilege, assumed breach, secret isolation | completed | SR-01 records token exposure. SUPABASE_DB_URL appears only in the migration step; identifiers use vars, token/DB URL use secrets; no application credential or CRON_SECRET reference. Root contents: read and checkout persist-credentials: false limit GitHub authority. Actual token permissions, credential separation and repo/org copies were not inspected. |
| Injection and source-to-sink handling | completed | No branch/tag/commit/message interpolation in run scripts. Secret URL passes through quoted shell env, not expression expansion into shell code. Captured deployment output is a quoted alias argument, never eval or executable shell text. No attacker-controlled workflow output is spliced into a later run script. Malicious trusted-CLI behavior remains a supply-chain concern, not a demonstrated output-injection route. |
| Migration and deployment failure paths | completed | Migrations precede installation/build/deploy; failures are not swallowed. Empty SQL set logs a skip. No seed paths, reset, local/demo credentials, literal/constructed hosted DB URL, direct host or transaction port. Production --prod is used only on build/deploy; development alone sets its fixed alias. No production migration/deploy outside the approval-bound job was found. |
| Supply chain and build | completed | Top-level and inspected nested actions are SHA-pinned. CLI versions are exact declarations. Frozen application lockfile contains only the test YAML parser addition. Global CLI installation is not covered by that lockfile; SR-01 traces associated credential exposure. No package-name-based CVE allegation or proof of malicious dependencies. Exact CLI releases were not installed/executed. |
| Concurrency, replay and operational state | completed | Separate stable non-cancelling groups serialize each environment. Explicit reruns remain authorized delivery actions and repeat migrations. Hosted migration idempotence, execution order across queued runs and outcome behavior were not exercised. The contract does not define a newest-commit-only deployment rule. |
| Server entry points, role/ownership separation, RLS, CSRF, caches and retention | completed (scope exclusion) | The diff adds delivery configuration/tests and inventory/report prose, with no HTTP handlers, database schema, privileged app clients, session or ownership code. These runtime boundaries are unchanged; no application-wide assurance is claimed. |
| LLM baseline: injection, agency, disclosure, unsafe output, cost and overreliance | completed (scope exclusion) | No provider dispatch, prompt/context, LLM output sink, tool, mutation, AI cache/telemetry or rate-policy change. No SOCLAAS_API_KEY reference in workflows. AI-SECURITY-SPEC E-01–E-18 were examined for applicability; none exercises a surface introduced by this pair. E-12's application telemetry/client-artifact behavior and E-17/E-18 maintenance behavior belong to their runtime owners; this audit only inspects CI credential boundaries. Retrieval, tools and memory remain out of scope. |

Environment-gated secret availability follows [GitHub's environment documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments). These documented semantics do not verify this repository's hosted settings.

## Credential exposure by step

| Credential | Effective exposure | Assessment |
| --- | --- | --- |
| VERCEL_TOKEN | Every deploy-job step and inheriting subprocess: checkout/tool setup, nested action installs, global CLI install, ancestry (prod), migration, application install, pull, build, deploy and alias (dev). | SR-01. No credential value inspected. |
| VERCEL_ORG_ID / VERCEL_PROJECT_ID | Same job-wide scope, from environment variables. | Identifiers, not authentication secrets; no separate confirmed disclosure finding. Target identity cannot be proved from names alone. |
| SUPABASE_DB_URL | Migration step/process and Supabase CLI argument only. | No unnecessary direct inheritance by later install/build steps found. The CLI necessarily receives its URL; process/list/error behavior was not tested. |
| SUPABASE_SECRET_KEY / SOCLAAS_API_KEY / MAIN_ADMIN_PASSWORD / CRON_SECRET | No workflow references. | Application settings remain hosted configuration; correct Secret/Config classification and request-time-only loading are unavailable here. |

## Files changed

Only `workflow/handoffs/48-delivery-workflows/06-security-reviewer.md` (this report). The pre-existing untracked `05-reviewer.md` was preserved. No code, tests, configuration, PLAN or guides changed.

## Checks run

| Command or inspection | Result | Evidence |
| --- | --- | --- |
| `git rev-parse HEAD upstream/master` | exit 0 | HEAD 09fdf8d09de9a91b9727e3305aa8a77c4bdb9a48; base dd0fb3af846268b37a5624c28505f8abe9381fc8. No fetch. |
| `git diff --name-status upstream/master...HEAD` and targeted reads | completed | Inspected both new workflows, vercel.json, test helper/fixture contract and cases, package/lock addition, inventory rows and handoffs; supporting CI/package scripts and approved specs. |
| `bun run test -- tests/unit/delivery/delivery.test.ts` (sandboxed) | exit 1; startup unavailable | EPERM writing node_modules/.vite-temp in the sibling worktree; no tests ran in this attempt. |
| Same targeted command, approved escalated retry | exit 0 | One test file passed; 64 delivery tests passed. |
| `bun run verify` (exact command, escalated for sibling worktree caches) | exit 0 | Lint and typecheck passed; four test files, 98 tests passed; traceability passed (3 done tasks); spec check passed (0 warnings); production build succeeded with / and /_not-found static routes. No later verify check was skipped. |
| `git diff --check upstream/master...HEAD` | exit 0, empty output | No whitespace errors. |
| Public primary-source inspection | completed with limits | Read exact pinned setup-bun/checkout/Supabase action metadata, Supabase setup source/package/Bun-version file, GitHub environment docs and Bun lifecycle docs. No action/CLI ran. A guessed setup-bun src/setup.ts path returned 404, so no claim depends on it. |
| `git status --porcelain --untracked-files=all` before report | exit 0 | Only pre-existing untracked workflow/handoffs/48-delivery-workflows/05-reviewer.md. |

No workflows, Vercel/Supabase CLI commands, hosted databases, GitHub APIs, external probes, live providers, installs or destructive exploits ran. Public raw source/document retrieval was read-only. Browser/e2e tests were not run because this pair has no browser behavior.

## Open issues for the next step

- SR-01 remains unresolved. This report does not start a fix round.
- Hosted evidence is unavailable: environment approval settings/allowed refs/bypass rules, credential storage and scopes, Vercel target/project separation and Secret/Config types, domains, Supabase projects/regions/connection contents, and actual approval/migration/deployment outcomes. No claim of protection-policy enforcement or deployed acceptance is made.
- Non-security toolchain observation: the exact pinned Supabase composite calls setup-bun with its own .bun-version; that pinned file is [1.3.10](https://raw.githubusercontent.com/supabase/setup-cli/45a513f8c64c0bc8e0e3dfe572b5c95be85f6359/.bun-version), whereas this repository declares bun@1.4.3. Subsequent workflow steps do not restore the repository Bun. This is static source evidence of a toolchain mismatch not detected by the current helper tests; it is not assigned a security finding/CVE or silently fixed. The independent reviewer report remains unchanged.
- SHA/CLI pins do not constitute a complete transitive-dependency or binary-provenance audit. No vulnerability database scan or exact CLI runtime test was performed.

## Suspicious content found

No new instruction attempting to expand this audit's permissions was encountered. The prior reviewer report records an external instruction to inspect environment files; it was treated as historical data and not followed. No .env* file, process environment or credential value was read.

## Human corrections

The human requested stage 5 only after a passing stage 4, and a stop before documentation or any fix round. The supplied review passed. This agent wrote only its own report.

## Review responses

None; no fixes made.

## Notes for reflection

- **What worked:** Synthetic validator cases and local verification prove static contract behavior; reading the exact composite action exposes child-process credential flow beyond top-level YAML.
- **What needed guidance:** Job-level token scope was an explicit human decision, so the report distinguishes conformance from the resulting security exposure.
- **What to change in the agent or skill:** None required by this audit.
