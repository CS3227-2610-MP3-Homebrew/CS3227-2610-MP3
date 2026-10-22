# Testing report

- **Agent:** testing (Codex, single-agent mode)
- **Issue:** #73 (T-42), paired with #74 (T-43)
- **Spec IDs:** CUS-03.1–CUS-03.8, CUS-04.1–CUS-04.8
- **Date:** 2026-10-22
- **Branch:** feat/73-customer-pickup-orders
- **Base commit:** 4ff212f3f41e45805739bbd04f643915fa4c6247
- **Status:** completed

## Summary

Single-agent mode: completed T-42 test authoring with 113 cases: 16 pickup-policy tests, 9 route/database integration tests and 88 Chromium browser/API cases. This status describes test authoring and recorded failing-first evidence, not working order features or merge readiness.

The definitive `bun run verify` passed lint and typecheck, then stopped with 23 expected missing-implementation failures and 992 passing tests (50 files, 1,015 tests, 502.68 seconds). Both new direct-RLS tests passed. The 88 order browser/API cases all failed on absent application surfaces/storage. No tests were skipped. No runtime code, migrations, acceptance contracts, configuration, dependencies or PLAN statuses changed.

## Acceptance criteria

All statuses below mean test authoring completed. The failure inventory distinguishes missing modules from unavailable HTTP/browser/history integration.

| Criterion | Status | Evidence and expected outcome |
| --- | --- | --- |
| CUS-03.1 | completed | Atomic own purchase, normalized/concurrent identical replay, concurrent changed content, independent customer keys, maximum 20 lines/quantity 20 and rollback/key reuse cases: exactly one complete pending purchase or the specified conflict, never partial writes. |
| CUS-03.2 | completed | 16 deterministic pickup cases plus live slots/stale hours/invalid UTC-grid-lead-horizon requests and browser Singapore selection/no-slot state: offer only currently permitted slots; invalid requests create nothing. |
| CUS-03.3 | completed | Stale approval/suspension and real creation-versus-suspension race: deny new work or retain the prior creation as cancelled. |
| CUS-03.4 | completed | Foreign café/item/workspace/missing references and raw item-attachment/ownership forgery: indistinguishable safe denial, no associations. |
| CUS-03.5 | completed | Verified actor/customer-name snapshots, strict caller overrides, invalid/missing protected name and customer-scoped keys: no supplied identity or live-name substitution. |
| CUS-03.6 | completed | Server unit/line/overall cents, expected-total conflict, immutable price/name/hour snapshots and browser exact-dollar/payment-at-pickup flow: no payment/AI/external browser action. |
| CUS-03.7 | completed | Anonymous/owner/Admin creation and pickup checks: canonical 401/403 and no mutation. |
| CUS-03.8 | completed | Required/nested/unknown fields, quantities/counts, Ref/UUID/Count bounds, method/origin/media/JSON and exact 65,536/65,537-byte no-Content-Length cases: strict safe errors. |
| CUS-04.1 | completed | 20-row newest-first/reference tie pagination, own snapshots/lifecycle/SGD projection, empty collection/page and source outage: safe own history or 503, never fabricated emptiness. |
| CUS-04.2 | completed | Pending cancellation, repeat/concurrent cancellation, retained snapshots and cancellation replay: one server transition, null suspension reason. Acceptance-race integration gap is recorded below. |
| CUS-04.3 | completed | Accepted/ready/collected/rejected/cancelled fixtures and direct fulfilment-write denials: only pending is manually cancellable. |
| CUS-04.4 | completed | Same-workspace foreign, missing and other-workspace reads/cancellations plus direct RLS: identical 404 and unchanged rows. |
| CUS-04.5 | completed | Actual T-29 suspension with pending/accepted/ready/collected/rejected/cancelled fixtures, terminal preservation, no revival, private-reason isolation and creation race; browser inert reasons and retained history. Admin rollback and collection race stay with the owning pair. |
| CUS-04.6 | completed | Main/kit/other-kit HTTP and RLS denial; kit own read/cancel success cases use the same rules. |
| CUS-04.7 | completed | Anonymous/wrong-role JSON checks and raw protected page-content denial. |
| CUS-04.8 | completed | Exactly empty cancellation object, method/origin/media/JSON/UTF-8 overflow and bounded body without Content-Length: safe error and unchanged order. |

