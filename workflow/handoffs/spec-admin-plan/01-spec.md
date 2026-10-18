# Spec report

- **Agent:** spec
- **Issue:** Unassigned; Admin plan authoring.
- **Spec IDs:** ADM-01.1–ADM-01.13, ADM-02.1–ADM-02.13, ADM-03.1–ADM-03.18, ADM-04.1–ADM-04.18.
- **Date:** 2026-10-18
- **Branch:** docs/admin-plan
- **Base commit:** 8cdabf959f1aad997eda1978520b9d9582df4c8b
- **Status:** completed

## Summary

Added three Admin testing/implementation pairs, T-28–T-33, using `plan-create`
and the user's explicit precedence rules. All 62 Admin criteria have exactly
one testing owner and one implementation owner. The spec check reports zero
warnings, and the exact `bun run verify` command passes. Completed describes
planning and verification only; it does not claim human approval, execution
of the planned tasks, or implemented Admin behavior.

The coordinating session reported a clean initial working tree, fetched
upstream, created `docs/admin-plan` from `upstream/master` with `--no-track`,
and confirmed `check:specs` exists in `package.json` before delegation. This
spec agent ran no Git commands, committed nothing and pushed nothing.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence |
| --- | --- | --- |
| Three requested Admin pairs use the next free IDs | completed | T-28/T-29 cover ADM-01/ADM-02; T-30/T-31 cover ADM-03; T-32/T-33 cover ADM-04 |
| Every ADM criterion has one testing and one implementation owner | completed | 13 + 13 + 18 + 18 = 62; explicit Requirements lists; ownership audit and spec checker pass |
| Dependencies use actual foundation task IDs; AI depends on manual moderation | completed | Dependency table below; T-32 and T-33 both depend on T-30/T-31; checker finds no cycle |
| Statuses follow PLAN conventions | completed | All six tasks are blocked by named missing contracts/surfaces; no task is in-progress or claimed done |
| Preserve specs and unrelated tasks | completed | No specs edited; no T-01–T-27 content, IDs or Status lines changed |
| Header and pair conventions follow the user override | completed | Header has source links without a date or merge-state annotation; one pair combines two related Admin stories |
| Required repository checks | completed | `bun run check:specs`: zero warnings; exact `bun run verify`: exit 0 |
| Report path | completed | This new `workflow/handoffs/spec-admin-plan/01-spec.md`; no earlier report existed in this directory |

### Task allocation

| Task | Role and scope | Depends on | Status |
| --- | --- | --- | --- |
| T-28 | testing: ADM-01.1–13 and ADM-02.1–13 | T-08, T-10, T-16 | blocked |
| T-29 | implementation: ADM-01.1–13 and ADM-02.1–13 | T-28, T-08, T-10, T-16, T-31 | blocked |
| T-30 | testing: ADM-03.1–18 | T-08, T-10, T-16 | blocked |
| T-31 | implementation: ADM-03.1–18 | T-30, T-08, T-10, T-16 | blocked |
| T-32 | testing: ADM-04.1–18 | T-30, T-31, T-08, T-10, T-12, T-14, T-16 | blocked |
| T-33 | implementation: ADM-04.1–18 | T-32, T-30, T-31, T-08, T-10, T-12, T-14, T-16 | blocked |

T-08 supplies role/workspace RLS and fixtures, T-10 session refresh and streamed
role gates, and T-16 eligibility/audit repositories and retention behavior.
The AI pair additionally consumes T-12 durable admission and T-14 validated
moderation operations/fake provider. Transitive dependencies already provide
core schema/configuration; no deployment, demo provisioning, accessibility
correction or cross-feature security task is made an artificial prerequisite.
Existing SYS/SEC owners remain unchanged.

T-28 can author failing-first café audit-display assertions from the approved
contracts before the display exists. T-29 explicitly depends on T-31 because
ADM-01.9 and ADM-02.11 require reading those entries through `/admin/audit`.
T-30/T-31 own the shared audit screen and can use contract-derived café-action
fixtures without requiring T-29's routes. This acyclic forward dependency
preserves the requested café pair allocation/order and avoids assigning audit
display to two implementations. T-29 cannot claim complete acceptance before
that screen is available. T-28/T-29 retain café criterion ownership.

## Files changed

- `workflow/PLAN.md`: added Admin source links and six Admin tasks. Conventions
  now acknowledge the four existing Admin story specs and `check:specs`, replacing
  the stale claim that no story specs exist. Existing tasks were not changed.
- `workflow/handoffs/spec-admin-plan/01-spec.md`: this new report.

