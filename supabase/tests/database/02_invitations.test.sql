-- Users & invitations: invitations RLS for every role, admin member management on profiles,
-- cross-tenant denial, and the provisioning triggers' trust boundary (invited_at).
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- ── fixtures (as postgres, bypassing RLS) ────────────────────────────────────
insert into public.institutions (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001', 'École A', 'ecole-a'),
  ('b0000000-0000-4000-8000-000000000001', 'École B', 'ecole-b');

insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-0000000000aa', 'admin-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a7', 'teacher-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a5', 'student-a@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b7', 'teacher-b@test.ma');

insert into public.profiles (id, institution_id, role, first_name, last_name, email) values
  ('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000001', 'institution_admin', 'Amal', 'A', 'admin-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tarik', 'A', 'teacher-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a5', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sara', 'A', 'student-a@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-000000000001', 'institution_admin', 'Badr', 'B', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b7', 'b0000000-0000-4000-8000-000000000001', 'teacher', 'Basma', 'B', 'teacher-b@test.ma');

insert into public.invitations (id, institution_id, email, role, first_name, last_name, invited_by) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'pending-a@test.ma', 'student', 'Pia', 'A', 'a0000000-0000-4000-8000-0000000000aa'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'pending-b@test.ma', 'teacher', 'Pol', 'B', 'b0000000-0000-4000-8000-0000000000bb');

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

-- ── institution_admin (A) ────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');

select results_eq('select id from public.invitations',
  $$ values ('a1000000-0000-4000-8000-000000000001'::uuid) $$,
  'admin A: sees only own institution''s invitations');

select lives_ok(
  $$ insert into public.invitations (institution_id, email, role, first_name, last_name)
     values ('a0000000-0000-4000-8000-000000000001', 'fresh@test.ma', 'teacher', 'Fay', 'A') $$,
  'admin A: can invite into own institution');

select throws_ok(
  $$ insert into public.invitations (institution_id, email, role, first_name, last_name)
     values ('b0000000-0000-4000-8000-000000000001', 'x@test.ma', 'teacher', 'X', 'Y') $$,
  '42501', null, 'admin A: cannot invite into institution B');

select throws_ok(
  $$ insert into public.invitations (institution_id, email, role, first_name, last_name)
     values ('a0000000-0000-4000-8000-000000000001', 'boss@test.ma', 'institution_admin', 'X', 'Y') $$,
  '23514', null, 'admin A: cannot invite an admin (check constraint)');

select throws_ok(
  $$ insert into public.invitations (institution_id, email, role, first_name, last_name)
     values ('a0000000-0000-4000-8000-000000000001', 'fresh@test.ma', 'student', 'Dup', 'A') $$,
  '23505', null, 'admin A: only one pending invitation per address');

select throws_ok(
  $$ insert into public.invitations (institution_id, email, role, first_name, last_name)
     values ('a0000000-0000-4000-8000-000000000001', 'Mixed@Test.ma', 'student', 'Case', 'A') $$,
  '23514', null, 'admin A: email must be stored lowercase');

select lives_ok(
  $$ update public.invitations set expires_at = now() + interval '14 days'
     where id = 'a1000000-0000-4000-8000-000000000001' $$,
  'admin A: can extend a pending invitation');

select throws_ok(
  $$ update public.invitations set email = 'hijack@test.ma' where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'admin A: cannot change the invited address (no column grant)');

select lives_ok(
  $$ update public.invitations set status = 'revoked', revoked_at = now()
     where id = 'b1000000-0000-4000-8000-000000000001' $$,
  'admin A: updating institution B''s invitation is a silent no-op');

select throws_ok($$ delete from public.invitations where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'admin A: cannot delete invitations');

-- ── institution_admin (B) ────────────────────────────────────────────────────
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select results_eq('select id from public.invitations',
  $$ values ('b1000000-0000-4000-8000-000000000001'::uuid) $$,
  'admin B: sees only own institution''s invitations');

reset role;
select is((select status from public.invitations where id = 'b1000000-0000-4000-8000-000000000001'),
  'pending', 'cross-tenant: admin A did not revoke B''s invitation');

-- ── teacher and student ──────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is_empty('select 1 from public.invitations', 'teacher: sees no invitations');
select throws_ok(
  $$ insert into public.invitations (institution_id, email, role, first_name, last_name)
     values ('a0000000-0000-4000-8000-000000000001', 't@test.ma', 'student', 'T', 'T') $$,
  '42501', null, 'teacher: cannot invite');
select throws_ok($$ delete from public.invitations $$, '42501', null, 'teacher: cannot delete invitations');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a5');
select is_empty('select 1 from public.invitations', 'student: sees no invitations');
select throws_ok(
  $$ insert into public.invitations (institution_id, email, role, first_name, last_name)
     values ('a0000000-0000-4000-8000-000000000001', 's@test.ma', 'student', 'S', 'S') $$,
  '42501', null, 'student: cannot invite');

