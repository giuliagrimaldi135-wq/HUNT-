import test from "node:test";
import assert from "node:assert/strict";
import {isEligibleFeedVacancy} from "./eligibility.ts";
const now=Date.parse("2026-11-16T18:00:00Z");
const good={state:"active_verified",published_at:"2026-11-10T00:00:00Z",first_seen_at:"2026-11-15T00:00:00Z",last_verified_at:"2026-11-16T17:00:00Z",canonical_title:"Retail Training Intern",description:"Official duties and requirements. ".repeat(15)};
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

test("provider creation date blocks old Lever roles even if first seen yesterday",()=>{
 const current=Date.parse("2026-11-17T15:00:00Z");
 const base={...good,published_at:null,first_seen_at:"2026-11-16T12:00:00Z",last_verified_at:"2026-11-17T12:00:00Z"};
 assert.equal(isEligibleFeedVacancy({...base,metadata:{provider_creation_at:"2026-10-15T08:24:40.954Z"}},current),false);
 assert.equal(isEligibleFeedVacancy({...base,metadata:{provider_creation_at:"2026-11-17T09:28:26.870Z"}},current),true);
});
test("unusable or thin descriptions never appear in a high-confidence feed",()=>{
 assert.equal(isEligibleFeedVacancy({...good,description:"No details"},now),false);
});
test("rolling 20-day rule does not include earlier hours from calendar day 20",()=>{
 assert.equal(isEligibleFeedVacancy({...good,published_at:"2026-10-27T00:00:00Z"},now),false);
});
