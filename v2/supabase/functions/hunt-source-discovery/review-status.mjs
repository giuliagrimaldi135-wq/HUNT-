// Supabase public.job_candidates has a strict status CHECK:
// discovered, parsing, promoted, skipped_old, needs_review, rejected.
// Never introduce an undocumented status: writes otherwise fail silently
// unless the caller inspects every PostgREST error.
export const reviewStatus=(retryCount)=>Number(retryCount)>=2?"rejected":"needs_review";
export const invalidVacancyStatus=()=>"rejected";
export const reviewFailureReason=(retryCount)=>Number(retryCount)>=2
 ?"review_exhausted_missing_official_job_facts":"missing_jsonld_or_date";
