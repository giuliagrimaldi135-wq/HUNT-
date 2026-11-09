import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../dossier-intelligence.js",import.meta.url),"utf8");
const {checkRequirements,assessDossier,newsTeaser}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
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
 assert.match(a[0].proof,/C1 non documentato/);
 assert.equal(a[1].type,"partial");
 assert.match(a[1].proof,/PowerPoint non trovato/);
 assert.equal(a[2].type,"missing"); // Fashion Management diploma is not proof of a Master in Economics.
 assert.ok(a.every(x=>x.type!=="found"),"Cannot declare these hard requirements satisfied");
});
test("Explicit CV evidence stays provisional until user confirmation",()=>{
 const results=checkRequirements(["Excel proficiency"],cv);
 assert.equal(results[0].type,"found");
 assert.match(results[0].label,/da confermare/);
 const confirmed={...cv,profile_confirmed_by_user:true};
 assert.match(checkRequirements(["Excel proficiency"],confirmed)[0].label,/confermato/);
});
test("Merchandising matches the Gucci project across Italian and English facts",()=>{
 const requirements=checkRequirements(["English C1"],cv);
 const v=assessDossier({canonical_title:"Retail Merchandising Intern"},cv,["Supportare la selezione dei prodotti e l'assortimento per i mercati locali","Analizzare i dati di vendita"],requirements,false);
 assert.match(v.work,/selezione dei prodotti/);
 assert.match(v.why,/Gucci/);
 assert.match(v.watch,/English C1/);
});
test("News always has an honest topical preview",()=>{
 assert.match(newsTeaser("Prada Group reports 15% revenue growth","Prada Group reports 15% revenue growth - Prada Group"),/Risultati economici/);
 assert.match(newsTeaser("Prada launches new holiday campaign",""),/Campagne e comunicazione/);
 assert.match(newsTeaser("Brand news","Detailed article on public store openings and team training in Paris"),/Detailed article/);
});
