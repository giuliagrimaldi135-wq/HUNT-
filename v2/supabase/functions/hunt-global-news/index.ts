
import { createClient } from "npm:@supabase/supabase-js@2";
const enc=new TextEncoder();
const MAX_AGE_DAYS=21;
const ACCEPTED=/fashion|luxury|retail|merchandis|buying|buyer|wholesale|apparel|brand|store|boutique|designer|collection|runway|footwear|handbag|accessor|textile|prada|kering|lvmh|moncler|gucci|inditex|sustainab|fashion week|business/i;
const terms={
 leadership:/appoint|ceo|chief executive|director|leadership|management|named president|hires/i,
 retail_expansion:/store|boutique|flagship|opening|opens|retail|expansion|market|distribution|outlet/i,
 results:/earnings|revenue|results|profits|sales growth|quarter|performance|financial/i,
 strategy:/acquisition|investment|stake|merger|restructur|strategy|partnership|deal/i,
 product:/collection|merchandis|buying|assortment|product|launch|footwear|accessor|designer/i
};
async function digest(s:string){const b=await crypto.subtle.digest("SHA-256",enc.encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function equal(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function db(){
 const url=Deno.env.get("SUPABASE_URL")||"";
 const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const p=JSON.parse(raw);key=p.default||Object.values(p)[0]||key}catch{}}
 if(!key||!url)throw Error("Missing Supabase environment");
 return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
function decode(s:string){
 return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(m,k)=>{
  const a={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "};
  if(k[0]==="#"){const n=k[1].toLowerCase()==="x"?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):""}
  return a[k.toLowerCase()]??m;
 }).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
}
function get(xml:string,tag:string){
 const re=new RegExp("<"+tag+"\\b[^>]*>([\\s\\S]*?)<\\/"+tag+">","i");
 return decode(xml.match(re)?.[1]||"");
}
function href(fragment:string){
 const m=fragment.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
 return m?.[1]||get(fragment,"link")||get(fragment,"guid")||"";
}
function theme(t:string){
 for(const [key,re] of Object.entries(terms)){if(re.test(t))return key}
 return "industry";
}
function score(t:string,trust:number){
 let s=45+Math.round((trust-80)*0.2);
 if(terms.retail_expansion.test(t)||terms.strategy.test(t))s+=17;
 if(terms.leadership.test(t)||terms.results.test(t))s+=12;
 if(/merchandis|buying|allocation|wholesale|intern|hiring|recruit|job|talent/i.test(t))s+=22;
 if(terms.product.test(t))s+=8;
 return Math.max(0,Math.min(100,s));
}
function parse(xml:string,source:any){
 const items=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(x=>x[1]);
 const entries=items.length?items:[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map(x=>x[1]);
 const now=Date.now(),out:any[]=[];
 for(const fragment of entries.slice(0,65)){
  const title=get(fragment,"title").slice(0,360);
  const publisherInFeed=get(fragment,"source").slice(0,110);
  const summary=(get(fragment,"description")||get(fragment,"summary")||get(fragment,"content:encoded")).slice(0,300);
  const target=href(fragment);
  let url:URL;try{url=new URL(target)}catch{continue}
  if(!["https:","http:"].includes(url.protocol)||url.username||url.password)continue;
  url.hash="";
  const brand=source.category==="brand_watch"?String(source.publisher).replace(/^Google News · /,"").replace(/ Group$/i,"").toLowerCase():"";
  const mentionsBrand=Boolean(brand&&(title+" "+summary).toLowerCase().includes(brand));
  if(!title||title.length<14||(!ACCEPTED.test(title+" "+summary)&&!mentionsBrand))continue;
  const dateString=get(fragment,"pubDate")||get(fragment,"dc:date")||get(fragment,"published")||get(fragment,"updated");
  const date=new Date(dateString);
  if(!dateString||!Number.isFinite(date.getTime()))continue;
  const age=now-date.getTime();
  if(age>MAX_AGE_DAYS*86400000||age<(-86400000))continue;
  const body=title+" "+summary;
  out.push({
   source_id:source.id,title,url:url.href,summary:summary||null,
   theme:theme(body),relevance_score:score(body,source.trust_level||80),
   published_at:date.toISOString(),
   evidence:{publisher:source.publisher,original_publisher:publisherInFeed||null,aggregator:source.category==="brand_watch"?"Google News":null,region:source.region,language:source.language,source_type:"rss_atom",scanner:"hunt-global-news-v2"}
  });
 }
 return out;
}
Deno.serve(async(req)=>{
 try{
  const client=db();
  const token=req.headers.get("x-hunt-cron")||"";
  const {data:secret,error:secretError}=await client.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
  if(secretError||!secret||!token||!equal(await digest(token),secret.secret_hash))return new Response('{"error":"unauthorized"}',{status:401});
  const {data:sources,error}=await client.from("world_news_sources").select("id,publisher,feed_url,region,language,category,trust_level,last_scan_at,consecutive_failures").eq("active",true).order("last_scan_at",{ascending:true,nullsFirst:true}).limit(20);
  if(error)throw Error(error.message);
  const scan=async(source:any)=>{
   let inserted=0,status="healthy",problem="";
   try{
    const response=await fetch(source.feed_url,{redirect:"follow",signal:AbortSignal.timeout(9500),headers:{"accept":"application/rss+xml,application/atom+xml,application/xml,text/xml,*/*;q=0.6","user-agent":"HUNT-fashion-news/1.0 (public RSS monitoring)"}});
    if(!response.ok)throw Error("HTTP "+response.status);
    const body=(await response.text()).slice(0,1900000);
    if(!/<rss\b|<feed\b|<rdf:RDF\b/i.test(body))throw Error("No RSS or Atom document");
    const items=parse(body,source);
    if(items.length){
      const {data,error:upsertError}=await client.from("world_news_items").upsert(items,{onConflict:"url",ignoreDuplicates:true}).select("id");
      if(upsertError)throw Error(upsertError.message);
      inserted=data?.length||0;
    }
    await client.from("world_news_sources").update({status:"healthy",last_success_at:new Date().toISOString(),last_scan_at:new Date().toISOString(),consecutive_failures:0,last_error:null}).eq("id",source.id);
   }catch(e){
    status="degraded";problem=String(e instanceof Error?e.message:e).slice(0,200);
    await client.from("world_news_sources").update({status,last_scan_at:new Date().toISOString(),consecutive_failures:(source.consecutive_failures||0)+1,last_error:problem}).eq("id",source.id);
   }
   return {publisher:source.publisher,status,inserted,problem};
  };
  const results=await Promise.all((sources||[]).map(scan));
  return Response.json({ok:true,scanned:results.length,inserted:results.reduce((sum,x)=>sum+x.inserted,0),healthy:results.filter(x=>x.status==="healthy").length,results});
 }catch(e){return Response.json({error:String(e instanceof Error?e.message:e)},{status:500})}
});
