# Reviewer report

- **Agent:** reviewer
- **Issue:** T-04 / #35, paired with T-03 / #34
- **Spec IDs:** SYS-04.1, SYS-04.3, SYS-07.2, SYS-07.3
- **Date:** 2026-10-19
- **Branch:** shared-foundations
- **Base commit:** dd0fb3af846268b37a5624c28505f8abe9381fc8
- **Base ref:** origin/master
- **Reviewed HEAD:** 479facdcc19e3a3d36068d4a3b57cce5e3460c94, including staged, unstaged and untracked changes
- **Implementation report:** workflow/handoffs/34-runtime-configuration-import-isolation/02-implementation.md
- **Review round:** 1
- **Model:** gpt-6.1-sol
- **Reasoning:** high
- **Status:** completed
- **Handoff destination:** workflow/handoffs/34-runtime-configuration-import-isolation/03-reviewer.md

## Summary

Independently reviewed T-04’s runtime configuration, public projection, credential redaction, import/artifact checks and build configuration against the approved master contracts. Reviewed the merge-base-to-working-tree changes, including untracked implementation files. Testing-agent acceptance files are unchanged from reviewed HEAD.

Local `master` and `origin/master` resolve to the supplied base commit. The applicable specifications and PLAN match that base. Configuration-contract commit `d5f7593` is an ancestor of `origin/master`, providing the required merged-spec evidence.

**Overall:** fail

The launcher’s complete verification passed, but independent synthetic probes reproduced two gaps in the assigned credential and privileged-code isolation criteria.

Review and required verification are complete; the implementation still has blocking findings. This report does not approve a merge or deployment.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-04.1 | completed | `package.json:5` declares Bun 1.4.3; `package.json:7` selects Node 24; Next.js remains pinned to 16.4.2. `tsconfig.json` enables strict TypeScript; App Router files and Tailwind 4 remain present. `tests/unit/config/declarations.test.ts:7` covers these declarations. Launcher verification passed through the production webpack build. |
| SYS-04.3 | incomplete | `src/server/config/isolation.ts:69` enforces the OpenAI directory/server boundary, and `:75` traverses client dependencies. Meaningful positive and negative cases appear in `tests/integration/config/isolation.test.ts:9`, `:24`, `:33`, `:40` and `:53`. However, R1-002 demonstrates missed privileged operations in source and artifacts; R1-001 demonstrates missed effective credential values. |
| SYS-07.2 | completed | `src/server/config/runtime.ts:33` validates environments/providers; `:50` refuses production fake mode; `:53` refuses CI live keys; `:56` restricts local/CI database URLs; `:74` disables live AI without a key. `tests/unit/config/runtime.test.ts:6`, `:19`, `:26`, `:31`, `:36`, `:44`, `:51`, `:60`, `:76`, `:82` and `:90` meaningfully cover these behaviors. Fallback availability remains configuration capability, with story execution outside T-04. |
| SYS-07.3 | incomplete | Exact public projection is implemented at `src/server/config/runtime.ts:89`; explicit deployment-binding separation at `:105`; recursive redaction at `:124`. Tests at `tests/unit/config/runtime.test.ts:99`, `:113`, `:127`, `:141` and `:146` cover the principal cases. R1-001 reproduces an accepted credential-normalization case that escapes both redaction and artifact scanning. Hosted binding separation was not tested or claimed. |
| T-04: Configuration/import/artifact tests pass with synthetic credentials | completed | Launcher verification reports seven files and 99 passing tests. Inspection confirms meaningful assertions in the 59 T-03 cases and six supplementary cases in `tests/unit/config-internals.test.ts`. |
| T-04: `bun run verify` passes; no secrets enter client/error/audit output | incomplete | The exact verification command passed, including scanning 35 generated client artifacts. The broader absence-of-secrets requirement remains unmet because of R1-001. |

## Findings

### Blocking

