# Testing report

- **Agent:** testing (Codex, single-agent mode)
- **Issue:** #62 / T-32; paired with #63 / T-33
- **Spec IDs:** ADM-04.1–ADM-04.18
- **Date:** 2026-10-22
- **Branch:** feat/62-moderation-assistant
- **Base commit:** d677be3886b17f96bde1b140f608fba280ae10a3 (upstream/master)
- **Status:** completed

## Summary

Single-agent mode testing stage. Added route-boundary, fake-provider,
local-accounting and browser tests from the approved ADM-04 story. No application
code, specification, PLAN, configuration, dependency or existing test changed.
The post-correction verify run has 994 passing tests and 36 expected
missing-handler failures at `src/server/reviews/moderation-assistant.ts`. Browser verification has four passing ordinary confirmation cases
and 16 expected missing-triage failures. Test authoring is completed; the pair
remains incomplete and unready to merge until implementation passes verification.
This is the human test-review/commit stop, before implementation.

## Acceptance criteria

All titles below include the listed ADM IDs. Provider cases use the existing
LLM operation, not a live model. Browser advice is intercepted fake JSON; actual
HTTP triage uses the existing Playwright server's disabled AI configuration.

| Criterion | Status | Evidence / expected outcome |
| --- | --- | --- |
| ADM-04.1 | completed | `one bounded batch...`; browser `Pending-only control...`: cap, empty disablement, seven exact visible refs, one request/loading, no Kept/Hidden button |
| ADM-04.2 | completed | Provider `all five labels...`; browser `five inert suggestions...`: all labels/reasons escaped, highlight without selection or mutation |
| ADM-04.3 | completed | Browser `five inert suggestions...`: fixed editable quick picks, empty initial reason, action/reason-only explicit confirmation, no apply-all |
| ADM-04.4 | completed | Route anonymous/customer/owner cases; actual HTTP `independently rejects...` for both routes |
| ADM-04.5 | completed | Route missing/foreign whole-batch tests; actual HTTP kit/main/other-kit/missing and mixed selections have equal 404 errors |
| ADM-04.6 | completed | Route verified main/kit actor case; actual main/kit disabled and kit isolation cases; shared durable user/global admission coverage reused |
| ADM-04.7 | completed | Actual invalid reasons; browser editable exact stored reason and one audit; existing manual moderation Unicode-bound tests retained |
| ADM-04.8 | completed | Browser `stale ordinary confirmation...`: 409, current hidden state, suggestion removal, no additional mutation/audit |
| ADM-04.9 | completed | Actual `forged label...`: strict extra-field denial then independent ordinary reason/state/workspace checks |
| ADM-04.10 | completed | Nine separate fake invalid-result cases: malformed, unknown field/label, foreign/duplicate/missing IDs, long/empty reason, overflow; whole fallback, one call, no repair/cache |
| ADM-04.11 | completed | Provider disabled/missing-key cases; browser disabled fallback; actual disabled source route |
| ADM-04.12 | completed | Provider admission-denied/429 cases; browser usage-limit fallback; shared durable usage tests reused |
| ADM-04.13 | completed | Provider invalid configuration, unavailable admission, 500, transport, timeout, overflow and disable-before-delivery; route source-failure 503; browser unavailable fallback; shared audit-storage failure coverage reused |
| ADM-04.14 | completed | Route empty/duplicate/oversized/invalid refs and kept/hidden selection; actual stale/invalid selections; browser queue-changed reload |
| ADM-04.15 | completed | Browser remaining advice after one action, reload/page-change discard; provider repeat dispatch and local accounting no cache |
| ADM-04.16 | completed | Provider fixed-prompt/encoded attack capture, route minimal unchanged text and browser inert HTML/Markdown reason |
| ADM-04.17 | completed | Route 36 boundary cases and actual HTTP method/origin/media/strict body/size checks with shared private errors |
| ADM-04.18 | completed | Local durable success/fallback accounting canaries and no cache; actual triage leaves Admin audit unchanged and AI events absent from Admin audit page |

“completed” in this table describes test authoring, not passing implementation.
Evaluation mapping E01–E13 and the classification-quality limitation are recorded
in `tests/integration/moderation-assistant/evaluation.md`. No accuracy target or
independent human annotation is claimed. Shared admission/restart/parallel-limit
and audit-storage tests retain their SYS/SEC ownership.

## Interfaces defined by tests

