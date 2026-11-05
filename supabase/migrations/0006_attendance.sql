-- 0006_attendance: roll call per lesson and date. Forward-only.
--
-- A session is one lesson on one date; a record is one student's status in it. The write path is
-- the submit_attendance RPC (rule 5): the session and every record land in one transaction, as the
-- caller, so RLS still applies. Rows are corrected by updating them; nothing is ever deleted.

-- ─────────────────────────────────────────────────────────────────────────────
-- attendance_sessions
-- ─────────────────────────────────────────────────────────────────────────────

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  class_id uuid not null,
  -- Survives the lesson being deleted from the timetable (history stays).
  slot_id uuid,
  subject_id uuid not null,
  teacher_id uuid not null,
  session_date date not null,
  -- Copied from the lesson at the time, so later timetable edits do not rewrite history.
  starts_min smallint not null check (starts_min between 0 and 1440),
  ends_min smallint not null check (ends_min between 0 and 1440),
  taken_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (class_id, institution_id) references public.classes (id, institution_id) on delete restrict,
  foreign key (subject_id, institution_id) references public.subjects (id, institution_id) on delete restrict,
  foreign key (institution_id, teacher_id) references public.profiles (institution_id, id) on delete restrict,
  foreign key (slot_id, institution_id) references public.timetable_slots (id, institution_id)
    on delete set null (slot_id),
  constraint attendance_sessions_id_institution_key unique (id, institution_id)
);

-- One roll call per lesson per date.
create unique index attendance_sessions_slot_date_key
  on public.attendance_sessions (slot_id, session_date) where slot_id is not null;
create index attendance_sessions_class_date_idx on public.attendance_sessions (class_id, session_date);
create index attendance_sessions_teacher_idx on public.attendance_sessions (teacher_id, session_date);
create index attendance_sessions_institution_date_idx on public.attendance_sessions (institution_id, session_date);

alter table public.attendance_sessions enable row level security;
create trigger attendance_sessions_set_updated_at before update on public.attendance_sessions
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- attendance_records
-- ─────────────────────────────────────────────────────────────────────────────

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  session_id uuid not null,
  student_id uuid not null,
  status text not null check (status in ('present', 'late', 'absent', 'excused')),
  note text check (note is null or char_length(btrim(note)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, institution_id) references public.attendance_sessions (id, institution_id) on delete cascade,
  foreign key (institution_id, student_id) references public.profiles (institution_id, id) on delete restrict,
  constraint attendance_records_session_student_key unique (session_id, student_id)
);
create index attendance_records_student_idx on public.attendance_records (student_id);
create index attendance_records_institution_idx on public.attendance_records (institution_id);

alter table public.attendance_records enable row level security;
create trigger attendance_records_set_updated_at before update on public.attendance_records
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.attendance_sessions, public.attendance_records from anon, authenticated;
grant select on public.attendance_sessions, public.attendance_records to authenticated;
grant insert (institution_id, class_id, slot_id, subject_id, teacher_id, session_date, starts_min, ends_min, taken_by)
  on public.attendance_sessions to authenticated;
grant update (taken_by) on public.attendance_sessions to authenticated;
grant insert (institution_id, session_id, student_id, status, note) on public.attendance_records to authenticated;
grant update (status, note) on public.attendance_records to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: sessions
-- ─────────────────────────────────────────────────────────────────────────────

create policy attendance_sessions_tenant on public.attendance_sessions
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy attendance_sessions_select_admin on public.attendance_sessions
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

-- Teachers and students see the sessions of the classes they belong to (metadata only: who was
-- present is in the records, which have stricter policies).
create policy attendance_sessions_select_member on public.attendance_sessions
  for select to authenticated
  using (class_id in (select private.my_class_ids()));

create policy attendance_sessions_insert on public.attendance_sessions
  for insert to authenticated
  with check (
    (select private.user_role()) = 'institution_admin'
    or ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()))
  );

