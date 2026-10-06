# 0007 — RLS helper functions live in `private`, not `auth`

- Status: Proposed (deviates from the brief's `auth.institution_id()`; needs approval)
- Date: 2026-10-06

## Context

The brief names the tenant helper `auth.institution_id()`. Supabase no longer permits creating
objects in the managed `auth` schema on hosted projects, so a migration doing so would apply
locally but fail on `supabase db push`.

## Decision

Helpers are `private.institution_id()` and `private.user_role()`: `stable`, `security invoker`,
`set search_path = ''`, reading only `auth.jwt()` claims (never a table → no RLS recursion).
`private` is not exposed through the Data API (migration 0001).

## Consequences

Policies read `institution_id = (select private.institution_id())`. The `(select …)` wrapper
lets Postgres evaluate the helper once per statement instead of once per row.
