-- 0004_classes_enrolment: classes, their teachers and student enrolments. Forward-only.
--
-- Invariants live in the database (rule 4):
--  * composite FKs keep every row inside one institution, whatever a policy says;
--  * a student has at most one ACTIVE enrolment per school year (partial unique index);
--  * a class never holds more active students than its capacity (trigger, serialised by a row lock);
--  * only teachers can teach a class, only students can be enrolled (triggers).

-- Targets for composite foreign keys.
alter table public.profiles add constraint profiles_institution_id_id_key unique (institution_id, id);

-- ─────────────────────────────────────────────────────────────────────────────
-- classes
-- ─────────────────────────────────────────────────────────────────────────────

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  level text check (level is null or char_length(btrim(level)) between 1 and 60),
  -- '2026-2027': the Moroccan school year starts in September.
  school_year text not null check (
    case when school_year ~ '^[0-9]{4}-[0-9]{4}$'
         then substr(school_year, 6, 4)::int = substr(school_year, 1, 4)::int + 1
         else false end
  ),
  capacity int check (capacity is null or capacity between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint classes_id_institution_key unique (id, institution_id),
  constraint classes_id_year_key unique (id, school_year)
);

-- No two live classes share a name within a school year.
create unique index classes_name_year_key
  on public.classes (institution_id, school_year, lower(btrim(name))) where deleted_at is null;
create index classes_institution_year_idx on public.classes (institution_id, school_year);

alter table public.classes enable row level security;
create trigger classes_set_updated_at before update on public.classes
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- class_teachers
-- ─────────────────────────────────────────────────────────────────────────────

create table public.class_teachers (
  class_id uuid not null,
  teacher_id uuid not null,
  institution_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (class_id, teacher_id),
  foreign key (class_id, institution_id) references public.classes (id, institution_id) on delete cascade,
  foreign key (institution_id, teacher_id) references public.profiles (institution_id, id) on delete cascade
);
create index class_teachers_teacher_idx on public.class_teachers (teacher_id);

alter table public.class_teachers enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- enrolments
-- ─────────────────────────────────────────────────────────────────────────────

create table public.enrolments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  class_id uuid not null,
  school_year text not null,
  student_id uuid not null,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  enrolled_on date not null default current_date,
  withdrawn_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (class_id, institution_id) references public.classes (id, institution_id) on delete restrict,
  foreign key (class_id, school_year) references public.classes (id, school_year) on delete restrict,
  foreign key (institution_id, student_id) references public.profiles (institution_id, id) on delete restrict,
  constraint enrolments_withdrawn_consistent check ((status = 'withdrawn') = (withdrawn_on is not null)),
  constraint enrolments_dates_ordered check (withdrawn_on is null or withdrawn_on >= enrolled_on)
);

-- One active enrolment per student per school year; history (withdrawn rows) is kept.
create unique index enrolments_one_active_per_year
  on public.enrolments (student_id, school_year) where status = 'active';
create index enrolments_class_status_idx on public.enrolments (class_id, status);
create index enrolments_student_idx on public.enrolments (student_id);
create index enrolments_institution_idx on public.enrolments (institution_id);

alter table public.enrolments enable row level security;
create trigger enrolments_set_updated_at before update on public.enrolments
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Invariant triggers
-- ─────────────────────────────────────────────────────────────────────────────

create function private.require_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  wanted text := tg_argv[0];
  who uuid := (to_jsonb(new) ->> tg_argv[1])::uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = who and p.role = wanted) then
    raise exception 'user is not a %', wanted using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger class_teachers_require_teacher
  before insert on public.class_teachers
  for each row execute function private.require_profile_role('teacher', 'teacher_id');

create trigger enrolments_require_student
  before insert on public.enrolments
  for each row execute function private.require_profile_role('student', 'student_id');

-- Capacity and archive guard. Locking the class row serialises concurrent enrolments, so two
-- admins adding the last seat at the same time cannot both succeed.
create function private.guard_enrolment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c record;
begin
  select capacity, deleted_at into c from public.classes where id = new.class_id for update;
  -- BEFORE triggers run ahead of the RLS check: a class the caller cannot see is a permission
  -- problem, not an "archived" one, so keep the error codes honest.
  if not found then
    raise exception 'not allowed to enrol into this class' using errcode = '42501';
  end if;
  if c.deleted_at is not null then
    raise exception 'class_archived' using errcode = 'P0001';
  end if;
  if new.status = 'active' and c.capacity is not null and
     (select count(*) from public.enrolments e where e.class_id = new.class_id and e.status = 'active') >= c.capacity then
    raise exception 'class_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enrolments_guard
  before insert on public.enrolments
  for each row execute function private.guard_enrolment();

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.classes, public.class_teachers, public.enrolments from anon, authenticated;
grant select on public.classes, public.class_teachers, public.enrolments to authenticated;
grant insert (institution_id, name, level, school_year, capacity) on public.classes to authenticated;
-- `school_year` is immutable: enrolments reference it.
grant update (name, level, capacity, deleted_at) on public.classes to authenticated;
grant insert (class_id, teacher_id, institution_id), delete on public.class_teachers to authenticated;
grant insert (institution_id, class_id, school_year, student_id) on public.enrolments to authenticated;
grant update (status, withdrawn_on) on public.enrolments to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: classes
-- ─────────────────────────────────────────────────────────────────────────────

