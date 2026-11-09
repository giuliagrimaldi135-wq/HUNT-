import {test} from "node:test";import assert from "node:assert/strict";
import {prioritizeRequirements,compareKeyRequirement} from "../requirement-priority.js";
const requirements=[
"Excel avanzato e solide capacità numeriche",
"1–2 anni di esperienza in planning, sourcing, buying o merchandising",
"Capacità analitiche e orientamento commerciale",
"Collaborazione con colleghi e stakeholder di diverse funzioni",
"Capacità di interpretare dati e tradurli in indicazioni commerciali chiare",
"Ottime capacità comunicative e relazionali",
"Iniziativa, autonomia, precisione e attenzione ai dettagli",
"Capacità di gestire le priorità e rispettare scadenze ravvicinate",
"Motivazione a sviluppare competenze di pianificazione e assumere maggiori responsabilità"
];
test("Only professional, demonstrable employer criteria are prominent",()=>{
 const result=prioritizeRequirements(requirements);
 assert.ok(result.length>=2&&result.length<=4);
 assert.ok(result.some(x=>/Excel/.test(x.text)));
 assert.ok(result.some(x=>/1–2 anni/.test(x.text)));
 assert.ok(result.some(x=>/analitich|dati/.test(x.text)));
 assert.ok(result.every(x=>!/(comunicativ|precisione|iniziativa|gestire le priorità|motivazione a)/i.test(x.text)));
 assert.ok(new Set(result.map(x=>x.category)).size===result.length);
});
test("Do not equate a legacy estimated 0.33 years with verifiable planning experience",()=>{
 const p={profile_confirmed_by_user:true,relevant_years_experience:0.33,experience:[{role:"Showroom Sales Intern",evidence:["Order entry and minimum-budget support"]}]};
 const requirement=prioritizeRequirements(requirements).find(x=>x.category==="experience");
 const check=compareKeyRequirement(requirement,{type:"partial",proof:"0.33 anni dichiarati; richiesti 2"},p);
 assert.equal(check.state,"missing");
 assert.doesNotMatch(JSON.stringify(check),/0\.33/);
});
test("Academic KPI project is a relevant learning signal, not invented professional analysis experience",()=>{
 const p={profile_confirmed_by_user:true,projects:[{name:"Alaïa academic project",evidence:["Budget, KPI and Excel-based comparative analysis"]}]};
 const requirement=prioritizeRequirements(requirements).find(x=>x.category==="analytics");
 const check=compareKeyRequirement(requirement,{type:"missing"},p);
 assert.equal(check.state,"partial");
 assert.match(check.evidence,/attività formative/);
});
test("A list of only unverifiable personality adjectives renders no CV match verdict",()=>{
 const r=prioritizeRequirements(["Capacità comunicative e relazionali","Attenzione al dettaglio","Proattività e spirito di squadra"]);
 assert.deepEqual(r,[]);
});
