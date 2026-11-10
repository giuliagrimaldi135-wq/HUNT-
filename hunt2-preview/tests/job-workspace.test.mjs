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

test("Editorial role explanation is the first thing visitors see",()=>{
 const html=renderJobWorkspace(facts);
 assert.match(html,/Dentro la posizione/);
 assert.match(html,/Il ruolo, in sintesi/);
 assert.match(html,/class="hwRoleDescription"/);
 assert.match(html,/In relazione al tuo profilo/);
 assert.match(html,/Il progetto Gucci offre una base formativa/);
 assert.doesNotMatch(html,/hwDisclosureList|hwSummaryCard|data-job-workspace-tab|role="tablist"/);
});
test("Two deliberate in-page choices replace the prior bare accordion list",()=>{
 const html=renderJobWorkspace(facts);
 assert.equal((html.match(/class="hwExploreChoice"/g)||[]).length,2);
 assert.match(html,/data-hunt-explore="tasks" aria-controls="huntExplore-tasks" aria-expanded="false"/);
 assert.match(html,/data-hunt-explore="criteria" aria-controls="huntExplore-criteria" aria-expanded="false"/);
 assert.match(html,/data-hunt-explore-panel="tasks"/);
 assert.match(html,/data-hunt-explore-panel="criteria"/);
 assert.match(html,/hwExplorePanels/);
});
test("CV choices, requirement evidence, and responsibilities remain available",()=>{
 const html=renderJobWorkspace(facts);
 assert.match(html,/<option value="a" selected>/);
 assert.match(html,/<option value="b" >/);
 assert.match(html,/id="dossierCv"/);
 assert.match(html,/Gestisci i tuoi CV/);
 for(const duty of facts.duties)assert.ok(html.includes(duty));
 assert.match(html,/Conoscenza di Excel/);
 assert.match(html,/Excel \(avanzato\)/);
 assert.match(html,/Indicato nel CV/);
 assert.match(html,/Non indicato nel CV/);
});
test("CV with unverified data offers a direct verification route",()=>{
 const html=renderJobWorkspace({...facts,cvs:[{id:"x",name:"Planning",selected:true,readable:true,verified:false}]});
 assert.match(html,/Verifica i dati del CV/);
 assert.match(html,/Dati del CV ancora da verificare/);
});
test("Job application URL is safe and appears once",()=>{
 const html=renderJobWorkspace(facts);
 assert.equal((html.match(/href="https:\/\/jobs\.lever\.co\/mulberry\/test"/g)||[]).length,1);
 const attack=renderJobWorkspace({...facts,duties:['<img src=x onerror=alert(1)>'],sourceUrl:"javascript:alert(1)"});
 assert.doesNotMatch(attack,/<img src=x/);
 assert.match(attack,/&lt;img/);
 assert.doesNotMatch(attack,/href="javascript:/);
});
test("Missing source details do not cause made-up descriptions",()=>{
 const html=renderJobWorkspace({...facts,duties:[],relevant:[],sourceUrl:"",summary:""});
 assert.match(html,/non è ancora disponibile una descrizione/);
 assert.match(html,/L’annuncio disponibile non contiene requisiti sufficienti/);
 assert.doesNotMatch(html,/In relazione al tuo profilo/);
});
test("Role narrative stays grounded in duties",()=>{
 const text=describePosition(["Supportare pianificazione e monitoraggio dei budget","Monitorare stock e allocazione dei prodotti"]);
 assert.match(text,/pianificazione commerciale/);
 assert.match(text,/controllo dei budget/);
 assert.doesNotMatch(describePosition([],"Retail Intern"),/analisi vendite/i);
});
