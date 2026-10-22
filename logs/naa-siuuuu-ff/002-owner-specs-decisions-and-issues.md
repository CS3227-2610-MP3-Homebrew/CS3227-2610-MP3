# Café owner specs, decisions and issues

## Goal
Review the specs for the café owner role and the other roles, suggest new owner features, then write the owner specs on a new branch and create GitHub issues for each new feature.

## Scope
Four user–assistant exchanges on one focused task: café owner specification and planning.

## Key prompts
- "Read through the specs, and let me know what is there so far, for my role and for the other roles. Then, give me some suggestions for what features my role can have." This asked for a status summary of all roles and owner feature ideas before any work began.
- "Finally, give me instructions on how to run the website to use it myself, and let me know if you are able to test the website interface directly" This asked for local setup steps and what the assistant could test itself.
- "Switch to a new branch, make the specs for the cafe owner, and then make a git issue for each of the feature." This turned the suggestions into specs, plan tasks and GitHub issues.
- "I give you the autonomy to make decisions yourself for things that ask you to ask a human, unless you are really unsure of what I prefer." This delegated the open T-61 (sales/Prep Advisor) and T-64 (boost) decisions to the assistant.

## Decisions and corrections
- The user chose to spec all seven suggested features (prep sheet, pause orders, closure dates, per-slot limit, archive/restore, no-show, CSV export) as OWN-09–OWN-15, all stretch.
- The user chose one test issue plus one implementation issue per feature, following the repo convention, rather than one issue per feature.
- Branch `docs/117-owner-specs` was created from `upstream/master`, named after T-61's issue #117, with upstream tracking removed.
- T-61, decided by the assistant:
  - A sale is a collected order, dated by collection day; the Dashboard covers 28 days including today, with a top-10 item ranking.
  - Prep Advisor uses the 28 completed days, needs sales on at least 7 days, and rejects a "more" or "less" suggestion that contradicts the item's average day.
  - The Prep prompt was left unchanged because existing tests pin its exact text.
- T-64, decided by the assistant: a fixed S$10.00 fee that is only recorded, one open boost at a time, a 7-day Featured window from admin approval, and a badge only, with no ranking change.
- The ADM-06 admin story is still missing, so T-65 stays blocked; this is reported for the Admin teammate.
- Customer-visible effects of OWN-10–OWN-14 are flagged for the Customer teammate to review.
- The repo's `create-issues.ts` refuses to create issues before the plan is merged. At the user's request, issues #140–#148 and #150–#154 were created anyway, using the script's own issue renderer.
- The first integration-spec edit failed on an unmatched text anchor and nothing was written; it was fixed and rerun.
- `bun run check:specs` fails only because of the untracked `.agents/skills/handoff/` folder, which predates this work. Run on a copy without that folder, it passes with 0 warnings; traceability also passes.
- `bun run verify` was not run, since only documents changed.

## Files created or modified
- workflow/specs/PRODUCT-SPEC.md
- workflow/specs/TECHNICAL-SPEC.md
- workflow/specs/INTEGRATION-SPEC.md
- workflow/specs/stories/OWN-06-sales-dashboard.md
- workflow/specs/stories/OWN-07-prep-advisor.md
- workflow/specs/stories/OWN-08-boost-request.md
- workflow/specs/stories/OWN-09-prep-sheet.md
- workflow/specs/stories/OWN-10-pause-orders.md
- workflow/specs/stories/OWN-11-closure-dates.md
- workflow/specs/stories/OWN-12-slot-order-limit.md
- workflow/specs/stories/OWN-13-archive-menu-items.md
- workflow/specs/stories/OWN-14-no-show.md
- workflow/specs/stories/OWN-15-sales-export.md
- workflow/PLAN.md
- workflow/handoffs/117-owner-specs/01-spec.md
