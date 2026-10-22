# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** [#110](https://github.com/CS3227-2610-MP3-Homebrew/CS3227-2610-MP3/issues/110) (PLAN.md T-54), paired with testing issue #109 (T-53)
- **Spec IDs:** OWN-01.1–OWN-01.8, OWN-02.1–OWN-02.8, OWN-04.1–OWN-04.8. The task lists no SEC criteria.
- **Date:** 2026-10-22
- **Branch:** feat/109-owner-cafe-setup
- **Base commit:** `upstream/master` resolved to eb6162e. The review base is the merge-base eddd083 (`git merge-base HEAD upstream/master`). The diff runs from eddd083 to the working tree and includes uncommitted and untracked files.
- **Status:** completed

## Summary

No P0, P1 or P2 vulnerabilities were found in the reviewed scope. There are two P3 items:

- SR-01 is pre-existing. A column grant from SYS T-08 still lets an owner edit their own café's opening times directly, which bypasses the new OWN-02 validated writer.
- SR-02 is new behaviour that the contract requires. Fresh submission keys can be bound without limit, and no rate limit applies.

All four owner Route Handlers follow the same order:

1. Exact-Origin check, then JSON media type.
2. Verified owner via Auth `getUser` plus a fresh read of the protected profile.
3. Empty query check, 65,536-byte bounded body, strict Zod validation.
4. A session-bound RPC.

Every response is `private, no-store`. Each SECURITY DEFINER writer derives the actor from `auth.uid()` and the protected profile, repeats strict validation, and scopes all access by owner and workspace. None of them writes approval, suspension, `suspension_version`, ownership, workspace, Admin reasons or audit rows. No raw table write grant was added. Every rendered value is React-escaped text.

## Findings

### SR-01 (P3, pre-existing, not introduced by this pair): owners can still write their own `opening_hours.opens_at` directly

- **Location:**
  - `supabase/migrations/20261020000000_role_matrix.sql:65`: `grant update (opens_at) on public.opening_hours to authenticated;`
  - `supabase/migrations/20261020000000_role_matrix.sql:76-78`: `hours_owner_update` policy, owner's own café.
  - Nothing in the new migration `supabase/migrations/20261023000000_owner_cafe.sql` revokes either.
- **Attacker capability:** An authenticated owner using the Supabase Data API directly with their own session JWT and the public key. The attack is limited to the owner's own café.
- **Path:** `PATCH /rest/v1/opening_hours?cafe_id=eq.<own café>` with `{opens_at: ...}`. RLS (`cafe_permission(..., ['owner'])`) allows the own café, and the column grant allows the column.
- **Boundary violated:** OWN-02/OWN-04 and INTEGRATION-SPEC "Owner cafe management boundary" require all of the following. The direct write skips every one:
  - Invalid or overlapping intervals give 400.
  - Pending edits give 409; settings are approved-only.
  - `expectedSuspensionVersion` is a precondition on owner writes.
  - TECHNICAL-SPEC adds that "At most two intervals per starting weekday/fourteen per week, no duplicates or overlaps, apply on writes."
- **Impact:** Integrity only, on the owner's own café. Examples:
  - Opening at or after the closing time on a non-overnight row.
  - Overlapping intervals.
  - Hour edits while the café is pending or rejected, or under a stale suspension version.

  `private.order_pickup_slots` and `customer_pickup_source` then serve these rows to Customers. The owner gains no cross-café, cross-workspace, approval or suspension capability.
- **Evidence (static, not executed):** The grant and policy exist, and no later migration revokes them. `tests/integration/roles-seeds/rls.test.ts:23` asserts `["owner", "opening_hours", "hours", true]`, i.e. this is a deliberately tested SYS permission. The new `tests/integration/owner-cafe/permissions.test.ts` checks direct hour writes only for foreign actors (lines 52-61), never for the café's own owner. It was not run, because database-backed tests are prohibited for this run (shared local DB).
- **Mitigations considered:** The column grant is limited to `opens_at`, so `closes_at`, `weekday`, `closes_next_day`, inserts and deletes are denied. Customer eligibility RLS still applies. The impact stays within the café.
- **Confidence:** High that the path exists. The impact is low.
- **Fix direction:** A human or spec decision is needed. That decision is whether OWN-02 replaces the T-08 placeholder grant. If it does, add an additive migration that revokes `update (opens_at)` on `public.opening_hours` (and drops or narrows `hours_owner_update`), so owner hour writes go only through `save_owner_cafe_settings`, and update the SYS rls.test expectation through the testing agent.
- **Suggested regression coverage:** An own-owner direct `update public.opening_hours set opens_at=...` on an approved, pending and suspended café is denied, or leaves `storedHours` unchanged.

