# Spec report

- **Agent:** spec
- **Issue:** #66–#70; PLAN tasks T-35–T-39.
- **Spec IDs:** CUS-01–CUS-07, preserving all 67 criterion IDs; related ADM-02 suspension clauses.
- **Date:** 2026-10-20
- **Branch:** master
- **Base commit:** d923954f61693437f0b2cb4f8edf12455d004277
- **Status:** blocked

## Summary

Applied the human's amendments to the run-01 proposal and drafted the remaining
accepted recommendations into the seven Customer stories, canonical Customer
API/read schemas, relevant technical data/integrity contracts and related
Admin suspension race text. This is a reviewable specification diff, not feature
implementation or evidence that the revised specs have merged.

The exact drink enum is coffee/matcha/tea/chocolate/juice/other. Area enum and
labels are Central/North/South/East/West, replacing the earlier North East
proposal. Per-item quantities are integers 1–20, retaining the agreed 1–20
distinct item-line bound. All menu/unit/line/order totals are integer SGD cents
in persistence and JSON, displayed as dollars to exactly two decimal places;
450 cents displays as S$4.50.

The human also accepted the other recommendations, including public pickup
address, review-after-suspension eligibility for collected purchases, explicit
Brew Search/loading interaction and optional persistent favourites without
removal. CUS-06/CUS-07 ASM-02 are retired without reusing their IDs. No active
behavioural assumptions remain in the Customer stories. No further product
selection is requested in this report.

Missing OWN-02–OWN-05 contracts, T-34 shared navigation and the reviewed spec
merge remain prerequisites. PLAN.md is unchanged, preserving the required
spec-merge → PLAN-update → tests → implementation flow. The existing
awaiting-decision Status lines do not mean the human's selections remain open;
the report records their resolution while dependent execution stays blocked.

## Acceptance criteria

| Task/criterion | Status | Evidence |
| --- | --- | --- |
| T-35 Customer filter/rating/display/read draft | completed | Exact six drink types/five areas, AND/reset/strict query rules, inclusive opening/exclusive closing, overnight/adjacent intervals, unscheduled text, rating formula/ties, paginated fields and no reviewer identity disclosure |
| T-36 Customer pickup/order/race draft | completed | Seven-date/15-minute slot contract, 1–20 per-item quantities, server price snapshots/expected-total confirmation, idempotency keys, state matrix, retained histories and serial suspension/cancellation/collection outcomes |
| T-37 review payload/submission draft | completed | Required integer 1–5 rating and 1–1,000-code-point nonblank text; exact text preservation; duplicates conflict; own collected review permitted after suspension; immutable pending/kept/hidden policy preserved |
| T-38 Brew selection/empty-result draft | completed | Deterministic 20-café/20-item selection, 0–5 suggestions, unavailable-item exclusion, valid empty AI success, separate ordinary catalogue, same-actor cache and feature semantic version 2 |
| T-39 optional favourite draft | completed | Personal unique persistent association, repeat-save success, Saved within Browse, ineligible omissions/reappearance, RLS and strict API projections; no removal/sharing |
| Owner contracts and shared navigation prerequisites | blocked | OWN-02–OWN-05 files and Shared story contracts remain absent; their management/actions/redirects are not authored by this Customer task |
| Reviewed spec merge and task promotion | blocked | Local uncommitted diff only; no reviewed merge of these amendments and no PLAN status promotion |
| Full repository verification | incomplete | Lint/typecheck passed; tests stopped on unavailable local Docker/Supabase; build not reached |

Completed rows refer to drafting and consistency only. None claims application
acceptance or that all acceptance criteria for the five PLAN tasks are met.

## Files changed

- `workflow/specs/INTEGRATION-SPEC.md`: exact Customer filter/read/order/review/
  favourite schemas and paths, query validation, cents/display rules, state/race
  matrix, Brew candidate/count/empty-result semantics and source fingerprints.
  All three literal system prompts and the shared AI envelope remain unchanged.
  Brew semantic contract version is 2; other feature identities and stored
  envelope version remain 1.
- `workflow/specs/TECHNICAL-SPEC.md`: logical snapshots, submission-key integrity,
  optional personal favourites, post-suspension own-review access and transaction/
  RLS boundaries; no migration or runtime code.
- `workflow/specs/stories/CUS-01-browse-cafes.md`: accepted filters, single rating
  formula, time/closed-card rules and criterion refinements.
- `workflow/specs/stories/CUS-02-cafe-page.md`: public fields, money display,
  reviewer disclosure, ordering and transport links.
