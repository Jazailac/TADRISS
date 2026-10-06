-- Tenancy: institutions + profiles RLS for every role, cross-tenant denial, the access-token
-- hook and the onboarding trigger. Everything runs in one transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- ── fixtures (as postgres, bypassing RLS) ────────────────────────────────────
insert into public.institutions (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001', 'École A', 'ecole-a'),
  ('b0000000-0000-4000-8000-000000000001', 'École B', 'ecole-b');

insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-0000000000aa', 'admin-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a7', 'teacher-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a5', 'student-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a6', 'student2-a@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('c0000000-0000-4000-8000-0000000000cc', 'ops@test.ma'),
  ('d0000000-0000-4000-8000-0000000000dd', 'inactive@test.ma');

insert into public.profiles (id, institution_id, role, first_name, last_name, is_active) values
  ('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000001', 'institution_admin', 'Amal', 'A', true),
  ('a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tarik', 'A', true),
  ('a0000000-0000-4000-8000-0000000000a5', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sara', 'A', true),
  ('a0000000-0000-4000-8000-0000000000a6', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sami', 'A', true),
  ('b0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-000000000001', 'institution_admin', 'Badr', 'B', true),
  ('c0000000-0000-4000-8000-0000000000cc', null, 'super_admin', 'Omar', 'Ops', true),
  ('d0000000-0000-4000-8000-0000000000dd', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Ines', 'A', false);

-- Impersonate a signed-in user with the claims the hook would issue.
create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
declare c jsonb;
begin
  reset role;
  select (private.custom_access_token_hook(jsonb_build_object('user_id', uid, 'claims',
            jsonb_build_object('sub', uid, 'role', 'authenticated')))) -> 'claims' into c;
  perform set_config('request.jwt.claims', c::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

-- ── access-token hook ────────────────────────────────────────────────────────
select is(
  private.custom_access_token_hook('{"user_id":"a0000000-0000-4000-8000-0000000000aa","claims":{"sub":"x"}}') -> 'claims' ->> 'user_role',
  'institution_admin', 'hook: adds user_role');
select is(
  private.custom_access_token_hook('{"user_id":"a0000000-0000-4000-8000-0000000000aa","claims":{}}') -> 'claims' ->> 'institution_id',
  'a0000000-0000-4000-8000-000000000001', 'hook: adds institution_id');
select is(
  private.custom_access_token_hook('{"user_id":"c0000000-0000-4000-8000-0000000000cc","claims":{}}') -> 'claims' ->> 'institution_id',
  null, 'hook: super_admin has no institution');
select ok(
  not (private.custom_access_token_hook('{"user_id":"d0000000-0000-4000-8000-0000000000dd","claims":{"user_role":"teacher"}}') -> 'claims' ? 'user_role'),
  'hook: deactivated user gets no role claim (and stale ones are stripped)');
select ok(
  not (private.custom_access_token_hook('{"user_id":"e0000000-0000-4000-8000-0000000000ee","claims":{}}') -> 'claims' ? 'user_role'),
  'hook: user without a profile gets no role claim');
select ok(not has_function_privilege('authenticated', 'private.custom_access_token_hook(jsonb)', 'execute'),
  'hook: not callable by authenticated');

-- ── institution_admin (A) ────────────────────────────────────────────────────
reset role;
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select results_eq('select slug from public.institutions', $$ values ('ecole-a') $$, 'admin A: sees only institution A');
select is((select count(*)::int from public.profiles), 5, 'admin A: sees every profile in A (incl. inactive), none from B');
select is((select count(*)::int from public.profiles where institution_id = 'b0000000-0000-4000-8000-000000000001'), 0,
  'admin A: cross-tenant profiles invisible');
update public.institutions set name = 'École A+' where id = 'a0000000-0000-4000-8000-000000000001';
update public.institutions set name = 'Hacked' where id = 'b0000000-0000-4000-8000-000000000001';
select throws_ok($$ update public.institutions set slug = 'nope' $$, '42501', null, 'admin A: slug is not updatable');
select throws_ok($$ update public.profiles set role = 'super_admin' where id = 'a0000000-0000-4000-8000-0000000000aa' $$,
  '42501', null, 'admin A: cannot change own role (column privilege)');
select throws_ok($$ insert into public.institutions (name, slug) values ('X', 'xxx') $$, '42501', null,
  'admin A: cannot insert institutions');
select throws_ok($$ delete from public.profiles where id = 'a0000000-0000-4000-8000-0000000000a5' $$, '42501', null,
  'admin A: cannot delete profiles');
select throws_ok($$ insert into public.profiles (id, institution_id, role, first_name, last_name)
                    values ('e0000000-0000-4000-8000-0000000000ee', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'X', 'Y') $$,
  '42501', null, 'admin A: cannot insert profiles directly');
reset role;
select is((select name from public.institutions where id = 'a0000000-0000-4000-8000-000000000001'), 'École A+',
  'admin A: updated own institution');
select is((select name from public.institutions where id = 'b0000000-0000-4000-8000-000000000001'), 'École B',
  'admin A: update on institution B affected nothing');

-- ── teacher (A) ──────────────────────────────────────────────────────────────
reset role;
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select results_eq('select first_name from public.profiles', $$ values ('Tarik') $$, 'teacher: sees only own profile');
select is((select count(*)::int from public.institutions), 1, 'teacher: sees own institution');
update public.institutions set name = 'Teacher edit';
update public.profiles set first_name = 'Tariq' where id = 'a0000000-0000-4000-8000-0000000000a7';
update public.profiles set first_name = 'Pwned' where id = 'a0000000-0000-4000-8000-0000000000a5';
reset role;
select is((select name from public.institutions where id = 'a0000000-0000-4000-8000-000000000001'), 'École A+',
  'teacher: cannot update institution');
select is((select first_name from public.profiles where id = 'a0000000-0000-4000-8000-0000000000a7'), 'Tariq',
  'teacher: can update own first name');
select is((select first_name from public.profiles where id = 'a0000000-0000-4000-8000-0000000000a5'), 'Sara',
  'teacher: cannot update another profile');

-- ── student (A) ──────────────────────────────────────────────────────────────
reset role;
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a5');
select results_eq('select first_name from public.profiles', $$ values ('Sara') $$, 'student: sees only own profile');
select throws_ok($$ update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-0000000000a5' $$,
  '42501', null, 'student: cannot deactivate self');
update public.profiles set locale = 'ar' where id = 'a0000000-0000-4000-8000-0000000000a5';
reset role;
select is((select locale from public.profiles where id = 'a0000000-0000-4000-8000-0000000000a5'), 'ar',
  'student: can set own locale');

-- ── institution_admin (B): the mirror image ──────────────────────────────────
reset role;
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select results_eq('select slug from public.institutions', $$ values ('ecole-b') $$, 'admin B: sees only institution B');
select results_eq('select first_name from public.profiles', $$ values ('Badr') $$, 'admin B: sees only B profiles');

-- ── deactivated user: no claims → nothing ────────────────────────────────────
reset role;
select pg_temp.as_user('d0000000-0000-4000-8000-0000000000dd');
select is((select count(*)::int from public.institutions), 0, 'deactivated: sees no institution');
select is((select count(*)::int from public.profiles), 0, 'deactivated: sees no profile, not even own');

-- ── super_admin ──────────────────────────────────────────────────────────────
-- "All" includes the seed, so compare with the true totals taken as postgres.
reset role;
create temp table totals as
  select (select count(*)::int from public.institutions) as institutions,
         (select count(*)::int from public.profiles) as profiles;
grant select on totals to authenticated;
reset role;
select pg_temp.as_user('c0000000-0000-4000-8000-0000000000cc');
select is((select count(*)::int from public.institutions), (select institutions from totals), 'super_admin: sees all institutions');
select is((select count(*)::int from public.profiles), (select profiles from totals), 'super_admin: sees all profiles');

-- ── anon ─────────────────────────────────────────────────────────────────────
reset role;
select pg_temp.as_anon();
select throws_ok('select 1 from public.institutions', '42501', null, 'anon: no access to institutions');
select throws_ok('select 1 from public.profiles', '42501', null, 'anon: no access to profiles');

-- ── soft delete ──────────────────────────────────────────────────────────────
reset role;
update public.profiles set deleted_at = now() where id = 'a0000000-0000-4000-8000-0000000000a6';
reset role;
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*)::int from public.profiles where id = 'a0000000-0000-4000-8000-0000000000a6'), 1,
  'soft delete: admin still sees deleted profiles');
reset role;
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a6');
select is((select count(*)::int from public.profiles), 0, 'soft delete: deleted user gets no claims, sees nothing');

-- ── constraints ──────────────────────────────────────────────────────────────
reset role;
select throws_ok($$ insert into public.profiles (id, institution_id, role, first_name, last_name)
                    values ('e0000000-0000-4000-8000-0000000000ee', 'a0000000-0000-4000-8000-000000000001', 'super_admin', 'X', 'Y') $$,
  '23514', null, 'constraint: super_admin cannot belong to an institution');
select throws_ok($$ insert into public.institutions (name, slug) values ('Bad slug', 'Bad Slug') $$,
  '23514', null, 'constraint: slug format');

-- ── onboarding trigger ───────────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-8000-0000000000f1', 'dir@almanar.ma',
   '{"signup_intent":"create_institution","institution_name":"Groupe scolaire Al Manar","first_name":"Salma","last_name":"Benali","locale":"ar"}');
select results_eq(
  $$ select p.role, i.slug, i.default_locale, p.locale from public.profiles p join public.institutions i on i.id = p.institution_id
     where p.id = 'f0000000-0000-4000-8000-0000000000f1' $$,
  $$ values ('institution_admin'::text, 'groupe-scolaire-al-manar'::text, 'ar'::text, 'ar'::text) $$,
  'onboarding: creates institution + admin profile with slug and locale');

insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-8000-0000000000f2', 'dir2@almanar.ma',
   '{"signup_intent":"create_institution","institution_name":"Groupe Scolaire AL-MANAR","first_name":"Y","last_name":"Z"}');
