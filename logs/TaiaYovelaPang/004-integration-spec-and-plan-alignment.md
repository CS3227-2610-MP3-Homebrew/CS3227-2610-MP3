# Integration Specification and Plan Alignment

## Goal
Create Homebrew's integration specification, incorporate it and the AI security specification into the product plan, and reconcile the technical specification with the daily provider-call cap.

## Scope
Five task-bearing user-assistant exchanges covering related specification, planning and session-log work.

## Key prompts
> "Help me create an integration spec.md file"

This requested the shared integration document already reserved by the repository, covering HTTP contracts, LLM prompts/schemas and cache identities.

> "Update plan.md with the introduction of this spec and ai security spec"

This requested planning changes reflecting written contracts, outstanding assumptions and security coverage instead of the previous missing-spec placeholders.

> "Update technical spec with the daily call cap. Follow the ai security spec for this change. do not invoke any skills"

This selected the AI security policy as authoritative for the cap amendment and explicitly excluded skills from that change.

## Decisions and corrections
- Drafted three AI endpoint contracts, exact prompts, feature/provider/cache schemas, typed fallbacks, bounded input/output rules and deterministic cache fingerprints. Missing domain behavior remains dependent on story specifications.
- The user adopted ASM-01 (HTTP), ASM-03 (bounds/scalars) with Singapore business-time interpretation, and ASM-04 (provider transport). Retired those assumption IDs without renumbering; ASM-02, ASM-05 and ASM-06 remain assumptions.
- Clarified that business dates, weekdays, pickup/opening times, sales-day grouping and daily windows use `Asia/Singapore`; UTC instant serialization remains valid.
- Updated the plan's sources/tooling facts and preserved T-01–T-20. Added T-21/T-22 for application security integration. Checks confirmed all 27 SYS and 19 SEC criteria have exactly one testing and implementation owner, acyclic dependencies and 94 valid links/anchors.
- Detected the security daily-cap amendment conflicting with technical SYS-09.5. Subsequently updated technical configuration, accounting and SYS-09.5 to match: 100 production / 40 development attempts per Singapore day, atomic admission, failed-attempt counting, no cache-hit attempt and fallback on exhaustion. No skills were invoked for that amendment.
- Technical document checks passed: 27 unique SYS criteria and 14 valid links/anchors. Lint, typecheck, two existing tests and traceability passed. Required verification repeatedly failed at the production build because Turbopack could not bind a worker port, including elevated retries. No live LLM/database checks occurred.
- Plan conflict wording predates the technical reconciliation; remaining assumptions and merge prerequisites were not silently approved. Agents made no commits or pushes.

## Files created or modified
- `workflow/specs/INTEGRATION-SPEC.md`
- `workflow/specs/TECHNICAL-SPEC.md`
- `workflow/PLAN.md`
- `workflow/handoffs/spec-integration-spec/01-spec.md`
- `workflow/handoffs/spec-integration-spec/02-spec.md`
- `workflow/handoffs/spec-plan/03-spec.md`
- `workflow/handoffs/spec-technical-spec/03-spec.md`
