# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Tadriss (تدريس — "teaching") is a multi-tenant school management SaaS for private institutions in Morocco. Three roles: `institution_admin`, `teacher`, `student`. Each user belongs to exactly one institution, enforced via Supabase RLS using JWT `app_metadata`.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Web**: Next.js 16 (App Router, standalone output), React 19, Tailwind CSS v4, TypeScript
- **Mobile**: Expo 52, React Native 0.76, NativeWind, Expo Router
- **Backend**: Supabase (Postgres 17, Auth, RLS, Edge Functions in Deno)
- **Shared**: `packages/shared/` — Zod validators, constants, DB types, query helpers
- **i18n**: next-intl (fr/ar/en), RTL support for Arabic
- **Deploy**: Oracle Cloud Linux → Nginx (port 3000) → PM2 (port 3001)

## Common Commands

```bash
pnpm run dev:web              # Next.js dev server (Turbopack)
pnpm run dev:mobile           # Expo dev server
pnpm run build                # Build all apps
pnpm run lint                 # ESLint all packages
pnpm run type-check           # TypeScript check all packages
pnpm run db:gen-types         # Regenerate Supabase TypeScript types

# Database (always push DB before deploying app code)
npx supabase db push --include-all --project-ref <ref>
npx supabase functions deploy --project-ref <ref>

# Deploy
./deploy_to_oracle.sh
```

## Architecture

### Route Structure (apps/web/src/app/)

Routes are organized by role using Next.js route groups:

- `(auth)/` — public: login, signup, reset-password
- `(dashboard)/dashboard/` — admin routes (classes, students, teachers, attendance, homework, payments, settings)
- `(dashboard)/teacher/` — teacher routes (classes, attendance, homework)
- `(dashboard)/student/` — student routes (classes, attendance, homework, payments)
- `auth/callback` — OAuth redirect handler

Post-login redirects: `institution_admin` → `/dashboard`, `teacher` → `/teacher`, `student` → `/student`

### Auth & Multi-tenancy

- JWT `app_metadata` carries `institution_id` and `role` — set at user creation by the `onboard-institution` Edge Function
- RLS helper functions: `get_institution_id()` and `get_user_role()` extract from JWT (zero-query)
- If these return NULL, all RLS policies fail silently — fix the Edge Function that creates the user
- Supabase clients: `client.ts` (browser), `server.ts` (server components + actions), `admin.ts` (service role, bypasses RLS)
- Middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`): refreshes session, handles locale, redirects by role

### Server Actions (apps/web/src/app/actions/)

All server actions follow this pattern: validate input → verify auth → get `institution_id` from DB profile (never from form) → execute scoped to institution → try/catch → `revalidatePath`. Return type: `{ success: boolean; error?: string; data?: T }`.

### Edge Functions (supabase/functions/)

Deno TypeScript. Key functions: `onboard-institution` (signup flow), `create-user` (admin invites), `dashboard-stats` (aggregated stats), `generate-receipt`, `void-payment`.

### Shared Package (packages/shared/)

Exports: Zod validators (institution, profile, class, attendance, homework, payment schemas), role/status constants, Supabase generated types, query helpers for all tables.

## Absolute Rules

### Security
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never in client components, never `NEXT_PUBLIC_` prefixed
- `institution_id` always comes from server-side profile query — never from formData or request body
- Edge Functions verify JWT via `supabase.auth.getUser(token)` — never decode manually
- RLS must be enabled on every table

### Database
- Never DROP a column — add new, migrate data, deprecate old
- Every new table needs RLS enabled + policies in the same migration
- Migration files numbered sequentially: `00001_`, `00002_`, etc.
- Always push DB before deploying app code

### Frontend
- Zero hardcoded hex colors — use CSS variables or Tailwind tokens
- Logical CSS only: `ps/pe` not `pl/pr`, `ms/me` not `ml/mr`, `border-s/e` not `border-l/r` (RTL support)
- No `select('*')` in production queries — always name columns explicitly
- Parallel data fetching with `Promise.all` — never sequential awaits for independent queries
- `revalidatePath` after every mutation
- `@/` path aliases — never relative imports like `../../`

## Design System

- **Fonts**: Plus Jakarta Sans (headings), DM Sans (body), JetBrains Mono (numbers), Noto Kufi/Sans Arabic (Arabic)
- **Icons**: Material Symbols Outlined
- **Dark mode**: next-themes, class-based
- **Color tokens**: CSS variables (`--primary-raw`, `--text-raw`, etc.) with soft variants for status colors
- **Spacing**: Card padding `p-6`, page padding `px-6 md:px-12 py-8`, input height `h-11`, page header `mb-8`

## Deploy Procedure

Always in this order:
1. `npx supabase db push` (if migrations changed)
2. `npx supabase functions deploy` (if Edge Functions changed)
3. `pnpm run type-check && pnpm run lint && pnpm run build` (all must pass)
4. `./deploy_to_oracle.sh`
5. Verify: `ssh user@84.8.223.50 "pm2 logs tadriss-web --lines 30 --nostream"`
