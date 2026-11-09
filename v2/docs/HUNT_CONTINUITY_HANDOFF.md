# HUNT — continuity handoff (9 November 2026)

This is the permanent project handoff for continuing development across ChatGPT conversations.
It is a public, non-personal summary; do **not** add CVs, names, emails, access tokens,
private application drafts or other user-specific data to this repository.

## Project locations / source of truth

- GitHub: https://github.com/giuliagrimaldi135-wq/HUNT- (branch `main`)
- GitHub Pages original PWA: https://giuliagrimaldi135-wq.github.io/HUNT-/
- HUNT 2 preview code: `hunt2-preview/`
- HUNT 2 backend/web code: `v2/`, including Next.js application `v2/web/`
- Supabase project name: `Hunt 2`; project ref `dfiokxjfgqoboxckcuut`
- Canonical product documents: `v2/docs/PRODUCT_SPEC.md`, `ROADMAP.md`,
  `UX_FEATURE_PRIORITY.md`, `SOURCE_STRATEGY.md`, `CONTINUOUS_JOB_SEARCH.md`,
  `CV_PERSONALIZATION_STATUS.md`, `HUNT_LAUNCH_QUALITY_GATES.md`,
  and `HUNT_REAL_COVERAGE_2026-11-09.md`.

Read the actual current repository and database before making status claims. The dated
metrics below are a snapshot, **not** a promise of current production quality.

## Vision and nonnegotiable user decisions

HUNT is an autonomous career-intelligence product for Fashion & Luxury, initially
tested with early-career profiles, aspiring toward broad international coverage.
It is not a generic jobs board. Search widely in the backend, but show a small,
personalized, explainable set of actions in the frontend.

1. **Coverage:** continuously discover previously unknown fashion/luxury companies,
   career pages, authorized ATS boards, and vacancies, rather than relying on a
   small manually curated brand list. Include major groups and small/emerging labels.
   Seek broad international coverage but never claim literally all worldwide jobs.
2. **Source truth:** prefer official ATS/career pages; supplement with authorized
   public aggregators or posts for leads. Retain source provenance, req ID,
   first-seen vs published timestamps, verification, history, lifecycle, and
   repost/evergreen indicators. Merge duplicate sightings of the same vacancy.
   An unknown publication date must stay unknown.
3. **CV-first relevance:** compare the *full specific requirements* for each job
   (minimum years, mandatory qualification, role family, language, software,
   city, eligibility, seniority) against verified user CV variants and explicit
   preferences. Do not label a managerial/facilities job needing 5 years as a
   good entry-level fit. Distinguish confirmed evidence, missing qualifications,
   and uncertainty. Never fabricate skills, education, experience, fluency,
   accomplishments, or requirements.
4. **Experience:** keep the UI calm and useful: Today, Opportunities/Avvisi,
   opportunity dossier, Direct/Spontanee, Applications/Candidature, market/company
   Intelligence/Fashion Now/Radar World, Profile. Brand/source registries belong
   in the backend, not in the main user navigation. Avoid generic praise such as
   “in the city you chose” or “appropriate level” without detailed evidence.
5. **Dossier workflow:** opening/preparing a dossier is not equivalent to having
   applied. Provide Why You, Why Now, evidence job is live, potential gaps,
   source/repost history, best existing CV and why, positioning/ATS terms,
   bilingual Italian/English editable saved cover letter/email, sourced
   company/market news, verified contact route with provenance, interview prep,
   and practical next steps. Preserve user edits when regenerating.
6. **Applications:** keep preparing jobs visible in Opportunities; only jobs
   explicitly marked Applied enter the application pipeline, with statuses
   follow-up/interview/offer/closed and associated assets.
7. **Spontaneous applications:** discover interesting employers globally based on
   *real public evidence* of hiring/growth/opening/launch/expansion; prefer a
   real suitable vacancy where one exists. Explain WHY NOW, public contact route
   and source, never invent recruiters or email addresses.
8. **Fashion intelligence:** merge verified employer signals and Fashion Now/Radar
   World into relevant, traceable, deduplicated coverage; news alone is not a
   verified vacancy.
