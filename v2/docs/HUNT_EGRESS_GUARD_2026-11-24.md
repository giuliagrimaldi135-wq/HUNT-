# HUNT 2.0 — Matching incrementale e protezione preventiva dei consumi Supabase
Preparato il 24 novembre 2026. Stato: **codice e test pronti, NIENTE applicato in produzione.**
Supabase resta bloccato (`exceed_egress_quota`, piano Free) fino al rinnovo quota dell'8 dicembre 2026; nessuno scanner è stato riavviato.

## Perché
Nel ciclo 8 nov–8 dic sono stati usati 20,02 GB di Uncached Egress su 5 GB, quasi tutto PostgREST generato dalle funzioni automatiche. Le correzioni del 19/11 (PR #60, #61, #64) hanno tolto le scritture inutili, ma restavano due problemi:
1. `hunt-match-refresh` scaricava ogni ora descrizione e metadata di tutte le offerte fresche (~670), anche quando nulla era cambiato.
2. Il watchdog interveniva solo **dopo** un HTTP 402, cioè a quota già esaurita, e alla ripartenza riaccendeva tutti i 13 scanner alla massima frequenza.

## PR A — Matching incrementale (`hunt-match-refresh`)
- **Controllo preliminare:** `hunt_match_change_token()` calcola in Postgres un md5 di *tutti* gli input del matcher: offerte attive (con md5 della descrizione, campi valutati, fascia di età in giorni), preferenze, seniority, personalizzazione, CV attivi con profilo estratto e suggerimenti salvati. Se coincide con quello dell'ultima esecuzione e la rivalutazione completa giornaliera non è dovuta, l'esecuzione termina dopo aver letto poche decine di byte.
- **Lettura leggera:** altrimenti si leggono colonne leggere più l'md5 della descrizione (`hunt_job_description_digests`). Descrizioni complete solo per offerte nuove, modificate, tornate attive, in gruppi di duplicati o con suggerimenti divergenti dall'ultima valutazione.
- **Rivalutazione completa (come prima)** quando cambiano CV, profilo estratto, preferenze, personalizzazione o seniority di un utente, quando cambia la versione del motore, se manca lo stato o se sono passate 24 ore.
- **Priorità sempre aggiornata:** la parte che dipende dal tempo (età dell'annuncio, confidenza) viene ricalcolata a ogni esecuzione per tutti i suggerimenti, senza leggere descrizioni.
- **Senza la migrazione**, la funzione si comporta esattamente come prima (sempre FULL).
- **Verifica di equivalenza:**
  - in CI, scenario di 19 passi: i suggerimenti finali sono identici a una valutazione completa forzata a ogni passo (CV, preferenze, descrizioni, titoli, offerte nuove o scadute o tornate attive, tempo che passa, duplicati, righe cancellate dall'esterno);
  - in locale, lo stesso scenario dà risultati identici anche al matcher attualmente su `main`;
  - i bug introdotti apposta (mutation test) vengono rilevati.
- **Risparmio non ancora dimostrato.** I byte riportati dalla funzione (`readBytesEstimate`) sono una stima interna. Il risparmio reale va misurato su Supabase dopo lo sblocco.

## PR B — Protezione preventiva e riavvio graduale
### Misura interna (STIMA)
Le 13 funzioni schedulate includono `usage-meter.mjs`, una copia identica di `v2/supabase/shared/usage-meter.mjs` verificata in CI.
- Conta i byte delle risposte ricevute dall'API di questo progetto durante ogni esecuzione. I byte sono contati dopo la decompressione, quindi la cifra è un limite superiore per quelle chiamate.
- Non conta i siti esterni né il traffico del browser.
- A fine esecuzione registra il totale in `hunt_ops.function_usage_hourly`, tramite `hunt_record_function_usage()`, eseguibile solo da `service_role`.
- Un errore del misuratore non modifica mai la risposta della funzione.

### Traffico reale (OSSERVATO)
Supabase non espone l'Uncached Egress via SQL. Il dato reale si copia dalla pagina Dashboard > Organization > Usage:
```sql
select hunt_ops.record_observed_egress('2026-12-09', 84.2, 'Dashboard Usage, Uncached Egress, barra del 9 dicembre');  -- MB
```
Quando presente, il rapporto osservato/stimato corregge **solo verso l'alto** le stime (fattore di calibrazione tra 1 e 20). `hunt_ops.egress_status()` mostra separatamente `estimate` e `observed`.

### Budget e livelli di scansione
| Livello | ATS ufficiali | Matching | SuccessFactors | Source discovery | News |
|---|---|---|---|---|---|
| `fast` (obiettivo) | ogni 5 min | ogni 10 min | 4/h | 3/h | 2/h |
| `balanced` (temporaneo) | ogni 10 min | ogni 20 min | 2/h | 2/h | 1/h |
| `economy` (temporaneo) | ogni 15 min | ogni ora | 1/h | 1/h | ogni 3h |
| `minimal` | ogni ora | ogni 3h | ogni 4h | ogni 4h | ogni 12h |
| `paused` | spento | spento | spento | spento | spento |

Ogni 30 minuti il watchdog (dopo i controlli 402) chiede al guard il livello:
- **Budget:** 100 MB al giorno, ridotto automaticamente se il ciclo di 5 GB è in anticipo sul ritmo. In più 10 MB al giorno di riserva per il traffico non misurato.
- **Scelta del livello:** il più veloce la cui proiezione giornaliera (esecuzioni al giorno × costo medio misurato nelle ultime 48h × calibrazione) sta entro il 70% del budget.
- **Pausa** solo per consumi già registrati: 95% del budget giornaliero raggiunto (riparte il giorno UTC successivo, al massimo in `economy`) oppure ritmo del ciclo esaurito.
- **Discesa** immediata; **salita** di un livello alla volta, dopo almeno 2 ore.
- **Ripartenza dopo un 402:**
  - le regole di sblocco restano le stesse (2 probe 2xx e nessun 402 negli ultimi 40 minuti);
  - si riparte in `economy`, non più alla massima velocità;
  - massimo `economy` per 24h, massimo `balanced` fino a 48h, poi `fast` se i consumi misurati lo consentono;
  - un nuovo 402 sospende tutto come prima.
- **Job non elencati** in `hunt_ops.scan_levels` non vengono mai attivati.

### Protezione contro telemetria mancante, a zero o anomala
Una misura assente o pari a zero **non significa consumo zero**. Il costo misurato di una funzione (`hunt_ops.function_telemetry`) è considerato affidabile solo se, nelle ultime 48 ore:
- ci sono almeno 6 esecuzioni registrate;
- al massimo il 10% di esse riporta 0 byte o 0 richieste. Ogni funzione legge almeno il proprio segreto dall'API, quindi uno zero indica un misuratore guasto;
- la media delle esecuzioni non vuote è almeno 1 KB;
- l'ultima registrazione ha meno di 3 ore;
- le esecuzioni registrate sono almeno l'80% di quelle avviate da `pg_cron` (`cron.job_run_details`). Timeout, crash o registro non raggiungibile risultano così come esecuzioni mancanti.

Conseguenze:
- **Funzione non affidabile:** si usa il costo prudente di 250 KB per esecuzione, oppure la media misurata se più alta, e il livello massimo è `economy`.
- **Misuratore silenzioso** per oltre 3 ore con scanner attivi: livello `minimal`.
- **Consumo del giorno:** si usa il valore più alto tra il consumo misurato e "esecuzioni avviate da `pg_cron` oggi × costo per esecuzione", che non dipende dal misuratore.

Verificato con test dedicati. Senza queste protezioni, un misuratore che registra solo zeri portava il guard a `fast`.

### Autosufficienza: cosa è automatico e cosa no
**Automatico, senza interventi:**
- Scelta del livello ogni 30 minuti, discesa immediata, pausa al limite giornaliero e ripresa il giorno dopo.
- Sospensione su 402 e ripartenza graduale.
- Rilevazione di telemetria guasta e confronto con le esecuzioni avviate da `pg_cron`.
- Allerta: il watchdog salva a ogni giro uno stato (`hunt_ops.compute_alert`). Il workflow `.github/workflows/hunt-supabase-guard.yml` lo legge 4 volte al giorno tramite `public.hunt_egress_alert()`, che restituisce solo codici e livello, senza dati personali, in poche centinaia di byte. Il workflow apre **una sola issue GitHub** (con email automatica di GitHub) quando c'è un problema, la aggiorna se cambiano i codici e la chiude da sola. Finché Supabase resta bloccato, dopo il merge il workflow aprirà subito un'issue `supabase_restricted_402`, che riflette lo stato reale. Codici: `supabase_restricted_402`, `quota_402_suspended`, `budget_pause`, `meter_silent`, `telemetry_untrusted` (oltre 24 ore), `cycle_usage_high` (70% del ciclo), `watchdog_not_running`.

**Non misurabile automaticamente con certezza:**
- **Uncached Egress reale fatturato da Supabase.** Non è leggibile da SQL né dalle Edge Functions. Secondo le fonti consultate, la Management API espone conteggi di richieste ma non i byte di egress; da ricontrollare nella specifica OpenAPI ufficiale prima di escluderlo del tutto. Inserirlo con `hunt_ops.record_observed_egress()` migliora la calibrazione, ma è facoltativo: senza, il guard usa stime prudenti e lo segnala solo come informazione (`no_recent_observed_egress`).
- **Traffico dell'app nel browser** (PostgREST, Auth, Storage): coperto solo dalla riserva fissa di 10 MB al giorno. Con 2 account è basso, ma non è misurato.
- **Compressione:** i byte misurati sono quelli decompressi, quindi la stima è prudente, ma non coincide con il fatturato.

**Conseguenza onesta:** la protezione riduce molto il rischio di un nuovo blocco 402, perché usa stime prudenti, conferma le misure con un secondo sistema e si ferma prima del limite. **Non può dimostrare una protezione assoluta**, perché una parte del traffico fatturato non è osservabile. Il watchdog 402 resta l'ultima difesa, e l'issue automatica avvisa senza controlli quotidiani.

## Modifiche esatte al database di produzione (da approvare prima di applicarle)
**Migrazione A** — `20261124120000_hunt_incremental_matching_state.sql`. Solo aggiunte, nessun dato modificato.
- Crea `public.hunt_job_description_digests(uuid[])` e `public.hunt_match_change_token()`: sola lettura.
- Crea `public.hunt_match_refresh_state_get()` e `public.hunt_match_refresh_state_put(jsonb)`.
- Crea la tabella `hunt_ops.match_refresh_state`: una riga con hash, id offerte, id utenti e coppie suggerite. Nessun testo di CV o descrizioni.
- Permessi: tutte eseguibili solo da `service_role`; `anon` e `authenticated` esclusi.

**Migrazione B** — `20261124130000_hunt_egress_budget_guard.sql`.
- Crea tabelle private `hunt_ops.*`: `function_usage_hourly`, `observed_egress`, `budget_config`, `scan_levels`, `scan_level_rank`, `scan_control`, `egress_decisions`.
- Crea funzioni `hunt_ops.*` per calcolo cron, calibrazione, proiezioni, stato, decisione e applicazione del livello.
- Crea `public.hunt_record_function_usage()`, solo `service_role`.
- **Sostituisce** `hunt_ops.quota_watchdog()`: stessa logica 402, nuova ripartenza graduale e guard.
- Crea `public.hunt_egress_alert()`, **leggibile con la chiave pubblica**: espone solo codici di allerta, livello e ora dell'ultimo controllo, nessun dato utente. Serve al workflow GitHub di monitoraggio.
- Funzioni di telemetria `hunt_ops.function_telemetry()` e `hunt_ops.compute_alert()`; colonne `empty_runs`, `alert` e `alert_at` e nuove soglie in `budget_config`.
- **Nessun cron viene attivato, disattivato o rischedulato dalla migrazione** (verificato in CI). Con il blocco attuale nulla riparte.

**Deploy Edge Functions**
- `hunt-match-refresh` (A e B).
- Le altre 12 funzioni schedulate (B): solo il misuratore aggiunto, nessuna altra modifica di logica.

Nessun servizio a pagamento, nessuna cancellazione di CV, candidature, profili o offerte.

## Verifiche dopo lo sblocco (8 dicembre)
```sql
select suspended, last_http_status, consecutive_successes, resumed_at from hunt_ops.quota_control;
select current_level, level_since, ramp_started_at from hunt_ops.scan_control;
select hunt_ops.egress_status();                       -- stima vs osservato, proiezioni per livello
select function_name, sum(bytes) bytes, sum(runs) runs from hunt_ops.function_usage_hourly
 where bucket > now() - interval '24 hours' group by 1 order by 2 desc;
select * from hunt_ops.egress_decisions order by id desc limit 20;
```
Nelle prime 24 ore:
- confrontare la stima con Dashboard > Usage (PostgREST Egress) e registrare il dato reale con `record_observed_egress`;
- controllare nella risposta di `hunt-match-refresh` (in `net._http_response`) i campi `mode` (`skipped` / `incremental` / `full`), `jobsEvaluated`, `descriptionsRead`, `readBytesEstimate`.

## Rollback
- **A:** basta ridistribuire la versione precedente di `hunt-match-refresh`. Le funzioni SQL aggiunte possono restare, non sono usate da altro.
- **B:** ridistribuire le funzioni senza misuratore, poi rieseguire **solo** il blocco `CREATE OR REPLACE FUNCTION hunt_ops.quota_watchdog()` di `20261119151000_hunt_quota_watchdog_and_safe_scanning.sql`. Il blocco `DO $stop$` di quel file spegne gli scanner, quindi va rieseguito solo se lo si vuole davvero.

## Test
- `node --test` su tutte le suite esistenti più `incremental-plan.test.mjs`.
- `deno check` delle 13 funzioni: nessun errore nuovo. Resta l'errore di tipo già presente in `hunt-ats-discovery`.
- Deno: `equivalence/equivalence.test.ts`, che confronta incrementale e completo, e `shared/usage-meter.test.ts`, eseguito con il vero client supabase-js.
- SQL: `v2/supabase/tests/run_sql_tests.sh` su PostgreSQL 16 con `pg_cron`/`pg_net` simulati. Applica il watchdog di produzione del 19/11 e poi le nuove migrazioni due volte, e verifica:
  - nessun cron modificato dalla migrazione;
  - pausa mantenuta con 402;
  - ripartenza in `economy` e rampa 24/48h;
  - `fast` raggiunto solo con consumi misurati bassi e discesa immediata su consumi alti;
  - pausa giornaliera e ripartenza il giorno dopo;
  - calibrazione con il dato osservato;
  - nuovo 402 che sospende tutto;
  - permessi.
