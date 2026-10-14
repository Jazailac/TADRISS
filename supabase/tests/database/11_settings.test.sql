-- Exams and marks: RLS for every role, draft vs published, score invariants, save_grades.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- ── fixtures (as postgres) ───────────────────────────────────────────────────
insert into public.institutions (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001', 'École A', 'ecole-a'),
  ('b0000000-0000-4000-8000-000000000001', 'École B', 'ecole-b');
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-0000000000aa', 'admin-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a7', 'teacher-a1@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a8', 'teacher-a2@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a1', 'student-a1@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a2', 'student-a2@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a3', 'student-a3@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b1', 'student-b@test.ma');
insert into public.profiles (id, institution_id, role, first_name, last_name) values
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



create function pg_temp.invite(mail text, r text) returns void language sql as $$
  insert into public.invitations (institution_id, email, role, first_name, last_name)
  values ('a0000000-0000-4000-8000-000000000001', mail, r, 'Prénom', 'Nom') $$;
grant execute on function pg_temp.invite(text, text) to authenticated;

-- ── school profile ──────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
with u as (update public.institutions set phone = '0522000000', address = '1 rue du Test', city = 'Casablanca', name = 'École A+' where id = 'a0000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 1::bigint, 'an administrator edits their school''s name and contact details');
select throws_ok($$update public.institutions set plan = 'premium' where id = 'a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'a school cannot change its own plan');
select throws_ok($$update public.institutions set slug = 'autre' where id = 'a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'nor its slug');
with u as (update public.institutions set city = 'Rabat' where id = 'b0000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 0::bigint, 'an administrator cannot edit another school');
select throws_ok($$update public.institutions set phone = 'x' where id = 'a0000000-0000-4000-8000-000000000001'$$, '23514', null, 'a too-short phone is refused by the database');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
with u as (update public.institutions set city = 'Fès' where id = 'a0000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 0::bigint, 'a teacher cannot edit the school profile');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
with u as (update public.institutions set city = 'Fès' where id = 'a0000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 0::bigint, 'nor can a student');

-- ── plan usage ──────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select plan from public.plan_usage()), 'standard', 'a new school is on the standard plan');
select is((select students_used from public.plan_usage()), 3, 'usage counts active students');
select is((select teachers_limit from public.plan_usage()), 30, 'and shows the plan''s limit');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select count(*) from public.plan_usage()), 0::bigint, 'only an administrator reads plan usage');
select pg_temp.as_anon();
select throws_ok($$select * from public.plan_usage()$$, '42501', null, 'anon cannot call plan_usage');

-- ── plan limits ─────────────────────────────────────────────────────────────
reset role;
update public.institutions set plan = 'essential' where id = 'a0000000-0000-4000-8000-000000000001'; -- 5 teachers, 50 students
insert into public.invitations (institution_id, email, role, first_name, last_name, invited_by) values
  ('a0000000-0000-4000-8000-000000000001', 'p1@x.ma', 'teacher', 'P1', 'X', 'a0000000-0000-4000-8000-0000000000aa'),
  ('a0000000-0000-4000-8000-000000000001', 'p2@x.ma', 'teacher', 'P2', 'X', 'a0000000-0000-4000-8000-0000000000aa'),
  ('a0000000-0000-4000-8000-000000000001', 'p3@x.ma', 'teacher', 'P3', 'X', 'a0000000-0000-4000-8000-0000000000aa');  -- 2 active teachers + 3 pending = 5
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select teachers_used from public.plan_usage()), 5, 'pending invitations count as seats');
select throws_ok($$select pg_temp.invite('p4@x.ma', 'teacher')$$, 'P0001', 'plan_limit_reached', 'a full plan refuses another teacher invitation');
select lives_ok($$select pg_temp.invite('s1@x.ma', 'student')$$, 'but the student limit is separate');
update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-0000000000a8';
select lives_ok($$select pg_temp.invite('p5@x.ma', 'teacher')$$, 'freeing a seat (deactivation) lets another teacher in');
select throws_ok($$update public.profiles set is_active = true where id = 'a0000000-0000-4000-8000-0000000000a8'$$, 'P0001', 'plan_limit_reached', 'reactivating into a full plan is refused');
reset role;
update public.institutions set plan = 'premium' where id = 'a0000000-0000-4000-8000-000000000001';
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select teachers_limit from public.plan_usage()), null, 'the premium plan has no limit');
select lives_ok($$update public.profiles set is_active = true where id = 'a0000000-0000-4000-8000-0000000000a8'$$, 'so reactivation works again');

-- ── module access ───────────────────────────────────────────────────────────
select lives_ok($$insert into public.module_access (institution_id, role, module, enabled) values ('a0000000-0000-4000-8000-000000000001', 'teacher', 'homework', false)$$,
  'an administrator switches a module off for a role');
select throws_ok($$insert into public.module_access (institution_id, role, module, enabled) values ('a0000000-0000-4000-8000-000000000001', 'teacher', 'homework', true)$$,
  '23505', null, 'one switch per role and module');
select throws_ok($$insert into public.module_access (institution_id, role, module, enabled) values ('a0000000-0000-4000-8000-000000000001', 'student', 'classes', false)$$,
  '23514', null, 'a module that does not exist for a role cannot be switched');
select throws_ok($$insert into public.module_access (institution_id, role, module, enabled) values ('a0000000-0000-4000-8000-000000000001', 'student', 'bogus', false)$$,
  '23514', null, 'an unknown module is refused');
with u as (update public.module_access set enabled = true where role = 'teacher' and module = 'homework' returning 1)
select is((select count(*) from u), 1::bigint, 'and switches it back on');
select throws_ok($$insert into public.module_access (institution_id, role, module, enabled) values ('b0000000-0000-4000-8000-000000000001', 'teacher', 'grades', false)$$,
  '42501', null, 'an administrator cannot configure another school');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select count(*) from public.module_access), 1::bigint, 'a teacher can read the switches (the navigation needs them)');
select throws_ok($$insert into public.module_access (institution_id, role, module, enabled) values ('a0000000-0000-4000-8000-000000000001', 'teacher', 'grades', false)$$,
  '42501', null, 'but cannot change them');
with u as (update public.module_access set enabled = false returning 1)
select is((select count(*) from u), 0::bigint, 'nor update them');
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000b1');
select is((select count(*) from public.module_access), 0::bigint, 'another school sees none of them');
select pg_temp.as_anon();
select throws_ok($$select count(*) from public.module_access$$, '42501', null, 'anon cannot read the switches');

select * from finish();
rollback;
