import {test} from "node:test";
import assert from "node:assert/strict";
import {renderJobWorkspace} from "../job-workspace.js";
const facts={
 summary:"Il ruolo collega stock, allocazioni e la pianificazione commerciale. Il progetto Gucci offre una base formativa.",
 duties:["Sviluppare piani di produzione per SKU","Monitorare lo stock","Supportare allocazione e reporting","Collaborare con altri team"],
 relevant:[
  {text:"Excel avanzato",category:"excel",match:{state:"alternate",evidence:"Excel avanzato nel CV Fashion Management"}},
  {text:"1–2 anni di esperienza in planning",category:"experience",match:{state:"missing",evidence:""}},
  {text:"Analisi dei dati",category:"analytics",match:{state:"partial",evidence:"Progetto Alaïa con KPI e budget"}}
 ],
 cvs:[{id:"a",name:"Merchandising",selected:true,primary:true,verified:true,readable:true},
      {id:"b",name:"Fashion Management",selected:false,primary:false,verified:false,readable:true}],
 officiallyVerified:true,
 sourceUrl:"https://jobs.lever.co/mulberry/test"
};
test("Product page uses clear navigation rather than one continuous AI report",()=>{
 const html=renderJobWorkspace(facts);
 for(const tab of ["overview","tasks","criteria"]){
  assert.match(html,new RegExp('data-job-workspace-tab="'+tab+'"'));
  assert.match(html,new RegExp('data-job-workspace-pane="'+tab+'"'));
 }
 assert.match(html,/hwSummaryGrid/);
 assert.match(html,/hwAsideCard/);
 assert.match(html,/id="dossierCv"/);
 assert.match(html,/CV principale|CV selezionato/);
 assert.match(html,/Cover letter/);
 assert.match(html,/Attività riportate nell’annuncio della posizione/);
 assert.doesNotMatch(html,/attenzione al dettaglio|autonomia professionale|precisione dei candidati/i);
});
test("A CV can be changed without hiding other available resumes",()=>{
 const html=renderJobWorkspace(facts);
 assert.match(html,/<option value="a" selected>/);
 assert.match(html,/<option value="b" >/);
 assert.match(html,/Fashion Management/);
});
test("The original job description is reachable and all duties remain available",()=>{
 const html=renderJobWorkspace(facts);
 for(const duty of facts.duties)assert.match(html,new RegExp(duty));
 assert.match(html,/jobs\.lever\.co\/mulberry\/test/);
});
test("Escape hostile source content and reject unsafe original URLs",()=>{
 const html=renderJobWorkspace({...facts,duties:['<img src=x onerror=alert(1)>'],sourceUrl:"javascript:alert(1)"});
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/href="javascript:/);
});
