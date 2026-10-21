# Docs report

- **Agent:** docs
- **Issue:** #100 (T-51), paired with #99 (T-50)
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8
- **Date:** 2026-10-21
- **Branch:** feat/99-shared-sign-up-sessions-navigation
- **Base commit:** 861b6a819d9cdd93b6ac69faa85ff84861936b3c
- **Status:** completed

## Summary

Updated the User Guide, Developer Guide and README product summary from current
code and the pair's handoffs. The latest independent `07-reviewer.md` is
completed/Overall pass after approved clarification `af34cb4`, merged into master
at `861b6a8` and branch HEAD `6c47ff6`. All 28 in-scope criteria are accepted by
that review; Create demo kit presence is SYS-12.4/T-24/T-25's responsibility.

Removed stale starter-screen/account-unavailable claims in place. Documented
account forms, validation, safe messages, session behavior, fixed role navigation
and minimal owner entry. The guides distinguish working account/navigation flows
from heading-only role domain pages. No domain tool, demo-control or AI screen
availability is claimed. Developer documentation includes provisioning, Origin
configuration, retry/delay handling, verification and recorded security limits.
No code, tests, specs, PLAN, other reports or reflections were changed.

## Acceptance criteria

Each row maps a new or changed User Guide statement to current implementation.
Line references below are repository-relative source locations. Browser tests
were inspected through the reviewed assertions/results; this docs run did not
execute browsers or claim new runtime observations.

