// Public mode of the official HUNT (no account, no Supabase calls).
// Reads the public radar file (official sources only) and ranks it ONLY by the
// preferences the visitor declared on this device: no CV, no fit percentage.
import {FAMILIES,EMPTY_PROFILE,validateProfile,readyProfile,addCity,preferenceRecommendations} from "./radar/personal-radar-policy.mjs?v=20261119-2";
import {deduplicatePublicJobs} from "./radar/radar-dedup.mjs?v=20261119-1";

// Same key as the temporary radar page, so preferences chosen there carry over.
export const PUBLIC_PREFS_KEY="hunt-public-radar-preferences-v2";
export const PUBLIC_JOBS_URL="./radar/jobs.json";
export const PUBLIC_FAMILIES=FAMILIES;

const ATS_LABELS={
 ats_lever:"Fonte diretta · Lever",ats_greenhouse:"Fonte diretta · Greenhouse",ats_ashby:"Fonte diretta · Ashby",
 ats_smartrecruiters:"Fonte diretta · SmartRecruiters",ats_workable:"Fonte diretta · Workable",
 feed_public:"Fonte · Feed ufficiale",sitemap_jsonld:"Portale ufficiale del brand"
};

export function readPublicPrefs(storage){
 try{
  const data=JSON.parse(storage?.getItem(PUBLIC_PREFS_KEY)||"null");
  return {profile:validateProfile(data?.profile||EMPTY_PROFILE),saved:Array.isArray(data?.saved)?data.saved.filter(v=>typeof v==="string"):[],
          hidden:Array.isArray(data?.hidden)?data.hidden.filter(v=>typeof v==="string"):[]};
 }catch{return {profile:validateProfile(EMPTY_PROFILE),saved:[],hidden:[]}}
}

export function writePublicPrefs(storage,prefs){
 try{
  storage.setItem(PUBLIC_PREFS_KEY,JSON.stringify({version:2,profile:validateProfile(prefs.profile),
   saved:(prefs.saved||[]).slice(0,1000),hidden:(prefs.hidden||[]).slice(0,1000)}));
  return true;
 }catch{return false}
}

export function profileFromForm({roles=[],cities=[],relocations=[],level="early"}={}){
 return validateProfile({roles,level,cities:cities.reduce((list,c)=>addCity(list,c),[]),
  relocations:relocations.reduce((list,c)=>addCity(list,c),[])});
}

export function publicReady(profile){return readyProfile(validateProfile(profile))}

export function publicRecommendations(payload,prefs,now=Date.now()){
 const jobs=deduplicatePublicJobs(Array.isArray(payload?.jobs)?payload.jobs:[]);
 const profile=validateProfile(prefs?.profile);
 if(!readyProfile(profile))return [];
 return preferenceRecommendations(jobs,profile,{hidden:prefs?.hidden||[],saved:prefs?.saved||[],now});
}

export function publicSourceLabel(job){return ATS_LABELS[job?.ats]||"Fonte · Annuncio ufficiale"}

function safeHttps(raw){
 try{const u=new URL(String(raw));return u.protocol==="https:"&&!u.username&&!u.password?u.href:null}catch{return null}
}

function ageText(job,now){
 const stamp=Date.parse(job.published_at||job.first_seen_at||"");
 if(!Number.isFinite(stamp))return "Data non verificata";
 const days=Math.max(0,Math.floor((now-stamp)/86400000));
 const verb=job.published_at?"Pubblicata":"Rilevata";
 return days===0?verb+" oggi":days===1?verb+" ieri":`${verb} ${days} giorni fa`;
}

function checkedText(job){
 const stamp=Date.parse(job.last_verified_at||"");
 if(!Number.isFinite(stamp))return "Verifica da confermare";
 return "Controllata "+new Date(stamp).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
}

// Same classes as the approved opportunity card; only actions that need no account.
export function publicCardHtml(rec,esc,now=Date.now()){
 const job=rec.job;
 const url=safeHttps(job.url);
 const where=rec.locationType==="relocation"?"Città per un possibile trasferimento":rec.locationType==="remote"?"Indicata come remota":"Nella città che hai scelto";
 return `<article class="jobCard cleanJobCard">
  <div class="jobMain">
   <div class="eyebrow">${esc(job.brand||"Brand")}</div>
   <h3>${esc(job.title)}</h3>
   <div class="jobMeta">${esc(job.city||"Località da verificare")} · ${esc(job.role||"Altro")}</div>
   <div class="humanBadges editorialMeta">
    <span class="matchPill">In linea con le tue preferenze · ${esc(where)}</span>
    ${job.level==="internship"?"<span>Stage</span>":""}
    <span>${esc(ageText(job,now))}</span>
    <span>${esc(checkedText(job))}</span>
    <span class="sourceMeta">${esc(publicSourceLabel(job))}</span>
   </div>
   <div class="actions editorialActions">
    ${url?`<a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Apri posizione ↗</a>`:""}
   </div>
  </div>
 </article>`;
}

// The public radar is refreshed every 6 hours: warn only after two missed runs.
export function publicFreshness(raw,now=Date.now()){
 const ms=Date.parse(String(raw||""));
 if(!Number.isFinite(ms)||ms>now+86400000)
  return {stale:true,text:"Ultimo controllo delle fonti non disponibile: verifica sempre l'annuncio originale."};
 const display=new Date(ms).toLocaleString("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
 if(now-ms>14*3600000)return {stale:true,text:"Ultimo controllo delle fonti ufficiali: "+display+". L'aggiornamento potrebbe essere fermo; verifica sempre l'annuncio originale."};
 return {stale:false,text:"Ultimo controllo delle fonti ufficiali: "+display+"."};
}
