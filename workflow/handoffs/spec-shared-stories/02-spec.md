# Spec report

- **Agent:** spec
- **Issue:** PLAN.md T-34; issue unassigned
- **Spec IDs:** SYS-01.1–SYS-01.9; SYS-02.1–SYS-02.11; SYS-03.1–SYS-03.8
- **Date:** 2026-10-20
- **Branch:** docs/spec-shared-stories
- **Base commit:** 7c25a2fbb753c56f5585fa2d86660359fba0094f
- **Status:** completed

## Summary

Drafted all three requested Shared stories and their canonical account HTTP
contract using the user's answers to the first report. The drafts define 28
testable criteria covering sign-up fields/validation, initial and partial
creation outcomes, normal and kit sign-in, local sign-out, session/profile
failures, persistent sessions, fixed destinations and role-only MVP navigation.
Admin home is `/admin/moderation`; `/admin/applications` remains an Admin
navigation entry. No behavioral assumptions or unresolved product questions
were introduced.

Draft authoring and the required checks are completed. This status describes
the spec agent's local drafting run, not T-34's reviewed-merge prerequisite,
specification approval or implementation acceptance. The first report is
preserved unchanged. PLAN.md and all code, tests, configuration and other
specifications are unchanged by this agent.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| T-34: all three source IDs have authoritative story/HTTP/navigation drafts without invented lifecycle or permission | completed | Three story files retain exact source story text and High priority, one requirement each, testable criteria, screens/use cases/permissions, scoped exclusions and no assumptions. INTEGRATION-SPEC defines exact shared field, response, error and destination contracts. |
| T-34: reviewed merge evidence on master before dependent testing/implementation, with required checks recorded | incomplete | Both required checks passed as detailed below. Human diff review and spec merge evidence are absent; no implementation acceptance claimed. |
| T-34: separate future Shared testing and implementation owners | completed | One future Shared pair is identified below without allocating task IDs/issues or changing Customer criterion ownership. |

## Files changed

- `workflow/specs/stories/SYS-01-sign-up.md`: new SYS-01 story, 9 criteria; exact form scope, protected-role/main-workspace integration, profile cleanup and initial-session failures.
- `workflow/specs/stories/SYS-02-sign-in-out.md`: new SYS-02 story, 11 criteria; all-role normal/kit sign-in, verification failures, persistent sessions and this-browser sign-out outcomes.
- `workflow/specs/stories/SYS-03-role-navigation.md`: new SYS-03 story, 8 criteria; fixed role homes, own-role-only MVP navigation, no-café owner entry and browser redirect rules.
- `workflow/specs/INTEGRATION-SPEC.md`: account dependency links; account-specific extensions to existing 401/409/429 meanings; shared account fields/routes/errors/cookie effects/destination vocabulary. Existing demo/AI transport behavior is preserved.
- `workflow/handoffs/spec-shared-stories/02-spec.md`: this report. `01-spec.md` is unchanged.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Read-only `cat`/`sed`/`rg` inspection of approved-decision source report, templates, existing contracts and spec checker | Reviewed | Source texts, priorities, ownership boundaries and current JSON envelope/error mappings were checked. No secret files, hosted database or live LLM were accessed. |
| `bun run check:specs` requested with `sandbox_permissions=require_escalated`, without a sandbox attempt or prefix allow rule | No execution result; approval/tool call aborted | Tool returned “aborted by user after 476.1s”; no command output, exit code or process session ID was returned. This is not a passing or failing checker result and does not establish execution began. |
| Parent: escalated `bun run check:specs` | Passed, exit 0 | Three expected warnings only: SYS-01's 9, SYS-02's 11 and SYS-03's 8 criteria have no PLAN task ownership yet. PLAN remains unchanged. |
| Parent: escalated `bun run verify` | Passed, exit 0 | Lint passed; Next type generation and `tsc --noEmit` passed; Vitest passed 15 files / 368 tests (144.08 seconds); traceability passed for 11 done tasks; spec check passed with the same three warnings; source isolation passed; Next 16.4.2 webpack production build passed; artifact isolation passed for 35 client artifacts. |
| Parent: final escalated `git diff --check` and `git status --short --branch` | Passed, exit 0 | Final spec diff has no whitespace errors after the cookie clarification; status shows only the integration modification, three new story files and the handoff directory on the existing branch. |

