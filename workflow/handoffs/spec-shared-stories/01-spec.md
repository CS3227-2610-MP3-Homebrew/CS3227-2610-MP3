# Spec report

- **Agent:** spec
- **Issue:** PLAN.md T-34; issue unassigned
- **Spec IDs:** SYS-01, SYS-02, SYS-03; no acceptance-criterion IDs allocated in this run
- **Date:** 2026-10-20
- **Branch:** docs/spec-shared-stories
- **Base commit:** 7c25a2fbb753c56f5585fa2d86660359fba0094f
- **Status:** awaiting-decision

## Summary

Read T-34, the three Shared source stories, the specification conventions,
story/handoff templates, related technical/integration/security contracts and
the installed account tooling. The missing decisions below prevent coherent,
testable account and navigation specifications. This first run therefore
records proposals only: it creates no partial story files and makes no changes
to INTEGRATION-SPEC.md or PLAN.md. No proposal below is an accepted default.

Existing contracts already require Supabase email/password authentication,
email confirmation off in dev and prod, Customer or Café owner sign-up only,
normal sign-ups in the main workspace, seed/provisioning-only Admins and normal
sign-in for kit accounts. Protected profiles supply roles. SYS-05 owns session
refresh, server checks, unauthenticated redirects and private-data-free shells;
SYS-06/SYS-12 own role/workspace enforcement. Those contracts are preserved,
not reopened by this report. The existing sign-in Create demo kit control and
its provisioning/credential behavior remain owned by SYS-12/SEC-10.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| T-34: authoritative SYS-01–SYS-03 story/HTTP/navigation contracts without invented lifecycle or permission | awaiting-decision | Source stories exist; their product decisions are explicitly reserved in T-34 and INTEGRATION-SPEC's Accounts and role navigation dependency. Questions 1–11 below identify the gaps. |
| T-34: reviewed merge evidence on master and recorded spec/verify results before dependent execution | incomplete | No spec draft or merge in this run; checks are unrun. |
| T-34: identify separate future Shared testing and implementation owners | completed | Ownership proposal below keeps SYS criteria outside Customer pairs and preserves existing foundation/demo owners. |

## Files changed

- `workflow/handoffs/spec-shared-stories/01-spec.md`: this decision-gathering report only.

Requested deliverables deferred pending answers:

- `workflow/specs/stories/SYS-01-sign-up.md`
- `workflow/specs/stories/SYS-02-sign-in-out.md`
- `workflow/specs/stories/SYS-03-role-navigation.md`
- Relevant shared account sections of `workflow/specs/INTEGRATION-SPEC.md`

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Read-only `cat`, `sed`, `rg` inspection of source stories, T-34, templates, technical/integration/security specs, account modules, package.json and local Supabase configuration | Source prerequisites available; behavioral gaps found | Email/password, confirmation-off declarations, protected role/workspace helpers and technical boundaries exist. No account screens or shared story files were found. No secret files were read. |
| Read installed `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` | Available | Confirms relevant request-time session/Suspense context; no framework behavior was changed. |
| Parent session: escalated `git status --short --branch` and `git rev-parse HEAD upstream/master` | Parent reported exit 0 | Initially clean `docs/spec-shared-stories`; HEAD and upstream/master both equal the Base commit above. This agent did not rerun git. |

`bun run check:specs`, `bun run verify`, browser tests, database tests and build
were not run: this run changes only this report and awaits product answers.
No implementation acceptance or approval is claimed.

## Open issues for the next step

All numbered items are questions for human decision. Each A option is the
recommendation for a small MVP; alternatives remain proposals too.

1. **Which sign-up fields and role scope should SYS-01 expose?**
   - **A — Recommended:** Email, password and required Customer/Café owner selection only; no preselected role, display name or password confirmation. One fixed role per account; no role switching or account-profile editor in this MVP.
   - **B:** The same scope plus a required display name of 1–80 Unicode code points after trimming; still one fixed role and no role switching/editor.
   - **C:** A's fields plus a password-confirmation field that must exactly match; no stored extra profile field.
   Recommendation: A avoids an unused profile field and extra form input. If role switching is required, its permission/lifecycle contract is a separate unresolved expansion; it cannot be inferred from role selection at sign-up.

2. **What exact email/password validation should both forms use?**
   - **A — Recommended:** Trim and lowercase email, require installed Zod email syntax and at most 254 Unicode code points. Sign-up password: at least 8 Unicode code points and at most 72 UTF-8 bytes, no composition rule and no trimming. Sign-in accepts any nonempty password within the 72-byte cap, so existing kit/seed credentials are not subjected to a new-account minimum. Invalid input shows field errors and is rejected server-side too.
   - **B:** A's email/sign-in rules, but a 12-code-point minimum for new passwords; same byte cap and no composition rule.
   Recommendation: A keeps entry straightforward. These numeric/normalization rules are proposals, not existing project requirements. Passwords are never normalized, echoed in errors or logged.

