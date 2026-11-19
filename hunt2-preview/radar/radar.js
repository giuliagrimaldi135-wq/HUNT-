import {filteredJobs,validPublicJob,vacancyAgeLabel,parsedDate} from "./radar-policy.mjs?v=20261119-1";
const el=id=>document.getElementById(id);
const fmtTime=(raw)=>{const ms=parsedDate(raw);return ms?new Date(ms).toLocaleString("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"Non disponibile"};
const fmtDay=(raw)=>{const ms=parsedDate(raw);return ms?new Date(ms).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"}):"Data non disponibile"};
const state={payload:null,shown:24};
function setText(id,value){el(id).textContent=value}
function make(tag,cls,content){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(content!==undefined)node.textContent=content;
 return node;
}
function jobRow(job){
 const article=make("article","job");
 const main=make("div");
 main.append(make("p","company",job.brand),make("h3",null,job.title));
 const meta=make("div","details");
 for(const detail of [job.city||"Località da verificare",job.role||"Area da verificare",vacancyAgeLabel(job)])meta.append(make("span",null,detail));
 main.append(meta);
 const checked=make("p","verify"+((Date.now()-Date.parse(job.last_verified_at))>3*86400000?" stale":""),"Ultima verifica nota: "+fmtDay(job.last_verified_at)+" · Controlla la disponibilità sul portale");
 main.append(checked);
 article.append(main);
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
 const base=filteredJobs(state.payload.jobs,{text:el("textSearch").value,city:el("citySearch").value,role:el("roleSelect").value,level:el("levelSelect").value,sort:el("sortSelect").value});
 setText("resultCount",base.length+" "+(base.length===1?"posizione":"posizioni")+" trovate");
 const container=el("jobs");container.replaceChildren();
 if(!base.length)container.append(make("p","empty","Nessuna posizione corrisponde ai filtri. Prova un'altra città, amplia il livello o seleziona tutte le aree."));
 else for(const job of base.slice(0,state.shown))container.append(jobRow(job));
 const more=el("more");more.hidden=base.length<=state.shown;
}
function setup(data){
 state.payload=data;
 const valid=(data.jobs||[]).filter(x=>validPublicJob(x));
 setText("allCount",valid.length.toLocaleString("it-IT"));
 setText("brandCount",new Set(valid.map(x=>x.brand)).size);
 setText("lastScan",data.sources_successful>0?fmtTime(data.last_ats_scan_at):"Controlli in attivazione");
 const status=el("freshness"),last=data.last_ats_scan_at;
 const old=Date.now()-(parsedDate(last)||0)>24*3600000;
 status.classList.toggle("stale",old);
 if(data.sources_successful>0){
  status.textContent="Ultimo controllo di "+data.sources_successful+" fonti ufficiali: "+fmtTime(last)+
   (old?". Il controllo non è recente: le offerte possono essere cambiate.":". La copertura riguarda solo le fonti disponibili, non tutto il mercato.");
 }else{
  status.textContent="Archivio iniziale del "+fmtDay(data.generated_at)+
   ". Non è ancora avvenuto un controllo indipendente dei portali ufficiali: verifica l'annuncio prima di candidarti.";
 }
 const roles=[...new Set(valid.map(j=>j.role).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"it"));
 for(const role of roles){const option=document.createElement("option");option.value=role;option.textContent=role;el("roleSelect").append(option)}
 for(const id of ["textSearch","citySearch","roleSelect","levelSelect","sortSelect"]){
  el(id).addEventListener(id==="textSearch"||id==="citySearch"?"input":"change",()=>{state.shown=24;recompute()});
 }
 el("more").onclick=()=>{state.shown+=24;recompute()};
 recompute();
}
fetch("./jobs.json?cache="+Date.now(),{cache:"no-store"})
 .then(r=>{if(!r.ok)throw Error("Feed HTTP "+r.status);return r.json()})
 .then(data=>{if(!data||data.format!==1||!Array.isArray(data.jobs))throw Error("Formato del radar non disponibile");setup(data)})
 .catch(err=>{
  setText("freshness","Il catalogo pubblico non è raggiungibile. Non dipende dalla password: riprova più tardi.");
  setText("resultCount","Servizio temporaneamente non disponibile");
  el("jobs").replaceChildren(make("p","empty","Impossibile caricare le opportunità pubbliche in questo momento."));
  console.warn("Public radar",err);
 });