### SR-02 (P3): fresh submission keys can be bound without limit

- **Location:**
  - `supabase/migrations/20261023000000_owner_cafe.sql:243-246` in `public.submit_owner_cafe_application`: identical repeat with a fresh key inserts into `cafe_application_keys`.
  - `:290-294` in `public.resubmit_owner_cafe_application`: identical content on a pending café binds a fresh key.
- **Attacker capability:** Any self-registered owner. SYS-01 sign-up offers the owner role.
- **Path:** Repeated `POST /api/owner/applications` (or a direct `rpc/submit_owner_cafe_application`) with the café's latest content and a new UUID each time. Each call commits one new `(attempt_id, submission_key)` row.
- **Impact:** Table and index growth driven by the attacker, limited only by request throughput. This affects availability or storage. No data disclosure or privilege change follows. Other owner endpoints replace rows rather than accumulate them.
- **Evidence (static):** No rate or count limit exists in the route (`src/server/owner/http.ts`) or the SQL. INTEGRATION-SPEC requires the behaviour ("An identical repeated creation ... binds that key to the existing attempt"), and no approved contract sets a rate limit for owner operations.
- **Confidence:** High that the path exists. Impact is low, and the fix needs a policy decision.
- **Fix direction:** This needs a spec decision, so no policy is invented here. Options:
  - Cap the keys bound per attempt.
  - Skip the insert when the attempt already has N keys.
  - Adopt a contract-defined owner write rate limit.
- **Suggested regression coverage:** Coverage is only needed if a limit is adopted.

