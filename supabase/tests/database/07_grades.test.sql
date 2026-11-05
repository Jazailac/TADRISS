-- Exams and marks: RLS for every role, draft vs published, score invariants, save_grades.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

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
-- ex1: 6A by Tarik, PUBLISHED, /20. ex2: 6A by Tarik, DRAFT, /10. ex3: 6B by Tania, PUBLISHED.
insert into public.exams (id, institution_id, class_id, subject_id, teacher_id, title, exam_date, max_score, coefficient, published_at) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'Contrôle', '2026-10-01', 20, 2, now()),
  ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'Brouillon', '2026-10-02', 10, 1, null),
  ('a5000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'Autre classe', '2026-10-03', 20, 1, now());
insert into public.grades (institution_id, exam_id, student_id, score, absent) values
  ('a0000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1', 15, false),
  ('a0000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a2', null, true),
  ('a0000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-0000000000a1', 7, false),
  ('a0000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-0000000000a3', 12, false);

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

-- ── teacher Tarik (owns ex1 and ex2) ─────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select count(*) from public.exams), 2::bigint, 'teacher: sees the exams of the classes they teach');
select is((select count(*) from public.grades), 3::bigint, 'teacher: sees the marks of the exams they set');
select lives_ok($$ insert into public.exams (institution_id, class_id, subject_id, title, exam_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Nouveau', '2026-10-10') $$,
  'teacher: can set an exam for their class (/20, coefficient 1, draft by default)');
select throws_ok($$ insert into public.exams (institution_id, class_id, subject_id, title, exam_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 'Pas à moi', '2026-10-10') $$,
  '23503', null, 'teacher: cannot set an exam for a class they do not teach');
select throws_ok($$ insert into public.exams (institution_id, class_id, subject_id, title, exam_date, max_score)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'x', '2026-10-10', 0) $$,
  '23514', null, 'an exam needs a positive maximum');
select throws_ok($$ insert into public.exams (institution_id, class_id, subject_id, title, exam_date, coefficient)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'x', '2026-10-10', 11) $$,
  '23514', null, 'a coefficient is between 0.5 and 10');
