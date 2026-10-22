# Implementation report

- **Agent:** implementation (Codex, single-agent coordinating session)
- **Issue:** #76 (T-45), paired with #75 (T-44)
- **Spec IDs:** CUS-05.1–CUS-05.10
- **Date:** 2026-10-22
- **Branch:** feat/75-collected-order-reviews
- **Base commit:** 3949b70571ebd78e898d0a69797c59160ef76fa6 (origin/master)
- **Testing commit / reviewed HEAD:** 7b511ae (test(CUS-05): cover collected-order review submission)
- **Status:** completed

## Summary

Single-agent mode: added Customer review creation and own-review reads, the Review form linked from collected My orders, immutable original feedback display including hidden reviews, strict public HTTP boundaries and an additive transaction-safe database RPC migration. Updated User Guide, Developer Guide and README to describe the implemented flow and retained owner-fulfilment limitation. The final full production-browser run passed all 501 cases (9.9 minutes), including all 62 review cases, without skips. Final `bun run verify` passed all 1,088 tests in 57 files (501.31 seconds), lint/typecheck, traceability, specs, the production build and isolation of 133 client artifacts. No required local runtime check remains; T-44/T-45 are done, with close-out traceability and spec checks passing.

The approved CUS-05 story and integration contract are unchanged from origin/master; their merged history and issue mappings were established by the testing gate. The human committed T-44 as 7b511ae and requested continuation. No new dependencies, applied-migration rewrites, auth/role contract changes, moderation writer or AI integration were introduced.

Three repair cycles used: (1) the first browser build's isolation check rejected a client import from the privileged reviews directory; shared schemas were moved to `src/lib/reviews/fields.ts`, retaining server-only errors/adapters, and isolation plus eight focused tests passed; (2) the first real 62-case browser run passed 61 cases but exposed an immediate-count test-helper race before SYS-05.1's streamed form arrived; the helper now waits for an accessible supported rating control; (3) that exposed a global alert selector matching both the correct feedback and Next's route announcer; it is now scoped to main content. All four page cases pass after these two test corrections. Neither change modifies a behavior assertion or the product's rendering/access requirements. No further implementation repair cycle is available in this run.

The two test corrections use the orchestrator's single-agent exception for a test conflicting with its governing contract: CUS-05.10 requires retained values and safe accessible feedback, while SYS-05.1 explicitly streams private content behind Suspense. It does not require controls at initial navigation-shell arrival or exactly one alert across framework chrome and form content. The corrections need a separate human test commit; all other committed T-44 files and its handoff are untouched.

Initial local reset was blocked because Docker Desktop was manually paused. The human resumed it; the subsequent local reset passed. Node-dependent checks prepend the bundled Node runtime directory to PATH and use approved local Docker access. No `.env*` file, hosted service, live LLM, deployment, commit or push was used.

## Acceptance criteria

These rows trace code to the focused passing tests; the passing final whole-suite results are recorded under Checks run.

| Criterion | Status | Code and evidence |
| --- | --- | --- |
| CUS-05.1 | completed | `20261022000003_customer_reviews.sql:26` validates own collected state, serializes café/order access, inserts with current protected Customer and database time; existing order/review relationships derive café/workspace. Main/kit, exact text, rating/code-point boundaries, suspension/menu deletion and insertion-fault rollback cases pass in T-44 browser tests. |
| CUS-05.2 | completed | Migration `:51` denies every non-collected own state with STATE_CONFLICT. All five parameterized uncollected-state API cases pass; the page offers no creation form for an ineligible state. |
| CUS-05.3 | completed | Migration `:47` locks the order, `:51` checks any existing review and `:56` uses an insert under the existing unique order constraint. Identical/different concurrent submissions, retries and hide/restore uniqueness cases pass. Own GET uses invoker/RLS and includes hidden state. |
| CUS-05.4 | completed | Mutation derives authorized order/café/workspace before locking; own read filters both order and review author under RLS. Same-workspace peer, other-kit and missing create/read API denials, private foreign page and hidden suspended RLS cases pass. |
| CUS-05.5 | completed | Migration `:40`, `:49` and `:56` derive/recheck protected actor/workspace and authorized purchase instead of accepting them as fields. Strict field injection browser cases and independent direct-RPC internal validation cases pass. No raw write grant added. |
| CUS-05.6 | completed | Migration `:57` writes pending with no supplied state. Existing moderation/visibility and immutability code remains authoritative. Initial pending, state injection, hidden own GET and public hide/restore read cases pass. |
| CUS-05.7 | completed | Review route supplies only GET/POST business operations and explicit 405 responses for unsupported writes. No update/upsert/delete path added. Direct SQL immutability/denial and HTTP PUT/PATCH/DELETE cases pass; existing triggers are unchanged. |
| CUS-05.8 | completed | `review-display.tsx:10` renders text with React text nodes and whitespace-preserving wrapping. T-44 markup/instruction page case passes, including no img execution or AI/external call. Existing ADM-03/04 classification remains outside this pair. |
| CUS-05.9 | completed | `customer-http.ts:15` verifies Auth and current protected Customer role; RPC independently checks role/workspace and rechecks a locked profile. Anonymous, Owner/Admin and changed-role API tests pass; direct owner RPC is denied. |
| CUS-05.10 | completed | `fields.ts:5`, `customer-http.ts:24` and `:36` enforce strict types/keys, nonblank code-point limits, bounded Ref/query and streamed 65,536-byte JSON, exact Origin and media type. Strict field/transport/query/streamed-byte tests pass; corrected form test preserves whitespace-only input/rating then submits corrected text. |

