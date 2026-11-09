
import {createClient} from "npm:@supabase/supabase-js@2";
const enc=new TextEncoder();
async function digest(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function same(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
function client(){
 const url=Deno.env.get("SUPABASE_URL")||"",raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const p=JSON.parse(raw);key=p.default||Object.values(p)[0]||key}catch{}}
 if(!url||!key)throw Error("Missing Supabase credentials");
 return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
type Board={family:"ats_lever"|"ats_greenhouse"|"ats_ashby"|"ats_smartrecruiters"|"ats_workable",site:string,url:string};
const HOSTS=[
 ["jobs.lever.co","ats_lever"],["jobs.eu.lever.co","ats_lever"],
 ["boards.greenhouse.io","ats_greenhouse"],["job-boards.greenhouse.io","ats_greenhouse"],
 ["jobs.ashbyhq.com","ats_ashby"],
 ["jobs.smartrecruiters.com","ats_smartrecruiters"],["careers.smartrecruiters.com","ats_smartrecruiters"],["apply.workable.com","ats_workable"]
] as const;
function boardsIn(html:string){
 const found=new Map<string,Board>();
 const text=html.replace(/\\\//g,"/").replace(/&amp;/gi,"&").replace(/&#x2f;|&#47;/gi,"/");
 const expr=/(?:https?:)?\/\/(?:jobs\.eu\.lever\.co|jobs\.lever\.co|boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.ashbyhq\.com|jobs\.smartrecruiters\.com|careers\.smartrecruiters\.com|apply\.workable\.com)\/[a-zA-Z0-9_-]{2,90}/gi;
 for(const m of text.matchAll(expr)){
  try{
   const parsed=new URL(m[0].startsWith("//")?"https:"+m[0]:m[0]);
   const conf=HOSTS.find(x=>x[0]===parsed.host.toLowerCase());
   if(!conf)continue;
   const site=parsed.pathname.split("/").filter(Boolean)[0]||"";
   if(!/^[a-zA-Z0-9_-]{2,90}$/.test(site))continue;
   found.set(conf[1]+":"+site.toLowerCase(),{family:conf[1],site,url:"https://"+parsed.host+"/"+site});
  }catch{}
 }
 return [...found.values()].slice(0,15);
}
function endpoint(board:Board){
 const site=encodeURIComponent(board.site);
 if(board.family==="ats_lever")return "https://api.lever.co/v0/postings/"+site+"?mode=json&limit=25";
 if(board.family==="ats_greenhouse")return "https://boards-api.greenhouse.io/v1/boards/"+site+"/jobs";
 if(board.family==="ats_smartrecruiters")return "https://api.smartrecruiters.com/v1/companies/"+site+"/postings?limit=100";
 if(board.family==="ats_workable")return "https://www.workable.com/api/accounts/"+site+"?details=true";
 return "https://api.ashbyhq.com/posting-api/job-board/"+site;
}
async function validates(board:Board){
 try{
  const response=await fetch(endpoint(board),{signal:AbortSignal.timeout(9000),headers:{"accept":"application/json","user-agent":"HUNT ATS source-discovery/1.0"}});
  if(!response.ok)return false;
  const txt=await response.text();
  if(txt.length>2500000)return false;
  const obj=JSON.parse(txt);
  return Array.isArray(obj)||Array.isArray(obj.jobs)||Array.isArray(obj.content);
 }catch{return false}
}
Deno.serve(async(req)=>{
 try{
  const db=client(),supplied=req.headers.get("x-hunt-cron")||"";
  const {data:secret,error:e}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
  if(e||!secret||!supplied||!same(await digest(supplied),secret.secret_hash))return Response.json({error:"unauthorized"},{status:401});
  const [{data:origins,error:se},{data:runs,error:re},{data:existing,error:ee}]=await Promise.all([
   db.from("sources").select("id,company_id,source_type,source_family,base_url,companies(name)").eq("active",true).or("official.eq.true,source_type.eq.brand_website_candidate").neq("source_type","public_ats_board").not("base_url","is",null).limit(2000),
   db.from("ats_discovery_runs").select("source_id,checked_at").limit(2000),
   db.from("sources").select("company_id,base_url").eq("source_type","public_ats_board").limit(2000)
  ]);
  if(se||re||ee)throw Error(se?.message||re?.message||ee?.message);
  const times=new Map((runs||[]).map((x:any)=>[x.source_id,Date.parse(x.checked_at)||0]));
  const since=Date.now()-12*3600000;
  const queue=(origins||[]).filter((x:any)=>!times.has(x.id)||times.get(x.id)!<since)
    .sort((a:any,b:any)=>(times.get(a.id)||0)-(times.get(b.id)||0)).slice(0,12);
  const known=new Set((existing||[]).map((x:any)=>x.company_id+"|"+x.base_url));
  let tested=0,discovered=0,failed=0,validated=0;
  const details:any[]=[];
  for(const source of queue){
   tested++;
   const moment=new Date().toISOString();
   let found=0,problem="";
   try{
    const location=new URL(source.base_url);
    if(location.protocol!=="https:"||location.username||location.password)throw Error("Unsupported origin URL");
    const response=await fetch(source.base_url,{
      redirect:"follow",signal:AbortSignal.timeout(9500),
      headers:{"accept":"text/html,application/xhtml+xml","user-agent":"Mozilla/5.0 HUNT/2 ATS discovery"}
    });
    if(!response.ok)throw Error("Origin HTTP "+response.status);
    const html=(await response.text()).slice(0,1200000);
    const foundBoards=new Map<string,Board>();
    for(const board of boardsIn(html))foundBoards.set(board.family+":"+board.site,board);
    if(source.source_type==="brand_website_candidate"&&foundBoards.size===0){
      // Probe at most 2 same-origin careers pages found on the verified directory website.
      const rootURL=new URL(source.base_url);
      const targetURLs=new Set<string>();
      for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,180}?)<\/a>/gi)){
        const txt=(m[1]+" "+m[2].replace(/<[^>]+>/g," ")).toLowerCase();
        if(!/careers?|jobs|join[- ]?(?:us|our team)|lavora con noi|offerte di lavoro|work with us/i.test(txt))continue;
        try{const u=new URL(m[1],response.url);if(u.origin===rootURL.origin&&u.protocol==="https:"&&u.pathname!=="/")targetURLs.add(u.toString())}catch{}
        if(targetURLs.size>=2)break;
      }
      for(const target of targetURLs){
        try{
          const page=await fetch(target,{redirect:"follow",signal:AbortSignal.timeout(7500),headers:{"accept":"text/html","user-agent":"HUNT ATS source-discovery/1.1"}});
          if(!page.ok||!page.headers.get("content-type")?.includes("text/html"))continue;
          const body=(await page.text()).slice(0,850000);
          for(const board of boardsIn(body))foundBoards.set(board.family+":"+board.site,board);
        }catch{}
      }
    }
    const boards=[...foundBoards.values()];
    for(const board of boards){
     const id=source.company_id+"|"+board.url;
     if(known.has(id))continue;
     if(!await validates(board))continue;
     validated++;
     const {data,error}=await db.from("sources").upsert({
       company_id:source.company_id,source_type:"public_ats_board",source_family:board.family,
       name:String(source.companies?.name||"Brand")+" · "+board.family,
       base_url:board.url,official:true,trust_level:94,active:true,health_status:"unknown",
       config:{board:board.site},metadata:{discovery:"linked_from_official_careers",referring_source_id:source.id,referring_url:source.base_url}
     },{onConflict:"company_id,source_type,base_url",ignoreDuplicates:true}).select("id");
     if(error)throw Error(error.message);
     if(data?.length){known.add(id);discovered++;found++}
    }
   }catch(err){problem=String(err instanceof Error?err.message:err).slice(0,200);failed++}
   await db.from("ats_discovery_runs").upsert({source_id:source.id,checked_at:moment,found_boards:found,last_error:problem||null},{onConflict:"source_id"});
   details.push({company:String(source.companies?.name||""),found,error:problem||undefined});
  }
  return Response.json({ok:true,scanned:tested,discovered,validated,failed,details});
 }catch(e){return Response.json({error:String(e instanceof Error?e.message:e)},{status:500})}
});
