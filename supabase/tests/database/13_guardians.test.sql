-- Exams and marks: RLS for every role, draft vs published, score invariants, save_grades.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- ── fixtures (as postgres) ───────────────────────────────────────────────────
insert into public.institutions (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001', 'École A', 'ecole-a'),
  ('b0000000-0000-4000-8000-000000000001', 'École B', 'ecole-b');
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-0000000000c1', 'parent1@test.ma'),
  ('a0000000-0000-4000-8000-0000000000c2', 'parent2@test.ma'),
  ('b0000000-0000-4000-8000-0000000000c3', 'parent-b@test.ma'),
  ('a0000000-0000-4000-8000-0000000000aa', 'admin-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a7', 'teacher-a1@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a8', 'teacher-a2@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a1', 'student-a1@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a2', 'student-a2@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a3', 'student-a3@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b1', 'student-b@test.ma');
insert into public.profiles (id, institution_id, role, first_name, last_name) values
  ('a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-000000000001', 'parent', 'Karim', 'P1'),
  ('a0000000-0000-4000-8000-0000000000c2', 'a0000000-0000-4000-8000-000000000001', 'parent', 'Laila', 'P2'),
  ('b0000000-0000-4000-8000-0000000000c3', 'b0000000-0000-4000-8000-000000000001', 'parent', 'Bassem', 'PB'),
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


-- Links: Karim (P1) guards Sara and Sami (6A); Laila (P2) guards Sofia (6B).
insert into public.guardianships (institution_id, parent_id, student_id, relationship) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000a1', 'father'), ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000a2', 'father'), ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c2', 'a0000000-0000-4000-8000-0000000000a3', 'mother');
-- One invoice for Sara and one for Sofia.
insert into public.invoices (institution_id, student_id, description, amount_centimes, due_date) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1', 'Scolarité Sara', 100000, '2026-12-01'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a3', 'Scolarité Sofia', 200000, '2026-12-01');
-- Announcements: parents-only, class 6A, class 6B, school.
insert into public.announcements (institution_id, author_id, audience, class_id, title, body) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'parents', null, 'pour les parents', 'x'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'class', 'a1000000-0000-4000-8000-000000000001', 'classe 6A', 'x'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'class', 'a1000000-0000-4000-8000-000000000002', 'classe 6B', 'x'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'students', null, 'pour les élèves', 'x');

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

-- ── linking ─────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select lives_ok($$insert into public.guardianships (institution_id, parent_id, student_id) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c2', 'a0000000-0000-4000-8000-0000000000a1')$$,
  'an administrator links a parent to a student');
select throws_ok($$insert into public.guardianships (institution_id, parent_id, student_id) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c2', 'a0000000-0000-4000-8000-0000000000a1')$$,
  '23505', null, 'a link exists once');
select throws_ok($$insert into public.guardianships (institution_id, parent_id, student_id) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-0000000000a1')$$,
  'P0001', 'invalid_guardianship', 'only a parent can guard');
select throws_ok($$insert into public.guardianships (institution_id, parent_id, student_id) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000a7')$$,
  'P0001', 'invalid_guardianship', 'only a student can be guarded');
select throws_ok($$insert into public.guardianships (institution_id, parent_id, student_id) values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000c3', 'a0000000-0000-4000-8000-0000000000a1')$$,
  'P0001', 'invalid_guardianship', 'a link cannot cross schools (the other school''s parent is invisible)');
select is((select count(*) from public.guardianships), 4::bigint, 'the administration sees every link of its school');
with d as (delete from public.guardianships where parent_id = 'a0000000-0000-4000-8000-0000000000c2' and student_id = 'a0000000-0000-4000-8000-0000000000a1' returning 1)
select is((select count(*) from d), 1::bigint, 'and removes one');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000c1');
select throws_ok($$insert into public.guardianships (institution_id, parent_id, student_id) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000a3')$$,
  '42501', null, 'a parent cannot link themselves to a child');
select is((select count(*) from public.guardianships), 2::bigint, 'a parent sees only their own links');
with d as (delete from public.guardianships returning 1)
select is((select count(*) from d), 0::bigint, 'and cannot remove any');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select count(*) from public.guardianships), 2::bigint, 'a teacher sees the links of their own students');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.guardianships), 0::bigint, 'a student sees none');

-- ── what a parent reads ─────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000c1');
select is((select count(*) from public.classes), 1::bigint, 'a parent sees their children''s class only');
select is((select count(*) from public.enrolments), 2::bigint, 'and their enrolments');
select is((select count(*) from public.profiles where role = 'student'), 2::bigint, 'and their children''s profiles, not others''');
select is((select count(*) from public.profiles where role = 'teacher'), 2::bigint, 'and the teachers of their children''s class');
select is((select count(*) from public.profiles where role = 'institution_admin'), 1::bigint, 'and the administration');
select is((select count(*) from public.profiles where role = 'parent'), 1::bigint, 'but no other parent');
select is((select count(*) from public.exams), 1::bigint, 'published exams of their children''s class (drafts hidden)');
select is((select count(*) from public.grades), 2::bigint, 'their children''s marks on published exams (Sara and Sami), not Sofia''s nor the draft''s');
select is((select count(*) from public.invoices), 1::bigint, 'only their children''s invoices');
select is((select description from public.invoices), 'Scolarité Sara', 'Sara''s invoice, not Sofia''s');
select is((select count(*) from public.announcements), 2::bigint, 'the parents notice and their children''s class notice, not the students'' or another class''s');
with u as (update public.grades set score = 20 returning 1)
select is((select count(*) from u), 0::bigint, 'a parent cannot change marks');
select throws_ok($$insert into public.invoices (institution_id, student_id, description, amount_centimes, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1', 'x', 100, '2026-12-01')$$, '42501', null, 'nor create invoices');

select pg_temp.as_user('a0000000-0000-4000-8000-0000000000c2');
select is((select count(*) from public.classes), 1::bigint, 'another parent sees their own child''s class');
select is((select description from public.invoices), 'Scolarité Sofia', 'and their own invoice');
select is((select count(*) from public.announcements where title = 'classe 6A'), 0::bigint, 'not another class''s notice');
select is((select count(*) from public.announcements where title = 'classe 6B'), 1::bigint, 'only their child''s class notice');

select pg_temp.as_user('b0000000-0000-4000-8000-0000000000c3');
select is((select count(*) from public.profiles where role = 'student'), 0::bigint, 'a parent of another school sees none of these students');
select is((select count(*) from public.invoices), 0::bigint, 'nor their invoices');

select pg_temp.as_anon();
select throws_ok($$select count(*) from public.guardianships$$, '42501', null, 'anon cannot read links');

-- ── messages ────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000c1');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'Bonjour')$$,
  'a parent writes to their child''s teacher');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'Bonjour Direction')$$,
  'and to the administration');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c2', 'x')$$,
  '42501', null, 'not to another parent');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1', 'x')$$,
  '42501', null, 'nor to a student');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000c2');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'x')$$,
  '42501', null, 'a parent cannot write to a teacher of another class');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'Bonjour')$$,
  'but can to the teacher of their child''s class');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c1', 'Bonjour Karim')$$,
  'a teacher writes to the parent of one of their students');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000c2', 'x')$$,
  '42501', null, 'not to a parent of a class they do not teach');

select * from finish();
rollback;
