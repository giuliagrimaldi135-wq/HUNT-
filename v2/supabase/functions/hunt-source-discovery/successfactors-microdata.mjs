// SAP SuccessFactors publishes JobPosting as HTML microdata, not always JSON-LD.
export function parseOfficialPostedDate(raw,nowMs=Date.now()){
 const value=String(raw||"").trim();
 const iso=/^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/.test(value);
 const sap=/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(?:UTC|GMT)\s+20\d{2}$/i.test(value);
 if(!iso&&!sap)return null;
 const ms=Date.parse(value);
 if(!Number.isFinite(ms)||ms>nowMs+86400000||ms<Date.parse("2010-01-01T00:00:00Z"))return null;
 return new Date(ms).toISOString();
}
function textOnly(input){
 return String(input||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
  .replace(/<\s*\/?\s*(?:p|li|div|h[1-6]|section|article|br|tr)\b[^>]*>/gi,". ")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&")
  .replace(/&quot;|&#34;/gi,'"').replace(/&apos;|&#39;|&#x27;/gi,"'")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(1114111,Number(n))))
  .replace(/\s+/g," ").replace(/(?:\.\s*){2,}/g,". ").trim();
}
function microdataBlock(html,field){
 if(typeof html!=="string"||html.length>1800000)return "";
 const re=new RegExp("<([a-z][a-z0-9]*)\\b[^>]*\\bitemprop\\s*=\\s*['\"]"+field+"['\"][^>]*>","i");
 const match=re.exec(html);
 if(!match)return "";
 const tag=match[1].toLowerCase();
 if(["meta","input","link"].includes(tag))return "";
 const openAt=match.index+match[0].length;
 const parts=new RegExp("</?"+tag+"\\b[^>]*>","gi");
 parts.lastIndex=openAt;
 let depth=1;
 for(let count=0,m;count<12000&&(m=parts.exec(html));count++){
  if(m[0][1]==="/")depth--;
  else if(!/\/>$/.test(m[0]))depth++;
  if(depth===0){
   const section=html.slice(openAt,m.index);
   return section.length<=160000?textOnly(section):"";
  }
 }
 return "";
}
export function extractOfficialJobTitle(html){
 const title=microdataBlock(html,"title");
 return title.length>=5&&title.length<=180?title:"";
}
export function extractOfficialJobDescription(html){
 const desc=microdataBlock(html,"description").slice(0,12000);
 if(desc.length<250||desc.length>12000)return "";
 const tokens=desc.split(/\s+/).filter(Boolean);
 return tokens.length>=40?desc:"";
}
