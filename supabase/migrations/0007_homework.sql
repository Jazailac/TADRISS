-- 0007_homework: homework set by teachers, and students ticking it off. Forward-only.
--
-- A teacher can only set homework for a class they teach (composite FK to class_teachers). Homework
-- is soft-deleted so a mistaken delete is recoverable by the administration. A completion is the
-- student's own toggle: they insert and delete their own row, nobody else's.

-- ─────────────────────────────────────────────────────────────────────────────
-- homework
-- ─────────────────────────────────────────────────────────────────────────────

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  class_id uuid not null,
  subject_id uuid not null,
  teacher_id uuid not null default auth.uid(),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  description text check (description is null or char_length(description) <= 4000),
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (class_id, institution_id) references public.classes (id, institution_id) on delete restrict,
  foreign key (subject_id, institution_id) references public.subjects (id, institution_id) on delete restrict,
  -- Only a teacher assigned to the class can set homework for it.
  foreign key (class_id, teacher_id) references public.class_teachers (class_id, teacher_id) on delete restrict,
  constraint homework_id_institution_key unique (id, institution_id)
);
create index homework_class_due_idx on public.homework (class_id, due_date) where deleted_at is null;
create index homework_teacher_idx on public.homework (teacher_id, due_date);
create index homework_institution_idx on public.homework (institution_id);
create index homework_subject_idx on public.homework (subject_id);

alter table public.homework enable row level security;
create trigger homework_set_updated_at before update on public.homework
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- homework_completions
-- ─────────────────────────────────────────────────────────────────────────────

create table public.homework_completions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  homework_id uuid not null,
  student_id uuid not null default auth.uid(),
  completed_at timestamptz not null default now(),
  foreign key (homework_id, institution_id) references public.homework (id, institution_id) on delete cascade,
  foreign key (institution_id, student_id) references public.profiles (institution_id, id) on delete cascade,
  constraint homework_completions_once unique (homework_id, student_id)
);
create index homework_completions_student_idx on public.homework_completions (student_id);
create index homework_completions_institution_idx on public.homework_completions (institution_id);

alter table public.homework_completions enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.homework, public.homework_completions from anon, authenticated;
grant select on public.homework, public.homework_completions to authenticated;
grant insert (institution_id, class_id, subject_id, teacher_id, title, description, due_date)
  on public.homework to authenticated;
-- The class never changes after creation (completions and the teacher's right to set it depend on it).
grant update (subject_id, title, description, due_date, deleted_at) on public.homework to authenticated;
grant insert (institution_id, homework_id, student_id) on public.homework_completions to authenticated;
grant delete on public.homework_completions to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: homework
-- ─────────────────────────────────────────────────────────────────────────────

create policy homework_tenant on public.homework
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

-- Soft-deleted homework is hidden from students and other teachers. Its author (and the
-- administration) still see it: Postgres checks the SELECT policy against the NEW row of an UPDATE,
-- so without this the author's own soft delete would be rejected. It also makes a restore possible.
create policy homework_not_deleted on public.homework
  as restrictive for select to authenticated
  using (
    deleted_at is null
    or (select private.user_role()) in ('institution_admin', 'super_admin')
    or ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()))
  );

create policy homework_select_admin on public.homework
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

-- Teachers and students see the homework of the classes they belong to.
create policy homework_select_member on public.homework
  for select to authenticated
  using (class_id in (select private.my_class_ids()));

create policy homework_teacher_insert on public.homework
  for insert to authenticated
  with check ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()));

create policy homework_teacher_update on public.homework
  for update to authenticated
  using ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()))
  with check ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: completions
-- ─────────────────────────────────────────────────────────────────────────────

create policy homework_completions_tenant on public.homework_completions
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy homework_completions_select_admin on public.homework_completions
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy homework_completions_select_student on public.homework_completions
  for select to authenticated
  using (student_id = (select auth.uid()));

-- A teacher sees who has finished the homework they set.
create policy homework_completions_select_teacher on public.homework_completions
  for select to authenticated
  using (
    (select private.user_role()) = 'teacher'
    and exists (select 1 from public.homework h
                 where h.id = homework_completions.homework_id and h.teacher_id = (select auth.uid()))
  );

-- A student ticks off homework of their own class, for themselves only.
create policy homework_completions_student_insert on public.homework_completions
  for insert to authenticated
  with check (
    (select private.user_role()) = 'student'
    and student_id = (select auth.uid())
    and exists (select 1 from public.homework h where h.id = homework_id and h.class_id in (select private.my_class_ids()))
  );

create policy homework_completions_student_delete on public.homework_completions
  for delete to authenticated
  using ((select private.user_role()) = 'student' and student_id = (select auth.uid()));
