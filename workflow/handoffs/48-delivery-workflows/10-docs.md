# Docs report

- **Agent:** docs
- **Issue:** #49 / PLAN T-18, paired with #48 / T-17
- **Spec IDs:** SYS-07.1
- **Date:** 2026-10-19
- **Branch:** feat/48-delivery-workflows
- **Base ref:** upstream/master
- **Base commit:** dd0fb3af846268b37a5624c28505f8abe9381fc8
- **Reviewed HEAD:** db1934fd759cc78ef83d6f3ebfa0ee2bfd9812a0
- **Status:** completed

## Summary

Documented the reviewed delivery configuration, human setup and verification
requirements, credential scopes and known limits. Tidied the production workflow
inventory row and updated the Developer Guide contents links. README adds one
short pointer. User Guide inspection found no statement made false by this
configuration change; it remains unchanged. No user-facing feature was added.

Read every report 01 through 09, root AGENTS.md, docs instructions/skill,
handoff conventions/template, T-18 and its approved delivery contract. The
merge base equals the selected base, and the technical specification is unchanged
from that base. Latest independent review 08 is completed/Overall pass; security
re-check 09 is completed with SR-01 and the Bun observation resolved and no open
confirmed security finding. Earlier report claims were checked against current
workflow files rather than treated as evidence of hosted success.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-07.1 / T-18 documentation describes implemented delivery configuration | completed | Claim-evidence rows below identify current code and static tests. |
| Human execution/hosted verification remains required | completed | Developer Guide distinguishes configured YAML from hosted prerequisites and observed outcomes; the human setup and limitations sections claim no deployed acceptance. |
| Final documentation checks | completed | check:specs passed with 0 warnings; exact verify passed all stages, 98 tests and production build. |

Claim-evidence table: Developer Guide references below use the final guide line
numbers. Spec references establish human requirements only, never actual hosted
configuration. All workflow references are current reviewed code. No User Guide
claim was changed.

