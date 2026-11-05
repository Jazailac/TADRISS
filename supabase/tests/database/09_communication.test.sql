-- Exams and marks: RLS for every role, draft vs published, score invariants, save_grades.
begin;
create extension if not exists pgtap with schema extensions;
select plan(76);

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

-- Announcements: n1 school, n2 teachers, n3 students, n4 class 6A (by Tarik), n5 class 6B (by Tania),
-- n6 school but soft-deleted, n7 another school.
insert into public.announcements (id, institution_id, author_id, audience, class_id, title, body, deleted_at) values
  ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'all', null, 'n1', 'corps', null),
  ('a9000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'teachers', null, 'n2', 'corps', null),
  ('a9000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'students', null, 'n3', 'corps', null),
  ('a9000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'class', 'a1000000-0000-4000-8000-000000000001', 'n4', 'corps', null),
  ('a9000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'class', 'a1000000-0000-4000-8000-000000000002', 'n5', 'corps', null),
  ('a9000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'all', null, 'n6', 'corps', now()),
  ('a9000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000bb', 'all', null, 'n7', 'corps', null);

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

create function pg_temp.visible(ids uuid[]) returns bigint language sql as $$
  select count(*) from public.announcements where id = any (ids) $$;
create temp table ids as select array['a9000000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000002','a9000000-0000-4000-8000-000000000003','a9000000-0000-4000-8000-000000000004','a9000000-0000-4000-8000-000000000005','a9000000-0000-4000-8000-000000000006','a9000000-0000-4000-8000-000000000007']::uuid[] as a;
grant all on ids to authenticated, anon;
grant execute on function pg_temp.visible(uuid[]) to authenticated, anon;

-- ── announcements: who sees what ────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is(pg_temp.visible((select a from ids)), 6::bigint, 'admin sees every announcement of the school, deleted included, none of another school');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is(pg_temp.visible((select a from ids)), 3::bigint, 'a 6A student sees school, students and their class (n1, n3, n4)');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a3');
select is(pg_temp.visible((select a from ids)), 3::bigint, 'a 6B student sees n1, n3 and n5, not 6A’s notice');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is(pg_temp.visible((select a from ids)), 3::bigint, 'a teacher sees school, teachers and their class (n1, n2, n4)');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select is(pg_temp.visible((select a from ids)), 4::bigint, 'a teacher of two classes sees both class notices');
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000b1');
select is(pg_temp.visible((select a from ids)), 1::bigint, 'another school sees only its own notice');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.announcements where id = 'a9000000-0000-4000-8000-000000000006'), 0::bigint, 'a soft-deleted announcement is hidden from readers');
select pg_temp.as_anon();
select throws_ok($$select count(*) from public.announcements$$, '42501', null, 'anon cannot read announcements');

-- ── announcements: who may publish ──────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select lives_ok($$insert into public.announcements (institution_id, audience, title, body, pinned)
  values ('a0000000-0000-4000-8000-000000000001', 'all', 'Annonce', 'Texte', true)$$, 'admin publishes to the whole school and pins it');
select lives_ok($$insert into public.announcements (institution_id, audience, class_id, title, body)
  values ('a0000000-0000-4000-8000-000000000001', 'class', 'a1000000-0000-4000-8000-000000000002', 'Pour 6B', 'Texte')$$, 'admin addresses any class');
select throws_ok($$insert into public.announcements (institution_id, audience, class_id, title, body)
  values ('a0000000-0000-4000-8000-000000000001', 'all', 'a1000000-0000-4000-8000-000000000001', 'x', 'y')$$, '23514', null, 'a non-class audience cannot name a class');
select throws_ok($$insert into public.announcements (institution_id, audience, title, body)
  values ('a0000000-0000-4000-8000-000000000001', 'class', 'x', 'y')$$, '23514', null, 'a class audience must name its class');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select lives_ok($$insert into public.announcements (institution_id, audience, class_id, title, body)
  values ('a0000000-0000-4000-8000-000000000001', 'class', 'a1000000-0000-4000-8000-000000000001', 'Devoir', 'Texte')$$, 'a teacher addresses a class they teach');
select throws_ok($$insert into public.announcements (institution_id, audience, class_id, title, body)
  values ('a0000000-0000-4000-8000-000000000001', 'class', 'a1000000-0000-4000-8000-000000000002', 'x', 'y')$$, '42501', null, 'a teacher cannot address a class they do not teach');
select throws_ok($$insert into public.announcements (institution_id, audience, title, body)
  values ('a0000000-0000-4000-8000-000000000001', 'all', 'x', 'y')$$, '42501', null, 'a teacher cannot address the whole school');
select throws_ok($$insert into public.announcements (institution_id, audience, class_id, title, body, pinned)
  values ('a0000000-0000-4000-8000-000000000001', 'class', 'a1000000-0000-4000-8000-000000000001', 'x', 'y', true)$$, '42501', null, 'a teacher cannot pin');
select throws_ok($$insert into public.announcements (institution_id, author_id, audience, title, body)
  values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'all', 'x', 'y')$$, '42501', null, 'nobody publishes in someone else’s name');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select throws_ok($$insert into public.announcements (institution_id, audience, title, body)
  values ('a0000000-0000-4000-8000-000000000001', 'all', 'x', 'y')$$, '42501', null, 'a student cannot publish');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select throws_ok($$insert into public.announcements (institution_id, audience, title, body)
  values ('b0000000-0000-4000-8000-000000000001', 'all', 'x', 'y')$$, '42501', null, 'an admin cannot publish into another school');

-- ── announcements: edits and deletes ────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
with u as (update public.announcements set title = 'Nouveau', pinned = true where id = 'a9000000-0000-4000-8000-000000000002' returning 1)
select is((select count(*) from u), 1::bigint, 'admin edits and pins any announcement of the school');
select throws_ok($$update public.announcements set audience = 'students' where id = 'a9000000-0000-4000-8000-000000000002'$$, '42501', null,
  'the audience can never be changed');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
with u as (update public.announcements set title = 'Modifié' where id = 'a9000000-0000-4000-8000-000000000004' returning 1)
select is((select count(*) from u), 1::bigint, 'a teacher edits their own announcement');
with u as (update public.announcements set title = 'Piraté' where id = 'a9000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 0::bigint, 'a teacher cannot edit the administration’s announcement');
select throws_ok($$update public.announcements set pinned = true where id = 'a9000000-0000-4000-8000-000000000004'$$, '42501', null,
  'a teacher cannot pin their own announcement');
with u as (update public.announcements set deleted_at = now() where id = 'a9000000-0000-4000-8000-000000000004' returning 1)
select is((select count(*) from u), 1::bigint, 'a teacher soft-deletes their own announcement');
select is((select count(*) from public.announcements where id = 'a9000000-0000-4000-8000-000000000004'), 1::bigint, 'and still sees it, so it can be restored');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.announcements where id = 'a9000000-0000-4000-8000-000000000004'), 0::bigint, 'but their students no longer do');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
update public.announcements set deleted_at = null where id = 'a9000000-0000-4000-8000-000000000004';
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
with u as (update public.announcements set title = 'Piraté' where id = 'a9000000-0000-4000-8000-000000000004' returning 1)
select is((select count(*) from u), 0::bigint, 'another teacher cannot edit it');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
with u as (update public.announcements set title = 'Piraté' where id = 'a9000000-0000-4000-8000-000000000003' returning 1)
select is((select count(*) from u), 0::bigint, 'a student cannot edit any announcement');
select throws_ok($$delete from public.announcements where id = 'a9000000-0000-4000-8000-000000000003'$$, '42501', null, 'nobody hard-deletes announcements');

-- ── read tracking ───────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is(public.mark_announcements_read((select a from ids)), 3, 'marking reads counts only what the student can see (n1, n3, n4)');
select is(public.mark_announcements_read((select a from ids)), 0, 'marking again is idempotent');
select throws_ok($$insert into public.announcement_reads (institution_id, announcement_id, user_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-0000000000a1')$$, '42501', null, 'a student cannot mark an announcement they cannot see');
select throws_ok($$insert into public.announcement_reads (institution_id, announcement_id, user_id)
  values ('a0000000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a2')$$, '42501', null, 'nobody marks reads on behalf of someone else');
select is((select count(*) from public.announcement_reads), 3::bigint, 'a student sees only their own reads');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a2');
select is(public.mark_announcements_read(array['a9000000-0000-4000-8000-000000000004']::uuid[]), 1, 'a second 6A student reads the class notice');
select is((select count(*) from public.announcement_reads), 1::bigint, 'and sees only their own read');
select is((select announcements from public.unread_counts()), 4::bigint, 'unread counts: n1, n3 and the two notices published above are still unread for them');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select announcements from public.unread_counts()), 2::bigint, 'unread counts: only the two notices published after their reads remain');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select count(*) from public.announcement_reads), 2::bigint, 'an author sees who read their own announcement, and nothing else');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select is((select count(*) from public.announcement_reads), 0::bigint, 'another teacher sees no reads');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*) from public.announcement_reads), 4::bigint, 'the administration sees every read of its school');
select is((select read_count from public.announcement_reach(array['a9000000-0000-4000-8000-000000000004']::uuid[])), 2::bigint, 'reach: two readers of the class notice');
select is((select audience_count from public.announcement_reach(array['a9000000-0000-4000-8000-000000000004']::uuid[])), 3::bigint,
  'reach: the class notice addresses two students and the other teacher, not its author');
