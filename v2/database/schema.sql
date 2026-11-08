-- HUNT 2.0 / Supabase PostgreSQL schema
-- No personal data belongs in the public repository. This file defines structure only.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  careers_url text,
  country_code text,
  city text,
  sector text default 'fashion_luxury',
  size_band text,
  is_independent boolean,
  careers_structure text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  source_type text not null,
  name text not null,
  base_url text,
  trust_level integer not null default 50 check (trust_level between 0 and 100),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(company_id, source_type, base_url)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  canonical_title text not null,
  normalized_title text not null,
  role_family text,
  seniority text,
  employment_type text,
  city text,
  region text,
  country_code text,
  remote_mode text,
  description text,
  description_fingerprint text,
  requisition_id text,
  primary_apply_url text,
  state text not null default 'discovered'
    check (state in (
      'discovered',
      'active_verified',
      'active_likely',
      'evergreen_possible',
      'stale_possible',
      'closed_verified',
      'unknown'
    )),
  vacancy_confidence integer check (vacancy_confidence between 0 and 100),
  confidence_label text,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_verified_at timestamptz,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_company_idx on public.jobs(company_id);
create index if not exists jobs_role_family_idx on public.jobs(role_family);
create index if not exists jobs_state_idx on public.jobs(state);
create index if not exists jobs_location_idx on public.jobs(country_code, city);
create index if not exists jobs_requisition_idx on public.jobs(company_id, requisition_id);
create index if not exists jobs_fingerprint_idx on public.jobs(company_id, description_fingerprint);

create table if not exists public.job_sources (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  external_job_id text,
  listing_url text not null,
  apply_url text,
  requisition_id text,
  raw_title text,
  raw_location text,
  raw_description text,
  content_hash text,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_verified_at timestamptz,
  active boolean,
  metadata jsonb not null default '{}'::jsonb,
  unique(source_id, listing_url)
);

create index if not exists job_sources_job_idx on public.job_sources(job_id);
create index if not exists job_sources_external_idx on public.job_sources(source_id, external_job_id);
create index if not exists job_sources_req_idx on public.job_sources(requisition_id);

create table if not exists public.job_observations (
  id bigserial primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  job_source_id uuid references public.job_sources(id) on delete cascade,
  observed_at timestamptz not null default now(),
  listing_present boolean,
  apply_works boolean,
  http_status integer,
  content_hash text,
  title text,
  location text,
  raw jsonb not null default '{}'::jsonb
);

create index if not exists job_observations_job_time_idx
  on public.job_observations(job_id, observed_at desc);

create table if not exists public.repost_events (
  id bigserial primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  detected_at timestamptz not null default now(),
  prior_job_source_id uuid references public.job_sources(id) on delete set null,
  new_job_source_id uuid references public.job_sources(id) on delete set null,
  requisition_id_changed boolean,
  description_similarity numeric(5,4),
  reason text not null,
  evidence jsonb not null default '{}'::jsonb
);

create index if not exists repost_events_job_idx on public.repost_events(job_id, detected_at desc);

-- Private user profile
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  current_title text,
  seniority text,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  cv_storage_path text,
  profile_summary text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null,
  target_role_families jsonb not null default '[]'::jsonb,
  parsed_profile jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_cvs_user_idx
  on public.user_cvs(user_id, active, updated_at desc);

create table if not exists public.career_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_role_families jsonb not null default '[]'::jsonb,
  secondary_role_families jsonb not null default '[]'::jsonb,
  excluded_role_families jsonb not null default '[]'::jsonb,
  preferred_locations jsonb not null default '[]'::jsonb,
  relocation_locations jsonb not null default '[]'::jsonb,
  employment_types jsonb not null default '[]'::jsonb,
  preferred_brands jsonb not null default '[]'::jsonb,
  excluded_brands jsonb not null default '[]'::jsonb,
  industries jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_job_matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  match_score integer not null check (match_score between 0 and 100),
  priority_score integer not null check (priority_score between 0 and 100),
  reasons jsonb not null default '[]'::jsonb,
  gaps jsonb not null default '[]'::jsonb,
  model_version text not null,
  calculated_at timestamptz not null default now(),
  primary key(user_id, job_id)
);