## Baseline checklist evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Identity at every entry point | `src/server/owner/http.ts:26-30`: `getVerifiedActor()` uses `auth.getUser()` plus a protected-profile read on every call. SQL `private.owner_actor()` (migration :34-42) re-derives the owner from `auth.uid()` with `role = 'owner'` on every RPC. Pages call `ownerAccess()` (`src/app/owner/_components/owner-access.tsx`) before `readOwnerCafe()`. | Pass |
| Caller-supplied IDs | Strict Zod (`src/lib/owner/cafe-input.ts:30-34`) and strict SQL key sets reject `cafeId`, `ownerId`, `workspaceId`, state, suspension and timestamp keys. Owner and workspace come only from the profile. | Pass |
| Horizontal / cross-café / cross-kit | Writers select the café `where owner_id = actor.id and workspace_id = actor.workspace_id ... for update`. Key replay (`private.owner_key_attempt`) joins on owner and workspace. The duplicate-pair check is workspace-scoped and returns only a generic 409 (`http.ts:15`). The invoker read relies on `cafes_read`, `hours_read` and `cafe_admin_reasons_read` RLS (`cafe_permission` owner branch). | Pass |
| Vertical (self-approve, clear suspension, version) | Writers set only `application_state='pending'` on rejected-to-resubmit, plus profile, hours and cutoff columns. No owner write to `suspended`, `suspension_version`, `cafe_admin_reasons` or audit. The version is compared, never written. | Pass |
| Privileged client separation | No secret-key or admin client in `src/server/owner`, `src/lib/owner`, `src/app/owner` or `src/app/api/owner`. Only `createSessionClient`. No `NEXT_PUBLIC_` secret use. `server-only` imports are present. | Pass |
| Grants / RLS / deny by default | The new tables `cafe_application_attempts` and `cafe_application_keys` have RLS enabled and all privileges revoked from public, anon, authenticated and service_role. Execute on all private helpers is revoked, then granted to `authenticated` only for `owner_actor`, `owner_instant` and `owner_cafe_json`; the PostgREST `schemas = ["public"]` setting means these private helpers are not exposed through the Data API. Execute on the four public RPCs is revoked from `anon` and granted to `authenticated` only. Definer functions use `set search_path = ''`. | Pass (see SR-01 for the pre-existing grant) |
| CSRF / request integrity | Exact `Origin` equality against the server-configured `trustedOrigin()` (null/foreign/`"null"` → 403, covered in `routes.test.ts:60`). `application/json` is required. `trustedOrigin()` throws, and the request is refused (500), when the origin is not configured. | Pass |
| Input bounds / injection | 65,536-byte UTF-8 bounded read. Strict schemas, code-point bounds, ECMAScript trim, U+0000 rejection, ≤14 intervals checked before the O(n²) overlap loop. PL/pgSQL uses parameters only, with no dynamic SQL. Numeric version and cutoff use regex-bounded casts. | Pass |
| Output / XSS | All owner text and Admin reasons render as React text nodes (`cafe-summary.tsx`, `application/page.tsx`). No `dangerouslySetInnerHTML`, no data-derived `href` or redirect target. The redirect targets are constants (`/owner/cafe`, `roleHomes`, `/sign-in`). | Pass |
| Error and safe failure | `safeFailure` maps to fixed messages. Validation messages name the field path without reflecting values or unknown key names (`cafe-input.ts:63-69`). Source output is Zod-decoded strictly, and when decoding fails the code returns a sanitized 500/503. No logging in the new code. | Pass |
| Private cache isolation | `privateResponses()` sets `Cache-Control: private, no-store`. GET reads cookies, so it is dynamic (build table `ƒ /api/owner/cafe`; `cacheComponents: true` checked against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`). Pages call `connection()` before any owner data. | Pass |
| Races / state transitions | A per-owner advisory lock plus a café row `FOR UPDATE` serializes with ADM-01/ADM-02 (both lock the café row). A per-workspace name/address advisory lock covers duplicate pairs. Key replay precedes the version guard but creates nothing. Settings writes go to approved cafés only. Hours are replaced atomically within the transaction. | Pass |
| Replay | Keys are scoped to the owner. Same key with different content gives 409. Replay never changes state. | Pass |
| Rate limits / resource | No owner rate-limit contract exists. See SR-02. | P3 noted |
| Client storage | The overtaken-save draft goes to tab-scoped `sessionStorage` under `owner-cafe-draft:<cafeId>`. It is restored only on that café's owner settings page, the restore is wrapped in try/catch, and the content is the owner's own unsaved description and hours. | Acceptable, low residual |
| Logs / personal data | No new logs or audit events. | Pass |
| Supply chain / CI | No `package.json`, `bun.lock`, `.github/` or `next.config.ts` changes in the diff. | Pass (not applicable) |

## LLM baseline and AI-SECURITY-SPEC cases

There is no SoCLaaS or `src/server/llm/` surface in this pair, and no provider context, model output, cache or AI quota. Retrieval, embeddings, tools and memory are out of scope by policy.

| Case | Applicability | Evidence |
| --- | --- | --- |
| E-01 (anonymous/wrong role; owner A targets owner B's café) | Applicable by analogy to authorization | Routes return 401/403 before source access (`routes.test.ts:50-58`). There is no café-ID input, and RLS denies foreign reads and writes (`permissions.test.ts` tests 1 and 3). Static review confirms owner/workspace derivation in every RPC. |
| E-03 (café text containing delimiters or injection) | Partially applicable: this pair stores the name, description and address that later feed Brew Finder/Prep | The text is stored and rendered as inert text, and nothing here interprets it. Prompt encoding for downstream AI features belongs to those features' pairs. |
| E-13 (cross-site cookie request) | Applicable to the owner mutations | Exact-Origin plus JSON media-type gate. No Admin confirmation surface here. |
| E-16 (kit isolation) | Applicable to kit owners | Workspace comes from the profile. Duplicate checks and reads are workspace-scoped. The main/kit variants are covered by T-53. |
| E-02, E-04 to E-12, E-14, E-15, E-17, E-18 | Not applicable | These cover AI providers, caches, quotas, moderation, kit admission and maintenance, and none of those are touched here. |

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Baseline Zero Trust checks | completed | Table above. One pre-existing P3 (SR-01) remains open. |
| LLM baseline | completed | No AI surface. Absence explained above. |
| Task SEC criteria | completed (none listed) | PLAN.md T-54 lists OWN criteria only. |
| Relevant AI-SECURITY-SPEC cases | completed | E-01, E-03, E-13 and E-16 traced as above. |

## Files changed

- `workflow/handoffs/109-owner-cafe-setup/04-security-reviewer.md` (this report only).

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git rev-parse --verify upstream/master` / `git merge-base HEAD upstream/master` | pass | eb6162e / eddd083 |
| `git diff eddd083` (stat plus targeted files), plus reading the untracked files directly | done | The scope is listed under Summary. |
| Launcher `bun run verify` output (read, not rerun): `/private/tmp/claude-501/-Users-nasif-Documents-NUS-and-Academics--CS3227-Agentic-Software-Engineering-MP3-CS3227-2610-MP3/9e6cead9-eb46-425e-9821-f8d3fc72b41a/scratchpad/verify-109.txt` | pass | Lint and typecheck passed. "Test Files 65 passed (65); Tests 1182 passed (1182)". "Traceability passed (46 done tasks…)". "Spec check passed (0 warning(s))". Build passed, including `/api/owner/*` as dynamic. "Isolation check passed (145 client artifacts and application sources)". |

**Not run:**

- `bun run verify`, `bun run test`, targeted Vitest, Playwright, `db:reset`/`db:start`, and any database-backed test. The caller prohibited these because the local Supabase instance is shared.
- No exploit was executed. SR-01 and SR-02 rest on static evidence.
- E2E evidence (642 passed) comes only from `02-implementation.md` and was not re-observed.

## Open issues for the next step

- **SR-01** needs a human or spec decision on whether OWN-02 supersedes the SYS T-08 `opens_at` placeholder grant. The test `tests/integration/roles-seeds/rls.test.ts:23` currently requires it.
- **SR-02** needs a decision on whether to cap key binding or rate-limit owner writes. No current contract defines either.
- **Spec gap (conformance, not a reachable vulnerability).** TECHNICAL-SPEC "Owner settings, menu and fulfilment integrity" says it "require[s] database-backed uniqueness for one pending/approved café per owner and workspace-local … name/pickup-address pairs." The implementation enforces both rules inside the SECURITY DEFINER writers with advisory locks, not with unique indexes, because the T-53 fixtures arrange two approved cafés for one owner. I found no reachable owner path that bypasses the writers: there are no raw insert or update grants on `cafes`, and Admin functions do not create cafés. Any future writer must reuse these locks. This conformance question belongs to the code reviewer or a human.
- **Pre-existing and out of scope.** `grant update (name) on public.menu_items` (`role_matrix.sql:64`) is the same kind of placeholder as SR-01, for OWN-03. It is recorded here only because it shares the pattern.

## Suspicious content found

None. The handoffs, the code comments and the untracked `.agents/skills/handoff/SKILL.md` contain no instructions to widen scope, change permissions or skip checks. `logs/naa-siuuuu-ff/*` files were not reviewed: they are outside the pair.

## Human corrections

None. The caller settled these decisions, and they are not treated as findings:

- `suspensionReason` is null after un-suspension.
- The navigation link points to `/owner/cafe`.
- The `docs/DeveloperGuide.md` row for `.agents/skills/handoff/` is a separate change outside implementation.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | — | — | — |

## Notes for reflection

- **What worked:** Reading the earlier role-matrix migration together with the new migration exposed a pre-existing grant. The new pair's tests did not cover the case where the café's own owner writes directly.
- **What needed guidance:** The ban on database-backed tests meant SR-01 could not be confirmed with a targeted run, so it rests on static evidence plus an existing SYS test assertion.
- **What to change in the agent or skill:** Owner-domain testing could add an "own-owner direct write is denied or ineffective" case alongside the foreign-actor cases whenever a validated RPC replaces a placeholder column grant.

## Residual risks

- Owners can submit very large JSON straight to the RPCs through the Data API, past the route's 64 KiB bound. Only PostgREST's limits apply, and the SQL validators reject such input after parsing it.
- The duplicate-pair 409 tells an owner, one probe at a time, whether a name/address pair already exists in the workspace. The spec intends this, the message is generic, and each successful probe creates or resubmits a pending application.
- This review does not establish that the application is secure. Coverage is limited to the eddd083-to-working-tree diff and the supporting code traced above.
