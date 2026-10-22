# Testing report

- **Agent:** testing (Codex, single-agent mode)
- **Issue:** T-81 / #169, paired with T-82 / #170; human-authorized verification support
- **Spec IDs:** existing SYS-12.5, SYS-12.9, SEC-10.2 cases; no change to criterion ownership
- **Date:** 2026-10-23
- **Branch:** fix/169-customer-orders-refresh
- **Base commit:** 85c6e2fb9f5486fc89b9a39869dd5bfe03e2569d (origin/master)
- **Status:** completed

## Summary

Single-agent mode. Optimized exactly two existing demo-kit cases with explicit
human authorization. Both pass with their existing assertions and five-second
timeouts. This completes the authorized optimization, not the pair's full
verification or merge readiness. T-81/T-82 remain open.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-12.5 / SEC-10.2: passwords absent from application rows and Auth metadata, Auth stores a nonplaintext password | completed | `plaintext passwords occur in no persisted application row, Auth metadata, cache or audit` passed. Same dynamic table enumeration, every table/account predicate and both Auth queries per account; same expected row sets |
| SYS-12.9: relative collected sales history with valid items and eligible/noncollected orders | completed | `review-eligible collected orders, other states and four weeks of item sales are relative to creation` passed. All eligibility, state, timestamp, item-presence and positive-integer quantity/price assertions retained |

## Files changed

Only `tests/integration/demo-kits/kit.test.ts` application/test content changed
in this support step:

- Password case: collect the existing queries and expected row sets, execute
  them through one UNION ALL query, then assert every indexed result. Added
  batch-result length and distinct-index checks prevent missing or duplicate
  results from silently omitting assertions. Table discovery remains dynamic.
  SQL round trips decrease from `1 + tables × accounts + 2 × accounts` to two.
- History case: fetch all collected orders' items in one query, then filter by
  each order ID and retain every original per-order/per-item assertion. Item
  queries decrease from one per collected order to one for all collected orders.

No test names, timeouts, fixtures, configuration, dependencies, other test cases
or production code changed in this step. No `.skip` was introduced.

## Checks run

Bundled Node 24.19.0 was on PATH. Local Supabase only; existing setup blocks
non-loopback fetches. Exact selected-test command:

```sh
bun run test tests/integration/demo-kits/kit.test.ts -t 'plaintext passwords occur in no persisted application row|review-eligible collected orders, other states and four weeks of item sales are relative to creation'
```

| Command | Result | Evidence |
| --- | --- | --- |
| Selected command above | passed | One file passed; two tests passed, 16 excluded by the title filter; 5.25 seconds total including setup; exit 0 |
| `git diff --check` | passed | No whitespace errors |

Failing-before evidence: the prior final full verify passed lint and typecheck,
then failed with 1,364 passed / three timed-out tests. The two cases optimized
here took 7,302 ms and 9,622 ms against their five-second limits. The third,
unchanged SYS-12.7 / SEC-10.1 admission daily last-slot race took 5,019 ms.
Later verify stages were not reached. An earlier implementation-stage verify
had passed all 1,367 tests and subsequent stages; this does not supersede the
later failure or constitute verification of this test-only diff.

No full verify, other test cases, browser suite, lint or typecheck were rerun
after batching because the human limited this run to the two selected tests.

## Open issues for the next step

- The separate admission timeout remains unverified and its test unchanged.
- No full-suite result exists for the optimized tree. T-81/T-82 PLAN statuses
  remain `todo`; implementation and docs are reviewable local changes.
- Human review and commits remain outstanding.

## Suspicious content found

None.

## Human corrections

- The human authorized: "Optimize the two existing tests", preserving all
  assertions and timeouts, extending the original T-82 file scope for this step.
- They then instructed: "Only activate those two tests. Do not run the full
  test suite again". This overrides the skill's full-verify instruction for
  this run; no other test, including the admission case, was activated.

## Review responses

None. No independent review was invoked.

## Notes for reflection

- **What worked:** Batching local SQL removed repeated Docker/psql startup
  overhead while keeping all domain assertions; both selected cases passed.
- **What needed guidance:** Editing these existing tests required explicit
  scope authorization; the human also set the execution limit.
- **What to change in the agent or skill:** None in this diff.
