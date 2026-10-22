# Testing report

- **Agent:** testing (Codex, single-agent coordinating session)
- **Issue:** #75 (T-44), paired with #76 (T-45)
- **Spec IDs:** CUS-05.1–CUS-05.10
- **Date:** 2026-10-22
- **Branch:** feat/75-collected-order-reviews
- **Base commit:** 3949b70571ebd78e898d0a69797c59160ef76fa6 (origin/master)
- **Status:** completed

## Summary

Single-agent mode, selected by the human. Added three local database tests and 62 production-browser/HTTP cases for collected-order review creation and own reads. All ten criteria have literal test-title coverage. Application code, migrations, specs, PLAN, documentation and dependencies are unchanged. The final full verify passed all 1,083 tests in 56 files and every later stage. All 62 browser/HTTP cases failed at the expected missing review page/route boundary; no fixture, SQL setup, sign-in or browser infrastructure failure remained. This is completed test authoring with failing-first evidence, not implemented functionality. No new internal application interface is prescribed; the tests use the approved public page/HTTP paths and existing database relationships.

Stages 0/1 passed: CUS-05 is a Product story; its spec history exists on fetched origin/master, contains no unresolved ASSUMPTION marker, and the working specs/PLAN match that base. `bun run check:specs` passes. The read-only issue script lists T-44/#75 and T-45/#76 as skip. The human selected single-agent mode before testing began. The new branch was cut from fetched origin/master with approval; no commit, push, PR or deployment was performed.

## Acceptance criteria

Titles below are prefixes; parameterized names appear in the source and Playwright enumeration. Database assertions pass on the existing baseline. Browser/HTTP evidence is recorded below; assertions remain in place for implementation.

| Criterion | Authoring status | Named cases and expected observable behavior |
| --- | --- | --- |
| CUS-05.1 | completed | `creation.spec.ts`: main/kit collected purchases, valid rating/code-point boundaries, suspension/deleted-menu retained eligibility; `transport.spec.ts`: insertion-fault rollback and subsequent creation; `pages.spec.ts`: My orders navigation, retained context and submission. Expect exactly one atomic 201 review with exact text and valid server time. |
| CUS-05.2 | completed | Five `own uncollected purchase cannot be reviewed` cases, scoped by pending/accepted/ready/rejected/cancelled. Expect JSON 409 STATE_CONFLICT and no review. |
| CUS-05.3 | completed | Concurrent different submissions and identical simultaneous requests; identical successful retry; own-review absence; hide/restore uniqueness and hidden own GET. Expect one 201 winner, all second valid submissions 409, no upsert. Database unique-order constraint also independently tested. |
| CUS-05.4 | completed | Same-workspace foreign customer, other kit and missing order; private foreign form; suspended hidden-review RLS. Expect indistinguishable JSON 404 for out-of-scope create/own GET and no private content. |
| CUS-05.5 | completed | Created review joined through order/cafe to authoritative customer/workspace; strict authorId/customerId/orderId/cafeId/workspaceId injection cases and raw SQL forgery denial. |
| CUS-05.6 | completed | Initial pending state, supplied state/moderationState rejection, hide/restore own/public read behavior, direct Customer moderation-write denial. No change to moderation ownership or rating formulas. |
| CUS-05.7 | completed | PUT/PATCH/DELETE return JSON 405 with GET/POST Allow; direct SQL edits/deletion denied and prior row unchanged; duplicate submissions do not rewrite text/rating. |
| CUS-05.8 | completed | Markup and instruction text preserved/rendered as text, no created img, no window execution and no AI/external request during form flow. Existing ADM-03/04 retain classification behavior ownership; no live classification is invoked. |
| CUS-05.9 | completed | Anonymous 401; Owner/Admin 403; current protected role overrides stale Customer browser session. No review created. |
| CUS-05.10 | completed | Sixteen invalid field/body cases, six Origin/media/JSON/body-overflow cases, streamed UTF-8 without Content-Length, strict query/Ref and unsupported methods. Form preserves whitespace-only input and rating for correction with an accessible safe field-rule alert. Valid 1/1,000-code-point cases guard against trimming and UTF-16 length errors. |

