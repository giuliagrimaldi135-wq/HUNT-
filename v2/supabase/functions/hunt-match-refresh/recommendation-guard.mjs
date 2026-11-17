// Strict rolling 20*24-hour freshness, not a calendar-midnight approximation.
export function freshnessCutoff(nowMs=Date.now(),days=20){
 if(!Number.isFinite(nowMs)||!Number.isFinite(days)||days<=0)throw Error("invalid freshness limit");
 return new Date(nowMs-days*86400000).toISOString();
}
export function isFreshActionable(job, cutoffMs, nowMs=Date.now()) {
  if (!["active_verified","active_likely"].includes(job.state)) return false;
  const postedMs=Date.parse(job.published_at||job.first_seen_at||"");
  const verifiedMs=Date.parse(job.last_verified_at||"");
  // Some public ATSs (Lever) provide posting createdAt, not datePublished.
  // An official posting older than 20 days cannot be made "new" just because
  // HUNT first saw it recently. Keep publication provenance distinct.
  const sourceCreation=job.metadata?.provider_creation_at;
  if(sourceCreation){
    const createdMs=Date.parse(String(sourceCreation));
    if(!Number.isFinite(createdMs)||createdMs<cutoffMs||createdMs>nowMs+86400000)return false;
  }
  return Number.isFinite(postedMs) && postedMs>=cutoffMs &&
    Number.isFinite(verifiedMs) && verifiedMs<=nowMs+86400000 && verifiedMs>=nowMs-7*86400000;
}

export function vacancyIdentity(job) {
  const company=String(job.company_id||"").trim().toLowerCase();
  if (!company) return "job:"+job.id;
  const requisition=String(job.requisition_id||"").trim().toLowerCase();
  if (requisition) return company+"|req:"+requisition;
  const title=String(job.canonical_title||"").trim().toLowerCase();
  const city=String(job.city||"").trim().toLowerCase();
  if (!title||!job.primary_apply_url) return "job:"+job.id;
  const raw=String(job.primary_apply_url).trim().split("#")[0];
  if (!/^https?:\/\//i.test(raw)) return "job:"+job.id;
  const parts=raw.split("?");
  const query=parts.slice(1).join("?").split("&").filter(x=>x&&!/^(utm_[^=]*|fbclid|gclid|oga)(?:=|$)/i.test(x)).sort();
  const url=parts[0].replace(/\/$/,"").toLowerCase()+(query.length?"?"+query.join("&"):"");
  return company+"|url:"+url+"|title:"+title+"|city:"+city;
}

export function preferCanonicalJob(a,b) {
  const ta=Date.parse(a.first_seen_at||""),tb=Date.parse(b.first_seen_at||"");
  if(Number.isFinite(ta)&&Number.isFinite(tb)&&ta!==tb) return ta<tb?a:b;
  const al=String(a.description||"").trim().length,bl=String(b.description||"").trim().length;
  if(al!==bl) return al>bl?a:b;
  return String(a.id)<String(b.id)?a:b;
}

// Only a provider-structured, per-vacancy identifier can cross a brand boundary.
// A group's shared career homepage is NOT a vacancy and must never collapse roles.
export function strongOfficialBoardIdentity(job) {
  const url=String(job.primary_apply_url||"").trim();
  // SmartRecruiters URLs encode the hiring group's board and unique job ID.
  // Sportmax and Max Mara legitimately share the same MaxMaraFashionGroup board.
  const m=url.match(/^https:\/\/jobs\.smartrecruiters\.com\/([^/?#]+)\/(\d{8,})(?:[-/?#]|$)/i);
  return m?"smartrecruiters:"+m[1].toLowerCase()+":"+m[2]:null;
}

// Localized Kering career links may represent the same official requisition
// in Italian and French. Canonicalize only the employer, region and exact slug;
// distinct job IDs, dates or substantively different descriptions must remain.
export function officialKeringLocaleIdentity(job){
 try{
  const u=new URL(String(job.primary_apply_url||""));
  if(u.protocol!=="https:"||u.hostname.toLowerCase()!=="www.kering.com")return null;
  const m=u.pathname.toLowerCase().match(/^\/(?:it\/talenti\/offerte-di-lavoro|fr\/talent\/offres-d-emploi|en\/talent\/job-offers)\/(europe|americas|asia-pacific)\/([a-z0-9-]{9,})\/?$/);
  if(!m||!job.company_id)return null;
  return String(job.company_id).toLowerCase()+"|kering:"+m[1]+":"+m[2];
 }catch{return null}
}
function sameOfficialVacancy(a,b){
 if(officialKeringLocaleIdentity(a)!==officialKeringLocaleIdentity(b))return false;
 if(a.requisition_id&&b.requisition_id&&String(a.requisition_id).toLowerCase()!==String(b.requisition_id).toLowerCase())return false;
 const aDescription=String(a.description||"").trim().replace(/\s+/g," ").toLowerCase();
 const bDescription=String(b.description||"").trim().replace(/\s+/g," ").toLowerCase();
 // A long exact job spec is essential; a matching title slug alone is not.
 return aDescription.length>=250&&aDescription===bDescription;
}
function preferOfficialKeringRecord(a,b){
 const aReq=Boolean(String(a.requisition_id||"").trim()),bReq=Boolean(String(b.requisition_id||"").trim());
 if(aReq!==bReq)return aReq?a:b;
 return preferCanonicalJob(a,b);
}

export function chooseUniqueJobs(rows,cutoffMs,nowMs=Date.now()) {
  const found=new Map(),duplicateIds=[];
  for(const job of rows){
    if(!isFreshActionable(job,cutoffMs,nowMs))continue;
    const key=vacancyIdentity(job),prior=found.get(key);
    if(!prior){found.set(key,job);continue}
    const winner=preferCanonicalJob(prior,job);
    duplicateIds.push(winner.id===prior.id?job.id:prior.id);
    found.set(key,winner);
  }
  // A strict official ATS job ID is stronger than the company label assigned
  // by discovery. Preserve one job even when sibling fashion brands share a board.
  const official=new Map(),unidentified=[];
  for(const job of found.values()){
    const key=strongOfficialBoardIdentity(job);
    if(!key){unidentified.push(job);continue}
    const prior=official.get(key);
    if(!prior){official.set(key,job);continue}
    const winner=preferCanonicalJob(prior,job);
    duplicateIds.push(winner.id===prior.id?job.id:prior.id);
    official.set(key,winner);
  }
  // The same official Kering role may be visible through language-specific
  // URLs without the requisition code in one locale. Keep the source with an
  // official requisition ID. Never delete the physical job or applications.
  const locales=new Map(),remaining=[];
  for(const job of [...unidentified,...official.values()]){
    const key=officialKeringLocaleIdentity(job);
    if(!key){remaining.push(job);continue}
    const existing=locales.get(key)||[];
    const target=existing.find((prior)=>sameOfficialVacancy(prior,job));
    if(!target){existing.push(job);locales.set(key,existing);continue}
    const winner=preferOfficialKeringRecord(target,job);
    duplicateIds.push(winner.id===target.id?job.id:target.id);
    existing.splice(existing.indexOf(target),1,winner);
    locales.set(key,existing);
  }
  return {jobs:[...remaining,...[...locales.values()].flat()],duplicateIds:[...new Set(duplicateIds)]};
}
