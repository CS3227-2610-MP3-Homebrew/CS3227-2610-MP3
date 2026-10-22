# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #63 / T-33, paired with #62 / T-32
- **Spec IDs:** ADM-04.1–ADM-04.18; relevant SEC baseline and evaluation cases listed below
- **Date:** 2026-10-22
- **Branch:** feat/62-moderation-assistant
- **Base commit:** 4ff212f3f41e45805739bbd04f643915fa4c6247 (`upstream/master`)
- **Reviewed HEAD:** 10a3f5d5f39951b5084de1794c7543e4202d19e1 plus the final uncommitted implementation/docs and supplementary unit test
- **Implementation report:** `02-implementation.md` (completed, including Self-review)
- **Model / reasoning:** configured security-reviewer (`gpt-6.1-sol`, high)
- **Status:** completed

## Summary

No confirmed security findings in the reviewed scope.

**Overall:** pass

The reviewed feature preserves session/RLS authorization before AI admission,
minimal untrusted review context, whole-result validation, inert rendering,
durable bounded dispatch, and independently authorized per-review mutations.
No P0/P1 finding requires a fix round. This assessment does not establish that
the application is secure or approve a merge/deployment.

Reviewed the base-to-working-tree pair diff, including committed ADM-04 tests
and untracked implementation files, with supporting unchanged authentication,
RLS, manual moderation, shared LLM/admission/audit code and contracts. The
approved story is present on the selected base (`5cc512e`, merged Admin specs).
The caller's recorded final-tree verification and browser results are used as
authorized for this single-agent workflow; no review.sh or full verification
was rerun by this reviewer.

## Findings

### Blocking

None substantiated.

### Non-blocking

None substantiated. Classification quality and live-provider compatibility
remain unmeasured limitations, not evidence of a security-boundary failure.

## Acceptance criteria

Review status here means security assessment completed; this is not a separate
claim to own or reimplement the pair's ADM or shared SEC tests.

| Criterion | Status | Evidence |
| --- | --- | --- |
| ADM-04.1 | completed | `moderation-table.tsx:42–49,62–64`: one visible-page POST, in-flight guard and empty disablement; server `readAiRequest` bounds a strict selection before run; no pagination/retry loop |
| ADM-04.2 | completed | Client complete-ID validation at lines 54–57 and React text rendering at 71; highlight affects presentation only; triage code exposes no domain-write interface |
| ADM-04.3 | completed | `review-actions.tsx:6,10–21,40–42`: fixed quick picks, own reason state, explicit confirmation and action/reason-only request; no model-reason assignment or apply-all |
| ADM-04.4 | completed | Domain handler lines 38–40 verifies identity/Admin independently of UI/proxy; `auth/session.ts` calls Auth getUser and reads protected profile; manual route repeats checks |
| ADM-04.5 | completed | Session source adapter lines 64–71 plus `reviews_read`/`private.review_permission` derive workspace permission; incomplete source rejects whole selection with uniform 404 at line 46 |
| ADM-04.6 | completed | Same production code for main/kit; protected workspace RLS and actor-bound run metadata; shared quota RPC uses actor-specific and environment-global windows |
| ADM-04.7 | completed | Existing strict manual reason schema and `moderate_review` RPC unchanged; RPC locks current review, checks workspace/state, and atomically writes one separate Admin audit |
| ADM-04.8 | completed | Existing manual current-state checks remain authoritative; conflict callback removes only affected advice and shows server current-state feedback; advice is not a transition input |
| ADM-04.9 | completed | `server/reviews/moderation.ts` strict action/reason body excludes labels; server/RPC never consult advice for authorization or allowed transitions |
| ADM-04.10 | completed | `llm/schemas.ts:63–70` enforces exact complete IDs/labels/fields; operation validates the bounded complete response before delivery; no repair or partial-result path |
| ADM-04.11 | completed | Shared disable/missing-key precedence precedes admission/cache/provider; typed fallback contains no labels; manual controls remain independent |
| ADM-04.12 | completed | `ai-state.ts:181–190` binds run/provider admission to fresh server operation identity; shared atomic quota RPC and 429 mapping; no retry in new caller |
| ADM-04.13 | completed | Source failure is private 503 before run; AI failures use shared sanitized fallback; no unadmitted dispatch path; audit readiness is checked before provider attempt |
| ADM-04.14 | completed | Strict empty/duplicate/size/Ref schema and pending membership check at domain lines 35–47 precede run; no no_source_data branch introduced |
| ADM-04.15 | completed | Tab/page-keyed client state; no storage/cache API; row-specific removal; pagehide abort and persisted pageshow clearing; shared moderation path has no cache read/write/publication |
| ADM-04.16 | completed | Production select contains only id/text/state; LLM input projects id/text only; system prompt and canonical JSON data are separate; provider request has no tools or mutation capability |
| ADM-04.17 | completed | Explicit seven method exports, exact trusted Origin, bounded JSON and strict schema; private/no-store JSON errors; UUID storage filtering does not interpolate raw SQL or URLs |
| ADM-04.18 | completed | `ai-audit.ts` and AI SQL use strict allowlisted metadata; feature passes no review/reason/provider body into audit; Admin audit RPC/storage is separate and untouched |

