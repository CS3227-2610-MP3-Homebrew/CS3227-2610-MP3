# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #60 / T-30 and #61 / T-31
- **Spec IDs:** ADM-03.1–ADM-03.18; linked SEC-05.2, SEC-09.2 and relevant SEC-10.3 domain boundaries; supporting SYS-04–SYS-06 and SYS-12
- **Date:** 2026-10-21
- **Branch:** feat/60-moderation-queue-admin-audit
- **Base ref/commit:** upstream/master / b19b2e68d6848712b52e33644c739610f7c2e04e
- **Reviewed HEAD:** ee22a953b39251ea475bcd1c9fdeecdc95fddfef, including the uncommitted application/server/migration changes
- **Status:** completed
- **Security result:** No confirmed security findings in the reviewed scope
- **Open P0/P1:** None

## Summary

Reviewed the manual moderation HTTP entry point, both Admin screens, the new review/audit migration and the narrowly relevant unchanged session, RLS, identity and cleanup foundations. Verified HEAD, base and merge base locally. The pair has no assigned SEC criterion IDs in PLAN; its approved ADM-03 contract explicitly links human confirmation and audit retention. Applied the Zero Trust and LLM baselines, plus the applicable portions of the linked security evaluation cases below.

No confirmed security findings in the reviewed scope. This is a bounded assessment, not a claim that the application is secure. The separate reviewer report `04-reviewer.md` remains **fail** for **R1 / P2**: queue-size configuration uses manual checks instead of SYS-04.2-required Zod. The current checks reject missing, malformed and out-of-range sizes; no reachable authorization, disclosure or mutation bypass was substantiated from that contract violation. This report neither duplicates R1 as a security vulnerability nor resolves it. Security-review completion does not approve merge or deployment.

## Findings

None substantiated. No security finding IDs were allocated. Open P0/P1: **none**.

## Scope and source-to-sink assessment

Changed implementation reviewed: `src/app/admin/moderation/page.tsx`, its new `review-actions.tsx`, `src/app/admin/audit/page.tsx`, `src/app/api/admin/reviews/[reviewId]/moderation/route.ts`, `src/server/reviews/moderation.ts`, the `trustedOrigin` export in `src/server/auth/account-adapter.ts`, and `supabase/migrations/20261021000002_review_moderation.sql`. Committed pair tests, fixtures, Playwright configuration and prior handoffs were evidence. Supporting unchanged files were inspected only to establish the controls these changes rely on. No repository-wide audit was performed.

References to “moderation SQL” below mean `supabase/migrations/20261021000002_review_moderation.sql`.

