# Testing report

- **Agent:** testing
- **Issue:** #60, T-30
- **Spec IDs:** ADM-03.1–ADM-03.18
- **Date:** 2026-10-21
- **Branch:** feat/60-moderation-queue-admin-audit
- **Base commit:** b19b2e68d6848712b52e33644c739610f7c2e04e
- **Status:** completed

## Summary

Authored 95 deterministic acceptance cases: nine Vitest database cases and 86 Playwright browser/ordinary-HTTP cases. ADM-03.1 passes against the existing foundation RLS. The other eight database cases and all 86 browser cases are failing-first against the missing manual moderation implementation. Final `bun run verify` passed lint/typecheck and finished with 943 passing tests and eight expected missing-implementation failures. Test authoring is completed; implementation and merge readiness are not claimed.

The assigned T-30 body alone was extracted from PLAN.md. No implementation task or implementation/reviewer report was read. The issue handoff directory did not previously exist. The approved ADM-03 story, linked integration/security contracts, ADM-04 quick-pick contract, installed Next.js Vitest/Playwright guides, shared testing instructions, test tooling, existing tests and merged application interfaces supplied the test contracts.

## Acceptance criteria

Status here describes test authoring, not whether implementation passes.

| Criterion | Status | Evidence (Given / When / Then and named case) |
| --- | --- | --- |
| ADM-03.1 | completed | `eligible café customer RLS returns pending and kept but excludes hidden`: reviews with default pending/kept/hidden states, read by a different same-workspace Customer, return pending+kept only; suspension and foreign workspace return zero. Actual targeted run passes. No rating formula or customer UI is asserted. |
| ADM-03.2 | completed | `URL tab scopes rows including suspended cafés...` in all three states; `configured seven-row queue uses oldest submission then reference ordering and URL previous/next` in all three states; `empty tab retains tabs navigation and an empty-state message`. Seven is explicitly configured in the test server, below the security ceiling of 20. Mixed submitted times and tied references establish order; reload proves URL persistence. |
| ADM-03.3 | completed | `URL tab scopes rows including suspended cafés and renders exact escaped fields with correct actions`: café name, rating, exact text, Singapore date rollover/time, state, correct state-specific actions; all five fixed quick-picks are editable and require confirmation; opening/editing alone leaves the review unchanged. |
| ADM-03.4 | completed | `allowed transition commits exactly one audit and preserves text/rating`, pending Keep for main and kit; browser `confirmed browser Keep Hide Restore actions move the unchanged review between tabs`. Exact JSON, no-store, customer visibility and audit are asserted. |
| ADM-03.5 | completed | Same transition/browser cases for pending Hide and kept Hide, main and kit; hidden RLS visibility becomes zero and destination is Hidden. |
| ADM-03.6 | completed | Same transition/browser cases for hidden Restore, main and kit; result is kept and customer-visible. |
| ADM-03.7 | completed | `disallowed state/action is a conflict without review or audit effects` covers all five invalid combinations per workspace kind. `simultaneous conflicting pending confirmations admit only one commit` submits Keep twice concurrently, requiring 200+409 and one audit. `stale confirmation shows record-changed feedback and current state` changes pending to hidden before browser Keep confirmation. |
| ADM-03.8 | completed | `rejects invalid reason without effects` covers empty, ECMAScript whitespace, 301 astral code points and wrong types. `stores valid Unicode reason exactly with no trimming or rewriting` covers one character, 300 astral code points and surrounding whitespace. Audit/UI tests preserve and escape markup-like reasons. |
| ADM-03.9 | completed | `denies absent or wrong-role session without protected data or mutations` covers anonymous, Customer and owner; independent `actual missing-session route returns shared private JSON` reaches the absent endpoint without needing product-field fixtures. |
| ADM-03.10 | completed | `absent and foreign references yield indistinguishable not-found responses` compares error envelopes without correlation IDs, including legal opaque refs; queue/audit tests exclude foreign workspaces; direct audit and profile-access cases verify scope. |
| ADM-03.11 | completed | Main/kit describe contexts execute the entire 3×3 action/state matrix; isolated kit browser fixtures read their own queue/audit, including suspended café reviews, and exclude another kit. |
| ADM-03.12 | completed | Every allowed transition checks unchanged review, exactly-one actor/action/reference/reason/server-time audit. Every rejected HTTP case checks both review and audit snapshots. `an audit insert failure atomically rolls back moderation` injects a target-specific local PostgreSQL trigger fault and requires safe 500 plus unchanged state/history. Direct audit forgery and later-history cases add append-only evidence. |
| ADM-03.13 | completed | `each action filter renders exact Singapore-time columns...` covers all seven actions; `audit orders newest first then entry reference and pages exactly 50 rows using URL state` uses 52 entries with ties; `empty audit filter retains filter navigation and a safe empty state` checks all/all-seven filter choices. |
| ADM-03.14 | completed | Audit filter cases assert time, acting Admin email, action, café/review labels and exact escaped reason. `audit excludes other workspaces review text and internal AI events` inserts a synthetic internal AI-use event and excludes it. `unrelated profile emails and other-workspace profiles are not exposed by Admin audit permission` and Customer/owner direct audit-read denials cover scoped email access. |
| ADM-03.15 | completed | `old Admin audit records survive actual AI retention cleanup` calls existing local `ai_state` cleanup with a controlled clock; `later actions preserve earlier history and ordinary Admin cannot rewrite or delete entries`, direct forgery denial, and browser HTTP `later successful actions retain every previous immutable audit entry` cover history preservation. |
| ADM-03.16 | completed | `strict ordinary HTTP boundary rejects input without state or audit effects` expands 25 cases for methods, Origin, media, JSON, body size, unknown/action-only fields, forged AI label and oversized Ref. Error envelope, private no-store, JSON and Allow are asserted; HEAD correctly has no response body. Path alone chooses target. |
| ADM-03.17 | completed | For both pages: `anonymous redirect has no protected data or private loading-shell content`, plus `wrong-role rendering returns no queue or audit records` for Customer/owner. Synthetic private markers and table absence are checked. |
| ADM-03.18 | completed | `review text/rating edits and deletion are denied without changing the stored review`, both Customer and Admin; positive fixture existence precedes attempts and only authorization/integrity SQL errors or zero affected rows count as denial. Successful moderation also compares review text/rating and identity. |

