-- Service-role only usage ledger; quota checked before external provider requests.
create table if not exists public.hunt_ai_request_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('generate','revise','interpret')),
  created_at timestamptz not null default now()
);
create index if not exists hunt_ai_request_events_user_created on public.hunt_ai_request_events(user_id,created_at desc);
alter table public.hunt_ai_request_events enable row level security;
revoke all on public.hunt_ai_request_events from anon, authenticated, public;
