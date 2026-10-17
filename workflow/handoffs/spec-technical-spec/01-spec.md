# Spec report

- **Agent:** spec
- **Issue:** None; technical specification before issue creation.
- **Spec IDs:** SYS-04–SYS-11 and their acceptance criteria; TECHNICAL-SPEC ASM-01–ASM-07.
- **Date:** 2026-10-17
- **Branch:** docs/technical-spec
- **Base commit:** c71a5fec8b480c58dd8a799fce40394ee7d483e1
- **Status:** awaiting-decision

## Summary

Drafted TECHNICAL-SPEC.md for architecture, relational data/ownership and RLS,
configuration, environments, LLM module boundaries and durable Postgres usage
enforcement. SYS-04–SYS-11 have testable acceptance criteria. The rendering
decision preserves Cache Components and Partial Prefetching, uses proxy session
refresh and Suspense-wrapped auth/data reads, and restricts plain `use cache` to
public catalogue data with current eligibility checks. Persistent AI caches and
counters are in Postgres.

README's technical row is Written. PRODUCT-SPEC changes are limited to removing
its technical-unwritten claims and pointing PRODUCT-SPEC ASM-02 to
TECHNICAL-SPEC ASM-01. Product stories, priorities and proposed limit values are
unchanged. INTEGRATION-SPEC, AI-SECURITY-SPEC and story contracts are linked as
planned documents rather than defined here.

Drafting is complete; approval and implementation are not claimed. The seven
marked assumptions and downstream contracts below require decisions before
dependent work. The user-supplied facts, including email confirmation off in
both dev and prod, are recorded as decisions rather than invented assumptions.
No code, tests, agent/skill files or hosted services were changed, and no live
LLM calls or secret-file access occurred.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Cover technical scope without defining integration/security/story contracts. | completed | Technical sections and SYS-04–SYS-11; explicit downstream boundaries and entity dependencies. |
| Verify Next.js behavior from installed docs. | completed | Read the bundled Proxy, Cache Components, Partial Prefetching, `use cache`, authentication-with-cache-components and `instant` guides; paths are recorded in TECHNICAL-SPEC. |
| Model fixed product entities, ownership and RLS; check every table in CI. | completed | Data-model/RLS sections and SYS-06; unspecified permissions and story lifecycle details are not inferred. These are specified acceptance contracts, not implemented policies. |
| Specify durable usage control and explain unobservable key quotas. | completed | ASM-01, usage-control section and SYS-09–SYS-10; call-count daily caps, response token accounting and 429 fallback are explicit. |
| Finalize assumptions and dependent behavioral contracts. | awaiting-decision | ASM-01–ASM-07 and downstream issue tables below. |
| Make only requested supporting-spec edits. | completed | README technical status and minimal PRODUCT technical-written/ASM-02 changes; no product story/value changes. |
| Run required checks and record actual results. | completed | ID/criterion checks and `git diff --check` passed; exact `bun run verify` passed in the parent session. All five changed files passed the relative-link audit with only inherited planned-document targets missing. |

## Files changed

Owned by this spec-agent run:

- `workflow/specs/TECHNICAL-SPEC.md`: new technical specification.
- `workflow/specs/README.md`: only the technical row's status, Planned → Written.
- `workflow/specs/PRODUCT-SPEC.md`: only technical-written wording and the
  ASM-02 reference to TECHNICAL-SPEC ASM-01.
- `workflow/handoffs/spec-technical-spec/01-spec.md`: this new report.

