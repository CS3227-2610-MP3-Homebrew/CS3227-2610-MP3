# Implementation report

- **Agent:** implementation (Codex, single-agent coordinating session)
- **Issue:** #74 (T-43), paired with #73 (T-42)
- **Spec IDs:** CUS-03.1–CUS-03.8, CUS-04.1–CUS-04.8
- **Date:** 2026-10-22
- **Branch:** feat/73-customer-pickup-orders
- **Base commit:** 4ff212f3f41e45805739bbd04f643915fa4c6247 (origin/master)
- **Testing commit / reviewed HEAD:** c0094728d9b51db9cd9ed09f1073545135bde78f
- **Status:** completed

## Summary

Single-agent mode: implemented customer pickup creation, own-history reads and pending cancellation, including transaction-safe submission replay, immutable SGD/name/item snapshots, current pickup/menu/eligibility validation and consumption of T-29 suspension cancellations. Pre-order and My orders screens, supplementary internal tests and implemented-behaviour documentation are included. The complete browser regression run passed all 419 cases, including the 88 order cases. After a test-title-only close-out correction, its three affected cases and the 38-task static traceability rehearsal passed; final verify on the updated test tree passed every stage with 1,019 tests in 51 files, the production build and isolation checks for 125 client artifacts.

Specs and PLAN match the approved origin/master base inspected for T-42; both issues already existed. The T-42 human test commit was verified before application changes began. No specs, existing migrations, dependencies, workflows, agent instructions, reflection files or secrets were changed. No hosted database, live LLM, commit, push, PR or deployment action was used.

Three repair cycles were used: (1) clarify the Cancelled timestamp label, correct two spec-contradicting session setups, reject fractions that PostgreSQL could round onto the pickup grid and validate Unicode-trimmed profile names; (2) take the creation clock after potentially blocking source locks; (3) make the three existing CUS-03.7 role-denial titles literal so the static traceability scanner recognizes them. The initial order browser run had 85 passes and three failures; the corrected three cases then passed, followed by the full 419-case pass. Runtime verify passed 1,019 tests, but the later close-out traceability check exposed the title issue when the pair was temporarily marked done; statuses were restored to todo pending the final rerun. Assertions and application code were not changed for the naming fix.

## Acceptance criteria

Rows describe implementation and the named passing focused/browser evidence. Final full verification passed on the same runtime code; no code changes followed those checks.

