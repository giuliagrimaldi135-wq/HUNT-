
import { createClient } from "npm:@supabase/supabase-js@2";
import { shouldScanSource } from "./source-health-policy.mjs";
import { safeVacancyCandidate, resolveSharedBoardEmployer, canRetryReview } from "./candidate-integrity.mjs";
import { normalizedCareerURL, selectUniqueCareerSources } from "./shared-source-policy.mjs";
import { parseOfficialPostedDate, extractOfficialJobTitle, extractOfficialJobDescription } from "./successfactors-microdata.mjs";

const enc = new TextEncoder();
const HOUR = 3600000;
const DAY = 86400000;

async function sha256Hex(v:string){
  const b=await crypto.subtle.digest("SHA-256",enc.encode(v));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function admin(){
  const url=Deno.env.get("SUPABASE_URL")!;
  const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
  let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(raw){try{const p=JSON.parse(raw);key=p.default||Object.values(p)[0]||key}catch{}}
  if(!url||!key)throw new Error("Missing Supabase admin environment");
  return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
function cleanText(v:string){return v.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim()}
function normalized(v:string){return v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim()}
function roleFamily(title:string){
  const t=title.toLowerCase();
  if(/facilit|store planning|store design|construction|architect|building services|maintenance coordinator|real estate/.test(t)) return "Facilities & Store Development";
  if(/human resources|\bhr\b|talent|people intern|people partner|people manager/.test(t)) return "HR & Talent";
  if(/finance|controll|accounting|legal|treasury|tax/.test(t)) return "Finance & Legal";
  if(/visual merchandis/.test(t)) return "Visual Merchandising";
  if(/supply chain|logistics|warehouse/.test(t)) return "Supply Chain & Logistics";
  if(/production|sourcing|procurement/.test(t)) return "Production & Sourcing";
  if(/planning|allocation|planner|demand planning/.test(t)) return "Planning & Allocation";
  if(/e.?commerce|digital commerce|site merchandising/.test(t)) return "E-commerce & Digital";
  if(/product developer|product development|product manager|product management/.test(t)) return "Product Management & Development";
  if(/\bbuy(er|ing)?\b/.test(t)) return "Buying";
  if(/merchandis/.test(t)) return "Merchandising";
  if(/retail operations|store operations|retail performance|retail excellence/.test(t)) return "Retail & Retail Operations";
  if(/wholesale|commercial|sales operations/.test(t)) return "Wholesale & Commercial";
  if(/crm|clienteling/.test(t)) return "CRM & Clienteling";
  if(/communication|public relations|\bpr\b|event/.test(t)) return "PR, Communications & Events";
  if(/marketing|brand/.test(t)) return "Marketing & Brand";
  if(/design|creative|designer/.test(t)) return "Design & Creative";
  if(/data|analytics|business intelligence/.test(t)) return "Data & Analytics";
  if(/strategy|project manager|project management/.test(t)) return "Strategy & Project Management";
  if(/sustainab/.test(t)) return "Sustainability";
  if(/technology|\bit\b|software developer|engineer/.test(t)) return "Technology";
  return null;
}

function seniority(title:string){
  const t=title.toLowerCase();
  if(/intern|stage|tirocin/.test(t)) return "internship";
  if(/trainee|graduate/.test(t)) return "trainee";
  if(/assistant/.test(t)) return "assistant";
  if(/junior|jr\.?/.test(t)) return "junior";
  if(/director|head of/.test(t)) return "head_director";
  if(/senior manager/.test(t)) return "senior_manager";
  if(/manager/.test(t)) return "manager";
  return "entry_level";
}
function employment(title:string,raw:any){
  const v=Array.isArray(raw)?raw.join(" "):String(raw||"");
  if(/intern|stage|tirocin/i.test(title+" "+v))return "internship";
  if(/temporary|fixed|determinat/i.test(v))return "fixed_term";
  return "full_time";
}
function cityFrom(job:any){
  const loc=Array.isArray(job.jobLocation)?job.jobLocation[0]:job.jobLocation;
  const addr=loc?.address||{};
  return addr.addressLocality||addr.addressRegion||null;
}
function collectJobPostings(value:any,out:any[]=[]){
  if(!value)return out;
  if(Array.isArray(value)){for(const x of value)collectJobPostings(x,out);return out}
  if(typeof value==="object"){
    const ty=value["@type"];
    if(ty==="JobPosting"||(Array.isArray(ty)&&ty.includes("JobPosting")))out.push(value);
    for(const x of Object.values(value)) if(typeof x==="object") collectJobPostings(x,out);
  }
  return out;
}
function jsonLdJobs(html:string){
  const out:any[]=[];
  for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{collectJobPostings(JSON.parse(m[1].trim()),out)}catch{}
  }
  return out;
}

function metaValue(html:string,attribute:string,value:string){
 const tags=html.match(/<meta\b[^>]*>/gi)||[];
 for(const tag of tags){
  const a=tag.match(new RegExp("\\b"+attribute+"\\s*=\\s*[\"']([^\"']+)[\"']","i"));
  if(!a||a[1].toLowerCase()!==value.toLowerCase())continue;
  const found=tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i);
  if(found)return cleanText(found[1]);
 }
 return "";
}
function microdataValue(html:string,field:string){
 const tags=html.match(/<[^>]+\bitemprop\s*=\s*["'][^"']+["'][^>]*>/gi)||[];
 for(const tag of tags){
  const m=tag.match(/\bitemprop\s*=\s*["']([^"']+)["']/i);
  if(m?.[1]?.toLowerCase()!==field.toLowerCase())continue;
  const content=tag.match(/\b(?:content|datetime|value)\s*=\s*["']([^"']+)["']/i);
  if(content)return cleanText(content[1]);
 }
 const inline=html.match(new RegExp("itemprop\\s*=\\s*[\"']"+field+"[\"'][^>]*>([^<]{2,160})<","i"));
 return inline?cleanText(inline[1]):"";
}
function strictPostedDate(html:string){
 const dates=[
  microdataValue(html,"datePosted"),
  metaValue(html,"itemprop","datePosted"),
  metaValue(html,"name","datePosted"),
  ...[...html.matchAll(/["'](?:datePosted|postingStartDate|postedDate)["']\s*:\s*["'](\d{4}-\d{2}-\d{2}(?:T[^"']*)?)["']/gi)].map(x=>x[1])
 ];
 for(const raw of dates){
  const posted=parseOfficialPostedDate(raw);
  if(posted)return posted;
 }
 return null;
}
function fallbackPosting(html:string,url:string,hint:string){
 // Only promote a *real job page* when the site publishes an explicit posting date.
 const path=new URL(url).pathname;
 if(!/\/job\/[^/]+\/\d{5,}\/?|\/jobs?\/[^/]*\d{5,}|\/job\/[^/]{6,}/i.test(path))return null;
 if(/position (has been filled|is no longer available)|job has expired|not available for applications/i.test(html))return null;
 const posted=strictPostedDate(html);
 if(!posted)return null;
 const fromMeta=metaValue(html,"property","og:title")||metaValue(html,"name","twitter:title")||microdataValue(html,"title");
 const title=cleanText(extractOfficialJobTitle(html)||hint||fromMeta).replace(/\s*[-|]\s*(Careers|Jobs|Apply).*$/i,"").slice(0,170);
 if(title.length<7||/search jobs|view all jobs|careers|login|our people|apply now/i.test(title))return null;
 const location=microdataValue(html,"addressLocality")||null;
 const summary=extractOfficialJobDescription(html);
 // A date/title alone is not enough to qualify as a real actionable vacancy.
 if(!summary)return null;
 return {title,datePosted:posted,description:summary,jobLocation:location?{address:{addressLocality:location}}:null,hiringOrganization:null,identifier:null};
}

function candidateLinks(html:string,base:string){
  const map=new Map<string,string>();
  for(const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const found=safeVacancyCandidate(m[1],cleanText(m[2]),base);
    if(found)map.set(found.url,found.title);
  }
  return [...map.entries()].slice(0,80).map(([url,title])=>({url,title}));
}

function ageDays(date:string){return Math.floor((Date.now()-new Date(date).getTime())/DAY)}
function freshnessScore(age:number){return Math.max(20,100-age*4)}
function locationHit(city:string|null,arr:any[]){
  if(!city)return false; const c=city.toLowerCase();
  return (arr||[]).some(x=>{const a=String(x).toLowerCase();return c.includes(a)||a.includes(c)});
}
function requisitionFromUrl(url:string){
  try{
    const u=new URL(url);
    const q=u.searchParams.get("JobID")||u.searchParams.get("jobId")||u.searchParams.get("jobid");
    if(q)return q;
    const m=u.pathname.match(/\/jobs?\/(\d{4,})/i)||u.pathname.match(/\/job\/[^/]+\/(\d{5,})(?:\/|$)/i);
    return m?.[1]||null;
  }catch{return null}
}
function resolveCompanyId(jp:any,title:string,fallback:string,companies:any[]){
  const org=normalized(String(jp?.hiringOrganization?.name||""));
  const hay=normalized(org+" "+title);
  const exact=companies
    .filter(c=>{const n=normalized(c.name);return n&&n.length>=4&&(hay.includes(n)||(org&&n.includes(org)))})
    .sort((a,b)=>normalized(b.name).length-normalized(a.name).length)[0];
  if(exact)return exact.id;
  const hints=[
    ["gucci","gucci"],["bottega veneta","bottega-veneta"],["saint laurent","saint-laurent"],
    ["balenciaga","balenciaga"],["brioni","brioni"],["moncler","moncler"],["stone island","stone-island"],
    ["zegna","zegna"],["valentino","valentino"],["prada","prada-group"],["miu miu","prada-group"]
  ];
  const lower=(title+" "+String(jp?.hiringOrganization?.name||"")).toLowerCase();
  for(const [needle,slug] of hints){if(lower.includes(needle)){const found=companies.find(c=>c.slug===slug);if(found)return found.id}}
  return fallback;
}

Deno.serve(async(req)=>{
  const db=admin();
  const supplied=req.headers.get("x-hunt-cron")||"";
  const {data:secret}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
  if(!secret||!supplied||!safeEqual(await sha256Hex(supplied),secret.secret_hash))return new Response('{"error":"unauthorized"}',{status:401});

  const summary={sources:0,source_ok:0,candidates:0,parsed:0,promoted:0,old:0,needs_review:0,errors:0,backoff_skipped:0,review_retries:0,shared_duplicate_sources_skipped:0};

  const {data:sources}=await db.from("sources")
    .select("id,company_id,base_url,official,source_type,source_family,last_scan_at,last_success_at,consecutive_failures,companies(name)")
    .eq("active",true).eq("official",true).neq("source_type","public_ats_board").not("base_url","is",null)
    .order("last_scan_at",{ascending:true,nullsFirst:true}).limit(1000);

  const uniqueSources=selectUniqueCareerSources(sources||[]);
  summary.shared_duplicate_sources_skipped=Math.max(0,(sources||[]).length-uniqueSources.length);
  for(const source of uniqueSources){
    if(summary.sources>=18)break;
    if(!shouldScanSource(source)){summary.backoff_skipped++;continue}
    summary.sources++;
    const started=new Date().toISOString();
    let extracted=0,requestOk=false,parserOk=false,errorCode:string|null=null;
    let errorDetail="";
    try{
      const res=await fetch(source.base_url,{redirect:"follow",signal:AbortSignal.timeout(12000),headers:{"user-agent":"Mozilla/5.0 HUNT Career Discovery/1.0","accept":"text/html,application/xhtml+xml"}});
      requestOk=res.ok;
      if(res.ok){
        const html=await res.text();
        const links=candidateLinks(html,res.url||source.base_url);
        extracted=links.length; parserOk=true; summary.source_ok++;
        for(const link of links){
          // Preserve prior review decisions and retry counters when another
          // shared-group careers page discovers the same listing again.
          const {error}=await db.from("job_candidates").upsert({
            source_id:source.id,company_id:source.company_id,listing_url:link.url,title_hint:link.title,
            last_seen_at:new Date().toISOString(),
            raw:{source_family:source.source_family,company:source.companies?.name||null}
          },{onConflict:"listing_url",ignoreDuplicates:true});
          if(!error)summary.candidates++;
        }
        for(let i=0;i<links.length;i+=80){
          const {error:seenError}=await db.from("job_candidates")
            .update({last_seen_at:new Date().toISOString()})
            .in("listing_url",links.slice(i,i+80).map((x:any)=>x.url));
          if(seenError)summary.errors++;
        }
      }
      if(!requestOk){errorCode="http_error";summary.errors++;}
    }catch(e){
      errorCode="fetch_exception";
      errorDetail=String(e instanceof Error?e.message:e).slice(0,140);
      summary.errors++;
    }
    const healthy=requestOk&&parserOk;
    const updated:any={
      last_scan_at:new Date().toISOString(),
      health_status:healthy?(extracted>0?"healthy":"reachable_no_listings"):"degraded",
      consecutive_failures:healthy?0:Number(source.consecutive_failures||0)+1
    };
    // Never overwrite last_success_at with the time of a failed request.
    if(healthy)updated.last_success_at=new Date().toISOString();
    // Shared career-board URLs represent the same endpoint for sibling brands.
    // Synchronize health for all exact-URL copies, rather than allowing stale
    // duplicate records to accumulate fake errors or trigger extra retries.
    const physicalURL=normalizedCareerURL(source.base_url);
    const sameEndpointIDs=(sources||[])
      .filter((s:any)=>s.active!==false&&s.source_type===source.source_type
        &&normalizedCareerURL(s.base_url)===physicalURL)
      .map((s:any)=>s.id);
    const {error:healthError}=await db.from("sources").update(updated)
      .in("id",sameEndpointIDs);
    if(healthError)summary.errors++;
    await db.from("source_scan_runs").insert({
      source_id:source.id,started_at:started,finished_at:new Date().toISOString(),
      request_ok:requestOk,parser_ok:parserOk,extracted_jobs:extracted,
      health_status:healthy?(extracted>0?"healthy":"reachable_no_listings"):"degraded",
      error_code:errorCode,
      metadata:{runner:"hunt-source-discovery-v2",...(errorDetail?{error_detail:errorDetail}:{})}
    });
  }

  const [{data:newCandidates,error:newError},{data:reviewCandidates,error:reviewError}]=await Promise.all([
    db.from("job_candidates")
      .select("id,source_id,company_id,listing_url,title_hint,status,raw,parsed_at,last_seen_at,sources(official),companies(name)")
      .eq("status","discovered").order("discovered_at",{ascending:true}).limit(30),
    db.from("job_candidates")
      .select("id,source_id,company_id,listing_url,title_hint,status,raw,parsed_at,last_seen_at,sources(official),companies(name)")
      .eq("status","needs_review").order("parsed_at",{ascending:true}).limit(700)
  ]);
  if(newError||reviewError)return new Response('{"ok":false,"error":"candidate_read_failed"}',{status:503,headers:{"content-type":"application/json"}});
  // Retry only recently seen leads with independent employer evidence,
  // after a 24h pause and no more than two review attempts.
  const cands=[...(newCandidates||[]),...(reviewCandidates||[])
    .filter((c:any)=>canRetryReview(c)).slice(0,6)];

  const {data:prefs}=await db.from("career_preferences").select("user_id,primary_role_families,preferred_locations,relocation_locations,employment_types,preferences");
  const {data:profiles}=await db.from("profiles").select("user_id,seniority").eq("onboarding_completed",true);
  const {data:personalizations}=await db.from("user_personalization").select("user_id,avoid_role_traits");
  const {data:companies}=await db.from("companies").select("id,name,slug");
  const profileMap=new Map((profiles||[]).map((p:any)=>[p.user_id,p]));
  const personalizationMap=new Map((personalizations||[]).map((p:any)=>[p.user_id,p]));

  for(const cand of cands){
    const extraReview=cand.status==="needs_review";
    const attempt=(Number(cand.raw?.review_retry_count)||0)+(extraReview?1:0);
    const originalRaw={...(cand.raw||{}),...(extraReview?{review_retry_count:attempt}:{})};
    if(!safeVacancyCandidate(cand.listing_url,cand.title_hint,cand.listing_url)){
      await db.from("job_candidates").update({
        status:"needs_manual_review",parsed_at:new Date().toISOString(),
        raw:{...originalRaw,reason:"invalid_candidate_link"}
      }).eq("id",cand.id);
      summary.needs_review++;
      continue;
    }
    if(extraReview){
      summary.review_retries++;
      // Even a transient fetch failure consumes a bounded retry attempt.
      await db.from("job_candidates").update({
        status:attempt>=2?"needs_manual_review":"needs_review",
        parsed_at:new Date().toISOString(),raw:originalRaw
      }).eq("id",cand.id);
    }
    try{
      const res=await fetch(cand.listing_url,{redirect:"follow",signal:AbortSignal.timeout(10000),headers:{"user-agent":"Mozilla/5.0 HUNT Job Parser/1.0","accept":"text/html,application/xhtml+xml"}});
      if(!res.ok){summary.errors++;continue}
      const html=await res.text();
      const postings=jsonLdJobs(html);
      const jp=postings.find((x:any)=>x.title&&x.datePosted)||fallbackPosting(html,cand.listing_url,cand.title_hint);
      if(!jp||!jp.title||!jp.datePosted){
        await db.from("job_candidates").update({status:extraReview&&attempt>=2?"needs_manual_review":"needs_review",parsed_at:new Date().toISOString(),raw:{...originalRaw,reason:"missing_jsonld_or_date"}}).eq("id",cand.id);
        summary.needs_review++;continue;
      }
      summary.parsed++;
      const age=ageDays(jp.datePosted);
      if(age<0||age>20){
        await db.from("job_candidates").update({status:"skipped_old",parsed_at:new Date().toISOString(),raw:{...originalRaw,datePosted:jp.datePosted,age_days:age}}).eq("id",cand.id);
        summary.old++;continue;
      }
      const title=cleanText(String(jp.title));
      const city=cityFrom(jp);
      const family=roleFamily(title);
      const reqId=String(jp.identifier?.value||jp.identifier?.name||"").trim()||requisitionFromUrl(cand.listing_url);
      const resolvedCompanyId=resolveSharedBoardEmployer(cand.listing_url,title,companies||[])||resolveCompanyId(jp,title,cand.company_id,companies||[]);
      const official=Boolean(cand.sources?.official);
      const confidence=official?96:78;
      const state=official?"active_verified":"active_likely";
      const label=official?"VERIFIED ACTIVE":"LIKELY ACTIVE";
      const desc=cleanText(String(jp.description||"")).slice(0,12000);

      const {data:existingSource}=await db.from("job_sources").select("job_id").eq("source_id",cand.source_id).eq("listing_url",cand.listing_url).maybeSingle();
      let jobId=existingSource?.job_id||null;
      if(!jobId&&reqId){
        const {data:existingReq}=await db.from("jobs").select("id").eq("company_id",resolvedCompanyId).eq("requisition_id",reqId).maybeSingle();
        jobId=existingReq?.id||null;
      }
      if(!jobId){
        const {data:existingTitle}=await db.from("jobs").select("id").eq("company_id",resolvedCompanyId).eq("normalized_title",normalized(title)).eq("city",city).gte("published_at",new Date(Date.now()-60*DAY).toISOString()).limit(1).maybeSingle();
        jobId=existingTitle?.id||null;
      }
      if(!jobId){
        const {data:newJob,error:jobErr}=await db.from("jobs").insert({
          company_id:resolvedCompanyId,canonical_title:title,normalized_title:normalized(title),role_family:family,seniority:seniority(title),
          employment_type:employment(title,jp.employmentType),city,description:desc,requisition_id:reqId,primary_apply_url:cand.listing_url,
          state,vacancy_confidence:confidence,confidence_label:label,published_at:new Date(jp.datePosted).toISOString(),
          last_seen_at:new Date().toISOString(),last_verified_at:new Date().toISOString(),
          metadata:{discovered_by:"hunt-source-discovery-v3",date_posted_source:postings.length?"jsonld_or_official_microdata":"official_microdata"}
        }).select("id").single();
        if(jobErr||!newJob){summary.errors++;continue}
        jobId=newJob.id;
        await db.from("job_sources").insert({
          job_id:jobId,source_id:cand.source_id,external_job_id:reqId,listing_url:cand.listing_url,apply_url:cand.listing_url,requisition_id:reqId,
          raw_title:title,raw_location:city,published_at:new Date(jp.datePosted).toISOString(),last_seen_at:new Date().toISOString(),last_verified_at:new Date().toISOString(),active:true
        });
      }else{
        await db.from("jobs").update({company_id:resolvedCompanyId,role_family:family,requisition_id:reqId||undefined,state,vacancy_confidence:confidence,confidence_label:label,published_at:new Date(jp.datePosted).toISOString(),last_seen_at:new Date().toISOString(),last_verified_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",jobId);
        const {data:linked}=await db.from("job_sources").select("id").eq("source_id",cand.source_id).eq("listing_url",cand.listing_url).maybeSingle();
        if(!linked){
          await db.from("job_sources").insert({job_id:jobId,source_id:cand.source_id,external_job_id:reqId,listing_url:cand.listing_url,apply_url:cand.listing_url,requisition_id:reqId,raw_title:title,raw_location:city,published_at:new Date(jp.datePosted).toISOString(),last_seen_at:new Date().toISOString(),last_verified_at:new Date().toISOString(),active:true});
        }
      }

      await db.from("job_observations").insert({job_id:jobId,listing_present:true,apply_works:true,http_status:res.status,title,location:city,raw:{monitor:"hunt-source-discovery-v1",datePosted:jp.datePosted}});
      await db.from("job_candidates").update({status:"promoted",parsed_at:new Date().toISOString(),raw:{...originalRaw,datePosted:jp.datePosted,age_days:age,title,city}}).eq("id",cand.id);
      summary.promoted++;

      // Matching is handled by the dedicated hunt-match-refresh eligibility engine.
    }catch(e){summary.errors++}
  }

  try{
    await fetch("https://dfiokxjfgqoboxckcuut.supabase.co/functions/v1/hunt-match-refresh",{
      method:"POST",
      headers:{"content-type":"application/json","x-hunt-cron":supplied},
      body:JSON.stringify({trigger:"source-discovery"})
    });
  }catch{}
  return new Response(JSON.stringify({ok:true,...summary}),{headers:{"content-type":"application/json"}});
});
