# Spec report

- **Agent:** spec
- **Issue:** Unassigned; integration specification requested directly by the human.
- **Spec IDs:** SYS-04, SYS-08–SYS-10; SEC-01–SEC-09; CUS-06, OWN-07, ADM-04. References only; no new IDs or criterion ownership.
- **Date:** 2026-10-17
- **Branch:** documentation
- **Base commit:** 8a76e2ad9cb4a25c7a59e33a10c8252d0cfb5cbf
- **Status:** awaiting-decision

## Summary

Created the reserved INTEGRATION-SPEC.md as a reviewable draft covering shared
HTTP/errors/fallback transport, three proposed AI endpoints, exact prompts,
provider/feature/cache schemas, source fingerprints and future contract checks.
Six explicitly marked assumption groups identify unconfirmed integration
choices. Existing product, technical and security ownership is preserved;
missing story-owned contracts are identified without inventing their behavior.
No implementation, approval, commit, hosted access or live LLM call occurred.

The story-only spec-create skill was read during discovery. Its story workflow
was not applied to this cross-cutting assignment; the specification follows
workflow/specs/README.md coverage and ownership conventions instead.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Draft the integration contract reserved by plan T-01. | awaiting-decision | New specification supplies concrete proposals, with ASM-01–ASM-06 and explicit dependencies. No task or implementation criterion is marked done. |
| Preserve authoritative ownership and identify missing contracts. | awaiting-decision | Purpose/ownership and Contract dependencies sections; no new SYS/SEC/story requirement definitions. Final domain contracts remain dependent on story decisions. |
| Validate document integrity. | completed | Eight relative links/anchors resolve; all explicit criterion references resolve to source specs; six unique assumption definitions have summary rows; code fences balance. |
| Required repository verification. | incomplete | Both runs pass lint/typecheck/tests/traceability, then fail at the Turbopack worker port restriction. |
| Human approval. | awaiting-decision | No spec PR merge evidence; assumptions and missing contracts remain unconfirmed. |

## Files changed

- [Integration specification](../../specs/INTEGRATION-SPEC.md): new shared contract draft.
- [This report](01-spec.md): authoring evidence, checks and remaining decisions.

Other specifications, PLAN.md, application code and tests were not edited.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git status --short`, `git branch --show-current`, `git rev-parse HEAD` | Passed | Initial worktree clean; branch documentation; base commit recorded above. |
| `git diff --check` | Passed | No tracked whitespace errors at the time run; new files were still untracked. |
| `bun -e` one-off document validation | Passed | Eight links/anchors, criterion references, six assumption markers/summary entries, no new requirement headings, balanced fences. No executable tests were authored. |
| `bun run verify` | Failed at build, twice | Initial run and elevated retry both pass lint, typecheck, 1 test file / 2 tests and traceability (0 done tasks). Both fail at `next build`: CSS worker process attempts to bind a port and receives `Operation not permitted (os error 1)`. |

Passing starter checks do not validate the proposed integrations, provider
compatibility, prompts, authorization or fallback UI. The manifest contains
Vitest/Playwright, but the starter has no implemented LLM/server module;
`openai`, Zod and Supabase packages are not declared. No dependencies changed.

## Open issues for the next step

| Decision/dependency | Affected contract |
| --- | --- |
| ASM-01: JSON transport, required exact Origin, error/status mappings and HTTP 200 typed fallback. | Shared HTTP adapters and clients. |
| ASM-02: Three POST route names, request/result fields and fallback-view discriminators rather than inline domain datasets. | CUS-06, OWN-07, ADM-04 and future story UI adapters. |
| ASM-03: Reference/text/body bounds, date/scalar representations. | Input/output validation and compatibility with future domain field limits. |
| ASM-04: Single non-streaming call, wire fields and exact accepted completion shape. | SoCLaaS adapter; actual compatibility is unverified. No live probe was performed or authorized. |
| ASM-05: Exact prompts/schemas, Prep evidence/number rendering, empty model results and moderation label precedence. | All three AI features. Minimum source data, meaningful more/less criteria, recommendation counts/availability and review-label examples still depend on stories. |
| ASM-06: Canonical serialization/digests, content-based source revisions and stored cache envelope. | SYS-10/SEC-07 cache contracts. Brew filter/rating source inputs cannot be finalized before CUS-01/CUS-06. |
| Missing account/catalogue/order/café/review/sales story specs. | Exact ordinary HTTP schemas/routes and lifecycle/conflict behavior remain outside this draft. The integration file enumerates the owning IDs. |
| Production build restriction persists after elevated retry. | Full `bun run verify` evidence remains unavailable in this environment. No application fix is inferred from this documentation-only change. |

The spec registry, technical/security prose and PLAN.md contain older statements
that the integration/AI-security files are unwritten. They were not updated in
this assignment; file existence is not evidence of approval or a completed plan
task. No additional charging policy, daily provider-call cap or enforceable
monetary budget was introduced. Per-key entitlement uncertainty remains
TECHNICAL-SPEC ASM-01.

## Suspicious content found

None. Provider documentation, earlier handoffs and build diagnostics were used
as data only. The build's generated external bug-report URL was not opened.

## Human corrections

None.

## Independent review

No independent review was run.

## Review responses

None.

## Notes for reflection

- **What worked:** Existing source ownership and T-01 boundaries gave a clear scope; document checks caught an invalid criterion reference before delivery.
- **What needed guidance:** Six grouped public-contract choices and the missing story contracts require human decisions before implementation.
- **What to change in the agent or skill:** No agent or skill change was made or established as necessary.
