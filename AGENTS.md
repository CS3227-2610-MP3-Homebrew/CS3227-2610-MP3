<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Implementation agent

The agent loads `.agents/skills/sdd-implement/SKILL.md` for its SDD workflow.
That skill routes to Supabase and SoC LLM references only for relevant features.

The project-scoped Codex agent `implementation` is defined in
`.codex/agents/implementation.toml`. When the user asks to use this agent,
delegate the scoped implementation task to it with the feature specification,
acceptance criteria, and any file ownership constraints. Do not delegate
automatically for every task. If no applicable spec exists, the agent requests
one before implementing the feature; it does not author specifications.

Example: "Use the implementation agent to implement the cafe search feature
from the supplied specification. Leave test creation to the testing agent."

The agent edits application code, styles, SQL migrations, and necessary
build/runtime configuration. It may read and run existing tests, but must not
create or modify tests, fixtures, mocks, snapshots, or test infrastructure; those
belong to a separate testing agent. It does not edit prose documentation, commit,
push, deploy, or modify hosted services. These are behavioral instructions, not
a separate filesystem security boundary; the agent inherits the parent session's
permissions.

## Project conventions

- Use the declared packageManager (currently Bun) and `bun.lock`; do not introduce
  other package-manager lockfiles. Add only dependencies needed by the task.
- Use TypeScript and React with the Next.js App Router in `src/app`. Keep server
  components by default; add client boundaries for browser behavior. Implement
  backend HTTP endpoints with Next.js route handlers.
- Use the installed Tailwind version and existing design tokens; reuse shadcn/ui
  components when available. Preserve accessibility and responsive behavior.
- Validate untrusted inputs on the server with Zod. Authenticate and authorize
  protected operations; keep secrets and privileged operations in server-only code.
- Target Vercel for the app and Supabase for PostgreSQL/Auth. GitHub Pages hosts
  the static product site only; do not convert the app to static export or put
  server behavior or secrets in the product site.
- Vitest and Playwright are the target test tools; a separate testing agent owns
  test authoring. GitHub Actions handles CI/CD and Docker runs local Supabase.
  Inspect actual dependencies and scripts before assuming these tools are set up.
