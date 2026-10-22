# Customer Pickup Orders Orchestration

## Goal
Create and implement T-42/T-43 for customer pickup ordering and retained order history/cancellation, following the orchestrator workflow and approved CUS-03/CUS-04 specifications.

## Scope
Six task-related user prompts are preserved in the available conversation, including summarized earlier exchanges; one focused implementation task with commit guidance and session logging. The complete exchange count is unavailable after context compaction.

## Key prompts
- “use the orchestrator skill to help me create and implement T42 and T43” — Requested the paired testing/implementation workflow with specification gates and evidence.
- “Can you give me the code to commit all the changes” — Requested human-run Git commands, preserving separate test-correction, feature, documentation and PLAN commits.
- “log the chat” — Requested this numbered session record.

## Decisions and corrections
- The user selected “Single-agent: you write tests, implementation, self-review and docs.” Work proceeded on `feat/73-customer-pickup-orders`, pairing issues #73/#74; no independent agents ran.
- Docker was manually paused; the user resumed it before local database/browser checks. Missing Node on PATH was resolved using the app-bundled runtime. No hosted databases, live LLM calls or deployments were used.
- Failing-first coverage comprised 113 tests. The human committed the tests as `c009472` before implementation continued.
- Implemented atomic customer-scoped replay, immutable purchase snapshots, Singapore pickup validation, protected customer APIs, pre-order/My orders pages, pending cancellation and suspension-history display.
- Three repair cycles resolved ambiguous cancellation labels, two account-switch setups contradicting SYS-02.10, fractional timestamp rounding, name validation, clock capture before blocking locks and interpolated titles invisible to static traceability. Acceptance assertions were preserved.
- Final verification passed 1,019 tests across 51 files, lint, types, production build and isolation checks. All 419 browser cases passed; the three title-corrected role cases passed again. Close-out traceability passed for 38 done tasks; specification checks reported zero warnings. Both tasks were marked done.
- Disclosed the existing signup/demo customer-name gap: unnamed accounts receive the specified 409. Real owner acceptance/collection integrations and submission-key persistence across reload remain limitations.
- Commit commands were supplied for the human. At logging, history contains `f78a007`, `1047dbe`, `77d1192` and `b116f91` for the four groups; the working tree was clean before this log. The agent executed no commits.

## Files created or modified
- `src/server/orders/`: pickup policy, schemas, query parsing, source and HTTP adapters.
- Customer order/pickup-slot API routes; café detail/pre-order and order-history pages/components; `src/proxy.ts`.
- `supabase/migrations/20261022000002_customer_orders.sql`.
- `tests/unit/orders/`, `tests/unit/orders-internals.test.ts`, `tests/integration/orders/`, `tests/e2e/orders/`.
- `workflow/handoffs/73-customer-pickup-orders/01-testing.md` and `02-implementation.md`.
- `README.md`, `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `workflow/PLAN.md`.
