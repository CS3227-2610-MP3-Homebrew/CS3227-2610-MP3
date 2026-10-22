# Testing report

- **Agent:** testing (Codex, single-agent mode)
- **Issue:** #54 / T-24; paired with #55 / T-25
- **Spec IDs:** SYS-12.4–SYS-12.12; SEC-10.1–SEC-10.3
- **Date:** 2026-10-22
- **Branch:** feat/54-demo-kits
- **Base commit:** 42eb7b56f52b51242d9e3052ad1abc8272dd248d (`upstream/master`)
- **Status:** completed

## Summary

Single-agent mode test authoring completed for demo kits with expected failing-first evidence. The reviewable diff contains tests and this report only. No application implementation has started. The pair is not ready to merge. The human test-commit stop precedes implementation, self-review, one independent security-reviewer run, documentation and close-out.

## Acceptance criteria

Titles below are literal strings; parameters belong to enclosing describe scopes. All new integration tests currently stop at `Missing implementation: demo-kit feature module`; `kit.test.ts` reports its cases as skipped because its shared beforeAll fails, not because a skip directive was added.

| Criterion | Status | Evidence (literal case title or named scope) |
| --- | --- | --- |
| SYS-12.4 | completed | `http.test.ts`: anonymous creation returns only three credentials in private no-store JSON; unsupported methods; exact trusted Origin; invalid/caller-controlled fields; media/body bounds. `creation.spec.ts`: anonymous sign-in offers creation; real credentials sign in normally. |
| SYS-12.5 | completed | `kit.test.ts`: three secure distinct random credentials share a code and sign in normally; plaintext passwords occur in no persisted application row, Auth metadata, cache or audit; independent creations use fresh secrets. Browser display lifetime/reload/storage and later protected-page checks. |
| SYS-12.6 | completed | `provision.test.ts`: failed Auth or seed creation leaves no workspace, published/unpublished account or domain rows; describe scopes 1, 2, 3, 4, seed. Real local Auth/SQL with injected creation/seed faults, exact before/after domain/account counts and attempted-identity checks; the seed fault is injected only after four successful identities. |
| SYS-12.7 | completed | `admission.test.ts`: concurrent instances share exactly five admissions and restart cannot restore capacity; thirty daily admissions survive window rollover and reopen only at Singapore midnight; daily last-slot race; unprivileged reservation; error/throw/malformed counters. HTTP 429/Retry-After and 503 fail-closed cases; browser retry message. |
| SYS-12.8 | completed | `kit.test.ts`: independent creations use fresh secrets without LLM traffic, logs or expiry. Local-only fetch guard rejects and records non-loopback attempts; a creation one year later preserves the first workspace/accounts. Final source/security review must additionally inspect secure RNG and absence of expiry/deletion scheduling; black-box cases cannot prove a negative about every scheduler. |
| SYS-12.9 | completed | `kit.test.ts`: approved owner café includes usable menu, sold-out item, opening hours and pickup rules; review-eligible collected orders, other states and four weeks of item sales are relative to creation. Integer quantity/price checks and relative collection timestamps. Dashboard/Prep output quality remains T-62's evidence per T-24's prerequisite. |
| SYS-12.10 | completed | `kit.test.ts`: pending second café has a separate unpublished owner without returned credentials; kit Admin can decide the unpublished owner's application with reason and audit (approve/reject scopes). |
| SYS-12.11 | completed | `kit.test.ts`: synthetic spam, abuse and instruction injection remain pending untrusted review text; no automatic Admin audit/action on creation; moderation preserves original text. |
| SYS-12.12 | completed | `kit.test.ts`: ordinary moderation requires reasons, preserves text and creates scoped audit (keep/hide/restore scopes); Admin role/profile escalation denied; separate AI user caps/shared main-kit global cap; foreign RLS and domain-RPC denial; suspension/reversal; forged foreign AI source/cache context denied without provider dispatch. Browser foreign moderation/café/AI source denial after normal Admin sign-in. |
| SEC-10.1 | completed | Same durable Postgres admission and HTTP cap cases as SYS-12.7; synthetic closed/future database clock windows reuse T-12's trusted local test-clock/RPC fixtures. |
| SEC-10.2 | completed | Auth-only/password distinction/storage scans, log capture, unpublished-owner exclusion, private/no-store exact response shape, failure sanitization, once-shown browser display. |
| SEC-10.3 | completed | Real provisioned Admin scope, escalation, ordinary reversible moderation/audit/reasons/text invariants, foreign source/cache and server endpoint denials; injection review text cannot authorize actions. Reuses foundation interfaces without claiming their owned criteria. |

