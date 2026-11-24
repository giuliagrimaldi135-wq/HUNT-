-- HUNT egress budget guard and gradual restart (PR B) — 2026-11-24.
--
-- Goal: prevent the Supabase Free "exceed_egress_quota" restriction BEFORE it
-- happens, instead of only reacting to HTTP 402 afterwards.
--
-- What this migration changes:
--   * NEW private tables in schema hunt_ops (usage ledger, real observed egress,
--     budget settings, scan levels, guard state, decision log).
--   * NEW function public.hunt_record_function_usage() (service_role only),
--     called by the Edge Functions' usage meter at the end of each run.
--   * REPLACES hunt_ops.quota_watchdog(): identical 402 suspension and probe
--     logic; on recovery it no longer re-enables every scanner at full speed
--     but starts at level 'economy' and lets the budget guard ramp up.
-- What it does NOT change:
--   * no cron job is enabled, disabled or rescheduled by this migration;
--     while hunt_ops.quota_control.suspended is true nothing restarts;
--   * no jobs, CVs, profiles, preferences, applications or recommendations.
--
-- Two kinds of numbers are kept strictly apart:
--   ESTIMATED: bytes counted by the Edge Functions' meter (response bodies from
--              this project's API, after decompression => upper bound for
--              those calls) + a fixed daily reserve for unmetered traffic
--              (browser app, Auth, Storage).
--   OBSERVED:  real "Uncached Egress" figures copied from Supabase Dashboard >
--              Organization > Usage, entered with hunt_ops.record_observed_egress().
--              When present they calibrate the estimates upward (never down).

create schema if not exists hunt_ops;
revoke all on schema hunt_ops from public, anon, authenticated;

-- ---------------------------------------------------------------- ledger ----
create table if not exists hunt_ops.function_usage_hourly (
  bucket timestamptz not null,
  function_name text not null,
  bytes bigint not null default 0,
  requests bigint not null default 0,
  runs integer not null default 0,
  error_runs integer not null default 0,
  duration_ms bigint not null default 0,
  primary key (bucket, function_name)
);
revoke all on hunt_ops.function_usage_hourly from public, anon, authenticated;

create or replace function public.hunt_record_function_usage(
  p_function text, p_bytes bigint, p_requests integer, p_status integer, p_duration_ms integer)
returns void
language plpgsql security definer
set search_path = pg_catalog, hunt_ops
as $fn$
begin
  if p_function is null or p_function !~ '^hunt-[a-z0-9-]{2,60}$'
     or coalesce(p_bytes, -1) < 0 or p_bytes > 10000000000
     or coalesce(p_requests, -1) < 0 or p_requests > 1000000 then
    raise exception 'invalid HUNT usage record';
  end if;
  insert into hunt_ops.function_usage_hourly as u
    (bucket, function_name, bytes, requests, runs, error_runs, duration_ms)
  values (date_trunc('hour', now()), p_function, p_bytes, p_requests, 1,
          case when coalesce(p_status, 500) >= 500 then 1 else 0 end,
          greatest(coalesce(p_duration_ms, 0), 0))
  on conflict (bucket, function_name) do update set
    bytes = u.bytes + excluded.bytes,
    requests = u.requests + excluded.requests,
    runs = u.runs + 1,
    error_runs = u.error_runs + excluded.error_runs,
    duration_ms = u.duration_ms + excluded.duration_ms;
