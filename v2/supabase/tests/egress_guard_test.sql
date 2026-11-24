-- Verifies 20261124130000_hunt_egress_budget_guard.sql. Raises on failure.
-- Precondition (CI script): stub schemas, the 2026-11-19 watchdog migration,
-- snapshot of cron.job into cron_before, then this PR's migration (twice).
create or replace function pg_temp.check(ok boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(ok, false) then raise exception 'FAILED: %', msg; end if; end $$;

-- 1. Applying the migration changed no cron job and kept the suspension.
select pg_temp.check(not exists (
  select 1 from cron.job j join public.cron_before b using (jobid)
  where j.schedule is distinct from b.schedule or j.active is distinct from b.active), 'migration altered cron jobs');
select pg_temp.check((select suspended from hunt_ops.quota_control), 'still suspended');
select pg_temp.check(not exists (select 1 from cron.job where command like '%functions/v1/%' and active), 'no scanner active');

-- 2. Cron arithmetic.
select pg_temp.check(hunt_ops.cron_runs_per_day('*/5 * * * *') = 288, '*/5');
select pg_temp.check(hunt_ops.cron_runs_per_day('3,13,23,33,43,53 * * * *') = 144, 'list');
select pg_temp.check(hunt_ops.cron_runs_per_day('43 */3 * * *') = 8, '*/3 hours');
select pg_temp.check(hunt_ops.cron_runs_per_day('25 3 * * *') = 1, 'daily');
select pg_temp.check(hunt_ops.cron_runs_per_day('0-30/10 1-2 * * *') = 8, 'range/step');
select pg_temp.check((select count(*) from hunt_ops.scan_levels) = 52, '13 jobs x 4 levels');

-- 3. While HTTP 402 persists, the watchdog keeps everything paused.
insert into net._http_response(id, status_code) values (-1, 402);
select hunt_ops.quota_watchdog();
select hunt_ops.quota_watchdog();
select pg_temp.check((select suspended from hunt_ops.quota_control), 'suspended under 402');
select pg_temp.check(not exists (select 1 from cron.job where command like '%functions/v1/%' and active), 'paused under 402');

-- 4. Recovery: two successful probes and no 402 for 40 minutes => economy, not full speed.
update net._http_response set created = now() - interval '2 hours';
insert into net._http_response(id, status_code) select last_probe_id, 200 from hunt_ops.quota_control;
select hunt_ops.quota_watchdog();
select pg_temp.check((select suspended from hunt_ops.quota_control), 'one success is not enough');
insert into net._http_response(id, status_code) select last_probe_id, 200 from hunt_ops.quota_control;
select hunt_ops.quota_watchdog();
select pg_temp.check(not (select suspended from hunt_ops.quota_control), 'resumed after two successes');
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'economy', 'restart level economy');
select pg_temp.check((select ramp_started_at is not null from hunt_ops.scan_control), 'ramp started');
select pg_temp.check((select schedule from cron.job where jobname = 'hunt-ats-board-scan-5m') = '*/15 * * * *', 'ATS every 15 min during ramp');
select pg_temp.check((select count(*) from cron.job j join hunt_ops.scan_levels l on l.jobname = j.jobname and l.level = 'economy'
  where j.active and j.schedule = l.schedule) = 13, 'all 13 scanners at economy');
select pg_temp.check(not (select active from cron.job where jobname = 'hunt-experimental-unreviewed-5m'), 'unreviewed job never enabled');

-- 5. Usage ledger is writable by service_role only.
set role service_role;
select public.hunt_record_function_usage('hunt-ats-board-scan', 12345, 4, 200, 900);
reset role;
select pg_temp.check((select bytes from hunt_ops.function_usage_hourly where function_name = 'hunt-ats-board-scan') = 12345, 'ledger write');
select pg_temp.check(not has_function_privilege('anon', 'public.hunt_record_function_usage(text,bigint,integer,integer,integer)', 'execute'), 'anon cannot write ledger');
select pg_temp.check(not has_function_privilege('authenticated', 'public.hunt_record_function_usage(text,bigint,integer,integer,integer)', 'execute'), 'users cannot write ledger');
do $$ begin
  begin perform public.hunt_record_function_usage('not-hunt', 1, 1, 200, 1); raise exception 'accepted bad name';
  exception when others then if sqlerrm = 'accepted bad name' then raise; end if; end;
end $$;
delete from hunt_ops.function_usage_hourly;