create index if not exists user_job_matches_priority_idx
  on public.user_job_matches(user_id, priority_score desc);

create table if not exists public.user_job_feedback (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  feedback_type text not null check (feedback_type in (
    'save',
    'hide',
    'apply',
    'more_like_this',
    'too_sales',
    'too_senior',
    'wrong_location',
    'brand_yes_role_no',
    'not_interested'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_job_feedback_user_idx
  on public.user_job_feedback(user_id, created_at desc);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  status text not null default 'preparing'
    check (status in ('preparing','applied','follow_up','interview','offer','rejected','closed')),
  applied_at timestamptz,
  next_action_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_idx
  on public.applications(user_id, updated_at desc);

create table if not exists public.company_signals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  signal_type text not null,
  title text not null,
  summary text,
  source_name text not null,
  source_url text not null,
  published_at timestamptz,
  detected_at timestamptz not null default now(),
  relevance_score integer check (relevance_score between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  unique(company_id, source_url)
);

create index if not exists company_signals_company_time_idx
  on public.company_signals(company_id, detected_at desc);

create table if not exists public.user_job_dossiers (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  recommended_cv_id uuid references public.user_cvs(id) on delete set null,
  why_you text,
  why_now text,
  positioning_angle text,
  cv_reason text,
  gaps jsonb not null default '[]'::jsonb,
  what_to_emphasize jsonb not null default '[]'::jsonb,
  contact_route jsonb not null default '{}'::jsonb,
  ready_to_send_subject text,
  ready_to_send_message text,
  generated_from jsonb not null default '{}'::jsonb,
  model_version text,
  updated_at timestamptz not null default now(),
  primary key(user_id, job_id)
);

create index if not exists user_job_dossiers_user_idx
  on public.user_job_dossiers(user_id, updated_at desc);

create table if not exists public.outreach_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  score integer check (score between 0 and 100),
  why_now text,
  recommended_area text,
  reasons jsonb not null default '[]'::jsonb,
  contact_route jsonb not null default '{}'::jsonb,
  status text not null default 'suggested',
  updated_at timestamptz not null default now(),
  unique(user_id, company_id)
);

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'onesignal',
  subscription_id text not null unique,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- RLS: global market data is readable by authenticated users.
alter table public.companies enable row level security;
alter table public.sources enable row level security;
alter table public.jobs enable row level security;
alter table public.job_sources enable row level security;
alter table public.job_observations enable row level security;
alter table public.repost_events enable row level security;
alter table public.company_signals enable row level security;
alter table public.profiles enable row level security;
alter table public.user_cvs enable row level security;
alter table public.career_preferences enable row level security;
alter table public.user_job_matches enable row level security;
alter table public.user_job_feedback enable row level security;
alter table public.applications enable row level security;
alter table public.user_job_dossiers enable row level security;
alter table public.outreach_candidates enable row level security;
alter table public.notification_devices enable row level security;

create policy "authenticated read companies" on public.companies
for select to authenticated using (true);
create policy "authenticated read sources" on public.sources
for select to authenticated using (true);
create policy "authenticated read jobs" on public.jobs
for select to authenticated using (true);
create policy "authenticated read job_sources" on public.job_sources
for select to authenticated using (true);
create policy "authenticated read job_observations" on public.job_observations
for select to authenticated using (true);
create policy "authenticated read repost_events" on public.repost_events
for select to authenticated using (true);

create policy "authenticated read company_signals" on public.company_signals
for select to authenticated using (true);

create policy "own profile" on public.profiles
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own cvs" on public.user_cvs
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own preferences" on public.career_preferences
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own matches read" on public.user_job_matches
for select to authenticated using (auth.uid() = user_id);

create policy "own feedback" on public.user_job_feedback
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own applications" on public.applications
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own dossiers" on public.user_job_dossiers
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own outreach" on public.outreach_candidates
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "own devices" on public.notification_devices
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Global market tables should be written by service-role workers only.
