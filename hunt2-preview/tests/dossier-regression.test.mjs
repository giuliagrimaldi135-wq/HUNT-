import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const cv=readFileSync(new URL("../cv-profile.js",import.meta.url),"utf8");
const folderStart=app.indexOf("async function renderOpportunityFolder(jobId){");
const folderEnd=app.indexOf("function statusLabel(",folderStart);
const folder=app.slice(folderStart,folderEnd);
test("Dossier news scorer has a defined company name (regression: Can't find variable)",()=>{
 assert.ok(folderStart>0&&folderEnd>folderStart);
 assert.match(folder,/const brand=job\.companies\?\.name\|\|"Brand";/);
 const defined=folder.indexOf("const companyName=String(brand).trim();");
 const used=folder.indexOf("companyName.toLowerCase()");
 assert.ok(defined>=0&&used>defined,"companyName must be declared before it is used");
});
test("Every job navigation enters the same dossier flow",()=>{
 assert.match(app,/data-open-dossier="/);
 assert.match(app,/app\.addEventListener\("click",event=>/);
 assert.doesNotMatch(app,/data-related-job=|data-prepare=/);
 assert.match(app,/Riprova/);
});
test("Paused letter creation does not run when opening a dossier",()=>{
 assert.doesNotMatch(folder,/id="saveCoverLetter"|id="copyCoverLetter"|id="regenerateCoverLetter"|id="generateDossier"/);
 assert.doesNotMatch(folder,/await requestDossier\(jobId,preferredLocale\)/);
 assert.match(folder,/The cover-letter feature is paused/);
 assert.match(cv,/const readSingleCv=async/);
 assert.match(cv,/if\(!autoReading\)/);
 assert.match(cv,/data-cv-action="delete-cv"/);
});

test("One Italian requirement list and one source-grounded synthesis are displayed",()=>{
 assert.match(folder,/it:normalizeVacancyFacts\(haveVerifiedSections\?bilingualFacts\.it:italianEvidenceFromJob\(job\.description,evidence\)\)/);
 assert.match(folder,/const dossierLang="it"/);
 assert.match(folder,/applicationInsight\(assessmentIt,cvChecklistIt,factLists\.it\.duties\)/);
 assert.match(folder,/Perché candidarti/);
 assert.doesNotMatch(folder,/data-fact-display="en"|id="dossierLang"|data-decision-lang=/);
 assert.match(folder,/id="dossierCv"/);
 assert.match(folder,/dossierCvChoices\.set\(jobId,next\)/);
 assert.match(folder,/expandedDuties\(factLists\.it\.duties\)/);
 assert.doesNotMatch(folder,/factLists\.it\.requirements\.slice\(0,/);
 assert.match(folder,/luxSourceFooter/);
 assert.match(folder,/Cover letter/);
});

test("Gucci's English posting is summarized as Italian duties and requirements without fabricated claims",async()=>{
 const start=app.indexOf("function evidenceItSummary("),end=app.indexOf("function documentedRequirement(",start);
 assert.ok(start>0&&end>start);
 const moduleSource=app.slice(start,end)+"\nexport {italianEvidenceFromJob};";
 const mod=await import("data:text/javascript;base64,"+Buffer.from(moduleSource).toString("base64"));
 const sample="The main objectives of the internship will be: Understand the processes related to the creation of the collection: from structure to presentation, with constant monitoring of sales data. Proficiency in English is required. Excellent Excel and PowerPoint proficiency.";
 const facts={tasks:["Understand the processes related to the creation of the collection: from structure to presentation, with constant monitoring of sales data"],requirements:["Proficiency in English is required.","Excellent Excel and PowerPoint proficiency."]};
 const result=mod.italianEvidenceFromJob(sample,facts);
 assert.ok(result.tasks.some(t=>/collezione|vendit/i.test(t)));
 assert.ok(result.requirements.some(t=>/inglese/i.test(t)));
 assert.ok(result.requirements.some(t=>/Excel/i.test(t)));
 assert.ok(result.tasks.every(t=>!/The main|Understand/.test(t)));
});

test("Italian tasks, official duties and absent sections all normalize safely",async()=>{
 const start=app.indexOf("function normalizeVacancyFacts(");
 const end=app.indexOf("async function renderOpportunityFolder(",start);
 assert.ok(start>0&&end>start);
 const moduleSource=app.slice(start,end)+"\nexport {normalizeVacancyFacts};";
 const {normalizeVacancyFacts}=await import("data:text/javascript;base64,"+Buffer.from(moduleSource).toString("base64"));
 assert.deepEqual(normalizeVacancyFacts({tasks:["Analizzare vendite"],requirements:["Excel"]}),{duties:["Analizzare vendite"],requirements:["Excel"]});
 assert.deepEqual(normalizeVacancyFacts({duties:["Monitor stock"],requirements:[]}),{duties:["Monitor stock"],requirements:[]});
 assert.deepEqual(normalizeVacancyFacts({duties:null,requirements:null}),{duties:[],requirements:[]});
 assert.deepEqual(normalizeVacancyFacts(null),{duties:[],requirements:[]});
 assert.deepEqual(normalizeVacancyFacts({tasks:["",42,"  Ordini  "]}),{duties:["Ordini"],requirements:[]});
 assert.match(folder,/normalizeVacancyFacts\(haveVerifiedSections/);
 assert.match(app,/history\.replaceState\(\{\},"",location\.pathname\+location\.search\)/);
});
