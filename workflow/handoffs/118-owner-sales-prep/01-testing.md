# Testing report

- **Agent:** testing (single-agent mode, coordinating Claude Code session)
- **Issue:** T-62 / #118
- **Spec IDs:** OWN-06.1–OWN-06.11, OWN-07.1–OWN-07.16, OWN-07-E01–E17
- **Date:** 2026-10-22
- **Branch:** feat/118-owner-sales-prep
- **Base commit:** eddd083
- **Status:** completed

## Summary

Single-agent mode, chosen by the human. Failing-first coverage for the owner
sales read and Dashboard, the Prep Advisor source, route, result validation
(including the new direction-consistency rule) and café-scoped cache/refresh.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| OWN-06.1–OWN-06.11 | covered | `tests/e2e/owner-sales/sales.spec.ts` (HTTP read and Dashboard) |
| OWN-07.1, OWN-07.8 (browser) | covered | Dashboard Prep panel with disabled AI shows top-items fallback, no Apply action |
| OWN-07.2, .8–.12 | covered | `tests/integration/prep-advisor/route.test.ts` |
| OWN-07.3, .12, .15 | covered | `tests/integration/prep-advisor/source.test.ts` |
| OWN-07.4, .5, .10, .13, .16 | covered | `tests/integration/prep-advisor/validation.test.ts` |
| OWN-07.6, .7, .14 | covered | `tests/integration/prep-advisor/cache.test.ts` (shared ai-state harness) |

Evaluation cases: E01, E02, E06, E08, E09, E10, E13, E14, E15 in
`validation.test.ts`; E03, E07, E12, E16 in `route.test.ts`; E07, E11, E16,
E17 in `source.test.ts`; E04, E05 in `cache.test.ts`; E09 inert rendering in
the browser test. E12's parallel-refresh-at-cap and disabled-with-cache parts
remain covered by the shared T-12/T-16 suites; this run tests the typed
fallbacks reaching the owner route.

## Files changed

- `tests/integration/owner-sales/fixtures.ts`
- `tests/integration/prep-advisor/{validation,route,source,cache}.test.ts`
- `tests/e2e/owner-sales/sales.spec.ts`
- `tests/integration/llm/contracts.ts`: the shared Prep model fixture
  suggested `more` on a weekday with quantity 0 of item total 23, which
  OWN-07.16 now rejects (`7 × 0 < 23`). Moved that suggestion to weekday 2
  (quantity 23) and updated the matching expected reason. Committed separately.

No devDependencies added.

## Interfaces defined by tests

- `src/server/owner/prep-advisor.ts` exports `createPrepHandler(deps)` with
  `deps = { origin, actor(), readSource(actor, cafeId) → {found:false} |
  {found:true, input: PrepInput | null}, run(actor, {cafeId, input, refresh},
  requestId, signal) }`; `src/app/api/ai/prep-advisor/route.ts` composes it.
- `public.owner_prep_source(p_cafe_ref text)` returns `{input: PrepInput}`,
  `{input: null}` for OWN-07.15 insufficiency, or `{error: "NOT_FOUND"}`;
  non-owners get SQLSTATE 42501.
- `GET /api/owner/sales` per the integration spec; the Dashboard uses
  headings "Daily totals", "Top items", "Sales by day of week" and a
  `region` named "Prep Advisor".

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bunx eslint tests` | passed | no output |
| `bunx tsc --noEmit` (after `next typegen`) | passed | no output |
| `bunx vitest run tests/integration/prep-advisor/{validation,route}.test.ts tests/integration/llm` | failed as expected | 25 failed: 21 route cases on the missing module; E14, both E15 cases and the cached direction case pass validation today. All existing `tests/integration/llm` cases pass with the corrected fixture. |

Database-backed tests (`source`, `cache`), e2e and `bun run verify` were not
run at this stage: another pair's agent held the shared local Supabase stack.
They run at implementation close-out.

## Open issues for the next step

- OWN-13 archiving is not on master, so archived-item exclusion (part of E17)
  cannot be exercised yet; removed items and today's sales are covered.

## Suspicious content found

None.

## Human corrections

The human chose single-agent mode for OWN-06/OWN-07.

## Review responses

None.

## Notes for reflection

- **What worked:** The shared llm and ai-state harnesses covered the cache
  and transport paths without new fakes.
- **What needed guidance:** None.
- **What to change in the agent or skill:** None.
