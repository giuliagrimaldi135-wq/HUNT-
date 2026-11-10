# HUNT 2.0 — Candidature spontanee / Luxury Outreach Intelligence
Date: 2026-11-10 · Product scope: *user-approved dossiers and CV UI remain frozen*

## The product
Spontanee is a **sourced commercial-opportunity detector**, not a generic contact directory or a claim to see all social posts worldwide. It is designed for independent, small and emerging fashion/luxury labels that can lack a traditional ATS.

The user sees a selective feed, opens a full folder and learns:
- **Perché candidarti adesso:** an editorial reason directly connected to a dated, linked event, with caveats when hiring is unconfirmed.
- **Scheda candidatura:** relevant functional area, selected CV, event date; a real official vacancy should take priority when it exists.
- **News del brand da conoscere:** current World Radar articles correlated with an *exact* brand-name match. Never interpret an article alone as a hiring signal.
- **Email pronta da personalizzare:** editable subject and body; facts from a selected CV are included only when the CV profile is confirmed. The user's changes are preserved and do not regenerate on page opening.
- **Dove contattare il brand:** public verifiable page and explicitly distinguished HR vs general/non-HR contact; never guess names or email patterns.
- **Candidature:** only user-declared submissions enter the sent pipeline; preparing is separate from applied. HUNT does not automatically send emails.

## Current implementation (revision 157)
- Preview: `hunt2-preview/outreach-intelligence.js`, integrated in `hunt2-preview/app.js`, styled in `luxury-refinement.css`.
- Source evidence for the first launch is drawn from the **existing original HUNT weekly outreach research**, at `data/chatgpt_outreach.json`, NOT newly gathered social posts. At 2026-11-10 it contained 9 researched leads; 8 pass a basic positive-event/date/link gate. The filter rejects unsupported corporate anecdotes and avoids showing a made-up 95% match badge.
- Public `company_signals` (source-linked) can supplement an existing folder; a new candidate is allowed from this table only when an independent/small brand has a direct commercial signal. Broad corporate news from large groups cannot create a cold-outreach recommendation on its own.
- `world_news_items` is joined client-side by strict brand-name matching, recent date and unique URL; news only supplements an already sourced dossier.
- Source URLs use only HTTP(S); values are escaped before rendering. Email contact routes require syntax validity plus an associated public provenance URL; when uncertain, the UI gives the source page, not an invented recruiter address.
- Drafts and statuses persist to `public.user_outreach_drafts` in Supabase. Migration `private_outreach_drafts` was applied successfully to project Hunt 2. RLS is enabled with owner-only SELECT/INSERT/UPDATE policies and no anonymous SELECT grant. Do not put user-specific email edits into the public repository.
- The page integrates with `Candidature` when a user explicitly marks spontaneous outreach as sent. Neither that action nor copying the draft sends an email automatically.
- Automated tests cover evidence filtering, invalid/future link blocking, false brand news associations, confirmed/unconfirmed CV facts and escaped output; the current dedicated suite passes 6/6 targeted tests and frontend syntax checks. Real authenticated browser QA and GitHub Pages deployment status are not yet verified.

## Current data gaps — do not overclaim
Read-only audit of Hunt 2 at 2026-11-10 found ~155 companies, ~264 intelligence-source registrations, **78 social URLs** (Instagram 29, YouTube 20, TikTok 16, LinkedIn 13), **zero successful social source scans**, ~11 company signals, and **zero rows in `outreach_candidates`**. Only one company's `is_independent` flag is set and the company size fields are largely not enriched. Counts describe what exists, not global completeness or genuine hiring outcomes. These gaps must be fixed before claiming autonomous discovery of small emerging labels.

## Source intelligence architecture — next implementation
1. **Discovery:** find previously unknown fashion/luxury houses using official websites, public industry directories, press, trade shows, local commercial news, opening announcements and authorized ATSs. Resolve company legal/trading name, independent/group relationship, home city, size range and careers page *with source provenance*. Do not call an unknown-size brand small without supporting evidence.
2. **Signal ingestion:** normalize dated events such as first stores, temporary pop-ups, category launches, buying/wholesale expansion, showroom moves, funding, international distribution, production growth and publicly announced team hiring. Exclude generic campaigns or unrelated awards as direct hiring evidence.
3. **Social:** official company/creator pages and permitted public index leads may generate *hypotheses*, but not verified vacancies without a link to original employer evidence. LinkedIn organizational posts require appropriate permissions and organization access; Instagram Meta APIs require authorized scopes; TikTok Research API access is subject to eligibility and research restrictions. Never bypass logins, anti-bot controls, private content or platform terms. Keep platform/permission/last-success state per source.
4. **Evidence graph:** store company, event type, source URL, source/author, published vs first-seen dates, brand identity, location, scope, 2nd-source corroboration, access limitations, ambiguity and stale decay. Deduplicate identical events/URLs. One story repeated on 20 blogs does not create 20 independent signals.
5. **Eligibility:** verify a credible direct signal, alignment to an entry-level functional area, location relevance, existence or absence of a more appropriate live company vacancy, an actual corporate contact route, freshness and specificity. Apply exclusion or a stronger uncertainty warning to low-confidence signals. Do not present scores based on guessed hiring probability.
6. **CV and outreach:** match documents against role needs with explicit confirmed evidence and missing requirements. Generate an email in Italian/English without inventing achievements, and preserve editable user drafts. Require explicit send outside HUNT or a separately authorized sending integration.
7. **Audit:** compare at least 20 small/emerging brands across official sites, relevant press, public company pages and job portals; measure event precision, misattribution, contact provenance, duplication, date accuracy, source degradation and whether HUNT would send the user to an existing suitable vacancy first.

## Source credibility policy
- **Official, directly relevant and recent**, preferably corroborated: candidate for recommendation.
- **Press with precise dated commercial signal**: curated outreach hypothesis; label as commercial signal, not an open job.
- **Unverified indexed social mention**: watchlist/research only, not proof of hiring.
- **Old, unrelated, ambiguous or inaccessible source**: no push or “act now” framing; retain as context or suppress.
- **Contacts:** company general email does **not** equal HR/recruiting. Require direct evidence for any more specific label.

## Priority
Keep the already-approved role dossier and verified-CV UI unchanged. Next invest in the **small-brand discovery + dated public evidence scanner**, ATS cross-check, contact verification, and permissioned social integrations. The first working Spontanee folder is a foundation, not the finished autonomous cross-platform intelligence network.

## 10 November 2026 — Brand da contattare: real per-user personalization, news visibility, and social access
- Renamed the public user-facing section to **Brand da contattare** (mobile nav **Brand**), retaining stable internal route view=outreach.
- User-confirmed CVs are read from user_cvs, user-specific career preferences from user_personalization, and signatures from profiles. No cross-account templates or hard-coded Giulia experience. CV switching updates generated subject/body and evidence explanation immediately; prompts before overwriting edits. Save persists cv_id to a private RLS-protected draft.
- New visible **News del brand** nested under the editorial "Perché candidarti adesso" story; linked title, publisher and original event date, not generic duplicate empty modules. All eight first-launch brand folders have at least one dated sourced press article; World Radar may add relevant articles when available.
- Source setup/permission details in HUNT_SOCIAL_MONITORING_SETUP_2026-11-10.md. Actual automated third-party social post monitoring remains unconfigured without approved API permissions or lawful licensed datasets.
