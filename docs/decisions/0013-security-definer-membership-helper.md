# 0013 — A SECURITY DEFINER membership helper in `private`

- Status: Accepted
- Date: 2026-10-07
- Refines: [0007](0007-rls-helpers-in-private-schema.md), CLAUDE.md rules 3 and 5

## Context

Students must see who teaches their class and its timetable; teachers must see the students of the
classes they teach. That needs `class_teachers` readable by enrolled students while `enrolments` is
readable by assigned teachers. Each policy reads the other table, and Postgres refuses the query when
it rewrites it ("infinite recursion detected in policy"), whatever the runtime data would be.

## Decision

`private.my_class_ids()` returns the classes the caller belongs to (active enrolment or teacher
assignment). It is `SECURITY DEFINER`, `stable`, `set search_path = ''`, scoped strictly to `auth.uid()`,
lives in `private` (not exposed by the Data API) and is executable by `authenticated` only. Policies
call it instead of sub-selecting the other RLS table, which removes the cycle.

## Consequences

- Rule 3 ("helpers never query an RLS table") now has one documented exception; rule 5's SECURITY DEFINER
  ban still applies to `public` and is still enforced by the meta pgTAP.
- Any further helper of this kind needs the same properties: `private`, fixed `search_path`, keyed on
  `auth.uid()`, no parameters that widen access, and an entry here.
