# HUNT — autonomous ingestion and freshness operations (17 Nov 2026)

This document describes the deployed state and recovery invariants. It is **not** a claim of worldwide coverage or a replacement for monitoring production.

### Independently owned scanners
- `hunt-source-discovery` (every 5 minutes): **only** official `career_page` sources. It must not mark a dedicated ATS or SuccessFactors source degraded.
- `hunt-ats-board-scan` (every 5 minutes): public structured ATS boards, with rate-aware backoff and stable official job identity.
- `hunt-successfactors-public` (every 10 minutes): official SAP category rotations, bounded per-category cursors. It waits 20/45/90/180/360 min after successive failures instead of hammering a 503.
- `hunt-vacancy-monitor` (every 10 minutes): checks individual vacancy URLs; **never** changes `sources.health_status`.
- `hunt-match-refresh` (every 5 minutes): confirmed CV facts, eligibility and strict rolling 20-day cutoff.
- `hunt-recommendations-cleanup-5m`: pg_cron removal of expired matches; configuration in `v2/database/hunt_operational_cron_integrity.sql`.

### Core quality invariants
1. Published dates are supplied by an official posting, never inferred from a refreshed verification. If no provider date exists, a separate `first_seen_at` fallback is labeled as such.
2. Personalized suggestions require a substantive description (at least 250 characters), recent job verification (within 7 days), relevant title/seniority and role constraints.
3. An ATS error does **not** imply that all postings disappeared. Preserve `jobs` and application history while the official source recovers.
4. Shared group URLs (e.g. OTB) are fetched once per physical endpoint, and source health is synchronized across duplicate registered brand pages.
5. `job_candidates` statuses must respect the live database CHECK constraint: `discovered`, `parsing`, `promoted`, `skipped_old`, `needs_review`, `rejected`. A category filter or navigation link is not an individual vacancy.
6. Never treat an unverified brand website candidate as an official careers source.
7. All human-facing alerts should use actionable summaries; avoid per-scan/per-source email spam.

### Useful non-secret health queries
```sql
select now(),metrics from public.hunt_quality_snapshots order by snapshot_at desc limit 1;
select s.health_status,count(*) from public.sources s where s.active group by 1;
select status,count(*) from public.job_candidates group by status;
select count(*) from public.user_job_matches m join public.jobs j on j.id=m.job_id
 where coalesce(j.published_at,j.first_seen_at)<now()-interval '20 days';
select jobname,schedule,active from cron.job where jobname like 'hunt-%' order by jobname;
```

### Known outstanding limitations
- The app's global coverage is not exhaustive. An indexed page, directory listing or social post is not itself confirmation of an active official vacancy.
- The Furla `work-with-us` links were returning HTTP 404 from the connected runtime at the last check; don't replace with an unverified URL.
- Prada's official SuccessFactors endpoint may intermittently return HTTP 503; jobs remain recorded and category scans resume after cooldown.
- The connected Vercel account does not expose the production project's workspace, so GitHub deployment status alone is not an end-to-end frontend acceptance test.
- Supabase Auth leaked-password protection was flagged by the security advisor. It must be reviewed in the appropriate Auth settings; do not claim it was enabled without verification.
