-- Set passwords (from $POSTGRES_PASSWORD) on the Supabase roles that our SLIMMED
-- stack actually uses. The upstream script also alters supabase_functions_admin and
-- supabase_storage_admin, which only exist when the Functions/Storage services run —
-- we don't run those, so we only ALTER roles that actually exist (via \gexec).
--
-- NOTE: change to your own passwords for production environments.
\set pgpass `echo "$POSTGRES_PASSWORD"`

SELECT format('ALTER USER %I WITH PASSWORD %L', rolname, :'pgpass')
FROM pg_roles
WHERE rolname IN (
  'authenticator',
  'pgbouncer',
  'supabase_auth_admin',
  'supabase_storage_admin',
  'supabase_functions_admin'
)
\gexec
