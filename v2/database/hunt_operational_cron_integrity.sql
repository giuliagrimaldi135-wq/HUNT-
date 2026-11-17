-- HUNT 2.0 operational cron integrity — 2026-11-17.
-- Idempotent, non-secret restoration instructions for pg_cron.
-- Run as a database administrator with pg_cron installed. This file contains
-- no private API keys and never deletes jobs or user-owned application data.
--
-- Personal suggestions expire 20*24 hours after the provider posting date
-- (or first_seen_at only if provider date is not exposed). A current source
-- verification is independent from the posting date.
select cron.schedule(
  'hunt-recommendations-cleanup-5m',
  '*/5 * * * *',
  $cleanup$
  delete from public.user_job_matches m using public.jobs j
   where m.job_id=j.id
     and (
       j.state not in ('active_verified','active_likely')
       or coalesce(j.published_at,j.first_seen_at) is null
       or coalesce(j.published_at,j.first_seen_at)<now()-interval '20 days'
       or j.last_verified_at is null
       or j.last_verified_at<now()-interval '7 days'
     );
  $cleanup$
);

-- Decommission the old calendar-day/hourly job if present.
do $do$
begin
 if exists(select 1 from cron.job where jobname='hunt-recommendations-cleanup-hourly') then
  perform cron.unschedule('hunt-recommendations-cleanup-hourly');
 end if;
end $do$;

-- Patch only a PREEXISTING quality audit; it contains many other live metrics
-- that must not be reconstructed from an incomplete snippet.
do $do$
declare current_command text;
begin
 select command into current_command from cron.job
  where jobname='hunt-quality-audit-hourly';
 if current_command is not null and
    position($$date_trunc('day',now()-interval '20 days')$$ in current_command)>0 then
  perform cron.schedule(
    'hunt-quality-audit-hourly', '28 * * * *',
    replace(current_command,
      $$date_trunc('day',now()-interval '20 days')$$,
      $$(now()-interval '20 days')$$)
  );
 end if;
end $do$;

-- Read-only verification queries:
-- select jobname,schedule,active from cron.job
--  where jobname like 'hunt-recommendations-cleanup%';
-- select count(*) from public.user_job_matches m join public.jobs j on j.id=m.job_id
--  where coalesce(j.published_at,j.first_seen_at)<now()-interval '20 days';
