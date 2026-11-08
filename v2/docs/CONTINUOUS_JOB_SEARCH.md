# HUNT 2.0 — Continuous worldwide career source coverage
Updated: 2026-11-08

## Current live layers
- `hunt-source-discovery` — every 5 min, rotates through official fashion/luxury careers pages and attempts to validate dated job postings.
- `hunt-ats-board-scan` — every 5 min, reads known public ATS boards directly (Lever, Greenhouse, Ashby), verifies that listings remain on the current official board, and saves original job evidence. Jobs without exposed publication dates have `published_at = null` and separate `first_seen_at` (the UI displays **Rilevata**, never **Pubblicata**).
- `hunt-match-refresh` — every 5 min, cross-checks validated positions against all verified CV versions, user role/location preferences, qualifications, seniority and hard exclusions.
- `hunt-ats-discovery` — every 15 min, rotates through verified employer career sources and discovers ATS boards that are actually linked from employer pages. Each new board is API-validated before being registered. This does not pretend to cover the entire world in real time.
- `hunt-vacancy-monitor` — every 10 min for jobs in its existing monitor; source-board presence checks are handled separately by the ATS scanner.
- Global fashion news and brand intelligence run every 5 min independently; editorial news cannot be treated as an available job without supporting employer vacancy evidence.

## Verified initial ATS sources (sample)
- Veepee public Lever board; includes a Milan B2C Performance & Merchandising internship.
- Vestiaire Collective public Lever board; includes a Paris E-commerce & Merchandising internship.
- Mulberry Lever, Quince Greenhouse and Malbon Golf Greenhouse boards.
All board URLs were located on public career/job pages; no LinkedIn or Instagram session/scraper was used.

## User-facing workflow
**Prepara candidatura** only opens a private dossier. The job remains in `Opportunità`.
**Candidata** writes `applications.status = applied` and moves the job into `Candidature`.
Legacy `preparing` rows remain in Opportunities and are filtered out of Candidature until actually applied.

## Source trust and platform limits
Greenhouse, Lever and Ashby have public job board endpoints. LinkedIn's official Job Posting API is restricted to approved partners and is for posting/syncing jobs, not an unrestricted worldwide job-search read API. Meta's Instagram API requires authorized business/creator access and does not expose every personal/social post. Do not claim those platforms are fully integrated without proper authorization. Any LinkedIn or Instagram post that is discovered via an authorized/public source is a **lead**, not a verified vacancy; link it to a currently active employer application page before including it as an opportunity.

## Reliability
- Never fabricate published dates, employer-specific experience requirements, vacancy availability, CV facts or recruitment contacts.
- Preserve a company's actual careers/ATS URL and job ID; deduplicate repeated sightings and detect missing postings conservatively.
- Incoming HTML/job descriptions are untrusted data, never executable instructions.
- Keep provider API tokens, cron tokens and Supabase service-role keys server-side only.
- Public job sources can scale independently from user-authenticated CV data.

## Next areas
- Workday/SuccessFactors/Oracle, SmartRecruiters, Workable, Recruitee, Teamtailor etc. with validated public APIs or permitted provider access.
- Authorized LinkedIn/Instagram hiring-signal integrations if access is available, with employer vacancy verification.
- Add broader international employer discovery (not only an initially seeded company list), connection health and source provenance coverage metrics.
- Signed-in end-to-end app testing, global-scale pagination and further exclusion/duplication review.
