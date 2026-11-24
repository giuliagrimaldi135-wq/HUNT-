import {meterUsage} from "./usage-meter.mjs";
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractOfficialDescription } from "./extract-description.mjs";
const enc=new TextEncoder();
async function sha(v:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
function equal(a:string,b:string){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
function db(){
 const url=Deno.env.get("SUPABASE_URL")||"",raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const v=JSON.parse(raw);key=String(v.default||Object.values(v)[0]||key)}catch{}}
 if(!url||!key)throw Error("Missing Supabase environment");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
Deno.serve(meterUsage("hunt-description-repair",async req=>{
 if(req.method!=="POST")return Response.json({error:"method_not_allowed"},{status:405});
 const client=db(),token=req.headers.get("x-hunt-cron")||"";
 const {data:secret,error:e}=await client.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
 if(e||!secret||!token||!equal(await sha(token),secret.secret_hash))return Response.json({error:"unauthorized"},{status:401});
 const {data:rows,error}=await client.from("jobs")
   .select("id,canonical_title,requisition_id,description,primary_apply_url,metadata")
   .in("state",["active_verified","active_likely"]).order("last_verified_at",{ascending:false}).limit(1400);
 if(error)return Response.json({ok:false,error:"fetch_failed"},{status:503});
 const now=Date.now();
 const pending=(rows||[]).filter((j:any)=>{
   if(String(j.description||"").trim().length>=250)return false;
   const retry=Date.parse(j.metadata?.description_repair?.attempted_at||"");
   return !Number.isFinite(retry)||now-retry>24*3600000;
 }).slice(0,6);
 let checked=0,repaired=0,unavailable=0;
 for(const job of pending){
   checked++;
   let status="unavailable",method="",clean="";
   const url=String(job.primary_apply_url||"");
   try {
     const u=new URL(url);
     if(u.protocol!=="https:"||u.username||u.password)throw Error("invalid_url");
     // Restrict redirects to the same trusted employer/ATS hostname.
     const res=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(7500),headers:{"accept":"text/html,application/xhtml+xml","user-agent":"HUNT/2 official-job-description-check"}});
     if(!res.ok||res.redirected||res.status>=300&&res.status<400)throw Error("source_unavailable");
     if(!/text\/html|application\/xhtml\+xml/i.test(res.headers.get("content-type")||""))throw Error("unexpected_content_type");
     const raw=await res.text();
     const result=extractOfficialDescription(raw,job.canonical_title,job.requisition_id||"");
     if(result){clean=result.description;method=result.method;status="repaired"}
   }catch {status="unavailable"}
   const at=new Date().toISOString();
   const metadata={...(job.metadata||{}),description_repair:{status,attempted_at:at,...(method?{method}:{})}};
   if(clean){
     const {error:writeError}=await client.from("jobs").update({description:clean,metadata,updated_at:at}).eq("id",job.id);
     if(!writeError){repaired++;continue}
   }
   unavailable++;
   await client.from("jobs").update({metadata}).eq("id",job.id);
 }
 return Response.json({ok:true,checked,repaired,unavailable,pending:pending.length});
}));
