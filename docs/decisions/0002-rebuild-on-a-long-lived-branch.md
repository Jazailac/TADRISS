# 0002 — Rebuild on a long-lived `rebuild` branch

- Status: Accepted (product owner chose option "b", 2026-10-06)
- Date: 2026-10-06

## Context

The repository `jalalzailachi/TADRISS` already contains a working v1 (34 migrations, Oracle/PM2
deploy) serving production from `main`. The v2 brief asks for a rebuild from an empty repo.

## Decision

- v2 lives on the long-lived branch `rebuild`, which starts by deleting the v1 tree.
- Each slice is a short-lived branch (`phase-N/<slice>`) merged into `rebuild` via PR.
- `main` keeps v1 untouched until cutover; `rebuild` is merged into `main` only at cutover.
- v1's local env files were moved to the git-ignored `.legacy-local/` so v2 never loads v1
  production credentials by accident.

## Consequences

- Production deploy workflow (`deploy.yml`, push to `main`) only becomes active at cutover.
- v2 must use a **new** Supabase project; it must never `db push` to the v1 project.
- Cutover plan (data migration or fresh start) is still open — see the Phase 0 report.
