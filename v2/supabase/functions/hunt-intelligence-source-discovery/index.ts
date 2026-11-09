
import { createClient } from "npm:@supabase/supabase-js@2";

const enc=new TextEncoder();
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
function clean(v:string){return v.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim()}
function classify(url:string,text:string,home:string){
 const s=(url+" "+text).toLowerCase();
 if(/instagram\.com\/[a-z0-9_.-]+\/?/i.test(url))return ["social","instagram"];
 if(/linkedin\.com\/(company|in)\/[a-z0-9_.%-]+\/?/i.test(url))return ["social","linkedin"];
 if(/tiktok\.com\/@[a-z0-9_.-]+\/?/i.test(url))return ["social","tiktok"];
 if(/youtube\.com\/(?:@|user\/|channel\/)[a-z0-9_.-]+/i.test(url))return ["social","youtube"];
 if(/investor|investors|shareholder|financial|results|earnings/.test(s))return ["investor_relations","web"];
 if(/newsroom|press(?:-|\/|\s)|\/news(?:\/|\?|$)|stories|journal|magazine/.test(s))return ["newsroom","web"];
 if(/sustainab|responsib|esg/.test(s))return ["sustainability","web"];
 try{
   const u=new URL(url),h=new URL(home);
   if(u.origin===h.origin&&u.pathname!=="/")return ["official_web","web"];
 }catch{}
 return null;
}
function links(html:string,base:string){
 const out=new Map<string,{url:string,text:string,type:string,platform:string}>();
 for(const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  try{
   const parsed=new URL(m[1],base);
   if(!["https:","http:"].includes(parsed.protocol)||parsed.username||parsed.password)continue;
   parsed.hash="";
   const url=parsed.href;
   if(url.length>600)continue;
   const text=clean(m[2]).slice(0,160);
   const c=classify(url,text,base);
   if(!c)continue;
   // Keep the registry focused on durable source hubs, not individual articles.
   if(c[0]==="newsroom"){
     const parts=parsed.pathname.toLowerCase().split("/").filter(Boolean);
     const last=parts.at(-1)||"";
     if(!/^(news|news-media|newsroom|press|press-room|press-releases|press-releases-news|media|stories|journal|magazine|updates|news-events|media-centre|media-center)$/.test(last))continue;
   }
   const noise=(url+" "+text).toLowerCase();
   if(/newsletter|subscribe|subscription|privacy|cookie|ethicspoint|contact|faq|modern-slavery|terms/.test(noise))continue;
   if(/\.(pdf|docx?|xlsx?)($|\?)/i.test(url)&&c[0]!=="investor_relations")continue;
   if(c[0]==="official_web"&&!/(news|press|story|stories|journal|invest|sustainab)/i.test(url+" "+text))continue;
   out.set(url,{url,text,type:c[0],platform:c[1]});
  }catch{}
 }
 return [...out.values()].slice(0,40);
}
Deno.serve(async(req)=>{
 const db=admin();
 const supplied=req.headers.get("x-hunt-cron")||"";
 const {data:secret}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
 if(!secret||!supplied||!safeEqual(await sha256Hex(supplied),secret.secret_hash))return new Response('{"error":"unauthorized"}',{status:401});

 const {data:companies}=await db.from("companies")
   .select("id,name,website_url,metadata")
   .eq("monitored",true)
   .not("website_url","is",null)
   .order("updated_at",{ascending:true})
   .limit(8);

 let scanned=0,discovered=0,errors=0;
 for(const company of companies||[]){
  scanned++;
  try{
   const res=await fetch(company.website_url,{redirect:"follow",signal:AbortSignal.timeout(7000),headers:{"user-agent":"Mozilla/5.0 HUNT Intelligence Discovery/1.0","accept":"text/html,application/xhtml+xml"}});
   if(!res.ok){errors++;continue}
   const html=await res.text();
   const found=links(html,res.url||company.website_url);
   for(const item of found){
     const official=item.platform==="web"||item.type==="social";
     const trust=item.platform==="web"?100:90;
     const {data:inserted,error}=await db.from("intelligence_sources").upsert({
       company_id:company.id,source_type:item.type,platform:item.platform,name:item.text||null,url:item.url,
       official,trust_level:trust,active:true,health_status:"unknown",
       metadata:{discovered_from:company.website_url,discovered_at:new Date().toISOString()}
     },{onConflict:"company_id,url",ignoreDuplicates:true}).select("id");
     // Conflict-free inserts only: never reset health/last success on a rediscovery.
     if(!error&&inserted?.length)discovered+=inserted.length;
   }
   await db.from("companies").update({
     metadata:{...(company.metadata||{}),last_intelligence_discovery_at:new Date().toISOString()},
     updated_at:new Date().toISOString()
   }).eq("id",company.id);
  }catch{errors++}
  finally{
   // Rotate even when an employer temporarily blocks us; otherwise the first failed websites starve all newer brands.
   await db.from("companies").update({updated_at:new Date().toISOString()}).eq("id",company.id);
  }
 }
 return new Response(JSON.stringify({ok:true,scanned,discovered,errors}),{headers:{"content-type":"application/json"}});
});
