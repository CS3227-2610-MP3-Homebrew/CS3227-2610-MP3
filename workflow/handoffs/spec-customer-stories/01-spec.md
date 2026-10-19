# Spec report

- **Agent:** spec
- **Issue:** None; customer story specifications requested from PRODUCT-SPEC.md.
- **Spec IDs:** CUS-01–CUS-07; CUS-01.1–CUS-01.8, CUS-02.1–CUS-02.9, CUS-03.1–CUS-03.8, CUS-04.1–CUS-04.8, CUS-05.1–CUS-05.10, CUS-06.1–CUS-06.16, CUS-07.1–CUS-07.5.
- **Date:** 2026-10-19
- **Branch:** customer-specs
- **Base commit:** 725e8969e40df92721f1c8f50814231ac36cbd0b
- **Status:** awaiting-decision

## Summary

Drafted one file for each of the seven Customer stories in PRODUCT-SPEC.md:
six MVP stories and stretch favourites. The source story wording, IDs,
priorities and scope are preserved. The seven files contain 64 acceptance
criteria, access/permission boundaries, screens and use cases. Brew Finder
additionally covers inputs, output handling, guardrails, usage controls,
fallbacks and 13 evaluation cases, with every adversarial case mapped to a
guardrail row.

Only behaviour supported by the product/shared contracts is specified as
unqualified behaviour. Proposed risk assessments and two UI interaction
choices are marked as assumptions. Missing customer/owner domain contracts are
recorded below rather than silently choosing fields, limits or lifecycle rules.
These are reviewable drafts, not approval or implementation evidence; affected
behaviour remains awaiting-decision. No merge/approval claim is made.

No application code, executable tests, shared specs, templates, PLAN.md, guides,
agent definitions or skills changed. No branch, commit, issue or PR was created.

## Acceptance criteria

The status below concerns specification readiness, not feature acceptance.
No customer implementation tests were authored or run.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| CUS-01.1–CUS-01.8 | awaiting-decision | Eight Given/When/Then criteria preserve catalogue eligibility and filter capabilities; exact filter/time/rating contracts remain undefined |
| CUS-02.1–CUS-02.9 | awaiting-decision | Nine criteria cover menu/sold-out/hours/review visibility with ADM-03 ownership links; display fields/order/pagination remain undefined |
| CUS-03.1–CUS-03.8 | awaiting-decision | Eight criteria cover own-order creation, pickup validity, eligibility and pay-at-pickup; pickup/menu/order contracts remain incomplete |
| CUS-04.1–CUS-04.8 | awaiting-decision | Eight criteria cover own orders, pre-acceptance cancellation and suspension preservation; lifecycle/concurrency contract remains undefined |
| CUS-05.1–CUS-05.10 | awaiting-decision | Ten criteria cover collected/own/once-only review creation and established moderation immutability; review field validation remains undefined |
| CUS-06.1–CUS-06.16 | awaiting-decision | Sixteen criteria link existing AI transport/security contracts; candidate selection, counts, empty model output and catalogue fallback contract remain undefined |
| CUS-07.1–CUS-07.5 | awaiting-decision | Five stretch criteria cover personal saving and current catalogue eligibility; stretch storage/API/interaction choices remain undefined |

## Files changed

