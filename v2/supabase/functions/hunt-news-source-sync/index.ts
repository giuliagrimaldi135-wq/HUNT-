
import {createClient} from "npm:@supabase/supabase-js@2";
const enc=new TextEncoder();
async function digest(s:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
function eq(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function admin(){
 const url=Deno.env.get("SUPABASE_URL")||"",raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const p=JSON.parse(raw);key=p.default||Object.values(p)[0]||key}catch{}}
 if(!url||!key)throw Error("Missing Supabase environment");
 return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
Deno.serve(async(req)=>{
 try{
  const db=admin(),token=req.headers.get("x-hunt-cron")||"";
  const {data:secret,error}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
  if(error||!secret||!token||!eq(await digest(token),secret.secret_hash))return Response.json({error:"unauthorized"},{status:401});
  const [{data:companies,error:ce},{data:sources,error:se}]=await Promise.all([
    db.from("companies").select("id,name,monitored").eq("monitored",true).order("name").limit(2000),
    db.from("world_news_sources").select("publisher,feed_url").eq("category","brand_watch").limit(2000)
  ]);
  if(ce||se)throw Error(ce?.message||se?.message);
  const names=new Set((sources||[]).map(x=>String(x.publisher||"")));
  let created=0,skipped=0;const errors:any[]=[];
  for(const company of companies||[]){
    const name=String(company.name||"").trim();
    if(name.length<3||name.length>110||!/\p{L}/u.test(name)){skipped++;continue}
    const publisher="Google News · "+name;
    if(names.has(publisher)){skipped++;continue}
    const feed="https://news.google.com/rss/search?q="+encodeURIComponent('"'+name+'" fashion when:14d')+"&hl=en-US&gl=US&ceid=US%3Aen";
    const {error:write}=await db.from("world_news_sources").upsert({
      publisher,feed_url:feed,region:"global",language:"en",category:"brand_watch",
      trust_level:78,active:true,status:"pending"
    },{onConflict:"feed_url",ignoreDuplicates:true});
    if(write){errors.push({brand:name,error:write.message.slice(0,140)});continue}
    names.add(publisher);created++;
  }
  return Response.json({ok:true,total_companies:companies?.length||0,created,skipped,errors:errors.slice(0,8)});
 }catch(e){return Response.json({error:String(e instanceof Error?e.message:e)},{status:500})}
});
