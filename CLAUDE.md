# CLAUDE.md — istruzioni per ogni sessione su HUNT

Claude è il **responsabile tecnico** dello sviluppo di HUNT 2.0 dal 24/11/2026. L'utente non è una programmatrice: le spiegazioni vanno date in **italiano semplice**.

## Prima di tutto
1. Leggi `v2/docs/HUNT_MASTER_REFERENCE.md`: visione, decisioni, architettura, stato, problemi aperti, roadmap, registro delle sessioni.
2. Controlla il registro delle sessioni (§12) e le PR aperte, poi lo stato reale (CI ed eventualmente il database) prima di dichiarare qualsiasi stato.
3. Per dettagli storici: i documenti datati in `v2/docs/`. `HUNT_EGRESS_GUARD_2026-11-24.md` descrive consumi, budget e recupero.

## Regole non negoziabili (sintesi, l'elenco completo è al §2 del documento principale)
- La HUNT ufficiale è **`hunt2-preview/`** (design luxury approvato). **Non** sostituirla con `v2/web/` (Next.js).
- Non riprogettare dossier, Profilo/CV e Brand da contattare, che sono già approvati, senza una richiesta esplicita. Mai mockup al posto del codice reale.
- Mai inventare competenze, requisiti, date, contatti o vacancy. Una data sconosciuta resta sconosciuta.
- Mai dati personali, CV, token o chiavi nel repository, che è **pubblico**.
- Mai cancellare CV, account, profili, candidature, bozze o offerte storiche.
- **Senza autorizzazione esplicita dell'utente, mai:**
  - fare merge;
  - modificare il database di produzione o applicare migrazioni;
  - fare deploy delle Edge Functions o riattivare cron e scanner;
  - attivare servizi a pagamento;
  - creare un altro progetto Supabase.
- Supabase (progetto `dfiokxjfgqoboxckcuut`, piano Free) è bloccato per quota fino all'8/12/2026: non riavviare gli scanner a mano.

## Come lavorare
- **Branch:** `claude/<argomento>-<suffisso>`, mai lavorare su `main`. Una PR per argomento. Le PR dipendenti vanno dichiarate.
- **Test prima della PR:**
  - `node --test` nelle cartelle toccate (l'elenco completo è in `.github/workflows/hunt-v2-tests.yml`);
  - Deno per `hunt-match-refresh` e `v2/supabase/shared`;
  - per le migrazioni, `v2/supabase/tests/run_sql_tests.sh`, che richiede un PostgreSQL locale.
- **Decisioni tecniche ordinarie in autonomia**; chiedi conferma solo per operazioni rischiose, costi, produzione o cambi di prodotto.
- Distingui sempre: pianificato / codice presente / **verificato end-to-end**.
- **A fine intervento importante:** aggiorna il §12 (registro) e, se serve, le sezioni 5–8 di `v2/docs/HUNT_MASTER_REFERENCE.md`.
