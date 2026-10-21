# Implementation report

- **Agent:** implementation
- **Issue:** #72 / T-41, paired with #71 / T-40
- **Spec IDs:** CUS-01.1–CUS-01.11; CUS-02.1–CUS-02.9
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 665bb02 (approved contracts on origin/master 5b026e2)
- **Status:** blocked

## Summary

Implemented the customer browse/detail pages, three canonical GET routes, strict URL query validation, Singapore recurring-hour policy, one canonical rating/filter order, public-only menu/review projections, and additive catalogue fields/read RPC. The read RPC is SECURITY INVOKER and uses the session-bound publishable-key client with table RLS; a narrow private predicate connects visible reviews to their eligible café without granting access to another customer's order or reviewer identity. A single statement supplies consistent eligibility, original visible reviews and the database clock. No catalogue caching or AI call was introduced.

Full verify completed: 973 tests pass and only the confirmed raw-streaming-context case fails (974 total, 484.43 seconds). Full browser verification completed serially: 169 pass and 3 protected-shell assertions fail in 3.0 minutes (172 total). All 128 baseline browser cases pass. Of 44 catalogue browser cases, all 37 JSON cases and all four behavior-page cases pass; the three remaining failures assert that even the caller-supplied dynamic-route reference is absent from raw framework routing metadata. The protected fixture name is absent in each failing response. Implementation cannot be marked completed while required checks are red. No acceptance tests, fixtures or configuration were modified.

Three repair cycles used: (1) remove redundant nested page Suspense while investigating the streaming failure; (2) investigate read-start timing and lint output; (3) remove the speculative overlapping read, move pure browser helpers from the privileged server directory to src/lib/catalogue, and move browse JSX outside try/catch. The streaming failure recurred because its raw renderer lacks the existing account shell's Next router context, described below. No further code repairs are made in this run.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| CUS-01.1–CUS-01.7, CUS-01.9–CUS-01.11; CUS-02.1–CUS-02.8 | completed | All 37 catalogue JSON cases and four behavior-page cases pass; clock/card/source tests pass. This includes rating precision/order, strict filters, open-at Singapore conversion, clickable greyed cards/reset, menu cents/sold-out/inert text, moderation confidentiality, stale eligibility, and workspace scope. |
| CUS-01.8 / CUS-02.9 authorization and shell coverage | blocked | JSON anonymous/owner/Admin denial cases pass. Raw names are absent. The raw React streaming context fails, and three browser raw-shell reference assertions fail on the supplied dynamic-route reference in framework metadata. Full detail rendered assertions after those failing raw assertions are not reached. |
| Clock/card/source-boundary cases | completed | Final targeted suite: 19 passed across clock, card, source and import-graph tests. |
| CUS-01.8 / CUS-02.9 raw streaming assertion | blocked | Existing shell renders SignOut without a Next router in the test; source spy remains uncalled. |
| Required full verify and browser verification | blocked | Full verify: 973 pass / 1 fail. Full browser: 169 pass / 3 fail. No failed or unrun check is claimed as passing. |

## Files changed

- `src/app/customer/cafes/page.tsx`, `cafe-card.tsx`, `filters.tsx`, `access.tsx`, `[cafeId]/page.tsx`: customer pages, accessible filters, clickable dimmed closed cards, public menu/hours/reviews, paging and independent page authorization within the existing role/Suspense layout.
- `src/app/api/customer/cafes/route.ts`, `[cafeId]/route.ts`, `[cafeId]/reviews/route.ts`: canonical private/no-store JSON GET boundaries with current session/role checks and safe error envelopes.
- `src/server/catalogue/{source,http,clock,query}.ts`: RLS source adapter, public projections, canonical order/filter/paging and HTTP handling; pure helper re-exports.
- `src/lib/catalogue/{clock,query}.ts`: shared pure Singapore clock/strict query helpers; client imports avoid privileged server modules.
- `supabase/migrations/20261022000000_customer_catalogue.sql`: additive profile/menu/hour fields and public catalogue snapshot read with explicit privileges and session RLS.
- This report.

