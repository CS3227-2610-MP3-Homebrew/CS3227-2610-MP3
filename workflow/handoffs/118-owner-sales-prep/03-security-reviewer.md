# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #118 (T-62), paired with #119 (T-63)
- **Spec IDs:** OWN-07.1–OWN-07.16, OWN-07-E01–E17; OWN-06 sales read where it feeds Prep Advisor; AI-SECURITY-SPEC SEC-01–SEC-09 and evaluation cases E-01–E-12 as applicable
- **Date:** 2026-10-23
- **Branch:** docs/naa-siuuuu-ff-own07-security-review
- **Base commit:** f9f0411 (pair merged in 6e905c9, PR #167; `git diff 6e905c9 HEAD` shows no changes to the reviewed files)
- **Status:** completed

## Summary

This is the first independent security review of the owner sales Dashboard and
Prep Advisor pair. The pair ran in single-agent mode, and its only review until
now was the self-review in `02-implementation.md`. The review traced every
entry point:
`POST /api/ai/prep-advisor`, `GET /api/owner/sales` and the `/owner/dashboard`
page, through `src/server/owner/{prep-advisor,sales}.ts`, the shared
`src/server/llm/` operation, cache, admission and audit modules, and the
`owner_sales` / `owner_prep_source` migration with the RLS policies and
privileged `ai_state` / `reserve_ai_usage` RPCs behind them.

I found no P0, P1 or P2 issue. Authorization, cross-café isolation, secret
handling, input validation, output validation and inert rendering all hold
under static review. The model has no write authority, and cache scope, quota
and fallback handling also hold. One P3 issue is an audit gap: the
insufficient-source and disabled-without-source fallbacks return before the
shared operation runs, so they leave no AI audit event.

## Findings

### SEC-OWN07-01 (P3): Pre-operation Prep fallbacks write no AI audit event

- **Location:** `src/server/owner/prep-advisor.ts:41-45` (`createPrepHandler`, the `!source.input` branch). Compare `src/server/llm/ai-state.ts:243-245` (`runOperation` audits every fallback) and `src/server/llm/operations.ts:105-107`. There, Brew Finder's `disabled` and `no_source_data` fallbacks go through `runOperation` and are audited.
- **Attacker capability / entry point:** Any verified owner, including a demo-kit owner, can send `POST /api/ai/prep-advisor` with its own `cafeId`.
- **Source to sink:** `readPrepSource` returns `{found: true, input: null}` when the café has sales on fewer than 7 dates or no candidate item (`supabase/migrations/20261023000200_owner_sales.sql:70-72, 85`). The handler then returns `operationFallback(... 'no_source_data' | 'disabled')` directly. It never calls `createConfiguredAiState().runOperation`, so neither `ai_state` `authorize` nor `audit` runs.
- **Violated control:** SEC-09.1 says "Authorized operations record actor/feature/time/outcome, including cache, denial and failure outcomes". OWN-07.14 says "Given any advice/fallback outcome … content-free AI audit apply". These authorized Prep outcomes produce no audit row. The same outcome class is audited for Brew Finder, and for Prep when the source is sufficient but AI is disabled.
- **Impact:** Observability and repudiation only. No provider dispatch, protected data disclosure or quota bypass follows from this path: a fallback carries no data, and the panel's top items come from the separately authorized sales read. Operators reviewing AI audit cannot see Prep panel loads for low-sales cafés, or any Prep request made while AI is disabled and the source is insufficient.
- **Reproduction (static, not executed):** Read the control flow at the lines above. `tests/integration/prep-advisor/route.test.ts:85-90` (E03/E16) asserts only that `run` is not called, and no Prep test asserts audit rows for this path.
- **Mitigations considered:** Not auditing is fail-safe for dispatch. The route never reaches admission, cache or the provider. Prep audit metadata needs scope `{cafeId, businessDate}`, and `owner_prep_source` returns `{input: null}` without a `businessDate`. A fix therefore needs a server business date for the insufficient case.
- **Confidence:** High that the path is unaudited. Medium that the spec intends this path to be audited, since SEC-09.1 does not say whether a sufficiency fallback decided before the operation counts as an "authorized operation".
- **Fix direction:** Have `owner_prep_source` return the server `businessDate` with `input: null`. Then record one content-free `fallback` event through the shared audit, with a server-generated `operationId`, actor, café and `{cafeId, businessDate}` scope, before returning `no_source_data` or `disabled`. Alternatively, a spec decision could explicitly exempt pre-source fallbacks.
- **Suggested regression coverage (testing agent):** An OWN-07.14 / SEC-09.1 case. An insufficient-source request, and the same request with AI disabled, each record exactly one `prep_advisor` `fallback` audit event with no sales, label or prompt content and no provider attempt.

No confirmed P0–P2 security findings in the reviewed scope.

## Baseline and criterion coverage

| Check / criterion | Status | Evidence |
| --- | --- | --- |
| Authentication at every entry point (SEC-01.1, OWN-07.12) | completed | Prep checks `getVerifiedActor` (Auth `getUser`, `src/server/auth/session.ts:14-21`) and then role `owner` (`prep-advisor.ts:34-36`). Sales does the same (`sales.ts:43-45`). The Dashboard checks `resolveAccountAccess` and role (`page.tsx:30-31`). |
| Cross-café / cross-workspace authorization (SEC-01.2, E07, E-01) | completed | The body `cafeId` is only a selector. `owner_prep_source` (SECURITY INVOKER) requires `c.owner_id = actor.id and c.workspace_id = actor.workspace_id`, and returns an indistinguishable `NOT_FOUND` otherwise (`migration:64-67`). Orders and lines are read under `orders_read` / `order_items_read` RLS (`20261020000000_role_matrix.sql:79-82`). `owner_sales` derives the café from the session, never from the request (`migration:32-33`). The privileged `ai_state` and `reserve_ai_usage` RPCs independently re-check owner, workspace, approved and not suspended (`20261021000000_ai_state.sql` prep branch; `20261020000001_usage_admission.sql:133-137`). |
| Least privilege / privileged-client separation | completed | Domain reads use the session client. The secret-key client (`usage-client.ts`) is allow-listed to `reserve_ai_usage` and `ai_state` only. `private.sales_owner` (SECURITY DEFINER) returns only the caller's own profile, and the `private` schema is not exposed (`supabase/config.toml` `schemas = ["public"]`). The new functions are executable by `authenticated` only (`migration:90-91`). |
| Server-only secrets (SEC-02.2) | completed | `SOCLAAS_API_KEY` is read only in `src/server/llm/transport.ts` and `operations.ts:136`. `SUPABASE_SECRET_KEY` is read only via `getConfiguration().supabase.secretKey` in `usage-client.ts`. No secret name appears under `src/` outside `src/server`. All reviewed server modules import `server-only`. `prep-panel.tsx` (client) imports only presentation helpers. |
| CSRF / request integrity (SEC-01.1, E-13) | completed | Prep requires an exact `Origin` match (`json.ts:12-14`), `application/json`, a 64 KiB bounded body and a strict Zod `{cafeId: Ref, refresh: boolean}` (`schemas.ts:123`). Sales is a parameterless GET (`sales.ts:46`) with `private, no-store` and no CORS headers. |
| Zod validation of untrusted input and DB output | completed | Request: `requestSchema`. DB output is strictly decoded by `ownerSalesSchema` and `prepInput`, and a mismatch becomes 503, never zeros (`sales.ts:28-37`). Cached and provider results go through `validateResult`. |
| Injection (SQL / XSS / redirects / SSRF) | completed | The SQL is static, with parameter comparison `c.id::text = p_cafe_ref`. The UI renders every label, reason and error as React text, with no `dangerouslySetInnerHTML`, Markdown or model-authored links in `src/app/owner/dashboard`. The provider URL comes from server configuration only, and the request uses `redirect: 'error'`. |
| Framework caching / private-cache isolation | completed | Next 16.4.2 with `cacheComponents`. Per the installed route-handler guide, GET handlers that read cookies or `request.url` run at request time. There is no `use cache` or `force-static` in scope. All responses send `Cache-Control: private, no-store`, and the page awaits `connection()`. |
| Prompt injection via item names (SEC-03, E06, E09, E-03) | completed | Item names are owner-controlled labels for the owner's own café: `m.name` from the current menu (`migration:76-77`). Customers cannot inject text, because line `item_ref` and `name` are server-derived (`20261022000002_customer_orders.sql:193-195`) and customer names are excluded. The prompt is a fixed literal, and the data travels as a separate canonical-JSON user message (`operations.ts:103, 138`). An injection crosses no boundary: the model can only choose among supplied refs. |
| Excessive agency / no model authority (SEC-05.1, E10) | completed | No tools are sent, and `tool_calls`, `function_call` and `refusal` must be empty (`schemas.ts:129-134`). The source function is `stable` and read-only. The only writes are infrastructure audit, counter and cache rows. The panel has no Apply action (`prep-panel.tsx`). |
| Sensitive data minimization (SEC-02.1, OWN-07.3, E11) | completed | The provider context is exactly `PrepInput`: date, period, and per-item/weekday aggregate quantities with labels. It holds no order IDs, customer data or other cafés (`migration:82-87`; strict `prepInput`). Errors are fixed safe strings, and the catch blocks drop details. |
| Unsafe output / evidence forgery (SEC-04, OWN-07.4, OWN-07.16, E08, E13–E15) | completed | Strict schema, unique item/weekday pairs, evidence that must match the same item's supplied aggregates, and an exact BigInt direction rule (`schemas.ts:70-92`). The reason is built by the server from copied quantities, and no model text is rendered. Cached results are re-validated against the current source (`cache-schema.ts:40-41`; `schemas.ts:91`). |
| Cache isolation (SEC-07, OWN-07.6/.7, E04, E05, E-07) | completed | The cache key binds environment, feature, scope `{cafeId, businessDate}`, input fingerprint, source revision, model and contract (`ai-state.ts:74-77`). The `ai_state` read and write path re-checks scope, owner and the current business date. Refresh bypasses the read, and only validated results are published. |
| Usage / cost bounds (SEC-06, OWN-07.9, E12) | completed | Every panel load or refresh reserves a durable actor action, plus the café refresh cap when `refresh`. Each provider attempt reserves the global, feature and per-action caps (`ai-state.ts:189-197`; usage SQL). Per call: a single fetch with no retries, 30 s timeout, 64 KiB context/response bounds and 429 mapped to `usage_limited` (`operations.ts:104, 127, 147`). |
| Disable precedence / fail-closed (SEC-08, OWN-07.8/.10/.11) | completed | Disabled or missing-key configuration returns the `disabled` fallback before admission or cache. Throws map to `unavailable`, and a source failure returns 503 (`prep-advisor.ts:38-50`). |
| Content-free audit (SEC-09.1, OWN-07.14) | completed, gap | Audited events hold metadata and token counts only (`ai-audit.ts`). The pre-operation fallbacks are unaudited (SEC-OWN07-01). |
| Retrieval, embeddings, tools, memory | excluded | Out of scope in Homebrew per the reviewer instructions. |
| OWN-13 archived-item exclusion (E17 part) | excluded | OWN-13 storage is not on master (no `archived` column in `supabase/migrations`), so there is no surface to review. |
| Dependencies / CI | excluded | The pair added no dependency or workflow change (`git show --stat 6e905c9`). |

## Files changed

- `workflow/handoffs/118-owner-sales-prep/03-security-reviewer.md` (this report only).

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git diff --stat 6e905c9 HEAD -- <reviewed paths>` | pass | No output: the reviewed code is unchanged since the pair merged. |
| Static review (`grep`/`sed`/`cat` of the files cited above) | completed | The findings and coverage table cite file:line evidence. |

Not run:

- **`bun run test <paths>` (Prep route and validation suites).** This worktree has no `node_modules`, and the reviewer instructions prohibit installing dependencies. No finding depended on executing a test; SEC-OWN07-01 is established statically.
- **Database-backed `source` and `cache` suites, and the e2e suite.** These need local Supabase and installed dependencies, which were not set up in this worktree.
- **`bun run verify`.** The reviewer instructions say not to rerun it. Verification evidence for this tree is the single-agent close-out in `02-implementation.md`. It records `bun run verify` passing on the merged tree before SR-5, and lint, typecheck and `bun run test:e2e` (720 passed) after SR-5. I did not independently confirm the PR's required `verify` CI check, because that needs network access.

## Open issues for the next step

- SEC-OWN07-01 (P3) needs either a fix in the pair's files plus a regression case, or a spec decision that pre-source sufficiency or disabled fallbacks are exempt from SEC-09.1.
- **Residual risk, pre-existing and outside this pair (unexecuted observation).** `grant update (name) on public.menu_items` (`20261020000000_role_matrix.sql:64`) lets an owner change its own menu names directly through the Data API. I found no table CHECK or trigger bounding name length, so such an update could skip `owner_menu_write`'s 2–100 bound. A name over 200 code points would make the owner's own Prep source fail `prepInput` decoding (503), or overflow the 64 KiB context into the `unavailable` fallback. The impact stays within the owner's own café, so it is not reported as a finding for this pair.
- **Residual risk.** The Prep source aggregation runs before AI admission, so a verified owner can repeat it without an AI-quota charge. Its cost is bounded to one café's 28-day window, as with the ordinary sales read. No rate limit applies to non-AI authenticated reads in the app; I found no spec requirement for one.
- **Coverage gap.** A browser test exercises the AI-mode rendering of injected labels and reasons only through the disabled fallback. The inert rendering of AI suggestions rests on static evidence (React text nodes) and the E09 validation test.

## Suspicious content found

None. The handoffs, code comments and docs contained no instructions that attempted to change scope, permissions or checks.

## Human corrections

None.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | — | — | — |

## Notes for reflection

- **What worked:** The privileged `ai_state` and `reserve_ai_usage` SQL re-checks owner, workspace and approval independently of the route, so the cross-café boundary has three layers: route, invoker RLS source and the infrastructure RPC. That made a P0/P1 easy to rule out.
- **What needed guidance:** It was unclear whether SEC-09.1 covers fallbacks decided before the shared operation starts.
- **What to change in the agent or skill:** Security review worktrees should be created with dependencies already installed, so targeted tests can confirm findings without breaking the no-install rule.