| Criterion | Status | Code and evidence |
| --- | --- | --- |
| CUS-03.1 | completed | `20261022000002_customer_orders.sql:127` creates order/items/key atomically, locks actor/key and cafe, normalizes content and returns current retained replay. `tests/e2e/orders/creation.spec.ts:6`, `:21`, `:31`, `:80` and `tests/e2e/orders/transport.spec.ts:51` pass atomic snapshots, identical/different-content concurrency, maximum bulk quantities and injected item-write rollback/key reuse. |
| CUS-03.2 | completed | `src/server/orders/pickup.ts:9` and migration `:67`, `:169` enforce Singapore horizon/grid/lead/cutoff/continuous overnight hours. All 16 pickup cases, live slots/stale-hours cases, browser selection/no-slot cases and the SQL/TypeScript parity test pass. Clock is taken after cafe/hour/item/profile locks; sub-microsecond nonzero fractions are rejected before database rounding. |
| CUS-03.3 | completed | Migration `:169` rechecks approved/unsuspended state under T-29's cafe lock. `creation.spec.ts:90` and `reads-cancellation.spec.ts:84` pass stale eligibility and actual concurrent creation/suspension, with no outstanding purchase left. |
| CUS-03.4 | completed | HTTP strict input plus RPC actor/workspace/cafe/item checks; no generic write grants. `creation.spec.ts:98`, `:115`, direct RLS cases and supplementary direct-RPC forged-actor cases pass. Missing/foreign records share the same JSON 404. |
| CUS-03.5 | completed | Migration `:173`, `:188` derives the Customer name from its protected profile and snapshots it; HTTP accepts no actor/name/workspace override. `creation.spec.ts:6`, `:115`, `:119` and independent-customer key cases pass. Missing/invalid names return the exact account-setup conflict without an order/key. Signup capture limitation is recorded below. |
| CUS-03.6 | completed | Migration `:182` derives unit/line/overall integer cents and compares expected total; retained snapshots have no live menu/name/hour dependency. `creation.spec.ts:6`, `:63` and `pages.spec.ts:8` pass price conflict, immutable purchases, two-decimal SGD and payment-at-pickup without an external payment/AI request. |
| CUS-03.7 | completed | `src/server/orders/http.ts:18` independently verifies each Customer request; RPCs repeat role checks. Anonymous/owner/Admin JSON cases at `creation.spec.ts:136` pass; direct owner RPC fails with SQLSTATE 42501. |
| CUS-03.8 | completed | Strict Zod and SQL schemas; shared Origin/media/bounded stream/error helpers and explicit unsupported-method exports. All creation/transport cases and both mutation routes' 65,536/65,537-byte no-Content-Length tests pass. |
| CUS-04.1 | completed | SECURITY INVOKER history reads retain session RLS and project only own snapshots; placement/reference order and 20-row pagination. `reads-cancellation.spec.ts:7`, `:19`, `pages.spec.ts:37`, `:67`, source-outage and strict query cases pass. |
| CUS-04.2 | completed | Migration `:200` locks cafe then owned order and permits only pending-to-cancelled, setting one timestamp and no suspension reason. `reads-cancellation.spec.ts:23`, `:35` and the actual browser cancellation flow pass. Integration with a future real owner acceptance writer remains a disclosed gap. |
| CUS-04.3 | completed | Migration `:212` rejects every non-pending state with unchanged history. All five terminal/accepted/ready cancellation cases and forbidden raw fulfilment writes pass; UI shows a cancel control only for pending. |
| CUS-04.4 | completed | Reads/cancellation use current Customer ownership and workspace; no live eligible-cafe join is required for retained history. `reads-cancellation.spec.ts:42` and direct RLS tests pass missing/same-workspace foreign/other-workspace denials and unchanged rows. |
| CUS-04.5 | completed | Existing T-29 suspension RPC is unchanged; the new writers share its cafe lock. `reads-cancellation.spec.ts:60`, `:84`, `pages.spec.ts:37` and existing Admin suspension regressions pass retained automatic cancellations, fixed public reason, private Admin reason isolation, terminal preservation and no revival. T-29 retains rollback/collection-race ownership. |
| CUS-04.6 | completed | `reads-cancellation.spec.ts:42` and direct RLS checks pass main/kit/other-kit isolation and own kit read/cancel success. |
| CUS-04.7 | completed | Server account gates run before protected page reads and Customer checks guard each JSON endpoint. `creation.spec.ts:129` and `reads-cancellation.spec.ts:106` pass anonymous/wrong-role response and raw HTML/DOM confidentiality checks. |
| CUS-04.8 | completed | Cancel accepts exactly `{}` and enforces trusted Origin, JSON media, bounded UTF-8 body, method and strict schema. Transport and no-Content-Length boundary cases pass without mutation. |

## Files changed