select is((select audience_count from public.announcement_reach(array['a9000000-0000-4000-8000-000000000001']::uuid[])), 5::bigint,
  'reach: the school notice addresses 2 teachers and 3 students of this school only');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select audience_count from public.announcement_reach(array['a9000000-0000-4000-8000-000000000004']::uuid[])), 3::bigint, 'an author can see the reach of their notice');
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select is((select count(*) from public.announcement_reach(array['a9000000-0000-4000-8000-000000000001']::uuid[])), 0::bigint, 'another school cannot probe reach');
select pg_temp.as_anon();
select throws_ok($$select * from public.unread_counts()$$, '42501', null, 'anon cannot call unread_counts');

-- ── messages: who may write to whom ─────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'Bonjour')$$,
  'a student writes to the teacher of their class');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'Bonjour Direction')$$,
  'a student writes to the administration');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a2', 'Salut')$$,
  '42501', null, 'a student cannot write to another student');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a3');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'Bonjour')$$,
  '42501', null, 'a student cannot write to a teacher who does not teach them');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000b1', 'Hello')$$,
  '42501', null, 'nobody writes across schools');
select throws_ok($$insert into public.messages (institution_id, sender_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000a7', 'Usurpé')$$,
  '42501', null, 'nobody writes in someone else’s name');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', '   ')$$,
  '23514', null, 'a blank message is refused');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1', 'Bonjour Sara')$$,
  'a teacher writes to a student of their class');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a3', 'Bonjour')$$,
  '42501', null, 'a teacher cannot write to a student of a class they do not teach');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'Collègue')$$,
  '42501', null, 'a teacher cannot write to another teacher');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'Bonjour Direction')$$,
  'a teacher writes to the administration');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select lives_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a3', 'Bonjour Sofia')$$,
  'the administration writes to any student of the school');
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000b1', 'Hello')$$,
  '42501', null, 'the administration cannot write across schools');
