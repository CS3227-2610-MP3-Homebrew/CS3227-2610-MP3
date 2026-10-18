# Admin Story Specifications and Review Fixes

## Goal
Write ADM-01–ADM-04 using the spec agent and spec-create, amend the specified shared contracts, then apply the user's review fixes. Leave a verified local diff and separate handoff reports.

## Scope
Three user-assistant exchanges covering one focused specification task, its review corrections and session logging; attribution supplied as shawnnygoh.

## Key prompts
- “The product decisions are already made and are given here as facts: do not reopen them, and do not ask clarification questions.” This established the supplied Admin behavior as requirements and reserved only unaddressed contradictions for reporting.
- “Don't change anything else, don't renumber or add criteria, and don't touch PLAN.md, templates, skills, code or tests.” This restricted the review pass to the four stories and a new handoff while preserving criterion identities and prior work.

## Decisions and corrections
- Escalated Git commands confirmed a clean worktree, fetched upstream and created docs/admin-story-specs from b5e7676, Merge pull request #27. No commits, pushes or PRs were made.
- The spec agent used spec-create to author four stories with 13, 13, 18 and 18 criteria. Specs omitted Last updated metadata and treated supplied decisions as facts, without assumptions.
- Specified workspace isolation, required reasons and atomic Admin audits; one-way application approval; reversible suspension preserving existing orders and owner access; pending/kept/hidden review states and immutable reviews; advisory AI with individual manual confirmation.
- Shared amendments added Keep, review immutability, comprehensive Admin audit coverage and 409 STATE_CONFLICT. SYS-10.3 remains owned by PLAN tasks T-15/T-16; SEC-05.2 by T-21/T-22. Cross-role dependencies were recorded without editing PLAN.
- Review corrections removed story-file workflow notices, expressed visibility through customer-scoped RLS reads, and specified exact mutation success bodies. Moderation Assistant never returns no_source_data; stale selections return 400 INVALID_REQUEST before admission with queue-changed/reload feedback. Audit review targets show café name and review reference without queue links.
- Exactly ten criterion definitions changed during review; IDs and counts stayed unchanged. Shared specs, PLAN and report 01 were preserved during that pass.
- Both rounds passed bun run verify, including eight tests, traceability and production build. All 63 story links resolved; the required six-entry Git status was preserved through run 02. No open issues remained. Draft completion did not establish human approval or implemented feature acceptance.

## Files created or modified
- workflow/specs/stories/ADM-01-cafe-applications.md
- workflow/specs/stories/ADM-02-cafe-suspension.md
- workflow/specs/stories/ADM-03-review-moderation.md
- workflow/specs/stories/ADM-04-moderation-assistant.md
- workflow/specs/PRODUCT-SPEC.md
- workflow/specs/TECHNICAL-SPEC.md
- workflow/specs/INTEGRATION-SPEC.md
- workflow/specs/AI-SECURITY-SPEC.md
- workflow/handoffs/spec-admin-stories/01-spec.md
- workflow/handoffs/spec-admin-stories/02-spec.md
