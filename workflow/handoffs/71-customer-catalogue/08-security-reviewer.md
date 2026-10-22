# Security reviewer report

- **Agent:** security-reviewer
- **Issue:** #72 / T-41, paired with #71 / T-40
- **Spec IDs:** CUS-01.1–CUS-01.11; CUS-02.1–CUS-02.9; baseline security review (no task-specific SEC criteria)
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** origin/master, 5b026e2ea5532117d81fa05b57ca63f2bfa73a59
- **Reviewed HEAD:** 31608a9ddf0bda46877419285fe9e0e8f682138c, including the current uncommitted catalogue implementation
- **Implementation report:** workflow/handoffs/71-customer-catalogue/06-implementation.md
- **Reviewer evidence:** workflow/handoffs/71-customer-catalogue/07-reviewer.md (round 1, completed, overall fail)
- **Status:** completed

## Summary

One confirmed **P2 pre-existing disclosure** was found in the database access boundary underlying public reviews. Ordinary Customers can select another reviewer's stable account and order references directly from the exposed reviews table. The new catalogue RPC and application responses omit those fields, but do not remove that existing access. This is not introduced by T-41.

No confirmed security vulnerability was found in the introduced catalogue code. No P0/P1 finding needs joining the current implementation fix round. R1-F01–R1-F03 remain ordinary-review defects; their observed effects do not establish prototype pollution, privilege escalation, disclosure or a mutation bypass.

Completion describes this assessment, not remediation, feature acceptance, merge or deployment approval. The existing independent review remains overall fail.

## Findings

### SR-01 — P2 — Pre-existing raw review access exposes reviewer and order references

- **Location and symbols:** `supabase/migrations/20261020000000_role_matrix.sql:60` grants table-wide SELECT on `public.reviews`; `:39` (`private.review_permission`) admits another Customer's pending/kept review on an eligible same-workspace café; `:83` applies that predicate as `reviews_read`. The protected columns are defined in `supabase/migrations/20261019000000_core_schema.sql:70`. All these statements also exist in approved `origin/master`.
- **Attacker and entry point:** An ordinary signed-in Customer, including one obtained through normal sign-up, calls the Supabase Data API directly using its own session and the public publishable key. `supabase/config.toml:5` enables the API for `public`; automatic new-table exposure being disabled does not undo the explicit SELECT grant.
- **Source to sink and boundary:** RLS admits the visible review row; the table-wide SELECT grant permits `customer_id` and `order_id`, not just the public review projection. Consequently a request equivalent to `GET /rest/v1/reviews?select=id,customer_id,order_id` can return the reviewer account UUID and private order UUID for visible reviews in that Customer's workspace. No private-schema RPC invocation or privileged key is necessary. The new RPC's fixed `Verified customer` label and explicit projection at `20261022000000_customer_catalogue.sql:40` protect its own result only.
- **Impact:** Customers can associate reviews across cafés with a stable reviewer account identifier and obtain private purchase references. This defeats the approved CUS-02 public-review boundary, which excludes account IDs, and INTEGRATION-SPEC's explicit exclusion of author references. It does not demonstrate access to account names/emails, order contents, hidden reviews belonging to others, or other workspaces.
- **Compensating controls considered:** `profiles_read_self` blocks another user's profile; `order_permission` still denies another Customer's order contents; review RLS still enforces workspace, visibility and café eligibility. These reduce severity to P2, but do not conceal the identifiers already present in the admitted review row. UUID opacity is not an anonymity control when the identifier is stable across records.
- **Evidence and confidence:** High-confidence static SQL/grant evidence, corroborated by the existing role-matrix tests' deliberate allowance of other-customer visible review rows. The HTTP reproduction above is **unexecuted**; this review did not access any database or enumerate real/synthetic customer records. No later migration inspected revokes these SELECT privileges or masks these columns.
- **Fix direction:** Establish a database projection/privilege boundary that allows customer-visible review fields and authorized own-review operations while denying another reviewer's account/order columns through direct Data API access. Preserve required session RLS and current moderation/workspace checks; changing only the new application response does not address this path.
- **Suggested testing-owner coverage:** Two Customers in one workspace: public review fields remain readable, while direct Data API selection of another reviewer's `customer_id`/`order_id` is denied or unavailable. Preserve own-review access and the existing hidden/foreign-workspace denials. References: CUS-02.4, INTEGRATION-SPEC customer catalogue boundary; baseline least privilege/data minimization. E-01/E-16 are relevant authorization analogues, not new task SEC requirements.