- `workflow/specs/stories/CUS-03-pre-order.md`: quantities, pickup bounds,
  creation/replay/price/transaction behaviour.
- `workflow/specs/stories/CUS-04-my-orders.md`: historical display, cancellation
  state/conflict behaviour and suspension/collection race effects.
- `workflow/specs/stories/CUS-05-review-order.md`: field limits, duplicate and
  suspended-café submission outcomes.
- `workflow/specs/stories/CUS-06-brew-finder.md`: interaction, deterministic source
  and count limits, valid empty output, availability rechecks and evaluation
  examples E14–E16; retired ASM-02.
- `workflow/specs/stories/CUS-07-favourite-cafes.md`: persistent personal save/read
  behaviour, placement and changed eligibility; retired ASM-02.
- `workflow/specs/stories/ADM-02-cafe-suspension.md`: related race/terminal-state
  summary linked to CUS-04.5 and the canonical matrix; no general Admin order
  permission or other Admin behaviour changed.
- `workflow/handoffs/66-customer-catalogue-contracts/02-spec.md`: this report.

Run 01 remains unchanged. No application, tests, fixtures, configuration,
dependencies, guides, product source stories or PLAN content changed.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | Failed at tests, exit 1 | Lint/typecheck passed. Vitest: 13 files passed, six failed; 267 tests passed, 124 failed, six skipped by existing configuration. Local Supabase status unavailable; Docker socket missing. Traceability/spec/build stages not reached within this command. |
| `bun run check:specs` | Passed, exit 0 | Zero warnings; run separately on final source. |
| `bun run check:traceability` | Passed, exit 0 | 13 existing done tasks have their listed criterion test titles; no task promoted. |
| `bun /private/tmp/homebrew-customer-contract-draft-check.ts` | Passed, exit 0 | Seven original story texts/priorities, all 67 criterion IDs and all three literal AI prompts preserved; PLAN byte-identical with 49 tasks/20 pairs; exact accepted enums, quantities and cents/display contracts present; no active Customer assumptions. |
| `git diff --check` | Passed, exit 0 | No tracked whitespace errors. |

The native bundled Node directory was added only to the verification process
PATH; no runtime/configuration edit was made. Full verification output is in
`/private/tmp/homebrew-t35-t39-verify.log`. No tests were edited, skipped or
weakened. No separate build or browser test ran for this specification diff.
Docker startup and database configuration changes were not attempted.

## Open issues for the next step

- The selected decisions are reflected in this local draft, but it has no
  reviewed merge evidence. Dependent testing/implementation remains gated.
- OWN-02/OWN-03 must supply owner profile/menu edit validation and shared
  hours/menu ownership, including compatibility with these read enums, public
  fields and history preservation. OWN-04/OWN-05 must supply owner pickup-rule
  editing and queue action contracts using the agreed Customer-facing
  vocabulary. No owner source story or competing owner requirement was created.
- T-34 owns shared account/role navigation and must agree with these Customer
  paths; this assignment changes no sign-in/redirect/access contract.
- The draft field/state requirements are additive to the current foundation
  schema. No claim is made that existing migrations enforce the new business
  fields, snapshots, collection-state checks, favourites or submission keys.
- PLAN status reconciliation after spec merge must distinguish these resolved
  decisions from missing prerequisites and incomplete full verification. Pair
  count remains 20; this run promotes no pair or prerequisite to done.
- Full verification remains unsuccessful until the local test database is
  available and the required checks actually pass. Current failures are
  environment evidence, not failing-first acceptance evidence for T-40–T-49.

## Suspicious content found

None.

## Human corrections

The human stated, “If no changes listed, accept your suggestion.” Applied:

- T35 drink types: coffee, matcha, tea, chocolate, juice, other.
- T35 areas: Central, North, South, East, West.
- T36 integer quantities: 1–20, catering for reasonable home-café bulk orders.
- T36 prices: totals display as dollars to two decimal places and store cents.
- All other run-01 recommendations are accepted for this spec draft, including
  the CUS-06/CUS-07 interaction proposals. Selection approval is distinct from
  the repository's reviewed-merge approval for specification execution.

## Review responses

None; no implementation reviewer was invoked.

## Notes for reflection

- **What worked:** One explicit amendment list resolved the full decision
  proposal while preserving requirement identities and existing security policy.
- **What needed guidance:** The human selected exact drink/area vocabulary and
  a higher per-item quantity cap; owner contract authorship remains separate.
- **What to change in the agent or skill:** None established in this run.
