-- Classes, class_teachers, enrolments: RLS for every role, cross-tenant denial, the capacity /
-- one-active-enrolment / role invariants, archive visibility and the two RPCs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(53);

-- ── fixtures (as postgres, bypassing RLS) ────────────────────────────────────
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
  ('a0000000-0000-4000-8000-0000000000a4', 'student-a4@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b7', 'teacher-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b1', 'student-b@test.ma');

insert into public.profiles (id, institution_id, role, first_name, last_name) values
  ('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000001', 'institution_admin', 'Amal', 'A'),
  ('a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tarik', 'A'),
  ('a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tania', 'A'),
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sara', 'A'),
  ('a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sami', 'A'),
  ('a0000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sofia', 'A'),
  ('a0000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-000000000001', 'student', 'Said', 'A'),
  ('b0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-000000000001', 'institution_admin', 'Badr', 'B'),
  ('b0000000-0000-4000-8000-0000000000b7', 'b0000000-0000-4000-8000-000000000001', 'teacher', 'Basma', 'B'),
  ('b0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-000000000001', 'student', 'Bilal', 'B');

-- ca1 (capacity 2) is taught by teacher a1; ca2 and cax by teacher a2; cb1 belongs to B.
insert into public.classes (id, institution_id, name, school_year, capacity) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '6A', '2026-2027', 2),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '6B', '2026-2027', null),
  ('a1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '6C', '2026-2027', null),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '6A', '2026-2027', null);

insert into public.class_teachers (class_id, teacher_id, institution_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001');

insert into public.enrolments (institution_id, class_id, school_year, student_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a1'),
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

-- ── teacher a1 (teaches 6A only) ─────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select results_eq('select name from public.classes', $$ values ('6A') $$, 'teacher a1: sees only the class they teach');
select results_eq('select student_id from public.enrolments',
  $$ values ('a0000000-0000-4000-8000-0000000000a1'::uuid) $$, 'teacher a1: sees only their class''s enrolments');
select results_eq($$ select first_name from public.profiles where role = 'student' $$,
  $$ values ('Sara') $$, 'teacher a1: sees only their own students'' profiles (not Sofia in 6B)');
select results_eq('select teacher_id from public.class_teachers',
  $$ values ('a0000000-0000-4000-8000-0000000000a7'::uuid) $$, 'teacher a1: sees only their own assignment');
select throws_ok($$ insert into public.classes (institution_id, name, school_year)
  values ('a0000000-0000-4000-8000-000000000001', 'X', '2026-2027') $$, '42501', null, 'teacher: cannot create classes');
select lives_ok($$ update public.classes set name = 'hacked' where id = 'a1000000-0000-4000-8000-000000000001' $$,
  'teacher: updating a class is a silent no-op');
select throws_ok($$ delete from public.classes $$, '42501', null, 'teacher: cannot delete classes');
select throws_ok($$ insert into public.enrolments (institution_id, class_id, school_year, student_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a4') $$,
  '42501', null, 'teacher: cannot enrol students');
select throws_ok($$ select public.enrol_students('a1000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-0000000000a4'::uuid]) $$,
  '42501', null, 'teacher: enrol_students is denied');
select lives_ok($$ delete from public.class_teachers $$, 'teacher: unassigning teachers is a silent no-op');

-- ── teacher a2 (teaches 6B and 6C) ───────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select results_eq('select name from public.classes order by name', $$ values ('6B'), ('6C') $$, 'teacher a2: sees both of their classes');

-- ── students ─────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select results_eq('select name from public.classes', $$ values ('6A') $$, 'student a1: sees only their own class');
select results_eq('select student_id from public.enrolments',
  $$ values ('a0000000-0000-4000-8000-0000000000a1'::uuid) $$, 'student a1: sees only their own enrolment');
select results_eq($$ select first_name from public.profiles where role = 'student' $$, $$ values ('Sara') $$, 'student a1: classmates'' profiles stay private');
select throws_ok($$ insert into public.enrolments (institution_id, class_id, school_year, student_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a1') $$,
  '42501', null, 'student: cannot enrol themselves');
select lives_ok($$ update public.enrolments set status = 'withdrawn', withdrawn_on = current_date $$,
  'student: withdrawing is a silent no-op');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a4');
select is_empty('select 1 from public.classes', 'unenrolled student: sees no classes');
select is_empty('select 1 from public.enrolments', 'unenrolled student: sees no enrolments');

select pg_temp.as_anon();
select throws_ok('select 1 from public.classes', '42501', null, 'anon: no access to classes');
select throws_ok('select 1 from public.enrolments', '42501', null, 'anon: no access to enrolments');
select ok(not has_function_privilege('anon', 'public.enrol_students(uuid, uuid[])', 'execute'),
  'anon cannot execute enrol_students');

-- ── admin B: other tenant ────────────────────────────────────────────────────
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select results_eq('select id from public.classes', $$ values ('b1000000-0000-4000-8000-000000000001'::uuid) $$,
  'admin B: sees only their own classes');
select throws_ok($$ select public.enrol_students('a1000000-0000-4000-8000-000000000001', array['b0000000-0000-4000-8000-0000000000b1'::uuid]) $$,
  'P0002', null, 'admin B: cannot enrol into institution A''s class');

-- ── admin A: the full set of writes ──────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*) from public.classes), 3::bigint, 'admin A: sees all of their classes');
select is((select count(*) from public.enrolments), 2::bigint, 'admin A: sees all of their enrolments');
select results_eq($$ select first_name from public.enrolable_students('2026-2027') order by 1 $$,
  $$ values ('Said'), ('Sami') $$, 'enrolable_students: only students without an active enrolment this year');
select results_eq($$ select first_name from public.enrolable_students('2026-2027', 'sam') $$,
  $$ values ('Sami') $$, 'enrolable_students: filters by name');
select is_empty($$ select 1 from public.enrolable_students('2026-2027', '%') $$,
  'enrolable_students: a % in the search is literal, not a wildcard');
select lives_ok($$ insert into public.classes (institution_id, name, level, school_year, capacity)
  values ('a0000000-0000-4000-8000-000000000001', '5A', '5ème', '2026-2027', 25) $$, 'admin A: can create a class');
select throws_ok($$ insert into public.classes (institution_id, name, school_year)
  values ('b0000000-0000-4000-8000-000000000001', 'X', '2026-2027') $$, '42501', null, 'admin A: cannot create a class in B');
select throws_ok($$ insert into public.classes (institution_id, name, school_year)
  values ('a0000000-0000-4000-8000-000000000001', ' 6a ', '2026-2027') $$, '23505', null,
  'admin A: class names are unique per school year (case and space insensitive)');
select throws_ok($$ insert into public.classes (institution_id, name, school_year)
  values ('a0000000-0000-4000-8000-000000000001', 'Bad', '2026-2028') $$, '23514', null, 'admin A: school year must be consecutive');
select lives_ok($$ insert into public.classes (institution_id, name, school_year)
  values ('a0000000-0000-4000-8000-000000000001', '6A', '2027-2028') $$, 'admin A: the same name is fine in another school year');
select lives_ok($$ update public.classes set name = '6A Sciences' where id = 'a1000000-0000-4000-8000-000000000001' $$,
  'admin A: can rename a class');
select throws_ok($$ update public.classes set school_year = '2027-2028' where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'admin A: school year is immutable');
select throws_ok($$ delete from public.classes where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'admin A: classes are archived, never deleted');

-- enrolment rules (6A has capacity 2 and already holds Sara)
select is(public.enrol_students('a1000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-0000000000a2'::uuid]),
  1, 'enrol_students: enrols a student');
