-- 0003_users_invitations: member management for institution admins.
-- Forward-only: never edit after merge.
--
-- Model (ADR 0012):
--  * An admin creates an `invitations` row (RLS: own institution, admin only), then the server
--    calls Supabase Auth's admin invite API. That API sets `auth.users.invited_at`, which public
--    sign-up can never set, so `handle_new_user` trusts invitations only when it is present.
--  * The trigger turns the invitation into a profile in the same transaction as the auth user.
--  * The invitation flips to `accepted` when the invitee first signs in (link click).

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles.email: the people list needs it and auth.users is not readable by clients.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles add column email text
  check (email is null or char_length(email) between 3 and 254);

update public.profiles p set email = lower(u.email) from auth.users u where u.id = p.id;

create unique index profiles_email_key on public.profiles (lower(email)) where email is not null;

-- Keep the copy in step when a user confirms an email change.
create function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;
revoke execute on function private.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_profile_email();

-- ─────────────────────────────────────────────────────────────────────────────
-- invitations
-- ─────────────────────────────────────────────────────────────────────────────

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete restrict,
  email text not null check (char_length(email) between 3 and 254 and email = lower(btrim(email))),
  role text not null check (role in ('teacher', 'student')),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 100),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_status_timestamps check (
    (status = 'accepted') = (accepted_at is not null)
    and (status = 'revoked') = (revoked_at is not null)
  )
);

-- One open invitation per address per school.
create unique index invitations_pending_email_key
  on public.invitations (institution_id, email) where status = 'pending';
create index invitations_institution_created_idx
  on public.invitations (institution_id, created_at desc);
create index invitations_invited_by_idx on public.invitations (invited_by);

alter table public.invitations enable row level security;

create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function private.set_updated_at();

revoke all on public.invitations from anon, authenticated;
grant select on public.invitations to authenticated;
grant insert (institution_id, email, role, first_name, last_name) on public.invitations to authenticated;
-- Admins may only extend (resend) or revoke. Acceptance happens in a trigger.
grant update (status, revoked_at, expires_at) on public.invitations to authenticated;

create policy invitations_tenant on public.invitations
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy invitations_admin_select on public.invitations
  for select to authenticated
  using ((select private.user_role()) in ('institution_admin', 'super_admin'));

create policy invitations_admin_insert on public.invitations
  for insert to authenticated
  with check (
    (select private.user_role()) = 'institution_admin'
    and status = 'pending'
  );

-- Only open invitations can change, and only to revoked or with a later expiry.
create policy invitations_admin_update on public.invitations
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin' and status = 'pending')
  with check ((select private.user_role()) = 'institution_admin' and status in ('pending', 'revoked'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Admins manage their members: activate/deactivate and edit names (teachers and students only;
-- never themselves or other admins). Role and institution stay immutable from the client.
-- ─────────────────────────────────────────────────────────────────────────────

grant update (is_active) on public.profiles to authenticated;

create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (
    (select private.user_role()) = 'institution_admin'
    and role in ('teacher', 'student')
    and id <> (select auth.uid())
  )
  with check (
    (select private.user_role()) = 'institution_admin'
    and role in ('teacher', 'student')
    and id <> (select auth.uid())
  );

-- Column grants cannot tell rows apart, so `profiles_update_own` would now let anyone switch off
-- their own account. This guard keeps activation an admin-only action.
create function private.guard_profile_activation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.is_active is distinct from old.is_active and old.id = (select auth.uid()) then
    raise exception 'cannot change your own activation' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_activation
  before update of is_active on public.profiles
  for each row execute function private.guard_profile_activation();

-- ─────────────────────────────────────────────────────────────────────────────
-- Provisioning: replaces the onboarding trigger so it also handles invitations.
-- ─────────────────────────────────────────────────────────────────────────────

-- Turns a pending invitation into a profile. Raises `invalid_invitation` when the invitation id,
-- address, status or expiry don't line up. Idempotent for users that already have a profile.
create function private.provision_invited_user(uid uuid, mail text, meta jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitations;
  locale text := case when meta ->> 'locale' in ('fr', 'ar', 'en') then meta ->> 'locale' else 'fr' end;
begin
  if exists (select 1 from public.profiles p where p.id = uid) then
    return;
  end if;

  select * into inv
    from public.invitations i
   where i.id = nullif(meta ->> 'invitation_id', '')::uuid
     and i.email = lower(mail)
     and i.status = 'pending'
     and i.expires_at > now()
   for update;
  if not found then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, institution_id, role, first_name, last_name, locale, email)
  values (uid, inv.institution_id, inv.role, inv.first_name, inv.last_name, locale, lower(mail));
end;
$$;
revoke execute on function private.provision_invited_user(uuid, text, jsonb) from public, anon, authenticated;

-- GoTrue's admin invite inserts the user and sets `invited_at` in a later UPDATE, so provisioning
-- must also run when the column flips from null. Only the service-role invite endpoint writes it.
create function private.handle_user_invited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'signup_intent' = 'accept_invitation' then
    perform private.provision_invited_user(new.id, new.email, new.raw_user_meta_data);
  end if;
  return new;
end;
$$;
revoke execute on function private.handle_user_invited() from public, anon, authenticated;

create trigger on_auth_user_invited
  after update of invited_at on auth.users
  for each row when (old.invited_at is null and new.invited_at is not null)
  execute function private.handle_user_invited();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  intent text := meta ->> 'signup_intent';
  locale text := case when meta ->> 'locale' in ('fr', 'ar', 'en') then meta ->> 'locale' else 'fr' end;
  base text;
  candidate text;
  n int := 1;
  new_institution uuid;
begin
  if intent = 'accept_invitation' then
    -- Public sign-up can claim this intent but never sets `invited_at`, so it gets no profile.
    -- (GoTrue's invite endpoint usually sets it in a later UPDATE: see handle_user_invited.)
    if new.invited_at is not null then
      perform private.provision_invited_user(new.id, new.email, meta);
    end if;
    return new;
  end if;

  if intent is distinct from 'create_institution' then
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

  insert into public.profiles (id, institution_id, role, first_name, last_name, locale, email)
  values (new.id, new_institution, 'institution_admin',
          btrim(meta ->> 'first_name'), btrim(meta ->> 'last_name'), locale, lower(new.email));

  return new;
end;
$$;

-- An invitation is accepted the first time its user signs in (clicks the emailed link).
create function private.accept_invitation_on_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invitations
     set status = 'accepted', accepted_at = now()
   where email = lower(new.email)
     and status = 'pending'
     and exists (select 1 from public.profiles p
                  where p.id = new.id and p.institution_id = invitations.institution_id);
  return new;
end;
$$;
revoke execute on function private.accept_invitation_on_sign_in() from public, anon, authenticated;

create trigger on_auth_user_signed_in
  after update of last_sign_in_at on auth.users
  for each row when (old.last_sign_in_at is null and new.last_sign_in_at is not null)
  execute function private.accept_invitation_on_sign_in();
