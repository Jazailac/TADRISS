-- Exams and marks: RLS for every role, draft vs published, score invariants, save_grades.
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

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


insert into public.documents (id, institution_id, uploader_id, audience, class_id, title, storage_path, file_name, mime_type, size_bytes, deleted_at) values
  ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'all', null, 'd1', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000001/f.pdf', 'f.pdf', 'application/pdf', 1000, null),
  ('a9000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'teachers', null, 'd2', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000002/f.pdf', 'f.pdf', 'application/pdf', 1000, null),
  ('a9000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'students', null, 'd3', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000003/f.pdf', 'f.pdf', 'application/pdf', 1000, null),
  ('a9000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'class', 'a1000000-0000-4000-8000-000000000001', 'd4', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000004/f.pdf', 'f.pdf', 'application/pdf', 1000, null),
  ('a9000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a8', 'class', 'a1000000-0000-4000-8000-000000000002', 'd5', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000005/f.pdf', 'f.pdf', 'application/pdf', 1000, null),
  ('a9000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'all', null, 'd6', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000006/f.pdf', 'f.pdf', 'application/pdf', 1000, now()),
  ('a9000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000bb', 'all', null, 'd7', 'b0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000007/f.pdf', 'f.pdf', 'application/pdf', 1000, null);
insert into storage.objects (bucket_id, name) values
  ('documents', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000001/f.pdf'),
  ('documents', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000002/f.pdf'),
  ('documents', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000003/f.pdf'),
  ('documents', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000004/f.pdf'),
  ('documents', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000005/f.pdf'),
  ('documents', 'b0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000007/f.pdf');

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


create function pg_temp.visible() returns bigint language sql as $$
  select count(*) from public.documents where id in ('a9000000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000002','a9000000-0000-4000-8000-000000000003','a9000000-0000-4000-8000-000000000004','a9000000-0000-4000-8000-000000000005','a9000000-0000-4000-8000-000000000006','a9000000-0000-4000-8000-000000000007') $$;
create function pg_temp.visible_objects() returns bigint language sql as $$
  select count(*) from storage.objects where bucket_id = 'documents' $$;
grant execute on function pg_temp.visible(), pg_temp.visible_objects() to authenticated, anon;

-- ── documents: who sees what ────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is(pg_temp.visible(), 6::bigint, 'admin sees every document of the school, deleted included, none of another school');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is(pg_temp.visible(), 3::bigint, 'a 6A student sees school, students and their class');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a3');
select is(pg_temp.visible(), 3::bigint, 'a 6B student sees their own class, not 6A''s');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is(pg_temp.visible(), 3::bigint, 'a teacher sees school, teachers and their class');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select is(pg_temp.visible(), 4::bigint, 'a teacher of two classes sees both');
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000b1');
select is(pg_temp.visible(), 1::bigint, 'another school sees only its own document');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.documents where id = 'a9000000-0000-4000-8000-000000000006'), 0::bigint, 'a soft-deleted document is hidden from readers');
select pg_temp.as_anon();
select throws_ok($$select count(*) from public.documents$$, '42501', null, 'anon cannot read documents');

-- ── storage objects follow the rows ─────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is(pg_temp.visible_objects(), 5::bigint, 'admin can read the objects of its documents, not another school''s');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is(pg_temp.visible_objects(), 3::bigint, 'a student can read only the objects of documents they can see');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a3');
select is(pg_temp.visible_objects(), 3::bigint, 'another class sees its own objects');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
select is(pg_temp.visible_objects(), 4::bigint, 'a teacher can read the objects of their classes');
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000b1');
select is(pg_temp.visible_objects(), 1::bigint, 'another school can read only its own object');
select pg_temp.as_anon();
select is(pg_temp.visible_objects(), 0::bigint, 'anon can read no object');

-- ── documents: who may publish ──────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select lives_ok($$insert into public.documents (id, institution_id, audience, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'all', 'Règlement', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000008/r.pdf', 'r.pdf', 'application/pdf', 2048)$$,
  'admin publishes to the whole school');
select throws_ok($$insert into public.documents (id, institution_id, audience, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'all', 'x', 'b0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000009/x.pdf', 'x.pdf', 'application/pdf', 10)$$,
  '23514', null, 'a file cannot be filed under another school''s folder');
select throws_ok($$insert into public.documents (id, institution_id, audience, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'all', 'x', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000008/x.pdf', 'x.pdf', 'application/pdf', 10)$$,
  '23514', null, 'a file cannot be filed under another document''s folder');
select throws_ok($$insert into public.documents (id, institution_id, audience, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'all', 'x', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000009/x.pdf', 'x.pdf', 'application/pdf', 10485761)$$,
  '23514', null, 'a file above 10 MB is refused');
select throws_ok($$insert into public.documents (id, institution_id, audience, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'all', 'x', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000009/x.pdf', 'x.pdf', 'application/pdf', 0)$$,
  '23514', null, 'an empty file is refused');
select throws_ok($$insert into public.documents (id, institution_id, audience, class_id, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'all', 'a1000000-0000-4000-8000-000000000001', 'x', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000009/x.pdf', 'x.pdf', 'application/pdf', 10)$$,
  '23514', null, 'a non-class audience cannot name a class');
select throws_ok($$insert into public.documents (id, institution_id, audience, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'all', 'x', 'b0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000009/x.pdf', 'x.pdf', 'application/pdf', 10)$$,
  '42501', null, 'an admin cannot publish into another school');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select lives_ok($$insert into public.documents (id, institution_id, audience, class_id, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'class', 'a1000000-0000-4000-8000-000000000001', 'Cours', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000009/c.pdf', 'c.pdf', 'application/pdf', 10)$$,
  'a teacher shares a file with a class they teach');
select throws_ok($$insert into public.documents (id, institution_id, audience, class_id, title, storage_path, file_name, mime_type, size_bytes)
  values (gen_random_uuid(), 'a0000000-0000-4000-8000-000000000001', 'class', 'a1000000-0000-4000-8000-000000000002', 'x', 'x', 'x.pdf', 'application/pdf', 10)$$,
  '42501', null, 'a teacher cannot share with a class they do not teach');
select throws_ok($$insert into public.documents (id, institution_id, audience, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000001', 'all', 'x', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-0000000000aa/x.pdf', 'x.pdf', 'application/pdf', 10)$$,
  '42501', null, 'a teacher cannot share with the whole school');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select throws_ok($$insert into public.documents (id, institution_id, audience, title, storage_path, file_name, mime_type, size_bytes)
  values ('a9000000-0000-4000-8000-0000000000ab', 'a0000000-0000-4000-8000-000000000001', 'all', 'x', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-0000000000ab/x.pdf', 'x.pdf', 'application/pdf', 10)$$,
  '42501', null, 'a student cannot publish');

-- ── documents: edits and deletes ────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
with u as (update public.documents set title = 'Nouveau' where id = 'a9000000-0000-4000-8000-000000000002' returning 1)
select is((select count(*) from u), 1::bigint, 'admin renames any document of the school');
select throws_ok($$update public.documents set audience = 'students' where id = 'a9000000-0000-4000-8000-000000000002'$$, '42501', null, 'the audience can never be changed');
select throws_ok($$update public.documents set storage_path = 'x' where id = 'a9000000-0000-4000-8000-000000000002'$$, '42501', null, 'the file can never be swapped');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
with u as (update public.documents set title = 'Modifié' where id = 'a9000000-0000-4000-8000-000000000004' returning 1)
select is((select count(*) from u), 1::bigint, 'a teacher renames their own document');
with u as (update public.documents set title = 'Piraté' where id = 'a9000000-0000-4000-8000-000000000001' returning 1)
select is((select count(*) from u), 0::bigint, 'a teacher cannot rename the administration''s document');
with u as (update public.documents set deleted_at = now() where id = 'a9000000-0000-4000-8000-000000000004' returning 1)
select is((select count(*) from u), 1::bigint, 'a teacher soft-deletes their own document');
select is((select count(*) from public.documents where id = 'a9000000-0000-4000-8000-000000000004'), 1::bigint, 'and still sees it, so it can be restored');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.documents where id = 'a9000000-0000-4000-8000-000000000004'), 0::bigint, 'but their students no longer do');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a8');
with u as (update public.documents set title = 'Piraté' where id = 'a9000000-0000-4000-8000-000000000004' returning 1)
select is((select count(*) from u), 0::bigint, 'another teacher cannot edit it');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
with u as (update public.documents set title = 'Piraté' where id = 'a9000000-0000-4000-8000-000000000003' returning 1)
select is((select count(*) from u), 0::bigint, 'a student cannot edit any document');
select throws_ok($$delete from public.documents where id = 'a9000000-0000-4000-8000-000000000003'$$, '42501', null, 'nobody hard-deletes documents');

-- ── storage: uploads ────────────────────────────────────────────────────────
-- Storage forbids raw deletes unless the Storage API flags them; the flag does not bypass RLS.
select set_config('storage.allow_delete_query', 'true', true);
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('documents', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-0000000000c1/orphan.pdf', 'a0000000-0000-4000-8000-0000000000a7')$$,
  'a teacher uploads into their own school''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('documents', 'b0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-0000000000c2/x.pdf', 'a0000000-0000-4000-8000-0000000000a7')$$,
  '42501', null, 'nobody uploads into another school''s folder');
with u as (delete from storage.objects where bucket_id = 'documents' and name = 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-0000000000c1/orphan.pdf' returning 1)
select is((select count(*) from u), 1::bigint, 'an uploader cleans up their own orphan object');
with u as (delete from storage.objects where bucket_id = 'documents' and name = 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-000000000004/f.pdf' returning 1)
select is((select count(*) from u), 0::bigint, 'an object that has a document row cannot be removed');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select throws_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('documents', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-0000000000c3/x.pdf', 'a0000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'a student cannot upload');
select pg_temp.as_anon();
select throws_ok($$insert into storage.objects (bucket_id, name) values ('documents', 'a0000000-0000-4000-8000-000000000001/a9000000-0000-4000-8000-0000000000c4/x.pdf')$$,
  '42501', null, 'anon cannot upload');

select * from finish();
rollback;
