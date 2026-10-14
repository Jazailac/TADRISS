# CLAUDE.md

Onboarding guide for every session working on Tadriss v2. Keep it current: when a command,
rule or architectural fact changes, update this file in the same PR.

## Project

Tadriss (تدريس) is a multi-tenant school-management SaaS for private schools in Morocco.
Roles: `super_admin` (platform), `institution_admin`, `teacher`, `student`. Every user except
`super_admin` belongs to exactly one institution. Locales: **fr (default)**, ar (RTL), en.
Currency: MAD, stored as integer centimes ([ADR 0004](docs/decisions/0004-money-as-integer-centimes.md)).

**Branching:** v2 lives on `rebuild` ([ADR 0002](docs/decisions/0002-rebuild-on-a-long-lived-branch.md)).
`main` is still v1 in production. Work on `phase-N/<slice>` branches and open PRs into `rebuild`.
Never push to `main` or `rebuild` directly. Use conventional commits, one slice per PR.

**Phases:** [ADR 0003](docs/decisions/0003-phase-plan.md). After each phase, report and wait for approval.

## Layout

```
apps/web            Next.js 16 App Router · next-intl · next-themes · Tailwind v4
apps/mobile         Expo SDK 57 · Expo Router · NativeWind 4 (Tailwind 3) · i18next
packages/shared     Database types, zod schemas, ALL query/RPC functions, Result type, locale/money helpers
packages/ui-tokens  Design tokens → web CSS vars, mobile CSS vars, NativeWind preset (only place with raw colours)
packages/eslint-config  Flat config + custom bans that enforce the rules below
supabase/           config.toml, migrations/NNNN_*.sql, tests/database/*.test.sql (pgTAP), seed/
docs/decisions/     ADRs
scripts/            dev-setup.sh, check-i18n.mjs
```

## Commands

```bash
pnpm install
pnpm dev:setup          # Docker required: supabase start + db reset + seed + writes apps/*/.env.local
pnpm dev:web            # http://localhost:3000
pnpm dev:mobile         # Expo
pnpm lint               # ESLint (all custom bans) — web runs `next typegen` first
pnpm type-check
pnpm test               # Vitest + node:test unit tests
pnpm test:db            # pgTAP (needs supabase running)
pnpm test:e2e           # Playwright against `next build` at 375/768/1280
pnpm i18n:check         # fr/ar/en completeness for web and mobile
pnpm db:types           # regenerate packages/shared/src/database.types.ts from local DB
pnpm db:types:check     # CI drift check
pnpm tokens:build       # regenerate ui-tokens dist (turbo runs it automatically before dependents)
pnpm format             # Prettier
```

New migration: `pnpm exec supabase migration new <name>`, then rename it to the next `NNNN_<name>.sql`.

## Architecture facts

- **Auth claims:** the Custom Access Token Hook (`private.custom_access_token_hook`) puts
  `user_role` and `institution_id` in the JWT from `profiles` (`role` is reserved by PostgREST).
  RLS helpers `private.institution_id()`, `private.user_role()`, `private.is_super_admin()` read
  **only** `auth.jwt()` ([ADR 0007](docs/decisions/0007-rls-helpers-in-private-schema.md),
  [ADR 0010](docs/decisions/0010-claims-hook-and-onboarding-trigger.md)). Deactivated or deleted
  profiles get no claims, so every policy denies them.
- **Onboarding:** `signUp` with `data.signup_intent = 'create_institution'` fires
  `private.handle_new_user()`, which creates the institution and admin profile in the same
  transaction. No Edge Function is involved.
- **Roles → areas:** `protectedAreas` / `homePath` in `@tadriss/shared` (`/dashboard` admin,
  `/teacher`, `/student`, `/admin` super_admin). `proxy.ts` enforces them; the
  `app/[locale]/(app)/layout.tsx` re-checks via `getViewer()` (`lib/viewer.ts`, `cache()`d per request).
- **Auth actions:** `app/actions/auth.ts` (`login`, `signup`, `logout`) are used with
  `useActionState`. They return `AuthState` and echo non-secret fields back, because React
  resets forms after an action.
- **Invitations (Phase 2):** admins invite teachers/students from `/dashboard/teachers` and
  `/dashboard/students`. Server action inserts an `invitations` row (RLS), then the service-role
  client calls `auth.admin.inviteUserByEmail`; DB triggers provision the profile only when
  `auth.users.invited_at` is set ([ADR 0012](docs/decisions/0012-invitations-and-member-management.md)).
  Emailed link → `/auth/confirm` (token hash) → `/set-password`. Deactivation is
  `profiles.is_active` (admin-only; `getMyProfile` also rejects inactive users).