- **R1-001 — P2: Credential normalization bypasses redaction and artifact detection.**  
  **Location:** [runtime.ts:116](/Users/taiayovelapang/Desktop/NUS/CS3227/MP3/src/server/config/runtime.ts:116), related to credential trimming at line 40 and output at line 86.  
  **Affected contract:** SYS-07.3, SYS-04.3 and TECHNICAL-SPEC’s Configuration requirement that secrets never appear in error/audit output or client bundles.  
  **Evidence:** `parseConfiguration` accepts a whitespace-padded `SOCLAAS_API_KEY` and returns its trimmed value. `configuredSecretValues` retains only the original, padded value. A synthetic probe using `" synthetic-trimmed-private-value "` confirmed:
  - The parsed key was trimmed.
  - `redactSensitiveOutput({ error: parsedKey }, input)` retained the effective credential.
  - `checkIsolation` returned `[]` for an artifact containing that effective credential when supplied `configuredSecretValues(input)`.
  
  **Impact:** The actual key supplied to an adapter can escape the shared error/audit sanitizer and artifact checker, despite being accepted configuration. This was reproduced with synthetic values; no live disclosure was observed. Existing redaction tests use unpadded credentials and miss the case.  
  **Fix direction:** Make credential validation, normalization and secret collection consistent. Preserve detection of both supplied and effective values, or reject surrounding whitespace. Add regression coverage for redaction and artifact detection using the accepted normalized key.

- **R1-002 — P2: Equivalent computed property syntax bypasses privileged-operation checks.**  
  **Location:** [isolation.ts:15](/Users/taiayovelapang/Desktop/NUS/CS3227/MP3/src/server/config/isolation.ts:15), used by source inspection at line 38 and artifact inspection at line 113.  
  **Affected contract:** SYS-04.3 and T-04’s privileged client import/artifact checks.  
  **Evidence:** The detector handles `client.auth.admin` and bracketed `auth`, but misses `client.auth["admin"]`. A synthetic Client Component containing:
  
  ```ts
  "use client";
  export function create(client) {
    return client.auth["admin"].createUser({
      email: "synthetic@example.com",
    });
  }
  ```
  
  produced `[]` when checked as application source and separately as a client artifact. This is the same administrative operation that the existing fixture expresses with dot notation at `tests/integration/config/fixtures/imports.ts:70`.  
  **Impact:** The new isolation gate accepts prohibited privileged-operation code in ordinary equivalent JavaScript syntax. No successful database operation or authorization bypass was exercised.  
  **Fix direction:** Inspect property-access chains consistently across dot and static bracket notation, preferably using the existing AST traversal. Add source and artifact regression cases for mixed access syntax.

### Non-blocking

None.

## Files changed

None.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| Launcher: `bun run verify` | Passed, supplied exit 0 | Read `/var/folders/bg/pvg0yl3939g0qdn7why9kjnh0000gn/T/tmp.dCzo0XMl8X/verify.log`. Lint, type generation/typecheck, 99 tests, traceability, specs, source isolation, production webpack build and scanning 35 client artifacts all passed. |
| Worker: Git status, ref, merge-base, diff and ancestry inspection | Passed | HEAD/base match supplied inputs; merge-base equals the supplied base. Approved specifications and PLAN have no working-tree changes. Acceptance-test files are unchanged from HEAD. |
| Worker: `git diff --check origin/master -- . ':!**/.env*' ':!.env*'` | Passed, exit 0 | No whitespace errors reported. |
| Worker: `bun --no-env-file -e '<synthetic in-memory probes>'` | Completed, exit 0; defects reproduced | Normalized credential probe reported `parsedKeyWasTrimmed: true`, `sanitizerLeaks: true`, `artifactViolations: []`. Computed privileged-access probe reported `sourceViolations: []`, `artifactViolations: []`. |
| Worker: code, test and installed Next.js documentation inspection | Completed | Read configuration/checker implementations, acceptance tests, supplementary tests and relevant environment-variable, server/client-boundary, CLI and CSS guides. Installed documentation supports webpack selection and the Tailwind PostCSS configuration. |

The worker did not launch `review.sh`, rerun verification, build, start a development server or run mutating checks. No browser suite, hosted configuration check, database operation or live LLM request was performed. No `.env*` files were read, printed or edited.

The synthetic probes establish helper behavior; they do not establish a live credential leak or successful privileged database access. This assessment does not replace the dedicated security review.

## Open issues for the next step

- R1-001 and R1-002 remain unresolved.
- The passing acceptance suite lacks the two reproduced boundary cases.
- Actual hosted dev/prod binding separation remains outside this local synthetic assessment.
- PLAN still records T-03 and T-04 as `todo`; this failed verdict provides no passing-review evidence for changing them to `done`.

## Suspicious content found

None.

## Human corrections

None during this assessment.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | N/A | First review round; no fixes were made by this read-only worker. |

## Notes for reflection

- **What worked:** Fresh launcher verification established a successful final-code build; independent synthetic probes exposed gaps beyond the passing fixtures.
- **What needed guidance:** None.
- **What to change in the agent or skill:** None established by this run.