# HUNT · Radar pubblico temporaneo (novembre 2026)

**Accesso:** https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/radar/

Questo percorso esiste per permettere di consultare alcune offerte pubbliche durante la restrizione `exceed_egress_quota` della HUNT originale su Supabase Free. **Non sostituisce** la HUNT 2.0 luxury originale né accede ad Auth, profili, CV, dossier o candidature. Il codice e il dataset sono pubblici, pertanto qui NON vanno inseriti dati di account, CV, note personali, email o credenziali.

## Flusso

- `jobs.json`: catalogo pubblico minimale, generato inizialmente da 644 record di offerte già verificate (19 novembre, 35 brand), senza dati personali; ogni record conserva data di pubblicazione *solo se nota*, prima rilevazione, ultima verifica, link ufficiale, titolo, ruolo, livello, città e brand.
- `refresh.py` + `boards.json`: interroga **solo** 13 board ATS pubblici ufficiali (Greenhouse, Lever, Ashby, SmartRecruiters, Workable) direttamente da GitHub Actions. Non usa Supabase, token, browser di utenti o servizi a pagamento. Riconferma solo vacancy effettivamente elencate dalle API ufficiali e indica la frequenza/ultima verifica. I job con data reale >20 giorni o verifica >7 giorni scompaiono dalla pagina; se data ufficiale manca, la UI dice «Rilevata», non «Pubblicata».
- `.github/workflows/hunt-public-radar.yml`: GitHub Actions ogni 6 ore (*best effort*, non SLA), pulsante manuale e trigger su modifiche allo scanner. Compie test, valida JSON, scrive solo `jobs.json` nel repository pubblico. Se tutte le fonti falliscono, non aggiorna il catalogo né falsifica una data recente.
- `radar-policy.mjs` e `radar.js`: filtri locali per ruolo/città/livello, link HTTPS alle offerte, etichette oneste e filtro severo sui titoli senior quando si sceglie «Stage e junior». **Non** genera compatibilità CV o dossier.

## Prima esecuzione verificata

**19 novembre 2026 ore 15:44 UTC**: workflow automatico ha prodotto `jobs.json` con **808 offerte pubbliche**, **13/13 board ATS controllate con risposta valida**, di cui **205 record riverificati nel ciclo**; 35 brand complessivi nel catalogo, 43 posti classificati stage/junior nell'area di Milano. I record iniziali da altri portali restano solo fino alla scadenza della loro ultima verifica (massimo 7 giorni) se il loro ATS non è ancora collegato. La frequenza delle nuove *scoperte* non coincide con la data di *pubblicazione*.

## Limitazioni da non nascondere

La modalità è READ-ONLY e non dispone della completa ricerca mondiale: soltanto 13 board aggiornate indipendentemente, oltre allo snapshot che scade. Non garantisce che tutte le posizioni siano aperte fino al momento in cui l'utente clicca; i portali ufficiali restano la fonte finale. La UI originale, il matching sul CV, notizie, dossier, contatti personalizzati, salvataggio candidature e login rimangono legati a Supabase e al ripristino del servizio. Non configurare mai un'altra istanza Supabase per eludere la quota o duplicare dati privati.

**Ripristino full HUNT:** watchdog database `hunt_ops.quota_watchdog` controlla 402 e riparte con due verifiche 2xx e scansioni meno costose. Le statistiche Supabase Usage del nuovo ciclo (8 dicembre 2026) vanno misurate separatamente per verificare gli obiettivi di consumo, e il catalogo globale rimane incompleto.

## QA

Eseguire `node --test hunt2-preview/radar/radar-policy.test.mjs` e `python -m unittest discover -s hunt2-preview/radar -p 'test_refresh.py'`. Entrambi sono inclusi nella CI principale e nella workflow di aggiornamento pubblico.
