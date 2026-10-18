# Spec report

- **Agent:** spec
- **Issue:** None; Admin story specification authoring.
- **Spec IDs:** ADM-01.1–ADM-01.13, ADM-02.1–ADM-02.13, ADM-03.1–ADM-03.18, ADM-04.1–ADM-04.18; amendments to SYS-10.3 and SEC-05.2.
- **Date:** 2026-10-18
- **Branch:** docs/admin-story-specs
- **Base commit:** b5e7676 — Merge pull request #27 from shawnnygoh/docs/demo-access-spec
- **Status:** completed

## Summary

Drafted exactly four Admin story specifications and the four authorized shared
contract amendments. The source story text is preserved, including ADM-03's
unchanged hide-or-restore user story; Keep is specified in its criteria and the
three authorized Product rows. No dates, workflow state, Last updated metadata,
new shared requirement IDs, assumptions, code, tests, PLAN changes or additional
routes were added to the specifications. Authoring and all requested acceptance
checks are complete; `bun run verify` passed. Drafting does not establish human
approval or implementation acceptance. No commit, push or PR was made.

Branch setup evidence supplied by the coordinating session: the initial
escalated `git status --short` printed nothing; escalated `git fetch upstream`
succeeded; escalated `git switch -c docs/admin-story-specs --no-track upstream/master`
created the branch; the base is the required b5e7676 merge.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| ADM-01.1–ADM-01.13: 13 criteria | completed | One requirement; applications, transitions, reasons, scope, kit operations, HTTP failures, permissions and atomic audit specified |
| ADM-02.1–ADM-02.13: 13 criteria | completed | One requirement; approved-only suspension, existing-order/access preservation, scope, reasons and atomic audit specified |
| ADM-03.1–ADM-03.18: 18 criteria | completed | One requirement; post-moderation, Keep/Hide/Restore, immutable reviews, queue and workspace Admin audit screen specified |
| ADM-04.1–ADM-04.18: 18 criteria | completed | One requirement; one-page bounded triage, ordinary per-review confirmation, forged/stale advice, all four fallbacks and mapped security evaluation specified |
| Shared amendments and cross-role dependencies | completed | Limited to the named Product rows, Technical data-model rows/SYS-10.3, Integration status/conflict wording and AI-security confirmation wording/SEC-05.2 |
| Acceptance checks and `bun run verify` | completed | Exact six-line git status; four files; unique sequential criteria; exact source stories; 121 relative links; lint/typecheck, 8 tests, traceability and production build passed |

The total is 62 story acceptance criteria. These statuses describe specification
authoring, not implemented behavior or executable feature acceptance.

## Files changed

- `workflow/specs/stories/ADM-01-cafe-applications.md`: pending decisions, one-way approval, resubmission reappearance, latest-reason access and transactional audit.
- `workflow/specs/stories/ADM-02-cafe-suspension.md`: reversible approved-only suspension, reason access, unchanged existing orders and owner management.
- `workflow/specs/stories/ADM-03-review-moderation.md`: pending/kept/hidden visibility and transitions, immutable review text/rating, queue and Admin audit display.
- `workflow/specs/stories/ADM-04-moderation-assistant.md`: AI template, existing route/schemas/envelope, advisory output, per-review confirmation, ephemeral suggestions, fallbacks and mapped evaluation cases.
- `workflow/specs/PRODUCT-SPEC.md`: only Admin Roles row, ADM-03 functional row and Moderate reviews use-case row now include Keep. The ADM-03 User stories table row is unchanged.
- `workflow/specs/TECHNICAL-SPEC.md`: Cafés row points application/suspension decisions to ADM-01/ADM-02 and owner resubmission to OWN-01; Reviews row records states and immutability and points transitions/AI relationship to ADM-03/ADM-04; Audit rows cover all seven Admin actions with actor/target/action/reason/time, no automatic deletion and ADM-03 UI ownership; SYS-10.3 now covers all Admin state changes.
- `workflow/specs/INTEGRATION-SPEC.md`: added `409 STATE_CONFLICT` status row and domain state-conflict sentence; duplicate-submission semantics remain with owning stories.
- `workflow/specs/AI-SECURITY-SPEC.md`: confirmation paragraph and SEC-05.2 now include Keep alongside Hide and Restore.
- `workflow/handoffs/spec-admin-stories/01-spec.md`: this report.

### Changed SYS/SEC criteria and existing PLAN owners

Read `workflow/PLAN.md`; it is unchanged.