## Interfaces defined by tests

`tests/integration/demo-kits/contracts.ts` defines the minimal internal module `src/server/demo-kits/index.ts` and three exports:

- `createDemoKitHandler({trustedOrigin, admission, createKit}): (Request) => Promise<Response>`. Anonymous POST, strict empty JSON object, shared HTTP conventions; provisioning output is `{accounts: [{role,email,password}]}`. Admission is invoked only after transport validation. The handler wraps success with a server-generated requestId.
- `createDemoKitAdmission({environment, rpc, limits: {perTenMinutes,perDay}, databaseClock?}): {reserve(): Promise<{admitted,retryAfter?,unavailable?}>}`. Tests use real service-role Postgres RPC calls, 5/30 limits, separate instances and a trusted construction-time local clock; production must use database time. Exhaustion supplies integer seconds until capacity can reopen. Unavailable admission is distinguished from a genuine exhausted cap.
- `provisionDemoKit({auth, rpc, now?}): Promise<{accounts}>`. Auth supplies Supabase Admin createUser/deleteUser; RPC uses the existing `{data,error}` interface. `now` is a trusted seed-date fixture option. Four account creations (including unpublished owner) and domain setup are observed through local Auth/SQL; errors reject after compensation. This is an internal test seam, not a public caller-controlled clock/authority or generic SQL endpoint.

Routes import shared primitives from `src/server/http/`; feature code belongs outside that directory, as directed by the human. No implementation files are added by testing. Secure RNG and scheduler absence also require final source inspection.

## Files changed

- `tests/integration/demo-kits/contracts.ts`: typed internal seams, request helper, explicit missing-module assertion.
- `tests/integration/demo-kits/http.test.ts`: 23 transport/credential/admission cases.
- `tests/integration/demo-kits/admission.test.ts`: 8 durable cap/rollover/permission/failure cases.
- `tests/integration/demo-kits/provision.test.ts`: 5 real-local rollback fault cases.
- `tests/integration/demo-kits/kit.test.ts`: 18 provisioned content/credential/authority/usage cases.
- `tests/e2e/demo-kits/creation.spec.ts`: 3 display, normal sign-in/server-denial and retry browser cases.
- `workflow/handoffs/54-demo-kits/01-testing.md`: this report.