9. **Always-on:** the desired backend cadence is approximately every 5 minutes,
   with honest operational monitoring. Scheduled server scans, ChatGPT scheduled
   alerts, and actual device push delivery are separate systems. Never say push
   works only because a cron is enabled.
10. **Privacy & trust:** CV files, application drafts and user-specific data must
    remain private behind auth, storage and RLS. Never place them in this public
    repo. LLM-based CV interpretation/polish requires configured server-side API
    key, explicit user action and expenditure limits; never describe the optional
    AI as active without checking it.

## Verified state on 9 November 2026

- Supabase `Hunt 2` was reported ACTIVE_HEALTHY.
- Read-only schema overview: 135 companies, 104 registered career sources,
  674 jobs, 1,521 world news articles, 150 news feeds, 4 CV records, and
  6 saved dossiers. These counts **do not** show that every item is relevant,
  correctly parsed, or currently open.
- At inspection, job state fields marked 672 `active_verified` and 2
  `active_likely` in the database; these are **internal classifications**,
  not independent validation of 674 live accessible application forms.
- 12 Supabase scheduled jobs were marked active, including source discovery,
  ATS-board scanning, CV matching, global news and company intelligence
  at five-minute intervals, plus ATS discovery at 15 minutes and quality audit
  hourly.
- Last read audit snapshot (2026-11-09 15:28 UTC) reported 135 monitored brands,
  648 active vacancies at snapshot time, 27 companies with active jobs,
  14 active ATS boards, 22 thin job descriptions, 1 problematic source,
  3 unconfirmed CV profiles, 0 missing application links in that audit,
  and 0 counted high-seniority recommendations to early-career profiles.
  Audit results flag issues; they do not fix them.
- Source scanner run history included both healthy and degraded runs.
- GitHub commits through 2026-11-09 included dossier exact-requirement verdict
  improvements, Italian/English fallback, verified CV gaps, letter v8,
  SmartRecruiters pagination, QA metrics, and a new verified vacancy.
- Code contains source registry, matching, dedupe/lifecycle, Source Health,
  Greenhouse/Lever adapters, JSON-LD tooling, an ATS discovery pipeline,
  multiple CV parsing and dossier surfaces, and Supabase functions.
- **Beta only:** an implemented code path is not the same as a tested user flow;
  public release quality gates are not yet satisfied.

## Outstanding work (priority order)

A. Complete an end-to-end authenticated audit: sign up, multiple CV uploads
   (including OCR/2-column cases), user confirmation, role-based matching,
   job dossier, Italian/English switch, editable/persistent letter, saved
   application status, mobile UI, and sign-out.
B. Validate at least 50 real mixed seniority/qualifications job recommendations
   and 30 CV/job cover letters. Exact mandatory gaps must be shown and unsupported
   claims prevented. Repair generic/incorrect suitability prose.
C. Run a sourced coverage benchmark on at least 20 diverse employer portals;
   compare current official postings with HUNT capture, date, source verification,
   pagination and missing jobs. Target >=90% capture *of accessible verified
   priority jobs*, <5% user-visible duplicates; no ungrounded claims of 100%.
D. Extend lawful official-source parsing for Workday, SAP SuccessFactors,
   Oracle, SmartRecruiters and other public/authorized ATS families; monitor
   failing sources and unexpected zero counts without mass false closures.
E. Improve world-wide company discovery, emerging brands, spontaneous
   qualification, contact provenance, Radar World relevance and de-duplication.
F. Finish notification delivery testing separately from scheduled scanning;
   distinguish ChatGPT automation cadence limits from Supabase schedules.
G. Only then revisit polished public UI, rollout, optional AI features with
   explicit budget/consent and wider launch.

## Resume instructions for the next assistant

The user often needs to move to a new ChatGPT thread because a long conversation
stops functioning. **Never ask them to restart HUNT or re-explain these decisions.**
Read this handoff and linked product docs, inspect the live repository/DB before
claims, and continue with the next highest-impact verified gap. Keep a clear
three-way distinction: (1) planned, (2) code/cron exists, (3) actually validated
end-to-end. Do not promise background coding by ChatGPT itself; only scheduled
infrastructure that is visibly configured can act between turns.