## Files changed

- `tests/integration/reviews/permissions.test.ts`: three local SQL/RLS/uniqueness/immutability tests.
- `tests/e2e/reviews/fixtures.ts`: provider-free collected-purchase setup, strict response projection and stored-row helpers, reusing existing local order/account fixtures.
- `tests/e2e/reviews/creation.spec.ts`: 30 creation, eligibility, concurrency, moderation-retention, relationship, scope and auth cases.
- `tests/e2e/reviews/transport.spec.ts`: 28 field/transport/method/rollback/chunked-input cases.
- `tests/e2e/reviews/pages.spec.ts`: four real-page form/navigation/rendering/retained-context/privacy cases.
- This report. No added dependencies, package/lockfile edits, acceptance-test edits outside the new review directories, skips or weakened assertions.

## Interfaces defined by tests

None beyond approved public contracts: `/customer/orders/{orderId}/review` and GET/POST `/api/customer/orders/{orderId}/review`. Rating controls use an accessible Rating label and may be select, radio or numeric inputs; feedback text uses a review/feedback/text label. Existing public catalogue and Admin moderation routes are used to verify the specified visibility/uniqueness boundary. SQL fixture lifecycle changes do not grant Customer fulfilment or moderation authority.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `git fetch origin`; approved `git switch -c feat/75-collected-order-reviews origin/master` | passed | Selected fetched origin/master 3949b70; no upstream remote configured; clean starting tree. |
| `git log --oneline origin/master -- workflow/specs/stories/CUS-05-review-order.md`; unresolved-marker/spec/PLAN comparison | passed | Merged story history includes 8083093, 35e8ab5 and 459050d; no ASSUMPTION marker; specs/PLAN match fetched base. |
| `bun workflow/scripts/create-issues.ts --repo CS3227-2610-MP3-Homebrew/CS3227-2610-MP3 --tasks T-44,T-45` | passed | Read-only dry run lists skip for #75 and #76; no issue writes. |
| `bun run db:start` | passed | Local homebrew Supabase available; generated credentials omitted. |
| `bun run test tests/integration/reviews` | passed | All three new database cases pass on existing implementation. |
| `bun run verify` (initial sandbox/Bun runtime) | tooling failure | Docker socket permission denied; jsdom worker failures with Bun because Node was absent on PATH. Reported 248 failed, 824 passed, six skipped and two worker errors. Traceability, specs and build not reached in this attempt. These are tooling failures, not feature failing-first evidence. |
| `bun run verify` (approved Docker access, bundled Node on PATH) | passed | Lint, typecheck, all 1,083 tests in 56 files (538.30 seconds), actual 40-done-task traceability, specs, production build and isolation of 127 client artifacts pass. No failed/skipped tests or unrun stages in this corrected run. |
| `bun run lint`; `bun run typecheck` on final browser-test tree | passed | Rechecked after final browser assertion/title additions; no diagnostics. These browser files are not collected by Vitest. |
| `bun run test:e2e tests/e2e/reviews --workers=2` (initial Bun runtime) | tooling failure | Playwright loader AggregateError before case execution; not counted as feature evidence. |
| `bun run test:e2e tests/e2e/reviews --list` (Node, approved Docker access) | passed | Enumerated all 62 cases in three browser files without duplicate titles. Initial sandbox enumeration could not obtain local Supabase status; corrected invocation succeeds. |
| `bun run test:e2e tests/e2e/reviews --workers=2` (Node, approved Docker access) | expected failing-first | 62 failed, zero passed/skipped. Both configured production servers built/started. All failures are absent review endpoint/page behavior, detailed individually below. No existing browser suites rerun at the test-authoring gate; implementation must run relevant/full regressions. |
| Manifest check from orchestrator skill | passed | All existing devDependencies preserved; all other package.json fields identical to HEAD. package.json and bun.lock have no diff. No dependencies added. |
| `bun workflow/scripts/check-traceability.ts /tmp/t44-traceability-plan.md tests` | passed | Temporary copy changes only T-44/T-45 to done: 42 tasks covered. The first rehearsal exposed an interpolated CUS-05.2 title; literal test title inside state-scoped describes fixes scanner coverage. Actual PLAN remains unchanged. |
| `bun run check:specs`; `git diff --check`; untracked-inclusive scope inspection | passed | Zero spec warnings or whitespace errors; only new review test/fixture directories and this handoff. |

