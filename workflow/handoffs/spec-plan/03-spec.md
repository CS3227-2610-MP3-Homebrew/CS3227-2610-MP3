# Spec report

- **Agent:** spec
- **Issue:** unassigned; human requested plan update for integration and AI security specs.
- **Spec IDs:** SYS-04–SYS-11 and SEC-01–SEC-09; 27 SYS and 19 SEC criteria.
- **Date:** 2026-10-18
- **Branch:** documentation
- **Base commit:** 8a76e2ad9cb4a25c7a59e33a10c8252d0cfb5cbf
- **Status:** awaiting-decision

## Summary

Updated PLAN.md to reference the written integration/security contracts, their
approval state, remaining integration assumptions and current installed test
tooling. Preserved T-01–T-20 and their requirement identities, unchecked
acceptance lists and issue assignments. Added T-21/T-22 for application security
integration after story-owned routes/screens/confirmation flows exist; ordinary
story tasks remain unplanned until their specifications exist.

The local security amendment adds a daily provider-call cap, but the unchanged
technical specification explicitly prohibits that cap in SYS-09.5 and its
usage-control prose. The plan records this conflict as a T-02 spec prerequisite;
T-11/T-12 and their dependent work remain blocked. No conflicting source spec
was changed by this run, and no policy choice was made through the plan.

The original security spec exists on local master. Its daily-cap amendment is
uncommitted; the integration spec is untracked. Product and technical specs
match master. Planning distinguishes these states instead of declaring every
local document approved or every written contract missing.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Introduce both written specs and direct authoritative links. | completed | Updated Sources, Shared design, T-01/T-02 and affected foundation pairs; 94 relative links/anchors resolve. |
| Retain integration decisions and outstanding assumptions. | completed | Adopted former ASM-01/03/04 recorded; INTEGRATION-SPEC ASM-02/05/06 retain their identities and dependent execution gates. |
| Cover every SYS/SEC criterion exactly once per testing/implementation role. | completed | Validator finds 46 criteria and 92 unique criterion/role allocations across 10 pairs. |
| Preserve IDs/progress and valid task graph. | completed | Existing T-01–T-20 retained, T-21/T-22 appended, fields/checklists present, all implementation tasks depend on their test task, DAG acyclic. No task marked done. |
| Reconcile contradictory cap contracts. | awaiting-decision | T-02 records the prerequisite amendment; SYS-09.5 and current SEC-06.2 cannot both be implemented as written. |
| Required full repository verification. | incomplete | Initial and elevated runs pass lint/typecheck/tests/traceability; production build fails at worker port binding. |

## Files changed

- [PLAN.md](../../PLAN.md): updated sources, shared contracts, tooling facts, assumptions/gates and security coverage.
- [This report](03-spec.md): current evidence and outstanding decisions.

Preexisting AI-SECURITY-SPEC changes, the integration spec and earlier handoffs
were preserved. No code, tests, dependency files, other specs, issues, commits,
PRs, hosted services or deployments were changed.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| Git status/branch/base/master tree and source diffs | Passed | Verified source existence and master versus local amendment state; observed preexisting modified AI security spec and untracked integration deliverables. |
| `bun -e` one-off plan validator | Passed | 22 stable unique task IDs; 46 criteria each assigned to one testing/implementation owner; required fields, test prerequisites and acyclic dependencies; 94 links/anchors resolve; no trailing whitespace. |
| `bun -e` status/conventions inspection | Passed | T-01/T-02 awaiting-decision; T-11–T-16 and T-19–T-22 blocked; remaining tasks todo. Conventions are 297 whitespace-delimited words. |
| `git diff --check` | Passed | No tracked whitespace errors. |
| `bun run verify` | Failed at build, twice | Initial and elevated retry both pass ESLint, next typegen/TypeScript, 1 Vitest file / 2 tests and traceability (0 done tasks). Turbopack CSS worker fails binding a port: `Operation not permitted (os error 1)`. |

One-off planning validation creates no executable repository test files.
Passing starter checks do not establish future foundation/security acceptance.
No e2e run was needed for this prose-only planning change.

## Open issues for the next step

- T-01 awaits INTEGRATION-SPEC ASM-02/05/06 decisions and story-owned data
  contracts, then an approved integration spec on master.
- T-02 retains the preexisting PLAN ASM-01 production Admin provisioning
  proposal and the prerequisite technical/security daily-cap reconciliation.
  Local seed/RLS work remains independent. No additional action/cache-hit/
  refresh charging-policy decision is required by the security spec.
- The cap amendment in AI-SECURITY-SPEC must not be treated as overriding
  SYS-09.5 through planning. Both owning specs require a consistent reviewed
  contract before affected tests/implementation execute.
- T-19/T-20 need core story screens; T-21/T-22 need the listed story contracts
  and application security surfaces. Shared provider/cache work retains its
  existing independent owners.
- Test tooling is installed; the old global missing-tooling blocker is removed.
  Task-specific local database/accessibility tooling remains in testing scope.
- Full verification is still limited by the build worker-port restriction.

## Suspicious content found

None. Earlier handoffs were treated as history, not new authorization. The
build-generated external bug-report URL was not opened.

## Human corrections

The human requested that the plan reflect the introduced integration and AI
security specifications. This update preserves the earlier integration decisions
and does not approve the remaining assumptions or change source contracts.

## Independent review

No independent review was run.

## Review responses

None.

## Notes for reflection

- **What worked:** Criterion ownership and DAG checks preserve existing SYS coverage while adding complete SEC coverage without duplicate ownership.
- **What needed guidance:** Integration assumptions and the source-spec cap conflict remain human/spec dependencies.
- **What to change in the agent or skill:** None established by this run.