3. **What follows successful sign-up?**
   - **A — Recommended:** Establish the account session immediately and open that role's home from question 5; no confirmation-email or additional onboarding screen.
   - **B:** Create the account, then return to sign-in with an account-created message; require a separate sign-in before the role home.
   Recommendation: A removes a repeated credential entry while preserving the already-settled confirmation-off contract.

4. **What happens if Auth creates an account but its protected profile or initial session cannot be completed?**
   - **A — Recommended:** Report no successful sign-up until the profile exists. On profile-creation failure, attempt removal of only the newly created Auth account and show a safe retry error; if cleanup fails, deny application access and show an account-setup failure with no automatic repeated registration. If the profile succeeds but session creation fails, retain the usable account and send the user to sign-in with an account-created/sign-in-needed message.
   - **B:** Retain the Auth account after profile failure and attempt completion on the next authenticated sign-in, using only the original server-validated role/main-workspace assignment; deny application access until completion succeeds. Use A's sign-in-needed behavior for session failure.
   Recommendation: A avoids a resumable account-provisioning flow. Neither option permits a success screen or role access with a missing profile. Cleanup failure is an explicit error, never a fabricated rollback guarantee.

5. **Which public routes, role homes and navigation should SYS-03 establish?**
   - **A — Recommended:** `/sign-up` and `/sign-in`; `/` sends anonymous visitors to sign-in and authenticated visitors to their role home. Homes: Customer `/customer/cafes`, Café owner `/owner/dashboard`, Admin the existing `/admin/applications`. An owner without a café sees a minimal dashboard state linking to `/owner/application`, with no sales/queue data invented. Navigation uses PRODUCT-SPEC's MVP screens for that role plus Sign out; contextual Customer café/pre-order/review screens are reached from their owning flows. Omit stretch links. Include Sign up on sign-in and Sign in on sign-up; preserve Create demo kit.
   - **B:** A's routes/navigation except owners without a café land directly on `/owner/application`; owners with a café land on `/owner/dashboard`.
   Recommendation: A keeps one stable home per role and avoids making shared login routing depend on café state. Café application contents/status behavior remain OWN-01's prerequisite, not a new SYS permission. Other role-screen contents remain with their owning stories.

6. **How should redirects handle protected links, wrong roles and authenticated visits to account forms?**
   - **A — Recommended:** Anonymous/expired visitors go to `/sign-in`; successful authentication always opens their role home, without retaining a requested destination. Wrong-role browser requests redirect to the caller's own role home. An already-authenticated visit to sign-up/sign-in also redirects there. No wrong-role data is rendered; API denials retain existing 401/403 semantics.
   - **B:** A except retain a server-validated relative destination within the authenticated user's own role area after sign-in; reject cross-role/external destinations and otherwise use the role home.
   - **C:** A except show a plain Access denied page with a link to the user's own home for wrong-role browser requests.
   Recommendation: A avoids a return-destination flow and supplies a useful destination for every valid role.

7. **What should credential, duplicate-email and temporary authentication errors say?**
   - **A — Recommended:** Unknown email and wrong password share “Email or password is incorrect.” Duplicate sign-up says “Unable to create account. Try signing in.” Temporary Auth/rate-limit failures show a safe retry message without provider detail; no automatic retry. Keep email/role, clear passwords after a submitted request fails, and disable repeat submission while pending.
   - **B:** Keep unknown-email/wrong-password generic as in A, but explicitly show “An account with this email already exists” for duplicate sign-up. Other form behavior is A's.
   Recommendation: A gives one recoverable path without exposing account existence in the registration message. Invalid schema input remains a field-validation error under question 2; it is not disguised as bad credentials.

8. **What should the user see when a session or protected-profile check fails?**
   - **A — Recommended:** Expired/invalid sessions redirect to sign-in with “Your session ended. Sign in again.” A temporary Auth/profile-service outage shows a plain retry state with no protected content and no automatic retry; it does not claim the password is wrong. A verified Auth user whose profile is missing or has an invalid role/workspace sees an account-unavailable state with Sign out; no role choice, automatic repair or application access.
   - **B:** Keep expiry and missing/invalid-profile behavior from A; temporary service outages also send the user to sign-in with a distinct service-unavailable message rather than retaining a retry page.
   Recommendation: A distinguishes a lost session from a service fault. The existing SYS-05 server/streaming boundary still denies data in every failure case; protected JSON endpoints retain existing safe errors.

