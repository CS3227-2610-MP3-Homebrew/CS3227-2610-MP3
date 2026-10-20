# Testing report

- **Agent:** testing
- **Issue:** #38, PLAN T-07 — Test role matrix and local demonstration seeds
- **Spec IDs:** SYS-06.3, SYS-06.4, SYS-12.2, SYS-12.3
- **Date:** 2026-10-20
- **Branch:** feat/38-role-matrix-local-demonstration-seeds
- **Base commit:** 0ec072452fd532eb388977baeb7a926c630bf4f7
- **Status:** completed

## Summary

Completed test authoring with documented failing-first evidence. Added 87 cases:
50 RLS cases, 24 signup/configuration/workspace unit cases, six actual local
Supabase Auth cases, five local-seed cases and two hosted-delivery artifact cases.
The clean final `bun run verify` passed lint and typecheck, then stopped at tests:
57 expected missing-implementation failures and 271 passes, 328 total. All 241
pre-existing cases passed; 30 new cases passed. The pair is not ready to merge.
This status means test authoring is complete, not that product criteria or
verification pass. The exact failures are listed below.

Inputs were restricted to T-07, its approved technical/data-model/RLS contracts,
linked product/integration/Admin read-permission contracts, shared testing rules,
installed Next.js testing guides, and merged application/testing interfaces.
No implementation task or implementation/reviewer report was read. The issue
handoff folder did not exist before this run; there were no earlier reports.

## Acceptance criteria

Statuses in this table describe recorded test coverage and failing-first
evidence. Remaining integration evidence is stated explicitly below.

| Criterion | Status | Evidence |
| --- | --- | --- |
| SYS-06.3 | completed | `rls.test.ts`: own protected profiles; two customers/two owners/Admin per main/kit workspace; unauthenticated denial; café/menu/hour/order/order-item/review boundaries; parent visibility; protected-state and ownership writes. 25 pass, 25 expected failures. |
| SYS-06.4 | completed | `auth.test.ts`: Customer/owner selection, refusal of Admin/invalid roles, metadata isolation and dev/prod confirmation declarations. `signup-authority.test.ts`: six real local Auth authority cases, four fail for absent protected profiles. RLS refuses ordinary Admin profile insertion. `seeds.test.ts` records local seed replay/hosted-target cases. `hosted-artifacts.test.ts` verifies existing hosted seed/credential exclusions. |
| SYS-12.2 | completed | RLS main→kit, kit→main and kit→kit read/update/delete denial for each role, including inherited child rows. Server workspace prerequisite has role-independent and absent-session cases. Actual AI cache/storage/route consumption remains later evidence. |
| SYS-12.3 | completed | Pure signup resolver cases plus actual local Auth signup cases assert protected main-workspace role assignment despite metadata. RLS cases deny profile workspace reassignment and role changes. |
| T-07: fixed boundaries and seed requirements have recorded tests | completed | 87 criterion-named cases; mapping below. Schema absence produces failures rather than conditional skips. |
| T-07: no unspecified permission or lifecycle inferred | completed | No account UI/app HTTP contract, owner profile fields, order/review creation transitions, kit creation or maintenance provisioning is invented. Administrative lifecycle/audit operations remain story-owned. |

### Given/When/Then mapping

| Given | When | Then / named cases |
| --- | --- | --- |
| Two customers, two owners and an Admin in each of main, kit A and kit B | Each reads profiles | Own protected profile only; `actors read only their own protected profiles`. |
| A café and its menu, hours, orders, items and review | Same-workspace actors read each row | Fixed allow/deny matrix in `localReads`; unrelated Admin order/menu/hour access is denied. |
| Each role in another workspace or an unauthenticated caller | Direct SQL under `authenticated`/`anon` attempts reads/writes | No row is returned/changed; `every ... role is denied reads and writes ...` and unauthenticated case. |
| Approved, pending, rejected or suspended parent café | A Customer reads café/menu/hours | Only approved, non-suspended parents permit visibility; owner retains suspended-café access. |
| Own or another Customer's pending/kept/hidden review | Customer reads with eligible/ineligible café | Own reviews remain readable; another Customer sees pending/kept only on eligible cafés; hidden stays hidden. |
| Owner/customer/Admin role and parent relationships | Update menu name/opening time, protected café state, role/workspace or ownership | Own owner menu/hour update permitted; other roles, including Admin, denied; self-approval, suspension clearing, escalation and ownership reassignment denied. |
| Another Customer's parent order | Caller attaches an order item | Denied despite valid FK setup. Review edit/delete and ordinary Admin profile insertion are also denied. |
| Valid or forged signup role/metadata | Resolver and actual local Auth signup execute | Customer/owner authority uses main; Admin metadata grants no authority; protected profiles, never raw metadata, establish role. |
| Explicit dev/prod confirmation declarations | Validator receives off/on values | Both off accepted; either on refused. Local TOML also declares confirmation off. |
| Verified actor scope, every role | Server workspace guard checks main/kit scopes | Same workspace passes only this prerequisite; cross-workspace/absent-session checks fail. |
| Local seed target and disabled provider | Seed runs twice | All three roles, approved cafés with menus/hours and past purchased orders exist; seeded domain identities/data are unchanged on replay. |
| Dev/prod context or a non-loopback target | Local seed entry is called | Reject before mutation or HTTP dispatch. Remote examples use reserved `.invalid` names; test transport forbids fetch. |
| Existing development/production delivery definitions | Merged workflow contract checker examines hosted paths | No seeds, reset, local/demo credentials or application secret inputs enter hosted delivery. |

