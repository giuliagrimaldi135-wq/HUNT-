# HUNT — criteri misurabili per uscire dalla beta
Aggiornamento: 9 novembre 2026

## Definizione corretta di «pronto»
HUNT non deve promettere di coprire ogni sito del mondo. Deve documentare la quota delle vacancy pubbliche accessibili che ha realmente acquisito, distinguere le fonti ufficiali dai risultati di ricerca e mostrare solo consigli supportati dal CV dell'utente.

## Quality gates (da raggiungere prima del rilascio pubblico)
| Ambito | Test di accettazione | Stato |
|---|---|---|
| UX dossier | Aprire 20 annunci diversi senza errori, passare Italiano/English anche senza dossier salvato, conservare le modifiche alla lettera | Test codice eseguiti; test autenticato end-to-end ancora mancante |
| Lingua | 0 frasi in inglese nell'analisi italiana salvo nomi/termini propri, confronto coerente in entrambe le lingue | Fallback per sintesi IT installato; copertura test limitata |
| CV | PDF con testo, PDF immagine, JPG, DOCX, più versioni; OCR e campo provenienza; 0 competenze con livello inventato | OCR browser presente, collaudo multiutente incompleto |
| Evidenza requisiti | Titolo, anni, lingue, strumenti e seniority: niente dichiarazioni di requisito soddisfatto senza prova | Test C1/Excel/PowerPoint/Laurea attivi |
| Fit / raccomandazioni | 0 offerte manager/facilities presentate ad early-career senza i requisiti; check su almeno 50 annunci campione | Audit automatico attivo; validazione campione ancora mancante |
| Lettere | 0 esperienze/rendimenti inventati; esplicitare il bisogno del ruolo e 1–2 prove CV; revisione umana su 30 combinazioni utente–annuncio; nessuna sostituzione di testo salvato | Nuovo generatore v8, test umano ancora mancante; nessun AI live |
| Copertura | Benchmark di almeno 20 aziende per portali diversi; per ciascuna conteggio vacancy pubblico, HUNT e percentuale recuperata; obiettivo almeno 90% delle offerte accessibili sui portali integrati | 132 aziende monitorate, solo 27 con offerte nel primo audit; incompleto |
| Fashion News | Fonti e URL reali, deduplica, articoli pertinenti, segna letto, sintesi senza inventare fatti | Feed attivo, controlli qualità da ampliare |
| Affidabilità / dati | 0 link invalidi nel campione, cron schedulati attivi, errori osservabili; utenti/cv isolati con RLS | Audit orario e RLS su report installati |
| Sicurezza / costi AI | Se AI attiva: chiave solo server, consenso utente, budget e limiti richieste, errori gestiti, valutazione comparativa vs template | Non attivo; nessun costo automatico |

## Audit continuo già installato
- `public.hunt_quality_snapshots` è privata (RLS ON; accesso anon/authenticated revocato).
- `hunt-quality-audit-hourly` alle xx:28 monitora: aziende, vacancy, descrizioni incomplete, collegamenti, verifiche scadute, duplicati, CV non confermati, mismatch senior per profili junior, news sintetiche, fonti in errore, board attivi.
- Primo audit: 132 brand monitorati; 27 con vacancy; 643 vacancy attive; 19 schede con descrizione sotto 250 caratteri; 3 CV non confermati; 1 fonte non sana; 0 link applicazione mancanti, 0 URL duplicati, 0 match senior >70% con profili early-career.
- Lo snapshot rileva i difetti; NON li corregge automaticamente. I reader fonti sono programmati separatamente.

## Fix di questa iterazione
- Dossier in italiano: se mancano dati bilingui verificati, usa solo sintesi derivata dalle parole presenti nella fonte, non una copia inglese.
- La selezione lingua è indipendente dal servizio cover letter; resta italiana/inglese anche se la lettera non si rigenera.
- Rimosso elenco tecnico «Mostra il testo acquisito dalla fonte»; rimane link annuncio originale.
- Un controllo delle esigenze del ruolo viene confrontato con elementi presenti nel CV e mostra lacune.
- Lettera v8: esperienza + progetto più pertinente; fallback non genera testo privo di prove; conservazione modifiche personali.
- SmartRecruiters: scorrimento anche sulle pagine successive alla prima 100 (Max Mara ha almeno 188 posizioni pubblicate nell'endpoint controllato).
- Catalogo ampio; personalizzazione `focused`, `smart`, `explore` solo nel matching/esperienza utente.

## Decisioni aperte
1. Test su 20+ CV diversi e 30 coppie job/CV reali prima di vendita.
2. Integrazioni Workday, Oracle e altri ATS su endpoint autorizzati/non protetti; dichiarare siti non coperti.
3. Eventuale provider AI per cover letter e traduzioni: API a consumo separata da ChatGPT Plus, chiave privata solo in Supabase; non riattivare senza consenso e limiti di spesa.
4. Non misurare la qualità del prodotto soltanto con il numero di aziende e annunci.
