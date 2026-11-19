// Preferences-only ranking. This module NEVER inspects CVs or private data.
// Users explicitly select job families and cities on their own device.
import {isEarly,normalized,validPublicJob,parsedDate} from "./radar-policy.mjs";
export const FAMILIES=[
 "Merchandising","Buying","Planning & Allocation","Product Management & Development",
 "Retail & Retail Operations","E-commerce & Digital","Visual Merchandising",
 "Wholesale & Commercial","CRM & Clienteling","Marketing & Brand",
 "PR, Communications & Events","Data & Analytics","Supply Chain & Logistics",
 "Production & Sourcing","HR & Talent","Finance & Legal","Design & Creative",
 "Technology","Facilities & Store Development"
];
export const EMPTY_PROFILE=Object.freeze({roles:[],cities:[],relocations:[],level:"early"});
const normalizeCity=v=>normalized(v).replace(/^(milano)$/, "milan").replace(/^roma$/,"rome").replace(/^parigi$/,"paris").replace(/^londra$/,"london").replace(/^zurigo$/,"zurich").replace(/^ginevra$/,"geneva");
export function cleanCity(raw){
 const city=String(raw||"").trim().replace(/\s+/g," ").slice(0,75);
 return city && !/[<>]/.test(city) && !/[\u0000-\u001f]/.test(city)?city:"";
}
export function addCity(list=[],raw=""){
 const city=cleanCity(raw);
 return !city||list.some(x=>normalizeCity(x)===normalizeCity(city))?[...list]:[...list,city].slice(0,20);
}
export function validateProfile(raw={}){
 const roles=[...new Set((Array.isArray(raw.roles)?raw.roles:[]).filter(x=>FAMILIES.includes(x)))].slice(0,8);
 const cities=(Array.isArray(raw.cities)?raw.cities:[]).reduce(addCity,[]);
 const relocations=(Array.isArray(raw.relocations)?raw.relocations:[]).reduce(addCity,[]);
 return {roles,cities,relocations,level:["early","internship","all"].includes(raw.level)?raw.level:"early"};
}
export function readyProfile(profile){return profile.roles.length>0 && profile.cities.length+profile.relocations.length>0}
function locationMatch(job,cities){
 const location=normalizeCity(job.city||"");
 if(!location)return false;
 return cities.some(x=>{
  const pref=normalizeCity(x);
  return pref.length>=3 && (location===pref||location.startsWith(pref+",")||location.includes(","+pref+",")||location.startsWith(pref+" "));
 });
}
export function scorePreferenceJob(job,rawProfile,now=Date.now()){
 const profile=validateProfile(rawProfile);
 if(!readyProfile(profile)||!validPublicJob(job,now))return null;
 const role=job.role||"";
 if(!role||!profile.roles.includes(role))return null;
 if(profile.level==="early"&&!isEarly(job))return null;
 if(profile.level==="internship"&&job.level!=="internship"&&!/\b(intern|internship|stage|tirocinio)\b/i.test(job.title))return null;
 const preferred=locationMatch(job,profile.cities);
 const relocation=!preferred&&locationMatch(job,profile.relocations);
 const remote=/\b(remote|remoto|da remoto)\b/i.test(job.city||"");
 if(!preferred&&!relocation&&!remote)return null;
 // No fabricated fit percentage: ranking reflects ONLY declared preferences.
 let points=100-profile.roles.indexOf(role)*7;
 const reasons=["Area professionale selezionata: "+role];
 if(preferred){points+=24;reasons.push("Nella città in cui vuoi lavorare")}
 else if(relocation){points+=10;reasons.push("Nella città in cui accetteresti di trasferirti")}
 else{points+=4;reasons.push("Annuncio indicato come remoto: verifica le condizioni")}
 if(job.level==="internship"){points+=8;reasons.push("Stage")}
 else if(["trainee","assistant","junior"].includes(job.level))reasons.push("Livello iniziale");
 else if(job.level==="entry_level")reasons.push("Livello da verificare");
 const stamp=parsedDate(job.published_at||job.first_seen_at)||0;
 return {job,points,stamp,reasons,locationType:preferred?"city":relocation?"relocation":"remote"};
}
export function preferenceRecommendations(jobs,profile,{hidden=[],saved=[],max=1000,now=Date.now()}={}){
 const blocked=new Set(hidden.map(String));
 const savedIds=new Set(saved.map(String));
 const ranked=(Array.isArray(jobs)?jobs:[]).filter(j=>!blocked.has(String(j.id||j.url)))
   .map(j=>scorePreferenceJob(j,profile,now)).filter(Boolean);
 ranked.sort((a,b)=>b.points-a.points||b.stamp-a.stamp||String(a.job.brand).localeCompare(String(b.job.brand),"it"));
 return ranked.slice(0,max).map(x=>({...x,saved:savedIds.has(String(x.job.id||x.job.url))}));
}
export function availableRoleCounts(jobs,now=Date.now()){
 const counts={};
 for(const j of Array.isArray(jobs)?jobs:[]){
  if(!validPublicJob(j,now)||!isEarly(j))continue;
  if(j.role)counts[j.role]=(counts[j.role]||0)+1;
 }
 return counts;
}
