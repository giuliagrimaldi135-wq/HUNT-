-- Minimal stand-in for the Supabase objects HUNT migrations touch, used only
-- by CI/local SQL tests on a plain PostgreSQL. Never applied to production.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create table public.jobs(
  id uuid primary key default gen_random_uuid(), company_id uuid, canonical_title text not null default 'T',
  role_family text, seniority text, employment_type text, city text, remote_mode text, description text,
  requisition_id text, primary_apply_url text, state text not null default 'active_verified',
  vacancy_confidence int, published_at timestamptz default now()-interval '2 days',
  first_seen_at timestamptz not null default now()-interval '2 days', last_verified_at timestamptz default now(),
  metadata jsonb not null default '{}', updated_at timestamptz not null default now());
create table public.career_preferences(user_id uuid primary key, primary_role_families jsonb default '[]', preferred_locations jsonb default '[]',
  relocation_locations jsonb default '[]', employment_types jsonb default '[]', preferences jsonb default '{}', updated_at timestamptz default now());
create table public.profiles(user_id uuid primary key, seniority text, onboarding_completed boolean default true);
create table public.user_personalization(user_id uuid primary key, interest_areas jsonb default '[]', avoid_role_traits jsonb default '[]');
create table public.user_cvs(id uuid primary key default gen_random_uuid(), user_id uuid, parsed_profile jsonb default '{}', is_default boolean default true,
  active boolean default true, target_role_families jsonb default '[]', updated_at timestamptz default now());
create table public.user_job_matches(user_id uuid, job_id uuid, match_score int, priority_score int, reasons jsonb default '[]', gaps jsonb default '[]',
  model_version text default 'eligibility-v2', calculated_at timestamptz default now(), primary key(user_id, job_id));
grant select on all tables in schema public to service_role;
