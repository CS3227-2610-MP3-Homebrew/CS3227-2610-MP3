# Testing report

- **Agent:** testing
- **Issue:** #71 / T-40 harness corrections
- **Spec IDs:** CUS-01.8, CUS-02.9; linked SYS-05 streaming/confidentiality contract
- **Date:** 2026-10-22
- **Branch:** feat/71-customer-catalogue
- **Base commit:** 665bb02c2327d5e54a2da6c4f59e61d3181301b6 (application implementation remains an uncommitted input tree)
- **Status:** completed

## Summary

Corrected two testing harness defects while preserving the approved protected-content boundary. Only the assigned T-40 body was extracted from PLAN. No implementation task or implementation/reviewer report was read; handoff filenames were listed solely to choose 05-testing.md. Existing application, migration, PLAN, spec and handoff changes were preserved.

The raw stream test uses the real customer Page and Layout. The shared Layout renders the existing SignOut client component, whose useRouter hook requires Next App Router context. A minimal navigation mock now supplies only that client navigation dependency while retaining real redirect/notFound exports. Unexpected rendering errors are collected and asserted absent; only the intentional post-assertion abort is excluded. The document container models the html/body supplied by Next's root layout. The test waits for actual first-byte and source-start events, replacing the prior setImmediate timing guess. It checks that the loading shell streams while the session-bound source remains unresolved, that rendering has not completed, and that synthetic actor/workspace identities remain absent.

The page-shell tests previously rejected the café UUID supplied by the test in the request path. With an actual dynamic route, Next can serialize that caller input in routing metadata without reading or disclosing the café record. CUS-01.8/CUS-02.9 forbid protected catalogue/customer content, not the caller's own request path. The tests now create distinct stored café description/pickup address, menu text, pending/hidden review text, menu/review IDs and actor/workspace identifiers not supplied in the request. All are forbidden in raw HTML and rendered content, along with the original café-name assertion. No record payload is allowlisted or stripped from the response. No spec gap was found.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| CUS-01.8 | completed | Targeted streaming probe passes; anonymous/owner/admin browse shell cases pass with stored-record and identity sentinels. Full verify passes 974/974; final full e2e passes 172/172. |
| CUS-02.9 | completed | Anonymous/owner/admin direct-detail HTML and browser content contain no stored café/menu/review/actor markers. Requested café path parameter alone is not record disclosure. Targeted 3/3 and final full e2e 172/172 pass. |

## Files changed

- `tests/integration/catalogue/streaming.test.ts`: correct App Router client hook context and document wrapper; wait for emitted shell/source events; reveal unexpected render errors; preserve source-suspension and identity assertions.
- `tests/e2e/catalogue/pages.spec.ts`: replace caller-path UUID blanket assertion with stronger stored café/menu/review/actor markers in raw HTML and DOM, including hidden reviews.
- This new report.

No source, migration, specification, PLAN, documentation, package configuration, dependency or old-report edits. No commits or index operations. All existing criterion tests remain active, with no skips or weakened feature assertions.

## Interfaces defined by tests

No new application interface. The stream test mocks the existing next/navigation.useRouter dependency for the existing SignOut component; client replace/refresh methods are inert because this probe never performs navigation. Existing verified-actor/session-client mocks remain unchanged. The public HTTP/page routes and field confidentiality semantics remain the approved CUS-01/CUS-02 contracts.

## Checks run

Only final-code results are recorded here; intermediate harness development is explained separately below.

