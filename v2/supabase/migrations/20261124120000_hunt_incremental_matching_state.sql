-- HUNT incremental matching (egress protection, PR A) — 2026-11-24.
--
-- ADDITIVE ONLY. Does not alter, update or delete any existing table or row:
-- no jobs, CVs, profiles, preferences, applications or recommendations change.
--
-- 1. public.hunt_job_description_digests(uuid[]): returns md5(description) per
--    job (32 characters) so hunt-match-refresh no longer downloads every full
--    description every hour just to find out whether it changed.
-- 2. public.hunt_match_change_token(): one md5 of every matcher input, so a
--    run with nothing new ends after reading ~100 bytes.
-- 3. hunt_ops.match_refresh_state + get/put RPCs: one private row with the
--    fingerprints of the last evaluation (no CV text, no descriptions: only
--    short hashes, job ids, user ids and which user/job pairs were recommended).
--
-- All four functions are callable only by service_role (Edge Functions).
-- If this migration is not applied, hunt-match-refresh keeps working in FULL
-- mode exactly as before.

create schema if not exists hunt_ops;
revoke all on schema hunt_ops from public, anon, authenticated;

create table if not exists hunt_ops.match_refresh_state (
  singleton smallint primary key default 1 check (singleton = 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);
revoke all on hunt_ops.match_refresh_state from public, anon, authenticated;

create or replace function public.hunt_job_description_digests(p_job_ids uuid[])
returns table(id uuid, description_md5 text)
language sql stable security invoker
set search_path = pg_catalog, public
as $fn$
  select j.id, md5(coalesce(j.description, ''))
  from public.jobs j
  where j.id = any(p_job_ids[1:2000]);
$fn$;
revoke all on function public.hunt_job_description_digests(uuid[]) from public, anon, authenticated;
grant execute on function public.hunt_job_description_digests(uuid[]) to service_role;

-- Digest of EVERY input hunt-match-refresh reads: actionable vacancies (same
-- freshness filter as the function, description md5, all scored fields,
-- posting-age day bucket), preferences, onboarding seniority, personalization,
-- active CVs (including parsed profile) and stored recommendations.
-- Equal digest + recent full evaluation => the run is skipped (32 bytes read).
create or replace function public.hunt_match_change_token()
returns text
language sql stable security invoker
set search_path = pg_catalog, public
as $fn$
  with eligible as (
    select j.id, md5(row(
      j.id, md5(coalesce(j.description, '')), j.canonical_title, j.role_family, j.seniority,
      j.employment_type, j.city, j.remote_mode, j.company_id, j.requisition_id,
      j.primary_apply_url, j.state, j.vacancy_confidence, j.published_at, j.first_seen_at,
      j.metadata->>'provider_creation_at', (j.metadata->'hard_requirements')::text,
      floor(extract(epoch from (now() - coalesce(j.published_at, j.first_seen_at))) / 86400)
    )::text) as h
    from public.jobs j
    where j.state in ('active_verified', 'active_likely')
      and (j.published_at >= now() - interval '20 days'
           or (j.published_at is null and j.first_seen_at >= now() - interval '20 days'))
      and j.last_verified_at >= now() - interval '7 days'
  )
  select md5(row(
    (select count(*) from eligible),
    (select string_agg(h, ',' order by id) from eligible),
    (select string_agg(md5(p::text), ',' order by p.user_id) from public.career_preferences p),
    (select string_agg(md5(row(x.user_id, x.seniority, x.onboarding_completed)::text), ',' order by x.user_id) from public.profiles x),
    (select string_agg(md5(row(u.user_id, u.interest_areas, u.avoid_role_traits)::text), ',' order by u.user_id) from public.user_personalization u),
    (select string_agg(md5(row(c.id, c.user_id, c.parsed_profile, c.is_default, c.active, c.target_role_families, c.updated_at)::text), ',' order by c.id)
       from public.user_cvs c where c.active),
    (select string_agg(md5(row(m.user_id, m.job_id, m.match_score, m.priority_score, m.reasons, m.gaps, m.model_version)::text), ',' order by m.user_id, m.job_id)
       from public.user_job_matches m)
  )::text);
$fn$;
revoke all on function public.hunt_match_change_token() from public, anon, authenticated;
grant execute on function public.hunt_match_change_token() to service_role;

create or replace function public.hunt_match_refresh_state_get()
returns jsonb
language sql stable security definer
set search_path = pg_catalog, hunt_ops
as $fn$
  select s.state from hunt_ops.match_refresh_state s where s.singleton = 1;
$fn$;
revoke all on function public.hunt_match_refresh_state_get() from public, anon, authenticated;
grant execute on function public.hunt_match_refresh_state_get() to service_role;

create or replace function public.hunt_match_refresh_state_put(p_state jsonb)
returns void
language plpgsql security definer
set search_path = pg_catalog, hunt_ops
as $fn$
begin
  if p_state is null or jsonb_typeof(p_state) <> 'object'
     or jsonb_typeof(p_state->'jobs') <> 'object'
     or jsonb_typeof(p_state->'users') <> 'object'
     or jsonb_typeof(p_state->'matches') <> 'array'
     or pg_column_size(p_state) > 2000000 then
    raise exception 'invalid HUNT match refresh state';
  end if;
  insert into hunt_ops.match_refresh_state(singleton, state, updated_at)
  values (1, p_state, now())
  on conflict (singleton) do update set state = excluded.state, updated_at = now();
end;
$fn$;
revoke all on function public.hunt_match_refresh_state_put(jsonb) from public, anon, authenticated;
grant execute on function public.hunt_match_refresh_state_put(jsonb) to service_role;

-- Read-only verification after applying:
-- select has_function_privilege('anon','public.hunt_match_refresh_state_get()','execute');   -- false
-- select has_function_privilege('authenticated','public.hunt_job_description_digests(uuid[])','execute'); -- false
-- select updated_at, jsonb_object_length(state->'jobs') jobs, jsonb_array_length(state->'matches') matches
--   from hunt_ops.match_refresh_state;
