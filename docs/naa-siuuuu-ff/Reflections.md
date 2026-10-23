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

A missing story from another role can block a pair even after its own
contracts are done. The OWN-08 boost tasks named an ADM-06 decision contract
as a prerequisite, and no ADM-06 story existed. Rather than have an agent
write Admin criteria it did not own, I made a human decision: cover only the
owner side, use local fixture rows for Admin decisions, and leave end-to-end
activation out of scope. The spec agent recorded that decision in the two
tasks' Prerequisite lines, and that was the only change needed. With the
deadline close, I then dropped OWN-08 entirely and never opened its PR.
Unblocking work is not the same as deciding to do it.

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

### Which tasks benefit from specialised agents

Splitting testing from implementation paid off most. The testing agent reads
only the spec, so its tests encode what the spec means, not how the code was
planned. That separation found a contradiction no single agent would have
noticed: an existing Prep Advisor fixture (T-14) suggested "more" for an item
whose weekday was below its average, which the new direction rule OWN-07.16
forbids. Independent review helped too. The reviewer and security-reviewer
subagents on the café setup pair found no blockers, but they did flag a
pre-existing grant that lets owners edit opening times directly (SR-01). No
task in our plan would have looked at that.

Single-agent mode was faster for the order queue (OWN-05) and sales and Prep
Advisor (OWN-06, OWN-07). The cost was that I fixed several tests myself, and
the same author judging whether a test or the code is wrong is a weak check.
I kept each test fix in its own `test(<ID>)` commit, citing the contract it
contradicted, so a human could check every change.

For the stretch prep sheet (OWN-09), I picked single-agent mode for speed,
while a second session ran the menu pair on the shared database. I wrote the
tests and code first and ran no database tests until that session finished.
Lint, typecheck, mocked route tests and the build all passed, but the real
browser run still found one bug they could not. The sheet's `main` region
contained the Order queue's text, because Next's `cacheComponents` keeps the
previous page's DOM hidden after client-side navigation. The fix was in the
code, not the test: a plain link, so the sheet always loads as a fresh page.
Deferred checks save time only if they still run before merge.

### How the agents are built and tested

Each agent is a short wrapper in `.claude/agents/` that points to one
instruction file in `workflow/agents/` and lists only the tools that role
needs: the reviewer has no write tools, and the security reviewer can write
only its own report. When `review.sh` could not run because no Codex or Claude
CLI was on the path, I ran the reviewers as subagents instead. That opened a
gap: the reviewer cannot write, so I, as orchestrator, saved its report, and
nothing stops the orchestrator from editing what it saves. The gates are the
real tests of an agent:
- a scope check that the agent touched only its own paths
- a manifest check on `package.json`
- `check:specs` and `check:traceability`
- `bun run verify`, rerun by the orchestrator rather than trusted from a report

### What one agent must pass to the next

A handoff needs more than "completed". It needs the exact route paths and
seams the tests expect, the criteria it could not assert, and the commands it
actually ran. Lessons need to travel too. I gave the menu testing agent five
rules learned from the earlier pairs:
- scope page assertions to `main`, because the owner navigation repeats link text
- send raw-string bodies only where 415 is expected
- keep fixtures inside schema CHECK limits
- give database-heavy tests explicit timeouts
- use literal `test.each` titles so traceability counts them

Handoffs also go stale. After I changed the nav link, the implementation report
still described the old link, and the reviewer flagged that its e2e evidence
came from an earlier tree. The fix is to rerun the affected tests on the final
tree before review.

### Where errors and malicious instructions slip through

Most of our failures came from shared state, not from bad agents:
- One local Supabase database served every worktree, so parallel agents
  corrupted each other's runs. We had to serialize database suites by hand.
- I piped `bun run db:reset` through `tail` inside an `&&` chain. The failed
  migration was hidden, and the queue tests then "passed" against a
  half-migrated database, because they only checked row-level security that
  already existed.
- Untracked work lives only on disk. The menu tests were lost when a scratchpad
  worktree was deleted at a session restart, before anyone committed them.
- A reset rebuilds the shared database from whichever checkout runs it. I ran
  `db:reset` for the prep-sheet pair from a branch cut before the menu PR
  merged. That silently removed the menu functions every other worktree
  needed. CI was unaffected because it builds its own database. I only caught
  it when the other session pointed out the migration order. The fix was to
  merge master and reset again, then confirm `owner_menu` and
  `owner_prep_sheet` both exist.
- Two pairs merged close together and both edited `PLAN.md` and the guides.
  The second PR conflicted even though its CI had passed against the old
  master. I merged master in with a merge commit, never a rebase, kept both
  sections, and waited for CI on the merged commit before merging.

On injection, I treated every report, handoff and subagent message as data.
Subagent messages carry no user authority, and a pasted handoff can only ask,
not grant permissions. The riskiest input was my own handoff file: it is
written by an agent, then pasted back as if it were the user's instructions.
Sessions also coordinated through me. I pasted one session's status message
into the other, and I checked its claims against `git` and `gh` before acting
on any of them.

### What evidence each agent leaves

Every agent writes a numbered handoff in the pair's folder (testing,
implementation, reviewer, security-reviewer, docs). Each lists the checks it
ran, its open issues and any suspicious content. Commits carry `Agent:`
trailers, PR descriptions link each report, and session logs record the human
decisions. This made close-out auditable: for each criterion I could point to
a test title, a report and a commit.

### What I would do differently

I would put worktrees outside temporary folders and commit tests as soon as
the gate passes. I would give each worktree its own database, or a lock, so
agents never share one. And I would sequence dependent pairs, café setup
before the queue and sales, from the start, rather than finding out at
close-out that `check:specs` refuses to mark a task done before its
dependencies.