| User Guide claim/location | Status | Code/test evidence |
| --- | --- | --- |
| §1 account flows and role navigation are available | completed | `src/app/_components/account-form.tsx:12`, `src/app/_components/sign-out.tsx:6`, `src/app/_components/account-boundary.tsx:38`; `07-reviewer.md` accepts all criteria. |
| §1 role pages are headings without domain tools | completed | `src/app/customer/cafes/page.tsx:1`, `src/app/customer/orders/page.tsx:1`, `src/app/admin/moderation/page.tsx:1`, owner entry pages; `02-implementation.md` and `07-reviewer.md` scope limits. |
| §1.1 root resolves anonymous Sign in versus verified home | completed | `src/app/page.tsx:1`, `src/app/_components/account-boundary.tsx:15` and `:19`. |
| §1.2 Sign in → Sign up and `/sign-up` entry | completed | `src/app/_components/account-form.tsx:51`, `src/app/sign-up/page.tsx`. |
| §1.2 Email/Password inputs and Customer/owner selection; no default or Admin | completed | `src/app/_components/account-form.tsx:14`, `:43`–`:45`. |
| §1.2 Sign up submission disables form and shows Please wait… | completed | `src/app/_components/account-form.tsx:21`, `:29`, `:42`, `:46`–`:47`. |
| §1.2 successful registration signs in and reaches Customer/owner home | completed | `src/server/auth/accounts.ts:76`–`:106`, `src/lib/accounts/fields.ts:8`; real signup cases in `tests/e2e/accounts/http.spec.ts`. |
| §1.2 email trim/lowercase, validity and 254-character maximum | completed | `src/lib/accounts/fields.ts:3`–`:4`. |
| §1.2 new password eight-code-point minimum, 72-byte maximum, no password normalization | completed | `src/lib/accounts/fields.ts:5`–`:7`; boundary cases in `tests/integration/accounts/accounts.test.ts`. |
| §1.2 exact local email/password/role errors | completed | `src/app/_components/account-form.tsx:43`–`:45`. |
| §1.2 submitted failure retains email/role and clears password | completed | `src/app/_components/account-form.tsx:35`–`:37`; form failure/pending cases in `tests/e2e/accounts/forms.spec.ts`. |
| §1.2 completed account/session failure notice and sign-in recovery | completed | `src/server/auth/accounts.ts:101`–`:105`, `src/lib/accounts/fields.ts:10`, `src/app/_components/account-boundary.tsx:34`. |
| §1.3 Sign in route and Sign out in every role navigation | completed | `src/app/sign-in/page.tsx`, `src/app/_components/account-boundary.tsx:48`. |
| §1.3 credentials have no role/workspace selector | completed | `src/app/_components/account-form.tsx:43`–`:45`, `src/lib/accounts/fields.ts:6`. |
| §1.3 existing main/kit roles use same form and fixed profile home | completed | `src/server/auth/accounts.ts:109`–`:120`, `src/server/auth/account-adapter.ts:78`–`:85`; six role matrices in `tests/e2e/navigation/roles.spec.ts`. |
| §1.3 this-browser sign-out returns to Sign in; separate browser remains | completed | `src/server/auth/accounts.ts:66`–`:70`, `src/server/auth/account-adapter.ts:93`–`:95`, `src/app/_components/sign-out.tsx:13`–`:15`; separate-browser case in `tests/e2e/navigation/roles.spec.ts`. |
| §1.3 exact generic bad-credential message | completed | `src/server/auth/accounts.ts:32`, form safe-message allowlist at `src/app/_components/account-form.tsx:10`. |
| §1.3 local sign-in password error and pending/failure retention | completed | `src/app/_components/account-form.tsx:37`, `:42`, `:44`, `:47`. |
| §1.3 persistent session/refresh; no Remember me or custom timer | completed | SSR cookie adapter at `src/server/auth/account-adapter.ts:40`–`:47`, refresh at `src/proxy.ts`; persistent-context/refresh cases in `tests/e2e/navigation/roles.spec.ts`. No custom timer/Remember me control exists. |
| §1.3 exact ended-session notice | completed | `src/lib/accounts/fields.ts:11`, `src/app/_components/account-boundary.tsx:17`, `:34`. |
| §1.3 exact unconfirmed-revocation notice | completed | `src/lib/accounts/fields.ts:12`, `src/server/auth/accounts.ts:70`; controlled remote failure case in `tests/integration/accounts/accounts.test.ts`. |
| §1.3 network failure does not confirm sign-out; exact generic message | completed | `src/app/_components/sign-out.tsx:15`–`:17`, `src/lib/accounts/fields.ts:17`. |
| §1.4 Customer home and Browse cafés/My orders/Sign out | completed | `src/lib/accounts/fields.ts:8`, `src/app/_components/account-boundary.tsx:39`, `:48`. |
| §1.4 owner home and five navigation entries/Sign out | completed | `src/lib/accounts/fields.ts:8`, `src/app/_components/account-boundary.tsx:40`, `:48`. |
| §1.4 Admin home and four navigation entries/Sign out | completed | `src/lib/accounts/fields.ts:8`, `src/app/_components/account-boundary.tsx:41`, `:48`. |
| §1.4 entries open headings rather than domain tools | completed | Current role `page.tsx` files, including `src/app/customer/cafes/page.tsx:1` and `src/app/admin/moderation/page.tsx:1`. |
| §1.5 existing kit sign-in, absent demo control/display and no published credentials | completed | Six real local main/kit role cases in `tests/e2e/navigation/roles.spec.ts`; complete account form at `src/app/_components/account-form.tsx:39`–`:52`; guide contains no credential value. SYS-12.4 is outside this pair. |
| §2 root/account forms and wrong-role visits return own home | completed | `src/app/_components/account-boundary.tsx:23`, `:30`, `:47`. |
| §2 supplied return URLs ignored; no role/workspace switcher | completed | Fixed constants at `src/lib/accounts/fields.ts:8`, navigation at `src/app/_components/account-boundary.tsx:38`–`:48`; return-destination browser cases. |
| §2 exact public loading text and verified-only navigation | completed | `src/app/_components/account-boundary.tsx:11`, `:43`–`:50`. |
| §3 exact account-unavailable text, Sign out and no repair/role choice | completed | `src/lib/accounts/fields.ts:15`, `src/app/_components/account-boundary.tsx:12`–`:16`; missing-profile browser case. |
| §3 exact temporary-service text, explicit reload/resubmit and no automatic resubmission | completed | `src/lib/accounts/fields.ts:16`, `src/app/_components/account-boundary.tsx:13`, one-submit form at `src/app/_components/account-form.tsx:19`–`:37`. |
| §4.1 Customer navigation and absent catalogue/order/review contents | completed | Customer layout delegates role shell; Customer pages are heading-only, with no contextual domain routes introduced. |
| §5.1 Dashboard/no-café wording/application link steps | completed | `src/app/owner/dashboard/page.tsx:8`–`:21`; main/kit owner browser matrix. |
| §5.1 application entry is a heading without submission; no owner domain tools | completed | `src/app/owner/application/page.tsx:1` and owner menu/orders/profile entry pages. |
| §6.1 existing Admin sign-in/navigation and heading-only pages | completed | Admin main/kit browser matrix, `src/app/_components/account-boundary.tsx:41`, current Admin entry pages. |
| §7 no AI feature screen | completed | Current application route inventory; server LLM modules add no feature route/UI. No availability statement was added for internal LLM operations. |
| §8 existing nonempty password ≤72 bytes without new-account minimum/normalization | completed | `src/lib/accounts/fields.ts:5`–`:7`; existing short/whitespace password cases in `tests/integration/accounts/accounts.test.ts`. |
| §9 absent demo creation/account lifecycle/switching/global sign-out | completed | Complete current account form and route inventory, `scope: "local"` at `src/server/auth/accounts.ts:68`; approved account out-of-scope contract. |
| §10 duplicate-account message and sign-in recovery | completed | `src/server/auth/accounts.ts:33`. |
| §10 setup failure/explicit retry message | completed | `src/server/auth/accounts.ts:88`. |
| §10 failed-cleanup setup message and unresolved access | completed | `src/server/auth/accounts.ts:88`. |
| §10 throttled message/wait guidance | completed | `src/server/auth/accounts.ts:36`; no UI automatic retry. |
| §10 active-account message/sign-out first guidance | completed | `src/server/auth/accounts.ts:73`. |
| §10 invalid-field message/review inputs | completed | `src/server/auth/accounts.ts:39`, field schemas at `src/lib/accounts/fields.ts:3`–`:7`. |
| §10 generic request failure/check connection and explicit retry | completed | `src/lib/accounts/fields.ts:17`, `src/app/_components/account-form.tsx:36`, `src/app/_components/sign-out.tsx:16`–`:17`. |