When changing the project, update this handoff with the date and actual verified
status (keeping it free of personal information), so context survives new chats.


## Aggiornamento 9 novembre 2026 — dossier e cover letter
Il bug delle schede `factLists.it.duties.length` è stato corretto nell'anteprima con la normalizzazione dei fatti. Installato sul backend Supabase `hunt-application-dossier` v16 il generatore editoriale v9, che usa solo mansioni e prove CV confermate e preserva modifiche manuali. I test automatici per schede, lettere italiane/inglesi e assenza prove sono stati aggiunti al workflow CI. La validazione end-to-end autenticata e le 30 revisioni editoriali reali restano aperte. Leggere `v2/docs/DOSSIER_AND_EDITORIAL_FIX_2026-11-09.md` prima di lavorare nuovamente a questi componenti.

GitHub Pages: il workflow `.github/workflows/pages.yml` ora filtra soltanto i file dell'app e dei dati e usa `cancel-in-progress: false` per impedire che commit frequenti del radar interrompano continuamente le pubblicazioni. Verificare comunque la conclusione effettiva del workflow `Deploy HUNT` e l'esperienza autenticata nel browser.


## Aggiornamento 9 novembre 2026 — multi-CV, qualità dossier e release gates
- Quattro CV risultavano nel database, ma i PDF immagine non producevano profili strutturati. Un CV conteneva OCR letto e parole software non trasferite negli strumenti. Non mettere mai testo CV privato nel repository pubblico.
- Nuovo `hunt2-preview/cv-interpreter.js` con test: interpreta ogni CV a livello di bozza nella lingua originale, estrae prove da sezioni esplicite e software con livello dichiarato, senza trasformare OCR in fatti confermati. `cv-profile.js` mostra i suggerimenti anche per raw_text già presente, e permette `Leggi e analizza` e `Analizza tutti i CV non letti`. `cv-reader.js` consente retry dopo errore di rete CDN.
- `hunt2-preview/dossier-intelligence.js` rileva software citati nei CV e nell'OCR e distingue `found` confermato, `detected` da confermare, `alternate` in altro CV, `partial` e `missing`. Anche `Ottima conoscenza` richiede evidenza di livello avanzato, senza equiparare automaticamente `Inglese avanzato` a C1. Introduce un giudizio sobrio e non inferisce analisi vendite dalla sola presenza di una campagna vendite.
- `hunt2-preview/app.js` mostra tutte le versioni CV, le rispettive prove e un selettore con confronto tra versioni; non attribuisce una lettera generata con un CV a un altro CV selezionato. La creazione di lettere resta vincolata ai profili confermati. `styles.css` rinnova l'area dossier con palette sobria, gerarchia editoriale e requisiti meno colorati. Le notizie brand includono un breve contesto tratto dalla fonte, senza inventare dettagli.
- Cover letter: generatore deterministico `evidence_editorial_v10`, backend `hunt-application-dossier` **versione 17 ACTIVE**; `hunt-match-refresh` **versione 12 ACTIVE** con motivazioni CV più rigorose; `hunt-cv-parser` **versione 5 ACTIVE** protegge risultati OCR del browser da successive scansioni PDF senza testo.
- CI: `.github/workflows/pages.yml` blocca ora la pubblicazione se falliscono test del dossier, parser CV, matching dell'evidenza e lettere. Workflow di anteprima e GitHub Pages dell'ultima UI `20261109-63` verificati con esito `success`.
- Non garantire zero errori né considerare pronta l'app per la vendita: resta indispensabile un test end-to-end autenticato con PDF immagine, CV multipli, cambio lingua, salvataggio, blocco lettere e valutazione editoriale umana su almeno 30 coppie CV/job. Provider AI per le lettere non attivato automaticamente.


