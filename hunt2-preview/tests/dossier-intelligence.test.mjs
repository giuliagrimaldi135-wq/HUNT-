import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../dossier-intelligence.js",import.meta.url),"utf8");
const {checkRequirements,assessDossier,applicationInsight,newsTeaser}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const cv={
 profile_confirmed_by_user:false,
 tools:["Excel"],languages:["English B2"],
 education:[{program:"Fashion Management",school:"Istituto Marangoni"}],
 experience:[{company:"Marina Rinaldi",evidence:["Client welcome and garment presentation during sales campaign","Order entry with client minimum budget"]}],
 projects:[{name:"Gucci",evidence:["Merchandising mix and capsule planning"]}]
};
test("Do not call partial English C1 or incomplete Office a verified match",()=>{
 const a=checkRequirements(["Very good knowledge of the English language (CEFR C1)","Excellent Excel and PowerPoint proficiency","Master’s degree in Economics or a related field"],cv);
 assert.equal(a[0].type,"partial");
 assert.match(a[0].proof,/C1 non è esplicitato/);
 assert.equal(a[1].type,"partial");
 assert.match(a[1].proof,/PowerPoint non trovato/);
 assert.equal(a[2].type,"missing"); // Fashion Management diploma is not proof of a Master in Economics.
 assert.ok(a.every(x=>x.type!=="found"),"Cannot declare these hard requirements satisfied");
});
test("Explicit CV evidence stays provisional until user confirmation",()=>{
 const results=checkRequirements(["Excel proficiency"],cv);
 assert.equal(results[0].type,"detected");
 assert.match(results[0].label,/da confermare/);
 const confirmed={...cv,profile_confirmed_by_user:true};
 assert.match(checkRequirements(["Excel proficiency"],confirmed)[0].label,/confermato/);
});
test("Merchandising matches the Gucci project across Italian and English facts",()=>{
 const requirements=checkRequirements(["English C1"],cv);
 const v=assessDossier({canonical_title:"Retail Merchandising Intern"},cv,["Supportare la selezione dei prodotti e l'assortimento per i mercati locali","Analizzare i dati di vendita"],requirements,false);
 assert.match(v.work,/selezione e assortimento dei prodotti/);
 assert.match(v.why,/Gucci/);
 assert.match(v.watch,/English C1/);
});
test("News always has an honest topical preview",()=>{
 assert.match(newsTeaser("Prada Group reports 15% revenue growth","Prada Group reports 15% revenue growth - Prada Group"),/risultati economici/i);
 assert.match(newsTeaser("Prada launches new holiday campaign",""),/campagna o un.iniziativa di comunicazione/i);
 assert.match(newsTeaser("Brand news","Detailed article on public store openings and team training in Paris"),/Detailed article/);
});

test("Italian fashion dossier avoids mixing raw English duties into the decision",()=>{
 const it=assessDossier({canonical_title:"Merchandising Intern"},{experience:[{company:"Marina Rinaldi",evidence:["Client welcome and order entry"]}],projects:[{name:"Gucci academic project",evidence:["Merchandising mix and capsule planning"]}]},["Seguire le fasi di creazione e presentazione della collezione","Analizzare le vendite"],[{text:"Conoscenza dell'inglese richiesta",type:"missing"}],false,"it");
 assert.match(it.work,/presentazione delle collezioni/);
 assert.match(it.why,/progetto «Gucci»/);
 assert.doesNotMatch(it.work,/The main objectives of the internship/);
 assert.match(it.watch,/Da verificare/);
 const en=assessDossier({canonical_title:"Merchandising Intern"},{projects:[{name:"Gucci",evidence:["Merchandising mix and capsule planning"]}]},["Understand the creation of the collection"],[{text:"English proficiency",type:"missing"}],false,"en");
 assert.match(en.work,/responsibilities|focus/i);
 assert.match(en.watch,/To verify/);
});