| Baseline boundary | Evidence and conclusion |
| --- | --- |
| Every server entry point; identity, expiry and role | `src/server/reviews/moderation.ts:31` calls `getVerifiedActor()` before mutation and rejects absent/non-Admin actors. Both page reads independently do this after `connection()`, without relying on the layout. `src/server/auth/session.ts:14` obtains a fresh session-bound client, calls Auth `getUser()` and validates the current protected profile; cached `getSession` metadata and caller actor/role fields are not authority. Runtime expiry/revocation behavior was not independently exercised in this run. |
| Direct RPC calls and vertical privilege | All three exposed functions call `private.moderation_admin()` (moderation SQL:56), which resolves `auth.uid()` against the protected current profile and requires `admin`. The migration revokes function execution from PUBLIC/anon/service_role, then grants only these three functions to authenticated callers (136–138). Helper functions are not ordinarily executable. The definer functions use an empty search path and qualified tables/functions; no dynamic SQL is built from request values. A direct authenticated RPC call does not remove the Admin check. |
| Workspace and parent ownership; main/kit parity | Mutation lookup joins review→order→café and compares the session-derived workspace at moderation SQL:76–78. Queue and audit projection scope at 105/130. No actor/workspace argument exists. Missing and foreign references produce the same NOT_FOUND result without disclosing state. Foundation composite review/order edges and `20261019000002_immutable_workspace_identity.sql` prevent relocating the scope edge; ordinary users cannot update protected profiles or create Admin roles. No main-workspace bypass exists. |
| RLS, least privilege and privileged-client separation | `createSessionClient()` uses the publishable configuration and request cookies; new code never creates a secret-key client. Foundation migrations revoke default table/function grants globally and by schema. Review SELECT remains protected by `private.review_permission`; Admins get no order-read policy. Audit RLS at moderation SQL:26–30 permits only same-workspace Admin reads. No ordinary audit INSERT/UPDATE/DELETE or review state/content write grant is added. SECURITY DEFINER access is confined to the authorized transaction and minimal projections. |
| CSRF and strict request input | `handleModeration` checks method, exact configured origin, JSON media type, streamed byte bound, strict Zod action/reason-only fields and opaque Ref bounds (moderation.ts:20–35). `trustedOrigin()` uses deployment configuration, not request Host or forwarding headers. Missing/malformed/foreign origins fail before protected reads/mutations. Extra labels, target/workspace fields and invalid actions cannot reach the RPC. SQL repeats action, Ref and exact reason constraints for direct callers. |
| Injection, rendering and other sinks | Browser reason/reference→Zod→bound RPC parameters→static SQL equality/INSERT; no query concatenation. Stored review/café text and human reason/email→validated rows→JSX text interpolation in the two pages; no HTML/Markdown interpretation or model-authored link sink. ReviewActions encodes the server-issued ID into a fixed relative API path. Navigation URLs use fixed enum values and bounded page numbers. No caller-controlled fetch destination, redirect destination, filesystem path, upload, shell, deserialization gadget or SQL execution sink was introduced. |
| Replay, races and current state | Moderation SQL:76 locks the target review, then evaluates the allowed transition matrix at 80–86. Concurrent duplicate Keep confirmations cannot both commit. Replays after a state change are evaluated against the new current state; later legitimate Hide/Restore actions remain permitted by the contract. No exactly-once promise across an arbitrary future state cycle is inferred. The client requires a separate per-review confirm action; its visible controls do not establish authorization. |
| Transactional integrity and immutable reviews | Review state update and audit insert occur in the same RPC transaction (moderation SQL:88–90); exceptions are not swallowed inside SQL. Audit failure therefore rolls back state. `private.preserve_review()` protects ID, order/customer edges, rating, text and submission time and denies deletion (35–47). Only moderation state is changed by the authorized RPC. |
| Audit integrity, retention and personal data | Actor/workspace and timestamp are server/database derived. Ordinary audit forgery is denied; the trigger rejects update/delete (48–53). The existing `ai_state` cleanup at `20261021000000_ai_state.sql:78–88` deletes only named AI infrastructure tables. Domain audit reason and acting Admin email are explicitly permitted by ADM-03; they are not forwarded into AI audit/telemetry. The new code emits no content-bearing logs. |
| Scoped Admin email projection | `admin_audit_page` joins only each selected audit entry's acting profile/Auth identity, checks Admin role, same workspace and target café workspace (moderation SQL:122–130), and projects email solely alongside audit display fields. It neither grants general Auth/profile access nor returns customer identities, full orders, review text or AI events. Raw profile reads remain self-only. |
| Private data and safe failures | Pages await request-time `connection()` before identity/data work and stream behind Suspense; no private read uses `use cache`. The unchanged role shell independently checks access. Mutation success/errors explicitly set `private, no-store`; exceptions and database failures return fixed messages and a content-free generated request ID. No submitted values, schema dumps or provider exceptions enter responses. Installed Next docs confirm request-time connection behavior and uncached Route Handler defaults. |
| Resource bounds and fail closed | Stream reader limits 65,536 UTF-8 bytes even without Content-Length, uses fatal UTF-8 decoding and cancels on overflow/abort. Reason is at most 300 Unicode code points; Ref at most 128. Queue SQL caps size at 20 plus one lookahead; audit caps at 51 rows; pages return at most configured size/50. Integer pagination prevents numeric overflow in SQL offsets. Invalid queue configuration produces a generic unavailable view, not an unlimited query. No manual-moderation rate policy is specified; AI admission quotas are not applied to these ordinary actions. No independent latency/load or slow-stream exhaustion test was run. |
| Secrets, dependencies and delivery | Review server module and session client are server-only; only ID/state props cross into ReviewActions. There is no new secret read, provider credential use, public credential prefix or privileged runtime client. `git diff` found no package/lockfile, Next configuration, proxy or CI workflow changes; the Playwright addition is the synthetic queue-size setting. No reachable new supply-chain vulnerability was substantiated; no external advisory/CVE lookup or broad dependency audit was performed. |

## Acceptance criteria

These statuses describe completed security assessment of each group, not independent re-execution of the functional suite.

