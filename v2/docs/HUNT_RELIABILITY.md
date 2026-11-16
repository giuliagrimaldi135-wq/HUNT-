# HUNT — Reliability and unattended operation

Updated: 2026-11-16

## Goal

HUNT should continue refreshing sourced career opportunities and fashion signals when the owner is not using the app. Runtime errors should be retried when safe, invalid releases must never replace the latest good website, and repeated problems must produce one actionable incident rather than a separate failure email every five minutes.

This is operational resilience, not a claim of unrestricted scraping or self-repairing source code.

## Active workflows

| Workflow | Purpose | Failure policy |
|---|---|---|
| `.github/workflows/hunt-radar.yml` | Scheduled scanner for career and public-fashion signals; persists changed JSON to `main` | Clean-data retry (2 attempts) for jobs/news; git push retry (5 attempts); preserve previous published data on failure; one GitHub issue per unresolved incident; automatically close on recovery |
| `.github/workflows/pages.yml` | **Only** publisher for GitHub Pages, including refreshed radar data | Build + full preview regression checks; **do not publish** failed builds; preserve last successful Pages release; consolidate test failures in a single issue automatically closed on successful publication |
| `.github/workflows/hunt-health.yml` | Scheduled independent watchdog, every 3 hours | Check successful radar freshness (maximum 6 hours) and public preview page HTTP response; check whether a radar incident is already open; open one deduplicated health issue if degraded; close on recovery |
| `.github/workflows/hunt-preview-syntax.yml` | Pre-merge code smoke tests | Runs for pull requests and manual dispatch, not repeated on every `main` push |
| `.github/workflows/hunt-v2-tests.yml` | Server-side Python tests | Still runs separately when `v2/services/**` is edited |

## What was fixed after the November 9–11 failure storm

- Hundreds of `Deploy HUNT` failures were caused mainly by source/code tests failing after rapid sequential changes, with each commit triggering an email. This is a development/release-gating problem, not proof that every app scan fails.
- The radar previously had **its own Pages deploy job** while a second `pages.yml` workflow was triggered by the radar's data commits. These competed to deploy the same site. The radar deploy job has been removed.
- Two workflows previously repeated much of the same JavaScript validation on `main`. The separate preview smoke workflow now targets pull requests.
- Release checks remain strict, but an invalid build now stops publication and creates at most one open GitHub issue, with a GitHub Actions step-summary warning. No failed code should silently replace the live release.
- The scanner no longer marks failed git pushes as a harmless `changed=false`. Scanner and alert failures are recorded in a consolidated issue after bounded retry; the original data remains available.

## Operational incidents

- **`HUNT · pubblicazione bloccata dai controlli`**: public preview generation, syntax, or regression gate failed; latest deployed site stays unchanged.
- **`HUNT · aggiornamento dati o notifiche bloccato`**: radar failed to scan, publish data, or complete a notification channel. One issue while degraded; close on full recovery.
- **`HUNT · radar o sito non aggiornati`**: watchdog detected no recent successful radar run, a scanner incident, or a public-site availability issue. One issue while degraded; close on recovery.

**Important:** A release workflow can show a green overall GitHub job even when its *quality-gate step outcome* was failure, because publication is quarantined deliberately. Read the job summary and open issue before assuming a new release was published. Likewise, radar issue status is part of its true operational health. Operational health is **not** identical to GitHub workflow status alone.

## Things that remain outside the guarantee

1. GitHub scheduled workflows can be delayed, cancelled, rate-limited, or disabled by the host platform. The five-minute cron expression is a target, not a guaranteed five-minute data freshness SLA.
2. The watchdog itself runs on GitHub; if GitHub Actions stops altogether, it cannot alert from the same platform. An independently hosted uptime monitor is required for stronger guarantees.
3. Supabase Free projects may pause after provider-defined inactivity. The active database must be monitored independently from repo scans; a GitHub-only data scanner does not guarantee Supabase uptime.
4. External media APIs (LinkedIn, Instagram, TikTok) require licensed/authorized access and cannot be assumed available or silently bypassed.
5. Automated retries cannot reliably repair source-code bugs or changes to external-provider contracts. Those require reviewed code, verified tests and possibly user reauthorization.
6. Vercel deployment and authenticated end-to-end interactions were not verified in this hardening pass.

## Engineering procedure from now on

- Make a single cohesive change per feature; test all relevant modules before merging. Prefer pull requests and successful pre-merge smoke tests instead of rapid direct pushes to main.
- Do not disable test gates to silence notifications. The quality gate must block invalid deployments and preserve the previous release.
- Do not turn failure detection into a false claim of success; retain GitHub step summaries and one consolidated incident.
- Compare scan outputs and verify freshness. A successful scheduled run does not alone establish comprehensive live coverage across every brand.
- Review operational incidents before declaring HUNT fully healthy.

## 16 November 2026 — Verified live vacancy-quality changes

Production status is **verified in Supabase**; Vercel is still not independently verified.

- GitHub pull requests [#10](https://github.com/giuliagrimaldi135-wq/HUNT-/pull/10) and [#11](https://github.com/giuliagrimaldi135-wq/HUNT-/pull/11) merged into `main`. GitHub Python and Node regression checks passed.
- Supabase `hunt-match-refresh` Edge Function deployed as **version 15** with two layers of deduplication. Latest observed cron HTTP response was 200 with 536 unique vacancies processed, 98 duplicate source records excluded from recommendations and 13 personal suggestions matched.
- Personal recommendation filtering: real `published_at` (or `first_seen_at` only when no publication date is known) must be within the latest 20-day window; `last_verified_at` must be within seven days; state must be `active_verified` or `active_likely`.
- Strong verified SmartRecruiters board + numeric job ID can deduplicate across sibling brands; generic careers URLs never merge jobs. This was needed because 199 official application URLs occurred under both Max Mara and Sportmax for the same MaxMaraFashionGroup ATS board.
- Seven outdated/inactive computed `user_job_matches` were removed with a narrow SQL DELETE. A subsequent database check reported 13 matches and **zero** stale/older-than-20-days matches. Historical `jobs`, private CVs, and saved applications were not deleted.
- The recurring database cleanup `hunt-recommendations-cleanup-hourly`, pg_cron job **24**, runs at minute **34** of every hour. It removes only `user_job_matches` whose linked job is non-active, lacks both dates, has `coalesce(published_at,first_seen_at)` older than 20 days, or has an absent/older-than-seven-days verification. Independent quality snapshots remain on job **23** at minute **28**. Match-refresh remains job **16**, every five minutes.
- Two repeated and degraded SmartRecruiters sources were quarantined (`active=false`): `3b3c9f64-97ea-4150-9f20-c9e3800f139a` (Max Mara) and `c9d49872-4b2f-4830-8575-30891847860c` (Sportmax). The canonical active healthy source `cf4434fe-a71c-4317-b758-9f6d15e6b1ab` (`careers.smartrecruiters.com/MaxMaraFashionGroup`) still scans the same ATS board. Existing `hunt-ats-discovery` identifies known boards by per-company URL even if marked inactive, preventing these two exact registrations being reactivated from their career origins without further changes.
- Approved luxury/editorial UI, CV dossier, outreach, cover letters and user-owned content were unchanged.

**Remaining quality work:** 41 thin active-vacancy descriptions in the last audit, source degradation such as Furla careers extracting no jobs, brand attribution for group-owned ATS boards, stronger independent source coverage monitoring and authenticated Vercel/browser checks. A passing cron execution is not by itself proof that every underlying site returned complete data. Never describe HUNT as globally comprehensive or fully self-healing.
