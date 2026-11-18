-- Applied to Supabase Hunt 2 on 18 November 2026.
-- Recognize explicit country names, never guess from ambiguous cities or multi-country listings.
create or replace function public.hunt_country_from_explicit_location(raw_location text)
returns text language sql immutable set search_path = ''
as $$
with matches as (
 select array_remove(array[
 case when raw_location ~* '(^|[^[:alpha:]])United States([^[:alpha:]]|$)' then 'US' end,
 case when raw_location ~* '(^|[^[:alpha:]])USA([^[:alpha:]]|$)' then 'US' end,
 case when raw_location ~* '(^|[^[:alpha:]])United Kingdom([^[:alpha:]]|$)' then 'GB' end,
 case when raw_location ~* '(^|[^[:alpha:]])UK([^[:alpha:]]|$)' then 'GB' end,
 case when raw_location ~* '(^|[^[:alpha:]])Italy([^[:alpha:]]|$)' then 'IT' end,
 case when raw_location ~* '(^|[^[:alpha:]])France([^[:alpha:]]|$)' then 'FR' end,
 case when raw_location ~* '(^|[^[:alpha:]])Germany([^[:alpha:]]|$)' then 'DE' end,
 case when raw_location ~* '(^|[^[:alpha:]])Spain([^[:alpha:]]|$)' then 'ES' end,
 case when raw_location ~* '(^|[^[:alpha:]])Singapore([^[:alpha:]]|$)' then 'SG' end,
 case when raw_location ~* '(^|[^[:alpha:]])Malaysia([^[:alpha:]]|$)' then 'MY' end,
 case when raw_location ~* '(^|[^[:alpha:]])India([^[:alpha:]]|$)' then 'IN' end,
 case when raw_location ~* '(^|[^[:alpha:]])Netherlands([^[:alpha:]]|$)' then 'NL' end,
 case when raw_location ~* '(^|[^[:alpha:]])Canada([^[:alpha:]]|$)' then 'CA' end,
 case when raw_location ~* '(^|[^[:alpha:]])Indonesia([^[:alpha:]]|$)' then 'ID' end,
 case when raw_location ~* '(^|[^[:alpha:]])Philippines([^[:alpha:]]|$)' then 'PH' end,
 case when raw_location ~* '(^|[^[:alpha:]])China([^[:alpha:]]|$)' then 'CN' end,
 case when raw_location ~* '(^|[^[:alpha:]])Vietnam([^[:alpha:]]|$)' then 'VN' end,
 case when raw_location ~* '(^|[^[:alpha:]])Ireland([^[:alpha:]]|$)' then 'IE' end,
 case when raw_location ~* '(^|[^[:alpha:]])Portugal([^[:alpha:]]|$)' then 'PT' end,
 case when raw_location ~* '(^|[^[:alpha:]])Switzerland([^[:alpha:]]|$)' then 'CH' end,
 case when raw_location ~* '(^|[^[:alpha:]])Belgium([^[:alpha:]]|$)' then 'BE' end,
 case when raw_location ~* '(^|[^[:alpha:]])Poland([^[:alpha:]]|$)' then 'PL' end,
 case when raw_location ~* '(^|[^[:alpha:]])Brazil([^[:alpha:]]|$)' then 'BR' end,
 case when raw_location ~* '(^|[^[:alpha:]])Australia([^[:alpha:]]|$)' then 'AU' end,
 case when raw_location ~* '(^|[^[:alpha:]])Austria([^[:alpha:]]|$)' then 'AT' end,
 case when raw_location ~* '(^|[^[:alpha:]])United Arab Emirates([^[:alpha:]]|$)' then 'AE' end,
 case when raw_location ~* '(^|[^[:alpha:]])Saudi Arabia([^[:alpha:]]|$)' then 'SA' end,
 case when raw_location ~* '(^|[^[:alpha:]])South Korea([^[:alpha:]]|$)' then 'KR' end,
 case when raw_location ~* '(^|[^[:alpha:]])Japan([^[:alpha:]]|$)' then 'JP' end,
 case when raw_location ~* '(^|[^[:alpha:]])Hong Kong([^[:alpha:]]|$)' then 'HK' end,
 case when raw_location ~* '(^|[^[:alpha:]])Taiwan([^[:alpha:]]|$)' then 'TW' end,
 case when raw_location ~* '(^|[^[:alpha:]])Thailand([^[:alpha:]]|$)' then 'TH' end
 ],null) as codes
), unique_codes as (
 select array_agg(distinct code) as codes from matches, unnest(matches.codes) as code
)
select case when raw_location ~ ';' then null
 when cardinality(codes)=1 then codes[1] else null end from unique_codes;
$$;
update public.jobs
set country_code=public.hunt_country_from_explicit_location(city)
where (country_code is null or btrim(country_code)='')
and public.hunt_country_from_explicit_location(city) is not null;
