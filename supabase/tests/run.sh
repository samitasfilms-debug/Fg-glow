#!/usr/bin/env bash
# Runs the SQL test-suite against a throwaway local PostgreSQL (16+).
# Usage: PGHOST=/tmp/pgc PGPORT=54322 PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-fgg_test}
psql -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f tests/00_local_supabase_stub.sql
for f in migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"; done
psql -X -v ON_ERROR_STOP=1 -q -t -A -d "$DB" -f tests/01_booking_engine.test.sql 2>&1 | grep -v "^$" | sed "s/^psql:[^ ]* //"
