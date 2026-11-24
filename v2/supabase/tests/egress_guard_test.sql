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
create or replace function pg_temp.seed_usage(p_from timestamptz, p_hours int, p_bytes_per_run bigint) returns void language sql as $$
  insert into hunt_ops.function_usage_hourly(bucket, function_name, bytes, requests, runs)
  select date_trunc('hour', p_from) + make_interval(hours => h), f, p_bytes_per_run * 4, 8, 4
  from generate_series(0, p_hours - 1) h, (select distinct function_name f from hunt_ops.scan_levels) fs
  on conflict (bucket, function_name) do update set bytes = excluded.bytes, runs = excluded.runs;
$$;
create temp table clock as select (select ramp_started_at from hunt_ops.scan_control) as t0;
select pg_temp.seed_usage((select t0 from clock) - interval '4 hours', 4, 20000);

-- 6a. Inside the first 24 hours the ramp caps at economy even if fast would fit.
select pg_temp.check(hunt_ops.egress_guard_decide((select t0 + interval '3 hours' from clock))->>'to' = 'economy', 'ramp cap economy');
-- 6b. After 24h: one step up to balanced.
select hunt_ops.egress_guard_tick((select t0 + interval '25 hours' from clock));
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'balanced', 'balanced after 24h');
select pg_temp.check((select schedule from cron.job where jobname = 'hunt-ats-board-scan-5m') = '*/10 * * * *', 'ATS every 10 min');
-- 6c. After 48h (and cooldown) the target 5-minute level is reached when it fits.
select pg_temp.seed_usage((select t0 + interval '46 hours' from clock), 4, 20000);
select hunt_ops.egress_guard_tick((select t0 + interval '50 hours' from clock));
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'fast', 'fast after 48h with measured low usage');
select pg_temp.check((select schedule from cron.job where jobname = 'hunt-ats-board-scan-5m') = '*/5 * * * *', 'ATS every 5 min');
select pg_temp.check((select schedule from cron.job where jobname = 'hunt-match-refresh-5m') = '3,13,23,33,43,53 * * * *', 'matching every 10 min');

-- 6d. Expensive measured runs: fast no longer fits => step down immediately.
select pg_temp.seed_usage((select t0 + interval '46 hours' from clock), 4, 400000);
select hunt_ops.egress_guard_tick((select t0 + interval '50 hours 30 minutes' from clock));
select pg_temp.check((select rank from hunt_ops.scan_level_rank r join hunt_ops.scan_control c on c.current_level = r.level) < 4, 'downgrade on expensive runs');

-- 6e. Daily allowance consumed => pause until the next UTC day, then restart at economy at most.
delete from hunt_ops.function_usage_hourly;
insert into hunt_ops.function_usage_hourly(bucket, function_name, bytes, runs)
  values (date_trunc('day', (select t0 + interval '3 days' from clock)) + interval '1 hour', 'hunt-ats-board-scan', 96000000, 4800);
select hunt_ops.egress_guard_tick((select date_trunc('day', t0 + interval '3 days') + interval '20 hours' from clock));
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'paused', 'pause at daily allowance');
select pg_temp.check(not exists (select 1 from cron.job where command like '%functions/v1/%' and active), 'scanners off when paused');
select pg_temp.seed_usage((select date_trunc('day', t0 + interval '4 days') from clock), 2, 20000);
select hunt_ops.egress_guard_tick((select date_trunc('day', t0 + interval '4 days') + interval '2 hours' from clock));
select pg_temp.check((select current_level from hunt_ops.scan_control) = 'economy', 'next day restart at economy');

-- 6f. Real observed egress 4x the estimate lowers what the guard allows.
delete from hunt_ops.function_usage_hourly;
select pg_temp.seed_usage((select date_trunc('day', t0 + interval '5 days') from clock), 24, 60000);
select pg_temp.seed_usage((select date_trunc('day', t0 + interval '6 days') from clock), 3, 60000);
create temp table before_cal as select hunt_ops.egress_guard_decide((select date_trunc('day', t0 + interval '6 days') + interval '3 hours' from clock)) d;
select hunt_ops.record_observed_egress((select (t0 + interval '5 days')::date from clock),
  (select sum(bytes) from hunt_ops.function_usage_hourly where bucket < (select date_trunc('day', t0 + interval '6 days') from clock)) * 4 / 1000000.0,
  'test: dashboard daily bar');
create temp table after_cal as select hunt_ops.egress_guard_decide((select date_trunc('day', t0 + interval '6 days') + interval '3 hours' from clock)) d;
select pg_temp.check(((select d from after_cal)#>>'{status,estimate,calibration_factor}')::numeric > 3, 'calibration factor from observed');
select pg_temp.check(((select d from after_cal)#>>'{status,estimate,used_today_bytes}')::numeric
  > ((select d from before_cal)#>>'{status,estimate,used_today_bytes}')::numeric * 3, 'estimates corrected upward');
select pg_temp.check((select d->'status'->'observed'->'latest'->>'source' from after_cal) like 'test:%', 'observed kept separate');

-- 7. A new 402 while running suspends everything again.
insert into net._http_response(id, status_code) values (-2, 402);
update hunt_ops.quota_control set suspended = false;
select hunt_ops.quota_watchdog();
select pg_temp.check((select suspended from hunt_ops.quota_control), 'suspended again on 402');
select pg_temp.check(not exists (select 1 from cron.job where command like '%functions/v1/%' and active), 'all paused on 402');
select 'egress guard SQL tests passed' as result;
