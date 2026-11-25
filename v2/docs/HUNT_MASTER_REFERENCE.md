# HUNT 2.0 — Documento di riferimento principale

> **Questo è il punto di partenza di ogni nuova sessione di lavoro.**
> Raccoglie visione, decisioni, architettura, stato reale, problemi e roadmap.
> I documenti datati in `v2/docs/` restano come archivio storico di dettaglio; in caso di conflitto vale questo file, poi il documento datato più recente.
>
> Repository pubblico: qui **non** vanno mai nomi, email, testi di CV, bozze personali, token o chiavi.
>
> Ultimo aggiornamento: **24 novembre 2026**, a cura del responsabile tecnico (Claude). Vedi il §12 "Registro delle sessioni".

---

## Indice
1. Visione e promessa del prodotto
2. Decisioni non negoziabili
3. Decisioni di design e UX già approvate (congelate)
4. Architettura: le tre applicazioni e il backend
5. Stato reale per area (World Radar, matching CV, dossier, candidature spontanee, Fashion News, multiutente)
6. Infrastruttura: GitHub, Supabase, Vercel, accessi
7. Problemi già risolti (cronologia)
8. Problemi aperti, in ordine di priorità
9. Test, monitoraggio, costi e recupero dagli errori
10. Roadmap verso un prodotto commercializzabile
11. Regole di lavoro e continuità
12. Registro delle sessioni
13. Glossario in parole semplici

---

## 1. Visione e promessa del prodotto

HUNT è un sistema personale di *career intelligence* per **Fashion & Luxury**: non un job board generico. Cerca molto in background e mostra poco, ma con priorità chiare, all'utente.

HUNT deve:
1. scoprire la parte più ampia possibile del mercato del lavoro pertinente (**World Radar** internazionale);
2. unire i duplicati in un'unica vacancy reale;
3. stimare con prove se una vacancy è attiva oggi;
4. capire il profilo reale di ogni utente: CV verificati, preferenze, esclusioni;
5. ordinare le opportunità per pertinenza personale e urgenza;
6. aiutare ad agire: dossier, CV consigliato, lettera ed email, contatti verificati, candidature, colloquio.

**Tre punteggi distinti, da non fondere mai in un numero unico:**
- **Match**: quanto il ruolo è adatto a *questa* persona;
- **Vacancy Confidence**: quanto è forte la prova che l'annuncio sia attivo (è una prova, non un verdetto "vero o falso");
- **Priority**: cosa conviene fare adesso.

**Esito chiave per l'utente:** entro 7 giorni trovare almeno un'opportunità pertinente, attiva e che da solo non avrebbe trovato o messo in priorità.

**Promessa onesta da usare verso l'esterno:** "Scandaglia il mercato in modo ampio, verifica ciò che può e ti dice ciò che conta." Mai promettere "tutto il web" o il 100% delle offerte.

**Obiettivo finale:** una piattaforma utile e **vendibile**, multiutente, con il design luxury editoriale già approvato e un funzionamento autosufficiente a costi sostenibili.

---

## 2. Decisioni non negoziabili

Provengono dalle richieste esplicite dell'utente tra l'8 e il 24 novembre 2026.

**Prodotto e dati**
1. **La HUNT originale è `hunt2-preview/`** (versione luxury approvata). Non va sostituita con l'app Next.js `v2/web/` né con un'altra app, senza una migrazione approvata esplicitamente.
2. **Mai inventare** competenze, esperienze, titoli di studio, livelli linguistici, risultati, requisiti, date di pubblicazione, contatti, email o vacancy.
3. **Una data di pubblicazione sconosciuta resta sconosciuta.** Se manca, si usa "Rilevata il …" (`first_seen_at`) e non "Pubblicata". La data di creazione di Lever (`createdAt`) va in `metadata.provider_creation_at` e non vale come data di pubblicazione.
4. **Freschezza dei suggerimenti personali:**
   - pubblicazione (o prima rilevazione, se la pubblicazione manca) entro 20×24 ore;
   - ultima verifica entro 7 giorni;
   - stato `active_verified` o `active_likely`;
   - descrizione di almeno 250 caratteri.
5. **Nessun ruolo senior o manager ai profili early-career** senza requisiti dimostrati. Un titolo esplicitamente "Senior" non è mai entry level.
6. **CV-first:** i requisiti reali dell'annuncio (anni, lingue, software, titolo di studio, seniority, città) vanno confrontati con i CV **confermati dall'utente**. Il testo OCR e le bozze AI non sono fatti confermati.
7. **Preferenze esplicite più forti di quelle dedotte:** se l'utente esclude "Sales Associate", HUNT non deve reimpararlo dai clic.
8. **Senza CV:** si mostrano solo stage/junior nelle aree dichiarate, senza falso punteggio di compatibilità e senza dossier che presuppongano esperienze. Le offerte fuori città vanno in "Da esplorare / Altre città".
9. **Preparare non significa essersi candidati.** Solo "Già candidata / Ho inviato" sposta l'offerta in Candidature. HUNT **non invia** email in automatico.
10. **Candidature spontanee** solo con evidenza pubblica datata (apertura, espansione, lancio, wholesale…). Se esiste una vacancy reale adatta, va proposta quella. Un'email generica dell'azienda non è un contatto HR. Mai indovinare nomi o formati email.
11. **Le news non sono vacancy.** Un articolo da solo non dimostra che un brand assuma.
12. **Social (Instagram, LinkedIn, TikTok):** un link al profilo ufficiale non equivale a leggere i post. Il monitoraggio automatico richiede permessi API ufficiali o una licenza; mai aggirare login o anti-bot.

**Privacy e sicurezza**

13. CV, bozze, candidature e dati personali restano dietro Auth, Storage privato e RLS. **Mai nel repository**, che è pubblico.
14. Chiavi e token solo nei *secret* dei servizi (Supabase, GitHub, Vercel). Mai in chat, nel codice o nel browser.

**Costi e produzione**