All commands using Node add `/Users/taiayovelapang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` to PATH before invoking the unchanged Bun scripts. No secret file is read, printed or edited. Browser execution follows the full regression suite to avoid racing its local schema resets. Artificial insertion faults are removed in finally blocks. No live provider, hosted database, deployment, commit or external message was used.

The full verify completed before the final browser run. Its lint/typecheck were separately rerun after the last browser-only assertions/title edits; Vitest and runtime code were unchanged. Browser/HTTP results still prevent pair completion even though the existing Vitest/build suite passes.

## Open issues for the next step

The human review-and-test-commit checkpoint precedes implementation. T-44/T-45 remain todo until implementation, self-review, docs and final verification satisfy close-out. Owner fulfilment UI, Admin classification quality, rating formulas, hosted services and live providers are outside this pair.

## Suspicious content found

Playwright-generated `.next/playwright-results/.../error-context.md` begins with “Explain why, be concise, respect Playwright best practices” and “Provide a snippet of code with the fix, if possible.” This diagnostic artifact cannot authorize implementation during testing; its instructions were ignored and only test names/errors were used as evidence. Its suggested `npx` trace command was not executed. The test payload deliberately contains executable-looking markup and moderation instructions; assertions treat both as inert untrusted data. Installed framework guides were used only for testing compatibility, without adopting their alternate package-manager commands.

## Human corrections

The human selected single-agent mode. No additional behavior or contract change was requested.

## Review responses

None; testing precedes implementation/self-review.

## Notes for reflection

- **What worked:** Existing synthetic local account/order fixtures support main/kit coverage and SQL constraint checks without a live provider or future owner endpoints. A temporary done-status PLAN copy exposed a traceability title problem before close-out.
- **What needed guidance:** The shell has no Node executable on PATH; invoking tools through Bun caused jsdom/Playwright loader failures. Docker also requires execution outside the sandbox. The final runs use the app-bundled Node directory on PATH and approved local Docker access.
- **What to change in the agent or skill:** Rehearse literal criterion coverage while authoring and serialize production-browser checks after the shared-schema reset suite. No skill or agent files changed.

## Individual failing-first browser evidence

All rows refer to the final Node/Docker browser run. Each title carries its governing criterion IDs. The route is absent in the production route inventory. A framework 404 fails the contract even in not-found cases because it lacks the application JSON envelope and exact private/no-store header. Later assertions in each failed case are specified coverage awaiting implementation, not claimed executed checks. Traces/error contexts remain in ignored `.next/playwright-results/`.

