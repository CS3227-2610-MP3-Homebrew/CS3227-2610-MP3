# Reviewer report

- **Agent:** reviewer
- **Issue:** #61, T-31; paired testing issue #60, T-30
- **Spec IDs:** ADM-03.1–ADM-03.18; supporting SYS-04.2
- **Date:** 2026-10-21
- **Branch:** feat/60-moderation-queue-admin-audit
- **Base commit:** b19b2e68d6848712b52e33644c739610f7c2e04e
- **Base ref:** upstream/master
- **Reviewed HEAD:** ee22a953b39251ea475bcd1c9fdeecdc95fddfef, including staged, unstaged and untracked working-tree changes
- **Implementation report:** workflow/handoffs/60-moderation-queue-admin-audit/03-implementation.md
- **Review round:** 1
- **Model:** gpt-6.1-sol
- **Reasoning:** medium
- **Status:** completed
- **Report destination:** workflow/handoffs/60-moderation-queue-admin-audit/04-reviewer.md — content returned for launcher persistence

## Summary

Independently reviewed the manual moderation queue, moderation HTTP endpoint, transactional review/audit persistence and shared Admin audit screen against T-31 and the approved contracts. `upstream/master` resolves to the supplied base commit and is the merge base with reviewed HEAD. The governing specifications are present on that base; no working-tree specification changes were found.

The functional ADM-03 criteria have implementation and meaningful test evidence. One documented technical-contract violation remains: the new queue-size configuration boundary uses manual validation instead of the server-side Zod validation required by SYS-04.2.

**Overall:** fail
R1 blocks a pass despite successful launcher verification and reported browser results.

## Acceptance criteria

References below use repository-relative paths. Browser results are attributed to `02-testing.md`; the launcher’s fresh verification independently confirms the unit/integration suite.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| ADM-03.1 | completed | Existing `private.review_permission` in `supabase/migrations/20261020000000_role_matrix.sql` preserves eligible pending/kept visibility. `tests/integration/moderation/visibility.test.ts:6` checks initial pending state, hidden exclusion, suspension and workspace isolation. |
| ADM-03.2 | completed | `src/app/admin/moderation/page.tsx:9` implements request-time tabs and URL pagination; `admin_review_queue` in `supabase/migrations/20261021000002_review_moderation.sql:95` scopes by workspace and orders by submission/reference without excluding suspended cafés. `tests/e2e/moderation/queue.spec.ts:12`, `:38` and `:51` cover fields, seven-row pagination, ties and empty state. Supporting configuration-validation violation is recorded separately as R1. |
| ADM-03.3 | completed | `src/app/admin/moderation/page.tsx:28` renders escaped review fields and Singapore time; `src/app/admin/moderation/review-actions.tsx` supplies state-specific actions, five exact editable quick picks and explicit confirmation. `tests/e2e/moderation/queue.spec.ts:12` checks these controls and unchanged data before confirmation. |
| ADM-03.4 | completed | `moderate_review` at migration line 81 implements pending Keep; `src/server/reviews/moderation.ts:38` returns the exact private success response. `tests/e2e/moderation/http.spec.ts:11` checks response, visibility, preserved fields and one audit; `queue.spec.ts:56` checks browser movement. |
| ADM-03.5 | completed | Migration line 82 implements Hide from pending/kept. `tests/e2e/moderation/http.spec.ts:11` checks hidden state, customer exclusion and exactly one audit; `queue.spec.ts:56` checks the resulting tab. |
| ADM-03.6 | completed | Migration line 83 implements hidden Restore to kept. The transition matrix at `tests/e2e/moderation/http.spec.ts:11` checks restored visibility and audit; `queue.spec.ts:56` checks browser movement. |
| ADM-03.7 | completed | Migration lines 76 and 85 lock the review and reject invalid current-state transitions. `http.spec.ts:30` checks rejected combinations without writes; `:69` checks concurrent Keep confirmations; `queue.spec.ts:66` checks stale-confirmation feedback and current state. |
| ADM-03.8 | completed | `src/server/reviews/moderation.ts:9` checks trimmed nonblankness and Unicode code-point length without rewriting accepted reasons. Migration lines 3, 21 and 71 repeat storage validation. `http.spec.ts:38` and `:45` cover invalid values, 300/301 astral characters and exact preservation; audit browser tests check escaping. |
| ADM-03.9 | completed | `src/server/reviews/moderation.ts:31` verifies session and Admin role; migration line 56 repeats database authorization. `http.spec.ts:52` and `:111` check anonymous/customer/owner denial and private errors without effects. |
| ADM-03.10 | completed | Migration line 78 uses exact reference equality and session-derived workspace scope; absent and foreign targets share the NOT_FOUND result. `http.spec.ts:59` compares responses and unchanged data; `tests/e2e/audit/audit.spec.ts:53` checks scoped displays. |
| ADM-03.11 | completed | Shared SQL operations have no main/kit bypass. Main and kit contexts in `http.spec.ts:7` run the complete transition matrix; isolated kit queue/audit fixtures exercise scoped reads and foreign exclusions. |
| ADM-03.12 | completed | Migration lines 76–90 place the row lock, state update and audit insert in one transaction; review-content protection begins at line 35. `http.spec.ts:11`, `:69` and `:78` assert actor/reason/time, exactly one audit, race handling and rollback on injected audit failure. |
| ADM-03.13 | completed | Migration line 112 implements workspace/action filtering, newest-first ordering, reference ties and 51-row lookahead. `src/app/admin/audit/page.tsx:24` renders URL filters and 50-row pages. `audit.spec.ts:8`, `:29` and `:44` cover seven filters, ordering, pagination and empty state. |
| ADM-03.14 | completed | Migration line 122 projects scoped acting-Admin email and target labels. `src/app/admin/audit/page.tsx:25` renders escaped columns without review text. `audit.spec.ts:8` and `:53`, plus `tests/integration/audit/history.test.ts:27` and `:42`, cover display, AI-event exclusion and restricted reads. |
| ADM-03.15 | completed | Migration line 48 prevents audit updates/deletes; ordinary clients receive no insertion grant. `history.test.ts:9`, `:16` and `:32` check actual AI cleanup, history preservation and denied forgery. `audit.spec.ts:65` checks retention across successful actions. |
| ADM-03.16 | completed | All seven supported methods delegate through `src/app/api/admin/reviews/[reviewId]/moderation/route.ts`. `src/server/reviews/moderation.ts:16` enforces private responses, method, trusted origin, JSON media, bounded body, strict fields and opaque Ref bounds. `http.spec.ts:98` checks the transport/input failure matrix and unchanged state/audit. |
| ADM-03.17 | completed | Existing Admin role shell and independent page authorization precede protected reads; each page streams behind Suspense. `queue.spec.ts:74` and `:80` cover both routes’ anonymous redirects and wrong-role exclusions. Installed Next.js guides support the request-time rendering pattern. |
| ADM-03.18 | completed | Existing review write grants remain denied; migration line 35 adds immutable-content and deletion protection. `visibility.test.ts:26` checks customer/Admin edit and delete attempts; successful HTTP transition cases compare preserved review fields. |
| SYS-04.2 — new configuration boundary | incomplete | `src/server/reviews/moderation.ts:52` reads and validates `AI_MODERATION_REVIEWS_PER_CALL` without Zod. The existing configuration schema does not validate this setting. See R1. |