The main session separately made the explicitly requested correction to one
bullet in `logs/shawnnygoh/005-parallel-spec-id-workflow.md` before delegation.
This spec agent did not edit any log. Existing reports and all unrelated files
were preserved.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun -e '…'` README ID/criterion check | Passed; exit 0. | Exactly eight unique SYS definitions, SYS-04–SYS-11; no SYS definition below 04. Exactly seven assumption markers, ASM-01–ASM-07, in sequential order. Every SYS definition has `.1` acceptance criteria. |
| `git diff --check` | Passed; exit 0. | No tracked whitespace errors after specification/supporting-file edits. |
| `bun /private/tmp/homebrew-technical-spec-check.ts` | Passed; exit 0 in the parent and final spec-agent run. | Rechecked eight unique SYS definitions (all ≥04 with `.1` criteria), seven sequential ASM markers, and every relative Markdown link in all five changed files, including the log. Twelve link occurrences: eight resolve existing targets/anchors; four intentional missing occurrences are the two inherited PRODUCT links each to planned INTEGRATION-SPEC.md and AI-SECURITY-SPEC.md. No unexpected missing targets or anchors. The log and README contain no relative Markdown links. |
| Parent scope audit using `git status --short --untracked-files=all` and Bun baseline comparison against `git show HEAD` | Passed, as reported by the parent. | Exactly the five authorized changed paths. The full log equals baseline plus the single requested bullet replacement. PRODUCT-SPEC's entire User stories section is byte-for-byte unchanged. |
| Parent-run `bun run verify`, exactly as written, without pipe/redirection | Passed; exit 0, as reported by the parent. | ESLint, `next typegen && tsc --noEmit`, and production `next build` passed on Next.js 16.4.2 with Cache Components/Partial Prefetching. The existing warning about ignored `/Users/shawnnygoh/package-lock.json` outside this Git repository required no change. |

The build verifies the existing starter application; it does not prove the new
unimplemented technical requirements. Zod, `openai`, Supabase support and the
target test tools are not yet wired into the starter. No installation, new test
suite or hosted/live integration check was part of drafting.

## Open issues for the next step

### Issues routed to TECHNICAL-SPEC by product report 02

All three source rows labeled TECHNICAL-SPEC in
[product report 02](../spec-product-spec/02-spec.md#open-issues-for-the-next-step)
are accounted for here; the middle source row has several subparts.

| Routed issue | Resolution or remaining decision | Where |
| --- | --- | --- |
| Actual request/quota limits for each dev/prod key and confirmation of proposed app limits against them. | Still open as an observable entitlement question: team-supplied 17 October probe had no rate/cost headers and key-info returned 404; exhausting a key is not a verification method. Documented defaults remain this file's ASM-01. Final app values now belong to AI-SECURITY-SPEC; no confirmed per-key entitlement is claimed. | TECHNICAL-SPEC Assumptions, Usage-control and cache enforcement, SYS-09.5; PRODUCT-SPEC ASM-02 now points to TECHNICAL-SPEC ASM-01. |
| Cache eligibility and scope. | Mechanism resolved: only validated results, repeat authorization/current catalogue eligibility, environment/actor/café/source/model/schema isolation and Postgres persistence. Proposed reuse scopes/expiry/manual-refresh behavior need ASM-05 confirmation; exact fingerprint/input schemas and sales windows remain integration/story dependencies. | Rendering decisions, data model, Cache eligibility and scope, ASM-05, SYS-05.3 and SYS-10. |
| Daily reset timezone. | Resolved: Asia/Singapore for daily boundaries and opening hours. Proposed fixed-minute/database-clock bucketing remains ASM-04 for confirmation. Overnight/boundary opening-hours behavior remains a story decision. | Data model, Configuration, ASM-04, SYS-09.3. |
| Refresh accounting. | Mechanism resolved: distinguish operation, refresh, cache hit and dispatched-call events; manual refresh bypasses cache, not admission. Proposed dispatch charging/refund behavior needs ASM-07 confirmation. What counts as an AI action or chargeable refresh remains AI-SECURITY-SPEC's decision. | Admission and windows, ASM-05/ASM-07, SYS-09.2–SYS-09.4. |
| Quota-unit measurement/enforcement. | Mechanism resolved: no reported cost means the app uses a configurable daily provider-call cap and stores token counts only when present. Product $5/$2 proposals are not enforceable cost readings. Final call-count values and their conservative relation to proposed budgets remain AI-SECURITY-SPEC decisions; unobservable provider limits remain ASM-01. | Usage-control and cache enforcement, Configuration, SYS-09.5. |
| Accessibility and measurable responsive/performance criteria. | Proposed defaults supplied by the user are recorded as ASM-02 (WCAG 2.2 AA core flows with automated checks) and ASM-03 (usable from 360 px), awaiting team confirmation. No numeric performance targets are introduced. | Accessibility and responsive behavior, SYS-11. |

### Assumptions requiring confirmation

| Assumption | Remaining decision and consequence |
| --- | --- |
| TECHNICAL-SPEC ASM-01 | Accept documented provider defaults as unverified planning assumptions; actual dev/prod key entitlements remain unobservable. AI-SECURITY-SPEC must choose conservative app values without claiming verified cost enforcement. |
| TECHNICAL-SPEC ASM-02 | Confirm WCAG 2.2 AA for defined core flows, automated checks plus assessment of applicable criteria automation cannot establish. |
| TECHNICAL-SPEC ASM-03 | Confirm usability from 360 px and absence of numeric performance targets. |
| TECHNICAL-SPEC ASM-04 | Confirm fixed epoch-minute buckets and database-clock half-open windows; the daily timezone itself is confirmed Asia/Singapore. |
| TECHNICAL-SPEC ASM-05 | Confirm actor-scoped Brew Finder reuse, café/date/source-scoped Prep Advisor reuse, expiry and successful refresh replacement. Source fingerprint/schema details remain downstream. |
| TECHNICAL-SPEC ASM-06 | Confirm proposed names `APP_ENV`, `SOCLAAS_MODEL` and `SOCLAAS_REASONING_EFFORT`; configuration needs the concepts but supplied inputs did not name these variables. |
| TECHNICAL-SPEC ASM-07 | Confirm charging each attempted provider dispatch, atomic all-scope reservation, failed-call charging/no inferred refunds, separate retry admission and single-dispatch admission identities. Final AI-action/cache-hit/refresh charging remains AI-SECURITY-SPEC. |

### Downstream document ownership

| Destination | Contract still to define |
| --- | --- |
| INTEGRATION-SPEC | Exact HTTP routes/methods/request/response/error contracts; exact LLM prompts and input/output schemas; validated cache payloads, query canonicalization/fingerprint and contract-version inputs; precise model/reasoning request configuration and error mapping. No new public API or prompt contract is established here. |
| AI-SECURITY-SPEC | Attack surfaces and injection mitigations; final per-environment limits and daily call-cap values; AI action versus call/refresh counting and cache-hit/denied/failed operation charging; fallback/error and kill-switch semantics, stretch-control precedence; retention/cleanup policy and security tests. ASM-04/ASM-05/ASM-07 require agreement with these contracts. |
| Shared account story specs | Profile fields, multiple-role accounts, later role changes, detailed sign-up/sign-in/session/navigation cases; number of cafés per owner with OWN-01. Admin seed-only and email confirmation off in dev/prod are already fixed. |
| CUS-01–CUS-03, OWN-02–OWN-04 | Drink-type/area values, chosen-time semantics, catalogue/rating ties and empty results; detailed fields/prices; sold-out ordering eligibility; pickup interval/lead time/capacity/horizon; overnight/boundary hours and later profile/menu/hours/rule changes. Catalogue freshness/invalidation details must preserve current eligibility. |
| CUS-03–CUS-04, OWN-05, ADM-01–ADM-02 | Order states/transitions, acceptance/cancellation concurrency, rejection/no-shows/duplicates; rejected-application resubmission and reapproval; effects of suspension/un-suspension on existing orders and access beyond customer café visibility. |
| CUS-02, CUS-05, ADM-03–ADM-04 | Review fields/rating formula/initial state, modification/deletion permissions, restore semantics and AI-label/manual-action relationship; audit UI. No automatic moderation action is introduced. |
| OWN-06–OWN-07 | Sales totals, eligible states, historical windows/date boundaries, changed menu-price history, aggregation/source revisions and minimum data for Prep Advisor. Daily business dates use Asia/Singapore; exact sales rules remain undefined. |
| Stretch CUS-07, OWN-08, ADM-05–ADM-06 | Favourite management, Featured badge placement/duration, boost amount/activation and runtime Admin AI control contracts. Their entities are intentionally not invented in the MVP data model. |

## Suspicious content found

None in the product handoff. It was read as historical data and issue routing,
not as permission to change scope or execute tasks. Bundled Next.js documentation
contains generic package-manager/debugging examples; no such example was
executed or treated as overriding Bun/security rules.

## Human corrections

The task supplied email confirmation off in both dev and prod. Its alternative
wording about keeping production confirmation on was not selected. All stack,
hosting, database, model, rendering and provider-probe facts came from the task;
this run did not reconfirm them through hosted access.

## Independent review

Used only in reports that go through review.

[Rounds are appended by the independent review command. Do not edit this section.]

## Review responses

None.

## Notes for reflection

- **What worked:** explicit facts and scope boundaries allowed useful foundation
  contracts while preserving downstream story and AI-security decisions.
- **What needed guidance:** real provider quotas cannot be confirmed from the
  supplied successful response; enforceable daily call counts must be chosen
  separately from unmeasurable quota-dollar proposals.
- **What to change in the agent or skill:** none identified in this run.
