# HUNT 2.0 — Product Specification

> Working name: HUNT. Public naming will be revisited after product validation.

## Product promise

HUNT is a personal career-intelligence system for Fashion & Luxury.

It should:
1. discover as much of the relevant job market as possible;
2. merge duplicates into one real vacancy;
3. estimate whether a vacancy is genuinely active now;
4. understand each user's profile and preferences;
5. rank opportunities by personal relevance and urgency;
6. help the user act: apply, prepare, follow up, interview.

HUNT is **not** a generic job board and must not win by showing more noise.

## Core user outcome

Within the first 7 days, a new user should discover at least one high-quality opportunity that:
- is relevant to their real career goal;
- appears genuinely active;
- they had not already found or prioritized alone.

## MVP scope

Initial vertical:
- Fashion
- Luxury
- Premium / contemporary fashion
- Accessories, footwear, jewelry, beauty when role families overlap

Initial geography:
- Italy first, with Milan as the densest market
- structured support for London and Switzerland after the Italian ingestion layer is stable
- architecture must support Europe from day one

Initial seniority:
- internships
- graduate roles
- traineeships
- assistants
- junior / entry-level roles

The schema must support higher seniority later.

## The three scores

Every user-facing opportunity has three distinct values.

### 1. Match Score
How well this role fits this specific user.

Inputs include:
- target role families
- negative role preferences
- seniority
- geography / relocation
- skills
- education
- languages
- prior experience
- saved / ignored / applied behavior
- explicit brand preferences

### 2. Vacancy Confidence
How strong the evidence is that the vacancy is genuinely active now.

It is an evidence score, **not a claim that a job is fake or real**.

Signals can include:
- official company/ATS listing
- active application form
- requisition ID
- first-seen and last-verified timestamps
- publication age
- repeated reposts
- identical description history
- presence/absence on official career site
- explicit talent-pool / evergreen language
- source agreement

User-facing labels:
- VERIFIED ACTIVE
- LIKELY ACTIVE
- POSSIBLE EVERGREEN / TALENT POOL
- STALE / CLOSED
- INSUFFICIENT EVIDENCE

### 3. Priority Score
What the user should do next.

Combines:
- Match Score
- Vacancy Confidence
- freshness
- application deadline where known
- user intent / brand preference
- competition / urgency signals when evidence is reliable

Example:
- Match 96
- Vacancy Confidence 94
- Priority 97 → APPLY NOW

## Vacancy lifecycle

HUNT must store the vacancy as a living object, not as a disposable link.

For every job:
- canonical company
- canonical title
- role family
- seniority
- location
- source list
- requisition IDs
- first seen
- last seen
- last verified
- active/closed state
- normalized description
- description fingerprint
- application URL status
- repost history
- confidence evidence

If the same role appears on Prada Careers, LinkedIn and FashionJobs, the user sees one vacancy with three sources.

## Source strategy

Priority order:
1. official ATS / official career page
2. official group career portal
3. public job boards / aggregators used as discovery or corroboration
4. public recruiter/company posts
5. public industry sources for hiring signals

Important:
- public/authorized sources only;
- job boards are not treated as ground truth when an official source disagrees;
- each source observation is preserved for historical analysis.

## Discovery

HUNT cannot depend on a hand-maintained list of brands forever.

The ingestion layer needs two modes:

### Known-company monitoring
Continuously scan priority Fashion/Luxury companies and their ATS/career endpoints.

### Discovery mode
Discover companies and roles not already configured via:
- ATS domains
- group career portals
- public job feeds
- reputable job-board discovery
- industry/company signals

A newly discovered relevant company should become a company record automatically, then enter monitoring.

## Personal profile

Each account should store:

### Professional identity
- CV / parsed experience
- education
- skills
- languages
- seniority

### Career intent
- primary role families
- secondary role families
- roles to avoid
- preferred industries
- locations
- relocation willingness
- internship / full-time constraints
- brand preferences

### Learned preferences
Derived from:
- save
- hide
- apply
- "more like this"
- "too sales"
- "too senior"
- "wrong location"
- "brand yes, role no"

Explicit user choices always override inferred preferences.

## Core screens

### Today
A small ranked set of actions, not a feed dump.

### Opportunities
All relevant vacancies with:
- Match
- Vacancy Confidence
- Priority
- source / verification state
- freshness
- dossier

### Opportunity dossier
- why it fits
- why apply now
- possible gaps
- evidence that the vacancy is active
- repost history
- source timeline
- recommended CV variant
- what to emphasize
- ATS keywords
- application link
- where to contact + provenance
- ready-to-send application/recruiter message
- company intelligence and sourced news
- other live roles at the same company
- interview preparation

### Direct / Spontaneous
A core product surface. It must search broadly and remain evidence-based.

Only when outreach has a real reason to exist:
- no better suitable live vacancy
- company structure makes direct outreach plausible
- concrete recent signal or structural reason
- verified public contact or recommended role/person to find
- source/evidence shown to the user
- never invent contact details

Signals may include retail/showroom openings, expansion, new markets, category launches, investment, wholesale growth, hiring movement, management changes and relevant public press/posts.

### Applications
Pipeline:
- preparing
- applied
- follow-up
- interview
- offer
- rejected / closed

### Intelligence
Company and sector intelligence with source provenance.

### Profile
Multiple CV variants, goals, preferences and feedback controls.

### Internal admin only
Company/brand registry, source registry, ATS families, parser health, ingestion diagnostics and raw coverage metrics are not part of normal user navigation.

## What HUNT must avoid

- showing the same vacancy multiple times;
- presenting stale aggregator listings as live jobs;
- calling a vacancy "fake" without evidence;
- overwhelming users with every possible listing;
- recommending irrelevant sales roles because they contain fashion keywords;
- spontaneous applications to large brands when a relevant live vacancy exists;
- inventing recruiter emails;
- treating every user like the current prototype profile.

## Beta success metrics

### Market quality
- >=90% capture of verified relevant vacancies from the initial priority-company set
- duplicate rate below 5% in user-facing feed
- closed/stale official vacancies reflected within 24 hours of verification
- every user-facing job retains source provenance

### Personalization quality
- top results visibly differ between users with different goals
- explicit negative preferences are respected
- feedback changes future ranking
- user can understand why a role is recommended

### Product value
- >=40% of beta users save/apply to at least one HUNT-discovered role in first 14 days
- collect qualitative evidence of "I would not have found/prioritized this without HUNT"

## Build principle

Coverage first.
Truth/verification second.
Personalization third.
Beautiful UI and monetization after the engine is trustworthy.
