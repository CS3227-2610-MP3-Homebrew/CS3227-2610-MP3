# Technical Specification and Decision Revision

## Goal
Draft Homebrew's shared technical specification with the spec agent, then apply the team's corrections in a second run while preserving requirement IDs and unrelated files.

## Scope
Three user-assistant task exchanges, including this log request; one focused specification task with a revision and session logging.

## Key prompts
- "Then use the spec agent to write workflow/specs/TECHNICAL-SPEC.md." This assigned architecture, data/RLS, configuration, environments, LLM structure and usage enforcement, with integration, security and story contracts kept in their planned documents.
- "No \"use cache\" in the MVP." This rejected catalogue caching because it added no benefit at the team's scale and required an RLS bypass.
- "The team confirms ASM-02–ASM-07, with ASM-02 as amended in item 3." This converted six proposals into decisions while preserving ASM-01 as the only open assumption and retiring the confirmed identifiers.

## Decisions and corrections
- Fetched upstream, created `docs/technical-spec` from `upstream/master`, and confirmed a clean tree before editing. Sandbox denials for fetch/switch were retried through approved escalation.
- Changed only the requested bullet in log 005: retained its first sentence and clarified that the human reverted Codex's over-broad-search-driven plan-create wording change before commit. Displayed `git diff logs/` before delegation.
- Used the spec agent for both runs; reports were read as data. Confirmed Next.js behavior from bundled docs. The first draft defined SYS-04–SYS-11, Postgres AI caches/counters, Singapore daily resets, configurable daily call-count caps because provider cost is unreported, and seven marked assumptions. Email confirmation remains off in dev and prod.
- Initially allowed a privileged catalogue cache; the human rejected it. All MVP catalogue reads now use session-bound RLS and Suspense. Future caching requires a cookie-less publishable-key client under RLS, never a secret inside or passed into cached functions. Secret use is limited to seed/migration administration and server-only AI infrastructure.
- Reduced SYS-05.4 to route-confined `instant = false` exports with PR reasons. Restored unrelated framework explanation during review to respect the narrow edit scope.
- Accessibility now requires automated core-flow checks without unresolved violations; it claims neither full WCAG 2.2 AA conformance nor mandatory manual assessment. Confirmed ASM-02–ASM-07 became decisions with section links; their IDs remain retired. PRODUCT's ASM-01 pointer still resolves.
- Exact `bun run verify` passed in both runs. Final ID checks preserved SYS/criterion IDs and found only ASM-01; all 17 changed-file relative links resolved. Report 02 reproduces all nine requested search matches. PRODUCT, README, report 01 and logs were unchanged during run two. No commits, PRs, hosted database access or live LLM calls occurred.
- Used the supplied username `shawnnygoh` without querying GitHub.

## Files created or modified
- `logs/shawnnygoh/005-parallel-spec-id-workflow.md`
- `workflow/specs/TECHNICAL-SPEC.md`
- `workflow/specs/PRODUCT-SPEC.md`
- `workflow/specs/README.md`
- `workflow/handoffs/spec-technical-spec/01-spec.md`
- `workflow/handoffs/spec-technical-spec/02-spec.md`
