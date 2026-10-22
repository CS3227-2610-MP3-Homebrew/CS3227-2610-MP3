# Docs report

- **Agent:** docs
- **Issue:** #110 (PLAN.md T-54; pair testing issue #109, T-53)
- **Spec IDs:** OWN-01, OWN-02, OWN-04
- **Date:** 2026-10-22
- **Branch:** feat/109-owner-cafe-setup
- **Base commit:** 5240056 (implementation uncommitted in the working tree)
- **Status:** completed

## Summary

I documented owner café application, status, resubmission and the combined Café
profile, hours and pickup-cutoff settings from the working-tree code. The User
Guide section 5 now has subsections 5.1–5.3. I also corrected stale "owner tools
not available" text in the User Guide, Developer Guide and README. The
Developer Guide gets a new "Owner café application and settings" subsection plus
a Known limitations note. The settled facts are reflected:

- The nav "Café profile" link goes to `/owner/cafe`, and `/owner/profile` redirects there.
- The suspension reason is not shown after un-suspension.

## Acceptance criteria

| User Guide claim | Status | Evidence |
| --- | --- | --- |
| Café application at `/owner/application`; Café profile at `/owner/cafe` | completed | `src/app/_components/account-boundary.tsx:41`; `src/app/owner/profile/page.tsx:4` |
| Field labels: Café name, Description, Area, Public pickup address | completed | `src/app/owner/application/application-form.tsx:54-63`; `src/app/owner/_components/cafe-fields.tsx:72` |
| Name 2–100, description ≤500, address 10–200 after trimming | completed | `src/lib/owner/cafe-input.ts:96-114` |
| Areas Central/North/South/East/West | completed | `src/lib/owner/cafe-input.ts:4` |
| Hours editor labels; ≤14 intervals, ≤2 per weekday, no overlap, empty = closed | completed | `cafe-fields.tsx:39-59`; `cafe-input.ts:74-91` |
| Cutoff label, 0–180, default 15 | completed | `cafe-fields.tsx:64-66`; `application-form.tsx:18`; `cafe-input.ts:23` |
| "Submit application" / "Confirm resubmission" / "Resubmit application" | completed | `application-form.tsx:68,79` |
| Pending status, SGT time, Submitted details, hidden until approved | completed | `src/app/owner/application/page.tsx:8-16,46`; `cafe-summary.tsx:7-9` |
| One pending/approved café; name+address duplicate in workspace rejected | completed | e2e "OWN-01.1: duplicate trimmed case-insensitive name/address pairs conflict…", OWN-01.5 second-café conflict cases (per 02-implementation.md) |
| Example field messages "Café name: must be 2–100…" and "Opening interval 2: intervals must not overlap." | completed | `cafe-fields.tsx:23-29`; `cafe-input.ts:87,98` |
| Connection-drop message | completed | `application-form.tsx:47` |
| Latest Admin decision with reason; visibility; Suspended by an Admin with reason | completed | `application/page.tsx:18-27` |
| Suspension reason not shown after un-suspension | completed | `application/page.tsx:24` (`cafe.suspended` guard); settled decision in 03-reviewer.md |
| Resubmission returns to pending, does not approve | completed | `application-form.tsx:82`; e2e OWN-01.5 resubmission cases |
| No-café text and "Apply for a café" | completed | `src/app/owner/cafe/page.tsx:14-17` |
| Pending/rejected read-only | completed | `cafe/page.tsx:19-24` |
| Approved details fixed | completed | `cafe/page.tsx:29-35` |
| "Profile, hours and pickup rules", "Save changes", "Café settings saved." | completed | `src/app/owner/cafe/settings-form.tsx:57,64,75` |
| Batch save atomic; invalid field marked | completed | e2e OWN-02.2 atomic batch; screens `aria-invalid` case |
| Singapore time regardless of device | completed | screens case under America/Los_Angeles (OWN-02.1) |
| Pickup times up to cutoff; existing orders keep times | completed | e2e OWN-04.2/OWN-04.4, OWN-02.6/OWN-04.6 snapshots |
| Suspended banner text | completed | `cafe/page.tsx:27` |
| Overtaken save opens Café application; draft restored with message | completed | `settings-form.tsx:23-32,45-49`; screens "overtaken save opens /owner/application" |

## Files changed

- `docs/UserGuide.md`: contents list (5.1–5.3), section 1 intro, section 1.4 navigation note, section 5.1 rewritten, new sections 5.2 and 5.3, section 6.4 owner sentence, section 9 limitation.
- `docs/DeveloperGuide.md`: contents entry; new "Owner café application and settings" subsection; cross-reference in "Café applications and suspension" and "Shared accounts and role navigation"; Known limitations updated. The coordinator's `.agents/skills/handoff/SKILL.md` row is untouched.
- `README.md`: product summary sentence and Café owner guide link.
- `workflow/handoffs/109-owner-cafe-setup/05-docs.md`: this report.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | pass | "Spec check passed (0 warning(s))." |

I did not run verify, tests, db:reset or Playwright, as instructed.

## Open issues for the next step

- 02-implementation.md says the nav link still points to `/owner/profile`. That is stale: the code points to `/owner/cafe` (coordinator edit), and the docs follow the code.
- The e2e evidence predates the nav-link change (03-reviewer.md).
- I left out these unconfirmed reviewer hypotheses from the User Guide:
  - Non-ASCII duplicate detection. The Developer Guide notes the locale dependence.
  - The lone-surrogate 500 case.
- Screenshots a human should capture:
  1. The `/owner/application` form when there is no café.
  2. The pending status page.
  3. The rejected page with the decision reason and the resubmission form.
  4. The approved `/owner/cafe` settings form.
  5. A field validation error.
  6. The suspended banner.

## Suspicious content found

None.

## Human corrections

None. I applied the coordinator's settled facts on the nav link and the suspension reason.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | — | — | — |

## Notes for reflection

- **What worked:** The UI strings sat in a few small files, so every claim had a line reference.
- **What needed guidance:** The diff against `upstream/master` includes unrelated upstream changes because the branch is behind. I used the HEAD/working-tree diff instead.
- **What to change in the agent or skill:** Have the docs agent diff against the merge base explicitly when the branch is behind upstream.