- [CUS-01-browse-cafes.md](../../specs/stories/CUS-01-browse-cafes.md): browse, time/drink/area filters and catalogue boundaries.
- [CUS-02-cafe-page.md](../../specs/stories/CUS-02-cafe-page.md): menu/prices, sold-out display, hours and visible reviews.
- [CUS-03-pre-order.md](../../specs/stories/CUS-03-pre-order.md): own pickup pre-orders, café eligibility and payment at pickup.
- [CUS-04-my-orders.md](../../specs/stories/CUS-04-my-orders.md): own-order reads and cancellation before acceptance.
- [CUS-05-review-order.md](../../specs/stories/CUS-05-review-order.md): one review for an own collected order, existing pending/immutability policy.
- [CUS-06-brew-finder.md](../../specs/stories/CUS-06-brew-finder.md): advisory natural-language search, security/fallback/usage contracts and evaluation cases.
- [CUS-07-favourite-cafes.md](../../specs/stories/CUS-07-favourite-cafes.md): optional personal favourite saving, without new catalogue access.
- `workflow/handoffs/spec-customer-stories/01-spec.md`: this report.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | Fail, exit 1 | Lint and typecheck passed. Vitest reported 24 passing tests in two files, plus one unhandled worker-start error for `tests/unit/plan-issues.test.ts`: jsdom `addEventListener` called on an invalid EventTarget. The test stage failed, so traceability, spec checks and build were not reached by this command |
| `bun run check:specs` | Pass, exit 0, seven warnings | Links/anchors, IDs, requirement ownership and repository spec conventions passed. Each new Customer story warns that its criteria are not yet planned; all 64 remain outside PLAN tasks, which were outside this assignment |
| `bun run check:traceability` | Pass, exit 0 | Three existing done tasks have their listed criterion test titles; this does not establish customer test coverage |
| `bun run build` | Fail, exit 1 | Sandboxed build could not fetch Geist/Geist Mono from Google Fonts |
| `bun run build` with escalated execution requested | Fail, exit 1 | Retry reached a Turbopack failure while processing existing `src/app/globals.css`: creating a process/binding a port returned `Operation not permitted (os error 1)` |
| `bun /private/tmp/homebrew-customer-spec-check.ts` | Pass, exit 0 | Temporary authoring check confirmed seven exact source stories/priorities, one requirement per file, 64 sequential Given/When/Then criteria, required template sections/use-case IDs/assumption definitions, and all 87 relative links/anchors |
| `git status --short` | Pass for scope | Before the handoff was added, only the seven new Customer files were untracked; no tracked file was modified |

The temporary authoring checker is outside the repository and is not an
acceptance-test deliverable. No test/configuration fixes or alternate test
environment was used to turn a failed verification into a passing claim.
No end-to-end tests, live LLM calls or hosted database operations were run.

## Open issues for the next step

### Available contracts and missing prerequisites

PRODUCT-SPEC.md, TECHNICAL-SPEC.md, INTEGRATION-SPEC.md and
AI-SECURITY-SPEC.md all exist. Existing ADM-01–ADM-04 story files supply café
eligibility/suspension effects, review post-moderation states, immutable
text/rating and retained Admin audit rules. These are available contracts and
are cross-referenced rather than redefined.

SYS-01–SYS-03 and OWN-01–OWN-07 have source stories but no story files in the
working tree. Shared technical contracts supply basic authenticated role and
workspace boundaries; account UI/session detail remains with the shared
stories. Customer ordering depends on the missing owner menu/hour/pickup/queue
contracts below. Absent owner/shared story files are not linked as if they exist.

### Behaviour and public-contract decisions

