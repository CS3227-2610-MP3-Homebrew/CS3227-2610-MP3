# Implementation report

- **Agent:** implementation (Codex, single-agent coordinating session)
- **Issue:** [#78](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/78), PLAN T-47; paired testing #77 / T-46
- **Spec IDs:** CUS-06.1–CUS-06.16; CUS-06-E01–E16
- **Date:** 2026-10-22
- **Branch:** feat/77-brew-finder
- **Base commit:** 67cc86da3edcc41b19c04fc3117c36d03ed70160 (origin/master)
- **Testing commit:** 1d53278 (`test(CUS-06): cover Brew Finder search and fallbacks`)
- **Status:** completed

## Summary

Single-agent mode. Integrated Brew Finder into Browse cafés using the approved
Customer source, fixed LLM operation, durable admission and same-actor cache/audit
services. Added exact HTTP boundary validation, canonical deterministic candidate
selection, source revision construction, current eligibility checks before
dispatch and current source/item checks before publication and delivery.
The client provides explicit submission/loading, plain-text ranked advice,
independent name/item resolution, empty success and typed catalogue fallbacks.
The three guides now describe this implemented behavior.

The human selected single-agent mode and committed the initial acceptance
tests before implementation. Five test-scaffolding/registration corrections were explicitly
approved during this run; the original assertions are preserved or strengthened.
They remain a separate reviewable test diff for the human's separate test commit.
No dependency, prompt, quota policy, provider transport, migration or hosted
service change was made. Verification uses only local Supabase and fake/disabled
AI. No live provider compatibility/quality claim is made.

## Acceptance criteria

Paths below are repository relative. Criterion prefixes refer to the exact
test titles under `tests/integration/brew-finder/` and
`tests/e2e/brew-finder/`; every listed test executes without skip.

| Criterion | Status | Evidence |
| --- | --- | --- |
| CUS-06.1 | completed | `src/server/catalogue/brew-finder.ts:17`: canonical shared filters/rating and 20/20 available-item caps; client `brew-finder.tsx:36`: explicit submit, duplicate guard and cancellation. Route E15/E16 and browser submission/filter cases pass. |
| CUS-06.2 | completed | Unchanged shared AI envelope; client `brew-finder.tsx:51` resolves current names/items in Promise.all order, `:82` labels advice/empty success. Route, durable empty-success and browser ranked/empty cases pass. |
| CUS-06.3 | completed | Handler `:47` verifies actor/Customer before source/AI. Route and real browser HTTP anonymous/owner/Admin denials pass. |
| CUS-06.4 | completed | Session-RLS source remains in `catalogue/source.ts`; scope derives from verified actor at handler `:67`. Actual main/kit HTTP, forged scope/origin and durable different-actor cache cases pass. |
| CUS-06.5 | completed | Handler `:45` reuses shared bounded strict reader/schema. Query/filter/body/method/media/byte/code-point boundaries and exact preservation cases pass. |
| CUS-06.6 | completed | Source selection discards unavailable/nonmatching items; existing operation supplies no_source_data without dispatch. Sold-out-only/empty tests and browser ordinary fallback pass. |
| CUS-06.7 | completed | Existing strict complete-output/reference validation plus current result checks at handler `:63`. Malformed/foreign/misparented/duplicate/extra-field/bounds cases and durable no-success-publication case pass. |
| CUS-06.8 | completed | `llm/ai-state.ts:87` blocks currently ineligible candidates before dispatch; trusted revalidation at `:217`/`:220` checks source/items before publication, handler `:71` checks delivery and `:62` checks current cache source identity. Suspension, deleted/sold-out/changed-filter/closing-boundary and no-stale-publication cases pass. |
| CUS-06.9 | completed | Existing shared disable-before-cache/dispatch/delivery sequence retained. Populated cache, missing key, in-flight disable and real disabled HTTP/browser cases pass. |
| CUS-06.10 | completed | Existing database admission controls and provider-429 mapping retained; actual parallel final-capacity test and distinct safe usage message pass. |
| CUS-06.11 | completed | Handler separates source errors (503) from AI fallbacks. Configured admission's strict storage-failure mode preserves unavailable vs cap-denied distinction. Provider/config/overflow/source/timeout and internal infrastructure-mapping tests pass. |
| CUS-06.12 | completed | Exact input plus complete allowlisted source revision is supplied to existing model/contract/version/actor cache binding. Actual local ten-minute boundary, actor/input/filter/source/model/contract/open-state cases pass. |
| CUS-06.13 | completed | Shared operation/transport remain one nonstreaming bounded request with no retry; cache/action/provider admission and 30-second abort cases pass. |
| CUS-06.14 | completed | Shared fixed prompt, exact encoded data, no tools/extra reads/writes; React renders reasons as text with encoded domain navigation. Injection/context/no-fetch/inert HTML/Markdown and origin cases pass. |
| CUS-06.15 | completed | Advice only opens ordinary café links. Real HTTP test proves zero search-created orders, independent suspension/foreign-scope café and order denials. |
| CUS-06.16 | completed | Source revision excludes raw reviews/private fields; durable cache success publication follows current checks. Actual persisted audit/accounting canary checks and invalid/stale no-success-publication cases pass. |

All sixteen CUS-06 evaluation cases map to these passing route/durable/browser
cases as detailed in `01-testing.md`, with the approved fixture corrections
listed below. E01 remains a reviewer-readable synthetic coffee/tea relevance
example, not a numeric score or evidence of live model ranking quality.

## Self-review

Reviewed the merge-base-to-working-tree diff, including untracked files, against
the CUS-06 spec on origin/master and its integration/security contracts, using
the sdd-review criteria and security-reviewer baseline. No independent reviewer
or security agent was invoked in single-agent mode. Final verify passes;
there are no known open P0/P1 code findings in the inspected scope.

**Overall:** pass
All assigned CUS-06 criteria pass, final verify passes, and the complete browser
suite passes with one worker (520/520). No open P0/P1 finding remains in scope.
The earlier concurrent auth/navigation failures remain recorded below; their
root cause is unconfirmed and no assertions/timeouts were weakened.

| Finding | Priority | Fix and evidence |
| --- | --- | --- |
| SR-01: Empty remounted search disabled after filter edit | P2 | Search is disabled only while pending; required/nonblank query validation remains. The late-response/filter browser case now passes with no stale advice. |
| SR-02: Admission-storage outage could appear as usage limit | P2 | Added opt-in `throwOnUnavailable` to the existing admission adapter and enabled it in configured AI state. Genuine denials retain boolean false; malformed/error/exception storage responses produce safe unavailable fallback. Supplementary internal test covers these distinctions and default compatibility. |
| SR-03: Cache miss could send a newly ineligible snapshot candidate to provider | P1 | Shared state checks every selected candidate against current eligible IDs before admission/dispatch. Local suspension test proves no extra provider call; internal test proves neither admission nor transport runs for an ineligible source. Closed. |
| SR-04: Stale menu could otherwise enter cache before final HTTP check | P2 | Feature-owned `revalidate` hook reads current authorized source and validates complete café/item membership around ready/cache auditing, before publication. Real durable sold-out-during-generation test observes zero writes; final HTTP check remains. Closed during initial implementation. |
| SR-05: Full catalogue revision could change during a cache hit without invalidating its still-available references | P2 | Cache delivery now compares the fresh complete source revision with its initial snapshot as well as validating current references. An internal rating-change-during-cache-delivery regression requires unavailable fallback with no provider call/write. Closed. |

Implementation repair cycles used: **3 of 3**. Cycle 1 addressed the pending-form
behavior and infrastructure-failure distinction; cycle 2 addressed current
candidate eligibility before dispatch; cycle 3 strengthened cache-delivery source
revision equality. The first full verification attempt was stopped when SR-05
was identified, and final checks are restarted on the corrected code. Test-scaffolding corrections were
explicit human-authorized test fixes, not attempts to weaken failing criteria.
An intermediate affected-test run without Node on PATH encountered the known
Bun/jsdom worker issue; the final Node 24 run passes all 359 affected cases.

### Security baseline and evaluation coverage

No confirmed open security findings in the reviewed scope. This is a bounded
self-review, not a claim that prompt injection or all vulnerabilities are absent.

| Boundary / applicable AI-security cases | Evidence and limits |
| --- | --- |
| Identity, role, workspace, least privilege; E-01, E-07, E-13, E-16 | Verified Customer/strict Origin before source; ordinary source/detail use the session client/RLS; only existing AI infrastructure RPCs use the privileged client. Actor/workspace are never HTTP inputs. Current eligibility and actor checks repeat around asynchronous delivery. Main/kit and separate order/café tests pass. |
| Direct/indirect injection, source minimization, no agency; E-02, E-03, E-06 | Only query and current selected café/item fields reach unchanged fixed prompt/data boundary. No tools, remote URL from output, order/review history, raw reviews or business writes. Malicious names/query/reasons remain data. |
| Output bounds and inert sinks; E-05, E-06 | Existing strict server schemas reject complete invalid results; revalidation checks current candidate/item relations. Client parses typed envelopes, resolves names through authorized GET and renders React text; no HTML/Markdown evaluation or model-authored URLs. |
| Replay, concurrency and cost; E-08, E-09, E-10, E-11 | Existing atomic database admission/expiry/model/contract binding retained; disabled state precedes cache and is rechecked before delivery; one request/no retries/30-second and byte bounds unchanged. Actual final feature-cap concurrency and ten-minute expiry tests pass; full suite checks broader foundation limits. |
| Secrets, logs/audit, persistence; E-12 | No environment-file reads, credential literals, raw logging or new telemetry. Cache identity is hashed and scoped; stored audit/admission metadata is inspected with synthetic canaries. Existing retention/maintenance implementation is unchanged and remains foundation-owned. |
| Supply chain/configuration | No dependency, lockfile, workflow or deployment change. Optional internal admission/revalidation capabilities cannot be submitted through the strict HTTP body. No CVE or external-service claims are made. |
| Exclusions | E-04 and Admin-confirmation portions of E-13 belong to moderation; E-14/E-15 kit provisioning and E-17/E-18 maintenance are unchanged. No retrieval, tools, uploads or persistent LLM memory is introduced. Their owning foundation regression suites remain applicable but no new feature ownership is claimed. |

## Files changed

- `src/app/api/ai/brew-finder/route.ts`: delegates all methods to the feature HTTP boundary.
- `src/server/catalogue/brew-finder.ts`: authorized source/candidate/revision adapter, actor/Origin/input checks, current-source lifecycle and safe errors/envelopes.
- `src/server/catalogue/source.ts`: exports the canonical filter/rating selector reused by ordinary browse and Brew, plus source types.
- `src/lib/catalogue/clock.ts`: shares merged intervals and supplies stable next-state-change identity without changing ordinary opening-state output.
- `src/server/llm/ai-state.ts`: trusted pre-publication domain revalidation and current source-candidate eligibility.
- `src/server/llm/ai-state-client.ts`, `usage.ts`: configured storage-error distinction with unchanged standalone boolean behavior and quotas.
- `src/app/customer/cafes/brew-finder.tsx`, `filters.tsx`, `page.tsx`: accessible submission, loading, cancellation, ordered inert advice, current detail resolution and ordinary fallback.
- `tests/unit/brew-finder-state.test.ts`: four supplementary internal cases, no criterion IDs in titles.
- Three committed acceptance-test files: only the five human-approved scaffolding/locator/registration corrections below.
- `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `README.md`: implemented behavior, architecture, limitations and internal reuse; no reflections or product-site changes.
- This report. No specs, templates, agents, skills, migrations, dependency or configuration changes. The coordinating session changes only T-46/T-47's PLAN Status lines at close-out.

## Documentation claim-to-evidence

User Guide keeps its existing numbered structure and adds section 7.2/TOC;
Developer Guide adds the Brew Finder subsection/TOC, internal reuse and accurate
consumer/limitation references; README's product summary links advisory search.

| New or changed guide claim | Code / passing test evidence |
| --- | --- |
| Customer Browse cafés includes Brew Finder | Page imports/uses client boundary; client `brew-finder.tsx:67`–`:74`; browser submission test. |
| Same-workspace Customer/demo-kit access | Handler `:47`–`:51`; actual main/kit/role HTTP tests. |
| Label, Search/Enter and code-point limit; exact oversized message | Client `:36`–`:45`, `:72`–`:78`; shared query-boundary cases. |
| Typing/filter edits make no AI request | Client submit-only fetch and `clear`; filters change callback; browser no-call/filter cases. |
| Pending message and duplicate protection | Client `:38`, `:76`, `:80`; browser loading/duplicate test. |
| Query/filter edits clear/abort; remount may clear query | Client `:31`–`:34`, `:73`; page key from params; browser late-response and cleared-advice cases. |
| Ranked AI-generated advice with current item names and plain-text reasons | Client `:51`–`:59`, `:82`–`:85`; browser ranking/inert text test. |
| Empty AI success says No close match found and leaves catalogue | Client `:83`, `:89`; route/durable/browser empty-success tests. |
| Café link and separate order action; search creates no order | Client `:84`; browser CUS-06.15 real HTTP case. |
| Exact disabled fallback message | Client `:19`; typed fallback browser case. |
| Exact usage-limit message | Client `:20`; typed fallback browser case and durable concurrency. |
| Exact unavailable message | Client `:21`, `:61`; typed fallback browser case and provider/source-failure cases. |
| Exact no-source message, sold-out-only ordinary catalogue retained | Client `:22`; selection adapter `:21`/`:24`; route sold-out-only and browser fallback cases. |
| At most one provider request/no retries, cache under ten minutes and action limits on hits | Existing shared operation sequence, state cache identity/admission; route one-call/timeout and durable expiry/identity cases. |
| Live ranking quality is unmeasured | All transports are fake/disabled; no live quality evaluation or numeric performance assertion. |
| Developer architecture/cache/current checks and shared service changes | Handler/source/state/usage code and the four internal supplementary tests; integration cases use actual local durable services. |
| No external snippet/dependency/workflow/migration change | Diff inventory and unchanged manifest/lockfile/configuration. |

Screenshots a human should capture for the guide: Brew Finder on Browse cafés
with ranked advice, valid empty advice plus catalogue, each typed fallback, and
a narrow viewport showing the form and suggestion links. No screenshots or
deployment URLs are fabricated here. No new CUS-06 code/spec disagreement remains
known; the unrelated authentication observations are recorded below.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run lint` | passed | No warnings/errors on final application/internal-test code. |
| `bun run typecheck` | passed | Next route generation and tsc succeed. |
| `bun run test tests/integration/brew-finder tests/unit/brew-finder-state.test.ts tests/unit/catalogue tests/integration/catalogue tests/integration/llm tests/unit/usage` | passed | 359 tests across 13 files, no skipped cases; 52.72 seconds. |
| `bun run test:e2e` | failed outside Brew Finder cases | Final-code full run: 518 passed, 2 failed, 8.4 minutes. The unchanged SYS-05.2 prefetch and main-Customer navigation cases failed; all sixteen Brew Finder cases passed. Earlier full run before cache-only hardening passed 520/520. |
| `bun run test:e2e tests/e2e/brew-finder tests/e2e/auth/role-gates.spec.js tests/e2e/navigation/roles.spec.ts --grep 'CUS-06\|invalid session\|main customer' --workers=1 --repeat-each=2` | passed | 36/36, 2.0 minutes: all sixteen Brew Finder cases plus both broad-run failures pass twice with unchanged assertions/timeouts and one worker. This is a selected diagnostic/feature run, not a passing full-suite rerun. |
| `bun run verify` | passed | Lint, typecheck, all 1,218 tests across 65 files (595.94 seconds), traceability, specs, production build and source/client-artifact isolation pass after the final approved test registration correction; no skipped tests. |
| `bun run test:e2e --workers=1` | passed | Final full browser gate: 520/520 passed in 14.0 minutes, including all sixteen Brew Finder cases and both earlier concurrent failures. No skips/retries/assertion or timeout changes. |
| `bun run check:specs` | passed | Guides, links and workflow inventory check: 0 warnings. |
| `bun run check:traceability` after PLAN close-out | passed | 46 done tasks; all listed criteria have test titles, including the three CUS-06.3 denials. |
| `git diff --check` | passed | No whitespace errors. |

Node-based test/build tools use bundled Node 24.19.0 on PATH; commands keep Bun
as package runner. Local Docker access was explicitly approved. No secret values
or `.env*` files were inspected. Initial failed attempts and corrections are
recorded under Self-review/Human corrections, not claimed as final passes.

## Open issues for the next step

- The approved CUS-06.3 literal-title registration passes static traceability.
  Final verify and the complete serial browser suite pass. Both PLAN tasks are
  done. Post-status traceability passes for all 46 done tasks, spec validation
  passes with zero warnings, and git diff --check passes.
- A prior concurrent full browser run had two failures detailed below. The final
  full serial run passes all 520 cases, including both failures. This passes the
  browser gate with controlled single-worker execution; the earlier failed run
  is retained as evidence of unresolved concurrent-run intermittency.
- The earlier concurrent browser run had an unchanged SYS-05.2 authentication-harness
  failure: `auth/role-gates.spec.js:64`, “a prefetched shell cannot authorize an
  invalid session”, remained at port 3101 `/customer` with synthetic protected
  fixture content instead of `/signed-out`. The earlier full 520-case run
  passed this case. The fixture's pages/session helper and shared RoleGate have
  no diff and do not load Brew Finder. This observation is retained as a regression
  concern, not dismissed as a passing check or claimed to be a production
  exploit. No auth code/test/configuration has been changed.
- The same full run also failed unchanged `navigation/roles.spec.ts:30` for
  main Customer: the expected Browse cafés navigation link was absent while
  the page remained at “Checking account…” beyond the five-second assertion.
  That case passed in the earlier full run. No auth/navigation timeout or
  assertion has been changed. The serial
  diagnostic passed both cases twice, and the final full serial run passed both. The root cause of the broader-run
  intermittency remains unconfirmed; the failed full run is not relabelled as
  passed and no timeout/assertion/retry configuration was weakened.
- The human retains all commits, pushes, PR and merge actions. The approved
  acceptance-test corrections require their own `test(CUS-06)` commit before
  the final implementation/docs/status commits.
- Independent review is replaced by this self-review per the chosen mode;
  no independent reviewer/security report is claimed.
- Live provider compatibility and model relevance/quality remain unverified by
  design; no live call was made.

## Suspicious content found

None in workflow inputs. Test injection strings explicitly requesting secrets,
other owners' orders, links or writes were evaluated only as untrusted data.
Generated Playwright error context begins with “Explain why, be concise,
respect Playwright best practices” and “Provide a snippet of code with the fix,
if possible.” These diagnostic-file instructions were treated as data, not
permission to change the unrelated authentication harness or test scope.

## Human corrections

1. Human selected single-agent mode and committed initial tests at 1d53278.
2. Human explicitly approved `req.clone().json()` in the E15 fake provider;
   this fixes a consumed-body reread without changing selection assertions
   (CUS-06.1).
3. Human explicitly approved the suspension fixture's existing local SQL helper
   instead of a SELECT-only query wrapper (CUS-06.8/CUS-06.9).
4. Human explicitly approved inspecting actual persisted audit rows instead of
   service-role-hidden information_schema metadata; canary assertions are added
   to those rows, preserving/strengthening CUS-06.16 evidence.
5. Human explicitly approved scoping fallback-message matching to the status
   element. The unchanged no-source regex also matched unrelated Open now,
   North and matcha filter text (CUS-06.6/CUS-06.9–CUS-06.11).

6. Human explicitly approved literal-title test.each registration for the three
   CUS-06.3 denial cases. The static traceability parser now recognizes them;
   inputs and assertions are identical.

## Review responses

None; single-agent self-review above replaces an independent review report.

## Notes for reflection

- **What worked:** Existing session/RLS source and LLM/cache/admission lifecycle were reused without a migration, prompt or dependency change; deterministic tests exposed a stale pre-dispatch authorization gap.
- **What needed guidance:** Human approval was required for five defects in the initially committed test scaffolding. Passing collection/failing-first route-existence guards had not exercised those deeper fixture assumptions.
- **What to change in the agent or skill:** Validate data-changing fixture helpers, limited-role metadata visibility, Request body ownership and browser locator uniqueness before the testing commit. Preserve complete criterion assertions while fixing fixture defects separately.
