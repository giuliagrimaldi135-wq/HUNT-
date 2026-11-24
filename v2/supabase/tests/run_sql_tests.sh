#!/usr/bin/env bash
# Runs HUNT SQL migration tests on an empty PostgreSQL (psql connection via PG* env vars).
set -euo pipefail
cd "$(dirname "$0")/../../.."
q(){ psql -v ON_ERROR_STOP=1 -q -X "$@"; }
q -f v2/supabase/tests/stub_supabase_schema.sql
q -f v2/supabase/tests/stub_cron_net.sql
# Production state before this work: the 2026-11-19 quota watchdog.
q -f v2/supabase/migrations/20261119151000_hunt_quota_watchdog_and_safe_scanning.sql
q -c "create table public.cron_before as select jobid, schedule, active from cron.job"
for m in v2/supabase/migrations/20261124120000_hunt_incremental_matching_state.sql \
         v2/supabase/migrations/20261124130000_hunt_egress_budget_guard.sql; do
  [ -f "$m" ] || continue
  q -f "$m"; q -f "$m"   # idempotent
done
q -f v2/supabase/tests/incremental_matching_test.sql
[ -f v2/supabase/tests/egress_guard_test.sql ] && q -f v2/supabase/tests/egress_guard_test.sql
echo "All HUNT SQL tests passed"
