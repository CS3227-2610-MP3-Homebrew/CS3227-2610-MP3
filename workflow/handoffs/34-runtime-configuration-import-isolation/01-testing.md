# Testing report

- **Agent:** testing
- **Issue:** #34, T-03: Test runtime, configuration and import isolation
- **Spec IDs:** SYS-04.1, SYS-04.3, SYS-07.2, SYS-07.3
- **Date:** 2026-10-19
- **Branch:** shared-foundations
- **Base commit:** dd0fb3af846268b37a5624c28505f8abe9381fc8
- **Status:** completed

## Summary

Completed test authoring and failing-first evidence for T-03 only. There are
59 new executable cases: 3 pass and 56 fail because configuration/isolation
implementation and the deployed Node 24 declaration do not exist. No tests are
skipped or marked as expected failures. This status describes test authoring;
the application behavior is not verified and the pair is not ready to merge.

The assigned task was extracted from its heading through the next heading.
TECHNICAL-SPEC, AI-SECURITY-SPEC and INTEGRATION-SPEC exist on local `master` and
have no differences from the working copies. Only the assigned criteria and
their configuration, architecture, environment, limits/disable and fallback
contracts informed these cases. Installed Next.js Vitest and Playwright guides
were read before authoring. No implementation task/report was read; the issue's
handoff folder had no earlier reports.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-04.1 | completed | `declarations.test.ts`: installed package declarations, App Router files, strict TypeScript, Tailwind/Bun versions, deployed Node 24 selection; 3 pass, Node runtime declaration fails. `bun run verify` was executed and failed as documented. |
| SYS-04.3 | completed | `isolation.test.ts`: positive server-only LLM adapter/public imports, harmless import-like text, 10 forbidden-import graphs, 2 forbidden client artifacts, 6 secret canaries, source-map canary, and actual current `src/` graph; all 22 fail on absent checker. |
| SYS-07.2 | completed | `runtime.test.ts`: local/CI fake without live key, disabled-mode fallback capability for all environments, invalid enums, CI live-key refusal, CI fake during production compilation, production fake refusal, valid synthetic soclaas configuration, missing-key disablement, hosted and deceptive local URL denial; 25 fail on absent configuration module. |
| SYS-07.3 | completed | `runtime.test.ts`: exact public allowlist, sanitized error and nested audit/error output, distinct explicit dev/prod binding identifiers, four reused-binding refusals; 8 fail on absent configuration module. Seven isolation cases also cover credential leakage in artifacts/maps. |
| T-03 positive/negative synthetic fixtures and failing-first record | completed | Synthetic values only; all 59 cases collected by Vitest, with exact failures listed below. |
| T-03 `bun run verify` record | completed | Lint and typecheck pass; tests fail. Later verify stages did not run. |

## Files changed

- `tests/unit/config/fixtures.ts`: synthetic environment values, all explicit AI
  policy limits, credential canaries and distinct deployment-binding identifiers.
- `tests/unit/config/contracts.ts`: minimal module interfaces and deferred
  implementation loaders. Deferred loading allows lint/typecheck before the
  missing modules exist and gives individual executable failing assertions.
- `tests/unit/config/runtime.test.ts`: configuration, public projection,
  environment separation and disclosure cases.
- `tests/unit/config/declarations.test.ts`: stack/toolchain/deployed runtime cases.
- `tests/integration/config/fixtures/imports.ts`: synthetic import graphs and
  generated client-artifact strings. Invalid code remains fixture strings,
  never part of the actual application or bundle.
- `tests/integration/config/isolation.test.ts`: source/import/artifact boundary cases.
- This handoff. No devDependencies added; package files, application code,
  specifications, PLAN, guides and existing tests/configuration are unchanged.

## Interfaces defined by tests

No existing HTTP/browser surface exposes these configuration and static-import
rules. The tests define the following minimal server-module interfaces. Full
TypeScript shapes are in `tests/unit/config/contracts.ts`.

`src/server/config/runtime.ts`:

