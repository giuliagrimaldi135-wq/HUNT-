// Only deduplicate demonstrably identical official application destinations,
// plus localized Kering pages sharing exactly the same unique vacancy slug.
// Do not merge same-titled Prada/SAP jobs with DIFFERENT requisition numbers.
export function postingIdentity(job){
 try{
  const u=new URL(String(job?.url||""));
  if(u.protocol!=="https:"||!u.hostname)return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,"");
  const path=u.pathname.replace(/\/+$/,"").toLowerCase();
  if(host==="kering.com"){
   const slug=path.split("/").filter(Boolean).pop();
   if(slug&&slug.length>=14&&/^[a-z0-9-]+$/.test(slug))
    return "kering:"+slug;
  }
  const cleanParams=new URLSearchParams(u.search);
  for(const key of [...cleanParams.keys()]){
   if(/^(utm_.+|fbclid|gclid|source|campaign)$/i.test(key))cleanParams.delete(key);
  }
  cleanParams.sort();
  return host+path+"?"+cleanParams.toString();
 }catch{return null}
}
export function deduplicatePublicJobs(jobs=[]){
 const seen=new Map(),out=[];
 for(const job of Array.isArray(jobs)?jobs:[]){
  const key=postingIdentity(job);
  if(!key){out.push(job);continue}
  const idx=seen.get(key);
  if(idx===undefined){seen.set(key,out.length);out.push(job);continue}
  const prior=out[idx];
  // Keep more recent official confirmation, but prefer the Italian-language
  // destination only when verification dates are otherwise equivalent.
  const priorCheck=Date.parse(String(prior.last_verified_at||""))||0;
  const newCheck=Date.parse(String(job.last_verified_at||""))||0;
  const difference=Math.abs(newCheck-priorCheck);
  if(newCheck>priorCheck+3600000 || (difference<=3600000 &&
     /\/it\//.test(new URL(job.url).pathname)&&!/\/it\//.test(new URL(prior.url).pathname))){
    out[idx]=job;
  }
 }
 return out;
}
