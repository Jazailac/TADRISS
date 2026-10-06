# Local seed data

`pnpm dev:setup` runs `supabase start` + `supabase db reset`, which applies every migration
and then `seed.sql`. The seed is deterministic: fixed UUIDs, fixed dates relative to a fixed
anchor (`2026-09-01`), no `random()`.

## Target dataset (filled in slice by slice)

| Data                          | Arrives in               |
| ----------------------------- | ------------------------ |
| 1 institution, 1 admin        | Phase 1 (auth & tenancy) |
| 3 teachers, 30 students       | Phase 2 (users)          |
| Classes + enrolments          | Phase 3                  |
| Timetable                     | Phase 4                  |
| One month of attendance       | Phase 5                  |
| Homework                      | Phase 6                  |
| Exams + grades                | Phase 7                  |
| Fee plans, invoices, payments | Phase 8                  |

## Credentials

Local-only test accounts. Never reuse these anywhere else.

| Role                                   | Email | Password |
| -------------------------------------- | ----- | -------- |
| _none yet, accounts arrive in Phase 1_ |       |          |
