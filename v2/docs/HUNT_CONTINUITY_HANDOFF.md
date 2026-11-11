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


## 9 novembre 2026 — HUNT come app, non come documento
- Revisione richiesta dall'utente a seguito delle schermate delle 22:20 e 22:22: il precedente stile a colonne con linee e sezioni numerate risultava troppo simile a uno schema generato da ChatGPT. **La parte alta con il titolo e la sintesi dell'opportunità è piaciuta: non stravolgerla.** L'area inferiore doveva diventare un'interfaccia di prodotto navigabile, non ulteriore testo.
- Analizzati i pattern informativi di Huntr e Teal: archivio CV separato, funzioni per posizione, navigazione per sezione. Non clonare il design altrui; usare architettura HUNT originale.
- Creati `hunt2-preview/job-workspace.js`, `cv-workspace.js` e `product-workspace.css`. La pagina Candidatura conserva la sintesi approvata in alto e sotto mostra **Panoramica | Attività | Requisiti** in un pannello con tab funzionanti. Panoramica mostra 2 schede con preview e azioni che aprono realmente i dettagli; le altre schede mostrano tutte le mansioni acquisite e solo 3–4 requisiti tecnici verificabili. Colonna contestuale a destra con scelta CV, link Profilo, istruzioni per candidarsi, collegamento all'annuncio e reminder cover letter futura. I contenuti dell'annuncio sono distinti dalle prove del candidato; nessun giudizio della personalità.
- Il Profilo ora usa un vero **CV Hub** a due aree: sidebar con elenco CV (clic selezione, stato, menu ⋯ con principale/secondario/elimina, upload espandibile), area di lavoro a destra con header selezionato e tab **Riepilogo | Esperienze | Progetti | Competenze | Ambiti**. Le informazioni non compaiono più tutte in una sola pagina. Il tasto **Modifica dati** apre un pannello dedicato con il vecchio editor completo; conferma/salvataggio resta funzionante e visibile nella parte inferiore. Il programma mantiene separate le versioni e tutte le opzioni di modifica e cancellazione.
- Il passaggio Candidatura → Profilo conserva il contesto e offre **Torna alla posizione** anche dopo il salvataggio. `cv-profile.js` avvisa prima di cambiare documento o eliminarlo se ci sono modifiche non salvate; stessa tutela per aggiunte, eliminazioni e cambio CV principale.
- `hunt2-preview/product-workspace.css` è caricato **dopo** tutti gli stili precedenti; struttura di app autentica: pannelli bianchi su fondo neutro, accento verde HUNT misurato, tab accessibili, moduli visibili solo quando servono, menu contestuali e stati chiari. Mobile: sidebar candidatura si sposta sotto, archivio CV diventa blocco superiore, tutte le schede scorrevoli senza troncamenti.
- `renderProfile(fromJobId)` preserva il collegamento alla posizione originale. Il modulo `cv-profile.js` conserva la lettura automatica OCR, la persistenza Supabase e le modifiche opzionali: è stata cambiata l'interfaccia, non eliminati i dati.
- Aggiunti `tests/job-workspace.test.mjs` e `tests/cv-workspace.test.mjs`, aggiornati `dossier-regression.test.mjs` e `cv-profile-smoke.test.mjs`; GitHub Pages rifiuta release se i test falliscono. Cache moduli v`20261109-133`.
- **Non dire pronto per vendita senza browser QA autenticato**, verifica salvataggio di un CV realmente editato, cambio CV nel dossier, visuale mobile e regressioni di OCR e fonti. Continua a lasciare la cover letter in pausa.


## 9 novembre 2026 — rifinitura dopo screenshots 22:57–23:00
- Nelle schermate del 9/11 alle 22:57–23:00 l'utente ha approvato esplicitamente **la sidebar destra della Candidatura** con «Il tuo dossier» / scelta CV, «Come procedere» e CTA annuncio ufficiale. **Non modificarla nelle prossime iterazioni senza richiesta.**
- Ha rifiutato invece la **Panoramica** con 2 grandi card affiancate «Attività del ruolo» e «Competenze richieste», che risultavano sproporzionate e duplicate. In `hunt2-preview/job-workspace.js` eliminata la `hwSummaryGrid` e sostituita con una panoramica unitaria `hwOverview`: breve elenco di responsabilità, separatore sobrio, requisiti essenziali compatti; pulsanti per aprire le schede già esistenti. Conservata la sintesi narrativa superiore approvata, tab Panoramica/Attività/Requisiti, sidebar e funzionalità di cambio CV.
- L'utente apprezza anche l'impostazione **archivio CV a sinistra + area di lavoro a schede a destra**, ma trovava disordinato soprattutto il contenuto dei pannelli a destra (screenshot Ambiti: righe larghe con fonti lontane sul lato destro). In `hunt2-preview/cv-workspace.js` gli Ambiti sono ora visualizzati come griglia responsiva di piccole schede `cvWAreaCards`: nome dell'ambito e fonte subito sotto, con conteggio e link contestuali a Esperienze/Progetti; testo `thesis project` ripulito per non creare duplicazioni. Riepilogo CV ora layout `cvWSnapshot` con una zona esperienza e una colonna più compatta per progetti, software e ambiti. Le altre sezioni restano accessibili tramite tab, e «Modifica dati» e conferma/salvataggio non sono stati rimossi.
- Stili in `hunt2-preview/product-workspace.css` dopo quelli precedenti, con nuove classi `hwOverview*`, `cvWAreaCard*`, `cvWSnapshot*`. Nessun restyling della sidebar approvata.
- Test aggiornati `tests/job-workspace.test.mjs` e `tests/cv-workspace.test.mjs` per vietare la ricomparsa delle 2 card affiancate, controllare sidebar, sorgenti delle aree e navigazione. Cache versione `20261109-138`. GitHub Pages su commit `b4185965` pubblicato con workflow `42708717908` riuscito, Syntax workflow `42708717718` riuscito.
- Restano non verificati in questa modifica: esperienza visuale sul vero account, rendering mobile autentico, QA di editing e dati CV. Non dichiarare definitivo o pronto alla vendita. Prossimo feedback deve concentrarsi sulla resa del contenuto a destra e sulla panoramica senza riprogettare le parti già approvate.