-- 6. Budget decisions on a simulated clock (cheap measured runs: 20 KB each).
-- Seeds p_hours of hourly buckets ending just before p_now (4 runs per hour
-- per function). p_empty marks the runs as 0-byte/0-request (broken meter).
create or replace function pg_temp.seed_before(p_now timestamptz, p_hours int, p_bytes_per_run bigint,
  p_empty boolean default false, p_only text default null) returns void language sql as $$
  insert into hunt_ops.function_usage_hourly(bucket, function_name, bytes, requests, runs, empty_runs)
  select date_trunc('hour', p_now) - make_interval(hours => h), f, p_bytes_per_run * 4,
         case when p_empty then 0 else 8 end, 4, case when p_empty then 4 else 0 end
  from generate_series(1, p_hours) h, (select distinct function_name f from hunt_ops.scan_levels) fs
  where p_only is null or f = p_only
  on conflict (bucket, function_name) do update set bytes = excluded.bytes, runs = excluded.runs,
    requests = excluded.requests, empty_runs = excluded.empty_runs;
$$;
create temp table clock as select (select ramp_started_at from hunt_ops.scan_control) as t0;
select pg_temp.seed_before((select t0 + interval '3 hours' from clock), 4, 20000);

-- 6a. Inside the first 24 hours the ramp caps at economy even if fast would fit.
select pg_temp.check(hunt_ops.egress_guard_decide((select t0 + interval '3 hours' from clock))->>'to' = 'economy', 'ramp cap economy');
-- 6b. After 24h: one step up to balanced.
select pg_temp.seed_before((select t0 + interval '25 hours' from clock), 4, 20000);
select hunt_ops.egress_guard_tick((select t0 + interval '25 hours' from clock));
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'balanced', 'balanced after 24h');
select pg_temp.check((select schedule from cron.job where jobname = 'hunt-ats-board-scan-5m') = '*/10 * * * *', 'ATS every 10 min');
-- 6c. After 48h (and cooldown) the target 5-minute level is reached when it fits.
select pg_temp.seed_before((select t0 + interval '50 hours' from clock), 4, 20000);
select hunt_ops.egress_guard_tick((select t0 + interval '50 hours' from clock));
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'fast', 'fast after 48h with measured low usage');
select pg_temp.check((select schedule from cron.job where jobname = 'hunt-ats-board-scan-5m') = '*/5 * * * *', 'ATS every 5 min');
select pg_temp.check((select schedule from cron.job where jobname = 'hunt-match-refresh-5m') = '3,13,23,33,43,53 * * * *', 'matching every 10 min');

-- 6d. Expensive measured runs: fast no longer fits => step down immediately.
select pg_temp.seed_before((select t0 + interval '50 hours 30 minutes' from clock), 4, 400000);
select hunt_ops.egress_guard_tick((select t0 + interval '50 hours 30 minutes' from clock));
select pg_temp.check((select rank from hunt_ops.scan_level_rank r join hunt_ops.scan_control c on c.current_level = r.level) < 4, 'downgrade on expensive runs');

-- 6e. Daily allowance consumed => pause until the next UTC day, then restart at economy at most.
delete from hunt_ops.function_usage_hourly;
insert into hunt_ops.function_usage_hourly(bucket, function_name, bytes, runs)
  values (date_trunc('day', (select t0 + interval '3 days' from clock)) + interval '1 hour', 'hunt-ats-board-scan', 96000000, 4800);
select hunt_ops.egress_guard_tick((select date_trunc('day', t0 + interval '3 days') + interval '20 hours' from clock));
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'paused', 'pause at daily allowance');
select pg_temp.check(not exists (select 1 from cron.job where command like '%functions/v1/%' and active), 'scanners off when paused');
select pg_temp.seed_before((select date_trunc('day', t0 + interval '4 days') + interval '2 hours' from clock), 2, 20000);
select hunt_ops.egress_guard_tick((select date_trunc('day', t0 + interval '4 days') + interval '2 hours' from clock));
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'economy', 'next day restart at economy');

-- 6f. Real observed egress 4x the estimate lowers what the guard allows.
delete from hunt_ops.function_usage_hourly;
select pg_temp.seed_before((select date_trunc('day', t0 + interval '6 days') from clock), 24, 60000);
select pg_temp.seed_before((select date_trunc('day', t0 + interval '6 days') + interval '3 hours' from clock), 3, 60000);
create temp table before_cal as select hunt_ops.egress_guard_decide((select date_trunc('day', t0 + interval '6 days') + interval '3 hours' from clock)) d;
select hunt_ops.record_observed_egress((select (t0 + interval '5 days')::date from clock),
  (select sum(bytes) from hunt_ops.function_usage_hourly where bucket < (select date_trunc('day', t0 + interval '6 days') from clock)) * 4 / 1000000.0,
  'test: dashboard daily bar');