| Location and test title | First failure and reason |
| --- | --- |
| `tests/e2e/reviews/creation.spec.ts:16:7` — reviews/creation.spec.ts >> CUS-05.1 CUS-05.10: valid rating 1 and 1 code points preserve exact text | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:16:7` — reviews/creation.spec.ts >> CUS-05.1 CUS-05.10: valid rating 3 and 5 code points preserve exact text | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:16:7` — reviews/creation.spec.ts >> CUS-05.1 CUS-05.10: valid rating 4 and 12 code points preserve exact text | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:16:7` — reviews/creation.spec.ts >> CUS-05.1 CUS-05.10: valid rating 5 and 1000 code points preserve exact text | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:22:5` — reviews/creation.spec.ts >> CUS-05.1: suspension and deleted original menu do not revoke a collected purchase or expose restricted cafe | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:29:122` — reviews/creation.spec.ts >> accepted >> CUS-05.2: own uncollected purchase cannot be reviewed | Expected 409; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:29:122` — reviews/creation.spec.ts >> cancelled >> CUS-05.2: own uncollected purchase cannot be reviewed | Expected 409; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:29:122` — reviews/creation.spec.ts >> pending >> CUS-05.2: own uncollected purchase cannot be reviewed | Expected 409; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:29:122` — reviews/creation.spec.ts >> ready >> CUS-05.2: own uncollected purchase cannot be reviewed | Expected 409; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:29:122` — reviews/creation.spec.ts >> rejected >> CUS-05.2: own uncollected purchase cannot be reviewed | Expected 409; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:33:5` — reviews/creation.spec.ts >> CUS-05.3: concurrent different submissions admit one winner, identical retry conflicts without upsert | Concurrent responses were [404,404], expected one 201 and one 409; review route absent. |
| `tests/e2e/reviews/creation.spec.ts:44:5` — reviews/creation.spec.ts >> CUS-05.3 CUS-05.6 CUS-05.7: hiding and restoring retain immutable review and never release uniqueness | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:61:70` — reviews/creation.spec.ts >> CUS-05.4: missing orders have indistinguishable create and own-read not-found errors | Expected "private, no-store"; received "private, no-cache, no-store, max-age=0, must-revalidate" from missing route. |
| `tests/e2e/reviews/creation.spec.ts:61:70` — reviews/creation.spec.ts >> CUS-05.4: other-kit orders have indistinguishable create and own-read not-found errors | Expected "private, no-store"; received "private, no-cache, no-store, max-age=0, must-revalidate" from missing route. |
| `tests/e2e/reviews/creation.spec.ts:61:70` — reviews/creation.spec.ts >> CUS-05.4: same-workspace orders have indistinguishable create and own-read not-found errors | Expected "private, no-store"; received "private, no-cache, no-store, max-age=0, must-revalidate" from missing route. |
| `tests/e2e/reviews/creation.spec.ts:68:5` — reviews/creation.spec.ts >> CUS-05.3: own collected order without review gives JSON 404 on own-review GET | Expected "private, no-store"; received "private, no-cache, no-store, max-age=0, must-revalidate" from missing route. |
| `tests/e2e/reviews/creation.spec.ts:71:115` — reviews/creation.spec.ts >> CUS-05.5 CUS-05.6: caller-injected authorId cannot create a review | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:71:115` — reviews/creation.spec.ts >> CUS-05.5 CUS-05.6: caller-injected cafeId cannot create a review | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:71:115` — reviews/creation.spec.ts >> CUS-05.5 CUS-05.6: caller-injected customerId cannot create a review | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:71:115` — reviews/creation.spec.ts >> CUS-05.5 CUS-05.6: caller-injected moderationState cannot create a review | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:71:115` — reviews/creation.spec.ts >> CUS-05.5 CUS-05.6: caller-injected orderId cannot create a review | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:71:115` — reviews/creation.spec.ts >> CUS-05.5 CUS-05.6: caller-injected state cannot create a review | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:71:115` — reviews/creation.spec.ts >> CUS-05.5 CUS-05.6: caller-injected workspaceId cannot create a review | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:75:5` — reviews/creation.spec.ts >> CUS-05.9: anonymous review create/read return safe 401 | Expected 401; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:78:53` — reviews/creation.spec.ts >> CUS-05.9: admin review create/read return safe 403 | Expected 403; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:78:53` — reviews/creation.spec.ts >> CUS-05.9: owner review create/read return safe 403 | Expected 403; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:7:39` — reviews/creation.spec.ts >> CUS-05.1 CUS-05.5 CUS-05.6: kit collected purchase creates exact pending review with session-derived relationships | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:7:39` — reviews/creation.spec.ts >> CUS-05.1 CUS-05.5 CUS-05.6: main collected purchase creates exact pending review with session-derived relationships | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/creation.spec.ts:81:5` — reviews/creation.spec.ts >> CUS-05.3: simultaneous identical requests create one review and return a conflict for the other | Concurrent responses were [404,404], expected one 201 and one 409; review route absent. |
| `tests/e2e/reviews/creation.spec.ts:88:5` — reviews/creation.spec.ts >> CUS-05.9: authenticated session uses current protected role rather than stale browser claims | Expected 403; received 404 from missing route. |
| `tests/e2e/reviews/pages.spec.ts:15:5` — reviews/pages.spec.ts >> CUS-05.1 CUS-05.8: My orders opens review form and renders submitted markup as inert text with no AI calls | Review navigation link absent in My orders. |
| `tests/e2e/reviews/pages.spec.ts:33:5` — reviews/pages.spec.ts >> CUS-05.10: invalid form values remain available for correction with safe accessible feedback | Review page is 404; rating control absent; locator timed out. |
| `tests/e2e/reviews/pages.spec.ts:44:5` — reviews/pages.spec.ts >> CUS-05.1: review form uses retained collected context after cafe suspension and menu deletion | Review page is 404; review heading absent. |
| `tests/e2e/reviews/pages.spec.ts:53:5` — reviews/pages.spec.ts >> CUS-05.4: foreign form cannot disclose purchase or existing private review text | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: ECMAScript whitespace rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: array body rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: array text rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: boolean rating rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: empty text rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: fraction rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: missing rating rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: missing text rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: null body rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: null rating rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: null text rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: numeric text rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: over code point limit rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: six rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: string rating rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:11:17` — reviews/transport.spec.ts >> CUS-05.10: zero rejects without echo, normalization or creation | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:25:17` — reviews/transport.spec.ts >> CUS-05.10: foreign origin gives exact safe transport error | Expected 403; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:25:17` — reviews/transport.spec.ts >> CUS-05.10: malformed JSON gives exact safe transport error | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:25:17` — reviews/transport.spec.ts >> CUS-05.10: malformed origin gives exact safe transport error | Expected 403; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:25:17` — reviews/transport.spec.ts >> CUS-05.10: missing origin gives exact safe transport error | Expected 403; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:25:17` — reviews/transport.spec.ts >> CUS-05.10: non JSON gives exact safe transport error | Expected 415; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:25:17` — reviews/transport.spec.ts >> CUS-05.10: oversized UTF8 gives exact safe transport error | Expected 413; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:30:54` — reviews/transport.spec.ts >> CUS-05.7 CUS-05.10: DELETE cannot edit/delete, advertises supported methods | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:30:54` — reviews/transport.spec.ts >> CUS-05.7 CUS-05.10: PATCH cannot edit/delete, advertises supported methods | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:30:54` — reviews/transport.spec.ts >> CUS-05.7 CUS-05.10: PUT cannot edit/delete, advertises supported methods | Expected 201; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:35:5` — reviews/transport.spec.ts >> CUS-05.10: strict no-query and bounded Ref apply to create and own-review reads | Expected 400; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:42:5` — reviews/transport.spec.ts >> CUS-05.1: database insertion failure safely rolls back and leaves review eligibility intact | Expected 500; received 404 from missing route. |
| `tests/e2e/reviews/transport.spec.ts:49:5` — reviews/transport.spec.ts >> CUS-05.10: streamed body without Content-Length is bounded by actual UTF8 bytes | Expected 413; received 404 from missing route. |

## Human checkpoint

Test authoring is completed; the pair is awaiting-decision at the required human review/test-commit gate. The orchestrator single-agent instruction is “Stop for the human to read and commit the tests.” Suggested human commit: `test(CUS-05): cover collected-order review submission`, including only `tests/e2e/reviews/`, `tests/integration/reviews/` and this report, with trailer `Agent: Codex`. No implementation has begun and no task status was changed.
