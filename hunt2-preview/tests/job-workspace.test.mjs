import {test} from "node:test";
import assert from "node:assert/strict";
import {renderJobWorkspace} from "../job-workspace.js";
const facts={
 summary:"Il ruolo collega stock, allocazioni e la pianificazione commerciale. Il progetto Gucci offre una base formativa.",
 duties:["Sviluppare piani di produzione per SKU","Monitorare lo stock","Supportare allocazione e reporting","Collaborare con altri team"],
 relevant:[
  {text:"Competenze Excel richieste",category:"excel",match:{state:"detected",evidence:"Excel (avanzato)"}},
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
 assert.match(html,/hwOverviewHeading/);
 assert.match(html,/hwOverviewTasks/);
 assert.match(html,/hwOverviewRequirements/);
 assert.match(html,/data-switch-job-tab="tasks"/);
 assert.match(html,/data-switch-job-tab="criteria"/);
 assert.doesNotMatch(html,/hwSummaryGrid|hwSummaryCard|hwCardIcon/);
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

test("Approved application sidebar stays unchanged while overview becomes one coherent panel",()=>{
 const html=renderJobWorkspace(facts);
 assert.match(html,/class="hwAside"/);
 assert.match(html,/class="hwAsideCard"/);
 assert.match(html,/Come procedere/);
 assert.match(html,/Vai all’annuncio ufficiale/);
 assert.match(html,/Informazioni confermate/);
 assert.match(html,/hwOverviewDivider/);
 const overview=html.slice(html.indexOf('data-job-workspace-pane="overview"'),html.indexOf('data-job-workspace-pane="tasks"'));
 assert.ok(overview.includes("hwOverviewTasks")&&overview.includes("hwOverviewRequirements"));
 assert.equal((overview.match(/<article/g)||[]).length,0,"No extra nested cards in the overview");
});

test("Compact Excel row shows the exact level in the selected CV, not an unrelated version",()=>{
 const html=renderJobWorkspace(facts);
 assert.match(html,/Conoscenza di Excel/);
 assert.match(html,/hwCompactEvidence/);
 assert.match(html,/Excel \(avanzato\)/);
 assert.match(html,/Indicato nel CV/);
 assert.doesNotMatch(html,/In un altro CV|Solo in un altro CV/);
});
