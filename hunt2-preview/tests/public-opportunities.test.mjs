import test from "node:test";
import assert from "node:assert/strict";
import {readPublicPrefs,writePublicPrefs,profileFromForm,publicReady,publicRecommendations,publicCardHtml,publicFreshness,PUBLIC_PREFS_KEY} from "../public-opportunities.mjs";

const NOW=Date.parse("2026-11-26T15:00:00Z");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const job=(o={})=>({id:o.id||"a",brand:"Prada Group",title:"Merchandising Intern",role:"Merchandising",level:"internship",
 city:"Milano",country:"IT",published_at:"2026-11-25T08:00:00Z",first_seen_at:"2026-11-25T09:00:00Z",
 last_verified_at:"2026-11-26T13:28:00Z",url:"https://jobs.pradagroup.com/job/Milano/123",ats:"sitemap_jsonld",...o});
function memoryStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))}}

test("preferences are shared with the temporary radar page and survive a round trip",()=>{
 const st=memoryStorage();
 const profile=profileFromForm({roles:["Merchandising"],cities:["Milano"," milano "],relocations:["Parigi"],level:"internship"});
 assert.deepEqual(profile.cities,["Milano"]);
 assert.ok(writePublicPrefs(st,{profile,saved:["x"],hidden:[]}));
 assert.ok(st.getItem(PUBLIC_PREFS_KEY).includes("Merchandising"));
 const back=readPublicPrefs(st);
 assert.deepEqual(back.profile,profile);
 assert.deepEqual(back.saved,["x"]);
});

test("broken or blocked storage never breaks the page",()=>{
 assert.equal(publicReady(readPublicPrefs(null).profile),false);
 assert.equal(publicReady(readPublicPrefs({getItem:()=>"{not json"}).profile),false);
 assert.equal(writePublicPrefs({setItem:()=>{throw new Error("blocked")}},{profile:{}}),false);
});

test("only declared areas and cities, only recent official jobs, nothing invented",()=>{
 const prefs={profile:profileFromForm({roles:["Merchandising"],cities:["Milano"],relocations:["Parigi"],level:"early"})};
 const jobs=[
  job({id:"ok"}),
  job({id:"paris",city:"Paris",url:"https://jobs.pradagroup.com/job/Paris/9"}),
  job({id:"other-role",role:"Technology",url:"https://jobs.pradagroup.com/job/Milano/2"}),
  job({id:"rome",city:"Roma",url:"https://jobs.pradagroup.com/job/Roma/3"}),
  job({id:"old",published_at:"2026-10-01T00:00:00Z",url:"https://jobs.pradagroup.com/job/Milano/4"}),
  job({id:"senior",title:"Senior Merchandising Manager",level:"senior_manager",url:"https://jobs.pradagroup.com/job/Milano/5"}),
  job({id:"http",url:"http://jobs.pradagroup.com/job/Milano/6"})];
 const recs=publicRecommendations({jobs},prefs,NOW);
 assert.deepEqual(recs.map(r=>r.job.id),["ok","paris"]);
 assert.equal(recs[1].locationType,"relocation");
 assert.deepEqual(publicRecommendations({jobs},{profile:profileFromForm({roles:["Merchandising"]})},NOW),[]);
});

test("card escapes text, links only https and shows no fit percentage",()=>{
 const html=publicCardHtml({job:job({title:'<img src=x onerror=alert(1)>',brand:"A&B"}),locationType:"city"},esc,NOW);
 assert.ok(!html.includes("<img"));
 assert.ok(html.includes("A&amp;B"));
 assert.ok(html.includes('href="https://jobs.pradagroup.com/job/Milano/123"'));
 assert.ok(!/%/.test(html));
 assert.ok(html.includes("Pubblicata ieri"));
 const noLink=publicCardHtml({job:job({url:"javascript:alert(1)"}),locationType:"city"},esc,NOW);
 assert.ok(!noLink.includes("javascript:"));
 assert.ok(!noLink.includes("Apri posizione"));
 const seen=publicCardHtml({job:job({published_at:null}),locationType:"city"},esc,NOW);
 assert.ok(seen.includes("Rilevata ieri"));
});

test("freshness warns only after two missed 6-hour runs",()=>{
 assert.equal(publicFreshness("2026-11-26T07:30:00Z",NOW).stale,false);
 assert.equal(publicFreshness("2026-11-25T20:00:00Z",NOW).stale,true);
 assert.equal(publicFreshness(null,NOW).stale,true);
});
