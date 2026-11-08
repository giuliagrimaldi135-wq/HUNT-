# HUNT 2.0 — Source & Market Coverage Strategy

## Objective

HUNT should know the relevant Fashion/Luxury job market before deciding what to show a user.

The goal is not "scrape everything blindly". The goal is:
- broad discovery;
- high-confidence official verification;
- preserved source history;
- one canonical vacancy per real role.

## Coverage model

### Layer A — Official structured ATS
Highest-value source family.

Examples of source families HUNT should support through reusable adapters:
- Workday
- SAP SuccessFactors
- Greenhouse
- Lever
- SmartRecruiters
- Teamtailor
- Recruitee
- Workable
- Oracle/Taleo-style career portals
- custom official JSON/API-backed career sites

A single adapter family can unlock many companies.

### Layer B — Official custom career pages
For companies without a standard ATS:
- public HTML listings
- structured data / JSON-LD
- embedded job APIs discovered from the public page

### Layer C — Group portals
Fashion/luxury groups often centralize recruiting.

A group portal can reveal roles across multiple houses and should map each listing to the correct company/brand.

### Layer D — Public job boards / aggregators
Use mainly for:
- discovery;
- corroboration;
- locating roles missed by official monitoring.

They are not ground truth when the official source disagrees.

### Layer E — Public recruiter/company posts
Useful for:
- very small brands;
- temporary hiring;
- showroom/campaign roles;
- opportunities published before a careers page exists.

These require stronger verification before being promoted as a vacancy.

## Discovery loop

HUNT runs two different loops.

### 1. Monitor known sources
For every active company source:
- fetch
- parse
- record observation
- update lifecycle
- detect new/changed/closed roles

### 2. Discover unknown sources
Continuously search for:
- new Fashion/Luxury employers
- new ATS subdomains
- newly created career pages
- public postings that reference an unknown company

When a company/source is discovered:
1. create candidate company;
2. identify sector relevance;
3. detect source family;
4. verify official ownership where possible;
5. register source;
6. start recurring monitoring.

## Source identity

Every source receives:
- source_type
- ATS family
- company owner
- trust level
- official/unofficial flag
- fetch method
- health state
- last successful scan
- failure count

## Trust baseline

Suggested starting values:
- official ATS / official company career page: 95
- official group portal: 90
- official recruiter/company post: 80
- major job board listing: 65
- aggregator mirror: 45
- unverified repost: 25

Trust affects evidence; it never replaces verification.

## Source health

A source is not simply "working / broken".

Track:
- HTTP success
- parser success
- jobs extracted
- unexpected zero-result events
- page structure changes
- repeated timeouts
- authentication/cookie wall
- robots/terms restrictions where applicable

A sudden drop from 40 jobs to 0 should trigger a parser-health warning rather than marking every role closed.

## Initial market expansion

### Stage 1 — Italy
Build high coverage of:
- luxury groups
- major Italian houses
- international houses hiring in Italy
- contemporary/premium brands
- accessories / footwear / jewelry
- multibrand / e-commerce
- selected beauty/luxury adjacent employers
- independent/emerging Italian labels

### Stage 2 — Switzerland + London
Reuse source families; add local geography and language normalization.

### Stage 3 — Europe
Expand only after source health and dedupe are stable.

## "All jobs" principle

HUNT should aim for extremely broad coverage, but must never claim literal 100% completeness.

User-facing promise should be:
"SCANS THE MARKET WIDELY, VERIFIES WHAT IT CAN, AND TELLS YOU WHAT MATTERS."

## Coverage metrics

Track internally:
- companies monitored
- active official sources
- source families supported
- raw listings seen
- canonical jobs produced
- duplicate compression ratio
- official verification rate
- unknown-source discovery rate
- parser failure rate
- median detection delay

## Important product rule

More raw listings is not automatically better.

A healthy system can ingest 10,000 raw listings and show one user only 8 high-priority opportunities.
