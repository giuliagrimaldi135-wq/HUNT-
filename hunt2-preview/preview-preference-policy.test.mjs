import test from "node:test";
import assert from "node:assert/strict";
import {requiresSeniorExperience,safeWithoutCvJob,outreachLeadForTargets,filterOutreachForMember} from "./preview-preference-policy.mjs";
const job={role_family:"HR & Talent",canonical_title:"HR Recruiting Internship",seniority:"internship",
  description:"Assisting the recruitment and HR team with applicant scheduling, reporting, onboarding and HR projects. ".repeat(5),
  primary_apply_url:"https://example.com/jobs/123",metadata:{}};
test("intern without CV can explore entry jobs in selected area",()=>{
 assert.equal(safeWithoutCvJob(job,["HR & Talent"],"internship"),true);
 assert.equal(safeWithoutCvJob(job,["Buying"],"internship"),false);
 assert.equal(safeWithoutCvJob({...job,metadata:{hard_requirements:{min_years_experience:5}}},["HR & Talent"]),false);
 assert.equal(safeWithoutCvJob({...job,description:"short"},["HR & Talent"]),false);
});
test("senior title never becomes a recommendation just because stored seniority is entry_level",()=>{
 for(const title of ["KERING EYEWEAR Senior HR Business Partner","Senior HR Controller","HR Manager","Head of Talent","Director HR"]){
  assert.equal(requiresSeniorExperience(title,"entry_level"),true,title);
  assert.equal(safeWithoutCvJob({...job,canonical_title:title,seniority:"entry_level"},["HR & Talent"]),false,title);
 }
 assert.equal(safeWithoutCvJob({...job,canonical_title:"HR & Office Manager internship"},["HR & Talent"]),true);
});
test("curated brand contact lists are different for different selected careers",()=>{
 const leads=[{brand:"Fashion product brand",area:"Retail Merchandising / Product / Buying"},
 {brand:"People",area:"HR & Talent"},{brand:"Unknown",area:"Da valutare sul tuo profilo"}];
 assert.deepEqual(filterOutreachForMember(leads,["HR & Talent"]).map(x=>x.brand),["People"]);
 assert.deepEqual(filterOutreachForMember(leads,["Merchandising"]).map(x=>x.brand),["Fashion product brand"]);
 assert.equal(outreachLeadForTargets(leads[0],["HR & Talent"]),false);
 assert.deepEqual(filterOutreachForMember(leads,[]),[]);
});
