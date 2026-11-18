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
 assert.equal(delay({...s,consecutive_failures:10}),1440);
});
test("permanently broken feeds are retried weekly without disabling them",()=>{
 for(const error of ["HTTP 404","HTTP 403","HTTP 410","No RSS or Atom document"]){
  const s={last_error:error,consecutive_failures:50,last_scan_at:"2026-11-17T15:00:00Z"};
  assert.equal(delay(s),10080);
  assert.equal(scan(s,now+6*86400000),false);
  assert.equal(scan(s,now+7*86400000),true);
 }
 assert.equal(delay({last_error:"HTTP 404",consecutive_failures:1}),0);
});
test("isolated content or timeout failures do not permanently disable RSS sources",()=>{
 assert.equal(delay({consecutive_failures:1,last_error:"Timeout"}),0);
 assert.equal(delay({consecutive_failures:3,last_error:"Timeout"}),90);
 assert.equal(scan({consecutive_failures:19,last_error:"HTTP 500",last_scan_at:null},now),true);
});
test("choose due publishers without overloading the same feed host",()=>{
 const sources=[...Array.from({length:10},(_,i)=>({id:"g"+i,feed_url:"https://news.google.com/rss/search?q="+i,consecutive_failures:0})),
 ...Array.from({length:10},(_,i)=>({id:"r"+i,feed_url:"https://publisher"+i+".example/rss",consecutive_failures:0}))];
 const r=choose(sources,12,now);
 assert.equal(r.due.length,12);
 assert.equal(r.due.filter(x=>x.id.startsWith("g")).length,2);
 assert.equal(r.hostLimitedSkipped,8);
});
test("backoff skips bad feeds without stalling healthy RSS publishers",()=>{
 const rss=[{id:"bad",feed_url:"https://bad.example/rss",last_error:"HTTP 429",last_scan_at:"2026-11-17T15:00:00Z",consecutive_failures:2},
 ...Array.from({length:19},(_,i)=>({id:String(i),feed_url:"https://publisher"+i+".example/rss",consecutive_failures:0}))];
 const r=choose(rss,12,now);
 assert.equal(r.due.length,12);
 assert.equal(r.backoffSkipped,1);
 assert.ok(!r.due.some(x=>x.id==="bad"));
});
