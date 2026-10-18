# Cross-cutting Spec Consistency Cleanup

## Goal
Align the four cross-cutting specs, spec registry and PLAN with the team's supplied decisions while preserving contracts. Leave a verified local diff and a spec-agent handoff for human review.

## Scope
Two substantive user–assistant exchanges covering one focused cleanup task and its session log.

## Key prompts
- “Do this yourself before delegating.” The main session had to check cleanliness, fetch upstream and create the requested branch with escalated permissions before involving the spec agent.
- “Pass it this whole section 3 unchanged.” The spec agent received the full cleanup instructions, preserving the user's scope and explicit exceptions.
- “don't change any requirement, criterion, limit value, prompt text, schema or route” The cleanup had to preserve contracts except where the supplied items expressly authorized changes.
- “Run these and report the output. Run the bun command exactly as written.” The main session owned the eight final checks, including the exact `bun run verify` command.

## Decisions and corrections
- The initial working tree was clean. Approved escalated commands fetched `upstream` and created `docs/spec-consistency` from `upstream/master` at `8793a9f`; both succeeded.
- H1–H3 adopted the remaining integration assumptions, removed daily dollar budgets and made AI-SECURITY-SPEC authoritative for usage-limit values. TECHNICAL-SPEC retained enforcement mechanisms and unverifiable SoCLaaS key defaults.
- H4–H5 defined four PLAN statuses, reviewer-based pair completion and evidence reconciliation without CI enforcement. A pair uses two issues, one branch and one PR, named after the testing issue; related stories may share a pair within the supplied limits.
- H6 retired PLAN ASM-01. New T-23 scopes peer-tester hosted access and daily maintenance without selecting their design. The supplied PLAN rules overrode conflicting plan-create defaults.
- A1–A7 removed stale workflow/history wording, refreshed references and assumptions, aligned task statuses and retained 10 foundation test/implementation pairs. No preservation conflict was reported.
- The agent verified nine integration code blocks and prompt text remained unchanged. Its report initially stayed incomplete pending main-session verification, then became completed with accurately attributed evidence.
- `bun run verify` passed lint, typecheck, eight tests, traceability and production build. All seven remaining checks matched expectations: exact file scope, clear wording/budget scans, only TECHNICAL-SPEC ASM-01, requested task statuses and six tracked files with 208 insertions/258 deletions. Vite emitted a nonblocking path-plugin warning.
- No commit, push or PR was created. The user deferred logging until reviewing the result, then requested this log using the supplied username `shawnnygoh`.

## Files created or modified
- `workflow/specs/README.md`
- `workflow/specs/PRODUCT-SPEC.md`
- `workflow/specs/TECHNICAL-SPEC.md`
- `workflow/specs/INTEGRATION-SPEC.md`
- `workflow/specs/AI-SECURITY-SPEC.md`
- `workflow/PLAN.md`
- `workflow/handoffs/spec-consistency/01-spec.md`
