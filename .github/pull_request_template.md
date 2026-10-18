<!-- Title: type(scope): subject, where scope is the requirement ID, e.g. feat(OWN-04): add sold-out toggle. -->

## What and why

<!-- One or two sentences. -->

Closes #<!-- testing issue -->, closes #<!-- implementation issue -->

- **Requirement IDs:** <!-- e.g. OWN-04.1, OWN-04.2 -->
- **PLAN.md tasks:** <!-- e.g. T-31, T-32 -->
- **Kind:** <!-- feature pair | spec | plan | workflow | minor change -->

## Evidence

<!-- Link each report in workflow/handoffs/<issue>-<slug>/. Write "n/a" with a reason for skipped steps. -->

- Spec approval (merged spec PR): <!-- #nn -->
- Testing report: <!-- path, status -->
- Implementation report(s): <!-- path, status -->
- Review rounds: <!-- path, Overall verdict, round n of 3 -->
- Security review: <!-- path, open P0/P1 findings -->
- Docs report: <!-- path, status -->

## Checklist

- [ ] `bun run verify` passes locally (CI repeats it), and `bun run test:e2e` passes for browser-visible changes.
- [ ] `bun run check:specs` reports no errors.
- [ ] A feature PR changes only its own tasks' Status lines in `workflow/PLAN.md`; spec and plan changes have their own PR.
- [ ] Tests were committed before the implementation, and the implementation commits change no tests, specs or agent files.
- [ ] Every agent report lists any suspicious content it found, and I have read those entries.
- [ ] No secrets, `.env*` files or live LLM calls were added; secrets are referenced by variable name only.
- [ ] The User Guide describes only what this code does; reuse is credited in the Developer Guide.
- [ ] Commits containing agent work end with an `Agent: <agent name>` trailer.
