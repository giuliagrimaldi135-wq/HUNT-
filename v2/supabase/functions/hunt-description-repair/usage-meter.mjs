// HUNT usage meter — internal ESTIMATE of Supabase API traffic per Edge Function run.
//
// Canonical copy: v2/supabase/shared/usage-meter.mjs. Each cron-invoked
// function keeps an identical copy next to its index.ts (CI checks they match)
// so every function still deploys as a self-contained folder.
//
// What is counted: bytes of response bodies received from THIS project's
// Supabase URL (PostgREST, Storage, Auth, Functions) while a request is being
// handled. Bodies are counted after HTTP decompression, so the figure is an
// upper bound of what Supabase bills as egress for these calls. Traffic from
// browsers (the HUNT app) and from requests to external websites is NOT
// counted here; it is covered by a reserve and by the real figures read from
// the Supabase Usage page (see hunt_ops.observed_egress).
//
// The total is sent to public.hunt_record_function_usage() at the end of the
// run. Any failure of the meter is swallowed: it never changes the response.

import {AsyncLocalStorage} from "node:async_hooks";

const ORIGINAL_FETCH=globalThis.fetch.bind(globalThis);
const NULL_BODY_STATUS=new Set([101,103,204,205,304]);
// Per-request context: concurrent runs on one instance are counted separately.
const runs=new AsyncLocalStorage();

function env(name){try{return globalThis.Deno?.env?.get(name)??""}catch{return ""}}
function projectOrigin(){try{return new URL(env("SUPABASE_URL")).origin}catch{return ""}}
export function serviceKey(){
  let key=env("SUPABASE_SERVICE_ROLE_KEY");
  const raw=env("SUPABASE_SECRET_KEYS");
  if(raw){try{const parsed=JSON.parse(raw);key=parsed.default||Object.values(parsed)[0]||key}catch{}}
  return String(key||"");
}
export function requestURL(input){
  if(typeof input==="string")return input;
  if(input instanceof URL)return input.href;
  return String(input?.url||"");
}
export function isProjectURL(url,origin){
  return Boolean(origin)&&(url===origin||url.startsWith(origin+"/"));
}

export async function meteredFetch(input,init){
  const response=await ORIGINAL_FETCH(input,init);
  const run=runs.getStore();
  if(!run||!isProjectURL(requestURL(input),projectOrigin()))return response;
  run.requests++;
  if(!response.body||NULL_BODY_STATUS.has(response.status))return response;
  const counter=new TransformStream({transform(chunk,controller){run.bytes+=chunk.byteLength;controller.enqueue(chunk)}});
  return new Response(response.body.pipeThrough(counter),{status:response.status,statusText:response.statusText,headers:response.headers});
}
// Installed at import time, before any Supabase client captures fetch.
globalThis.fetch=meteredFetch;

export function currentRun(){return runs.getStore()??null}

async function report(name,run,status){
  const origin=projectOrigin(),key=serviceKey();
  if(!origin||!key)return;
  try{
    await ORIGINAL_FETCH(origin+"/rest/v1/rpc/hunt_record_function_usage",{
      method:"POST",signal:AbortSignal.timeout(3000),
      headers:{"content-type":"application/json","apikey":key,"authorization":"Bearer "+key,"prefer":"return=minimal"},
      body:JSON.stringify({p_function:name,p_bytes:run.bytes,p_requests:run.requests,p_status:status,p_duration_ms:Date.now()-run.started})
    }).then(r=>r.body?.cancel());
  }catch{/* never affect the scan */}
}

// Wrap a Deno.serve handler. Unauthorized calls (401) are not recorded, so
// anonymous hits on a public function URL cannot grow the ledger.
/**
 * @param {string} name
 * @param {(req: Request, info?: any) => Response | Promise<Response>} handler
 * @returns {(req: Request, info?: any) => Promise<Response>}
 */
export function meterUsage(name,handler){
  return async(req,info)=>{
    const run={bytes:0,requests:0,started:Date.now()};
    let status=500;
    try{
      const response=await runs.run(run,()=>handler(req,info));
      status=Number(response?.status)||200;
      return response;
    }finally{
      if(status!==401)await report(name,run,status);
    }
  };
}
