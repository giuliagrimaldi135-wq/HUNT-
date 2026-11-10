import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const outreach=readFileSync(new URL("../outreach-intelligence.js",import.meta.url),"utf8");
test("Brand da contattare is discoverable in desktop and mobile navigation",()=>{
 assert.match(app,/outreach:"Brand da contattare"/);
 assert.match(app,/outreach:"Brand"/);
 assert.match(app,/<h1>Brand da contattare<\/h1>/);
 assert.match(app,/if\(currentView==="outreach"\) return renderOutreach\(\)/);
});
test("Changing selected CV immediately changes email without an extra click",()=>{
 assert.match(app,/if\(cv\)cv.onchange=\(\)=>/);
 assert.match(app,/replaceWithCv\(nextId\)/);
 assert.match(app,/subject.value=next.subject;body.value=next.body/);
 assert.match(app,/refreshCvExplanation\(id\)/);
 assert.match(app,/wasEdited&&!window.confirm/);
 assert.doesNotMatch(app,/Per aggiornare l’email scegli «Ricrea dal CV selezionato»/);
});
test("Drafts are private per user and persist which CV produced the letter",()=>{
 assert.match(app,/from\("user_outreach_drafts"\).*select\("outreach_key,brand_name,subject,email_body,status,updated_at,cv_id"\).*eq\("user_id",currentUser.id\)/);
 assert.match(app,/from\("user_cvs"\).*eq\("user_id",currentUser.id\)/);
 assert.match(app,/user_id:currentUser.id,outreach_key:lead.key,brand_name:lead.brand,cv_id:cv\?\.value\|\|null/);
 assert.match(app,/draft\?\.cv_id&&cvs.some\(c=>c.id===draft.cv_id\)/);
});
test("Per-user personalization and source-backed press appear in folder",()=>{
 assert.match(app,/from\("user_personalization"\)/);
 assert.match(app,/preferences:preferencesRes.data\|\|\{\}/);
 assert.match(app,/composeOutreachEmail\(lead,selectedById\(id\),person,preferences\)/);
 assert.match(outreach,/brandGlobalNewsList/);
 assert.match(outreach,/data-outreach-news-filter="press"/);
 assert.match(outreach,/News & mondo fashion/);
 assert.match(outreach,/non un monitoraggio automatico di tutti i loro post/);
});

test("Brand news can be filtered and all Fashion News opened through real actions",()=>{
 assert.match(app,/data-outreach-news-filter/);
 assert.match(app,/item.hidden=!match/);
 assert.match(app,/data-outreach-all-news/);
 assert.match(app,/renderWorldRadar\(\)/);
 assert.match(app,/data-outreach-jump/);
 assert.match(app,/scrollIntoView/);
});
