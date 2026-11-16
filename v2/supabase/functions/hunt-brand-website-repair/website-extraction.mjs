// The fashion directory is a lead, never proof of an official careers page.
function compact(v){return String(v||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}
function originCandidate(v,name){
 try{
  const u=new URL(v);
  if(!["https:","http:"].includes(u.protocol)||u.username||u.password||u.port)return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,"");
  if(!/^[a-z0-9.-]+$/.test(host)||!host.includes(".")||host.includes(".."))return null;
  if(/(?:^|\.)(?:fashionunited|linkedin|facebook|instagram|tiktok|twitter|x|youtube)\./.test(host))return null;
  const parts=host.split(".");
  let registrable=parts[parts.length-2]||"";
  if(parts.length>=3&&["co","com","org","net"].includes(registrable))registrable=parts[parts.length-3];
  const brand=compact(name),domain=compact(registrable);
  if(brand.length<5||domain.length<5)return null;
  // Strong single-brand identity only. Ignore parent groups and lookalikes.
  if(brand!==domain && !(brand.length>=8&&domain===brand.replace(/^(the)/,"")))return null;
  // Upgrade historical HTTP directory links only into candidate HTTPS site URLs.
  // This is not evidence of an open position or a verified careers endpoint.
  return "https://"+u.hostname+"/";
 }catch{return null}
}
export function extractDirectoryWebsite(html,brandName){
 if(typeof html!=="string"||html.length>1800000)return null;
 const links=[];
 for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi)){
  const uri=originCandidate(m[1].replace(/&amp;/gi,"&"),brandName);
  if(uri)links.push(uri);
 }
 return links.length?[...new Set(links)][0]:null;
}
export function websiteBackfillEligible(company,nowMs=Date.now()){
 if(company.website_url||!company.slug||!/^[-a-z0-9]{2,90}$/.test(company.slug))return false;
 if(company.discovery_source!=="fashionunited_public_brand_directory")return false;
 const last=Date.parse(company.metadata?.website_backfill?.attempted_at||"");
 return !Number.isFinite(last)||nowMs-last>24*3600000;
}