## Files changed

- `tests/unit/orders/pickup.test.ts`: deterministic Singapore pickup contract, grid/lead/cutoff/horizon/overnight/adjacent/default/no-slot/timezone boundaries.
- `tests/integration/orders/source.test.ts`: route source-outage and streaming body-limit boundaries; node environment.
- `tests/integration/orders/permissions.test.ts`: real local PostgreSQL/RLS ownership, suspension history and forbidden write checks; node environment.
- `tests/e2e/orders/fixtures.ts`: isolated synthetic customers/cafés/menu/hours and retained-order states, using existing local-only harnesses.
- `tests/e2e/orders/creation.spec.ts`: creation, snapshots, submissions, selection and role/ownership boundaries.
- `tests/e2e/orders/reads-cancellation.spec.ts`: reads, pagination, cancellation states, cross-workspace isolation and actual suspension integration.
- `tests/e2e/orders/transport.spec.ts`: HTTP schemas/errors and café-specific item-write fault injection with finally-cleanup.
- `tests/e2e/orders/pages.spec.ts`: actual pre-order/My orders flows, payment-at-pickup, Singapore rendering and inert public reasons.
- This report.

No devDependencies added. Existing tests/fixtures/configuration are unchanged; browser artifacts remain under ignored `.next/playwright-results/`.

## Interfaces defined by tests

The only new product module interface defined by tests is:

```ts
// src/server/orders/pickup.ts
type OpeningInterval = {
  weekday: number; opensAt: string; closesAt: string; closesNextDay: boolean;
};
export function pickupSlots(
  hours: OpeningInterval[],
  cutoffMinutes: number | undefined,
  now: string,
): string[];
```

`undefined` means the specified default 15-minute cutoff; results are chronological UTC strings ending in Z. Domain HTTP schemas/paths are taken directly from the merged Customer pickup/order boundary, not invented by tests.

Source tests use the existing verified-actor and session-bound-client boundaries; they force a session-client outage and expect safe 503. Body tests use the existing trusted-origin adapter mock and request streams with no Content-Length header. Browser controls are discovered by accessible drink quantity names, pickup combobox name and place-order/cancel buttons, without CSS-class assertions. History fixtures use snake_case order snapshot/lifecycle field vocabulary and resolve item-name/profile-name aliases; absent storage fails explicitly or at fixture SQL setup rather than installing application schema.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| `git fetch origin` and selected base inspection | passed | Only origin exists; master and origin/master match base above. Story history exists on origin/master, with no ASSUMPTION markers; merged PLAN/spec diff is empty. |
| `bun workflow/scripts/create-issues.ts --repo CS3227-2610-MP3-Homebrew/CS3227-2610-MP3 --tasks T-42,T-43` | passed | Both tasks print skip for existing #73/#74. No issue creation. |
| `bun run db:start` | passed after user resumed Docker | Local Supabase start succeeded; generated credentials omitted. |
| `bun run db:check` | passed | Every application table has RLS. |
| `bun run verify` | expected failure | Lint/typecheck passed; 992 tests passed and only 23 new missing-module/route tests failed. Traceability/spec/build stages after tests were not reached in this command. |
| `bun run test tests/unit/orders/pickup.test.ts tests/integration/orders/source.test.ts` | expected failure | All 23 cases fail at explicit missing implementation assertions; no loader/type/tooling failure. |
| `bun run lint` | passed | Final test files: exit 0, no warnings. |
| `bun run typecheck` | passed | Final test files: route type generation and tsc exit 0. |
| `bun run test:e2e tests/e2e/orders --list` | passed | 88 tests in four files collected successfully. |
| `bun run test:e2e tests/e2e/orders --workers=2` | expected failure | Production build and isolation checks completed; Chromium ran all 88 cases, all failed on missing order routes/pages/storage. No skipped cases. |
| `bun run check:traceability` | passed independently | 36 done tasks; all listed criteria have test titles. Pair statuses remain todo. |
| `bun run check:specs` | passed independently | 0 warnings. |
| Stage-2 package manifest comparison | passed | Existing devDependencies and all other manifest fields preserved; no package.json/bun.lock diff. |
| `git status --porcelain --untracked-files=all` scope check | passed | Only the eight new scoped test/fixture files and this handoff. |