- `src/server/orders/pickup.ts`, `schema.ts`, `query.ts`, `source.ts`, `http.ts`: pure offered-slot policy, strict input/output, raw query preservation, session RLS reads and safe route adapters.
- `supabase/migrations/20261022000002_customer_orders.sql`: protected name source, purchase/item/lifecycle/key snapshots, retained item reference, read RPCs and restricted creation/cancellation transactions. Existing migration files remain unchanged.
- `src/app/api/customer/orders/route.ts`, `[orderId]/route.ts`, `[orderId]/cancel/route.ts`, and `src/app/api/customer/cafes/[cafeId]/pickup-slots/route.ts`: canonical JSON endpoints and explicit method denials.
- `src/app/customer/cafes/[cafeId]/pre-order/page.tsx`, `order-form.tsx`, cafe detail `page.tsx`, `src/app/customer/orders/page.tsx`, `order-list.tsx`, `presentation.ts`: reachable pre-order and retained history, accessible controls, inert reasons, SGD/SGT rendering and explicit errors.
- `src/proxy.ts`: preserve strict original queries for the new order GET routes, overwrite caller flags and include opaque order references with asset suffixes in refresh coverage; existing session transport is preserved.
- `tests/unit/orders-internals.test.ts`: four supplementary internal tests with no criterion IDs: original-query trust, direct RPC validation, direct owner denial and transactional/offered-slot parity.
- `tests/e2e/orders/reads-cancellation.spec.ts`: four added setup lines across two tests; sign out before switching an already active account. All original order assertions remain unchanged. This is the single-agent spec-contradiction exception, detailed below.
- `tests/e2e/orders/creation.spec.ts`: expose the same three CUS-03.7/CUS-04.7 cases with literal titles and a shared existing assertion body; parameterized title interpolation is intentionally ignored by the static traceability scanner. Runtime case count, names and assertions are preserved.
- `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `README.md`: implemented user/developer behaviour and explicit provisioning/integration limitations.
- This handoff. `01-testing.md` is unchanged.

## Self-review

**Overall:** pass

Self-review findings are resolved with no open blocking finding in the new runtime scope; final verification of the corrected test tree passed. No independent reviewer/security agent or review launcher was used, as selected single-agent mode substitutes this section and passing verify for those reports.

| Finding | Priority | Resolution and evidence |
| --- | --- | --- |
| SR-01: state and timestamp both labelled Cancelled | P2 | Changed timestamp captions to Accepted/Ready/Collected/Rejected/Cancelled **at**, leaving a clear state label. The full customer select/place/cancel browser case passes. |
| SR-02: two T-42 setups contradict active-account sign-in contract | P2 | SYS-02.10 explicitly requires sign-in with an active account to return 409 without replacement; SYS-02.8 supplies the `{}` local sign-out boundary. Added successful sign-out before the two customer switches at `tests/e2e/orders/reads-cancellation.spec.ts:55` and `:100`. CUS-04.4/CUS-04.6 and CUS-03.1 ownership/replay assertions are unchanged. Both corrected cases pass. These four setup lines belong in the separate human test-correction commit below. |
| SR-03: timestamp precision can hide a nonzero fractional pickup | P2 | HTTP and direct RPC validation require zero seconds and only all-zero fractional digits, before PostgreSQL parsing can round the instant. Supplementary direct-RPC rejection and committed invalid-time cases pass. Unicode-edge-trimmed Customer names are also checked at the source boundary. |
| SR-04: lead-time clock captured before a blocking source lock | P2 | Acquire cafe/hour/item/profile locks before taking clock_timestamp and validating the slot. Current prices and the retained profile name are protected until insert. Final focused order/parity tests and the full browser suite pass; a deliberately long blocked-transaction timing reproduction was not run. |
| SR-05: CUS-03.7 runtime titles were invisible to static traceability | P2 | The close-out checker requires literal titles and ignores interpolated names. The T-42 CUS-03.7 coverage obligation therefore failed despite three passing real role-denial cases. Re-expose those exact cases with literal titles and the same assertion body; no checker, requirement, skip flag or assertion is weakened. All three roles pass again; the 38-task static traceability rehearsal and final full verify pass. |

### Security baseline coverage

- Identity/ownership: every JSON route verifies Auth and Customer role. Session-bound read RPCs use RLS and restrict own customer ID; mutation RPCs independently derive Auth UID, role and workspace before selecting targets. No submitted actor/workspace/name or UI state supplies authority.
- Least privilege: no raw order/item/profile mutation grant is added. Mutation SECURITY DEFINER functions use empty search paths, parameterized arguments, explicit role/scope checks and authenticated-only execution grants. Direct forged-actor and wrong-role RPC tests pass; service/anon execution is revoked.
- Injection/output: Zod strict schemas and RPC validation bound references, counts, quantities and UUIDs. SQL uses no caller-derived dynamic identifiers or SQL strings. React text nodes render snapshot/rejection text inert; browser HTML-like content tests pass. No new uploads, arbitrary URLs, redirects from caller input, shell execution or unsafe Markdown sink exists.
- CSRF/limits/cache: mutations require the exact trusted deployment Origin and JSON, bound actual streamed bytes without trusting Content-Length and return private/no-store JSON. Read handlers authorize before query markers; the proxy replaces caller assertions and each handler parses again. Duplicate/reserved-key and byte-boundary cases pass. No shared customer cache or automatic mutation/provider retry was introduced.
- Replay/races/integrity: customer-scoped keys, advisory transaction lock, atomic items/key writes, cafe-first state locks and conditional pending cancellation handle duplicate submissions and T-29 suspension. Fault injection proves order/items/key rollback. Terminal timestamps/reasons and historical snapshots remain retained.
- Privacy/secrets: customer responses omit protected customer/profile fields and private Admin reasons. Retained reads do not join restricted live cafe details. Configuration remains server-only; source clients use the caller's publishable-key session. No `.env*` content, hosted service, live LLM or payment provider was accessed.
- LLM baseline: these routes are deterministic domain operations. No model invocation, generated command/action, provider context, AI cache or AI bookkeeping change exists; the browser order flow asserts no AI/external payment request.

No confirmed security findings remain in the reviewed new runtime scope. This is a scoped self-review, not an independent security audit or a claim that the whole application is secure. Future owner writers must obey the documented cafe-first lock order; their actual acceptance/collection race integration is unavailable here.

## Documentation claim-to-evidence

User Guide sections 4.3/4.4, the related cafe/suspension text and limitations were added or corrected; the contents list was updated. Each user-facing addition is supported below. The Developer Guide records implementation boundaries and tests; README's product summary points to the implemented flow and name limitation. No new external reuse or workflow file was introduced, so reuse totals/workflow inventory are unchanged.

| User-facing statement | Code / passing evidence |
| --- | --- |
| Named Customer account and an eligible single cafe are required. | Migration `:169`, `:173`, `:188`; `creation.spec.ts:90`, `:119`. |
| Browse cafe detail → Pre-order for pickup and its canonical page path. | `src/app/customer/cafes/[cafeId]/page.tsx:21`; pre-order `page.tsx:10`. |
| Zero leaves a drink unselected; purchase accepts 1–20 distinct drinks with quantities 1–20. | `order-form.tsx:15`, `:19`, `:39`; `creation.spec.ts:72`, `:76`, `:80`, `:86`. |
| Sold-out drinks remain visible with disabled quantity controls. | `order-form.tsx:38`, `:39`; server sold-out rejection at `creation.spec.ts:106`. |
| Pickup select uses Singapore time. | `order-form.tsx:41`, `:42`; `presentation.ts:2`; `pages.spec.ts:8` runs with Los Angeles browser timezone. |
| Seven dates, 15-minute grid and lead, configured cutoff, exclusive closing. | `pickup.ts:9`; all 16 committed pickup boundary cases and SQL parity test. |
| Total uses two-decimal SGD; prices and selected quantities produce line totals. | `presentation.ts:1`, `order-form.tsx:16`, `:46`; `creation.spec.ts:6`, `pages.spec.ts:8`. |
| Place pre-order shows Placing order during submission and opens My orders on success. | `order-form.tsx:25`, `:30`, `:48`; browser submit succeeds at `pages.spec.ts:8`. |
| Pending purchase retains item/name/price details. | Migration `:190`, `:193`; `creation.spec.ts:6`. |
| Payment-at-pickup wording and no payment operation. | `order-form.tsx:35`; `pages.spec.ts:8` asserts payment information and no external/AI request. |
| No-slot message and disabled submission. | `order-form.tsx:45`, `:48`; `pages.spec.ts:59`. |
| Invalid-selection message. | `order-form.tsx:19`, `:20`; server numeric/count bounds covered in creation tests. |
| Changed menu/price/pickup/state message and review-current-choices control. | `http.ts:13`; `order-form.tsx:29`, `:47`; stale/current-price API cases pass. |
| Server repeats eligibility and selection checks. | Migration `:169` onward; stale eligibility/hours and creation-versus-suspension tests. |
| Uncertain submission message; same mounted form reuses its key without a page reload. | `order-form.tsx:14`, `:23`, `:24`, `:31`; replay API tests at `creation.spec.ts:21`. Browser reload persistence is explicitly not claimed. |
| Pre-order source-failure wording. | Pre-order `page.tsx:21`; `source.test.ts` safe source-outage cases pass. |
| Missing protected name gives exact account-setup conflict and creates no order/key. | `http.ts:17`, migration `:188`; `creation.spec.ts:119`. |
| Existing sign-up/demo provisioning lacks the required name and no repair control exists. | New nullable profile field without backfill at migration `:4`; unchanged signup fields/adaptor accept only the prior fields and provision no name; pre-order has no name-edit action. This is a disclosed pre-existing integration gap, not an available repair procedure. |
| My orders navigation/path and own-history access. | Existing account navigation plus `src/app/customer/orders/page.tsx:9`; wrong-role and RLS cases. |
| Retained cafe, order reference, state, items, quantities, unit/line/overall total. | `order-list.tsx:25`, `:29`, `:30`; `reads-cancellation.spec.ts:7`, `pages.spec.ts:37`. |
| Pickup/lifecycle timestamps are Singapore time. | `order-list.tsx:6`, `:28`; `presentation.ts:2`; browser timestamp/SGT checks. |
| Later menu/name/price/hour changes do not rewrite history. | Snapshot-only migration `:52`; `creation.spec.ts:6`. |
| Newest-first/reference tie ordering and 20-row Previous/Next pagination. | Migration `:104`, source `:32`, orders page `:19`; `reads-cancellation.spec.ts:7`. |
| Pending cancellation button, Updating text, Cancelled at caption and no controls in other states. | `order-list.tsx:6`, `:31`; `pages.spec.ts:8`, `:37`, non-pending cancellation cases. |
| Stale cancellation conflicts without further changes. | Migration `:212`; `reads-cancellation.spec.ts:30`, `:35`. |
| Suspension retains cancelled history with the fixed public reason, hides private Admin reason, preserves terminal orders and never revives. | Unchanged T-29 writer and `reads-cancellation.spec.ts:60`, `pages.spec.ts:37`; broader Admin suspension regressions pass. |
| Owner rejection reason displays as inert text. | `order-list.tsx:27`; `pages.spec.ts:37`. |
| Empty history, source failure and invalid-page messages are distinct. | `order-list.tsx:23`, orders page `:14`; `reads-cancellation.spec.ts:19`, `pages.spec.ts:67`, route outage/query cases. |
| Uncertain cancellation asks the user to refresh/check before retry. | `order-list.tsx:19`. |
| Owner fulfilment/review writing/favourites remain unavailable; state examples use local fixtures. | No owner/review/favourite writer was introduced; `tests/e2e/orders/fixtures.ts` supplies lifecycle examples. |

Suggested human screenshots: a named local Customer's Pre-order form with Singapore slots and SGD total; successful pending My orders; the same order after cancellation with Cancelled at; suspended pending/accepted/ready history beside an unchanged collected order; the missing-name error from an ordinary current signup account. No screenshots are fabricated or required for automated completion.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` | passed | New draft migration replays locally; generated credentials omitted. Final full verify also owns the committed migration replay checks. |
| `bun run test tests/unit/orders tests/unit/orders-internals.test.ts tests/integration/orders` | passed | Final transaction code: 29 tests in four files, including source/byte limits, RLS, direct RPC and SQL/TypeScript parity. |
| `bun run test:e2e --workers=2` | passed | Final runtime: 419 passed, 7.9 minutes. All 88 order cases and existing account/catalogue/Admin regressions included. No skips. Production build and isolation checks passed before browser execution. |
| `bun run verify` | passed | Final test tree: lint, typecheck, all 1,019 tests in 51 files (477.55 seconds), traceability, specs, production build and isolation for 125 client artifacts passed. No failed, skipped, timed-out or unrun stages. |
| `bun run test:e2e tests/e2e/orders/creation.spec.ts --grep 'CUS-03.7' --workers=2` | passed | All three literal-title role-denial cases passed (51.2 seconds including production setup); names, case count and assertions match the prior full-suite cases. |
| `bun workflow/scripts/check-traceability.ts /tmp/t43-closeout-plan.md tests` | passed | A temporary copy changing only T-42/T-43 to done passes all criterion-title checks for 38 tasks; no actual PLAN status or checker was weakened for the rehearsal. |
| `bun run check:specs` | passed | Documentation edits pass with 0 warnings. |
| `bun run check:traceability` after pair close-out | passed | Actual PLAN: 38 done tasks; all listed criteria have recognized test titles. Only T-42/T-43 Status lines changed. |
| `bun run check:specs` after pair close-out | passed | Actual done statuses and final documentation/report pass with 0 warnings. |
| `git diff --check` and scoped path inspection | passed | No whitespace errors. Only named runtime/migration, supplementary tests, documented test corrections, guides, the pair's two Status lines and this report. |

