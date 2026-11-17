-- HUNT, 2026-11-17: idempotent cleanup for LEGACY candidate queue records.
-- Source scanners now reject these URLs before they can become job_candidates.
-- This script only changes candidate review status; jobs, historical
-- application dossiers, saved user state and CVs are preserved.
--
-- Do not use a generic "no published date" predicate: true vacancy pages
-- without official dates must remain in needs_review for later verification.
with non_jobs as (
 update public.job_candidates
 set status='rejected',
     parsed_at=now(),
     raw=coalesce(raw,'{}'::jsonb)||jsonb_build_object(
       'reason','navigation_hub_not_individual_vacancy',
       'review_method','explicit_career_hub_url_pattern')
 where status='needs_review'
   and (
      -- SuccessFactors category indexes, never individual postings
      listing_url ~ '^https://jobs[.](dolcegabbana|todsgroup|valentino)[.]com/go/'
      -- Broken JavaScript interpolated HTML template placeholders
      or position((chr(36)||'%7B') in listing_url)>0
      or position((chr(36)||'%7b') in listing_url)>0
      or position((chr(36)||chr(123)) in listing_url)>0
      -- Country/language/navigation and generic careers hubs
      or listing_url ~ '/viewalljobs/'
      or listing_url ~ '/jobs/send-cv$'
      or listing_url='https://www.kering.com/en/talent/job-offers/'
      or listing_url ~ '^https://jobs[.](valentino|dolcegabbana|pradagroup)[.]com/[?]locale='
      or listing_url ~ '^https://jobs[.](valentino|pradagroup)[.]com/content/'
      or listing_url ~ '^https://jobs[.]dolcegabbana[.]com/search([/?]|$)'
      or listing_url ~ '^https://jobs[.]pradagroup[.]com/search([/?]|$)'
      or listing_url ~ '^https://jobs[.]todsgroup[.]com/?$'
      or listing_url ~ '^https://jobs[.]monclergroup[.]com/(moncler|stone-island)-(careers|who-we-are|departments|marketing|collection|digital|creative|sustainability|wholesale|operations|research|legal|people|omnichannel|security|finance|retail|our-stores|product-development)'
      or listing_url in (
        'https://www.pradagroup.com/it/talents/job-opportunities.html',
        'https://www.maxmarafashiongroup.com/join-us',
        'https://www.coccinelle.com/it_it/job-application'
      )
      or listing_url ~ '^https://www[.]linkedin[.]com/(company/[^/]+/jobs|jobs/search-results)'
      or listing_url ~ '^https://joblink[.]allibo[.]com/ats5/application[.]aspx'
      -- Lever site-wide commitment/department filters, not actual job UUIDs
      or listing_url ~ '^https://jobs[.]lever[.]co/[^/?]+[?]'
   )
 returning id
)
select count(*) quarantined_legacy_candidate_links from non_jobs;

-- Check: select status,count(*) from public.job_candidates group by status;
-- An HTTPS URL or word "Job" is NEVER sufficient evidence of a vacancy.
