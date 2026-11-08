# HUNT 2.0 — UX & Feature Priority

## Core product rule

HUNT should search broadly in the background and show selectively in the foreground.

Backend ambition:
- many sources
- many companies
- many raw vacancies
- many company/news signals
- persistent history

User experience:
- few clear actions
- explanations
- evidence
- direct next steps

The user should never feel they are looking at an internal monitoring dashboard.

## MUST HAVE for beta

### 1. Today
The landing screen answers:
- what changed since last visit?
- what deserves attention now?
- what should I do today?

Examples:
- 4 new strong matches
- 1 application worth prioritizing today
- 2 companies with meaningful direct-outreach signals
- 1 application follow-up due

Do not show raw system counts unless they help trust.

### 2. Opportunities
Each card shows:
- title
- company
- location
- Match
- Vacancy Confidence
- Priority
- freshness
- verified source state

Primary actions:
- Open dossier
- Save
- Ignore

### 3. Opportunity dossier
The dossier must feel evidence-based.

Required sections:
- Why this is for you
- Why apply now
- Vacancy evidence
- Source / verification
- Repost history when relevant
- Potential gaps
- Recommended CV
- What to emphasize
- Apply link
- Company signals/news with sources
- Other live roles at the same company

Optional later:
- Career Move
- Your Edge as a named feature

These ideas may still influence copy internally even if they are not exposed as branded sections.

### 4. Multiple CVs
The user can upload multiple CV variants.

For every opportunity HUNT should:
- select the best existing CV;
- explain why;
- warn if no existing CV is a strong fit;
- optionally suggest specific edits.

HUNT must never invent experience not present in the user's data.

### 5. Ready to Send
A high-quality message/email generator.

Goal:
copy → quick human review → send.

It should use:
- user profile
- selected CV
- specific role/company
- company intelligence where relevant
- actual contact channel

Variants:
- application email
- recruiter LinkedIn message
- spontaneous email
- post-application follow-up

Every generated message must be grounded in known user/company/job data.

### 6. Where to contact
Show:
- channel
- verified public contact if available
- source of that contact
- confidence/recommendation

Never invent an email address.

### 7. Direct / Spontaneous
This is a major product surface, not a generic brand list.

A company qualifies only when there is evidence that direct outreach may make sense.

Required logic:
- no better suitable live vacancy;
- company profile makes direct outreach plausible;
- recent signal or structural reason;
- contact route exists or a specific public role/person to target can be identified;
- evidence and sources shown.

The system should search broadly across the public web for:
- openings
- showroom launches
- new markets
- category launches
- investment
- wholesale expansion
- retail expansion
- hiring movement
- leadership changes
- relevant press momentum

The user must see WHY NOW, not just the brand name.

### 8. Intelligence
Merge company signals and news into one coherent experience.

Two contexts:
- Company intelligence inside each dossier
- Market intelligence in a separate feed

Company intelligence:
- hiring
- openings
- expansion
- launches
- management
- financial/strategic movement
- relevant public posts

Market intelligence:
- important sector developments
- role/function trends
- changes likely to affect hiring

Every item needs provenance.

### 9. Applications
Simple pipeline:
- Preparing
- Applied
- Follow-up
- Interview
- Offer / Closed

Every application links back to its dossier and saved assets.

## INTERNAL ONLY

These exist in admin/backend, not user navigation:
- Brands registry
- Source registry
- ATS family
- parser health
- raw job count
- source failures
- ingestion diagnostics
- dedupe diagnostics

## TEST IN BETA

Useful ideas that should not block launch:

### Career Move
Explain whether a role is:
- direct target
- strong adjacent step
- weak/indirect step

Validate whether users find this useful before making it prominent.

### Your Edge
One concise positioning angle for the application.
Can first exist as a field inside the dossier rather than a separate branded feature.

### Opportunity urgency narratives
Examples:
- "Apply today"
- "Worth preparing this week"
- "Monitor, don't prioritize"

Test whether users trust/use these recommendations.

## DO NOT BUILD YET

Until the engine proves value:
- social network features
- public user profiles
- employer marketplace
- complex gamification
- native iOS/Android apps
- elaborate dashboards
- badges for every possible metric
- generic AI chat as the center of the product

## Design principle

HUNT should feel like:
"Someone has already done the searching, checking and prioritizing for me."

Not:
"Here is another database to browse."
