# 0003 — Phase plan

- Status: Proposed (the brief referenced a plan that was not included; this is the default)
- Date: 2026-10-06

## Decision

| Phase | Scope                                                                        |
| ----- | ---------------------------------------------------------------------------- |
| 0     | Monorepo, tooling, lint rules, env validation, CI/CD skeleton, ADRs          |
| 1     | Auth, Custom Access Token Hook, tenancy (institutions, profiles), onboarding |
| 2     | Users & invitations (admin invites teachers/students)                        |
| 3     | Classes & enrolment                                                          |
| 4     | Schedule (periods, timetable)                                                |
| 5     | Attendance (sessions + records, `submit_attendance` RPC)                     |
| 6     | Homework                                                                     |
| 7     | Exams, grading scales, grades                                                |
| 8     | Finance (fee plans → invoices → payments → receipts, voiding)                |
| 9     | Announcements (read tracking) & direct messages                              |
| 10    | Documents (Storage)                                                          |
| 11    | Role-page permissions, subscriptions & plan limits                           |
| 12    | super_admin console & audit log                                              |

Each feature phase is built as vertical slices: migration + RLS + pgTAP → shared
queries/RPCs + unit tests → web UI + Playwright → mobile UI + Maestro.
