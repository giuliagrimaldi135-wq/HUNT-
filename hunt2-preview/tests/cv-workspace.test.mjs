import {test} from "node:test";
import assert from "node:assert/strict";
import {renderCvLibrary,renderCvWorkspace} from "../cv-workspace.js";
const rows=[{id:"1",name:"Merchandising",is_default:true},{id:"2",name:"Fashion Management",is_default:false}];
const info={
 experience:[{company:"Marina Rinaldi",role:"Showroom Sales Intern",evidence:["Client welcome and garment presentation during sales campaign"]}],
 projects:[{name:"Gucci academic project",evidence:["Merchandising mix and capsule planning"]},
           {name:"Alaïa academic project",evidence:["Assortment and buying logic"]}],
 education:[{school:"Istituto Marangoni Milano",program:"Fashion Management"}],
 tools:["Excel (avanzato)","PowerPoint (avanzato)"],languages:["English B2"]
};
test("File library has recognizable CV entries, contextual actions, a focused upload flow",()=>{
 const html=renderCvLibrary({cvs:rows,selectedId:"1",statusFor:()=>"Da confermare"});
 assert.match(html,/class="cvWLibrary"/);
 assert.match(html,/aria-current="true"/);
 assert.match(html,/Imposta come principale/);
 assert.match(html,/Rendi secondario/);
 assert.match(html,/Elimina CV/);
 assert.match(html,/Aggiungi un CV/);
 assert.match(html,/data-cv-action="upload"/);
 assert.doesNotMatch(html,/data-cv-action="read"/);
});
test("Tabbed CV workspace keeps experience, projects and software accessible without a long list",()=>{
 const html=renderCvWorkspace({cv:rows[0],info,areas:[{name:"Merchandising",related:true,basis:"Progetto Gucci"}],
 confirmed:true,activePanel:"overview",corrections:'<input id="cvTools">'});
 for(const pane of ["overview","experience","projects","skills","areas","edit"])
  assert.match(html,new RegExp('data-cv-panel="'+pane+'"'));
 assert.match(html,/data-cv-panel="experience" hidden/);
 assert.match(html,/data-cv-panel="overview" /);
 assert.match(html,/Accoglienza clienti e presentazione dei capi durante la campagna vendite/);
 assert.match(html,/Progetto accademico Gucci/);
 assert.match(html,/PowerPoint \(avanzato\)/);
 assert.match(html,/id="cvCorrectionDetails"/);
 assert.match(html,/Salva modifiche/);
});
test("Editing shows only the edit pane; no source file changes are implied",()=>{
 const html=renderCvWorkspace({cv:rows[1],info,areas:[],confirmed:false,activePanel:"edit",corrections:'<textarea id="cvTools">Excel</textarea>'});
 assert.match(html,/data-cv-panel="edit" >/);
 assert.match(html,/data-cv-panel="overview" hidden/);
 assert.match(html,/Conferma informazioni/);
 assert.match(html,/CV.*Riepilogo/s);
});

test("Right-side CV summary and categories have clear grouping, not full-width source labels",()=>{
 const areas=[
  {name:"Merchandising",related:true,basis:"Progetto · Gucci academic project"},
  {name:"Buying",related:true,basis:"Progetto · Alaïa academic project"},
  {name:"Wholesale & Commercial",related:true,basis:"Esperienza · Marina Rinaldi"},
  {name:"Technology",related:false,basis:""}
 ];
 const html=renderCvWorkspace({cv:rows[0],info,areas,confirmed:true,activePanel:"areas",corrections:""});
 assert.match(html,/cvWAreaCards/);
 assert.match(html,/cvWAreaCardEvidence/);
 assert.match(html,/cvWAreaCount/);
 assert.match(html,/3<\/strong><span>aree collegate/);
 assert.match(html,/Gucci/);
 assert.match(html,/Marina Rinaldi/);
 assert.match(html,/data-cv-panel-target="projects"/);
 assert.match(html,/data-cv-panel-target="experience"/);
 assert.doesNotMatch(html,/cvWAreaRow|cvWOverviewGrid/);
 assert.match(html,/cvWSnapshot/);
 assert.match(html,/Visualizza tutte|Esplora tutte le 4 categorie/);
 assert.match(html,/Conferma informazioni|Salva modifiche/);
});