## Files changed

- `src/lib/reviews/fields.ts`: client-safe shared review schemas, types, timestamp normalization and fixed field feedback.
- `src/server/reviews/customer-{schema,query,source,http}.ts`: server-only error boundary, strict raw-query marker, session-bound source/RPC decode, current actor and safe transport handling.
- `src/app/api/customer/orders/[orderId]/review/route.ts`: public GET/POST adapters and method denials.
- `src/app/customer/orders/[orderId]/review/{page,review-form,review-display}.tsx`: authorized retained context, form and immutable own-review view.
- `src/app/customer/orders/order-list.tsx`: collected-order review link.
- `src/proxy.ts`: narrow raw-query preservation call for review endpoints, alongside existing catalogue/order markers. It does not authorize.
- `supabase/migrations/20261022000003_customer_reviews.sql`: additive review projection, invoker read and restricted definer creation. No existing migration, table permission or trigger changed.
- `tests/unit/customer-review-internals.test.ts`: five supplementary internal tests with no criterion IDs, including independent direct-RPC validation/role denial, integral JSON 4.0, Unicode/precision and raw-query flags.
- `tests/e2e/reviews/pages.spec.ts`: the two narrowly documented single-agent test-contract corrections above; no behavioral assertion weakened.
- `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `README.md`: implemented-behavior guidance and removal of stale review-unavailable wording. No new workflow file or external reused material; inventory and reuse totals unchanged.
- This report. Close-out changes only T-44/T-45's Status lines, after passing completion evidence.

## Self-review

Reviewed the merge-base-to-working-tree runtime, migration, tests and guide changes against origin/master 3949b70 and every CUS-05 criterion, applying sdd-review's criteria and the security reviewer's baseline checklist within the selected single-agent mode. No independent reviewer or security worker was used.

| Finding | Priority | Resolution and evidence |
| --- | --- | --- |
| SR-01: client form imported validation through a privileged server path | P2 | Fixed by moving pure schemas/feedback/types to `src/lib/reviews/fields.ts`; server error module is explicitly server-only. Source isolation and subsequent production browser builds pass without changing the checker. |
| SR-02: rating helper assumes private form is in the initial navigation shell | P2 | Fixed only the helper's readiness by waiting for a supported accessible control. SYS-05.1 permits/requires streamed private content. The product keeps request-time authentication and streaming; page cases pass. |
| SR-03: feedback assertion counts framework route-announcer alert as form feedback | P2 | Scoped the same text assertion to main content. CUS-05.10's actual retained-value and safe-feedback checks remain intact. Corrected invalid-input/recovery page case passes. |

**Overall:** pass (self-review; final verify and all 501 browser cases passed).

No open P0/P1 finding in the reviewed new runtime scope. Coverage and limits:

- Identity and authorization: page repeats the Customer account gate; both API operations verify Auth/current profile independently. Ordinary queries use fresh publishable-key session clients with RLS. Definer creation repeats role/actor/workspace/parent/state checks, including direct RPC calls, and locks/rechecks the protected profile before writing.
- Least privilege: no raw order/review/profile write grants, ownership setters or client secrets. New functions have empty search paths, explicit revokes and authenticated-only execution. Actor/café/workspace relationships derive from the authorized purchase. Own-read projections omit actor/workspace fields; public projections remain unchanged.
- Integrity/races: same-order writes serialize under the order lock; café-before-order ordering matches existing suspension/order writers. Any prior hidden/kept/pending review conflicts and retains the unique reference. Plain insert plus transaction rollback prevents upsert or partial creation; the injected SQL failure case passes.
- Untrusted input/output: strict Zod input and independent RPC JSON validation, actual UTF-8 body bounds without relying on Content-Length, fixed safe error strings, parameterized SQL and bounded references. No dynamic SQL, raw HTML/Markdown sink, arbitrary redirect/URL, upload, shell call or caller-derived authority. Text rendering is escaped and remains original data.
- CSRF/cache/replay: exact trusted deployment Origin on mutations; private/no-store JSON; no `use cache`, shared client or customer-data cache. Raw-query assertions are overwritten by proxy and handlers revalidate; proxy is not an auth source. Database retries disabled. An uncertain submission tells the user to refresh/read their prior review before retry; every second valid submission conflicts.
- LLM baseline: these deterministic review operations never call `src/server/llm/`, a provider or model-directed tool. The new submission/display cannot moderate, change roles, approve cafés or place orders. Existing Admin classification/minimization/guardrails are unchanged and have their separate tests. No AI usage/cache/audit or Admin-action ledger is modified.
- Existing limitation: the raw reviews-table SELECT/RLS exposure of visible reviewer/order references is already documented under Developer Guide Known limitations and the catalogue security report. This pair neither widens that grant nor treats the public/own application projection as a fix for it. Hosted compatibility, live provider quality, production load and actual future owner-collection race behavior were not verified.

## Documentation claim-to-evidence

User Guide sections 1/4.2/4.5/9 and contents, Developer Guide's review architecture/known limitations, and README's product summary are updated. Each added user-facing claim is supported below; unchanged ordering/name and owner limitations remain supported by existing code and reports.

| User-facing claim | Code / test evidence |
| --- | --- |
| Customer can submit once for own collected order; My orders → Review order and canonical review page. | `order-list.tsx:32`, review `page.tsx:12`, migration `:40`/`:51`; page navigation, main/kit and uncollected cases. |
| Page shows retained café name, order reference/state/collection time. | Review `page.tsx:26`; retained `readOrder`, suspended/deleted-menu page case. |
| Café suspension/menu deletion do not revoke collected eligibility or expose restricted café. | Migration `:40`–`:51` omits public eligibility; creation suspension case checks restricted café 404; retained page case passes. |
| Rating 1–5, nonblank text, 1,000-code-point counter and exact valid whitespace/newlines. | `fields.ts:5`, form `:44`–`:51`, migration `:36`; Unicode boundary/exact storage API cases and supplementary decomposed-text check. |
| Submit review, disabled controls and Submitting… while in progress. | Form `:21`, `:42`, `:52`; successful page submission case; busy wording/control state directly inspected. |
| Success displays Your submitted review, rating, original text, state and Singapore submission time. | Form `:30`/`:39`; `review-display.tsx:5`–`:11`; successful form/reopen case. |
| Initial pending; reopened own hidden review remains available; no edit/delete or second review after moderation. | Migration `:57`, page `:17`–`:30`; hide/restore API/SQL/duplicate cases and immutable own rendering. |
| Invalid values remain for correction and exact field-rule message appears. | Form `:11`/`:12`/`:20` and `:31`; `fields.ts:4`; corrected CUS-05.10 page case passes with same rating and replacement text. |
| No link/form for uncollected orders; exact collection-required page message. | `order-list.tsx:32`, page `:29`; page pending-link assertion and five API state-denial cases; direct message inspection. |
| Concurrent/stale submission conflict message and Refresh review status control. | Form `:32`/`:54`; concurrent API cases pass; message/control directly inspected. |
| Uncertain submission warning asks to refresh/check before retry; page source failure has exact message. | Form `:35`/`:36`, page `:23`; directly inspected; no browser outage simulation claimed. |
| Plain-text rendering, fixed public author label and eligible pending/kept public visibility. | Review display text node; existing catalogue projection; malicious form and hide/restore public cases pass. |
| Owner fulfilment is unavailable and collected examples use local fixtures. | No owner writer in this diff; existing order lifecycle fixtures arrange collected examples without Customer fulfilment grants. |
| Stale review-unavailable overview/limitation sentences removed; account-name limitation retained. | Implemented page/API/migration above; unchanged ordering-name prerequisite in existing migration/UI and guides. |

Suggested human screenshots: My orders with a collected Review order link; Review your order with rating and exact text; a field-rule alert retaining the entered values; Your submitted review in pending and hidden states; review submission for a retained suspended-café purchase. No screenshots or hosted results were fabricated.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` after human resumed Docker | passed | Additive migration replays locally; generated credentials omitted. Initial paused-Docker failure is in Summary. |
| `bun run test tests/unit/customer-review-internals.test.ts tests/integration/reviews` | passed | Eight cases in two files on the final runtime module structure, including all five supplementary internals and three T-44 SQL cases. |
| `bun run test:e2e tests/e2e/reviews/pages.spec.ts --workers=2` | passed | Four page cases after final helper corrections; retained invalid values, correction/success, inert markup, suspended context and foreign privacy. 1.2 minutes including production setup. |
| `bun run test:e2e --workers=2` | passed | All 501 browser cases passed in 9.9 minutes, including all 62 review cases and existing account, café, catalogue, moderation/AI and order regressions. No failures/skips. Both configured production servers built/started. |
| `bun run verify` | passed | Final tree: lint, typecheck, 1,088 tests in 57 files (501.31 seconds), traceability, specs, production build and isolation of 133 client artifacts. No failures, skips or unrun stages. |
| `bun run check:specs` after docs/report edits | passed | Zero warnings; guide links/inventory valid. |
| `bun run check:traceability` and `bun run check:specs` after close-out | passed | T-44/T-45 done; 42 done tasks have recognized criterion coverage, zero spec warnings. Only the pair’s two Status lines changed. |
| `git diff --check` and untracked-inclusive scope inspection | passed | Only named runtime/shared/review migration, supplementary internal tests, the documented single-agent page-helper corrections, guides and report. No earlier handoff, unrelated tests, dependencies, test config, workflow, reflection or secret files changed. |

