import test from "node:test";
import assert from "node:assert/strict";
import {isFreshActionable,chooseUniqueJobs,freshnessCutoff,officialKeringLocaleIdentity} from "./recommendation-guard.mjs";
const now=Date.parse("2026-11-16T15:00:00Z"),cutoff=Date.parse("2026-10-27T00:00:00Z");
const row={id:"one",company_id:"a",requisition_id:"123",canonical_title:"Buying Intern",city:"Milano",state:"active_verified",published_at:"2026-11-08T00:00:00Z",first_seen_at:"2026-11-08T00:00:00Z",last_verified_at:"2026-11-16T10:00:00Z",description:"official"};
test("20 day limit is based on real publication, not refreshed verification",()=>{assert.equal(isFreshActionable({...row,published_at:"2026-09-24T00:00:00Z"},cutoff,now),false)});
test("undated jobs use first seen, never fabricated publication dates",()=>{assert.equal(isFreshActionable({...row,published_at:null},cutoff,now),true);assert.equal(isFreshActionable({...row,published_at:null,first_seen_at:"2026-09-24T00:00:00Z"},cutoff,now),false)});
test("unverified and stale jobs cannot be recommended",()=>{assert.equal(isFreshActionable({...row,last_verified_at:"2026-11-01T00:00:00Z"},cutoff,now),false);assert.equal(isFreshActionable({...row,state:"stale_possible"},cutoff,now),false)});
test("official requisition dedupes to earliest existing canonical listing",()=>{const other={...row,id:"two",first_seen_at:"2026-11-09T00:00:00Z"};const out=chooseUniqueJobs([other,row],cutoff,now);assert.deepEqual(out.jobs.map(x=>x.id),["one"]);assert.deepEqual(out.duplicateIds,["two"])});
test("requisition IDs are never merged across companies",()=>{assert.equal(chooseUniqueJobs([row,{...row,company_id:"b",id:"other"}],cutoff,now).jobs.length,2)});
test("tracking parameters are ignored but distinct role titles remain distinct",()=>{const left={...row,requisition_id:null,primary_apply_url:"https://example.com/job?oga=true"};const right={...left,id:"two",primary_apply_url:"https://example.com/job"};assert.equal(chooseUniqueJobs([left,right],cutoff,now).jobs.length,1);assert.equal(chooseUniqueJobs([left,{...right,canonical_title:"Manager"}],cutoff,now).jobs.length,2)});

test("shared official SmartRecruiters job is one vacancy across sibling brand labels",()=>{
 const url="https://jobs.smartrecruiters.com/MaxMaraFashionGroup/744000154069439-sales-assistant-intrend-cesano-boscone?oga=true";
 const a={...row,id:"max-mara",company_id:"maxmara",requisition_id:"744000154069439",primary_apply_url:url,first_seen_at:"2026-11-09T10:00:00Z"};
 const b={...a,id:"sportmax",company_id:"sportmax",first_seen_at:"2026-11-09T12:00:00Z"};
 const out=chooseUniqueJobs([b,a],cutoff,now);
 assert.deepEqual(out.jobs.map(x=>x.id),["max-mara"]);
 assert.deepEqual(out.duplicateIds,["sportmax"]);
});
test("unrelated SmartRecruiters boards with matching numeric IDs are separate",()=>{
 const a={...row,id:"one-a",company_id:"a",primary_apply_url:"https://jobs.smartrecruiters.com/CompanyA/744000154069439-role",requisition_id:"744000154069439"};
 const b={...a,id:"one-b",company_id:"b",primary_apply_url:"https://jobs.smartrecruiters.com/CompanyB/744000154069439-role"};
 assert.equal(chooseUniqueJobs([a,b],cutoff,now).jobs.length,2);
});
test("generic company career links never merge independent brand vacancies",()=>{
 const a={...row,id:"one-a",company_id:"a",primary_apply_url:"https://www.maxmarafashiongroup.com/join-us",requisition_id:"123"};
 const b={...a,id:"one-b",company_id:"b"};
 assert.equal(chooseUniqueJobs([a,b],cutoff,now).jobs.length,2);
});

test("20 days is a rolling limit, not midnight of the 20th calendar day",()=>{
 const nowMs=Date.parse("2026-11-17T13:00:00Z");
 const limit=Date.parse(freshnessCutoff(nowMs));
 assert.equal(limit,Date.parse("2026-10-28T13:00:00Z"));
 const old={...row,published_at:"2026-10-28T00:00:00Z",last_verified_at:"2026-11-17T12:00:00Z"};
 assert.equal(isFreshActionable(old,limit,nowMs),false);
 assert.equal(isFreshActionable({...old,published_at:"2026-10-28T13:00:00Z"},limit,nowMs),true);
});