## 9 novembre 2026 — Excel avanzato riconosciuto in entrambi i CV
- Problema segnalato: scheda Panoramica / Requisiti di una candidatura mostrava **«Competenze Excel richieste — In un altro CV»** anche quando Excel avanzato era scritto **in entrambi** i curriculum. L'utente vuole lettura accurata delle versioni, evidenze precise e stati comprensibili («nel CV», «non indicato») senza giudizi soggettivi.
- Verifica read-only in Supabase sul suo account: due versioni attive `fashion management` (OCR in `parsed_profile.raw_text`, ancora da confermare) e `Merchandasing` (strutturato, `tools:["Excel","Max Mara order application"]`, `draft_profile.tools:["Excel (avanzato)","PowerPoint (avanzato)",...]`). **Entrambe** riportano espressamente nella sezione Software del testo di origine: `Excel (avanzato) - PowerPoint (avanzato) - Word (avanzato)`. Non replicare dati identificativi nei log, non cambiare il documento originale.
- Causa del bug: in `hunt2-preview/dossier-intelligence.js` il blocco `if(requiredTools.length&&type!=="found")` ricercava nei CV alternativi anche quando il CV selezionato aveva una prova `detected` o `partial` e la **sovrascriveva** con `alternate`. Ora alternativa applicata **solo se `type==="missing"`**. Se una parte del requisito è presente nel CV scelto, rimane `partial` e non viene disconosciuta.
- `sourceTools(profile)` concilia competenze strutturate e prove dirette nel **medesimo** PDF, preferendo un livello esplicito `Excel (avanzato)` invece del solo `Excel`; un livello emerso dall'OCR resta `detected` finché non esplicitamente confermato, senza inventare qualifiche. `cv-display.js` / `cvReviewSummary` uniscono i software strutturati e quelli estratti dallo stesso CV, deduplicano e preservano il livello dettagliato; anche PowerPoint avanzato compare correttamente nel Profilo.
- `requirement-priority.js`: «Non indicato nel CV» al posto di affermazioni assolute e decontestualizzate, «Presente nel CV», «Indicato nel CV» (OCR), «Presente in parte». Mancanza dei 1–2 anni di planning/sourcing/buying/merchandising spiegata come assenza di prove professionali con durata richiesta nel CV, non incapacità personale; non usare il vecchio campo «0.33 anni».
- `job-workspace.js`: nei requisiti compatti si vede anche la **prova effettiva** (es. `Excel (avanzato)`) e non soltanto una label; titolo generico «Competenze Excel richieste» semplificato in «Conoscenza di Excel» senza inventare un requisito avanzato quando l'annuncio non lo specifica. La sidebar Candidatura già approvata resta invariata; solo microcopy prova/assenza.
- Copertura regressioni aggiunta a `tests/dossier-intelligence.test.mjs` su **entrambe le forme reali dei CV**, parziale vs alternativo, mancanza nel CV scelto; `tests/cv-display.test.mjs` su merging senza Excel doppio; `tests/requirement-priority.test.mjs` e `tests/job-workspace.test.mjs` sulle etichette e prova visibile. Versione asset `20261109-145`. Release su commit `5a9a62b5` con workflow `HUNT Preview Syntax` `42710257197` e `Deploy HUNT` `42710257167`, entrambi `success`.
- Ancora necessario il collaudo browser autenticato con cambio CV e confronto, incluse tutte le vacancy. Non dichiarare che una competenza è posseduta nel mondo reale solo perché il CV la dichiara. L'app non è ancora convalidata per la vendita.


## 9 novembre 2026 — Panoramica editoriale e Profilo luxury senza vignette
- Feedback screenshot 23:18–23:19: l’utente rifiuta gli elenchi di mansioni/requisiti in Panoramica e i badge/card del Profilo; vuole il racconto della posizione e poi due aperture per Attività e Requisiti. Struttura archivio CV a sinistra e schede a destra approvata, come sidebar Candidatura. Non stravolgerle.
- job-workspace.js: funzione describePosition(duties,title) crea un’introduzione basata sulle attività dell’annuncio, con caso specifico budget/stock/allocazioni, e fallback prudente; Panoramica contiene un solo testo narrativo e due righe navigabili, niente ripetizione di liste o status. Schede Attività e Requisiti inalterate. app.js passa il titolo del ruolo.
- cv-workspace.js: struttura Riepilogo invariata (esperienza a sinistra; progetti, strumenti, ambiti a destra); vignette interne rimosse, software in testo inline, Ambiti come righe editoriali a due colonne con fonte sotto. Badge Principale e Modifica dati più discreti; editing e conferma ancora presenti.
- luxury-refinement.css, caricato dopo product-workspace.css, usa spaziature, linee sottili e tipografia anziché card e badge. Sidebar Candidatura approvata invariata. Responsive su mobile.
- Versione cache 20261109-150; test job-workspace e cv-workspace aggiornati. HUNT Preview Syntax run 42711926331 SUCCESS; Deploy HUNT run 42711926476 SUCCESS, commit dd99f81f.
- Verificare ancora resa reale desktop/mobile nell’account autenticato. Non dichiarare pronto per vendita. Conservare bugfix Excel avanzato in entrambe le versioni del CV.


## 9 November 2026 — Luxury dossier refinement rev 151 (follow-up chat)
- Updated GitHub Pages preview sources: `hunt2-preview/job-workspace.js` and `luxury-refinement.css`, with cache references bumped in `app.js` and `index.html` to `20261109-151`.
- Preserve the functional three-tab navigation **Panoramica / Attività / Requisiti**, right-side CV selector, link to original job post, candidate assessment, and profile navigation.
- In the overview, put the sourced role narrative first and the existing profile comparison in understated inline typography; remove duplicate generic AI-style introduction and decorative 01/02 section numbers.
- Display duties as a simple unnumbered editorial list; remove numbered 1/2/3 application guidance and de-emphasize card framing, round badges and sidebar boxes. Responsive CSS maintained.
- **Important limitation:** `app.js` currently pauses automatic cover-letter generation when opening an opportunity. Do NOT claim cover-letter editing/generation has been validated in the preview. The UI now explicitly marks the feature temporarily suspended; restore/verify the complete saved, editable, bilingual letter workflow separately, preserving user edits.
- Update `hunt2-preview/tests/job-workspace.test.mjs` for the new text and require the absence of numbered infographics. Static render checks performed; authenticated end-to-end visual/browser testing and successful GitHub Pages deployment remain to be independently verified.


