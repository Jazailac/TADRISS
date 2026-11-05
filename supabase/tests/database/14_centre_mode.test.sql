-- Centre mode: a centre's student joins several classes, a school's does not, and neither the mode nor
-- an enrolment's rule can be changed through the API.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into public.institutions (id, name, slug, kind) values
  ('c0000000-0000-4000-8000-000000000001', 'Centre C', 'centre-c', 'centre'),
  ('d0000000-0000-4000-8000-000000000001', 'École D', 'ecole-d', 'school');

insert into auth.users (id, email) values
  ('c0000000-0000-4000-8000-0000000000aa', 'admin-c@test.ma'),
  ('c0000000-0000-4000-8000-0000000000a7', 'teacher-c@test.ma'),
  ('c0000000-0000-4000-8000-0000000000a8', 'teacher-c2@test.ma'),
  ('c0000000-0000-4000-8000-0000000000a1', 'student-c1@test.ma'),
  ('c0000000-0000-4000-8000-0000000000a2', 'student-c2@test.ma'),
  ('d0000000-0000-4000-8000-0000000000aa', 'admin-d@test.ma'),
  ('d0000000-0000-4000-8000-0000000000a1', 'student-d1@test.ma');

insert into public.profiles (id, institution_id, role, first_name, last_name) values
  ('c0000000-0000-4000-8000-0000000000aa', 'c0000000-0000-4000-8000-000000000001', 'institution_admin', 'Chama', 'C'),
  ('c0000000-0000-4000-8000-0000000000a7', 'c0000000-0000-4000-8000-000000000001', 'teacher', 'Tarik', 'C'),
  ('c0000000-0000-4000-8000-0000000000a8', 'c0000000-0000-4000-8000-000000000001', 'teacher', 'Tania', 'C'),
  ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000001', 'student', 'Sara', 'C'),
  ('c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-000000000001', 'student', 'Sami', 'C'),
  ('d0000000-0000-4000-8000-0000000000aa', 'd0000000-0000-4000-8000-000000000001', 'institution_admin', 'Driss', 'D'),
  ('d0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000001', 'student', 'Dounia', 'D');

insert into public.classes (id, institution_id, name, school_year, capacity) values
  ('c1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Maths', '2026-2027', null),
  ('c1000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Physique', '2026-2027', 1),
  ('c1000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'SVT', '2026-2027', null),
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '6A', '2026-2027', null),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', '6B', '2026-2027', null);

insert into public.subjects (id, institution_id, name) values
  ('c2000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Matière');
-- Different teachers: one teacher cannot have overlapping lessons, whatever the groups.
insert into public.class_teachers (class_id, teacher_id, institution_id) values
  ('c1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a7', 'c0000000-0000-4000-8000-000000000001'),
  ('c1000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a8', 'c0000000-0000-4000-8000-000000000001');
-- Maths and SVT overlap on Monday. Physique has no lessons.
insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min) values
  ('c0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a7', 1, 1080, 1170);

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
declare c jsonb;
begin
  reset role;
  select (private.custom_access_token_hook(jsonb_build_object('user_id', uid, 'claims',
            jsonb_build_object('sub', uid, 'role', 'authenticated')))) -> 'claims' into c;
  perform set_config('request.jwt.claims', c::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- ── a centre ────────────────────────────────────────────────────────────────
select pg_temp.as_user('c0000000-0000-4000-8000-0000000000aa');
select is(public.enrol_students('c1000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-0000000000a1'::uuid]),
  1, 'centre: enrols a student in a first group');
select is(public.enrol_students('c1000000-0000-4000-8000-000000000002', array['c0000000-0000-4000-8000-0000000000a1'::uuid]),
  1, 'centre: the same student joins a second group');
select is(public.enrol_students('c1000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-0000000000a1'::uuid]),
  0, 'centre: enrolling again in the same group adds nothing');
select throws_ok($$ insert into public.enrolments (institution_id, class_id, school_year, student_id) values
  ('c0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', '2026-2027', 'c0000000-0000-4000-8000-0000000000a1') $$,
  '23505', null, 'centre: the database itself refuses a duplicate active enrolment in one group');
select is((select count(*)::int from public.enrolments where student_id = 'c0000000-0000-4000-8000-0000000000a1' and status = 'active'),
  2, 'centre: the student has two active groups');
select throws_ok($$ select public.enrol_students('c1000000-0000-4000-8000-000000000002', array['c0000000-0000-4000-8000-0000000000a2'::uuid]) $$,
  'P0001', 'class_full', 'centre: capacity still applies per group');