create policy classes_tenant on public.classes
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy classes_not_deleted on public.classes
  as restrictive for select to authenticated
  using (deleted_at is null or (select private.user_role()) in ('institution_admin', 'super_admin'));

create policy classes_select_admin on public.classes
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy classes_select_teacher on public.classes
  for select to authenticated
  using (exists (select 1 from public.class_teachers ct
                  where ct.class_id = classes.id and ct.teacher_id = (select auth.uid())));

create policy classes_select_student on public.classes
  for select to authenticated
  using (exists (select 1 from public.enrolments e
                  where e.class_id = classes.id and e.student_id = (select auth.uid()) and e.status = 'active'));

create policy classes_admin_insert on public.classes
  for insert to authenticated
  with check ((select private.user_role()) = 'institution_admin');

create policy classes_admin_update on public.classes
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: class_teachers
-- ─────────────────────────────────────────────────────────────────────────────

create policy class_teachers_tenant on public.class_teachers
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy class_teachers_select on public.class_teachers
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin')
         or teacher_id = (select auth.uid()));

create policy class_teachers_admin_insert on public.class_teachers
  for insert to authenticated
  with check ((select private.user_role()) = 'institution_admin');

create policy class_teachers_admin_delete on public.class_teachers
  for delete to authenticated
  using ((select private.user_role()) = 'institution_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: enrolments
-- ─────────────────────────────────────────────────────────────────────────────

create policy enrolments_tenant on public.enrolments
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy enrolments_select_admin on public.enrolments
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy enrolments_select_student on public.enrolments
  for select to authenticated
  using (student_id = (select auth.uid()));

create policy enrolments_select_teacher on public.enrolments
  for select to authenticated
  using (exists (select 1 from public.class_teachers ct
                  where ct.class_id = enrolments.class_id and ct.teacher_id = (select auth.uid())));

create policy enrolments_admin_insert on public.enrolments
  for insert to authenticated
  with check ((select private.user_role()) = 'institution_admin');

create policy enrolments_admin_update on public.enrolments
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

-- Teachers can read the students enrolled in the classes they teach (and only those).
create policy profiles_select_teacher_students on public.profiles
  for select to authenticated
  using (
    role = 'student'
    and (select private.user_role()) = 'teacher'
    and exists (select 1
                  from public.enrolments e
                  join public.class_teachers ct on ct.class_id = e.class_id
                 where e.student_id = profiles.id
                   and e.status = 'active'
                   and ct.teacher_id = (select auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs (SECURITY INVOKER: one transaction, RLS applies as the caller; rule 5)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enrols many students at once. Returns how many were enrolled; students who already have an
-- active enrolment this school year are skipped. Fails as a whole when the class is full.
create function public.enrol_students(p_class_id uuid, p_student_ids uuid[])
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c record;
  n int;
begin
  select institution_id, school_year into c
    from public.classes where id = p_class_id and deleted_at is null;
  if not found then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;

  insert into public.enrolments (institution_id, class_id, school_year, student_id)
  select c.institution_id, p_class_id, c.school_year, s
    from unnest(p_student_ids) as s
   -- Filter here rather than rely on ON CONFLICT: the capacity trigger runs before conflict
   -- detection, so re-adding a current student to a full class must not trip it.
   where not exists (select 1 from public.enrolments e
                      where e.student_id = s and e.school_year = c.school_year and e.status = 'active')
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Replaces the set of teachers of a class atomically.
create function public.set_class_teachers(p_class_id uuid, p_teacher_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inst uuid;
begin
  select institution_id into inst from public.classes where id = p_class_id and deleted_at is null;
  if not found then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;

  delete from public.class_teachers
   where class_id = p_class_id and teacher_id <> all (p_teacher_ids);

  insert into public.class_teachers (class_id, teacher_id, institution_id)
  select p_class_id, t, inst from unnest(p_teacher_ids) as t
  on conflict do nothing;
end;
$$;

-- Active students with no active enrolment in `p_school_year`, optionally filtered by name/email.
-- An RPC rather than a client filter: "not in (thousands of ids)" does not survive a URL.
create function public.enrolable_students(p_school_year text, p_query text default null, p_limit int default 50)
returns table (id uuid, first_name text, last_name text, email text)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.first_name, p.last_name, p.email
    from public.profiles p
   where p.role = 'student' and p.is_active and p.deleted_at is null
     and not exists (select 1 from public.enrolments e
                      where e.student_id = p.id and e.school_year = p_school_year and e.status = 'active')
     and (coalesce(btrim(p_query), '') = ''
          or p.first_name || ' ' || p.last_name ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
          or p.email ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%')
   order by p.last_name, p.first_name, p.id
   limit least(greatest(p_limit, 1), 100)
$$;

-- PUBLIC holds EXECUTE on new functions by default (a schema-level default privilege cannot undo
-- that), so revoke it explicitly: anon must never reach an RPC.
revoke execute on function public.enrol_students(uuid, uuid[]) from public, anon;
revoke execute on function public.set_class_teachers(uuid, uuid[]) from public, anon;
revoke execute on function public.enrolable_students(text, text, int) from public, anon;
grant execute on function public.enrolable_students(text, text, int) to authenticated;
grant execute on function public.enrol_students(uuid, uuid[]) to authenticated;
grant execute on function public.set_class_teachers(uuid, uuid[]) to authenticated;
