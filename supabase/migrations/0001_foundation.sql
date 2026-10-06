-- 0001_foundation: schemas, privileges and shared helpers. No tenant tables yet.
-- Forward-only: never edit this file after merge (CLAUDE.md, database rules).

-- `private` holds helpers that must not be exposed through the Data API (PostgREST only
-- exposes `public`). RLS helpers and triggers live here.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Functions are not callable by default. Each RPC is granted explicitly in the migration
-- that creates it, so a forgotten GRANT fails closed rather than open.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

-- Generic `updated_at` maintenance for every table that has the column.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
