import test from "node:test";
import assert from "node:assert/strict";
import {isActionablePreviewJob} from "../job-actionability.mjs";
const now=Date.parse("2026-11-16T18:00:00Z");
const cutoff=Date.parse("2026-10-27T00:00:00Z");
const valid={id:"a",state:"active_verified",published_at:"2026-11-10T00:00:00Z",first_seen_at:"2026-11-11T00:00:00Z",last_verified_at:"2026-11-16T17:00:00Z",canonical_title:"Buying Intern"};
test("new, truly verified opportunities remain available",()=>{
 assert.equal(isActionablePreviewJob(valid,cutoff,now),true);
});
test("published a month ago and verified today is STILL OLD",()=>{
 assert.equal(isActionablePreviewJob({...valid,published_at:"2026-10-01T00:00:00Z",last_verified_at:"2026-11-16T17:00:00Z"},cutoff,now),false);
});
test("when published_at is absent, use first_seen_at rather than recent verification",()=>{
 assert.equal(isActionablePreviewJob({...valid,published_at:null,first_seen_at:"2026-11-05T00:00:00Z"},cutoff,now),true);
 assert.equal(isActionablePreviewJob({...valid,published_at:null,first_seen_at:"2026-10-01T00:00:00Z"},cutoff,now),false);
});
test("unverified, future-verified, expired and quarantined postings stay hidden",()=>{
 assert.equal(isActionablePreviewJob({...valid,last_verified_at:null},cutoff,now),false);
 assert.equal(isActionablePreviewJob({...valid,last_verified_at:"2026-10-01T00:00:00Z"},cutoff,now),false);
 assert.equal(isActionablePreviewJob({...valid,last_verified_at:"2027-01-01T00:00:00Z"},cutoff,now),false);
 assert.equal(isActionablePreviewJob({...valid,state:"stale_possible"},cutoff,now),false);
 assert.equal(isActionablePreviewJob({...valid,metadata:{quality_quarantine:{reason:"duplicate"}}},cutoff,now),false);
 assert.equal(isActionablePreviewJob({...valid,canonical_title:"TEMPLATE STORE [INSERIRE BRAND]"},cutoff,now),false);
});
