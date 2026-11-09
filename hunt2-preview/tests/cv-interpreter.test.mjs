import {test} from "node:test";
import assert from "node:assert/strict";
import {interpretCvText} from "../cv-interpreter.js";

const italianCV=[
"Profilo Professionale",
"Diplomata in Fashion Management presso Istituto Marangoni Milano",
"Esperienza Lavorativa",
"Marina Rinaldi Max Mara Fashion Group Milano",
"Stagista Showroom Campagna Vendite 11/2025 - 02/2026",
"+ Ordini registrati e gestiti durante la campagna vendite, attraverso l'inserimento delle richieste.",
"+ Campionario organizzato attraverso il riordino dei capi.",
"Formazione",
"Istituto Marangoni Milano",
"Diploma Triennale in Fashion Management 01/2023 - 06/2026",
"* Progetti accademici:",
"+ Valentino - Brand strategy: Analisi di mercato, competitor e posizionamento.",
"« The Attico - Digital experience: Sviluppo di un concept digitale.",
"Competenze",
"Software: Excel (avanzato) - PowerPoint (avanzato) - Word (avanzato) - Adobe Photoshop (intermedio) - Canva",
"Lingue",
"Inglese Avanzato Italiano Madrelingua"
].join("\n");

test("Italian OCR creates per-CV structured drafts with source-language evidence",()=>{
 const draft=interpretCvText(italianCV);
 assert.equal(draft.source_language,"it");
 assert.ok(draft.tools.includes("Excel (avanzato)"));
 assert.ok(draft.tools.includes("PowerPoint (avanzato)"));
 assert.ok(draft.tools.includes("Word (avanzato)"));
 assert.ok(draft.tools.includes("Adobe Photoshop (intermedio)"));
 assert.ok(draft.tool_evidence.every(x=>x.source_quote.startsWith("Software:")));
 assert.equal(draft.experience[0].company,"Marina Rinaldi Max Mara Fashion Group Milano");
 assert.match(draft.experience[0].evidence[0],/Ordini registrati/);
 assert.equal(draft.education[0].program,"Diploma Triennale in Fashion Management");
 assert.equal(draft.projects.length,2);
 assert.ok(draft.projects[0].name.includes("Valentino"));
 assert.ok(draft.languages.some(x=>/Inglese.*Avanzato/.test(x)));
 assert.ok(!draft.languages.some(x=>/C1/.test(x)),"Never map 'avanzato' automatically to certified C1");
});
test("Unlabelled words do not become confirmed software qualifications",()=>{
 const x=interpretCvText("Il lavoro riguarda Excel e PowerPoint. Esperienza lavorativa in boutique.");
 assert.deepEqual(x.tools,[]);
 assert.deepEqual(x.experience,[]);
});
test("English CV remains English, including software levels",()=>{
 const x=interpretCvText("Professional summary\nWork Experience\nStore Example\nSales Assistant 03/2025 - 06/2025\n+ Assisted store visitors during a busy sales campaign.\nEducation\nUniversity Example\nBachelor in Fashion\nSoftware: Microsoft PowerPoint (advanced), Excel (intermediate)\nLanguages\nEnglish C1");
 assert.equal(x.source_language,"en");
 assert.ok(x.tools.includes("PowerPoint (advanced)"));
 assert.ok(x.tools.includes("Excel (intermediate)"));
 assert.ok(x.languages.some(l=>l==="English (C1)"));
});