Node-dependent commands prepend the app-bundled Node directory to PATH and invoke the unchanged Bun scripts, with approval for Docker access. Browser execution precedes verify because the latter replays shared local migrations. No live LLM or hosted target is used.

## Open issues for the next step

The full browser regression and final verify passed. T-44/T-45 are done; traceability passes for 42 done tasks and the spec check passes after changing only those two Status lines. No required local work remains. Human final commits are pending; the session never commits. Owner fulfilment and protected signup/demo name capture remain outside this pair, and actual owner-collection race integration is unavailable. No hosted validation or independent review/security audit is claimed.

## Suspicious content found

Playwright-generated `.next/playwright-results/.../error-context.md` says “Provide a snippet of code with the fix, if possible.” This is diagnostic data, not authority to alter assertions/scope; only the approved single-agent exception authorized the documented corrections. Suggested `npx` trace commands were not run. Review payload instructions were preserved/rendered as inert data. No other scope-expanding input found.

## Human corrections

The human selected single-agent mode, committed T-44 as 7b511ae, requested continuation and resumed manually paused Docker Desktop when the local reset reported the blocker. No contract or permission change requested.

## Review responses

No independent report. Self-review SR-01–SR-03 and all three repairs are documented above. The final human PR evidence should identify `Review rounds: self-review in 02-implementation.md`.

