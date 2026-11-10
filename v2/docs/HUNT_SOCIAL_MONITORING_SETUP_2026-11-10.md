# HUNT — attivare il monitoraggio social in modo autorizzato
Verificato: 10 novembre 2026

## La distinzione essenziale
Un collegamento pubblico al profilo Instagram/LinkedIn/TikTok di un brand non equivale a poter acquisire in automatico tutti i suoi post. HUNT separa:
1. **Sito ufficiale / stampa / World Radar** — articoli pubblici con URL e data, già utilizzati per i brand.
2. **Profilo social ufficiale identificato** — collegamento consultabile dall'utente, senza affermare di avere letto gli ultimi post.
3. **Feed social acquisito e verificato** — funzionalità attivabile SOLO dopo accesso API consentito o licenza dati di terze parti e controlli di correttezza.
4. **Post/annuncio originale** — documentazione specifica verificata, non un'indicazione generica di crescita.

## Cosa deve fare chi gestisce HUNT
### Instagram / Meta
- Aprire [Meta for Developers](https://developers.facebook.com/), creare un'app di tipo appropriato, configurare i casi d'uso Instagram.
- Per le API Business/Creator, disporre dei requisiti professionali (account idoneo e, nel flusso Facebook Login, Pagina Facebook collegata), richiedere i permessi e superare eventuale App Review / Business Verification.
- Richiedere solo autorizzazioni strettamente necessarie. Le capacità di Business Discovery si applicano ai soli profili professionali supportati e soggiacciono a limiti/policy. Un semplice account personale non dà accesso a tutti i post dei brand.
- Registrare ogni profilo monitorato con `last_success_at`, fonte, ID canonico, permessi concessi e eventuale errore.

### LinkedIn
- Aprire [LinkedIn Developers](https://www.linkedin.com/developers/), creare un'app e richiedere il prodotto **Community Management API**; verificare i requisiti e la disponibilità del permesso `r_organization_social`.
- Per i contenuti che richiedono ruoli organizzativi servono i diritti del brand o una modalità approvata da LinkedIn. L'autorizzazione di un normale account non permette di monitorare liberamente tutte le aziende.
- Se HUNT deve monitorare molti competitor/brand indipendenti, valutare un **fornitore di social listening con licenza** invece di simulare accessi o superare limiti.

### TikTok
- Aprire [TikTok for Developers](https://developers.tiktok.com/). Display API + Login Kit può leggere i video dell'**account che autorizza** l'app tramite `video.list`, non tutti i brand del mercato.
- La Research API ha criteri di ricerca non commerciale e accesso per ricercatori idonei: non è un'autorizzazione per un radar commerciale di candidature.
- Per una raccolta ampia, valutare un provider con diritti espliciti per il caso d'uso; altrimenti mostrare solo fonti pubbliche verificabili.

## Implementazione sicura in HUNT
- Non inserire access token, client secret o refresh token in JavaScript del browser, in JSON pubblici, né su GitHub.
- Configurare OAuth / App Review e gestire credenziali in Supabase Edge Functions / secret server side, con refresh, revoca e quote.
- Usare `intelligence_sources` per tipo piattaforma, permessi, salute e ultimo successo; archiviare i singoli post/eventi solo se l'accesso è autorizzato e con URL della fonte.
- Deduplicare cross-platform, conservare data di pubblicazione distinta dalla data di acquisizione, collegare la company identity senza confondere marchi omonimi.
- Un evento (apertura, showroom, espansione, nomina, collaborazioni) è un **possibile motivo di contatto**, non conferma di opportunità lavorativa. Controllare sempre il career site.
- Nessuna candidatura o email viene inviata automaticamente.

## Stato al 10 novembre 2026
- HUNT è collegata ai dati di World Radar e a fonti di stampa / siti ufficiali. La sezione **Brand da contattare** mostra nel folder le news documentate e i profili social pubblicamente verificati.
- **Non è attiva la lettura automatica dei post Instagram, TikTok o LinkedIn di tutti i brand.** Serve onboarding/approvazione/licenza dei provider; il solo collegamento agli account personali non è sufficiente.
- La selezione CV usa informazioni del profilo confermate dall'utente e preferenze personali. Cambiare CV aggiorna immediatamente la bozza quando non è stata modificata manualmente; altrimenti chiede il consenso prima di sovrascrivere.
- La tabella privata `user_outreach_drafts` memorizza `cv_id` insieme alla bozza e al relativo utente, con policy RLS di proprietà e verifica che il CV appartenga all'utente.

Documentazione ufficiale:
- [Meta Instagram API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [LinkedIn Community Management](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access)
- [TikTok Display API](https://developers.tiktok.com/docs/en/display-api-get-started)
- [TikTok Research API](https://developers.tiktok.com/products/research-api/)