create policy attendance_sessions_update on public.attendance_sessions
  for update to authenticated
  using (
    (select private.user_role()) = 'institution_admin'
    or ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()))
  )
  with check (
    (select private.user_role()) = 'institution_admin'
    or ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: records
-- ─────────────────────────────────────────────────────────────────────────────

create policy attendance_records_tenant on public.attendance_records
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy attendance_records_select_admin on public.attendance_records
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy attendance_records_select_student on public.attendance_records
  for select to authenticated
  using (student_id = (select auth.uid()));

-- A teacher reads the records of sessions in the classes they teach.
create policy attendance_records_select_teacher on public.attendance_records
  for select to authenticated
  using (
    (select private.user_role()) = 'teacher'
    and exists (select 1 from public.attendance_sessions s
                 where s.id = attendance_records.session_id
                   and s.class_id in (select private.my_class_ids()))
  );

-- Writing a record requires being allowed to write its session (admin, or the lesson's teacher).
create policy attendance_records_insert on public.attendance_records
  for insert to authenticated
  with check (
    (select private.user_role()) = 'institution_admin'
    or ((select private.user_role()) = 'teacher'
        and exists (select 1 from public.attendance_sessions s
                     where s.id = session_id and s.teacher_id = (select auth.uid())))
  );

create policy attendance_records_update on public.attendance_records
  for update to authenticated
  using (
    (select private.user_role()) = 'institution_admin'
    or ((select private.user_role()) = 'teacher'
        and exists (select 1 from public.attendance_sessions s
                     where s.id = attendance_records.session_id and s.teacher_id = (select auth.uid())))
  )
  with check (
    (select private.user_role()) = 'institution_admin'
    or ((select private.user_role()) = 'teacher'
        and exists (select 1 from public.attendance_sessions s
                     where s.id = attendance_records.session_id and s.teacher_id = (select auth.uid())))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs (SECURITY INVOKER)
-- ─────────────────────────────────────────────────────────────────────────────

-- Records a lesson's roll call. `p_records` is `[{ "student_id": uuid, "status": text, "note": text? }]`.
-- Idempotent per (lesson, date): calling it again corrects the earlier roll call.
create function public.submit_attendance(p_slot_id uuid, p_date date, p_records jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s record;
  today date;
  sid uuid;
  stray int;
begin
  select ts.institution_id, ts.class_id, ts.subject_id, ts.teacher_id, ts.weekday,
         ts.starts_min, ts.ends_min, i.timezone
    into s
    from public.timetable_slots ts
    join public.institutions i on i.id = ts.institution_id
   where ts.id = p_slot_id;
  if not found then
    raise exception 'lesson_not_found' using errcode = 'P0002';
  end if;

  if (select private.user_role()) = 'teacher' and s.teacher_id <> (select auth.uid()) then
    raise exception 'not_your_lesson' using errcode = 'P0001';
  end if;

  -- "Today" is the school's calendar day, not the database server's (they differ around midnight).
  today := (now() at time zone s.timezone)::date;
  if p_date > today then
    raise exception 'future_date' using errcode = 'P0001';
  end if;
  if (select private.user_role()) = 'teacher' and p_date < today - 14 then
    raise exception 'too_old' using errcode = 'P0001';
  end if;
  if extract(isodow from p_date) <> s.weekday then
    raise exception 'wrong_weekday' using errcode = '22023';
  end if;

  select count(*) into stray
    from jsonb_to_recordset(p_records) as r(student_id uuid, status text, note text)
   where not exists (select 1 from public.enrolments e
                      where e.class_id = s.class_id and e.student_id = r.student_id and e.status = 'active');
  if stray > 0 then
    raise exception 'student_not_in_class' using errcode = 'P0001';
  end if;

  insert into public.attendance_sessions
    (institution_id, class_id, slot_id, subject_id, teacher_id, session_date, starts_min, ends_min)
  values (s.institution_id, s.class_id, p_slot_id, s.subject_id, s.teacher_id, p_date, s.starts_min, s.ends_min)
  on conflict (slot_id, session_date) where slot_id is not null
    do update set taken_by = (select auth.uid())
  returning id into sid;

  insert into public.attendance_records (institution_id, session_id, student_id, status, note)
  select s.institution_id, sid, r.student_id, r.status, nullif(btrim(r.note), '')
    from jsonb_to_recordset(p_records) as r(student_id uuid, status text, note text)
  on conflict (session_id, student_id)
    do update set status = excluded.status, note = excluded.note;

  return sid;
end;
$$;

-- Sessions held on a date, with their status counts. RLS decides which sessions the caller sees.
create function public.attendance_day(p_date date)
returns table (
  session_id uuid, slot_id uuid, class_id uuid, subject_id uuid, teacher_id uuid,
  starts_min smallint, ends_min smallint,
  present bigint, late bigint, absent bigint, excused bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, s.slot_id, s.class_id, s.subject_id, s.teacher_id, s.starts_min, s.ends_min,
         count(*) filter (where r.status = 'present'),
         count(*) filter (where r.status = 'late'),
         count(*) filter (where r.status = 'absent'),
         count(*) filter (where r.status = 'excused')
    from public.attendance_sessions s
    left join public.attendance_records r on r.session_id = s.id
   where s.session_date = p_date
   group by s.id
   order by s.starts_min, s.id
$$;

-- Totals per class over a date range (inclusive).
create function public.attendance_class_summary(p_from date, p_to date)
returns table (class_id uuid, present bigint, late bigint, absent bigint, excused bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.class_id,
         count(*) filter (where r.status = 'present'),
         count(*) filter (where r.status = 'late'),
         count(*) filter (where r.status = 'absent'),
         count(*) filter (where r.status = 'excused')
    from public.attendance_sessions s
    join public.attendance_records r on r.session_id = s.id
   where s.session_date between p_from and p_to
   group by s.class_id
$$;

revoke execute on function public.submit_attendance(uuid, date, jsonb) from public, anon;
revoke execute on function public.attendance_day(date) from public, anon;
revoke execute on function public.attendance_class_summary(date, date) from public, anon;
grant execute on function public.submit_attendance(uuid, date, jsonb) to authenticated;
grant execute on function public.attendance_day(date) to authenticated;
grant execute on function public.attendance_class_summary(date, date) to authenticated;
