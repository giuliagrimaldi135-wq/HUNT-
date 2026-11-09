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
test("Paused AI is not advertised as a working control",()=>{
 assert.doesNotMatch(app,/HUNT AI|id="writeLetterAI"|id="polishLetter"|hunt-letter-polish/);
 assert.doesNotMatch(cv,/HUNT AI|data-cv-action="interpret"|id="cvAutoAI"/);
 assert.match(app,/id="saveCoverLetter"/);
 assert.match(app,/id="copyCoverLetter"/);
 assert.match(cv,/data-cv-action="read"/);
});

test("Italian dossier uses Italian evidence and switches without waiting for letter service",()=>{
 assert.match(folder,/it:haveVerifiedSections\?bilingualFacts\.it:italianEvidenceFromJob\(job\.description,evidence\)/);
 assert.match(folder,/const dossierLang=preferredLocale/);
 assert.match(folder,/showDossierLanguage\(lang\)/);
 assert.match(folder,/localStorage\.setItem\("hunt_dossier_language",lang\)/);
 assert.doesNotMatch(folder,/<details class="sourceVerification"/);
 assert.match(folder,/data-decision-lang=/);
});
test("Letter generator v8 is used and manual edits are preserved",()=>{
 assert.match(folder,/evidence_dossier_v8/);
 assert.match(folder,/user_edited/);
 assert.match(folder,/Controllo qualità HUNT/);
});