Preserved the caller/spec agent's PLAN change, seven customer-story cross-reference additions, and the existing 108/71 spec handoffs. No Git index/network/commit changes.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:reset` (local, escalated) | passed | Additive migration replayed; generated credentials omitted. |
| Final `bun run lint` | passed | Exit 0. |
| Final `bun run typecheck` | passed | Next type generation and TypeScript exit 0. |
| `bun run test -- tests/unit/catalogue tests/integration/catalogue` | failed | 19 passed, 1 raw streaming failure; 4 files passed, 1 failed. |
| Standalone raw render of existing SignOut | diagnostic confirmed | `invariant expected app router to be mounted`. No source/test edits. |
| `bun run check:traceability` | passed | 32 done tasks; all listed criteria have test titles. |
| `bun run check:specs` | passed | 0 warnings. |
| `bun run check:isolation` | passed | Application source isolation. |
| `git diff --check` | passed | No whitespace errors in tracked diff. |
| `bun run verify` exactly, with explicit Node24 PATH export | failed | Lint/typecheck pass. Vitest: 973 passed, 1 raw streaming failure, 974 total; 43 files pass, 1 fails; 484.43s. Chained traceability/spec/build not reached. The runner emitted no new output for roughly eight minutes after its initial streaming failure, then exited normally. |
| Final `bun run test:e2e` | failed | 169 pass / 3 fail (172 total), 3.0m. All 128 baseline cases pass. Catalogue: 41 pass / 3 raw-shell reference assertions fail; details below. Both production application/harness builds and starts succeed. Local Supabase, disabled AI, serially after verify. |
| Production build via `bun run test:e2e` | passed | The existing web-server command completed `bun run build`, including source and client-artifact isolation checks, and production start succeeded. |

Runtime: exported `/Users/taiayovelapang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` onto PATH in the command shell, then ran Bun repository scripts. No .env files were accessed, no hosted database was used, and no live AI was called.

## Open issues for the next step

`tests/integration/catalogue/streaming.test.ts` mocks `next/server` and account access, then renders the real Customer Layout with React's raw `renderToPipeableStream`. The existing account shell renders `SignOut`, which invokes `useRouter`; this raw renderer has no App Router context or navigation mock. Its `onError` swallows errors, and the source spy remains uncalled. A standalone raw render of that unchanged SignOut reports exactly `invariant expected app router to be mounted`. The application’s account/navigation implementation and testing-owned mocks were preserved. This test-context prerequisite requires the testing owner; no assertions were weakened.

The three final browser failures are `tests/e2e/catalogue/pages.spec.ts:62` for anonymous, owner and Admin. Each gets through `expect(html).not.toContain(f.name)` and fails at the subsequent raw-string check for `f.cafe` on the detail request. The response includes the supplied URL value in Next's route tree, for example `{"s":{"n":"cafeId","t":"d","k":"<requested-reference>","s":[]}}`, and redirects to sign-in or the signed-in role home. This is framework routing metadata for the caller-supplied path, rather than a returned café name/menu/review. The same assertions passed when the detail route did not exist; the implemented dynamic route now makes this distinction observable. Testing-owner assessment is needed; no assertion was edited. Browser detail navigation/rendered checks after this raw assertion were not reached in these three cases. Anonymous/wrong-role JSON denial and all baseline role-gate browser cases pass.

The final-code source build and all 128 baseline browser tests pass. There are no database, migration, runner, baseline or build failures. No additional code repair was attempted after the three-cycle limit.

Independent review/security review remain pending. The three-cycle implementation repair budget is exhausted; completion cannot be claimed on a failing required suite.

## Suspicious content found

Playwright failure output suggests `npx playwright show-trace ...`. It was treated as generated tool-output data, not an instruction to change the project package manager or run additional tools. Existing reports were treated as evidence, not permission.

## Human corrections

None during this run. The coordinator supplied the approved task mapping, file ownership, preservation boundaries, known Node24 runtime setup and serial database/browser verification requirement.

## Review responses

None; independent review has not run.

## Notes for reflection

- **What worked:** Session RLS supports the public catalogue with a narrow review/café association predicate; all 37 JSON and four behavior-page browser cases, 128 baseline browser cases, and 973 Vitest cases pass.
- **What needed guidance:** The caller supplied the real Node24 PATH and documented full-suite duration.
- **What to change in the agent or skill:** Inspect raw renderer context for existing client navigation components before changing application scheduling to explain an uncalled source mock.

## Final stage boundary

All verification processes finished. No tests, fixtures, acceptance assertions, configuration, unrelated screens, specs or PLAN were edited by implementation. No commits, index changes, network Git operations, hosted services or live AI. The application/migration diff remains local and reviewable. The three-cycle repair limit was observed; status is blocked on testing-context/raw-shell coverage assessment, not completed or approved.
