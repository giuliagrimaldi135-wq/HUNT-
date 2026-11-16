import test from "node:test";
import assert from "node:assert/strict";
import {isRealCareerPosting,trustedSmartRecruitersIdentity,isEligibleForStaleTransition} from "./ats-ingestion-guard.mjs";
test("rejects actual MaxMaraFashionGroup job template",()=>{
 assert.equal(isRealCareerPosting("TEMPLATE STORE - SALES ASSISTANT [INSERIRE BRAND] - [INSERIRE CITTÀ/LUOGO]"),false);
 assert.equal(isRealCareerPosting("PRADA Retail Training Intern"),true);
 assert.equal(isRealCareerPosting("Retail Visual Merchandising Back Office Specialist - Maternity Cover"),true);
 assert.equal(isRealCareerPosting("Template Designer"),true);
});
test("cross-source dedupe must prove exact official SmartRecruiters board and requisition",()=>{
 const source={source_family:"ats_smartrecruiters",config:{board:"MaxMaraFashionGroup"}};
 const item={id:"744000161777785",url:"https://jobs.smartrecruiters.com/MaxMaraFashionGroup/744000161777785-sales-assistant-fashion-market"};
 assert.deepEqual(trustedSmartRecruitersIdentity(source,item),{board:"MaxMaraFashionGroup",id:item.id,postingsUrlPrefix:"https://jobs.smartrecruiters.com/MaxMaraFashionGroup/"});
 assert.equal(trustedSmartRecruitersIdentity(source,{...item,url:"https://jobs.smartrecruiters.com/DifferentGroup/744000161777785-sales"}),null);
 assert.equal(trustedSmartRecruitersIdentity(source,{...item,id:"bad"}),null);
 assert.equal(trustedSmartRecruitersIdentity(source,{...item,url:"https://jobscareers.example.com/job/744000161777785"}),null);
});
test("stale marking requires 72 hours since last evidence",()=>{
 const t=Date.parse("2026-11-16T16:00:00Z");
 assert.equal(isEligibleForStaleTransition("2026-11-16T15:45:00Z",t),false);
 assert.equal(isEligibleForStaleTransition("2026-11-13T15:59:00Z",t),true);
 assert.equal(isEligibleForStaleTransition(null,t),false);
});
