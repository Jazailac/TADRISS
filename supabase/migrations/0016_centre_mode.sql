-- 0016_centre_mode: a soutien centre sells monthly subject groups, so one student belongs to several
-- classes at once. Schools keep their rule of one class per student per year. Forward-only. ADR 0015.

-- ── institutions.kind ───────────────────────────────────────────────────────
-- Not granted to any API role: only the platform operator's own tooling sets it (console in a later slice).
alter table public.institutions
  add column kind text not null default 'school' check (kind in ('school', 'centre'));

-- ── enrolments.exclusive ────────────────────────────────────────────────────
-- A partial unique index cannot read another table, so each enrolment records its school's rule when it
-- is created. Existing rows all belong to schools. No API role can write this column.
alter table public.enrolments add column exclusive boolean not null default true;

create function private.set_enrolment_exclusive()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- A school the caller cannot see stays exclusive: RLS then refuses the row itself.
  new.exclusive := coalesce(
    (select i.kind = 'school' from public.institutions i where i.id = new.institution_id),
    true
  );
  return new;
end;
$$;

create trigger enrolments_set_exclusive
  before insert on public.enrolments
  for each row execute function private.set_enrolment_exclusive();

drop index public.enrolments_one_active_per_year;
create unique index enrolments_one_active_per_year_exclusive
  on public.enrolments (student_id, school_year) where status = 'active' and exclusive;
create unique index enrolments_one_active_per_class
  on public.enrolments (student_id, class_id) where status = 'active';

-- ── enrol_students ──────────────────────────────────────────────────────────
create or replace function public.enrol_students(p_class_id uuid, p_student_ids uuid[])
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c record;
  n int;
begin
  select cl.institution_id, cl.school_year, i.kind = 'school' as exclusive into c
    from public.classes cl
    join public.institutions i on i.id = cl.institution_id
   where cl.id = p_class_id and cl.deleted_at is null;
  if not found then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;

  insert into public.enrolments (institution_id, class_id, school_year, student_id)
  select c.institution_id, p_class_id, c.school_year, s
    from unnest(p_student_ids) as s
   -- Filter here rather than rely on ON CONFLICT: the capacity trigger runs before conflict
   -- detection, so re-adding a current student to a full class must not trip it.
   where not exists (select 1 from public.enrolments e
                      where e.student_id = s and e.status = 'active'
                        and (e.class_id = p_class_id
                             or (c.exclusive and e.school_year = c.school_year)))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── enrolable_students_for_class ────────────────────────────────────────────
-- Who can join this class, and the first of their other classes that overlaps it on the timetable. A
-- clash is a warning, not a rule: a centre may knowingly accept one. enrolable_students stays until the
-- web that calls this one is deployed (deploy order is database first).
create function public.enrolable_students_for_class(
  p_class_id uuid, p_query text default null, p_limit int default 50
)
returns table (id uuid, first_name text, last_name text, email text, clash_class text)
language sql
stable
security invoker
set search_path = ''
as $$
  with target as (
    select cl.id, cl.institution_id, cl.school_year, i.kind = 'school' as exclusive
      from public.classes cl
      join public.institutions i on i.id = cl.institution_id
     where cl.id = p_class_id and cl.deleted_at is null
  )
  select p.id, p.first_name, p.last_name, p.email,
         (select other.name
            from public.enrolments oe
            join public.classes other on other.id = oe.class_id and other.deleted_at is null
            join public.timetable_slots theirs on theirs.class_id = oe.class_id
            join public.timetable_slots mine on mine.class_id = t.id
                 and mine.weekday = theirs.weekday
                 and int4range(mine.starts_min, mine.ends_min) && int4range(theirs.starts_min, theirs.ends_min)
           where oe.student_id = p.id and oe.status = 'active'
             and oe.class_id <> t.id and oe.school_year = t.school_year
           order by other.name
           limit 1)
    from target t
    join public.profiles p on p.institution_id = t.institution_id
         and p.role = 'student' and p.is_active and p.deleted_at is null
   where not exists (select 1 from public.enrolments e
                      where e.student_id = p.id and e.status = 'active'
                        and (e.class_id = t.id or (t.exclusive and e.school_year = t.school_year)))
     and (coalesce(btrim(p_query), '') = ''
          or p.first_name || ' ' || p.last_name ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
          or p.email ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%')
   order by p.last_name, p.first_name, p.id
   limit least(greatest(p_limit, 1), 100)
$$;
revoke execute on function public.enrolable_students_for_class(uuid, text, int) from public, anon;
grant execute on function public.enrolable_students_for_class(uuid, text, int) to authenticated;
