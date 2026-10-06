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

- **Auth claims:** `role` and `institution_id` are set in the JWT by the Custom Access Token
  Hook (Phase 1), which reads `profiles`. RLS helpers `private.institution_id()` and
  `private.user_role()` read **only** `auth.jwt()` and never a table ([ADR 0007](docs/decisions/0007-rls-helpers-in-private-schema.md)).
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

"Zellige & Ink" ([ADR 0009](docs/decisions/0009-visual-identity.md)). Reuse, don't restyle:

- **Components:** `apps/web/src/components/ui/`: `Button`/`ButtonLink` (variants: primary, secondary,
  ghost, ink, accent; built-in `pending`), `Card`, `Badge` (tones), `Field`/`Label`/`Input`/`FieldError`,
  `Logo`/`Mark`, `ZelligePattern`, `Spinner`, `cx()`.
- **Type utilities:** `.display` (Fraunces, for headings only), `.eyebrow` (brass mono caps). Numbers,
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

- Visual snapshots are Linux-only. Regenerate them with the **Update visual baselines** workflow,
  never on a Mac ([ADR 0008](docs/decisions/0008-visual-baselines-on-linux.md)).
- Mobile needs `react-native-css-interop` as a direct dependency (pnpm isolated layout + NativeWind).
- `fr-MA` number format groups with a dot: `1.250,50 MAD`.
- Don't pass functions or class instances (Lucide icons, zod schemas) from Server to Client
  Components. Pass a name and resolve it client-side. This only fails at runtime, so e2e covers every page.
- `turbo` rewrites the managed block in `AGENTS.md`. Leave it.
- Toolchain pins and their reasons: [ADR 0006](docs/decisions/0006-toolchain-versions.md).
