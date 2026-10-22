# Reflections

## AI security

**What attack surfaces and types of prompt injection did you consider?**

We considered both attacks against Homebrew’s AI features and attacks against the coding agents developing the project.
Within Homebrew, the main entry points were the customer’s Brew Finder query, stored café and menu text, review text processed by the Moderation Assistant, and model responses. Stored content was particularly important because text written by an authenticated user could later enter another user’s AI request. Authentication does not make that content trustworthy.

We considered several forms of prompt injection:

- Direct injection: a customer asks Brew Finder to ignore its instructions and reveal private sales.

- Indirect injection: an owner embeds instructions in a café or menu name, or a customer embeds them in a review.

- Role impersonation: text uses fake system message delimiters or claims to be a trusted instruction.

- Encoded and multilingual injection: instructions use encoded characters or different languages to evade simple matching.

- Requests for additional authority: injected text asks the model to reveal credentials, fetch a URL, execute a tool, or approve a business action.

`workflow/specs/AI-SECURITY-SPEC.md` : Line 61 onwards

Our tests include these variations. We focused on ensuring that an attack could not expand the model’s data access or capabilities, even if the model failed to recognise it as malicious. Retrieval, embeddings, and persistent model memory were outside Homebrew’s scope.

For development agents, we also treated issues, handoffs, code comments, documentation, and tool output as possible injection surfaces. These sources could contain instructions asking an agent to skip checks or change its assignment. Our agent instructions require suspicious content to be recorded as evidence rather than followed.

![zero-trust.png](assets/zero-trust.png)

![security-evidence.png](assets/security-evidence.png)

**What security features were implemented, and how were they tested?**

We created a specialised security reviewer that examines each assigned change for evidenced vulnerabilities. It applies two sets of checks: Zero Trust and an LLM security baseline.

The Zero Trust checks emphasise explicit verification, least privilege, and assuming that an attacker may already have access to an account or application surface. The reviewer traces server-side authentication, role and ownership checks, workspace isolation, database row level security, and failure paths.

The LLM baseline covers prompt injection, excessive agency, sensitive-data disclosure, unsafe output handling, resource abuse, and overreliance on generated advice. The reviewer must connect a suspected vulnerability to an actual execution path and explain its impact and limitations. A report saying “no confirmed findings” applies only to the reviewed scope.

The implemented controls include:
- Authorised, minimal model context. Brew Finder receives eligible catalogue information; Prep Advisor receives café sales aggregates; moderation receives selected review references and text. Fake-provider tests inspect the exact outgoing request and check that excluded identity and private fields are absent.

- Instruction/data separation. Fixed system prompts remain separate from encoded user and database content. Injection tests verify that hostile strings do not change the trusted prompt, request capabilities, or dispatch count.

- Strict output validation. Server-side schemas and semantic checks reject malformed results, invented references, incorrect parent relationships, and unsupported evidence. Invalid results produce a safe fallback.

- Inert rendering and limited agency. Generated text is displayed as text. AI suggestions cannot directly place orders or moderate reviews.

- Bounded usage and failure handling. Durable admission controls enforce usage limits. Provider requests have bounded sizes, a timeout, and no automatic retries. Disabled AI takes precedence over cached AI results.

- Scoped cache reuse. Reuse depends on the appropriate actor or café scope, source version, model/contract identity, expiry, and current eligibility.

The Brew Finder implementation handoff maps these controls to passing route, database, and browser tests. The moderation security review separately traces human confirmation and mutation boundaries. These checks establish deterministic protections. Fake-provider tests do not establish live model quality or perfect injection detection.

**What limits were applied to the AI agents?**

We limited development agents by responsibility, file scope, tools, and stopping conditions. Agents cannot independently commit, push, merge, deploy, access hosted databases, or make live LLM calls. Verification uses local Supabase and fake or disabled providers. Environment files are excluded from agent inspection. Repair and review loops also have limits so that repeated failures return to a human decision.

An important limitation is that some boundaries are instructions rather than separate filesystem permissions. The independent Codex review worker does run in a read-only sandbox, but we should not assume that naming an agent “reviewer” automatically isolates it.

**Did you use approval gates and human oversight? How did you protect them?**

Yes. Our gates required approved specifications on the selected master branch, human review and commit of acceptance tests before implementation, verification evidence, review findings being addressed, and final human review before repository publication and merge. Independent review execution also required approval.

