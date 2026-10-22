# Customer–owner alignment and issue publication

## Goal
Compare owner specifications with the customer implementation, record corrections with tests before implementation, and publish the resulting tasks. Also resolve the Git divergence encountered while integrating the plan.

## Scope
Seven user prompts across related specification alignment, planning, Git troubleshooting, issue publication and session logging.

## Key prompts
- “Review the decisions of owner specs and acceptance criteria. Check if the specified behaviour fits with my current customer implementation.” This requested a focused comparison and planned customer corrections.
- “Do not run any tests or full review for this session.” This limited the work to source inspection and planning, without executing verification suites.
- “Does this fit the task you added? If it does not, add the required things to the same task” This expanded the existing pair to include the teammate’s customer-visible owner extensions.
- “open issues for T81 and T82” This explicitly authorized publishing both tasks to the shared GitHub repository.

## Decisions and corrections
- Source inspection identified My orders retaining its initial client state after fresh server data arrives. Added a testing task before its implementation counterpart.
- The teammate’s pause, closure-date, slot-capacity, archived-item and no-show requirements were absent from the older checkout. Located approved contracts in merged PR #156 and expanded the same correction pair, preserving stretch scope and existing owner mutation/criterion ownership.
- Identified an additional compatibility gap: the customer decoder lacks `no_show` and `noShowAt`, so newer owner order responses can fail decoding. Planned “Not collected” display and cancellation/review restrictions.
- The provisional local T-67/T-68 numbers conflicted with merged owner tasks. The human committed the customer pair as T-81/T-82; historical handoffs were retained.
- Diagnosed clean local master ahead one commit and behind 26. Prepared a merge without committing, resolved the PLAN header to 34 pairs/82 tasks, and staged the resolution. The human retained responsibility for committing and pushing.
- Created shared-repository issues #169 (T-81, testing) and #170 (T-82, implementation), with reciprocal links and the Customer milestone. Updated local PLAN links and stale prerequisite references. Both remain blocked on coverage allocation, shared-file ownership and prerequisite owner work.
- No tests, automated project checks, full review, implementation, agent commit or push ran. GitHub publication was verified through readback.

## Files created or modified
- `workflow/PLAN.md`: correction pair, expanded scope, merged totals, prerequisite cleanup and issue links.
- `workflow/handoffs/spec-customer-owner-alignment/01-spec.md` through `04-spec.md`: planning, extension alignment, merge resolution and publication records.
- Incoming tracked files were integrated from `origin/master` during the merge; application and test changes were upstream work, not authored in this session.
