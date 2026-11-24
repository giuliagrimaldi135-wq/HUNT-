// Run: deno test --allow-net --allow-env v2/supabase/shared/usage-meter.test.ts
// Uses the REAL supabase-js client against a local fake API, so it proves the
// meter sees the client's traffic (the client captures fetch at creation).
import {assert,assertEquals} from "jsr:@std/assert@1";

const reports:any[]=[];
const big="x".repeat(50_000);
const server=Deno.serve({port:0,onListen(){}},async(req)=>{
  const url=new URL(req.url);
  if(url.pathname==="/rest/v1/rpc/hunt_record_function_usage"){reports.push(await req.json());return new Response(null,{status:204})}
  if(url.pathname==="/rest/v1/jobs")return Response.json([{id:1,description:big}]);
  if(url.pathname==="/rest/v1/empty")return new Response(null,{status:204});
  return new Response("not found",{status:404});
});
const origin="http://127.0.0.1:"+server.addr.port;
Deno.env.set("SUPABASE_URL",origin);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY","test-key");
const {meterUsage}=await import("./usage-meter.mjs");
const {createClient}=await import("npm:@supabase/supabase-js@2");

Deno.test("counts Supabase response bytes of one run and reports them once",async()=>{
  reports.length=0;
  const handler=meterUsage("hunt-test",async()=>{
    const db=createClient(origin,"test-key",{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await db.from("jobs").select("id,description");
    assert(!error);assertEquals(data![0].description.length,50_000);
    await db.from("empty").delete().eq("id",1);
    return Response.json({ok:true});
  });
  const res=await handler(new Request("http://edge/hunt-test"),{} as any);
  assertEquals(res.status,200);
  assertEquals(reports.length,1);
  assertEquals(reports[0].p_function,"hunt-test");
  assertEquals(reports[0].p_requests,2);
  assert(reports[0].p_bytes>=50_000&&reports[0].p_bytes<51_000,String(reports[0].p_bytes));
  assertEquals(reports[0].p_status,200);
});

Deno.test("concurrent runs are attributed separately; external sites are not counted",async()=>{
  reports.length=0;
  const external=Deno.serve({port:0,onListen(){}},()=>new Response("y".repeat(10_000)));
  const extURL="http://localhost:"+external.addr.port+"/page";
  const make=(name:string,reads:number)=>meterUsage(name,async()=>{
    const db=createClient(origin,"test-key",{auth:{persistSession:false,autoRefreshToken:false}});
    for(let i=0;i<reads;i++){await db.from("jobs").select("*");await new Promise(r=>setTimeout(r,5))}
    await (await fetch(extURL)).text();
    return Response.json({ok:true});
  });
  await Promise.all([make("hunt-a",1)(new Request("http://e/a"),{} as any),make("hunt-b",3)(new Request("http://e/b"),{} as any)]);
  await external.shutdown();
  const a=reports.find(r=>r.p_function==="hunt-a"),b=reports.find(r=>r.p_function==="hunt-b");
  assertEquals(a.p_requests,1);assertEquals(b.p_requests,3);
  assert(b.p_bytes>a.p_bytes*2.5&&a.p_bytes<51_000);
});

Deno.test("unauthorized calls are not recorded; thrown errors are recorded as 500",async()=>{
  reports.length=0;
  await meterUsage("hunt-x",async()=>new Response("no",{status:401}))(new Request("http://e/"),{} as any);
  assertEquals(reports.length,0);
  let threw=false;
  try{await meterUsage("hunt-y",async()=>{throw Error("boom")})(new Request("http://e/"),{} as any)}catch{threw=true}
  assert(threw);
  assertEquals(reports.length,1);assertEquals(reports[0].p_status,500);
});

Deno.test({name:"a failing ledger never changes the function response",sanitizeOps:false,sanitizeResources:false,fn:async()=>{
  Deno.env.set("SUPABASE_URL","http://127.0.0.1:9");
  const res=await meterUsage("hunt-z",async()=>Response.json({ok:true}))(new Request("http://e/"),{} as any);
  assertEquals(res.status,200);
  Deno.env.set("SUPABASE_URL",origin);
  await server.shutdown();
}});
