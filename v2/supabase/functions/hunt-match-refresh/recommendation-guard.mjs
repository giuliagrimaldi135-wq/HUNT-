export function isFreshActionable(job, cutoffMs, nowMs=Date.now()) {
  if (!["active_verified","active_likely"].includes(job.state)) return false;
  const postedMs=Date.parse(job.published_at||job.first_seen_at||"");
  const verifiedMs=Date.parse(job.last_verified_at||"");
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
  return {jobs:[...found.values()],duplicateIds:[...new Set(duplicateIds)]};
}
