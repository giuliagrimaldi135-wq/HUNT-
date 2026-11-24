-- Minimal pg_cron / pg_net stand-ins for CI SQL tests. Never applied to production.
create schema if not exists cron;
create table cron.job(jobid bigserial primary key, jobname text unique, schedule text not null, command text not null, active boolean not null default true);
create table cron.job_run_details(runid bigserial primary key, jobid bigint, status text, start_time timestamptz, end_time timestamptz);
create function cron.alter_job(job_id bigint, schedule text default null, command text default null,
  database text default null, username text default null, active boolean default null) returns void
language sql as $$
  update cron.job j set schedule = coalesce(alter_job.schedule, j.schedule), active = coalesce(alter_job.active, j.active)
  where j.jobid = alter_job.job_id
$$;
create function cron.schedule(job_name text, schedule text, command text) returns bigint
language sql as $$
  insert into cron.job(jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid
$$;
create schema if not exists net;
create sequence net.request_seq;
create table net._http_response(id bigint, status_code int, created timestamptz not null default now());
create function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ select nextval('net.request_seq') $$;
-- Production-like HUNT jobs (as before the quota incident).
insert into cron.job(jobname, schedule, command) values
 ('hunt-ats-board-scan-5m','*/5 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-ats-board-scan'')'),
 ('hunt-match-refresh-5m','43 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-match-refresh'')'),
 ('hunt-successfactors-public-10m','*/10 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-successfactors-public'')'),
 ('hunt-source-discovery-5m','*/5 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-source-discovery'')'),
 ('hunt-vacancy-monitor-10m','*/10 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-vacancy-monitor'')'),
 ('hunt-ats-discovery-15m','*/15 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-ats-discovery'')'),
 ('hunt-description-repair-30m','*/30 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-description-repair'')'),
 ('hunt-global-news-5m','*/5 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-global-news'')'),
 ('hunt-news-source-sync-5m','*/5 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-news-source-sync'')'),
 ('hunt-company-intelligence-5m','*/5 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-company-intelligence'')'),
 ('hunt-intelligence-source-discovery-15m','*/15 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-intelligence-source-discovery'')'),
 ('hunt-fashion-brand-discovery-30m','*/30 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-fashion-brand-discovery'')'),
 ('hunt-brand-website-repair-30m','*/30 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-brand-website-repair'')'),
 ('hunt-experimental-unreviewed-5m','*/5 * * * *','select net.http_post(url:=''https://x.supabase.co/functions/v1/hunt-experimental'')'),
 ('hunt-recommendations-cleanup-5m','*/5 * * * *','delete from public.user_job_matches where false'),
 ('hunt-world-coverage-audit-6h','49 0,6,12,18 * * *','select 1');