| Changed criterion | Amendment | Testing owner | Implementation owner |
| --- | --- | --- | --- |
| SYS-10.3 | Separate Admin audit entry with action/reason for every Admin state change | T-15 — Test AI caches, catalogue eligibility, accounting and audit | T-16 — Implement AI caches, catalogue eligibility, accounting and audit |
| SEC-05.2 | Explicit per-review confirmation, current-domain validation, reason, preserved text and separate audit apply to Keep too | T-21 — Test application AI authorization, rendering and human confirmation | T-22 — Integrate application AI authorization, rendering and human confirmation |

No other SYS/SEC criterion text changed. SYS-05.3, SYS-06, SYS-11,
SYS-12.2/SYS-12.10–SYS-12.12 and SEC-01–SEC-04/SEC-05.1/SEC-06/SEC-08–SEC-10
are linked dependencies, not additional amendments. PLAN currently has no Admin
story task pairs; this report does not allocate story criterion ownership or
change task scope/status.

### Cross-role dependencies recorded

All named role story specs below are not yet written; no links to nonexistent
files were added.

| Owning story | Recorded dependency |
| --- | --- |
| OWN-01 | Application details and fields; rejected-application editing/resubmission returns to pending; owner displays latest decision reason; Admin queue reappearance and preserved earlier audit are ADM-01 behavior |
| OWN-02 | Suspended owner retains management access; owner-side suspension banner and latest suspension reason display |
| CUS-01/CUS-02 | Rating formula/customer displays use only pending and kept reviews; pending reviews are visible on eligible café pages, hidden reviews are not; café eligibility remains SYS-05.3 |
| CUS-03 | Refuse new orders for suspended cafés; existing orders remain unchanged |
| CUS-04 | Customer retains existing-order viewing and cancellation under ordinary lifecycle rules |
| OWN-05 | Owner retains accept/reject/ready/collected operations for existing orders while suspended |
| CUS-05 | Review creation/fields and collected-order eligibility; initial pending state, immutable text/rating and no customer edit/delete must be preserved |

## Checks run

Final checks were run by the coordinating session against the completed story
and shared-contract files. All requested checks passed. Exit 1 for a negative
`rg` search means no matches, as required. Duplicate-ID pipelines emitted
nothing. The temporary Bun checker additionally checked every criterion's
Given/when/then format, sequential numbering and own-story prefix, exact source
user-story text, and relative file/heading links using GitHub heading slugs.
It verified 63 story links and all 58 shared-spec links, including every edited
line. No link could not be verified.

The final status matches exactly the six requested entries. Product diff
inspection confirms exactly the three authorized rows changed; the ADM-03
User stories row is unchanged. Only SYS-10.3 and SEC-05.2 changed among shared
criteria. PLAN, templates, skills, agents, docs, application code and tests
are unchanged.

`bun run verify` passed lint, type generation/typecheck, all 8 existing tests,
traceability (3 done tasks), and the production build. The existing Vitest
tsconfig-paths advisory is reproduced below and did not fail verification.
These starter checks do not claim implemented Admin behavior, security
acceptance or deployment. No live LLM or hosted-database check was performed.

### Acceptance output: working tree

```text
$ git status --short
 M workflow/specs/AI-SECURITY-SPEC.md
 M workflow/specs/INTEGRATION-SPEC.md
 M workflow/specs/PRODUCT-SPEC.md
 M workflow/specs/TECHNICAL-SPEC.md
?? workflow/handoffs/spec-admin-stories/
?? workflow/specs/stories/
[exit 0]
```

### Acceptance output: files, metadata, IDs, conflicts and links

