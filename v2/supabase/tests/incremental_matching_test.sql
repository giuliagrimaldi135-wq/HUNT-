-- Verifies 20261124120000_hunt_incremental_matching_state.sql on PostgreSQL.
-- Run after stub_supabase_schema.sql and the migration. Raises on failure.
set role service_role;
create temp table seen(step text, token text);
create or replace function pg_temp.snap(step text) returns void language sql as
  $$ insert into seen values (step, public.hunt_match_change_token()) $$;
reset role;
insert into public.jobs(id, description, city, vacancy_confidence) values
  ('00000000-0000-0000-0000-0000000000a1', 'desc one', 'Milan', 90),
  ('00000000-0000-0000-0000-0000000000a2', 'desc two', 'Paris', 80);
insert into public.career_preferences(user_id) values ('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles(user_id, seniority) values ('00000000-0000-0000-0000-0000000000b1', 'internship');
insert into public.user_personalization(user_id) values ('00000000-0000-0000-0000-0000000000b1');
insert into public.user_cvs(user_id) values ('00000000-0000-0000-0000-0000000000b1');
set role service_role;
select pg_temp.snap('base');
select pg_temp.snap('base_again');
reset role;
do $t$
declare
  steps text[] := array[
    $$update public.jobs set description='desc one changed' where id='00000000-0000-0000-0000-0000000000a1'$$,
    $$update public.jobs set canonical_title='Senior T' where id='00000000-0000-0000-0000-0000000000a1'$$,
    $$update public.jobs set city='London' where id='00000000-0000-0000-0000-0000000000a1'$$,
    $$update public.jobs set vacancy_confidence=50 where id='00000000-0000-0000-0000-0000000000a1'$$,
    $$update public.jobs set metadata='{"hard_requirements":{"min_years_experience":5}}' where id='00000000-0000-0000-0000-0000000000a1'$$,
    $$update public.jobs set state='stale_possible' where id='00000000-0000-0000-0000-0000000000a2'$$,
    $$update public.jobs set state='active_verified', published_at=now()-interval '3 days' where id='00000000-0000-0000-0000-0000000000a2'$$,
    $$update public.jobs set last_verified_at=now()-interval '8 days' where id='00000000-0000-0000-0000-0000000000a2'$$,
    $$insert into public.jobs(description) values ('new job')$$,
    $$update public.career_preferences set preferred_locations='["Paris"]'$$,
    $$update public.profiles set seniority='junior'$$,
    $$update public.user_personalization set avoid_role_traits='["store_sales"]'$$,
    $$update public.user_cvs set parsed_profile='{"tools":["Excel"]}'$$,
    $$insert into public.user_cvs(user_id) values ('00000000-0000-0000-0000-0000000000b1')$$,
    $$insert into public.user_job_matches(user_id, job_id, match_score, priority_score) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',80,85)$$,
    $$update public.user_job_matches set priority_score=84$$,
    $$delete from public.user_job_matches$$
  ];
  i int; before text; after text;
begin
  for i in 1..array_length(steps, 1) loop
    set local role service_role;
    before := public.hunt_match_change_token();
    reset role;
    execute steps[i];
    set local role service_role;
    after := public.hunt_match_change_token();
    reset role;
    if before = after then raise exception 'token did not change for step %: %', i, steps[i]; end if;
  end loop;
  -- Volatile verification timestamps alone must NOT change the token.
  set local role service_role; before := public.hunt_match_change_token(); reset role;
  update public.jobs set last_verified_at = now() - interval '1 hour' where id='00000000-0000-0000-0000-0000000000a1';
  update public.user_job_matches set calculated_at = now();
  set local role service_role; after := public.hunt_match_change_token(); reset role;
  if before <> after then raise exception 'token changed on verification timestamp only'; end if;
end $t$;
do $t$ begin
  if (select count(distinct token) from seen) <> 1 then raise exception 'token not deterministic'; end if;
  if has_function_privilege('anon','public.hunt_match_change_token()','execute') then raise exception 'anon can read token'; end if;
  if has_function_privilege('authenticated','public.hunt_match_refresh_state_put(jsonb)','execute') then raise exception 'authenticated can write state'; end if;
  if has_function_privilege('authenticated','public.hunt_job_description_digests(uuid[])','execute') then raise exception 'authenticated can read digests'; end if;
end $t$;
set role service_role;
select public.hunt_match_refresh_state_put('{"format":1,"jobs":{},"users":{},"matches":[]}');
do $t$ begin
  if (public.hunt_match_refresh_state_get()->>'format') <> '1' then raise exception 'state roundtrip failed'; end if;
  if (select count(*) from public.hunt_job_description_digests(array['00000000-0000-0000-0000-0000000000a1'::uuid])) <> 1 then raise exception 'digest failed'; end if;
end $t$;
reset role;
select 'incremental matching SQL tests passed' as result;
