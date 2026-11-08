
import { createClient } from "npm:@supabase/supabase-js@2";

const enc=new TextEncoder();
const DAY=86400000;
async function sha256Hex(v:string){const b=await crypto.subtle.digest("SHA-256",enc.encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function admin(){
 const url=Deno.env.get("SUPABASE_URL")!;
 const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const p=JSON.parse(raw);key=p.default||Object.values(p)[0]||key}catch{}}
 if(!url||!key)throw new Error("Missing Supabase admin environment");
 return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
function clean(v:string){return v.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim()}
function meta(html:string,name:string){
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){
   const tag=m[0];
   const key=(tag.match(/(?:property|name)=["']([^"']+)["']/i)||[])[1];
   const val=(tag.match(/content=["']([^"']+)["']/i)||[])[1];
   if(key&&val&&key.toLowerCase()===name.toLowerCase())return val;
 }
 return null;
}
function jsonLdArticles(html:string){
 const out:any[]=[];
 for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{
   const root=JSON.parse(m[1].trim());
   const walk=(x:any)=>{
    if(!x)return;
    if(Array.isArray(x)){x.forEach(walk);return}
    if(typeof x==="object"){
      const t=x["@type"]; const types=Array.isArray(t)?t:[t];
      if(types.some((v:any)=>["Article","NewsArticle","PressRelease","BlogPosting"].includes(String(v))))out.push(x);
      Object.values(x).forEach(v=>{if(typeof v==="object")walk(v)});
    }
   };
   walk(root);
  }catch{}
 }
 return out;
}
function visibleDate(html:string){
 const text=clean(html).slice(0,14000);
 const months="January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
 const patterns=[
   new RegExp("\\b(\\d{1,2})\\s+("+months+")\\s+(20\\d{2})\\b","i"),
   new RegExp("\\b("+months+")\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b","i"),
   /\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/,
   /\b(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d{2})\b/
 ];
 for(const p of patterns){
   const m=text.match(p); if(!m)continue;
   const candidate=m[0];
   const d=new Date(candidate);
   if(!Number.isNaN(d.getTime()))return d.toISOString();
   if(/^\d{1,2}[-\/.]/.test(candidate)){
     const parts=candidate.split(/[-\/.]/); const x=new Date(Number(parts[2]),Number(parts[1])-1,Number(parts[0]));
     if(!Number.isNaN(x.getTime()))return x.toISOString();
   }
 }
 return null;
}
function isArticlePath(url:string){
 try{
  const segments=new URL(url).pathname.toLowerCase().split("/").filter(Boolean);
  const idx=segments.findIndex(x=>/^(news|news-lvmh|news-section|press-releases-news|press-releases|stories|story|articles|media|journal|magazine|insights|press|releases)$/.test(x));
  if(idx<0||idx>=segments.length-1)return false;
  const last=segments.at(-1)||"";
  if(/^(news|media|press|press-releases|press-releases-news|news-section|media-library|newsroom|archive|contact|events|stories)$/.test(last))return false;
  return last.length>=8;
 }catch{return false}
}
function articleFromHtml(html:string,url:string){
 const structured=jsonLdArticles(html);
 const a=structured[0]||{};
 const title=clean(String(a.headline||meta(html,"og:title")||meta(html,"twitter:title")||html.match(/<title[^>]*>(.*?)<[/]title>/is)?.[1]||""));
 const description=clean(String(a.description||meta(html,"description")||meta(html,"og:description")||""));
 const metaDate=String(a.datePublished||meta(html,"article:published_time")||meta(html,"datePublished")||"");
 const timeTag=(html.match(/<time[^>]*datetime=["\x27]([^"\x27]+)["\x27]/i)||[])[1]||"";
 const rawDate=metaDate||timeTag;
 const d=rawDate?new Date(rawDate):null;
 const published=d&&!Number.isNaN(d.getTime())?d.toISOString():(isArticlePath(url)?visibleDate(html):null);
 const articleEvidence=Boolean(structured.length||meta(html,"article:published_time")||(isArticlePath(url)&&(timeTag||published)));
 return {title,description,published,url,articleEvidence};
}
function candidateLinks(html:string,base:string){
 const out=new Map<string,string>();
 for(const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  try{
   const url=new URL(m[1],base); const root=new URL(base);
   if(url.origin!==root.origin||!["http:","https:"].includes(url.protocol)||!isArticlePath(url.href))continue;
   const text=clean(m[2]); if(text.length<12||text.length>180)continue;
   const s=(url.pathname+" "+text).toLowerCase();
   if(!/(news|press|story|stories|journal|result|financial|investor|acquisition|partnership|opening|appoint|launch|collection|campaign)/.test(s))continue;
   if(/privacy|cookie|contact|newsletter|subscribe|faq|terms/.test(s))continue;
   out.set(url.href,text);
  }catch{}
 }
 return [...out.entries()].slice(0,12).map(([url,text])=>({url,text}));
}
function relevance(title:string,description:string,type:string){
 const t=(title+" "+description).toLowerCase(); let score=55;
 if(type==="investor_relations")score+=15;
 if(/revenue|sales|growth|results|earnings|performance|margin/.test(t))score+=15;
 if(/opening|store|retail|expansion|market|distribution/.test(t))score+=12;
 if(/ceo|director|appoint|leadership|management/.test(t))score+=12;
 if(/acquisition|partnership|investment|strategy|restructur/.test(t))score+=12;
 if(/product|collection|category|merchandis|launch/.test(t))score+=8;
 return Math.min(100,score);
}
function signalType(title:string,desc:string,sourceType:string){
 const t=(title+" "+desc).toLowerCase();
 if(/ceo|director|appoint|leadership|management/.test(t))return "leadership";
 if(/revenue|sales|growth|results|earnings|performance|margin/.test(t))return "results";
 if(/opening|store|retail|expansion|market|distribution/.test(t))return "retail_expansion";
 if(/acquisition|partnership|investment|strategy|restructur/.test(t))return "strategy";
 if(/product|collection|category|merchandis|launch/.test(t))return "product";
 if(sourceType==="sustainability")return "sustainability";
 return "news";
}
Deno.serve(async(req)=>{
 const db=admin();
 const supplied=req.headers.get("x-hunt-cron")||"";
 const {data:secret}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
 if(!secret||!supplied||!safeEqual(await sha256Hex(supplied),secret.secret_hash))return new Response('{"error":"unauthorized"}',{status:401});

 const {data:sources}=await db.from("intelligence_sources")
   .select("id,company_id,source_type,platform,name,url,official,trust_level,last_scan_at,consecutive_failures,companies(name)")
   .eq("active",true).eq("platform","web")
   .in("source_type",["newsroom","investor_relations"])
   .order("last_scan_at",{ascending:true,nullsFirst:true}).limit(8);

 let scanned=0,signals=0,errors=0;
 for(const source of sources||[]){
   scanned++;
   const started=new Date().toISOString();
   let extracted=0,requestOk=false,parserOk=false;
   try{
     const res=await fetch(source.url,{redirect:"follow",signal:AbortSignal.timeout(8000),headers:{"user-agent":"Mozilla/5.0 HUNT Company Intelligence/1.0","accept":"text/html,application/xhtml+xml"}});
     requestOk=res.ok; if(!res.ok)throw new Error("HTTP "+res.status);
     const contentType=res.headers.get("content-type")||"";
     if(!/html/i.test(contentType))throw new Error("Unsupported content type");
     const html=(await res.text()).slice(0,2000000); parserOk=true;
     const rootUrl=res.url||source.url;
     const candidates=[{url:rootUrl,text:""},...candidateLinks(html,rootUrl).slice(0,4)];
     const seen=new Set<string>();
     for(const cand of candidates){
       if(seen.has(cand.url))continue; seen.add(cand.url);
       let pageHtml=html;
       if(cand.url!==rootUrl){
         try{
           const pr=await fetch(cand.url,{redirect:"follow",signal:AbortSignal.timeout(6000),headers:{"user-agent":"Mozilla/5.0 HUNT Company Intelligence/1.0","accept":"text/html"}});
           if(!pr.ok)continue; pageHtml=await pr.text();
         }catch{continue}
       }
       const a=articleFromHtml(pageHtml,cand.url);
       if(!a.articleEvidence||!a.title||a.title.length<8||!a.published)continue;
       const age=Math.floor((Date.now()-new Date(a.published).getTime())/DAY);
       if(age<0||age>120)continue;
       const rel=relevance(a.title,a.description,source.source_type);
       if(rel<65)continue;
       const {error}=await db.from("company_signals").upsert({
         company_id:source.company_id,
         signal_type:signalType(a.title,a.description,source.source_type),
         title:a.title.slice(0,300),
         summary:a.description?a.description.slice(0,1200):null,
         source_name:source.companies?.name||source.name||"Official source",
         source_url:a.url,
         published_at:a.published,
         detected_at:new Date().toISOString(),
         relevance_score:rel,
         evidence:{source_id:source.id,source_type:source.source_type,official:source.official,trust_level:source.trust_level,scanner:"hunt-intelligence-v2"}
       },{onConflict:"company_id,source_url"});
       if(!error){signals++;extracted++}
     }
     await db.from("intelligence_sources").update({last_scan_at:new Date().toISOString(),last_success_at:new Date().toISOString(),health_status:"healthy",consecutive_failures:0,updated_at:new Date().toISOString()}).eq("id",source.id);
   }catch{
     errors++;
     await db.from("intelligence_sources").update({last_scan_at:new Date().toISOString(),health_status:"degraded",consecutive_failures:(source.consecutive_failures||0)+1,updated_at:new Date().toISOString()}).eq("id",source.id);
   }
   await db.from("intelligence_scan_runs").insert({source_id:source.id,started_at:started,finished_at:new Date().toISOString(),request_ok:requestOk,parser_ok:parserOk,extracted_items:extracted,health_status:requestOk?"healthy":"degraded",metadata:{scanner:"hunt-intelligence-v2"}});
 }
 return new Response(JSON.stringify({ok:true,scanned,signals,errors}),{headers:{"content-type":"application/json"}});
});