select pg_temp.as_anon();
select throws_ok('select 1 from public.invitations', '42501', null, 'anon: no access to invitations');

-- ── admin member management on profiles ──────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select lives_ok($$ update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-0000000000a5' $$,
  'admin A: can deactivate a student');
select lives_ok($$ update public.profiles set first_name = 'Sarah' where id = 'a0000000-0000-4000-8000-0000000000a7' $$,
  'admin A: can edit a teacher''s name');
select throws_ok($$ update public.profiles set role = 'institution_admin' where id = 'a0000000-0000-4000-8000-0000000000a7' $$,
  '42501', null, 'admin A: cannot change anyone''s role');
select throws_ok($$ update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-0000000000aa' $$,
  '42501', null, 'admin A: cannot deactivate self');
select lives_ok($$ update public.profiles set is_active = false where id = 'b0000000-0000-4000-8000-0000000000b7' $$,
  'admin A: deactivating another institution''s teacher is a silent no-op');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select lives_ok($$ update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-0000000000a5' $$,
  'teacher: deactivating a student is a silent no-op');

reset role;
select is((select is_active from public.profiles where id = 'a0000000-0000-4000-8000-0000000000a5'), false,
  'student A was deactivated by the admin only');
select is((select first_name from public.profiles where id = 'a0000000-0000-4000-8000-0000000000a7'), 'Sarah',
  'teacher A was renamed by the admin');
select is((select is_active from public.profiles where id = 'a0000000-0000-4000-8000-0000000000aa'), true,
  'admin A is still active');
select is((select is_active from public.profiles where id = 'b0000000-0000-4000-8000-0000000000b7'), true,
  'cross-tenant: teacher B is still active');

-- ── provisioning triggers (as postgres) ──────────────────────────────────────
-- Claiming the intent without `invited_at` (a public sign-up) provisions nothing.
insert into auth.users (id, email, raw_user_meta_data) values
  ('c0000000-0000-4000-8000-000000000001', 'pending-a@test.ma',
   '{"signup_intent":"accept_invitation","invitation_id":"a1000000-0000-4000-8000-000000000001"}');
select is_empty($$ select 1 from public.profiles where id = 'c0000000-0000-4000-8000-000000000001' $$,
  'trigger: intent without invited_at creates no profile');

select throws_ok(
  $$ insert into auth.users (id, email, invited_at, raw_user_meta_data)
     values ('c0000000-0000-4000-8000-000000000002', 'someone-else@test.ma', now(),
             '{"signup_intent":"accept_invitation","invitation_id":"a1000000-0000-4000-8000-000000000001"}') $$,
  'P0001', 'invalid_invitation', 'trigger: invitation for another address is rejected');

insert into public.invitations (id, institution_id, email, role, first_name, last_name, invited_by, expires_at) values
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'late@test.ma', 'student', 'Lea', 'A',
   'a0000000-0000-4000-8000-0000000000aa', now() - interval '1 day');
select throws_ok(
  $$ insert into auth.users (id, email, invited_at, raw_user_meta_data)
     values ('c0000000-0000-4000-8000-000000000003', 'late@test.ma', now(),
             '{"signup_intent":"accept_invitation","invitation_id":"a1000000-0000-4000-8000-000000000002"}') $$,
  'P0001', 'invalid_invitation', 'trigger: expired invitation is rejected');

-- `fresh@test.ma` was invited by admin A above and is still pending.
insert into auth.users (id, email, invited_at, raw_user_meta_data)
select 'c0000000-0000-4000-8000-000000000004', 'Fresh@Test.ma', now(),
       jsonb_build_object('signup_intent', 'accept_invitation', 'invitation_id', i.id, 'locale', 'ar')
from public.invitations i where i.email = 'fresh@test.ma';
select results_eq(
  $$ select institution_id, role, first_name, locale, email from public.profiles where id = 'c0000000-0000-4000-8000-000000000004' $$,
  $$ values ('a0000000-0000-4000-8000-000000000001'::uuid, 'teacher', 'Fay', 'ar', 'fresh@test.ma') $$,
  'trigger: valid invitation provisions the right profile');

select is((select status from public.invitations where email = 'fresh@test.ma'), 'pending',
  'invitation stays pending until the invitee signs in');
update auth.users set last_sign_in_at = now() where id = 'c0000000-0000-4000-8000-000000000004';
select is((select status from public.invitations where email = 'fresh@test.ma'), 'accepted',
  'first sign-in marks the invitation accepted');

update auth.users set email = 'tarik-new@test.ma' where id = 'a0000000-0000-4000-8000-0000000000a7';
select is((select email from public.profiles where id = 'a0000000-0000-4000-8000-0000000000a7'), 'tarik-new@test.ma',
  'changing the auth email syncs profiles.email');

select ok(not has_function_privilege('authenticated', 'private.accept_invitation_on_sign_in()', 'execute'),
  'accept trigger function is not callable by authenticated');

select * from finish();
rollback;