```ts
parseConfiguration(input: Record<string, string | undefined>): {
  environment: "local" | "ci" | "dev" | "prod";
  ai: {
    provider: "soclaas" | "fake" | "disabled";
    enabled: boolean;
    fallbackAvailable: boolean;
  };
  public: {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  };
};
validateDeploymentBindings(input: {
  dev: DeploymentBinding;
  prod: DeploymentBinding;
}): void;
redactSensitiveOutput(
  value: unknown,
  input: Record<string, string | undefined>,
): unknown;
```

`DeploymentBinding` contains `supabaseUrl`, `publishableKeyBinding`,
`secretKeyBinding` and `soclaasKeyBinding`, all strings. The three binding fields
are explicit environment-scoped setting identifiers, not credential contents.
Reusing each corresponding dev/prod setting is rejected; distinct settings are
accepted without attempting network validation or deducing identity from a key.
Invalid environment/provider inputs, prod fake, CI with a supplied live key and
non-local local/CI database URLs throw. Missing live key in soclaas mode returns
AI disabled with the non-AI path available. APP_ENV establishes application
identity independently of NODE_ENV, including CI production compilation.

The public projection has exactly two allowed fields. Invalid extra
public-prefixed secret names are never forwarded. `redactSensitiveOutput`
removes configured secret values from nested output, including interpolated
strings, while preserving safe request/outcome metadata. Error representation,
including enumerable fields and stack, must not echo supplied credentials.

`fallbackAvailable` describes configuration capability only. It provides no
authorization to read a domain fallback and does not prove story-specific
fallback execution or rendering. Those feature operations remain later work.

`src/server/config/isolation.ts`:

```ts
checkIsolation(input: {
  sources: Record<string, string>;
  clientArtifacts: Record<string, string>;
  secretValues: string[];
}): Array<{ path: string; message: string }>;
```

Inputs are path/content maps, enabling synthetic fixtures and an actual source
scan through the same checker. Valid graphs return no violations. Invalid
graphs/artifacts return diagnostics, with artifact diagnostics identifying the
affected artifact and never echoing credential canaries. Checks cover ESM,
dynamic import, CommonJS, re-export, package subpaths, path lookalikes,
server-only adapter enforcement and transitive client imports through a
TypeScript alias and relative barrel. Actual source collection opens code files
under `src/` only; it never opens environment files or follows symlinks.

For deployed Node selection the test observes `package.json`'s `engines.node`,
which Vercel uses to select its runtime, restricted to Node 24. The existing CI
`setup-node: 24` establishes CI tooling but alone does not establish deployment
runtime. The test accepts common bounded Node 24 selectors rather than the
execution host's version.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run verify` | Failed, exit 1 | Lint and typecheck passed. Tests: `56 failed / 27 passed (83)`, `3 failed / 2 passed` files, plus one independent jsdom worker error. Configuration tests account for 56 failures and 3 passes; existing runnable tests account for 24 passes. |
| `bun run test tests/unit/config tests/integration/config --reporter=json --outputFile=/tmp/homebrew-t03-tests.json` | Expected failure, exit 1 | 59 cases, 3 passed, 56 failed, 0 pending; no worker errors. Every new case is collected. |
| `bun run test tests/unit/plan-issues.test.ts` | Independent tooling failure, exit 1 | Existing test run alone: no tests executed, one worker-start error with jsdom's EventTarget failure, identical to full verification. No T-03 test is loaded. |
| `bun run check:traceability` | Passed, exit 0 | `Traceability passed (3 done tasks; all listed criteria have test titles).` This check assesses done tasks; T-03 remains todo in PLAN. |
| `bun run check:specs` | Passed, exit 0 | `Spec check passed (0 warning(s)).` |

Final verification evidence:

```text
$ eslint
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
$ vitest run --passWithNoTests
Test Files  3 failed | 2 passed (5)
Tests  56 failed | 27 passed (83)
Errors  1 error
error: script "test" exited with code 1
error: script "verify" exited with code 1
```

Independent tooling error, reproduced with only the existing test selected:

```text
Error: [vitest-pool]: Failed to start forks worker for test files
.../tests/unit/plan-issues.test.ts.
Caused by: TypeError: 'addEventListener' called on an object that is not a valid
instance of EventTarget.
node_modules/jsdom/lib/generated/idl/EventTarget.js:102:21
Test Files  no tests
Tests  no tests
Errors  1 error
```

The existing Vite tsconfig-paths plugin prints a migration advisory; it is not
an additional failure. Existing tooling/tests were preserved.

Within `verify`, `check:traceability`, `check:specs` and `build` were not reached
because the test stage exited 1. The first two passed only as the separately
listed commands. Build was not run. No browser cases were authored, so
`bun run test:e2e` was not run. No database or provider calls were needed.

## Open issues for the next step

- Configuration validation, deployment-binding validation, disclosure sanitizer
  and import/artifact checker are missing, as shown by the expected failures.
- The application does not yet declare deployed Node 24 in `engines.node`.
- The existing jsdom worker failure remains separate from missing implementation.
- Synthetic artifact/map scans demonstrate the checker contract only. No actual
  production app client bundle was generated or scanned; real built artifacts,
  real deployment bindings and real error/audit integration remain unproven.
  The actual current source-import graph has an executable case waiting for the
  checker. Synthetic dev/prod bindings do not establish hosted settings.
- No behavior/spec decision blocks these assigned cases. Missing APP_ENV or
  AI_PROVIDER default behavior is not assumed; the invalid-enum cases supply
  explicit invalid strings. No live credentials, hosted database, environment
  file, deployment action or live provider probe was used.
- PLAN status was left unchanged. Neither implementation nor merge readiness
  is implied by completed test authoring.

## Suspicious content found

None.

## Human corrections

The user explicitly requested activation of the testing agent for T03. The
assigned identifier resolves to T-03/#34; scope stayed testing only.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | N/A | No review invoked. |

## Notes for reflection

- **What worked:** Deferred module imports preserve lint/typecheck and identify
  absent implementation per case; the targeted run isolates all 59 new cases
  from the independent existing jsdom worker error.
- **What needed guidance:** The coordinating session requested explicit CI
  live-key refusal and distinction between CI production compilation and APP_ENV
  prod, plus independent reproduction of the existing tooling error.
- **What to change in the agent or skill:** None required by this run.

## Every failing test

Reasons shared by the following exact executed cases:

- **R1:** `Missing implementation: src/server/config/runtime.ts: expected false
  to be true`; assertion occurs before any behavior call.
- **R2:** `Missing implementation: src/server/config/isolation.ts: expected false
  to be true`; assertion occurs before scanning.
- **R3:** `engines.node` is undefined; expected a bounded Node 24 declaration.