| Command | Result | Evidence |
| --- | --- | --- |
| Explicit Node24 PATH export, then `bun run test -- tests/integration/catalogue/streaming.test.ts` | passed | 1 file / 1 case passed; actual source spy reached; no unexpected renderer errors. |
| Explicit Node24 PATH export, then `bun run test:e2e -- tests/e2e/catalogue/pages.spec.ts --grep 'receives no protected page'` | passed | 3 cases passed in 47.5 seconds (including production web-server builds); anonymous, owner and admin inspect both browse and detail surfaces with the expanded sentinel assertions. |
| Explicit Node24 PATH export, then `bun run verify` exactly | passed | Exit 0: lint, typecheck, all 44 Vitest files / 974 tests (471.95s), traceability (32 done tasks), spec check (0 warnings), production build and source/artifact isolation (114 client artifacts) all passed. |
| Explicit Node24 PATH export, then `bun run test:e2e` exactly | failed | 171 passed, 1 existing SYS-05.2 invalid-session prefetch case failed in 3.2 minutes. All 44 catalogue cases passed. Details below; not represented as expected catalogue failure. |
| Explicit Node24 PATH export, then `bun run test:e2e -- tests/e2e/auth/role-gates.spec.js --grep 'prefetched shell cannot authorize an invalid session'` | passed | Unchanged baseline case passed alone (1 passed, 41.0s including production builds); this does not erase the first full-run failure. |
| Explicit Node24 PATH export, then `bun run test:e2e` exactly (unchanged full replay) | passed | 172/172 passed in 2.7 minutes, including all 128 baseline and 44 catalogue cases. The unchanged invalid-session prefetch case passes under the same 4-worker full-suite concurrency. No cases skipped; no baseline/application edits. |
| `git diff --check` | passed | No whitespace errors. |

Runtime setup is an explicit shell export before each Node-based test script:

```sh
export PATH=/Users/taiayovelapang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
bun run verify
```

Local Supabase only, fake/disabled AI, no live provider, hosted database or agent access to .env files. Docker/browser server commands use the normal escalation mechanism. Full browser execution follows verification sequentially because verification's schema tests reset the shared local database.

## Intermediate harness findings

After supplying navigation context, the first corrected probe reached the session source and exposed a second timing assumption: one setImmediate did not guarantee shell bytes had emitted. Waiting on a first-chunk event alone then showed React retaining a root-only Suspense tree without a document container. Adding html/body enabled emission; explicit source-start synchronization avoided racing ahead of asynchronous account verification. The final event-driven probe passes without adding delays or extending timeouts. These were test-context/timing defects, not application changes or accepted product failures.

## Open issues for the next step

All required checks pass on the final testing/application input tree: verify passed every stage and the latest full browser run passed 172/172. The assigned harness corrections are completed; no skipped or unrun required checks remain. This is not a formal implementation or security review.

One baseline observation remains outside this correction scope: the first full `bun run test:e2e` completed with 171 passing cases and one failing existing baseline case in 3.2 minutes; all 44 catalogue cases passed. Failure: `tests/e2e/auth/role-gates.spec.js:64`, SYS-05.2 invalid-session prefetch. After changing the harness cookie from customer to invalid and clicking the customer link, expected `http://127.0.0.1:3101/signed-out`, received `/customer` after 5000ms; snapshot contained the harness protected region and `private-customer-identity`. This is actual protected fixture content, not a benign route-reference echo. The unchanged affected case passed in a sequential focused rerun (1 passed, 41.0s including builds). No out-of-scope edits. The subsequent unchanged full browser replay passed 172/172 in 2.7 minutes, including this case under 4-worker concurrency. The original failure remains recorded and is not dismissed as benign; its cause is undetermined. Initial failure artifacts copied to `/tmp/t40-05-baseline-initial/` before the next runner resets its artifact directory. The testing correction does not set PLAN task statuses or approve a merge. Human review of this new testing diff remains the stage boundary.

## Suspicious content found

None. No implementation/reviewer handoff contents were read.

## Human corrections

Coordinator relayed human authorization to continue the pair and assigned only the CUS-01.8/CUS-02.9 harness corrections to testing. Router-context and caller-input observations were independently checked against current code and approved master contracts; they were not treated as reviewer instructions or permission to change application behavior.

## Review responses

None.

## Notes for reflection

- **What worked:** Event-driven shell/source synchronization and distinct database markers verify the intended boundaries without relying on framework routing internals.
- **What needed guidance:** The real shared SignOut dependency requires navigation context in a raw React renderer; caller-supplied route references are not protected record data.
- **What to change in the agent or skill:** Raw-render harnesses should expose unexpected errors and model the document/client-hook context. Confidentiality checks should use stored values absent from the request, alongside protected identities.

## Final boundary

All agent-owned test processes finished. Only the two named testing files and this new report were changed. No application, migration, specification, PLAN, documentation, configuration, dependency, old-report, commit or index changes. Existing uncommitted implementation/spec work is preserved.