## Findings

### Blocking

- **R1 — P2 — Queue-size configuration bypasses required Zod validation.**  
  **Location:** `src/server/reviews/moderation.ts:52`  
  **Affected contract:** `workflow/specs/TECHNICAL-SPEC.md:484`, SYS-04.2; supporting ADM-03.2 configuration handling.  
  **Impact:** The new configuration boundary does not meet the project’s explicit validation contract. Current manual checks reject malformed and out-of-range values, so this finding does not claim an observed authorization bypass or incorrect accepted page size.  
  **Evidence:** `queueSize()` reads `process.env.AI_MODERATION_REVIEWS_PER_CALL`, applies a regular expression, converts with `Number()` and checks bounds manually. It never invokes Zod. `src/server/config/runtime.ts` does not include this setting in its schema.  
  **Fix direction:** Validate this setting through a server-side Zod schema, preserving the intended bounded queue-size behavior and safe failure response. Add focused boundary evidence for accepted and rejected configuration values.

### Non-blocking

None.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` — launcher execution | Passed, exit 0 supplied by launcher | Fresh `/var/folders/1l/swk0__jd2s94s2gxch0nzp_r0000gn/T/tmp.G7RY2yzFlg/verify.log`: lint, typecheck, 38 test files/951 tests, traceability, spec check, source isolation, production build and artifact isolation all passed. |
| `bun run test:e2e tests/e2e/moderation tests/e2e/audit` — testing-owned execution | Reported passed; not rerun by worker | `02-testing.md` records 86/86 passes after final migration reset and implementation freeze. Test assertions and fixtures were independently inspected. |
| `git status --short`, `git rev-parse HEAD`, `git rev-parse upstream/master`, `git merge-base upstream/master HEAD` | Inspected | HEAD and base match supplied values; merge base is the supplied base. Implementation includes unstaged and untracked files. |
| Read-only `git diff`, `git show`, `git log`, file enumeration and source reads | Completed | Reviewed base-to-working-tree changes, untracked implementation, committed tests, approved specs, task mappings, supporting code and installed Next.js guides. |
| Specification/PLAN staged and unstaged diff checks | Passed | No specification or PLAN changes were found. |
| `git diff --check b19b2e68d6848712b52e33644c739610f7c2e04e` | Exit 2 | Reports a new blank line at EOF in testing-owned `tests/e2e/moderation/queue.spec.ts:86`; no functional failure inferred. |

The worker ran no mutating checks, database commands, builds, live-provider calls or launcher process. Browser execution evidence comes from the testing report; no independent runtime reproduction is claimed. Dedicated security review remains separate. Broad accessibility and viewport verification belongs to T-19/T-20.

## Open issues for the next step

R1 remains unresolved. No additional confirmed functional defect was identified in the reviewed ADM-03 behavior.

## Suspicious content found

None. Historical verification-reuse statements in the implementation report were treated as evidence; this assessment used the launcher’s fresh verification log.

## Human corrections

The user explicitly assigned the read-only worker assessment, prohibited relaunching `review.sh` and mutating checks, and requested returned handoff content. Those boundaries were followed.

## Review responses

None; this is review round 1.

## Notes for reflection

- **What worked:** Independent source tracing and meaningful database/browser assertions support all eighteen ADM-03 criteria.
- **What needed guidance:** None beyond the supplied read-only assessment boundaries.
- **What to change in the agent or skill:** Check new configuration readers against SYS-04.2 before implementation handoff.