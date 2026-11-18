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
