# Testing report

- **Agent:** testing
- **Issue:** #48, T-17; delivery alias defect follow-up
- **Spec IDs:** SYS-07.1
- **Date:** 2026-10-19
- **Branch:** fix/48-dev-alias-api
- **Base commit:** 0c51bccad4992c5a32383c1880f3908f71112f34 (coordinating-session fetch/branch evidence)
- **Status:** completed

## Summary

Widened the static delivery validator to accept the alias REST API alongside the
existing `vercel alias set` form and shorthand. Added synthetic positive and
negative fixtures for the API request, credential placement, token arguments,
HTTP error handling, org binding, alias body and production exclusion. The
repository's unchanged CLI workflow still passes. No dependencies were added.
No workflow, specification or PLAN file changed; both existing task statuses
remain `done`.

This follow-up deliberately has no failing-first repository run: the defect is
hosted-only, and static tests cannot reproduce it. The human reported hosted run
39224174089 deployed successfully and then failed with `Error: User not found.`
The supplied diagnosis is that the CLI alias command reads `/v2/user`, which the
project-scoped token cannot read; the human also reported a successful alias API
request with that same token. These are human-supplied observations, not agent
verification. This report makes no claim that the hosted defect is fixed.

## Acceptance criteria

All test titles below carry SYS-07.1. Existing delivery checks remain in place.

| Criterion / Given–When–Then case | Status | Evidence |
| --- | --- | --- |
| SYS-07.1: given the current repository workflows, when statically inspected, then development/production mappings, credentials and ordering still pass | completed | `development has one environment-bound Actions migration and deployment job`, production counterpart, workflow-hygiene and vercel.json tests passed. |
| SYS-07.1: given a captured deployment and selected org, when POSTing the fixed alias body with failure-aware curl and stdin authorization, then accept the API form | completed | `accepts the API alias with a captured host, org query, fixed JSON and stdin authorization`; fixtures exercise scheme removal and `teamId=$VERCEL_ORG_ID`. |
| SYS-07.1: given stdin header input, builtin printf config input or a config file, when authorization avoids external process arguments, then accept | completed | `accepts an authorization header file as curl stdin`, `accepts builtin printf piping authorization to curl config stdin`, `accepts authorization from a fixed curl config file`. |
| SYS-07.1: given token expansion in external process arguments, when inspected, then reject | completed | `rejects API token passed in curl argv fixture`, `rejects API token passed in deployment argv fixture`, `rejects API token passed to an external header writer fixture`. |
| SYS-07.1: given missing or swallowed curl failure handling, when inspected, then reject | completed | `rejects API missing HTTP failure flag fixture`, `rejects API swallowed HTTP failure fixture`. |
| SYS-07.1: given missing/unrelated teamId, an overridden org binding or an unrelated deployment host, when inspected, then reject | completed | `rejects API missing teamId fixture`, `rejects API unrelated teamId fixture`, `rejects an API step overriding the selected org variable`, `rejects API uncaptured deployment host fixture`. |
| SYS-07.1: given a wrong alias or method, when inspected, then reject | completed | `rejects API wrong alias domain fixture`, `rejects API missing POST fixture`. |
| SYS-07.1: given a secret expression outside API-step env, job-wide token or absent API-step token env, when inspected, then reject | completed | `rejects API direct secret expression in request fixture`, `rejects an API token secret at job scope`, `rejects an API step without its token env binding`. |
| SYS-07.1: given missing header input or a quoted heredoc that cannot expand the token, when inspected, then reject | completed | `rejects API wrong authorization input fixture`, `rejects API quoted non-expanding header heredoc fixture`. |
| SYS-07.1: given a production CLI or API alias call, when inspected, then reject | completed | Existing `rejects production dev alias fixture`; new `rejects an API alias call in production` and `rejects a production API alias even when its body hides the dev domain`. |
| T-17 hosted-verification boundary | completed | Hosted settings, public alias reachability and project-token authorization remain unavailable to agents. No hosted requests, deployment commands, database access or live LLM calls occurred. |

## Files changed

- `tests/unit/delivery/workflow-contract.ts`: REST alternative, fixed-body and
  captured-host/org checks, failure flag, step-env token binding, supported
  stdin/file header forms, external-process token-argument rejection and
  production API-alias exclusion.
- `tests/unit/delivery/workflow-fixtures.ts`: synthetic REST request and complete
  API workflow fixture with a fake token binding reference only.
- `tests/unit/delivery/delivery.test.ts`: positive/negative REST fixture cases;
  every new test is named with SYS-07.1.
- `workflow/handoffs/48-delivery-workflows/11-testing.md`: this report.

## Interfaces defined by tests

None. The tests inspect YAML and JSON configuration through the existing static
validator; they add no application/module contract for implementation.

## Dependencies added

None. Installed Vitest and YAML tooling sufficed. No package.json or bun.lock edits.

## Checks run

Final-code verification:

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | Pass, exit 0 | Lint, typecheck, 8 test files / 213 tests, traceability, spec validation, source isolation, production build and client-artifact isolation all passed. |

Relevant actual output:

```text
$ bun run lint && bun run typecheck && bun run test && bun run check:traceability && bun run check:specs && bun run build
$ eslint
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
$ vitest run --passWithNoTests
Test Files  8 passed (8)
     Tests  213 passed (213)
$ bun workflow/scripts/check-traceability.ts
Traceability passed (7 done tasks; all listed criteria have test titles).
$ bun workflow/scripts/check-specs.ts
Spec check passed (0 warning(s)).
$ bun run check:isolation && next build --webpack && bun run check:isolation:artifacts
$ bun scripts/check-isolation.ts
Isolation check passed (application sources).
✓ Compiled successfully in 1191ms
✓ Generating static pages using 5 workers (4/4) in 512ms
$ bun scripts/check-isolation.ts --artifacts
Isolation check passed (35 client artifacts and application sources).
```

Vitest emitted its existing vite-tsconfig-paths advisory; no tooling changes
were made. No checks in `verify` were skipped or not reached. Browser E2E was
not run: this assignment contains only static workflow checks, no browser cases.
No Git commands were run by the testing agent; base evidence came from the
coordinating session.

## Open issues for the next step

The current workflow still uses the accepted CLI alias form. The hosted defect
therefore remains present pending implementation and human hosted verification.
Static validation recognizes a limited, explicit shell grammar: a captured
`vercel deploy --prebuilt` URL, parameter-expansion scheme removal, a literal
API endpoint with the selected org query, a fixed JSON alias body, curl failure
flags, and stdin/file header input. It is not a general shell interpreter and
cannot prove behavior of arbitrary shell programs or Vercel's hosted token
permissions. It performs no workflow execution. There are no missing approved
behavioral contracts for these cases and no dependency gaps.

Stage-2 manifest/scope checks are recorded separately by the coordinating session.
No implementation, reviewer, security-reviewer or docs report contents were read.
Only handoff filenames and earlier specification reports were inspected.

## Suspicious content found

None.

## Human corrections

The human requested passing static verification because the existing CLI form
remains accepted, with the hosted-only failure explicitly distinguished from
static evidence. Both requirements are reflected above.

## Review responses

None.

## Notes for reflection

- **What worked:** Positive and negative synthetic workflows exercise the same
  validator as the repository workflows without making hosted requests.
- **What needed guidance:** The human supplied the project-scoped-token defect
  evidence, secure header boundary and required stop after testing.
- **What to change in the agent or skill:** None evidenced by this run.
