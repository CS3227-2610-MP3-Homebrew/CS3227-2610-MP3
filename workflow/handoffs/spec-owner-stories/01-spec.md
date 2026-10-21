# Spec report

- **Agent:** spec
- **Issue:** None; owner story specifications requested from PRODUCT-SPEC.md.
- **Spec IDs:** OWN-01–OWN-08; OWN-01.1–OWN-01.8, OWN-02.1–OWN-02.8, OWN-03.1–OWN-03.8, OWN-04.1–OWN-04.8, OWN-05.1–OWN-05.10, OWN-06.1–OWN-06.7, OWN-07.1–OWN-07.14, OWN-08.1–OWN-08.5.
- **Date:** 2026-10-21
- **Branch:** owner-specs
- **Base commit:** cb2bb8e11ee03fc016fc203ec56661ec8d7b9790
- **Status:** awaiting-decision

## Summary

Completed draft authoring for all eight Café owner stories: seven MVP stories
and the stretch boost request. Each file preserves the source story verbatim,
its ID, role, priority and scope, and owns exactly one requirement. The drafts
contain 68 Given/When/Then acceptance criteria, access/permissions, screens,
use cases and failure paths. Prep Advisor additionally contains input/output
boundaries, six guardrail rows, usage/cache rules, fallbacks and 12 evaluation
cases; all seven adversarial cases name their matching guardrail rows.

Existing contracts supply approval/suspension independence, latest private
decision reasons, Singapore weekly hours, SGD prices, pickup cutoff bounds,
order state/race semantics, immutable purchase snapshots and shared AI
transport/security/cache rules. Their owning definitions were linked rather
than changed. Authoritative product behavior was not inferred from current
implementation. Proposed risk ratings are explicitly marked ASM-01 in each
file; no new behavior is justified by those assumptions.

The draft scope excludes unresolved field/API, analytics and boost decisions
listed below. Consequently completed drafting is not implementation readiness,
human approval or feature acceptance. No spec merge or approval was inferred.
Each source story was treated as one coherent user outcome; no additional
capability, story ID or combined multi-story deliverable was introduced.

All four shared source specifications and both story templates exist. Related
Customer, shared-account and MVP Admin story contracts exist. ADM-06's story
specification and exact owner-domain contracts described below are missing
prerequisites, distinct from the available shared contracts. Existing framework
authentication/component guides, package scripts and server LLM schemas/
operations were inspected for context. Installed tooling includes Next.js
16.4.2, React 19.3.0, Zod, Supabase, Tailwind, Vitest and Playwright; no installed
shadcn component library or owner-domain implementation was inferred.

No application code, executable acceptance tests, shared specifications,
PLAN.md, templates, guides, skills or agent definitions changed. No branch,
commit, issue, PR, deployment or live service call was created/performed.

## Acceptance criteria

Statuses concern contract readiness, not feature-test execution.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| OWN-01.1–OWN-01.8 | awaiting-decision | Pending/decision/reason/resubmission boundaries drafted; application fields, cardinality and submission contracts remain unresolved |
| OWN-02.1–OWN-02.8 | awaiting-decision | Own-profile and established weekly-hours semantics drafted; editable fields and edit/save contracts remain unresolved |
| OWN-03.1–OWN-03.8 | awaiting-decision | Menu, shared cents/types, sold-out behavior and immutable purchases drafted; item lifecycle/validation/edit contracts remain unresolved |
| OWN-04.1–OWN-04.8 | awaiting-decision | Existing cutoff bounds/default and Customer slot consequences drafted; exact owner read/save boundary remains unresolved |
| OWN-05.1–OWN-05.10 | awaiting-decision | Shared four transitions and cancellation/suspension races drafted; queue presentation/data/API contracts remain unresolved |
| OWN-06.1–OWN-06.7 | awaiting-decision | Three sales views, business time, ownership and non-AI availability drafted; aggregation semantics remain unresolved |
| OWN-07.1–OWN-07.14 | awaiting-decision | Shared AI endpoint, evidence validation, usage, cache, fallback and adversarial boundaries drafted; source sufficiency and recommendation meaning depend on sales/advice decisions |
| OWN-08.1–OWN-08.5 | awaiting-decision | Stretch request, fee-record-only and time/eligibility boundaries drafted; boost terms/lifecycle/UI/Admin contracts remain unresolved |

