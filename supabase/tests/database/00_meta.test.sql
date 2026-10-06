-- Structural guards that every future migration must satisfy. These run against the whole
-- `public` schema, so a new table without RLS or a tenant policy fails CI immediately.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- 1. RLS is enabled on every table in public (CLAUDE.md data rule 1).
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'every public table has RLS enabled'
);

-- 2. Every table with institution_id has a RESTRICTIVE tenant policy (rule 2).
select is_empty(
  $$ select c.relname from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       join pg_attribute a on a.attrelid = c.oid and a.attname = 'institution_id' and not a.attisdropped
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid and not p.polpermissive) $$,
  'every tenant table has a restrictive policy'
);

-- 3. No SECURITY DEFINER functions in public: RPCs run as the caller so RLS applies (rule 5).
select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef $$,
  'no SECURITY DEFINER functions in public'
);

-- 4. anon cannot execute any function in public by default.
select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') $$,
  'anon cannot execute public functions'
);

-- 5. The private schema is not reachable by anon.
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon has no usage on private');

select * from finish();
rollback;