select is((select count(*)::int from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000001') where id = 'c0000000-0000-4000-8000-0000000000a1'),
  0, 'centre candidates: someone already in this group is not offered');
select is((select count(*)::int from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000003') where id = 'c0000000-0000-4000-8000-0000000000a1'),
  1, 'centre candidates: someone in other groups is offered');
select is((select clash_class from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000003') where id = 'c0000000-0000-4000-8000-0000000000a1'),
  null, 'centre candidates: no shared lesson time means no clash');
select is((select count(*)::int from public.enrolable_students_for_class('d1000000-0000-4000-8000-000000000001')),
  0, 'candidates: another school''s class offers nobody');

reset role;
insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min) values
  ('c0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a8', 2, 1080, 1170);
select pg_temp.as_user('c0000000-0000-4000-8000-0000000000aa');
select is((select clash_class from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000003') where id = 'c0000000-0000-4000-8000-0000000000a1'),
  null, 'centre candidates: the same time on another day is no clash');
reset role;
insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min) values
  ('c0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a8', 1, 1140, 1200);
select pg_temp.as_user('c0000000-0000-4000-8000-0000000000aa');
select is((select clash_class from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000003') where id = 'c0000000-0000-4000-8000-0000000000a1'),
  'Maths', 'centre candidates: an overlapping group is named as a clash');

-- ── what counts as a clash, and who is offered ──────────────────────────────
select is((select count(*)::int from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000003') where id = 'd0000000-0000-4000-8000-0000000000a1'),
  0, 'centre candidates: another school''s student is never offered');
select lives_ok($$ update public.enrolments set status = 'withdrawn', withdrawn_on = current_date
  where student_id = 'c0000000-0000-4000-8000-0000000000a1' and class_id = 'c1000000-0000-4000-8000-000000000001' $$,
  'centre: withdraws a student from a group');
select is((select clash_class from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000003') where id = 'c0000000-0000-4000-8000-0000000000a1'),
  null, 'centre candidates: a group they left is no clash');
select is(public.enrol_students('c1000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-0000000000a1'::uuid]),
  1, 'centre: a student can come back to a group they left');
select throws_ok($$ update public.enrolments set status = 'active', withdrawn_on = null
  where student_id = 'c0000000-0000-4000-8000-0000000000a1' and class_id = 'c1000000-0000-4000-8000-000000000001' and status = 'withdrawn' $$,
  '23505', null, 'centre: reactivating an old row beside an active one is refused');
select lives_ok($$ update public.classes set deleted_at = now() where id = 'c1000000-0000-4000-8000-000000000001' $$,
  'centre: archives a group');
select is((select clash_class from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000003') where id = 'c0000000-0000-4000-8000-0000000000a1'),
  null, 'centre candidates: an archived group is no clash');
select lives_ok($$ update public.classes set deleted_at = null where id = 'c1000000-0000-4000-8000-000000000001' $$,
  'centre: restores the group');

-- ── who may do what ─────────────────────────────────────────────────────────
select throws_ok($$ update public.institutions set kind = 'school' where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'an admin cannot change their school''s kind');
select throws_ok($$ insert into public.enrolments (institution_id, class_id, school_year, student_id, exclusive) values
  ('c0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', '2026-2027', 'c0000000-0000-4000-8000-0000000000a2', false) $$,
  '42501', null, 'nobody can set an enrolment''s rule through the API');
select throws_ok($$ update public.enrolments set exclusive = true where student_id = 'c0000000-0000-4000-8000-0000000000a1' $$,
  '42501', null, 'nobody can change an enrolment''s rule through the API');
select pg_temp.as_user('c0000000-0000-4000-8000-0000000000a7');
select throws_ok($$ select public.enrol_students('c1000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-0000000000a2'::uuid]) $$,
  '42501', null, 'a teacher cannot enrol students, even in a group they teach');
select is((select count(*)::int from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000003')),
  0, 'a teacher gets no candidates for a group they do not teach');
select pg_temp.as_user('c0000000-0000-4000-8000-0000000000a1');
select is((select count(*)::int from public.enrolable_students_for_class('c1000000-0000-4000-8000-000000000002') where id <> 'c0000000-0000-4000-8000-0000000000a1'),
  0, 'a student never gets other students as candidates');

-- ── a school keeps one class per year ───────────────────────────────────────
select pg_temp.as_user('d0000000-0000-4000-8000-0000000000aa');
select is(public.enrol_students('d1000000-0000-4000-8000-000000000001', array['d0000000-0000-4000-8000-0000000000a1'::uuid]),
  1, 'school: enrols a student in a class');
select is(public.enrol_students('d1000000-0000-4000-8000-000000000002', array['d0000000-0000-4000-8000-0000000000a1'::uuid]),
  0, 'school: a second class in the same year adds nothing');
select throws_ok($$ insert into public.enrolments (institution_id, class_id, school_year, student_id) values
  ('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', '2026-2027', 'd0000000-0000-4000-8000-0000000000a1') $$,
  '23505', null, 'school: the database itself refuses a second class in the same year');
select is((select count(*)::int from public.enrolable_students_for_class('d1000000-0000-4000-8000-000000000002') where id = 'd0000000-0000-4000-8000-0000000000a1'),
  0, 'school candidates: a student with a class is not offered');
select lives_ok($$ update public.enrolments set status = 'withdrawn', withdrawn_on = current_date
  where student_id = 'd0000000-0000-4000-8000-0000000000a1' $$, 'school: withdraws a student');
select is(public.enrol_students('d1000000-0000-4000-8000-000000000002', array['d0000000-0000-4000-8000-0000000000a1'::uuid]),
  1, 'school: a student can then join another class');
select throws_ok($$ update public.enrolments set status = 'active', withdrawn_on = null
  where student_id = 'd0000000-0000-4000-8000-0000000000a1' and class_id = 'd1000000-0000-4000-8000-000000000001' $$,
  '23505', null, 'school: reactivating a withdrawn class beside an active one is refused');

select * from finish();
rollback;
