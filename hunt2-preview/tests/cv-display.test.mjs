import {test} from "node:test";import assert from "node:assert/strict";
import {evidenceForDisplay,projectNameForDisplay,cvRoleSignals,cvProfessionalCategories,cvReviewSummary} from "../cv-display.js";
const examples=[
 ["Client welcome and garment presentation during sales campaign","Accoglienza clienti e presentazione dei capi durante la campagna vendite"],
 ["Order taking through Max Mara application using product codes","Raccolta degli ordini tramite l'applicazione Max Mara, usando i codici prodotto"],
 ["Order entry and client minimum-budget support","Inserimento degli ordini e supporto alla verifica dei budget minimi dei clienti"],
 ["Autonomy with clients during peak traffic","Gestione autonoma dei clienti nei momenti di maggiore affluenza"]
];
test("Legacy English CV evidence appears naturally in Italian without rewriting storage",()=>{
 for(const [original,expected] of examples){
   const actual=evidenceForDisplay(original,"it");
   assert.equal(actual.text,expected);assert.equal(actual.translated,true);
   assert.equal(evidenceForDisplay(original,"en").text,original);
 }
});
test("No automatic translation is invented for unknown source statements",()=>{
 const unknown=evidenceForDisplay("Developed a proprietary forecasting engine","it");
 assert.equal(unknown.text,"Developed a proprietary forecasting engine");
 assert.equal(unknown.translated,false);
});
test("Role hints derive from profile evidence and are not requirements manually set by user",()=>{
 const p={draft_profile:{experience:[{role:"Showroom",evidence:["Order taking during sales campaign"]}],projects:[{name:"Capsule",evidence:["Merchandising mix and assortment"]}]}};
 const suggested=cvRoleSignals(p);
 assert.ok(suggested.includes("Merchandising"));
 assert.ok(suggested.includes("Wholesale"));
 const summary=cvReviewSummary(p);
 assert.equal(summary.confirmed,false);
 assert.equal(summary.experience.length,1);
});

test("Gucci and Alaia academic projects are presented in Italian while preserving original evidence",()=>{
 assert.equal(projectNameForDisplay("Gucci academic project","it"),"Progetto accademico Gucci");
 assert.equal(projectNameForDisplay("Alaïa academic project","it"),"Progetto accademico Alaïa");
 assert.equal(evidenceForDisplay("Costing and product coding","it").text,"Analisi dei costi di prodotto (costing) e codifica dei prodotti");
 assert.equal(evidenceForDisplay("Planning from collection development through orders and distribution","it").translated,true);
 assert.equal(evidenceForDisplay("Assortment and buying logic","it").text,"Studio delle logiche di assortimento e buying");
});

test("All 20 career categories are available, but only CV-evidenced areas are highlighted",()=>{
 const profile={profile_confirmed_by_user:true,
  experience:[{company:"Marina Rinaldi",evidence:["Order taking through Max Mara application using product codes"]}],
  projects:[{name:"Gucci academic project",evidence:["Merchandising mix and capsule planning"]},
    {name:"Alaia academic project",evidence:["Assortment and buying logic","Budget, KPI and Excel-based comparative analysis"]}]};
 const categories=cvProfessionalCategories(profile);
 assert.equal(categories.length,20);
 assert.ok(categories.find(x=>x.name==="Merchandising")?.related);
 assert.ok(categories.find(x=>x.name==="Buying")?.related);
 assert.ok(categories.find(x=>x.name==="Planning & Allocation")?.related);
 assert.ok(categories.find(x=>x.name==="Wholesale & Commercial")?.related);
 assert.ok(!categories.find(x=>x.name==="HR & Talent")?.related);
 assert.ok(categories.some(x=>x.basis.includes("Progetto · Gucci")));
});

test("A CV summary merges structured and OCR software from the same document",()=>{
 const parsed={
  profile_verified_from_user_history:true,
  tools:["Excel","Max Mara order application"],
  draft_profile:{tools:["Excel (avanzato)","PowerPoint (avanzato)","Word (avanzato)"]},
  raw_text:"Software: Excel (avanzato) - PowerPoint (avanzato) - Word (avanzato) - Canva"
 };
 const summary=cvReviewSummary(parsed);
 assert.ok(summary.tools.some(x=>/Excel \(avanzato\)/i.test(x)));
 assert.ok(summary.tools.some(x=>/PowerPoint \(avanzato\)/i.test(x)));
 assert.ok(summary.tools.some(x=>/Max Mara order application/i.test(x)));
 assert.ok(!summary.tools.includes("Excel"),"Do not show both the generic and the precise level");
 assert.equal(summary.tools.filter(x=>/^Excel\b/i.test(x)).length,1);
});
test("An OCR-only CV reads explicitly written software without borrowing another version",()=>{
 const summary=cvReviewSummary({raw_text:"Software: Excel (avanzato) - PowerPoint (avanzato) - Canva"});
 assert.ok(summary.tools.includes("Excel (avanzato)"));
 assert.ok(summary.tools.includes("PowerPoint (avanzato)"));
 assert.ok(summary.tools.includes("Canva"));
 assert.equal(summary.confirmed,false);
});
