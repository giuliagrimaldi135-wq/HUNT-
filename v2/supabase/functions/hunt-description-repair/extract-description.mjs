// Extract only job-specific evidence from an employer page.
// Deliberately fail closed: never turn navigation, metadata or site marketing into requirements.
function words(value) {
  return String(value||"").toLowerCase().replace(/&(?:amp|nbsp);/g," ").replace(/&#(?:x[0-9a-f]+|\d+);/gi," ")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim().split(" ").filter(x=>x.length>=3);
}
function plain(html) {
  return String(html||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<\/?(?:p|li|ul|ol|section|article|h[1-6]|br|div)\b[^>]*>/gi,". ")
    .replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&").replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(Math.min(1114111,Number(x))))
    .replace(/\s+/g," ").replace(/(?:\.\s*){2,}/g,". ").trim().slice(0,12000);
}
function credible(text) {
  const t=String(text||"").trim();
  return t.length>=250 && t.length<=12000 && words(t).length>=45 &&
    !/^(?:cookies|privacy policy|login|sign in|search jobs|all jobs)\b/i.test(t);
}
function sameRole(title,other) {
  const parts=words(title).filter(w=>!["the","and","for","with","intern","junior","senior","mwd"].includes(w));
  if(parts.length===0)return false;
  const found=new Set(words(other));
  return parts.filter(x=>found.has(x)).length>=Math.min(2,parts.length);
}
function collect(value,out=[]) {
  if(!value||typeof value!=="object"||out.length>20)return out;
  if(Array.isArray(value)){for(const v of value)collect(v,out);return out}
  const ty=value["@type"];
  if(ty==="JobPosting"||(Array.isArray(ty)&&ty.includes("JobPosting")))out.push(value);
  for(const v of Object.values(value)){if(v&&typeof v==="object")collect(v,out)}
  return out;
}
function trimJobPage(text){
  let value=String(text||"").trim();
  // Employer page chrome is not evidence of duties or requirements.
  const ref=value.match(/\bReference code:\s*[a-z]{1,4}\d+\.?/i);
  if(ref&&ref.index!==undefined&&ref.index<500)value=value.slice(ref.index+ref[0].length).trim();
  const footer=value.search(/\bLearn more\s*\.\s*Richemont is the owner of prestigious Maisons/i);
  if(footer>250&&credible(value.slice(0,footer)))value=value.slice(0,footer).trim();
  return value;
}
export function extractOfficialDescription(html, title, requisitionId="") {
  if(typeof html!=="string"||html.length>3000000)return null;
  const reference=String(requisitionId||"").trim();
  // Prefer structured JobPosting from this specific vacancy, not an aggregate jobs page.
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try {
      const listings=collect(JSON.parse(m[1]));
      for(const job of listings){
        const id=String(job.identifier?.value||job.identifier||"");
        const hasId=reference&&id&&id.toLowerCase()===reference.toLowerCase();
        if(!hasId&&!sameRole(title,job.title||""))continue;
        const value=plain(job.description);
        if(credible(value))return {description:value,method:"jobposting_jsonld"};
      }
    }catch{}
  }
  // Fallback only for explicitly marked job-detail blocks on a page whose
  // visible title matches the targeted role. Never use the whole page body.
  const heading=html.match(/<h1\b[^>]*>([\s\S]{0,300}?)<\/h1>/i);
  if(!heading||!sameRole(title,plain(heading[1])))return null;
  const candidates=[];
  for(const m of html.matchAll(/<(section|article|main)\b([^>]*)>([\s\S]*?)<\/\1>/gi)){
    const attrs=m[2]||"",body=m[3]||"";
    if(!/(?:job[-_ ]?(?:description|content|detail|body)|vacancy[-_ ]?(?:detail|description)|posting[-_ ]?content)/i.test(attrs)
       && !/(?:responsibilit|requirements|qualifications|about the role|your mission|job description)/i.test(body.replace(/<[^>]*>/g," ").slice(0,6000)))continue;
    const text=trimJobPage(plain(body));
    if(credible(text)&&text.length<11500)candidates.push(text);
  }
  candidates.sort((a,b)=>b.length-a.length);
  return candidates.length?{description:candidates[0],method:"verified_job_section"}:null;
}