## Scope and approved contracts

Reviewed the three new catalogue GET route modules, `src/server/catalogue/`, `src/lib/catalogue/`, browse/detail pages and components, and `20261022000000_customer_catalogue.sql`. Inspected supporting account/session clients, role shell, database grants/policies and review integrity only to trace those boundaries. Included untracked implementation files, which `git diff --stat` alone omits.

CUS-01 and CUS-02 were read directly from approved origin/master. Linked approved INTEGRATION-SPEC customer schemas/HTTP boundary, TECHNICAL-SPEC ownership/RLS/SYS-05/SYS-06/SYS-12, and ADM-03 visibility/immutability were consulted. Local customer-story additions are related-contract links; no permission was inferred from them. AI-SECURITY-SPEC's evaluation plan was read for applicable baseline analogues. There is no missing behavior/permission decision blocking this assessment.

Installed Next.js 16.4.2 guides consulted: `01-app/01-getting-started/15-route-handlers.md`, `01-app/02-guides/authentication-with-cache-components.md`, `01-app/03-api-reference/04-functions/connection.md`, and cookie/authentication reference material. Framework examples were treated as evidence, not permission to introduce caching or change the approved rendering contract.

## Acceptance criteria and baseline coverage

Statuses below describe completion of the security assessment, not a replacement acceptance verdict for all functional criteria.

| Criterion or boundary | Status | Evidence and limits |
| --- | --- | --- |
| Identity and independent entry-point authorization; CUS-01.8/CUS-02.9 | completed | `catalogue/http.ts:11` re-verifies Auth/protected profile via `getVerifiedActor`, rejects absent/wrong-role sessions before source reads. Both pages call `customerAccess` independently of layout authorization. Session client is fresh per request and uses only the publishable key; Auth uses `getUser`, not caller metadata or cached `getSession` claims. |
| Role, workspace, ownership, current eligibility; CUS-01.6–CUS-01.7/CUS-02.6–CUS-02.7 | completed | The new source function is SECURITY INVOKER, filters current approved/non-suspended cafés with `private.cafe_permission`, and retains table RLS. Protected profiles determine identity/workspace. Supplied café references are exact string selectors over authorized records; absence/foreign/ineligible records share NOT_FOUND. Existing browser/HTTP evidence tests main/kit separation and suspension on subsequent reads. |
| Private predicate and least privilege | completed | New SECURITY DEFINER helper has an empty search path, qualified tables, no dynamic SQL or mutation, and verifies Customer/café scope before returning a visible-review membership boolean. It does not grant SELECT on other Customers' orders. Private schema is outside API exposure; public RPC is explicitly executable by authenticated only. The pre-existing table-column disclosure is separately recorded as SR-01. |
| Public review privacy/current moderation; CUS-02.4–CUS-02.5 | completed | New SQL explicitly projects public review fields and filters pending/kept, including for the caller's own hidden reviews. Fixed author label avoids profile lookup. Snapshot and database clock come from one stable SQL statement, with no saved browse authorization. Original review fields remain trigger-protected and this feature performs reads only. SR-01 concerns the separate direct-table path. |
| Untrusted inputs and injection; CUS-01.5/CUS-02.8 | completed | Zod validates query enums, numeric pages and time values before reading; strictness has R1-F01's special-key defect. Queries contain no dynamic SQL. Stored café/menu/review text renders through React text expressions; no HTML/Markdown interpreter, external fetch, shell, uploaded path or model tool sink is present. Card references are encoded into a fixed internal URL. |
| Cache and streaming isolation | completed | No use-cache directive or shared source client/cache was introduced. Runtime connection/session reads occur before protected page data; the inherited role shell supplies Suspense. All explicit JSON success/error paths use private, no-store. Installed guides confirm runtime session reads and request-time GET behavior; reported browser/streaming tests cover raw HTML and DOM content. The unresolved historical invalid-session prefetch intermittency is retained under limitations. |
| Safe failures, secrets, logs and retention | completed | Source exceptions collapse to SOURCE_UNAVAILABLE; HTTP messages/correlation UUIDs contain no source diagnostics. No logging, provider context, new credential use, telemetry payload storage or retention store was introduced. Server source modules import server-only; the client filter imports pure library modules. Launcher verification reports source and 114-client-artifact isolation passing. |
| CSRF, replay, races and state transitions | completed | Catalogue GETs contain no domain mutation or confirmation action. No same-origin mutation protection is newly required for these reads. Unsupported methods cannot invoke a domain write; R1-F03 still violates the response contract. Each subsequent read repeats current database scope; this is snapshot consistency, not a claim of instantaneous revocation of an already displayed response. |
| Request/resource bounds | completed | Query input types/pages are constrained, output pages contain at most 20 records and invalid queries ordinarily fail before source reads. The source aggregates every eligible café/menu/visible review before application pagination and has no new catalogue throttle/cancellation budget. No load attack was run; scaling concern remains unquantified, not a confirmed availability exploit or an invented SEC-06 catalogue requirement. |
| Dependencies, CI and build | completed | No dependency/lockfile, workflow, Next configuration or Supabase configuration change is present against the approved base for this pair. The source adds no new external execution/install/fetch path. No vulnerability advisory scan or repository-wide supply-chain audit was performed; no CVE claim is made. |

