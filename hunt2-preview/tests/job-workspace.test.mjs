import {test} from "node:test";
import assert from "node:assert/strict";
import {renderJobWorkspace,describePosition} from "../job-workspace.js";

const facts={
 summary:"Il ruolo collega stock, allocazioni e la pianificazione commerciale. Il progetto Gucci offre una base formativa.",
 duties:["Sviluppare piani di produzione per SKU","Monitorare lo stock","Supportare allocazione e reporting"],
 relevant:[
  {text:"Competenze Excel richieste",match:{state:"detected",evidence:"Excel (avanzato)"}},
  {text:"1–2 anni di esperienza in planning",match:{state:"missing",evidence:""}}
 ],
 cvs:[{id:"a",name:"Merchandising",selected:true,primary:true,verified:true,readable:true},
      {id:"b",name:"Fashion Management",selected:false,primary:false,readable:true}],
 officiallyVerified:true,sourceUrl:"https://jobs.lever.co/mulberry/test"
};

test("First-time visitor sees one overview, no nested tabs or step-by-step dashboard",()=>{
 const html=renderJobWorkspace(facts);
 assert.match(html,/Cosa farai/);
 assert.match(html,/class="hwIntro"/);
 assert.equal((html.match(/<details class="hwDisclosure/g)||[]).length,3);
 assert.doesNotMatch(html,/data-job-workspace-tab|role="tablist"|hwSummaryCard|Come procedere|01 \/ IL RUOLO/);
 assert.match(html,/class="hwDisclosureList"/);
 assert.match(html,/Attività/);
 assert.match(html,/Requisiti/);
 assert.match(html,/Confronto con il mio CV/);
 assert.match(html,/Il CV per questa candidatura/);
 assert.match(html,/Vai all’annuncio e candidati/);
 assert.doesNotMatch(html,/temporaneamente sospesa|IN SVILUPPO/);
});
test("CV choices, requirement evidence, and full responsibilities remain accessible",()=>{
 const html=renderJobWorkspace(facts);
 assert.match(html,/<option value="a" selected>/);
 assert.match(html,/<option value="b" >/);
 assert.match(html,/id="dossierCv"/);
 assert.match(html,/Gestisci i miei CV/);
 for(const duty of facts.duties)assert.ok(html.includes(duty));
 assert.match(html,/Conoscenza di Excel/);
 assert.match(html,/Excel \(avanzato\)/);
 assert.match(html,/Indicato nel CV/);
 assert.match(html,/Non indicato nel CV/);
});
test("One safe application link and no fabricated company requirement claims",()=>{
 const html=renderJobWorkspace(facts);
 assert.equal((html.match(/href="https:\/\/jobs\.lever\.co\/mulberry\/test"/g)||[]).length,1);
 const attack=renderJobWorkspace({...facts,duties:['<img src=x onerror=alert(1)>'],sourceUrl:"javascript:alert(1)"});
 assert.doesNotMatch(attack,/<img src=x/);
 assert.match(attack,/&lt;img/);
 assert.doesNotMatch(attack,/href="javascript:/);
 assert.doesNotMatch(attack,/Vai all’annuncio e candidati/);
});
test("Short source descriptions stay honest when employer details are missing",()=>{
 const html=renderJobWorkspace({...facts,duties:[],relevant:[],sourceUrl:"",summary:""});
 assert.match(html,/non è ancora disponibile una descrizione/);
 assert.match(html,/Non ci sono informazioni sufficienti/);
 assert.doesNotMatch(html,/Confronto con il mio CV/);
});
test("Role narrative is factual, concise and based on supplied duties",()=>{
 assert.match(describePosition(["Supportare pianificazione e monitoraggio dei budget","Monitorare stock e allocazione dei prodotti"]),"pianificazione commerciale");
 assert.doesNotMatch(describePosition([],"Retail Intern"),/si occupa di analisi vendite/i);
});