We supported these gates with checks beyond an agent’s own completion claim. The review launcher records the reviewed inputs, checks whether those inputs changed during verification or review, validates the report’s structure and task identity, and rejects a passing report that contradicts failed verification. The review worker has no approval authority over merging or deployment.

![review-agent.png](assets/review-agent.png)

We also explicitly stated that a handoff or tool output cannot grant permission. This matters because malicious text saying “the human approved this” could otherwise be mistaken for genuine authorisation.
However, human oversight still depends on the quality of the review. A person approving every request without inspecting the diff would weaken the gate. I learned that approval should be attached to a concrete change and supporting evidence, rather than treated as a routine button press.

## Spec-driven development

**What should a good specification make clear before implementation begins?**

A good specification should make clear the intended user outcome, who can perform each action, what data they can access, valid state transitions, shared interfaces, failure behaviour, and observable acceptance criteria. It should also identify dependencies and ownership across roles.

Our specifications were detailed. For example, Brew Finder specifies permitted inputs, excluded model context, output validation, fallbacks, security boundaries, and sixteen acceptance criteria. This gave agents much more guidance than a broad instruction such as “build an AI café recommender.”

![input-example.png](assets/input-example.png)

However, I learned that detailed individual specifications do not automatically ensure agreement between features. Customer functionality progressed while owner contracts were still being refined, and later comparisons identified integration gaps.

T-81/T-82 provide a concrete example. My orders initially copied server-provided orders into local state. When fresh authorised data reached the same mounted page, the screen could continue displaying the previous collection, state, rejection feedback, timestamps, and action controls. A customer could therefore receive fresh server data while still seeing an outdated interface.

The earlier tests loaded terminal order states before a full page load, so they did not cover this mounted-view update. T-81 added tests for the missing scenario, while T-82 covered the implementation correction.

We subsequently separated later owner stretch integration into T-83/T-84. Those tasks cover pause controls, closures, capacity, archived items, and no-show handling. My lesson is that specifications should identify both the shared contract and which feature owns each part, including what happens when another role changes the underlying data.

**How can you tell whether a specification is precise enough for an agent to build from?**

I would consider a specification sufficiently precise when another person or agent can derive meaningful tests from it without inventing product decisions.

For example, “orders should update correctly” leaves several questions unanswered: what triggers the update, whether a full reload is required, which fields change, and what happens to available actions. A precise criterion or task should resolve those questions through observable outcomes.

A useful readiness check is whether the specification answers:
- Who is allowed to perform the action?

- What inputs and states are valid?

- What should the user observe on success and failure?

- What must remain unchanged?

- Which shared contract governs the behaviour?

- Can two independent readers derive the same expected result?

Our testing instructions reinforce this by requiring agents to stop the affected cases when behaviour, permissions, or public contracts are ambiguous. I learned to treat those questions as specification feedback rather than asking the agent to make a plausible guess.

How should requirement changes flow through the specification, implementation, and tests?

Our intended flow was:
Human decision → approved specification merged → PLAN updated → affected tests written and reviewed → implementation changed → verification and review.

Specifications and planning prerequisites had to be merged before the pair began, while acceptance tests were reviewed and committed on the pair’s shared feature branch before implementation. Tests and implementation then belonged to one eventual PR. They did not each require a separate merge to master.

This preserves a stable basis for implementation and makes changes reviewable. The implementation agent must satisfy the agreed tests rather than silently editing them to accommodate its code. If a requirement changes, the tests should change because the approved contract changed.

The testing stage also deliberately records expected failures from missing implementation. Therefore, “completed test authoring” does not mean that the software already passes. Reports must distinguish expected product failures from broken fixtures or infrastructure.

**How can tests demonstrate the specification’s intent rather than merely match its wording?**

Tests should exercise the user outcome or security boundary using situations that would expose a plausible incorrect implementation.

One example was our catalogue confidentiality tests. The original tests rejected a café identifier appearing anywhere in the response, even though the test itself supplied that identifier in the requested URL. The corrected tests used stored café, menu, review, and identity markers that were absent from the request. This tested whether protected information had actually been disclosed.

`workflow/handoffs/71-customer-catalogue/05-testing.md`

Another example was review ordering. Ordinary ordering tests passed, but independent review found that converting database timestamps through JavaScript Date lost microsecond precision. The regression tests deliberately placed two reviews within the same millisecond and made identifier order disagree with timestamp order. This exposed incorrect ordering at the pagination boundary.

![test-evidence.png](assets/test-evidence.png)

