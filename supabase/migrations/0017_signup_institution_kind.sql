-- 0017_signup_institution_kind: a self-serve sign-up chooses whether its institution is a school or a soutien
-- centre (the landing page's preview sends `schoolType=support`). Forward-only. ADR 0015.
--
-- `institutions.kind` stays unwritable by every API role. The only new path is this trigger, which runs once per
-- new institution, before it has any enrolment, so no `enrolments.exclusive` can disagree with the chosen kind.
-- Anything but `centre` (missing, bogus, wrong case) makes a school, the safe default.

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
  institution_kind text := case when meta ->> 'institution_kind' in ('school', 'centre') then meta ->> 'institution_kind' else 'school' end;
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

  insert into public.institutions (name, slug, default_locale, kind)
  values (btrim(meta ->> 'institution_name'), candidate, locale, institution_kind)
  returning id into new_institution;

  insert into public.profiles (id, institution_id, role, first_name, last_name, locale, email)
  values (new.id, new_institution, 'institution_admin',
          btrim(meta ->> 'first_name'), btrim(meta ->> 'last_name'), locale, lower(new.email));

  return new;
end;
$$;
-- `create or replace` keeps the existing grants, but restate them so this file stands on its own.
revoke execute on function private.handle_new_user() from public, anon, authenticated;
