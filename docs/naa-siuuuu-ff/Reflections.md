# Reflections

## AI security

<!-- Which attack surfaces and prompt-injection types were considered? Which
security features were built, and how were they tested? What limits were placed
on agents? What approval gates and human oversight were used, and how were they
kept from being compromised? -->

## Spec-driven development

<!-- What does a good spec make clear before implementation? How can the team
tell a spec is precise enough for an agent? How do requirement changes flow
through the spec, implementation and tests? How do tests show the spec's intent
rather than its wording? -->

### What a good spec makes clear

A good spec settles the decisions an implementer would otherwise guess. OWN-06
first said only "daily totals, top items and sales by day of week", and its
spec task (T-61) stayed `awaiting-decision` because that sentence hides at
least five choices:
- which order states count as a sale
- which timestamp dates a sale
- what period the Dashboard covers
- how ties between items are broken
- whether days with no sales appear

When I resolved it, each answer became a rule: only `collected` orders count,
each one dated by the Singapore date of `collectedAt`, over 28 days including
today. The top 10 items rank by quantity, then revenue, then item reference.
Days with no sales show S$0.00. The spec also has to separate states that look
alike, such as "no café", "no sales" and "source unavailable", or an agent will
quietly turn an outage into zeros.

### Telling whether a spec is precise enough

My test is whether I can write a Given/When/Then with concrete numbers without
asking anyone. Prep Advisor's "prepare more or less" failed that test, so we
made it arithmetic. With `q` as an item's quantity on one weekday and `T` as
its weekly total, "more" needs `7 × q > T`. Evaluation case OWN-07-E13 then
gives fixed numbers (12, 4, 4, 4, 4, 4, 4) with an expected outcome.
`bun run check:specs` catches structural gaps such as missing IDs, broken
links, or a criterion without exactly one test task and one implementation
task. It cannot judge whether a criterion is precise; only human review can.

### How a change flows through spec, plan, tests and code

The order is spec PR, then plan, then tests, then code, and the IDs make the
ripple visible. Adding the stretch no-show feature (OWN-14) added a value to
the shared order-state list. The state matrix showed at once that this also
affects My orders (CUS-04), review eligibility (CUS-05) and admin suspension
(ADM-02), so I flagged those for the other role owners. Adding OWN-06.8–OWN-06.11 also meant
updating the test and implementation tasks T-62/T-63, or the checker fails.

Existing tests limit spec changes too. The Prep Advisor prompt is pinned
word for word in an existing test fixture, so changing it would have forced
edits to tests that were already done. We added the direction rule as
server-side validation instead and kept the prompt unchanged.

### How tests show intent rather than wording

Criteria describe behaviour at its boundaries, not phrasing, for example:
- an order at 23:45 is on today's prep sheet, but one at 00:00 is not
- two customers racing for a slot's last place produce exactly one order
- an item named `=HYPERLINK(...)` is exported as text, not run as a formula

Test titles carry criterion IDs, and the testing agent reads only the spec,
never the implementation task. So tests follow what the spec means rather
than how the code was planned.

### What I would do differently

Delegating spec decisions to an agent was fast. But I need those decisions
listed in the handoff so a human reviews them before merge. I also created
issues before the plan was merged, which skipped the repo's own gate, so
some issue links broke until the merge. Finally, with the deadline close, I
should have finished the MVP owner specs before writing seven stretch stories.

## Multi-agent software engineering

<!-- Which tasks benefit from specialised agents? How are those agents built and
tested? What must one agent pass to the next? Where could errors or malicious
instructions slip through? What evidence does each agent leave? -->
