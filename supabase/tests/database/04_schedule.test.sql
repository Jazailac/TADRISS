-- Subjects and the timetable: RLS for every role, cross-tenant denial, and the invariants
-- (no class overlap, no teacher double-booking, only assigned teachers, valid times).
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

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
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b7', 'teacher-b@test.ma');

insert into public.profiles (id, institution_id, role, first_name, last_name) values
  ('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000001', 'institution_admin', 'Amal', 'A'),
  ('a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tarik', 'A'),
  ('a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tania', 'A'),
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sara', 'A'),
  ('a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sami', 'A'),
  ('b0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-000000000001', 'institution_admin', 'Badr', 'B'),
  ('b0000000-0000-4000-8000-0000000000b7', 'b0000000-0000-4000-8000-000000000001', 'teacher', 'Basma', 'B');

insert into public.classes (id, institution_id, name, school_year) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '6A', '2026-2027'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '6B', '2026-2027'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '6A', '2026-2027');

-- 6A is taught by a1 and a2; 6B by a2 only. Sara is in 6A, Sami is unenrolled.
insert into public.class_teachers (class_id, teacher_id, institution_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000b7', 'b0000000-0000-4000-8000-000000000001');
insert into public.enrolments (institution_id, class_id, school_year, student_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a1');

insert into public.subjects (id, institution_id, name) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Maths'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Maths');

-- Monday 08:30-09:30: 6A, taught by a1.
insert into public.timetable_slots (id, institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 1, 510, 570),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001',
   'b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000b7', 1, 510, 570);

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

-- Runs a statement and returns its error message (or 'ok'), to tell constraints apart.
create function pg_temp.try_msg(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;

-- ── teacher a1 (teaches 6A) ──────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select results_eq('select id from public.timetable_slots',
  $$ values ('a3000000-0000-4000-8000-000000000001'::uuid) $$, 'teacher a1: sees their class''s timetable only');
select results_eq('select name from public.subjects', $$ values ('Maths') $$, 'teacher: sees their school''s subjects only');
select throws_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 2, 510, 570) $$, '42501', null, 'teacher: cannot add lessons');
select lives_ok($$ delete from public.timetable_slots $$, 'teacher: deleting lessons is a silent no-op');
select lives_ok($$ update public.timetable_slots set room = 'hack' $$, 'teacher: editing lessons is a silent no-op');
select throws_ok($$ insert into public.subjects (institution_id, name) values ('a0000000-0000-4000-8000-000000000001', 'Art') $$,
  '42501', null, 'teacher: cannot create subjects');

-- ── teacher a2 (teaches 6A and 6B) ───────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select is((select count(*) from public.timetable_slots), 1::bigint, 'teacher a2: sees the slots of every class they teach');

-- ── students ─────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select results_eq('select id from public.timetable_slots',
  $$ values ('a3000000-0000-4000-8000-000000000001'::uuid) $$, 'student a1: sees their own class''s timetable');
select results_eq($$ select first_name from public.profiles where role = 'teacher' order by 1 $$,
  $$ values ('Tania'), ('Tarik') $$, 'student a1: sees the names of their class''s teachers only');
select throws_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 2, 510, 570) $$, '42501', null, 'student: cannot add lessons');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a2');
select is_empty('select 1 from public.timetable_slots', 'unenrolled student: sees no timetable');
select is_empty($$ select 1 from public.profiles where role = 'teacher' $$, 'unenrolled student: sees no teachers');

select pg_temp.as_anon();
select throws_ok('select 1 from public.timetable_slots', '42501', null, 'anon: no access to the timetable');
select throws_ok('select 1 from public.subjects', '42501', null, 'anon: no access to subjects');

-- ── admin B: other tenant ────────────────────────────────────────────────────
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select results_eq('select id from public.timetable_slots',
  $$ values ('b3000000-0000-4000-8000-000000000001'::uuid) $$, 'admin B: sees only their own timetable');
select lives_ok($$ update public.timetable_slots set room = 'x' where id = 'a3000000-0000-4000-8000-000000000001' $$,
  'admin B: editing school A''s lesson is a silent no-op');
select lives_ok($$ delete from public.timetable_slots where id = 'a3000000-0000-4000-8000-000000000001' $$,
  'admin B: deleting school A''s lesson is a silent no-op');

-- ── admin A: writes and invariants ───────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*) from public.timetable_slots), 1::bigint, 'admin A: sees their school''s timetable (and not B''s)');
select lives_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min, room)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 1, 570, 630, 'A1') $$,
  'admin A: back-to-back lessons do not overlap');
select throws_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001',
          'b0000000-0000-4000-8000-0000000000b7', 2, 510, 570) $$, '42501', null, 'admin A: cannot schedule in school B');
select matches(pg_temp.try_msg($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a8', 1, 540, 600) $$),
  'timetable_slots_class_no_overlap', 'a class cannot have two overlapping lessons');
-- teacher a2 teaches 6A (Mon 09:30-10:30 is free for them), then is double-booked in 6B at the same time.
select lives_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a8', 1, 630, 690) $$, 'admin A: a different teacher can teach the same class later');
select matches(pg_temp.try_msg($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a8', 1, 660, 720) $$),
  'timetable_slots_teacher_no_overlap', 'a teacher cannot be in two classes at once');
select throws_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 2, 510, 570) $$,
  '23503', null, 'only a teacher assigned to the class can teach it');
select throws_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 7, 510, 570) $$, '23514', null, 'Sunday is not a school day');
select throws_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 3, 600, 600) $$, '23514', null, 'a lesson must end after it starts');
select throws_ok($$ insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 3, 600, 660) $$, '23503', null,
  'a lesson cannot use another school''s subject (composite FK)');
select lives_ok($$ update public.timetable_slots set room = 'B7', starts_min = 540 where id = 'a3000000-0000-4000-8000-000000000001' $$,
  'admin A: can move a lesson');
select throws_ok($$ update public.timetable_slots set institution_id = 'b0000000-0000-4000-8000-000000000001' where id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'admin A: a lesson cannot change school (no column grant)');
select lives_ok($$ delete from public.timetable_slots where id = 'a3000000-0000-4000-8000-000000000001' $$, 'admin A: can delete a lesson');

-- subjects
select throws_ok($$ insert into public.subjects (institution_id, name) values ('a0000000-0000-4000-8000-000000000001', ' maths ') $$,
  '23505', null, 'subject names are unique per school (case and space insensitive)');
select throws_ok($$ insert into public.subjects (institution_id, name, color) values ('a0000000-0000-4000-8000-000000000001', 'Art', '#ff0000') $$,
  '23514', null, 'a subject colour is a token name, never a raw colour');
select lives_ok($$ insert into public.subjects (institution_id, name, color) values ('a0000000-0000-4000-8000-000000000001', 'Art', 'info') $$,
  'admin A: can create a subject');
select lives_ok($$ update public.subjects set deleted_at = now() where name = 'Art' $$, 'admin A: can archive a subject');
select is((select count(*) from public.subjects where name = 'Art'), 1::bigint, 'admin A: still sees the archived subject');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select count(*) from public.subjects where name = 'Art'), 0::bigint, 'teacher: archived subjects are hidden');

select ok(has_function_privilege('authenticated', 'private.my_class_ids()', 'execute')
  and not has_function_privilege('anon', 'private.my_class_ids()', 'execute'),
  'my_class_ids: authenticated only');

select * from finish();
rollback;
