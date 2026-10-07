-- 0011_documents: files shared with an audience, stored in a private Storage bucket. Forward-only.
--
-- A document is a row in public.documents plus one object in the `documents` bucket. The row decides
-- who may see the file (same audiences as announcements: school, teachers, students or one class) and
-- the object policies simply defer to it: you can read an object if you can see its row. Objects live
-- at `<institution_id>/<document_id>/<file name>`, which a check constraint ties to the row, so a
-- file can never be filed under another school. The bucket itself caps size and file types.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 10485760,
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- documents
-- ─────────────────────────────────────────────────────────────────────────────

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  uploader_id uuid not null default auth.uid(),
  audience text not null check (audience in ('all', 'teachers', 'students', 'class')),
  class_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 150),
  description text check (description is null or char_length(description) <= 1000),
  storage_path text not null,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (institution_id, uploader_id) references public.profiles (institution_id, id) on delete restrict,
  foreign key (class_id, institution_id) references public.classes (id, institution_id) on delete restrict,
  constraint documents_class_matches_audience check ((audience = 'class') = (class_id is not null)),
  -- The object is filed under this school and this document: no file can be attached to another tenant.
  constraint documents_path_matches check (
    storage_path like institution_id::text || '/' || id::text || '/%'
  ),
  constraint documents_storage_path_key unique (storage_path),
  constraint documents_id_institution_key unique (id, institution_id)
);
create index documents_feed_idx on public.documents (institution_id, created_at desc) where deleted_at is null;
create index documents_uploader_idx on public.documents (uploader_id, created_at desc);
create index documents_class_idx on public.documents (class_id) where class_id is not null;

alter table public.documents enable row level security;
create trigger documents_set_updated_at before update on public.documents
  for each row execute function private.set_updated_at();

revoke all on public.documents from anon, authenticated;
grant select on public.documents to authenticated;
grant insert (id, institution_id, uploader_id, audience, class_id, title, description,
              storage_path, file_name, mime_type, size_bytes)
  on public.documents to authenticated;
-- The file and its audience are fixed once uploaded: replace a document by deleting and re-uploading.
grant update (title, description, deleted_at) on public.documents to authenticated;

create policy documents_tenant on public.documents
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy documents_not_deleted on public.documents
  as restrictive for select to authenticated
  using (
    deleted_at is null
    or (select private.user_role()) in ('institution_admin', 'super_admin')
    or uploader_id = (select auth.uid())
  );

create policy documents_select_admin on public.documents
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy documents_select_uploader on public.documents
  for select to authenticated
  using (uploader_id = (select auth.uid()));

create policy documents_select_audience on public.documents
  for select to authenticated
  using (
    audience = 'all'
    or (audience = 'teachers' and (select private.user_role()) = 'teacher')
    or (audience = 'students' and (select private.user_role()) = 'student')
    or (audience = 'class' and class_id in (select private.my_class_ids()))
  );

create policy documents_admin_insert on public.documents
  for insert to authenticated
  with check ((select private.user_role()) = 'institution_admin' and uploader_id = (select auth.uid()));

create policy documents_teacher_insert on public.documents
  for insert to authenticated
  with check (
    (select private.user_role()) = 'teacher'
    and uploader_id = (select auth.uid())
    and audience = 'class'
    and class_id in (select private.my_class_ids())
  );

create policy documents_admin_update on public.documents
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

create policy documents_teacher_update on public.documents
  for update to authenticated
  using ((select private.user_role()) = 'teacher' and uploader_id = (select auth.uid()))
  with check ((select private.user_role()) = 'teacher' and uploader_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage object policies (storage.objects already has RLS enabled by Supabase)
-- ─────────────────────────────────────────────────────────────────────────────

-- Read an object if you can read its document row (RLS applies inside the subquery), or if you
-- uploaded it yourself (an upload whose row is not created yet, or failed, must stay reachable so it
-- can be cleaned up).
create policy documents_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      owner_id = (select auth.uid())::text
      or exists (select 1 from public.documents d where d.storage_path = objects.name)
    )
  );

-- Upload only into your own school's folder, and only if you may publish documents at all.
create policy documents_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (select private.user_role()) in ('institution_admin', 'teacher')
    and (storage.foldername(name))[1] = (select private.institution_id())::text
  );

-- Clean up your own upload when its row could not be created. Never a file that has a row.
create policy documents_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and owner_id = (select auth.uid())::text
    and not exists (select 1 from public.documents d where d.storage_path = objects.name)
  );
