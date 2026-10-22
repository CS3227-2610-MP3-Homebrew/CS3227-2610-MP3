# Reviewer report

- **Agent:** reviewer
- **Issue:** #72 / T-41, paired with #71 / T-40
- **Spec IDs:** CUS-01.1–CUS-01.11; CUS-02.1–CUS-02.9
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base ref:** origin/master
- **Base commit:** 5b026e2ea5532117d81fa05b57ca63f2bfa73a59
- **Reviewed HEAD:** 31608a9ddf0bda46877419285fe9e0e8f682138c
- **Implementation report:** workflow/handoffs/71-customer-catalogue/06-implementation.md
- **Review round:** 1
- **Model:** gpt-6.1-sol
- **Reasoning:** high
- **Status:** completed
- **Report destination:** workflow/handoffs/71-customer-catalogue/07-reviewer.md — content returned; no file written.

## Summary

Independently assessed T-41’s customer catalogue, café pages, read routes, shared helpers and additive migration, including committed tests and staged, unstaged and untracked inputs.

The approved contract was read from origin/master. Customer contract commit `35e8ab5`, shared account contract commit `522936d` and owner amendment `7f7b733` are ancestors of that ref. Local story additions provide related-contract references without changing the assigned acceptance criteria.

The launcher’s fresh verification passed all stages and 974 tests. Read-only probes nevertheless confirmed three implementation defects outside the existing test cases.

**Overall:** fail

Strict query validation, review timestamp ordering and unsupported-method responses violate approved contracts.

## Acceptance criteria

Paths below are repository-relative; line numbers identify reviewed evidence. Browser results are caller-reported evidence from `05-testing.md`, not worker executions.

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| CUS-01.1 | completed | `src/server/catalogue/source.ts:25` implements visible-rating summaries, exact-ratio ordering and pagination; migration line 30 supplies current eligible records. `tests/e2e/catalogue/http.spec.ts:18`, `:35` and `:48` cover rounding, ordering, eligibility, pagination and moderation changes. `pages.spec.ts:8` checks no AI requests. |
| CUS-01.2 | completed | `src/lib/catalogue/clock.ts:11` and `source.ts:55` apply opening-inclusive/closing-exclusive intervals; migration line 30 supplies database time. `tests/unit/catalogue/clock.test.ts:21`, `:25`, `:30` and `:35` cover boundaries, overnight/week transitions, adjacency and absent hours. |
| CUS-01.3 | completed | `src/app/customer/cafes/filters.tsx:18` uses Singapore conversion; `source.ts:55` filters at the chosen instant while line 57 calculates current card state. `clock.test.ts:38` varies host timezone; `tests/e2e/catalogue/pages.spec.ts:26` exercises the browser under America/Los_Angeles. |
| CUS-01.4 | completed | `source.ts:52` combines predicates with AND and includes sold-out menu matches. `http.spec.ts:85` tests every drink enum, nonmatches and combined predicates. |
| CUS-01.5 | incomplete | Ordinary invalid queries and area matching are covered by `http.spec.ts:71` and `:92`. However, `src/lib/catalogue/query.ts:21` silently discards `__proto__` keys, including duplicates. Confirmed by the actual-parser probe; see R1-F01. |
| CUS-01.6 | completed | `source.ts:60` performs a fresh source read; detail pages independently authorize at `src/app/customer/cafes/[cafeId]/page.tsx:9`. `http.spec.ts:78` tests suspension after browsing; `pages.spec.ts:8` exercises card navigation. |
| CUS-01.7 | completed | Migration line 46 uses the existing workspace-aware `private.cafe_permission` predicate. `http.spec.ts:7` and `:35` cover main/kit and foreign-workspace exclusion. |
| CUS-01.8 | completed | `src/app/customer/cafes/access.tsx:7` checks request-time access; `src/server/catalogue/http.ts:11` independently checks JSON access. Existing `AccountRoleShell` supplies Suspense. `tests/integration/catalogue/streaming.test.ts:19`, `rendering.test.ts:21`, `http.spec.ts:74` and `pages.spec.ts:62` provide streaming, role and protected-content evidence. |
| CUS-01.9 | completed | `cafe-card.tsx:9` keeps closed links enabled and dimmed; line 12 renders canonical next-opening/absent-schedule text. `tests/unit/catalogue/card.test.tsx:16` and `:23`, plus `pages.spec.ts:8` and `:26`, cover these behaviors. |
| CUS-01.10 | completed | `src/lib/catalogue/clock.ts:36` includes exactly 30 minutes; `cafe-card.tsx:12` renders the exact label. `clock.test.ts:21` and `:30`, and `card.test.tsx:26` and `:29`, cover transitions and labels. |
| CUS-01.11 | completed | `filters.tsx:25` removes the time predicate and line 29 resets all filters. `pages.spec.ts:8` verifies exclusion, restoration and reset with a clickable closed card. |
| CUS-02.1 | completed | `source.ts:66` supplies public detail fields and canonical menu/hour ordering; `[cafeId]/page.tsx:23` renders integer cents to two decimal places. `pages.spec.ts:44` checks exact projection/order/prices; `:58` checks empty collections. `tests/integration/catalogue/source.test.ts:16` verifies safe source failure. |
| CUS-02.2 | completed | `[cafeId]/page.tsx:23` renders every menu row and identifies sold-out items. `pages.spec.ts:44` verifies available and sold-out rows. |
| CUS-02.3 | completed | `[cafeId]/page.tsx:24` displays stored Singapore weekly times and overnight labels. `pages.spec.ts:44` runs under America/Los_Angeles; `clock.test.ts:38` independently checks timezone-independent conversion. |
| CUS-02.4 | incomplete | Migration line 40 filters visible reviews and supplies the fixed author label; `http.spec.ts:48` and `:64` cover projection, visibility and ordinary ordering/pagination. However, `source.ts:70` truncates timestamps before sorting, reversing distinct submissions within one millisecond. Confirmed using the actual `readCafe` implementation with a fake source; see R1-F02. |
| CUS-02.5 | completed | Every read obtains a fresh snapshot; migration line 42 filters current moderation state. `http.spec.ts:48` hides/restores reviews and checks subsequent ratings, visibility and unchanged original content. |
| CUS-02.6 | completed | `source.ts:63` produces the shared missing/scope result; `http.ts:24` maps it to safe JSON and `[cafeId]/page.tsx:16` handles page absence. `http.spec.ts:78` checks missing, pending, rejected, suspended and foreign records for detail/review reads. |
| CUS-02.7 | completed | `[cafeId]/page.tsx:14` and `source.ts:61` repeat current reads rather than trusting prior browse results. `http.spec.ts:78` verifies stale eligibility denial. |
| CUS-02.8 | completed | `[cafeId]/page.tsx:22`, `:23` and `:25` render domain text through React text expressions. `pages.spec.ts:44` verifies inert attack text, absence of injected elements/execution and unchanged stored review content. |
| CUS-02.9 | completed | Detail access repeats the page check at `[cafeId]/page.tsx:9`; APIs check independently at `http.ts:11`. `pages.spec.ts:62` tests anonymous/owner/admin raw HTML and DOM with stored-content/identity sentinels; `http.spec.ts:74` covers JSON denial. |
| Shared HTTP contract | incomplete | The three new route modules export only GET. Installed Next.js fallback handlers return bare 405 responses without the required error envelope, private/no-store header or `Allow`. See R1-F03. |
| Required verification | completed | Launcher `bun run verify`: exit 0, 44 files / 974 tests, all chained stages passed. `05-testing.md` reports the unchanged final browser suite passing 172/172. Review completion does not mean implementation acceptance. |

