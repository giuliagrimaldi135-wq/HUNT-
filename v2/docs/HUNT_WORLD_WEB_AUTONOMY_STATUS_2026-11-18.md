# HUNT 2.0 — World Web e autosufficienza
Verificato il 18 novembre 2026 (~12:20 UTC). Documento di continuità operativa, non una promessa di copertura completa.

## Obiettivi invarianti
- HUNT deve monitorare il fashion/luxury su scala internazionale, non solo Milano, distinguendo *copertura misurata* e catalogo teorico.
- Ricerca e matching automatizzati; niente opportunità obsolete, senior non pertinenti, requisiti o competenze del CV inventati.
- Conservare CV, candidature e design luxury/editoriale esistente; non introdurre mock content.
- Ogni sorgente ufficiale e vacancy deve avere una provenienza tracciabile, senza aggirare blocchi o CAPTCHA.
- Non aumentare cicli o email di errore inutili: usare retry adattivi, fallback e monitoraggi privati.

## Stato live verificato
Supabase progetto Hunt 2: `dfiokxjfgqoboxckcuut`.
- `hunt-match-refresh` v20: nuova specializzazione supplier risk / fashion sourcing (PR #45).
- `hunt-global-news` v4: cooldown errori permanenti, HTTP 429 e limite per host (PR #46).
- `hunt-source-discovery` v16: massimo 2 URL per host a ciclo, distribuzione tra portali (PR #47).
- `hunt-ats-discovery` v8: scoperta di pagine careers ufficiali sul dominio brand (PR #48), validazione suffissi nazionali (PR #49), ricerca di fonti alternative quando tutte le careers ufficiali sono degradate (PR #50).
- Workflow radar legacy: scansione ogni 5 minuti conservata, ma niente commit per soli timestamp; refresh forzato ogni 12 ore (PR #51). Gli alert continuano a essere eseguiti.
- Audit World Web schedulato ogni sei ore con job `hunt-world-coverage-audit-6h`, tabella privata `hunt_world_coverage_snapshots` con RLS. Prima esecuzione manuale verificata, cron attivo.
- Geografia: funzioni `hunt_country_from_explicit_location` e `hunt_country_from_explicit_region`, trigger automatico su nuovi job. Solo Paesi esplicitamente indicati o regioni amministrative univoche; località multiple/ambigue restano NULL.
- CI GitHub verde su PR #47–#51, incluse build frontend e test del motore. Funzioni v16/v8 risultavano ACTIVE dopo il deploy.

## Metriche di riferimento
Verifica diretta Supabase il 18/11/2026:
- 275 brand monitorati; 66 brand con almeno una fonte careers ufficiale.
- 1.397 job totali, di cui 948 in stato active_verified/active_likely.
- 917 job con codice Paese riconosciuto, su 19 codici geografici; **480 job ancora senza Paese univoco**.
- 23 URL careers attivi degradati, ma soltanto **5 host distinti**.
- ~159-162 siti di brand nella coda di ricerca website candidate: non sono fonti careers già verificate.
- 288 fonti news attive, delle quali 87 risultavano degradate; cooldown implementato.
- `ats_discovery_runs`: 241 origini osservate prima di PR #48, ma nessuna board ATS nuova convalidata; il nuovo percorso careers va misurato dopo cicli di scansione, non dichiarato già risolutivo.
- I 15 job programmati esistenti non mostravano esecuzioni cron fallite nelle 24 ore verificate prima dei nuovi deploy; i log edge del giorno osservato indicavano HTTP 200 per le funzioni principali. Un HTTP 200 non prova la qualità delle fonti esterne.

## Verifiche ancora aperte, con priorità
1. **World Web reale:** misurare crescita di career_page verificate e ATS convalidati su più Paesi, e benchmark esterno (20 portali aziendali diversi, obiettivo di almeno 90% degli annunci pubblici accessibili sui portali integrati). Attenzione a Workday/Oracle/SAP e contenuti JS.
2. **Recupero degradati:** verificare che i nuovi lead website per Furla/Richemont siano creati e che i portali degradati vengano riprovati senza martellamento.
3. **Anti-rumore:** verificare sui prossimi cicli che i soli timestamp non producano nuovi commit/ridondanti deployment, mentre le nuove vacancy reali sì.
4. **Frontend Vercel:** il connettore Vercel risponde con team visibile ma nessun progetto leggibile; non è stata certificata la versione live dell'interfaccia, né il test autenticato end-to-end. Non attribuire lo stato CI a un deploy Vercel completato.
5. **Qualità candidati:** test con 20 CV diversi, 30 coppie CV-annuncio, 20 dossier, tutte le lingue; zero seniority o competenze inventate e link candidature attivi.
6. **Sicurezza:** repository GitHub risultava pubblico; l'utente aveva già chiesto protezione in passato, ma rendere privato richiede prima verifica operativa dell'integrazione Vercel. Non esporre CV, token o dati utente.

## Repository e continuità
GitHub `giuliagrimaldi135-wq/HUNT-`, main. PR di questa sessione:
- #47 https://github.com/giuliagrimaldi135-wq/HUNT-/pull/47
- #48 https://github.com/giuliagrimaldi135-wq/HUNT-/pull/48
- #49 https://github.com/giuliagrimaldi135-wq/HUNT-/pull/49
- #50 https://github.com/giuliagrimaldi135-wq/HUNT-/pull/50
- #51 https://github.com/giuliagrimaldi135-wq/HUNT-/pull/51

Regola di lavoro: verificare database + codice GitHub + CI + Edge Function attiva; non confondere merge GitHub, deploy Vercel e reale acquisizione vacancy. Il design premium e i dati personali non vanno toccati per miglioramenti backend non correlati.


## Risultati successivi osservati il 18/11 alle 12:22-12:28 UTC
- Il primo ciclo automatico `hunt-ats-discovery` v8 dopo la correzione ha creato tre nuove fonti careers ufficiali sul dominio del brand: Richemont `https://www.richemont.com/talent/career-areas/`, Cup of Joe Denim `https://cojdenim.com/pages/jobs` e Difuzed `https://www.difuzed.com/careers`. Sono fonti, NON offerte individuali già validate.
- Per Furla e Richemont sono stati creati automaticamente nuovi `brand_website_candidate` dopo errori 403/404 delle fonti originali. Il recupero Richemont ha prodotto un nuovo link careers; non è confermato un link alternativo Furla.
- Il numero di brand con fonte ufficiale è salito da 66 a 68; ci sono 164 website candidate e tre nuove pagine verificate.
- PR #52 https://github.com/giuliagrimaldi135-wq/HUNT-/pull/52: riconoscimento careers multilingue (francese, tedesco, spagnolo, portoghese, olandese, polacco, turco, giapponese, cinese, coreano). CI verde, merge e deploy live su Supabase `hunt-ats-discovery` v9 ACTIVE verificati.
- PR #51 ha superato CI e raggiunto main; GitHub ha restituito stato Vercel success per merge e commit documentale. La validazione autenticata end-to-end frontend rimane aperta.

## Sessione successiva del 18 novembre 2026 (14:21–14:56 UTC) — stato verificato
- **PR #53** (merged e Supabase live): `hunt-ats-board-scan` v11. Lever ora pagina `limit=120&skip=offset`, non chiude vacancy sulla base di una pagina parziale, legge codici Paese espliciti e marca `parser_ok=true` per un catalogo valido ma senza posti. Test CI superati. Su cicli reali Veepee 0→20 offerte con Paese, Mulberry 22→34.
- **PR #54** (merged e Supabase live): `hunt-source-discovery` v17 con lettura JSON-LD `schema.org/JobPosting` su pagine careers ufficiali, limitando i candidati e mantenendo il controllo indipendente su URL, descrizioni e data. CI verde.
- **PR #55** (merged e Supabase live): `hunt-ats-discovery` v10: ricerca alternativa anche per `reachable_no_listings`, oltre a fonti degradate. Vengono create solo sorgenti candidate non ufficiali; nessuna cancellazione o vacancy inventata. CI verde. Il ciclo delle 14:52 UTC ha creato lead per Valentino, CHANEL, LVMH, Tapestry, Moncler, OTB, PVH, Hermès e altri.
- **PR #56** (merged e Supabase live): `hunt-source-discovery` v18 salva il Paese presente in `JobPosting.jobLocation.address.addressCountry` (non indovina sedi o remote). Il primo test CI è stato corretto dopo errore di sintassi, il secondo falliva installando da npm una versione `@supabase/storage-js@2.119.1` non presente. Dopo pin `@supabase/supabase-js@2.119.0` e override `@supabase/storage-js@2.119.0`, l'intera CI è risultata verde. Non cancellare il pin senza un aggiornamento testato.
- **PR #57** (merged, CI verde): `vercel.json` root e `v2/web/vercel.json` impongono un `ignoreCommand` conservativo con lo script `scripts/hunt-vercel-ignore.sh`: i commit di soli dati Radar, documentazione o backend non richiedono build Next.js; modifiche a `v2/web` / root dependencies / configurazione continuano a richiederle. Test in repo Git temporaneo superati. **Blocco ancora aperto: Vercel Hobby restituisce stato `build-rate-limit` anche al commit di merge; il connettore Vercel disponibile mostra lo scope `andreottistefano-1365`, ma non vede il progetto HUNT. Non si può confermare in produzione l'efficacia del filtro fino a riattivazione deployment e verifica dell'account Vercel proprietario.** Non descrivere la CI GitHub come un frontend Vercel pubblicato.
- Verifica diretta alle ~14:54 UTC: 1.400 job (943 `active_verified`, 8 `active_likely`, 449 `stale_possible`), **998 con Paese verificato**, 75 brand con almeno una fonte careers ufficiale registrata e 13 pagine careers scoperte autonomamente. Non tutte le fonti registrate sono produttive. Rimangono 56 career page raggiungibili ma senza link vacancy estraibili, 23 career page degradate.
- 16 cron HUNT attivi, nessuna esecuzione fallita nelle ultime 6 ore al controllo 14:56 UTC. Lo stato `succeeded` attesta l'orchestrazione, non la copertura mondiale. Il prossimo benchmark deve misurare annunci realmente trovati rispetto ai siti ufficiali campionati.

### Blocchi reali prima di definire HUNT autosufficiente
1. Accesso al **progetto Vercel giusto** e verifica che la versione Next.js live corrisponda a quella GitHub; limite Hobby `build-rate-limit` e preferenze deployment. Il solo plugin connesso attualmente non vede il progetto.
2. Campione di portali careers globali (Workday, Oracle, LVMH/SAP, ATS principali) e controllo `recall`/precisione, non soltanto numero di fonti; evitare di superare limiti, anti-bot, privacy o condizioni dei portali.
3. Test browser autenticati end-to-end: CV per candidatura, dossier realistici, candidatura spontanea, link ufficiali, fonti news; preservare design luxury.
4. Misurare stabilità su più giorni, contenimento falsi positivi e notifiche senza rumore; non promettere “perfetto” a priori.
5. Repo GitHub ancora pubblico. Non renderlo privato senza aver verificato il collegamento Vercel e la PWA legacy. Nessun segreto o CV va salvato nel repo pubblico.

## Decisione del progetto — completare HUNT prima di intervenire ancora su Vercel
Richiesta esplicita dell'utente il 18 novembre 2026: **prima completare la qualità/autosufficienza del backend e la copertura World Web; solo dopo riprendere la configurazione Vercel**. Non toccare il frontend luxury o cambiare struttura dell'app per risolvere lacune di raccolta dati. La CI deve continuare a testare i cambi backend; i file GitHub che non riguardano il frontend non devono provocare nuove build Next.js se la regola Vercel funziona.

### Audit di prontezza misurabile: aggiornamento alle 15:05 UTC
Applicata migrazione `20261118151900_hunt_world_readiness_metrics.sql`. Mantiene il cron esistente `hunt-world-coverage-audit-6h`, RLS e storico; arricchisce la stessa tabella privata `hunt_world_coverage_snapshots` con indicatori di copertura realmente recente e produttività. Prima esecuzione manuale e privilegi verificati:
- 636 annunci `recent_verified_described_jobs`: stato attivo, pubblicati/avvistati entro 20 giorni, verificati entro 7 giorni, descrizione almeno 250 caratteri, URL https; non equivalgono a 636 annunci necessariamente adatti al singolo utente.
- 21 codici Paese tra le offerte attive, recenti e verificate; 35 brand con almeno una vacancy recente/verificata e descrizione estesa.
- 20 fonti ufficiali con almeno un candidato estratto nelle ultime 24h.
- 56 fonti careers ufficiali `reachable_no_listings`; 2 sorgenti ufficiali ATS non scansionate nelle ultime 24 ore (Moncler Group e Valentino, `source_family=successfactors`, senza `config.catalog_urls`). Non dichiararle operative solo perché registrate.
- 208 brand monitorati senza una fonte careers ufficiale; 2 lead in review da oltre 48h; **0 suggerimenti fuori freschezza**.
- Verifica indipendente su `user_job_matches`: 11 suggerimenti, zero oltre 20 giorni, zero con ultima verifica oltre 7 giorni, zero di livello manager/senior/director, zero inattivi.
- Snapshot privato e funzione `hunt_world_readiness_metrics()`: EXECUTE non concesso a `anon` o `authenticated`.

### Criteri di completamento prima di Vercel
1. **Recall/precisione sul campione:** benchmark manualmente verificato su almeno 20–30 portali ufficiali, includendo piattaforme ATS diverse e più Paesi. Misurare vacancy vere, data, fonte e annuncio applicabile; non vantare "tutto il World Web", che non è certificabile.
2. **Portali bloccanti:** almeno un percorso realmente produttivo per i grandi portali LVMH, Oracle/Workday e quelli con liste client-side, oppure limite spiegato e tracciato come fonte non supportata; non trattare un 200 con 0 annunci come copertura riuscita. Il catalogo ufficiale LVMH mostra molte migliaia di opportunità ma il parser corrente delle dieci pagine LVMH estrae 0 lead; prioritario.
3. **Qualità offerte:** nessun annuncio obsoleto o senior non pertinente fra i suggerimenti, deduplica per requisition ID, prove dal CV e contenuto ricco per i dossier. I 26 annunci attivi con descrizione <250 caratteri provengono soprattutto da Richemont (pagine che il repair non riesce a completare); non inventare descrizioni.
4. **Autonomia:** esecuzioni cron e log su più giornate senza errori persistenti/non gestiti, recupero automatico per fonti degradate, nessuna tempesta di email/commit; usare gli indicatori ogni 6h.
5. **Frontend Vercel e deployment:** fase successiva e distinta, appena il motore supera i controlli prioritari. Il blocco Vercel Hobby e il connettore non autorizzato al progetto sono ancora noti; non dichiarare pronti né deploy né app end-to-end prima di verifica.

Continuità: repository `giuliagrimaldi135-wq/HUNT-` main, Supabase `dfiokxjfgqoboxckcuut`. Non cancellare dati di candidature/CV, non creare notizie o opportunità fittizie, non riaprire il redesign.

## HUNT luxury originale: correzione multiutente e senza CV (PR #58, 18 novembre 2026)
**Source of truth per l'interfaccia approvata è `hunt2-preview/`, non il distinto frontend Next.js in `v2/web/`.**
L'utente ha verificato un problema serio: il link Next.js passato erroneamente mostrava un'interfaccia differente, accesso e onboarding non coerenti. Non sostituire la HUNT luxury approvata con la Next.js senza una migrazione espressamente approvata.

Implementato su `main` via PR #58, commit `8979b6917965179e6d49a82dafb0cbcdcdddfa21`, CI core e HUNT Preview Syntax verdi:
- Placeholder di nome e cognome **Mario / Rossi**.
- Onboarding città: separazione esplicita tra luogo di lavoro desiderato e disponibilità al trasferimento; suggerimenti ricercabili che si aprono al focus, pulsanti per aggiungere liberamente altre città, Invio, deduplica e salvataggio anche se l'utente non clicca “Aggiungi”. Nuovi `hunt2-preview/onboarding-locations.{mjs,css}`.
- CV facoltativo: senza upload, ora appare subito **il secondo questionario di personalizzazione** (non viene saltato andando direttamente al feed). Account precedenti con `user_personalization.completed` non vero riceveranno il questionario al prossimo bootstrap.
- Feed senza CV: `hunt2-preview/preview-preference-policy.mjs` blocca esplicitamente titoli Senior/Manager e requisiti di esperienza elevati, considera solo stage/entry nelle aree dichiarate, con annunci attivi, non vecchi, verificati e descrizione estesa. Se non ci sono ruoli nella città scelta, le offerte in altre città compaiono soltanto nella sezione **Da esplorare / Altre città**, senza falso punteggio di compatibilità CV e senza dossier che presuma esperienze inesistenti.
- `Brand da contattare`: l'elenco pubblico viene filtrato secondo `career_preferences.primary_role_families` dell'account. Non ripetere gli stessi brand di merchandising a chi cerca HR; se non ci sono lead pertinenti, mostrare un messaggio trasparente, non un falso elenco. Il dossier/email non dichiarano CV verificato quando manca.
- Motore backend `hunt-match-refresh` v21 **ACTIVE**: nuovo `seniority-guard.mjs`, titoli esplicitamente Senior non sono più classificati entry_level. Migrazione `20261118192300_hunt_early_career_seniority_match_cleanup.sql` ha rimosso solo una raccomandazione senior errata, non cancellando vacancy, CV, profili o candidature. Verifica SQL successiva: **0 match senior a profili early career**, cron `hunt-match-refresh-5m` riuscito.
- Test aggiunti al workflow su `hunt2-preview/**` e matching; passati nel PR: HUNT 2.0 Core Tests run 44377332662 e HUNT Preview Syntax run 44377332528.
- Su Supabase sono presenti **due account e due CV privati** in totale. Uno degli account non dispone di CV; le sue opportunità devono funzionare come esplorazione, non come compatibilità inferita. Non identificare pubblicamente account/candidature.
- Il frontend statico è pubblicato tramite GitHub Pages all'indirizzo `https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/`; il file `hunt2-preview/index.html` riferisce la release cache-busted `app.js?v=20261118-1935`. **Non verificato con browser autenticato reale** in questa sessione: aprire effettivamente Safari/mobile, provare onboarding con e senza CV, controllo Profilo, ricerca città, feed e brand per due account distinti. GitHub Pages non è raggiungibile dai tool di rete disponibili in questa sessione. Non dichiarare E2E superato finché non è testato.
- **Non cambiare il design luxury**, né toccare i file CV/applications. L'eventuale lavoro su Vercel è separato e rimane dopo l'approvazione dell'app originale.


## Incidente Supabase egress 19 novembre 2026
**Utente segnala messaggio esatto**: "Service for this project is restricted due to the following violations: exceed_egress_quota. The project owner must upgrade their plan or remove spend caps to restore service."

Verifica effettuata via connettore Supabase (19/11/2026):
- Project `Hunt 2` ref `dfiokxjfgqoboxckcuut`; organizzazione tier `free`, quindi **5 GB egress uncached per billing cycle**. Il connettore di gestione può leggere il database ma l'API pubblica risponde in alcuni casi 402 (riscontrati nei log); `ACTIVE_HEALTHY` da management API non prova che il browser possa autenticarsi.
- Log `edge_logs` ultime 24h: **291.115 richieste**; `/rest/v1/user_job_matches` **144.568** (soprattutto DELETE), `/rest/v1/jobs` **110.075** (soprattutto PATCH); 142.482 DELETE 204 e 114.210 PATCH 204 totali. Queste sono richieste, **non un conteggio preciso di byte trasferiti**. Punte critiche partono dal precedente `hunt-match-refresh-5m`, che per ogni job rianalizzava e scriveva senza modifiche e tentava DELETE per match inesistenti.
- 667 job recenti verificati contengono circa **2,98 MB di sola descrizione** per esecuzione completa; ogni cinque minuti equivale a un volume elevato per il piano gratuito.
- Incident response: pausa temporanea del solo cron incriminato, quindi PR **#60** `f3844d2b7d4bf12b67b8c59f22f20c66c609888d` (CI full green), Supabase Edge **`hunt-match-refresh` v22 ACTIVE**.
- Nuovo `match-write-policy.mjs`: PATCH job solo quando cambia il risultato di analisi (ruolo/seniority/requisiti), non per aggiornare `analyzed_at`; DELETE solo per match davvero presenti; UPSERT batch per match nuovi/modificati, con refresh giornaliero dei match invariati; zero operazioni destructive su CV, candidature, offerte storiche. Il codice ricalcola la qualità con gli stessi vincoli e limiti sui ruoli senior.
- Migrazione `v2/supabase/migrations/20261119144300_hunt_match_refresh_hourly_egress_protection.sql`: cron `hunt-match-refresh-5m` riabilitato con **`43 * * * *` UTC, 1/h**. Le 15 altre schedulazioni non sono state alterate. Il nome legacy del cron mantiene "-5m" ma la schedule effettiva è oraria.
- Post-fix: `cron.job` conferma `active=true`, `schedule='43 * * * *'`; Edge v22 ACTIVE; 2 account, 2 CV con 2 file Storage, 11 match; tutti i 667 job freschi risultano già analizzati con `eligibility-v2`, quindi le scritture sui loro requisiti dovrebbero essere evitate quando invariati.
- **Non dichiarare l'app nuovamente accessibile**: il piano Free non ripristina il servizio immediatamente solo grazie a ottimizzazioni. Ripristino secondo documentazione Supabase: rollover quota al prossimo ciclo di fatturazione dell'organizzazione, oppure upgrade a Pro a pagamento. Free non ha il toggle Spend Cap del piano Pro. Serve test vero di signup/login app dal browser DOPO lo sblocco, insieme a un nuovo audit di egress.
- **Non indurre un upgrade prima di ottimizzare**. Non avviare progetti Supabase sostitutivi né cancellare il progetto per aggirare quote: i dati personali sono su questo progetto e la quota è a livello organizzazione.
- Prossima investigazione: usare Supabase Dashboard Organization > Usage > Total Egress e ripartizione per servizio per capire quale traffico ha inciso esattamente sui 5 GB; log API gateway non espongono tutti i byte di risposta. Misurare a regime se anche gli altri crawler dovranno ridurre la frequenza pur mantenendo la ricerca di opportunità.


## Verifica qualità e watchdog HUNT (19 novembre 2026, ore 16:00 Italia)
L'utente ha segnalato che HUNT continua a mostrare annunci di 3-4 giorni e non sta offrendo il valore promesso. La data di pubblicazione di una vacancy attiva può essere vecchia di qualche giorno: il problema distinto, verificato, è che **nessuna scansione si conclude dal 18/11/2026 22:13 UTC** a causa del blocco Supabase Free `exceed_egress_quota` HTTP 402. `cron.job_run_details.status='succeeded'` registra solo l'accodamento delle richieste `net.http_post`, NON il loro successo. `net._http_response` conteneva 586 risposte 402 il 19/11; JWKS `/auth/v1/.well-known/jwks.json` restituisce 402, verificato con probe diretto.

**Audit verificato 19/11**: 1.414 job totali, 965 marcati attivi, 14 nuovi nel rolling last24h (tutti scoperti il 18 novembre), 0 nuovi il 19; 687 ricontrollati nel rolling last24h, ma 0 scansioni davvero completate dal 18/11 22:13 UTC. 294 brand monitorati; 119 con fonte carriere ufficiale attiva, 175 senza; 21 fonti ufficiali produttive nell'ultima finestra attiva; 97 fonti ufficiali raggiungibili ma con zero vacancy estratte. Tutte le 10 fonti LVMH zero risultati, nonostante il portale pubblico LVMH mostri ~5.000 annunci. 188 candidati "sito brand" non verificati. Lo stato di copertura globale resta **incompleto** e non deve essere presentato come pronto.

**PR #61 merged** commit `37eb3d926f5513219a2686d242f7edbfae8cb62e`; CI green:
- Migrazione `20261119151000_hunt_quota_watchdog_and_safe_scanning.sql` **APPLICATA**: schema interno protetto `hunt_ops`, quota watchdog ogni 30 minuti (cron `hunt-quota-watchdog-30m`). Ha sospeso immediatamente i 13 cron HTTP che erano destinati solo a ricevere 402; tre cron puramente SQL (audit qualità, audit world e pulizia match) restano attivi. L'endpoint pubblico JWKS è sondato ogni mezz'ora, senza dati utente. Dopo due risposte 2xx consecutive e nessuna risposta 402 negli ultimi 40 minuti, il watchdog riabilita le scansioni automaticamente con frequenze differenziate (ATS ufficiali ogni 5 min, source discovery ogni 20 min, news 30-60 min, matching ogni ora); un successivo 402 sospende le scansioni. **Testato il ramo di sospensione e processamento 402**, ramo di recupero non verificabile finché il servizio non restituisce 200.
- **Scanner Supabase `hunt-source-discovery` v19 ACTIVE**, rimosso richiamo nascosto a `hunt-match-refresh` a fine OGNI scansione che annullava la protezione egress oraria; aggiunto cooldown di 6h per pagine carriere correttamente raggiungibili ma senza annunci estratti (si riprovano automaticamente). Aggiunto riconoscimento esatto di URL di singoli annunci LVMH `/en/join-us/our-job-offers/<official-id>` e `/it/opportunita-di-lavoro/le-nostre-posizioni/<official-id>` senza scambiare pagine elenco per vacancy. Test CI green. **Non dichiarare che tutti i posti LVMH sono recuperati**: è da verificare dopo sblocco, dettagli con descrizioni e data ufficiale prima di promuovere vacancy.
- Nuova frequenza di scansione gratuita progettata per consumare meno; nessun piano a pagamento attivato.

**PR #62 merged** commit `94040f6a64d72479ee17f4fc0fe25e98b8122db2`; CI Preview Syntax e Core Tests green:
- Frontend luxury originale `hunt2-preview`: messaggio chiaro su errore Supabase 402 (non accusa le credenziali), `bootstrap` controlla l'errore invece di mostrare falsamente un nuovo onboarding quando il DB è bloccato. Nella pagina Opportunità mostra la data dell'ultima verifica `jobs.last_verified_at`, avviso se oltre 6 ore, e contatore delle offerte globalmente **scoperte** negli ultimi 24h, distinto dai match personali. `app.js?v=20261119-1600`. Nessun redesign.

**Post-change verification 19/11 15:01 UTC**: watchdog `suspended=true`, `last_http_status=402`, `consecutive_successes=0`, 13 cron HTTP sospesi, cron watchdog attivo; scanner Edge v19 ACTIVE; `last_real_scan=2026-11-18 22:13:11 UTC`; nel DB risultano 2 account e 2 file CV privati. **Servizio ancora NON accessibile dalla app**. L'unico sblocco immediato documentato è un upgrade autorizzato dall'owner; altrimenti attendere rinnovo quota Free e verificarlo dalla pagina Supabase Usage (senza inventare data). Il watchdog tenta il recupero automaticamente. Non promettere disponibilità mondiale o SLA 5 minuti: scanner solo per fonti realmente collegate e parsate. Non modificare Vercel né CV/candidature.

**Passi da verificare DOPO il ripristino della quota**: 1) controllare che il watchdog riceva 2×200 e riattivi cron; 2) numero netto di nuove vacancy per giorno ed effettivo tempo pubblicazione→rilevazione; 3) test login/onboarding di due utenti, con e senza CV, via browser; 4) LVMH e Moncler/Valentino ancora senza estrazione produttiva, 175 brand ancora senza fonti official; 5) dashboard Supabase Usage per verificare che egress resti nei limiti. Non confondere numero di polling o heartbeat con reale copertura globale.