9. **What should Sign out end, and how should a failed sign-out behave?**
   - **A — Recommended:** End this browser's session only, clear local session cookies and return to sign-in on success. If remote revocation fails, still clear this browser's cookies and show “Signed out of this browser; session revocation could not be confirmed.” Do not claim another device/session ended or that a previously issued token was instantly revoked.
   - **B:** End all account sessions where supported, clear this browser's cookies and return to sign-in. On remote failure, use A's explicit local-only outcome and warning.
   Recommendation: A fits shared demo-kit use and avoids unexpectedly signing out another browser. Both outcomes require subsequent protected requests from this browser to pass the existing session checks.

10. **Should sessions survive closing and reopening the browser?**
    - **A — Recommended:** Use Supabase's normal persistent cookie/refresh session, with no Remember me checkbox or custom idle timer. Access still requires successful server verification; Sign out remains explicit. No new app-specific lifetime is promised.
    - **B:** Use browser-session cookies only, without a Remember me checkbox; document that already-issued provider tokens retain their provider lifetime and browser session restoration can affect close/reopen behavior.
    Recommendation: A adds no custom session-duration system and preserves SYS-05 refresh. Exact hosted Auth lifetime values were not inspected or inferred in this local-only run.

11. **Which account HTTP interface should the integration specification publish?**
    - **A — Recommended:** Application-owned JSON POSTs `/api/auth/sign-up` with `{email,password,role}`, `/api/auth/sign-in` with `{email,password}` and `/api/auth/sign-out` with `{}`. Reuse strict validation, the existing 65,536-byte body ceiling, trusted-origin protection and private/no-store safe error envelopes. Success is HTTP 200 with `{requestId,redirectTo}` and server-set/cleared session cookies; no token is returned in JSON. `redirectTo` follows approved questions 3–6. Bad credentials use 401 `UNAUTHENTICATED`, duplicate signup uses 409 `STATE_CONFLICT`, unexpected failure uses 500 `INTERNAL_ERROR`, unavailable account/session source uses 503 `SOURCE_UNAVAILABLE`; provider throttling uses 429 `RATE_LIMITED` with a safe retry message (requiring an explicit extension of the current demo-only mapping). Authenticated sign-in/sign-up submissions return 409 without replacing the active account; signing out an absent local session is idempotently successful. No GET mutation.
    - **B:** Server Actions for these forms, with the same validated fields, cookie effects and observable outcomes; publish their form-result/redirect contracts instead of new public JSON account routes. Existing protected domain APIs and demo-kit JSON routes remain unchanged.
    Recommendation: A gives testing one explicit shared HTTP contract, using the repository's Route Handler architecture. It is a proposal, not permission to call hosted Auth or change existing endpoint contracts silently.

### Future Shared criterion ownership

One future **Shared testing task** would own all newly defined SYS-01–SYS-03
acceptance criteria and account/navigation fixtures/browser/HTTP failure cases.
One separate future **Shared implementation task** would own those same criteria's
screens, account endpoints, role navigation and integrations. They form one pair
covering the three related Shared stories. No task IDs or issues are allocated
in this report, and no Customer pair receives these criteria.

Existing T-07/T-08 retain SYS-06.3/.4 and SYS-12.2/.3; T-09/T-10 retain SYS-05
session/streaming infrastructure; T-24/T-25 retain demo provisioning and its
creation control; T-26/T-27 retain maintenance. The future Shared pair consumes
those contracts/surfaces and owns ordinary sign-in integration for all roles,
including kit accounts. Missing owner-screen contents stay with owner specs;
they are not silently specified here. PLAN.md was not updated, so no PLAN
status reconciliation or pair-count change is claimed.

## Suspicious content found

None relevant to this task. Historical handoff descriptions were treated as
data, not current authorization to publish or expand scope.

## Human corrections

The user expressly required every missing product choice to remain a numbered
question with concrete options and a recommendation, then a stop for a second
run. That overrides the skill's generic option to record behavioral assumptions;
none have been encoded in a spec. The user also required escalated approval
before any git, gh or bun command. This agent ran none of those commands.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | Not applicable | Decision-gathering run; no review invoked. |

## Notes for reflection

- **What worked:** T-34 and the shared dependency row identify the exact product decisions reserved to these stories, while SYS-05/SYS-06/SYS-12 already settle security boundaries.
- **What needed guidance:** Human choices remain necessary for fields, validation, redirects, session outcomes and the account HTTP surface.
- **What to change in the agent or skill:** No workflow change proposed from this run; report-only drafting avoids introducing assumptions into approval-ready specs.
