# Docs report

- **Agent:** docs
- **Issue:** #49 / PLAN T-18, paired with #48 / T-17; development alias defect follow-up
- **Spec IDs:** SYS-07.1
- **Date:** 2026-10-19
- **Branch:** fix/48-dev-alias-api
- **Base ref:** upstream/master
- **Base commit:** 0c51bccad4992c5a32383c1880f3908f71112f34 (coordinating-session evidence)
- **Reviewed HEAD:** 6269321be08071b4e4be1a55c33a94bddd819aa6; development workflow change remains local
- **Status:** completed

## Summary

Updated Developer Guide delivery step 3, the VERCEL_TOKEN credential row and Known limitations to describe the implemented REST alias request. The guide explains the project-scoped token/account-lookup limitation, the stdin authorization boundary, fixed JSON, selected organization and HTTP failure handling. It distinguishes human-reported hosted observations from local static verification and leaves revised-workflow hosted success and public reachability unclaimed.

Read root AGENTS.md, docs instructions/skill, package scripts, handoff conventions/template, all reports 01–14, T-17/T-18, approved SYS-07.1 and its delivery rules, the base-to-working-tree test/workflow diff and current workflow. Report 13 is completed/Overall pass with no findings; report 14 is completed with no findings or open P0–P2. No code/spec discrepancy was found. Both existing PLAN Status lines were read as done and preserved.

The former first-hosted-run build contingency was stale relative to the human's reported successful prebuilt deployment. It was replaced with that attributed observation and the current token-free build declaration. This does not assert independent hosted verification or guarantee future builds.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-07.1 / T-18: document implemented development alias configuration | completed | Claim-evidence rows below tie each changed Developer Guide claim to current workflow, passing tests or explicitly attributed human evidence. |
| Preserve project-scoped token and secure header explanation | completed | Development workflow lines 53 and 57–58 retain step env and explicit builtin printf/stdin config. No broader credential or workflow change was made by docs. |
| Human execution/hosted verification remains required | completed | Known limitations explicitly distinguishes direct REST success reported by the human from successful execution of the revised workflow and public alias reachability. |
| Required documentation checks | completed | check:specs passed with zero warnings; exact verify passed all stages and 213 tests. |

Claim-evidence table covers changed Developer Guide statements; no User Guide or README claim changed. Guide line numbers refer to the final guide. Human evidence is identified as such rather than substituted for passing tests.

| New or changed claim / guide location | Evidence | Verification boundary |
| --- | --- | --- |
| Capture prebuilt deployment URL and remove https:// (lines 294–295) | .github/workflows/deploy-dev.yml:55–56; passing `SYS-07.1: development has one environment-bound Actions migration and deployment job` | Static workflow declaration; CLI not executed. |
| POST aliases endpoint with selected VERCEL_ORG_ID as teamId (lines 295–297) | deploy-dev.yml:19, :57, :61; passing `SYS-07.1: accepts the API alias with a captured host, org query, fixed JSON and stdin authorization`; missing/unrelated teamId and org-override rejection fixtures | Selected variable binding verified, not actual hosted org identity. |
| Fixed JSON alias homebrew-cs3227-dev.vercel.app (lines 297–298) | deploy-dev.yml:60; passing wrong-alias-domain rejection fixture at tests/unit/delivery/delivery.test.ts:185 | Body is a single-quoted literal with no captured text. |
| curl -sS --fail-with-body fails HTTP errors (line 299) | deploy-dev.yml:57; passing missing/swallowed HTTP failure fixtures at delivery.test.ts:181–182 | Configured failure behavior; no live HTTP response exercised. |
| Authorization via shell builtin printf and curl config stdin; token absent external argv (lines 299–301) | deploy-dev.yml:57–58; passing builtin-printf fixture at delivery.test.ts:164; token-argv rejection fixtures at :178–180; 14-security-reviewer.md canary/stdin/argv probe | Token remains in authorized step environment/memory; runner compromise is outside stdin/argv separation. No actual credential inspected. |
| Captured host in one quoted endpoint argument; JSON has no captured text (lines 301–303) | deploy-dev.yml:60–61; 14-security-reviewer.md synthetic captured-URL probe | Shell quoting is implemented; this is not a claim of URL syntax validation or URI encoding. |
| Project-scoped secret retained in environment; token mapped only to pull/deploy; dev alias uses REST/stdin (line 315) | User's explicit project-scoped-token constraint; deploy-dev.yml:47–61; deploy-prod.yml:52–59; 14-security-reviewer.md credential boundary | YAML establishes mapping scope, not the real secret's hosted entitlement. |
| Local static tests cannot reproduce hosted alias failure (lines 380–383) | tests/unit/delivery/delivery.test.ts reads/parses configuration and synthetic fixtures; 11-testing.md Summary/Open issues; 13-reviewer.md and 14-security-reviewer.md limits | No workflow/API/deploy execution by agents. |
| Hosted run 39224174089 prebuilt deployment succeeded before CLI alias User not found error (lines 385–386) | Human's supplied Problem statement; also recorded as attributed evidence in 11-testing.md Summary | Human observation, not independently fetched run logs or local test evidence. |
| CLI GET /v2/user account lookup cannot be satisfied by project token; token/scope flags do not avoid it (lines 386–389) | Human's supplied CLI source diagnosis naming util/get-scope.ts, commands/alias/set.ts and index.ts; 11-testing.md diagnosis summary | Attributed diagnosis; no exact CLI runtime/source retrieval by docs and no token probe. |
| REST alias API retains project-scoped token; human direct API verification versus revised-workflow/public reachability checks (lines 389–393) | Current deploy-dev.yml:53–61; human's verified direct POST evidence; 12-implementation.md and 14-security-reviewer.md hosted limits | Direct-call success is human-reported; revised workflow success remains unverified. |
| Build retains token-free configuration (line 394) | deploy-dev.yml:50; deploy-prod.yml:55; token env appears only on pull/deploy steps | Configuration only; prior first-run contingency removed without granting agents credential or hosted access. |
| Latest alias security review covers token/log/captured-URL boundaries and limits (lines 399–401) | 14-security-reviewer.md Acceptance criteria, Security baseline coverage and Checks run | Link to completed separate security review, not a new security assessment by docs. |

