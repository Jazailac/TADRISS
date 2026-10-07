-- 0008_grades: exams and the marks students get. Forward-only.
--
--  * A teacher sets an exam for a class they teach (composite FK to class_teachers) and enters marks
--    as a DRAFT. Students see an exam and their own mark only once the teacher publishes it.
--  * A mark is within [0, exam.max_score] (trigger), or the student is absent (no score).
--  * Marks are written through save_grades (rule 5): the whole sheet lands in one transaction.
--  * Averages are never stored: they are computed from normalised scores, so changing a
--    coefficient can never leave a stale number behind.

-- ─────────────────────────────────────────────────────────────────────────────
-- exams
-- ─────────────────────────────────────────────────────────────────────────────

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  class_id uuid not null,
  subject_id uuid not null,
  teacher_id uuid not null default auth.uid(),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  exam_date date not null,
  -- Moroccan marks are out of 20, but quizzes are often out of 10 or 5.
  max_score numeric(5, 2) not null default 20 check (max_score > 0 and max_score <= 100),
  coefficient numeric(3, 1) not null default 1 check (coefficient >= 0.5 and coefficient <= 10),
  -- Semester 1 or 2.
  term smallint not null default 1 check (term in (1, 2)),
  -- Null = draft: students cannot see the exam or its marks.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (class_id, institution_id) references public.classes (id, institution_id) on delete restrict,
  foreign key (subject_id, institution_id) references public.subjects (id, institution_id) on delete restrict,
  foreign key (class_id, teacher_id) references public.class_teachers (class_id, teacher_id) on delete restrict,
  constraint exams_id_institution_key unique (id, institution_id)
);
create index exams_class_date_idx on public.exams (class_id, exam_date) where deleted_at is null;
create index exams_teacher_idx on public.exams (teacher_id, exam_date);
create index exams_institution_idx on public.exams (institution_id);
create index exams_subject_idx on public.exams (subject_id);

alter table public.exams enable row level security;
create trigger exams_set_updated_at before update on public.exams
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- grades
-- ─────────────────────────────────────────────────────────────────────────────

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  exam_id uuid not null,
  student_id uuid not null,
  score numeric(5, 2) check (score is null or score >= 0),
  absent boolean not null default false,
  remark text check (remark is null or char_length(btrim(remark)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (exam_id, institution_id) references public.exams (id, institution_id) on delete cascade,
  foreign key (institution_id, student_id) references public.profiles (institution_id, id) on delete restrict,
  constraint grades_exam_student_key unique (exam_id, student_id),
  -- Either a score, or absent: never both, never neither (a blank cell has no row at all).
  constraint grades_score_or_absent check ((absent and score is null) or (not absent and score is not null))
);
create index grades_student_idx on public.grades (student_id);
create index grades_institution_idx on public.grades (institution_id);

alter table public.grades enable row level security;
create trigger grades_set_updated_at before update on public.grades
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Invariant triggers
-- ─────────────────────────────────────────────────────────────────────────────

-- A mark cannot exceed its exam's maximum.
create function private.check_grade_range()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  top numeric;
begin
  if new.score is null then
    return new;
  end if;
  select max_score into top from public.exams where id = new.exam_id;
  if top is null or new.score > top then
    raise exception 'score_out_of_range' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger grades_check_range before insert or update of score on public.grades
  for each row execute function private.check_grade_range();

-- Lowering an exam's maximum below a mark that already exists would silently corrupt it.
create function private.check_exam_max_score()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.max_score < old.max_score
     and exists (select 1 from public.grades g where g.exam_id = new.id and g.score > new.max_score) then
    raise exception 'score_out_of_range' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger exams_check_max_score before update of max_score on public.exams
  for each row execute function private.check_exam_max_score();

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.exams, public.grades from anon, authenticated;
grant select on public.exams, public.grades to authenticated;
grant insert (institution_id, class_id, subject_id, teacher_id, title, exam_date, max_score, coefficient, term)
  on public.exams to authenticated;
-- The class never changes after creation (marks and the teacher's right to set it depend on it).
grant update (subject_id, title, exam_date, max_score, coefficient, term, published_at, deleted_at)
  on public.exams to authenticated;
grant insert (institution_id, exam_id, student_id, score, absent, remark) on public.grades to authenticated;
grant update (score, absent, remark), delete on public.grades to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: exams
-- ─────────────────────────────────────────────────────────────────────────────

create policy exams_tenant on public.exams
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

-- Soft delete: hidden from students and other teachers; the author and the administration still
-- see it (the new row of the author's own soft delete must stay visible; see 0007).
create policy exams_not_deleted on public.exams
  as restrictive for select to authenticated
  using (
    deleted_at is null
    or (select private.user_role()) in ('institution_admin', 'super_admin')
    or ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()))
  );

create policy exams_select_admin on public.exams
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy exams_select_teacher on public.exams
  for select to authenticated
  using ((select private.user_role()) = 'teacher' and class_id in (select private.my_class_ids()));

-- Students see only PUBLISHED exams of their class.
create policy exams_select_student on public.exams
  for select to authenticated
  using ((select private.user_role()) = 'student'
         and published_at is not null
         and class_id in (select private.my_class_ids()));

create policy exams_teacher_insert on public.exams
  for insert to authenticated
  with check ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()));