## Aggiornamento 9 novembre 2026 — UX dossier, profilo CV, lettere v11, ruoli simili
- Nuova interfaccia: `hunt2-preview/styles.css` e `app.js` rendono il dossier una lettura editoriale unitaria, con tre righe esplicite «Il lavoro / Il tuo punto di partenza / Prima di candidarti»; meno box e palette coerente con il resto di HUNT. Non affermare un match basato sulla sola parola `budget` nel lavoro di showroom: `dossier-intelligence.js` richiede prove specifiche per pianificazione.
- `hunt2-preview/opportunity-similarity.js` e relativi test: la sezione `Ruoli simili in altri brand` ora richiede stessa famiglia professionale, specializzazione e seniority; il match personale alto non basta. Se non vi sono posizioni davvero comparabili, nessuna falsa lista.
- `newsTeaser` usa un'anteprima derivata dalla sintesi reale fino a ~300 caratteri e distingue esplicitamente i casi dove è disponibile solo il titolo; non inventa dettagli.
- `hunt2-preview/cv-profile.js` e `cv-display.js`: archivio CV con `Visualizza`, `Rendi principale` / `Rendi secondario`, `Elimina`; l'utente non deve più assegnare manualmente aree ai CV né dichiarare «anni pertinenti». I PDF non letti vengono analizzati automaticamente, in sequenza, nel browser, con retry solo su errore. I CV sono presentati in un riepilogo con esperienze/progetti/software/lingue e correzioni opzionali in una sezione richiudibile. Le quattro attività di showroom del vecchio profilo in inglese sono visualizzate in italiano tramite traduzioni prudenti; l'originale resta salvato. I dati proposti dall'OCR richiedono un'unica conferma dell'utente prima di usarli come qualifiche certe.
- `Elimina` usa ora `delete()` RLS sul record `user_cvs`, verifica la riga effettivamente cancellata e poi elimina il file dallo Storage `cvs`. La FK `user_job_dossiers_recommended_cv_id_fkey` è `ON DELETE SET NULL`; in caso di eliminazione del CV principale viene assegnato un nuovo principale. Il browser mostra eventuali errori di cancellazione dello Storage.
- Selezione automatica fra CV principali/secondari: `hunt2-preview/cv-ranking.js` testata; backend `hunt-application-dossier` e `hunt-match-refresh` non assegnano più pesi decisivi alle vecchie `target_role_families` definite manualmente.
- Cover letter: `letter-editorial.js` v11 produce un testo di più paragrafi, con motivazione specifica, formazione documentata ed esempi CV pertinenti; test automatico richiede 135–240 parole e 6+ paragrafi quando sono presenti tutte le evidenze. L'utente ha `Crea nuova bozza`, `Salva`, `Copia lettera`; le lettere modificate richiedono conferma esplicita prima di essere rigenerate. Motore deterministico, non un LLM.
- Backend Supabase verificato attivo dopo deploy: `hunt-application-dossier` v18 (editorial v11), `hunt-match-refresh` v13. Precedentemente `hunt-cv-parser` v5.
- Workflow Pages e HUNT Preview Syntax includono test addizionali `cv-display`, `cv-ranking`, `opportunity-similarity`, `cv-profile-smoke` oltre a dossier e lettere, e rifiutano deploy quando falliscono. Cache frontend spostata a `20261109-79`.
- Ancora da verificare PRIMA DI VENDERE: test browser end-to-end di account autenticato con PDF immagine/varie lingue, assenza errori OCR, cancellazione Storage, tutti i flussi di CV principale/secondario e dossier con cambi di CV; QA editoriale manuale su almeno 30 lettere reali; verifica qualità semantica di match, news e ruoli simili. I test di codice non provano che ogni CV del database sia stato processato o che le lettere siano perfette.


