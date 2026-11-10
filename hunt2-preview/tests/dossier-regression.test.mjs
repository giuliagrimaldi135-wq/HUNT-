import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const cv=readFileSync(new URL("../cv-profile.js",import.meta.url),"utf8");
const cvWorkspace=readFileSync(new URL("../cv-workspace.js",import.meta.url),"utf8");
const jobWorkspace=readFileSync(new URL("../job-workspace.js",import.meta.url),"utf8");
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
test("Letter work remains paused and the candidate can still control CVs",()=>{
 assert.doesNotMatch(folder,/id="saveCoverLetter"|id="copyCoverLetter"|id="regenerateCoverLetter"|id="generateDossier"/);
 assert.doesNotMatch(folder,/await requestDossier\(jobId,preferredLocale\)/);
 assert.match(folder,/The cover-letter feature is paused/);
 assert.match(cv,/const readSingleCv=async/);
 assert.match(cv,/if\(!autoReading\)/);
 assert.match(cvWorkspace,/data-cv-action="delete-cv"/);
 assert.match(cvWorkspace,/data-cv-action="default"/);
});

test("Job dossier is a navigable product workspace, not a wall of personality ratings",()=>{
 assert.match(folder,/it:normalizeVacancyFacts\(haveVerifiedSections\?bilingualFacts\.it:italianEvidenceFromJob\(job\.description,evidence\)\)/);
 assert.match(folder,/const dossierLang="it"/);
 assert.match(folder,/applicationInsight\(assessmentIt,cvChecklistIt,factLists\.it\.duties\)/);
 assert.match(folder,/prioritizeRequirements\(factLists\.it\.requirements,4\)/);
 assert.match(folder,/compareKeyRequirement\(x,cvChecklistIt\[x\.sourceIndex\],evidencedProfile\)/);
 assert.match(folder,/renderJobWorkspace\(/);
 assert.match(jobWorkspace,/Il ruolo, in sintesi/);
 assert.match(jobWorkspace,/hwRoleDescription/);
 assert.match(jobWorkspace,/data-hunt-explore="tasks"/);
 assert.match(jobWorkspace,/data-hunt-explore="criteria"/);
 assert.doesNotMatch(jobWorkspace,/role="tablist"/);
 assert.match(jobWorkspace,/hwAsideCard/);
 assert.match(jobWorkspace,/id="dossierCv"/);
 assert.match(jobWorkspace,/responsibilities\(duties\)/);
 assert.match(jobWorkspace,/HUNT propone la versione più pertinente/);
 assert.match(folder,/dossierCvChoices\.set\(jobId,next\)/);
 assert.doesNotMatch(folder,/jobWorkspaceTabs\.set\(jobId,tab\)/);
 assert.match(jobWorkspace,/data-hunt-explore/);
 assert.doesNotMatch(folder,/data-fact-display="en"|id="dossierLang"|data-decision-lang=/);
 assert.doesNotMatch(folder,/relevant_years_experience/);
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

test("Generic vacancy parsing retains a full list of explicitly stated qualifications",async()=>{
 const from=app.indexOf("function evidenceItSummary("),to=app.indexOf("function documentedRequirement(",from);
 const code=app.slice(from,to)+"\nexport {italianEvidenceFromJob};";
 const {italianEvidenceFromJob}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
 const requirements=[
  "Has advanced Excel skills and strong numerical capability.",
  "Has 1-2 years' experience within planning, sourcing, buying or merchandising.",
  "Demonstrates strong analytical skills and a commercial mindset.",
  "Enjoys building collaborative relationships and partnering with stakeholders.",
  "Can interpret data and translate analytical findings into clear commercial insights.",
  "Has excellent communication and interpersonal skills.",
  "Takes ownership, shows initiative and delivers with accuracy and attention to detail.",
  "Can effectively manage priorities and work to tight deadlines.",
  "Has the ambition to develop their planning expertise and take on increasing responsibility."
 ];
 const facts=italianEvidenceFromJob(requirements.join(" "),{requirements,tasks:["Supporting allocation planning and reporting","Monitoring stock and inventory"]});
 assert.ok(facts.requirements.length>=9,"Do not silently truncate employer requirements");
 assert.ok(facts.requirements.some(x=>/1–2 anni/.test(x)));
 assert.ok(facts.requirements.some(x=>/Excel/.test(x)));
 assert.ok(facts.tasks.some(x=>/stock|allocazion/.test(x)));
});

test("Candidate can return to the same vacancy after reviewing or editing a CV",()=>{
 assert.match(app,/profileButton\.onclick=async\(\)=>/);
 assert.match(app,/await renderProfile\(jobId\)/);
 assert.match(app,/requestCvVerification\(cvId\)/);
 assert.match(app,/async function renderProfile\(fromJobId=null\)/);
 assert.match(app,/id="profileBackToJob"/);
 assert.match(app,/backToJob\.onclick=\(\)=>openOpportunityFolder\(fromJobId,false\)/);
 assert.match(app,/refresh:\(\)=>renderProfile\(fromJobId\)/);
});
