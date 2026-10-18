# Spec report

- **Agent:** spec
- **Issue:** none (spec task T-23)
- **Spec IDs:** SYS-06.3, SYS-06.4; SYS-12.1–SYS-12.12; SYS-13.1–SYS-13.8; SEC-09.2; SEC-10.1–SEC-10.5
- **Date:** 2026-10-18
- **Branch:** docs/demo-access-spec
- **Base commit:** 1b092f97b5df7fdfc4f455c97b5077a0dd987996
- **Status:** awaiting-decision

## Summary

Drafted the settled production demo-access, workspace-isolation and daily
maintenance contracts in the four cross-cutting specs, and mapped their
criteria to the single product plan. No story IDs or assumption markers were
added. T-23 is `done` for this specification draft, as requested; this does not
claim human approval or merge. The plan now contains **12 foundation
testing/implementation pairs**, plus three spec tasks.

K6 leaves an unresolved main-Admin email-collision case. The draft retains its
exact create-only/no-update constraints and makes no choice for that case.
T-26/T-27 are `awaiting-decision`; T-24/T-25 are `blocked` on the named story
contracts. No implementation, test authoring, hosted operation, commit, push,
PR or session log was performed.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Product roles, workspace/demo access, shared sign-in creation control and unattended production peer testing | completed | PRODUCT-SPEC draft; existing story text and IDs preserved. |
| SYS-06.3/06.4; SYS-12.1–SYS-12.12 | completed | Technical draft covers schema, server/RLS/AI/cache isolation, normal sign-up, one-time credentials, atomic creation, caps and seeded content; structural ownership check passes. |
| SYS-13.1 | awaiting-decision | Exactly-one-main-Admin and create-only-by-email rules are preserved; collision behavior remains unspecified. |
| SYS-13.2–SYS-13.8 | completed | Technical draft covers showcase, bearer endpoint, daily/post-deploy triggers, idempotent independent steps, count-only response, missing config and prohibitions. |
| SEC-09.2; SEC-10.1–SEC-10.5 | completed | Security draft includes daily retention timing, safeguards, four threat rows and E-14–E-18. |
| Shared demo/maintenance routes and RATE_LIMITED | completed | Integration draft adds only the two requested routes and the 429 code; existing AI contracts remain byte-for-byte unchanged. |
| Unique PLAN ownership and dependencies | completed | Inline structural check: all 71 SYS/SEC criteria have one testing and one implementation owner; 27 unique tasks, 12 pairs and no dependency cycle. |

Statuses above describe drafting and structural checks, not implementation or
approval of the contracts. Missing owning story specifications still block
seed-state and affected screen/source implementation.

## Files changed

- `workflow/specs/PRODUCT-SPEC.md`: amended Admin provisioning wording;
  described main/kit workspaces, kit-scoped Admin authority, one-time access,
  normal sign-up, showcase and kit testing path; added Create demo kit to shared
  navigation and unattended production peer testing to non-functional scope.
- `workflow/specs/TECHNICAL-SPEC.md`: Workspaces entity and workspace references
  only on Profiles/Cafés; inherited workspace and server/RLS/AI/cache boundaries;
  server-only maintenance credentials and both kit-limit settings; amended
  SYS-06.3/06.4; added SYS-12 and SYS-13.
- `workflow/specs/AI-SECURITY-SPEC.md`: four demo/maintenance threat rows;
  next-daily-run cache cleanup within 48 hours and first-run-after-deadline
  audit/counter cleanup; amended SEC-09.2; added SEC-10 and E-14–E-18.
- `workflow/specs/INTEGRATION-SPEC.md`: POST `/api/demo-kits`, GET
  `/api/internal/maintenance`, one-time/no-store response contracts and 429
  `RATE_LIMITED`/`Retry-After`; maintenance 401 mapping. No other route added.
- `workflow/PLAN.md`: T-23 draft completion; existing schema/isolation ownership;
  T-24/T-25 demo-kit pair; T-26/T-27 maintenance pair; workflow extension remains
  with T-27 after T-18, and retention cleanup remains with T-15/T-16.
- `workflow/handoffs/spec-demo-access/01-spec.md`: this report.

### Criterion ownership

Only testing/implementation tasks allocate criterion ownership; T-23 specifies
the contracts and replaces neither owner.

