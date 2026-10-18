# ADM-04: Moderation Assistant

- **Related specs:** [Product Admin stories](../PRODUCT-SPEC.md#admin), [manual moderation and audit](ADM-03-review-moderation.md), [workspace boundaries](../TECHNICAL-SPEC.md#sys-12--workspaces-and-demo-kits), [RLS](../TECHNICAL-SPEC.md#rls-and-database-exposure), [LLM module](../TECHNICAL-SPEC.md#llm-module), [HTTP conventions](../INTEGRATION-SPEC.md#authorization-and-transport), [AI route and result envelope](../INTEGRATION-SPEC.md#ai-routes-and-result-envelope), [ModerationInput/ModerationResult and prompt](../INTEGRATION-SPEC.md#moderation-assistant--adm-04), [limits](../AI-SECURITY-SPEC.md#limits-and-configuration), [security evaluation plan](../AI-SECURITY-SPEC.md#security-evaluation-plan).
- **Role:** Admin

## Purpose

Moderation Assistant suggests a five-label classification and brief reason for
pending review text so an Admin can assess it alongside the manual queue. An
LLM interprets natural-language spam, abuse, relevance and attempts to control
the assistant; schema validation alone cannot assess classification quality.
Classification accuracy is assessed with human-labelled examples, without a
numeric accuracy target. The assistant never authorizes a state change.

## User experience

- **Where it appears:** **Triage pending reviews** appears only on the Pending tab of `/admin/moderation`. Its page/tab selections follow ADM-03's URL query parameters. It is disabled when that page has no pending reviews.
- **What the user sees:** One click sends the pending reviews shown on the current page as one triage request. While that request is loading, the panel indicates progress; a successful result displays each label and model reason beside its review, escaped as plain text and marked **AI suggestion**. `ok` highlights Keep; `spam`, `abusive`, `off-topic` and `injection attempt` highlight Hide. Highlighting never preselects or submits an action.
- **What the user must confirm:** Each individual action uses ADM-03's ordinary moderation route with an Admin-authored reason and explicit per-review confirmation. There is no apply-all control. Fixed app-text quick picks are exactly "Looks fine", "Spam", "Abusive", "Off-topic", "Prompt-injection attempt"; the Admin can edit or type their own. Model reasons are never copied to the Admin reason or Admin audit entry.
- **Lifetime:** Suggestions are not persisted. Acting on one review leaves suggestions visible for remaining reviews on the current page. Reloading or changing page discards them. A state conflict removes the affected suggestion and shows the record's current state.

## Inputs

All review text is untrusted, including synthetic kit content.

| Input | Source | Trusted? | Limit | Handling before the LLM |
| --- | --- | --- | --- | --- |
| `reviewIds` selection | Current Pending page, sent as the existing `{reviewIds: Ref[]}` HTTP request | No; client references never prove authority | Distinct, nonempty and within `AI_MODERATION_REVIEWS_PER_CALL` under the linked security limits; `Ref` follows the integration vocabulary | Server validates strict JSON, session, Admin role, exact origin, workspace/RLS and currently pending membership before admission; reads authoritative text |
| Review reference and unchanged text in `ModerationInput` | Authorized server-read review records | Text is untrusted; identity is server-verified | CUS-05 field limit and integration context-byte ceiling; no truncation or silent exclusions | Encode only the schema's references/text as data, separate from the fixed trusted prompt; no reviewer identity or unrelated fields |
| Prompt, provider/model configuration and limits | Server configuration and integration contract | Trusted only after server validation | Shared policy and bounded-provider ceilings | No caller-supplied prompt, destination, model, credential or tools; dispatch only through server-only `src/server/llm/` |

## What is never sent to the LLM

Reviewer identity, contact information, profiles, full order data, sales, Admin
audit history, Admin email/reasons, other-workspace records, credentials,
passwords, session cookies/tokens, API keys, connection strings and environment
contents. Café names, ratings and submitted timestamps are queue display data,
not additional moderation model context. See [SEC-02](../AI-SECURITY-SPEC.md#sec-02--minimal-inputs-and-secret-isolation).

## Output

- **Shape:** Existing `ModerationResult` and the unchanged `feature: "moderation"` AI/fallback envelope in [INTEGRATION](../INTEGRATION-SPEC.md#ai-routes-and-result-envelope). Exactly one classification per submitted reference, using its five allowed labels and integration `Reason`; prompt text and schemas are owned by [the moderation contract](../INTEGRATION-SPEC.md#moderation-assistant--adm-04).
- **Validation:** Strict whole-response schema and semantic checks reject unknown fields/labels, malformed or oversized output, foreign IDs, duplicate IDs and missing classifications. One invalid classification rejects the whole result, with no partial labels, repair call or persisted success.
- **Use:** Labels and reasons are escaped plain text, never interpreted as HTML, Markdown, URLs to fetch, tools or mutation instructions. Review text/navigation resolve from authorized records. A suggestion is advisory only and cannot supply a mutation field or permission.

## Access and permissions

The main Admin is maintenance-created and each kit Admin is demo-kit-created;
sign-up never grants Admin. Identical triage/manual operations apply inside
their own workspace under SYS-12.2/SYS-12.12 and SEC-10.3. Scope is derived from
the session and authorized source records, never client references or advice.
The [ADM-03 permissions](ADM-03-review-moderation.md#permissions) govern every
manual confirmation and audit read; no unrelated order, sales, profile, role
change or Admin-creation permission is granted.

| Action | Own data | Other users' data |
| --- | --- | --- |
| Admin triage pending reviews | Authority derives from verified workspace | Pending reviews in the Admin's workspace only; missing/out-of-workspace targets are `404 NOT_FOUND` |
| Confirm Keep/Hide/Restore | Per-review confirmation, reason and current-state checks under ADM-03 | Same workspace limits; labels grant no access |
| Persist or reuse AI suggestions | Denied | Denied |

## Requirements

### `ADM-04`: Triage pending reviews with advisory AI classifications

- **User story:** As an admin, I want a Moderation Assistant "Triage pending reviews" button that classifies pending reviews in batches as ok, spam, abusive, off-topic or injection attempt with a reason for each, requires my confirmation for every action and falls back to the manual queue, so that I can assess reviews with assistance.
- **Priority:** High
- **Risk:** High — untrusted review text and model output must not acquire moderation authority, leak data or bypass usage controls.

#### Acceptance criteria

- **`ADM-04.1`:** Given an Admin on `/admin/moderation`'s Pending tab, when Triage pending reviews is clicked, then exactly the current page's pending review references are sent in one `POST /api/ai/moderation` request with the existing `{reviewIds: Ref[]}` body, bounded by `AI_MODERATION_REVIEWS_PER_CALL`; it is one action with at most the provider-call maximum in `AI_MODERATION_CALLS_PER_ACTION`, no automatic pagination, loops, splitting or retries. Kept/Hidden tabs have no triage button; an empty Pending page disables it.
- **`ADM-04.2`:** Given a valid in-scope pending selection and a valid provider result, when the triage route returns HTTP `200` with the unchanged AI envelope and `ModerationResult`, then each row displays its allowed label and model reason as escaped plain text marked AI suggestion, highlighting Keep for `ok` and Hide for each other allowed label, without preselecting or submitting either action; triage changes no review and writes no Admin-action audit entry.
- **`ADM-04.3`:** Given any displayed suggestion, when an Admin chooses to act, then one review at a time uses `POST /api/admin/reviews/{reviewId}/moderation` with only action and reason and explicit confirmation under ADM-03; there is no apply-all, and fixed quick-pick reasons are exactly "Looks fine", "Spam", "Abusive", "Off-topic", "Prompt-injection attempt", editable or replaceable by the Admin; the model reason is never copied into the reason field or audit entry.
- **`ADM-04.4`:** Given no valid session, when `POST /api/ai/moderation` is called, then it returns `401 UNAUTHENTICATED`; given a Customer or Café owner session, it returns `403 FORBIDDEN`; neither returns protected AI/fallback data, performs a provider call, changes review state or writes an Admin-action audit entry. ADM-03's confirmation route independently enforces the same session/role checks.
- **`ADM-04.5`:** Given an Admin selection containing a missing review or one outside its workspace, when the triage route is called, then either target produces indistinguishable `404 NOT_FOUND`, with no protected context/fallback disclosure, provider call, state change or Admin-action audit entry; a mixed authorized/foreign selection is rejected as a whole.
- **`ADM-04.6`:** Given a kit Admin on its own kit's Pending tab, when it triages seeded reviews, then the same classifications, per-review confirmation, reason and audit controls apply as for a main Admin; only its own workspace's reviews reach the model, per-Admin limits remain separate and global caps remain shared under SEC-10.3/SYS-12.12.
- **`ADM-04.7`:** Given a suggested action is manually confirmed, when the reason is blank after trimming whitespace, exceeds 300 Unicode code points or fails integration `Reason`, then ADM-03's moderation route returns `400 INVALID_REQUEST`, changes nothing and writes no Admin audit entry; a valid reason is stored as submitted and displayed as escaped plain text, and a successful eligible action commits exactly one Admin audit entry atomically with the state change.
- **`ADM-04.8`:** Given a review's state changed since triage, when an action based on that triage is confirmed through ADM-03's moderation route, then it returns `409 STATE_CONFLICT`, performs no state change or Admin audit write, removes that review's suggestion and tells the Admin the record changed while showing its current state; stale advice never bypasses current-state checks and unchanged text/rating are preserved.
- **`ADM-04.9`:** Given forged advice or a forged label added to a manual confirmation body, when ADM-03's moderation route receives it, then the extra label field returns `400 INVALID_REQUEST` under strict JSON with no state or Admin audit effect; a request containing only action/reason still independently passes all authorization, reason and current-state checks, so no label changes permission or transition rules.
- **`ADM-04.10`:** Given a malformed/schema-invalid/oversized result, unknown label or any foreign, duplicate or missing review ID, when the result is validated, then the complete AI result is discarded and HTTP `200` returns the unchanged `unavailable` fallback envelope; no labels, state change, Admin-action audit entry, persisted suggestion or repair/retry call results.
- **`ADM-04.11`:** Given the AI stage is disabled by the shared disable policy, when a valid authorized triage request runs, then HTTP `200` returns `mode: "fallback"`, `reason: "disabled"`, `fallback: "manual_queue"`; the page shows a brief safe disabled message with no labels, the ordinary manual queue stays usable and no provider call or AI-cache return occurs.
- **`ADM-04.12`:** Given an applicable usage/run/call cap denies work or the provider returns 429, when a valid authorized triage request runs, then HTTP `200` returns the unchanged fallback envelope with `reason: "usage_limited"` and `fallback: "manual_queue"`; the page shows a brief safe usage-limit message with no labels and the manual queue stays usable, without retries or any further provider call.
- **`ADM-04.13`:** Given unavailable admission/audit storage, invalid configuration, timeout, overflow, transport/provider failure or invalid output under the shared fallback mapping, when a valid authorized request reaches that failure, then HTTP `200` returns the unchanged fallback envelope with `reason: "unavailable"` and `fallback: "manual_queue"`; a brief safe unavailable message appears with no labels and the manual queue stays usable, with no unadmitted dispatch or retry; missing live credentials map to disabled under the integration contract.
- **`ADM-04.14`:** Given a triage selection whose reviews are no longer all pending, when `POST /api/ai/moderation` validates it, then it returns `400 INVALID_REQUEST` before admission, performs no provider call, state change or Admin-action audit write, and the page tells the Admin the queue changed and offers reload; an empty, duplicate or oversized selection also returns `400 INVALID_REQUEST` before admission. A valid selection is nonempty, currently pending and in scope; Moderation Assistant never returns `no_source_data`.
- **`ADM-04.15`:** Given successful suggestions on a page, when the Admin completes one review's action, then suggestions for remaining reviews on that page stay visible; when the page reloads or page selection changes, then suggestions are gone and no reusable result cache or persisted suggestions exist.
- **`ADM-04.16`:** Given review text asks to label itself `ok`, hide other reviews, impersonate a role or expose secrets, when it is triaged, then it stays encoded untrusted data separate from the fixed prompt, obtains no tools, secret context, extra record access or state change, even if its classification is mistaken; all output remains inert escaped text under SEC-03/SEC-04/SEC-05.
- **`ADM-04.17`:** Given a triage request whose method, origin, media type, strict body, reference or size violates the shared HTTP contract, when the Route Handler checks it, then the applicable shared error/status is returned before admission with no review state change or Admin-action audit entry; missing/malformed/mismatched Origin is `403 FORBIDDEN`, invalid source selection/unknown keys are `400 INVALID_REQUEST`, and responses use `Cache-Control: private, no-store` and the shared error shape.
- **`ADM-04.18`:** Given any triage outcome or fallback, when AI-use accounting/audit is recorded, then only SEC-09's allowlisted metadata is retained, without raw text, prompts, model reasons, credentials or provider bodies; AI-use events stay internal and never appear in `/admin/audit`, whose append-only Admin entries are unaffected by AI retention cleanup.

#### Edge cases and failure paths

Shared validation precedes AI admission; unauthorized callers receive no
protected fallback data. Inability to obtain authorized source/fallback data
uses `503 SOURCE_UNAVAILABLE`, never a fabricated empty successful source.
An empty visible page disables triage. A valid selection is nonempty, currently
pending and in scope. A no-longer-pending selection returns `400 INVALID_REQUEST`
before admission; the page says the queue changed and offers reload.
Moderation Assistant never returns `no_source_data`. No fallback writes a review
change or Admin-action audit entry. A disable observed before dispatch
or delivery suppresses AI work/content per SEC-08. Immutable review text means
classifications always refer to the stored text; state checks still repeat.

#### Out of scope

Automatic moderation, bulk confirmation, persistent suggestions, additional
routes, changes to integration schemas/prompts, review editing, runtime AI
settings and numeric accuracy/performance targets.

## Guardrails

| Threat | Control | SEC ID |
| --- | --- | --- |
| Unauthorized or cross-workspace selection | Verify session, Admin role, exact origin and workspace before source reads/admission; use RLS and authorized references; no model-granted permission | SEC-01, SEC-10.3 |
| Sensitive context or telemetry leakage | Model receives review reference/text only; omit identities/secrets; use server-only LLM module and content-free sanitized audit/errors | SEC-02, SEC-09 |
| Instruction injection in reviews | Fixed prompt plus structured data encoding; review text cannot alter trusted instructions or authorize reads, tools or writes, even if detection fails | SEC-03, SEC-05 |
| Forged or executable model output | Strict complete-result schema/reference checks; reject foreign/duplicate/missing IDs and unknown labels; render escaped plain text, never fetch model URLs | SEC-04 |
| Excessive agency or forged/stale confirmation | No tools/write interface; manual per-review action/reason only, strict extra-field rejection, independent authorization/current-state checks and atomic Admin audit | SEC-01, SEC-05 |
| Quota exhaustion or unbounded recovery | Durable per-user/run/provider admission and configured batch bounds; no automatic pagination, split, retry or repair call | SEC-06, SEC-08 |
| Disable bypass or unsafe recovery | Disable precedes dispatch and output return; typed sanitized fallback leaves manual queue usable; no suggestion persistence/cache | SEC-08, SEC-09 |

## Usage control

- **LLM calls per user action:** One click is one triage action and one HTTP request; the maximum provider calls is authoritative in `AI_MODERATION_CALLS_PER_ACTION`, with the shared zero-retry policy. No automatic page loop.
- **Caching:** No reusable moderation result cache under [INTEGRATION](../INTEGRATION-SPEC.md#cache-payload-fingerprints-and-source-revisions) and [security confirmation](../AI-SECURITY-SPEC.md#cache-rendering-and-human-confirmation). Transient suggestions last only on the current page.
- **Limits:** `AI_MODERATION_REVIEWS_PER_CALL`, `AI_MODERATION_RUNS_PER_DAY`, per-user and applicable global/feature caps follow [security limits](../AI-SECURITY-SPEC.md#limits-and-configuration) and [provider accounting](../TECHNICAL-SPEC.md#provider-call-accounting). Zero, invalid/missing configuration and unavailable admission fail closed. Kit account limits are separate; environment global caps are shared.
- **Disable precedence:** [SEC-08](../AI-SECURITY-SPEC.md#disable-failure-and-fallback-behavior) controls authorization/validation, disable, admission, dispatch and delivery ordering; no story-specific bypass exists.

## Failure modes and fallbacks

| Failure | How it is detected | What the user sees |
| --- | --- | --- |
| Disabled/missing live credentials | Shared disable/configuration policy | HTTP 200 `disabled`; safe disabled explanation, no labels, manual queue |
| App usage/run/call limit or provider 429 | Durable admission denial or provider status | HTTP 200 `usage_limited`; safe limit explanation, no labels, manual queue |
| General unavailability, invalid output, timeout, overflow or unavailable bookkeeping | Shared bounded transport/validation/admission policy | HTTP 200 `unavailable`; safe unavailable explanation, no labels, manual queue |
| Selection is no longer entirely pending | Server validates current pending membership before admission | `400 INVALID_REQUEST`; queue-changed message and reload option; no provider call or state/Admin-audit effect |
| Unauthorized, invalid or unavailable source/fallback | HTTP boundary rejects session/role/scope/body or cannot safely obtain source | Shared 400/401/403/404/413/415/503 as applicable; no protected disclosure or provider call |
| Stale manual confirmation | Independent current-state check | `409 STATE_CONFLICT`, current-state feedback, affected suggestion removed, no mutation/audit |

## Evaluation cases

Use the [security evaluation plan](../AI-SECURITY-SPEC.md#security-evaluation-plan):
deterministic fake-provider captures/responses, synthetic secrets and local
Supabase for boundary checks; human-labelled examples assess classification
quality without an invented accuracy target. E-01–E-06, E-08–E-13 and E-16
provide the corresponding shared authorization, minimization, injection,
rendering, admission, fallback, audit and confirmation checks.

| ID | Input | Expected behaviour | Type (normal/edge/adversarial) |
| --- | --- | --- | --- |
| ADM-04-E01 | Human-labelled ordinary relevant review | `ok` and a relevant reason are assessed against the human label; valid result highlights Keep without action | normal |
| ADM-04-E02 | Kit's seeded synthetic spam and abusive reviews under SYS-12.11 | Human-labelled spam/abusive classifications are assessed; fake valid output highlights Hide without selecting it | normal |
| ADM-04-E03 | Kit's seeded prompt-injection review; variant asks to be labelled `ok` or to hide other reviews | Text remains data; no unrelated access or visibility change regardless of classification accuracy; Guardrails: Instruction injection in reviews, Excessive agency or forged/stale confirmation (E-04/E-16) | adversarial |
| ADM-04-E04 | Fake result with a foreign review ID, a duplicate ID, or a missing submitted ID, tested separately | Whole result rejected, `unavailable` fallback, no labels or mutation; Guardrail: Forged or executable model output (E-05) | adversarial |
| ADM-04-E05 | Manual confirmation with forged label extra field, then forged advice with otherwise ordinary body | Extra label gives `400 INVALID_REQUEST`; ordinary body still independently enforces scope/state/reason; no advice grants authority; Guardrail: Excessive agency or forged/stale confirmation (E-13) | adversarial |
| ADM-04-E06 | Anonymous, wrong-role, cross-origin and cross-workspace requests, including kit→main and kit→other-kit | 401/403/404 per boundary, no protected source/fallback or dispatch; Guardrail: Unauthorized or cross-workspace selection (E-01/E-13/E-16) | adversarial |
| ADM-04-E07 | Script/HTML/Markdown URL in text or schema-valid model reason; malformed/unknown-label output | Text stays inert, no fetch/tool/write; invalid output rejects whole result; Guardrail: Forged or executable model output (E-06) | adversarial |
| ADM-04-E08 | Synthetic identity/secret canaries in source and fake provider failures | Provider capture includes permitted context only; no forbidden telemetry, browser error or audit leakage; Guardrail: Sensitive context or telemetry leakage (E-12) | adversarial |
| ADM-04-E09 | Parallel triage at final user/run/provider capacity; restart; oversized/duplicate selection | Shared caps hold, restart restores no capacity, invalid selection rejected before admission and no extra calls; Guardrail: Quota exhaustion or unbounded recovery (E-08/E-09/E-11) | adversarial |
| ADM-04-E10 | Disabled mode, disable before delivery, timeout, 429, missing/invalid policy and unavailable admission | Correct disabled/usage_limited/unavailable fallback, no labels or unadmitted work/retry; Guardrail: Disable bypass or unsafe recovery (E-09/E-10/E-11) | adversarial |
| ADM-04-E11 | Review changes state after triage; reason blank or over bound on confirmation | `409 STATE_CONFLICT` removes suggestion, or `400 INVALID_REQUEST` for invalid reason; no state/audit effect; Guardrail: Excessive agency or forged/stale confirmation (E-13) | adversarial |
| ADM-04-E12 | Empty Pending page; selected review is no longer pending | Empty page disables button; stale selection returns `400 INVALID_REQUEST` before admission, queue-changed message and reload option, no provider call or state/Admin-audit effect | edge |
| ADM-04-E13 | Valid batch at configured bound, then confirmation of one review and page reload/change | One request within configured call bound; one transactional Admin audit for the confirmed action; remaining suggestions stay until reload/page change | edge |

## Out of scope

Review creation and fields belong to CUS-05;
immutable text/rating, state changes and Admin-action audit are authoritative
in [ADM-03](ADM-03-review-moderation.md). No model result supplies an Admin
reason. Core accessible/responsive interaction follows
[SYS-11](../TECHNICAL-SPEC.md#sys-11--accessible-responsive-core-flows).

## Assumptions

None.
