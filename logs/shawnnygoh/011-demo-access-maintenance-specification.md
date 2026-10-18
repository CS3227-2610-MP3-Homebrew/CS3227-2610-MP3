# Demo Access and Daily Maintenance Specification

## Goal
Specify isolated production demo kits for peer testers and unattended daily maintenance. Resolve the main-Admin provisioning edge case and leave a verified local specification diff for human review.

## Scope
Three task exchanges covering one focused specification task, its decision-driven revision, and session logging.

## Key prompts
- “Then use the **spec agent** for the task in section 3. Pass it section 3 unchanged.” This required the main session to prepare the branch before delegating the supplied contracts and to verify the result independently.
- “Specify how peer testers reach every role on production without any team action after submission and without interfering with each other” This established isolated demo workspaces and unattended production access as the specification goal.
- “If none exists but an account with that email exists, in any role or workspace, it creates and changes nothing and reports a `conflict` outcome.” This resolved the provisioning collision without permitting account mutation.
- “set T-26 and T-27 to `blocked`.” This corrected maintenance task readiness to reflect demo-kit and showcase story prerequisites.

## Decisions and corrections
- The user supplied `shawnnygoh` for log attribution. Existing logs numbered 001–010 made this log 011.
- The main session confirmed a clean working tree, fetched upstream with escalated approval, and created `docs/demo-access-spec` from `upstream/master` with escalated approval before delegation.
- The spec agent documented workspace isolation, one-time demo credentials, durable creation limits, seeded testing content, maintenance authentication/triggers, retention timing, and the two HTTP routes. PLAN assigns every criterion to one testing and one implementation task across 12 foundation pairs.
- Run 01 reported `awaiting-decision`: exactly-one-main-Admin conflicted with create-only behavior when the configured email already belonged to another account.
- The user changed SYS-13.1 to at most one maintenance-created main Admin. An existing main Admin causes a no-op despite email changes; otherwise an unused email permits creation, and an occupied email produces `conflict` without changes. Maintenance never updates, promotes, resets or deletes accounts.
- Run 02 preserved `01-spec.md`, wrote `02-spec.md`, removed T-26's report link, and blocked T-26/T-27 on contract prerequisites. PRODUCT-SPEC needed no further wording change. T-23 is done; T-24–T-27 are blocked. No unresolved decision remains.
- After each run, the main session ran `bun run verify`: lint, typecheck, all eight tests, traceability and build passed. Required status, heading, assumption, forbidden-term, task-status and diff-stat checks passed. No commit, push or PR occurred.

## Files created or modified
- `workflow/specs/PRODUCT-SPEC.md`
- `workflow/specs/TECHNICAL-SPEC.md`
- `workflow/specs/AI-SECURITY-SPEC.md`
- `workflow/specs/INTEGRATION-SPEC.md`
- `workflow/PLAN.md`
- `workflow/handoffs/spec-demo-access/01-spec.md`
- `workflow/handoffs/spec-demo-access/02-spec.md`