## LLM baseline and evaluation cases

No catalogue entry point imports `src/server/llm/`, makes a provider call, accepts model output, or adds an AI cache, tool, retrieval, embedding or persistent-memory surface. The browser evidence records no AI requests for ordinary catalogue browsing. `SOCLAAS_API_KEY` and `SUPABASE_SECRET_KEY` are not used by this feature.

| Cases | Applicability, evidence and gap |
| --- | --- |
| E-01 | Authorization principle applies to catalogue reads: direct API/page checks plus RLS, with existing anonymous/wrong-role/workspace denial evidence. AI context/cache/dispatch portions are absent. |
| E-03, E-06 | Relevant inert-content/no-agency analogues: café/menu/review instruction or script text stays React text; no URL fetch, tool, SQL, script or write sink. `tests/e2e/catalogue/pages.spec.ts:44` reports inert attack strings and unchanged stored review content. No provider injection evaluation is claimed. |
| E-07 | Current eligibility principle applies: fresh SQL snapshot on each read and no catalogue cache. Existing suspension/stale-reference coverage applies. Cross-actor AI cache reuse and generation-to-delivery behavior are absent. |
| E-11, E-12 | Safe failure/secret-isolation aspects apply: fake source failure test asserts sanitized 503 and private/no-store; reused isolation checks cover client artifacts. AI admission, context/output ceilings, cancellation and retention deadlines are absent from this feature and not reevaluated. |
| E-16 | Workspace principle applies to main/kit catalogue separation; no new Admin/role provisioning or moderation authority. Existing cross-workspace denial evidence applies. |
| E-02, E-04–E-05, E-08–E-10, E-13–E-15, E-17–E-18 | Excluded feature surfaces: no natural-language AI query, classification/output validation, model-authorized action or human confirmation, AI quotas/retries/kill switch, mutation route, kit creation or maintenance operation. No extension of those previously implemented features was audited here. |

Prompt injection, excessive agency, provider data disclosure, unsafe generated output, AI cost abuse and overreliance therefore have no reachable model path in this pair. Inert rendering, data minimization and deterministic authorization were still assessed. Review text never grants permissions.

## Independent assessment of ordinary-review findings

| Reviewer finding | Security assessment |
| --- | --- |
| R1-F01, prototype-sensitive query accumulation | Independently reproduced with the actual parser. A string assigned to the inherited `__proto__` setter is discarded; URLSearchParams supplies strings, not prototype objects. Both ordinary and JSON-looking values were accepted as defaults, but the object prototype remained unchanged and no global admin property appeared. The malformed query still reaches the same authenticated, RLS-limited catalogue. Confirmed validation defect; no established prototype pollution or authorization bypass. |
| R1-F02, sub-millisecond review chronology | Static control-flow review confirms Date normalization can collapse timestamps before sorting, as the reviewer probe reports. It can change order/page membership but not the authorized input set, visibility, rating/text integrity or write permissions. No separate security finding. |
| R1-F03, framework method envelope | GET-only route exports rely on Next's unsupported-method handling; the reviewer's installed-dispatcher probe reports empty 405 responses without the required envelope/headers. Empty rejection contains no protected response data and invokes no mutation. Missing private/no-store on this empty response does not establish private-data caching. No separate security finding. |