| New or amended criteria | Testing task | Implementation task |
| --- | --- | --- |
| SYS-12.1 | T-05 | T-06 |
| SYS-06.3, SYS-06.4; SYS-12.2, SYS-12.3 | T-07 | T-08 |
| SEC-09.2 | T-15 | T-16 |
| SYS-12.4, SYS-12.5, SYS-12.6, SYS-12.7, SYS-12.8, SYS-12.9, SYS-12.10, SYS-12.11, SYS-12.12; SEC-10.1, SEC-10.2, SEC-10.3 | T-24 | T-25 |
| SYS-13.1, SYS-13.2, SYS-13.3, SYS-13.4, SYS-13.5, SYS-13.6, SYS-13.7, SYS-13.8; SEC-10.4, SEC-10.5 | T-26 | T-27 |

T-24 depends on T-08/T-10/T-12; T-25 also depends on T-24. T-26 depends on
T-16/T-18/T-25; T-27 also depends on T-26. The maintenance route invokes T-16's
cleanup without acquiring SEC-09.2 ownership. T-27 adds the production cron
entry and extends T-18's workflow with one post-successful-deploy call.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git diff --check` | passed | No whitespace errors. |
| `python3 - <<'PY'` (inline structural/preservation check) | passed | All 71 criteria have exactly one testing and one implementation owner; 27 unique tasks, required fields, implementation-to-test dependencies, 12 pairs and acyclic graph. Existing criteria differ only for SYS-06.3, SYS-06.4 and SEC-09.2. Product story section and existing integration AI-contract suffix are byte-for-byte preserved; AI usage/failure/cache policy is preserved. |
| `bun run check:traceability` | passed | `Traceability passed (3 done tasks; all listed criteria have test titles).` |
| `rg -n "^### (SYS-12\|SYS-13\|SEC-10) " workflow/specs` | passed | Exactly SYS-12/SYS-13 in TECHNICAL-SPEC and SEC-10 in AI-SECURITY-SPEC. |
| `rg -n "\[ASSUMPTION" workflow/specs workflow/PLAN.md` | passed | Only TECHNICAL-SPEC ASM-01. |
| `rg -n -i "last updated\|planned\|unmerged\|human decision\|former ASM"` over the four specs and PLAN | passed | No matches; exit 1 is the expected no-match result. |
| `rg -n "^### T-2[3-7]\|^- \*\*Status:\*\*" workflow/PLAN.md` | passed | T-23 done; T-24/T-25 blocked; T-26/T-27 awaiting-decision. |
| `git status --short` | passed | Only the five authorized modified documents and this untracked handoff directory. |
| `git diff --stat` | inspected | Tracked changes are confined to the four specs and PLAN; the new report is untracked. |

Full `bun run verify` is left to the main session's explicitly assigned
post-handoff checks; no full-verification result is claimed by this report.

## Open issues for the next step

1. **K6 / SYS-13.1 — existing email and exactly-one-main-Admin:** If an account
   with `MAIN_ADMIN_EMAIL` already exists as a Customer, Café owner, or account
   in a kit, maintenance cannot create the main Admin, cannot update that
   account and cannot touch its kit. The inputs do not define the outcome that
   reconciles this with exactly one main-workspace Admin. Configuration changes
   after a main Admin exists also need to preserve that cardinality without
   updating/deleting the existing account. No collision outcome, promotion,
   reassignment, reset, deletion or replacement email is invented. The affected
   acceptance and T-26/T-27 remain awaiting-decision.
2. **Implementation prerequisites:** CUS-03–CUS-05, OWN-01–OWN-05 and
   ADM-01–ADM-03 story specs are absent; T-24/T-25 remain blocked until they are
   on master. Their seed state names/eligibility follow those contracts. The
   normal sign-in control/surface and non-trivial sales/Prep sufficiency also
   depend on the owning SYS-02 and OWN-06/OWN-07 contracts. These are explicit
   dependencies, not inferred product behavior.
3. Human review/merge and the main session's full verification are outstanding.

## Suspicious content found

None.

## Human corrections

The main session confirmed preserving the create-only/no-update main-Admin
contract and reporting its collision case as awaiting-decision. It also retained
ownership of full `bun run verify` after this handoff.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No review round occurred. |

## Notes for reflection

- **What worked:** Explicit criterion allocation allowed all 71 criteria and
  all 12 pairs to be checked without duplicating shared cleanup or workflow
  ownership; protected-section comparisons caught unintended contract changes.
- **What needed guidance:** The main session confirmed the disposition of K6's
  existing-email collision and ownership of full verification.
- **What to change in the agent or skill:** No change identified; the task's
  explicit content-only and no-new-assumptions rules governed this update.
