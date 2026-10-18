# Admin Story Plan and Refinement

## Goal
Add the Admin testing/implementation pairs to the product plan using the spec agent and `plan-create`, then refine two planning sentences and record the session.

## Scope
Three task-focused user-assistant exchanges covering one Admin planning task, its wording correction and session logging.

## Key prompts
- “Use the spec agent with `plan-create` to add the Admin story pairs to `workflow/PLAN.md`.” This assigned planning to the spec agent and specified three pairs beginning at T-28, with complete ADM criterion ownership.
- “Request escalated permissions for every git command; don't try them in the sandbox first. Don't commit or push.” This set the Git execution boundary while preparing and reviewing the local branch.
- “Where `plan-create` disagrees with `workflow/specs/README.md`, the README wins” established precedence for related-story pairing, header wording and allowed statuses.
- “Also delete the planner-reasoning sentence in the Admin section intro that begins "The forward reference preserves". Change nothing else.” This narrowed the follow-up to two sentence deletions, preserving task details and the earlier report.
- “Use the session-log skill; my GitHub username is shawnnygoh.” This requested the session record and supplied attribution without a GitHub lookup.

## Decisions and corrections
- Confirmed a clean working tree, fetched upstream and created `docs/admin-plan` from `upstream/master` with `--no-track`. Confirmed `check:specs` existed before delegation. Every Git command requested escalation; nothing was committed or pushed.
- The spec agent added T-28/T-29 for ADM-01/ADM-02, T-30/T-31 for ADM-03 and T-32/T-33 for ADM-04. All 62 criteria have exactly one testing and one implementation owner; none were left unplaced.
- All six tasks are `blocked` by named missing Customer/Café owner contracts and surfaces. Existing task IDs, content and statuses were preserved; source links and stale conventions were updated without editing specs.
- Coordinating review required an explicit T-29 dependency on T-31 for café audit-display acceptance. Both ADM-04 tasks depend on the ADM-03 pair. Shared audit-screen ownership remains with ADM-03.
- The user then removed workflow-state commentary from Conventions and planner reasoning from the Admin introduction. The spec agent deleted exactly those two sentences and wrote a separate `02-spec.md`, leaving `01-spec.md` unchanged.
- After the final PLAN edit, `bun run check:specs` passed with zero warnings and exact `bun run verify` passed, including 18 tests and production build. The existing Vite advisory did not fail verification. Final reported Git status listed only `workflow/PLAN.md` and `workflow/handoffs/spec-admin-plan/` before session logging.

## Files created or modified
- `workflow/PLAN.md`
- `workflow/handoffs/spec-admin-plan/01-spec.md`
- `workflow/handoffs/spec-admin-plan/02-spec.md`
