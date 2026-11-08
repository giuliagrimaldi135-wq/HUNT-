-- Per-account Fashion News read/archive state.
-- Used by the authenticated HUNT 2.0 preview for both global press and brand signals.
create table if not exists public.user_news_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('industry','company')),
  item_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (user_id, source_kind, item_id)
);
alter table public.user_news_reads enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_news_reads' and policyname='Users select own news reads') then
    create policy "Users select own news reads" on public.user_news_reads for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_news_reads' and policyname='Users insert own news reads') then
    create policy "Users insert own news reads" on public.user_news_reads for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_news_reads' and policyname='Users delete own news reads') then
    create policy "Users delete own news reads" on public.user_news_reads for delete to authenticated using ((select auth.uid()) = user_id);
  end if;
end $$;

revoke all privileges on table public.user_news_reads from anon, public;
grant select, insert, delete on public.user_news_reads to authenticated;