## Revisione UX 9 novembre 2026, 20:00 CET — perché candidarti e conferma finale
- La precedente «Lettura HUNT» a tre righe è stata rifiutata: l'utente desidera una **singola sintesi intelligente e concreta del perché candidarsi**, simile alla prima versione. In `hunt2-preview/dossier-intelligence.js` è stata aggiunta `applicationInsight`: usa responsabilità, prove CV e requisiti da verificare, distingue progetti accademici da esperienza effettiva e non attribuisce qualifiche non documentate. In `app.js` il dossier mostra una sola narrativa sotto «Perché candidarti».
- Requisiti del dossier **solo in italiano**, senza controllo lingua, per evitare che due versioni mostravano elenchi diversi. Nessun selettore CV visibile nel dossier: HUNT sceglie automaticamente quello pertinente, mostra il nome e linka il Profilo per verifiche. Rimosso il bottone morto «Confronta quel CV». Quando manca la conferma lo dice senza confondere la creazione di dossier salvati con la possibilità di mostrare la valutazione.
- **Cover letter in pausa su richiesta**: nessuna lettera, nuovo draft o generator button visibile. Aprire una posizione non invoca automaticamente `hunt-application-dossier` e non rigenera/sovrascrive documenti già salvati. Il servizio backend rimane conservato per riprenderlo in futuro; non proseguire a lavorarci salvo richiesta esplicita.
- Profilo: mostra attività Marina Rinaldi in italiano e, dopo fix al regex in `cv-display.js`, anche «Progetto accademico Gucci/Alaïa» con descrizioni tradotte. È visibile «Modifica o aggiungi informazioni», che apre i campi esperienze, progetti, formazione, software e lingue; testo originale sotto la sezione modifiche. La pagina **termina** con «Salva informazioni» o «Conferma le informazioni» dopo eventuali correzioni.
- Aggiornati test `dossier-regression`, `dossier-intelligence`, `cv-display`; release gate GitHub Pages li esegue prima della pubblicazione. Versione modulo browser `20261109-84`.
- Restano aperti QA autentificato nel browser e qualità semantica delle valutazioni; non dichiarare l'app pronta per vendita senza tali controlli.


## 9 novembre 2026 — Dossier luxury, scelta CV e categorie professionali
- Richieste utente: niente etichette generiche «requisiti da verificare» in cima alle candidature; fonte e ATS in piccolo in fondo; 1) CV selezionabile per la vacancy, 2) visualizzare **tutti** i requisiti e non due, 3) impaginazione luxury coerente e non artificiale, 4) promemoria cover letter futura senza riattivare generazione, 5) ambiti emersi dal CV personalizzati e catalogo di tutte le aree HUNT.
- Annuncio caso studio: **Mulberry — Assistant Planner**, job ID `39a88d48-4380-4824-abf3-8d5c17d183ba`, link ufficiale `https://jobs.lever.co/mulberry/120146b3-3af2-4819-9cff-aae87fc2e3f6`. Pagina aziendale verificata il 9 novembre 2026: **11 responsabilità + 9 requisiti**, tra cui 1–2 anni di esperienza nel settore planning/sourcing/buying/merchandising e Excel avanzato. Salvati in `jobs.metadata.source_facts` con `verification=official_page_reviewed_2026_11_09` e traduzioni italiane curate. La fonte è pubblica. Preservare `metadata.source_facts` nelle future ingestion e non ri-tagliarla; controllo SQL di validazione eseguito.
- `hunt2-preview/app.js` ora mostra **tutti** i requisiti senza `slice(0,8)`, le prime cinque attività con espansione per le altre, scelta manuale CV per la specifica offerta `dossierCvChoices` (preselezione automatica comunque presente), status CV ricalcolato senza generare lettera, link al Profilo. Fonte ufficiale, verifica e ATS sono sotto in un footer discreto. Inserito teaser non cliccabile «Cover letter — presto su HUNT» sotto il dossier.
- `jobTextEvidence` e `italianEvidenceFromJob` aumentati da 3/6 a 15/24, riconoscendo anche esplicitamente 1–2 anni, numeracy, analisi, stakeholder, priorità e iniziativa senza inventare requisiti. I casi con fonte realmente verificata usano invece `source_facts` complete.
- `dossier-intelligence.js`: `applicationInsight` usa le responsabilità vere per sintetizzare il ruolo (SKU, stock, allocazioni, reporting), distinguendo progetti accademici da esperienza reale; `checkRequirements` conserva le differenze fra competenze nel CV e requisiti aziendali e trova indizi pertinenti da progetti/esperienze, senza equiparare automaticamente le due cose.
- `cv-display.js` esporta `cvProfessionalCategories` per classificare prudentemente evidenze da esperienze e progetti in ciascuna delle **20 categorie**; `cv-profile.js` mostra aree realmente collegate e `Vedi tutte le 20 categorie HUNT` senza trasformarle tutte in competenze. OCR langue/setting solo in dettagli avanzati quando occorrono, non in cima al profilo. Salvataggio e correzione restano invariati.
- `styles.css` sistema atelier luxury con tipografia sobria, avorio/caldo/charcoal, linee sottili e sezioni più leggibili, evitando box colore per warning e badge vistosi. Cache UI `20261109-92`.
- Release gates: `hunt2-preview/tests/dossier-regression.test.mjs` copre presenza scelta CV, elenco senza tagli, espansione attività, fonte piccola, reminder lettera; test nuovo sul parser verifica almeno 9 requisiti per vacancy complessa. `cv-display.test.mjs` controlla le 20 categorie e che siano segnate solo quelle documentate. I workflow `HUNT Preview Syntax` e `Deploy HUNT` devono risultare success prima di affermare che la UI è pubblicata.
- Non dire che tutte le vacancy globali sono verificate o che tutte le competenze sono possedute: **fatti dell'annuncio** e **prove nel CV** restano due verifiche distinte. Da testare ancora esperienza autenticata end-to-end e validazione UX reale prima della vendita. Non riattivare cover letter prima che l'utente lo chieda.


