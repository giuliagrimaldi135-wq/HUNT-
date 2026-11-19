import {isLvmhJobDetailUrl} from "./lvmh-job-policy.mjs";
// Public vacancy leads must be real job URLs, not templates, account flows or menus.
function decodeEntities(s){
 return String(s||"").replace(/&amp;apos;|&apos;|&#39;|&#x27;/gi,"'")
  .replace(/&amp;quot;|&quot;/gi,'"').replace(/&amp;/gi,"&")
  .replace(/&#x2f;|&#47;/gi,"/").replace(/&lt;|&gt;/gi,"");
}
function hostnameSafe(host){
 return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)&&!host.includes("..")
   &&host!=="localhost"&&!host.endsWith(".local")&&!host.endsWith(".internal");
}
export function safeVacancyCandidate(href,label,base){
 try{
  const decoded=decodeEntities(href).trim(),title=decodeEntities(label).replace(/\s+/g," ").trim();
  if(!decoded||!title||title.length<5||title.length>180)return null;
  // Embedded JS templates or escaped delimiters are not vacancy hyperlinks.
  if(/\{\{|\}\}|\$\{|%7b|%7d|%24%7b|<|>|javascript:|data:/i.test(decoded))return null;
  if(/\{\{|\}\}|\$\{|assessmenturl|verify your account|verifica del tuo account|privacy|cookies?|login|sign in|create account|registrati/i.test(title))return null;
  const url=new URL(decoded,base),baseURL=new URL(base);
  if(url.protocol!=="https:"||url.username||url.password||!hostnameSafe(url.hostname))return null;
  if(url.hash)url.hash="";
  const path=decodeURIComponent(url.pathname).toLowerCase();
  if(/\{\{|\}\}|\$\{|<|>|assessmenturl|email-verify|verification|privacy|cookie/i.test(path))return null;
  // SuccessFactors category pages and generic career-navigation hubs must
  // never enter the per-vacancy review queue. They are scanned by source catalog.
  if(/\/go\/|\/viewalljobs(?:\/|$)|\/jobs\/(?:send-cv|register|sign-in|login)(?:\/|$)|\/talent\/job-offers\/?$/i.test(path))return null;
  if(/\$\{|\{\{|\}\}/.test(decodeURIComponent(url.search)))return null;
  const knownATS=/^jobs\.smartrecruiters\.com$/i.test(url.hostname)&&/^\/[^/]+\/\d{7,}/.test(path)
    ||/^jobs(?:\.eu)?\.lever\.co$/i.test(url.hostname)&&/^\/[^/]+\/[0-9a-f-]{20,}/.test(path)
    ||/^jobs\.ashbyhq\.com$/i.test(url.hostname)&&/^\/[^/]+\/[0-9a-f-]{20,}/.test(path);
  if(!knownATS&&!isLvmhJobDetailUrl(url.href)&&!/(?:\/job\/|\/jobs\/|\/job-details\/|\/job-offers\/|\/offres-d-emploi\/|\/vacancy\/|\/position\/|\/offerte-di-lavoro\/)/i.test(path))return null;
  const ats=/(^|\.)((myworkdayjobs|smartrecruiters|lever|greenhouse|ashbyhq|workable|successfactors)\.com|jobs\.pradagroup\.com)$/i.test(url.hostname);
  const jobsHost=/^(jobs|careers|careers-international)\./i.test(url.hostname);
  if(url.hostname!==baseURL.hostname&&!ats&&!jobsHost)return null;
  if(url.href.length>900)return null;
  return {url:url.href,title};
 }catch{return null}
}
const sharedBrands={
 "careers.otb.net":{group:"otb",brands:[["maison margiela","maison-margiela"],["jil sander","jil-sander"],["diesel","diesel"],["marni","marni"]]},
 "www.kering.com":{group:"kering",brands:[["bottega veneta","bottega-veneta"],["saint laurent","saint-laurent"],["balenciaga","balenciaga"],["brioni","brioni"],["gucci","gucci"]]},
 "jobs.monclergroup.com":{group:"moncler",brands:[["stone island","stone-island"],["moncler","moncler"]]}
};
function matchesBrand(title,name){
 const re=new RegExp("(^|[^a-z])"+name.replace(/\s+/g,"\\s+")+"(?=$|[^a-z])","i");
 return re.test(String(title||""));
}
export function resolveSharedBoardEmployer(url,title,companies){
 try{
  const host=new URL(url).hostname.toLowerCase(),cfg=sharedBrands[host];
  if(!cfg)return null;
  const matches=cfg.brands.filter(([name])=>matchesBrand(title,name));
  const slug=matches.length===1?matches[0][1]:cfg.group;
  return (companies||[]).find(c=>c.slug===slug)?.id||null;
 }catch{return null}
}
export function canRetryReview(candidate,nowMs=Date.now()){
 if(candidate.status!=="needs_review")return false;
 const retryCount=Number(candidate.raw?.review_retry_count)||0;
 if(retryCount>=2)return false;
 const parsed=Date.parse(candidate.parsed_at||"");
 const lastSeen=Date.parse(candidate.last_seen_at||"");
 if(!Number.isFinite(parsed)||nowMs-parsed<24*3600000)return false;
 if(!Number.isFinite(lastSeen)||nowMs-lastSeen>21*86400000)return false;
 return !!safeVacancyCandidate(candidate.listing_url,candidate.title_hint,candidate.listing_url);
}