update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-0000000000a2';
select throws_ok($$insert into public.messages (institution_id, recipient_id, body) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a2', 'Bonjour')$$,
  'P0001', 'recipient_inactive', 'nobody writes to a deactivated account');
update public.profiles set is_active = true where id = 'a0000000-0000-4000-8000-0000000000a2';

-- ── messages: privacy ───────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*) from public.messages), 3::bigint, 'the administration reads only conversations it is part of');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select is((select count(*) from public.messages), 0::bigint, 'a teacher cannot read messages between others');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.messages), 3::bigint, 'a participant sees their own messages (2 sent, 1 received)');
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select is((select count(*) from public.messages), 0::bigint, 'another school sees nothing');
select pg_temp.as_anon();
select throws_ok($$select count(*) from public.messages$$, '42501', null, 'anon cannot read messages');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select throws_ok($$delete from public.messages$$, '42501', null, 'messages cannot be deleted');

-- ── messages: read receipts ─────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select messages from public.unread_counts()), 1::bigint, 'the teacher has one unread message');
select is((select count(*) from public.conversations()), 2::bigint, 'conversations: one with the student and one with the administration');
select is((select unread_count from public.conversations() where other_id = 'a0000000-0000-4000-8000-0000000000a1'), 1::bigint, 'conversations: one unread message from Sara');
with u as (update public.messages set read_at = '2000-01-01' where recipient_id = 'a0000000-0000-4000-8000-0000000000a7' and read_at is null returning read_at)
select ok((select min(read_at) from u) > now() - interval '1 minute', 'the recipient marks read, and the time is the server’s');
select is((select messages from public.unread_counts()), 0::bigint, 'nothing unread afterwards');
with u as (update public.messages set read_at = null where recipient_id = 'a0000000-0000-4000-8000-0000000000a7' returning 1)
select is((select count(*) from public.messages where recipient_id = 'a0000000-0000-4000-8000-0000000000a7' and read_at is null), 0::bigint, 'a message cannot be marked unread again');
select throws_ok($$update public.messages set body = 'Modifié' where recipient_id = 'a0000000-0000-4000-8000-0000000000a7'$$, '42501', null, 'the text of a message cannot be edited');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
with u as (update public.messages set read_at = now() where sender_id = 'a0000000-0000-4000-8000-0000000000a1' returning 1)
select is((select count(*) from u), 0::bigint, 'a sender cannot mark their own message as read');

select * from finish();
rollback;
