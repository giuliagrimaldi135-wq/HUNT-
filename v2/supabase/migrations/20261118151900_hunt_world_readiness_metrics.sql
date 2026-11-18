-- Keep existing private 6-hour cron and RLS snapshot table; add evidence-based
-- worldwide coverage rather than counting every historical job as actionable.
create or replace function public.hunt_world_readiness_metrics()
returns jsonb language sql stable set search_path=''
as $metric$
select jsonb_build_object(
 'recent_verified_described_jobs',(select count(*) from public.jobs j where j.state in('active_verified','active_likely') and coalesce(j.published_at,j.first_seen_at)>=now()-interval '20 days' and j.last_verified_at>=now()-interval '7 days' and length(coalesce(j.description,''))>=250 and j.primary_apply_url like 'https://%'),
 'fresh_job_countries',(select count(distinct j.country_code) from public.jobs j where j.state in('active_verified','active_likely') and coalesce(j.published_at,j.first_seen_at)>=now()-interval '20 days' and j.last_verified_at>=now()-interval '7 days' and j.country_code is not null),
 'brands_with_recent_verified_described_jobs',(select count(distinct j.company_id) from public.jobs j where j.state in('active_verified','active_likely') and coalesce(j.published_at,j.first_seen_at)>=now()-interval '20 days' and j.last_verified_at>=now()-interval '7 days' and length(coalesce(j.description,''))>=250),
 'official_sources_productive_last_24h',(select count(distinct s.id) from public.sources s join public.source_scan_runs r on r.source_id=s.id where s.active and s.official and r.started_at>=now()-interval '24 hours' and r.extracted_jobs>0),
 'official_career_pages_reachable_without_listings',(select count(*) from public.sources s where s.active and s.official and s.source_type='career_page' and s.health_status='reachable_no_listings'),
 'official_career_sources_not_scanned_24h',(select count(*) from public.sources s where s.active and s.official and s.source_type in('ats','career_page','public_ats_board') and (s.last_scan_at is null or s.last_scan_at<now()-interval '24 hours')),
 'brands_without_official_career_source',(select count(*) from public.companies c where c.monitored and not exists(select 1 from public.sources s where s.company_id=c.id and s.active and s.official and s.source_type in('ats','career_page','public_ats_board'))),
 'unverified_candidates_older_48h',(select count(*) from public.job_candidates c where c.status='needs_review' and c.parsed_at<now()-interval '48 hours'),
 'recommendations_past_deadline',(select count(*) from public.user_job_matches m join public.jobs j on j.id=m.job_id where j.state not in('active_verified','active_likely') or coalesce(j.published_at,j.first_seen_at)<now()-interval '20 days' or j.last_verified_at<now()-interval '7 days' or j.last_verified_at is null),
 'automatically_discovered_official_career_pages',(select count(*) from public.sources s where s.active and s.official and s.metadata->>'discovery'='verified_same_domain_careers')
);
$metric$;
revoke all on function public.hunt_world_readiness_metrics() from public,anon,authenticated;

do $do$
declare current_definition text;
begin
 current_definition:=pg_get_functiondef('public.hunt_audit_world_coverage()'::regprocedure);
 if position('public.hunt_world_readiness_metrics()' in current_definition)>0 then
  return;
 end if;
 if position(E'  ),\n  coalesce((select jsonb_object_agg(country,n)' in current_definition)=0 then
  raise exception 'World audit source changed; manual review needed';
 end if;
 execute replace(current_definition,
    E'  ),\n  coalesce((select jsonb_object_agg(country,n)',
    E'  ) || public.hunt_world_readiness_metrics(),\n  coalesce((select jsonb_object_agg(country,n)');
end;
$do$;
select public.hunt_audit_world_coverage();
