# Reviewer report

- **Agent:** reviewer (Claude)
- **Issue:** #61, T-31; paired testing issue #60, T-30
- **Spec IDs:** ADM-03.1–ADM-03.18; supporting SYS-04.2
- **Date:** 2026-10-21
- **Branch:** feat/60-moderation-queue-admin-audit
- **Base commit:** b19b2e68d6848712b52e33644c739610f7c2e04e
- **Base ref:** upstream/master
- **Reviewed HEAD:** ee22a953b39251ea475bcd1c9fdeecdc95fddfef, including unstaged and untracked working-tree changes
- **Implementation report:** workflow/handoffs/60-moderation-queue-admin-audit/06-implementation.md
- **Review round:** 2
- **Model:** claude-opus-5-5
- **Reasoning:** default
- **Status:** completed
- **Report destination:** workflow/handoffs/60-moderation-queue-admin-audit/07-reviewer.md

## Summary

The Codex `review.sh` worker for round 2 stopped at its usage limit after the
launcher's `bun run verify` passed, and saved no report. At the human's request,
the coordinating Claude session performed round 2 by hand, read-only, on the
same unchanged tree. This review is independent of the implementation (a
different model and session) but did not run through the launcher, so it did
not rerun `verify` itself.

Round 1's R1 (queue size validated without Zod, SYS-04.2) is resolved:
`src/server/reviews/queue-config.ts` validates `AI_MODERATION_REVIEWS_PER_CALL`
with a server-side Zod schema (digit string → integer 1–20) and fails closed
with a fixed message; `src/server/reviews/moderation.ts` re-exports it, so
callers are unchanged. `tests/unit/moderation-queue-config.test.ts` covers
accepted sizes, malformed, out-of-range and missing values and the safe error.
The security review (`05-security-reviewer.md`) has no findings and no open
P0/P1.

The whole merge-base-to-working-tree diff was also re-read against ADM-03.
No blocking defect was found.

**Overall:** pass
R1 is fixed with unit evidence; remaining observations are non-blocking.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| ADM-03.1–ADM-03.18 | completed | Unchanged since round 1, which assessed each criterion as completed with test evidence (`04-reviewer.md`). The R1 fix touches only queue-size configuration; `06-implementation.md` reran `bun run verify` (954/954) and the moderation/audit browser suite (86/86) on the final code. |
| SYS-04.2 — new configuration boundary | completed | `src/server/reviews/queue-config.ts` uses Zod; `tests/unit/moderation-queue-config.test.ts`. |

Spot checks on the final code:

- **Atomicity and races (ADM-03.7, ADM-03.12):** `public.moderate_review` is one security-definer function, so the state update and audit insert share one transaction; `for update of r` serializes concurrent confirmations; any failure (including the audit insert) rolls back both.
- **Append-only audit (ADM-03.12, ADM-03.15):** `authenticated` has only `select` on `public.admin_audit_entries`, a trigger rejects update/delete for every role, and `ai_state` cleanup does not touch the table.
- **Scope (ADM-03.10, ADM-03.11, ADM-03.14):** all three RPCs derive the actor and workspace from `auth.uid()` through `private.moderation_admin()`, never from arguments; acting-Admin emails are read from `auth.users` only for audit rows in the caller's workspace.
- **Transport (ADM-03.16):** every method routes to one handler; non-POST returns 405 with `Allow: POST`; exact trusted origin (shared `trustedOrigin()`, now exported from `account-adapter.ts` without behaviour change), JSON media type, bounded body, strict two-field body and `Ref` bounds are checked before the RPC; all responses are `private, no-store`.
- **Rendering (ADM-03.3, ADM-03.14, ADM-03.17):** text and reasons render as React text nodes; protected data streams behind Suspense with a content-free fallback.

## Findings

### Blocking

None.

### Non-blocking

- **N1 — P3 — Placeholder column defaults.** `supabase/migrations/20261021000002_review_moderation.sql` adds `reviews.rating default 1`, `reviews.text default 'Review'` and `cafes.name default ''`. They let existing rows and fixtures migrate, but an insert that forgets a field succeeds with invented content. Review creation (T-45) and café setup (T-54) must always supply these fields; dropping the defaults afterwards would make omissions fail loudly.
- **N2 — P3 — Text comparison on the review key.** `moderate_review` matches `r.id::text = p_review_ref`, which cannot use the primary-key index. Harmless at demo scale.
- **N3 — P3 — Queue needs its setting in every environment.** The queue fails closed ("Unable to load reviews.") when `AI_MODERATION_REVIEWS_PER_CALL` is unset, even with AI disabled. Hosted Preview and Production set it; local development needs it too, which the docs should mention.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` (interrupted round-2 launcher) | Passed, reported by the coordinating Codex session | The launcher's verify completed before the worker hit its usage limit; its temporary log was not kept. |
| `bun run verify` (`06-implementation.md`) | Passed | 954/954 tests across 39 files, with traceability, spec check and build, on the final code. |
| `bun run test:e2e tests/e2e/moderation tests/e2e/audit` (`06-implementation.md`) | Passed | 86/86. |
| `git status --porcelain --untracked-files=all`, `git log`, `git diff`, source reads (read-only, `GIT_OPTIONAL_LOCKS=0`) | Inspected | Tree unchanged since `06-implementation.md`; no spec, PLAN or testing-owned file changed by implementation. |

No mutating check, database command or build was run by this reviewer.

## Open issues for the next step

None blocking. N1–N3 are recorded for T-45/T-54 and the docs stage.

## Suspicious content found

None.

## Human corrections

The human asked Claude to review round 2 directly rather than retry the Codex worker.

## Review responses

R1 (round 1): resolved by `06-implementation.md`; verified above.

## Notes for reflection

- **What worked:** A reviewer from a different model family gives independence without the launcher, at the cost of not rerunning `verify` itself.
- **What needed guidance:** The launcher has no fallback when its worker runs out of usage.
- **What to change in the agent or skill:** Let `review.sh` keep the verify log and allow a human-approved stand-in reviewer to cite it.
