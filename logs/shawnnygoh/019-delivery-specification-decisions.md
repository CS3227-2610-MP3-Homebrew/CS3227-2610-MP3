# Delivery Specification Decisions

## Goal
Record the team's delivery decisions in the technical specification for T-17/T-18 (#48/#49), then correct two wording issues through a second spec-agent run.

## Scope
Three substantive user-assistant exchanges covering the delivery specification, its correction, and session logging.

## Key prompts
> "Record the delivery decisions in TECHNICAL-SPEC.md so the T-17/T-18 pair (#48/#49) can test and build against an approved spec."

This requested a narrowly scoped specification amendment establishing the delivery contract before testing and implementation.

> "Request escalated permission (my approval) for each git command; don't try them inside the sandbox first."

This required separate approval for each Git operation, including read-only checks.

> "Make exactly two edits to `workflow/specs/TECHNICAL-SPEC.md`"

This constrained the second spec-agent run to restoring SYS-07.1's standalone content and replacing task-ownership wording with its requirement reference.

## Decisions and corrections
- Used the spec agent for both runs. Fetched upstream and created `docs/delivery-spec` from `upstream/master` with escalated approval; the initial working tree was clean.
- Recorded GitHub environment restrictions, production approval controls, environment-scoped credentials, session-mode Supavisor connection requirements, triggers and tag ancestry, migration-before-deploy ordering, Vercel builds/configuration, public dev access, and workflow permissions/pinning/concurrency rules.
- Limited the first amendment to the delivery section, Deployment credentials row, deployment-name sentence, and SYS-07.1. Added no IDs and left PLAN.md unchanged. No substantive conflicts with existing specification behavior were found.
- Approval for an optional full Git diff review was rejected; that command did not run. Required Git checks received separate approvals.
- The first run reduced SYS-07.1 to a pointer and introduced maintenance-task wording. The user corrected both: the second run restored the criterion's original content followed by the local delivery-section link, and replaced the task sentence with “SYS-13 defines that call.” The first report remained unchanged.
- First-run status matched the two requested files; both diff filters printed nothing. Second-run status matched three files; the maintenance-task grep printed nothing and the criterion grep showed restored content and its link.
- Both runs passed `bun run check:specs` with 0 warnings and `bun run verify`, including 34 tests and the production build. Each spec report records actual outputs. No commit, PR, merge, deployment, or specification approval was claimed.
- Used `shawnnygoh` as user-provided attribution for this log.

## Files created or modified
- `workflow/specs/TECHNICAL-SPEC.md`
- `workflow/handoffs/48-delivery-workflows/01-spec.md`
- `workflow/handoffs/48-delivery-workflows/02-spec.md`
