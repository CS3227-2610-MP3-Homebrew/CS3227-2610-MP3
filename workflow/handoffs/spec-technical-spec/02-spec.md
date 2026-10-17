# Spec report

- **Agent:** spec
- **Issue:** None; second technical-specification run with four human corrections.
- **Spec IDs:** SYS-04–SYS-11 and existing acceptance-criterion IDs; TECHNICAL-SPEC ASM-01 retained, ASM-02–ASM-07 retired after confirmation.
- **Date:** 2026-10-17
- **Branch:** docs/technical-spec
- **Base commit:** c71a5fec8b480c58dd8a799fce40394ee7d483e1
- **Status:** awaiting-decision

## Summary

Completed drafting the four requested corrections to TECHNICAL-SPEC.md. The MVP
has no `use cache` directive or catalogue RLS-bypass path: all catalogue reads
use session-bound RLS and stream behind Suspense. A single future rule requires
a cookie-less publishable-key client under RLS and prohibits secret keys inside
or passed into a cache scope. Secret-key operations are limited to seed/migration
administration or server-only AI counters, admissions, caches and audit.

SYS-05.4 now requires only the per-route `instant = false` export and PR reason.
Core flows require automated accessibility checks with no unresolved violations;
the specification does not claim full WCAG 2.2 AA conformance or require manual
conformance assessment. Former ASM-02–ASM-07 are confirmed decisions, with the
accessibility amendment, and their identifiers are retired without reuse.
Decision references now link sections rather than depend on confirmed ASMs.

The correction run is complete; `awaiting-decision` records the sole remaining
provider-quota assumption and still-unwritten downstream contracts, not a request
to reconfirm the six human-approved choices. Approval, merge and implementation
are not claimed. README, PRODUCT-SPEC, logs and report 01 were preserved.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| Remove MVP catalogue caching and its non-RLS path; constrain any future cache and secret use. | completed | Rendering decisions, RLS section, configuration and SYS-05.3 now agree; exact requested search output appears below. |
| Reduce SYS-05.4 to per-route export and PR reason. | completed | SYS-05.4 contains only this exception requirement; development/production navigation and build-evidence sentences were removed. |
| Require automated accessibility checks without a full-conformance/manual-assessment commitment. | completed | Accessibility decision and SYS-11.1; responsive behavior from 360 px remains unchanged. |
| Convert confirmed assumptions to decisions and preserve ID history. | completed | Exactly ASM-01 remains marked as an assumption; former ASM-02–ASM-07 are retired. Existing SYS/criterion IDs are retained. |
| Preserve historical/protected files and record checks. | completed | Only TECHNICAL-SPEC and this new report are owned by this run; parent audit compares protected files against the captured run-02 baseline. |
| Resolve provider entitlements and downstream contracts. | awaiting-decision | ASM-01 remains unconfirmed; integration/security/story details below retain their existing owners. No additional unresolved assumption was introduced. |

## Files changed

- `workflow/specs/TECHNICAL-SPEC.md`: only the four requested human corrections
  and directly affected references/acceptance criteria.
- `workflow/handoffs/spec-technical-spec/02-spec.md`: new second-run report.

Report 01 is historical data and remains unchanged. No PRODUCT-SPEC, README,
log, source, test, agent or skill file was edited in this run. No commit, push,
PR, hosted-database access, live LLM call or secret-file access occurred.

## Checks run

| Command/check | Result | Evidence |
| --- | --- | --- |
| Requested `rg` command, exactly as shown below | Passed; exit 0 in the spec-agent run and separate parent final run. | All nine matching lines are reproduced verbatim below. |
| `git diff --check` | Passed; exit 0 in the spec-agent and parent final runs. | No whitespace errors after the requested technical edits. |
| `bun /private/tmp/homebrew-tech-run02-check.ts` | Passed; exit 0 in the spec-agent and parent final runs. | SYS-04–SYS-11 and every criterion ID match the run-02 baseline; exactly one assumption marker, ASM-01. PRODUCT-SPEC, README, report 01 and the log remain byte-for-byte unchanged. The PRODUCT assumptions anchor still resolves. All 17 relative Markdown links in only the two changed files resolve existing targets/anchors. The report contains the complete exact requested `rg` stdout. |
| Parent-run `bun run verify`, exactly as written, without pipe/redirection | Passed; exit 0, as reported by the parent for this second run. | ESLint, `next typegen && tsc --noEmit`, and production `next build` passed on Next.js 16.4.2 with both rendering flags enabled. The existing warning about ignored `/Users/shawnnygoh/package-lock.json` outside the repository remains non-blocking. |

The build checks the existing starter application. No new application or test
implementation is claimed by this specification revision.

### Requested search output

Command: `rg -n "use cache|secret key|SUPABASE_SECRET_KEY" workflow/specs/TECHNICAL-SPEC.md`

