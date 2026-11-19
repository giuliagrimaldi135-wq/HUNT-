import {filteredJobs,validPublicJob,vacancyAgeLabel,parsedDate} from "./radar-policy.mjs?v=20261119-1";
import {FAMILIES,EMPTY_PROFILE,validateProfile,readyProfile,addCity,preferenceRecommendations,availableRoleCounts} from "./personal-radar-policy.mjs?v=20261119-2";
import {deduplicatePublicJobs} from "./radar-dedup.mjs?v=20261119-1";
const STORE="hunt-public-radar-preferences-v2";
const el=id=>document.getElementById(id);
const now=()=>Date.now();
const fmtTime=raw=>{const ms=parsedDate(raw);return ms?new Date(ms).toLocaleString("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"Non disponibile"};
const fmtDay=raw=>{const ms=parsedDate(raw);return ms?new Date(ms).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"}):"Data non disponibile"};
const state={payload:null,profile:validateProfile(EMPTY_PROFILE),hidden:[],saved:[],mode:"personal",shown:24,localStorageOK:true};
function setText(id,value){el(id).textContent=value}
function make(tag,cls,content){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(content!==undefined)node.textContent=content;
 return node;
}
function idOf(job){return String(job.id||job.url)}
function readLocal(){
 try{
  const raw=window.localStorage.getItem(STORE);
  if(!raw)return;
  const data=JSON.parse(raw);
  state.profile=validateProfile(data.profile);
  state.saved=(Array.isArray(data.saved)?data.saved:[]).filter(v=>typeof v==="string").slice(0,1000);
  state.hidden=(Array.isArray(data.hidden)?data.hidden:[]).filter(v=>typeof v==="string").slice(0,1000);
 }catch{state.localStorageOK=false}
}
function saveLocal(){
 try{
  window.localStorage.setItem(STORE,JSON.stringify({version:2,profile:state.profile,saved:state.saved,hidden:state.hidden}));
  state.localStorageOK=true;return true;
 }catch{state.localStorageOK=false;return false}
}
function renderRoleChoices(){
 const parent=el("roleChoices");parent.replaceChildren();
 const counts=availableRoleCounts(state.payload?.jobs||[]);
 for(const name of FAMILIES){
  const label=make("label","role-choice");
  const input=make("input");input.type="checkbox";input.name="preferredRole";input.value=name;
  input.checked=state.profile.roles.includes(name);
  label.append(input,make("span",null,name),make("small",null,String(counts[name]||0)));
  parent.append(label);
 }
}
function renderCityTags(){
 for(const kind of ["cities","relocations"]){
  const list=kind==="cities"?el("preferredTags"):el("relocationTags");list.replaceChildren();
  for(const city of state.profile[kind]){
   const label=make("span","city-tag",city);
   const btn=make("button",null,"×");btn.type="button";
   btn.dataset.removeCity=city;btn.dataset.kind=kind;
   btn.setAttribute("aria-label","Rimuovi "+city);
   label.append(btn);list.append(label);
  }
  if(!list.children.length)list.append(make("span","city-placeholder",kind==="cities"?"Scegli almeno una città":"Nessun trasferimento selezionato"));
 }
}
function showProfileFeedback(message,bad=false){
 const feedback=el("profileFeedback");feedback.textContent=message;feedback.classList.toggle("invalid",bad);
}
function updateProfileSummary(){
 const ok=readyProfile(state.profile);
 setText("personalSummary",ok?
  "Ricerca basata su "+state.profile.roles.join(", ")+
  " · "+state.profile.cities.concat(state.profile.relocations).join(", ")+
  ". Sono preferenze dichiarate, non un match con il CV.":
  "Scegli almeno un'area professionale e una città: HUNT mostrerà una selezione per te, senza bisogno del CV.");
 el("profileSection").classList.toggle("profile-incomplete",!ok);
}
function addCityFromInput(inputId,kind){
 const input=el(inputId);const updated=addCity(state.profile[kind],input.value);
 state.profile={...state.profile,[kind]:updated};input.value="";renderCityTags();
}
function initPersonalization(){
 readLocal();
 el("profileLevel").value=state.profile.level;
 renderRoleChoices();renderCityTags();updateProfileSummary();
 el("addPreferred").onclick=()=>addCityFromInput("preferredInput","cities");
 el("addRelocation").onclick=()=>addCityFromInput("relocationInput","relocations");
 for(const [id,kind] of [["preferredInput","cities"],["relocationInput","relocations"]]){
  el(id).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addCityFromInput(id,kind)}});
 }
 el("profileSection").addEventListener("click",e=>{
  const target=e.target.closest("[data-remove-city]");
  if(!target)return;
  const kind=target.dataset.kind;
  state.profile={...state.profile,[kind]:state.profile[kind].filter(c=>c!==target.dataset.removeCity)};
  renderCityTags();
 });
 el("profileForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(el("preferredInput").value.trim())addCityFromInput("preferredInput","cities");
  if(el("relocationInput").value.trim())addCityFromInput("relocationInput","relocations");
  const roles=[...el("roleChoices").querySelectorAll('input[name="preferredRole"]:checked')].map(x=>x.value);
  state.profile=validateProfile({...state.profile,roles,level:el("profileLevel").value});
  if(!readyProfile(state.profile)){
   showProfileFeedback("Seleziona almeno un ruolo e una città dove lavorare o trasferirti.",true);
   return;
  }
  const saved=saveLocal();
  showProfileFeedback(saved?"Preferenze salvate sul tuo dispositivo.":"Preferenze attive, ma il browser non consente di conservarle.",!saved);
  state.mode="personal";state.shown=24;setModeButtons();
  renderRoleChoices();updateProfileSummary();recompute();
  el("radarTitle").scrollIntoView({behavior:"smooth",block:"start"});
 });
 el("clearProfile").onclick=()=>{
  state.profile=validateProfile(EMPTY_PROFILE);
  state.saved=[];state.hidden=[];saveLocal();
  el("profileLevel").value="early";
  renderRoleChoices();renderCityTags();updateProfileSummary();
  state.mode="personal";setModeButtons();recompute();
  showProfileFeedback("Preferenze e annunci salvati cancellati da questo dispositivo.");
 };
 for(const [id,mode] of [["modePersonal","personal"],["modeAll","all"],["modeSaved","saved"]]){
  el(id).addEventListener("click",()=>{
   state.mode=mode;state.shown=24;setModeButtons();recompute();
   if(mode==="personal"&&!readyProfile(state.profile))el("profileSection").scrollIntoView({behavior:"smooth",block:"start"});
  });
 }
 el("jobs").addEventListener("click",e=>{
  const button=e.target.closest("[data-action]");
  if(!button)return;
  const key=button.dataset.id;const action=button.dataset.action;
  if(action==="save"){
   state.saved=state.saved.includes(key)?state.saved.filter(x=>x!==key):[...state.saved,key];
  }else if(action==="hide"){
   state.hidden=[...new Set([...state.hidden,key])];
   state.saved=state.saved.filter(x=>x!==key);
  }
  if(!saveLocal())showProfileFeedback("Impossibile salvare su questo browser.",true);
  recompute();
 });
 el("more").onclick=()=>{state.shown+=24;recompute()};
 for(const id of ["textSearch","citySearch","roleSelect","levelSelect","sortSelect"]){
  el(id).addEventListener(id==="textSearch"||id==="citySearch"?"input":"change",()=>{state.shown=24;recompute()});
 }
}
function setModeButtons(){
 for(const [id,mode] of [["modePersonal","personal"],["modeAll","all"],["modeSaved","saved"]]){
  el(id).classList.toggle("active",state.mode===mode);
  el(id).setAttribute("aria-pressed",state.mode===mode?"true":"false");
 }
}
function jobRow(result){
 const job=result.job||result;
 const article=make("article","job");const main=make("div");
 main.append(make("p","company",job.brand),make("h3",null,job.title));
 const meta=make("div","details");
 for(const detail of [job.city||"Località da verificare",job.role||"Area da verificare",vacancyAgeLabel(job)])meta.append(make("span",null,detail));
 main.append(meta);
 if(result.reasons?.length){
  const why=make("p","reasons","In questa selezione: "+result.reasons.join(" · ")+".");
  main.append(why);
 }
 const age=now()-(parsedDate(job.last_verified_at)||0);
 main.append(make("p","verify"+(age>3*86400000?" stale":""),
  "Ultima verifica nota: "+fmtDay(job.last_verified_at)+" · Controlla la disponibilità sul portale"));
 const actions=make("div","job-actions");
 const save=make("button","small-action",state.saved.includes(idOf(job))?"Salvata ✓":"Salva");
 save.type="button";save.dataset.action="save";save.dataset.id=idOf(job);
 const hide=make("button","small-action subtle","Ignora");
 hide.type="button";hide.dataset.action="hide";hide.dataset.id=idOf(job);
 actions.append(save,hide);main.append(actions);article.append(main);
 try{
  const link=new URL(String(job.url));
  if(link.protocol==="https:"&&!link.username&&!link.password){
   const btn=make("a","official","Apri annuncio ufficiale ↗");
   btn.href=link.href;btn.target="_blank";btn.rel="noopener noreferrer";
   article.append(btn);
  }
 }catch{}
 return article;
}
function recompute(){
 if(!state.payload)return;
 const all=state.payload.jobs;
 const filters={text:el("textSearch").value,city:el("citySearch").value,role:el("roleSelect").value,
  level:el("levelSelect").value,sort:el("sortSelect").value};
 const ready=readyProfile(state.profile);
 let results=[];
 if(state.mode==="personal"&&ready){
  results=preferenceRecommendations(all,state.profile,{hidden:state.hidden,saved:state.saved});
  if(filters.text)results=results.filter(x=>[x.job.title,x.job.brand,x.job.role].join(" ").toLocaleLowerCase("it").includes(filters.text.toLocaleLowerCase("it")));
  if(filters.city)results=results.filter(x=>String(x.job.city).toLocaleLowerCase("it").includes(filters.city.toLocaleLowerCase("it")));
  if(filters.role)results=results.filter(x=>x.job.role===filters.role);
  if(filters.level==="internship")results=results.filter(x=>x.job.level==="internship");
  if(filters.sort==="brand")results.sort((a,b)=>a.job.brand.localeCompare(b.job.brand,"it"));
 }else if(state.mode==="all"){
  results=filteredJobs(all,filters).filter(j=>!state.hidden.includes(idOf(j)));
 }else if(state.mode==="saved"){
  const saved=new Set(state.saved);
  results=filteredJobs(all,{...filters,level:"all"}).filter(j=>saved.has(idOf(j)));
 }
 const count=results.length;
 setText("savedCount",state.saved.length?"("+state.saved.length+")":"");
 setText("resultCount",state.mode==="personal"&&!ready?"Imposta prima la tua ricerca":
  count+" "+(count===1?"posizione":"posizioni")+(state.mode==="personal"?" nelle tue preferenze":""));
 const container=el("jobs");container.replaceChildren();
 if(state.mode==="personal"&&!ready){
  container.append(make("p","empty","Per trovare opportunità per te, scegli almeno un'area professionale e una città nella sezione «La mia ricerca» qui sopra. Puoi farlo anche senza curriculum."));
 }else if(!count){
  container.append(make("p","empty",state.mode==="personal"?
   "Al momento non risultano offerte coerenti con ruoli, città e livello scelti. Non ti mostriamo lavori senior o fuori città per riempire il radar. Puoi ampliare la ricerca o aprire «Esplora tutte».":
   state.mode==="saved"?"Non hai annunci salvati su questo dispositivo. Torna a «Per me» e premi Salva.":"Nessuna offerta con questi filtri. Prova ad ampliare la ricerca."));
 }else{
  for(const item of results.slice(0,state.shown))container.append(jobRow(item));
 }
 el("more").hidden=count<=state.shown;
}
function setup(data){
 state.payload={...data,jobs:deduplicatePublicJobs(data.jobs)};
 const valid=(state.payload.jobs||[]).filter(x=>validPublicJob(x));
 setText("allCount",valid.length.toLocaleString("it-IT"));
 setText("brandCount",new Set(valid.map(x=>x.brand)).size);
 setText("lastScan",data.sources_successful>0?fmtTime(data.last_ats_scan_at):"Controlli in attivazione");
 const status=el("freshness"),last=data.last_ats_scan_at;
 const old=Date.now()-(parsedDate(last)||0)>24*3600000;
 status.classList.toggle("stale",old);
 status.textContent=data.sources_successful>0?
  "Ultimo controllo di "+data.sources_successful+" fonti ufficiali: "+fmtTime(last)+
  (old?". Gli annunci potrebbero essere cambiati.":". La copertura è parziale: non tutti i brand sono monitorati.") :
  "Archivio iniziale del "+fmtDay(data.generated_at)+". Le fonti vanno ancora riconfermate.";
 const roles=[...new Set(valid.map(j=>j.role).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"it"));
 for(const role of roles){const opt=make("option",null,role);opt.value=role;el("roleSelect").append(opt)}
 initPersonalization();recompute();
}
fetch("./jobs.json?ts="+Date.now(),{cache:"no-store"})
 .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
 .then(data=>{if(!data||data.format!==1||!Array.isArray(data.jobs))throw Error("Unsupported data format");setup(data)})
 .catch(error=>{
  setText("freshness","Il catalogo pubblico non è raggiungibile: prova a ricaricare la pagina.");
  setText("resultCount","Servizio momentaneamente non disponibile");
  el("jobs").replaceChildren(make("p","empty","Non è possibile caricare le offerte in questo momento."));
  console.warn("Public HUNT radar",error);
 });