The shell had no Node.js on PATH. Initial Bun-driven Playwright loading also failed on an existing catalogue spec, and a sandboxed Node attempt could not access Docker/Supabase CLI telemetry files. Those preliminary runs were not accepted as domain evidence. Definitive checks prepended the app-bundled Node v24.19.0 directory to PATH and used approved execution outside the sandbox for local database/browser access. Commands otherwise remained the Bun scripts above; no dotenv file was read or changed and no live LLM/hosted database was used.

### Failing-first Vitest inventory

Every row below failed in both the focused run and the definitive full verify. All pickup cases fail because `src/server/orders/pickup.ts` is absent. All source/body cases fail because their named Route Handler file is absent. No behavioral assertion beyond that absence is claimed to have passed.

| Exact case title | Failure reason |
| --- | --- |
| CUS-03.2: exact Singapore grid, 15-minute lead and inclusive cutoff at 00:45:00 | Missing pickup policy module. |
| CUS-03.2: exact Singapore grid, 15-minute lead and inclusive cutoff at 00:45:01 | Missing pickup policy module. |
| CUS-03.2: exact Singapore grid, 15-minute lead and inclusive cutoff at 01:30:00 | Missing pickup policy module. |
| CUS-03.2: exact Singapore grid, 15-minute lead and inclusive cutoff at 01:30:01 | Missing pickup policy module. |
| CUS-03.2: exact Singapore grid, 15-minute lead and inclusive cutoff at 02:00:00 | Missing pickup policy module. |
| CUS-03.2: cutoff default 15 permits equality but excludes closing | Missing pickup policy module. |
| CUS-03.2: cutoff 0 permits equality but excludes closing | Missing pickup policy module. |
| CUS-03.2: cutoff 15 permits equality but excludes closing | Missing pickup policy module. |
| CUS-03.2: cutoff 30 permits equality but excludes closing | Missing pickup policy module. |
| CUS-03.2: cutoff 60 permits equality but excludes closing | Missing pickup policy module. |
| CUS-03.2: cutoff 180 permits equality but excludes closing | Missing pickup policy module. |
| CUS-03.2: Sunday overnight interval includes Monday pickup using its actual Singapore date | Missing pickup policy module. |
| CUS-03.2: adjacent intervals form one continuous opening interval before cutoff | Missing pickup policy module. |
| CUS-03.2: horizon includes today plus six Singapore dates and excludes the seventh | Missing pickup policy module. |
| CUS-03.2: no hours gives an empty choice set without invented availability | Missing pickup policy module. |
| CUS-03.2: slots use Singapore dates independently of the host timezone | Missing pickup policy module. |
| CUS-03.2 CUS-04.1: authorized source outage gives safe 503, never fabricated empty data at /api/customer/cafes/synthetic-cafe/pickup-slots | Missing named order/pickup Route Handler. |
| CUS-03.2 CUS-04.1: authorized source outage gives safe 503, never fabricated empty data at /api/customer/orders | Missing named order/pickup Route Handler. |
| CUS-03.2 CUS-04.1: authorized source outage gives safe 503, never fabricated empty data at /api/customer/orders/synthetic-order | Missing named order/pickup Route Handler. |
| CUS-03.8 CUS-04.8: /api/customer/orders bounds a 65536-byte body without Content-Length | Missing named order/pickup Route Handler. |
| CUS-03.8 CUS-04.8: /api/customer/orders bounds a 65537-byte body without Content-Length | Missing named order/pickup Route Handler. |
| CUS-03.8 CUS-04.8: /api/customer/orders/synthetic-order/cancel bounds a 65536-byte body without Content-Length | Missing named order/pickup Route Handler. |
| CUS-03.8 CUS-04.8: /api/customer/orders/synthetic-order/cancel bounds a 65537-byte body without Content-Length | Missing named order/pickup Route Handler. |

