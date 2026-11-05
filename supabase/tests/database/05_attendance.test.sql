-- Attendance: RLS for every role, the submit_attendance rules (ownership, dates, roster), the
-- reporting RPCs, and that history can be corrected but never deleted.
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
  ('a0000000-0000-4000-8000-0000000000a3', 'student-a3@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b7', 'teacher-b@test.ma');

insert into public.profiles (id, institution_id, role, first_name, last_name) values
  ('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000001', 'institution_admin', 'Amal', 'A'),
  ('a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tarik', 'A'),
  ('a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tania', 'A'),
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sara', 'A'),
  ('a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sami', 'A'),
  ('a0000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sofia', 'A'),
  ('b0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-000000000001', 'institution_admin', 'Badr', 'B'),
  ('b0000000-0000-4000-8000-0000000000b7', 'b0000000-0000-4000-8000-000000000001', 'teacher', 'Basma', 'B');

insert into public.classes (id, institution_id, name, school_year) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '6A', '2026-2027');
-- Both teachers teach 6A; Sara and Sami are enrolled, Sofia is not.
insert into public.class_teachers (class_id, teacher_id, institution_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'a0000000-0000-4000-8000-000000000001');
insert into public.enrolments (institution_id, class_id, school_year, student_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a1'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a2');
insert into public.subjects (id, institution_id, name) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Maths');
-- Monday 08:30-09:30, taught by Tarik (a1).
insert into public.timetable_slots (id, institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 1, 510, 570);

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
create function pg_temp.try_msg(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;

-- The school's "today" and the most recent Monday on or before it (the lesson is on Mondays).
create function pg_temp.today() returns date language sql as
  $$ select (now() at time zone 'Africa/Casablanca')::date $$;
create function pg_temp.monday(offset_days int default 0) returns date language sql as
  $$ select pg_temp.today() - ((extract(isodow from pg_temp.today())::int + 6) % 7) + offset_days $$;

-- ── teacher a1 owns the lesson ───────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select ok(public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(),
  '[{"student_id":"a0000000-0000-4000-8000-0000000000a1","status":"present"},
    {"student_id":"a0000000-0000-4000-8000-0000000000a2","status":"absent","note":" malade "}]'::jsonb) is not null,
  'teacher a1: can take the roll call of their own lesson');
select results_eq($$ select present, late, absent, excused from public.attendance_day(pg_temp.monday()) $$,
  $$ values (1::bigint, 0::bigint, 1::bigint, 0::bigint) $$, 'attendance_day: counts per status');
select is((select note from public.attendance_records where student_id = 'a0000000-0000-4000-8000-0000000000a2'),
  'malade', 'the note is trimmed');

-- Correcting the same lesson/date updates in place instead of duplicating.
select lives_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(),
  '[{"student_id":"a0000000-0000-4000-8000-0000000000a1","status":"late"},
    {"student_id":"a0000000-0000-4000-8000-0000000000a2","status":"absent"}]'::jsonb) $$,
  'teacher a1: can correct a roll call');
select is((select count(*) from public.attendance_sessions), 1::bigint, 'a correction reuses the session');
select is((select count(*) from public.attendance_records), 2::bigint, 'a correction reuses the records');
select results_eq($$ select late, absent from public.attendance_day(pg_temp.monday()) $$,
  $$ values (1::bigint, 1::bigint) $$, 'the correction is reflected in the counts');

select throws_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(7),
  '[]'::jsonb) $$, 'P0001', 'future_date', 'a roll call cannot be taken for a future date');
select throws_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(-6),
  '[]'::jsonb) $$, '22023', 'wrong_weekday', 'the date must fall on the lesson''s weekday');
select throws_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(-21),
  '[]'::jsonb) $$, 'P0001', 'too_old', 'a teacher cannot rewrite history older than 14 days');
select throws_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(),
  '[{"student_id":"a0000000-0000-4000-8000-0000000000a3","status":"present"}]'::jsonb) $$,
  'P0001', 'student_not_in_class', 'only enrolled students can be marked');