| Criterion | Status | Evidence |
| --- | --- | --- |
| ADM-03.1, .2, .3, .17 | completed | Current RLS eligibility, scoped request-time queue, escaped fields, fixed quick picks and separate role checks traced above; `tests/integration/moderation/visibility.test.ts`, `tests/e2e/moderation/queue.spec.ts`. |
| ADM-03.4–.8, .12, .18 | completed | Strict action/reason input, row locking, current-state matrix, exact preserved content/reason, atomic audit and denied edits/deletes; `tests/e2e/moderation/http.spec.ts` includes transition matrix, Unicode bounds, concurrent Keep and injected audit failure. |
| ADM-03.9–.11, .16 | completed | Independent session/Admin/workspace and direct SQL authorization, exact origin, strict extra-field rejection, indistinguishable foreign/missing targets; main/kit route matrix and direct local database assertions inspected. |
| ADM-03.13–.15 | completed | Scoped projection and email access, safe rendering, separate domain ledger, append-only trigger/grants and cleanup exclusion; `tests/integration/audit/history.test.ts`, `tests/e2e/audit/audit.spec.ts`. Café audit display uses fixtures; café mutation security remains outside this pair. |
| SEC-05.2 | completed | Per-review confirm, mandatory human reason, independent authorization/current-state validation, immutable content and atomic separate ledger. Forged label extra fields are rejected. Full AI advice lifecycle is deferred to ADM-04's owning pair. |
| SEC-09.2, moderation-audit preservation portion | completed | Actual cleanup code excludes domain ledger; history test exercises AI cleanup and checks unchanged earlier domain entries. Full AI-retention enforcement was not re-audited. |
| SEC-10.3, ordinary kit Admin portion | completed | Same operations and database scope for main/kit; no Admin creation or role-update interface/grant is introduced. Kit provisioning and AI source/cache behavior are excluded. |

## LLM baseline and evaluation coverage

The only new import from `src/server/llm/` is the bounded request-body reader; importing that helper does not dispatch a model call. No AI route, provider invocation, prompt, generated result, reusable AI cache, tools, retrieval, embeddings or persistent memory is added. Review text is display data; reading it cannot trigger a mutation or another fetch. Fixed application quick picks are editable human input, with no model reason source. Therefore prompt injection has no model/capability path in this pair, and model output cannot acquire moderation authority here. Existing provider transport implementation was not re-audited.

| Evaluation case | Applicable assessment / exclusion |
| --- | --- |
| E-01 | Domain authorization analogue assessed: anonymous/wrong-role/foreign-workspace requests denied; direct database/RPC boundaries traced. AI context/cache/dispatch portions excluded. |
| E-04 | Manual human-control portion assessed through explicit confirmation and deterministic state/authority checks. Classification and submitted-model-source selection excluded; this pair never dispatches review text. |
| E-06 | Domain text rendering portion assessed: review HTML and reason markup remain inert JSX text; browser tests assert no injected image/script execution or reason element interpretation. Generated/tool-argument portions excluded. |
| E-11 | Ordinary request byte bounds, invalid queue configuration and database failure paths assessed. No new AI dispatch/admission/output/cancellation lifecycle exists; those portions excluded. |
| E-12 | Moderation ledger preservation, scoped display, secret-free error structure and new code's lack of telemetry assessed. Launcher artifact/source-isolation checks are inherited evidence, not a new canary test. Full provider/AI telemetry and retention scenarios excluded. |
| E-13 | Applicable: exact-origin rejection, strict forged-label rejection, independently authorized stale/current-state confirmation and atomic audit. HTTP and stale-confirmation tests inspected. |
| E-16 | Ordinary kit Admin scope/role and immutable-review controls assessed; stored instructions have no executable sink. Kit provisioning and AI sources/cache behavior excluded. |
| E-02, E-03, E-05, E-07–E-10 | Provider prompt/context/output, AI cache, quotas, retries and disable scenarios excluded because none of those surfaces changes or is invoked. Inert stored text is covered above without claiming a model injection evaluation passed. |
| E-14, E-15, E-17, E-18 | Kit creation, once-shown credentials and maintenance authentication/response contracts excluded: no such entry point or secret handling changes. Reading the existing cleanup deletion list does not re-audit maintenance authentication. |