## 10 November 2026 — First-time-user clarity pass (HUNT 152)
User reviewed screenshots of both the opportunity dossier and the CV archive and found them confusing for new visitors, despite the luxury visual polish. This is an information-architecture issue, not a palette issue.

Changes merged to `main` in `hunt2-preview/`:
- `job-workspace.js`: removed nested `Panoramica / Attività / Requisiti` tabs inside `Candidatura`. The role opens with a concise, sourced `Cosa farai` overview, followed by three native, accessible expandable sections: `Attività`, `Requisiti`, and, when supported, `Confronto con il mio CV`. Sidebar now contains only CV choice/status, link to manage CVs, and a single official-application action. No duplicate source links, numbered guidance, or inactive cover-letter teaser. Detailed requirements and original source evidence remain available.
- `cv-workspace.js`: removes five simultaneous navigation tabs from the default CV page; displays a single `Il tuo CV, in breve` overview with experience, projects, education/software, and three optional detail links. The existing detail panes (experience, projects, skills, related areas) and structured editor are retained with clear `Torna al riepilogo` navigation. `Controlla e conferma` now points to the editing/verification view; the actual save/confirm button is shown only there. Clarifies the meaning of the primary CV.
- `cv-profile.js`: toggles the verification footer only in edit mode, retaining underlying profile save and data controls. `app.js` removes obsolete job tab handlers and keeps CV switching and profile navigation.
- `luxury-refinement.css`: responsive, understated details and CV overview styling without decorative dashboard cards or numbered flows.
- Cache-busted the preview `index.html` and module imports with `20261110-152`.
- Updated `job-workspace.test.mjs`, `cv-workspace.test.mjs` and `cv-profile-smoke.test.mjs` for the simpler information architecture; **10/10 targeted static module rendering tests passed** in the integrated tool runtime. HTML module logic and CSS consistency checks passed; full GitHub Actions CI, GitHub Pages deployment, and authenticated real-browser visual/use testing **not yet verified**.
- Critical outstanding issue: existing persisted bilingual cover-letter editing/generation is not validated in the current app preview. The previously paused teaser was removed from the simplified opportunity UI to avoid presenting an unavailable action; restore and test the actual function as separate prioritized work without overwriting user edits.
- Next UX validation: ask a first-time user to find requirements, select a CV, correct/confirm extracted data, and open the official application without explanation. Test on desktop and mobile before calling this UX approved. Keep the UX rule: one primary decision per view, details on demand, no repeated navigation.

- **HUNT 153 flow update (10 Nov 2026):** the vacancy hero now uses `Prepara candidatura` to scroll to the dossier (`huntJobPreparation`), and the original application link appears once, next to the CV choice. Cache references for the modified modules and HTML were bumped. Final targeted static render tests: 10/10; module integration checks passed. Deployment and authenticated usability testing still require real browser confirmation.


## 10 November 2026 — Editorial narrative restored; CV verification redesigned (rev 154)
The first simplification (rev 152–153) went too far: user said the vacancy looked like a generic list, not a premium app, and the ambiguous `Controlla e conferma` CV action did not explain what was being confirmed. Preserve this feedback in future redesigns.

- **Vacancy:** restored the expanded editorial introduction `Il ruolo, in sintesi` with natural, sourced role narrative and an understated, separate `In relazione al tuo profilo` paragraph. Rather than nested tabs or long stacked accordion lists, two horizontal contextual actions (`Attività e responsabilità` / `Requisiti`) reveal content in place using accessible buttons and panels. Original source link and CV selection remain, with one application CTA.
- **CV:** unverified profiles now invite `Verifica le informazioni` (not `Controlla e conferma`), and explain explicitly what HUNT extracted and why it matters. Primary/default CV status is independent of verification status. The review screen explains that extracted fields can be checked/corrected, confirms that the uploaded document is unchanged, and groups editable experience, projects, education, software and language fields into accessible collapsible sections. Final button `Conferma e salva` stores user-confirmed structured data; existing collection/save code is preserved.
- **Direct flow:** from the opportunity dossier `Verifica i dati del CV` requests the specific selected CV and opens directly in review mode via `requestCvVerification(cvId)`, instead of requiring a second ambiguous click in the CV archive.
- Source paths: `hunt2-preview/job-workspace.js`, `cv-workspace.js`, `cv-profile.js`, `app.js`, `luxury-refinement.css`, `index.html`; UI version string `20261110-154`. Updated job/CV tests and profile verification smoke test.
- Current validation: targeted job/CV render tests 13/13 passing; module binding/static consistency passed. Full deployment Actions run, real account flow, and live visual/mobile UX are **not yet verified**. Avoid claiming preview live without confirming the deployment. Cover-letter workflow remains an independent unresolved functional gap.
- Design instruction: high-end career-product visual hierarchy, not bare lists or repeated cards. Keep editorial storytelling at the top; make the purpose and consequence of every action obvious. Review patterns from established career software without imitating clutter.

- Additional verification after the revision: **13/13** targeted vacancy/CV render tests and **2/2** CV-manager smoke tests passed in sequential in-memory execution, including opening the specifically selected CV directly in edit/review mode. These tests do not replace a deployed authenticated browser test. Public GitHub Pages availability could not be independently confirmed from this session.


## 10 November 2026 — HUNT v155: preserve approved copy, restore richer story; release diagnosis
User screenshots at ~13:13 CET still showed the OLD `Cosa farai` and `Controlla e conferma` UI even though GitHub `main` already contained the newer v154 code. Therefore **GitHub source and user-visible GitHub Pages were out of sync**; the precise reason could be a deployment queue/failure or client cache, and it has **not been independently verified** from this session.

User explicitly approved and requires preservation:
- Vacancy heading **`Il ruolo, in sintesi`** with a substantial, natural, source-grounded explanation, not a one-sentence list. For budget/stock/allocation the current narrative is ~90 words. Never add fabricated duties.
- In the application sidebar restore exactly **`Il tuo dossier / Curriculum da utilizzare`** and **`HUNT propone la versione più pertinente. La scelta finale è tua.`** Do NOT remove or rename these approved elements in later refinements.
- Preserve CV library and overview structure the user already liked; only clarify the confusing CV-verification action.