## Files changed

- [OWN-01-cafe-application.md](../../specs/stories/OWN-01-cafe-application.md): application pending state, decision visibility and owner resubmission boundaries.
- [OWN-02-cafe-profile-hours.md](../../specs/stories/OWN-02-cafe-profile-hours.md): own café profile and weekly Singapore opening hours.
- [OWN-03-menu-management.md](../../specs/stories/OWN-03-menu-management.md): menu prices/types, sold-out toggle and purchase-history protection.
- [OWN-04-pickup-rules.md](../../specs/stories/OWN-04-pickup-rules.md): existing last-pickup cutoff rule and current-rule validation boundaries.
- [OWN-05-order-queue.md](../../specs/stories/OWN-05-order-queue.md): owner fulfilment transitions, conflicts and shared races.
- [OWN-06-sales-dashboard.md](../../specs/stories/OWN-06-sales-dashboard.md): daily totals, top items and weekday sales boundaries.
- [OWN-07-prep-advisor.md](../../specs/stories/OWN-07-prep-advisor.md): aggregate-only preparation advice, supporting numbers, AI safeguards and evaluation cases.
- [OWN-08-boost-request.md](../../specs/stories/OWN-08-boost-request.md): optional owner boost request without payment or eligibility bypass.
- `workflow/handoffs/spec-owner-stories/01-spec.md`: this new report; no earlier owner report existed.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | Pass, exit 0; eight warnings | Source IDs, unique ownership, placeholders, relative links/anchors and repository conventions passed. Each owner story warns that its criteria are not yet assigned to PLAN tasks; all 68 criteria are outside PLAN tasks |
| `bun run check:traceability` | Pass, exit 0 | Existing 20 done tasks have their listed criterion test titles; this is not owner feature-test coverage |
| Temporary Python document assertions | Pass, exit 0 | Exactly eight owner files/source stories, verbatim user stories, exact priorities/scope, one requirement per file, sequential unique Given/When/Then criteria (68), template sections, use-case IDs, matching assumption markers/definitions and 12 Prep evaluation cases |
| `git status --short` / `git diff --stat` | Scope check passed | Eight new owner story files before this handoff; no tracked-file edits |

The temporary source parser initially included product-summary rows and failed
its count assertion; restricting it to exact story-ID rows corrected the
checker, after which every assertion passed. No repository script was changed.
The initial handoff-directory inventory returned absent, so this run uses 01.

Full `bun run verify`, lint, typecheck, unit/integration/browser tests and build
were not run for this specification-only change. No feature acceptance,
provider-quality evaluation or database behavior was executed. PLAN was not
updated; no pair count/status reconciliation is claimed.

## Open issues for the next step

All entries below are **awaiting-decision** and block the affected contract
details and dependent implementation; the independently source-backed criteria
remain reviewable. They are not implied defaults.

1. **OWN-01 — Registration and resubmission.** PRODUCT-SPEC does not decide
   how many cafés an owner may register, duplicate/pending-submission behavior,
   required application fields or validation/length limits. ADM-01 establishes
   rejected-owner resubmission but leaves editable fields, eligible resubmission
   conditions, submission timestamp/order behavior and concurrency to OWN-01.
   Exact owner request/success/read schemas, paths and state-conflict rules are
   absent from INTEGRATION-SPEC's Café and menu management boundary. OWN-01's
   detail fields are also required by ADM-01's application screen. No account
   cardinality, automatic approval or timeout has been chosen.
2. **OWN-02 — Profile and hours edit boundary.** Public read fields already
   exist in `CafeDetail`, and weekly/overnight/overlap semantics are established.
   The editable field set, required/blank values, lengths/normalization, hours
   input limits, approval-state edit restrictions, atomic save shape and stale
   edit/concurrent-save handling are unspecified. Public read projection is
   not itself permission to edit every field. Exact owner paths/schemas and
   no-café editor behavior remain absent. No holiday editor is introduced.
