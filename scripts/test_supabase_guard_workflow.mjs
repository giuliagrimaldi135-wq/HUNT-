// Runs the inline script of .github/workflows/hunt-supabase-guard.yml against
// fake GitHub/Supabase responses. Run: node --test scripts/test_supabase_guard_workflow.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const yml=readFileSync(new URL("../.github/workflows/hunt-supabase-guard.yml",import.meta.url),"utf8");
const lines=yml.split("\n");
const start=lines.findIndex(l=>l.trim()==="script: |")+1;
const indent=lines[start].match(/^\s*/)[0].length;
const script=lines.slice(start).filter(l=>l.trim()==="" || l.match(/^\s*/)[0].length>=indent).map(l=>l.slice(indent)).join("\n");
const AsyncFunction=Object.getPrototypeOf(async()=>{}).constructor;

async function run({responses,openIssues=[]}){
  const calls=[];let i=0;
  globalThis.fetch=async()=>{const r=responses[Math.min(i++,responses.length-1)];if(r instanceof Error)throw r;
    return {status:r.status,ok:r.status>=200&&r.status<300,json:async()=>r.body}};
  const github={paginate:async()=>openIssues,rest:{issues:{listForRepo:()=>{},
    create:async(a)=>calls.push(["create",a]),update:async(a)=>calls.push(["update",a])}}};
  const summary={addHeading(){return this},addTable(){return this},write:async()=>{}};
  const core={info(){},warning(){},summary};
  const context={repo:{owner:"o",repo:"r"},serverUrl:"https://github.com",runId:1};
  process.env.SUPABASE_URL="https://x.supabase.co";process.env.SUPABASE_PUBLISHABLE_KEY="k";
  const origTimeout=globalThis.setTimeout;globalThis.setTimeout=(f)=>origTimeout(f,0);
  try{await new AsyncFunction("github","context","core",script)(github,context,core)}finally{globalThis.setTimeout=origTimeout}
  return calls;
}
const TITLE="HUNT · protezione consumi Supabase";

test("HTTP 402 opens one incident",async()=>{
  const calls=await run({responses:[{status:402}]});
  assert.equal(calls.length,1);assert.equal(calls[0][0],"create");
  assert.equal(calls[0][1].title,TITLE);assert.match(calls[0][1].body,/supabase_restricted_402/);
});
test("same alert while open does not create duplicates or edits",async()=>{
  const first=await run({responses:[{status:402}]});
  const calls=await run({responses:[{status:402}],openIssues:[{number:7,title:TITLE,body:first[0][1].body}]});
  assert.equal(calls.length,0);
});
test("healthy status closes the open incident",async()=>{
  const calls=await run({responses:[{status:200,body:{ok:true,level:"fast",alerts:[],info:[]}}],openIssues:[{number:7,title:TITLE,body:"x"}]});
  assert.deepEqual(calls.map(c=>c[0]),["update"]);assert.equal(calls[0][1].state,"closed");
});
test("guard alerts are explained",async()=>{
  const calls=await run({responses:[{status:200,body:{ok:false,level:"minimal",alerts:["meter_silent","telemetry_untrusted"],info:[]}}]});
  assert.match(calls[0][1].body,/misuratore/);assert.match(calls[0][1].body,/oltre 24 ore/);
  assert.match(calls[0][1].body,/non lo esclude/);
});
test("missing function (404) or network failure never touches incidents",async()=>{
  assert.equal((await run({responses:[{status:404}],openIssues:[{number:7,title:TITLE,body:"x"}]})).length,0);
  assert.equal((await run({responses:[new Error("down")],openIssues:[{number:7,title:TITLE,body:"x"}]})).length,0);
  assert.equal((await run({responses:[{status:503}],openIssues:[{number:7,title:TITLE,body:"x"}]})).length,0);
});
