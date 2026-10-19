# Customer Specifications, Plan and GitHub Issues

## Goal

Draft the Customer stories from the product specification, apply the user's revisions, add task pairs to PLAN.md and publish the Customer issues on GitHub.

## Scope

Six user-assistant exchanges, including two confirmations and this log request, covering one related specification-to-issue workflow.

## Key prompts

- “Write the customer spec listed in the product spec” — Requested customer story specifications using the existing product stories as their source.
- “After making the changes, add it to plan.md” — Required the revised behaviour to be reflected in the shared plan with testing and implementation coverage.
- “Add the created customer issues to github for me” — Requested publication of the planned Customer tasks as GitHub issues.

## Decisions and corrections

- Created seven story specs, CUS-01–CUS-07: six MVP stories and stretch favourites. Preserved source wording, IDs and priorities; unresolved domain contracts were recorded instead of invented.
- The unfiltered view includes all approved, non-suspended cafés in the customer's workspace. Closed cafés remain clickable but greyed out, with next-opening text; open cafés show “closing soon” during their final 30 minutes.
- Accepted ASM-01 risk assessments became ordinary Risk fields; CUS-02's unwanted assumption was removed. All ASM-01 IDs were retired. Separate Brew Finder/favourite ASM-02 proposals remain unresolved.
- The user confirmed suspension cancels every outstanding uncollected order, including accepted/ready orders, with “Cafe is suspended”; collected orders remain unchanged. Aligned the Admin suspension spec and retained order records, private Admin reasons and transactional rollback.
- Added five Customer testing/implementation pairs and six specification prerequisites. The plan now contains 20 pairs and 49 tasks; all 67 Customer criteria have one testing and one implementation owner. Existing statuses and issues were preserved.
- The user explicitly authorized issue creation from the local draft before merge, overriding the normal merged-plan publication requirement. Created and verified 15 Customer issues, #66–#80, under the shared repository's Customer milestone, with draft notices, blockers, role labels and dependency/pair references. Added their links to PLAN.md; foundation prerequisite T-34 remains unassigned.
- Spec checks passed with zero warnings. Full verification passed lint/typecheck but failed on a Vitest/jsdom worker error despite 24 passing tests. Earlier build attempts also encountered font-network and process/port permission failures. No tests/configuration were weakened, and pre-existing bun.lock edits were preserved. No commits, pushes, PRs or deployments were made.

## Files created or modified

- `workflow/specs/stories/CUS-01-browse-cafes.md`
- `workflow/specs/stories/CUS-02-cafe-page.md`
- `workflow/specs/stories/CUS-03-pre-order.md`
- `workflow/specs/stories/CUS-04-my-orders.md`
- `workflow/specs/stories/CUS-05-review-order.md`
- `workflow/specs/stories/CUS-06-brew-finder.md`
- `workflow/specs/stories/CUS-07-favourite-cafes.md`
- `workflow/specs/stories/ADM-02-cafe-suspension.md`
- `workflow/PLAN.md`
- `workflow/handoffs/spec-customer-stories/01-spec.md`, `02-spec.md`, `03-spec.md`
