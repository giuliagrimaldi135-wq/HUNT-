// This fallback is public: no user profiles, credentials, CVs, personalized
// match scores or Supabase API calls. Treat missing publication dates as "seen".
export function normalized(value=""){
 return String(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").toLowerCase().trim();
}
export function parsedDate(raw){
 const stamp=Date.parse(String(raw||""));
 return Number.isFinite(stamp)?stamp:null;
}
export function validPublicJob(job,now=Date.now()){
 if(!job||typeof job!=="object"||!job.title||!job.brand)return false;
 let u;try{u=new URL(String(job.url||""))}catch{return false}
 if(u.protocol!=="https:"||!u.hostname||u.username||u.password)return false;
 const checked=parsedDate(job.last_verified_at);
 const start=parsedDate(job.published_at||job.first_seen_at);
 if(!checked||!start)return false;
 if(start>now+86400000||start<now-20*86400000)return false;
 if(checked>now+86400000||checked<now-7*86400000)return false;
 return true;
}
export function isEarly(job){
 const title=normalized(job.title);
 if(/\b(senior|sr\.?|principal|head of|director|chief|vice president)\b/i.test(title)&&
    !/\b(intern|internship|stage|tirocinio|graduate trainee)\b/i.test(title))return false;
 if(/\b(manager|responsabile|lead)\b/i.test(title)&&
    !/\b(intern|internship|stage|tirocinio|graduate trainee)\b/i.test(title))return false;
 return ["internship","trainee","assistant","entry_level","junior"].includes(job.level);
}
export function filteredJobs(jobs,filters={},now=Date.now()){
 const q=normalized(filters.text),city=normalized(filters.city),role=filters.role||"";
 const level=filters.level||"early";
 const list=(Array.isArray(jobs)?jobs:[]).filter(job=>{
  if(!validPublicJob(job,now))return false;
  if(level==="early"&&!isEarly(job))return false;
  if(level==="internship"&&job.level!=="internship"&&!/\b(intern|internship|stage|tirocinio)\b/i.test(job.title))return false;
  if(role&&job.role!==role)return false;
  if(city&&!normalized(job.city).includes(city)&&!(city==="remote"&&normalized(job.city).includes("remote")))return false;
  if(q&&!normalized([job.brand,job.title,job.role].join(" ")).includes(q))return false;
  return true;
 });
 if(filters.sort==="brand")list.sort((a,b)=>a.brand.localeCompare(b.brand,"it")||a.title.localeCompare(b.title,"it"));
 else list.sort((a,b)=>(parsedDate(b.published_at||b.first_seen_at)||0)-(parsedDate(a.published_at||a.first_seen_at)||0));
 return list;
}
export function vacancyAgeLabel(job,now=Date.now()){
 const published=parsedDate(job.published_at),seen=parsedDate(job.first_seen_at);
 const stamp=published||seen;
 if(!stamp)return "Data sconosciuta";
 const days=Math.max(0,Math.floor((now-stamp)/86400000));
 const prefix=published?"Pubblicata":"Rilevata";
 return days===0?prefix+" oggi":days===1?prefix+" ieri":prefix+" "+days+" giorni fa";
}