ADM-04's related manual-boundary cases ADM-04-E05 and ADM-04-E11 have source/test evidence for ordinary forged-body, reason and stale-state rejection. No ADM-04 model or suggestion lifecycle acceptance is claimed. SEC-01–SEC-04, SEC-06–SEC-08 and remaining SEC-09/SEC-10 AI/provisioning portions have no newly applicable executable surface beyond the shared domain controls explicitly recorded above. Overreliance is limited here by requiring an authorized human action; review text itself makes no moderation decision.

## Files changed

Only `workflow/handoffs/60-moderation-queue-admin-audit/05-security-reviewer.md` — this report. No application, tests, configuration, migrations or earlier handoffs changed by this reviewer.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `git status --short`, `git rev-parse HEAD upstream/master`, `git merge-base upstream/master HEAD` | Inspected | HEAD and base match supplied values; merge base is the supplied base. Working-tree application/server/migration files remain uncommitted. |
| Read-only `git diff`, `git ls-files --others --exclude-standard`, `rg`, `cat`, `sed`, `nl` | Completed | Inspected tracked/untracked pair scope, linked approved contracts, implementation/tests, scoped supporting migrations and installed framework guides. No specs/PLAN/package/lockfile/CI changes found. |
| `bun run verify` — launcher evidence in `04-reviewer.md`, not executed by this reviewer | Passed, attributed | Latest reviewer records fresh launcher exit 0: lint, typecheck, 38 files / 951 tests, traceability, specs, source isolation, production build and artifact isolation all passed on the unchanged reviewed tree. |
| `bun run test:e2e tests/e2e/moderation tests/e2e/audit` — testing evidence in `02-testing.md`, not executed by this reviewer | Reported 86/86 passed, attributed | Final migration reset and frozen implementation precede the reported run. Inspected relevant HTTP, browser, direct SQL and retention assertions. |

Installed Next.js guides read locally: `01-app/01-getting-started/15-route-handlers.md`, `01-app/03-api-reference/04-functions/connection.md` and relevant data-security/authentication-with-cache-components sections. Framework recommendations were treated as evidence about behavior, not permission to change project policy.

No full verification rerun, targeted exploit/test execution, build, installation, reset, database query or external probe was performed by this reviewer. No suspected vulnerability remained that required a targeted test. No `.env*` file, live provider or hosted database was accessed. Ordinary source inspection and inherited suite evidence establish the conclusions; there is no independent executed exploit claim.

## Open issues and residual limits

- `04-reviewer.md` R1 / P2 remains open; the pair's independent review is fail despite no confirmed security finding here.
- Runtime session revocation, direct external Data API calls, infrastructure HTTP cache configuration, slow-stream/load behavior and broad dependency advisories were not independently exercised. Static controls and the supplied local test evidence were assessed; no hosted/deployed claim is made.
- Café mutations, future review creation, AI triage lifecycle and privileged maintenance/role changes remain owned by their respective tasks. Current audit projection assumes a matching acting Admin profile and retained target relationships; no new ordinary role/profile/target-deletion permission exists in this scope.
- No missing permission or public-contract decision blocked the assessed domain security boundaries. No pre-existing vulnerability was promoted into a finding without an evidenced reachable impact.

## Suspicious content found

None that attempted to expand scope, change permissions or skip checks. Prior handoff verification-reuse commentary was treated as historical evidence; the latest reviewer launcher evidence was used as required by this assignment.

## Human corrections

None during this assessment. The assigned single review, write-only-own-report scope and no-rerun verification boundary were followed.

## Review responses

None; this is the first dedicated security report for this pair. No implementation repair occurred during the assessment.

## Notes for reflection

- **What worked:** Tracing direct RPC access alongside the browser/HTTP path established that UI controls are not the only authorization layer; separate audit cleanup evidence addresses the linked retention contract.
- **What needed guidance:** None beyond the supplied scope and frozen-tree verification evidence.
- **What to change in the agent or skill:** None evidenced by this bounded run.

## Stage timing

- **Start:** 2026-10-21 10:41:50 UTC (18:41:50 Asia/Singapore), first recorded assessment timestamp.
- **Assessment cutoff:** 2026-10-21 10:43:51 UTC (18:43:51 Asia/Singapore), before report persistence.
- **Assessment interval:** 2 minutes 1 second; report-writing time is additional.
- **Report end:** 2026-10-21 10:46:03 UTC (18:46:03 Asia/Singapore).
- **Total recorded wall-clock interval:** 4 minutes 13 seconds, including report writing and persistence verification.
