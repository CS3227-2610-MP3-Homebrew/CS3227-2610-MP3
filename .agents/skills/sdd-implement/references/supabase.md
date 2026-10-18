# Supabase implementation

Use for features touching PostgreSQL, Supabase Auth, authorization, or migrations.

- Follow existing version-compatible browser/server client patterns. Verify
  identity server-side with the supported Auth verification API; never trust a
  submitted user ID or client-only role check.
- Enforce the spec's customer, cafe owner, and admin permissions on the server
  and through appropriate row-level security policies. Check resource ownership
  on each protected operation. Do not infer role permissions absent from the spec.
- Keep the secret key server-only; avoid bypassing RLS for ordinary
  user requests. Never share-cache private user data.
- Use parameterized queries, transactions, and database constraints for applicable
  invariants such as order totals and status transitions.
- Express schema changes in new versioned SQL migrations with required constraints,
  indexes, and RLS policies. Do not rewrite applied migrations or apply changes to
  hosted Supabase. Regenerate types through the established repository workflow
  if a type-generation script exists.
- Use `bun run db:start` and `bun run db:reset` for the local Supabase Docker
  stack; the core-schema implementation task adds these scripts. Never use
  `supabase link` or hosted targets. Do not reset hosted databases or delete
  hosted user data. Fixtures are testing-owned. Report missing setup
  rather than connecting to production to verify a change.