## Findings

### Blocking

1. **R1-F01 — P2 — Preserve all query keys before strict validation.**  
   **Location:** [src/lib/catalogue/query.ts:21](/Users/taiayovelapang/Desktop/NUS/CS3227/MP3/src/lib/catalogue/query.ts:21).  
   **Affected contract:** CUS-01.5; INTEGRATION-SPEC customer query rules.  
   The plain `{}` accumulator invokes the inherited `__proto__` setter instead of creating an own property. Consequently, `__proto__=x` disappears before Zod validation, and repeated instances also evade duplicate detection. The actual-parser probe returned the default browse/review query for both `__proto__=x` and `__proto__=x&__proto__=y`; ordinary `unknown=x` correctly failed. These requests proceed as valid reads instead of returning `400 INVALID_REQUEST`.  
   **Fix direction:** Use prototype-safe accumulation or validate keys directly before assignment. Add regression coverage for single and duplicate special keys in browse and review queries. Existing rejection cases at `tests/e2e/catalogue/http.spec.ts:71` omit this boundary.

2. **R1-F02 — P2 — Sort reviews without losing stored timestamp precision.**  
   **Location:** [src/server/catalogue/source.ts:70](/Users/taiayovelapang/Desktop/NUS/CS3227/MP3/src/server/catalogue/source.ts:70).  
   **Affected contract:** CUS-02.4; newest-submission-first review ordering.  
   PostgreSQL stores `submitted_at` as unrestricted `timestamptz`, and the RPC projects that timestamp directly. `readCafe` converts it through JavaScript `Date`, discarding sub-millisecond precision, before sorting. A read-only probe of the actual function supplied an older review at `.123001+00:00` with reference ending `001` and a newer review at `.123999+00:00` ending `002`. Both became `.123Z`, and the function returned Older before Newer because the reference comparator resolved the false tie. This affects page and API ordering, including pagination boundaries.  
   **Fix direction:** Order using the full stored timestamp before pagination, preferably in PostgreSQL, and preserve sufficient precision through subsequent processing. Add a case with distinct timestamps inside one millisecond. Existing `http.spec.ts:64` covers exact ties and widely separated timestamps.