No specifications, code, tests, fixtures, infrastructure, other handoffs or
agent/skill instructions were edited.

## Checks run

| Command or check | Result | Evidence |
| --- | --- | --- |
| `package.json` script inspection | Pass | `check:specs` is `bun workflow/scripts/check-specs.ts`; the required script exists |
| Inline Bun ownership audit using the existing PLAN parser | Pass | All 62 ADM criteria have exactly one owner per role; six new Admin tasks, 26/26/18/18/18/18 criterion allocations |
| `bun run check:specs` | Pass, exit 0 | Final dependency graph accepted; `Spec check passed (0 warning(s)).` |
| `bun run verify` | Pass, exit 0 | Exact command; lint, typecheck, 3 Vitest files/18 tests, traceability for 3 done tasks, spec check with zero warnings and production build all pass |
| `git status --short` (coordinating session, escalated) | Pass, exit 0 | Exactly ` M workflow/PLAN.md` and `?? workflow/handoffs/spec-admin-plan/` |
| `git diff --check` (coordinating session, escalated) | Pass, exit 0 | Empty output; no whitespace errors |

The final verification after adding T-29's explicit T-31 dependency produced:

```text
$ bun run verify
$ bun run lint && bun run typecheck && bun run test && bun run check:traceability && bun run check:specs && bun run build
$ eslint
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
$ vitest run --passWithNoTests
 Test Files  3 passed (3)
      Tests  18 passed (18)
$ bun workflow/scripts/check-traceability.ts
Traceability passed (3 done tasks; all listed criteria have test titles).
$ bun workflow/scripts/check-specs.ts
Spec check passed (0 warning(s)).
$ next build
▲ Next.js 16.4.2 (Turbopack)
✓ Compiled successfully in 427ms
✓ Generating static pages using 5 workers (4/4) in 1420ms
Route (app)
┌ ○ /
└ ○ /_not-found
```

Vitest emitted the existing `vite-tsconfig-paths` advisory that Vite has native
path resolution. It did not fail verification. There were no ADM-criterion
warnings. These starter tests/builds verify the planning change's repository
consistency, not future feature acceptance. No local database, hosted service,
live LLM, end-to-end feature flow or deployment was exercised by this run.

## Open issues for the next step

No ADM criterion was left unplaced and no planning decision is outstanding.
Execution remains blocked by these existing story-owned prerequisites:

- T-28/T-29 need OWN-01 application fields/submission/resubmission and owner-side
  decision-reason display; OWN-02 management/banner/suspension-reason surfaces;
  CUS-03/CUS-04/OWN-05 new-order refusal and preserved existing-order lifecycle
  contracts. Affected integration evidence also needs those surfaces. Their
  absent contracts were not guessed or authored in this run.
- T-30/T-31 need CUS-05 review creation/field constraints and its review surface,
  preserving the Admin contract's pending state and text/rating immutability.
  CUS-01/CUS-02 retain rating formulas and customer UI; the Admin pair tests
  customer visibility at the authorized RLS read boundary.
- T-32/T-33 inherit CUS-05 source/field requirements and await the T-30/T-31
  manual queue, confirmation and audit pair. No demo-kit creation dependency
  is introduced; local fixtures can exercise main/kit behavior.

All issues remain unassigned. Planning adds no permission to start feature
execution, create issues, commit, push, merge or deploy. After this report was
created, the coordinating session ran `git status --short` with escalated
permissions and observed exactly ` M workflow/PLAN.md` and
`?? workflow/handoffs/spec-admin-plan/` (exit 0). Its escalated
`git diff --check` also passed with empty output (exit 0). These are
parent-observed results; this spec agent ran no Git commands.

## Suspicious content found

None.

## Human corrections

The user made the README conventions authoritative over `plan-create` for
related-story pairing, header wording and allowed statuses. The plan preserves
those conventions; no skill, README or specification was edited. The
coordinating review required an explicit T-29→T-31 dependency for café audit
display acceptance; the dependency and its failing-first distinction are now
recorded, and both required checks were rerun successfully afterward.

## Review responses

No independent reviewer report was produced in this planning run.

## Notes for reflection

- **What worked:** Explicit criterion lists and the existing spec checker verify
  all 62 criteria without reallocating shared foundation ownership.
- **What needed guidance:** The coordinating review made the audit screen's
  cross-pair completion dependency explicit in the task graph.
- **What to change in the agent or skill:** The user's precedence rules reveal
  the skill's dated-header and in-progress examples differ from the requested
  conventions; changing workflow instructions was outside this assignment.
