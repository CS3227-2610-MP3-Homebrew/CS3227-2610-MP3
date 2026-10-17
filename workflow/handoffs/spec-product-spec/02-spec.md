# Spec report

- **Agent:** spec
- **Issue:** None; product specification revision before issue creation.
- **Spec IDs:** SYS-01–SYS-03, CUS-01–CUS-07, OWN-01–OWN-08, ADM-01–ADM-06.
- **Date:** 2026-10-17
- **Branch:** docs/product-spec
- **Base commit:** 26df5735d6c2756c21d845e1cf640f0ec7ffc007
- **Status:** completed

## Summary

Revised PRODUCT-SPEC.md to record the team's four decisions: boosts are
confirmed stretch; admins may suspend and un-suspend cafés; SoC LLM access is
free for SoC students and dollar amounts measure quotas only; source stories
remain intact without splits. ADM-02 and all corresponding product references
now include un-suspension. Visibility returns only for an approved café that
is un-suspended. No additional lifecycle effects were inferred.

Removed ASM-01. ASM-02 now concerns only unconfirmed actual per-key limits.
All proposed app limits retain their values, with $5 prod/$2 dev described as
daily quota caps measured in SoCLaaS dollar units. The $0/free-tier-only cost
requirement remains.

Story totals remain 24: Shared 3, Customer 7, Café owner 8 and Admin 6; 20 MVP
and 4 stretch. The product revision is complete and no product-level merge
decision remains. Outstanding details below belong to downstream specifications.
Parent-run final repository verification passed. Approval and merge are not
claimed; testing and implementation readiness still depend on the required
specifications on master.

Only PRODUCT-SPEC.md and this new report were written in this run. The earlier
01-spec.md and all other work were preserved. No commits, pushes, PRs, hosted
service access, live LLM calls or secret-file access occurred.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Boosts confirmed stretch and ASM-01 removed. | completed | OWN-08 and ADM-06 remain stretch; MVP/stretch section states the confirmed scope. |
| Un-suspension is consistent throughout the product specification. | completed | Overview, access boundaries, Admin navigation, functional requirements, eligibility use case and exact ADM-02 story include un-suspension; visibility remains restricted to approved, non-suspended cafés. |
| Free access and quota-only dollar units are explicit. | completed | Usage control states free SoC student access and no team cost; daily caps use quota units; documented default values and proposed app values are retained. ASM-02 concerns actual per-key limits only. |
| Source stories and IDs remain intact, without splits. | completed | 24 stories, existing IDs and priorities preserved; ADM-02 is the sole changed story text. |
| Report preserves history and routes remaining details. | completed | 01-spec.md is unchanged; remaining issues below each have one explicit downstream destination. All four human decisions are recorded under Human corrections. |
| Repository verification passes. | completed | Parent-run exact `bun run verify` exited 0: lint, typecheck and production build passed. |

## Files changed

- `workflow/specs/PRODUCT-SPEC.md`: targeted revisions for the four team
  decisions; no new source stories, story splits or renumbering.
- `workflow/handoffs/spec-product-spec/02-spec.md`: new second-run report;
  01-spec.md remains the historical first-run report.

