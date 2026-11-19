import test from "node:test";
import assert from "node:assert/strict";
import {validPublicJob,filteredJobs,vacancyAgeLabel,isEarly} from "./radar-policy.mjs";
const now=Date.parse("2026-11-19T15:30:00Z");
const base={brand:"Prada",title:"Retail Merchandising Intern",role:"Merchandising",level:"internship",city:"Milano",url:"https://careers.example.com/job/123",published_at:null,first_seen_at:"2026-11-18T15:30:00Z",last_verified_at:"2026-11-18T16:00:00Z"};
test("public radar only shows https official-style URLs and recently verified roles",()=>{
 assert.equal(validPublicJob(base,now),true);
 assert.equal(validPublicJob({...base,url:"javascript:alert(1)"},now),false);
 assert.equal(validPublicJob({...base,last_verified_at:"2026-10-25"},now),false);
 assert.equal(validPublicJob({...base,published_at:"2026-10-25"},now),false);
});
test("no senior HR partner for junior profile, even if wrongly tagged entry_level",()=>{
 assert.equal(isEarly({...base,title:"Senior HR Business Partner",level:"entry_level"}),false);
 assert.equal(filteredJobs([base,{...base,id:"b",title:"Senior HR Business Partner",level:"entry_level"}],{level:"early"},now).length,1);
});
test("filters search, cities, role and optional internship",()=>{
 assert.equal(filteredJobs([base],{text:"PRADA",city:"milano",role:"Merchandising",level:"internship"},now).length,1);
 assert.equal(filteredJobs([base],{text:"GUCCI"},now).length,0);
 assert.equal(filteredJobs([base],{city:"Londra"},now).length,0);
});
test("publication date is not invented when only discovery date is known",()=>{
 assert.equal(vacancyAgeLabel(base,now),"Rilevata ieri");
 assert.equal(vacancyAgeLabel({...base,published_at:"2026-11-18T10:00:00Z"},now),"Pubblicata ieri");
});