- **Classes (Phase 3):** `classes` (per school year, archived via `deleted_at`), `class_teachers`,
  `enrolments` (history kept: withdraw, never delete). Composite FKs keep rows in one institution; a
  partial unique index allows one ACTIVE enrolment per student per year; a row-locking trigger enforces
  capacity. Bulk writes are `SECURITY INVOKER` RPCs (`enrol_students`, `set_class_teachers`,
  `enrolable_students`). Teachers read only the classes they teach and those students' profiles.
  Pages: `/dashboard/classes[/id]` (admin), `/teacher/classes[/id]` (read-only).
- **Schedule (Phase 4):** `subjects` (colour is a token name) and `timetable_slots` (weekday 1–6, times as
  minutes since midnight). Exclusion constraints forbid class and teacher overlaps; a composite FK to
  `class_teachers` means only assigned teachers can teach a class. `private.my_class_ids()` is the one
  SECURITY DEFINER helper that breaks the enrolments↔class_teachers policy cycle
  ([ADR 0013](docs/decisions/0013-security-definer-membership-helper.md)). Pages: `/dashboard/schedule`
  (edit), `/teacher/schedule`, `/student/schedule` (read-only). Desktop grid, phone agenda.
- **Attendance (Phase 5):** `attendance_sessions` (one per lesson per date, copies subject/time so
  timetable edits don't rewrite history) and `attendance_records`. The only write path is the
  `submit_attendance` RPC: teacher owns the lesson, not in the future, teachers within 14 days (admins
  unlimited), date matches the lesson's weekday, only enrolled students. "Today" is the institution's
  timezone (`todayIn`), never the server's. Dates are `YYYY-MM-DD` strings: format with `timeZone: 'UTC'`.
  Rate = (present + late) / (all − excused). Pages: `/teacher|dashboard/attendance[/slotId]`, `/student/attendance`.
- **Homework (Phase 6):** `homework` (teacher sets it for a class they teach: composite FK to
  `class_teachers`; soft delete, and the author keeps seeing it so it can be restored) and
  `homework_completions` (a student's own tick: they insert/delete only their own row). Student buckets:
  done / overdue / upcoming by `homeworkBucket` against the school's "today". The tick is optimistic
  (`useOptimistic`); e2e must wait for the server response before reloading.
- **Grades (Phase 7):** `exams` (drafts until `published_at`; students see only published exams and their
  OWN mark; soft delete, author keeps sight) and `grades` (a score within `[0, max_score]` or `absent`; blank =
  no row). Marks are written by `save_grades` (whole sheet, one transaction; a blank row clears). Averages are
  never stored: `weightedAverage20` normalises to /20 and weights by coefficient, absences excluded; the general
  average is the mean of subject averages. `parseScore` accepts `15,5` and `15.5`.
- **Finance (Phase 8, [ADR 0014](docs/decisions/0014-finance-rules.md)):** `fee_plans`, `invoices`, `payments`,
  gapless `F-YYYY-NNNN` / `R-YYYY-NNNN` numbers from a trigger-fed counter, and the `invoice_balances` view
  (`security_invoker`; precomputed `balance_centimes`, since PostgREST can't compare two columns). Payments are
  per invoice, overpayment is refused by `guard_payment` (authorises first, then locks the invoice), corrections
  are void-only and final. Generation (`generate_invoices`) is idempotent per (plan, class, due date). Receipts
  print from `(print)/receipt/[paymentId]`, outside the app shell. View columns are typed nullable: narrow with
  `isComplete`.
- **Communication (Phase 9):** `announcements` (audience `all|teachers|students|class`; a class notice names its class;
  admins address any audience, teachers only classes they teach and cannot pin; audience is immutable; soft
  delete, author keeps sight) with `announcement_reads` (a user marks only their own, only what they can see, via
  `mark_announcements_read`). `announcement_reach` gives readers/addressees to authors and admins. `messages` are
  one-to-one and private (not even the administration reads them): `guard_message` is `SECURITY INVOKER` and only
  lets you write to profiles you can already see, with role pairs admin↔anyone and teacher↔student. The school's
  admins are visible to every member (`profiles_select_school_admins`). `unread_counts()` feeds the nav badges and
  the bell (`getUnreadCounts` in the `(app)` layout). One form value carries audience+class (`class:<uuid>`).
  Reading marks read from a client effect (never during render); a thread re-reads every 15 s.
- **Documents (Phase 10):** `documents` rows decide who may see a file (same audiences and publish rules as
  announcements; audience and file are immutable; soft delete, the file stays in Storage) and the private
  `documents` bucket defers to them: `storage.objects` policies allow a read when the row is visible, an upload
  only into your own school's folder by admins/teachers, and a delete only of your own object that has no row.
  Objects live at `<institution_id>/<document_id>/<ascii-slug>`, tied to the row by a check constraint; the
  bucket caps size (10 MB) and file types, and `validateDocumentFile` mirrors that client-side. All `.storage`
  calls are in `packages/shared/src/documents.ts`. Downloads go through `GET /api/documents/[id]`: session check,
  RLS read of the row, then a 60 s signed URL redirect (never public). Uploads are a Server Action with the
  `File` in the FormData (`bodySizeLimit` 11 MB in `next.config.ts`); the upload dialog calls the action
  directly instead of using `ActionForm`, because React resets a form after its action and would empty the
  file picker. Seed rows are in `seed.sql`; `scripts/seed-documents.sh` (run by `dev:setup`) uploads their files,
  so after a bare `supabase db reset` run it yourself or the seeded downloads 404.
- **Settings (Phase 11):** `/dashboard/settings` edits the school profile (name, default language, time zone,
  contact; the **plan** and slug are not editable by the school), shows plan usage and the module switches.
  Plan seats live in `private.plan_limit` (essential 50 students / 5 teachers, standard 300 / 30, premium
  unlimited; `institutions.plan`, changed by the platform operator in Phase 12). `private.seats_used` counts active
  members **plus pending invitations** (SECURITY INVOKER: only the admin reaches the triggers), and
  `invitations_plan_limit` / `profiles_plan_limit` raise `plan_limit_reached` on invite and on reactivation.
  `module_access` rows switch a module off for `teacher`/`student` (no row = on). It is a visibility control only:
  `getDisabledModules` (per request, `lib/modules.ts`) hides nav items and `components/settings/module-gate.tsx`,
  mounted as `layout.tsx` in each `teacher|student/<module>` segment, replaces the page with an explanation; RLS and
  the data rules do not change. A new module must get its `ModuleGate` layout and an entry in `roleModules`.
- **Platform (Phase 12):** `/admin` (overview), `/admin/institutions[/id]` and `/admin/audit` are the operator's console
  (`super_admin` has no school: mutations use `requirePlatform()`, not `requireRole`, which insists on an institution
  claim). Plan and suspension (`institutions.deleted_at`) are changed only by a super admin: a trigger enforces it
  for API callers because column grants can't tell app roles apart. A suspended school's members get **no tenant
  claims** (the access-token hook checks the institution), so policies deny them from their next token refresh and
  sign-in answers "account disabled". `audit_log` is append-only and read-only through the API (a school admin sees
  their school's rows, the operator all); rows come from `SECURITY DEFINER` triggers in `private` (the second definer
  code after `my_class_ids`: an invoker trigger would need INSERT rights for the caller, so clients could forge
  entries). Audited: plan/suspension/profile edits, member (de)activation, payment and invoice voids, module
  switches. `platform_institutions()` is the only cross-school read (empty for anyone else).
- **Dashboards:** each role's home is composed server-side from the existing shared functions (no new queries):
  `components/home/{admin,teacher,student}-home.tsx` with `StatTile`/`Panel` from `dash-parts.tsx`. They respect module
  switches (`getDisabledModules`: a disabled module's tile/panel is dropped) and use the school's "today". A school
  with no people and no classes sees a "getting started" panel instead of zeros.
- **`private` schema:** helpers and triggers. Not exposed by the Data API.
- **Function privileges:** default EXECUTE is revoked from `public`, `anon` and `authenticated`.
  Every RPC migration must `grant execute … to authenticated` explicitly.
- **Supabase clients (web):** `lib/supabase/browser.ts` (client components),
  `lib/supabase/server.ts` (server components/actions, `server-only`), `lib/supabase/admin.ts`
  (service role, `server-only`, bypasses RLS: only for documented flows). `src/proxy.ts`
  (Next 16's middleware) handles the locale and refreshes the session with the **anon key only**.
- **Locale (web):** in the URL (`/`=fr, `/ar`, `/en`). There is no Accept-Language detection.
  Server Components read it via `next/root-params` (`getLocale()`). Do not use
  `setRequestLocale` (deprecated). Root-params don't work in Server Actions, so pass the locale
  explicitly there.
- **Locale (mobile):** device language, falling back to fr. Switching LTR↔RTL reloads the app.
- **Env:** `apps/web/src/env.ts` (public) + `env.server.ts` (`server-only`),
  `apps/mobile/src/env.ts`. All validated with zod at startup, with no fallbacks.
- **i18n types:** fr is the reference. Keys are type-checked (`next-intl` AppConfig / i18next
  CustomTypeOptions) and `pnpm i18n:check` enforces ar/en completeness.

## Absolute rules (lint or CI enforces the ones marked ⚙)

**Data & security**

1. Every table: RLS enabled in the creating migration, plus pgTAP covering SELECT/INSERT/UPDATE/DELETE
   for every role, including cross-tenant attempts. ⚙ `00_meta.test.sql` fails if any public table lacks RLS.
2. Tenant isolation = `AS RESTRICTIVE` policy `institution_id = (select private.institution_id())`
   on every tenant table. Permissive role policies go on top. Soft delete = restrictive
   `deleted_at is null` unless admin. ⚙ meta-test fails if a table with `institution_id` lacks a restrictive policy.
3. Policy helpers never query an RLS table.
4. Invariants are DB constraints (unique, check, FK on every reference).
5. Multi-row/multi-table writes = `SECURITY INVOKER` RPC in one transaction, shared by web and mobile.
   ⚙ meta-test bans SECURITY DEFINER in `public`.
6. Service role only in Edge Functions and `server-only` modules. Never in proxy/middleware, client
   bundles or `NEXT_PUBLIC_*`. ⚙ lint: only `env.server.ts` and `lib/supabase/admin.ts` may read it.
7. Edge Functions: `supabase.auth.getUser(token)`, then check the role claim.
8. Migrations are forward-only, `NNNN_` numbered, never edited after merge, never DROP COLUMN.
9. No `select('*')`. ⚙ lint.

**Shared data layer**

<!-- prettier-ignore -->
10. Apps never call `.from()`, `.rpc()` or `.storage.from()`. All query/RPC functions live in
    `packages/shared` and take a `TadrissClient` first. ⚙ lint.
11. Every client is `createClient<Database>`. ⚙ CI fails on type drift.

**Frontend**

<!-- prettier-ignore -->
12. No hardcoded UI strings (JSX text and `placeholder/alt/title/aria-label/label`). ⚙ lint + `i18n:check`.
13. No hardcoded colours (hex, rgb(), hsl(), oklch()). Use tokens. ⚙ lint.
14. Logical CSS only (`ps/pe`, `ms/me`, `start/end`, `border-s/e`, `text-start`). ⚙ lint.
15. Responsive at 375/768/1280. Navigation is reachable at 375 px via a menu. ⚙ Playwright.
16. Server actions: zod-validate → `getUser()` → role/institution from claims → shared fn →
    `revalidatePath` → `Result<T>` (`{ ok: true, data } | { ok: false, error: ErrorCode }`).
    Independent fetches use `Promise.all`.
17. Feedback within 100 ms (pending/spinner/optimistic). Every list has empty, loading and error states.
    Put `loading.tsx` on data segments, **not** at `[locale]` root: a root Suspense boundary
    makes `notFound()` return HTTP 200.

**Config & ops**

<!-- prettier-ignore -->
18. No env fallbacks. `NEXT_PUBLIC_APP_URL` is required.
19. Seed is deterministic. Seed credentials are in `supabase/seed/README.md`.
20. CI: lint → i18n → types → unit → supabase start → db reset → pgTAP → type drift →
    Playwright on `next build` → mobile bundle → Vercel preview. Merging to `main`: `supabase db push`,
    then functions, then web.

## Design system

"Courtyard Studio" ([ADR 0011](docs/decisions/0011-visual-direction-selection.md)). The production identity merges
warm editorial typography with contemporary Maghreb architecture and a cinematic product stage. Reuse, don't restyle:

- **Components:** `apps/web/src/components/ui/`: `Button`/`ButtonLink` (variants: primary, secondary,
  ghost, ink, accent; built-in `pending`), `Card`, `Badge` (tones), `Field`/`Label`/`Input`/`FieldError`,
  `Logo`/`Mark`, `ZelligePattern`, `Spinner`, `cx()`.
- **Type utilities:** `.display` (Fraunces, for headings only), `.eyebrow` (mono caps). Numbers,
  amounts and times use `font-mono tabular-nums`.
- **Tokens:** `bg-background/surface/surface-muted`, `text-text/text-muted`, `primary`, `accent`, `ink`,
  status `success|warning|danger|info` + `-soft`, `shadow-xs…lg`. New colours go in
  `packages/ui-tokens/src/tokens.ts` and must pass the contrast test.
- **App shell:** `components/app-shell` (sidebar + drawer + topbar). Pass `nav="admin"` by **name**:
  icons and zod schemas are not serialisable across the server→client boundary.
- **Design reference:** `/design` (dev and Vercel preview only, 404 in production) shows the shell and
  a sample dashboard.
- **Copy:** French uses a narrow no-break space before `: ; ? !`. ICU numbers are `{value, number}`.

## Gotchas

- Dialog forms: never change the form's height between a field's blur and the click that caused it
  (server alerts must not vanish on blur-validation; `FieldError` reserves its line), or the submit button
  slides away and the click is lost. A toast that must survive the form unmounting after `revalidatePath`
  (e.g. voiding removes the very button) is fired from a wrapper around the action, not from `onDone`.
- Supabase blocks raw `delete from storage.objects` unless `storage.allow_delete_query` is set (pgTAP does so); the
  Storage API sets it itself. A storage DELETE policy also needs a matching SELECT policy to see the row.
- Specs that change what a whole role or school sees (`settings-modules`, `platform`) only run in the `modules`
  Playwright project, after all width projects. A full e2e run mutates the seed (some specs are not
  idempotent): `supabase db reset` + `scripts/seed-documents.sh` before re-running it.
- An API upsert (`on conflict do update`) needs UPDATE rights on every column it sets, so tables with narrow column
  grants get an RPC instead (`set_module_access`). Optimistic switches/toggles move before the server saved: e2e
  must wait for the toast before navigating.
- Never run `next dev` (preview) while the e2e production build runs: they share `.next` and everything times out.
- Generation-style e2e tests must use run-unique inputs (idempotent RPCs bill nobody the second time).

- Visual snapshots are Linux-only. Regenerate them with the **Update visual baselines** workflow,
  never on a Mac ([ADR 0008](docs/decisions/0008-visual-baselines-on-linux.md)).
- Mobile needs `react-native-css-interop` as a direct dependency (pnpm isolated layout + NativeWind).
- `fr-MA` number format groups with a dot: `1.250,50 MAD`.
- Don't pass functions or class instances (Lucide icons, zod schemas) from Server to Client
  Components. Pass a name and resolve it client-side. This only fails at runtime, so e2e covers every page.
- `turbo` rewrites the managed block in `AGENTS.md`. Leave it.
- On this Mac, the Homebrew `docker` CLI can't find Docker Desktop's credential helper, so prefix
  Supabase commands with `PATH=/Applications/Docker.app/Contents/Resources/bin:$PATH`.
- User-supplied names (schools, people) can be in either script: render them with `dir="auto"`,
  and wrap interpolated values in `<bdi>` (`t.rich(..., { n: (c) => <bdi>{c}</bdi> })`).
- Nav items for modules that aren't built yet stay `available: false` (disabled "Bientôt" pill).
  Flip the flag in the same PR that ships the module. Never add a dead link.
- Sign-out is **local** (this device only; `signOut` in `@tadriss/shared`). e2e specs that mutate data still
  use their own seeded account (`admin2@almanar.test`) so parallel specs don't share one account's state.
- GoTrue's invite inserts the user, then sets `invited_at` in a later UPDATE: provisioning must hook both.
- Port 3100 may be held by another tool: run e2e with `E2E_PORT=3190 pnpm test:e2e`. Invite emails
  are read from Mailpit (`http://127.0.0.1:54324`) in tests.
- New RPCs must `revoke execute … from public, anon` as well as grant to `authenticated`: PUBLIC holds
  EXECUTE by default and the schema-level default privilege cannot undo it (the meta pgTAP fails otherwise).
- BEFORE triggers run ahead of RLS checks: raise `42501` for rows the caller cannot see, not a domain error.
- `notFound()` under `(app)` still answers HTTP 200 (the loading boundary streams first). Use a route-level
  `not-found.tsx` for an in-shell page and assert on its heading, not the status.
- Nav active state uses `matchNav` (most specific prefix), so nested routes don't light up `/dashboard`.
- Postgres applies SELECT policies (incl. restrictive soft-delete ones) to the NEW row of an UPDATE: a soft
  delete only works for roles that can still see the deleted row. Use `update(..., {count: 'exact'})` without
  `.select()` for soft deletes, since the returned row is no longer visible.
- Page roots use `grid grid-cols-1`: an implicit `auto` grid column grows to its widest child's min-content
  and stretches the whole page on phones. `e2e/layout.spec.ts` asserts no page overflows at 375px.
- Validate-on-blur must not move the layout: `FieldError` always reserves its line, or a tap on the submit
  button (the thing that blurred the field) lands on something else and is lost.
- Long dialogs need `max-h` + `overflow-y-auto` (already in `Dialog`), or the title is clipped on phones.
- Toolchain pins and their reasons: [ADR 0006](docs/decisions/0006-toolchain-versions.md).