3. **R1-F03 — P2 — Implement the required unsupported-method response.**  
   **Location:** [src/app/api/customer/cafes/route.ts:2](/Users/taiayovelapang/Desktop/NUS/CS3227/MP3/src/app/api/customer/cafes/route.ts:2); the detail and review route modules have the same GET-only structure.  
   **Affected contract:** INTEGRATION-SPEC, Shared HTTP boundary → Authorization and transport.  
   Unsupported methods bypass `catalogueGet`, so its JSON envelope and headers do not apply. Inspection and a read-only probe of the installed Next.js `autoImplementMethods` helper confirmed that POST, PUT, PATCH and DELETE receive status 405 with an empty body and no headers. The contract requires `METHOD_NOT_ALLOWED`, the shared correlation/error shape, `Cache-Control: private, no-store` and an `Allow` header. This is framework-dispatch evidence, not an end-to-end HTTP reproduction.  
   **Fix direction:** Supply explicit unsupported-method handling across all three routes with the specified envelope and headers. Add method-rejection coverage; the catalogue suite currently exercises GET requests only.

### Non-blocking

None.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` — launcher execution | passed | Supplied `verify.log`: exit 0; lint, type generation/typecheck, 44 test files / 974 tests, traceability, spec validation, production build and source/client-artifact isolation passed. Test duration 489.42 seconds; 114 client artifacts checked. |
| `bun run test:e2e` — caller-reported final execution | passed, reported evidence | `05-testing.md` records an unchanged full replay passing 172/172, including 44 catalogue cases. Not rerun by this worker. |
| Read-only Git status, diff, history, ref and merge-base inspection | completed | HEAD/base match supplied values; merge-base is `5b026e2`; staged diff is empty. Unstaged and relevant untracked inputs were included. |
| `git merge-base --is-ancestor` for `35e8ab5`, `522936d`, `7f7b733` against origin/master | passed | All three exited 0, confirming contract merge ancestry. |
| `git diff --check 5b026e2… -- …` with `.env*` exclusions | passed | No tracked-diff whitespace errors. This command does not validate untracked-file whitespace. |
| `node --experimental-transform-types --input-type=module -e …` — actual query parser | completed; defect confirmed | Single/duplicate `__proto__` keys were accepted in browse/review modes; ordinary unknown keys were rejected. R1-F01. |
| `node --experimental-transform-types --experimental-vm-modules --input-type=module -e …` — actual `readCafe`, fake source | completed; defect confirmed | Distinct microsecond timestamps collapsed to one millisecond and returned in the wrong order. No database/network calls. R1-F02. |
| `node --input-type=module -e …` — installed Next.js method dispatcher | completed; defect confirmed | Unsupported mutation methods returned empty 405 responses without headers. R1-F03. |
| Initial heredoc invocation of the latter probes | unavailable; replaced | The shell rejected temporary-file creation before Node ran. Both probes subsequently completed with inline `-e` scripts. |

The worker did not run `review.sh`, verification/build/browser suites, database mutations or other artifact-producing checks. Relevant installed Next.js connection, authentication-with-Cache-Components and route-handler guides were read. No `.env*` files, hosted databases or live LLM providers were accessed.

## Open issues for the next step

R1-F01–R1-F03 remain unresolved, and the recorded passing suites lack their regression cases.

`05-testing.md` also records an earlier existing SYS-05.2 invalid-session prefetch failure at `tests/e2e/auth/role-gates.spec.js:64`, with protected fixture content retained. The unchanged focused rerun and subsequent full replay passed. Its cause remains unknown; this worker did not reproduce it or attribute it to the catalogue changes.

Dedicated security review remains separate. This report grants no merge or deployment approval.

## Suspicious content found

The Node diagnostic suggested: `To eliminate this warning, add "type": "module" to …/package.json.` It was treated as diagnostic data, not authorization to change configuration. No change was made.

## Human corrections

None during this assessment. The supplied read-only boundary was followed.

## Review responses

None; this is review round 1.

## Notes for reflection

- **What worked:** Approved-master comparison and probes of actual implementation functions exposed contract gaps despite passing verification.
- **What needed guidance:** No additional human guidance was needed.
- **What to change in the agent or skill:** Include prototype-sensitive query keys, full database timestamp precision and framework-generated method responses in future boundary reviews.