select is(public.enrol_students('a1000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-0000000000a2'::uuid]),
  0, 'enrol_students: skips a student who is already enrolled');
select throws_ok($$ select public.enrol_students('a1000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-0000000000a4'::uuid]) $$,
  'P0001', 'class_full', 'enrol_students: a full class refuses another student');
select throws_ok($$ select public.enrol_students('a1000000-0000-4000-8000-000000000002', array['a0000000-0000-4000-8000-0000000000a7'::uuid]) $$,
  '23514', null, 'enrol_students: only students can be enrolled');
select lives_ok($$ update public.enrolments set status = 'withdrawn', withdrawn_on = current_date
  where student_id = 'a0000000-0000-4000-8000-0000000000a2' $$, 'admin A: can withdraw a student');
select is(public.enrol_students('a1000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-0000000000a4'::uuid]),
  1, 'withdrawing frees a seat for another student');
select throws_ok($$ delete from public.enrolments $$, '42501', null, 'admin A: enrolment history is never deleted');

-- teachers of a class
select lives_ok($$ select public.set_class_teachers('a1000000-0000-4000-8000-000000000001',
  array['a0000000-0000-4000-8000-0000000000a7'::uuid, 'a0000000-0000-4000-8000-0000000000a8'::uuid]) $$,
  'set_class_teachers: assigns several teachers');
select is((select count(*) from public.class_teachers where class_id = 'a1000000-0000-4000-8000-000000000001'), 2::bigint,
  'set_class_teachers: both are assigned');
select throws_ok($$ select public.set_class_teachers('a1000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-0000000000a1'::uuid]) $$,
  '23514', null, 'set_class_teachers: only teachers can teach a class');

-- archive: hidden from teachers, still visible to the admin
select lives_ok($$ update public.classes set deleted_at = now() where id = 'a1000000-0000-4000-8000-000000000003' $$,
  'admin A: can archive a class');
select is((select count(*) from public.classes where id = 'a1000000-0000-4000-8000-000000000003'), 1::bigint,
  'admin A: still sees the archived class');
select throws_ok($$ select public.enrol_students('a1000000-0000-4000-8000-000000000003', array['a0000000-0000-4000-8000-0000000000a4'::uuid]) $$,
  'P0002', null, 'enrol_students: an archived class takes no new students');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select results_eq('select name from public.classes order by name', $$ values ('6A Sciences'), ('6B') $$,
  'teacher a2: archived class is hidden; newly assigned class appears');

-- ── composite FKs keep rows inside one institution (as postgres) ─────────────
reset role;
select throws_ok($$ insert into public.class_teachers (class_id, teacher_id, institution_id)
  values ('a1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-0000000000b7', 'a0000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'FK: a teacher from another school cannot be assigned');
select throws_ok($$ insert into public.enrolments (institution_id, class_id, school_year, student_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', '2026-2027', 'b0000000-0000-4000-8000-0000000000b1') $$,
  '23503', null, 'FK: a student from another school cannot be enrolled');
select throws_ok($$ insert into public.enrolments (institution_id, class_id, school_year, student_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', '2025-2026', 'a0000000-0000-4000-8000-0000000000a2') $$,
  '23503', null, 'FK: the enrolment school year must match the class');

select * from finish();
rollback;
