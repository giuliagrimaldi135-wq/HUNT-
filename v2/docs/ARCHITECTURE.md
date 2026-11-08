# HUNT 2.0 — Technical Architecture

## Guiding decision

The current GitHub Pages + JSON architecture remains the personal prototype.

HUNT 2.0 is built separately under `v2/` and must support:
- authentication
- private user profiles/CVs
- a global vacancy database
- per-user matching
- historical observations
- scalable ingestion

## Proposed beta stack

### Web
- Next.js + TypeScript
- responsive PWA first
- deployable to Vercel or equivalent

### Auth / database / private storage
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage for private CV files
- Row Level Security for all user-owned data

### Ingestion / intelligence
- Python
- requests / BeautifulSoup for public HTML
- structured ATS adapters
- scheduled workers
- GitHub Actions acceptable for early beta ingestion
- later migrate heavy scanning to a worker/queue without changing the data model

### Notifications
- OneSignal can remain for push during beta
- notification subscriptions belong to users/devices, not to one global profile

## System boundaries

### Global market layer
Shared by every user:
- companies
- jobs
- job_sources
- job_observations
- repost_events
- job_state
- company signals

### Intelligence layer
Shared analysis:
- normalization
- role-family classification
- seniority extraction
- deduplication
- source trust
- vacancy confidence
- freshness
- company hiring behavior

### Personal layer
Private per user:
- profile
- career preferences
- CV
- match scores
- feedback
- applications
- notification preferences
- outreach dossiers

## Ingestion pipeline

1. Discover source
2. Fetch source
3. Parse raw listing
4. Normalize company/title/location
5. Extract requisition ID and canonical apply URL
6. Generate fingerprints
7. Match to an existing canonical job or create one
8. Write a source observation
9. Update lifecycle state
10. Recalculate Vacancy Confidence
11. Recalculate affected user matches
12. Notify eligible users only when priority threshold is met

## Deduplication hierarchy

Strong identifiers first:
1. same company + same requisition ID
2. same canonical application URL
3. same ATS job ID
4. same company + normalized title + normalized location + near-identical description
5. fuzzy title/description similarity within a bounded time window

Never merge jobs solely because titles are similar.

## Repost handling

A repost is an event on an existing canonical vacancy when evidence suggests continuity.

Store:
- prior source listing ID
- new source listing ID
- timestamp
- whether requisition ID changed
- description similarity
- reason for linking

Repeated reposting should influence Vacancy Confidence only with other evidence.

## Vacancy state machine

Possible states:
- discovered
- active_verified
- active_likely
- evergreen_possible
- stale_possible
- closed_verified
- unknown

Transitions must be evidence-driven.

Example:
official apply form returns active → active_verified
official source disappears but aggregator remains → stale_possible
official source explicitly says closed → closed_verified

## Vacancy Confidence v1

Start explainable, not "AI magic".

Positive evidence examples:
- official source currently active
- working apply form
- stable requisition ID
- verified recently
- multiple trustworthy sources agree

Negative evidence examples:
- official source gone
- apply form dead
- very old listing
- repeated identical evergreen pattern
- only aggregator remains
- explicit talent-community language

Store the evidence items, not just the number.

## Matching v1

First version should combine deterministic and semantic features.

Deterministic:
- role family
- seniority
- geography
- language
- work authorization constraints if user chooses to provide them
- explicit exclusions

Semantic:
- experience relevance
- skill overlap
- description/profile similarity
- career-direction similarity

The output must include reasons:
- strong role-family match
- correct seniority
- relevant experience
- location fit
- missing requirement X

## Privacy / security

The current repository is public. Never store real user data there.

Rules:
- CV files private
- parsed personal data in private database tables
- service keys only in secrets manager
- Row Level Security enabled
- no personal data in public JSON
- deletion/export path designed before public launch
- log minimal personal information

## Repository strategy

Current root:
- HUNT personal prototype, kept operational

New:
- `v2/docs/`
- `v2/database/`
- `v2/services/`
- later `v2/web/`

We build the engine first, then the commercial UI.