## 9 novembre 2026 — revisione essenziale: qualifiche dimostrabili e Profilo ordinato
- L'utente ha criticato duramente la UI del dossier con 2 attività e 12 requisiti di ogni tipo, chiedendo una presentazione ordinata e meno «AI». **Scelta di prodotto: soltanto i 3–4 requisiti professionali più determinanti e oggettivamente confrontabili**, non qualità soggettive (attenzione al dettaglio, comunicazione, iniziativa, motivazione, ecc.). Non interpretare un CV come prova di personalità o dichiarazioni non verificabili. Il nuovo `hunt2-preview/requirement-priority.js` seleziona 4 massimo, raggruppa per famiglie, scarta soft skills e mostra per ciascuno solo prove CV pertinenti. Non eliminare i fatti completi dal database: la priorità limita la visualizzazione.
- Il vecchio campo `relevant_years_experience` riportava 0.33 anni e creava confronto inattendibile con 1–2 anni richiesti. **Eliminata del tutto la comparazione numerica basata su quella stima** dal modulo `dossier-intelligence.js`. Le esperienze richieste si verificano solo con ruoli pertinenti e periodi documentati; nel frattempo non fingere corrispondenze quantitative.
- `hunt2-preview/app.js`: sostituiti i pannelli ridondanti con una sola pagina `huntEditorial`: titolo e sintesi, selezione CV compatta, responsabilità con dettaglio espandibile, 3–4 requisiti professionali prioritari + prove concrete, fonte ufficiale in piccolo e promemoria Cover letter futura. Niente giudizio sulle caratteristiche personali o contatori 2/12 ingannevoli. Mantiene `dossierCvChoices` per la scelta da parte dell'utente e selezione automatica iniziale.
- `hunt2-preview/cv-profile.js`: profilo ora riordinato in 4 sezioni **01 Esperienza, 02 Progetti, 03 Formazione e strumenti, 04 Ambiti professionali** con navigazione compatta, attività espandibili (una aperta alla volta quando l'utente decide), modifica opzionale chiara e conferma/salvataggio finale. Archivio CV compattato, upload nascosto dietro `Aggiungi un altro CV`, nessun riepilogo enorme a 3 cifre. Mantieni l'editing strutturato e il salvataggio finale; non reinserire sezioni confuse in cima.
- Nuovo `hunt2-preview/editorial-refresh.css` caricato **dopo** il CSS storico per scavalcare i vecchi esperimenti e mantenere stile luxury sobrio, con capelli sottili, tonalità neutre, tipografia misurata e disposizione responsive. Non reintrodurre badge colorati e card multiple per la stessa informazione.
- Nuovi test `hunt2-preview/tests/requirement-priority.test.mjs` (soft-skill exclusion, durata non documentata, academic KPI, scala di requisiti) aggiunti a entrambi i workflow di release; aggiornati i test dossier e CV profile smoke per verificare la nuova UI.
- Rimangono necessari: verifica visiva su account autenticato di 4 CV, scelta CV per ruolo, OCR automatico, visibilità editoriale, completezza dei dati delle vacancy; review manuale di 20–30 vacancy prima della vendita. Cover letter **non** riattivata.