Changes merged to `main`:
- `hunt2-preview/job-workspace.js`: restored the exact approved sidebar text, richer editorial role explanation. The two contextual activities/requirements reveal controls remain.
- `hunt2-preview/cv-workspace.js`: unverified CVs now have a prominent, real CTA `Verifica i dati estratti`, with explicit consequences; verified CVs retain discreet `Modifica i dati del CV`. Summary content and existing edit/save logic preserved.
- `hunt2-preview/luxury-refinement.css`: make the unverified CV verification action a recognisable green button without introducing more cards. Role text typography refined.
- `app.js`, `cv-profile.js`, `index.html`: bust import/stylesheet caches to `20261110-155`.
- `job-workspace.test.mjs`, `cv-workspace.test.mjs`: regression tests lock in the approved recommendation and new action language. Targeted JS rendering tests passed 13/13; **not proof of deployed browser behaviour**.
- `.github/workflows/pages.yml`: changed `cancel-in-progress` from `false` to `true` to avoid queuing many obsolete preview deployments from rapid UI commits. The commit itself triggers a new Pages build. Actions run status is not available through the current GitHub connector; the reported Vercel build-rate-limit status is separate from GitHub Pages.
- Next step: verify the live GitHub Pages HTML references `app.js?v=20261110-155`, and inspect whether `job-workspace.js?v=20261110-155` is loaded in a fresh browser session. Confirm successful GitHub Pages Actions run before stating the live change is delivered. A direct cache-busted preview URL is `https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?v=20261110-155`. If still stale, investigate workflow failures and actual Pages deployment, not keep redesigning approved sections.


## 10 November 2026 — Explicit user UX approval (freeze)
User inspected HUNT 2.0 version 155 and explicitly approved **both** the opportunity dossier and the CV/profile experience. User also reported completing the in-app confirmation of profile information. **Treat these two UX screens as approved and frozen for now.** Preserve the approved editorial dossier with substantive “Il ruolo, in sintesi”, the recommended-CV sentence “HUNT propone la versione più pertinente. La scelta finale è tua.”, and the current CV verification experience. Do not redesign, shorten, or move these components without a fresh user request or an essential bug fix. The user's confirmation is a reported successful action, not independent database verification. Next implementation work should focus on uncompleted functionality (especially cover-letter workflow, CV-grounded role matching, source coverage, Fashion Intelligence/World Radar, and real end-to-end QA) without disrupting these approved surfaces.


## 10 November 2026 — Spontanee revision 159 (new independent feature)
- User explicitly requested the return of the first HUNT's luxury spontaneous-outreach folders (why apply now, candidate sheet, customizable email, verified contact, news/signals) for *small/emerging brands*, using evidence from across official sites, press, Web, LinkedIn/Instagram/TikTok where permitted. Keep the approved job dossier and CV-profile UI **frozen**; no changes to those screens.
- New functional beta section **Spontanee** in `hunt2-preview/app.js` (desktop/mobile navigation). It reuses curated, dated original HUNT Luxury Outreach leads and enriches existing dossiers with correctly linked `company_signals` plus cautious exact-brand World Radar article matching. Feed rejects unsupported events. Current source-only seed yields **8 of 9** earlier researched brands (the ninth fails the positive-event gate); this does NOT prove 8 companies are hiring.
- `hunt2-preview/outreach-intelligence.js` renders editorial list and brand folder with **Perché candidarti adesso**, evidence/date links, **News del brand da conoscere**, **Scheda candidatura**, CV selector, **Email pronta da personalizzare**, and **Dove contattare il brand**. Confirmed CV evidence can be included in an editable email; unconfirmed CV facts cannot be claimed. Missing HR emails are not invented, general email ≠ recruiting.
- Saves user-edited subject/body/status in new private Supabase table `user_outreach_drafts`, created by successful migration `private_outreach_drafts` with RLS and owner-only SELECT/INSERT/UPDATE; anonymous reading denied. Only a user clicking **Ho inviato la candidatura** sets `applied`; submissions appear in `Candidature`. **HUNT does not send the email.**
- Privacy fix: `hunt2-preview/build-outreach-public.mjs` strips personalized email drafts/subjects and user information out of the old public `data/chatgpt_outreach.json`, producing `data/outreach_signals_public.json`; GitHub Pages workflow rebuilds this feed each deployment. HUNT 2 frontend fetches only the sanitized public feed.
- CI includes `outreach-intelligence.test.mjs`: last targeted static test execution **6/6 passed**, plus pure JS app syntax and cache references verified; main UI version 159. **GitHub Pages live deployment and end-to-end authenticated browser interactions not independently confirmed.**
- Thorough source architecture, filtering, platform-permission constraints and next work are in `v2/docs/SPONTANEOUS_OUTREACH_INTELLIGENCE_2026-11-10.md`.
- **Major remaining gap:** automated international discovery of *unknown small labels*, robust brand-size/identity enrichment, real-world sourcing for career-contact routes, authoritative checks for suitable existing vacancies, and permissioned LinkedIn/Instagram/TikTok integrations. Database snapshot: 155 registered companies but just 1 marked independent, 78 social URL records with zero successful social-content scans, 0 `outreach_candidates` rows. Existing source records do NOT equal continuous global social post scanning; do not exaggerate coverage or imply fully autonomous world-wide sourcing. The initial 8 leads come from earlier curated outreach research, not newly monitored Instagram/TikTok content.


