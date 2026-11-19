-- HUNT Supabase Free egress incident 2026-11-19.
-- Keep official ATS discovery and freshness cleanup on their existing schedules,
-- but prevent a 3 MB full job-description matching snapshot every five minutes.
-- The redesigned matcher only writes changes; hourly recomputation is enough
-- for an early-stage app and prevents recurring project restrictions.
do $h$
declare target bigint;
begin
 select jobid into target from cron.job where jobname='hunt-match-refresh-5m';
 if target is null then raise exception 'HUNT match refresh cron missing'; end if;
 perform cron.alter_job(job_id:=target,schedule:='43 * * * *',active:=true);
end;
$h$;