| Test title (empty string parameters appear as a blank) | Failure reason |
| --- | --- |
| SYS-07.2: local fake mode needs no live key or network | R1 |
| SYS-07.2: ci fake mode needs no live key or network | R1 |
| SYS-07.2: local permits explicit disabled mode and retains fallback capability | R1 |
| SYS-07.2: ci permits explicit disabled mode and retains fallback capability | R1 |
| SYS-07.2: dev permits explicit disabled mode and retains fallback capability | R1 |
| SYS-07.2: prod permits explicit disabled mode and retains fallback capability | R1 |
| SYS-07.2: rejects unsupported APP_ENV  | R1 |
| SYS-07.2: rejects unsupported APP_ENV preview | R1 |
| SYS-07.2: rejects unsupported APP_ENV production | R1 |
| SYS-07.2: rejects unsupported APP_ENV LOCAL | R1 |
| SYS-07.2: rejects unsupported AI_PROVIDER  | R1 |
| SYS-07.2: rejects unsupported AI_PROVIDER openai | R1 |
| SYS-07.2: rejects unsupported AI_PROVIDER FAKE | R1 |
| SYS-07.2: CI refuses a supplied live LLM key instead of retaining it | R1 |
| SYS-07.2: a production compilation retains key-free CI fake mode when APP_ENV is ci | R1 |
| SYS-07.2: refuses fake in prod even when the database settings and synthetic key are supplied | R1 |
| SYS-07.2: dev soclaas with a synthetic key enables the configured live adapter without probing it | R1 |
| SYS-07.2: prod soclaas with a synthetic key enables the configured live adapter without probing it | R1 |
| SYS-07.2: missing soclaas key undefined disables live AI and retains the non-AI path | R1 |
| SYS-07.2: missing soclaas key  disables live AI and retains the non-AI path | R1 |
| SYS-07.2: local rejects a hosted Supabase URL without connecting | R1 |
| SYS-07.2: ci rejects a hosted Supabase URL without connecting | R1 |
| SYS-07.2: rejects misleading local Supabase hostname http://127.0.0.1.attacker.invalid:54321 | R1 |
| SYS-07.2: rejects misleading local Supabase hostname http://localhost.attacker.invalid:54321 | R1 |
| SYS-07.2: rejects misleading local Supabase hostname http://127.0.0.1@hosted-project.supabase.co:54321 | R1 |
| SYS-07.3: exposes exactly the Supabase URL and publishable key despite extra public-prefixed values | R1 |
| SYS-07.3: invalid configuration errors never reproduce credential canaries | R1 |
| SYS-07.3: redacts credential values in nested error and audit output while retaining safe metadata | R1 |
| SYS-07.3: accepts explicitly distinct dev and prod deployment bindings without key-content inference | R1 |
| SYS-07.3: rejects shared dev/prod supabaseUrl binding | R1 |
| SYS-07.3: rejects shared dev/prod publishableKeyBinding binding | R1 |
| SYS-07.3: rejects shared dev/prod secretKeyBinding binding | R1 |
| SYS-07.3: rejects shared dev/prod soclaasKeyBinding binding | R1 |
| SYS-04.1: selects Node 24 for application deployment | R3 |
| SYS-04.3: permits public imports and a server-only openai adapter confined to src/server/llm | R2 |
| SYS-04.3: import-like text in comments and ordinary strings is not an import violation | R2 |
| SYS-04.3: rejects static openai import outside the LLM directory | R2 |
| SYS-04.3: rejects dynamic openai import outside the LLM directory | R2 |
| SYS-04.3: rejects CommonJS openai import outside the LLM directory | R2 |
| SYS-04.3: rejects openai re-export outside the LLM directory | R2 |
| SYS-04.3: rejects openai package subpath outside the LLM directory | R2 |
| SYS-04.3: rejects lookalike llm directory | R2 |
| SYS-04.3: rejects LLM adapter missing a server-only boundary | R2 |
| SYS-04.3: rejects client importing openai directly | R2 |
| SYS-04.3: rejects client importing the server-only LLM adapter | R2 |
| SYS-04.3: rejects transitive client import of privileged database operations through an alias and barrel | R2 |
| SYS-04.3: rejects generated client artifact containing openai code | R2 |
| SYS-04.3: rejects generated client artifact containing privileged database operations | R2 |
| SYS-04.3 SYS-07.3: rejects client artifacts containing synthetic SUPABASE_SECRET_KEY without echoing it | R2 |
| SYS-04.3 SYS-07.3: rejects client artifacts containing synthetic SOCLAAS_API_KEY without echoing it | R2 |
| SYS-04.3 SYS-07.3: rejects client artifacts containing synthetic SUPABASE_DB_URL without echoing it | R2 |
| SYS-04.3 SYS-07.3: rejects client artifacts containing synthetic VERCEL_TOKEN without echoing it | R2 |
| SYS-04.3 SYS-07.3: rejects client artifacts containing synthetic CRON_SECRET without echoing it | R2 |
| SYS-04.3 SYS-07.3: rejects client artifacts containing synthetic MAIN_ADMIN_PASSWORD without echoing it | R2 |
| SYS-04.3 SYS-07.3: scans generated client source maps for secret canaries | R2 |
| SYS-04.3: current application source satisfies the same import boundary as the synthetic fixtures | R2 |

Vitest abbreviates long `$name` labels in its output; the ten import-fixture
labels above are expanded to their full authored fixture names.
