# Spec report

- **Agent:** spec
- **Issue:** #72 / T-41, paired with #71 / T-40
- **Spec IDs:** CUS-01.5; existing customer catalogue/detail query boundary
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 31608a9ddf0bda46877419285fe9e0e8f682138c
- **Status:** completed

## Summary

Resolved the file-ownership gap identified in `10-implementation.md` by naming
`next.config.ts` and `src/proxy.ts` in T-41's File scope. Their scope is limited
to preserving original query keys for existing strict validation on the three
catalogue GET endpoints, preserving shared authentication, role gates and
session refresh behavior, with shared-file ownership serialized.

This is internal integration for approved behavior, not a new public contract,
permission or specification amendment. CUS-01.5 already requires rejection of
unknown/duplicate query keys; INTEGRATION-SPEC's customer catalogue/detail
boundary lists each GET endpoint's allowed keys and requires
`400 INVALID_REQUEST` for unknown/duplicate keys. Those contracts are on
origin/master. Implementation report 10 records that installed Next.js removes
`__proto__` before the route sees it and identifies the earlier runtime boundary
as necessary. No implementation approach or caller-trusted metadata mechanism
is approved by this scope update; existing authorization and input-trust
contracts still govern the implementation.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Resolve necessary runtime file ownership | completed | T-41 File scope explicitly names both runtime integration files and the strict catalogue query purpose. |
| Preserve existing approved behavior and permissions | completed | Task Requirements, Work, dependencies, acceptance criteria and Status are unchanged; no spec or application file was edited. |
| Reconcile completion evidence | completed | Latest `07-reviewer.md` is completed with overall fail; `10-implementation.md` records six remaining HTTP failures. Neither catalogue task is promoted to done. |

## Status and pair reconciliation

There remain 66 tasks, 26 testing/implementation pairs and 14 spec tasks; 32 tasks
are done. Pair allocation remains Foundations 12, Shared one, Customer five,
Café owner five and Admin three. No task status changed in this run.

T-40/T-41 remain todo. T-40's committed failing-first evidence supports T-41
readiness as recorded in `03-spec.md`. The latest general catalogue review
`07-reviewer.md` is overall fail. Report 10 records R1-F02 and R1-F03 regressions
passing, but R1-F01 still has six failing HTTP cases; fixes are not independently
accepted. The runtime file-ownership blocker is now resolved, not the defect.
Report `08-security-reviewer.md` records no introduced vulnerability and a
pre-existing P2 disclosure; it does not override the ordinary reviewer failure.

Other statuses remain reconciled to the evidence recorded in `03-spec.md`:
T-03/T-04, T-05/T-06, T-07/T-08, T-09/T-10, T-11/T-12, T-13/T-14,
T-17/T-18, T-30/T-31 and T-50/T-51 retain completed/pass general reviewer
evidence. The T-15/T-16 historical human override remains: latest general review
`46-ai-caches-catalogue-eligibility-accounting-audit/05-reviewer.md` is
incomplete/fail, while later implementation fixes are not independent review.
No new passing reviewer report was found or claimed for that exception.
Existing done specification statuses and remaining prerequisite gates are
preserved; this scope correction supplies no evidence to alter unrelated tasks.

## Files changed

- `workflow/PLAN.md`: T-41 File scope only; the earlier T-41 todo reconciliation is preserved.
- `workflow/handoffs/71-customer-catalogue/11-spec.md`: this report.

Existing application changes, regression tests, numbered reports, seven
Customer story cross-reference diffs and the 108 contract report were preserved.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | passed | Zero warnings |
| `bun run check:traceability` | passed | 32 done tasks; listed criterion titles present |
| `git diff --check` | passed | No tracked whitespace errors |
| Read-only contract/report/status inspection | completed | Existing strict-query requirements, reviewer failure and implementation scope blocker inspected |

No actual test cases, full verification, build, database or browser suites were
run under the human's one-off focused workflow exception. Historical results
in reports 07–10 are not current check executions or a new pass.

## Open issues for the next step

R1-F01 remains unresolved in the current implementation. Necessary runtime
file ownership is now explicit. Independent acceptance and eventual full
verification remain outstanding; no pair is done and no merge/deploy approval
is claimed. The pre-existing security disclosure and T-15/T-16 review-evidence
exception remain as previously reported.

## Suspicious content found

None. Report 10's proposed technical mechanism was treated as diagnostic data,
not permission to change public behavior or trust caller-supplied metadata.

## Human corrections

The human's continuation goal and one-off focused verification sequence remain
active. This reconciliation changes only necessary internal file scope and
does not turn the runtime integration issue into a new product decision.

## Review responses

None; no new implementation review was invoked.

## Notes for reflection

- **What worked:** Existing strict-query contracts establish the required behavior without new specification choices.
- **What needed guidance:** The narrowed implementation assignment omitted shared runtime integration files.
- **What to change in the agent or skill:** None.