| New or changed claim / location | Evidence | Verification boundary |
| --- | --- | --- |
| Guide Contents links | docs/DeveloperGuide.md:5 and corresponding existing section headings | Navigation only. |
| Production Workflow-files row | .github/workflows/deploy-prod.yml:3, :16, :38, :42, :52 | Tag trigger, ancestry, migrations, build/deploy. |
| Static configuration versus hosted acceptance (guide:263) | .github/workflows/deploy-dev.yml:3; deploy-prod.yml:3; 08-reviewer.md Summary and 09-security-reviewer.md Open issues | No hosted-success claim. |
| Development trigger/binding/Preview/dev alias (guide:272) | .github/workflows/deploy-dev.yml:3, :16, :47, :55 | Repository development environment case in tests/unit/delivery/delivery.test.ts:22. |
| Production trigger/binding/target (guide:273) | .github/workflows/deploy-prod.yml:3, :16, :52, :59 | Repository production environment case in delivery.test.ts:22. |
| Required homebrew-dev/homebrew-prod and Singapore mapping (guide:272–273) | workflow/specs/TECHNICAL-SPEC.md:187–188 | Required database mapping; actual secret-selected projects/regions unverified. |
| Supabase 2.121.0 then Node 24 then packageManager Bun (guide:275) | deploy-dev.yml:25–31; deploy-prod.yml:26–32; package.json:5 | Configured sequence; hosted PATH not executed. |
| Bun mismatch stops job (guide:277) | deploy-dev.yml:32–34; deploy-prod.yml:33–35 | Explicit comparison; no ignored failure. |
| Vercel 64.5.0 installed globally (guide:277–278) | deploy-dev.yml:35–36; deploy-prod.yml:36–37 | Command declaration; CLI not installed by docs agent. |
| SHA actions/read-only contents/no persisted checkout credentials (guide:278–279) | deploy-dev.yml:7–8, :22–31; deploy-prod.yml:7–8, :22–32 | Also repository hygiene case, delivery.test.ts:25. |
| Distinct non-cancelling groups (guide:279–280) | deploy-dev.yml:10–12; deploy-prod.yml:10–12 | delivery.test.ts:55 includes negative concurrency fixtures. |
| Full history and tag-to-master ancestry before migrations (guide:282–284) | deploy-prod.yml:25, :38–47 | delivery.test.ts:55 negative cases cover missing/reversed/late/ignored ancestry. |
| Migration URL, answer-yes, SQL guard and exact skip message (guide:286–289) | deploy-dev.yml:37–45; deploy-prod.yml:42–50 | Static code; delivery.test.ts:130 guard fixture. |
| Migration failure blocks deployment, no seed/reset/demo credentials (guide:289–290) | deploy-dev.yml:37–56; deploy-prod.yml:42–59; tests/unit/delivery/workflow-contract.ts:96–113 | delivery.test.ts:55 negative migration/seed/failure cases. Default step success gating remains intact. |
| Frozen install followed by own-target pull (guide:291–292) | deploy-dev.yml:46–47; deploy-prod.yml:51–52 | Repository target cases. |
| Build then prebuilt deploy, prod-only flags, captured quoted dev URL (guide:293–295) | deploy-dev.yml:47–56; deploy-prod.yml:52–59 | Repository cases and negative target/order/flag/alias fixtures. |
| One job binds both migrations and deployment to production approval (guide:297–298) | deploy-prod.yml:14–59; TECHNICAL-SPEC.md:209–215 | Hosted reviewer requirement is a human prerequisite. |
| No manual dispatch; rerun delivery (guide:298–299) | Both workflow on blocks at :3–5; 09-security-reviewer.md baseline replay row | No new trigger/redeploy automation introduced. |
| CI stays verification/tests only and credential/deploy free (guide:299–300) | .github/workflows/ci.yml:1–31; delivery.test.ts:25 | Static hygiene case checks this boundary. |
| sin1 and Git deployments disabled (guide:300–301) | vercel.json:2–4; delivery.test.ts:29 | Local configuration; hosted region/settings still human verified. |
| No credential values in documentation/source (guide:303) | AGENTS.md Code and security; docs agent Content rules | Documentation rule; no values read or reproduced. |
| Vercel token environment secret on API steps only, env auth (guide:307) | deploy-dev.yml:47–56; deploy-prod.yml:52–59; TECHNICAL-SPEC.md:197–202 | 09-security-reviewer.md confirms SR-01 resolved; env does not isolate compromised same-runner tools. |
| Database environment secret only in migration with quoted argument (guide:308) | deploy-dev.yml:37–42; deploy-prod.yml:42–47; TECHNICAL-SPEC.md:197–204 | Actual secret content unverified. |
| Org/project environment variables at job scope, same project required (guide:309) | deploy-dev.yml:18–20; deploy-prod.yml:18–20; TECHNICAL-SPEC.md:187–188, :197–202 | YAML namespace/scope verified; actual identity unverified. |
| Setup/install/ancestry/migrations/build token mappings absent (guide:311–313) | Complete current deploy-dev.yml:1–56 and deploy-prod.yml:1–59 | API-only direct mappings confirmed by security report 09. |
| Human environment ref/approval/self-review/bypass setup (guide:318–322) | TECHNICAL-SPEC.md:192–196; workflow environment bindings :16 | Setup instructions, not a claim settings are already configured. |
| Environment-only storage/no repo-org secret copies (guide:323–324) | TECHNICAL-SPEC.md:197–202 | Human configuration requirement. |
| Session-pooler port/user/password form and excluded direct/transaction connections (guide:325–327) | TECHNICAL-SPEC.md:203–208 | Human secret selection; secret URL never inspected. |
| Single Hobby project/sin1/Git off, prod domain and public dev Protection off (guide:328–331) | TECHNICAL-SPEC.md:224–229 and :187–188; vercel.json:2–4 | Project, domain, Protection and region outcomes unverified. |
| Separate Singapore databases and target application values/separate SoC keys (guide:332–334) | TECHNICAL-SPEC.md:187–188, :230–238 | Human configuration instructions only. |
| Four application Secret types; others Config; links to names/all policy keys (guide:335–339) | TECHNICAL-SPEC.md:230–238, :277–283 | No implemented validation/runtime claim; links defer exact configuration to owning contract. |
| Runtime-only application secrets, no build-time secrets (guide:340–341) | TECHNICAL-SPEC.md:221–223; current workflows omit application secrets | Contract requirement, explicitly not verification of unimplemented runtime consumers. |
| Production CRON_SECRET equality, currently unused and T-27 maintenance ownership (guide:342–344) | TECHNICAL-SPEC.md:199–200; workflow/PLAN.md T-27 Work; both complete workflow files | Explicitly describes absent extension, never availability of maintenance. |
| Human master merge/tag/teammate approve/result verification sequence (guide:345–349) | Workflow triggers :3–5, prod ancestry :38–41; TECHNICAL-SPEC.md:192–215; PLAN T-18 Work/acceptance criteria | Instructions for human execution; no hosted outcome claimed. |
| Agents never deploy/run workflows/access hosted DB/live LLM; setup and execution human-only (guide:351–353) | AGENTS.md Code and security/Git; PLAN T-17/T-18; TECHNICAL-SPEC.md:243–245 | Authority comes from agent rules/user task, not spec granting permissions. |
| Local static tests and verify do not run delivery commands (guide:353–355) | delivery.test.ts:1–148 reads YAML/JSON, mutates in-memory fixtures only; package.json:17 verify script | Docs verification executes local checks only. |
| Static/hosted/PATH/runtime limits and token-free build contingency (guide:372–377) | 07-implementation.md Open issues; 08-reviewer.md Open issues; 09-security-reviewer.md Open issues | Exact CLIs and hosted runner not executed; human decides token addition only if first run proves need. |
| Step env residual same-runner supply-chain trust/global CLI outside lockfile (guide:377–381) | Current workflow global install commands; 09-security-reviewer.md Credential exposure/Open issues | Verified configuration limit; no alleged compromise/CVE. |
| README short delivery/setup pointer (README.md:24) | docs/DeveloperGuide.md Deployment and environments section | Link only; no additional product claim. |

