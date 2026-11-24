import test from "node:test";
import assert from "node:assert/strict";
import {stableStringify,jobFingerprint,userFingerprint,lightJob,planEvaluation,nextState,priorityScore,duplicateCandidateIds,validState,STATE_FORMAT} from "./incremental-plan.mjs";

const ENGINE="engine-test";
const now=Date.parse("2026-11-24T10:00:00Z");
const state=(o={})=>({format:STATE_FORMAT,engine:ENGINE,full_at:new Date(now-3600000).toISOString(),users:{u1:"a"},jobs:{j1:"f1",j2:"f2"},matches:["u1|j1"],...o});
const base={engineVersion:ENGINE,nowMs:now,uniqueJobIds:["j1","j2"],jobFps:new Map([["j1","f1"],["j2","f2"]]),userFps:{u1:"a"},storedMatchKeys:["u1|j1"],digestsAvailable:true};

test("stable JSON ignores key order",()=>{
  assert.equal(stableStringify({b:1,a:{d:2,c:[3,{f:1,e:2}]}}),stableStringify({a:{c:[3,{e:2,f:1}],d:2},b:1}));
});

test("job fingerprint changes with description digest and evaluation inputs, not with verification time",async()=>{
  const job={canonical_title:"Buying Intern",role_family:"Buying",city:"Milan",last_verified_at:"2026-11-24",metadata:{hard_requirements:{analyzer_version:"eligibility-v2",min_years_experience:null,required_languages:[],specialist_signals:[],analyzed_at:"x"}}};
  const fp=await jobFingerprint(job,"md5a");
  assert.equal(fp,await jobFingerprint({...job,last_verified_at:"2026-11-25",vacancy_confidence:10},"md5a"));
  assert.equal(fp,await jobFingerprint({...job,metadata:{hard_requirements:{...job.metadata.hard_requirements,analyzed_at:"y"}}},"md5a"));
  assert.notEqual(fp,await jobFingerprint(job,"md5b"));
  assert.notEqual(fp,await jobFingerprint({...job,canonical_title:"Senior Buyer"},"md5a"));
  assert.notEqual(fp,await jobFingerprint({...job,city:"Paris"},"md5a"));
  assert.notEqual(fp,await jobFingerprint({...job,metadata:{hard_requirements:{...job.metadata.hard_requirements,min_years_experience:5}}},"md5a"));
});

test("user fingerprint changes with CV, preferences, personalization and seniority",async()=>{
  const input={pref:{primary_role_families:["Buying"],preferred_locations:["Milan"]},profile:{seniority:"internship"},personal:{interest_areas:["x"],avoid_role_traits:[]},cvs:[{id:"c1",parsed_profile:{tools:["Excel"]},is_default:true,active:true,updated_at:"t1"}]};
  const fp=await userFingerprint(input);
  assert.equal(fp,await userFingerprint(structuredClone(input)));
  assert.notEqual(fp,await userFingerprint({...input,pref:{...input.pref,preferred_locations:["Paris"]}}));
  assert.notEqual(fp,await userFingerprint({...input,profile:{seniority:"junior"}}));
  assert.notEqual(fp,await userFingerprint({...input,personal:{...input.personal,avoid_role_traits:["store_sales"]}}));
  assert.notEqual(fp,await userFingerprint({...input,cvs:[{...input.cvs[0],parsed_profile:{tools:["Excel","SQL"]}}]}));
  assert.notEqual(fp,await userFingerprint({...input,cvs:[...input.cvs,{id:"c2",parsed_profile:{},active:true}]}));
});

test("light rows expose only the two metadata keys and are flagged",()=>{
  const j=lightJob({id:"j",provider_creation_at:"2026-09-01",hard_requirements:{a:1}});
  assert.deepEqual(j.metadata,{provider_creation_at:"2026-09-01",hard_requirements:{a:1}});
  assert.equal(j.__light,true);
  assert.deepEqual(lightJob({id:"j",provider_creation_at:null,hard_requirements:null}).metadata,{});
});

test("plan: unchanged data evaluates nothing",()=>{
  const p=planEvaluation({...base,state:state()});
  assert.equal(p.mode,"incremental");
  assert.equal(p.evaluate.size,0);
});

test("plan: falls back to FULL whenever certainty is missing",()=>{
  assert.equal(planEvaluation({...base,state:null}).reason,"no_valid_state");
  assert.equal(planEvaluation({...base,state:state(),digestsAvailable:false}).reason,"digest_unavailable");
  assert.equal(planEvaluation({...base,state:state({engine:"old"})}).reason,"no_valid_state");
  assert.equal(planEvaluation({...base,state:state({full_at:new Date(now-25*3600000).toISOString()})}).reason,"daily_safety_refresh");
  assert.equal(planEvaluation({...base,state:state(),userFps:{u1:"b"}}).reason,"user_inputs_changed");
  assert.equal(planEvaluation({...base,state:state(),userFps:{u1:"a",u2:"c"}}).reason,"user_inputs_changed");
  assert.equal(planEvaluation({...base,state:state(),userFps:{}}).reason,"user_inputs_changed");
  assert.equal(planEvaluation({...base,state:state(),forceFull:true}).reason,"requested");
  assert.equal(planEvaluation({...base,state:state(),forceFull:true}).evaluate.size,2);
});

