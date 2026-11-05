# 0015 — Centre mode and multi-group enrolment

- Status: Accepted
- Date: 2026-11-05

## Context

Tadriss assumed one class per student per year, enforced by a partial unique index. A soutien centre sells
monthly subject groups, so one student belongs to several at once. Schools must keep their rule.

## Decision

- `institutions.kind` is `school` (default) or `centre`. No API role can write it; the platform console will.
- `enrolments.exclusive` records the rule when an enrolment is created, set by a trigger from the kind. A partial
  unique index cannot read another table, and this keeps the school rule a real database constraint rather than a
  check that concurrent requests could race past.
- Two partial unique indexes replace the old one: one active enrolment per (student, year) where `exclusive`, and
  one active enrolment per (student, class) for everybody.
- Timetable clashes between a student's groups are a warning in the enrol dialog, not a constraint. A centre may
  knowingly accept one, and refusing would block legitimate enrolments.

## Consequences

- Code cannot assume a single class per student. Parent pages use `Child.classIds`.
- Changing a school's kind later does not rewrite existing enrolments' `exclusive`, so a switch needs a data review.
