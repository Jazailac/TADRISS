-- 0015_guardians: the parent role. Forward-only.
--
-- A parent (guardian) is a school member linked to one or more students. They read what concerns
-- THEIR children (timetable, attendance, published marks, homework, invoices and receipts), the
-- announcements and documents addressed to parents or to their children's classes, and they can
-- write to their children's teachers and to the administration. They never read other families'
-- data, and they change nothing but their own messages and reads.
--
-- Two SECURITY DEFINER helpers (like private.my_class_ids, ADR 0013) resolve "my children" and
-- "my children's classes" without the policies querying an RLS table.

-- ─────────────────────────────────────────────────────────────────────────────
-- The role
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('super_admin', 'institution_admin', 'teacher', 'student', 'parent'));

alter table public.invitations drop constraint invitations_role_check;
alter table public.invitations add constraint invitations_role_check
  check (role in ('teacher', 'student', 'parent'));

drop policy profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (
    (select private.user_role()) = 'institution_admin'
    and role in ('teacher', 'student', 'parent')
    and id <> (select auth.uid())
  )
  with check (
    (select private.user_role()) = 'institution_admin'
    and role in ('teacher', 'student', 'parent')
    and id <> (select auth.uid())
  );

alter table public.announcements drop constraint announcements_audience_check;
alter table public.announcements add constraint announcements_audience_check
  check (audience in ('all', 'teachers', 'students', 'parents', 'class'));

alter table public.documents drop constraint documents_audience_check;
alter table public.documents add constraint documents_audience_check
  check (audience in ('all', 'teachers', 'students', 'parents', 'class'));

-- ─────────────────────────────────────────────────────────────────────────────
-- guardianships
-- ─────────────────────────────────────────────────────────────────────────────

create table public.guardianships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  parent_id uuid not null,
  student_id uuid not null,
  relationship text not null default 'parent'
    check (relationship in ('parent', 'mother', 'father', 'guardian')),
  created_at timestamptz not null default now(),
  foreign key (institution_id, parent_id) references public.profiles (institution_id, id) on delete cascade,
  foreign key (institution_id, student_id) references public.profiles (institution_id, id) on delete cascade,
  constraint guardianships_once unique (parent_id, student_id),
  constraint guardianships_distinct check (parent_id <> student_id)
);
create index guardianships_student_idx on public.guardianships (student_id);
create index guardianships_institution_idx on public.guardianships (institution_id);

alter table public.guardianships enable row level security;

-- Only a parent can guard, and only a student can be guarded.
create function private.guard_guardianship()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p_role text;
  s_role text;
begin
  -- Authorise first (BEFORE triggers run ahead of RLS): only the administration links people.
  if current_setting('role', true) in ('authenticated', 'anon')
     and (select private.user_role()) is distinct from 'institution_admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select p.role into p_role from public.profiles p where p.id = new.parent_id;
  select p.role into s_role from public.profiles p where p.id = new.student_id;
  if p_role is distinct from 'parent' or s_role is distinct from 'student' then
    raise exception 'invalid_guardianship';
  end if;
  return new;
end;
$$;
create trigger guardianships_guard before insert on public.guardianships
  for each row execute function private.guard_guardianship();

revoke all on public.guardianships from anon, authenticated;
grant select on public.guardianships to authenticated;
grant insert (institution_id, parent_id, student_id, relationship) on public.guardianships to authenticated;
grant delete on public.guardianships to authenticated;

create function private.my_children_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.student_id from public.guardianships g where g.parent_id = (select auth.uid())
$$;
revoke execute on function private.my_children_ids() from public, anon;
grant execute on function private.my_children_ids() to authenticated;

create function private.my_children_class_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.class_id
    from public.enrolments e
   where e.status = 'active'
     and e.student_id in (select g.student_id from public.guardianships g
                           where g.parent_id = (select auth.uid()))
$$;
revoke execute on function private.my_children_class_ids() from public, anon;
grant execute on function private.my_children_class_ids() to authenticated;

create policy guardianships_tenant on public.guardianships
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy guardianships_select_admin on public.guardianships
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy guardianships_select_parent on public.guardianships
  for select to authenticated
  using (parent_id = (select auth.uid()));

-- A teacher sees the guardians of the students they teach (to write to them).
create policy guardianships_select_teacher on public.guardianships
  for select to authenticated
  using ((select private.user_role()) = 'teacher'
         and student_id in (
           select e.student_id from public.enrolments e where e.class_id in (select private.my_class_ids())
         ));

create policy guardianships_admin_insert on public.guardianships
  for insert to authenticated
  with check ((select private.user_role()) = 'institution_admin');

