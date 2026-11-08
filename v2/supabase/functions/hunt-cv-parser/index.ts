
import { createClient } from "npm:@supabase/supabase-js@2";
import * as pdfjsLib from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

const enc=new TextEncoder();
async function sha256Hex(v:string){const b=await crypto.subtle.digest("SHA-256",enc.encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function admin(){
 const url=Deno.env.get("SUPABASE_URL")!;const raw=Deno.env.get("SUPABASE_SECRET_KEYS");let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const p=JSON.parse(raw);key=p.default||Object.values(p)[0]||key}catch{}}
 if(!url||!key)throw new Error("Missing admin env");
 return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
function clean(text:string){return text.replace(/\u0000/g,"").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim()}
async function extractPdf(bytes:Uint8Array){
 const task=pdfjsLib.getDocument({data:bytes,disableWorker:true,useSystemFonts:true});
 const pdf=await task.promise;const pages:string[]=[];
 for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i);const tc=await page.getTextContent();
   pages.push((tc.items as any[]).map(x=>typeof x.str==="string"?x.str+(x.hasEOL?"\n":" "):"").join(""));
 }
 return {text:clean(pages.join("\n")),pages:pdf.numPages};
}
Deno.serve(async(req)=>{
 const db=admin();const supplied=req.headers.get("x-hunt-cron")||"";
 const {data:secret}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
 if(!secret||!supplied||!safeEqual(await sha256Hex(supplied),secret.secret_hash))return new Response('{"error":"unauthorized"}',{status:401});
 const body=await req.json().catch(()=>({}));
 let q=db.from("user_cvs").select("id,user_id,name,storage_path,parsed_profile").eq("active",true);
 if(body.cv_id)q=q.eq("id",body.cv_id);
 const {data:cvs,error}=await q.limit(body.cv_id?1:20);if(error)return new Response(JSON.stringify({error:error.message}),{status:500});
 const results:any[]=[];
 for(const cv of cvs||[]){
  try{
   const {data:blob,error:dl}=await db.storage.from("cvs").download(cv.storage_path);
   if(dl||!blob){results.push({id:cv.id,status:"download_error",error:dl?.message});continue}
   const bytes=new Uint8Array(await blob.arrayBuffer());
   if(bytes.byteLength>8*1024*1024){results.push({id:cv.id,status:"file_too_large"});continue}
   if(String.fromCharCode(...bytes.slice(0,4))!=="%PDF"){results.push({id:cv.id,status:"not_a_pdf"});continue}
   const extracted=await extractPdf(bytes);
   if(extracted.text.length<80){results.push({id:cv.id,status:"text_not_extractable",chars:extracted.text.length,pages:extracted.pages});continue}
   // Crucial: extraction does NOT replace a previously verified structured profile.
   const prior=(cv.parsed_profile&&typeof cv.parsed_profile==="object"&&!Array.isArray(cv.parsed_profile))?cv.parsed_profile:{};
   const profile={...prior,raw_text:extracted.text.slice(0,40000),raw_text_hash:await sha256Hex(extracted.text),extracted_at:new Date().toISOString(),extractor_version:"pdfjs-text-v3",page_count:extracted.pages,cv_text_extraction_status:"text_extracted"};
   const {error:up}=await db.from("user_cvs").update({parsed_profile:profile,updated_at:new Date().toISOString()}).eq("id",cv.id);
   results.push({id:cv.id,status:up?"update_error":"parsed",chars:extracted.text.length,pages:extracted.pages});
  }catch(e){results.push({id:cv.id,status:"error",error:e instanceof Error?e.message:String(e)})}
 }
 return new Response(JSON.stringify({ok:true,results}),{headers:{"content-type":"application/json"}});
});