15. **Nessun servizio a pagamento** senza autorizzazione esplicita: upgrade Supabase Pro, chiave OpenAI, Vercel Pro, provider social.
16. **Nessuna modifica al database di produzione o deploy senza autorizzazione** dell'utente, comunicando prima esattamente cosa cambia.
17. **Non cancellare** CV, account, profili, candidature, bozze o offerte storiche. Si possono rimuovere solo dati calcolati, come i suggerimenti scaduti in `user_job_matches`.
18. **Non creare un secondo progetto Supabase** per aggirare la quota e non spostare dati privati altrove.

**Metodo di lavoro**

19. Lavorare su branch separati da `main`, eseguire i test e aprire pull request. **Il merge lo approva l'utente.**
20. Distinguere sempre tre livelli: (1) pianificato, (2) codice o cron esistente, (3) **verificato end-to-end**. Una CI verde non è un deploy riuscito; un cron "succeeded" non è una scansione riuscita.
21. Non dichiarare HUNT "pronta per la vendita" finché non sono superati i quality gate del §10.

---

## 3. Decisioni di design e UX già approvate (congelate)

Lo stile è **luxury editoriale**: avorio, toni caldi e charcoal, linee sottili, tipografia misurata. Niente card decorative ripetute, badge colorati, numerazioni 01/02/03, look "generato da AI" o dashboard tecniche nella navigazione utente.

**Navigazione HUNT 2.0** (`hunt2-preview`): Opportunità · Brand da contattare (su mobile "Brand") · Fashion News · Candidature · Profilo. Registri di brand e fonti e i dati diagnostici sono solo interni.

**Dossier dell'opportunità** — approvato e congelato il 10/11, versione 155:
- titolo **"Il ruolo, in sintesi"** con una spiegazione sostanziosa, naturale e basata sulla fonte (circa 90 parole), senza mansioni inventate;
- paragrafo separato "In relazione al tuo profilo";
- due azioni orizzontali "Attività e responsabilità" e "Requisiti";
- solo **3–4 requisiti professionali verificabili**, senza soft skill o giudizi sulla personalità;
- nessun confronto numerico sugli anni basato su stime;
- etichette "Presente nel CV", "Indicato nel CV", "Presente in parte", "Non indicato nel CV";
- sidebar con il testo esatto **"Il tuo dossier / Curriculum da utilizzare"** e **"HUNT propone la versione più pertinente. La scelta finale è tua."**, la scelta CV e un unico link all'annuncio ufficiale;
- fonte e ATS in piccolo in fondo.

**Profilo e CV Hub** — approvato e congelato:
- archivio CV a sinistra, area di lavoro a destra con riepilogo "Il tuo CV, in breve";
- azione **"Verifica i dati estratti"** per i CV non verificati e "Modifica i dati del CV" per quelli verificati, con salvataggio finale "Conferma e salva";
- possibilità di avere più CV, con uno principale e uno secondario, ed eliminarli (con conferma);
- il CV caricato non viene mai modificato.

**Brand da contattare** (candidature spontanee), versioni 162–171:
- elenco come righe editoriali, non come card di vacancy;
- cartella del brand con tre schede vere ed esclusive: **Il brand / La candidatura / News & fonti**;
- "Perché candidarti adesso" con movimento documentato, datato e linkato;
- "Che cosa valorizzare" con prove dai CV confermati, raggruppate per esperienza o progetto (layout della versione 171 approvato);
- email modificabile su fondo nero, contatto verificato su fondo beige;
- news e fonti in fondo;
- niente avvisi di "da verificare" scaricati sull'utente: HUNT verifica da sé i fatti di business.

**Cover letter: in pausa su richiesta dell'utente** (dal 9/11).
- Il motore deterministico `letter-editorial.js` (v11) e la funzione `hunt-application-dossier` sono conservati.
- Nessun pulsante visibile finché l'utente non chiede di riattivarla.
- Quando riprenderà: mai sovrascrivere le modifiche dell'utente e salvataggio esplicito.