The shell lacks Node on PATH, so checks prepend the app-bundled Node v24.19.0 directory while invoking the Bun scripts. Approved execution outside the sandbox is used for Docker/Supabase CLI access. Fake/disabled AI only; no additional dependencies or script changes.

## Open issues for the next step

- Pair close-out is complete: T-42 and T-43 are done, with the actual 38-task traceability check and spec check passing after those two Status-line changes. No required local implementation check remains.
- Current sign-up/demo provisioning still does not supply a protected Customer name. This pre-existing SYS-01 integration gap is outside T-43's order/file scope; ordinary such accounts safely receive the specified 409 instead of an order. No name is fabricated or accepted from CreateOrder, and no account-repair endpoint is added. Named local fixtures verify successful ordering. The guides state this limitation explicitly.
- Actual owner acceptance/collection and owner settings/menu writer integration remain unavailable. Their lifecycle/race contracts are implemented at the Customer boundary and tested through supported fixtures and current suspension, but a real owner acceptance-versus-cancel or collection-versus-suspension HTTP integration is not claimed. Admin rollback responsibility remains T-29's existing suite.
- Submission-key reuse is retained on the mounted form; a page reload does not persist the key. Server replay semantics remain durable for callers retaining a successful key.
- No hosted/deployment validation, independent review/security worker, live LLM/provider test, load test or long lock-wait reproduction was run.
- The session-setup correction and literal role-title correction need a separate human test commit. All final changes remain a local reviewable diff.