## Files changed

- `tests/integration/roles-seeds/actors.ts`: synthetic transaction-scoped local actors, parent records and schema adapters; proves privileged setup before accepting a denial.
- `tests/integration/roles-seeds/rls.test.ts`: 50 cases using actual local PostgreSQL roles and JWT subject claims, never the secret key for ordinary operations.
- `tests/integration/roles-seeds/signup-authority.test.ts`: six real local platform Auth signup cases with unique temporary accounts and cleanup limited to their fixture IDs/emails. Only generated local publishable-key material is captured in-process; passwords/status credential payloads/session bodies are never printed. Response bodies are discarded.
- `tests/integration/roles-seeds/seeds.test.ts`: seed replay, relational content and local-only target rejection.
- `tests/unit/roles-seeds/contracts.ts`: deferred imports and exact interfaces below; keeps lint/typecheck meaningful before implementation exists.
- `tests/unit/roles-seeds/auth.test.ts`: 24 fixed role/workspace/configuration cases.
- `tests/unit/roles-seeds/hosted-artifacts.test.ts`: two hosted delivery seed/credential exclusions using the merged workflow test contract.
- `vitest.config.mts`: `fileParallelism: false`. The merged schema suite resets the shared local database twice; serialization prevents other files racing those resets. No existing assertion was weakened. Explicit long timeouts in new aggregate matrix cases accommodate many Docker/psql calls, not retries or skipped failures.
- This report.

**Added devDependencies:** None. `package.json` and `bun.lock` are unchanged.

## Interfaces defined by tests

All paths below are server-module interfaces. They do not introduce an account
HTTP endpoint, browser lifecycle or new database API. Actor context supplied to
the workspace guard is already verified by its server caller; its result is only
a workspace prerequisite, never an independent grant of role/record authority.

```ts
// src/server/auth/workspace.ts
type VerifiedActor = {
  id: string;
  workspaceId: string;
  role: "customer" | "owner" | "admin";
};
export function authorizeWorkspace(
  actor: VerifiedActor | null,
  resourceWorkspaceId: string,
): boolean;

// src/server/auth/signup.ts
export function resolveSignup(
  input: { role: unknown; metadata?: Record<string, unknown> },
  mainWorkspaceId: string,
): { role: "customer" | "owner"; workspaceId: string };
export function validateAuthConfiguration(input: {
  dev: { emailConfirmationEnabled: boolean };
  prod: { emailConfirmationEnabled: boolean };
}): void;

// src/server/seeds/local.ts
export function seedLocalDemonstration(input: {
  environment: "local" | "ci" | "dev" | "prod";
  supabaseUrl: string;
  provider: "fake" | "disabled";
}): Promise<unknown>;
```

Valid plain Customer/owner selections return their selected role and trusted
main-workspace identity. Invalid selected roles throw. Forged metadata may be
rejected or ignored, but must never alter returned role/workspace. Seed return
values are not asserted; no unsupported ban on local demo credentials is added.

### Existing database interfaces and fixture adapters

SQL fixtures use the merged `public` core tables and their existing identities,
role/workspace fields and FK relationships, via the merged catalogue/fixture
helper. New logical field adapters recognize café application state
(`application_state`, `application_status`, `approval_state`, `approval_status`,
`status`), suspension (`suspended`, `is_suspended`), review moderation state
(`moderation_state`, `moderation_status`, `state`, `status`), menu name (`name`,
`item_name`) and opening time (`opens_at`, `opening_time`, `open_time`,
`start_time`). Past-order timing recognizes a date/timestamp field named for
creation, ordering, placement or pickup. Order enum fixtures select `collected`
when represented, solely to establish review fixture eligibility.