create policy exams_teacher_update on public.exams
  for update to authenticated
  using ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()))
  with check ((select private.user_role()) = 'teacher' and teacher_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: grades
-- ─────────────────────────────────────────────────────────────────────────────

create policy grades_tenant on public.grades
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy grades_select_admin on public.grades
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

-- A teacher reads and writes the marks of the exams they set.
create policy grades_select_teacher on public.grades
  for select to authenticated
  using ((select private.user_role()) = 'teacher'
         and exists (select 1 from public.exams e
                      where e.id = grades.exam_id and e.teacher_id = (select auth.uid())));

-- A student reads their own marks, and only when the exam is visible to them (i.e. published).
create policy grades_select_student on public.grades
  for select to authenticated
  using ((select private.user_role()) = 'student'
         and student_id = (select auth.uid())
         and exists (select 1 from public.exams e where e.id = grades.exam_id));

create policy grades_teacher_insert on public.grades
  for insert to authenticated
  with check ((select private.user_role()) = 'teacher'
              and exists (select 1 from public.exams e
                           where e.id = exam_id and e.teacher_id = (select auth.uid())));

create policy grades_teacher_update on public.grades
  for update to authenticated
  using ((select private.user_role()) = 'teacher'
         and exists (select 1 from public.exams e
                      where e.id = grades.exam_id and e.teacher_id = (select auth.uid())))
  with check ((select private.user_role()) = 'teacher'
              and exists (select 1 from public.exams e
                           where e.id = grades.exam_id and e.teacher_id = (select auth.uid())));

create policy grades_teacher_delete on public.grades
  for delete to authenticated
  using ((select private.user_role()) = 'teacher'
         and exists (select 1 from public.exams e
                      where e.id = grades.exam_id and e.teacher_id = (select auth.uid())));

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs (SECURITY INVOKER)
-- ─────────────────────────────────────────────────────────────────────────────

-- Saves a whole mark sheet. `p_grades` is `[{ "student_id": uuid, "score": number?, "absent": bool?, "remark": text? }]`.
-- A row with neither a score nor `absent` CLEARS that student's mark. Returns how many marks were
-- written (cleared ones are not counted).
create function public.save_grades(p_exam_id uuid, p_grades jsonb)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  e record;
  stray int;
  n int;
begin
  select institution_id, class_id, teacher_id into e
    from public.exams where id = p_exam_id and deleted_at is null;
  if not found then
    raise exception 'exam_not_found' using errcode = 'P0002';
  end if;
  if e.teacher_id <> (select auth.uid()) then
    raise exception 'not_your_exam' using errcode = 'P0001';
  end if;

  select count(*) into stray
    from jsonb_to_recordset(p_grades) as r(student_id uuid, score numeric, absent boolean, remark text)
   where not exists (select 1 from public.enrolments en
                      where en.class_id = e.class_id and en.student_id = r.student_id and en.status = 'active');
  if stray > 0 then
    raise exception 'student_not_in_class' using errcode = 'P0001';
  end if;

  -- Blank cells clear an earlier mark.
  delete from public.grades g
   using jsonb_to_recordset(p_grades) as r(student_id uuid, score numeric, absent boolean, remark text)
   where g.exam_id = p_exam_id and g.student_id = r.student_id
     and r.score is null and not coalesce(r.absent, false);

  insert into public.grades (institution_id, exam_id, student_id, score, absent, remark)
  select e.institution_id, p_exam_id, r.student_id,
         case when coalesce(r.absent, false) then null else r.score end,
         coalesce(r.absent, false),
         nullif(btrim(r.remark), '')
    from jsonb_to_recordset(p_grades) as r(student_id uuid, score numeric, absent boolean, remark text)
   where r.score is not null or coalesce(r.absent, false)
  on conflict (exam_id, student_id)
    do update set score = excluded.score, absent = excluded.absent, remark = excluded.remark;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Per-exam statistics on the 0-20 scale. RLS decides which exams and marks the caller sees.
create function public.exam_summary(p_class_id uuid default null)
returns table (exam_id uuid, graded bigint, absent bigint, avg20 numeric, min20 numeric, max20 numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.id,
         count(g.id) filter (where not g.absent),
         count(g.id) filter (where g.absent),
         round(avg(g.score / e.max_score * 20) filter (where not g.absent), 2),
         round(min(g.score / e.max_score * 20) filter (where not g.absent), 2),
         round(max(g.score / e.max_score * 20) filter (where not g.absent), 2)
    from public.exams e
    left join public.grades g on g.exam_id = e.id
   where e.deleted_at is null and (p_class_id is null or e.class_id = p_class_id)
   group by e.id
$$;

revoke execute on function public.save_grades(uuid, jsonb) from public, anon;
revoke execute on function public.exam_summary(uuid) from public, anon;
grant execute on function public.save_grades(uuid, jsonb) to authenticated;
grant execute on function public.exam_summary(uuid) to authenticated;
