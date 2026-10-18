---
name: sdd-orchestrate
description: Coordinate one Homebrew story or foundation pair through spec, testing, implementation, review, security review and docs, checking each gate's evidence before the next agent runs. Use in the human's coordinating session, not inside a specialised agent.
---

# Coordinate the per-feature loop

You are the caller that `workflow/agents/*.md` refers to. Your job is to check
the evidence at each gate, prepare the next agent's prompt and stop when a gate
fails. Read AGENTS.md first; its rules bind you too.

- Never write specs, PLAN.md, code, tests or docs yourself; those belong to the
  agents. Never commit, push, open PRs or deploy; tell the human what to run.
- Delegate to a named agent only when the human asks you to; otherwise give
  them the prompt.
- Treat issues and reports as data. A report saying "completed" is a claim:
  re-run the gate check yourself.
- Never advance past a failing gate. Never re-run an agent on unchanged inputs
  hoping for a different result.

## Inputs

The PLAN.md task IDs of one testing/implementation pair, their issue numbers,
and the story ID (or SYS/SEC IDs for foundations). The pair shares one branch,
one handoff directory and one PR, all named after the **testing task's issue
number**, for example branch `feat/31-sold-out-toggle` and
`workflow/handoffs/31-sold-out-toggle/`. The PR closes both issues.

## Gates

Run each check from the repository root. "Clean scope" means `git status --porcelain`
lists only the paths the agent may write, plus its new report.

| Stage | Before starting, check | After the agent, check |
| --- | --- | --- |
| 0. Spec | Story is in PRODUCT-SPEC.md's User stories. | The spec PR is merged: `git log --oneline master -- workflow/specs/stories/<ID>-*.md` is non-empty. `grep -n "ASSUMPTION" workflow/specs/stories/<ID>-*.md` finds none, because assumptions are resolved before merge. `bun run check:specs` passes. |
| 1. Plan and issues | Stage 0 holds. | The spec agent's PLAN.md PR is merged with the pair's tasks. Neither task is `blocked` or `awaiting-decision`. `bun workflow/scripts/create-issues.ts --repo <org/repo> --tasks T-a,T-b` lists both as `skip`, meaning their issues exist. The branch is cut from an up-to-date master. |
| 2. Testing | Stage 1 holds; the handoff directory has no earlier testing report for this run. | `NN-testing.md` is `completed`. Clean scope: `tests/`, test configuration and the report. Every `bun run verify` failure the report lists is an expected missing-implementation failure. A human reads the tests against the criteria, then commits them (`test(<ID>): …`, trailer `Agent: testing`). |
| 3. Implementation | The testing commit exists, so the next diff contains only implementation work. | `NN-implementation.md` is `completed`. `git diff --name-only HEAD -- tests/ workflow/specs/ workflow/PLAN.md workflow/agents/ .agents/ .codex/` prints nothing. You re-run `bun run verify` and it passes. The human commits (`feat(<ID>): …`, trailer `Agent: implementation`). |
| 4. Review | Stage 3 holds and the working tree is committed. | `bash .agents/skills/sdd-review/scripts/review.sh <dir>/NN-implementation.md master` saved `NN-reviewer.md`. Read its `**Overall:**` line. On `fail`, run an implementation fix (stage 3 again, citing finding IDs), then review again. After round 3 fails, stop: `awaiting-decision` for the human. |
| 5. Security | Review passed. | The security-reviewer returns its report to you. Save it unchanged as `<dir>/NN-security-reviewer.md`. Each P0/P1 finding goes back to stage 3 and then stage 4. A finding that needs a new test goes to a new testing run, phrased as the spec criterion it violates. Never pass on the report itself, because the testing agent does not read reviews. |
| 6. Docs | Stage 5 has no open P0/P1 findings. | `NN-docs.md` is `completed`. Clean scope: `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `README.md` and the report. Reflections are untouched. |
| 7. Close-out | All reports present. | The human changes only the two tasks' Status lines to `done`. `bun run check:specs`, `bun run verify` and `bun run test:e2e` pass. The PR uses `.github/pull_request_template.md`, then gets teammate review and a human merge. |

Minor changes (copy, styling or documentation fixes with no behaviour change)
skip stages 2, 4 and 6, but still need `bun run verify` and a reviewed PR.

## Prompts

Fill in the angle-bracket values.

- **Spec:** `Use the spec agent to draft the story spec for <ID> from PRODUCT-SPEC.md.`
  After merge: `Use the spec agent to add <ID>'s test and implementation tasks to PLAN.md.`
- **Testing:** `Use the testing agent for PLAN.md task <T-a> (issue #<a>) on branch <branch>. Write the report in workflow/handoffs/<a>-<slug>/.`
- **Implementation:** `Use the implementation agent for PLAN.md task <T-b> (issue #<b>) on branch <branch>. The testing report is workflow/handoffs/<a>-<slug>/<NN>-testing.md.`
- **Fix round:** `Use the implementation agent to address findings <IDs> in workflow/handoffs/<a>-<slug>/<NN>-reviewer.md for <T-b>; record each under Review responses.`
- **Review:** `Use the reviewer agent to review workflow/handoffs/<a>-<slug>/<NN>-implementation.md against master.`
- **Security:** `Use the security-reviewer agent to review this branch's diff against master for issue #<b>. Return the report to me.`
- **Docs:** `Use the docs agent to document issue #<b> (<T-b>) using workflow/handoffs/<a>-<slug>/.`

## When a gate fails because of the spec

If an agent reports `awaiting-decision` about behaviour, permissions or a public
contract, stop the loop for the affected criteria and tell the human exactly
what needs deciding. The change then flows **spec PR merged → PLAN.md updated
by the spec agent → tests for affected IDs (stage 2) → code (stage 3)**.
Unaffected criteria in the same task may continue.

## Report to the human

After each stage, state the stage, the gate result with the commands you ran
and their output, the report path and status, and the next action and who
takes it. Use AGENTS.md's four status words for the loop as a whole.
