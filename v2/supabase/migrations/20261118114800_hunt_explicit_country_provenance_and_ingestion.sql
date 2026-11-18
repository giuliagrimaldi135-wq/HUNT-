-- Applied to Supabase Hunt 2 on 18 November 2026.
-- Conservative country enrichment: only use explicit country names within the
-- official location string; do not guess from city names or employer HQ.
-- Multi-country/hybrid job locations remain NULL for human/ATS verification.
create or replace function public.hunt_country_from_explicit_location(raw_location text)
returns text language sql immutable set search_path = ''
as $$
with matched as (
 select array_remove(array[
 case when raw_location ~* '(^|[^[:alpha:]])United States([^[:alpha:]]|$)' then 'US' end,
 case when raw_location ~* '(^|[^[:alpha:]])United Kingdom([^[:alpha:]]|$)' then 'GB' end,
 case when raw_location ~* '(^|[^[:alpha:]])Italy([^[:alpha:]]|$)' then 'IT' end,
 case when raw_location ~* '(^|[^[:alpha:]])France([^[:alpha:]]|$)' then 'FR' end,
 case when raw_location ~* '(^|[^[:alpha:]])Germany([^[:alpha:]]|$)' then 'DE' end,
 case when raw_location ~* '(^|[^[:alpha:]])Spain([^[:alpha:]]|$)' then 'ES' end,
 case when raw_location ~* '(^|[^[:alpha:]])Singapore([^[:alpha:]]|$)' then 'SG' end,
 case when raw_location ~* '(^|[^[:alpha:]])Malaysia([^[:alpha:]]|$)' then 'MY' end,
 case when raw_location ~* '(^|[^[:alpha:]])India([^[:alpha:]]|$)' then 'IN' end
 ], null) as codes
)
select case when cardinality(codes)=1 then codes[1] else null end from matched;
$$;
create or replace function public.hunt_fill_explicit_country_code()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if new.country_code is null or btrim(new.country_code)='' then
  new.country_code := public.hunt_country_from_explicit_location(new.city);
 end if;
 return new;
end;
$$;
drop trigger if exists hunt_fill_country_from_explicit_city on public.jobs;
create trigger hunt_fill_country_from_explicit_city
before insert or update of city,country_code on public.jobs
for each row execute function public.hunt_fill_explicit_country_code();
update public.jobs
set country_code=public.hunt_country_from_explicit_location(city)
where (country_code is null or btrim(country_code)='')
and public.hunt_country_from_explicit_location(city) is not null;
