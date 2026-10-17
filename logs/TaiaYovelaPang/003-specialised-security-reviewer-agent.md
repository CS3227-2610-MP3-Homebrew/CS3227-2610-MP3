# Specialised Security Reviewer Agent

## Goal
Create a project-scoped security reviewer for Homebrew focused on Zero Trust principles and LLM-specific security threats.

## Scope
Two task-bearing user-assistant exchanges covering one focused agent-configuration task and its session log.

## Key prompts
> "Create a specialised security agent reviewer for me. this agent should review code for security vulnerabilities with focus on Zero Trust principles, and AI security (LLM specific threats)."

This requested a dedicated reviewer and established Zero Trust and LLM threats as its main areas of expertise.

## Decisions and corrections
- Followed the repository's existing convention: a short Codex TOML wrapper loading detailed instructions from `workflow/agents/`.
- Used the planned `security-reviewer` name, GPT-6.1 Sol and high reasoning effort. Disabled apps, plugins and memories, matching existing wrappers.
- Defined a review-only role that returns findings to the caller without editing files, implementing fixes, authoring tests or coordinating other agents. Explicitly distinguished behavioral restrictions from enforced sandbox isolation.
- Included authorization and ownership checks, least privilege, RLS, trust-boundary tracing, prompt injection, excessive agency, sensitive-data leakage, unsafe output handling, retrieval poisoning and resource/cost abuse.
- Required evidenced, severity-ranked findings with file references, attacker prerequisites, impact, mitigations considered, fix directions and verification limits. Unsupported hypotheses remain limitations rather than confirmed findings.
- Consulted official OpenAI custom-agent documentation. No security audit of application code was performed during this session.
- The sandbox required approval to install the prepared wrapper under `.codex/agents/`. The write succeeded after escalation.
- Initial `bun run verify` stopped because dependencies were absent. The first frozen-lockfile install encountered sandbox DNS failures; an escalated retry installed the pinned dependencies successfully.
- TOML validation and the final `bun run verify` passed: lint, typecheck, two tests, traceability and production build. `git diff --check` passed. No commits or pushes were made.

## Files created or modified
- `.codex/agents/security-reviewer.toml`
- `workflow/agents/security-reviewer.md`
