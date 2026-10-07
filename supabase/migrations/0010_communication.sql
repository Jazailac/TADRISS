-- 0010_communication: announcements (with read tracking) and direct messages. Forward-only.
--
-- Announcements are addressed to an audience: the whole school, all teachers, all students, or one
-- class. The administration may address any audience; a teacher only the classes they teach. Each
-- reader's "seen" is a row in announcement_reads (their own, nobody else's), so authors can see how
-- far a notice has reached. Soft-deleted announcements stay visible to their author and the
-- administration (same rule as homework: Postgres checks SELECT policies against the NEW row).
--
-- Messages are one-to-one and private: only the sender and the recipient can read them, the
-- administration included. Who may write to whom is enforced by a trigger that relies on what RLS
-- already lets the sender see (a teacher sees their students, a student their teachers, everyone the
-- administration), so the rule has no second copy of the membership logic.

-- ─────────────────────────────────────────────────────────────────────────────
-- The administration is visible to every member of its school (it is who you write to).
-- ─────────────────────────────────────────────────────────────────────────────

create policy profiles_select_school_admins on public.profiles
  for select to authenticated
  using (role = 'institution_admin' and is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- announcements
-- ─────────────────────────────────────────────────────────────────────────────

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  author_id uuid not null default auth.uid(),
  audience text not null check (audience in ('all', 'teachers', 'students', 'class')),
  class_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 150),
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (institution_id, author_id) references public.profiles (institution_id, id) on delete restrict,
  foreign key (class_id, institution_id) references public.classes (id, institution_id) on delete restrict,
  -- A class announcement names its class; every other audience must not.
  constraint announcements_class_matches_audience check ((audience = 'class') = (class_id is not null)),
  constraint announcements_id_institution_key unique (id, institution_id)
);
create index announcements_feed_idx on public.announcements (institution_id, pinned desc, created_at desc)
  where deleted_at is null;
create index announcements_author_idx on public.announcements (author_id, created_at desc);
create index announcements_class_idx on public.announcements (class_id) where class_id is not null;

alter table public.announcements enable row level security;
create trigger announcements_set_updated_at before update on public.announcements
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- announcement_reads
-- ─────────────────────────────────────────────────────────────────────────────

create table public.announcement_reads (
  announcement_id uuid not null,
  user_id uuid not null default auth.uid(),
  institution_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id),
  foreign key (announcement_id, institution_id) references public.announcements (id, institution_id) on delete cascade,
  foreign key (institution_id, user_id) references public.profiles (institution_id, id) on delete cascade
);
create index announcement_reads_user_idx on public.announcement_reads (user_id);
create index announcement_reads_institution_idx on public.announcement_reads (institution_id);

alter table public.announcement_reads enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- messages
-- ─────────────────────────────────────────────────────────────────────────────

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  sender_id uuid not null default auth.uid(),
  recipient_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  foreign key (institution_id, sender_id) references public.profiles (institution_id, id) on delete restrict,
  foreign key (institution_id, recipient_id) references public.profiles (institution_id, id) on delete restrict,
  constraint messages_not_to_self check (sender_id <> recipient_id)
);
create index messages_thread_idx on public.messages (sender_id, recipient_id, created_at desc);
create index messages_inbox_idx on public.messages (recipient_id, created_at desc);
create index messages_unread_idx on public.messages (recipient_id, sender_id) where read_at is null;
create index messages_institution_idx on public.messages (institution_id);

alter table public.messages enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────────────────────

