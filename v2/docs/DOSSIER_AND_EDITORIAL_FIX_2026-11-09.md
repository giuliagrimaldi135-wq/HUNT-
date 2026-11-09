# HUNT 2 — dossier e qualità editoriale, correzioni del 9 novembre 2026

## Perché le schede non si aprivano
Il parser italiano `italianEvidenceFromJob` ritornava `{tasks,requirements}`, mentre il dossier leggeva sempre `factLists.it.duties.length`. Negli annunci senza sezioni bilingui ufficiali il rendering lanciava un TypeError e si entrava nella schermata `Non siamo riusciti ad aprire questa posizione`.

## Fix dell'interfaccia
- `hunt2-preview/app.js`: introdotta `normalizeVacancyFacts`, che accetta sia `tasks` sia `duties`, filtra elementi mancanti o non testuali e normalizza sempre `{duties:[],requirements:[]}`.
- Anche la navigazione `Torna alle opportunità` ora elimina il frammento `#job` e ricarica in modo deterministico il feed; non dipende dalla cronologia esterna.
- Cache-busting dell'anteprima aggiornato a `20261109-54`.
- `hunt2-preview/tests/dossier-regression.test.mjs` prova le sezioni italiane, quelle ufficiali e quelle assenti.

## Qualità delle cover letter: motore editoriale v9
- Nuovo modulo puro `v2/supabase/functions/hunt-application-dossier/letter-editorial.js`, con test `hunt2-preview/tests/letter-editorial.test.mjs`.
- Backend `hunt-application-dossier` versione Supabase 16, con import del generatore v9.
- Le bozze sono consentite soltanto per CV con profilo confermato dall'utente o confermato da cronologia autorizzata; il sistema non tratta un PDF appena caricato come prova definitiva.
- Nessun testo generico se non sono state acquisite mansioni concrete o se mancano attività CV direttamente pertinenti.
- Selezione della più pertinente esperienza e del più pertinente progetto: una vacancy wholesale deve valorizzare ordini/showroom; una vacancy merchandising deve valorizzare assortimento/prodotto, se presenti.
- La bozza usa solo prove presenti nel CV, senza dichiarare competenze, risultati quantitativi, livello linguistico, responsabilità e successi del brand non documentati.
- L'utente può modificare e salvare la lettera; la rigenerazione non deve cancellare bozze modificate senza consenso.
- `generated_from.letter_evidence` conserva in archivio privato la provenienza delle prove usate.
- Il `model_version` del dossier è `evidence_dossier_v9`, per rigenerare i vecchi dossier non modificati.

## Verifica automatica
Workflow `HUNT Preview Syntax`: syntax check e test Node per dossier, intelligence e motore editoriale (passato sull'ultimo commit verificato).

## Cosa NON è ancora verificato
- Test end-to-end dentro un account autenticato su desktop e mobile e sulle varie fonti reali.
- Revisione editoriale umana su almeno 30 combinazioni CV/offerta diverse, incluse IT/EN, mansioni parziali e CV complessi.
- Uniformità della lingua e naturalezza, nonché controllo di claim impliciti, su tutte le combinazioni reali.
- Nessun provider LLM a pagamento è stato abilitato: il motore v9 è deterministico e non va descritto come un servizio di riscrittura AI avanzata.

## Regola di rilascio
Non dichiarare HUNT pronto alla vendita solamente perché i test automatici sono verdi. Prima di commercializzare servono test reali, QA editoriale, sicurezza/privacy e collaudo delle notifiche.

## Chiusura tecnica dell'iterazione
- 20 test automatici Node completati con successo, incluse regressioni su planning, budget non documentati, presa ordini vs inserimento ordini e analisi clienti vs contatto diretto.
- La funzione Supabase `hunt-application-dossier` è stata distribuita in versione 16; il motore editoriale resta `evidence_editorial_v9`.
- Il deploy dell'anteprima GitHub Pages deve essere verificato separatamente: CI verde non certifica la versione nel browser.
