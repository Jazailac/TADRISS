-- 0002_tenancy: institutions, profiles, JWT claim helpers, Custom Access Token Hook and the
-- self-serve onboarding trigger. Forward-only: never edit after merge.
--
-- Claims model (ADR 0007, ADR 0010): the hook copies `role` and `institution_id` from
-- `profiles` into the JWT as `user_role` / `institution_id` (`role` is reserved by PostgREST).
-- Policies read ONLY those claims, never a table, so there is no RLS recursion.

-- ─────────────────────────────────────────────────────────────────────────────
-- Claim helpers
-- ─────────────────────────────────────────────────────────────────────────────

create function private.institution_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'institution_id', '')::uuid
$$;

create function private.user_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'user_role', '')
$$;

create function private.is_super_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'user_role' = 'super_admin', false)
$$;

grant execute on function private.institution_id(), private.user_role(), private.is_super_admin()
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- institutions
-- ─────────────────────────────────────────────────────────────────────────────

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 150),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  default_locale text not null default 'fr' check (default_locale in ('fr', 'ar', 'en')),
  timezone text not null default 'Africa/Casablanca' check (char_length(timezone) between 3 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.institutions enable row level security;

create trigger institutions_set_updated_at
  before update on public.institutions
  for each row execute function private.set_updated_at();

-- Table privileges: read + edit a few columns. Inserts happen only via onboarding (trigger),
-- deletes only via the super_admin console (Phase 12).
revoke all on public.institutions from anon, authenticated;
grant select on public.institutions to authenticated;
grant update (name, default_locale, timezone) on public.institutions to authenticated;

-- Tenant isolation (restrictive): only your own institution, unless super_admin.
create policy institutions_tenant on public.institutions
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or id = (select private.institution_id()));

-- Soft delete (restrictive): hidden unless super_admin.
create policy institutions_not_deleted on public.institutions
  as restrictive for select to authenticated
  using (deleted_at is null or (select private.is_super_admin()));

create policy institutions_select on public.institutions
  for select to authenticated
  using (true);

create policy institutions_admin_update on public.institutions
  for update to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'))
  with check ((select private.user_role()) in ('institution_admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  institution_id uuid references public.institutions (id) on delete restrict,
  role text not null check (role in ('super_admin', 'institution_admin', 'teacher', 'student')),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 100),
  locale text check (locale in ('fr', 'ar', 'en')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Exactly the platform operator has no institution.
  constraint profiles_institution_matches_role
    check ((role = 'super_admin') = (institution_id is null))
);

create index profiles_institution_role_idx on public.profiles (institution_id, role);

alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Users may edit their own name and language. Role, institution and activation change only
-- through admin RPCs (Phase 2).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, locale) on public.profiles to authenticated;

create policy profiles_tenant on public.profiles
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy profiles_not_deleted on public.profiles
  as restrictive for select to authenticated
  using (deleted_at is null or (select private.user_role()) in ('institution_admin', 'super_admin'));

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Custom Access Token Hook (configured in config.toml / dashboard)
-- ─────────────────────────────────────────────────────────────────────────────

create function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  p record;
begin
  select pr.role, pr.institution_id, pr.is_active
    into p
    from public.profiles pr
   where pr.id = (event ->> 'user_id')::uuid
     and pr.deleted_at is null;

  if found and p.is_active then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(p.role));
    claims := jsonb_set(claims, '{institution_id}', coalesce(to_jsonb(p.institution_id), 'null'::jsonb));
  else
    -- No profile, deactivated or deleted: no tenant claims, so every policy denies.
    claims := claims - 'user_role' - 'institution_id';
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema private to supabase_auth_admin;
grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function private.custom_access_token_hook(jsonb) from public, anon, authenticated;

grant select on public.profiles to supabase_auth_admin;
create policy profiles_auth_hook on public.profiles
  for select to supabase_auth_admin
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Self-serve onboarding: signing up with intent `create_institution` creates the
-- institution and its admin profile in the same transaction as the auth user (ADR 0010).
-- ─────────────────────────────────────────────────────────────────────────────

create function private.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      translate(lower(coalesce(input, '')),
        'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ',
        'aaaaaaceeeeiiiinooooouuuuyy'),
      '[^a-z0-9]+', '-', 'g'),
    '-')
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  locale text := case when meta ->> 'locale' in ('fr', 'ar', 'en') then meta ->> 'locale' else 'fr' end;
  base text;
  candidate text;
  n int := 1;
  new_institution uuid;
begin
  -- Invited users (Phase 2) are provisioned by the invite flow, not here.
  if meta ->> 'signup_intent' is distinct from 'create_institution' then
    return new;
  end if;

  base := left(private.slugify(meta ->> 'institution_name'), 50);
  if char_length(base) < 3 then
    base := 'ecole'; -- e.g. names written only in Arabic script
  end if;
  candidate := base;
  while exists (select 1 from public.institutions i where i.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  insert into public.institutions (name, slug, default_locale)
  values (btrim(meta ->> 'institution_name'), candidate, locale)
  returning id into new_institution;

  insert into public.profiles (id, institution_id, role, first_name, last_name, locale)
  values (new.id, new_institution, 'institution_admin',
          btrim(meta ->> 'first_name'), btrim(meta ->> 'last_name'), locale);

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
