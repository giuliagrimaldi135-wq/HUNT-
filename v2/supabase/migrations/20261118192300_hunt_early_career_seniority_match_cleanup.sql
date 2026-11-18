-- Remove only computed recommendations that are provably unsuitable
-- for early-career accounts. Preserve jobs, profiles, saved applications and CVs.
delete from public.user_job_matches m
using public.jobs j, public.profiles p
where m.job_id=j.id and m.user_id=p.user_id
  and p.seniority in ('internship','trainee','entry_level','assistant','junior')
  and j.canonical_title ~* '(^|[^[:alnum:]])(senior|director|principal|head of|chief)([^[:alnum:]]|$)'
  and j.canonical_title !~* '(^|[^[:alnum:]])(internship|intern|tirocinio|stage)([^[:alnum:]]|$)';
