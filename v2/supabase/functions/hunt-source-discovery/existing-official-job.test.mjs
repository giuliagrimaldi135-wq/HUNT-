import test from "node:test";
import assert from "node:assert/strict";
import {eligibleAlreadyVerifiedJob,postedWithinTwentyDays} from "./existing-official-job.mjs";
const now=Date.parse("2026-11-17T15:00:00.000Z");
const url="https://job-boards.greenhouse.io/quince/jobs/5152323008";
const good={id:"job-1",state:"active_verified",primary_apply_url:url,
 first_seen_at:"2026-11-16T00:00:00Z",published_at:null,
 last_verified_at:"2026-11-17T14:00:00Z",description:"Actual duties and mandatory qualifications. ".repeat(12)};
test("existing verified greenhouse vacancy can close duplicate candidate without another publication claim",()=>{
 assert.equal(eligibleAlreadyVerifiedJob(good,url,now),true);
 assert.equal(good.published_at,null);
});
test("never reconcile unofficial, wrong link, thin description or unverified jobs",()=>{
 assert.equal(eligibleAlreadyVerifiedJob({...good,state:"active_likely"},url,now),false);
 assert.equal(eligibleAlreadyVerifiedJob(good,url+"?some-query",now),false);
 assert.equal(eligibleAlreadyVerifiedJob({...good,description:"Buy things"},url,now),false);
 assert.equal(eligibleAlreadyVerifiedJob({...good,last_verified_at:"2026-11-01"},url,now),false);
});
test("posting age is rolling 20 days to the minute, not floor(days)",()=>{
 assert.equal(postedWithinTwentyDays("2026-10-28T15:00:00.000Z",now),true);
 assert.equal(postedWithinTwentyDays("2026-10-28T14:59:59.999Z",now),false);
 assert.equal(postedWithinTwentyDays("2026-11-18T15:00:00.000Z",now),false);
 assert.equal(eligibleAlreadyVerifiedJob({...good,published_at:"2026-10-28T14:00:00Z"},url,now),false);
});
