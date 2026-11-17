import test from "node:test";
import assert from "node:assert/strict";
import {newsRetryDelayMinutes as delay,shouldScanNewsSource as scan,chooseDueNewsSources as choose} from "./news-source-backoff.mjs";
const now=Date.parse("2026-11-17T16:00:00Z");
test("HTTP 429 quota errors back off for at least three hours",()=>{
 const s={last_error:"HTTP 429",consecutive_failures:1,last_scan_at:"2026-11-17T15:50:00Z"};
 assert.equal(delay(s),180);
 assert.equal(scan(s,now),false);
 assert.equal(scan(s,now+180*60000),true);
 assert.equal(delay({...s,consecutive_failures:3}),360);
 assert.equal(delay({...s,consecutive_failures:4}),720);
});
test("isolated content or timeout failures do not permanently disable RSS sources",()=>{
 assert.equal(delay({consecutive_failures:1,last_error:"Timeout"}),0);
 assert.equal(delay({consecutive_failures:3,last_error:"Timeout"}),90);
 assert.equal(scan({consecutive_failures:19,last_error:"HTTP 500",last_scan_at:null},now),true);
});
test("choose 12 independent sources, skip 429 without stalling healthy RSS publishers",()=>{
 const rss=[{id:"bad",last_error:"HTTP 429",last_scan_at:"2026-11-17T15:00:00Z",consecutive_failures:2},
 ...Array.from({length:19},(_,i)=>({id:String(i),consecutive_failures:0}))];
 const r=choose(rss,12,now);
 assert.equal(r.due.length,12);
 assert.equal(r.backoffSkipped,1);
 assert.ok(!r.due.some(x=>x.id==="bad"));
});
