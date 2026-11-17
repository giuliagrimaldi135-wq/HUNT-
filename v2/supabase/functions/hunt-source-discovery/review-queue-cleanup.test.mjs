import test from "node:test";
import assert from "node:assert/strict";
import {isDemonstrablyNavigation as nav, normalizedLegacyJobURL as norm,
classifyLegacyReviewRecords as classify} from "./review-queue-cleanup.mjs";
test("real dated or undated job details must never be classified as navigation",()=>{
 for(const link of [
 "https://jobs.valentino.com/job/Milano-Retail-Planning-Intern/1375114257/",
 "https://careers.otb.net/job/Breganze-Financial-Controller/1368558057/",
 "https://richemont.wd3.myworkdayjobs.com/en-US/richemont/job/Milano-Retail-Merchandising-Intern_R031234",
 "https://careers.zegnagroup.com/jobs/job-details?JobID=279728029&Team=231361273"
 ])assert.equal(nav(link,"Retail Merchandising Intern"),false,link);
});
test("individual positions are distinct from proven corporate navigation",()=>{
 const pages=[
 ["https://jobs.pradagroup.com/miumiu.com","miumiu.com"],
 ["https://jobs.pradagroup.com/www.pradagroup.com","www.pradagroup.com"],
 ["https://jobs.valentino.com/?q=&sortColumn=referencedate&sortDirection=desc","$"+"{i+1}"],
 ["https://careers.pvh.com/us/en/search-results","Search Jobs"],
 ["https://careers.otb.net/search/","Search all jobs"],
 ["https://tapestry.wd108.myworkdayjobs.com/Tapestry_Careers","View all jobs"],
 ["https://richemont.wd3.myworkdayjobs.com/en-US/richemont/jobAlerts","$"+"{labels.jobAlerts}"]
 ];
 for(const [url,title] of pages)assert.equal(nav(url,title),true,url);
});
test("historical HTML entities duplicate one other candidate, not a new vacancy",()=>{
 const url="https://careers.otb.net/job/Milano-Personnel-Administration-&-Payroll-Specialist/1373794257/";
 const legacy="https://careers.otb.net/job/Milano-Personnel-Administration-&amp;-Payroll-Specialist/1373794257/";
 assert.equal(norm(legacy),url);
 assert.deepEqual(classify([
  {id:1,listing_url:legacy,title_hint:"Personnel Administration & Payroll Specialist"},
  {id:2,listing_url:url,title_hint:"Personnel Administration & Payroll Specialist"},
  {id:3,listing_url:"https://careers.otb.net/job/Milano-Legal-Intern/1375114257/",title_hint:"Legal Intern"}
 ]),[{id:1,reason:"legacy_html_entity_duplicate",canonical_candidate_id:2}]);
});
