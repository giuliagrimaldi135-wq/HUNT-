import test from "node:test";
import assert from "node:assert/strict";
import {sourceRetryDelayMinutes,shouldScanSource,chooseCareerScanBatch} from "./source-health-policy.mjs";
test("quickly rechecks single transient errors",()=>assert.equal(sourceRetryDelayMinutes(1),0));
test("increasing failures receive bounded adaptive retry windows",()=>{
 assert.equal(sourceRetryDelayMinutes(3),90);
 assert.equal(sourceRetryDelayMinutes(6),360);
 assert.equal(sourceRetryDelayMinutes(12),1440);
});
test("degraded sources retry again after cooldown automatically",()=>{
 const source={consecutive_failures:6,last_scan_at:"2026-11-16T14:00:00Z"};
 assert.equal(shouldScanSource(source,Date.parse("2026-11-16T17:59:00Z")),false);
 assert.equal(shouldScanSource(source,Date.parse("2026-11-16T20:00:00Z")),true);
});
test("never keeps sources in permanent quarantine",()=>assert.equal(shouldScanSource({consecutive_failures:99,last_scan_at:null}),true));

test("spreads official career scans across hostnames while preserving backlog",()=>{
 const candidates=[
  ...Array.from({length:10},(_,i)=>({id:"otb"+i,base_url:"https://careers.otb.net/go/"+i,consecutive_failures:0})),
  ...Array.from({length:8},(_,i)=>({id:"other"+i,base_url:"https://jobs"+i+".example.com/jobs",consecutive_failures:0}))
 ];
 const result=chooseCareerScanBatch(candidates,6,2,Date.parse("2026-11-18T12:00:00Z"));
 assert.equal(result.dueSources.length,6);
 assert.equal(result.dueSources.filter(s=>s.id.startsWith("otb")).length,2);
 assert.equal(result.domainDeferred,8);
});
test("backoff does not starve independent career domains",()=>{
 const now=Date.parse("2026-11-18T12:00:00Z");
 const sources=[
  {id:"blocked",base_url:"https://bad.example/jobs",consecutive_failures:12,last_scan_at:"2026-11-18T11:00:00Z"},
  {id:"ready",base_url:"https://good.example/jobs",consecutive_failures:0,last_scan_at:null}
 ];
 const result=chooseCareerScanBatch(sources,18,2,now);
 assert.deepEqual(result.dueSources.map(s=>s.id),["ready"]);
 assert.equal(result.backoffSkipped,1);
});

test("accessible pages with zero listings have a six-hour cooldown, never permanent quarantine",()=>{
 const base={health_status:"reachable_no_listings",consecutive_failures:0,last_scan_at:"2026-11-19T00:00:00Z"};
 assert.equal(shouldScanSource(base,Date.parse("2026-11-19T02:00:00Z")),false);
 assert.equal(shouldScanSource(base,Date.parse("2026-11-19T06:01:00Z")),true);
 assert.equal(shouldScanSource({...base,last_scan_at:null},Date.parse("2026-11-19T02:00:00Z")),true);
 assert.equal(shouldScanSource({...base,health_status:"healthy"},Date.parse("2026-11-19T02:00:00Z")),true);
});
test("source discovery never triggers a full matching refresh on every scan",async()=>{
 const {readFileSync}=await import("node:fs");
 const {fileURLToPath}=await import("node:url");
 const path=new URL("./index.ts",import.meta.url);
 const code=readFileSync(fileURLToPath(path),"utf8");
 assert.equal(code.includes('functions/v1/hunt-match-refresh'),false);
});
