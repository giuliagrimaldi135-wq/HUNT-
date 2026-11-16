import test from "node:test";
import assert from "node:assert/strict";
import {safeVacancyCandidate,resolveSharedBoardEmployer,canRetryReview} from "./candidate-integrity.mjs";
const base="https://careers.otb.net/go/Internship/8575402/";
test("recognizes a real OTB vacancy and decodes escaped HTML entities",()=>{
 const out=safeVacancyCandidate("https://careers.otb.net/job/Milano-Retail-&amp;apos;-Buyer/1375114257/","Europe Junior Buyer",base);
 assert.ok(out);assert.ok(out.url.includes("1375114257"));assert.ok(!out.url.includes("amp;"));
});
test("rejects templated assessment links and account verification traps",()=>{
 assert.equal(safeVacancyCandidate("%7B%7BassessmentUrl%7D%7D","{{assessmentUrl}}",base),null);
 assert.equal(safeVacancyCandidate("https://careers.otb.net/jobs%3Equi%3C/a%3E.","Account verification",base),null);
 assert.equal(safeVacancyCandidate("javascript:alert(1)","Retail Planning Intern",base),null);
});
test("accepts ATS vacancies rather than generic outside links",()=>{
 assert.ok(safeVacancyCandidate("https://jobs.smartrecruiters.com/Frette/3743990015103806","Operations Coordinator",base));
 assert.equal(safeVacancyCandidate("https://bad-host.example/apply/abc","Intern",base),null);
});
const companies=[{id:"otb",slug:"otb"},{id:"marni",slug:"marni"},{id:"diesel",slug:"diesel"},{id:"margiela",slug:"maison-margiela"},{id:"jil",slug:"jil-sander"}];
test("OTB shared board no longer labels Diesel or Margiela jobs as Marni",()=>{
 assert.equal(resolveSharedBoardEmployer("https://careers.otb.net/job/123/","Manager, CRM & Client Development - Diesel NAM",companies),"diesel");
 assert.equal(resolveSharedBoardEmployer("https://careers.otb.net/job/123/","Supervisor Maison Margiela",companies),"margiela");
 assert.equal(resolveSharedBoardEmployer("https://careers.otb.net/job/123/","Europe Junior Buyer",companies),"otb");
});
test("review retry is bounded, and requires recent sighting",()=>{
 const x={status:"needs_review",listing_url:"https://careers.otb.net/job/Milano/1375114257/",title_hint:"Europe Junior Buyer",parsed_at:"2026-11-14T00:00:00Z",last_seen_at:"2026-11-15T00:00:00Z",raw:{}};
 const now=Date.parse("2026-11-16T17:00:00Z");
 assert.equal(canRetryReview(x,now),true);
 assert.equal(canRetryReview({...x,raw:{review_retry_count:2}},now),false);
 assert.equal(canRetryReview({...x,parsed_at:"2026-11-16T10:00:00Z"},now),false);
});
