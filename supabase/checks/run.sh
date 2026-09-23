#!/usr/bin/env bash
# Applies the migrations and seed to a throwaway Postgres + PostGIS and runs the
# behavior checks. Needs: brew install postgresql@17 postgis
set -euo pipefail

PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
PORT="${PORT:-54399}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DATA="$(mktemp -d)"

cleanup() {
  "$PG_BIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$DATA"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k '' -c listen_addresses=localhost" -l "$DATA/log" -w start >/dev/null

psql() { "$PG_BIN/psql" -h localhost -p "$PORT" -U postgres -q -X "$@"; }

psql -v ON_ERROR_STOP=1 -f "$ROOT/supabase/checks/supabase_stubs.sql" >/dev/null
for migration in "$ROOT"/supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
done
psql -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed.sql" >/dev/null

# `|| true`: a SQL error in a check stops psql, but we still want every
# result printed; the ERROR line makes the run fail below.
results="$( (psql -f "$ROOT/supabase/checks/schema_checks.sql" 2>&1 || true) | sed -n 's/.*NOTICE:  //p; s/.*ERROR:  /ERROR /p')"
echo "$results"

if grep -qE '^(FAIL|ERROR)' <<<"$results"; then
  echo "Some checks failed." >&2
  exit 1
fi
echo "All $(grep -c '^PASS' <<<"$results") checks passed."