Both tests in `tests/integration/orders/permissions.test.ts` passed on local PostgreSQL: retained own suspended history/item reads with foreign isolation, and denial of raw ownership/item/fulfilment forgery.

### Browser/API failure inventory

F1 means absent feature routes produce a framework HTML 404 (and framework cache headers), rather than the specified JSON response; even expected-404 cases fail the exact JSON/cache contract. F2 means the absent page has no required rendered content. F3 is an unavailable history fixture surface: the baseline orders table has no pickup/name/price/lifecycle snapshots, so history setup cannot run; this is reported separately from HTTP/domain assertion failures. F4 is absent protected Customer-name storage. All are missing implementation/integration surfaces, not proof of the final business-rule assertions.

| Case (file, line and criterion-bearing title) | Observed failure class |
| --- | --- |
| tests/e2e/orders/creation.spec.ts:6:5 › CUS-03.1 CUS-03.5 CUS-03.6: atomic own pending purchase uses verified identity and immutable SGD snapshots | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:21:5 › CUS-03.1: normalized replays and concurrent identical submissions create exactly one purchase | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:36:5 › CUS-03.1 CUS-04.2: replay after cancellation retains its state and never revives the order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:31:5 › CUS-03.1: concurrent different content with one key creates one order and returns one conflict | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:63:17 › CUS-03.2 CUS-03.6: off-grid creates no order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:42:5 › CUS-03.2: slots come from current hours, use a strict chronological grid and become stale after rule changes | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:63:17 › CUS-03.2 CUS-03.6: past creates no order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:63:17 › CUS-03.2 CUS-03.6: seconds creates no order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:63:17 › CUS-03.2 CUS-03.6: beyond horizon creates no order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:63:17 › CUS-03.2 CUS-03.6: invalid date creates no order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:63:17 › CUS-03.2 CUS-03.6: price mismatch creates no order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:63:17 › CUS-03.2 CUS-03.6: non-UTC creates no order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:72:53 › CUS-03.8: invalid quantity 0 is rejected without mutation | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:67:5 › CUS-03.2: slot inside the 15-minute database lead is invalid | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:72:53 › CUS-03.8: invalid quantity 1.5 is rejected without mutation | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:72:53 › CUS-03.8: invalid quantity 21 is rejected without mutation | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:72:53 › CUS-03.8: invalid quantity "2" is rejected without mutation | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:72:53 › CUS-03.8: invalid quantity null is rejected without mutation | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:76:34 › CUS-03.8: 21 item lines violates the 1 to 20 bound | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:76:34 › CUS-03.8: 0 item lines violates the 1 to 20 bound | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:86:5 › CUS-03.8: duplicate item references are rejected rather than merged | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:80:5 › CUS-03.1: inclusive maximum 20 distinct lines and quantity 20 can be purchased | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:90:5 › CUS-03.3: stale approval or suspension denies new work with indistinguishable 404 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:98:5 › CUS-03.4: absent, other-cafe and other-workspace items disclose nothing and persist no partial lines | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:106:5 › CUS-03.1 CUS-03.6: sold-out and removed selections fail without consuming the submission key | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:115:110 › CUS-03.4 CUS-03.5 CUS-03.8: caller-supplied customerId cannot extend the strict contract | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:115:110 › CUS-03.4 CUS-03.5 CUS-03.8: caller-supplied workspaceId cannot extend the strict contract | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:115:110 › CUS-03.4 CUS-03.5 CUS-03.8: caller-supplied orderId cannot extend the strict contract | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:115:110 › CUS-03.4 CUS-03.5 CUS-03.8: caller-supplied customerName cannot extend the strict contract | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:115:110 › CUS-03.4 CUS-03.5 CUS-03.8: caller-supplied unitPriceCents cannot extend the strict contract | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:115:110 › CUS-03.4 CUS-03.5 CUS-03.8: caller-supplied state cannot extend the strict contract | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:119:5 › CUS-03.5: missing or invalid protected profile name conflicts without persisting order or key | F4: required protected profile-name field is absent. |
| tests/e2e/orders/creation.spec.ts:129:59 › CUS-03.7 CUS-04.7: anonymous cannot create/read/cancel orders or read pickup slots | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:129:59 › CUS-03.7 CUS-04.7: owner cannot create/read/cancel orders or read pickup slots | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:129:59 › CUS-03.7 CUS-04.7: admin cannot create/read/cancel orders or read pickup slots | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/creation.spec.ts:135:5 › CUS-03.1 CUS-03.5: the same submission key belongs independently to each verified customer | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/pages.spec.ts:37:5 › CUS-04.1 CUS-04.3 CUS-04.5: suspended history and owner rejection render inert reasons, exact dollars and retained timestamps | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/pages.spec.ts:8:5 › CUS-03.1 CUS-03.2 CUS-03.6 CUS-04.1 CUS-04.2: customer selects drinks and Singapore pickup, pays at pickup and cancels from My orders | F2: customer order page/content is absent. |
| tests/e2e/orders/pages.spec.ts:59:5 › CUS-03.2: no valid pickup slots prevents a purchase and explains unavailable choices | F2: customer order page/content is absent. |
| tests/e2e/orders/pages.spec.ts:67:5 › CUS-04.1: empty My orders provides an explicit empty state | F2: customer order page/content is absent. |
| tests/e2e/orders/reads-cancellation.spec.ts:7:5 › CUS-04.1: own snapshot history paginates 20 by placement descending then reference, with exact projection | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:19:5 › CUS-04.1: an empty own collection is a successful empty page | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/reads-cancellation.spec.ts:23:5 › CUS-04.2: pending cancellation retains items, sets one server timestamp and no suspension reason | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/reads-cancellation.spec.ts:30:95 › CUS-04.3: accepted cannot be manually cancelled, including a repeat | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:30:95 › CUS-04.3: ready cannot be manually cancelled, including a repeat | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:30:95 › CUS-04.3: collected cannot be manually cancelled, including a repeat | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:30:95 › CUS-04.3: rejected cannot be manually cancelled, including a repeat | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:30:95 › CUS-04.3: cancelled cannot be manually cancelled, including a repeat | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:35:5 › CUS-04.2: simultaneous duplicate cancellations admit exactly one pending transition | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:42:5 › CUS-04.4 CUS-04.6: missing, same-workspace foreign, main and other-kit orders share the 404 boundary | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:58:5 › CUS-04.5: actual authorized suspension cancels outstanding own history, preserves terminal purchases and never revives | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/reads-cancellation.spec.ts:82:5 › CUS-03.1 CUS-03.3 CUS-04.5: concurrent creation and real suspension leave no outstanding order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/reads-cancellation.spec.ts:94:5 › CUS-03.1: a submission key replay from another customer in the same workspace cannot disclose the order | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/reads-cancellation.spec.ts:102:5 › CUS-04.7: wrong-role callers cannot obtain order pages with protected snapshot content | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:13:17 › CUS-03.8 CUS-04.8: missing origin gives exact transport error without mutations | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:13:17 › CUS-03.8 CUS-04.8: foreign origin gives exact transport error without mutations | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:13:17 › CUS-03.8 CUS-04.8: malformed origin gives exact transport error without mutations | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:13:17 › CUS-03.8 CUS-04.8: non-JSON gives exact transport error without mutations | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:13:17 › CUS-03.8 CUS-04.8: malformed JSON gives exact transport error without mutations | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:13:17 › CUS-03.8 CUS-04.8: oversized UTF-8 gives exact transport error without mutations | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:13:17 › CUS-03.8 CUS-04.8: array gives exact transport error without mutations | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:19:121 › CUS-04.8: cancellation requires exactly empty object, rejects state | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:19:121 › CUS-04.8: cancellation requires exactly empty object, rejects cancellationReason | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:19:121 › CUS-04.8: cancellation requires exactly empty object, rejects customerId | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:23:95 › CUS-03.8: missing required cafeId is invalid | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:23:95 › CUS-03.8: missing required items is invalid | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:23:95 › CUS-03.8: missing required pickupAt is invalid | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:23:95 › CUS-03.8: missing required submissionKey is invalid | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:23:95 › CUS-03.8: missing required expectedTotalCents is invalid | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:28:7 › CUS-03.8: strict cafeId rejects 😀😀😀😀😀😀😀😀😀😀 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:28:7 › CUS-03.8: strict cafeId rejects  | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:28:7 › CUS-03.8: strict expectedTotalCents rejects -1 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:28:7 › CUS-03.8: strict expectedTotalCents rejects 1.5 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:28:7 › CUS-03.8: strict expectedTotalCents rejects 9007199254740992 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:28:7 › CUS-03.8: strict expectedTotalCents rejects 1025 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:28:7 › CUS-03.8: strict submissionKey rejects ABCDEFAB-1234-4234-8 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:28:7 › CUS-03.8: strict submissionKey rejects not-a-uuid | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:37:5 › CUS-03.8 CUS-04.8: unsupported methods advertise allowed methods with exact JSON errors | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:32:5 › CUS-03.8: nested item objects reject unknown fields and non-string references | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:44:126 › CUS-04.1: strict order-list query rejects page=0 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:44:126 › CUS-04.1: strict order-list query rejects page=01 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:44:126 › CUS-04.1: strict order-list query rejects page=-1 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:44:126 › CUS-04.1: strict order-list query rejects page=1.5 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:44:126 › CUS-04.1: strict order-list query rejects page=9007199254740992 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:44:126 › CUS-04.1: strict order-list query rejects page=1&page=2 | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:47:5 › CUS-03.2 CUS-04.1: detail and pickup reads accept no query, and paths enforce Ref bounds | F3: unavailable order snapshot fields; history setup fails before HTTP. |
| tests/e2e/orders/transport.spec.ts:44:126 › CUS-04.1: strict order-list query rejects unknown=x | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |
| tests/e2e/orders/transport.spec.ts:51:5 › CUS-03.1: transactional item failure returns safe 500 and rolls back order, lines and successful-key admission | F1: missing customer order/pickup route; framework 404 HTML replaces the contracted response. |