## Files changed

- `playwright.config.ts`: sets the production test server's `AI_MODERATION_REVIEWS_PER_CALL` to seven; retains disabled AI and loopback Supabase.
- `tests/integration/moderation/fixtures.ts`: synthetic local accounts, café/collected-order/review fixtures, exact untrusted strings and actor-scoped SQL helpers.
- `tests/integration/moderation/visibility.test.ts`: foundation visibility/default-state and immutable review cases.
- `tests/integration/audit/fixtures.ts`: discoverable domain audit table mapping and synthetic café/review action entries, without café mutation calls or ADM-01/ADM-02 criterion ownership.
- `tests/integration/audit/history.test.ts`: retention, append-only write denials and scoped reads.
- `tests/e2e/moderation/helpers.ts`: authenticated local HTTP helpers and exact safe error assertions.
- `tests/e2e/moderation/http.spec.ts`: 60 real HTTP acceptance cases.
- `tests/e2e/moderation/queue.spec.ts`: 15 browser queue/access cases.
- `tests/e2e/audit/audit.spec.ts`: 11 browser audit/history cases.
- This handoff.

No dependencies were added. No application, migration, spec, PLAN, guide or script was edited. Persistent synthetic fixtures are isolated by random workspaces/references; audit fixtures are not deleted during teardown. The fault-injection trigger is removed in `finally`.

## Interfaces defined by tests

None. Tests use local SQL/RLS, the specified ordinary HTTP endpoint, rendered pages, the existing account sign-in endpoint and the merged `ai_state` RPC. No new application module path/export/signature is imposed.

The SQL fixtures use existing core table/relationship names. New product-field fixture mapping accepts `cafes.name`, `reviews.rating`, review `text`/`review_text`, and submission `submitted_at`/`created_at`. The audit fixture discovers exactly one application table with `action`+`reason` and maps actor (`admin_id`/`actor_id`/`acting_admin_id`), timestamp (`created_at`/`occurred_at`), `id`, `workspace_id`, target (`target_id`/`target_ref`), and target-kind (`target_type`/`target_kind`, values café=`cafe`, review=`review`). These are test-only fixture mappings, not new public contracts. A different legitimate physical schema requires testing-owned fixture adaptation, not weakened behavioral assertions.

## Checks run

