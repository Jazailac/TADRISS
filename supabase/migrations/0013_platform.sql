-- 0013_platform: the platform operator's console and an append-only audit log. Forward-only.
--
-- * Only a super_admin may change a school's plan or suspend it (soft delete). Column grants cannot
--   tell app roles apart, so a trigger enforces it.
-- * A suspended school's members lose their tenant claims (the access-token hook), so every policy
--   denies them from their next token refresh and sign-in is refused.
-- * `audit_log` is written only by triggers, never by clients. The trigger functions are the second
--   SECURITY DEFINER code in the schema (after private.my_class_ids, ADR 0013): without it a client
--   could forge entries, because an invoker trigger would need INSERT rights for the caller.
--   They live in `private`, set an empty search_path and take no caller input beyond the row.

-- ─────────────────────────────────────────────────────────────────────────────
-- Plan and suspension: platform operator only
-- ─────────────────────────────────────────────────────────────────────────────

grant update (plan, deleted_at) on public.institutions to authenticated;

create function private.guard_institution_platform_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Direct database access (service role, migrations, seed) is not an API caller.
  if (new.plan is distinct from old.plan or new.deleted_at is distinct from old.deleted_at)
     and current_setting('role', true) in ('authenticated', 'anon')
     and not (select private.is_super_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger institutions_guard_platform before update on public.institutions
  for each row execute function private.guard_institution_platform_fields();

-- A suspended school's members have no tenant claims.
create or replace function private.custom_access_token_hook(event jsonb)
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
     and pr.deleted_at is null
     and (
       pr.institution_id is null
       or exists (select 1 from public.institutions i
                   where i.id = pr.institution_id and i.deleted_at is null)
     );

  if found and p.is_active then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(p.role));
    claims := jsonb_set(claims, '{institution_id}', coalesce(to_jsonb(p.institution_id), 'null'::jsonb));
  else
    -- No profile, deactivated, deleted or in a suspended school: no tenant claims.
    claims := claims - 'user_role' - 'institution_id';
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant select on public.institutions to supabase_auth_admin;
create policy institutions_auth_hook on public.institutions
  for select to supabase_auth_admin
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_log
-- ─────────────────────────────────────────────────────────────────────────────

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  -- Null for platform-level events outside any school.
  institution_id uuid references public.institutions (id) on delete restrict,
  actor_id uuid,
  action text not null check (char_length(action) between 3 and 80),
  entity text not null check (char_length(entity) between 2 and 60),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_institution_idx on public.audit_log (institution_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Read only. Nobody writes through the API: rows come from the triggers below.
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy audit_log_tenant on public.audit_log
  as restrictive for select to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

create policy audit_log_select_super_admin on public.audit_log
  for select to authenticated
  using ((select private.is_super_admin()));

create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using ((select private.user_role()) = 'institution_admin');

create function private.audit_write(
  p_institution uuid, p_action text, p_entity text, p_entity_id uuid, p_details jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (institution_id, actor_id, action, entity, entity_id, details)
  values (p_institution, (select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb))
$$;
revoke execute on function private.audit_write(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

-- ── what is audited ─────────────────────────────────────────────────────────

create function private.audit_institution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.plan is distinct from old.plan then
    perform private.audit_write(new.id, 'institution.plan_changed', 'institution', new.id,
      jsonb_build_object('from', old.plan, 'to', new.plan));
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    perform private.audit_write(new.id,
      case when new.deleted_at is null then 'institution.restored' else 'institution.suspended' end,
      'institution', new.id, '{}'::jsonb);
  end if;
  if new.name is distinct from old.name or new.default_locale is distinct from old.default_locale
     or new.timezone is distinct from old.timezone or new.phone is distinct from old.phone
     or new.address is distinct from old.address or new.city is distinct from old.city then
    perform private.audit_write(new.id, 'institution.updated', 'institution', new.id,
      jsonb_build_object('name', new.name));
  end if;
  return new;
end;
$$;
create trigger institutions_audit after update on public.institutions
  for each row execute function private.audit_institution();

create function private.audit_profile_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active is distinct from old.is_active and new.institution_id is not null then
    perform private.audit_write(new.institution_id,
      case when new.is_active then 'member.reactivated' else 'member.deactivated' end,
      'profile', new.id, jsonb_build_object('role', new.role));
  end if;
  return new;
end;
$$;
create trigger profiles_audit_activation after update of is_active on public.profiles
  for each row execute function private.audit_profile_activation();

create function private.audit_payment_void()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.voided_at is null and new.voided_at is not null then
    perform private.audit_write(new.institution_id, 'payment.voided', 'payment', new.id,
      jsonb_build_object('receipt', new.receipt_number, 'amount_centimes', new.amount_centimes,
                         'reason', new.void_reason));
  end if;
  return new;
end;
$$;
create trigger payments_audit_void after update on public.payments
  for each row execute function private.audit_payment_void();

create function private.audit_invoice_void()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.voided_at is null and new.voided_at is not null then
    perform private.audit_write(new.institution_id, 'invoice.voided', 'invoice', new.id,
      jsonb_build_object('number', new.number, 'amount_centimes', new.amount_centimes,
                         'reason', new.void_reason));
  end if;
  return new;
end;
$$;
create trigger invoices_audit_void after update on public.invoices
  for each row execute function private.audit_invoice_void();

create function private.audit_module_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.enabled is distinct from old.enabled then
    perform private.audit_write(new.institution_id, 'module.toggled', 'module_access', null,
      jsonb_build_object('role', new.role, 'module', new.module, 'enabled', new.enabled));
  end if;
  return new;
end;
$$;
create trigger module_access_audit after insert or update on public.module_access
  for each row execute function private.audit_module_access();

-- ─────────────────────────────────────────────────────────────────────────────
-- Platform overview RPCs (super_admin only; empty for anyone else)
-- ─────────────────────────────────────────────────────────────────────────────

create function public.platform_institutions()
returns table (
  id uuid,
  name text,
  slug text,
  plan text,
  default_locale text,
  suspended boolean,
  created_at timestamptz,
  students integer,
  teachers integer,
  admins integer
)
language sql
stable
set search_path = ''
as $$
  select i.id, i.name, i.slug, i.plan, i.default_locale, i.deleted_at is not null, i.created_at,
         (select count(*) from public.profiles p
           where p.institution_id = i.id and p.role = 'student' and p.is_active and p.deleted_at is null)::integer,
         (select count(*) from public.profiles p
           where p.institution_id = i.id and p.role = 'teacher' and p.is_active and p.deleted_at is null)::integer,
         (select count(*) from public.profiles p
           where p.institution_id = i.id and p.role = 'institution_admin' and p.is_active and p.deleted_at is null)::integer
    from public.institutions i
   where (select private.is_super_admin())
   order by i.created_at desc, i.name
$$;
revoke execute on function public.platform_institutions() from public, anon;
grant execute on function public.platform_institutions() to authenticated;
