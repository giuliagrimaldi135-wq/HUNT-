# Lever original posting date provenance — 17 November 2026

Public Lever Postings API (`https://api.lever.co/v0/postings/{board}?mode=json`) exposes `createdAt` as an epoch-millisecond timestamp for the posting's creation. It is **not guaranteed to be the first public publication date**. HUNT must not populate `jobs.published_at` from it. Keep it in `jobs.metadata.provider_creation_at`, with `provider_creation_is_publication_date=false`.

Strict 20-day recommendation policy:
- When the original ATS creation date exists and is older than 20 × 24 hours, **do not recommend** the posting even if HUNT discovered it yesterday.
- If datePosted exists, enforce the rolling 20-day limit on datePosted too.
- Use first_seen_at only when the provider does not supply datePosted, and label it as **first observed** rather than published.
- Public board membership and last_verified_at confirm *active status*, not age; a live posting can still be months old.
- Never delete jobs, application histories, saved CVs or user feedback as an age-cleanup step. Clear only computed `user_job_matches`.

Verification via official public board JSON (HTTP 200, checked 2026-11-17):
| Board | Public requisition | Posting creation UTC |
| --- | --- | --- |
| mulberry | 120146b3-3af2-4819-9cff-aae87fc2e3f6 | 2026-10-12 12:30:37.234 |
| vestiairecollective | 05b9f342-26f7-47f2-8f6b-f39cd2cb8870 | 2026-10-15 08:24:40.954 |
| veepee | b6c86376-e132-47ad-be2c-c5ebcd435e32 | 2026-11-17 09:28:26.870 |

The first two were **not** eligible to be called recent on Nov 17. All three jobs remain stored. This record is about public provider facts, not any individual's application or career profile.

Source documentation: https://hire.lever.co/developer/documentation and https://github.com/Lever/postings-api

Production modules: `hunt-ats-board-scan/lever-original-date.mjs`, `hunt-match-refresh/recommendation-guard.mjs`. Recovery SQL: `v2/database/hunt_operational_cron_integrity.sql`. HUNT's 5-minute cleanup and hourly quality audit must independently enforce the provider creation age.