No other specifications, story files, PLAN.md, code, documentation, skills or
agent definitions were written by this agent.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git diff --check` | Passed; exit 0. | No whitespace errors in the tracked diff. |
| `rg -n 'Status:\|Owner:\|Open questions\|ASM-01\|\bspend\b\|\bspending\b\|paid usage' workflow/specs/PRODUCT-SPEC.md` | No matches; expected exit 1. | No removed metadata labels, obsolete ASM-01 or spending/paid-usage wording. The final scan used word boundaries to exclude the unrelated word "suspend". |
| `bun -e '…'` structural validation | Passed; exit 0. | Verified 24 story rows; group counts 3/7/8/6; contiguous IDs; preserved priorities; 20 MVP/4 stretch; exact ADM-02 text; 17 downstream issues, each with an allowed destination; and the exact Independent review placeholder. SHA-256 confirmed 01-spec.md unchanged from the start of this run. |
| `bun run verify` — run by parent agent, without pipes or redirection | Passed; exit 0, as reported by parent. | Lint, `next typegen && tsc --noEmit`, and production `next build` passed. An existing non-blocking warning noted the ignored `/Users/shawnnygoh/package-lock.json` outside this repository; no change was made for it. |
| Parent baseline content audit | Passed, as reported by parent. | This turn changed only DeveloperGuide.md and PRODUCT-SPEC.md, plus new 02-spec.md. 01-spec.md and every pre-existing other edit remained byte-for-byte unchanged. All story rows except the exact requested ADM-02 text were unchanged; priorities and scope were preserved. |

This agent re-read AGENTS.md, the updated spec-agent definition and specs README,
and the handoff template and README. No concurrent build was run.

## Open issues for the next step

These are remaining details from 01-spec.md assigned to downstream
specifications, not unresolved product-scope decisions or blockers for this
product revision. Their contracts remain undefined and are not supplied by
this report.

| Destination | Remaining detail |
| --- | --- |
| story specs | Pickup-slot interval, lead time, capacity, advance-booking horizon and rules beyond the last pickup time; timezone, boundary times, overnight hours and effects of later changes to hours, pickup rules or availability. |
| story specs | Suspension and un-suspension effects on existing orders and access beyond customer café visibility. Permission to un-suspend and visibility for an approved, un-suspended café are resolved. |
| TECHNICAL-SPEC | Actual request and quota limits for each dev/prod SoC LLM key and confirmation of proposed app limits against them. Documented defaults are not verified individual-key entitlements; ASM-02 retains only this dependency. |
| AI-SECURITY-SPEC | Definitions of an AI action and request-versus-call counting for usage limits. |
| TECHNICAL-SPEC | Cache eligibility and scope, daily reset timezone, refresh accounting and quota-unit measurement/enforcement. Dollar units represent quotas only, never charges. |
| AI-SECURITY-SPEC | AI fallback/error behavior and environment kill-switch fallback semantics. |
| story specs | Exact order transitions, concurrent acceptance/cancellation, rejection consequences, no-shows and duplicate submissions. |
| story specs | Review fields, rating scale/formula, initial pending/visible state, rating eligibility, review modification/deletion permissions, restore semantics, and the relationship between AI labels and manual moderation decisions. No automatic label-to-action mapping is assumed. |
| story specs | Sales total calculation, eligible order states, date boundaries, historical window, treatment of changed menu prices and minimum data for Prep Advisor suggestions. |
| INTEGRATION-SPEC | Exact aggregated-sales input/output schemas for Prep Advisor and the other AI features' input/output schemas. |
| story specs | Drink-type and area values, chosen-time semantics, ranking/tie-breaking, empty-result behavior and sold-out items' ordering eligibility. The Brew Finder fallback remains the filtered list sorted by rating. |
| story specs | Multiple-role accounts, later role changes, number of cafés per café owner, profile fields, rejected-application resubmission and changes requiring re-approval. No extra permissions or stories are assumed. |
| INTEGRATION-SPEC | Exact LLM prompts for each AI feature. |
| AI-SECURITY-SPEC | Detailed prompt-injection defenses for the three AI features. |
| TECHNICAL-SPEC | Accessibility target and measurable responsive/performance criteria; no numeric service targets have been invented. |
| story specs | Favourite management, Featured badge duration and placement, boost fee amount and activation timing. Both boost stories remain confirmed stretch. |
| AI-SECURITY-SPEC | Precedence between stretch runtime Admin AI controls and the environment kill switch. |

## Suspicious content found

None.

## Human corrections

1. **Boost scope confirmed:** OWN-08 and ADM-06 are stretch. Removed ASM-01
   and replaced its scope reference with a plain confirmed statement.
2. **Un-suspension allowed:** ADM-02 now reads, "As an admin, I want to suspend
   and un-suspend cafés, so that I can control which cafés are visible to
   customers." Updated every corresponding product section. An un-suspended
   approved café becomes visible again; unapproved cafés remain hidden.
3. **Free LLM access and quota interpretation confirmed:** SoC students use the
   SoC LLM free and the team incurs no cost. Dollar amounts track quotas only,
   never charges. Rephrased the daily cap in SoCLaaS dollar units and retained
   documented defaults and proposed app values. ASM-02 now covers only actual
   per-key limits that have not yet been confirmed.
4. **No story splits:** retained all 24 stories, existing IDs, priorities and
   MVP/stretch assignments. Removed the prior story-split question from the
   current issues; no story specs were drafted.

## Independent review

Used only in reports that go through review.

[Rounds are appended by the independent review command. Do not edit this section.]

## Review responses

None.

## Notes for reflection

- **What worked:** explicit team decisions resolved the product-level issues
  without changing IDs or expanding the source story set.
- **What needed guidance:** the team supplied the un-suspension permission and
  clarified free LLM access, quota units, confirmed boost scope and story
  boundaries.
- **What to change in the agent or skill:** none identified in this run.
