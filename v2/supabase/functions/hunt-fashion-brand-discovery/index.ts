import {createClient} from "npm:@supabase/supabase-js@2";
const enc=new TextEncoder();
async function sha(v:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
function eq(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
function admin(){const url=Deno.env.get("SUPABASE_URL")||"";let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";try{const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");key=keys.default||Object.values(keys)[0]||key}catch{}if(!url||!key)throw Error("Missing service env");return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}})}
function unescape(v:string){return v.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#(?:39|x27);/gi,"'").replace(/&nbsp;/gi," ").replace(/&[a-z]+;/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function safeUrl(url:string){try{const u=new URL(url);const host=u.hostname.toLowerCase();if(u.protocol!=="https:"||u.username||u.password||host==="localhost"||host.endsWith(".local")||host.endsWith(".internal")||/^(\d+\.){3}\d+$/.test(host)||host.includes(":")||!host.includes(".")||["fashionunited.com","www.fashionunited.com"].includes(host))return null;return u.origin+"/"}catch{return null}}
function profiles(html:string){const out=new Map<string,string>();
 const rx=/<a\b[^>]*href=["']([^"']+\/companies\/([a-z0-9_-]{2,90})(?:[?#/"']|$)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(rx)){const slug=m[2].toLowerCase();if(["companies","jobs","all-brands"].includes(slug))continue;out.set(slug,"https://fashionunited.com/companies/"+slug)}
 return [...out.entries()];
}
function siteFromProfile(html:string,name:string){
 // Profile websites are only untrusted leads; never imply job availability.
 const tail=html.match(/Website:\s*<\/[^>]+>[\s\S]{0,1300}/i)?.[0]||html.slice(-5000);
 for(const m of tail.matchAll(/<a\b[^>]*href=["'](https:\/\/[^"']+)["'][^>]*>/gi)){
   const uri=safeUrl(m[1]);if(!uri)continue;
   const h=new URL(uri).hostname.replace(/^www\./,"").replace(/\.[a-z.]+$/,"");
   const tokens=name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").split(" ").filter(x=>x.length>=4);
   if(tokens.some(t=>h.includes(t.replace(/\s/g,""))))return uri;
 }
 return null;
}
const markets=[["Italy","Womenswear","IT"],["Italy","Menswear","IT"],["Italy","Accessories","IT"],
 ["France","Womenswear","FR"],["France","Footwear","FR"],["Netherlands","Womenswear","NL"],
 ["Netherlands","Menswear","NL"],["Germany","Womenswear","DE"],["Germany","Menswear","DE"],
 ["Belgium","Accessories","BE"],["Spain","Womenswear","ES"],["Japan","Womenswear","JP"],
 ["United Kingdom of Great Britain and Northern Ireland","Womenswear","GB"],["Switzerland","Accessories","CH"],
 ["Italy","Bags","IT"],["France","Jewelry","FR"],["Netherlands","Sustainable","NL"],
 ["United States of America","Womenswear","US"]];
Deno.serve(async(req)=>{
 try{
  const db=admin(),token=req.headers.get("x-hunt-cron")||"";
  const {data:sec,error}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
  if(error||!sec||!token||!eq(await sha(token),sec.secret_hash))return Response.json({error:"unauthorized"},{status:401});
  const slot=Math.floor(Date.now()/1800000)%markets.length;
  const [country,category,countryCode]=markets[slot];
  const listing="https://fashionunited.com/brands?country="+encodeURIComponent(country)+"&industries="+encodeURIComponent(category);
  const response=await fetch(listing,{redirect:"follow",signal:AbortSignal.timeout(11000),headers:{"accept":"text/html","user-agent":"HUNT/2.0 fashion-industry-source-discovery"}});
  if(!response.ok)return Response.json({ok:false,reason:"Directory HTTP "+response.status,route:listing},{status:502});
  const html=(await response.text()).slice(0,1400000);
  if(/captcha|verify you are human|access denied/i.test(html.slice(0,2500)))return Response.json({ok:false,reason:"Directory robots/protection challenge"},{status:503});
  const items=profiles(html);
  if(!items.length){const hint=html.indexOf("/companies/");return Response.json({ok:true,discovered:0,scanned:0,route:listing,note:"No anchor profiles",html_chars:html.length,has_profile_url:hint>=0,html_excerpt:hint>=0?html.slice(Math.max(0,hint-130),hint+320):html.slice(0,340)});}
  const {data:existing,error:lookupErr}=await db.from("companies").select("slug").limit(10000);
  if(lookupErr)throw Error(lookupErr.message);
  const known=new Set((existing||[]).map(x=>String(x.slug).toLowerCase()));
  let created=0,checked=0,websiteLeads=0;const reports:any[]=[];
  for(const [slug,profile] of items){
    if(known.has(slug)||checked>=3)continue;
    checked++;
    try{
      const page=await fetch(profile,{redirect:"follow",signal:AbortSignal.timeout(9500),headers:{"accept":"text/html","user-agent":"HUNT/2.0 brand-directory-source-verification"}});
      if(!page.ok)continue;
      const content=(await page.text()).slice(0,600000);
      const heading=content.match(/<h1\b[^>]*>([\s\S]{1,220}?)<\/h1>/i);
      const name=heading?unescape(heading[1]):"";
      if(name.length<3||name.length>100||/^(companies|international fashion|brands directory)$/i.test(name))continue;
      const website=siteFromProfile(content,name);
      const {data:company,error:insertError}=await db.from("companies").upsert({
        name,slug,website_url:website,country_code:countryCode,sector:"fashion_luxury",monitored:true,
        discovery_source:"fashionunited_public_brand_directory",
        metadata:{discovery_profile:profile,directory_category:category,directory_country:country,
          brand_verified_in_directory:true,careers_verified:false,website_source_verified:false}
      },{onConflict:"slug",ignoreDuplicates:true}).select("id").maybeSingle();
      if(insertError){reports.push({brand:name,error:insertError.message.slice(0,140)});continue}
      if(company){
        created++;known.add(slug);
        // The link is an unverified candidate until an official careers URL is found.
        if(website){
          const {error:srcErr}=await db.from("sources").upsert({
           company_id:company.id,source_type:"brand_website_candidate",source_family:"custom",
           name:name+" · sito indicato dalla directory",base_url:website,
           official:false,trust_level:55,active:true,health_status:"unknown",
           config:{},metadata:{referring_directory_profile:profile,not_a_verified_careers_page:true}
          },{onConflict:"company_id,source_type,base_url",ignoreDuplicates:true});
          if(!srcErr)websiteLeads++;
        }
        reports.push({name,profile,hasWebsite:Boolean(website)});
      }
    }catch(e){reports.push({slug,error:String(e).slice(0,100)})}
  }
  return Response.json({ok:true,route:listing,discovered:created,checked,website_leads:websiteLeads,profiles_on_page:items.length,details:reports});
 }catch(e){return Response.json({error:String(e instanceof Error?e.message:e)},{status:500})}
});