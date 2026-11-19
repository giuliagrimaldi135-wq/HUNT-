import test from "node:test";
import assert from "node:assert/strict";
import {addCity,validateProfile,readyProfile,scorePreferenceJob,preferenceRecommendations,availableRoleCounts} from "./personal-radar-policy.mjs";
const now=Date.parse("2026-11-19T17:00:00Z");
const base={id:"j1",brand:"Prada",title:"Retail Merchandising Intern",role:"Merchandising",level:"internship",city:"Milano",url:"https://careers.example.com/jobs/1",published_at:"2026-11-18T10:00:00Z",first_seen_at:"2026-11-18T12:00:00Z",last_verified_at:"2026-11-19T12:00:00Z"};
const buying={...base,id:"j2",brand:"Mulberry",role:"Buying",title:"Buying Intern",city:"London"};
const senior={...base,id:"j3",title:"Senior Merchandising Manager",level:"entry_level"};
const hr={...base,id:"j4",title:"HR Intern",role:"HR & Talent"};
const profile={roles:["Merchandising","Buying"],cities:["Milano"],relocations:["Londra"],level:"early"};
test("profile must be explicitly set; never silently recommend generic jobs",()=>{
 assert.equal(readyProfile(validateProfile({})),false);
 assert.equal(preferenceRecommendations([base],{}, {now}).length,0);
 assert.equal(scorePreferenceJob(base,{},now),null);
});
test("multi cities and relocation translate local spelling without inventing CV data",()=>{
 assert.equal(preferenceRecommendations([base,buying],profile,{now}).length,2);
 const picks=preferenceRecommendations([base,buying],profile,{now});
 assert.equal(picks[0].job.id,"j1");
 assert.equal(picks[0].locationType,"city");
 assert.equal(picks[1].locationType,"relocation");
 assert.ok(picks[0].reasons.every(r=>!/CV|experience confirmed|compatib/i.test(r)));
});
test("filter exact area and reject senior titled positions despite bogus entry level",()=>{
 assert.deepEqual(preferenceRecommendations([base,senior,hr],profile,{now}).map(x=>x.job.id),["j1"]);
 assert.deepEqual(preferenceRecommendations([hr],{...profile,roles:["HR & Talent"]},{now}).map(x=>x.job.id),["j4"]);
});
test("local saved and ignored jobs do not mutate public job catalog",()=>{
 assert.equal(preferenceRecommendations([base],profile,{hidden:["j1"],now}).length,0);
 assert.equal(preferenceRecommendations([base],profile,{saved:["j1"],now})[0].saved,true);
 assert.equal(base.saved,undefined);
});
test("profile sanitization and robust manual city input",()=>{
 assert.deepEqual(addCity(["Milano"]," milano "),["Milano"]);
 assert.deepEqual(addCity(["Milano"],"Torino"),["Milano","Torino"]);
 assert.deepEqual(addCity([],"<script>"),[]);
 assert.deepEqual(validateProfile({roles:["Merchandising","fake"],cities:["Milano"],level:"invalid"}).roles,["Merchandising"]);
 assert.equal(availableRoleCounts([base,senior],now).Merchandising,1);
});