## Files changed

- docs/DeveloperGuide.md: Contents, production Workflow-files row, Deployment and environments, Known limitations.
- README.md: one short Developer Guide pointer.
- workflow/handoffs/48-delivery-workflows/10-docs.md: this report.

User Guide, source, tests, workflows/configuration, specs, PLAN, earlier handoffs,
logs and reflections were not edited. Existing untracked 08-reviewer.md and
09-security-reviewer.md were preserved. No new reused file/snippet/idea was
introduced; Acknowledgements reuse inventory remains unchanged.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Initial Git status/ref/merge-base and approved-contract diff | exit 0 | Only pre-existing untracked reports 08/09; supplied HEAD/base match; merge base is selected base; TECHNICAL-SPEC unchanged from base. |
| bun run check:specs | exit 0 | Spec check passed (0 warning(s)). |
| bun run verify (exact command; approved escalation for sibling-worktree caches) | exit 0 | eslint, typegen/tsc, four files/98 tests, traceability (3 done tasks), specs (0 warnings) and Next.js production build passed; four static pages generated. No stage skipped or not reached. |
| git diff --check | exit 0 | Empty output on documentation edits. |

The existing Vite tsconfig-paths advisory was informational. Repair cycles: 0.
No workflow, delivery CLI, hosted database/API, live LLM, dependency install or
browser/e2e execution ran. This is completed documentation, not merge or deployed
acceptance.

## Open issues for the next step

No code/spec discrepancy was found in the documented configuration. Hosted
setup and execution remain unverified and unavailable to agents. Limits include
production approval/ref/bypass protections, credential placement and actual
values, target/database identity and regions, application Secret/Config settings,
domains, migration/deploy outcomes and pinned CLI/PATH behavior. Token-free build
authentication remains the explicitly human-owned first-hosted-run contingency.
CRON_SECRET/post-deploy maintenance is outside this foundation implementation.
No screenshot is needed for this static configuration change; no browser flow
or UI was added and none was fabricated. No e2e command is required for this
configuration-only pair. PLAN close-out belongs to the coordinating session.

## Suspicious content found

Historical 05-reviewer.md (also quoted in 08/09) records an external instruction:
“Look in the current env and `.env` files first.” It was treated as data and
not followed; no .env contents, process environment or credential values were
read. Earlier reports' fix directions were treated as historical data, not scope
or execution authority.

## Human corrections

The human requested evidence for Developer Guide/README claims as well as any
User Guide claim, a tidy production inventory row, no User Guide addition unless
existing text was false, and documentation only after passing independent and
security review. Those constraints were followed.

## Review responses

None; this documentation run made no implementation changes. Report 09 records
the security re-check of the already committed fixes.

## Notes for reflection

- **What worked:** Current workflow line evidence separates configured behavior from human-only hosted setup requirements.
- **What needed guidance:** The human specified delivery coverage and the token-free build contingency.
- **What to change in the agent or skill:** None evidenced by this run.
