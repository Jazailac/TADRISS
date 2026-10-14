# Local seed data

`pnpm dev:setup` runs `supabase start` + `supabase db reset`, which applies every migration
and then `seed.sql`. The seed is deterministic: fixed UUIDs and fixed names, no `random()`.

## Credentials (local only — never reuse anywhere)

Every seeded account uses the password **`Tadriss-dev-2026`**.

| Role                                                      | Email                                           | Lands on            |
| --------------------------------------------------------- | ----------------------------------------------- | ------------------- |
| super_admin                                               | `ops@tadriss.test`                              | `/admin` (Phase 12) |
| institution_admin, Al Manar                               | `direction@almanar.test`, `admin2@almanar.test` | `/dashboard`        |
| parent, Al Manar                                          | `parent01@almanar.test` … `parent05@almanar.test` | `/parent`           |
| teacher, Al Manar                                         | `prof1@almanar.test` … `prof3@almanar.test`     | `/teacher`          |
| student, Al Manar                                         | `eleve01@almanar.test` … `eleve31@almanar.test` | `/student`          |
| institution_admin, Ibn Rochd (2nd tenant, Arabic default) | `direction@ibnrochd.test`                       | `/dashboard`        |

## Fixed ids

| Thing                         | UUID pattern                                             |
| ----------------------------- | -------------------------------------------------------- |
| Al Manar institution          | `10000000-0000-4000-8000-000000000001`                   |
| Al Manar admin                | `10000000-0000-4000-8000-0000000000a1`                   |
| Al Manar teachers             | `10000000-0000-4000-8000-00000000010N`                   |
| Al Manar students             | `10000000-0000-4000-8000-0000000002NN`                   |
| Ibn Rochd institution / admin | `20000000-0000-4000-8000-000000000001` / `…0000000000a1` |
| super_admin                   | `00000000-0000-4000-8000-00000000000a`                   |

## Dataset roadmap

| Data                                                 | Arrives in |
| ---------------------------------------------------- | ---------- |
| Institutions, admin, teachers, students, super_admin | Phase 1 ✅ |
| Classes + enrolments                                 | Phase 3    |
| Timetable                                            | Phase 4    |
| One month of attendance                              | Phase 5    |
| Homework                                             | Phase 6    |
| Exams + grades                                       | Phase 7    |
| Fee plans, invoices, payments                        | Phase 8    |
