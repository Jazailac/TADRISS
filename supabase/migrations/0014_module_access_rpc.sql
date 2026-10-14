-- 0014_module_access_rpc: switch a module on or off for a role in one call. Forward-only.
--
-- An API upsert on module_access sets every column on conflict, which needs UPDATE rights on
-- institution_id/role/module that are deliberately not granted. This function inserts the row for
-- the caller's own school, and on conflict touches `enabled` only, which the existing grants allow.
-- SECURITY INVOKER: the module_access RLS policies still decide who may do it (administrators).

create function public.set_module_access(p_role text, p_module text, p_enabled boolean)
returns void
language sql
set search_path = ''
as $$
  insert into public.module_access (institution_id, role, module, enabled)
  values ((select private.institution_id()), p_role, p_module, p_enabled)
  on conflict (institution_id, role, module) do update set enabled = excluded.enabled
$$;
revoke execute on function public.set_module_access(text, text, boolean) from public, anon;
grant execute on function public.set_module_access(text, text, boolean) to authenticated;