## 10 November 2026 — Spontanee was missing from visible app; diagnosed and fixed in code rev 160
- User reported `Spontanee` does not appear after rev 159. **Do not assume a GitHub commit equals a deployed app.** Two app entry points coexist: original HUNT at repo root (`index.html` with `Avvisi, Spontanee, Fashion Now...`) and HUNT 2.0 at `hunt2-preview/index.html` (requires login, sidebar `Opportunità, Spontanee, Fashion News, Candidature, Profilo`). Use the preview link for HUNT 2.0.
- Deployment blocker found: `hunt2-preview/tests/dossier-regression.test.mjs` still asserted obsolete `role="tablist"`, `jobWorkspaceTabs.set`, old duty text, and old `profileButton.onclick=()=>...`; these had been replaced in approved dossier rev 154–155. This stale gate caused deterministic CI test failures and could prevent Pages from publishing updates. Updated assertions to the user-approved `Il ruolo, in sintesi` editorial component and CV verification navigation, without disabling coverage. **Five synchronous regression assertions now pass**.
- Introduced direct-entry handling: `?view=outreach` initializes HUNT 2.0 in Spontanee, plus a clear `Esplora le candidature spontanee` shortcut on the `Opportunità` feed. Navigation already has a Spontanee entry on desktop and mobile. CSS only added for shortcut; approved dossier and CV UI untouched.
- Restored GitHub Pages `concurrency.cancel-in-progress: false` per GitHub's recommendation not to cancel production deploys mid-flight; previously `true` could interrupt page publication during rapid commits.
- Cache-busted `hunt2-preview/index.html` to `app.js?v=20261110-160`, `luxury-refinement.css?v=20261110-160`. Direct link: `https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?view=outreach&v=20261110-160`.
- In-session code checks: app JavaScript syntax valid, 5/5 synchronous dossier regression tests passed, 6/6 dedicated outreach tests passed, and nav/direct route/cache strings verified. **No authenticated live-browser confirmation or GitHub Pages Actions job status available from this tool session.** GitHub connector's commit workflow lookup only reports PR-run jobs and thus gives no push-run visibility; Vercel build-rate-limit status is a separate service, not proof of GitHub Pages status. Do not claim the public site is already updated without independent confirmation.

## 10 November 2026 — Spontanee UX approved-reference restoration, revision 162
User compared the original HUNT spontaneous application folder against the newer HUNT 2.0. The new 2.0 UI was judged disorganized: too many equal sections, no obvious information hierarchy, generic email, missing brand news, and no visible provenance for Instagram, TikTok, LinkedIn, press and web. User prefers original spontaneous application content hierarchy integrated into HUNT 2.0 luxury design. Existing approved job dossier and CV profile MUST remain unchanged.
Implemented as new functionality in hunt2-preview/outreach-intelligence.js, app.js and scoped luxury-refinement.css:
- Restored user-familiar section labels: Perché candidarti adesso; Scheda candidatura; Email pronta da personalizzare; Dove contattare il brand. Added clear Priorità di ricerca / Angolo del messaggio, and a consolidated expandable Fonti e segnali section.
- Redesigned mobile/desktop folder as a single editorial sequence, removing duplicated empty 'no news' and 'no signals' sections.
- Curated validated sources in data/outreach_brand_sources.json: sites, trade press and original official-profile links. Social sources currently linked: LinkedIn for ARMARIUM, BLAZÉ Milano, Plan C, DURAZZI Milano, FiveFourFive; Instagram for ARMARIUM and FiveFourFive; TikTok for FiveFourFive (linked on brand official website). These are independently traceable profile URLs, NOT automated social scans.
- World Radar: found 2,123 database articles. Previous top-400 global read missed some brands. Now queries articles for each specific brand by title/summary, then matches and merges with the sourced press records. The UI never claims that general brand news confirms hiring.
- When recommending a CV for merchandising/buying/planning, prefer the specialist uploaded CV instead of blindly selecting the generic principal CV. User remains in control of the dropdown. Brand-specific email hooks are editorial, and experience/education only come from confirmed user CV data; draft editing is preserved.
- Public-source company-size enrichment in Supabase: ARMARIUM and DURAZZI Milano 2-10; BLAZÉ Milano, Plan C, FiveFourFive 11-50, each with cited LinkedIn provenance in metadata. Only ARMARIUM and Plan C are marked independent explicitly based on supporting source text; don't treat private company as necessarily independent.
- Corrected a fresh LinkedIn profile verification being misread as a recent commercial event. Urgency labels now derive from substantive commercial events and age.
- Targeted JS tests passing: 11/11. App code parses and CSS brace check passes. Cached asset version set to 20261110-162. Actual GitHub Pages deployment and authenticated visual QA are not independently confirmed.
- LinkedIn posts read permissions apply only to authorized organization roles; Meta Instagram access requires approved professional account permissions; TikTok Research API is non-commercial and eligibility restricted. A link to an official profile is useful, but never label it a live post scan. Permissioned or licensed connectors are still a future enhancement.
See v2/docs/SPONTANEOUS_OUTREACH_INTELLIGENCE_2026-11-10.md for the platform-source roadmap.

## 10 November 2026 — Brand da contattare rev 164 (user follow-up)
- User found the name "Spontanee" unhelpful, brand news hard to find, and choosing another CV did nothing visible. User also insisted that outreach email must be customized **per logged-in user**. Original approved vacancy dossier and CV archive remain strictly unchanged.
- Renamed navigation **Brand da contattare** (mobile label **Brand**) and clarified feed copy.
- Brand-specific source-backed news now appear directly **inside "Perché candidarti adesso"**, not hidden only inside Fonti e segnali; the eight seeded brands have at least one dated industry press story in data/outreach_brand_sources.json. World Radar remains targeted by brand and additional articles are merged if relevant.
- On changing CV, the app **immediately** replaces email subject/body with a new version based on that CV, re-renders the explicit "HUNT uses these confirmed CV facts" explanation, and tracks the selected CV. If the user edited the text, a confirm dialog prevents silent loss. A separate reset button returns to the recommended text; no second click needed on ordinary CV switch.
- Generation uses the logged-in user's profile identity + own validated CV education, experience, relevant project(s), actual stated software, CV focus and user_personalization interests/communication style. No hardcoded Giulia facts in source. Unverified facts are excluded.
- Supabase migration outreach_user_selected_cv added nullable cv_id to private user_outreach_drafts and strengthened owner-only INSERT/UPDATE RLS policies to verify selected active CV belongs to the same authenticated user. A saved draft now persists cv_id. Security advisor reported existing unrelated global warnings, not a failure on this new table.
- Added hunt2-preview/tests/outreach-ui-flow.test.mjs; included it in GitHub Pages CI. Dedicated 14/14 source and personalization tests passed, four integration static checks passed, app JS compiled and CSS balanced; live authenticated UX/push-deploy status still not independently verified.
- Social monitoring: verified website/social links are not automated API scans. Concrete developer approval paths documented in v2/docs/HUNT_SOCIAL_MONITORING_SETUP_2026-11-10.md (Meta Instagram professional and review, LinkedIn Community Management/org permissions, TikTok Display user-authorized vs noncommercial Research API; licensed provider for third-party coverage). Do not tell users that simply linking a personal social account activates global competitor monitoring.
- New preview: https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?view=outreach&v=20261110-164


