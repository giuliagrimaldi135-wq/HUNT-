# HUNT — verified employer homepages (2026-11-17)

The previous registry had 16 monitored fashion brands with no `website_url`, preventing the autonomous ATS-discovery loop from inspecting them. The safe, narrow recovery DML is in `v2/database/hunt_curated_brand_websites_2026_11_17.sql`.

The change **does not assert a verified careers page or open position**. The website is discovery-only: `hunt-ats-discovery` seeds `sources.source_type=brand_website_candidate`, `official=false`, and scans the site for actual linked, functioning ATS APIs. Only a successfully checked ATS endpoint can become a higher-trust source.

After deployment the production loop seeded all 16 nonofficial leads across two requests (12 + 4); the HTTPS endpoints and company identity still require appropriate ongoing checks. Existing company jobs, applications, CVs, user drafts, and sources were not overwritten.

The registry still contains brands with no confidently established public homepage, and a website alone is insufficient to claim world-wide job coverage.