Developer statements were checked against `account-adapter.ts:12`–`:18`
(APP_ORIGIN/VERCEL_URL/local fallback), `accounts.ts:41`–`:63` (transport and
bounds), `account-adapter.ts:35`–`:100` (staged cookies/provisioning/local signout),
`account-access.ts:15`–`:29` (typed access and retry-disabled queries),
`account-transport.ts:4`–`:29` (safe delay capture), the migration's function/grants,
and passing review/test evidence. No new workflow file was introduced other than
this handoff; the existing inventory already covers agent handoffs. Internal
reuse/Next.js idea attribution was added without changing the MP2 file totals.

## Files changed

- `docs/UserGuide.md`: replaced starter placeholders with account steps, exact
  feedback, role navigation, minimal owner entry, reference and troubleshooting;
  updated contents and known limitations while retaining numbered sections.
- `docs/DeveloperGuide.md`: setup/Origin configuration, account architecture,
  provisioning/session and transport boundaries, testing evidence, acknowledgement
  and known limits; corrected stale account/starter statements and contents.
- `README.md`: product summary reflects implemented accounts and minimal shells.
- This report.

## Checks run

| Command/inspection | Result | Evidence |
| --- | --- | --- |
| `bun run check:specs` | passed | `Spec check passed (0 warning(s)).` |
| `git diff --check` | passed | No whitespace errors. |
| Source-to-claim and scope inspection | completed | All changed User Guide claims mapped above; writes limited to three permitted guides/product summary and this report. |
| Latest reviewer launcher `bun run verify` | passed, prior evidence only | `07-reviewer.md` records 36 files/942 tests, lint/typecheck, trace/spec, production build and isolation. Not rerun for prose-only edits. |
| Implementation `bun run test:e2e` | passed, prior evidence only | `05-implementation.md` records 42/42 local production-browser cases. Not rerun by docs. |

No app/database/provider command, full verification, browser run or hosted action
was performed by this docs run. No documentation repair cycle was needed.

## Open issues for the next step

No code/spec discrepancy remains for documented Shared behavior. Older handoffs'
demo-control limitation is superseded by approved `af34cb4`/`861b6a8` and the
passing round-3 review; demo creation itself remains outside this pair.

The security assessment predates the retry/delay fixes. It reported no confirmed
findings and records a pre-existing proxy refresh-cookie attribute limitation.
The guide preserves that limit and does not claim security remediation or a new
security audit. Deployment Origin/hosted settings and live provider faults remain
unverified by local tests. Role domain features remain unimplemented shells.

Screenshots for a human to capture from a configured local build, without real
credentials/personal data:

- Sign up with unselected Customer/owner roles and local field feedback.
- Sign in with the fixed account-created/session-ended notice.
- Each role's navigation and entry heading.
- Owner Dashboard no-café message and Café application entry.
- Account-unavailable and temporary-service failure states using controlled
  fixtures, if screenshots of these states are needed.

No screenshots were fabricated or added.

## Suspicious content found

None.

## Human corrections

The human removed the Create demo kit presence test at gate 2, assigning its
evidence to T-24/T-25. The approved master clarification subsequently moved that
control out of SYS-02.1 acceptance and into SYS-12.4. Documentation reflects the
current approved scope and absent control without claiming demo provisioning.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| `03-reviewer.md`, `06-reviewer.md`, `07-reviewer.md` | R1/R2/R3 disposition | Documented | Current retry/delay code and approved demo-control ownership match the passing latest assessment; no code or test changes by docs. |

## Notes for reflection

- **What worked:** Exact UI literals and passing account/transport assertions supported claim-level evidence; the merged scope clarification avoided documenting an unavailable demo control.
- **What needed guidance:** No further human/spec decision. The assignment preserved existing security evidence limits.
- **What to change in the agent or skill:** None established.
