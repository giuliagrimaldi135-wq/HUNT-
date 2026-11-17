# Recoverable cleanup of false vacancy candidates

The HUNT 2.0 review queue had multiple historical entries created by early HTML link discovery: SAP category pages, language selectors, employer career homepages, generic LinkedIn job searches, Lever filters, spontaneous application forms, and JavaScript template variables.

They do not represent individual vacancies. In production, on 17 Nov 2026, **45** and then **60** additional false candidates were classified `rejected` using narrow URL matches. Earlier 130 Lever filter URLs, 121 Moncler navigation URLs and 56 already verified ATS candidates were separately reconciled. Nothing in `jobs` or user-owned `applications` was deleted.

The idempotent query in `v2/database/hunt_candidate_navigation_quarantine_2026_11_17.sql` can reclassify legacy records when rebuilding the production DB. New ingestion is now guarded in `v2/supabase/functions/hunt-source-discovery/candidate-integrity.mjs` and its regression tests. The cleanup does **not** treat absence of structured publication date as a rejection criterion; such official job detail pages remain under `needs_review` until verified.

This registry cleanup is not proof that all remaining 85 candidate pages are fresh, complete or actionable.