## 10 November 2026 — user requested Opportunity-style Brand outreach redesign: release 165
User showed screenshot of HUNT's approved Opportunity page with oversized brand eyebrow, position headline, role metadata and compact confidence/date/source line. They rejected Brand da contattare as still unordered, too short in Why, with news high in the page and amateur email about Excel. They also explicitly asked to start Meta/LinkedIn/TikTok developer integration step-by-step together.

**Changes committed to the preview (v165):**
- `hunt2-preview/outreach-intelligence.js`: completely restructured Brand folder to reuse real Opportunity CSS structures `folderHero`, `folderTabs`, `heroMeta`, and `brandGlobalNews`/`brandGlobalNewsList`/`brandNewsItem`. Accurate headline identifies actual commercial area; no invented 87% match score. Navigation tabs now scroll to Il brand, La candidatura, and News & fonti.
- **Reading order:** Hero → substantial "Perché contattare [brand] adesso" (commercial event, role-specific interpretation, caveat) → selected CV and application preparation → email → verified contact → **brand news and original source directory AT THE BOTTOM**. News cards reuse the same markup/class and functional source filters (All/Press/World Radar/Signals) as approved Opportunity brand news layout. Official social pages are linked in bottom sources; do not represent unscanned accounts as posts read.
- `data/outreach_brand_sources.json` now includes sourced `outreach_story`, `outreach_relevance`, `outreach_caution`, and distinct `email_bridge` for ALL eight curated brands. Stories use actual timeframes and explicitly distinguish business growth from hiring; no new claims of currently open positions.
- **Email quality improved:** removed the separate "Tra gli strumenti... Excel" sentence entirely. Uses only user-confirmed CV education, work experience, and a selected relevant project; where project evidence explicitly includes buying/assortments/stock/brand strategy, optionally includes that scope without fabricated metrics. Brand-specific factual opening and curated motivation make a professional 4–5-paragraph email. Logged-in identity, chosen CV, and preferences remain personal. Changes to CV immediately regenerate only with user confirmation if the visible email was manually edited, and drafts retain the chosen CV with RLS.
- `hunt2-preview/app.js`: functional section-scroll tabs, functional news source filters and "Apri tutte le Fashion News" action, `outNewsCounter` updated. Responsive scoped CSS appended in `luxury-refinement.css`. Dossier and profile (previously approved) not touched.
- `hunt2-preview/tests/outreach-intelligence.test.mjs` and `outreach-ui-flow.test.mjs` updated: **20/20 focused JS tests passed** with in-memory harness; app JS syntax valid, CSS braces balanced, news after email and contacts verified, all eight sourced brands have long stories and news links, cache references updated to 20261110-165. GitHub Pages authenticated live-browser deployment and real UI screenshots **not** independently verified; web open couldn't access the Pages URL, do not claim live test.
- **Social setup:** Meta official Business Discovery https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery confirms restricted public data/media for OTHER professional Instagram accounts. Path requires Instagram API with Facebook Login and appropriate professional account/permissions; not simply Instagram Login. User has been given initial action **open https://developers.facebook.com/apps/, login/create developer account and share non-secret dashboard screenshot**, then assistant guides exact app/use-case selection based on actual UI. After Instagram, continue LinkedIn developer access and TikTok licensed or user-authorized access; user must perform approval, never supply secrets.
- Direct URL: https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?view=outreach&v=20261110-165


## 10 November 2026 — HUNT 166: user explicitly rejected an IMAGE MOCKUP and wants REAL application edits
A previous assistant inadvertently generated a static product mockup (image) after the user asked to fix HUNT; user responded "ma che fai". **Never substitute image generation or concept art for implementation when user explicitly wants real app updates.** Address real repository sources.

User requested: do NOT make spontaneous outreach look like a vacancy, restore the original HUNT's compact candidate information card, professional editable email black vignette, beige verified-contact vignette, and **make Brand / La candidatura / News & fonti REAL mutually exclusive tabs, not scroll-to anchors**. The approved normal job dossier and Profile CV are frozen.

Done in main (public entrypoint version `20261110-166`):
- `hunt2-preview/outreach-intelligence.js` now has a lighter, brand-first `outBrandHero` prominently showing the BRAND rather than giant fictional role title; metadata and direct candidate button. Header does not repeat the full Why Now story or show redundant save UI.
- Three ARIA tab panels (`reason` initially displayed, `application` and `news` initially `hidden`). Candidature panel contains priority/area/message angle, selected CV, polished editable email and source-verified contact, plus "Ho già inviato" tracking. News panel contains only sourced news and official-source directory, with filters.
- `hunt2-preview/app.js` now toggles `hidden` for exclusive tab panels, `aria-selected`, roving tabIndex and keyboard Arrow/Home/End navigation. "Prepara candidatura" selects the application tab; no more scroll-only pseudo-tabs. Existing CV change, per-user letter personalization, saving and copied mail keep functioning.
- `hunt2-preview/luxury-refinement.css` adds scoped `outFolderV4` styles for pale brand-first hero, refined editorial space, true hiding, old-style black email textarea, separate beige contact card and single-column news cards; does not affect approved normal Opportunities/CV components.
- Updated `hunt2-preview/tests/outreach-intelligence.test.mjs` and `outreach-ui-flow.test.mjs` to prevent returning to fake-vacancy layout or scroll-only tabs. **22/22 scoped JS static/regression checks pass; syntax valid and CSS braces balanced.** No confirmed live authenticated visual QA yet; GitHub Pages URLs inaccessible to the web fetching tool, so do not claim the public deployment was browser-verified.
- Page link: `https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?view=outreach&v=20261110-166`.
- Meta/LinkedIn/TikTok commercial app permissions still need user-owned account authorization and/or licensed data; cannot bypass these or claim social post monitoring is active. Follow step-by-step Meta developer onboarding when user provides dashboard screenshots.


## 10 November 2026 — HUNT 167: user-refined Brand view and candidature
User submitted screenshots of ARMARIUM and asked to leave the BRAND HEADER as is, but replace the unappealing full-width brand explanation + big green "Il collegamento con il tuo profilo" card. They also requested to remove redundant AREA / ANGOLO DEL MESSAGGIO columns from the application sheet, with only **CV da utilizzare** displayed below in a full-width row, and complained that auto-inserting a Valentino Brand Strategy project sentence into an email was unprofessional. Everything else (functional 3 tabs, email/contact vignette, news) should stay as in v166. Next they want step-by-step LinkedIn and other social platform onboarding.

