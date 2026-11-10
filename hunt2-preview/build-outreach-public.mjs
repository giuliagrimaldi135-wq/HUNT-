import {readFile,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
const input=fileURLToPath(new URL("../data/chatgpt_outreach.json",import.meta.url));
const output=fileURLToPath(new URL("../data/outreach_signals_public.json",import.meta.url));
const safeUrl=s=>{try{const u=new URL(String(s||""));return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}};
const values=JSON.parse(await readFile(input,"utf8"));
const publicSignals=(Array.isArray(values)?values:[]).map(x=>({
 key:String(x.key||"").slice(0,180),brand:String(x.brand||"").slice(0,180),
 area:String(x.area||"").slice(0,180),priority:String(x.priority||""),
 why_now:String(x.why_now||"").slice(0,2200),
 source_url:safeUrl(x.source_url||x.url),
 contact:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x.contact||""))&&safeUrl(x.contact_source_url)?String(x.contact):"",
 contact_kind:String(x.contact_kind||"").slice(0,150),
 contact_hint:String(x.contact||"").includes("@")?"":String(x.contact||"").slice(0,250),
 contact_source_url:safeUrl(x.contact_source_url),
 careers_url:safeUrl(x.careers_url),
 signals:(Array.isArray(x.signals)?x.signals:[]).map(s=>({
  date:String(s.date||"").slice(0,35),type:String(s.type||"").slice(0,100),
  description:String(s.description||"").slice(0,1500),url:safeUrl(s.url)
 })).filter(s=>s.url&&s.description),
 updated_at:x.updated_at||null
})).filter(x=>x.brand&&x.source_url&&x.signals.length);
const data=JSON.stringify(publicSignals,null,2)+"\n";
if(/email_draft|email_subject|giulia\.grimaldi/i.test(data))throw Error("Personalized content must not enter public signals JSON");
await writeFile(output,data,"utf8");
console.log("Built "+publicSignals.length+" public outreach source records (no personalized draft bodies).");
