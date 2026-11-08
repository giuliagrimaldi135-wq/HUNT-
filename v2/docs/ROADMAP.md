# HUNT 2.0 — Build Roadmap

## Phase 0 — Product foundation
Status: STARTED

Deliverables:
- product specification
- architecture
- database schema
- scoring definitions
- source taxonomy
- migration map from HUNT prototype

Exit condition:
We can explain exactly what a company, vacancy, source observation, repost and user match are.

## Phase 1 — Global vacancy core

Build:
- company registry
- canonical job model
- source records
- observation history
- ATS/source adapters
- canonicalization
- deduplication
- job lifecycle

First target:
Italy Fashion/Luxury internship + junior market.

Exit condition:
One vacancy may have many sources but appears once.

## Phase 2 — Vacancy Intelligence

Build:
- Vacancy Confidence v1
- apply-link validation
- repost detection
- evergreen/talent-pool signals
- source trust weighting
- closed/stale detection
- explanation/evidence output

Exit condition:
Every vacancy gets an explainable state and confidence score.

## Phase 3 — Multi-user profiles

Build:
- authentication
- profile onboarding
- CV upload/parsing
- primary/secondary role preferences
- exclusions
- geography
- languages
- user feedback events

Exit condition:
Two users with different goals receive materially different rankings.

## Phase 4 — Personal matching

Build:
- Match Score v1
- Priority Score
- reasons/gaps
- feedback learning
- notification eligibility

Exit condition:
Top recommendations are explainable and respect explicit exclusions.

## Phase 5 — Candidate workflow

Build:
- opportunity dossier
- why now / evidence section
- save/prepare/apply
- application tracker
- multiple CV variants
- CV recommendation
- ATS keyword analysis
- ready-to-send application/recruiter messages
- sourced company intelligence
- verified contact routes
- interview dossier

Exit condition:
A user can go from discovery to interview preparation without leaving HUNT except to submit the application.

## Phase 6 — Direct outreach

Build:
- broad public-web company discovery
- small/emerging company prioritization
- no-better-live-vacancy guard
- hiring/growth/opening/launch signals
- source-backed WHY NOW
- verified public contact routes
- outreach dossier
- ready-to-send spontaneous email

Exit condition:
Direct outreach is shown only when it is more useful than applying to a live vacancy.

## Phase 7 — Private beta

Target:
20–50 users from fashion schools / early-career fashion network.

Measure:
- opportunities users had not found themselves
- saves/applies
- false positives
- missing vacancies
- ranking quality
- willingness to pay

Do not optimize vanity metrics.

## Phase 8 — Monetization and launch

Only after engine validation:
- Free vs Pro limits
- Stripe
- referrals
- school partnerships
- creator partnerships
- public naming/brand identity
- domain/trademark checks
- launch content

## Immediate next build tasks

1. Create database schema.
2. Implement source + canonical job data classes.
3. Implement deterministic dedupe v1.
4. Implement Vacancy Confidence v1.
5. Create ingestion adapter interface.
6. Port one source family (e.g. Workday or official HTML) into the new pipeline.
7. Migrate a sample of existing HUNT jobs into canonical format.
8. Add automated tests before expanding source count.