No dependencies added; package.json, bun.lock and existing tests/configuration are unchanged. Vitest's existing `fileParallelism:false` serializes database suites; rollback count comparisons rely on that isolation. Run database suites without concurrent external fixture writers.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `git fetch upstream` (escalated) | passed | Branch HEAD and selected base both resolve to the commit above; clean initial working tree. |
| `bun workflow/scripts/create-issues.ts --repo CS3227-2610-MP3-Homebrew/CS3227-2610-MP3 --tasks T-24,T-25` (escalated) | passed | Both mappings reported `skip`, #54 and #55. |
| `bun run check:specs` | passed | 0 warnings; selected-base SYS-12/SEC-10 headings exist; only permitted ASM-01 assumption remains. |
| `bun run db:start` | passed | Local Supabase start succeeded; credentials omitted. |
| `bun run db:reset` | passed | Local Supabase reset succeeded against the checked-out migrations. |
| `bun run db:check` | passed | Every application table has RLS. |
| `bun run lint` | passed | No lint errors on the test tree. |
| `bun run typecheck` | passed | Next route type generation and tsc succeeded. |
| `bun run test -- tests/integration/demo-kits` (escalated) | expected failing-first | 4 failed files: 36 failed cases plus 18 cases blocked by kit beforeAll. All stop at the explicit missing feature-module assertion. No skip directive. |
| `bun run test:e2e -- tests/e2e/demo-kits` (escalated) | expected failing-first | 3 failures: POST endpoint returned 404; two browser cases waited for the absent Create demo kit control. Production build and both configured servers started. Repeated on the final test file with the same three expected failures (404 and two missing-control timeouts). |
| `bun run verify` (escalated, after local reset) | expected failing-first | Lint and typecheck passed. 51 test files passed; 4 new demo-kit files failed. 1,051 existing tests passed; 36 new cases failed at the missing-module assertion, and 18 new cases were blocked by the shared setup failure. Exit 1 at tests; traceability, spec check and build were not reached within verify. Duration 384.65s. |
| Final focused run after seed-fault setup tightening, plus `bun run lint` and `bun run typecheck` | expected failures / checks passed | Focused run repeated 36 missing-module failures and 18 setup-blocked cases; lint/typecheck passed. The seed fault now requires four successful identities before injection. No new runtime behavior or assertion was reached while the feature module is absent. |
| Earlier verify attempts | interrupted, not passing evidence | Sandbox run passed lint/typecheck then hit Docker socket failures (130 after interruption). Two escalated intermediate runs were interrupted during authoring/local-schema diagnosis (130); the completed post-reset run above supersedes them. |
| `bun run check:traceability` | passed | 38 done tasks; all listed criteria have titles. |
| TypeScript AST title check | passed | All 31 test declarations use string-literal titles, expanding to 57 cases through describe scopes. |
| manifest comparison from sdd-orchestrate | passed | Existing devDependencies and all other package fields unchanged; no lockfile diff. |

## Open issues for the next step

No authoring blocker remains. All failures in the completed verification/browser runs are expected missing implementation. The human test review/commit gate is pending; implementation has not started. The pair remains incomplete. Secure RNG cannot be established merely by sampling distinct passwords; final source/security inspection remains necessary. A new future creation preserving an older kit does not alone prove every scheduled task avoids deletion; inspect maintenance/expiry paths at final review. No public-behavior/spec decision was invented for these source-level checks.

## Suspicious content found

None. Installed Next testing guides show npm/yarn/pnpm examples; repository Bun-only rules were retained.

## Human corrections

- Human selected single-agent mode, the exact branch/pair/folder and one independent security-reviewer run after self-review, before close-out. Security P0/P1 findings receive one fix round.
- Every criterion-bearing test title is a string literal; parameters are in describe scopes.
- After the human test commit, only session/cookie/fixture-setup/timing/title/grouping corrections that remove, loosen or change no assertion are pre-approved. Each correction must be recorded here/in the next report and retained for one separate test commit. Any assertion change requires explicit human approval. No post-commit correction has occurred.
- Shared HTTP primitives belong in `src/server/http/`, feature code outside it. No live LLM calls.
- Escalated approval is required for network or `.git/` writes. No Git write occurred; stop for the human test commit, then again for final commits.

## Review responses

None; testing precedes implementation and review.

## Notes for reflection

- **What worked:** Existing local RPC/Auth/SQL fixtures support black-box effects and durable concurrent admission without hosted access or provider calls.
- **What needed guidance:** Docker socket access needs escalated execution; the sandbox's database wrapper succeeds but direct Docker test subprocesses cannot access the socket.
- **What to change in the agent or skill:** Check local Docker subprocess access before starting the full verification command to avoid recording unrelated sandbox failures.
