import {test} from "node:test";import assert from "node:assert/strict";
import {evidenceForDisplay,cvRoleSignals,cvReviewSummary} from "../cv-display.js";
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