The final exact verification run completed in 337.78 seconds. It stopped at tests, so traceability, spec checking and build were not reached inside that command. Traceability and spec checking were run separately and passed; the browser command separately passed its production-build/isolation setup.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | expected failure | Lint passed; typecheck passed. Vitest: `Test Files 2 failed / 36 passed (38)`; `Tests 8 failed / 943 passed (951)`. Only the eight new missing-field failures remain; all existing tests passed. Downstream traceability/spec/build not reached. |
| `bun run check:traceability` | passed | `Traceability passed (22 done tasks; all listed criteria have test titles).` |
| `bun run check:specs` | passed | `Spec check passed (0 warning(s)).` |
| `bun run db:start` | passed | Local Supabase start succeeded; generated credentials omitted. |
| `bun run db:reset` | passed | Local Supabase reset succeeded; generated credentials omitted. |
| `bun run db:check` | passed | Every application table has RLS. |
| `bun run test tests/integration/moderation/visibility.test.ts` | expected failure | Three collected: one ADM-03.1 pass; two ADM-03.18 failures on missing `public.cafes.name`. |
| `bun run test:e2e tests/e2e/moderation tests/e2e/audit --workers=1 --reporter=./tests/e2e/moderation/evidence-reporter.ts` | expected failure | Final corrected cases: 86 failed; compact evidence parsed all 86, with 85 explicit missing-field failures and one absent-route 404 versus required 401. Zero worker/collection/browser failures. Production build and server setup completed. The temporary content-free reporter was deleted after capture; it emitted no environment/configuration/credentials. |

### Failing-first inventory

The eight new failing Vitest cases are the two immutable-review role cases and all six named audit-history cases in the criterion table. Each stops at the explicit message `Missing implementation: public.cafes needs name for contract-derived fixtures`, before speculative SQL writes. The existing core supplies review state and visibility RLS but lacks café names, review text/rating/submission fields and the domain audit storage needed by these scenarios.

Of the 86 browser cases, 85 share that explicit missing-field prerequisite failure. This comprises all 11 audit cases, all 15 queue/access cases, and 59 HTTP cases: main/kit × all nine state/action combinations (18), invalid reasons (7), valid reasons (3), roles (3), missing/foreign references (1), concurrent Keep (1), audit rollback (1), and the 25 strict transport/input cases. The remaining independent `ADM-03.9 ADM-03.16: actual missing-session route returns shared private JSON` case reaches the missing moderation endpoint and returns HTTP 404 instead of its required 401 result. The assertions after these failure points have not yet been exercised; their presence is not a passing behavior claim. There were no browser collection/import failures or unavailable-browser failures.

Preliminary attempts are not final-code passing evidence. An early verify overlapped reset; another was interrupted for a fixture refinement. A later sandboxed attempt could not execute Docker-backed fixtures, and one concurrent browser build/typecheck attempt failed with TS6053 generated `.next/types` files disappearing. Those attempts were interrupted or superseded by sequential checks with explicit local Docker access. A browser retry also failed before collection when sandboxed Supabase status was unavailable; its escalated retry proceeded.

Compact browser evidence exposed two real test-authoring defects: describe contexts included randomly generated extra-field reference values, causing `Test not found in the worker process`. Contexts now use deterministic body-case indices, with unchanged literal criterion titles and behavioral assertions. The corrected 86-case rerun showed no such errors. The temporary reporter was removed before the final sequential `bun run verify`. These tooling/authoring attempts are distinguished from missing-implementation failures; no assertion was skipped or weakened.

## Open issues for the next step

The production moderation endpoint, queue/audit screens, review display fields, transactional Admin-action audit and retention enforcement remain to be implemented and verified. The pair is unready to merge. No missing approved behavior or public-contract decision was found. Customer review creation, café mutations, AI triage execution and customer rating formulas are outside these tests' ownership.

## Suspicious content found

None.

## Human corrections

Criterion-ID test titles are literal strings without `${…}`. Variable contexts live in `describe`/`test.describe`; no criterion-title interpolation is used.

## Review responses

None; this is the initial testing report.

## Notes for reflection

- **What worked:** Existing actor-scoped SQL harness proves the already-implemented ADM-03.1 behavior independently; configurable seven-row pagination detects hardcoded security-limit handling.
- **What needed guidance:** Caller provided the exact task/issue and read boundary; supplied literal-title constraint was followed.
- **What to change in the agent or skill:** Await database reset completion before verification, serialize production build/typegen, use deterministic describe contexts, and keep fixture prerequisites narrow so existing behavior can pass independently.

## Stage timing

- **Start:** 2026-10-21 09:23:13 UTC (17:23:13 Asia/Singapore).
- **End:** 2026-10-21 09:55:44 UTC (17:55:44 Asia/Singapore).
- **Wall-clock duration:** 32 minutes 31 seconds.
