# Spec report

- **Agent:** spec
- **Issue:** unassigned; foundation-readiness plan and specification update
- **Spec IDs:** SYS-04–SYS-13, SEC-01–SEC-10 and ADM-03; existing requirement and task identities retained
- **Date:** 2026-10-18
- **Branch:** docs/plan-foundation-readiness
- **Base commit:** ab53b9015c80c1881aabcb668a784d83d8d42da1
- **Status:** completed

## Summary

Updated the requested plan scopes, local database setup ownership, dependencies
and contract wording. The plan contains **15 testing/implementation pairs**:
12 foundation pairs and three Admin pairs, plus three spec tasks. No task,
requirement or criterion ID was added, removed or renumbered. SYS-12.9 is
byte-identical to the base version.

Changed tasks: T-03, T-05, T-06, T-07, T-09, T-11, T-13, T-15, T-17, T-18,
T-19, T-20, T-21, T-22, T-23, T-24, T-25, T-26, T-27, T-28, T-30 and T-32.
All testing scopes use the layer/area layout; browser cases use `tests/e2e/`.
T-05 targets T-06's local Supabase stack with expected connection failures
before it exists. T-06 owns local-only `db:start`/`db:reset` scripts and the CI
startup step. Delivery configuration can proceed independently of runtime and
database implementation. Demo kits depend on T-29/T-31's Admin operations and
review states. Maintenance uses a T-06 workspace fixture for SYS-13.8 rather
than depending on demo-kit provisioning.

Status reconciliation inspected the existing spec handoffs and available
handoff inventory. No feature-pair reviewer completion report exists and no
testing/implementation task is marked done. T-01, T-02 and T-23 remain done
spec tasks, supported by their spec handoffs and the contracts present in the
base. All 33 Status fields are unchanged as explicitly requested; no conflicting
feature-pair completion claim was found.

Completed describes these edits and repository verification. It does not claim
approval of the local amendments, execution of planned tasks or acceptance of
their unimplemented behavior. The coordinating session supplied evidence that
workflow PR #31 was merged and both requested escalated Git commands succeeded
with human approval before this spec run.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Confirm the plan skill's test layout | completed | `.agents/skills/plan-create/SKILL.md` lines 73–76 state the layer/area layout, browser-only e2e directory and Node environment requirement for database/route tests. |
| Update test scopes and local database ownership | completed | All 15 testing scopes updated; Conventions records `tests/{unit,integration,e2e}/<area>/`; T-05/T-06 explain stack availability, scripts and CI startup. |
| Update dependencies and prerequisites | completed | T-17 has none; T-18 depends only on T-17; T-24/T-25 add T-29/T-31; T-26/T-27 drop T-25 and use the T-06 workspace fixture. Dependency graph remains acyclic. |
| Remove the requested workflow-state wording | completed | T-20/T-22 scopes and T-23 acceptance text now describe content; requested security/technical/integration wording and stories registry entry updated. |
| Apply the six specification-file fixes | completed | Continuous E-01–E-18 table; expanded ownership ranges; direct integration link; ADM-03.15 retention link; keep/hide/restore contract and identical ADM-03 user stories. |
| Preserve progress, IDs and SYS-12.9 | completed | One-off preservation validator compares all 33 tasks against HEAD; Status, Owner role, Requirements and Issue fields are unchanged; SYS-12.9 matches byte-for-byte. |
| Required repository checks and scope | completed | Spec check has zero warnings; exact `bun run verify` passes; retired-path scan is empty; final changed-file inventory is the seven requested documents plus this report. |

## Files changed

- [PLAN.md](../../PLAN.md): test layout, local database ownership, dependencies/prerequisites and requested wording.
- [AI-SECURITY-SPEC.md](../../specs/AI-SECURITY-SPEC.md): table continuity, ownership range, retention owner link and sentence removal.
- [TECHNICAL-SPEC.md](../../specs/TECHNICAL-SPEC.md): integration link and closing paragraph removal.
- [INTEGRATION-SPEC.md](../../specs/INTEGRATION-SPEC.md): ownership ranges, keep/hide/restore, field-limit and observable-check wording.
- [PRODUCT-SPEC.md](../../specs/PRODUCT-SPEC.md): ADM-03 user story.
- [ADM-03-review-moderation.md](../../specs/stories/ADM-03-review-moderation.md): identical user-story amendment.
- [specs/README.md](../../specs/README.md): content description for the stories registry entry.
- [This report](01-spec.md): spec-agent evidence and pair count.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | Passed, exit 0 | `Spec check passed (0 warning(s)).` No errors or warnings. |
| `bun run verify` | Passed, exit 0 | ESLint; Next type generation and TypeScript; Vitest, 3 files and 24 tests; traceability, 3 done tasks; spec check, 0 warnings; production build. All stages reached and passed. |
| Requested retired-test-path scan (`rg -n`, over `workflow/`) | No output, expected no-match exit 1 | No retired path appears anywhere in workflow files. |
| `rg -n -i "future\|once merged\|draft\|not yet" workflow/specs workflow/PLAN.md` | Four content hits, exit 0 | Exact hits and their meanings are listed below. |
| One-off Python preservation/structure validator | Passed | 33 task IDs and all Status/Owner role/Requirements/Issue fields preserved; SYS-12.9 unchanged; requested dependencies exact; DAG acyclic; 15 pairs; ADM-03 stories identical; E-14 continuous. |
| `git diff --check` | Passed, exit 0 | No whitespace errors. |
| `git status --short` and `git status --short --untracked-files=all` | Expected scope | Seven modified requested documents and this new handoff; the expanded command shows the report filename. |

Vitest emitted this nonblocking tooling advisory:

> The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.

Remaining wording-scan output:

```text
workflow/specs/AI-SECURITY-SPEC.md:344:  Future runtime-on controls cannot override environment disabled.
workflow/specs/stories/ADM-03-review-moderation.md:9:eligible café's customer page until hidden. Pending means not yet moderated;
workflow/specs/TECHNICAL-SPEC.md:84:- If catalogue caching is introduced in future, its cookie-less Supabase client
workflow/specs/TECHNICAL-SPEC.md:86:  or passed to a `"use cache"` scope. This future constraint does not introduce
```

The security line defines disable precedence for runtime controls. ADM-03
defines what the pending review state means. Both technical lines constrain
any catalogue cache and its cookie-less client; they do not report workflow
progress. There are no matching PLAN lines.

## Open issues for the next step

None introduced by these edits. Existing story/screen prerequisites and the
external per-key quota uncertainty remain in their owning contracts. Human
review and approval of these local amendments are outstanding. No commit,
issue, pull request, deployment, hosted-database operation or live LLM call was
performed by this agent.

## Suspicious content found

None. Historical reports were treated as evidence rather than authorization.

## Human corrections

The human supplied the exact dependency, scope and wording changes and required
preservation of every Status and SYS-12.9. These requirements were applied
without adding IDs or marking a feature pair complete.

## Review responses

No independent reviewer round was run for this prose update. The coordinating
session's diff inspection identified table spacing, final-newline and prose
wrapping fixes; all were applied before the successful verification run.

## Notes for reflection

- **What worked:** Direct comparisons preserved all task metadata and SYS-12.9 while repository checks verified links, coverage and build compatibility.
- **What needed guidance:** Exact human dependency decisions established the revised planning boundaries.
- **What to change in the agent or skill:** None identified in this scope.
