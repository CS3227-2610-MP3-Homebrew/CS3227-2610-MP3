# Spec report

- **Agent:** spec
- **Issue:** None; product specification before issue creation.
- **Spec IDs:** SYS-01–SYS-03, CUS-01–CUS-07, OWN-01–OWN-08, ADM-01–ADM-06.
- **Date:** 2026-10-17
- **Branch:** docs/product-spec
- **Base commit:** 26df5735d6c2756c21d845e1cf640f0ec7ffc007
- **Status:** awaiting-decision

## Summary

Drafted only PRODUCT-SPEC.md and this report from the team's supplied facts and
the repository's updated specification rules. The product document covers the
overview, roles and access, navigation, product-level functional and
non-functional requirements, top-level use cases, MVP/stretch boundaries,
source user stories and marked assumptions. Supporting specifications are
explicitly planned, not represented as existing contracts.

There are 24 stories: Shared 3, Customer 7, Café owner 8 and Admin 6. The totals
are 20 MVP and 4 stretch; each role has exactly one AI feature. Drafting is
complete, but human decisions remain before a spec PR can be merged. No
approval, implementation or testing readiness is claimed. No commits, pushes,
PRs, hosted-service access, live LLM calls or secret-file access occurred.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Part 2 changes only PRODUCT-SPEC.md and its handoff. | completed | This agent wrote only the two files listed below; Part 1 is handled separately by the parent agent. |
| Product coverage and source story set. | completed | Product sections cover the requested topics. Story tables contain SYS-01–03, CUS-01–07, OWN-01–08 and ADM-01–06 in source order, with source priorities and scope. |
| No in-file spec lifecycle metadata or unresolved-question section. | completed | PRODUCT-SPEC.md uses the requested content sections and marked assumptions; unresolved decisions appear in this report. |
| Unresolved points are explicit and assumptions are marked. | awaiting-decision | ASM-01 and ASM-02 have rationale and effect if wrong; decisions are recorded below. |
| Repository verification passes. | completed | Parent-run `bun run verify` exited 0: lint, typecheck and production build passed. Application code/configuration remained unchanged. |

## Files changed

- `workflow/specs/PRODUCT-SPEC.md`: new product-level specification only; no
  story specs, other cross-cutting specs or PLAN.md drafted.
- `workflow/handoffs/spec-product-spec/01-spec.md`: this first-run handoff,
  following the repository handoff template.

