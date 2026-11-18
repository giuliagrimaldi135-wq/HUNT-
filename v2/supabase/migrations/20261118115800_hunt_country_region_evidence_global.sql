-- Applied to Supabase Hunt 2, 2026-11-18.
-- Country is inferred only from an explicit administrative region (not city alone).
-- Multi-city records remain unresolved and retain their original location.
create or replace function public.hunt_country_from_explicit_region(raw_location text)
returns text language sql immutable set search_path = ''
as $$
select case
 when raw_location is null or raw_location ~ ';' then null
 when raw_location ~* ', (Emilia-Romagna|Lombardy|Lombardia|Lazio|Tuscany|Toscana|Piedmont|Piemonte|Sicily|Sicilia|Liguria|Campania|Veneto|Apulia|Puglia|Abruzzo|Marche|Sardinia|Sardegna|Friuli-Venezia Giulia|Trentino-Alto Adige/Südtirol)$' then 'IT'
 when raw_location ~* ', (England|Scotland|Wales|Northern Ireland)$' then 'GB'
 when raw_location ~* ', (California|New Jersey|Pennsylvania|Massachusetts|New York|Florida|Texas)$' then 'US'
 when raw_location ~* ', (Ontario|British Columbia|Quebec)$' then 'CA'
 when raw_location ~* ', (North Holland|South Holland)$' then 'NL'
 else null end;
$$;
create or replace function public.hunt_fill_explicit_country_code()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if new.country_code is null or btrim(new.country_code)='' then
  new.country_code := coalesce(
   public.hunt_country_from_explicit_location(new.city),
   public.hunt_country_from_explicit_region(new.city)
  );
 end if;
 return new;
end;
$$;
update public.jobs set country_code=public.hunt_country_from_explicit_region(city)
where (country_code is null or btrim(country_code)='')
and public.hunt_country_from_explicit_region(city) is not null;
