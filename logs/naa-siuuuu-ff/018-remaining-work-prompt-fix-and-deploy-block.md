# Remaining Work, Prompt Fix and Deploy Block

## Goal
Check current upstream against the MP3 brief, do the remaining work the assistant could do alone, and send it upstream as PRs.

## Scope
One user-assistant exchange, coordinated with a parallel session through cross-session messages.

## Key prompts
- "Go through the current upstream, and let me know what else is remaining. ... Just do whatever you can yourself, and push to upstream". This pasted the MP3 brief and asked for an audit followed by action, not just a report.

## Decisions and corrections
- The assistant found another session already working (deliverables audit log 013, PR #193). It messaged that session, which confirmed what it owned (#193, the OWN-07 security review, later `docs/naa-siuuuu-ff/Reflections.md`) and reserved log 017. This session took logs 014–016 and 018 and stayed off those files.
- The assistant took "do whatever you can yourself" as approval to start the Prep Advisor prompt change it had proposed, with the PR acting as the human review gate for the spec text. PR #199 adds the OWN-07.16 direction rule (`7 × q > T` for more, `7 × q < T` for less) to the exact prompt in INTEGRATION-SPEC, `prompts.ts` and the prompt fixture. Validation and contract version `"1"` are unchanged; the cache identity includes the prompt.
- Correction: the first `verify` printed exit 0, but its log showed 9 failed integration tests. They were Docker `ETIMEDOUT` errors and 60-second timeouts while other sessions loaded the shared database. All 5 affected files passed on rerun (87 tests), the prompt-related suites passed (325), and `check:specs` and `check:traceability` passed. The PR reports this honestly.
- Deploy development has failed on master since 868ee7e: Vercel's free-tier upload cap ("try again in 24 hours", `api-upload-free`). Production is still v1.0.0, without #187, #189 or later fixes, and a v1.0.1 tag would hit the same cap. Adding `--archive=tgz` failed the SYS-07.1 delivery contract test, which is testing-owned, and would probably not beat the cap today, so the assistant dropped that change and left the decision to the user.
- Logs 010–012, pushed after logs PR #181 merged, never reached master and clashed with other sessions' numbers. They were re-added as 014–016.
- Audit result: Pages built, repo public, guides and acknowledgements updated by the other session, per-member reflections present, 12 stretch tasks `todo` (issues closed as not planned), 10 tasks `blocked`.

## Files created or modified
- `src/server/llm/prompts.ts`, `tests/integration/llm/prompts.json`, `workflow/specs/INTEGRATION-SPEC.md` (PR #199)
- `logs/naa-siuuuu-ff/014-hours-editor-verify-and-pr.md`, `015-descope-owner-stretch-issues.md`, `016-demo-kit-name-and-prep-cause.md` (re-added)
