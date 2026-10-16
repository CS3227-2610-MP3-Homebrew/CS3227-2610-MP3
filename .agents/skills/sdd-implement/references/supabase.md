# Supabase implementation

Use for features touching PostgreSQL, Supabase Auth, authorization, or migrations.

- Follow existing version-compatible browser/server client patterns. Verify
  identity server-side with the supported Auth verification API; never trust a
  submitted user ID or client-only role check.
- Enforce the spec's customer, cafe owner, and admin permissions on the server
  and through appropriate row-level security policies. Check resource ownership
  on each protected operation. Do not infer role permissions absent from the spec.
- Keep service-role credentials server-only; avoid bypassing RLS for ordinary
  user requests. Never share-cache private user data.
- Use parameterized queries, transactions, and database constraints for applicable
  invariants such as order totals, pickup capacity, and status transitions.
- Express schema changes in new versioned SQL migrations with required constraints,
  indexes, and RLS policies. Do not rewrite applied migrations or apply changes to
  hosted Supabase. Regenerate types through the established repository workflow.
- Use local Supabase through the repository's Docker setup when available. Do not
  reset databases, delete user data, or create test fixtures. Report missing setup
  rather than connecting to production to verify a change.