Abbreviated UI paths are under `src/app/admin/moderation/`; the domain handler
is `src/server/reviews/moderation-assistant.ts`.

## Baseline security coverage

| Baseline / relevant controls | Assessment and evidence |
| --- | --- |
| Identity, vertical privilege and current authorization — SEC-01.1/.2 | Direct route verifies Auth/protected Admin profile. Source RLS uses current protected role/workspace. Shared `ai-state.ts:74,164,208` rechecks protected actor authorization before admission and delivery; SQL `ai_state` allows moderation only for Admin actor scope. No UI-only permission. |
| Horizontal/kit isolation and least privilege — SEC-01.2, SEC-10.3 | New source query uses publishable session client, not service_role. `private.review_permission` joins review→order→café to the current protected workspace. Missing/foreign batches reject as a whole before AI. Existing kit cannot create Admin/change role through these routes. |
| CSRF, request abuse and injection into conventional sinks — SEC-01.1, SEC-04.2 | Exact server-configured Origin; no forwarded-host authority. Bounded 65,536-byte JSON, strict keys and bounded distinct Ref list. UUID-only storage lookup via SDK query; no raw SQL, shell, file, redirect or model-URL sink. React escapes review/model reason text. |
| Secret isolation, minimal data and safe failures — SEC-02.1/.2 | Only stored review reference/text enters `ModerationInput`. Café, rating, timestamp, profile, order and audit fields are excluded. Server-only AI code/config; infrastructure secret client restricted to explicit RPC names. Feature errors contain fixed text, not caught source/provider details. |
| Prompt injection and confused deputy — SEC-03.1/.2, SEC-05.1/.2 | Fixed trusted system message and canonical user JSON are separate. Prompts are not relied on for access control: authorized source projection, schema gates and deterministic manual transaction enforce boundaries. Advice exposes no tools, extra read or write interface. Misclassification cannot itself mutate a review. |
| Unsafe output and overreliance — SEC-04.1/.2, SEC-05.2 | Strict server whole-result schemas and exact submitted-ID membership; bounded allowed labels/reasons. Client checks complete result again and renders text. Highlight does not open/submit an action, copy a reason or bypass independent reason/state/workspace checks. |
| Replay/races/resource/cost abuse — SEC-06.1/.2/.3, SEC-08.2 | Server generates operation UUID; shared run/provider admission uses durable atomic environment/actor/feature caps, current roles and database clock. Native transport makes one attempt with no SDK retry, 30-second timeout, bounded source/output and cancellation. Manual mutation remains row-locked/transactional. No quota replay identity is accepted from HTTP. |
| Disable precedence/private reuse — SEC-07.1/.2, SEC-08.1 | Shared operation checks disable before admission/dispatch/delivery. Moderation supplies no cache callbacks or publication callback; HTTP and fetch are no-store. Suggestions are only client memory, keyed per tab/page, and cleared on restored history. Cache-refresh-specific semantics are not used by this feature. |
| Content-free audit and retention — SEC-09.1/.2 | Strict metadata/token projection in `ai-audit.ts:11–24` and SQL allowlist at `20261021000000_ai_state.sql:140–156`; raw text/reason/provider content absent. Audit readiness gates dispatch. Existing cleanup deletes AI state on its schedule and never targets separate append-only Admin audit. Scheduling remains outside this pair. |
| Supply chain/build/deployment | No package/lockfile, workflow or build configuration change relative to base. Caller reports source and 118-client-artifact isolation passing. No new dependency exposure or evidence-backed CVE assertion. Hosted settings, external packages and production deployment were not audited. |

## Evaluation-case coverage

These rows combine static control-flow inspection with inspected tests and the
caller's recorded final-tree pass. No live classifier quality inference follows
from fake-output agreement.

