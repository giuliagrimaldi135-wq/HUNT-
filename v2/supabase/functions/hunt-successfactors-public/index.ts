import {createClient} from "npm:@supabase/supabase-js@2";
const e=new TextEncoder();
async function sha(v:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",e.encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
function eq(a:string,b:string){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
function db(){const url=Deno.env.get("SUPABASE_URL")||"";let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 try{const obj=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");key=obj.default||Object.values(obj)[0]||key}catch{}
 if(!key||!url)throw Error("No service credentials");
 return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
const tidy=(v:string)=>String(v||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
 .replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"')
 .replace(/&#(?:39|x27);/gi,"'").replace(/\s+/g," ").trim();
const norm=(v:string)=>tidy(v).toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const validURL=(url:string,origin:string)=>{try{const u=new URL(url,origin),b=new URL(origin);
 return u.protocol==="https:"&&!u.username&&!u.password&&u.hostname===b.hostname?u.origin+u.pathname:null
 }catch{return null}};
async function fetchHTML(url:string,origin:string){
 const res=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:"follow",headers:{"accept":"text/html,application/xhtml+xml","user-agent":"HUNT/2 public career-source monitor"}});
 if(!res.ok)throw Error("HTTP "+res.status);
 if(!validURL(res.url,origin))throw Error("Unexpected redirect");
 if(!/html/i.test(res.headers.get("content-type")||"text/html"))throw Error("Not HTML");
 const html=await res.text();if(html.length>1400000)throw Error("Page too large");
 return {html,url:res.url};
}
function jobsOnPage(html:string,url:string,origin:string){
 const out=new Set<string>();
 for(const m of html.matchAll(/\bhref=["']([^"']*\/job\/[^"'?#]+(?:\/[^"'?#]*)?)["']/gi)){
  const link=validURL(m[1],url);
  if(link&&link.startsWith(origin+"/job/")&&link.length<430)out.add(link);
 }
 return [...out];
}
function family(title:string){const t=title.toLowerCase();
 if(/visual merchand/.test(t))return "Visual Merchandising";
 if(/merchand/.test(t))return "Merchandising";
 if(/buying|buyer/.test(t))return "Buying";
 if(/planning|allocation/.test(t))return "Planning & Allocation";
 if(/e.?commerce|digital/.test(t))return "E-commerce & Digital";
 if(/retail|store operations|training/.test(t))return "Retail & Retail Operations";
 if(/wholesale/.test(t))return "Wholesale & Commercial";
 if(/product/.test(t))return "Product Management & Development";
 if(/marketing|communication/.test(t))return "Marketing & Brand";
 if(/logistics|supply chain/.test(t))return "Supply Chain & Logistics";
 return null;
}
function seniority(title:string){const t=title.toLowerCase();
 if(/intern|stage|tirocin/.test(t))return "internship";
 if(/trainee|graduate/.test(t))return "trainee";
 if(/assistant/.test(t))return "assistant";
 if(/junior|jr\./.test(t))return "junior";
 if(/director|head of/.test(t))return "head_director";
 if(/senior manager/.test(t))return "senior_manager";
 if(/manager/.test(t))return "manager";
 return "entry_level";
}
function pageInfo(html:string,url:string){
 const doc=tidy(html);
 const ht=tidy(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||"");
 const titleTag=tidy(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/\s+Job Details(?:\s*\|.*)?$/i,"");
 const usableHeading=ht.length>=6&&ht.length<160&&!/\$\{|testo\d|placeholder|job details|^careers$/i.test(ht);
 const title=(usableHeading?ht:titleTag).replace(/\s+Job Details.*$/i,"").trim();
 if(title.length<6||title.length>180||/\$\{|testo\d|placeholder|^(work with us|careers|job opportunities)/i.test(title))return null;
 const start=doc.search(/\bJOB PURPOSE\b|\bROLE PURPOSE\b|\bRESPONSIBILITIES\b|\bJOB DESCRIPTION\b|\bKEY RESPONSIBILITIES\b/i);
 const end=doc.search(/\bJoining our Company means\b|\bPrada Group promotes an inclusive\b|\bEqual Opportunity Employer\b/i);
 const desc=start>=0?doc.slice(start,(end>start?end:Math.min(doc.length,start+11000))).slice(0,11000):"";
 if(desc.length<160||!/responsibilit|requirement|skills|knowledge|duties|attività|requisit/i.test(desc))return null;
 const posted=doc.match(/\bPosting Date:\s*([A-Z][a-z]{2}\s+\d{1,2},?\s+20\d{2})/i);
 let published=null;
 if(posted){const date=new Date(posted[1]);if(Number.isFinite(date.getTime())&&date.getTime()<=Date.now())published=date.toISOString()}
 const city=doc.match(/\bCity:\s*([\p{L}\s'-]{2,60}?)(?=\s+(?:ID|Career Path|Posting Date|JOB PURPOSE)\b)/iu);
 const country=doc.match(/\bCountry:\s*([A-Z]{2})\b/);
 const jobId=doc.match(/\bID:\s*(\d{3,12})\b/);
 return {title,description:desc,published,city:city?tidy(city[1]):null,country:country?country[1]:null,jobId:jobId?jobId[1]:null,url};
}
Deno.serve(async(req)=>{
 try{
  const client=db(),token=req.headers.get("x-hunt-cron")||"";
  const {data:secret,error}=await client.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
  if(error||!secret||!token||!eq(await sha(token),secret.secret_hash))return Response.json({error:"unauthorized"},{status:401});
  const {data:all,error:sourceError}=await client.from("sources")
    .select("id,company_id,base_url,config,last_scan_at,source_family,source_type")
    .eq("active",true).eq("source_family","successfactors").eq("source_type","ats").limit(50);
  if(sourceError)throw Error(sourceError.message);
  const sources=(all||[]).filter(x=>Array.isArray(x.config?.catalog_urls)&&x.config.catalog_urls.length)
    .sort((a,b)=>Date.parse(a.last_scan_at||"2000-01-01")-Date.parse(b.last_scan_at||"2000-01-01")).slice(0,2);
  const dry=Boolean((await req.json().catch(()=>({})))?.dry_run);
  const results:any[]=[];
  for(const source of sources){
   const origin=new URL(source.base_url).origin;
   const catalog=source.config.catalog_urls.slice(0,2);
   let listed=0,checked=0,created=0,updated=0,failures=0;
   const report:any[]=[];
   for(const url of catalog){
    if(!validURL(url,origin)){report.push({error:"Different catalog host"});continue}
    try{
     const {html,url:resolved}=await fetchHTML(url,origin);
     const links=jobsOnPage(html,resolved,origin);
     listed+=links.length;
     const cursor=Math.max(0,Number(source.config?.catalog_cursor||0));
     const selected=links.slice(cursor,cursor+5);
     // Cursor is bounded and resets when the end is reached.
     for(const link of selected){
      try{
       const page=await fetchHTML(link,origin);
       const info=pageInfo(page.html,link);
       if(!info){report.push({url:link,issue:"Incomplete public job details"});continue}
       checked++;
       if(dry){report.push({title:info.title,city:info.city,url:info.url,chars:info.description.length});continue}
       const {data:existing,error:lookupErr}=await client.from("jobs").select("id,description").eq("company_id",source.company_id).eq("primary_apply_url",info.url).maybeSingle();
       if(lookupErr){failures++;continue}
       const now=new Date().toISOString();
       const metadata={public_ats:"ats_successfactors",discovered_by:"hunt-successfactors-public-v1",
         verified_career_url:source.base_url,source_catalog_url:url,provider_date:info.published?"posted":"unknown",source_verified_at:now};
       if(existing){
        const patch:any={last_seen_at:now,last_verified_at:now,state:"active_verified",vacancy_confidence:96,confidence_label:"VERIFIED ACTIVE"};
        if(String(existing.description||"").length<info.description.length)patch.description=info.description;
        const {error:upErr}=await client.from("jobs").update(patch).eq("id",existing.id);
        if(upErr)failures++;else updated++;
       }else{
        const payload={company_id:source.company_id,canonical_title:info.title,
          normalized_title:norm(info.title),role_family:family(info.title),
          seniority:seniority(info.title),employment_type:seniority(info.title)==="internship"?"internship":"full_time",
          description:info.description,city:info.city,country_code:info.country,requisition_id:info.jobId,
          primary_apply_url:info.url,state:"active_verified",vacancy_confidence:96,confidence_label:"VERIFIED ACTIVE",
          published_at:info.published,first_seen_at:now,last_seen_at:now,last_verified_at:now,metadata};
        const {error:insErr}=await client.from("jobs").insert(payload);
        if(insErr){failures++;report.push({title:info.title,error:insErr.message.slice(0,130)})}else created++;
       }
      }catch(e){failures++;report.push({url:link,error:String(e).slice(0,130)})}
     }
     if(!dry&&links.length){
      const nextCursor=cursor+Math.max(1,selected.length)>=links.length?0:cursor+Math.max(1,selected.length);
      await client.from("sources").update({config:{...source.config,catalog_cursor:nextCursor},last_scan_at:new Date().toISOString()}).eq("id",source.id);
     }
    }catch(e){failures++;report.push({catalog:url,error:String(e).slice(0,130)})}
   }
   results.push({source:source.id,listed,checked,created,updated,failures,details:report.slice(0,8)});
  }
  return Response.json({ok:true,dry_run:dry,results});
 }catch(e){return Response.json({error:String(e instanceof Error?e.message:e)},{status:500})}
});