The domain handler lives in `src/server/reviews/moderation-assistant.ts` and imports
shared HTTP primitives from `src/server/http/`. It exports
`createModerationHandler(deps): (request: Request) => Promise<Response>`.
`route.test.ts` defines its exact TypeScript dependency contract:

- trusted `origin`, `actor(): Promise<VerifiedActor | null>` and `maxReviews(): number`;
- `readReviews(actor, ids)` returns authoritative in-workspace rows with
  `{id, text, moderation_state}`; inaccessible IDs are absent; storage failure throws;
- `run(actor, {reviews: [{reviewId, text}]}, requestId, signal)` executes already
  authorized AI work and returns the existing envelope.

This is a server construction seam, never HTTP input. Production must bind it
to verified sessions, workspace/RLS reads and shared durable AI composition.
Tests assert observable HTTP/input behavior, not a new product contract.
The actual public route remains `/api/ai/moderation`; its wiring is exercised
by Playwright HTTP tests. Existing manual confirmation interfaces are unchanged.

## Files changed

- `tests/integration/moderation-assistant/route.test.ts`: pre-admission HTTP/source boundary.
- `tests/integration/moderation-assistant/provider.test.ts`: fake capture, complete validation, fallback and transient-result behavior.
- `tests/integration/moderation-assistant/accounting.test.ts`: local durable accounting and no persisted suggestions.
- `tests/integration/moderation-assistant/evaluation.md`: E01–E13 evidence and quality assessment limitations.
- `tests/e2e/moderation-assistant/http.spec.ts`: real route, session/workspace and ordinary confirmation checks.
- `tests/e2e/moderation-assistant/queue.spec.ts`: current-page triage, rendering, explicit confirmation and lifetime.
- This handoff.