select is((select i.slug from public.profiles p join public.institutions i on i.id = p.institution_id
           where p.id = 'f0000000-0000-4000-8000-0000000000f2'), 'groupe-scolaire-al-manar-2',
  'onboarding: duplicate slugs get a numeric suffix');

insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-8000-0000000000f3', 'arabic@almanar.ma',
   '{"signup_intent":"create_institution","institution_name":"مدرسة المنار","first_name":"س","last_name":"ب","locale":"xx"}');
select results_eq(
  $$ select i.slug, i.default_locale from public.profiles p join public.institutions i on i.id = p.institution_id
     where p.id = 'f0000000-0000-4000-8000-0000000000f3' $$,
  $$ values ('ecole'::text, 'fr'::text) $$,
  'onboarding: Arabic-only names fall back to a valid slug; unknown locale falls back to fr');

select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data) values ('f0000000-0000-4000-8000-0000000000f4', 'x@y.ma',
       '{"signup_intent":"create_institution","institution_name":"X","first_name":"A","last_name":"B"}') $$,
  '23514', null, 'onboarding: invalid institution name aborts the whole sign-up');
select is((select count(*)::int from auth.users where id = 'f0000000-0000-4000-8000-0000000000f4'), 0,
  'onboarding: no orphan auth user after a failed sign-up');

insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-8000-0000000000f5', 'invited@almanar.ma', '{"first_name":"Invited"}');
select is((select count(*)::int from public.profiles where id = 'f0000000-0000-4000-8000-0000000000f5'), 0,
  'onboarding: users without the intent are not provisioned here');

select * from finish();
rollback;