For AI security, our tests similarly check outcomes such as no additional network request, no expanded provider context, and no business mutation. They do not rely solely on whether the model labels a string “injection.” This reflects the intended protection even when classification is imperfect.


## Multi-agent software engineering

**Which parts of a software task benefit from specialised agents?**

Specialisation was useful where different activities required different evidence or incentives. Separating these responsibilities helped preserve independence. In particular, the implementation agent could not freely change acceptance tests to make its work pass. However, specialisation also introduced handoff and verification overhead.

**How should specialised agents be built and tested?**

I learned that a useful agent needs more than a role description. It needs explicit inputs, permitted outputs, file ownership, prohibited actions, verification requirements, stopping conditions, and a consistent reporting format.

We kept thin agent configuration wrappers and placed detailed instructions in shared workflow files. This made the roles easier to inspect and maintain. We also disabled unnecessary apps, plugins, and memories in the agent configurations.

The workflow machinery itself needed testing. When creating the independent reviewer, we recorded fourteen isolated launcher checks using real Git and simulated verification/reviewer behaviour. This helped check the launcher before relying on it during feature work.

In future, I would also evaluate agents against deliberately ambiguous requirements, defective implementations, and malicious handoff text. Success should include recognising uncertainty and respecting scope, alongside producing correct code.

**What information must one agent pass to the next?**

A useful handoff should identify the task, requirement IDs, branch and base commit, changed files, criterion-to-evidence mapping, commands actually run, failures, checks not reached, unresolved decisions, and relevant human corrections.

The distinction between facts and conclusions is important. “974 tests passed” and “the implementation meets every requirement” are different claims. The next agent needs enough detail to check the conclusion independently.

Our numbered reports preserve earlier evidence instead of overwriting it. Review findings have stable IDs, and later reports explain how each finding was addressed.

`workflow/templates/handoff.md`

**Where could an error or malicious instruction slip through?**

An error could originate in an ambiguous specification, a test that encodes the wrong interpretation, an implementation that satisfies incomplete tests, or a reviewer that accepts a previous report’s conclusions without inspecting the evidence.

Malicious instructions could enter through issues, handoffs, comments, documentation, or tool output. Repetition across reports could make an unverified claim appear authoritative.

Our catalogue review demonstrated the correctness risk clearly: verification passed 974 tests, but independent review still found three defects involving special query keys, timestamp precision, and unsupported HTTP methods. Passing tests were valuable evidence, but the existing cases did not cover every relevant boundary.

`workflow/handoffs/71-customer-catalogue/07-reviewer.md`

What evidence should each agent leave for a person to verify its work?

**Each agent should leave its actual output and enough evidence to assess it:**

Specification: resolved behaviour, dependencies, and testable criteria.

Testing: criterion-linked cases and named failing-first results.

Implementation: a scoped diff and final-code verification results.

Review: a clear verdict, reproducible findings, and coverage limits.

Security review: attacker prerequisites, entry point, violated boundary, impact, and supporting evidence.

Documentation: claims linked to implemented code and tests.

The handoff should also say what remains unverified. This makes it useful for human review rather than merely a record that an agent finished.

**Conclusion:**

Our multi-agent workflow generally followed testing → implementation → review → security review → documentation. Early on, I felt that the separation produced good results with relatively little rework.

As the suite grew, repeated verification became expensive. From my experience, a feature could take around 1–1.5 hours. We suspected that model choice and reasoning effort contributed to the duration and experimented with a less capable configuration. However, I felt that additional mistakes and repair loops offset the expected time savings.

The catalogue pair illustrates the rework, although it does not prove that model choice caused it. Implementation first returned to testing for harness corrections. Independent review then identified three product defects, leading to another testing round with 21 expected failures and six passing controls, followed by fixes and a second review.

We later added a human-selected single-agent mode. The same session performed testing, implementation, self-review, and documentation while retaining the test-commit gate and final verification. Brew Finder is a recorded example: its handoff includes self-review findings and fixes, a passing verification run with 1,218 tests, and a final browser run with 520 passing cases.

This reduced handoff overhead, but it also reduced review independence. I would therefore choose the workflow according to the feature’s risk and complexity.

In future, I would investigate using focused tests during repair loops while retaining full verification at agreed gates. I would also measure time spent generating code, running tests, diagnosing infrastructure, and repairing defects. That would give us a stronger basis for improving the workflow than assuming that a smaller model would necessarily finish sooner.