create temp table after_cal as select hunt_ops.egress_guard_decide((select date_trunc('day', t0 + interval '6 days') + interval '3 hours' from clock)) d;
select pg_temp.check(((select d from after_cal)#>>'{status,estimate,calibration_factor}')::numeric > 3, 'calibration factor from observed');
select pg_temp.check(((select d from after_cal)#>>'{status,estimate,used_today_bytes}')::numeric
  > ((select d from before_cal)#>>'{status,estimate,used_today_bytes}')::numeric * 3, 'estimates corrected upward');
select pg_temp.check((select d->'status'->'observed'->'latest'->>'source' from after_cal) like 'test:%', 'observed kept separate');

-- 8. Telemetry protection: missing, zero, stale, implausible or incomplete
--    measurements must never be read as "cheap" and never unlock faster levels.
create or replace function pg_temp.reset_guard(p_now timestamptz) returns void language sql as $$
  delete from hunt_ops.function_usage_hourly;
  delete from cron.job_run_details;
  update hunt_ops.scan_control set current_level = 'balanced', level_since = p_now - interval '10 hours', ramp_started_at = null;
$$;
create or replace function pg_temp.rank_of(p_level text) returns int language sql as
  $$ select rank from hunt_ops.scan_level_rank where level = p_level $$;
create temp table tclock as select (select t0 + interval '10 days' from clock) as t;

-- 8a. Control: trusted, cheap, fresh telemetry => one step up to fast.
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t from tclock), 6, 20000);
create temp table d8a as select hunt_ops.egress_guard_decide((select t from tclock)) d;
select pg_temp.check((select d->>'to' from d8a) = 'fast', 'trusted cheap telemetry reaches fast: ' || (select d->>'reason' from d8a));
select pg_temp.check(jsonb_array_length((select d#>'{status,telemetry,untrusted_functions}' from d8a)) = 0, 'all trusted');

-- 8b. Meter reports 0 bytes / 0 requests on every run (the bug a plain average would hide).
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t from tclock), 6, 0, true);
create temp table d8b as select hunt_ops.egress_guard_decide((select t from tclock)) d;
select pg_temp.check(pg_temp.rank_of((select d->>'to' from d8b)) <= 2, 'zero-byte telemetry never above economy: ' || (select d->>'to' from d8b));
select pg_temp.check(hunt_ops.function_bytes_per_run('hunt-ats-board-scan', (select t from tclock)) = 250000, 'zero bytes => conservative default per run');
select pg_temp.check((select (d#>'{status,telemetry,functions}')->0->'reasons' from d8b) ? 'empty_runs', 'empty runs reported');

-- 8c. A few zero-byte runs mixed in (above 10 %) also distrust that function.
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t from tclock), 6, 20000);
update hunt_ops.function_usage_hourly set empty_runs = 1, bytes = bytes * 3 / 4
  where function_name = 'hunt-ats-board-scan';
select pg_temp.check(not (hunt_ops.function_telemetry('hunt-ats-board-scan', (select t from tclock))->>'trusted')::boolean, '25 % empty runs distrusted');
select pg_temp.check(pg_temp.rank_of(hunt_ops.egress_guard_decide((select t from tclock))->>'to') <= 2, 'one untrusted function caps economy');

-- 8d. Whole meter silent for > 3 hours while scanners run => minimal.
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t - interval '4 hours' from tclock), 6, 20000);
-- Even with a cheap default (so projections alone would allow fast), a silent
-- meter must force minimal.
update hunt_ops.budget_config set default_run_bytes = 1000;
create temp table d8d as select hunt_ops.egress_guard_decide((select t from tclock)) d;
update hunt_ops.budget_config set default_run_bytes = 250000;
select pg_temp.check((select d->>'to' from d8d) = 'minimal', 'silent meter => minimal');
select pg_temp.check((select (d#>>'{status,telemetry,meter_silent}')::boolean from d8d), 'meter_silent flagged');

-- 8e. One function stale (no record for 4h), others fresh => economy cap.
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t from tclock), 6, 20000);
delete from hunt_ops.function_usage_hourly where function_name = 'hunt-global-news' and bucket > (select t - interval '4 hours' from tclock);
select pg_temp.check((hunt_ops.function_telemetry('hunt-global-news', (select t from tclock))->'reasons') ? 'stale', 'stale detected');
select pg_temp.check(pg_temp.rank_of(hunt_ops.egress_guard_decide((select t from tclock))->>'to') <= 2, 'stale function caps economy');

-- 8f. Implausibly small runs (10 bytes) are not trusted.
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t from tclock), 6, 20000);
select pg_temp.seed_before((select t from tclock), 6, 10, false, 'hunt-match-refresh');
select pg_temp.check((hunt_ops.function_telemetry('hunt-match-refresh', (select t from tclock))->'reasons') ? 'implausible_bytes', 'implausible detected');
select pg_temp.check(hunt_ops.function_bytes_per_run('hunt-match-refresh', (select t from tclock)) = 250000, 'implausible => default');

-- 8g. pg_cron dispatched far more runs than the meter recorded (crashes,
--     timeouts or a failing ledger) => distrusted, and today's usage is
--     estimated from dispatched runs, not only from what was metered.
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t from tclock), 6, 20000);
insert into cron.job_run_details(jobid, status, start_time)
select j.jobid, 'succeeded', (select t from tclock) - make_interval(mins => 5 * g)
from cron.job j, generate_series(3, 72) g where j.jobname = 'hunt-ats-board-scan-5m';
create temp table d8g as select hunt_ops.egress_guard_decide((select t from tclock)) d;
select pg_temp.check((hunt_ops.function_telemetry('hunt-ats-board-scan', (select t from tclock))->'reasons') ? 'missing_runs_vs_cron', 'missing runs vs cron detected');
select pg_temp.check(pg_temp.rank_of((select d->>'to' from d8g)) <= 2, 'missing runs cap economy');
select pg_temp.check(((select d#>>'{status,estimate,dispatch_based_today_bytes}' from d8g))::numeric > 0, 'dispatch-based estimate computed');
select pg_temp.check((select jsonb_array_length(d#>'{status,not_measured}') from d8g) = 3, 'unmeasured traffic listed');
delete from cron.job_run_details;

-- 7. A new 402 while running suspends everything again.
insert into net._http_response(id, status_code) values (-2, 402);
update hunt_ops.quota_control set suspended = false;
select hunt_ops.quota_watchdog();
select pg_temp.check((select suspended from hunt_ops.quota_control), 'suspended again on 402');
select pg_temp.check(not exists (select 1 from cron.job where command like '%functions/v1/%' and active), 'all paused on 402');
-- 9. Unattended alerts (read by .github/workflows/hunt-supabase-guard.yml).
set role anon;
create temp table a9 as select public.hunt_egress_alert() a;
reset role;
select pg_temp.check((select a->'alerts' from a9) ? 'quota_402_suspended', '402 suspension alerted to the public check');
select pg_temp.check(not has_schema_privilege('anon', 'hunt_ops', 'usage'), 'anon cannot reach hunt_ops');
select pg_temp.check((select count(*) from jsonb_object_keys((select a from a9))) <= 6, 'alert exposes only a few fields');
update hunt_ops.scan_control set alert_at = now() - interval '2 hours';
select pg_temp.check(public.hunt_egress_alert()->'alerts' ? 'watchdog_not_running', 'stopped watchdog detected');
-- Running state (not suspended) on the simulated clock.
update hunt_ops.quota_control set suspended = false, resumed_at = (select t - interval '48 hours' from tclock);
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t from tclock), 6, 20000);
delete from hunt_ops.observed_egress;
create temp table a9ok as select hunt_ops.compute_alert((select t from tclock)) a;
select pg_temp.check((select (a->>'ok')::boolean from a9ok), 'healthy guard => ok: ' || (select a::text from a9ok));
select pg_temp.check((select a->'info' from a9ok) ? 'no_recent_observed_egress', 'missing real data reported as info');
select pg_temp.reset_guard((select t from tclock));
select pg_temp.seed_before((select t - interval '4 hours' from tclock), 6, 20000);
create temp table a9bad as select hunt_ops.compute_alert((select t from tclock)) a;
select pg_temp.check((select a->'alerts' from a9bad) ? 'meter_silent', 'silent meter alerted');
select pg_temp.check((select a->'alerts' from a9bad) ? 'telemetry_untrusted', 'untrusted telemetry after 24h alerted');
update hunt_ops.scan_control set current_level = 'paused';
select pg_temp.check(hunt_ops.compute_alert((select t from tclock))->'alerts' ? 'budget_pause', 'budget pause alerted');
insert into hunt_ops.observed_egress(day, uncached_egress_bytes, source)
  values (((select t from tclock) at time zone 'UTC')::date - 1, 4000000000, 'test: high cycle usage');
select pg_temp.check(hunt_ops.compute_alert((select t from tclock))->'alerts' ? 'cycle_usage_high', 'cycle usage >= 70 % alerted');

select 'egress guard SQL tests passed' as result;