select throws_ok($$ update public.exams set class_id = 'a1000000-0000-4000-8000-000000000002' where id = 'a5000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'an exam''s class cannot change');
select lives_ok($$ update public.exams set title = 'hack' where id = 'a5000000-0000-4000-8000-000000000003' $$,
  'teacher: editing another class''s exam is a silent no-op');

-- save_grades: a whole sheet in one call
select is(public.save_grades('a5000000-0000-4000-8000-000000000001', '[
  {"student_id":"a0000000-0000-4000-8000-0000000000a1","score":17.5,"remark":" bravo "},
  {"student_id":"a0000000-0000-4000-8000-0000000000a2","score":9}]'::jsonb), 2,
  'save_grades: writes (and corrects) marks');
select results_eq($$ select score from public.grades where exam_id = 'a5000000-0000-4000-8000-000000000001' order by student_id $$,
  $$ values (17.5::numeric), (9::numeric) $$, 'save_grades: the marks are stored');
select is((select remark from public.grades where student_id = 'a0000000-0000-4000-8000-0000000000a1' and exam_id = 'a5000000-0000-4000-8000-000000000001'),
  'bravo', 'save_grades: remarks are trimmed');
select is((select absent from public.grades where student_id = 'a0000000-0000-4000-8000-0000000000a2' and exam_id = 'a5000000-0000-4000-8000-000000000001'),
  false, 'save_grades: a score replaces an earlier absence');
select is(public.save_grades('a5000000-0000-4000-8000-000000000001', '[
  {"student_id":"a0000000-0000-4000-8000-0000000000a2","absent":true,"score":12}]'::jsonb), 1,
  'save_grades: marking absent');
select results_eq($$ select score, absent from public.grades where student_id = 'a0000000-0000-4000-8000-0000000000a2' and exam_id = 'a5000000-0000-4000-8000-000000000001' $$,
  $$ values (null::numeric, true) $$, 'save_grades: absent wins over a score');
select is(public.save_grades('a5000000-0000-4000-8000-000000000001', '[
  {"student_id":"a0000000-0000-4000-8000-0000000000a2"}]'::jsonb), 0, 'save_grades: a blank row writes nothing');
select is((select count(*) from public.grades where student_id = 'a0000000-0000-4000-8000-0000000000a2' and exam_id = 'a5000000-0000-4000-8000-000000000001'),
  0::bigint, 'save_grades: a blank row clears the mark');
select throws_ok($$ select public.save_grades('a5000000-0000-4000-8000-000000000001', '[
  {"student_id":"a0000000-0000-4000-8000-0000000000a1","score":20.5}]'::jsonb) $$,
  'P0001', 'score_out_of_range', 'a mark cannot exceed the exam''s maximum');
select throws_ok($$ select public.save_grades('a5000000-0000-4000-8000-000000000001', '[
  {"student_id":"a0000000-0000-4000-8000-0000000000a1","score":-1}]'::jsonb) $$,
  '23514', null, 'a mark cannot be negative');
select throws_ok($$ select public.save_grades('a5000000-0000-4000-8000-000000000001', '[
  {"student_id":"a0000000-0000-4000-8000-0000000000a3","score":10}]'::jsonb) $$,
  'P0001', 'student_not_in_class', 'only the class''s students can be marked');
select throws_ok($$ update public.exams set max_score = 10 where id = 'a5000000-0000-4000-8000-000000000001' $$,
  'P0001', 'score_out_of_range', 'the maximum cannot drop below an existing mark');
select lives_ok($$ update public.exams set published_at = now() where id = 'a5000000-0000-4000-8000-000000000002' $$, 'teacher: can publish their exam');
select lives_ok($$ update public.exams set deleted_at = now() where id = 'a5000000-0000-4000-8000-000000000002' $$, 'teacher: can soft-delete their exam');

-- ── teacher Tania teaches the class but did not set the exam ─────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select throws_ok($$ select public.save_grades('a5000000-0000-4000-8000-000000000001', '[]'::jsonb) $$,
  'P0001', 'not_your_exam', 'teacher Tania: cannot enter marks for Tarik''s exam');
select is((select count(*) from public.grades where exam_id = 'a5000000-0000-4000-8000-000000000001'), 0::bigint,
  'teacher Tania: cannot read marks of exams she did not set');

-- ── students ─────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select results_eq('select title from public.exams order by title', $$ values ('Contrôle') $$,
  'student a1: sees only published exams of their class (the deleted draft is hidden)');
select results_eq('select score from public.grades', $$ values (17.5::numeric) $$,
  'student a1: sees only their own mark, only for published exams');
select throws_ok($$ select public.save_grades('a5000000-0000-4000-8000-000000000001', '[]'::jsonb) $$,
  'P0001', 'not_your_exam', 'student: cannot enter marks');
select lives_ok($$ update public.grades set score = 20 $$, 'student: editing their own mark is a silent no-op');
select is((select score from public.grades), 17.5::numeric, 'student a1''s mark is unchanged');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a3');
select results_eq('select title from public.exams', $$ values ('Autre classe') $$, 'student a3 (6B): sees only 6B''s published exam');

-- ── statistics ───────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select results_eq($$ select graded, absent, avg20 from public.exam_summary() where exam_id = 'a5000000-0000-4000-8000-000000000001' $$,
  $$ values (1::bigint, 0::bigint, 17.5::numeric) $$, 'exam_summary: counts and the 0-20 average');
select results_eq($$ select avg20 from public.exam_summary() where exam_id = 'a5000000-0000-4000-8000-000000000003' $$,
  $$ values (12::numeric) $$, 'exam_summary: normalises to /20');
select is((select count(*) from public.exams), 4::bigint, 'admin: sees every exam, including drafts and deleted ones');
select throws_ok($$ select public.save_grades('a5000000-0000-4000-8000-000000000001', '[]'::jsonb) $$,
  'P0001', 'not_your_exam', 'admin: marks belong to teachers');
select throws_ok($$ insert into public.exams (institution_id, class_id, subject_id, teacher_id, title, exam_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-0000000000a7', 'x', '2026-10-10') $$, '42501', null, 'admin: sets no exams (teachers do)');
select throws_ok($$ delete from public.exams $$, '42501', null, 'exams are never hard-deleted');

-- ── other tenant and anon ────────────────────────────────────────────────────
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select is_empty('select 1 from public.exams', 'admin B: sees none of school A''s exams');
select is_empty('select 1 from public.grades', 'admin B: sees none of school A''s marks');
select is_empty('select 1 from public.exam_summary()', 'admin B: exam_summary is empty');
select pg_temp.as_anon();
select throws_ok('select 1 from public.grades', '42501', null, 'anon: no access to marks');
select ok(not has_function_privilege('anon', 'public.save_grades(uuid, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.exam_summary(uuid)', 'execute'), 'anon cannot execute the grade RPCs');

select * from finish();
rollback;
