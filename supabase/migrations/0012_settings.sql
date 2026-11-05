-- 0012_settings: school profile, per-role module access and plan limits. Forward-only.
--
-- * The school profile gains contact fields the administration can edit.
-- * `plan` selects the plan; only the platform operator changes it (Phase 12), never the school.
--   Limits per plan live in `private.plan_limit` and are enforced where people are added: sending an
--   invitation and reactivating an account. Pending invitations count, so a school cannot invite its
--   way past its limit.
-- * `module_access` lets the administration switch a module off for teachers or students. A missing
--   row means "on". This is a visibility control (navigation and pages); the data rules (RLS) are
--   unchanged by it.

alter table public.institutions
  add column plan text not null default 'standard' check (plan in ('essential', 'standard', 'premium')),
  add column phone text check (phone is null or char_length(phone) between 3 and 30),
  add column address text check (address is null or char_length(address) <= 200),
  add column city text check (city is null or char_length(city) <= 100);

grant update (phone, address, city) on public.institutions to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Plan limits
-- ─────────────────────────────────────────────────────────────────────────────

-- Seats per plan and role; null = unlimited.
create function private.plan_limit(p_plan text, p_role text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_plan = 'essential' and p_role = 'student' then 50
    when p_plan = 'essential' and p_role = 'teacher' then 5
    when p_plan = 'standard' and p_role = 'student' then 300
    when p_plan = 'standard' and p_role = 'teacher' then 30
    else null
  end
$$;
revoke execute on function private.plan_limit(text, text) from public, anon;
grant execute on function private.plan_limit(text, text) to authenticated;

-- Seats in use by a role: active members plus invitations still open.
create function private.seats_used(p_institution uuid, p_role text)
returns integer
language sql
stable
set search_path = ''
as $$
  select (
    (select count(*) from public.profiles p
      where p.institution_id = p_institution and p.role = p_role
        and p.is_active and p.deleted_at is null)
    + (select count(*) from public.invitations i
        where i.institution_id = p_institution and i.role = p_role
          and i.status = 'pending' and i.expires_at > now())
  )::integer
$$;
revoke execute on function private.seats_used(uuid, text) from public, anon;
grant execute on function private.seats_used(uuid, text) to authenticated;

-- Refuse the seat that would exceed the plan. SECURITY INVOKER: only the school's administrator can
-- reach these triggers (invitations and activation are admin-only), and an administrator sees every
-- profile and invitation of their own school, so the count is complete without a definer helper.
create function private.guard_plan_limit_invitation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plan text;
  v_limit integer;
begin
  select i.plan into v_plan from public.institutions i where i.id = new.institution_id;
  v_limit := private.plan_limit(v_plan, new.role);
  if v_limit is not null and private.seats_used(new.institution_id, new.role) >= v_limit then
    raise exception 'plan_limit_reached';
  end if;
  return new;
end;
$$;
create trigger invitations_plan_limit before insert on public.invitations
  for each row execute function private.guard_plan_limit_invitation();

create function private.guard_plan_limit_reactivation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plan text;
  v_limit integer;
begin
  if new.is_active and not old.is_active and new.role in ('teacher', 'student') then
    select i.plan into v_plan from public.institutions i where i.id = new.institution_id;
    v_limit := private.plan_limit(v_plan, new.role);
    if v_limit is not null and private.seats_used(new.institution_id, new.role) >= v_limit then
      raise exception 'plan_limit_reached';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_plan_limit before update of is_active on public.profiles
  for each row execute function private.guard_plan_limit_reactivation();

-- Plan, limits and usage for the caller's school (administrators only).
create function public.plan_usage()
returns table (
  plan text,
  students_used integer,
  students_limit integer,
  teachers_used integer,
  teachers_limit integer
)
language sql
stable
set search_path = ''
as $$
  select i.plan,
         private.seats_used(i.id, 'student'), private.plan_limit(i.plan, 'student'),
         private.seats_used(i.id, 'teacher'), private.plan_limit(i.plan, 'teacher')
    from public.institutions i
   where i.id = (select private.institution_id())
     and (select private.user_role()) = 'institution_admin'
$$;
revoke execute on function public.plan_usage() from public, anon;
grant execute on function public.plan_usage() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- module_access
-- ─────────────────────────────────────────────────────────────────────────────

create table public.module_access (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  module text not null check (module in (
    'classes', 'schedule', 'attendance', 'homework', 'grades', 'payments',
    'announcements', 'messages', 'documents'
  )),
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (institution_id, role, module),
  -- Modules that exist for only one of the roles.
  constraint module_access_role_module check (
    (module = 'classes' and role = 'teacher') or (module = 'payments' and role = 'student')
    or module not in ('classes', 'payments')
  )
);

alter table public.module_access enable row level security;
create trigger module_access_set_updated_at before update on public.module_access
  for each row execute function private.set_updated_at();

revoke all on public.module_access from anon, authenticated;
grant select on public.module_access to authenticated;
grant insert (institution_id, role, module, enabled) on public.module_access to authenticated;
grant update (enabled) on public.module_access to authenticated;

create policy module_access_tenant on public.module_access
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

-- Everyone in the school reads the switches (the navigation depends on them).
create policy module_access_select on public.module_access
  for select to authenticated
  using (true);

create policy module_access_admin_insert on public.module_access
  for insert to authenticated
  with check ((select private.user_role()) = 'institution_admin');

create policy module_access_admin_update on public.module_access
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');