test("plan: new, changed and diverged vacancies are evaluated",()=>{
  const p=planEvaluation({...base,state:state(),uniqueJobIds:["j1","j2","j3"],jobFps:new Map([["j1","f1"],["j2","CHANGED"],["j3","f3"]])});
  assert.deepEqual([...p.evaluate].sort(),["j2","j3"]);
  const missing=planEvaluation({...base,state:state(),storedMatchKeys:[]});
  assert.deepEqual([...missing.evaluate],["j1"]);
  const unexpected=planEvaluation({...base,state:state(),storedMatchKeys:["u1|j1","u1|j2"]});
  assert.deepEqual([...unexpected.evaluate],["j2"]);
});

test("next state drops vacancies that left the actionable set and keeps unevaluated history",()=>{
  const prev=state();
  const s=nextState({previous:prev,mode:"incremental",engineVersion:ENGINE,nowMs:now,uniqueJobIds:["j1","j3"],jobFps:new Map([["j1","f1"],["j3","f3"]]),userFps:{u1:"a"},evaluated:new Set(["j3"]),matchedKeys:new Set(["u1|j3"])});
  assert.deepEqual(s.jobs,{j1:"f1",j3:"f3"});
  assert.deepEqual(s.matches,["u1|j1","u1|j3"]);
  assert.equal(s.full_at,prev.full_at);
  assert.ok(validState(s,ENGINE));
  const full=nextState({previous:null,mode:"full",engineVersion:ENGINE,nowMs:now,uniqueJobIds:["j1"],jobFps:new Map([["j1","f9"]]),userFps:{u1:"a"},evaluated:new Set(["j1"]),matchedKeys:new Set()});
  assert.deepEqual(full.matches,[]);
  assert.equal(full.full_at,new Date(now).toISOString());
});

test("priority formula is unchanged",()=>{
  const DAY=86400000;
  const legacy=(score,conf,pub,n)=>{const age=Math.max(0,Math.floor((n-new Date(pub).getTime())/DAY));const fresh=Math.max(20,100-age*4);return Math.min(100,Math.round(score*.7+(conf||70)*.2+fresh*.1))};
  for(const [s,c,a] of [[80,90,0],[67,null,3.5],[100,100,40],[72,60,19.99]]){
    const pub=new Date(now-a*DAY).toISOString();
    assert.equal(priorityScore(s,c,pub,now),legacy(s,c,pub,now));
  }
});

test("duplicate candidates: only jobs sharing an identity need descriptions",()=>{
  const iso=new Date(now-86400000).toISOString();
  const mk=(id,o={})=>({id,company_id:"c",canonical_title:"T"+id,city:"Milan",primary_apply_url:"https://x/"+id,state:"active_verified",published_at:iso,first_seen_at:iso,last_verified_at:iso,metadata:{},...o});
  const rows=[mk("a",{requisition_id:"R1"}),mk("b",{requisition_id:"R1"}),mk("c"),mk("d",{state:"stale_possible",requisition_id:"R1"})];
  assert.deepEqual([...duplicateCandidateIds(rows,now-20*86400000,now)].sort(),["a","b"]);
});

test("skip only with identical input digest and a recent full evaluation",async()=>{
  const {canSkipRun}=await import("./incremental-plan.mjs");
  const s=state({token:"T1"});
  assert.equal(canSkipRun({state:s,engineVersion:ENGINE,token:"T1",nowMs:now}),true);
  assert.equal(canSkipRun({state:s,engineVersion:ENGINE,token:"T2",nowMs:now}),false);
  assert.equal(canSkipRun({state:s,engineVersion:ENGINE,token:null,nowMs:now}),false);
  assert.equal(canSkipRun({state:state(),engineVersion:ENGINE,token:"T1",nowMs:now}),false);
  assert.equal(canSkipRun({state:s,engineVersion:"new-engine",token:"T1",nowMs:now}),false);
  assert.equal(canSkipRun({state:s,engineVersion:ENGINE,token:"T1",nowMs:now,forceFull:true}),false);
  assert.equal(canSkipRun({state:state({token:"T1",full_at:new Date(now-25*3600000).toISOString()}),engineVersion:ENGINE,token:"T1",nowMs:now}),false);
});