-- Who may write to whom. SECURITY INVOKER on purpose: the recipient must be a profile the SENDER can
-- already see, so a teacher can only reach their own students, and 42501 comes before anything else
-- (BEFORE triggers run ahead of RLS, so it must not become an oracle for who exists).
create function private.guard_message()
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

  -- Administration <-> anyone; teacher <-> student. Never teacher<->teacher or student<->student.
  if not (
       sender_role = 'institution_admin'
    or recipient.role = 'institution_admin'
    or (sender_role = 'teacher' and recipient.role = 'student')
    or (sender_role = 'student' and recipient.role = 'teacher')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not recipient.is_active then
    raise exception 'recipient_inactive';
  end if;
  return new;
end;
$$;
create trigger messages_guard before insert on public.messages
  for each row execute function private.guard_message();

-- A message can only ever go from unread to read, once.
create function private.guard_message_read()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.read_at is not null then
    new.read_at := old.read_at;
  elsif new.read_at is not null then
    new.read_at := now();
  end if;
  return new;
end;
$$;
create trigger messages_guard_read before update on public.messages
  for each row execute function private.guard_message_read();

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.announcements, public.announcement_reads, public.messages from anon, authenticated;
grant select on public.announcements, public.announcement_reads, public.messages to authenticated;
grant insert (institution_id, author_id, audience, class_id, title, body, pinned)
  on public.announcements to authenticated;
-- The audience never changes once published (readers' "seen" marks depend on it).
grant update (title, body, pinned, deleted_at) on public.announcements to authenticated;
grant insert (institution_id, announcement_id, user_id) on public.announcement_reads to authenticated;
grant insert (institution_id, sender_id, recipient_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: announcements
-- ─────────────────────────────────────────────────────────────────────────────

create policy announcements_tenant on public.announcements
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy announcements_not_deleted on public.announcements
  as restrictive for select to authenticated
  using (
    deleted_at is null
    or (select private.user_role()) in ('institution_admin', 'super_admin')
    or author_id = (select auth.uid())
  );

create policy announcements_select_admin on public.announcements
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy announcements_select_author on public.announcements
  for select to authenticated
  using (author_id = (select auth.uid()));

create policy announcements_select_audience on public.announcements
  for select to authenticated
  using (
    audience = 'all'
    or (audience = 'teachers' and (select private.user_role()) = 'teacher')
    or (audience = 'students' and (select private.user_role()) = 'student')
    or (audience = 'class' and class_id in (select private.my_class_ids()))
  );

create policy announcements_admin_insert on public.announcements
  for insert to authenticated
  with check ((select private.user_role()) = 'institution_admin' and author_id = (select auth.uid()));

-- A teacher addresses only a class they teach, and cannot pin.
create policy announcements_teacher_insert on public.announcements
  for insert to authenticated
  with check (
    (select private.user_role()) = 'teacher'
    and author_id = (select auth.uid())
    and audience = 'class'
    and pinned = false
    and class_id in (select private.my_class_ids())
  );

create policy announcements_admin_update on public.announcements
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

create policy announcements_teacher_update on public.announcements
  for update to authenticated
  using ((select private.user_role()) = 'teacher' and author_id = (select auth.uid()))
  with check ((select private.user_role()) = 'teacher' and author_id = (select auth.uid()) and pinned = false);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: announcement_reads
-- ─────────────────────────────────────────────────────────────────────────────

create policy announcement_reads_tenant on public.announcement_reads
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy announcement_reads_select_own on public.announcement_reads
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy announcement_reads_select_admin on public.announcement_reads
  for select to authenticated
  using ((select private.user_role()) = 'institution_admin');

-- An author sees who has read what they published.
create policy announcement_reads_select_author on public.announcement_reads
  for select to authenticated
  using (
    exists (select 1 from public.announcements a
             where a.id = announcement_reads.announcement_id and a.author_id = (select auth.uid()))
  );

-- Anyone marks only their own "seen", and only for an announcement they can actually see.
create policy announcement_reads_insert_own on public.announcement_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.announcements a where a.id = announcement_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: messages (private to the two people in the conversation)
-- ─────────────────────────────────────────────────────────────────────────────

create policy messages_tenant on public.messages
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy messages_select_participant on public.messages
  for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

create policy messages_insert_sender on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()));

-- Only the recipient marks a message read.
create policy messages_update_recipient on public.messages
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs (SECURITY INVOKER: RLS applies to every row they touch)
-- ─────────────────────────────────────────────────────────────────────────────

-- How far announcements have reached: readers so far / people addressed. The author never counts
-- as a reader of their own notice.
create function public.announcement_reach(p_ids uuid[])
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
           else
             (select count(*) from public.profiles p
               where p.institution_id = a.institution_id and p.is_active and p.deleted_at is null
                 and p.id <> a.author_id
                 and case a.audience
                       when 'all' then p.role in ('teacher', 'student')
                       when 'teachers' then p.role = 'teacher'
                       else p.role = 'student'
                     end)
         end
    from public.announcements a
   where a.id = any (p_ids)
$$;
revoke execute on function public.announcement_reach(uuid[]) from public, anon;
grant execute on function public.announcement_reach(uuid[]) to authenticated;

-- Marks announcements as read for the caller. Ids they cannot see are silently ignored (RLS).
create function public.mark_announcements_read(p_ids uuid[])
returns integer
language sql
set search_path = ''
as $$
  with ins as (
    insert into public.announcement_reads (institution_id, announcement_id, user_id)
    select a.institution_id, a.id, (select auth.uid())
      from public.announcements a
     where a.id = any (p_ids) and a.deleted_at is null
    on conflict do nothing
    returning 1
  )
  select count(*)::integer from ins
$$;
revoke execute on function public.mark_announcements_read(uuid[]) from public, anon;
grant execute on function public.mark_announcements_read(uuid[]) to authenticated;

-- The caller's unread announcements (not their own) and unread messages: the nav badges.
create function public.unread_counts()
returns table (announcements bigint, messages bigint)
language sql
stable
set search_path = ''
as $$
  select
    (select count(*) from public.announcements a
      where a.deleted_at is null and a.author_id <> (select auth.uid())
        and not exists (select 1 from public.announcement_reads r
                         where r.announcement_id = a.id and r.user_id = (select auth.uid()))),
    (select count(*) from public.messages m
      where m.recipient_id = (select auth.uid()) and m.read_at is null)
$$;
revoke execute on function public.unread_counts() from public, anon;
grant execute on function public.unread_counts() to authenticated;

-- One row per person the caller has exchanged messages with: the last message and the unread count.
-- Unread conversations first, then the most recent.
create function public.conversations()
returns table (
  other_id uuid,
  first_name text,
  last_name text,
  role text,
  last_body text,
  last_at timestamptz,
  last_from_me boolean,
  unread_count bigint
)
language sql
stable
set search_path = ''
as $$
  with mine as (
    select m.*, case when m.sender_id = (select auth.uid()) then m.recipient_id else m.sender_id end as other
      from public.messages m
  ),
  latest as (
    select distinct on (other) other, body, created_at, sender_id
      from mine
     order by other, created_at desc, id desc
  ),
  unread as (
    select other, count(*) as n
      from mine
     where recipient_id = (select auth.uid()) and read_at is null
     group by other
  )
  select l.other, p.first_name, p.last_name, p.role, l.body, l.created_at,
         l.sender_id = (select auth.uid()), coalesce(u.n, 0)
    from latest l
    left join unread u on u.other = l.other
    left join public.profiles p on p.id = l.other
   order by (coalesce(u.n, 0) > 0) desc, l.created_at desc
$$;
revoke execute on function public.conversations() from public, anon;
grant execute on function public.conversations() to authenticated;