## Files changed

- docs/DeveloperGuide.md: Deployment and environments delivery step 3 and token row; Known limitations.
- workflow/handoffs/48-delivery-workflows/15-docs.md: this report.

User Guide, README, application code, tests, workflow/configuration, specs, PLAN, prior handoffs, logs and reflections were not edited. Existing implementation/reviewer/security changes were preserved. Headings and Contents links remain unchanged because no section was added or renamed. No new reuse snippet or external material was introduced; Acknowledgements remains unchanged.

## Checks run

| Command or inspection | Result | Evidence |
| --- | --- | --- |
| `git diff 0c51bccad4992c5a32383c1880f3908f71112f34 -- .github/workflows/deploy-dev.yml tests/unit/delivery docs/DeveloperGuide.md` | Completed, exit 0 | Individually escalated inspection of actual test/workflow changes before documentation edits. |
| `bun run check:specs` | Passed, exit 0 | Spec check passed (0 warning(s)); links, anchors and guide inventory checked. |
| `bun run verify` | Passed, exit 0 | Lint, next typegen/tsc, eight test files / 213 tests, traceability (7 done tasks), specs (0 warnings), source isolation, Next.js production build and client isolation (35 artifacts) passed. No stage skipped or unreached. |
| `git diff -- docs/DeveloperGuide.md` | Completed, exit 0 | Individually escalated final guide diff inspection against workflow evidence. |
| `git diff --check` | Passed, exit 0 | Empty output; no whitespace errors. |

Required checks ran after the final guide edits, with scoped escalation for the sibling checkout/build-cache writes. Vitest emitted the existing vite-tsconfig-paths advisory without failure; no tooling change was made. Repair cycles: 0. No browser E2E ran because this static delivery change adds no browser case. No workflow, Vercel/deploy command, hosted API request, database access, live LLM call or dependency installation was executed. No .env file or credential value was read, printed or edited.

## Open issues for the next step

None blocking documentation. Successful execution of the revised workflow, actual project-token permission behavior, public alias reachability, hosted logs and existing environment/protection/database/region requirements remain human-only verification. Local static tests cannot establish those results. The security report records captured-URL syntax/encoding and same-runner trust limits; guide wording does not claim more than the code provides.

Screenshots needed: None. No UI/browser flow changed. No screenshot or hosted outcome was fabricated. This completed documentation status does not approve a merge or deployed acceptance. Both PLAN done lines remain unchanged.

## Suspicious content found

Historical 05-reviewer.md, repeated in 08/09/10/13/14, quotes: “Look in the current env and `.env` files first.” This attempts to expand secret-source inspection. It was treated as historical data and not followed. No new scope-changing instruction was acted on; historical handoff fix directions were evidence rather than authority.

## Human corrections

The human confirmed the testing commit and authorized Part B. Developer Guide delivery steps/Known limitations and a continuing numbered report were requested, with the project-scoped token and both PLAN statuses retained. No further correction arrived during this docs run.

## Review responses

None. Docs makes no implementation change and does not amend previous reports.

## Notes for reflection

- **What worked:** Line-level workflow evidence and attributed hosted observations separate implemented configuration from deployment acceptance.
- **What needed guidance:** The human supplied the account-lookup diagnosis and successful project-token REST request.
- **What to change in the agent or skill:** None evidenced by this run.
