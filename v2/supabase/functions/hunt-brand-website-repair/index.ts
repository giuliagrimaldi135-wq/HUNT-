import {createClient} from "npm:@supabase/supabase-js@2";
import {extractDirectoryWebsite,websiteBackfillEligible} from "./website-extraction.mjs";
const enc=new TextEncoder();
async function hex(v:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
function same(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function client(){
 const url=Deno.env.get("SUPABASE_URL")||"",raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const p=JSON.parse(raw);key=String(p.default||Object.values(p)[0]||key)}catch{}}
 if(!url||!key)throw Error("Missing server credentials");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
Deno.serve(async req=>{
 if(req.method!=="POST")return Response.json({error:"method_not_allowed"},{status:405});
 const db=client(),token=req.headers.get("x-hunt-cron")||"";
 const {data:secret,error:secretError}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
 if(secretError||!secret||!token||!same(await hex(token),secret.secret_hash))return Response.json({error:"unauthorized"},{status:401});
 const {data:rows,error}=await db.from("companies")
   .select("id,name,slug,website_url,discovery_source,metadata")
   .eq("discovery_source","fashionunited_public_brand_directory")
   .is("website_url",null).order("created_at",{ascending:false}).limit(250);
 if(error)return Response.json({ok:false,error:"fetch_failed"},{status:503});
 const todo=(rows||[]).filter((c:any)=>websiteBackfillEligible(c)).slice(0,4);
 let checked=0,linked=0,unavailable=0;
 for(const company of todo){
  checked++;
  let candidate:string|null=null;
  try{
   // No arbitrary profile URLs from metadata: fetch only validated directory slugs.
   const page="https://fashionunited.com/companies/"+company.slug;
   const response=await fetch(page,{redirect:"manual",signal:AbortSignal.timeout(8000),headers:{"accept":"text/html","user-agent":"HUNT/2 fashion-brand-website-verifier"}});
   if(response.ok&&!response.redirected&&/text\/html/i.test(response.headers.get("content-type")||"")){
    const html=(await response.text()).slice(0,1400000);
    candidate=extractDirectoryWebsite(html,company.name);
   }
  }catch{}
  const at=new Date().toISOString();
  const metadata={...(company.metadata||{}),website_backfill:{attempted_at:at,status:candidate?"candidate_found":"not_available",method:"directory_brand_domain_check"}};
  if(candidate){
   const {data:updated,error:updateError}=await db.from("companies")
      .update({website_url:candidate,metadata})
      .eq("id",company.id).is("website_url",null).select("id").maybeSingle();
   if(!updateError&&updated){
    const {error:sourceError}=await db.from("sources").upsert({
      company_id:company.id,source_type:"brand_website_candidate",source_family:"custom",
      name:company.name+" · sito indicato dalla directory",base_url:candidate,
      official:false,trust_level:55,active:true,health_status:"unknown",config:{},
      metadata:{referring_directory_profile:"https://fashionunited.com/companies/"+company.slug,not_a_verified_careers_page:true}
    },{onConflict:"company_id,source_type,base_url",ignoreDuplicates:true});
    if(!sourceError){linked++;continue}
   }
  }
  unavailable++;
  await db.from("companies").update({metadata}).eq("id",company.id).is("website_url",null);
 }
 return Response.json({ok:true,checked,linked,unavailable});
});
