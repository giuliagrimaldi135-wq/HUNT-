-- HUNT 2.0: curated fashion-brand homepage references, 2026-11-17.
-- This is NOT a careers catalog and NOT evidence of active vacancies.
-- Restore only missing company.website_url fields. Do not replace hand-
-- curated site URLs, CV evidence, application records or job histories.
-- Separately run hunt-ats-discovery for URL-to-official-ATS verification.
with verified_sites(slug,url) as (values
 ('act-n1','https://actn1.com/'),
 ('blaze','https://www.blaze-milano.com/'),
 ('blumarine','https://www.blumarine.com/'),
 ('brunello-cucinelli','https://www.brunellocucinelli.com/'),
 ('cp-company','https://www.cpcompany.com/'),
 ('daily-paper','https://dailypaperclothing.com/'),
 ('durazzi-milano','https://www.durazzimilano.com/'),
 ('elisabetta-franchi','https://www.elisabettafranchi.com/'),
 ('gcds','https://gcds.com/'),
 ('la-doublej','https://www.ladoublej.com/'),
 ('magliano','https://magliano.website/'),
 ('marco-rambaldi','https://marcorambaldi.com/'),
 ('msgm','https://www.shop-msgm.com/'),
 ('n21','https://www.numeroventuno.com/'),
 ('palm-angels','https://www.palmangels.com/'),
 ('paris-texas','https://paristexasbrand.com/')
)
update public.companies c
set website_url=v.url,
    metadata=coalesce(c.metadata,'{}'::jsonb)||jsonb_build_object(
     'site_discovery',jsonb_build_object(
       'origin','verified_public_official_brand_site',
       'verified_date','2026-11-17',
       'careers_source_confirmed',false))
from verified_sites v
where c.slug=v.slug
  and c.monitored=true and c.website_url is null;
-- Discovery will register a low-trust brand_website_candidate when needed,
-- and independently verify linked ATS boards. Never set official=true here.