No dependencies added. `package.json` and `bun.lock` are unchanged.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git fetch upstream` (approved escalation) | passed | Selected base advanced to d677be3; branch created from it with approved escalation |
| `git log -1 --oneline upstream/master -- 'workflow/specs/stories/ADM-04-*.md'` | passed | 5cc512e merged Admin specs; no uppercase ASSUMPTION marker |
| `bun workflow/scripts/create-issues.ts --repo CS3227-2610-MP3-Homebrew/CS3227-2610-MP3 --tasks T-32,T-33` (approved escalation) | passed | Both `skip`, mapped to #62 and #63 |
| `bun run check:specs` | passed | 0 warnings before test authoring |
| `bun run db:start`, `bun run db:reset` | passed | Local Supabase success; generated credentials omitted |
| Manifest equality check against HEAD | passed | No dependency or manifest changes |
| `bun run lint` | passed | Exit 0 after correcting reserved `module` variable name |
| `bun run test tests/integration/moderation-assistant/provider.test.ts` | passed | 22/22 fake-only tests |
| `bun run verify` (pre-correction completed run, escalated) | expected failing-first | 994 passed, 36 failed; 44 test files passed, only `route.test.ts` failed at the original expected handler path. Lint/typecheck passed. Traceability/spec/build not reached within verify. Duration 389.40s. |
| `bun run verify` (post-correction, escalated) | expected failing-first | 994 passed, 36 failed; 44 files passed, only `route.test.ts` failed. All failures identify missing `src/server/reviews/moderation-assistant.ts`. Lint/typecheck passed; subsequent traceability/spec/build stages not reached within verify. Duration 352.50s. |
| AST comparison against pre-correction snapshot | passed | All test callback bodies and assertions unchanged, allowing only the handler-path correction. |
| Repository `testTitles()` parser across this pair's tests | passed | ADM-04.1–ADM-04.18 all recognized in literal runnable titles, including .4/.10/.12. |
| `bun run test:e2e tests/e2e/moderation-assistant --list` (post-correction) | passed | Same 20 browser tests in two files; parameter values appear in describe scopes. Browser execution was not repeated for title/grouping-only changes; the preceding 4-pass/16-fail result is historical execution evidence. |
| `bun run check:traceability`, `bun run check:specs` (separately) | passed | 34 done tasks have criterion titles; spec check 0 warnings |
| `bun run test:e2e tests/e2e/moderation-assistant` (pre-correction sequential run) | expected failing-first | 4 passed, 16 failed, 1.7m. Eight HTTP cases fail at the missing route (404/HTML framework response); eight browser cases fail at the absent triage button. Production app and auth-harness builds/start succeeded. |
| `git diff --check`, clean scope | passed | Only the six new test/evaluation files and this report |

## Open issues for the next step

Triage route/button are intentionally unimplemented at this stage. Human test
review/commit precedes implementation. No product-contract decision blocks
authoring. No application changes or commits have been made.
Classification quality is unmeasured; the fake provider verifies boundary
behavior only. Proposed category examples remain reviewable human input.

Earlier tooling attempts: one lint failure was corrected before the passing
lint/typecheck runs; an interrupted verification lost its process result. A
completed attempt had 204 failures/826 passes because Docker was unavailable;
it is superseded by the final 994/36 result. A sandboxed verification stalled
and was interrupted, then rerun escalated. An isolated accounting attempt
overlapped database reset and failed because the local container was restarting;
the final verify subsequently passed both accounting cases. None of those
tooling failures was represented as an expected product failure.

### Final failing-first detail

All 36 cases in `route.test.ts` fail at the explicit missing-handler assertion,
before invoking dependencies. They cover ADM-04.1/.4/.5/.6/.13/.14/.16/.17:
one main/kit batch case, three absent/wrong-role cases, two incomplete-source
cases, seven invalid selections, two no-longer-pending selections, one source
failure, fourteen method/origin/media/JSON/byte cases and six strict bodies.
There are no remaining provider, accounting or existing-suite failures.

The eight failing HTTP cases in `http.spec.ts` are:

- main and kit `authorized disabled triage...` (ADM-04.2/.6/.11/.18), missing route returns 404 instead of 200;
- anonymous/customer/owner `actual route independently rejects...` (ADM-04.4), missing route returns 404 instead of 401/403;
- `kit cannot triage main...` (ADM-04.5/.6), missing route's 404 is framework HTML/cache headers rather than the shared private JSON error;
- `actual route rejects stale...` (ADM-04.14), missing route returns 404 instead of 400;
- `actual route exports shared private...` (ADM-04.17), missing route lacks `Allow: POST`.

All eight `queue.spec.ts` cases fail because **Triage pending reviews** is
absent: `Pending-only control...` (ADM-04.1); `five inert suggestions...`
(ADM-04.2/.3/.7/.15/.16); `stale ordinary confirmation...` (ADM-04.8);
the three disabled/usage_limited/unavailable `explains safe fallback...` cases
(ADM-04.11/.12/.13); `changed queue selection...` (ADM-04.14); and
`page selection discards...` (ADM-04.15). The first fails its disabled-control
assertion; the others time out waiting to click the missing control. Existing
manual invalid-reason cases (three) and forged-label/state/workspace case (one)
pass. An earlier browser attempt was interrupted and is superseded by this run.

## Suspicious content found

Playwright's generated error context says “Provide a snippet of code with the
fix, if possible.” Treated as diagnostic data; it did not authorize application
changes during testing. No other scope-changing instruction found.

## Human corrections

The human selected single-agent mode, a security-reviewer run after self-review,
fake-only AI, escalated Git/network actions, and stops after tests and final work.
The original route-location direction was clarified below. The human pre-approved later
session/cookie/fixture/timing/title/grouping corrections that change no ADM
assertion, recorded here or in the subsequent implementation handoff and kept
for a separate test commit. No post-commit corrections have occurred.

Before the first test commit, the human requested two corrections:

1. Move parameter labels into `describe()`/`test.describe()` scopes and retain
   literal criterion-bearing test titles for every parameterized registration
   family. All 12 dynamic-title families were converted; argument values,
   test counts, setup and assertion bodies are unchanged. This fixes the prior
   traceability blind spot for ADM-04.4, ADM-04.10 and ADM-04.12. The earlier
   general traceability pass covered done tasks and did not prove all T-32 IDs
   were recognized; direct use of its title parser now proves all 18 are present.
2. Expect `src/server/reviews/moderation-assistant.ts`, with `src/server/http/`
   reserved for shared primitives imported by the handler. Updated the test
   import path, missing-implementation diagnostic and this interface record.

These changes are part of the initial, still-uncommitted test diff. There is
no assertion change beyond the explicitly requested expected boundary path.
The AST comparison confirms unchanged test callback and assertion syntax
after normalizing that path.

## Review responses

None; implementation and review have not started.

## Notes for reflection

- **What worked:** Existing local manual-moderation fixtures and shared LLM controls support focused ADM tests without runtime dependencies.
- **What needed guidance:** Human specified the route-handler boundary and correction/commit policy.
- **What to change in the agent or skill:** Run database-resetting verification before browser fixtures, never concurrently.