Implemented in main release `20261110-167`:
- Brand pane now has `outBrandInsightGrid` with two visually distinct editorial columns: "IL MOVIMENTO DOCUMENTATO" (sourced story and source links) and "PERCHÉ PUÒ ESSERE INTERESSANTE" (specific commercial interpretation), with a subtle line rather than a bulky green highlight. Existing brand hero/header preserved.
- "Scheda candidatura" now displays only `outCvOnly`: full-width CV dropdown, HUNT recommendation, short verification note. Removed area, priority and ANGolo del messaggio from this panel because the user did not want duplicate job-style fields here.
- Profile note shortened to a single factual sentence about the email following the verified CV; no more lengthy restatement of experience/projects next to selector.
- Personalized email generator now **skips vague project references** such as "Valentino - Brand strategy" even if present in a verified CV. It only mentions a project when confirmed `project.evidence` explicitly proves domain-relevant buying/assortment/allocation activities, using a natural short sentence. Other user-specific CV facts (education and real experience) preserved.
- All edits scoped to `hunt2-preview/outreach-intelligence.js` and `luxury-refinement.css`; app.js only cache-import bumped, index CSS and JS cache versions bumped to 167. Approved job dossier / CV Profile untouched.
- In-memory JS test harness reported **25/25 targeted tests pass**, JavaScript parses and CSS braces balanced. GitHub Pages authenticated browser deploy not independently verified.
- Next user-facing action: open [LinkedIn Developers My Apps](https://www.linkedin.com/developers/apps) while logged into their own LinkedIn account, share screenshot of My Apps. Creating an app may require a LinkedIn company Page and privacy policy; **Community Management API access is application-reviewed, and does NOT permit unrestricted competitor-brand post monitoring**. Base on official LinkedIn guidance: LinkedIn Help creating apps, Microsoft Learn Community Management review/permissions. After onboarding, progress to Meta Instagram / TikTok separately. Avoid requests for passwords or secrets.


## 10 November 2026 — HUNT 168: real UX corrections from three user screenshots
The user reviewed three screenshots and requested **three precise changes** after v167: (1) "Perché può essere interessante" must be a distinct, well-proportioned CARD rather than an unframed long text column; (2) "Scheda candidatura" must not be reduced to only a CV selector: retain useful fields from the earlier HUNT, but do not restore the unwanted giant Area/Angolo del messaggio duplicates; (3) the Brand LISTING CARD looks too much like a flat job listing and should be redesigned, with source-backed editorial hierarchy, not another generic row.

Most important factual demand: "Il flagship è un progetto ... apertura da verificare" should NOT be a visible disclaimer that sends verification to the end-user. **HUNT must verify business facts itself.** Web verification 2026-11-10: ARMARIUM's Control/Release SS27 presentation documented (Vogue 2026-09-28, article https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/armarium). Giorgia Gabriele's international wholesale relationships / distribution strategy documented (Forbes 2026-07-28, https://www.forbes.com/sites/katehardcastle/2026/07/28/armariums-giorgia-gabriele-on-why-luxury-has-a-pricing-problem-and-hospitality-is-winning/). Multiple sources previously mentioned a *planned* Milan flagship for autumn 2026, but no independently verifiable proof of completed opening was found. A LinkedIn Store Manager job listing was also observed, but had closed applications and required 10 years experience, so it must NOT be recommended as suitable junior vacancy (https://it.linkedin.com/jobs/view/store-manager-%E2%80%93-luxury-women%E2%80%99s-fashion-milan-at-armarium-srl-4468648301).

Implemented in `main`, preview cache version **20261110-168**:
- `data/outreach_signals_public.json` ARMARIUM: replace speculative flagship as main signal with confirmed SS27 collection and wholesale interview, including dated source URLs (Sept 28 / July 28), retain source count and priority. The public lead no longer includes "apertura da confermare".
- `data/outreach_brand_sources.json` ARMARIUM: source-verified editorial story, user-specific commerce relevance, factual email hook and a concise `preview_title`/`preview_summary`. Keep the unresolved store-opening note in `outreach_caution` for internal editorial QA only; renderer does **not** surface the internal warning. Add Forbes original article to bottom News & fonti. Eight curated brands get their own distinct preview title and summary for listing.
- `hunt2-preview/outreach-intelligence.js`: **new `outLeadV5` editorial discovery cards**, showing brand name, a precise two-line source-backed headline/summary, publication date, source count, priority and a discreet "Esplora il brand" action; not full-dossier copy repeated. Candidature sheet restores **PRIORITÀ** (from lead) and **STATO** (from user's saved draft), above a full-width verified CV choice; no redundant AREA or Angolo del messaggio. Reason panel continues to show verified commercial story, but no user-visible "you should verify this flagship" disclaimer.
- `hunt2-preview/luxury-refinement.css` adds pale framed premium insight card for the right-hand commercial interpretation, responsive variants, lighter editorial feed surfaces and small 2-field candidature summary.
- Frozen: Opportunity dossiers, approved CV Profile, separate real tab behavior, professional editable per-user outreach email and source/news pane, contact vignette.
- Focused in-memory JS/rendering tests: **28/28 passed**, app JS syntax valid and CSS brace count balanced; public GitHub Pages / account-authenticated browser visual QA **not verified**. Link: https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?view=outreach&v=20261110-168
- User may continue developer onboarding for LinkedIn/Meta/TikTok after visual UX review; cannot bypass organization API approval. Do not automatically infer account access or claim social third-party posts are being scanned.


## 10 November 2026 — HUNT 169: user demands real value, not decorative cards
User sent 3 screenshots of rev 168 (large white ARMARIUM card, two-column brand story, huge priority/status/CV card) and said "così no, il secondo sì ma puoi fare di meglio, orribile così non da valore aggiunto". Fix the actual application, not generate a mockup. **Previously approved vacancy dossiers/CV archive, separate tab behavior, brand source/news pane and professional personalized email must remain intact**.

Implemented on main, preview cache **20261110-169**:
- Outreach discovery feed rebuilt as *unboxed editorial rows* in `renderOutreachCards` with clear brand identity, genuinely sourced commercial headline, date and direct press references, plus a quiet "Apri analisi" action. No more giant empty white vacancy-like cards or meaningless "Dossier disponibile" labels. CSS `outResultsV6/outEditorialRow`.
- Added generic, user-scoped *verified-evidence* engine in `outreach-intelligence.js`: `analyzeOutreachCv(lead,cv)`, `renderOutreachCvInsight`, and `renderOutreachBrandEvidence`. Reads ONLY `parsed_profile` where user confirmation is true, scores raw documented experience/project bullet points for topics relevant to the brand's actual commercial signal (merchandising/assortment, wholesale/showroom, product, retail). Score is **internal ranking only**, not a fictional match percentage, hiring probability or official job requirement. Shows 2–3 quoted/closely extracted CV activities with precise origin (experience/company or project) and one possible area not documented to confirm before claiming. Does not mistake lack of CV evidence for lack of ability; explicitly says the observation is **not a brand requirement**.
- `chooseOutreachCv(cvs,area,lead)` now uses documented signal-specific evidence when available, falling back to prior verified specialist/default logic otherwise, not just file name.
- Candidate tab's content now *actually assists*: an understated select control with explainable recommended CV + "Che cosa valorizzare" evidence snippets and suggested checks, replacing the purposeless big priority/status summary box. The email, saved draft and source-verified contact continue below.
- Brand tab's original contextual right-hand card is preserved but now includes a small account-specific verified-CV connection when evidence exists; omitted when data not verified, no hallucinated experience. CV switch updates **email, evidence and brand tab summary live** by calling `renderOutreachCvInsight`/`renderOutreachBrandEvidence` in `openOutreachFolder`.
- CSS scoped to `hunt2-preview/luxury-refinement.css` adds premium editorial composition, clear type hierarchy and responsive evidence cards, avoiding changes to approved other pages.
- Extended `hunt2-preview/tests/outreach-intelligence.test.mjs` to assert verified-data-only analysis, truthful project/company sources, correct CV choice and no fake match scores; 31/31 focused tests passed using in-memory JS test runner; app syntax valid; CSS balanced; 8 initial brands still render. Asset versions set to v169.
- No authenticated real-browser QA or confirmed GitHub Pages deployment from available toolset; do not promise published appearance before user checks.
Direct URL: https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?view=outreach&v=20261110-169


## 11 November 2026 — HUNT 170: meaningful CV differences for spontaneous brand outreach
User shared v169 screenshot of the *Che cosa valorizzare* section and said they like the underlying idea but (a) both of their CVs mention showroom experience, so the system must analyze **differences in concrete activities and projects** rather than think that the CV named "Merchandising" is better just because both mention showroom, (b) an invented "Da approfondire, non un requisito del brand — Retail e canali digitali non compare..." warning makes no sense in a spontaneous application, and (c) three same-looking proof boxes are not luxury UX. **Everything else in HUNT was approved and must remain unchanged.**

Completed in `main`, asset version **20261111-170**:
- Only outreach intelligence and scoped CSS changed. `analyzeOutreachCv` now groups verified CV statements into distinct evidence areas and selects at most one representative proof for each, suppressing repetitive showroom-order bullets. Planning/assortment academic project details are distinguishable from transactional showroom activities, without pretending this is an employer job requirement. Lexical relevance heuristics remain evidence-based but **are not full semantic AI CV reading** and must never be presented as exact match percentages or hiring probabilities.
- `chooseOutreachCv` uses non-duplicated evidence coverage for comparing candidates; a tie breaks toward the confirmed main CV, not file-name bias. `explainOutreachCvChoice` explicitly compares the other verified CVs: when both show showroom and one uniquely documents a planning project, say so with project provenance; if both are substantially equivalent, candidly say there is no decisive documented difference.
- `renderOutreachCvInsight` now renders a restrained, compact editorial evidence list (`outEvidenceLines`), not an arbitrary grid of identical proof cards. Sources (job/project + company/project name) are displayed per proof. The entire "Da approfondire..." box has been removed from generated HTML; no skill-gap assertions on spontaneous employer outreach.
- Existing CV change handler already re-renders the email, brand personalization, and selected CV analysis. Old sourceCatalog and renderOutreachCards are preserved (had to restore them during refactor). Remaining: confirmed 8 brand seeds, approved vacancy dossier/Profile CV, email, contacts, tabs, news, source counts untouched.
- Expanded regression tests for shared showroom experience, a distinct verified Gucci planning project, repeated showroom bullet non-inflation, equal-CV truthful ties, and no unsupported gaps. 34/34 focused JS tests passed, app JS syntax valid and CSS braces balanced, correct release references in index/app; GitHub Pages authenticated visual QA/deploy unverified.
- Preview: https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?view=outreach&v=20261111-170


## 11 November 2026 — HUNT 171: ONLY layout "Che cosa valorizzare"
User shared screenshot of HUNT 170's CV evidence three long rows and requested: "tutto il resto top non cambaire niente solo questo non mi piace nacora il layout". The brief was STRICT: change the layout of the highlighted CV strengths only, preserving all text/evidence, ranking, CV choice, email, source/news, tabs, profile, and opportunities.
- In `hunt2-preview/outreach-intelligence.js`, `renderOutreachCvInsight` now groups already-selected CV evidence by the actual `kind+source` combination. Thus a showroom experience is one editorial collection and two distinct activities from "Gucci academic project" appear together under **one** project heading rather than repeating the project name in each horizontal row. No analysis scoring or recommendation changes.
- In `hunt2-preview/luxury-refinement.css`, scoped `outEvidenceCollections` two-column editorial layout with small source hierarchy, compact descriptions, single fine top rule, responsive one-column mobile. No repeated green cards, 01/02/03 labels, or vacancy-style list.
- Regression test added to `hunt2-preview/tests/outreach-intelligence.test.mjs` for 3 facts from 2 sources, asserting two grouped collections, source printed once, and all facts preserved.
- **35/35 in-memory focused tests passed**, app syntax valid, CSS braces balanced; index/app cache refs updated to `20261111-171`; authenticated browser/Pages deploy unverified.
- Link: https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/?view=outreach&v=20261111-171
- **Do not change any other HUNT UI** without new user direction.
