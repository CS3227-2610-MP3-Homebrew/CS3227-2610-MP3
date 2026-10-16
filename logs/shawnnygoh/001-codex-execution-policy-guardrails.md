# Codex Execution Policy Guardrails

## Goal
Allow `bun run verify` to run outside the Codex sandbox so the Next.js/Turbopack build can bind a local port, and add execution-policy blocks for the specified commands forbidden by AGENTS.md.

## Scope
Five user-assistant exchanges, including logging and the accuracy correction, covering one focused execution-policy task and its verification.

## Key prompts
> Add a Codex execution-policy rule so `bun run verify` can run outside the sandbox. Read AGENTS.md first.

This requested a narrowly scoped allow rule because the build needs a local port blocked by the sandbox.

> Add a second rules file that blocks the commands AGENTS.md forbids agents from running. Don't change `.codex/rules/bun.rules`.

This requested separate forbidden rules for the listed Git, pull-request, Vercel and Supabase commands while preserving the existing allow rule.

## Decisions and corrections
- Read AGENTS.md before editing and used the OpenAI Docs skill to consult official execution-policy documentation.
- Created one allow rule with exactly `["bun", "run", "verify"]`, the requested justification and positive/negative examples; no package scripts were changed.
- Initial assistant-run policy checks returned `allow` for `bun run verify` and no matching rule for `bun run dev` or `bunx vercel deploy`; all exited 0.
- Initially did not execute verification, as instructed; after the user requested it, the assistant-run `bun run verify` passed outside the sandbox with exit code 0, including lint, typecheck and production build.
- That build emitted a non-fatal warning about ignoring `/Users/shawnnygoh/package-lock.json` outside the repository.
- Created ten forbidden rules with AGENTS.md justifications and match/not-match examples, covering the exact requested prefixes and ordinary-command counterexamples.
- Assistant-run combined policy checks returned `allow` for `bun run verify`, `forbidden` for `git push origin master`, `bunx vercel deploy --prod` and `supabase db push`, and no matching rule for `git status`; all exited 0.
- Policy checks emitted a non-fatal PATH-alias permission warning; no check failed.
- The user clarified that they personally renamed `.codex/rules/bun.rules` to `.codex/rules/allow.rules` after the implementation session.
- The user also ran policy checks and a live `bun run verify` test in a separate session; these are user-reported validation, distinct from the assistant-run checks above.
- With `R="--rules .codex/rules/allow.rules --rules .codex/rules/guardrails.rules"`, the user reported these results for `codex execpolicy check --pretty $R -- <command>`: `bun run verify` → `allow`; `git push origin master` → `forbidden`; `bunx vercel deploy --prod` → `forbidden`; `supabase db push` → `forbidden`; `bun install` → no matching rule; `git status` → no matching rule.
- Used `shawnnygoh` as user-provided attribution without an account lookup; no commits, pushes or deployments were made.

## Files created or modified
- `.codex/rules/allow.rules` — created as `bun.rules` during the session and subsequently renamed by the user.
- `.codex/rules/guardrails.rules` — created with the ten requested forbidden rules.