3. **OWN-03 — Item lifecycle/edit boundary.** Drink types, integer SGD cents
   (1–1,000,000), sold-out semantics and immutable purchase snapshots are already
   defined. Add/edit/remove actions, item-name constraints, duplicate names,
   initial sold-out state, removal versus historical retention, owner-list
   ordering/pagination, no-café behavior and concurrent edit protection remain
   undefined. The technical menu/item-history contract and integration owner
   schemas depend on those decisions; deletion strategy is not guessed.
4. **OWN-04 — Owner rule transport.** The 0–180-minute cutoff/default 15,
   continuous-closing semantics and Customer grid/lead-time/horizon are already
   fixed. Owner rule field name/read/save schemas, exact success/error bodies,
   no-café editor behavior and concurrent-save behavior remain undefined in
   INTEGRATION-SPEC. No extra rule type or configurable slot duration is chosen.
5. **OWN-05 — Queue data and action boundary.** The shared transition and
   race matrix is complete and retained unchanged. Queue state filters,
   ordering/pagination, displayed customer identity/contact fields (if any),
   rejection-reason policy, no-café behavior, owner paths/request/success
   schemas and UI handling after stale actions remain unspecified. Queue
   authority does not imply general Customer profile access or a new order
   audit requirement. Exact owner contracts belong in INTEGRATION-SPEC after
   the story decisions; additional lifecycle states are not proposed.
6. **OWN-06 — Sales calculations.** Included order states, period/window and
   selectable ranges, the grouping event (placed/pickup/collected time),
   required source timestamp if collection time is chosen, the meaning of
   daily/weekday totals (quantity, order count and/or revenue), top-item metric,
   ties/limits, missing/zero-day handling and removed/renamed-item grouping are
   unspecified. Singapore timezone and immutable purchase amounts alone do
   not determine those calculations. The Dashboard read schema/path and
   canonical technical aggregate source also remain absent. These choices
   affect OWN-07 inputs and the SYS-12 demo sales fixture's sufficiency.
7. **OWN-07 — Advice sufficiency and meaning.** Empty source can take the
   shared no-source fallback, but nonempty-history minimum sufficiency,
   inclusive period length, the comparison/baseline supporting more versus
   less, cross-weekday evidence interpretation and normal directional-quality
   examples remain unowned decisions. INTEGRATION-SPEC explicitly reserves
   these to OWN-06–OWN-07. Structural reference/number validation cannot prove
   a preparation direction is justified. No model/schema change, threshold,
   history length, confidence score or forecast has been invented. The 12
   evaluation cases cover available deterministic boundaries, not completed
   direction-quality acceptance.
8. **OWN-08 / ADM-06 — Boost terms and lifecycle.** Boost duration, start/end
   rules, timezone instants, fee amount/currency/source, eligible café states,
   request lifecycle, duplicate/overlapping requests, rejection/resubmission,
   badge activation/expiry, Customer placement/ranking effects, owner UI
   placement and exact API schemas are unspecified. ADM-06 is present as a
   product source story but has no story file. TECHNICAL-SPEC intentionally
   reserves boost entities/RLS, and INTEGRATION-SPEC reserves boost contracts.
   The fee remains record-only; badge visibility cannot override café/workspace
   eligibility. No optional feature is promoted into MVP.
9. **All owner stories — Proposed risk ratings.** ASM-01 in each story marks
   the proposed risk category only; source priorities and scope are preserved.
   These assessments remain unconfirmed. There are no proposed behavioral
   assumptions disguised as settled requirements.

Approval evidence is absent for these new local drafts. PLAN ownership for
the 68 new criteria is absent and was outside this story-only assignment;
planning depends on the resolved/approved story and shared contracts.

## Suspicious content found

None.

## Human corrections

None.

## Review responses

None; no reviewer round was invoked.

## Notes for reflection

- **What worked:** Existing Customer/Admin contracts supplied exact hours, money, pickup, order-race and privacy boundaries, allowing focused owner drafts without changing shared contracts.
- **What needed guidance:** Application fields/cardinality, sales calculations and boost terms are deliberately reserved to the owner stories but absent from the available source decisions; they remain explicit gaps rather than invented product behavior.
- **What to change in the agent or skill:** None identified in this run.