end;
$fn$;
revoke all on function public.hunt_record_function_usage(text, bigint, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.hunt_record_function_usage(text, bigint, integer, integer, integer) to service_role;

-- ------------------------------------------------ real (observed) egress ----
create table if not exists hunt_ops.observed_egress (
  day date primary key,
  uncached_egress_bytes bigint not null check (uncached_egress_bytes >= 0),
  source text not null,
  recorded_at timestamptz not null default now()
);
revoke all on hunt_ops.observed_egress from public, anon, authenticated;

-- Example (SQL editor, as owner):
--   select hunt_ops.record_observed_egress('2026-12-09', 84.2, 'Dashboard > Usage > Uncached Egress, daily bar');
create or replace function hunt_ops.record_observed_egress(p_day date, p_megabytes numeric, p_source text)
returns void
language sql
set search_path = pg_catalog, hunt_ops
as $fn$
  insert into hunt_ops.observed_egress(day, uncached_egress_bytes, source)
  values (p_day, round(p_megabytes * 1000 * 1000)::bigint, p_source)
  on conflict (day) do update set uncached_egress_bytes = excluded.uncached_egress_bytes,
    source = excluded.source, recorded_at = now();
$fn$;
revoke all on function hunt_ops.record_observed_egress(date, numeric, text) from public, anon, authenticated;

-- ---------------------------------------------------------- settings ----
create table if not exists hunt_ops.budget_config (
  singleton smallint primary key default 1 check (singleton = 1),
  -- Operational daily budget (status doc: 5 GB / 30 days = 167 MB; keep 100 MB).
  daily_budget_bytes bigint not null default 100000000,
  -- Free plan uncached egress quota per billing cycle and the cycle start day.
  cycle_quota_bytes bigint not null default 5000000000,
  cycle_anchor_day smallint not null default 8 check (cycle_anchor_day between 1 and 28),
  -- Never plan to use more than this share of the remaining allowance.
  headroom numeric not null default 0.7 check (headroom > 0 and headroom <= 1),
  -- Unmetered traffic (browser app, Auth, Storage) assumed per day.
  unmetered_reserve_bytes bigint not null default 10000000,
  -- Assumed cost of one run of a function with fewer than 3 measured runs.
  default_run_bytes bigint not null default 250000,
  -- After recovery: at most 'economy' for ramp_economy_hours, then at most
  -- 'balanced' until ramp_balanced_hours, then the guard may reach 'fast'.
  ramp_economy_hours integer not null default 24,
  ramp_balanced_hours integer not null default 48,
  -- Minimum time at a level before moving one step faster.
  upgrade_cooldown_minutes integer not null default 120
);
revoke all on hunt_ops.budget_config from public, anon, authenticated;
insert into hunt_ops.budget_config(singleton) values (1) on conflict (singleton) do nothing;

-- Scan levels. 'fast' is the target (official ATS every 5 minutes, matching
-- every 10 minutes); 'balanced' and 'economy' are TEMPORARY safety levels.
create table if not exists hunt_ops.scan_levels (
  level text not null check (level in ('fast','balanced','economy','minimal')),
  jobname text not null,
  function_name text not null,
  schedule text not null,
  primary key (level, jobname)
);
revoke all on hunt_ops.scan_levels from public, anon, authenticated;

create table if not exists hunt_ops.scan_level_rank (
  level text primary key, rank smallint not null unique
);
revoke all on hunt_ops.scan_level_rank from public, anon, authenticated;
insert into hunt_ops.scan_level_rank values ('paused',0),('minimal',1),('economy',2),('balanced',3),('fast',4)
on conflict (level) do update set rank = excluded.rank;

insert into hunt_ops.scan_levels(level, jobname, function_name, schedule)
select v.level, v.jobname, regexp_replace(v.jobname, '-[0-9]+m$', ''), v.schedule
from (values
  ('fast','hunt-ats-board-scan-5m','*/5 * * * *'),
  ('balanced','hunt-ats-board-scan-5m','*/10 * * * *'),
  ('economy','hunt-ats-board-scan-5m','*/15 * * * *'),
  ('minimal','hunt-ats-board-scan-5m','7 * * * *'),
  ('fast','hunt-match-refresh-5m','3,13,23,33,43,53 * * * *'),
  ('balanced','hunt-match-refresh-5m','3,23,43 * * * *'),
  ('economy','hunt-match-refresh-5m','43 * * * *'),
  ('minimal','hunt-match-refresh-5m','43 */3 * * *'),
  ('fast','hunt-successfactors-public-10m','4,19,34,49 * * * *'),
  ('balanced','hunt-successfactors-public-10m','4,34 * * * *'),
  ('economy','hunt-successfactors-public-10m','4 * * * *'),
  ('minimal','hunt-successfactors-public-10m','4 */4 * * *'),
  ('fast','hunt-source-discovery-5m','6,26,46 * * * *'),
  ('balanced','hunt-source-discovery-5m','6,36 * * * *'),
  ('economy','hunt-source-discovery-5m','6 * * * *'),
  ('minimal','hunt-source-discovery-5m','6 */4 * * *'),
  ('fast','hunt-vacancy-monitor-10m','17,47 * * * *'),
  ('balanced','hunt-vacancy-monitor-10m','17,47 * * * *'),
  ('economy','hunt-vacancy-monitor-10m','17 * * * *'),
  ('minimal','hunt-vacancy-monitor-10m','17 */4 * * *'),
  ('fast','hunt-ats-discovery-15m','11,41 * * * *'),
  ('balanced','hunt-ats-discovery-15m','11 * * * *'),
  ('economy','hunt-ats-discovery-15m','11 */2 * * *'),
  ('minimal','hunt-ats-discovery-15m','11 */8 * * *'),
  ('fast','hunt-description-repair-30m','35 * * * *'),
  ('balanced','hunt-description-repair-30m','35 * * * *'),
  ('economy','hunt-description-repair-30m','35 */2 * * *'),
  ('minimal','hunt-description-repair-30m','35 */8 * * *'),
  ('fast','hunt-global-news-5m','12,42 * * * *'),
  ('balanced','hunt-global-news-5m','12 * * * *'),
  ('economy','hunt-global-news-5m','12 */3 * * *'),
  ('minimal','hunt-global-news-5m','12 */12 * * *'),
  ('fast','hunt-news-source-sync-5m','22 * * * *'),
  ('balanced','hunt-news-source-sync-5m','22 */2 * * *'),
  ('economy','hunt-news-source-sync-5m','22 */6 * * *'),
  ('minimal','hunt-news-source-sync-5m','22 */12 * * *'),
  ('fast','hunt-company-intelligence-5m','14 * * * *'),
  ('balanced','hunt-company-intelligence-5m','14 */2 * * *'),
  ('economy','hunt-company-intelligence-5m','14 */6 * * *'),
  ('minimal','hunt-company-intelligence-5m','14 */12 * * *'),
  ('fast','hunt-intelligence-source-discovery-15m','25 */2 * * *'),
  ('balanced','hunt-intelligence-source-discovery-15m','25 */4 * * *'),
  ('economy','hunt-intelligence-source-discovery-15m','25 */8 * * *'),
  ('minimal','hunt-intelligence-source-discovery-15m','25 3 * * *'),
  ('fast','hunt-fashion-brand-discovery-30m','38 */2 * * *'),
  ('balanced','hunt-fashion-brand-discovery-30m','38 */4 * * *'),
  ('economy','hunt-fashion-brand-discovery-30m','38 */8 * * *'),
  ('minimal','hunt-fashion-brand-discovery-30m','38 4 * * *'),
  ('fast','hunt-brand-website-repair-30m','36 */2 * * *'),
  ('balanced','hunt-brand-website-repair-30m','36 */4 * * *'),
  ('economy','hunt-brand-website-repair-30m','36 */8 * * *'),
  ('minimal','hunt-brand-website-repair-30m','36 5 * * *')
) as v(level, jobname, schedule)
on conflict (level, jobname) do update set schedule = excluded.schedule, function_name = excluded.function_name;

create table if not exists hunt_ops.scan_control (
  singleton smallint primary key default 1 check (singleton = 1),
  current_level text not null default 'paused',
  level_since timestamptz not null default now(),
  ramp_started_at timestamptz,
  decided_at timestamptz,
  last_decision jsonb
);
revoke all on hunt_ops.scan_control from public, anon, authenticated;
insert into hunt_ops.scan_control(singleton) values (1) on conflict (singleton) do nothing;

create table if not exists hunt_ops.egress_decisions (
  id bigserial primary key,
  decided_at timestamptz not null default now(),
  from_level text, to_level text, applied boolean not null, details jsonb not null
);
revoke all on hunt_ops.egress_decisions from public, anon, authenticated;

-- ------------------------------------------------------------ helpers ----
-- Number of values a cron field matches (supports *, */n, a, a-b, a-b/n, a/n, lists).
create or replace function hunt_ops.cron_field_count(p_field text, p_lo int, p_hi int)
returns int language plpgsql immutable
set search_path = pg_catalog
as $fn$
declare part text; m text[]; a int; b int; step int; vals int[] := '{}';
begin
  foreach part in array string_to_array(p_field, ',') loop
    m := regexp_match(part, '^(\*|[0-9]+)(?:-([0-9]+))?(?:/([0-9]+))?$');
    if m is null then raise exception 'unsupported cron field %', p_field; end if;
    a := case when m[1] = '*' then p_lo else m[1]::int end;
    b := case when m[2] is not null then m[2]::int
              when m[1] = '*' or m[3] is not null then p_hi else a end;
    step := coalesce(m[3]::int, 1);
    vals := vals || array(select generate_series(a, b, step));
  end loop;
  return (select count(distinct v) from unnest(vals) v where v between p_lo and p_hi);
end;
$fn$;

-- Runs per day of a 5-field cron schedule whose day/month/weekday fields are '*'.
create or replace function hunt_ops.cron_runs_per_day(p_schedule text)
returns int language plpgsql immutable
set search_path = pg_catalog, hunt_ops
as $fn$
declare f text[] := regexp_split_to_array(trim(p_schedule), '\s+');
begin
  if array_length(f, 1) <> 5 or f[3] <> '*' or f[4] <> '*' or f[5] <> '*' then
    raise exception 'unsupported cron schedule %', p_schedule;
  end if;
  return hunt_ops.cron_field_count(f[1], 0, 59) * hunt_ops.cron_field_count(f[2], 0, 23);
end;
$fn$;

-- Calibration: real observed egress / estimated egress over the last 14 days
-- that have both figures. Never below 1 (estimates are only corrected upward).
create or replace function hunt_ops.egress_calibration(p_now timestamptz default now())
returns numeric language sql stable
set search_path = pg_catalog, hunt_ops
as $fn$
  with c as (select * from hunt_ops.budget_config where singleton = 1),
  days as (
    select o.day, o.uncached_egress_bytes obs,
           (select coalesce(sum(u.bytes), 0) from hunt_ops.function_usage_hourly u
             where u.bucket >= o.day::timestamptz and u.bucket < (o.day + 1)::timestamptz) est
    from hunt_ops.observed_egress o
    where o.day >= (p_now at time zone 'UTC')::date - 14 and o.day < (p_now at time zone 'UTC')::date
  )
  select least(20, greatest(1, coalesce(
    sum(obs)::numeric / nullif(sum(est) + count(*) * (select unmetered_reserve_bytes from c), 0), 1)))
  from days where est > 0;
$fn$;

-- Average metered bytes per run of one function over the last 48 hours.
create or replace function hunt_ops.function_bytes_per_run(p_function text, p_now timestamptz default now())
returns numeric language sql stable
set search_path = pg_catalog, hunt_ops
as $fn$
  select case when coalesce(sum(runs), 0) >= 3 then sum(bytes)::numeric / sum(runs)
              else greatest((select default_run_bytes from hunt_ops.budget_config where singleton = 1),
                            coalesce(sum(bytes)::numeric / nullif(sum(runs), 0), 0)) end
  from hunt_ops.function_usage_hourly
  where function_name = p_function and bucket > p_now - interval '48 hours';
$fn$;

-- Projected bytes per day for a level (metered part, before calibration).
create or replace function hunt_ops.level_projected_bytes(p_level text, p_now timestamptz default now())
returns numeric language sql stable
set search_path = pg_catalog, hunt_ops
as $fn$
  select coalesce(sum(hunt_ops.cron_runs_per_day(s.schedule) * hunt_ops.function_bytes_per_run(s.function_name, p_now)), 0)
  from hunt_ops.scan_levels s where s.level = p_level;
$fn$;

-- -------------------------------------------------------------- status ----
-- Everything the guard knows, labelled estimate vs observed.
create or replace function hunt_ops.egress_status(p_now timestamptz default now())
returns jsonb language plpgsql stable
set search_path = pg_catalog, hunt_ops
as $fn$
declare
  c hunt_ops.budget_config%rowtype;
  day_start timestamptz := date_trunc('day', p_now at time zone 'UTC') at time zone 'UTC';
  day_fraction numeric := extract(epoch from (p_now - date_trunc('day', p_now at time zone 'UTC') at time zone 'UTC')) / 86400;
  cycle_start date; cycle_end date; days_left numeric;
  factor numeric := hunt_ops.egress_calibration(p_now);
  metered_today numeric; metered_cycle numeric; observed_cycle numeric; observed_days int;
  used_today numeric; used_cycle numeric; pace numeric; effective numeric;
  projections jsonb;
begin
  select * into c from hunt_ops.budget_config where singleton = 1;
  cycle_start := make_date(extract(year from p_now at time zone 'UTC')::int, extract(month from p_now at time zone 'UTC')::int, c.cycle_anchor_day);
  if cycle_start > (p_now at time zone 'UTC')::date then cycle_start := (cycle_start - interval '1 month')::date; end if;
  cycle_end := (cycle_start + interval '1 month')::date;
  days_left := greatest(extract(epoch from (cycle_end::timestamptz - p_now)) / 86400, 0.25);
  select coalesce(sum(bytes), 0) into metered_today from function_usage_hourly where bucket >= day_start;
  select coalesce(sum(bytes), 0) into metered_cycle from function_usage_hourly where bucket >= cycle_start::timestamptz;
  select coalesce(sum(uncached_egress_bytes), 0), count(*) into observed_cycle, observed_days
    from observed_egress where day >= cycle_start and day < (p_now at time zone 'UTC')::date;
  used_today := metered_today * factor + c.unmetered_reserve_bytes * day_fraction;
  used_cycle := greatest(
    metered_cycle * factor + c.unmetered_reserve_bytes * extract(epoch from (p_now - cycle_start::timestamptz)) / 86400,
    observed_cycle);
  -- Daily allowance: the operational budget, or less if the cycle is ahead of pace.
  pace := (c.cycle_quota_bytes * 0.9 - used_cycle) / days_left;
  effective := least(c.daily_budget_bytes, pace);
  select jsonb_object_agg(r.level, round(hunt_ops.level_projected_bytes(r.level, p_now) * factor + c.unmetered_reserve_bytes))
    into projections from scan_level_rank r where r.level <> 'paused';
  return jsonb_build_object(
    'now', p_now,
    'estimate', jsonb_build_object(
      'note', 'metered Edge Function API responses x calibration + unmetered reserve',
      'used_today_bytes', round(used_today), 'used_cycle_bytes', round(used_cycle),
      'metered_today_bytes', metered_today, 'calibration_factor', factor,
      'projected_bytes_per_day_by_level', projections),
    'observed', jsonb_build_object(
      'note', 'real Supabase Uncached Egress entered from the Usage page',
      'cycle_bytes', observed_cycle, 'days_recorded', observed_days,
      'latest', (select jsonb_build_object('day', day, 'bytes', uncached_egress_bytes, 'source', source)
                   from observed_egress order by day desc limit 1)),
    'budget', jsonb_build_object(
      'daily_budget_bytes', c.daily_budget_bytes, 'cycle_quota_bytes', c.cycle_quota_bytes,
      'cycle_start', cycle_start, 'cycle_end', cycle_end, 'cycle_days_left', round(days_left, 2),
      'cycle_pace_bytes_per_day', round(pace), 'effective_daily_bytes', round(effective),
      'day_fraction_elapsed', round(day_fraction, 3), 'headroom', c.headroom));
end;
$fn$;

-- ------------------------------------------------------------ decision ----
-- Fastest level whose projected day fits the allowance, capped by the
-- post-recovery ramp; one step up at a time (after a cooldown), any steps down.
create or replace function hunt_ops.egress_guard_decide(p_now timestamptz default now())
returns jsonb language plpgsql stable
set search_path = pg_catalog, hunt_ops
as $fn$
declare
  c hunt_ops.budget_config%rowtype;
  ctl hunt_ops.scan_control%rowtype;
  s jsonb := hunt_ops.egress_status(p_now);
  used_today numeric := (s#>>'{estimate,used_today_bytes}')::numeric;
  effective numeric := (s#>>'{budget,effective_daily_bytes}')::numeric;
  left_fraction numeric := 1 - (s#>>'{budget,day_fraction_elapsed}')::numeric;
  -- Projections alone never pause scanning (that would stop the measurements
  -- that correct them): the lowest level is the floor. Only usage already
  -- recorded (daily allowance or cycle pace) pauses.
  target text := 'minimal'; reason text := 'no level fits the projection; lowest level keeps measuring';
  cap text := 'fast'; cur_rank int; target_rank int; r record; projected numeric;
begin
  select * into c from budget_config where singleton = 1;
  select * into ctl from scan_control where singleton = 1;
  if effective <= 0 then
    target := 'paused'; reason := 'cycle quota pace exhausted';
  elsif used_today >= effective * 0.95 then
    target := 'paused'; reason := 'daily allowance reached; resumes next UTC day';
  else
    for r in select level from scan_level_rank where level <> 'paused' order by rank desc loop
      projected := (s#>>array['estimate','projected_bytes_per_day_by_level', r.level])::numeric;
      if projected <= effective * c.headroom
         and used_today + projected * left_fraction <= effective * 0.9 then
        target := r.level; reason := 'fastest level within budget'; exit;
      end if;
    end loop;
  end if;
  -- Gradual restart after a quota block.
  if ctl.ramp_started_at is not null then
    if p_now < ctl.ramp_started_at + make_interval(hours => c.ramp_economy_hours) then cap := 'economy';
    elsif p_now < ctl.ramp_started_at + make_interval(hours => c.ramp_balanced_hours) then cap := 'balanced';
    end if;
  end if;
  select rank into target_rank from scan_level_rank where level = target;
  if target_rank > (select rank from scan_level_rank where level = cap) then
    target := cap; reason := reason || '; capped by post-recovery ramp';
    target_rank := (select rank from scan_level_rank where level = cap);
  end if;
  select coalesce((select rank from scan_level_rank where level = ctl.current_level), 0) into cur_rank;
  if target_rank > cur_rank then
    if ctl.current_level = 'paused' and target_rank > 2 then
      -- Restart after a budget pause: never faster than 'economy'.
      target := 'economy'; reason := reason || '; restart after pause at economy';
    elsif ctl.current_level <> 'paused'
       and p_now < ctl.level_since + make_interval(mins => c.upgrade_cooldown_minutes) then
      target := ctl.current_level; reason := reason || '; upgrade cooldown';
    elsif ctl.current_level <> 'paused' then
      select level into target from scan_level_rank where rank = cur_rank + 1;
      reason := reason || '; one step up';
    end if;
  end if;
  return jsonb_build_object('from', ctl.current_level, 'to', target, 'reason', reason, 'status', s);
end;
$fn$;

-- Apply a level to pg_cron. Only jobs listed in hunt_ops.scan_levels are ever
-- (re)activated; 'paused' deactivates every HUNT network cron.
create or replace function hunt_ops.apply_scan_level(p_level text, p_now timestamptz default now())
returns void language plpgsql
set search_path = pg_catalog, hunt_ops, cron
as $fn$
declare task record;
begin
  if not exists (select 1 from hunt_ops.scan_level_rank where level = p_level) then
    raise exception 'unknown HUNT scan level %', p_level;
  end if;
  if p_level = 'paused' then
    for task in select jobid from cron.job
      where jobname like 'hunt-%' and command like '%functions/v1/%' and active loop
      perform cron.alter_job(job_id := task.jobid, active := false);
    end loop;
  else
    for task in select j.jobid, l.schedule from cron.job j
      join hunt_ops.scan_levels l on l.jobname = j.jobname and l.level = p_level loop
      perform cron.alter_job(job_id := task.jobid, schedule := task.schedule, active := true);
    end loop;
  end if;
  update hunt_ops.scan_control set current_level = p_level, level_since = p_now where singleton = 1;
end;
$fn$;

create or replace function hunt_ops.egress_guard_tick(p_now timestamptz default now())
returns jsonb language plpgsql
set search_path = pg_catalog, hunt_ops
as $fn$
declare d jsonb := hunt_ops.egress_guard_decide(p_now); changed boolean;
begin
  changed := (d->>'to') is distinct from (d->>'from');
  if changed then perform hunt_ops.apply_scan_level(d->>'to', p_now); end if;
  update hunt_ops.scan_control set decided_at = p_now, last_decision = d where singleton = 1;
  if changed then
    insert into hunt_ops.egress_decisions(decided_at, from_level, to_level, applied, details)
    values (p_now, d->>'from', d->>'to', true, d);
  end if;
  return d;
end;
$fn$;

-- ------------------------------------------------------------ watchdog ----
-- Same 402 suspension and probe rules as 20261119151000. Changes:
--   * recovery restarts at 'economy' and starts the ramp (no full-speed restart);
--   * while running, every tick lets the budget guard choose the level.
create or replace function hunt_ops.quota_watchdog()
returns void language plpgsql security invoker
set search_path = pg_catalog, public, hunt_ops, cron, net
as $fn$
declare
  st hunt_ops.quota_control%rowtype;
  http_status integer;
  recent_402 boolean;
  task record;
  new_probe bigint;
  resumed_now boolean := false;
begin
  select * into st from hunt_ops.quota_control where singleton = 1 for update;
  if not found then raise exception 'HUNT quota state missing'; end if;

  if st.last_probe_id is not null
     and st.last_probe_id is distinct from st.processed_probe_id then
    select status_code into http_status from net._http_response where id = st.last_probe_id;
    if found then
      st.processed_probe_id := st.last_probe_id;
      st.last_http_status := http_status;
      if http_status between 200 and 299 then
        st.consecutive_successes := least(st.consecutive_successes + 1, 3);
      else
        st.consecutive_successes := 0;
      end if;
    end if;
  end if;

  select exists(
    select 1 from net._http_response
    where created > now() - interval '40 minutes' and status_code = 402
  ) into recent_402;

  if recent_402 then
    st.consecutive_successes := 0;
    if not st.suspended then
      for task in
        select jobid from cron.job
        where jobname like 'hunt-%' and command like '%functions/v1/%' and active = true
      loop
        perform cron.alter_job(job_id := task.jobid, active := false);
      end loop;
      st.suspended := true;
      st.suspended_at := now();
      update hunt_ops.scan_control set current_level = 'paused', level_since = now() where singleton = 1;
    end if;
  elsif st.suspended and st.consecutive_successes >= 2 then
    -- Gradual restart: economy first, the guard ramps up from measured usage.
    perform hunt_ops.apply_scan_level('economy', now());
    update hunt_ops.scan_control set ramp_started_at = now() where singleton = 1;
    st.suspended := false;
    st.resumed_at := now();
    resumed_now := true;
  end if;

  if not st.suspended and not resumed_now then
    perform hunt_ops.egress_guard_tick(now());
  end if;

  new_probe := net.http_get(
    url := 'https://dfiokxjfgqoboxckcuut.supabase.co/auth/v1/.well-known/jwks.json',
    timeout_milliseconds := 8000
  );
  st.last_probe_id := new_probe;
  st.checked_at := now();
  update hunt_ops.quota_control set
    suspended = st.suspended,
    last_probe_id = st.last_probe_id,
    processed_probe_id = st.processed_probe_id,
    last_http_status = st.last_http_status,
    consecutive_successes = st.consecutive_successes,
    checked_at = st.checked_at,
    suspended_at = st.suspended_at,
    resumed_at = st.resumed_at
  where singleton = 1;
end;
$fn$;
revoke all on function hunt_ops.quota_watchdog() from public, anon, authenticated;

-- Read-only checks after applying (nothing is restarted by this migration):
--   select suspended, last_http_status, consecutive_successes from hunt_ops.quota_control;
--   select jobname, schedule, active from cron.job where jobname like 'hunt-%' order by jobname;
--   select hunt_ops.egress_status();
--   select hunt_ops.egress_guard_decide();   -- what the guard WOULD do; changes nothing
