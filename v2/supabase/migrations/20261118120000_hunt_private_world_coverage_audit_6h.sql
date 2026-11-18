-- Applied to production 18 November 2026. World Web quality, observed not assumed.
-- Private internal snapshots; no UI or personal user data exposed.
create table if not exists public.hunt_world_coverage_snapshots (
 id bigint generated always as identity primary key,
 snapshot_at timestamptz not null default now(),
 metrics jsonb not null,
 country_breakdown jsonb not null
);
alter table public.hunt_world_coverage_snapshots enable row level security;
revoke all on public.hunt_world_coverage_snapshots from anon, authenticated;
revoke all on function public.hunt_country_from_explicit_location(text) from public,anon,authenticated;
revoke all on function public.hunt_country_from_explicit_region(text) from public,anon,authenticated;
create or replace function public.hunt_audit_world_coverage()
returns void language plpgsql security invoker set search_path = ''
as $$
begin
 insert into public.hunt_world_coverage_snapshots(metrics,country_breakdown)
 select
  jsonb_build_object(
   'all_jobs', (select count(*) from public.jobs),
   'active_jobs', (select count(*) from public.jobs where state in ('active_verified','active_likely')),
   'country_known_jobs', (select count(*) from public.jobs where country_code is not null and btrim(country_code)<>''),
   'country_unknown_jobs', (select count(*) from public.jobs where country_code is null or btrim(country_code)=''),
   'distinct_job_countries', (select count(distinct country_code) from public.jobs where country_code is not null),
   'monitored_brands', (select count(*) from public.companies where monitored=true),
   'brands_with_official_careers', (select count(distinct company_id) from public.sources where active=true and official=true and source_type <> 'brand_website_candidate'),
   'active_degraded_career_pages', (select count(*) from public.sources where active=true and source_type='career_page' and health_status='degraded'),
   'unique_degraded_career_hosts', (select count(distinct split_part(split_part(base_url,'//',2),'/',1)) from public.sources where active=true and source_type='career_page' and health_status='degraded'),
   'brand_website_candidates_unverified', (select count(*) from public.sources where active=true and source_type='brand_website_candidate'),
   'pending_job_candidate_reviews', (select count(*) from public.job_candidates where status='needs_review'),
   'active_news_sources', (select count(*) from public.world_news_sources where active=true),
   'degraded_news_sources', (select count(*) from public.world_news_sources where active=true and status='degraded')
  ),
  coalesce((select jsonb_object_agg(country,n) from (
      select coalesce(nullif(btrim(country_code),''),'UNRESOLVED') country,count(*) n
      from public.jobs group by 1
   ) grouped),'{}'::jsonb);
end;
$$;
revoke all on function public.hunt_audit_world_coverage() from public,anon,authenticated;
select cron.schedule('hunt-world-coverage-audit-6h','49 0,6,12,18 * * *','select public.hunt_audit_world_coverage();');
select public.hunt_audit_world_coverage();
