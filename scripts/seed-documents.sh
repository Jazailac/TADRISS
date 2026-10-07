#!/usr/bin/env bash
# Uploads the files behind the documents seeded in supabase/seed/seed.sql (SQL cannot write Storage
# bytes). Each file's content is "<title>\n", matching the seeded `size_bytes`. Safe to re-run (upsert).
# Needs a running local stack; reads the local API URL and service key from `supabase status`.
set -euo pipefail
cd "$(dirname "$0")/.."

eval "$(pnpm exec supabase status -o env | grep -E '^(API_URL|SERVICE_ROLE_KEY)=')"
INST=10000000-0000-4000-8000-000000000001

upload() { # id file title
  printf '%s\n' "$3" | curl -fsS -X POST \
    "${API_URL}/storage/v1/object/documents/${INST}/$1/$2" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: text/plain" -H "x-upsert: true" \
    --data-binary @- >/dev/null
}

upload 10000000-0000-4000-8000-000000000b01 reglement-interieur.txt "Règlement intérieur"
upload 10000000-0000-4000-8000-000000000b02 calendrier-2026-2027.txt "Calendrier scolaire 2026-2027"
upload 10000000-0000-4000-8000-000000000b03 circulaire-evaluations.txt "Circulaire : évaluations du premier trimestre"
upload 10000000-0000-4000-8000-000000000b04 fiche-fractions.txt "Fiche de révision : les fractions"
echo "✓ Seed documents uploaded"