select throws_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(),
  '[{"student_id":"a0000000-0000-4000-8000-0000000000a1","status":"sick"}]'::jsonb) $$,
  '23514', null, 'an unknown status is refused');
select is((select count(*) from public.attendance_records), 2::bigint, 'a refused submission changes nothing');
select results_eq($$ select present, late, absent, excused from public.attendance_class_summary(pg_temp.monday(-30), pg_temp.monday()) $$,
  $$ values (0::bigint, 1::bigint, 1::bigint, 0::bigint) $$, 'attendance_class_summary: totals per class');

-- ── teacher a2 teaches the class but not this lesson ─────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select throws_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(),
  '[]'::jsonb) $$, 'P0001', 'not_your_lesson', 'teacher a2: cannot take another teacher''s lesson');
select is((select count(*) from public.attendance_records), 2::bigint, 'teacher a2: reads the class''s records');
select lives_ok($$ update public.attendance_records set status = 'present' $$,
  'teacher a2: editing another teacher''s records is a silent no-op');
select throws_ok($$ delete from public.attendance_records $$, '42501', null, 'teacher: records are never deleted');

-- ── teacher of another school ────────────────────────────────────────────────
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000b7');
select throws_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(),
  '[]'::jsonb) $$, 'P0002', 'lesson_not_found', 'teacher B: school A''s lesson does not exist for them');
select is_empty('select 1 from public.attendance_sessions', 'teacher B: sees no sessions');
select is_empty($$ select 1 from public.attendance_day(pg_temp.monday()) $$, 'teacher B: attendance_day is empty');

-- ── students ─────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select results_eq('select status from public.attendance_records', $$ values ('late') $$,
  'student a1: sees only their own record');
select is((select count(*) from public.attendance_sessions), 1::bigint, 'student a1: sees their class''s session');
select throws_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(),
  '[{"student_id":"a0000000-0000-4000-8000-0000000000a1","status":"present"}]'::jsonb) $$,
  '42501', null, 'student: cannot take or alter attendance');
select lives_ok($$ update public.attendance_records set status = 'present' $$,
  'student: editing their own record is a silent no-op');
select results_eq($$ select late, absent from public.attendance_day(pg_temp.monday()) $$,
  $$ values (1::bigint, 0::bigint) $$, 'student: aggregate counts only reflect their own record');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a2');
select results_eq('select status from public.attendance_records', $$ values ('absent') $$, 'student a2: sees only their own record');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a3');
select is_empty('select 1 from public.attendance_records', 'unenrolled student: sees no records');
select is_empty('select 1 from public.attendance_sessions', 'unenrolled student: sees no sessions');

select pg_temp.as_anon();
select throws_ok('select 1 from public.attendance_records', '42501', null, 'anon: no access to records');
select ok(not has_function_privilege('anon', 'public.submit_attendance(uuid, date, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.attendance_day(date)', 'execute')
  and not has_function_privilege('anon', 'public.attendance_class_summary(date, date)', 'execute'),
  'anon cannot execute the attendance RPCs');

-- ── admins ───────────────────────────────────────────────────────────────────
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select is_empty('select 1 from public.attendance_records', 'admin B: sees none of school A''s records');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*) from public.attendance_records), 2::bigint, 'admin A: sees every record');
select lives_ok($$ select public.submit_attendance('a3000000-0000-4000-8000-000000000001', pg_temp.monday(-21),
  '[{"student_id":"a0000000-0000-4000-8000-0000000000a1","status":"excused","note":"certificat"}]'::jsonb) $$,
  'admin A: can correct attendance older than 14 days');
select results_eq($$ select status from public.attendance_records r join public.attendance_sessions s on s.id = r.session_id
  where s.session_date = pg_temp.monday(-21) $$, $$ values ('excused') $$, 'the old correction was recorded');
select throws_ok($$ delete from public.attendance_sessions $$, '42501', null, 'admin: sessions are never deleted');
select throws_ok($$ update public.attendance_sessions set session_date = current_date $$, '42501', null,
  'a session''s date cannot be edited (no column grant)');

select * from finish();
rollback;
