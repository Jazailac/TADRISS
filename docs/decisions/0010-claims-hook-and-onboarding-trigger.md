# 0010 — Tenant claims via access-token hook; onboarding via auth trigger

- Status: Accepted
- Date: 2026-10-06

## Context

Every request must know the caller's role and institution without a table lookup inside RLS
(recursion, cost). Self-serve sign-up must create an institution and its admin atomically, for
web and mobile alike, and must keep working when email confirmation is enabled in production.

## Decision

1. **Claims.** `private.custom_access_token_hook` (security invoker, executed by
   `supabase_auth_admin`) copies `profiles.role` / `profiles.institution_id` into the JWT as
   `user_role` / `institution_id`. (`role` is reserved: PostgREST uses it to pick the Postgres
   role.) Deactivated or soft-deleted profiles get **no** tenant claims, so every policy denies.
   Policies read claims only through `private.institution_id()`, `private.user_role()` and
   `private.is_super_admin()`, wrapped in `(select …)` so they are evaluated once per statement.
2. **Onboarding.** `auth.signUp` with `data.signup_intent = 'create_institution'` fires
   `private.handle_new_user()` (security definer, `search_path = ''`, in the non-exposed `private`
   schema). It creates the institution (unique slug, numeric suffix on collision, `ecole` fallback
   for Arabic-only names) and the `institution_admin` profile **in the same transaction** as the
   auth user. If either insert fails, the sign-up fails and no orphan user remains (pgTAP-tested).
   Users without the intent (invites, Phase 2) are ignored by this trigger.
3. **Privileges.** Tables grant `select` plus column-level `update` (users edit their name and
   locale, never `role`/`institution_id`/`is_active`). No direct `insert`/`delete` for
   `authenticated`: those happen in triggers or admin RPCs.
4. **Routing.** `proxy.ts` maps path prefixes to roles (`protectedAreas` in `@tadriss/shared`),
   sends signed-out users to `/login?next=…`, and sends a wrong role to its own home. `next` is
   honoured only for same-site paths inside the user's own area (no open redirect). The
   `(app)` layout re-checks server-side; RLS remains the real boundary.

## Consequences

- Role or activation changes take effect at the user's next token refresh (≤ 1 h by default).
  Phase 2's admin RPCs that deactivate a user should also sign them out (`auth.admin.signOut`).
- Hosted projects must enable the hook in the dashboard (Auth → Hooks); locally it is in
  `config.toml`. Deploy checklist item.
