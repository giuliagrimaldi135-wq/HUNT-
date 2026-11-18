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