```text
$ ls workflow/specs/stories/
ADM-01-cafe-applications.md
ADM-02-cafe-suspension.md
ADM-03-review-moderation.md
ADM-04-moderation-assistant.md
[exit 0]

$ rg -n "Last updated" workflow/specs/stories/
[exit 1]

$ rg -n "\[(Story ID|Title|role|links|YYYY-MM-DD|priority|screen|actor|conditions|threat|input|case ID)\]" workflow/specs/stories/
[exit 1]

$ rg -c '^### `ADM-01`' workflow/specs/stories/ADM-01-cafe-applications.md
1
[exit 0]

$ rg -o '^- \*\*`ADM-0[1-4]\.[0-9]+`' workflow/specs/stories/ADM-01-cafe-applications.md | sort | uniq -d
[exit 0]

$ rg -c '^### `ADM-02`' workflow/specs/stories/ADM-02-cafe-suspension.md
1
[exit 0]

$ rg -o '^- \*\*`ADM-0[1-4]\.[0-9]+`' workflow/specs/stories/ADM-02-cafe-suspension.md | sort | uniq -d
[exit 0]

$ rg -c '^### `ADM-03`' workflow/specs/stories/ADM-03-review-moderation.md
1
[exit 0]

$ rg -o '^- \*\*`ADM-0[1-4]\.[0-9]+`' workflow/specs/stories/ADM-03-review-moderation.md | sort | uniq -d
[exit 0]

$ rg -c '^### `ADM-04`' workflow/specs/stories/ADM-04-moderation-assistant.md
1
[exit 0]

$ rg -o '^- \*\*`ADM-0[1-4]\.[0-9]+`' workflow/specs/stories/ADM-04-moderation-assistant.md | sort | uniq -d
[exit 0]

$ rg -n "STATE_CONFLICT" workflow/specs/INTEGRATION-SPEC.md
84:| 409 | `STATE_CONFLICT` | The target record is in scope but not in the state the operation requires; nothing changes. |
96:Domain operations use `409 STATE_CONFLICT` for state conflicts;
[exit 0]

$ rg -n "Domain mutation conflict" workflow/specs/INTEGRATION-SPEC.md
[exit 1]

$ rg -n "hide/restore" workflow/specs/
workflow/specs/AI-SECURITY-SPEC.md:53:| Moderation Assistant — Admin | At most 20 pending review references and review text per call; review text is the object being classified. | Reviewer identity/contact details, credentials, full order data, unrelated profiles and audit history. | One allowed label and plain-text reason per submitted review: `ok`, `spam`, `abusive`, `off-topic` or `injection attempt`. No automatic hide/restore. Fallback: manual queue. |
workflow/specs/INTEGRATION-SPEC.md:34:| Reviews and moderation | CUS-05, ADM-03–ADM-04 | Rating/text constraints, pending membership/order, concurrent review changes and hide/restore audit transaction. |
[exit 0]

$ bun /private/tmp/check-admin-specs.ts
ADM-01-cafe-applications.md: 13 sequential unique criteria; one requirement; source story exact
ADM-02-cafe-suspension.md: 13 sequential unique criteria; one requirement; source story exact
ADM-03-review-moderation.md: 18 sequential unique criteria; one requirement; source story exact
ADM-04-moderation-assistant.md: 18 sequential unique criteria; one requirement; source story exact
Relative links verified: 63
PASS: exact file scope, criterion format/identity, source stories and relative heading links
Shared-spec relative links verified (including every edited line): 58
[exit 0]
```

The two remaining `hide/restore` matches are the AI-security
feature-data-boundary row (line 53) and Integration Contract dependencies row
(line 34). Both are outside the specifically authorized shared edits. Their
limited wording does not exclude Keep, which is explicit in SEC-05.2 and the
new stories. They were preserved to respect the requested scope.

### Acceptance output: Product diff