## Files changed

Only this new `workflow/handoffs/71-customer-catalogue/08-security-reviewer.md`. No application, SQL, tests, configuration, docs, specifications, PLAN, historical report, index or commit was changed.

## Checks run

| Command or evidence | Result | Evidence |
| --- | --- | --- |
| Read-only git status/ref/branch/diff and git show origin/master | completed | HEAD/base/branch match assignment; included modified/untracked catalogue files. Approved-base SQL confirms SR-01 predates this pair. Configuration/dependency/workflow diff is empty. |
| Targeted source, SQL, tests, contract and installed-guide reads/searches | completed | Static entry-point, session, RLS/grant, source-to-sink and absent-LLM traces described above. No database connection was made. |
| Node24 actual-parser probe (`node --experimental-transform-types --input-type=module -e …`, explicit bundled Node PATH) | completed | Both `__proto__=x` and duplicate JSON-looking/string values returned default browse query; `prototypeUnchanged: true`, `globalAdmin: false`. No file/network/database writes. |
| Latest reviewer's launcher `bun run verify` (reused, not executed by this agent) | passed, reported evidence | 07-reviewer.md: exit 0; lint, typecheck, 44 files/974 tests, traceability, spec validation, production build and source/client isolation, including 114 client artifacts. Current application tree was unchanged for this security review. |
| Final full browser replay (reused, not executed by this agent) | passed, reported evidence | 05-testing.md/06-implementation.md/07-reviewer.md report 172/172, including 44 catalogue cases, on unchanged application/tests. |

The full verify was not rerun, as required by the security-reviewer instructions. No new tests were authored; no targeted Vitest/browser/database suite was necessary to establish the static grant finding. No destructive/availability exploit, database reset, hosted database access, live AI call, external probe, dependency install, review launcher or .env file access occurred.

## Open issues for the next step

- SR-01 remains unresolved and predates the pair. Its remediation scope is distinct from the three introduced ordinary-review defects; no P0/P1 security issue requires joining the current fix round. This report does not authorize edits to another task's contracts or tests.
- R1-F01–R1-F03 still fail the approved feature/HTTP contracts despite passing existing suites. This assessment does not waive them.
- Historical 05-testing.md evidence includes one invalid-session prefetch run retaining protected fixture content, followed by focused and full unchanged passes. Cause remains unknown; no security reproduction was attempted here and no harmlessness or catalogue causation is claimed.
- Direct Data API exploitation of SR-01 was not executed. Static grants/RLS establish the permission path; deployed configuration, production records and runtime data-volume/capacity behavior were not inspected. No claim is made about application-wide security or unrelated pre-existing features.

## Suspicious content found

The Node diagnostic said: `To eliminate this warning, add "type": "module" to …/package.json.` This was treated as diagnostic data, not permission to change configuration; no change was made. Attack strings in tests and quoted instructions in prior reports were treated as untrusted test/evidence content. No input instruction was used to expand scope or skip required checks.

## Human corrections

None during this assessment. The coordinator supplied the fixed scope, immutable evidence, reuse of latest verification and report-only write boundary.

## Review responses

None; this is the pair's single dedicated security assessment. Subsequent implementation responses are assessed through ordinary review under the supplied workflow.

## Notes for reflection

- **What worked:** Tracing browser-accessible database grants separately from the new safe JSON projection exposed a pre-existing privacy gap without widening into a repository audit.
- **What needed guidance:** None beyond the supplied scope and verification evidence.
- **What to change in the agent or skill:** Keep raw Data API column access in review-privacy checks; distinguish strict-query defects from actual prototype pollution and preserve uncertainty about intermittent session/prefetch failures.
