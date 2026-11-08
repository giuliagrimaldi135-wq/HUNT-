# HUNT 2.0 — CV, dossiers, cover-letter editor (2026-11-08)

## Implemented in beta preview
- Per-user CV archive (private Supabase Storage), OCR for image-based PDF, browser-side PDF text and DOCX/TXT/images; PDF extraction handles up to 12 pages (flags partial on longer PDFs); max upload 8 MB.
- Multiple CV versions: the profile editor lets the user assign several target role families per CV. Matching evaluates each vacancy against all active CV versions and selects a role-aligned version; the user can override this inside the job folder.
- Candidate confirms extracted skills, education, experience and projects. OCR text and AI interpretation drafts are **not user-verified facts**.
- Application folder: concise decision brief, CV/language selector, strategic positioning, gaps, interview question, sourced brand newsroom/company signals and matching international fashion-press items.
- Cover letters: editable, copyable, savable, English/Italian default draft, user edits preserved. Regeneration asks before overwriting.
- Optional LLM refinement: `hunt-letter-polish` accepts explicit instructions plus the candidate's private, verified CV and the selected vacancy; produces an **unsaved** revised draft that can be undone.
- Optional structured CV interpretation: `hunt-cv-interpret` produces draft experience, education, tools, projects and languages for verification. User confirmation is required before promoting these into matching/letters.

## Server configuration
Both optional AI endpoints require `OPENAI_API_KEY` configured as a Supabase Edge Function secret. No API key belongs in GitHub or browser JS. Both UI surfaces check configuration and report **AI da attivare** if unavailable. They must **not** pretend AI is live.
The AI requests specify `store:false` and run only after explicit user action. AI drafts are not automatically saved over manually edited cover letters.

## Quality and privacy boundaries
- Do not create qualifications, business results, experience or skills without candidate confirmation.
- Do not imply a vacancy is still open merely because a brand has a related news article.
- Keep user-specific CV files, text, drafts and applications behind auth/RLS; never include personal CV data in the public repository.
- Company news include original links; unverified media facts are not inserted into applications as employer-specific achievements.
- Do not assume OCR works on all designs/languages, including older .doc or CVs over the page cap.

## Remaining work before public launch
1. Configure and verify AI provider credentials securely and monitor spend, abuse/rate limits and failure handling.
2. Test OCR with scanned, multilingual, two-column and long CVs, and review model-derived structured drafts for hallucinations or dropped evidence.
3. Test true new-user signup → several CV uploads → target assignment → verified profile → matching → dossier → regeneration → AI polish → undo/save/copy on desktop and mobile.
4. Evaluate cover-letter quality against real vacancies, avoid generic language/repeated CV bullets and validate grounded loss framing.
5. Add stronger structured vacancy parsing, source reliability and recruitment-contact route; scale company coverage and source discovery.

## Build verification
GitHub Actions `HUNT Preview Syntax` checks app.js, cv-profile.js and cv-reader.js with Node --check. GitHub Pages preview deployment is separate from authenticating and testing all feature flows end-to-end.
