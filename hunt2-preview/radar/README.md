# HUNT · Radar pubblico temporaneo (novembre 2026)

**Accesso:** https://giuliagrimaldi135-wq.github.io/HUNT-/hunt2-preview/radar/

Questo percorso esiste per permettere di consultare alcune offerte pubbliche durante la restrizione `exceed_egress_quota` della HUNT originale su Supabase Free. **Non sostituisce** la HUNT 2.0 luxury originale né accede ad Auth, profili, CV, dossier o candidature. Il codice e il dataset sono pubblici, pertanto qui NON vanno inseriti dati di account, CV, note personali, email o credenziali.

## Flusso

- `jobs.json`: catalogo pubblico minimale, generato inizialmente da 644 record di offerte già verificate (19 novembre, 35 brand), senza dati personali; ogni record conserva data di pubblicazione *solo se nota*, prima rilevazione, ultima verifica, link ufficiale, titolo, ruolo, livello, città e brand.
- `refresh.py` + `boards.json`: interroga **solo** 13 board ATS pubblici ufficiali (Greenhouse, Lever, Ashby, SmartRecruiters, Workable) direttamente da GitHub Actions. Non usa Supabase, token, browser di utenti o servizi a pagamento. Riconferma solo vacancy effettivamente elencate dalle API ufficiali e indica la frequenza/ultima verifica. I job con data reale >20 giorni o verifica >7 giorni scompaiono dalla pagina; se data ufficiale manca, la UI dice «Rilevata», non «Pubblicata».
- `.github/workflows/hunt-public-radar.yml`: GitHub Actions ogni 6 ore (*best effort*, non SLA), pulsante manuale e trigger su modifiche allo scanner. Compie test, valida JSON, scrive solo `jobs.json` nel repository pubblico. Se tutte le fonti falliscono, non aggiorna il catalogo né falsifica una data recente.
- `radar-policy.mjs` e `radar.js`: filtri locali per ruolo/città/livello, link HTTPS alle offerte, etichette oneste e filtro severo sui titoli senior quando si sceglie «Stage e junior». **Non** genera compatibilità CV o dossier.

## Feed pubblici ufficiali (dal 24/11/2026)

Oltre agli ATS, `refresh.py` sa leggere **feed pubblici ufficiali RSS 2.0 / Atom** dei siti carriere (famiglia `feed_public` in `boards.json`, con `feed_url` e `link_hosts`). Regole:
- il feed deve essere HTTPS e su un dominio ufficiale dichiarato; vengono tenuti solo i link agli annunci su quei domini;
- data di pubblicazione solo da `pubDate` (RSS) o `published` (Atom); `updated` non è una data di pubblicazione;
- documenti con DTD/entità rifiutati (protezione XML);
- se il sito risponde con una **sfida anti-bot** (AWS WAF, Cloudflare, HTTP 202 vuoto) la fonte viene segnata come bloccata e **non** viene aggirata né ritentata;
- una fonte con `"enabled": false` non viene mai interrogata e deve avere `disabled_reason`.

Ralph Lauren è configurato ma **disattivato**: il 24/11 il feed rispondeva con una sfida AWS WAF.

## Sitemap ufficiali + pagine annuncio JSON-LD (dal 24/11/2026)

Famiglia `sitemap_jsonld` in `boards.json` (prima fonte: **PVH**, cioè Calvin Klein e Tommy Hilfiger, `careers.pvh.com`). Funzionamento:
- legge solo le sitemap dichiarate nel `robots.txt` ufficiale del sito, sui domini dichiarati in `link_hosts`;
- apre le pagine annuncio e tiene un'offerta **solo** se la pagina contiene un `JobPosting` schema.org (titolo, città/regione, Paese, data `datePosted`, marchio da `hiringOrganization`);
- al massimo `max_pages_per_run` pagine per giro (120 per PVH), con 1 secondo di pausa tra una pagina e l'altra; dopo 5 errori di fila si ferma e riprova al giro successivo; una sfida anti-bot ferma la fonte;
- `sitemap-state.json` ricorda cosa è già stato controllato (solo indirizzi pubblici, stato e ora): una pagina valida viene ricontrollata dopo 2 giorni, una pubblicata da più di 20 giorni dopo 7, una chiusa (404/410) viene tolta subito dal radar e dimenticata dopo 30 giorni;
- al primo giro le pagine si aprono in quest'ordine: stage/junior, poi ruoli d'ufficio, poi negozio. Nessun ruolo viene escluso;
- data sconosciuta resta sconosciuta; `validThrough` scaduto = offerta scartata.
- opzione `skip_stale_lastmod` (per fonte): non apre le pagine la cui `lastmod` in sitemap ha più di 20 giorni (usata per Richemont, dove `lastmod` coincide con `datePosted`);
- tetto del catalogo: 4.000 offerte;
- opzioni `listing_format: "rss"` + `location_regex` + `max_listing_bytes` (massimo 45 MB): un elenco RSS ufficiale usato solo per sapere quali pagine annuncio aprire, filtrato per luogo (usato per EssilorLuxottica: solo Italia);
- dal 25/11/2026 legge anche i **microdata schema.org** (`itemprop`), il formato usato dai siti carriere SAP SuccessFactors: Prada Group, OTB, Dolce&Gabbana, Valentino. Trussardi (Teamtailor) usa JSON-LD. Quando l'azienda dichiarata è il gruppo (es. "Prada Group"), il marchio si ricava solo da titolo e indirizzo dell'annuncio.

## Prima esecuzione verificata

**19 novembre 2026 ore 15:44 UTC**: workflow automatico ha prodotto `jobs.json` con **808 offerte pubbliche**, **13/13 board ATS controllate con risposta valida**, di cui **205 record riverificati nel ciclo**; 35 brand complessivi nel catalogo, 43 posti classificati stage/junior nell'area di Milano. I record iniziali da altri portali restano solo fino alla scadenza della loro ultima verifica (massimo 7 giorni) se il loro ATS non è ancora collegato. La frequenza delle nuove *scoperte* non coincide con la data di *pubblicazione*.

## Limitazioni da non nascondere

La modalità è READ-ONLY e non dispone della completa ricerca mondiale: soltanto 13 board aggiornate indipendentemente, oltre allo snapshot che scade. Non garantisce che tutte le posizioni siano aperte fino al momento in cui l'utente clicca; i portali ufficiali restano la fonte finale. La UI originale, il matching sul CV, notizie, dossier, contatti personalizzati, salvataggio candidature e login rimangono legati a Supabase e al ripristino del servizio. Non configurare mai un'altra istanza Supabase per eludere la quota o duplicare dati privati.

**Ripristino full HUNT:** watchdog database `hunt_ops.quota_watchdog` controlla 402 e riparte con due verifiche 2xx e scansioni meno costose. Le statistiche Supabase Usage del nuovo ciclo (8 dicembre 2026) vanno misurate separatamente per verificare gli obiettivi di consumo, e il catalogo globale rimane incompleto.

## QA

Eseguire `node --test hunt2-preview/radar/radar-policy.test.mjs` e `python -m unittest discover -s hunt2-preview/radar -p 'test_*.py'`. Entrambi sono inclusi nella CI principale e nella workflow di aggiornamento pubblico.