```diff
$ git diff -- workflow/specs/PRODUCT-SPEC.md
diff --git a/workflow/specs/PRODUCT-SPEC.md b/workflow/specs/PRODUCT-SPEC.md
index 6c77b17..41a8f46 100644
--- a/workflow/specs/PRODUCT-SPEC.md
+++ b/workflow/specs/PRODUCT-SPEC.md
@@ -20,7 +20,7 @@ Moderation Assistant for admins.
 | --- | --- |
 | Customer | Chooses Customer at sign-up. Sees only approved, non-suspended cafés and manages only their own orders and reviews. |
 | Café owner | Chooses Café owner at sign-up. Manages only their own café, menu and orders. Their café is visible to customers only after admin approval and while not suspended. |
-| Admin | The main Admin is seeded by the maintenance job; each demo kit has its own kit-scoped Admin. Sign-up never creates an Admin. Approves or rejects café applications, suspends and un-suspends cafés, and hides or restores reviews with a reason. |
+| Admin | The main Admin is seeded by the maintenance job; each demo kit has its own kit-scoped Admin. Sign-up never creates an Admin. Approves or rejects café applications, suspends and un-suspends cafés, and keeps, hides or restores reviews with a reason. |
 
 There is one main workspace and one isolated workspace per demo kit. Normal
 sign-ups join the main workspace. Every role, including Admin, reads and writes
@@ -69,7 +69,7 @@ below; this document does not supply missing behavioral decisions.
 | OWN-06 | Provide a sales dashboard with daily totals, top items and sales by day of week. |
 | OWN-07 | Show Prep Advisor as a dashboard panel. It suggests which items to prepare more or less of by day of week, using aggregated sales only. Every suggestion quotes its supporting numbers. Nothing is applied automatically. Its non-AI fallback is the top-items table. |
 | ADM-01–ADM-02 | Let admins approve or reject café applications with a reason and suspend and un-suspend cafés. An un-suspended approved café becomes visible to customers again; unapproved cafés remain hidden. |
-| ADM-03 | Provide a moderation queue to hide or restore reviews with a reason, never to edit review text. Record every hide or restore action in an audit log. |
+| ADM-03 | Provide a moderation queue to keep, hide or restore reviews with a reason, never to edit review text. Record every keep, hide or restore action in an audit log. |
 | ADM-04 | A "Triage pending reviews" button runs Moderation Assistant on pending reviews in batches. It classifies each review as ok, spam, abusive, off-topic or injection attempt, with a reason. The admin confirms every action. Its non-AI fallback is the manual queue. |
 | CUS-07, OWN-08, ADM-05–ADM-06 | Stretch only: save favourite cafés; request a boost with a time-limited Featured badge and a fee that is only recorded; switch AI features on or off at runtime from the Admin page; approve or reject boost requests. |
 
@@ -119,7 +119,7 @@ unverifiable per-key limits are recorded in
 | Fulfil pre-orders | A café owner uses the order queue. | Support accept, reject, mark ready and mark collected for their own café's orders. | OWN-05 |
 | Understand sales and preparation | A café owner opens the dashboard. | Show daily totals, top items and sales by day of week. Prep Advisor uses only aggregated sales and quotes numbers; no suggestion is applied automatically. The fallback is the top-items table. | OWN-06–OWN-07 |
 | Manage café eligibility | An admin reviews applications, suspends a café or un-suspends a café. | Approve or reject applications with a reason; suspended cafés are not visible to customers. An un-suspended approved café becomes visible to customers again; an unapproved café remains hidden. | ADM-01–ADM-02 |
-| Moderate reviews | An admin reviews the queue or requests AI triage. | Classify pending reviews with reasons or use the manual queue; the admin confirms each action. Hide or restore with a reason, retain review text, and record moderation actions in the audit log. | ADM-03–ADM-04 |
+| Moderate reviews | An admin reviews the queue or requests AI triage. | Classify pending reviews with reasons or use the manual queue; the admin confirms each action. Keep, hide or restore with a reason, retain review text, and record moderation actions in the audit log. | ADM-03–ADM-04 |
 | Use optional features | A customer saves a favourite, a café owner requests a boost, or an admin manages boosts or runtime AI settings. | Provide only the stretch capabilities listed in the User stories section; a boost fee is recorded without adding a payment system. | CUS-07, OWN-08, ADM-05–ADM-06 |
 
 ## MVP and stretch scope
```

### Acceptance output: repository verification

```text
$ bun run verify
$ bun run lint && bun run typecheck && bun run test && bun run check:traceability && bun run build
$ eslint
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
$ vitest run --passWithNoTests
The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.

 RUN  v5.0.5 /Users/shawnnygoh/github-repos/homebrew


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  17:43:10
   Duration  253ms (tests 90%, import 5%, transform 2%, worker 2%)

$ bun workflow/scripts/check-traceability.ts
Traceability passed (3 done tasks; all listed criteria have test titles).
$ next build
▲ Next.js 16.4.2 (Turbopack)
✓ Running next.config.ts took 17ms
- Cache Components enabled
- Partial Prefetching enabled

  Creating an optimized production build ...
✓ Compiled successfully in 424ms
  Running TypeScript ...
  Finished TypeScript in 1048ms ...
  Collecting page data using 5 workers ...
  Generating static pages using 5 workers (0/4) ...
  Generating static pages using 5 workers (1/4) ...
  Generating static pages using 5 workers (2/4) ...
  Generating static pages using 5 workers (3/4) ...
✓ Generating static pages using 5 workers (4/4) in 339ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
└ ○ /_not-found


○  (Static)  prerendered as static content

[exit 0]
```

## Open issues for the next step

No product/spec decision is outstanding. No `[ASSUMPTION ASM-nn]` was added.
All requested checks were performed and passed, with the two preserved
`hide/restore` occurrences explained below. No check or relative link remains
unverified. Missing cross-role story files are dependencies recorded above,
not decisions reopened by these Admin drafts.

## Suspicious content found

None.

## Human corrections

The user explicitly replaced template/skill Last updated metadata, authorized
the named shared-contract amendments and retained the combined ADM-03 queue
and audit story. Those instructions were followed without editing templates,
skills or agents. The decisions supplied in the request were written as
requirements rather than assumptions.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No separate reviewer report |

## Notes for reflection

- **What worked:** Shared contract ownership allowed four stories to reference existing transport, security and workspace behavior without adding routes or shared IDs.
- **What needed guidance:** The user supplied all product decisions and explicit template/shared-edit exceptions; no clarification was needed.
- **What to change in the agent or skill:** The pending workflow change should remove Last updated metadata to match committed spec conventions; this task left workflow instructions unchanged.
