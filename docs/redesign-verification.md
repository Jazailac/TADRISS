# Version 2 design verification

Reviewed on 15 October 2026, on `phase-13/premium-experience`.

## Passed

- Repository lint and TypeScript checks.
- 289 unit and token checks, including light/dark text and navigation contrast.
- French, Arabic and English completeness: 1,603 web keys and 219 mobile keys.
- Production web build, with locally bundled fonts and no font download during compilation.
- 239 distinct selected functional browser checks across 375, 768 and 1280 pixels. Coverage includes
  public/auth/demo screens, five role page lists, dashboard data, phone overflow, Arabic RTL,
  class navigation, filters and pagination, empty states, inline form validation, schedules,
  documents, financial records, reports, settings and message privacy.
- The keyboard page-switcher flow passed at every width and passed nine additional stability runs.
- Native mobile lint, types, seven existing tests and the iOS export check: 1,731 modules, a 5.3 MB
  bundle. The native tests are included in the unit total above.
- Changed-file formatting and whitespace checks.

Browser screenshots were also inspected for the landing page, light/dark dashboards, phone
directories and dialogs, agenda, conversation composer, Arabic settings and parent home. Final
refinements reduced phone summary height, restored readable headline spacing, avoided clipped
announcement titles and corrected the logo link's accessible name.

## Bolder second pass

The public hero now uses an architectural ink composition and panoramic product cockpit. Role homes
use journal covers, actual focal metrics, open daily ledgers, direct staff roll-call entry, and shared
student/parent work and mark briefings. Finance, directories, timetables, attendance, homework, results,
notices, documents and settings have distinct compositions. Native screens extend this direction
through Home and More.

The second pass ran 110 public/auth/role/parent/report/navigation checks, 81 selected domain checks,
and a final 80-check focused pass after refinements. Overlapping reruns are excluded from the
239 distinct total above. Phone-only tests are intentionally skipped in the wider projects.
The grade check initially caught a removed visible subject-average caption; the caption was restored
and passed at every width. Focused review also caught overlapping invitation counts in the new
directory proportion; invitations now remain a separate indicator. Affected directory checks passed.

Final visual review covered the compact phone dashboard, French light/dark financial ledger, Arabic
phone finance and document library, and the public desktop/phone/tablet compositions. The new staff
lesson link was opened and verified against the existing dated roll-call form without saving data.
Both themes use the shared tested contrast palette. There are no animation dependencies or fabricated
chart series.

## Readability and navigation follow-up

- Raised functional metadata and captions, clarified working-page headings, and enlarged navigation
  and native tap targets.
- Replaced the homework progress masthead with compact section links, full-width assignment lists,
  exact due dates and readable completed work. Parent views have no checkbox-shaped decoration.
- Added Homework to the phone dock, shortened dock labels, clarified the page switcher and added
  dashboard breadcrumbs.
- Made the selected child and class visible and retained `?child=` through navigation and language
  changes. A new browser regression test exercises the real sidebar/drawer → grades → keyboard
  switcher → homework → English flow at all three widths.
- The follow-up passed 77 distinct selected browser checks, repository lint/types, translation
  completeness, production web build, native export, and whitespace checks. The first run of the
  new test read the URL before navigation completed; it now waits for the visible selected-child
  state. No application workaround or weakened assertion was needed.
- Visually inspected English desktop/phone homework and Arabic phone homework in dark mode. Native
  text changes bundle successfully but still require device visual review.

## Remaining verification

- Run the native Maestro smoke on a device or simulator. Maestro is unavailable on this host;
  the existing smoke flow was updated for Home → More → Settings → sign-out.
- Generate screenshot comparison baselines through the existing **Update visual baselines** Linux
  workflow, per [ADR 0008](decisions/0008-visual-baselines-on-linux.md). Local review captures are
  not comparison baselines. No Mac baselines were generated.
- Repository-wide Prettier has pre-existing warnings in untouched files and cannot parse the Go
  template expressions in `supabase/templates/invite.html`. Formatting passed for every changed
  source/document file; the unrelated template was preserved.

The full database mutation/e2e suite was not rerun for this presentation pass. Shared queries,
server actions, migrations and tenant rules were not changed. Existing local seed data was retained.
The public demo is enabled only in the local preview process; no environment file or deployment
was changed.