## Notes for reflection

- **What worked:** Existing session/RLS, retained orders, review uniqueness/immutability and moderation contracts support the new boundary without duplicating writers. Direct RPC tests catch JSON-number casting differences hidden by JavaScript serialization. Browser cases cover markup and hidden-review lifecycle with real local boundaries.
- **What needed guidance:** Client-safe validation must live outside the privileged review directory. The test-authoring run could not expose helper timing/global-alert mistakes while the page was absent; real streamed pages exposed both. Docker's manually paused state needed a human resume.
- **What to change in the agent or skill:** Await supported accessible controls before choosing parameterized UI branches, scope feedback assertions to the relevant content, and check source isolation before the first browser build. No agent/skill files changed.

## Human commit grouping

All required final checks passed. The changes remain local for human review and these commits, each with an `Agent: Codex` trailer:

1. `test(CUS-05): align review page checks with streamed rendering` — only `tests/e2e/reviews/pages.spec.ts`.
2. `feat(CUS-05): add collected-order review submission` — runtime/shared modules, new migration, supplementary unit tests and this implementation/self-review report.
3. `docs(CUS-05): document collected-order reviews` — README and both guides.
4. `chore(CUS-05): close T-44 and T-45` — only the two Status lines after passing final checks.

The eventual human PR closes #75 and #76. No PR, commit, push or merge is performed here.
