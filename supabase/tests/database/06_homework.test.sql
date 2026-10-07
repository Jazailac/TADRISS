-- Homework: RLS for every role, who may set it, the student's own completion toggle, soft delete.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

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
insert into public.subjects (id, institution_id, name) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Maths');
-- hw1: 6A by Tarik. hw2: 6B by Tania.
insert into public.homework (id, institution_id, class_id, subject_id, teacher_id, title, due_date) values
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'Exercices', '2026-10-09'),
  ('a4000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'Problèmes', '2026-10-10');

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

-- ── teacher Tarik (6A only) ──────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select results_eq('select title from public.homework', $$ values ('Exercices') $$, 'teacher: sees the homework of the classes they teach');
select lives_ok($$ insert into public.homework (institution_id, class_id, subject_id, title, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Lecture', '2026-10-12') $$,
  'teacher: can set homework for their own class (teacher_id defaults to them)');
select throws_ok($$ insert into public.homework (institution_id, class_id, subject_id, title, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 'Pas à moi', '2026-10-12') $$,
  '23503', null, 'teacher: cannot set homework for a class they do not teach');
select throws_ok($$ insert into public.homework (institution_id, class_id, subject_id, teacher_id, title, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a8', 'Au nom de Tania', '2026-10-12') $$,
  '42501', null, 'teacher: cannot set homework in another teacher''s name');
select lives_ok($$ update public.homework set title = 'Exercices (corrigé)', due_date = '2026-10-11' where id = 'a4000000-0000-4000-8000-000000000001' $$,
  'teacher: can edit their own homework');
select throws_ok($$ update public.homework set class_id = 'a1000000-0000-4000-8000-000000000002' where id = 'a4000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'teacher: a homework''s class cannot be changed');
select lives_ok($$ update public.homework set title = 'hack' where id = 'a4000000-0000-4000-8000-000000000002' $$,
  'teacher: editing another teacher''s homework is a silent no-op');
select throws_ok($$ delete from public.homework $$, '42501', null, 'teacher: homework is soft-deleted, never deleted');

-- ── students ─────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.homework), 2::bigint, 'student a1: sees their class''s homework (Exercices and Lecture)');
select throws_ok($$ insert into public.homework (institution_id, class_id, subject_id, teacher_id, title, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 'x', '2026-10-12') $$, '42501', null, 'student: cannot set homework');
select lives_ok($$ insert into public.homework_completions (institution_id, homework_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001') $$,
  'student a1: can tick off their class''s homework (student_id defaults to them)');
select throws_ok($$ insert into public.homework_completions (institution_id, homework_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'student: a completion can only exist once');
select throws_ok($$ insert into public.homework_completions (institution_id, homework_id, student_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a2') $$,
  '42501', null, 'student: cannot tick off homework for a classmate');
select throws_ok($$ insert into public.homework_completions (institution_id, homework_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'student: cannot tick off another class''s homework');
select is((select count(*) from public.homework_completions), 1::bigint, 'student a1: sees only their own completion');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a2');
select lives_ok($$ delete from public.homework_completions $$, 'student a2: deleting completions deletes only their own (none)');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.homework_completions), 1::bigint, 'student a1''s completion survived a classmate''s delete');
select lives_ok($$ delete from public.homework_completions $$, 'student a1: can un-tick their own completion');
select is((select count(*) from public.homework_completions), 0::bigint, 'the completion is gone');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a3');
select results_eq('select title from public.homework', $$ values ('Problèmes') $$, 'student a3 (6B): sees only 6B homework');

-- ── a teacher sees who finished their homework ───────────────────────────────
reset role;
insert into public.homework_completions (institution_id, homework_id, student_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1'),
  ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-0000000000a3');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select results_eq('select student_id from public.homework_completions',
  $$ values ('a0000000-0000-4000-8000-0000000000a1'::uuid) $$, 'teacher: sees completions of their own homework only');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select is((select count(*) from public.homework_completions), 1::bigint, 'teacher Tania: sees completions of the homework she set, not Tarik''s');

-- ── soft delete ──────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select lives_ok($$ update public.homework set deleted_at = now() where id = 'a4000000-0000-4000-8000-000000000001' $$,
  'teacher: can soft-delete their homework');
select is((select count(*) from public.homework where id = 'a4000000-0000-4000-8000-000000000001'), 1::bigint,
  'a soft-deleted homework stays visible to its author (so it can be restored)');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select is((select count(*) from public.homework where id = 'a4000000-0000-4000-8000-000000000001'), 0::bigint,
  'a soft-deleted homework is hidden from other teachers');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.homework where id = 'a4000000-0000-4000-8000-000000000001'), 0::bigint,
  'a soft-deleted homework disappears for students');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*) from public.homework where id = 'a4000000-0000-4000-8000-000000000001'), 1::bigint,
  'admin: still sees soft-deleted homework');
select is((select count(*) from public.homework_completions), 2::bigint, 'admin: sees every completion');
select throws_ok($$ insert into public.homework (institution_id, class_id, subject_id, teacher_id, title, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 'x', '2026-10-12') $$, '42501', null, 'admin: sets no homework (teachers do)');

-- ── other tenant and anon ────────────────────────────────────────────────────
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select is_empty('select 1 from public.homework', 'admin B: sees none of school A''s homework');
select is_empty('select 1 from public.homework_completions', 'admin B: sees none of school A''s completions');
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000b1');
select is_empty('select 1 from public.homework', 'student B: sees none of school A''s homework');
select pg_temp.as_anon();
select throws_ok('select 1 from public.homework', '42501', null, 'anon: no access to homework');
select throws_ok('select 1 from public.homework_completions', '42501', null, 'anon: no access to completions');

select * from finish();
rollback;