## Open issues for the next step

- Implementation is absent. Neither task is marked done and the pair is not merge-ready.
- T-29's suspension endpoint exists and is invoked by the CUS-04.5 cases; customer display integration cannot execute until retained order snapshot fields/routes exist. Suspension/audit rollback transaction assertions remain with T-28/T-29 rather than being duplicated here.
- OWN-05 acceptance and collection writers are not implemented. A true owner acceptance-versus-customer-cancel race and collection-versus-suspension HTTP race cannot yet be exercised. No owner API or generic Customer/Admin fulfilment permission was invented. Deterministic lifecycle fixtures cover the Customer state denials; concurrent customer-cancel and creation/suspension races are authored. Future owner integration remains an explicit verification gap.
- The merged CUS-03 contract requires the verified Customer profile name. Baseline profiles/registration currently have no name field. F4 identifies that integration prerequisite; successful order fixtures supply the protected name when storage exists. End-to-end registration-to-order name capture is not proven by this pair's fixture-based tests.
- Owner menu removal and settings screens are also not required for these tests: direct local fixtures model current price/hours/sold-out/removal state. Integration through future owner writers remains separate.
- The orchestrator's next gate is human review and commit of the tests before T-43 implementation. No git commit/push/PR/deploy action was performed.

## Suspicious content found

None.

## Human corrections

The user selected single-agent mode and resumed manually paused Docker Desktop. No specification corrections.

## Review responses

None; no independent review round has run.

## Notes for reflection

- **What worked:** Black-box routes/browser flows and real local RLS checks keep shared actor/workspace and suspension responsibilities visible; 992 existing/new prerequisite tests passed.
- **What needed guidance:** Human mode selection and Docker resume were needed. Tooling needed the bundled Node runtime and approved local Docker access.
- **What to change in the agent or skill:** Document the Node-on-PATH prerequisite for Bun scripts invoking Playwright/Vitest; no skill or agent files changed in this run.

