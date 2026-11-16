import test from "node:test";
import assert from "node:assert/strict";
import {isEligibleFeedVacancy} from "./eligibility.ts";
const now=Date.parse("2026-11-16T18:00:00Z");
const good={state:"active_verified",published_at:"2026-11-10T00:00:00Z",first_seen_at:"2026-11-15T00:00:00Z",last_verified_at:"2026-11-16T17:00:00Z",canonical_title:"Retail Training Intern"};
test("qualifying real jobs are returned",()=>assert.equal(isEligibleFeedVacancy(good,now),true));
test("last_verified_at does NOT reset an old vacancy publication date",()=>{
 assert.equal(isEligibleFeedVacancy({...good,published_at:"2026-09-10T00:00:00Z"},now),false);
});
test("use first_seen_at only when posted date not provided",()=>{
 assert.equal(isEligibleFeedVacancy({...good,published_at:null,first_seen_at:"2026-11-01T00:00:00Z"},now),true);
 assert.equal(isEligibleFeedVacancy({...good,published_at:null,first_seen_at:"2026-10-01T00:00:00Z"},now),false);
});
test("never display stale, fake, quarantined, or unverified postings",()=>{
 assert.equal(isEligibleFeedVacancy({...good,state:"stale_possible"},now),false);
 assert.equal(isEligibleFeedVacancy({...good,last_verified_at:null},now),false);
 assert.equal(isEligibleFeedVacancy({...good,last_verified_at:"2026-10-01T00:00:00Z"},now),false);
 assert.equal(isEligibleFeedVacancy({...good,metadata:{quality_quarantine:{reason:"duplicate"}}},now),false);
 assert.equal(isEligibleFeedVacancy({...good,canonical_title:"TEMPLATE STORE [INSERIRE BRAND]"},now),false);
});