test("Advanced PowerPoint explicitly printed in OCR is found as provisional, not missing",()=>{
 const raw={raw_text:"Software: Excel (avanzato) - PowerPoint (avanzato) - Word (avanzato)",profile_confirmed_by_user:false};
 const r=checkRequirements(["Ottima conoscenza di Excel e PowerPoint"],raw);
 assert.equal(r[0].type,"detected");
 assert.match(r[0].proof,/PowerPoint \(avanzato\)/);
 assert.match(r[0].proof,/Excel \(avanzato\)/);
 assert.match(r[0].label,/da confermare/);
});
test("A partial local Office match is never replaced by a result from another CV",()=>{
 const selected={profile_verified_from_user_history:true,tools:["Excel"]};
 const another={id:"other-cv",name:"Italian Fashion Management",parsed_profile:{raw_text:"Software: Excel (avanzato) - PowerPoint (avanzato)"}};
 const r=checkRequirements(["Ottima conoscenza di Excel e PowerPoint"],selected,{alternatives:[another]});
 assert.equal(r[0].type,"partial");
 assert.match(r[0].proof,/Excel presente; PowerPoint non trovato/);
 assert.equal(r[0].suggested_cv_id,null);
});
test("Another CV is suggested only when the selected CV has no relevant software evidence",()=>{
 const selected={profile_confirmed_by_user:true,tools:["Canva"]};
 const other={id:"other-cv",name:"Fashion Management",parsed_profile:{raw_text:"Software: Excel (avanzato) - PowerPoint (avanzato)"}};
 const r=checkRequirements(["Excel avanzato"],selected,{alternatives:[other]});
 assert.equal(r[0].type,"alternate");
 assert.match(r[0].proof,/Fashion Management/);
 assert.equal(r[0].suggested_cv_id,"other-cv");
});
test("Both uploaded CVs contain advanced Excel: never show 'other CV' for either",()=>{
 const merchandising={profile_verified_from_user_history:true,tools:["Excel","Max Mara order application"],
   draft_profile:{tools:["Excel (avanzato)","PowerPoint (avanzato)"]},
   raw_text:"Esperienza lavorativa\nSoftware: Excel (avanzato) - PowerPoint (avanzato) - Word (avanzato)"};
 const fashion={raw_text:"Software: Excel (avanzato) - PowerPoint (avanzato) - Word (avanzato)"};
 for(const [selected,another] of [[merchandising,fashion],[fashion,merchandising]]){
   const result=checkRequirements(["Competenze Excel richieste"],selected,{
     alternatives:[{id:"other",name:"Altra versione",parsed_profile:another}]
   })[0];
   assert.notEqual(result.type,"alternate");
   assert.equal(result.suggested_cv_id,null);
   assert.match(result.proof,/Excel \(avanzato\)/i);
   assert.ok(["found","detected"].includes(result.type));
 }
});
test("Confirmed exact advanced Office levels are considered documented",()=>{
 const r=checkRequirements(["Ottima conoscenza di Excel e PowerPoint"],{profile_confirmed_by_user:true,tools:["Excel (avanzato)","PowerPoint (avanzato)"]});
 assert.equal(r[0].type,"found");
 assert.match(r[0].proof,/avanzato/);
});

test("Excellent software proficiency is not claimed from tool names without explicit levels",()=>{
 const p={profile_confirmed_by_user:true,tools:["Excel","PowerPoint"]};
 const match=checkRequirements(["Ottima conoscenza di Excel e PowerPoint"],p)[0];
 assert.equal(match.type,"partial");
 assert.match(match.proof,/livello avanzato non confermato/);
});
test("Italian CV proof does not expose raw English CV bullet in the Italian dossier",()=>{
 const req=checkRequirements(["Capacità di lavorare in team, comunicare e raggiungere obiettivi"],cv);
 assert.equal(req[0].type,"partial");
 assert.match(req[0].proof,/accoglienza clienti/);
 assert.doesNotMatch(req[0].proof,/Client welcome and garment presentation/);
});

test("Why apply is one coherent CV-backed explanation and does not overclaim academic work",()=>{
 const assessment=assessDossier({},cv,["Support commercial planning and stock allocation"],[],false,"it");
 const paragraph=applicationInsight(assessment,[]);
 assert.match(paragraph,/Gucci|pianificazione commerciale/i);
 assert.doesNotMatch(paragraph,/Il lavoro|Il tuo punto di partenza|Prima di candidarti/);
 assert.ok(paragraph.length>120);
});