The passing commands were coordinated and observed by the parent after this
agent's aborted request; their actual final results are reported above rather
than inferred from the aborted tool call. No separate `bun run test:e2e` or
database command was run by this agent. Parent final diff/status observations
were made after the cookie clarification; no commit, push or PR was created.

## Open issues for the next step

No unresolved product decision was identified after the eleven human answers.
Required `bun run check:specs` and `bun run verify` passed. Human diff review
and spec merge remain external workflow prerequisites before dependent
testing/implementation; this local drafting run provides no merge evidence.
The three expected checker warnings reflect the explicitly deferred Shared
test/implementation planning below, not duplicate or allocated criterion owners.

### Criterion ownership and domain dependencies

One future **Shared testing task** owns the 28 SYS-01–SYS-03 criteria and their
spec-derived form/HTTP/browser/session-failure cases. A separate future
**Shared implementation task** owns the corresponding shared screens, account
Route Handlers, navigation and session integration. These form one three-story
Shared pair. This report allocates no task IDs/issues and makes no PLAN edit,
status reconciliation or total pair-count claim. No Customer pair owns these
Shared criteria.

T-07/T-08 retain SYS-06.3/.4 and SYS-12.2/.3 authorization/workspace ownership;
T-09/T-10 retain SYS-05 proxy/streaming/session gates; T-24/T-25 retain demo
provisioning and its creation control; T-26/T-27 retain maintenance provisioning.
The future Shared pair integrates ordinary sign-in for all existing main/kit
roles, without reassigning these foundation/demo criteria. Owner-domain screen
contents remain with the owner stories; shared navigation defines their MVP
entry labels and only the agreed shared home/application paths. Admin and
Customer domain behavior remains in its existing owning stories.

## Suspicious content found

None relevant to this task. The first report's options were treated as historical
proposals; the user's explicit answers supplied the decisions for this run.

## Human corrections

The user answered **1A, 2A, 3A, 4A, 5A with the Admin-home correction, 6A, 7A,
8A, 9A, 10A and 11A**. Those choices replace the first report's unresolved
questions: minimal fixed-role registration; exact email/password validation;
immediate login after complete registration; compensating deletion only of a
new failed-profile Auth identity; fixed homes/navigation; no return-to routing;
generic safe errors; distinct expiry/source/profile failures; this-browser
sign-out with explicit remote uncertainty; normal persistent Supabase sessions;
strict JSON account POST routes under the existing envelope.

The correction changes Admin home from the first proposal's
`/admin/applications` to **`/admin/moderation`**, because moderation ships first.
The drafts preserve the requested combined SYS-02 sign-in/sign-out source
story rather than reopening its approved scope.

A parent review identified a cookie-effect ambiguity on credential-success /
profile-failure. The drafts now explicitly state that persistent sign-in
cookies require successful profile verification; a new failed attempt clears
its provisional cookies. Failed signup-profile creation also clears provisional
cookies regardless of Auth cleanup success. Account-unavailable Sign out still
works through the approved idempotent absent-session endpoint. An already-active
account's 409 never clears or replaces that account. This clarifies the approved
denial/session-success boundary without adding account repair or lifecycle scope.

The user required escalated approval before every git/gh/bun command. The sole
bun request above used escalation; this agent ran no git/gh commands and made
no commit, push or PR. After the aborted approval call the parent took over
check coordination; no duplicate check was started.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | Not applicable | No independent reviewer report invoked. Parent consistency feedback is recorded above as clarification, not reviewer approval. |

## Notes for reflection

- **What worked:** The first report's numbered options made the second draft deterministic while preserving the existing foundation/security owners.
- **What needed guidance:** The user corrected the Admin landing page, and parent review exposed an unstated provisional-cookie effect that is now explicit.
- **What to change in the agent or skill:** Long approval waits need immediate status recovery; an aborted tool approval must never be recorded as a command result.
