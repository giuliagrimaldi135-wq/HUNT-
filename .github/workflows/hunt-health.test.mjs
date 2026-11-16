import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const yaml=readFileSync(new URL("./hunt-health.yml",import.meta.url),"utf8");
const lines=yaml.split(/\r?\n/);
const start=lines.findIndex(line=>line.trim()==="script: |");
const js=[];
if(start>=0){
 for(let i=start+1;i<lines.length;i++){
  const line=lines[i];
  if(line.trim()===""){js.push("");continue}
  if(!line.startsWith("            "))break;
  js.push(line.slice(12));
 }
}
const content=js.join("\n");
test("watchdog JavaScript parses and checks all three services",()=>{
 assert.ok(start>=0,"GitHub script is present");
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 assert.doesNotThrow(()=>new AsyncFunction("github","context","core",content));
 assert.match(content,/Supabase Auth/);
 assert.match(content,/Backend Supabase Auth/);
 assert.match(content,/radarState === 'unknown'.*backendState === 'unknown'/);
 assert.match(content,/backendState !== 'ok'/);
 assert.match(content,/publishableKey/);
 assert.doesNotMatch(content,/service_role|SUPABASE_SERVICE_ROLE_KEY/);
});