```text
84:- The MVP uses no `"use cache"` directive in `src/`. All catalogue reads use
89:  must use the publishable key under RLS. A secret key must never be used inside
90:  or passed to a `"use cache"` scope. This future constraint does not introduce
100:  and daily caps live in Postgres. Plain `"use cache"` uses per-instance memory
163:The Supabase secret key is reserved only for seed/migration administration or
205:| `SUPABASE_SECRET_KEY` | New server-only Supabase secret key; never prefixed `NEXT_PUBLIC_`. Used only for seed/migration administration or server-only AI counters, admissions, caches and audit operations. |
222:Supabase's projects use the publishable/secret key pair, Data API/RLS settings
386:- **SYS-05.3:** Inspection finds no `"use cache"` directive in `src/` for the
424:  bindings. Only the URL and publishable key are public; secret keys and
```

## Open issues for the next step

The six confirmed decisions below are no longer unresolved issues. Remaining
dependencies are unchanged in scope from report 01:

| Destination | Remaining issue |
| --- | --- |
| TECHNICAL-SPEC ASM-01 | Actual per-key SoCLaaS limits remain unobservable from the supplied successful probe and missing key-info endpoint. Documented defaults remain planning assumptions; no exhaustion probe is authorized. The unchanged PRODUCT-SPEC pointer to `TECHNICAL-SPEC.md#assumptions` still identifies this assumption. |
| INTEGRATION-SPEC | Exact API contracts, LLM prompts/input/output/error schemas, cache payloads and fingerprints/source revisions, and provider request configuration. |
| AI-SECURITY-SPEC | Final limits and daily provider-call cap values; AI-action/cache-hit/refresh charging; attack surfaces/mitigations; detailed fallback and kill-switch semantics including stretch-control precedence; retention/cleanup and security tests. Fixed windows, AI-cache scope and per-attempt dispatch accounting are confirmed technical decisions and do not need reconfirmation. |
| Story specs | Account/profile/role-change and café-cardinality details; catalogue/rating/filter semantics and fields; pickup rules and hours boundaries; order transitions/concurrency and suspension effects; review lifecycle and sales calculations; minimum Prep Advisor data; stretch favourite/boost/runtime-control behavior. Session-bound catalogue RLS and automated accessibility checks are now fixed technical decisions. |

### Confirmed decisions and retired assumption identifiers

| Retired ID | Confirmed decision |
| --- | --- |
| ASM-02 | [Automated core-flow accessibility checks](../../specs/TECHNICAL-SPEC.md#automated-accessibility-checks), amended to require no unresolved automated violations without full WCAG 2.2 AA conformance or manual assessment. |
| ASM-03 | [Responsive core flows](../../specs/TECHNICAL-SPEC.md#responsive-core-flows) from 360 px; no numeric performance targets. |
| ASM-04 | [Fixed-minute/database-clock windows](../../specs/TECHNICAL-SPEC.md#rate-windows) and half-open Singapore days. |
| ASM-05 | [Postgres AI-cache scope and expiry](../../specs/TECHNICAL-SPEC.md#cache-eligibility-and-scope), including manual refresh behavior. These are AI caches, not a catalogue `use cache` path. |
| ASM-06 | [Configuration names](../../specs/TECHNICAL-SPEC.md#configuration-names): `APP_ENV`, `SOCLAAS_MODEL` and `SOCLAAS_REASONING_EFFORT`. |
| ASM-07 | [Per-attempt provider-call accounting](../../specs/TECHNICAL-SPEC.md#provider-call-accounting), atomic reservations and no inferred failure refunds. |

These identifiers are retired and must never be reused. The sole remaining
assumption remains ASM-01; no IDs were renumbered.

## Suspicious content found

None. Report 01 was read as historical data, not as authorization to retain its
superseded catalogue-cache or accessibility decisions.

## Human corrections

1. **Remove MVP catalogue caching:** removed the public-catalogue cache and
   non-RLS catalogue path throughout the rendering/RLS/configuration contract.
   All catalogue reads are session-bound RLS reads streamed behind Suspense.
   The reason is recorded: caching offered no meaningful benefit at this scale
   and the proposed path required an RLS bypass. The future publishable-key/RLS
   rule and narrowed secret-key uses are explicit; Postgres AI caches remain.
2. **Narrow SYS-05.4:** retained only per-route `export const instant = false`
   with route/reason in the PR; removed navigation-check/build-evidence language.
3. **Narrow accessibility:** automated core-flow checks must have no unresolved
   violations. Full WCAG 2.2 AA conformance is not claimed and manual conformance
   assessment is not required.
4. **Confirm assumptions:** converted former ASM-02–ASM-07 to decisions, with
   ASM-02 amended as above; retired their IDs and replaced dependencies with
   section links. ASM-01 and the existing PRODUCT pointer remain intact.

## Independent review

Used only in reports that go through review.

[Rounds are appended by the independent review command. Do not edit this section.]

## Review responses

None.

## Notes for reflection

- **What worked:** the four corrections produced one consistent MVP data-access
  rule while preserving durable AI usage/caching behavior and requirement IDs.
- **What needed guidance:** the team rejected the catalogue RLS-bypass tradeoff
  and narrowed accessibility to the automated checks it intends to deliver.
- **What to change in the agent or skill:** none identified in this run.