**Onboarding** (PR #58):
- nomi segnaposto "Mario / Rossi";
- città di lavoro distinte dalla disponibilità al trasferimento, con aggiunta libera;
- CV facoltativo; senza CV parte comunque il secondo questionario di personalizzazione.

**Regola generale:** non riprogettare parti approvate senza una richiesta nuova o un bug essenziale. **Mai sostituire un'implementazione con un mockup o un'immagine.**

---

## 4. Architettura: le tre applicazioni e il backend

| Parte | Percorso | Ruolo | Stato |
|---|---|---|---|
| **HUNT originale (prima versione)** | radice: `index.html`, `app.js`, `data/`, `scripts/` | Prototipo PWA personale: radar via GitHub Actions → JSON → GitHub Pages, push OneSignal | Attiva. Il workflow `hunt-radar.yml` gira ogni 5 minuti e fa commit dei soli dati cambiati |
| **HUNT 2.0 luxury (UFFICIALE)** | `hunt2-preview/` | App multiutente approvata: login Supabase, onboarding, opportunità, dossier, CV, Brand, Fashion News, Candidature | Pubblicata su GitHub Pages: `https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/`. Oggi **non funziona** per il blocco quota di Supabase (§6) |
| Radar pubblico temporaneo | `hunt2-preview/radar/` | Elenco offerte senza login e senza Supabase, preferenze salvate solo nel browser | Attivo durante il blocco. **Non sostituisce** HUNT 2.0 |
| App Next.js | `v2/web/` | Frontend alternativo (Vercel) | **Non è la HUNT approvata.** Non usarla al posto di `hunt2-preview` |
| Motore Python | `v2/services/` | Modelli, normalizzazione, deduplica, confidence; test pytest | Libreria e test; il lavoro operativo è nelle Edge Functions |

### Backend Supabase (progetto "Hunt 2", ref `dfiokxjfgqoboxckcuut`)
- **Database PostgreSQL** (schema in `v2/database/schema.sql` più le migrazioni in `v2/supabase/migrations/`). Livelli:
  - **mercato globale**, condiviso: `companies`, `sources`, `jobs`, `job_sources`, `job_observations`, `repost_events`, `job_candidates`, `company_signals`, `world_news_items`, `world_news_sources`, `intelligence_sources`;
  - **personale**, privato con RLS: `profiles`, `career_preferences`, `user_personalization`, `user_cvs`, `user_job_matches`, `user_job_feedback`, `applications`, `user_job_dossiers`, `user_outreach_drafts`, `user_news_reads`;
  - **operativo**, privato: schema `hunt_ops` (watchdog quota, stato del matching, registro consumi), `hunt_quality_snapshots`, `hunt_world_coverage_snapshots`, `internal_runtime_secrets`.
- **Auth** Supabase; **Storage** privato `cvs` per i file CV.
- **Edge Functions** (`v2/supabase/functions/`):

| Funzione | Cosa fa | Cron (job pg_cron) |
|---|---|---|
| `hunt-ats-board-scan` | Legge le board ATS pubbliche (Lever, Greenhouse, Ashby, SmartRecruiters, Workable), crea e aggiorna le vacancy | `hunt-ats-board-scan-5m` |
| `hunt-source-discovery` | Pagine careers ufficiali: link, JSON-LD JobPosting, microdati SuccessFactors, coda `job_candidates` | `hunt-source-discovery-5m` |
| `hunt-successfactors-public` | Cataloghi SAP SuccessFactors (es. Prada Group) a rotazione | `hunt-successfactors-public-10m` |
| `hunt-vacancy-monitor` | Ricontrolla i link delle singole vacancy (chiusura confermata, repost) | `hunt-vacancy-monitor-10m` |
| `hunt-ats-discovery` | Scopre board ATS e pagine careers dai siti dei brand | `hunt-ats-discovery-15m` |
| `hunt-brand-website-repair` | Trova il sito ufficiale dei brand che ne sono privi | `hunt-brand-website-repair-30m` |
| `hunt-fashion-brand-discovery` | Scopre nuovi brand dalla directory FashionUnited | `hunt-fashion-brand-discovery-30m` |
| `hunt-description-repair` | Recupera descrizioni complete dalla pagina ufficiale | `hunt-description-repair-30m` |
| `hunt-match-refresh` | Matching personale CV ↔ offerte → `user_job_matches` | `hunt-match-refresh-5m` (oggi orario) |
| `hunt-global-news` | Fashion News da feed RSS | `hunt-global-news-5m` |
| `hunt-news-source-sync` | Crea i feed news per i nuovi brand | `hunt-news-source-sync-5m` |
| `hunt-company-intelligence` | Segnali dalle newsroom e sezioni IR dei brand | `hunt-company-intelligence-5m` |
| `hunt-intelligence-source-discovery` | Trova sezioni stampa, IR e social dei brand | `hunt-intelligence-source-discovery-15m` |
| `hunt-cv-parser`, `hunt-cv-interpret` | Lettura e interpretazione dei CV (l'interpretazione AI richiede `OPENAI_API_KEY`, non configurata) | su richiesta |
| `hunt-application-dossier` | Dossier e lettera deterministica v11 (lettera in pausa nella UI) | su richiesta |
| `hunt-letter-polish`, `hunt-job-facts`, `hunt-ai-status` | Funzioni AI facoltative: **disattive**, perché non c'è la chiave OpenAI | — |

- **Cron solo SQL:**
  - `hunt-recommendations-cleanup-5m`: elimina i suggerimenti scaduti;
  - `hunt-quality-audit-hourly`: audit della qualità;
  - `hunt-world-coverage-audit-6h`: copertura World Radar;
  - `hunt-quota-watchdog-30m`: controllo HTTP 402 e ripartenza.
- I cron chiamano le funzioni con `net.http_post` e un token interno (`x-hunt-cron`); il suo hash è in `internal_runtime_secrets`.

### GitHub Actions (`.github/workflows/`)
| Workflow | Funzione |
|---|---|
| `hunt-radar.yml` | Radar della prima HUNT ogni 5 minuti; fa commit solo dei dati cambiati (refresh forzato ogni 12 ore) |
| `hunt-public-radar.yml` | Radar pubblico temporaneo ogni 6 ore, senza Supabase |
| `pages.yml` ("Deploy HUNT") | Unico publisher di GitHub Pages; blocca la pubblicazione se i test falliscono |
| `hunt-v2-tests.yml` ("HUNT 2.0 Core Tests") | CI principale: test node, Deno, Python, SQL, build Next.js |
| `hunt-preview-syntax.yml` | Controlli di sintassi e regressione di `hunt2-preview` sulle PR |
| `hunt-v2-web.yml` | Build dell'app Next.js |
| `hunt-health.yml` | Watchdog ogni 3 ore: freschezza del radar e sito; un'unica issue per incidente |
| `hunt-supabase-guard.yml` | Stato della protezione consumi 4 volte al giorno; un'unica issue (attivo dal merge della #67) |
| `push-test.yml` | Test delle notifiche push |

---

## 5. Stato reale per area

Le metriche sono fotografie con data, non garanzie. Supabase è bloccato dal 18/11 alle 22:13 UTC, quindi i numeri più recenti sono di quel giorno o del 19/11.

### 5.1 World Radar (copertura offerte)
- **Ultimo dato verificato** (19/11):
  - 1.414 job totali, 965 attivi;
  - 294 brand monitorati, di cui 119 con fonte careers ufficiale e **175 senza**;
  - 21 fonti ufficiali produttive; **97 fonti raggiungibili ma con 0 vacancy estratte**;
  - 188 siti brand candidati non verificati.
  - Il 18/11: 998 job con Paese verificato, 21 codici Paese tra le offerte recenti, 636 offerte "recenti, verificate e descritte".
- **ATS letti bene:** Lever (con paginazione), Greenhouse, Ashby, SmartRecruiters (con paginazione), Workable; SuccessFactors per Prada Group; JSON-LD sulle pagine careers.
- **Buchi principali:**
  - **LVMH: 0 vacancy estratte su 10 fonti**, mentre il portale ne mostra circa 5.000. È già riconosciuto il formato dei link ai singoli annunci, ma l'estrazione completa va ancora verificata;
  - **SuccessFactors di Moncler e Valentino** senza estrazione produttiva (manca `config.catalog_urls`);
  - Workday e Oracle (Hermès, Golden Goose) non supportati;
  - pagine careers renderizzate via JavaScript;
  - 26 annunci attivi con descrizione sotto i 250 caratteri, soprattutto Richemont.
- **Geografia:** il Paese si assegna solo da indicazioni esplicite o regioni univoche; le località ambigue restano senza Paese.
- **Radar pubblico temporaneo** (dal 24/11, PR #71): 28 portali ufficiali verificati, **1.216 offerte** pubblicate al primo giro (27/28 portali risposti), 283 tra stage/junior/assistant, 147 in Italia; aggiornato ogni 6 ore senza Supabase. Corretto un difetto per cui tutte le offerte SmartRecruiters (Max Mara, Frette…) venivano scartate. Le preferenze sono locali al browser e non c'è matching CV.
- **LVMH, verificato il 24/11:**
  - la sitemap pubblica non elenca i singoli annunci;
  - l'elenco si carica solo dal motore di ricerca interno del sito, che **non va usato**, perché richiederebbe chiavi pensate per il loro sito;
  - strade corrette: portali propri delle singole maison, verifica delle pagine annuncio trovate per altre vie, in futuro un feed ufficiale per partner.
- **Lettore di feed pubblici (RSS/Atom), PR del 24/11 sera:** codice presente e testato (19 test), nessuna fonte feed ancora attiva. Ralph Lauren configurato ma disattivato per sfida anti-bot (vedi §12).
- **Lettore "sitemap + JSON-LD" (PR #75, unita il 25/11, verificato su GitHub):** prima fonte PVH (Calvin Klein, Tommy Hilfiger), 1.116 annunci nella sitemap ufficiale. Al massimo 120 pagine per giro, con memoria di ciò che è già stato controllato (`sitemap-state.json`). Il primo riempimento completo richiede circa 2–3 giorni di giri automatici.

### 5.2 Matching basato sui CV
- **Motore:** `hunt-match-refresh` con `eligibility-v2`. Considera:
  - famiglie di ruolo, regole sulla seniority (`seniority-guard`) e anni minimi letti dal testo;
  - lingue obbligatorie e segnali specialistici;
  - città e disponibilità al trasferimento;
  - esclusioni (vendita in negozio, IT, back-office…) e radar `focused` / `smart` / `explore`;
  - prove dai CV confermati (scegliendo la versione più pertinente) e specializzazione supplier risk.
- **Ultimo dato** (18–19/11): 2 account, 2 CV privati, 11 suggerimenti; 0 suggerimenti scaduti, 0 senior a profili early-career.
- **Limiti:**
  - l'analisi è lessicale e a regole, non una lettura semantica completa del CV;
  - non c'è ancora il test su 20 CV e 30 coppie CV–annuncio;
  - l'apprendimento dai feedback (salva, nascondi, "troppo senior"…) non è implementato.
- **PR #66 (unita il 24/11, non ancora in produzione):** matching incrementale. Legge solo ciò che cambia; stessi risultati dimostrati su 19 scenari.

### 5.3 Dossier, CV consigliato e cover letter
- Il dossier funziona nel codice: requisiti prioritari, prove dal CV, scelta del CV, link ufficiale, news del brand. Mancano ancora la QA autenticata end-to-end e la revisione su 30 combinazioni reali.
- **Cover letter in pausa** (vedi §3). Le funzioni AI (rifinitura lettera, interpretazione CV) sono pronte ma **disattive**: servirebbe una chiave OpenAI a pagamento, separata dall'abbonamento ChatGPT. Non attivarle senza consenso e un limite di spesa.
- **OCR dei CV:** avviene nel browser (PDF, DOCX, TXT, immagini; massimo 12 pagine e 8 MB). I dati estratti devono essere confermati dall'utente.

### 5.4 Candidature spontanee (Brand da contattare)
- Prima base funzionante: 8 brand curati con fonti datate (`data/outreach_brand_sources.json`, `data/outreach_signals_public.json`), email personalizzata per utente con i soli fatti del CV confermato, bozze private (`user_outreach_drafts`, RLS).
- **Manca la parte autonoma:**
  - scoperta automatica di brand piccoli ed emergenti con segnali datati;
  - arricchimento di dimensione e indipendenza;
  - contatti HR verificati con provenienza;
  - controllo automatico "esiste già una vacancy adatta?";
  - social con permessi ufficiali.
- Al 10/11: 0 righe in `outreach_candidates` e 0 scansioni social riuscite.

### 5.5 Fashion News
- `hunt-global-news` su circa 288 feed (il 18/11 ne risultavano 87 degradati, con cooldown introdotto), feed di brand automatici e segnali aziendali. Nel dossier e nei Brand le news si collegano solo con corrispondenza esatta del nome del brand.
- **Da fare:**
  - qualità e pertinenza per utente;
  - deduplica degli articoli ripresi da più testate;
  - sintesi senza fatti inventati;
  - riduzione delle fonti degradate.

### 5.6 Esperienza multiutente
- Auth, onboarding, RLS su tutti i dati personali e feed con o senza CV (PR #58). Il 18/11 risultano 2 account.
- Mai testato end-to-end con browser autenticato. È **il primo controllo da fare dopo lo sblocco**.

### 5.7 Notifiche
- Push OneSignal nella prima HUNT e alert tramite issue GitHub. Le notifiche personalizzate di HUNT 2.0 non sono implementate né testate. Un cron attivo non significa che le notifiche arrivino.

---

## 6. Infrastruttura: GitHub, Supabase, Vercel, accessi

### GitHub
- Repository **pubblico** `giuliagrimaldi135-wq/HUNT-`, ramo `main`.
- L'app Claude GitHub ha accesso in scrittura (dal 24/11).
- Il lavoro avviene su branch `claude/...` con PR; il merge lo fa l'utente.
- **Rendere privato il repository** ridurrebbe il rischio, ma prima va verificato l'impatto su GitHub Pages e Vercel (decisione aperta).

### Supabase
- Organizzazione su **piano Free**:
  - 5 GB di Uncached Egress per ciclo, ciclo dall'8 al 8 del mese;
  - database circa 118 MB su 500 MB; Storage circa 1,8 MB.
- **Blocco attivo:** `exceed_egress_quota` (HTTP 402) dal 18/11. Nel ciclo 8/11–8/12 sono stati usati 20,02 GB contro 5 GB.
  - **Causa:** traffico PostgREST generato dalle funzioni automatiche, con centinaia di migliaia di PATCH e DELETE inutili al giorno e il download completo delle descrizioni.
  - **Sblocco atteso:** rinnovo della quota l'**8 dicembre 2026**, oppure upgrade a pagamento (non autorizzato).
  - Il watchdog `hunt_ops.quota_watchdog` ha sospeso i 13 cron di rete; riparte da solo dopo due controlli riusciti.
- Già corretti: niente scritture inutili nel matching (PR #60), watchdog (PR #61), ATS senza riletture entro 6 ore (PR #64).
- **PR #66 e #67 unite il 24/11. Migrazioni applicate in produzione il 24/11** (autorizzate dall'utente): `hunt_incremental_matching_state_20261124` e `hunt_egress_budget_guard_{1_tables,2_logic,3_alerts_watchdog}_20261124`. Verificato dopo l'applicazione: nessuno scanner riattivato, blocco 402 ancora attivo, permessi corretti, 52 livelli di scansione collegati a job esistenti.
- **Edge Functions aggiornate il 24/11** (autorizzate dall'utente), tutte e 13 dal codice di `main` al commit `81a8e3e6b008dc66b058c5a467fbd0950212cbad`.
  - Nuove versioni: `hunt-match-refresh` v23, `hunt-ats-board-scan` v13, `hunt-ats-discovery` v11, `hunt-source-discovery` v20, `hunt-successfactors-public` v8, `hunt-vacancy-monitor` v4, `hunt-global-news` v5, `hunt-company-intelligence` v6, `hunt-intelligence-source-discovery` v7, `hunt-fashion-brand-discovery` v5, `hunt-description-repair` v3, `hunt-brand-website-repair` v3, `hunt-news-source-sync` v2.
  - **Metodo:** tramite il connettore Supabase, ogni funzione contiene un `index.ts` di una riga che importa il codice da `raw.githubusercontent.com` **bloccato a quel commit**; Supabase lo incorpora nel pacchetto al momento della pubblicazione.
  - **Verificato:** i test di equivalenza danno risultati identici eseguiti tramite questo file d'avvio, e il pacchetto è stato costruito (quindi tutte le importazioni sono state risolte).
  - **Non ancora verificato a runtime**, perché ogni chiamata è bloccata dal 402: va controllato dopo lo sblocco (prime righe in `hunt_ops.function_usage_hourly`).
  - **Rollback:** ripubblicare lo stesso `index.ts` d'avvio puntando al commit `1e59482f1149b628369501eb7a3031610d8bbb72` (codice precedente a #66/#67).
  - Il workflow `hunt-supabase-deploy.yml` resta disponibile per il futuro, se verrà aggiunto il segreto GitHub `SUPABASE_ACCESS_TOKEN` con permesso di scrittura sulle funzioni. Il token salvato nell'ambiente cloud il 24/11 ha solo permessi di lettura e non è servito.
- **Accesso di Claude:** connettore Supabase **collegato dal 24/11** (lettura del database, migrazioni e funzioni, sempre con autorizzazione dell'utente).

### Vercel
- Progetto `hunt` (`prj_kJf0Md4aMDzqaEI9GnTvWDnv3nri`) nel team `andreottistefano-1365` (`team_0oAQMNmQt8EUdkA7pdAxGQaI`), URL `https://hunt-nine-nu.vercel.app/`. Connettore Vercel **collegato e autorizzato per il team dal 24/11**. Ospita l'app Next.js `v2/web`, **che non è la HUNT approvata**.
- `vercel.json` con `ignoreCommand` (`scripts/hunt-vercel-ignore.sh`): niente build per i commit di soli dati, documenti o backend.
- In passato il piano Hobby ha restituito `build-rate-limit`.
- **Decisione dell'utente (18/11):** prima completare backend e copertura, poi riprendere Vercel.

### Collegamenti da completare (guida passo passo, nessuna chiave in chat)
1. **Connettore Supabase (ufficiale)**
   - apri https://claude.ai/customize/connectors e cerca **Supabase**;
   - premi **Connect** e accedi a Supabase con il tuo account; autorizza l'organizzazione che contiene "Hunt 2";
   - apri una **nuova** sessione di Claude Code sul repository: i connettori si caricano all'avvio della sessione.
   - Con il connettore Claude può leggere lo stato del database, i log e le Edge Functions. Ogni modifica a produzione, migrazioni e deploy compresi, resta soggetta alla tua approvazione esplicita (§2.16).
2. **Connettore Vercel (ufficiale)**: stesso percorso, cercando **Vercel**. Autorizza lo scope dove si trova il progetto `hunt`. In passato il connettore vedeva lo scope ma non il progetto, quindi va controllato quale account Vercel possiede il progetto.
3. **Alternativa senza connettore** (se servirà, per esempio per un controllo automatico dell'egress): un token personale Supabase si salva **solo** dal modulo sicuro dell'ambiente cloud, che Claude apre con la funzione apposita; mai incollarlo in chat.

---

## 7. Problemi già risolti (cronologia sintetica)

- **9–11/11:**
  - dossier che non si apriva (`normalizeVacancyFacts`, variabile `companyName`);
  - tempesta di email di CI dovuta a deploy concorrenti su Pages;
  - Excel "in un altro CV" anche quando presente in entrambi;
  - test di regressione obsoleti che bloccavano Pages;
  - privacy del feed pubblico delle spontanee;
  - redesign approvati di dossier, CV, Brand (versioni 152–171).
- **16/11:** deduplica SmartRecruiters Max Mara/Sportmax; regola dei 20 giorni e dei 7 giorni; pulizia dei suggerimenti scaduti (PR #10, #11).
- **17/11:**
  - date Lever (`provider_creation_at`);
  - quarantena dei falsi candidati (link di navigazione);
  - siti ufficiali di 16 brand;
  - separazione fra scanner e salute delle fonti;
  - backoff SuccessFactors.
- **18/11:**
  - specializzazione supplier risk (#45);
  - news con cooldown e limite per host (#46);
  - distribuzione delle fonti (#47);
  - careers sul dominio del brand e multilingua (#48–#52);
  - Lever paginato e Paese (#53);
  - JSON-LD (#54, #56);
  - ricerca alternativa per fonti senza annunci (#55);
  - filtro build Vercel (#57);
  - multiutente, onboarding e feed senza CV, guardia senior (#58);
  - audit World Web ogni 6 ore e metriche di prontezza.
- **19/11:**
  - **incidente egress:** fix delle scritture inutili (#60), watchdog 402 e scanner più leggeri (#61);
  - messaggi chiari sul 402 nella UI (#62);
  - radar pubblico temporaneo (#63–#65).
- **24/11:** analisi completa; PR #66 (matching incrementale) e #67 (protezione preventiva dei consumi), con revisione della telemetria e allerta automatica. Vedi §12.

---

## 8. Problemi aperti, in ordine di priorità

1. **Supabase bloccato fino all'8/12.**
   - #66 e #67 sono già unite: con autorizzazione, applicare le migrazioni e ridistribuire le funzioni.
   - Dopo lo sblocco misurare l'egress reale delle prime 24 ore (obiettivo: meno di 100 MB al giorno).
2. **Test end-to-end autenticato** con 2 account, con e senza CV, desktop e mobile:
   - onboarding;
   - upload e verifica del CV;
   - feed e dossier;
   - Brand;
   - candidature.
3. **Copertura World Radar:**
   - LVMH (circa 5.000 annunci, 0 estratti);
   - SuccessFactors di Moncler e Valentino;
   - Workday e Oracle (Hermès, Golden Goose…);
   - 97 fonti senza annunci estratti e 175 brand senza fonte;
   - benchmark su 20–30 portali (obiettivo: almeno 90% degli annunci accessibili).
4. **Qualità del matching:** test su 20 CV e 30 coppie; lettura più profonda dei requisiti; feedback che modificano il ranking; spiegazioni.
5. **Candidature spontanee autonome:** scoperta di brand emergenti, segnali datati, contatti verificati, controllo "vacancy già esistente".
6. **Fashion News:** pertinenza per utente, deduplica, fonti degradate.
7. **Cover letter, interpretazione CV e AI:** decisione di prodotto e di costo (chiave OpenAI con limiti) quando l'utente lo chiederà.
8. **Notifiche personalizzate** HUNT 2.0 e test di consegna reale.
9. **Sicurezza:**
   - repository pubblico, da valutare se renderlo privato;
   - protezione contro le password compromesse in Supabase Auth, da verificare;
   - la funzione pubblica `hunt_egress_alert` espone solo codici di stato.
10. **Vercel:** chiarire account e progetto, `build-rate-limit`, ruolo di `v2/web`. Rimandato per decisione dell'utente.

---

## 9. Test, monitoraggio, costi e recupero dagli errori

### Test (tutti in CI, file `hunt-v2-tests.yml`)
- **Node** (`node --test`): oltre 170 test su matching, guardia senior, fonti, ATS, LVMH/SuccessFactors, news, onboarding, radar, preferenze e workflow di allerta.
- **Deno:** typecheck di `hunt-match-refresh`, test di equivalenza del matching incrementale, test del misuratore dei consumi con il vero client supabase-js.
- **SQL:** il job `sql` usa PostgreSQL 16 con `pg_cron` e `pg_net` simulati (`v2/supabase/tests/run_sql_tests.sh`) e applica ogni migrazione due volte.
- **Python:** `pytest` in `v2/services`. **Next.js:** typecheck e build.
- **Frontend HUNT 2.0:** `hunt-preview-syntax.yml` e il gate di `pages.yml`, che non pubblica se i test falliscono.
- Comandi locali principali:
  - `node --test` nella cartella della funzione;
  - `deno test --allow-run --allow-env --allow-read equivalence/equivalence.test.ts`;
  - `v2/supabase/tests/run_sql_tests.sh` con le variabili `PG*`.

### Monitoraggio automatico (senza controlli quotidiani)
- **Issue GitHub uniche**, che si aprono e si chiudono da sole:
  - "HUNT · radar o sito non aggiornati";
  - "HUNT · aggiornamento dati o notifiche bloccato";
  - "HUNT · pubblicazione bloccata dai controlli";
  - "HUNT · protezione consumi Supabase" (con #67).
- **Nel database:** `hunt_quality_snapshots` (ogni ora), `hunt_world_coverage_snapshots` (ogni 6 ore), `hunt_ops.quota_control` e, con #67, `hunt_ops.egress_status()`.

### Costi
- **Oggi 0 €:** Supabase Free, GitHub gratuito, Vercel Hobby, nessuna AI a pagamento.
- **Budget operativo Supabase:** 100 MB al giorno di egress (la quota Free è di 5 GB al mese).
- Ogni servizio a pagamento richiede l'autorizzazione dell'utente: Supabase Pro (circa 25 $/mese), OpenAI, Vercel Pro, provider social.

### Recupero dagli errori (runbook)
- **HTTP 402 o quota:** non riavviare gli scanner a mano. Il watchdog riparte da solo dopo 2 controlli riusciti; con #67 riparte in `economy` (ATS ogni 15 minuti), poi `balanced` e infine `fast` (5 minuti) se i consumi lo consentono.
- **Una fonte fallisce:** le vacancy non vengono chiuse in massa; la fonte va in backoff e viene ritentata.
- **Deploy frontend fallito:** Pages conserva l'ultima versione valida; apre un'issue; correggere con una PR.
- **Rollback di #66/#67:** nel documento `v2/docs/HUNT_EGRESS_GUARD_2026-11-24.md`.
- **Query di stato utili** (sola lettura): in `AUTONOMOUS_OPERATIONS_2026_11_17.md` e in `HUNT_EGRESS_GUARD_2026-11-24.md`.

---

## 10. Roadmap verso un prodotto commercializzabile

**Fase 1 — Stabilità e consumi** (ora → 8/12 → metà dicembre)
- Merge di #66 e #67 (fatto il 24/11) e, con autorizzazione, migrazioni e deploy.
- Sblocco e ripartenza graduale; misura dell'egress reale; test end-to-end di 2 account.
- **Uscita:** 7 giorni consecutivi sotto i 100 MB al giorno, nessun 402, suggerimenti freschi.

**Fase 2 — World Radar ampio**
- LVMH, SuccessFactors (Moncler, Valentino), Workday, Oracle; recupero delle 97 fonti senza annunci; scoperta di nuovi brand.
- Benchmark su 20–30 portali.
- **Uscita:** almeno 90% degli annunci accessibili sui portali integrati, duplicati sotto il 5%, data e fonte sempre presenti.

**Fase 3 — Matching profondo**
- Lettura strutturata dei requisiti; feedback che migliora il ranking; test su 20 CV e 30 coppie.
- **Uscita:** 0 requisiti o competenze inventati, 0 senior non pertinenti, spiegazioni chiare.

**Fase 4 — Azione**
- Dossier completi, CV consigliato, decisione sulla cover letter (deterministica o AI con limiti), candidature spontanee autonome con contatti verificati, Fashion News pertinenti, notifiche.

**Fase 5 — Beta privata**
- 20–50 utenti (scuole di moda, early career).
- Metriche: offerte non trovate da soli, salvataggi e candidature, falsi positivi, disponibilità a pagare.

**Fase 6 — Commercializzazione**
- Piani Free/Pro e pagamenti; privacy e GDPR (export e cancellazione dei dati, informativa); nome e marchio; dominio; scelta definitiva del frontend pubblico; repository privato.
- Infrastruttura proporzionata agli utenti, che probabilmente richiederà Supabase Pro.

---

## 11. Regole di lavoro e continuità

- Ogni sessione inizia leggendo `CLAUDE.md` e questo documento, poi verifica repository, CI e (se collegato) database **prima** di dichiarare uno stato.
- Ogni intervento importante aggiorna il **§12 Registro delle sessioni** e, se cambia lo stato, le sezioni 5–8.
- **Decisioni tecniche ordinarie:** Claude in autonomia (branch, test, PR).
- **Conferma esplicita dell'utente per:**
  - merge;
  - produzione (migrazioni, deploy, cron, dati);
  - costi;
  - cambiamenti importanti di prodotto o di UX approvata;
  - operazioni irreversibili.
- Spiegare all'utente in **italiano semplice**: non è una programmatrice.
- Mai usare GitHub o la CI come prova di funzionamento in produzione; dichiarare sempre cosa è verificato e cosa no.

---

## 12. Registro delle sessioni

| Data | Chi | Cosa | Stato |
|---|---|---|---|
| 8–19/11/2026 | Assistenti precedenti (ChatGPT) | Costruzione di HUNT 2.0, PR fino a #65; dettagli in `HUNT_CONTINUITY_HANDOFF.md` e `HUNT_WORLD_WEB_AUTONOMY_STATUS_2026-11-18.md` | Archivio |
| 22–23/11/2026 | Automazioni | Aggiunta un'offerta verificata (Veepee), outreach FiveFourFive; commit automatici del radar | — |
| 24/11/2026 | Claude (responsabile tecnico da questa data) | Analisi completa del progetto. **PR #66**: matching incrementale (gettone di cambiamento, digest delle descrizioni, equivalenza su 19 scenari). **PR #67**: misuratore dei consumi, budget e livelli di scansione, ripartenza graduale, protezione contro telemetria mancante o a zero, allerta automatica con un'unica issue | CI verde. **Unite in `main` il 24/11** su richiesta dell'utente (#66 poi #67). Nessuna modifica a Supabase: migrazioni e deploy restano da autorizzare |
| 24/11/2026 | Claude | Creati questo documento e `CLAUDE.md` per la continuità tra sessioni | PR #68, unita |
| 24/11/2026 | Claude | Radar pubblico: +15 portali verificati, correzione SmartRecruiters, da 661 a 1.216 offerte (PR #71). Creato l'ambiente cloud "HUNT" con accesso alle API pubbliche dei portali (Greenhouse, Lever, SmartRecruiters, Ashby, Workable, lvmh.com). Indagine su LVMH (vedi §5.1). Regola concordata: Claude prepara e testa in autonomia, l'utente risponde "ok" prima di merge e interventi in produzione | Fatto |
| 24/11/2026 | Claude (autorizzato dall'utente) | Connettori Supabase e Vercel collegati. **Migrazioni A e B applicate in produzione** (B in 3 parti). Verificato: scanner ancora fermi, 402 attivo, dati intatti (2 account, 2 CV, 11 candidature, 1.414 offerte). Controllato che il codice delle 13 funzioni in produzione coincidesse con GitHub. Aggiunto il workflow manuale di deploy delle funzioni | Fatto. Poi pubblicate tutte e 13 le funzioni (vedi §6). Verifica a runtime dopo lo sblocco |
| 24/11/2026 (sera) | Claude | Radar pubblico: nuovo lettore di **feed pubblici ufficiali RSS/Atom** in `refresh.py` (famiglia `feed_public`), con protezioni (solo HTTPS su domini dichiarati, niente date inventate, XML senza entità, sfide anti-bot riconosciute e mai aggirate, fonti disattivabili con motivazione). 19 test Python. Ambiente "HUNT": aggiunti con approvazione `careers.ralphlauren.com`, `careers.pvh.com`, `www.tapestry.com`, `www.capriholdings.com`. Analisi formati: vedi sotto | **PR #74 unita in `main` il 24/11** su "ok" dell'utente. Nessuna modifica a Supabase |
| 24/11/2026 (sera, utente in volo, lavoro autonomo) | Claude | Radar pubblico: lettore **sitemap ufficiale + pagine annuncio JSON-LD** (famiglia `sitemap_jsonld`), prima fonte **PVH**. Annunci confermati solo se la pagina contiene un `JobPosting`; quelli chiusi (404/410) vengono tolti subito; memoria in `sitemap-state.json`; tetto di pagine per giro e pausa di 1 s tra le pagine; ordine di visita: prima stage e junior. 13 nuovi test (32 in tutto). **Prova reale completa (24/11)**: 5 minuti per tutto il radar; PVH 120 pagine aperte, 51 offerte valide aggiunte, 51 annunci chiusi riconosciuti (vecchi tirocini olandesi con errore 410), 18 troppo vecchi; catalogo da 1.216 a 1.265 | **PR #75 unita in `main` il 25/11** su "ok" dell'utente. Primo giro reale su GitHub: 88 offerte PVH pubblicate, 32 scartate perché troppo vecchie; catalogo a 1.288 offerte, 28 portali su 29 (Farfetch con errore temporaneo da ricontrollare). Nessuna modifica a Supabase |

**Ricerca fonti del 24/11 (da riprendere nella prossima sessione):**
- **Provati circa 150 brand di lusso** (Kering, Richemont, LVMH, maison italiane e francesi) su Greenhouse, Lever, Ashby e SmartRecruiters: quasi nessuno li usa. Le grandi maison usano SuccessFactors, Workday, Oracle o siti propri.
- **Falsi positivi esclusi:** `fay` (Greenhouse, startup tecnologica americana), `ami` (Ashby, laboratorio di ricerca), `vuori` (agenzia), `Essilorluxottica` (SmartRecruiters, account demo). Controllare sempre nome dell'azienda e titoli delle offerte.
- **Pista migliore:** feed pubblici ufficiali (RSS) dei siti carriere, ad esempio Ralph Lauren `https://careers.ralphlauren.com/CareersCorporate/SearchJobsCorporate/intern/feed`. Serve:
  1. un nuovo tipo di lettore "feed pubblico" nel radar;
  2. l'aggiunta del dominio all'ambiente cloud "HUNT" (richiede l'approvazione dell'utente).
- **Altri siti carriere da analizzare:** careers.pvh.com, tapestry.com/careers, capriholdings.com (Michael Kors, Jimmy Choo). Usare solo formati pubblici (feed, sitemap, pagine annuncio con JSON-LD). **Mai** chiavi di ricerca estratte dal codice dei siti: il sistema di sicurezza lo blocca, e giustamente.

**Analisi formati del 24/11 sera (cosa è leggibile senza aggirare nulla):**
- **Ralph Lauren** (`careers.ralphlauren.com`, piattaforma Avature): il feed `.../intern/feed` e le pagine di ricerca rispondono con una **sfida anti-bot AWS WAF** (HTTP 202 vuoto). Non leggibile in automatico: fonte disattivata. Il robots.txt dichiara una sitemap ufficiale (`/CareersCorporate/sitemap_index.xml`), le sitemap per lingua non sono state aperte (richiesta fermata dal sistema di sicurezza dopo la sfida anti-bot). Strada corretta: chiedere un feed per partner o riprovare più avanti.
- **PVH** (Calvin Klein, Tommy Hilfiger; `careers.pvh.com`, piattaforma Phenom): **leggibile**. Il robots.txt dichiara 42 sitemap ufficiali; `us/en/sitemap1..3.xml` elencano circa 1.000–1.500 annunci con data di modifica; ogni pagina annuncio contiene JSON-LD `JobPosting` con titolo, città, Paese e `datePosted`. Attenzione: la sitemap contiene anche annunci chiusi (pagina con HTTP 410), quindi l'annuncio va confermato aprendo la pagina. Serve un nuovo lettore "sitemap + JSON-LD" con un tetto di pagine per giro: **prossimo passo consigliato**.
- **Tapestry** (Coach, Kate Spade, Stuart Weitzman): la pagina careers rimanda a **Workday** (`tapestry.wd108.myworkdayjobs.com/Tapestry_Careers`); il `/feed/` del sito è solo il feed delle notizie aziendali. Workday non è ancora supportato; prima di usarlo va verificato se offre una sitemap o un feed pubblico (dominio da aggiungere all'ambiente).
- **Capri** (Michael Kors, Jimmy Choo; `www.capriholdings.com`): la pagina careers risponde con una **sfida Cloudflare** ("Just a moment..."). Non leggibile in automatico; il robots.txt chiede anche 10 secondi tra una richiesta e l'altra.

**Prossimi passi concordati:**
1. ~~Unire #66 e #67~~ (fatto il 24/11).
2. ~~Collegare i connettori Supabase e Vercel~~ (fatto il 24/11).
3. ~~Migrazioni e deploy delle 13 funzioni~~ (fatto il 24/11).
4. Dall'8/12: verifica dello sblocco, egress delle prime 24 ore, test end-to-end.
5. Fase 2 della roadmap: World Radar. ~~Lettore "sitemap + JSON-LD" per PVH~~ (PR #75). Prossimi: altre fonti con sitemap e JSON-LD ufficiali; Workday (Tapestry) solo se offre sitemap o feed pubblici.

---

## 13. Glossario in parole semplici

- **Repository / GitHub:** l'archivio di tutto il codice, con la storia delle modifiche.
- **Branch e Pull Request (PR):** una copia di lavoro separata e la richiesta di unirla al codice principale (`main`) dopo la revisione.
- **Merge:** l'unione approvata di una PR in `main`.
- **CI (test automatici):** controlli che GitHub esegue su ogni modifica. Verde significa che i test passano, non che la modifica sia già in produzione.
- **Supabase:** il servizio che ospita database, login, file dei CV e funzioni automatiche di HUNT.
- **Edge Function:** un piccolo programma su Supabase che, per esempio, legge le offerte o calcola i match.
- **Cron:** un timer che avvia una funzione a intervalli regolari (es. ogni 5 minuti).
- **Migrazione:** una modifica alla struttura del database (nuove tabelle o funzioni), applicata in modo controllato.
- **Egress:** i dati che escono da Supabase verso l'esterno. Il piano gratuito ne permette 5 GB al mese; superarli ha causato il blocco 402.
- **RLS (Row Level Security):** regola del database per cui ogni utente vede solo i propri dati.
- **ATS:** il sistema con cui un'azienda pubblica le offerte (Lever, Greenhouse, Workday, SuccessFactors…).
- **Vercel / GitHub Pages:** servizi che pubblicano i siti web. HUNT 2.0 approvata è su GitHub Pages.
- **Connettore:** un collegamento autorizzato tra Claude e un servizio (Supabase, Vercel), approvato da te sul sito del servizio, senza condividere password o chiavi.
