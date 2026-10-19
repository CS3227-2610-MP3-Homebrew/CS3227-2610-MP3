# Testing report

- **Agent:** testing
- **Issue:** #48, PLAN T-17 (paired with #49)
- **Spec IDs:** SYS-07.1
- **Date:** 2026-10-19
- **Branch:** feat/48-delivery-workflows
- **Base commit:** 98fe6caba4ec27d739be6e4e973c54153e6a654d
- **Status:** completed

## Summary

Authored static delivery-configuration tests from the approved master version of
TECHNICAL-SPEC's SYS-07.1 and Environments and delivery section. Tests parse the
repository's `.github/workflows/*.yml` and `vercel.json`; workflow discovery uses
job environment bindings, never deployment filenames. The final required
verification run passed lint/typecheck and stopped at three expected
missing-implementation failures. All 60 synthetic helper cases and the existing
CI boundary check pass; existing 34 tests also pass. This is completed test
authoring with failing-first evidence, not passing implementation or merge readiness.

No workflow, Vercel, Supabase, hosted database or live provider command was run.
Hosted verification is unavailable to agents. The only network operation was
the explicitly permitted, escalated installation of the test YAML parser.

## Acceptance criteria

| Criterion | Status (completed, blocked, awaiting-decision, or incomplete) | Evidence (test name, check, or observation) |
| --- | --- | --- |
| SYS-07.1 static delivery mappings, approval binding and credential boundaries | completed | `SYS-07.1: development has one environment-bound Actions migration and deployment job`, its production counterpart, the CI/workflow hygiene case and `SYS-07.1: vercel.json selects sin1 and disables Git deployments`; three expected missing-implementation failures listed below. |
| SYS-07.1 hosted verification limitations recorded | completed | Human-only evidence identified below; no hosted probe or deploy executed. |

Criterion-to-case mapping (all generated titles begin `SYS-07.1:`):

| Given / when | Expected assertion / evidence |
| --- | --- |
| A development/production job is discovered | Exactly one job per environment; master push only / v* tag push only; production job binds migration and deploy to one environment approval boundary. Missing/duplicate bindings fail, regardless of filenames. |
| Deploy credentials are referenced | Required secrets `VERCEL_TOKEN`, `SUPABASE_DB_URL`; required variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; no global/unbound/CI reads; incorrect secret/variable namespaces fail. Optional `CRON_SECRET` is accepted only as a production secret and is not required. |
| Workflow/build environment contains application secrets | Reject `SUPABASE_SECRET_KEY`, `SOCLAAS_API_KEY`, `MAIN_ADMIN_PASSWORD`; application settings belong to Vercel settings. |
| Migration input or delivery script is unsafe | `--db-url` must resolve to the environment's `secrets.SUPABASE_DB_URL`; literal/assembled database URL, direct host, port 6543, seed/reset paths and demo/local credentials fail. Synthetic tests exercise each negative. |
| Migration/deployment commands are present | Same environment job; migration before deploy; failed migration cannot be swallowed or continued; deploy cannot use always/failure/cancelled conditions that bypass ordinary success gating. |
| Production ancestry is checked | Current tag/HEAD must be an ancestor of fetched master before migration; missing, reversed, unrelated-commit, late and ignored checks fail. |
| Vercel application sequence runs | Own Preview/Production pull, build, then prebuilt deploy; prod flag required on both production build/deploy and forbidden in development; dev alias required only for development. Wrong target/order/flag/alias fixtures fail. |
| Toolchain is configured | Bun follows package.json/packageManager, Node 24, both before build; exact CLI pin accepted, unversioned/latest/range fixtures fail. |
| Workflow permissions/actions/concurrency are configured | contents read; 40-hex SHA third-party action pins; stable non-cancelling groups distinct per environment. Cancelled/shared/per-commit/per-tag groups fail. |
| Vercel JSON is configured | Only sin1 region, Git deployments disabled; absent, extra/wrong regions and enabled/missing Git disabling fail. |

## Interfaces defined by tests

No application module interface is introduced. These are static configuration
interfaces; implementation filenames, workflow names and job IDs remain open.
The assertion helpers are private test tooling under `tests/unit/delivery/`.

- YAML accepts job `environment: development/production` or an environment object
  with the corresponding literal `name`. Deployment workflow names are arbitrary.
- Trigger configuration uses `on.push.branches: [master]` or `on.push.tags: ['v*']`,
  with no alternate trigger, opposite filter, ignore filter or path restriction.
- Credentials may be referenced directly, or supplied through job/step `env`
  indirection using `$NAME` / `${NAME}` and normal shell quoting. This statically
  traces `--db-url` to the secret without examining its actual value.
- Ancestry accepts `git merge-base --is-ancestor HEAD origin/master` (also
  upstream/master, master and refs/remotes forms) or
  `git branch --remotes --contains HEAD | grep -Fx origin/master`. The current
  commit can use HEAD, GITHUB_SHA/GITHUB_REF or github.sha/github.ref expressions.
  Fixture coverage proves merge-base direction and the alternative containment
  form. Fetch command spelling and action checkout options are not prescribed.
- Migration steps can unconditionally run `supabase db push` when no migrations
  exist, or use a shell file-existence/find guard that skips that command when
  empty. Commands still must be present for static inspection. The good guard
  fixture uses find/grep and a shell if; tests never execute the guard.
- Run scripts accept line continuations, multiple lines, `&&` or semicolon-separated
  commands; ordering follows those static command positions. Job/step env scopes
  and failure-continuation properties are inspected.
