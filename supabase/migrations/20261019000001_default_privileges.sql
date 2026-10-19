-- Per-schema REVOKE cannot remove PostgreSQL's global PUBLIC EXECUTE default.
-- Clear global defaults too so future objects need deliberate grants.
alter default privileges for role postgres
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres
  revoke all on sequences from public, anon, authenticated, service_role;
