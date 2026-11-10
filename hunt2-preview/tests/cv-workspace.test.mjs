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
test("CV library keeps private file management and no new complexity",()=>{
 const html=renderCvLibrary({cvs:rows,selectedId:"1",statusFor:()=>"Da confermare"});
 assert.match(html,/I tuoi CV/);
 assert.match(html,/aria-current="true"/);
 assert.match(html,/Imposta come principale/);
 assert.match(html,/Rendi secondario/);
 assert.match(html,/Elimina CV/);
 assert.match(html,/Aggiungi un CV/);
 assert.match(html,/data-cv-action="upload"/);
});
test("CV opens with a clear summary rather than five equal-priority tabs",()=>{
 const html=renderCvWorkspace({cv:rows[0],info,areas:[{name:"Merchandising",related:true,basis:"Progetto · Gucci"}],confirmed:true,corrections:""});
 assert.match(html,/Il tuo CV, in breve/);
 assert.match(html,/cvWSimpleSummary/);
 assert.match(html,/Esperienza/);
 assert.match(html,/Progetti/);
 assert.match(html,/Formazione e competenze/);
 assert.match(html,/Marina Rinaldi/);
 assert.match(html,/Progetto accademico Gucci/);
 assert.match(html,/Excel \(avanzato\)/);
 assert.doesNotMatch(html,/cvWTabs|role="tablist"|cvWOverviewCard/);
 assert.match(html,/Vedi le esperienze/);
 assert.match(html,/Vedi i progetti/);
 assert.match(html,/Vedi le competenze/);
});
test("All six detail and edit panels remain reachable with a back link",()=>{
 const html=renderCvWorkspace({cv:rows[0],info,areas:[{name:"Merchandising",related:true,basis:"Progetto Gucci"}],confirmed:true});
 for(const id of ["overview","experience","projects","skills","areas","edit"])assert.match(html,new RegExp('data-cv-panel="'+id+'"'));
 for(const id of ["experience","projects","skills","areas","edit"])assert.match(html,new RegExp('data-cv-panel="'+id+'" hidden'));
 assert.equal((html.match(/data-cv-panel-target="overview"/g)||[]).length,5);
 assert.match(html,/data-cv-panel-target="areas"/);
 assert.match(html,/id="cvCorrectionDetails"/);
});
test("CV verification is explicit; save button is shown only in edit mode",()=>{
 const summary=renderCvWorkspace({cv:rows[1],info,confirmed:false,activePanel:"overview",corrections:'<textarea id="cvTools">Excel</textarea>'});
 assert.match(summary,/Verifica i dati estratti/);
 assert.match(summary,/Ora verifica esperienze, progetti, formazione e competenze/);
 assert.match(summary,/class="cvWConfirm" hidden/);
 assert.match(summary,/cvWVerifyPrimary/);
 const edit=renderCvWorkspace({cv:rows[1],info,confirmed:false,activePanel:"edit",corrections:'<textarea id="cvTools">Excel</textarea>'});
 assert.match(edit,/data-cv-panel="edit" >/);
 assert.match(edit,/data-cv-panel="overview" hidden/);
 assert.match(edit,/class="cvWConfirm" >/);
 assert.match(edit,/Conferma e salva/);
 assert.match(edit,/Torna al riepilogo/);
});
test("Professional categories are optional and maintain their evidence provenance",()=>{
 const areas=[{name:"Merchandising",related:true,basis:"Progetto · Gucci academic project"},{name:"Technology",related:false,basis:""}];
 const html=renderCvWorkspace({cv:rows[0],info,areas,activePanel:"areas",confirmed:true});
 assert.match(html,/cvWAreaEntries/);
 assert.match(html,/Gucci/);
 assert.match(html,/Esplora tutte le 2 categorie/);
 assert.match(html,/data-cv-panel-target="areas"/);
 assert.doesNotMatch(html,/cvWOverviewCard|cvWAreaCard/);
});

test("Principal CV and verified information remain distinct states",()=>{
 const lib=renderCvLibrary({cvs:rows,selectedId:"1",statusFor:()=>"Da verificare"});
 assert.match(lib,/Principale · Da verificare/);
 const html=renderCvWorkspace({cv:rows[1],info,confirmed:false,corrections:""});
 assert.match(html,/Il file originale rimane invariato/);
 assert.match(html,/Confermando, HUNT utilizzerà questi dati/);
 const verified=renderCvWorkspace({cv:rows[0],info,confirmed:true,corrections:""});
 assert.match(verified,/Modifica i dati del CV/);
 assert.match(verified,/Salva modifiche/);
});