- Alias accepts `vercel alias set <deployment> homebrew-cs3227-dev.vercel.app` or
  `vercel alias <deployment> homebrew-cs3227-dev.vercel.app`; deployment-output
  capture method is open. Production domain routing is hosted evidence.
- CLI pins accept exact numeric `vercel@major.minor.patch` install/runner notation,
  with no chosen version prescribed. Bun setup may omit a version (packageManager
  discovery), specify `bun-version-file: package.json`, or use a packageManager
  expression. Node setup specifies 24.
- Concurrency may be workflow-level or job-level; literal stable groups and
  github.workflow/github.job expressions are accepted when distinct for each
  environment. cancel-in-progress false or omission (default false) is accepted.
  SHA/ref/run-dependent grouping cannot serialize an environment and fails.
- `vercel.json` accepts `git.deploymentEnabled: false` or `github.enabled: false`
  alongside exactly `regions: ['sin1']`.

These parsers check declarative settings and recognizable commands, not arbitrary
shell semantics, dynamically generated commands, composite-action internals or
external script bodies. Alternative equivalent forms beyond those listed need
explicit test review; the approved spec does not prescribe one shell algorithm.
Actual environment approval requirements cannot be proven by an environment
name alone; binding is the static assertion, hosted policy is separately unavailable.

## Files changed

- `tests/unit/delivery/delivery.test.ts`: 64 SYS-07.1 cases, including 60 synthetic
  helper cases and four repository cases.
- `tests/unit/delivery/workflow-contract.ts`: YAML and static contract helpers.
- `tests/unit/delivery/workflow-fixtures.ts`: small synthetic good workflow/config
  fixtures, mutated by named bad cases; placeholder SHAs/version are fixture data.
- `package.json`: added only devDependency `yaml: ^2.9.1`, required to parse real
  YAML structures rather than infer environment/jobs from text alone.
- `bun.lock`: matching yaml 2.9.1 workspace/resolution entries.
- `workflow/handoffs/48-delivery-workflows/03-testing.md`: this report. The human
  explicitly requested this filename; existing 01-spec.md and 02-spec.md are preserved.

## Checks run

Only final-code verification is summarized here; intermediate fixture-detected
matcher defects were corrected before the final run.

| Command | Result | Evidence |
| --- | --- | --- |
| `bun add -d yaml` (escalated) | exit 0 | installed yaml@2.9.1; 1 package installed; matching test-only manifest/lock changes. |
| `bun run verify` (exact command, final code) | exit 1, expected failing-first | eslint passed; next typegen and tsc passed; Vitest: 1 failed and 3 passed files, 3 failed and 95 passed tests (98 total). |

Final verification output (routine stack snippets omitted):

```text
$ bun run lint && bun run typecheck && bun run test && bun run check:traceability && bun run check:specs && bun run build
$ eslint
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
$ vitest run --passWithNoTests
 RUN  v5.0.5 /Users/shawnnygoh/github-repos/homebrew-48
 ❯ tests/unit/delivery/delivery.test.ts (64 tests | 3 failed) 58ms
 Test Files  1 failed | 3 passed (4)
      Tests  3 failed | 95 passed (98)
error: script "test" exited with code 1
error: script "verify" exited with code 1
```

Every failure is SYS-07.1 missing implementation:

1. `SYS-07.1: development has one environment-bound Actions migration and deployment job`:
   `development: expected exactly one environment-bound migration/deploy job; found 0`.
2. `SYS-07.1: production has one environment-bound Actions migration and deployment job`:
   `production: expected exactly one environment-bound migration/deploy job; found 0`.
3. `SYS-07.1: vercel.json selects sin1 and disables Git deployments`:
   `missing implementation: vercel.json: expected false to be true`.

There are no final fixture/tooling failures. The existing Vite tsconfig-paths
advisory is informational and triggered no configuration change.

Not reached by verification: `bun run check:traceability`, `bun run check:specs`,
`bun run build`. `bun run test:e2e` was not run: this task has no browser cases.
No full verification pass is claimed.

## Open issues for the next step

The two environment-bound workflows and vercel.json are absent, accounting for
all failures. Pair statuses remain todo; implementation was not started.
No missing specification decision was needed for the static cases.

Hosted verification is unavailable to agents: actual GitHub environment allowed
branches/tags, teammate reviewer identity, prevent-self-review, disabled admin
bypass, environment-only credential storage and absence of repo/org copies;
Vercel single Hobby project, identical project IDs, actual Preview/Production
settings, build Config/Secret types, public dev alias and Deployment Protection;
Supabase homebrew-dev/homebrew-prod identities, Singapore regions and the secret
URL's session-pooler host/port/username/encoded-password content; actual rejection
of unreachable tags, empty migration behavior and failed migration/deploy behavior.
Static fixtures cannot supply hosted execution evidence. No URL/credential value
was read. CRON_SECRET's actual single maintenance use belongs to SYS-13; this
foundation suite checks only optional production secret scope.

## Suspicious content found

None.

## Human corrections

The user explicitly selected 03-testing.md and required the stage-2 stop before
implementation. Existing spec reports remain unchanged. Coordinator review
identified ancestry direction and concurrency serialization risks; regression
fixtures cover those cases.

## Review responses

None; no reviewer agent ran.

## Notes for reflection

- **What worked:** Synthetic good/bad fixtures caught matcher mistakes during
  authoring and verify now has only the three expected missing artifacts.
- **What needed guidance:** Coordinator identified reversed ancestry and ref/sha
  grouping as cases needing explicit regression coverage.
- **What to change in the agent or skill:** None evidenced beyond retaining
  synthetic negative-helper coverage for static workflow tests.