| ADM case | Relevant shared case(s) | Evidence / scope limit |
| --- | --- | --- |
| ADM-04-E01 | E-06/E-13 | Ordinary five-label fake result is inert advice; explicit ordinary confirmation remains required. Actual natural-language quality is unmeasured. |
| ADM-04-E02 | E-04/E-16 | Same main/kit path and RLS source/confirmation controls; kit HTTP tests and five-label fake rendering. Seed/model classification accuracy is not established. |
| ADM-04-E03 | E-04/E-16 | Review injection remains encoded source text; no tools, foreign source IDs or automatic action. Provider capture and inert browser tests inspect this boundary. |
| ADM-04-E04 | E-05 | Separate foreign/duplicate/missing provider fixtures exercise shared complete-result rejection; schema/reference control confirmed in code. |
| ADM-04-E05 | E-13 | Forged label is excluded from ordinary action schema; actual HTTP test repeats ordinary state/reason/workspace validation. |
| ADM-04-E06 | E-01/E-13/E-16 | Actual anonymous/wrong-role/cross-origin/kit→main/other-kit/mixed batch tests and session-RLS production adapter. |
| ADM-04-E07 | E-05/E-06 | React text sink, strict provider capabilities/schema, malformed/unknown-label/HTML/Markdown fake cases; no generated fetch/tool/write. |
| ADM-04-E08 | E-12 | Minimal server projection and inspected fake captures/accounting canaries; shared sanitized audit/errors contain no context/provider body. |
| ADM-04-E09 | E-08/E-11 | Shared durable admission tests include parallel/run/global/provider ceilings and restart; feature has one fresh operation and rejects invalid selection before invoking it. No production load test or real quota probe. |
| ADM-04-E10 | E-09/E-10/E-11 | Shared fake provider/config/timeout/overflow/429/audit-storage paths and typed UI fallbacks. Actual triage HTTP tests use disabled mode; enabled failure paths are exercised through injected shared-operation tests. |
| ADM-04-E11 | E-13 | Existing transactional state/reason checks plus stale browser conflict/removal and invalid-reason/forged-label HTTP tests. |
| ADM-04-E12 | E-11 | Empty Pending UI disables control; stale/nonempty selection schema/state checks reject before admission and expose reload feedback. |
| ADM-04-E13 | E-08/E-13 | Exact bounded visible-page request, one explicit manual action, one separate Admin audit and remaining advice lifetime; no result cache. |

Shared E-02/E-03's Customer query/café/item-label source variants are excluded
from this Admin input surface; their injection threat is represented here by
review E-04. Shared E-07's persistent-cache reuse is inapplicable because
moderation has no result cache. Shared E-14/E-15 kit creation and E-17/E-18
maintenance credentials/responses are outside the pair; no such endpoint changed.
Retrieval, embeddings, tools and persistent model memory are absent and outside
Homebrew's scope.

## Files changed

Only `workflow/handoffs/62-moderation-assistant/04-security-reviewer.md` was
created by this reviewer. No source, test, configuration, documentation, PLAN
or earlier report was edited.

## Checks run

| Check | Result | Evidence / provenance |
| --- | --- | --- |
| `git status`, `git rev-parse HEAD upstream/master`, base-to-working-tree diff/file inventory | completed | Confirmed selected base/HEAD and untracked implementation files; inspected the final tree, not only committed diff. |
| Approved spec/task/handoff and relevant installed Next.js guide reads | completed | T-32/T-33 issue mapping, merged ADM-04 story, integration/security contracts, 01/02/03 reports; route method and Server/Client guidance. |
| Entry/source/provider/output/mutation/usage/audit data-flow inspection | completed | Evidence in criterion/baseline/evaluation tables above; supporting unchanged code inspected only for this feature. |
| `git diff --check` | passed | No whitespace errors observed. |
| Dependency/lockfile/workflow/build config diff | completed | No changes relative to selected base. |
| `bun run verify` | passed — caller evidence, not rerun here | `02-implementation.md` and caller's final-tree result: 1,051/1,051 tests in 51 files, lint/typecheck, traceability/specs, production build and source/118-client-artifact isolation passed. |
| `bun run test:e2e` | passed — caller evidence, not rerun here | Final-tree full browser suite: 351/351, 2.2m; local Supabase and existing disabled/fake test setup. |
| Reviewer targeted runtime tests | not run | No suspected vulnerability required a new reproduction; no live/provider/hosted/security probe performed. |

## Open issues for the next step

No substantiated security finding or security-contract decision blocks this
pair's close-out. The human-authorized P0/P1 fix round is unused.

Coverage limits: this is a scoped static security review with caller-recorded
local fake/disabled test evidence, not an independent full-suite rerun,
penetration test, hosted configuration audit, production load test or live SoC
compatibility/quality evaluation. The evaluation file's proposed labels are not
independent human annotation or measured classifier accuracy. Correctly shaped
but wrong advice remains possible; explicit Admin confirmation and deterministic
server checks limit its authority. No external vulnerability database scan was
performed for unchanged dependencies. Scheduling AI retention and later feature
integrations remain outside this pair.

## Suspicious content found

None that expanded this review's permissions. The trusted fixed model prompt
and synthetic injection fixtures were treated as application/test data. Prior
handoff statements were checked as evidence, not executed as instructions.

## Human corrections

The human selected single-agent implementation/self-review plus exactly one
final-tree security-reviewer run, whose evidence joins close-out and whose
P0/P1 findings receive one fix round. The corrected domain-handler location is
`src/server/reviews/moderation-assistant.ts`; `src/server/http/` is shared
primitives. The human committed tests and merged master before this review.
The caller's recorded final verify is used instead of a separate review.sh
launcher in this selected mode. No further correction was required.

## Review responses

None; this report contains no finding requiring an implementation response.

## Notes for reflection

- **What worked:** Small source projection and reuse of the existing shared AI and manual transaction boundaries made authority paths explicit.
- **What needed guidance:** The human specified the independent security run and final-tree review timing for single-agent mode.
- **What to change in the agent or skill:** Keep enabled-provider seam evidence distinct from actual disabled HTTP and classifier-quality evidence in completion reports.