The parent agent's Part 1 changes are outside this agent's write ownership and
were preserved.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git diff --check` | Passed; exit 0. | No whitespace errors in the tracked diff. |
| `rg -n 'Status:\|Owner:\|Open questions' workflow/specs/PRODUCT-SPEC.md` | No matches; expected exit 1. | The product spec contains none of these metadata/section labels. |
| `bun -e '…'` story-table validation | Passed; exit 0 after correcting the checker. | Verified 24 story rows, contiguous IDs in source order, story sentence structure, group counts 3/7/8/6, and scope counts 20 MVP/4 stretch. Initial checker attempts included summary-table references and then incorrectly required "As a" for admin stories; the final checker is scoped to User stories and accepts "As an". |
| `bun run verify` — run by parent agent, without pipes or redirection | Passed; exit 0, as reported by parent. | ESLint, `next typegen && tsc --noEmit`, and production `next build` passed. A non-blocking warning noted an ignored `/Users/shawnnygoh/package-lock.json` outside this repository; no changes were made for it. |

Inspection also confirmed the updated spec-agent rules, spec README and handoff
template, the branch and base commit, and the absence of an earlier report at
this target. No concurrent build was run by this agent.

## Open issues for the next step

Each item is **awaiting-decision**. No missing behavior has been filled with an
unmarked assumption.

1. **Boost scope:** the shared feature list had "request a boost" in the MVP,
   but an earlier decision put the boost flow on the stretch list. The supplied
   story list and ASM-01 treat OWN-08 and ADM-06 as stretch; confirmation remains
   outstanding.
2. **Pickup rules:** the slot interval, lead time, capacity, advance-booking
   horizon and any rules beyond the last pickup time are unspecified. Timezone,
   boundary times, overnight hours and handling later changes to hours, pickup
   rules or availability also lack contracts.
3. **Reversing suspension:** whether an admin can un-suspend a café is not
   specified. Suspension effects on existing orders and access beyond customer
   café visibility are also unspecified.
4. **Actual SoC LLM limits:** each dev/prod key's actual request and spending
   limits are unknown. The supplied 90 requests/minute, $80/day and $800/month
   defaults and proposed app limits are not verified key entitlements; ASM-02
   preserves the provisional distinction.
5. **Cost interpretation:** how the $0/free-tier-only budget relates to the
   proposed $5 prod/$2 dev daily spend caps is unspecified. The product draft
   does not authorize paid usage or assume how SoC LLM usage is billed.
6. **Usage enforcement contracts:** definitions of an AI action, request versus
   call counting, cache eligibility and scope, daily reset timezone, refresh
   accounting, spend measurement and fallback/error behavior are unspecified.
   These belong in the planned AI security and technical specifications.
7. **Order lifecycle:** exact transition rules, concurrent acceptance and
   cancellation, rejection consequences, no-shows and duplicate submissions
   are unspecified. The product draft states only the supplied queue actions
   and cancellation-before-acceptance boundary.
8. **Reviews and ratings:** review fields, rating scale/formula, initial pending
   versus visible state, which reviews contribute to a rating, and review
   modification/deletion permissions are unspecified. The meaning of restoring
   a review and the relationship between AI labels and manual moderation
   decisions require contracts; no automatic mapping is assumed.
9. **Sales and Prep Advisor inputs:** the sales total calculation, eligible
   order states, date boundaries, historical window, treatment of changed menu
   prices and minimum data needed for suggestions are unspecified.
10. **Discovery and menu contracts:** drink-type and area values, chosen-time
    semantics, ranking/tie-breaking, empty-result behavior, and sold-out items'
    ordering eligibility are unspecified. Brew Finder fallback retains the
    supplied rating sort without inventing a rating definition.
11. **Account and café lifecycle:** multiple-role accounts, later role changes,
    number of cafés per café owner, profile fields, rejected-application
    resubmission and changes requiring re-approval are unspecified. No broader
    permissions or extra source stories were added.
12. **AI and quality contracts:** exact prompts/schemas, injection defenses,
    environment kill-switch fallback semantics, accessibility target and
    measurable responsive/performance criteria remain for the planned shared
    contracts and story criteria. No numeric service targets were invented.
13. **Stretch details:** favourite management, Featured badge duration and
    placement, boost fee amount, activation timing, and precedence between
    runtime AI controls and the environment kill switch are unspecified.
14. **Future story-spec boundaries:** several supplied stories bundle
    capabilities, notably SYS-02, CUS-01–CUS-04, OWN-02–OWN-03, OWN-05–OWN-06,
    ADM-01 and ADM-03. Any split into independently testable story specs requires
    a team decision; this product draft preserves every supplied story and ID.

The above points and behavioral assumptions remain unresolved for merge and
belong in the human-authored PR description as well as this report. Testing and
implementation use specs only after they are on master.

## Suspicious content found

None.

## Human corrections

The team's current workflow decision removes lifecycle metadata and unresolved
questions from spec files. The product draft follows that decision and the
updated repository rules; assumptions remain marked in the product document
and outstanding decisions appear in this report.

## Independent review

Used only in reports that go through review.

[Rounds are appended by the independent review command. Do not edit this section.]

## Review responses

None.

## Notes for reflection

- **What worked:** explicit source ordering made it possible to preserve all
  24 IDs and distinguish 20 MVP stories from 4 stretch stories without adding
  features.
- **What needed guidance:** the team identified a prior boost-scope conflict
  and supplied provisional quota numbers; both remain explicit decisions.
- **What to change in the agent or skill:** none identified during this run.