## Suspicious content found

None. Specs, installed framework guides, test reports and tool output were treated as evidence; none expanded permissions.

## Human corrections

The human selected single-agent mode, committed T-42 as c009472 and instructed continuation. No spec changes or additional role/write permissions were requested.

## Review responses

No independent review report. Self-review findings SR-01–SR-04 and their resolutions are recorded above; no report or test assertion was weakened to make code pass.

## Notes for reflection

- **What worked:** Committed failing-first tests exposed a real UI ambiguity and two incorrect account-switch setups; real local RPC/RLS, fault injection and all-role browser regressions passed after bounded corrections.
- **What needed guidance:** The existing SYS-02.10 active-account rule explains both test setup failures; the single-agent exception permits their setup corrections, committed separately by the human. T-42 authoring missed that static traceability ignores interpolated titles, because todo tasks do not trigger the missing-criterion check. Existing signup-name capture remains a separate integration concern.
- **What to change in the agent or skill:** Rehearse traceability against a temporary done-status PLAN copy during test authoring, keep auth transitions explicit in multi-actor tests and compare transactional/offered pickup rules when database validation repeats a pure policy. No agent/skill files were changed.

## Human commit grouping

Final verification passed. The local diff separates into these human commits (all with `Agent: Codex`):

1. `test(CUS-03): correct order session setup and traceable role titles` — only `tests/e2e/orders/reads-cancellation.spec.ts` and `tests/e2e/orders/creation.spec.ts` (SYS-02.10 setup and CUS-03.7/CUS-04.7 title corrections).
2. `feat(CUS-03): add pickup orders and own-order cancellation` — application code, new migration, `tests/unit/orders-internals.test.ts` and this implementation/self-review report.
3. `docs(CUS-03): document pickup and retained order history` — `README.md`, `docs/UserGuide.md`, `docs/DeveloperGuide.md`.
4. `chore(CUS-03): close T-42 and T-43` — only the pair's two PLAN Status lines after the close-out checks pass.

The eventual human PR closes #73 and #74, and its Evidence section says `Review rounds: self-review in 02-implementation.md`. No PR is opened by this session.
