# T-13/T-14 validated LLM orchestration

## Goal
Test and implement Homebrew's shared validated LLM operations and fallbacks through the spec-driven orchestration workflow, then record the session.

## Scope
Eight task-related user-assistant exchanges, including approvals and this logging request; one focused testing/implementation pair.

## Key prompts
- “Use sdd-orchestrator skill to help me add test and implement T13 and T14” requested coordination of the paired tasks rather than direct implementation outside the workflow.
- “give me the code to commit” requested executable Git commands for the human-owned testing commit required before implementation.
- “Log” requested a numbered record of the session's work and decisions.

## Decisions and corrections
- Confirmed approved foundation contracts on `origin/master`, issue mappings T-13/#44 and T-14/#45, and merged T-12 admission. Created `feat/44-validated-llm-operations-fallbacks`; preserved the unrelated untracked #66 spec handoff.
- The user explicitly authorized testing/implementation agents, then reviewer/security-reviewer/docs agents. Humans reviewed and made five commits, from `1f09991` through `255ab71`; agents did not commit, push or open a PR.
- Testing authored 238 cases using authorized snapshots and fake transport. Corrected an initial empty-source inference: Brew has an explicit no-source fallback, moderation requires nonempty selection, and Prep sufficiency remains story-owned.
- Started Docker Desktop and replayed local Supabase migrations after unavailable/stale infrastructure prevented baseline verification. Necessary Git, Docker and GitHub reads used approved escalation when sandbox access failed; no hosted database or live provider was used.
- Implemented four server-only modules for strict Zod boundaries, exact prompts, semantic reference/evidence checks, admission/cache seams, typed fallbacks, single-attempt transport, cancellation and byte/time limits. No dependency, endpoint, screen or persistent cache/audit repository was added.
- Fixed a testing-owned request recorder that was overwritten by a response mock. Both original assertions remained intact; the human committed the correction before resumed implementation verification. Transient database timeouts did not recur.
- Independent review passed round 1 with no findings; security review reported no confirmed findings. Documentation updated the Developer Guide and README; the User Guide remained unchanged because no user-facing flow was added.
- Marking both tasks done exposed static traceability rejection of interpolated injection-test titles. Testing changed registration to literal-title `test.each`, preserving all 12 injection cases and assertions.
- Final coordinator `bun run verify` passed: 704 tests across 25 files, traceability for 17 done tasks, specs, production build and isolation of 35 client artifacts. Three existing planning warnings remain. Browser E2E was not run for this server-only pair. Both tasks are done; the human PR should close #44 and #45.

## Files created or modified
- `src/server/llm/`: `operations.ts`, `prompts.ts`, `schemas.ts`, `transport.ts`.
- `tests/integration/llm/`: `contracts.ts`, `http.test.ts`, `operations.test.ts`, `prompts.json`, `validation.test.ts`.
- `workflow/handoffs/44-validated-llm-operations-fallbacks/`: reports `01-testing.md` through `08-testing.md`, including implementation, reviewer, security-reviewer and docs handoffs.
- `README.md`, `docs/DeveloperGuide.md`, `workflow/PLAN.md`.
