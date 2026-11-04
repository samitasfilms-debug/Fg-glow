#!/usr/bin/env bash
# Recreates the throwaway e2e database: Supabase stub + all migrations + fixtures.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${E2E_DB:-fgg_e2e}
psql -q -c "drop database if exists $DB with (force)" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/tests/00_local_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"; done
if [ "${1:-}" = "--accounts-only" ]; then
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f e2e/seed-accounts.sql   # empty salon: only the two test logins
else
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f e2e/seed-accounts.sql -f e2e/seed.sql
fi
echo "e2e database $DB ready"
