import test from "node:test";
import assert from "node:assert/strict";
import {deduplicatePublicJobs,postingIdentity} from "./radar-dedup.mjs";
const base={title:"MRTW Collection Merchandising Intern",brand:"Gucci",city:"Milano",last_verified_at:"2026-11-19T14:00:00Z"};
test("localized Kering official listings with identical requisition slug become one",()=>{
 const fr={...base,url:"https://www.kering.com/fr/talent/offres-d-emploi/europe/gucci-mrtw-collection-merchandising-intern/"};
 const it={...base,url:"https://www.kering.com/it/talenti/offerte-di-lavoro/europe/gucci-mrtw-collection-merchandising-intern/"};
 assert.equal(postingIdentity(fr),postingIdentity(it));
 assert.equal(deduplicatePublicJobs([fr,it]).length,1);
 assert.equal(deduplicatePublicJobs([fr,it])[0].url,it.url);
});
test("different official requisition IDs MUST remain separate, even with identical titles",()=>{
 const a={...base,url:"https://jobs.pradagroup.com/job/Milano-Retail-Training-Intern/1278922801/"};
 const b={...base,url:"https://jobs.pradagroup.com/job/Milano-Retail-Training-Intern/1457734833/"};
 assert.equal(deduplicatePublicJobs([a,b]).length,2);
});
test("the same job URL with tracking query is still only one vacancy",()=>{
 const a={...base,url:"https://jobs.lever.co/brand/abc?utm_source=linkedin"};
 const b={...base,url:"https://jobs.lever.co/brand/abc"};
 assert.equal(deduplicatePublicJobs([a,b]).length,1);
});
