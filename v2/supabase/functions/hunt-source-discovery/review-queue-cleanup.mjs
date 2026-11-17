// Only classify demonstrable navigation and duplicate HTML-escaped URLs.
// An individual job without a provider date remains in needs_review.
export function isDemonstrablyNavigation(link,label=""){
 try{
  const u=new URL(String(link||"")),h=u.hostname.toLowerCase(),
  path=u.pathname.toLowerCase(),title=String(label||"");
  if(/\$\{[^}]+\}|\{\{[^}]+\}\}/.test(title))return true;
  if(h==="jobs.pradagroup.com" && /^\/(?:www\.)?(?:pradagroup|prada|miumiu|church-footwear|carshoe|pasticceriamarchesi)\.com\/?$/i.test(path))return true;
  if(h==="jobs.valentino.com" && path==="/" && u.searchParams.has("sortColumn"))return true;
  if(h==="careers.otb.net" && /^\/search\/?$/.test(path))return true;
  if(h==="careers.pvh.com" && /\/search-results\/?$/.test(path))return true;
  if(h.endsWith(".myworkdayjobs.com") && (/\/jobalerts\/?$/i.test(path) ||
    (!/\/job\//.test(path) && /^view all jobs$/i.test(title.trim()))))return true;
  return false;
 }catch{return false}
}
export function normalizedLegacyJobURL(raw){
 return String(raw||"").replace(/&amp;apos;/gi,"'").replace(/&apos;/gi,"'")
   .replace(/&amp;/gi,"&");
}
export function classifyLegacyReviewRecords(reviewRows){
 const byURL=new Map((reviewRows||[]).map(r=>[r.listing_url,r]));
 const invalid=new Map();
 for(const r of reviewRows||[]){
  if(isDemonstrablyNavigation(r.listing_url,r.title_hint)){
   invalid.set(r.id,{id:r.id,reason:"career_navigation_not_individual_job"});
   continue;
  }
  const canon=normalizedLegacyJobURL(r.listing_url);
  if(canon!==r.listing_url){
   const other=byURL.get(canon);
   if(other&&other.id!==r.id)
    invalid.set(r.id,{id:r.id,reason:"legacy_html_entity_duplicate",canonical_candidate_id:other.id});
  }
 }
 return [...invalid.values()];
}
