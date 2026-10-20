# Shared Account Story Specifications

## Goal
Draft T-34's SYS-01–SYS-03 account/navigation stories and shared integration contracts using explicit product decisions. Record the session under the user-provided GitHub username `shawnnygoh`.

## Scope
Three task exchanges covering one focused specification task, its decision round and this session log.

## Key prompts
- “Use the spec agent for PLAN.md task T-34” requested delegated specification work within the task's Work and File scope.
- “Where a product decision is missing (account fields, validation, redirects, session-failure behaviour), don't pick one.” Required numbered questions with options and recommendations before a second run.
- “Keep it MVP-small: these screens have to be built and tested by Thursday.” Constrained proposals to a small account/navigation experience.

## Decisions and corrections
- The first spec run produced only a handoff with 11 decision questions; drafting paused without inventing defaults. The user selected A for all eleven, with one Admin-home correction.
- Registration uses email, password and required unselected Customer/owner choice; one fixed role, no display name or password confirmation. Main-workspace signup, kit sign-in and provisioned-only Admins remain intact.
- Email is trimmed/lowercased, Zod-validated and capped at 254 Unicode code points. New passwords require eight code points and at most 72 UTF-8 bytes without normalization/composition rules; sign-in requires nonempty passwords within that cap.
- Complete signup establishes a session immediately. Profile failure attempts removal of only the newly created Auth identity; failed cleanup denies access. Completed profiles survive initial-session failure and lead to sign-in.
- Homes are `/customer/cafes`, `/owner/dashboard` and `/admin/moderation`. The user corrected the proposed Admin applications home because ADM-03 moderation ships first. Owners without cafés receive an application link; navigation contains role MVP entries.
- Authentication always returns to the own-role home, without return-to destinations; wrong-role requests and authenticated account-form visits redirect there.
- Generic credential/registration errors preserve email/role and clear passwords after submitted failures. Expiry leads to sign-in; service failures show retry; missing/invalid profiles show account unavailable with Sign out.
- Sign-out ends this browser's session, clears cookies despite remote revocation failure and reports uncertainty. Sessions otherwise use normal persistent Supabase refresh behavior.
- Strict JSON POST account routes use shared envelopes. Parent review clarified clearing provisional cookies after profile/source failures while preserving existing authenticated sessions rejected with 409.
- One escalated checker request was aborted without an execution result. The parent reran checks: `check:specs` and `verify` passed, including 368 tests and production build. Three expected warnings identify unplanned Shared criteria.
- Drafting finished with 28 criteria and no remaining product questions. PLAN stayed unchanged; one future Shared testing/implementation pair retains ownership. Human review/merge remains outstanding; no commit or PR was created.

## Files created or modified
- `workflow/specs/stories/SYS-01-sign-up.md`
- `workflow/specs/stories/SYS-02-sign-in-out.md`
- `workflow/specs/stories/SYS-03-role-navigation.md`
- `workflow/specs/INTEGRATION-SPEC.md`
- `workflow/handoffs/spec-shared-stories/01-spec.md`
- `workflow/handoffs/spec-shared-stories/02-spec.md`