| Affected IDs | Exact unresolved contract or decision | Consequence |
| --- | --- | --- |
| CUS-01; CUS-02; CUS-06 | Strict `CatalogueFilters` field names/types/optional fields, allowed drink types/areas, filter combination/reset/normalization, whether a sold-out-only drink-type match qualifies, chosen-time input/date rules, opening/closing equality and overnight hours. Singapore timezone itself is already defined | Deterministic filter schemas, boundary tests, Brew request validation and filter cache fingerprints cannot be finalized |
| CUS-01; CUS-02; CUS-06 | One authoritative rating calculation, display precision, zero-review handling, sorting direction/ties, ordinary catalogue order/pagination. ADM-03 already limits rating inputs to pending/kept reviews | The required rating-sorted fallback and its cache source revision are not yet fully testable |
| CUS-02; CUS-05; OWN-02–OWN-03 | Customer-visible café/profile/review fields, reviewer identity disclosure, review ordering/pagination, price/currency representation, and menu display ordering | Complete café-page data/display and response contracts remain incomplete; no private identity field was inferred |
| CUS-03; OWN-02–OWN-05 | Pickup slot representation, interval/duration, permissible date horizon and past-time rules, equality/overnight boundaries, quantities, availability/sold-out ordering eligibility, prices/snapshots/totals and later menu/hour/rule changes | Exact order request/response schema and valid/invalid order test matrix remain incomplete; the drafts state only supported hours/rules/ownership constraints |
| CUS-03–CUS-04; OWN-05 | Canonical order state names and complete transitions, duplicate submission/idempotency, simultaneous owner acceptance/customer cancellation, repeated cancellation, rejected/no-show/other terminal states and detailed conflict feedback | No cancellation-race winner or order lifecycle beyond the product boundary was invented; owner queue and cancellation implementation remain dependent |
| CUS-04 | Own-order display fields, ordering, pagination and pickup-time formatting | Complete My orders UI/read contract remains incomplete |
| CUS-05 | Rating scale/type and text requiredness/length/normalization, duplicate-review response semantics, validation feedback, submission/read route schemas and review creation after café suspension | A valid review payload and all field-boundary cases cannot be finalized from source. LLM `Reason`/`Label` limits are not review input limits |
| CUS-06 | Candidate selection/size/order, suggested-item eligibility including sold-out items, number of recommendations, and UX/result-envelope treatment of an empty `suggestions` array from a nonempty source | The integration prompt permits an empty model result, but does not define the customer outcome. It was not silently equated with an empty source or assigned a new fallback reason |
| CUS-07 | Save/read storage and RLS contract, endpoint schemas, repeat-save semantics, persistence expectations, treatment of saved cafés that become ineligible and recovery on later eligibility; whether removal is intended | TECHNICAL-SPEC explicitly defers favourite entities to stretch contracts. Saving cannot bypass eligibility; retention/removal/UI details were not inferred |
| CUS-01–CUS-05; CUS-07 | Customer page paths, ordinary domain endpoint methods/paths, strict request/success-response schemas and domain-specific validation/conflict details | INTEGRATION-SPEC intentionally defers these to story contracts. Shared status/error conventions are available, but no complete ordinary customer HTTP API was invented |

These decisions and the consequential assumptions below require resolution
before specification approval or dependent testing/implementation. Shared
architecture/integration amendments needed for favourites and completed domain
schemas are outside this story-only assignment. No PLAN update or task-pair
creation was included.

### Assumptions requiring confirmation

- Every file's ASM-01 is a proposed risk assessment: High for CUS-01–CUS-06,
  Medium for stretch CUS-07. Priorities remain exactly as given in the product
  source. Risk confirmation affects review emphasis.
- CUS-06 ASM-02 proposes explicit search submission, no calls from typing and a
  pending loading indicator. The product specifies the single box but not these
  trigger/loading details; confirmation affects UI behaviour and usage events.
- CUS-07 ASM-02 proposes placing save/return controls in existing Browse cafés
  and Café page contexts. Product navigation specifies no separate favourites
  screen; placement remains a decision.

### Verification limitations

Full verification is not passing: the test worker failure prevents completion
of the required gate, and the separate production-build retry also failed with
the process/port permission error above. There is no customer acceptance-test,
reviewer or security-reviewer evidence from this authoring session.

## Suspicious content found

None. Existing specs, handoffs and bundled framework documentation were treated
as context/contracts, without expanding agent permissions or skipping checks.

## Human corrections

None.

## Review responses

None; no reviewer round was invoked.

## Notes for reflection

- **What worked:** Separate story files preserve all seven source stories and keep shared SYS/SEC and Admin contract ownership intact; the source/structure/link checks passed.
- **What needed guidance:** The product leaves customer domain decisions to story contracts. The assignment supplies no choices for the gaps above, so the drafts cannot honestly be labelled implementation-ready.
- **What to change in the agent or skill:** None established by this run. Verification failures were recorded without modifying tests, configuration or unrelated application code.
