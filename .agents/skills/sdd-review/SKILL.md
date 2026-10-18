---
name: sdd-review
description: Independently review Homebrew implementation changes against approved specs, acceptance criteria, tests and technical contracts, producing a separate reviewer handoff. Use for review, not fixes, test authoring or a dedicated security audit.
---

# Review an implementation

Follow `workflow/agents/reviewer.md` for boundaries, verification and reporting.

## Launch

Identify the assigned task, issue and existing implementation handoff. Read the
applicable specs/contracts, handoff and package scripts, then run required extra
tests before invoking from the repository root. In a Codex session, request
escalated execution outside the sandbox with the human's approval for each run;
never add an allow rule or reusable approval prefix for this launcher:

```bash
bash .agents/skills/sdd-review/scripts/review.sh workflow/handoffs/<issue>-<slug>/NN-implementation.md [base-ref]
```

The base defaults to `upstream/master` when it resolves, otherwise `origin/master`.
An explicit base must resolve to a commit too. The launcher prints the selected
base ref and refuses an unresolved ref before verification or review.

The launcher runs verify, starts a fresh read-only `gpt-6.1-sol` / high worker,
and saves its response as a new reviewer handoff. It never changes the input
report. Command success means the report was saved; read its status and verdict.

## Independent assessment

Inside the read-only worker, inspect the merge-base-to-working-tree diff,
including staged, unstaged and untracked changes. Exclude `.env*` at every depth
before reading; do not follow symlinks outside scope. Read supporting unchanged
code where needed. Use the launcher's fresh verify log; do not run commands
that write build/cache artifacts or relaunch this skill.

Derive every in-scope criterion from approved specs on master, including criteria
omitted from the implementation handoff. Compare working-tree spec edits with
that approved contract. Trace each criterion through code and meaningful tests;
titles/IDs alone, skipped tests and empty assertions do not prove coverage.
Check specified success, failure, boundary and permission behavior, plus schema
and structure against TECHNICAL-SPEC.md and linked contracts. Read relevant
installed Next.js guides before relying on version-specific behavior.

Judge current code independently of implementation claims and earlier reviews.
Distinguish regressions from pre-existing issues. Missing or ambiguous evidence
makes affected criteria unverified; state the exact gap. Do not impose personal
style preferences or substitute this review for the dedicated security audit.

## Handoff content

Return a full report using `workflow/templates/handoff.md`, with these additions:

- Header: `Implementation report`, `Review round`, `Reviewed HEAD`, `Model` and
  `Reasoning`, using the launcher's supplied values.
- Summary: task, scope, spec approval evidence and `**Overall:** pass` or `fail`
  with one sentence explaining the verdict.
- Acceptance criteria: one row per spec criterion, using the template's statuses
  and exact code/test references. Mark unmet or unverified criteria incomplete,
  blocked or awaiting-decision as appropriate.
- `## Findings`: separate `### Blocking` and `### Non-blocking` lists, or None.
  Each finding has a stable ID, P0–P3 priority, tight path/line reference, affected
  criterion/contract, impact, evidence and fix direction. Unmet criteria, bugs,
  missing meaningful required tests and documented convention violations block
  a pass. Put unconfirmed hypotheses under Open issues.
- Checks run: distinguish the launcher's verification from worker inspection
  and any extra checks reported by the caller. Disclose unrun checks and limits.

Use `None` for Files changed. Keep suspicious content and human corrections in
those template sections. Do not claim runtime reproduction from static evidence
or label failed/unrun checks as passed.