test("official Lever creation date prevents old postings looking new after discovery",()=>{
 const today=Date.parse("2026-11-17T15:00:00Z");
 const limit=Date.parse(freshnessCutoff(today));
 const freshFirstObservation={...row,published_at:null,first_seen_at:"2026-11-16T10:00:00Z",last_verified_at:"2026-11-17T12:00:00Z"};
 const mulberry={...freshFirstObservation,metadata:{provider_creation_at:"2026-10-12T12:30:37.234Z"}};
 const vestiaire={...freshFirstObservation,metadata:{provider_creation_at:"2026-10-15T08:24:40.954Z"}};
 const veepee={...freshFirstObservation,metadata:{provider_creation_at:"2026-11-17T09:28:26.870Z"}};
 assert.equal(isFreshActionable(mulberry,limit,today),false);
 assert.equal(isFreshActionable(vestiaire,limit,today),false);
 assert.equal(isFreshActionable(veepee,limit,today),true);
 assert.equal(chooseUniqueJobs([mulberry,vestiaire,veepee],limit,today).jobs.length,1);
});

test("same Gucci role on Italian/French official Kering URLs appears only once",()=>{
 const italian={...row,id:"official-it",company_id:"gucci",requisition_id:"R173178",
  canonical_title:"GUCCI MRTW Collection Merchandising Intern",
  primary_apply_url:"https://www.kering.com/it/talenti/offerte-di-lavoro/europe/gucci-mrtw-collection-merchandising-intern/",
  description:"Intern helps merchandising product assortment and inventory reporting. ".repeat(8),
  first_seen_at:"2026-11-09T00:00:00Z"};
 const french={...italian,id:"localized-fr",requisition_id:null,
  canonical_title:"MRTW Collection Merchandising Intern",
  primary_apply_url:"https://www.kering.com/fr/talent/offres-d-emploi/europe/gucci-mrtw-collection-merchandising-intern/",
  first_seen_at:"2026-11-08T00:00:00Z"};
 assert.equal(officialKeringLocaleIdentity(italian),officialKeringLocaleIdentity(french));
 const result=chooseUniqueJobs([french,italian],cutoff,now);
 assert.deepEqual(result.jobs.map(x=>x.id),["official-it"]);
 assert.deepEqual(result.duplicateIds,["localized-fr"]);
});
test("Kering matching URL slugs are NOT enough without matching full requirements",()=>{
 const base={...row,id:"a",company_id:"gucci",requisition_id:null,
 primary_apply_url:"https://www.kering.com/it/talenti/offerte-di-lavoro/europe/gucci-mrtw-collection-merchandising-intern/",
 description:"A distinct job with important sample management duties. ".repeat(10)};
 const fr={...base,id:"b",primary_apply_url:"https://www.kering.com/fr/talent/offres-d-emploi/europe/gucci-mrtw-collection-merchandising-intern/",
 description:"A different job demanding 5 years specialized experience. ".repeat(10)};
 assert.equal(chooseUniqueJobs([base,fr],cutoff,now).jobs.length,2);
 assert.equal(chooseUniqueJobs([base,{...fr,description:base.description,requisition_id:"R1"},{...base,id:"c",requisition_id:"R2"}],cutoff,now).jobs.length,2);
});
test("generic Kering category, outside host and unrelated brands cannot dedupe",()=>{
 const base={...row,id:"a",company_id:"gucci",primary_apply_url:"https://www.kering.com/fr/talent/offres-d-emploi/europe/gucci-mrtw-collection-merchandising-intern/",
 description:"This is a known genuine merchandising role. ".repeat(9)};
 assert.equal(officialKeringLocaleIdentity({...base,primary_apply_url:"https://fake-kering.example/fr/talent/offres-d-emploi/europe/gucci-mrtw-collection-merchandising-intern/"}),null);
 assert.equal(officialKeringLocaleIdentity({...base,primary_apply_url:"https://www.kering.com/fr/talent/offres-d-emploi/"}),null);
 assert.equal(chooseUniqueJobs([base,{...base,id:"b",company_id:"brioni"}],cutoff,now).jobs.length,2);
});
