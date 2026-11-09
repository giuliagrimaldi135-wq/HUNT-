
import {createClient} from "npm:@supabase/supabase-js@2";
const enc=new TextEncoder();
const trim=(v:unknown,n=12000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function eq(a:string,b:string){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
function client(){
 const url=Deno.env.get("SUPABASE_URL")||"",raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const p=JSON.parse(raw);key=p.default||Object.values(p)[0]||key}catch{}}
 if(!url||!key)throw Error("Supabase credentials unavailable");
 return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
function norm(s:string){return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim()}
function cleanHTML(s:unknown){
 return trim(String(s??"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'"),16000)
}
function family(title:string){
 const t=title.toLowerCase();
 if(/visual merchandis/.test(t))return "Visual Merchandising";
 if(/retail operations|store operations|retail performance|retail excellence/.test(t))return "Retail & Retail Operations";
 if(/planning|allocation|demand|forecast|inventory|stock analyst/.test(t))return "Planning & Allocation";
 if(/buying|buyer|achat|purchas/.test(t))return "Buying";
 if(/site merchandis|digital merchandis|e.?commerce/.test(t))return "E-commerce & Digital";
 if(/merchandis/.test(t))return "Merchandising";
 if(/wholesale|b2b/.test(t))return "Wholesale & Commercial";
 if(/supply chain|logistics/.test(t))return "Supply Chain & Logistics";
 if(/product|collection/.test(t))return "Product Management & Development";
 if(/retail|store network|boutique/.test(t))return "Retail & Retail Operations";
 if(/crm|data|analytics|insight/.test(t))return "Data & Analytics";
 if(/marketing|growth|brand/.test(t))return "Marketing & Brand";
 return null;
}
// Source ingestion is global and must NEVER inherit a specific candidate's role filters.
// CV, seniority, geography and unwanted-role exclusions belong to hunt-match-refresh.
function eligible(title:string){
 const t=title.trim();
 return t.length>=4&&t.length<=200&&!/^(all jobs|view all positions|job search|careers homepage)$/i.test(t);
}
function sen(title:string){
 if(/intern|stage|stagiaire/i.test(title))return "internship";
 if(/apprentice|trainee|graduate/i.test(title))return "trainee";
 if(/assistant/i.test(title))return "assistant";
 if(/junior|jr[.\s]/i.test(title))return "junior";
 if(/head of|director|chief|vice president/i.test(title))return "head_director";
 if(/senior|sr\.|principal/i.test(title))return "senior_manager";
 if(/manager|lead/i.test(title))return "manager";
 return "entry_level";
}
function safeURL(v:unknown){
 try{const u=new URL(String(v));return (u.protocol==="https:"&&!u.username&&!u.password)?u.href:null}catch{return null}
}
function apiURL(source:any){
 const board=trim(source.config?.board,90);
 if(!/^[a-z0-9_-]{2,90}$/i.test(board))throw Error("Invalid ATS board ID");
 if(source.source_family==="ats_lever")return "https://api.lever.co/v0/postings/"+board+"?mode=json&limit=250";
 if(source.source_family==="ats_greenhouse")return "https://boards-api.greenhouse.io/v1/boards/"+board+"/jobs?content=true";
 if(source.source_family==="ats_ashby")return "https://api.ashbyhq.com/posting-api/job-board/"+board;
 if(source.source_family==="ats_smartrecruiters")return "https://api.smartrecruiters.com/v1/companies/"+board+"/postings?limit=100&offset=0";
 if(source.source_family==="ats_workable")return "https://www.workable.com/api/accounts/"+board+"?details=true";
 throw Error("Unsupported ATS family");
}
function mapped(source:any,data:any){
 if(source.source_family==="ats_lever"&&Array.isArray(data)){
  return data.map((x:any)=>({
    title:trim(x.text,200),location:trim(x.categories?.location||"",140),
    description:cleanHTML(x.descriptionPlain||x.description||""),
    url:safeURL(x.hostedUrl),apply:safeURL(x.applyUrl)||safeURL(x.hostedUrl),
    id:trim(x.id,110),remote:/remote/i.test(String(x.workplaceType||x.categories?.location||""))
  }));
 }
 if(source.source_family==="ats_greenhouse"&&Array.isArray(data.jobs)){
  return data.jobs.map((x:any)=>({
    title:trim(x.title,200),location:trim(x.location?.name||"",140),
    description:cleanHTML(x.content||""),
    url:safeURL(x.absolute_url),apply:safeURL(x.absolute_url),
    id:trim(x.id,100),remote:/remote/i.test(String(x.location?.name||""))
  }));
 }
 if(source.source_family==="ats_ashby"&&Array.isArray(data.jobs)){
  return data.jobs.filter((x:any)=>x.isListed!==false).map((x:any)=>({
    title:trim(x.title,200),location:trim(x.location||"",140),
    description:cleanHTML(x.descriptionPlain||x.descriptionHtml||""),
    url:safeURL(x.jobUrl),apply:safeURL(x.applyUrl)||safeURL(x.jobUrl),
    id:trim(x.id,100),remote:Boolean(x.isRemote)
  }));
 }
 if(source.source_family==="ats_workable"&&Array.isArray(data.jobs)){
  return data.jobs.map((x:any)=>({
    title:trim(x.title,200),location:trim([x.city,x.state,x.country].filter(Boolean).join(", "),140),
    description:cleanHTML(x.description||""),url:safeURL(x.application_url)||safeURL(x.url)||safeURL(x.shortlink),
    apply:safeURL(x.url)||safeURL(x.application_url)||safeURL(x.shortlink),
    id:trim(x.shortcode||x.code||x.id,110),
    remote:Boolean(x.telecommuting)||/remote/i.test(String(x.workplace_type||"")),
    posted:x.published_on||null,providerEmploymentType:trim(x.employment_type,90)
  }));
 }
 if(source.source_family==="ats_smartrecruiters"&&Array.isArray(data.content)){
  return data.content.map((x:any)=>({
    title:trim(x.name,200),location:trim([x.location?.city,x.location?.region].filter(Boolean).join(", "),140),
    description:"",url:safeURL(x.postingUrl),apply:safeURL(x.applyUrl)||safeURL(x.postingUrl),
    id:trim(x.id,110),remote:Boolean(x.location?.remote),
    posted:x.releasedDate||null
  }));
 }
 throw Error("Malformed public ATS response");
}
Deno.serve(async(req)=>{
 try{
  const db=client(),supplied=req.headers.get("x-hunt-cron")||"";
  const {data:secret,error:secretError}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
  if(secretError||!secret||!supplied||!eq(await hash(supplied),secret.secret_hash))return Response.json({error:"unauthorized"},{status:401});
  const {data:sources,error}=await db.from("sources")
    .select("id,company_id,source_family,base_url,config,last_scan_at,consecutive_failures")
    .eq("source_type","public_ats_board").eq("active",true)
    .order("last_scan_at",{ascending:true,nullsFirst:true}).limit(6);
  if(error)throw Error(error.message);
  let boards=0,available=0,inserted=0,updated=0,rejected=0;
  const details:any[]=[];
  for(const source of sources||[]){
   boards++;
   let scanned=0,created=0,ignored=0;
   const at=new Date().toISOString();
   try{
    const response=await fetch(apiURL(source),{
      signal:AbortSignal.timeout(15000),
      headers:{"accept":"application/json","user-agent":"HUNT/2 career-board-reader (public published vacancies)"}
    });
    if(!response.ok)throw Error("ATS HTTP "+response.status);
    const raw=await response.text();
    if(raw.length>4500000)throw Error("ATS board response too large");
    const parsed=JSON.parse(raw);
    const entries=mapped(source,parsed);
    const isCompleteBoard=source.source_family==="ats_smartrecruiters"
      ?Number(parsed.totalFound||0)<=entries.length
      :entries.length<250;
    const liveURLs=new Set(entries.map((x:any)=>x.url).filter(Boolean));
    available+=entries.length;
    const recentLinks=new Set<string>();
    const previousCursor=Math.max(0,Number(source.config?.catalog_cursor)||0);
    const pageSize=source.source_family==="ats_smartrecruiters"?12:35;
    const selected=entries.length?Array.from({length:Math.min(entries.length,pageSize)},(_,i)=>entries[(previousCursor+i)%entries.length]):[];
    const nextCursor=entries.length?(previousCursor+selected.length)%entries.length:0;
    for(const item of selected){
      if(!item.title||!eligible(item.title)){rejected++;ignored++;continue}
      if(source.source_family==="ats_smartrecruiters"&&item.id){
        const board=trim(source.config?.board,90),id=encodeURIComponent(item.id);
        const detailURL="https://api.smartrecruiters.com/v1/companies/"+board+"/postings/"+id;
        try{
          const res=await fetch(detailURL,{signal:AbortSignal.timeout(8500),headers:{"accept":"application/json"}});
          if(!res.ok)throw Error("Posting details HTTP "+res.status);
          const details=await res.json();
          const sections=details.jobAd?.sections||{};
          const jobText=[sections.jobDescription?.text||"",sections.qualifications?.text||""].filter(Boolean).join("\n\n");
          item.description=cleanHTML(jobText);
          item.url=safeURL(details.postingUrl)||safeURL(details.applyUrl)||item.url;
          item.apply=safeURL(details.applyUrl)||safeURL(details.postingUrl)||item.apply;
          item.posted=details.releasedDate||item.posted||null;
          item.remote=Boolean(details.location?.remote||item.remote);
          if(details.location?.city)item.location=trim([details.location.city,details.location.region].filter(Boolean).join(", "),140);
        }catch{
          rejected++;ignored++;continue;
        }
      }
      if(!item.url||!item.description||item.description.length<75){rejected++;ignored++;continue}
      if(recentLinks.has(item.url))continue;recentLinks.add(item.url);scanned++;
      // This is a live public ATS listing. Do not invent a publication date: first_seen_at is distinct.
      const {data:existingLink}=await db.from("job_sources")
        .select("job_id").eq("source_id",source.id).eq("listing_url",item.url).maybeSingle();
      const existingId=existingLink?.job_id||null;
      const location=item.location||null;
      const stamp=new Date().toISOString();
      const role=family(item.title);
      if(existingId){
        const {error:jobError}=await db.from("jobs").update({
          last_seen_at:stamp,last_verified_at:stamp,updated_at:stamp,
          state:"active_verified",confidence_label:"VERIFIED ACTIVE",vacancy_confidence:96
        }).eq("id",existingId);
        if(jobError)throw Error(jobError.message);
        await db.from("job_sources").update({last_seen_at:stamp,last_verified_at:stamp,active:true}).eq("source_id",source.id).eq("listing_url",item.url);
        updated++;continue;
      }
      const {data:job,error:insertError}=await db.from("jobs").insert({
        company_id:source.company_id,canonical_title:item.title,normalized_title:norm(item.title),
        role_family:role,seniority:sen(item.title),employment_type:item.providerEmploymentType
          ?(/^intern|stag|tirocin|apprentice/i.test(item.providerEmploymentType)?"internship":/^part/i.test(item.providerEmploymentType)?"part_time":"full_time")
          :(sen(item.title)==="internship"?"internship":"full_time"),
        city:location,remote_mode:item.remote?"remote":"onsite",
        description:item.description,requisition_id:item.id||null,
        primary_apply_url:item.apply,
        state:"active_verified",vacancy_confidence:96,confidence_label:"VERIFIED ACTIVE",
        published_at:item.posted&&Number.isFinite(new Date(item.posted).getTime())&&new Date(item.posted).getTime()<=Date.now()
          ?new Date(item.posted).toISOString():null,
        first_seen_at:stamp,last_seen_at:stamp,last_verified_at:stamp,
        metadata:{discovered_by:"hunt-ats-board-v4",catalog_scope:"all_public_roles",public_ats:source.source_family,posted_date:item.posted?"provider_date":"not_exposed",employment_type_inferred_from_title:!item.providerEmploymentType,source_verified_at:stamp}
      }).select("id").single();
      if(insertError||!job)throw Error(insertError?.message||"Job insert failed");
      const {error:linkError}=await db.from("job_sources").insert({
        job_id:job.id,source_id:source.id,external_job_id:item.id||null,listing_url:item.url,
        apply_url:item.apply,raw_title:item.title,raw_location:location,last_seen_at:stamp,last_verified_at:stamp,active:true
      });
      if(linkError){await db.from("jobs").delete().eq("id",job.id);throw Error(linkError.message)}
      created++;inserted++;
    }
    // After three or more missed rotations, a posting absent from the full official
    // board list becomes stale. This is safer than treating web search snippets as current.
    let stale=0;
    if(entries.length>0&&isCompleteBoard){
      const {data:linked}=await db.from("job_sources")
        .select("job_id,listing_url,last_seen_at").eq("source_id",source.id).eq("active",true).limit(700);
      const staleCutoff=Date.now()-15*60*1000;
      for(const link of linked||[]){
        if(liveURLs.has(link.listing_url))continue;
        if(link.last_seen_at&&new Date(link.last_seen_at).getTime()>staleCutoff)continue;
        const {error:jobError}=await db.from("jobs").update({
          state:"stale_possible",vacancy_confidence:50,confidence_label:"STALE / NEEDS RECHECK",
          updated_at:at
        }).eq("id",link.job_id).eq("state","active_verified");
        if(jobError)continue;
        await db.from("job_sources").update({active:false}).eq("source_id",source.id).eq("listing_url",link.listing_url);
        stale++;
      }
    }
    await db.from("sources").update({
      last_scan_at:at,last_success_at:at,health_status:"healthy",consecutive_failures:0,
      config:{...(source.config||{}),catalog_cursor:nextCursor}
    }).eq("id",source.id);
    details.push({family:source.source_family,board:source.config?.board,status:"healthy",fetched:entries.length,created,checked:scanned,ignored,stale,catalog_cursor:nextCursor});
   }catch(e){
    await db.from("sources").update({
      last_scan_at:at,health_status:"degraded",consecutive_failures:(source.consecutive_failures||0)+1
    }).eq("id",source.id);
    details.push({family:source.source_family,board:source.config?.board,status:"error",error:String(e instanceof Error?e.message:e).slice(0,180)});
   }
  }
  return Response.json({ok:true,boards,available,inserted,updated,rejected,details});
 }catch(e){return Response.json({error:String(e instanceof Error?e.message:e)},{status:500})}
});