These are fixture mappings, not newly specified physical SQL/API names. A valid
different representation would need a testing-owned adapter update. No schema
is created/altered by these adapters; missing logical fields fail explicitly.
Positive mutable-field checks assign the existing name/time value to itself;
they do not require update permission on immutable identity columns. Profile
role reads use actual authenticated JWT subjects under RLS. Main/kit Admin
authority is represented by protected profiles in distinct workspaces, with
privileged synthetic setup, not by invoking future provisioning routes.

## Checks run

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run db:start` | passed | Local Supabase start succeeded; generated credentials omitted. Restored again before the clean final run. |
| `bun run db:reset` | passed with escalation | Explicit local reset succeeded after CLI cache-write sandbox failure. The existing schema suite also reset/replayed migrations during final verification. |
| `bun run verify` | expected failing-first | Clean final log `/tmp/homebrew-t07-verify-clean.log`: lint passed; typecheck generated routes successfully and passed; Vitest `57 failed | 271 passed (328)`, `4 failed | 10 passed (14)`, duration `130.72s`. All 241 existing cases passed; 30/87 new cases passed. |
| `bun run check:specs` | passed separately after final verify | `Spec check passed (0 warning(s)).` |
| `bun run check:traceability` | passed separately after final verify | `Traceability passed (9 done tasks; all listed criteria have test titles).` |

Verify's chained traceability, spec and build stages were **not reached**, because
Vitest exited 1. The first two were run separately as shown; build and its
isolation/artifact stages were not run. `bun run test:e2e` was not run: no browser
cases were added because the account app HTTP/UI contract is reserved to its
owning stories. No hosted database or live LLM was accessed.

### Verification history and failure classification

Initial authoring lint errors (array syntax and Next.js's forbidden local
`module` variable name) were corrected before the final code. Initial sandbox
runs failed on CLI cache writes/Docker socket access; escalated commands resolved
those permissions. Stopping an intermediate verification during the existing
schema reset caused missing-table-catalogue failures and one existing test
timeout in a subsequent run. Those results were discarded as infrastructure
interference. After that run finished and `db:start` succeeded, the final run
was uninterrupted: no infrastructure or test-authoring failures remained.

The final tool output also contains the existing non-failing Vite notice about
native TypeScript path support. No tool/configuration warning was treated as
application acceptance evidence.

## Open issues for the next step

- The 57 final failures are missing implementation: 19 signup/configuration
  helper cases, four workspace-guard cases, five seed cases, four actual Auth
  protected-profile cases, 11 permitted-read cases and 14 missing logical-field
  cases. Later assertions in a case that fails during setup are not executed.
- Successful local Auth signup currently creates no protected profile. The
  positive and forged-metadata cases expose this, rather than inferring authority
  from raw Auth metadata. The two forged-Admin cases pass because no Admin
  profile is created; these alone do not prove complete signup provisioning.
- AI cache/admission physical storage and its actual route consumers are outside
  this pair. The server workspace guard tests record the shared isolation
  prerequisite for source/cache access; they do not establish actual cache-table
  RLS, source-selection correctness or downstream use of that guard. Existing
  domain RLS coverage is real database evidence.
- Main Admin/kit Admin provisioning remains the maintenance/demo-kit tasks.
  Fixtures exercise preprovisioned authority without duplicating those jobs.
  Admin action transactions, audit payloads and lifecycle state changes remain
  their story tasks; this suite does not require generic Data API updates to
  bypass those operations.
- Generic owner café-write fields remain reserved to OWN-01/02. Own café access,
  owner child access and protected-state denial are covered; no arbitrary editable
  profile field or application transition is fabricated. Order/review creation,
  sales semantics and UI navigation likewise remain with their owning contracts.
- Dev/prod confirmation checks validate explicit declarations, not the actual
  hosted project settings. Hosted configuration was not accessed.
- The human test review/commit gate remains outstanding. No commit, push or PR
  operation was performed; PLAN and implementation files were not edited.

## Suspicious content found

None.

## Human corrections

Coordinator review requested direct local Auth authority evidence in addition
to pure guards, fixed review visibility cases, and explicit Admin menu/hour
write denials; these were added. It also identified an unsupported blanket ban
on local password artifacts/seed return values in a draft; that draft assertion
was removed and hosted delivery exclusions are tested instead. The coordinator
authorized the minimal testing configuration ownership expansion for file
serialization. These were test-authoring corrections, not spec changes.

## Review responses

| Review report | Finding | Fixed or rejected | Reason or change |
| --- | --- | --- | --- |
| None | None | None | No independent reviewer report was read or issued. |

## Notes for reflection

- **What worked:** Real authenticated/anonymous SQL sessions, privileged setup
  proofs and a direct local Auth surface distinguish missing allows/provisioning
  from a secure baseline denial. All existing tests pass in the clean run.
- **What needed guidance:** Avoiding implied identity-column write grants and
  an unsupported local-password policy; keeping pure scope guards distinct from
  actual production boundary evidence.
- **What to change in the agent or skill:** Shared local database reset suites
  need serialized files. An active reset must finish before a replacement
  verification starts; interruption can leave a misleading catalogue failure.

## Every final failing case

The groups below are extracted from the clean final output. Each title carries
its criterion ID(s); the preceding reason applies to every title in that group.

**Reason:** Missing implementation: src/server/auth/signup.ts: expected false to be true // Object.is equality

- SYS-06.4 SYS-12.3: signup accepts customer and always selects the main workspace
- SYS-06.4 SYS-12.3: signup accepts owner and always selects the main workspace

**Reason:** Missing implementation: src/server/auth/signup.ts: expected false to be true // Object.is equality

- SYS-06.4 SYS-12.3: signup rejects forbidden role "admin"
- SYS-06.4 SYS-12.3: signup rejects forbidden role "Admin"
- SYS-06.4 SYS-12.3: signup rejects forbidden role "administrator"
- SYS-06.4 SYS-12.3: signup rejects forbidden role ""
- SYS-06.4 SYS-12.3: signup rejects forbidden role null
- SYS-06.4 SYS-12.3: signup rejects forbidden role undefined
- SYS-06.4 SYS-12.3: signup rejects forbidden role 1
- SYS-06.4 SYS-12.3: signup rejects forbidden role {"role":"admin"}

**Reason:** Missing implementation: src/server/auth/signup.ts: expected false to be true // Object.is equality

- SYS-06.4 SYS-12.3: untrusted metadata {"role":"admin"} cannot grant Admin or select a workspace
- SYS-06.4 SYS-12.3: untrusted metadata {"app_role":"admin"} cannot grant Admin or select a workspace
- SYS-06.4 SYS-12.3: untrusted metadata {"is_admin":true} cannot grant Admin or select a workspace
- SYS-06.4 SYS-12.3: untrusted metadata {"workspaceId":"00000000-0000-4000-8000-000000000002"} cannot grant Admin or select a workspace
- SYS-06.4 SYS-12.3: untrusted metadata {"workspace_id":"00000000-0000-4000-8000-000000000002"} cannot grant Admin or select a workspace
- SYS-06.4 SYS-12.3: untrusted metadata {"role":"admin","workspace_id":"00000000-0000-4000-8000-000000000003","user_metadata":{"role":"admin"}} cannot grant Admin or select a workspace

**Reason:** Missing implementation: src/server/auth/signup.ts: expected false to be true // Object.is equality

- SYS-06.4: explicit dev and prod declarations both disable email confirmation

**Reason:** Missing implementation: src/server/auth/signup.ts: expected false to be true // Object.is equality

- SYS-06.4: confirmation-on declaration in dev is refused
- SYS-06.4: confirmation-on declaration in prod is refused

**Reason:** Missing implementation: src/server/auth/workspace.ts: expected false to be true // Object.is equality

- SYS-12.2: server workspace boundary applies equally to customer including AI source and cache scopes
- SYS-12.2: server workspace boundary applies equally to owner including AI source and cache scopes
- SYS-12.2: server workspace boundary applies equally to admin including AI source and cache scopes

**Reason:** Missing implementation: src/server/auth/workspace.ts: expected false to be true // Object.is equality

- SYS-06.3 SYS-12.2: server workspace boundary refuses absent authentication

**Reason:** Auth provisioning must create exactly one protected role in main: expected [] to have a length of 1 but got +0

- SYS-06.4 SYS-12.3: actual local Auth signup creates protected customer authority in main
- SYS-06.4 SYS-12.3: actual local Auth signup creates protected owner authority in main

**Reason:** Auth provisioning must create exactly one protected role in main; raw metadata grants no authority: expected [] to have a length of 1 but got +0

- SYS-06.4 SYS-12.3: actual local Auth signup cannot forge Admin or kit authority for customer
- SYS-06.4 SYS-12.3: actual local Auth signup cannot forge Admin or kit authority for owner

**Reason:** Missing implementation: src/server/seeds/local.ts: expected false to be true // Object.is equality

- SYS-06.3 SYS-06.4: local demonstration seeds replay with all roles, approved cafes, menus, hours and past orders

**Reason:** Missing implementation: src/server/seeds/local.ts: expected false to be true // Object.is equality

- SYS-06.4: local demonstration seeding rejects hosted/environment target {"environment":"dev","supabaseUrl":"http://127.0.0.1:54321","provider":"disabled"} before any database mutation
- SYS-06.4: local demonstration seeding rejects hosted/environment target {"environment":"prod","supabaseUrl":"http://127.0.0.1:54321","provider":"disabled"} before any database mutation
- SYS-06.4: local demonstration seeding rejects hosted/environment target {"environment":"local","supabaseUrl":"https://synthetic-project.supabase.invalid","provider":"disabled"} before any database mutation
- SYS-06.4: local demonstration seeding rejects hosted/environment target {"environment":"local","supabaseUrl":"https://127.0.0.1.attacker.invalid","provider":"disabled"} before any database mutation

**Reason:** Expected permitted cafes read: ERROR:  42501: permission denied for table cafes

- SYS-06.3: owner reading cafes through cafe has allow=true
- SYS-06.3: admin reading cafes through cafe has allow=true

**Reason:** Expected permitted menu_items read: ERROR:  42501: permission denied for table menu_items

- SYS-06.3: owner reading menu_items through menu has allow=true

**Reason:** Expected permitted opening_hours read: ERROR:  42501: permission denied for table opening_hours

- SYS-06.3: owner reading opening_hours through hours has allow=true

**Reason:** Expected permitted orders read: ERROR:  42501: permission denied for table orders

- SYS-06.3: customer reading orders through order has allow=true
- SYS-06.3: owner reading orders through order has allow=true

**Reason:** Expected permitted order_items read: ERROR:  42501: permission denied for table order_items

- SYS-06.3: customer reading order_items through item has allow=true
- SYS-06.3: owner reading order_items through item has allow=true

**Reason:** Expected permitted reviews read: ERROR:  42501: permission denied for table reviews

- SYS-06.3: customer reading reviews through review has allow=true
- SYS-06.3: admin reading reviews through review has allow=true

**Reason:** Missing implementation: cafes application state supporting pending/approved/rejected: expected undefined to be defined

- SYS-06.3: customer cafe/menu/hour access follows pending parent eligibility
- SYS-06.3: customer cafe/menu/hour access follows rejected parent eligibility
- SYS-06.3: customer cafe/menu/hour access follows approved parent eligibility
- SYS-06.3: customer cafe/menu/hour access follows suspended parent eligibility

**Reason:** Missing implementation: cafes application state supporting pending/approved/rejected: expected undefined to be defined

- SYS-06.3: owner retains cafe/menu/hour access to their suspended cafe

**Reason:** Missing implementation: logical menu item name field: expected undefined to be defined

- SYS-06.3: only the cafe owner can update their menu_items

**Reason:** Missing implementation: logical opening time field: expected undefined to be defined

- SYS-06.3: only the cafe owner can update their opening_hours

**Reason:** Missing implementation: cafes application state supporting pending/approved/rejected: expected undefined to be defined

- SYS-06.3: pending review visibility requires own authorship or a visible review on an eligible cafe
- SYS-06.3: kept review visibility requires own authorship or a visible review on an eligible cafe
- SYS-06.3: hidden review visibility requires own authorship or a visible review on an eligible cafe

**Reason:** Missing implementation: cafes application state supporting pending/approved/rejected: expected undefined to be defined

- SYS-06.3: another customer's visible review stays hidden under a pending cafe
- SYS-06.3: another customer's visible review stays hidden under a rejected cafe
- SYS-06.3: another customer's visible review stays hidden under a suspended cafe

**Reason:** Missing implementation: cafes application state supporting pending/approved/rejected: expected undefined to be defined

- SYS-06.3: owners cannot self-approve or clear suspension

**Reason:** ERROR:  42501: permission denied for table cafes

- SYS-06.3: absence of a target never exposes another record
