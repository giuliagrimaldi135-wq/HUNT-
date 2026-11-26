# Prova end-to-end della HUNT con account

`run-e2e.mjs` apre la HUNT ufficiale (`hunt2-preview/`) in Chromium e ripete il percorso di un'iscritta:
accesso → Opportunità → dossier della prima posizione → Brand da contattare → Fashion News →
Candidature → Profilo → uscita, sia su computer sia su telefono. Si ferma su ogni messaggio di errore
visibile, errore JavaScript o scorrimento orizzontale, e salva una schermata dei passi falliti.

## Due modi

| Modo | Quando | Cosa usa |
|---|---|---|
| `--mode=fake` | sempre, anche in CI (`hunt-preview-syntax.yml`, job `account-journey`) | `fake-supabase.mjs`: un database finto in memoria con un'iscritta con CV e tre offerte. Prova anche l'iscrizione di una nuova utente (onboarding e personalizzazione senza CV). Nessuna connessione esterna. |
| `--mode=live` | dopo lo sblocco di Supabase (8/12) | il sito pubblicato e un **account di prova reale**. Fa solo letture: non salva, non si candida, non nasconde, non carica e non cancella nulla. |

```bash
node hunt2-preview/e2e/run-e2e.mjs --mode=fake
HUNT_E2E_EMAIL=... HUNT_E2E_PASSWORD=... node hunt2-preview/e2e/run-e2e.mjs --mode=live
```

Opzioni: `--base=<indirizzo di hunt2-preview/>` e `--out=<cartella per report e schermate>`.
Le credenziali si passano solo come variabili d'ambiente: non vanno mai scritte nel repository.
Serve Playwright con Chromium (`npm install playwright` e `npx playwright install chromium`).
