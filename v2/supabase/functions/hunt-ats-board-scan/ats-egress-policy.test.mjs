import test from "node:test";
import assert from "node:assert/strict";
import {needsATSVerification,selectATSCatalogSlice,RECHECK_AFTER_MS} from "./ats-egress-policy.mjs";
const now=Date.parse("2026-11-19T17:00:00Z");
test("no-op listings verified less than six hours ago cause ZERO per-job database writes",()=>{
 const link={job_id:"123",active:true,last_verified_at:"2026-11-19T16:55:00Z"};
 assert.equal(needsATSVerification(link,now),false);
 assert.equal(needsATSVerification({...link,last_verified_at:"2026-11-19T10:00:00Z"},now),true);
 assert.equal(needsATSVerification({...link,active:false},now),true);
 assert.equal(needsATSVerification(null,now),true);
 assert.equal(needsATSVerification({...link,last_verified_at:"garbage"},now),true);
 assert.equal(RECHECK_AFTER_MS,6*3600000);
});
test("always check newest catalogue page entries while progressing across older pages",()=>{
 const source=Array.from({length:100},(_,i)=>({url:"https://careers.example.com/job/"+i,id:""+i}));
 const first=selectATSCatalogSlice(source,0,20,4);
 const second=selectATSCatalogSlice(source,first.nextCursor,20,4);
 assert.deepEqual(first.selected.slice(0,4).map(x=>x.id),["0","1","2","3"]);
 assert.deepEqual(second.selected.slice(0,4).map(x=>x.id),["0","1","2","3"]);
 assert.equal(first.nextCursor,16);
 assert.equal(second.nextCursor,32);
 assert.ok(second.selected.some(x=>x.id==="16"));
 assert.ok(second.selected.length<=20);
});
test("small and empty official boards do not cause infinite catalog offset loops",()=>{
 const small=Array.from({length:3},(_,i)=>({url:"https://example.com/"+i,id:""+i}));
 const r=selectATSCatalogSlice(small,90,12,4);
 assert.equal(r.selected.length,3);
 assert.ok(r.nextCursor>=0&&r.nextCursor<=3);
 assert.deepEqual(selectATSCatalogSlice([]),{selected:[],nextCursor:0,wrapped:true});
});
