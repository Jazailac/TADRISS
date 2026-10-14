-- Exams and marks: RLS for every role, draft vs published, score invariants, save_grades.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

-- ── fixtures (as postgres) ───────────────────────────────────────────────────
insert into public.institutions (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001', 'École A', 'ecole-a'),
  ('b0000000-0000-4000-8000-000000000001', 'École B', 'ecole-b');
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000ee', 'ops@test.ma'),
  ('a0000000-0000-4000-8000-0000000000aa', 'admin-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a7', 'teacher-a1@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a8', 'teacher-a2@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a1', 'student-a1@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a2', 'student-a2@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a3', 'student-a3@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b1', 'student-b@test.ma');
insert into public.profiles (id, institution_id, role, first_name, last_name) values
  ('00000000-0000-4000-8000-0000000000ee', null, 'super_admin', 'Omar', 'Ops'),
  ('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000001', 'institution_admin', 'Amal', 'A'),
  ('a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tarik', 'A'),
  ('a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tania', 'A'),
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sara', 'A'),
  ('a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sami', 'A'),
  ('a0000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sofia', 'A'),
  ('b0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-000000000001', 'institution_admin', 'Badr', 'B'),
  ('b0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-000000000001', 'student', 'Bilal', 'B');
insert into public.classes (id, institution_id, name, school_year) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '6A', '2026-2027'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '6B', '2026-2027');
-- Tarik teaches 6A; Tania teaches 6A and 6B. Sara and Sami are in 6A, Sofia in 6B.
insert into public.class_teachers (class_id, teacher_id, institution_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001');
insert into public.enrolments (institution_id, class_id, school_year, student_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a1'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a2'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', '2026-2027', 'a0000000-0000-4000-8000-0000000000a3');



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



create function pg_temp.claims_role(uid uuid) returns text language sql security definer as $$
  select (private.custom_access_token_hook(jsonb_build_object('user_id', uid, 'claims', '{}'::jsonb))) -> 'claims' ->> 'user_role' $$;
grant execute on function pg_temp.claims_role(uuid) to authenticated;

-- ── plan and suspension are the platform operator's ─────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select throws_ok($$update public.institutions set plan = 'premium' where id = 'a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'a school cannot change its own plan');
select throws_ok($$update public.institutions set deleted_at = now() where id = 'a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'a school cannot suspend itself');
with u as (update public.institutions set city = 'Rabat' where id = 'a0000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 1::bigint, 'it can still edit its own contact details');
select pg_temp.as_user('00000000-0000-4000-8000-0000000000ee');
with u as (update public.institutions set plan = 'premium' where id = 'a0000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 1::bigint, 'the platform operator changes a school''s plan');

-- ── audit log: what is recorded ─────────────────────────────────────────────
select is((select details ->> 'to' from public.audit_log where action = 'institution.plan_changed'), 'premium', 'a plan change is audited with its new value');
select is((select count(*) from public.audit_log where action = 'institution.updated' and institution_id = 'a0000000-0000-4000-8000-000000000001'), 1::bigint, 'a profile edit is audited');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-0000000000a3';
insert into public.module_access (institution_id, role, module, enabled) values ('a0000000-0000-4000-8000-000000000001', 'student', 'payments', false);
select is((select count(*) from public.audit_log where action = 'member.deactivated' and entity_id = 'a0000000-0000-4000-8000-0000000000a3'), 1::bigint, 'deactivating a member is audited');
select is((select details ->> 'module' from public.audit_log where action = 'module.toggled'), 'payments', 'switching a module is audited');
select is((select actor_id from public.audit_log where action = 'member.deactivated'), 'a0000000-0000-4000-8000-0000000000aa'::uuid, 'with the person who did it');

-- ── audit log: who can read, nobody can write ───────────────────────────────
select is((select count(*) from public.audit_log where institution_id <> 'a0000000-0000-4000-8000-000000000001'), 0::bigint, 'an administrator reads only their school''s log');
select ok((select count(*) from public.audit_log) >= 4, 'and sees its events');
select throws_ok($$insert into public.audit_log (institution_id, action, entity) values ('a0000000-0000-4000-8000-000000000001', 'fake.event', 'x')$$, '42501', null, 'nobody can write the log through the API');
select throws_ok($$update public.audit_log set action = 'edited.event'$$, '42501', null, 'nor edit it');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'nor delete from it');
select throws_ok($$select private.audit_write('a0000000-0000-4000-8000-000000000001', 'fake.event', 'x', null, '{}')$$, '42501', null, 'nor call the writer');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select count(*) from public.audit_log), 0::bigint, 'a teacher cannot read the log');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.audit_log), 0::bigint, 'nor can a student');
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select is((select count(*) from public.audit_log where institution_id = 'a0000000-0000-4000-8000-000000000001'), 0::bigint, 'another school cannot read it');
select pg_temp.as_anon();
select throws_ok($$select count(*) from public.audit_log$$, '42501', null, 'anon cannot read the log');
select pg_temp.as_user('00000000-0000-4000-8000-0000000000ee');
select ok((select count(*) from public.audit_log) >= 4, 'the platform operator reads every school''s log');

-- ── suspension cuts a school off ────────────────────────────────────────────
select is(pg_temp.claims_role('a0000000-0000-4000-8000-0000000000a1'), 'student', 'a member of an active school gets tenant claims');
select is(pg_temp.claims_role('00000000-0000-4000-8000-0000000000ee'), 'super_admin', 'the operator has a role and no school');
with u as (update public.institutions set deleted_at = now() where id = 'a0000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 1::bigint, 'the operator suspends a school');
select is((select count(*) from public.audit_log where action = 'institution.suspended'), 1::bigint, 'the suspension is audited');
select is(pg_temp.claims_role('a0000000-0000-4000-8000-0000000000a1'), null, 'its members get no claims any more');
select is(pg_temp.claims_role('a0000000-0000-4000-8000-0000000000aa'), null, 'including its administrator');
select is(pg_temp.claims_role('b0000000-0000-4000-8000-0000000000b1'), 'student', 'another school is unaffected');
with u as (update public.institutions set deleted_at = null where id = 'a0000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 1::bigint, 'the operator restores it');
select is(pg_temp.claims_role('a0000000-0000-4000-8000-0000000000a1'), 'student', 'and its members are back');

-- ── platform overview ───────────────────────────────────────────────────────
select is((select count(*) from public.platform_institutions() where id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')), 2::bigint, 'the operator lists every school (this test''s two, among the seeded ones)');
select is((select students from public.platform_institutions() where id = 'a0000000-0000-4000-8000-000000000001'), 2, 'with active student counts (one is deactivated)');
select is((select plan from public.platform_institutions() where id = 'a0000000-0000-4000-8000-000000000001'), 'premium', 'and plans');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*) from public.platform_institutions()), 0::bigint, 'a school administrator gets nothing from the platform overview');

select * from finish();
rollback;
