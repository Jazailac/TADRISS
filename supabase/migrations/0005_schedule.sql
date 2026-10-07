-- 0005_schedule: subjects and the weekly timetable. Forward-only.
--
-- Invariants in the database (rule 4):
--  * a class never has two lessons overlapping on the same weekday (exclusion constraint);
--  * a teacher is never in two places at once (exclusion constraint);
--  * only a teacher assigned to the class can teach it (composite FK to class_teachers).
-- Times are stored as minutes since midnight so `int4range` can express "[start, end)":
-- back-to-back lessons (09:30 end, 09:30 start) do not overlap.

create extension if not exists btree_gist with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper that breaks an RLS cycle (ADR 0013)
-- ─────────────────────────────────────────────────────────────────────────────

-- The classes the caller belongs to: where a student is actively enrolled, or a teacher is assigned.
-- It must be SECURITY DEFINER: class_teachers and enrolments each need a policy that reads the
-- other, and Postgres rejects such cycles when it rewrites the query. It is scoped strictly to
-- auth.uid(), lives in `private` (never exposed, never in `public`) and cannot be called by anon.
create function private.my_class_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.class_id from public.enrolments e
   where e.student_id = (select auth.uid()) and e.status = 'active'
  union
  select ct.class_id from public.class_teachers ct
   where ct.teacher_id = (select auth.uid())
$$;
revoke execute on function private.my_class_ids() from public, anon;
grant execute on function private.my_class_ids() to authenticated;

-- Students can see who teaches their class; teachers' names are readable to the students they teach.
create policy class_teachers_select_student on public.class_teachers
  for select to authenticated
  using (class_id in (select private.my_class_ids()));

create policy profiles_select_class_teachers on public.profiles
  for select to authenticated
  using (
    role = 'teacher'
    and (select private.user_role()) = 'student'
    and exists (select 1 from public.class_teachers ct
                 where ct.teacher_id = profiles.id
                   and ct.class_id in (select private.my_class_ids()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- subjects
-- ─────────────────────────────────────────────────────────────────────────────

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- A token name, never a raw colour: the UI maps it to the design system (rule 13).
  color text not null default 'primary' check (color in ('primary', 'accent', 'info', 'success', 'warning')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint subjects_id_institution_key unique (id, institution_id)
);
create unique index subjects_name_key
  on public.subjects (institution_id, lower(btrim(name))) where deleted_at is null;

alter table public.subjects enable row level security;
create trigger subjects_set_updated_at before update on public.subjects
  for each row execute function private.set_updated_at();

revoke all on public.subjects from anon, authenticated;
grant select on public.subjects to authenticated;
grant insert (institution_id, name, color) on public.subjects to authenticated;
grant update (name, color, deleted_at) on public.subjects to authenticated;

create policy subjects_tenant on public.subjects
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy subjects_not_deleted on public.subjects
  as restrictive for select to authenticated
  using (deleted_at is null or (select private.user_role()) in ('institution_admin', 'super_admin'));

create policy subjects_select on public.subjects
  for select to authenticated using (true);

create policy subjects_admin_insert on public.subjects
  for insert to authenticated with check ((select private.user_role()) = 'institution_admin');

create policy subjects_admin_update on public.subjects
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- timetable_slots
-- ─────────────────────────────────────────────────────────────────────────────

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  class_id uuid not null,
  subject_id uuid not null,
  teacher_id uuid not null,
  -- 1 = Monday … 6 = Saturday (the Moroccan school week).
  weekday smallint not null check (weekday between 1 and 6),
  starts_min smallint not null check (starts_min between 360 and 1320),
  ends_min smallint not null check (ends_min between 360 and 1320),
  room text check (room is null or char_length(btrim(room)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timetable_slots_time_order check (ends_min > starts_min),
  foreign key (class_id, institution_id) references public.classes (id, institution_id) on delete cascade,
  foreign key (subject_id, institution_id) references public.subjects (id, institution_id) on delete restrict,
  -- The teacher must be assigned to this class.
  foreign key (class_id, teacher_id) references public.class_teachers (class_id, teacher_id) on delete cascade,
  constraint timetable_slots_class_no_overlap
    exclude using gist (class_id with =, weekday with =, int4range(starts_min, ends_min) with &&),
  constraint timetable_slots_teacher_no_overlap
    exclude using gist (teacher_id with =, weekday with =, int4range(starts_min, ends_min) with &&),
  constraint timetable_slots_id_institution_key unique (id, institution_id)
);
create index timetable_slots_class_idx on public.timetable_slots (class_id, weekday, starts_min);
create index timetable_slots_teacher_idx on public.timetable_slots (teacher_id, weekday, starts_min);
create index timetable_slots_subject_idx on public.timetable_slots (subject_id);
create index timetable_slots_institution_idx on public.timetable_slots (institution_id);

alter table public.timetable_slots enable row level security;
create trigger timetable_slots_set_updated_at before update on public.timetable_slots
  for each row execute function private.set_updated_at();

revoke all on public.timetable_slots from anon, authenticated;
grant select, delete on public.timetable_slots to authenticated;
grant insert (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min, room)
  on public.timetable_slots to authenticated;
grant update (subject_id, teacher_id, weekday, starts_min, ends_min, room)
  on public.timetable_slots to authenticated;

create policy timetable_slots_tenant on public.timetable_slots
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy timetable_slots_select_admin on public.timetable_slots
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy timetable_slots_select_teacher on public.timetable_slots
  for select to authenticated
  using (teacher_id = (select auth.uid()));

create policy timetable_slots_select_student on public.timetable_slots
  for select to authenticated
  using (class_id in (select private.my_class_ids()));

create policy timetable_slots_admin_insert on public.timetable_slots
  for insert to authenticated with check ((select private.user_role()) = 'institution_admin');

create policy timetable_slots_admin_update on public.timetable_slots
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

create policy timetable_slots_admin_delete on public.timetable_slots
  for delete to authenticated using ((select private.user_role()) = 'institution_admin');