create policy guardianships_admin_delete on public.guardianships
  for delete to authenticated
  using ((select private.user_role()) = 'institution_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- What a parent may read: their children's data
-- ─────────────────────────────────────────────────────────────────────────────

create policy profiles_select_children on public.profiles
  for select to authenticated
  using ((select private.user_role()) = 'parent' and id in (select private.my_children_ids()));

-- The teachers of their children's classes (to write to them).
create policy profiles_select_children_teachers on public.profiles
  for select to authenticated
  using (
    role = 'teacher'
    and (select private.user_role()) = 'parent'
    and id in (select ct.teacher_id from public.class_teachers ct
                where ct.class_id in (select private.my_children_class_ids()))
  );

-- A teacher sees the parents of their students.
create policy profiles_select_students_parents on public.profiles
  for select to authenticated
  using (
    role = 'parent'
    and (select private.user_role()) = 'teacher'
    and id in (select g.parent_id from public.guardianships g)
  );

create policy classes_select_parent on public.classes
  for select to authenticated
  using ((select private.user_role()) = 'parent' and id in (select private.my_children_class_ids()));

create policy class_teachers_select_parent on public.class_teachers
  for select to authenticated
  using ((select private.user_role()) = 'parent'
         and class_id in (select private.my_children_class_ids()));

create policy enrolments_select_parent on public.enrolments
  for select to authenticated
  using ((select private.user_role()) = 'parent' and student_id in (select private.my_children_ids()));

create policy timetable_slots_select_parent on public.timetable_slots
  for select to authenticated
  using ((select private.user_role()) = 'parent'
         and class_id in (select private.my_children_class_ids()));

create policy attendance_sessions_select_parent on public.attendance_sessions
  for select to authenticated
  using ((select private.user_role()) = 'parent'
         and class_id in (select private.my_children_class_ids()));

create policy attendance_records_select_parent on public.attendance_records
  for select to authenticated
  using ((select private.user_role()) = 'parent' and student_id in (select private.my_children_ids()));

create policy homework_select_parent on public.homework
  for select to authenticated
  using ((select private.user_role()) = 'parent'
         and class_id in (select private.my_children_class_ids()));

create policy homework_completions_select_parent on public.homework_completions
  for select to authenticated
  using ((select private.user_role()) = 'parent' and student_id in (select private.my_children_ids()));

-- Published exams of their children's classes, and only their children's marks.
create policy exams_select_parent on public.exams
  for select to authenticated
  using ((select private.user_role()) = 'parent'
         and published_at is not null
         and class_id in (select private.my_children_class_ids()));

create policy grades_select_parent on public.grades
  for select to authenticated
  using ((select private.user_role()) = 'parent'
         and student_id in (select private.my_children_ids())
         and exists (select 1 from public.exams e where e.id = grades.exam_id));

create policy invoices_select_parent on public.invoices
  for select to authenticated
  using ((select private.user_role()) = 'parent'
         and student_id in (select private.my_children_ids())
         and voided_at is null);

create policy payments_select_parent on public.payments
  for select to authenticated
  using ((select private.user_role()) = 'parent'
         and student_id in (select private.my_children_ids())
         and voided_at is null);

-- ─────────────────────────────────────────────────────────────────────────────
-- Announcements and documents: a "parents" audience, and their children's classes
-- ─────────────────────────────────────────────────────────────────────────────

drop policy announcements_select_audience on public.announcements;
create policy announcements_select_audience on public.announcements
  for select to authenticated
  using (
    audience = 'all'
    or (audience = 'teachers' and (select private.user_role()) = 'teacher')
    or (audience = 'students' and (select private.user_role()) = 'student')
    or (audience = 'parents' and (select private.user_role()) = 'parent')
    or (audience = 'class' and (
         class_id in (select private.my_class_ids())
         or ((select private.user_role()) = 'parent'
             and class_id in (select private.my_children_class_ids()))))
  );

drop policy documents_select_audience on public.documents;
create policy documents_select_audience on public.documents
  for select to authenticated
  using (
    audience = 'all'
    or (audience = 'teachers' and (select private.user_role()) = 'teacher')
    or (audience = 'students' and (select private.user_role()) = 'student')
    or (audience = 'parents' and (select private.user_role()) = 'parent')
    or (audience = 'class' and (
         class_id in (select private.my_class_ids())
         or ((select private.user_role()) = 'parent'
             and class_id in (select private.my_children_class_ids()))))
  );

-- Reach: parents are part of "all" and of "parents", and of their children's class notices.
create or replace function public.announcement_reach(p_ids uuid[])
returns table (announcement_id uuid, read_count bigint, audience_count bigint)
language sql
stable
set search_path = ''
as $$
  select a.id,
         (select count(*) from public.announcement_reads r
           where r.announcement_id = a.id and r.user_id <> a.author_id),
         case a.audience
           when 'class' then
             (select count(*) from public.enrolments e
               where e.class_id = a.class_id and e.status = 'active' and e.student_id <> a.author_id)
             + (select count(*) from public.class_teachers ct
                 where ct.class_id = a.class_id and ct.teacher_id <> a.author_id)
             + (select count(distinct g.parent_id) from public.guardianships g
                 where g.student_id in (select e.student_id from public.enrolments e
                                         where e.class_id = a.class_id and e.status = 'active'))
           else
             (select count(*) from public.profiles p
               where p.institution_id = a.institution_id and p.is_active and p.deleted_at is null
                 and p.id <> a.author_id
                 and case a.audience
                       when 'all' then p.role in ('teacher', 'student', 'parent')
                       when 'teachers' then p.role = 'teacher'
                       when 'students' then p.role = 'student'
                       else p.role = 'parent'
                     end)
         end
    from public.announcements a
   where a.id = any (p_ids)
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Messages: parent <-> teacher (of their children), parent <-> administration
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function private.guard_message()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  sender_role text;
  recipient record;
begin
  if current_setting('role', true) in ('authenticated', 'anon')
     and (new.institution_id is distinct from (select private.institution_id())
          or new.sender_id is distinct from (select auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select p.role into sender_role from public.profiles p where p.id = new.sender_id;

  select p.role, p.is_active into recipient
    from public.profiles p
   where p.id = new.recipient_id and p.institution_id = new.institution_id;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Administration <-> anyone; teacher <-> student; teacher <-> parent. Never student<->student,
  -- parent<->parent or student<->parent. Visibility (RLS) already limits teachers to their own
  -- students' and parents' profiles, and parents to their children's teachers.
  if not (
       sender_role = 'institution_admin'
    or recipient.role = 'institution_admin'
    or (sender_role = 'teacher' and recipient.role in ('student', 'parent'))
    or (sender_role in ('student', 'parent') and recipient.role = 'teacher')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not recipient.is_active then
    raise exception 'recipient_inactive';
  end if;
  return new;
end;
$$;
