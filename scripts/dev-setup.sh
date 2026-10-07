#!/usr/bin/env bash
# One command to a working local stack: Supabase (Docker) + migrations + deterministic seed
# + app env files. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v docker >/dev/null && docker info >/dev/null 2>&1 || {
  echo "✗ Docker is not running. Start Docker Desktop / OrbStack and retry." >&2; exit 1; }

pnpm tokens:build
pnpm exec supabase start
pnpm exec supabase db reset

eval "$(pnpm exec supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"

./scripts/seed-documents.sh

cat > apps/web/.env.local <<ENV
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
ENV

cat > apps/mobile/.env.local <<ENV
EXPO_PUBLIC_APP_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=${API_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
ENV

echo "✓ Local stack ready. Studio: http://127.0.0.1:54323 — seed accounts: supabase/seed/README.md"
