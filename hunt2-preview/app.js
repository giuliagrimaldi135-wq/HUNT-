import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { checkRequirements, assessDossier, applicationInsight, newsTeaser } from "./dossier-intelligence.js?v=20261109-145";
import { interpretCvText } from "./cv-interpreter.js?v=20261109-63";
import { findSimilarOpportunities } from "./opportunity-similarity.js?v=20261109-70";
import { chooseRelevantCv } from "./cv-ranking.js?v=20261109-73";
import { prioritizeRequirements, compareKeyRequirement } from "./requirement-priority.js?v=20261109-145";
import {renderJobWorkspace} from "./job-workspace.js?v=20261110-155";
import {buildOutreachLeads,attachBrandNews,enrichOutreachLeads,chooseOutreachCv,describeOutreachCv,composeOutreachEmail,renderOutreachCards,renderOutreachFolder} from "./outreach-intelligence.js?v=20261110-164";

const SUPABASE_URL="https://dfiokxjfgqoboxckcuut.supabase.co";
const SUPABASE_KEY="sb_publishable_9F3UoJWHMYSKSGqTibcZDg_VMRCGsI_";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
const app=document.getElementById("app");
let currentUser=null;
let currentView=new URLSearchParams(window.location.search).get("view")==="outreach"?"outreach":"opportunities";
let selectedJobId=null;
let selectedDossierCvId=null;
const dossierCvChoices=new Map();
let opportunitySort="priority";
let radarSignalFilter="all";
let radarCompanyFilter="all";
let radarShowRead=false;
const pendingDossiers=new Set();

const macroAreas=[
  "Merchandising",
  "Buying",
  "Planning & Allocation",
  "Retail & Retail Operations",
  "E-commerce & Digital",
  "Product Management & Development",
  "Production & Sourcing",
  "Wholesale & Commercial",
  "Marketing & Brand",
  "PR, Communications & Events",
  "CRM & Clienteling",
  "Visual Merchandising",
  "Supply Chain & Logistics",
  "Design & Creative",
  "Data & Analytics",
  "Strategy & Project Management",
  "HR & Talent",
  "Finance & Legal",
  "Sustainability",
  "Technology"
];
const seniorityLevels=[
  ["internship","Internship / Stage"],
  ["trainee","Trainee / Graduate Program"],
  ["entry_level","Entry Level"],
  ["assistant","Assistant"],
  ["junior","Junior"],
  ["associate","Associate"],
  ["coordinator_specialist","Coordinator / Specialist"],
  ["mid_level","Mid-level"],
  ["manager","Manager"],
  ["senior_manager","Senior Manager"],
  ["head_director","Head / Director"]
];
const radarScopes=[
  ["focused","Solo i miei target","Mostrami quasi esclusivamente i ruoli che scelgo come obiettivo."],
  ["smart","Allarga in modo intelligente","Consigliami anche ruoli vicini che possono essere un buon ponte verso il mio obiettivo."],
  ["explore","Fammi esplorare","Mostrami anche alternative più ampie se il mio profilo è forte, spiegandomi sempre perché."]
];
const esc=(s="")=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function authView(message="",bad=false){
 app.innerHTML=`<section class="authWrap"><div class="auth">
   <div class="logo">HUNT<span>.</span></div>
   <div class="eyebrow">Fashion & Luxury Career Intelligence</div>
   <h1>Il tuo radar personale.</h1>
   <p class="lead">Un account. Il mercato filtrato per te. Opportunità, CV, dossier e candidature nello stesso posto.</p>
   <form id="authForm" class="card stack authCard">
     <label><div class="eyebrow">Email</div><input class="input" id="email" type="email" required autocomplete="email"></label>
     <label><div class="eyebrow">Password</div><input class="input" id="password" type="password" minlength="8" required autocomplete="current-password"></label>
     ${message?`<div class="msg ${bad?"bad":"good"}">${esc(message)}</div>`:""}
     <div class="actions"><button class="btn primary" id="loginBtn" type="button">Accedi</button><button class="btn" id="signupBtn" type="button">Crea account</button></div>
   </form>
   <p class="muted" style="font-size:12px;margin-top:14px">Beta preview HUNT 2 · i CV sono salvati nel bucket privato del tuo account.</p>
 </div></section>`;
 document.getElementById("loginBtn").onclick=login;
 document.getElementById("signupBtn").onclick=signup;
}

async function login(){
 const email=document.getElementById("email").value.trim();
 const password=document.getElementById("password").value;
 if(!email||password.length<8){authView("Inserisci email e password di almeno 8 caratteri.",true);return}
 const {error}=await supabase.auth.signInWithPassword({email,password});
 if(error){authView(error.message,true);return}
 await bootstrap();
}

async function signup(){
 const email=document.getElementById("email").value.trim();
 const password=document.getElementById("password").value;
 if(!email||password.length<8){authView("Inserisci email e password di almeno 8 caratteri.",true);return}
 const redirectTo=location.origin+location.pathname;
 const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});
 if(error){authView(error.message,true);return}
 if(data.session){await bootstrap();return}
 authView("Account creato. Controlla la tua email e conferma l'indirizzo; poi torna qui e accedi.");
}

async function logout(){await supabase.auth.signOut();currentUser=null;authView()}

async function getProfile(){
 const {data}=await supabase.from("profiles").select("*").eq("user_id",currentUser.id).maybeSingle();
 return data;
}

async function getPersonalization(){
 const {data}=await supabase.from("user_personalization").select("*").eq("user_id",currentUser.id).maybeSingle();
 return data;
}

async function bootstrap(){
 const {data:{session}}=await supabase.auth.getSession();
 currentUser=session?.user||null;
 if(!currentUser){authView();return}
 const profile=await getProfile();
 if(!profile?.onboarding_completed){onboardingView(profile);return}
 const personalization=await getPersonalization();
 if(!personalization?.completed){await personalizationView(profile,personalization);return}
 renderShell();
}

function onboardingView(profile){
 const roleHtml=`<div class="choiceGrid">${macroAreas.map(r=>`<label class="choice"><input type="checkbox" name="primary" value="${esc(r)}"><span>${esc(r)}</span></label>`).join("")}</div>`;
 const seniorityHtml=seniorityLevels.map(([value,label])=>`<option value="${value}">${label}</option>`).join("");
 const radarHtml=radarScopes.map(([value,title,description],i)=>`<label class="radarOption"><input type="radio" name="radar_scope" value="${value}" ${i===1?"checked":""}><span><strong>${title}</strong><small>${description}</small></span></label>`).join("");

 app.innerHTML=`<div class="main" style="margin:auto"><div class="eyebrow">Personalizzazione</div><h1>Costruiamo il tuo HUNT.</h1>
 <p class="lead">Non devi conoscere tutti i titoli di lavoro del settore. Tu ci dici dove vuoi andare; HUNT può allargare il radar senza perdere di vista il tuo obiettivo.</p>
 <form id="onboarding" class="stack section">
  <section class="card"><div class="eyebrow">1 · Chi sei</div><div class="grid2" style="margin-top:12px">
   <label><div class="eyebrow">Nome</div><input class="input" name="first_name" placeholder="Es. Giulia" value="${esc(profile?.first_name||"")}" required></label>
   <label><div class="eyebrow">Cognome</div><input class="input" name="last_name" placeholder="Es. Grimaldi" value="${esc(profile?.last_name||"")}" required></label>
  </div><label style="display:block;margin-top:12px"><div class="eyebrow">A che livello sei oggi?</div><select class="input" name="seniority">${seniorityHtml}</select></label>
  </section>

  <section class="card"><div class="eyebrow">2 · Obiettivo professionale</div><h2 style="margin:5px 0">Cosa vuoi davvero fare?</h2><p class="lead">Scegli una o più macro-aree. HUNT cercherà poi automaticamente tutti i ruoli e i titoli pertinenti dentro ogni area.</p>${roleHtml}</section>

  <section class="card"><div class="eyebrow">3 · Ampiezza del radar</div><h2>Quanto vuoi che HUNT allarghi gli orizzonti?</h2><p class="lead">Non ti chiediamo di conoscere in anticipo tutti i “ruoli adiacenti”. Decidi solo quanto vuoi esplorare; sarà HUNT a proporre alternative sensate e a spiegarti il collegamento.</p><div class="radarGrid">${radarHtml}</div></section>

  <section class="card"><div class="eyebrow">4 · Dove</div><h2>Dove vuoi lavorare?</h2>
   <label><div class="eyebrow">Città</div><input class="input" id="preferredCity" placeholder="Es. Milano"></label>
   <div class="actions"><button class="btn" type="button" id="addPreferredLocation">+ Aggiungi città</button></div>
   <div id="preferredLocationsList" class="tagList"></div>

   <div style="height:1px;background:var(--line);margin:20px 0"></div>

   <div class="eyebrow">Dove ti trasferiresti?</div>
   <label style="display:block;margin-top:12px"><div class="eyebrow">Città</div><input class="input" id="relocationCity" placeholder="Es. Parigi"></label>
   <div class="actions"><button class="btn" type="button" id="addRelocationLocation">+ Aggiungi città</button></div>
   <div id="relocationLocationsList" class="tagList"></div>
  </section>
  <section class="card"><div class="eyebrow">5 · Primo CV</div><h2>Puoi aggiungerne altri dopo.</h2><div class="grid2" style="margin-top:12px"><label><div class="eyebrow">Nome CV</div><input class="input" name="cvname" placeholder="Es. Retail Merchandising"></label><label><div class="eyebrow">File</div><input class="input" name="cv" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"></label></div></section>
  <div id="onMsg"></div><div class="actions"><button class="btn green" type="submit">Crea il mio HUNT</button><button class="btn" id="logoutOn" type="button">Esci</button></div>
 </form></div>`;
 const preferredLocations=[];
 const relocationLocations=[];
 const renderLocationTags=(id,items,type)=>{document.getElementById(id).innerHTML=items.map((item,index)=>`<span class="locationTag">${esc(item)}<button type="button" data-remove-location="${type}" data-index="${index}" aria-label="Rimuovi">×</button></span>`).join("")};
 const addLocation=(cityId,items,listId,type)=>{
   const city=document.getElementById(cityId).value.trim();
   if(!city)return;
   if(!items.includes(city))items.push(city);
   document.getElementById(cityId).value="";
   renderLocationTags(listId,items,type);
 };
 document.getElementById("addPreferredLocation").onclick=()=>addLocation("preferredCity",preferredLocations,"preferredLocationsList","preferred");
 document.getElementById("addRelocationLocation").onclick=()=>addLocation("relocationCity",relocationLocations,"relocationLocationsList","relocation");
 document.getElementById("onboarding").onclick=(event)=>{
   const btn=event.target.closest("[data-remove-location]");
   if(!btn)return;
   const target=btn.dataset.removeLocation==="preferred"?preferredLocations:relocationLocations;
   target.splice(Number(btn.dataset.index),1);
   renderLocationTags(btn.dataset.removeLocation==="preferred"?"preferredLocationsList":"relocationLocationsList",target,btn.dataset.removeLocation);
 };
 document.getElementById("logoutOn").onclick=logout;
 document.getElementById("onboarding").onsubmit=(event)=>saveOnboarding(event,preferredLocations,relocationLocations);
}

async function saveOnboarding(e,preferredLocations=[],relocationLocations=[]){
 e.preventDefault();
 const form=e.currentTarget, fd=new FormData(form), msg=document.getElementById("onMsg");
 const primary=fd.getAll("primary");
 const locations=preferredLocations;
 const firstName=String(fd.get("first_name")||"").trim();
 const lastName=String(fd.get("last_name")||"").trim();
 const radarScope=String(fd.get("radar_scope")||"smart");
 if(!firstName||!lastName){msg.innerHTML='<div class="msg bad">Inserisci nome e cognome.</div>';return}
 if(!primary.length){msg.innerHTML='<div class="msg bad">Scegli almeno un obiettivo professionale.</div>';return}
 msg.innerHTML='<div class="msg good">Salvataggio…</div>';
 const now=new Date().toISOString();
 const p=await supabase.from("profiles").upsert({
   user_id:currentUser.id,
   first_name:firstName,
   last_name:lastName,
   display_name:firstName+" "+lastName,
   seniority:fd.get("seniority")||"entry_level",
   onboarding_completed:true,
   updated_at:now
 });
 if(p.error){msg.innerHTML='<div class="msg bad">'+esc(p.error.message)+'</div>';return}
 const pref=await supabase.from("career_preferences").upsert({
   user_id:currentUser.id,
   primary_role_families:primary,
   secondary_role_families:[],
   excluded_role_families:[],
   preferred_locations:locations,
   relocation_locations:relocationLocations,
   employment_types:["internship","full_time"],
   preferred_brands:[],
   excluded_brands:[],
   industries:["fashion","luxury"],
   preferences:{radar_scope:radarScope},
   updated_at:now
 });
 if(pref.error){msg.innerHTML='<div class="msg bad">'+esc(pref.error.message)+'</div>';return}
 let newCvId=null;
 const file=fd.get("cv");
 if(file instanceof File && file.size){
   if(file.size>8*1024*1024){msg.innerHTML='<div class="msg bad">CV troppo grande: massimo 8 MB.</div>';return}
   const ext=(file.name.split(".").pop()||"pdf").toLowerCase();
   const fileMimes={pdf:"application/pdf",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",txt:"text/plain",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg"};
   if(!fileMimes[ext]){msg.innerHTML='<div class="msg bad">Formato CV non supportato.</div>';return}
   const path=currentUser.id+"/"+crypto.randomUUID()+"."+ext;
   const up=await supabase.storage.from("cvs").upload(path,file,{contentType:fileMimes[ext],upsert:false});
   if(up.error){msg.innerHTML='<div class="msg bad">'+esc(up.error.message)+'</div>';return}
   const row=await supabase.from("user_cvs").insert({user_id:currentUser.id,name:fd.get("cvname")||file.name,storage_path:path,target_role_families:primary,parsed_profile:{},is_default:true,active:true}).select("id").single();
   if(row.error){await supabase.storage.from("cvs").remove([path]);msg.innerHTML='<div class="msg bad">'+esc(row.error.message)+'</div>';return}
   newCvId=row.data.id;
 }
 if(newCvId){
   // A first-time member enters their private CV workspace and starts extraction.
   currentView="profile";
   await renderProfile();
   const reader=document.querySelector('#cvManagerRoot [data-cv-action="read"][data-cv-id="'+newCvId+'"]');
   if(reader)reader.click();
 }else{
   await renderShell();
 }
}

async function personalizationView(profile,personalization){
 const [prefRes,cvRes]=await Promise.all([
   supabase.from("career_preferences").select("*").eq("user_id",currentUser.id).maybeSingle(),
   supabase.from("user_cvs").select("id,name,is_default,active").eq("user_id",currentUser.id).eq("active",true)
 ]);
 const pref=prefRes.data||{};
 const cvs=cvRes.data||[];
 const targets=Array.isArray(pref.primary_role_families)?pref.primary_role_families:[];
 const cities=Array.isArray(pref.preferred_locations)?pref.preferred_locations:[];

 const interestOptions=[
   ["product_assortment","Prodotto, assortimenti e collezioni"],
   ["numbers_performance","Numeri, KPI e performance"],
   ["retail_market","Clienti, negozi e mercato"],
   ["product_development","Sviluppo prodotto"],
   ["commercial_relationships","Commerciale e relazioni"],
   ["organization_operations","Organizzazione e processi"],
   ["brand_communication","Brand, comunicazione e immagine"],
   ["creative","Creatività e contenuti"],
   ["still_exploring","Non lo so ancora"]
 ];
 const driverOptions=[
   ["skills","Imparare competenze nuove"],
   ["responsibility","Avere responsabilità e autonomia"],
   ["growth","Avere un percorso di crescita chiaro"],
   ["international","Lavorare in un ambiente internazionale"],
   ["product_brand","Lavorare con un prodotto o brand che mi interessa davvero"],
   ["stability","Avere più stabilità e continuità"],
   ["compensation","Avere una buona retribuzione e benefit"],
   ["balance","Avere flessibilità e un buon equilibrio vita-lavoro"],
   ["explore","Capire meglio quale strada professionale fa per me"]
 ];
 const avoidOptions=[
   ["store_sales","Vendita in negozio come attività principale"],
   ["social_content","Social o content come attività principale"],
   ["pure_commercial","Ruoli quasi solo commerciali"],
   ["backoffice_admin","Ruoli quasi solo amministrativi / back office"],
   ["operations_logistics","Ruoli molto operativi o logistici"],
   ["constant_customer_contact","Contatto cliente continuo"],
   ["technical_it","Ruoli molto tecnici / IT"],
   ["none","Non voglio escludere niente per ora"]
 ];

 app.innerHTML=`<div class="main" style="margin:auto">
  <div class="eyebrow">Profilo personale</div>
  <h1>Conosciamoci un po' meglio.</h1>
  <p class="lead">Poche domande su ciò che ti interessa davvero. Niente testi lunghi: HUNT userà queste risposte insieme al CV e alle tue scelte nel tempo.</p>

  <section class="card section">
   <div class="eyebrow">Quello che HUNT sa già</div>
   <div class="profileLine"><span>Nome</span><strong>${esc(profile?.display_name||"—")}</strong></div>
   <div class="profileLine"><span>Livello</span><strong>${esc(profile?.seniority||"—")}</strong></div>
   <div class="profileLine"><span>Aree target</span><strong>${esc(targets.join(", ")||"—")}</strong></div>
   <div class="profileLine"><span>Città</span><strong>${esc(cities.join(", ")||"—")}</strong></div>
   <div class="profileLine"><span>CV caricati</span><strong>${cvs.length}</strong></div>
  </section>

  <form id="personalizationForm" class="stack section">
   <section class="card">
    <div class="eyebrow">1 · Cosa ti interessa</div>
    <h2>Quale parte del lavoro ti attira di più?</h2>
    <p class="lead">Scegli tutte quelle che ti rappresentano.</p>
    <div class="choiceGrid">${interestOptions.map(([value,label])=>`<label class="choice"><input type="checkbox" name="interest_area" value="${value}"><span>${label}</span></label>`).join("")}</div>
   </section>

   <section class="card">
    <div class="eyebrow">2 · Prossima esperienza</div>
    <h2>Cosa vorresti trovare soprattutto nel tuo prossimo lavoro?</h2>
    <p class="lead">Scegli tutte quelle che per te contano davvero.</p>
    <div class="choiceGrid">${driverOptions.map(([value,label])=>`<label class="choice"><input type="checkbox" name="next_driver" value="${value}"><span>${label}</span></label>`).join("")}</div>
   </section>

   <section class="card">
    <div class="eyebrow">3 · Tipo di azienda</div>
    <h2>Che tipo di realtà ti incuriosisce di più?</h2>
    <div class="radarGrid">
     <label class="radarOption"><input type="radio" name="company_preference" value="both" checked><span><strong>Entrambe</strong><small>Mi interessano sia grandi maison sia brand indipendenti, se il ruolo è giusto.</small></span></label>
     <label class="radarOption"><input type="radio" name="company_preference" value="large"><span><strong>Maison e gruppi strutturati</strong><small>Mi attira di più un ambiente grande e organizzato.</small></span></label>
     <label class="radarOption"><input type="radio" name="company_preference" value="independent"><span><strong>Brand indipendenti o emergenti</strong><small>Mi attira di più una realtà piccola o in crescita.</small></span></label>
     <label class="radarOption"><input type="radio" name="company_preference" value="no_preference"><span><strong>Non ho preferenze</strong><small>Per me conta soprattutto l'opportunità.</small></span></label>
    </div>
   </section>

   <section class="card">
    <div class="eyebrow">4 · Cosa vuoi evitare</div>
    <h2>Ci sono tipi di ruolo che sai già che non fanno per te?</h2>
    <p class="lead">Puoi sceglierne più di uno oppure non escludere niente.</p>
    <div class="choiceGrid">${avoidOptions.map(([value,label])=>`<label class="choice"><input type="checkbox" name="avoid_trait" value="${value}"><span>${label}</span></label>`).join("")}</div>
   </section>

   <div id="personalizationMsg"></div>
   <div class="actions"><button class="btn green" type="submit">Continua</button></div>
  </form>
 </div>`;

 const form=document.getElementById("personalizationForm");
 form.onsubmit=savePersonalization;
}

async function savePersonalization(e){
 e.preventDefault();
 const fd=new FormData(e.currentTarget);
 const msg=document.getElementById("personalizationMsg");
 const interests=fd.getAll("interest_area");
 const drivers=fd.getAll("next_driver");
 const avoids=fd.getAll("avoid_trait");
 if(!interests.length||!drivers.length){
   msg.innerHTML='<div class="msg bad">Scegli almeno una risposta nelle prime due domande.</div>';
   return;
 }
 const payload={
   user_id:currentUser.id,
   interest_areas:interests,
   next_experience_drivers:drivers,
   company_preference:String(fd.get("company_preference")||"both"),
   avoid_role_traits:avoids,
   completed:true,
   updated_at:new Date().toISOString()
 };
 msg.innerHTML='<div class="msg good">Salvataggio…</div>';
 const {error}=await supabase.from("user_personalization").upsert(payload);
 if(error){msg.innerHTML='<div class="msg bad">'+esc(error.message)+'</div>';return}
 renderShell();
}

function shell(inner){
 return `<div class="shell"><aside class="side"><div class="logo">HUNT<span>.</span></div><div class="sub">Fashion & Luxury Career Intelligence</div>
 <div class="nav">${["opportunities","outreach","radar","applications","profile"].map(v=>`<button data-view="${v}" class="${currentView===v?"active":""}">${({opportunities:"Opportunità",outreach:"Brand da contattare",radar:"Fashion News",applications:"Candidature",profile:"Profilo"})[v]}</button>`).join("")}</div>
 <div class="sideFoot">Beta connected · Supabase</div></aside><main class="main">${inner}</main></div>
 <nav class="mobileNav">${["opportunities","outreach","radar","applications","profile"].map(v=>`<button data-view="${v}">${({opportunities:"Opportunità",outreach:"Brand",radar:"Fashion News",applications:"Candidature",profile:"Profilo"})[v]}</button>`).join("")}</nav>`;
}

async function renderShell(){
 if(currentView==="opportunities") return renderOpportunities();
 if(currentView==="applications") return renderApplications();
 if(currentView==="outreach") return renderOutreach();
  if(currentView==="radar") return renderWorldRadar();
 return renderProfile();
}

async function getOpportunityFeed(limit=100){
 const [{data:matches,error:matchError},{data:hidden},{data:applications},{data:pref}]=await Promise.all([
   supabase.from("user_job_matches").select("job_id,match_score,priority_score,reasons,gaps").eq("user_id",currentUser.id).order("priority_score",{ascending:false}).limit(limit),
   supabase.from("user_job_feedback").select("job_id").eq("user_id",currentUser.id).eq("feedback_type","hide"),
   supabase.from("applications").select("job_id,status").eq("user_id",currentUser.id),
   supabase.from("career_preferences").select("preferred_locations,relocation_locations,preferences").eq("user_id",currentUser.id).maybeSingle()
 ]);
 if(matchError||!matches?.length)return {data:[],error:matchError};
 // A saved or "preparing" vacancy must stay in the feed; only submitted/closed applications are excluded.
 const completed=new Set(["applied","interview","offer","accepted","rejected","withdrawn","declined"]);
 const excluded=new Set([...(hidden||[]).map(x=>x.job_id),...(applications||[]).filter(x=>completed.has(x.status)).map(x=>x.job_id).filter(Boolean)]);
 const ids=matches.map(x=>x.job_id).filter(id=>!excluded.has(id));
 if(!ids.length)return {data:[],error:null};
 const {data:jobs,error:jobError}=await supabase
   .from("jobs")
   .select("id,company_id,canonical_title,role_family,city,remote_mode,vacancy_confidence,confidence_label,last_verified_at,published_at,first_seen_at,primary_apply_url,state,description,metadata,companies(name)")
   .in("id",ids);
 if(jobError)return {data:[],error:jobError};

 const cutoff=new Date();cutoff.setDate(cutoff.getDate()-20);cutoff.setHours(0,0,0,0);
 const cities=[...(pref?.preferred_locations||[]),...(pref?.relocation_locations||[])].map(x=>String(x).toLowerCase());
 const radar=String(pref?.preferences?.radar_scope||"smart");
 const minMatch=radar==="explore"?60:radar==="focused"?75:70;
 const cityAllowed=(job)=>{
   if(job.remote_mode==="remote")return true;
   if(!cities.length)return true;
   if(!job.city)return false;
   const normalize=v=>String(v||"").toLowerCase().trim()
     .replace(/milano\b/g,"milan").replace(/parigi\b/g,"paris").replace(/londra\b/g,"london").replace(/roma\b/g,"rome")
     .replace(/ginevra\b/g,"geneva").replace(/zurigo\b/g,"zurich").replace(/bruxelles\b/g,"brussels");
   const city=normalize(job.city);
   return cities.some(x=>{const area=normalize(x);return area.length>2&&(city.includes(area)||area.includes(city))});
 };
 const fresh=(jobs||[]).filter(job=>{
   const live=[job.published_at,job.first_seen_at,job.last_verified_at].filter(Boolean).some(date=>new Date(date)>=cutoff);
   return live&&cityAllowed(job)&&["active_verified","active_likely"].includes(job.state);
 });
 const byId=new Map(fresh.map(job=>[job.id,job]));
 const applicationByJob=new Map((applications||[]).map(x=>[x.job_id,x.status]));
 return {data:matches.map(match=>({...match,job:byId.get(match.job_id),applicationStatus:applicationByJob.get(match.job_id)||null}))
   .filter(x=>x.job&&!excluded.has(x.job_id)&&x.match_score>=minMatch),error:null};
}

async function getOpportunityDetail(jobId){
 const [{data:job,error:jobError},{data:match},{data:application},{data:personalization},{data:cvs},{data:reposts},{data:dossier},{data:careerPrefs}]=await Promise.all([
   supabase.from("jobs").select("id,company_id,canonical_title,role_family,city,vacancy_confidence,confidence_label,last_verified_at,published_at,first_seen_at,primary_apply_url,state,description,metadata,companies(name,careers_url)").eq("id",jobId).maybeSingle(),
   supabase.from("user_job_matches").select("match_score,priority_score,reasons,gaps").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle(),
   supabase.from("applications").select("*").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle(),
   supabase.from("user_personalization").select("interest_areas,next_experience_drivers,company_preference,avoid_role_traits").eq("user_id",currentUser.id).maybeSingle(),
   supabase.from("user_cvs").select("id,name,target_role_families,parsed_profile,is_default,created_at,updated_at").eq("user_id",currentUser.id).eq("active",true).order("created_at",{ascending:false}),
   supabase.from("repost_events").select("id,detected_at,reason,evidence").eq("job_id",jobId).order("detected_at",{ascending:false}),
   supabase.from("user_job_dossiers").select("*").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle(),
   supabase.from("career_preferences").select("primary_role_families,secondary_role_families,preferred_locations,relocation_locations,employment_types,preferences").eq("user_id",currentUser.id).maybeSingle()
 ]);
 if(jobError)throw new Error("La posizione non può essere caricata: "+jobError.message);
 if(!job)throw new Error("Questa posizione non è più disponibile nel database di HUNT.");
 const companyName=String(job.companies?.name||"").trim();
 const searchBrand=companyName.replace(/\s+(Fashion Group|Group|Holdings|S\.p\.A\.|Ltd\.)$/i,"").trim();
 const [{data:signals},{data:relatedMatches},{data:brandMedia},{data:companyJobs},{data:nearbyJobs}]=await Promise.all([
   supabase.from("company_signals").select("id,signal_type,title,summary,source_name,source_url,published_at,relevance_score").eq("company_id",job.company_id).order("published_at",{ascending:false,nullsFirst:false}).limit(35),
   supabase.from("user_job_matches")
     .select("match_score,priority_score,jobs!inner(id,company_id,canonical_title,city,role_family,published_at,first_seen_at,state)")
     .eq("user_id",currentUser.id)
     .eq("jobs.company_id",job.company_id)
     .neq("job_id",jobId)
     .gte("match_score",70)
     .order("priority_score",{ascending:false})
     .limit(5),
   searchBrand.length>=3
     ?supabase.from("world_news_items").select("id,title,summary,url,published_at,evidence,world_news_sources(publisher)").or("title.ilike.%"+searchBrand.replace(/[%_,().]/g," ").slice(0,75)+"%,summary.ilike.%"+searchBrand.replace(/[%_,().]/g," ").slice(0,75)+"%").order("published_at",{ascending:false}).limit(35)
     :Promise.resolve({data:[]}),
   supabase.from("jobs").select("id,canonical_title,city,role_family,seniority,employment_type,published_at,first_seen_at,primary_apply_url,state,confidence_label")
     .eq("company_id",job.company_id).in("state",["active_verified","active_likely"])
     .neq("id",jobId).order("first_seen_at",{ascending:false}).limit(40),
   supabase.from("user_job_matches")
     .select("match_score,priority_score,jobs!inner(id,company_id,canonical_title,city,role_family,published_at,first_seen_at,primary_apply_url,state,companies(name))")
     .eq("user_id",currentUser.id).gte("match_score",65)
     .in("jobs.state",["active_verified","active_likely"])
     .order("priority_score",{ascending:false}).limit(40)
 ]);
 const cutoff=new Date(Date.now()-20*86400000);
 const sameJobs=(relatedMatches||[])
   .map(x=>({...x.jobs,match_score:x.match_score,priority_score:x.priority_score}))
   .filter(x=>{const date=x?.published_at||x?.first_seen_at;return date&&new Date(date)>=cutoff});
 const candidates=(nearbyJobs||[]).map(x=>({...x.jobs,match_score:x.match_score,priority_score:x.priority_score}))
   .filter(x=>x.id&&x.id!==jobId&&x.company_id!==job.company_id&&["active_verified","active_likely"].includes(x.state));
 const alternatives=findSimilarOpportunities(job,candidates,4);
 return {job,...(match||{match_score:0,priority_score:0,reasons:[],gaps:[]}),application,personalization,cvs:cvs||[],reposts:reposts||[],signals:signals||[],brandMedia:brandMedia||[],companyJobs:companyJobs||[],sameJobs,alternatives,careerPrefs:careerPrefs||{},dossier:dossier||null};
}

function ageLabel(value,firstSeen=null){
 const date=value||firstSeen;
 if(!date)return "Data non verificata";
 const days=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/86400000));
 if(!value)return days===0?"Rilevata oggi":days===1?"Rilevata ieri":`Rilevata ${days} giorni fa`;
 return days===0?"Pubblicata oggi":days===1?"Pubblicata ieri":`Pubblicata ${days} giorni fa`;
}
function verifiedLabel(job){
 if(job.confidence_label==="VERIFIED ACTIVE"){
   if(!job.last_verified_at)return "Annuncio verificato";
   const d=new Date(job.last_verified_at);
   const today=new Date();
   return d.toDateString()===today.toDateString()?"Verificato oggi":"Verificato "+d.toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
 }
 return "Attività da riconfermare";
}

function sourceLabel(job){
 const source=String(job?.metadata?.public_ats||"");
 if(source==="ats_lever")return "Fonte diretta · Lever";
 if(source==="ats_greenhouse")return "Fonte diretta · Greenhouse";
 if(source==="ats_ashby")return "Fonte diretta · Ashby";
 if(source==="ats_smartrecruiters")return "Fonte diretta · SmartRecruiters";
 if(source==="ats_workable")return "Fonte diretta · Workable";
 if(source==="ats_successfactors")return "Portale ufficiale · SuccessFactors";
 return "Fonte · Annuncio aziendale";
}
function partialJobSource(job){
 const meta=job?.metadata||{};
 return !meta.source_facts&&(meta.verification==="official_search_result"||meta.verification==="aggregator_search_result"||String(job?.description||"").length<340);
}
function opportunityCard(row){
 const job=row.job;
 const brand=job.companies?.name||"Brand";
 return `<article class="jobCard cleanJobCard">
  <div class="jobMain">
   <div class="eyebrow">${esc(brand)}</div>
   <h3>${esc(job.canonical_title)}</h3>
   <div class="jobMeta">${esc(job.city||"Località da verificare")} · ${esc(job.role_family||"Altro")}</div>
   <div class="humanBadges editorialMeta">
    <span class="matchPill">${partialJobSource(job)?"Match preliminare":row.match_score+"% compatibilità stimata"}</span>
    ${row.applicationStatus==="preparing"?'<span class="jobPreparing">In preparazione</span>':""}
    <span>${esc(ageLabel(job.published_at,job.first_seen_at))}</span>
    <span>${esc(verifiedLabel(job))}</span>
    <span class="sourceMeta">${esc(sourceLabel(job))}</span>
   </div>
   <div class="actions editorialActions">
    ${job.primary_apply_url?`<a class="btn primary" href="${esc(job.primary_apply_url)}" target="_blank" rel="noopener">Apri posizione ↗</a>`:""}
    <button class="btn" type="button" data-open-dossier="${job.id}">Apri dossier</button>
    <button class="btn" data-applied="${job.id}">Già candidata</button>
    <button class="btn ghostDanger" data-ignore="${job.id}">Ignora</button>
   </div>
  </div>
 </article>`;
}

async function saveApplication(jobId,status){
 if(status==="preparing")return openOpportunityFolder(jobId);
 const detail=await getOpportunityDetail(jobId);
 if(!detail)return;
 const now=new Date().toISOString();
 const payload={
   user_id:currentUser.id,
   job_id:jobId,
   company_id:detail.job.company_id,
   status,
   applied_at:status==="applied"?now:null,
   updated_at:now
 };
 const {data:existing}=await supabase.from("applications").select("id").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle();
 const result=existing
   ? await supabase.from("applications").update(payload).eq("id",existing.id)
   : await supabase.from("applications").insert(payload);
 if(result.error){alert(result.error.message);return}
 await supabase.from("user_job_feedback").insert({user_id:currentUser.id,job_id:jobId,feedback_type:status==="applied"?"apply":"save",details:{source:"opportunity_action"}});
 if(status==="preparing"){
   await openOpportunityFolder(jobId);
   return;
 }
 currentView="applications";
 await renderApplications();
}

async function ignoreJob(jobId){
 const {error}=await supabase.from("user_job_feedback").insert({user_id:currentUser.id,job_id:jobId,feedback_type:"hide",details:{source:"opportunity_action"}});
 if(error){alert(error.message);return}
 currentView="opportunities";
 await renderOpportunities();
}

async function openOpportunityFolder(jobId,push=true){
 if(!/^[0-9a-f-]{36}$/i.test(String(jobId||"")))return;
 const previousJob=selectedJobId;
 if(previousJob!==jobId)selectedDossierCvId=dossierCvChoices.get(jobId)||null;
 selectedJobId=jobId;
 app.innerHTML=shell('<div class="folderLoading" role="status"><div class="eyebrow">HUNT · Dossier candidatura</div><h2>Caricamento della posizione…</h2><p>Recupero annuncio, CV, informazioni aziendali e notizie senza modificare lo stato della candidatura.</p></div>');
 try{
   await renderOpportunityFolder(jobId);
   if(push&&selectedJobId===jobId)history.pushState({huntFolder:jobId},"","#job="+jobId);
 }catch(error){
   console.error("HUNT dossier load failed",error);
   selectedJobId=previousJob;
   app.innerHTML=shell(`<section class="folderLoading folderError" role="alert"><div class="eyebrow">Dossier non disponibile</div><h2>Non siamo riusciti ad aprire questa posizione</h2><p>${esc(error instanceof Error?error.message:String(error))}</p><button type="button" class="btn primary" id="retryDossier">Riprova</button><button type="button" class="btn" id="returnToOpportunities">Torna alle opportunità</button></section>`);
   bindNav();
   const retry=document.getElementById("retryDossier");if(retry)retry.onclick=()=>openOpportunityFolder(jobId,false);
   const back=document.getElementById("returnToOpportunities");if(back)back.onclick=()=>{
      history.replaceState({},"",location.pathname+location.search);
      renderOpportunities().catch(e=>{console.error("HUNT feed recovery failed",e);location.reload()});
    };
 }
}

function bindOpportunityActions(){
 document.querySelectorAll("[data-applied]").forEach(b=>b.onclick=()=>saveApplication(b.dataset.applied,"applied"));
 document.querySelectorAll("[data-ignore]").forEach(b=>b.onclick=()=>ignoreJob(b.dataset.ignore));
}
app.addEventListener("click",event=>{
 const target=event.target.closest?.("[data-open-dossier]");
 if(!target||!app.contains(target))return;
 event.preventDefault();
 if(target.disabled)return;
 openOpportunityFolder(target.dataset.openDossier);
});
function bindNav(){
 document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;renderShell()});
}

async function renderOpportunities(){
 currentView="opportunities";
 selectedJobId=null;
 const feed=await getOpportunityFeed(100);
 const rows=[...(feed.data||[])];
 if(opportunitySort==="recent"){
   rows.sort((a,b)=>new Date(b.job.published_at||b.job.first_seen_at||0)-new Date(a.job.published_at||a.job.first_seen_at||0));
 }else{
   rows.sort((a,b)=>(b.priority_score||0)-(a.priority_score||0));
 }
 app.innerHTML=shell(`<div class="opportunitiesPage">
 <div class="eyebrow">Il tuo radar</div><h1>Opportunità</h1>
 <p class="lead">HUNT esplora il mercato in profondità e qui mostra solo le posizioni fresche che vale la pena guardare.</p>
  <button type="button" class="outreachJump" data-view="outreach">Scopri i brand da contattare <span aria-hidden="true">↗</span></button>
 <div class="feedToolbar section">
   <strong>${rows.length} posizioni</strong>
   <label class="sortControl"><span>Ordina per</span>
     <select id="opportunitySort">
       <option value="priority" ${opportunitySort==="priority"?"selected":""}>Più adatte a me</option>
       <option value="recent" ${opportunitySort==="recent"?"selected":""}>Più recenti</option>
     </select>
   </label>
 </div>
 <section class="section stack opportunityList">${feed.error?`<div class="msg bad">${esc(feed.error.message)}</div>`:(rows.length?rows.map(x=>opportunityCard(x)).join(""):`<div class="emptyState"><h3>Nessuna posizione fresca da mostrare.</h3><p>HUNT continua a cercare senza riempire il feed con annunci vecchi o poco affidabili.</p></div>`)}</section></div>`);
 bindNav();bindOpportunityActions();
 const sort=document.getElementById("opportunitySort");
 if(sort)sort.onchange=()=>{opportunitySort=sort.value;renderOpportunities()};
}

function interestPhrase(personalization){
 const map={
   product_assortment:"prodotto e assortimento",
   numbers_performance:"numeri, KPI e performance",
   retail_market:"clienti, negozi e mercato",
   product_development:"sviluppo prodotto",
   commercial_relationships:"commerciale e relazioni",
   organization_operations:"organizzazione e processi",
   brand_communication:"brand e comunicazione",
   creative:"creatività e contenuti"
 };
 return (personalization?.interest_areas||[]).map(x=>map[x]).filter(Boolean).slice(0,3);
}

function fitSummary(row){
 const reasons=Array.isArray(row.reasons)?row.reasons:[];
 const family=row.job.role_family||"questa area";
 const strong=reasons.filter(x=>!/città|milano|livello|stage coerente/i.test(x));
 const detail=strong.filter(x=>!x.startsWith("Target professionale diretto:")&&!/ruolo adiacente/i.test(x));
 let opener="";
 if(strong.some(x=>x.startsWith("Target professionale diretto:"))){
   opener=`È un ruolo ${family} che rientra direttamente nelle aree che hai scelto come obiettivo.`;
 }else if(strong.some(x=>/ruolo adiacente/i.test(x))){
   opener=`Non è il tuo target principale, ma è abbastanza vicino alle aree che hai scelto da meritare attenzione.`;
 }else{
   opener=`HUNT ha trovato una coerenza concreta tra questa posizione e il tuo radar professionale.`;
 }
 const body=detail.slice(0,2).map(x=>x.replace(/^La vacancy /i,"La posizione ").replace(/^Il lavoro /i,"Il ruolo ")).join(" ");
 return [opener,body].filter(Boolean).join(" ");
}

function hasParsedCv(row){return (row.cvs||[]).some(cv=>String(cv.parsed_profile?.raw_text||"").length>=80)}
function verifiedCv(cv){const p=cv?.parsed_profile||{};return Boolean(p.profile_confirmed_by_user||p.profile_verified_from_user_history)}
function readableCv(cv){return verifiedCv(cv)||String(cv?.parsed_profile?.raw_text||"").length>=80}
function profileForAssessment(cv){
 const p=cv?.parsed_profile||{};
 return p.raw_text&&!p.draft_profile?.extracted_chars?{...p,draft_profile:interpretCvText(p.raw_text)}:p;
}
function chooseCv(row){
 const cvs=(row.cvs||[]).filter(readableCv);
 const userChoice=(row.cvs||[]).find(cv=>cv.id===selectedDossierCvId);
 if(userChoice)return userChoice;
 return chooseRelevantCv(cvs.length?cvs:row.cvs,row.job,row.dossier?.recommended_cv_id)||null;
}
async function requestDossier(jobId,language="en",cvId=null,forceRegenerate=false){
 const body={job_id:jobId,language,force_regenerate:forceRegenerate};
 if(cvId)body.cv_id=cvId;
 const {data,error}=await supabase.functions.invoke("hunt-application-dossier",{body});
 if(error){
   let message=error.message||"Impossibile generare il dossier.";
   try{if(error.context?.json){const detail=await error.context.json();message=detail.error||message}}catch{}
   throw new Error(message);
 }
 if(data?.error)throw new Error(data.error);
 return data;
}
async function downloadPrivateCv(cvId){
 const {data:entry,error:infoError}=await supabase.from("user_cvs").select("name,storage_path").eq("user_id",currentUser.id).eq("id",cvId).eq("active",true).maybeSingle();
 if(infoError||!entry)throw new Error("CV non disponibile.");
 const {data:blob,error}=await supabase.storage.from("cvs").download(entry.storage_path);
 if(error||!blob)throw new Error(error?.message||"Impossibile aprire il file privato.");
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 const ext=entry.storage_path?.split(".").pop()||"pdf";
 a.href=url;a.download=(entry.name||"CV").replace(/\.[^.]+$/,"")+"."+ext;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function likelyInterviewQuestions(row){
 const brand=row.job.companies?.name||"l'azienda";
 const role=row.job.role_family||"il ruolo";
 const out=[`Perché ${brand} e perché questo ruolo?`];
 if(/Merchandising|Planning|Buying|E-commerce/.test(role))out.push("Raccontami una situazione in cui hai usato dati, KPI o insight sul prodotto per prendere una decisione.");
 else out.push("Quale tua esperienza o progetto ti prepara meglio a questo ruolo?");
 out.push("Cosa vorresti imparare nei primi mesi e come pensi di poter contribuire?");
 return out;
}

function jobTextEvidence(description){
 const original=String(description||"").replace(/<[^>]+>/g," ").replace(/[•·▪]/g,"\n").replace(/\r/g,"\n");
 // Prefer the genuine job section over employer-history and marketing paragraphs.
 const marker=original.search(/\b(descrizione del ruolo|responsabilit[aà]|your responsibilities|key responsibilities|your mission|what you will do|about the role|the opportunity|job description|mansioni principali)\b/i);
 const relevant=marker>=0?original.slice(marker):original;
 const separated=relevant
   .replace(/(Good interpersonal and communication skills|Passion for fashion and luxury trends|Excellent Excel and PowerPoint proficiency|What benefits do we offer|Proficiency in English is required|Involvement in curricular university activities)/gi,"\n$1")
   .replace(/(Key Accountabilities|What are the basics|What will you learn with us|Qualifications|Attività e responsabilità|Requisiti richiesti)/gi,"\n$1\n");
 const sentences=separated.split(/\n+|(?<=[.!?])\s+(?=[A-ZÀ-Ü])/)
   .map(x=>x.replace(/\s+/g," ").trim())
   .filter(x=>x.length>=30&&x.length<=750&&
     !/^(about us|about the company|equal opportunity|who we are|privacy|cookie policy)/i.test(x));
 const isBrandHistory=x=>/(founded in|founded by|pioneer of|headquartered in|in 20\d\d.*(created|became|changed)|\bemployees\b|operat(?:es|ing) in \d+ countries|billion (?:euros|dollars)|azienda fondata nel|fatturato del gruppo)/i.test(x);
 const tasks=sentences.filter(x=>!isBrandHistory(x)&&!/^(the opportunity to learn|what will you learn|what are the basics|qualifications|key accountabilities|what benefits)/i.test(x)&&/support|coordinate|responsibilit|manage|monitor|analys|plan|merchandis|buying|purchase|assort|stock|allocation|report|collection|product|vendit|acquist|gestione|pianific|analisi|assortimento|negozi|retail/i.test(x)).slice(0,15);
 const requirements=sentences.filter(x=>!isBrandHistory(x)&&/\b(required|requirement|must|minimum|at least|years? of experience|proficient|fluent|excel|degree|preferred|conoscenza|requisiti|esperienza|laurea|lingua|padronanza|necessari|essenziale)\b/i.test(x)).slice(0,15);
 const clip=x=>x.length>290?x.slice(0,287).trim()+"…":x;
 return {tasks:tasks.map(clip),requirements:requirements.map(clip),hasDetails:original.length>=150};
}

function evidenceItSummary(text,type="task"){
 const t=String(text||"").toLowerCase();
 const hits=[];
 const add=(test,label)=>{if(test.test(t)&&!hits.includes(label))hits.push(label)};
 if(type==="requirement"){
   if(/\b(english|inglese)\b/i.test(t)){
     if(/\b(c1|cefr c1|qcer c1)\b/i.test(t))hits.push("Inglese C1 richiesto");
     else hits.push("Conoscenza dell'inglese richiesta");
   }
   add(/\b(excel|spreadsheet|fogli di calcolo)\b/i,"Competenze Excel richieste");
   add(/\b(powerpoint|power point|presentation software)\b/i,"Conoscenza di PowerPoint richiesta");
   add(/\b(interpersonal|communication skills|capacità comunicative)\b/i,"Capacità comunicative e relazionali");
   add(/(?:1\s*[-–]\s*2|one\s+to\s+two)\s+years?['’]?\s*(?:of\s+)?experience/i,"1–2 anni di esperienza professionale pertinente richiesti");
   add(/strong numerical capability|numerical skills|capacità numeriche/i,"Solide capacità numeriche");
   add(/analytical skills|analytical capability|capacità analitiche/i,"Capacità di analisi dei dati");
   add(/commercial mindset|commercially minded|orientamento commerciale/i,"Orientamento commerciale");
   add(/stakeholders|cross.function|collaborative relationships|teamwork/i,"Collaborazione con stakeholder di diverse funzioni");
   add(/translate (?:analytical )?(?:findings|data|information).*?(?:insights|commercial)|interpret data/i,"Tradurre dati e analisi in indicazioni commerciali");
   add(/takes ownership|shows initiative|proactiv|initiative/i,"Iniziativa e autonomia nel lavoro");
   add(/attention to detail|accuracy|precisione/i,"Precisione e attenzione ai dettagli");
   add(/manage priorities|tight deadlines|scadenze/i,"Gestione delle priorità e delle scadenze");
   add(/develop their planning expertise|take on increasing responsibility/i,"Motivazione a sviluppare competenze di planning");

   add(/\b(curricular|university activit|universitar|volunteer)\b/i,"Partecipazione ad attività universitarie o di volontariato");
   add(/\b(fashion and luxury|luxury trends|passion for fashion)\b/i,"Interesse per moda e lusso");
   const years=t.match(/\b(\d{1,2})\s*\+?\s*(?:years?|anni)\s+(?:of\s+)?experience\b/i);
   if(years)hits.push("Almeno "+years[1]+" anni di esperienza richiesti");
   add(/\b(french|français|francese)\b/i,"Conoscenza della lingua francese");
   if(/\b(master'?s?\s+degree|master of|laurea magistrale)\b/i.test(t)){
     if(/econom|finance|business/i.test(t))hits.push("Laurea magistrale in Economia o disciplina affine richiesta");
     else hits.push("Laurea magistrale richiesta");
   }else if(/\b(degree|bachelor|laurea)\b/i.test(t))hits.push("Titolo di studio richiesto");
   return hits;
 }
 if(/(collection|collezion)/i.test(t)&&/(creat|structur|present|ciclo|lifecycle|life of the product)/i.test(t))
   hits.push("Seguire le fasi di sviluppo e presentazione della collezione");
 add(/\b(sales data|sales report|sell-through|monitoring of sales|analisi vendite|vendite e performance|sales performance)\b/i,"Analizzare dati di vendita e andamento del prodotto");
 add(/\b(assortment|assortimento|product mix|gamma prodotti|merchandising mix)\b/i,"Contribuire alle attività di assortimento e mix di prodotto");
 add(/\b(budget|forecasting|planning|pianificazion)\b/i,"Supportare pianificazione e monitoraggio dei budget");
 add(/\b(stock|allocation|inventory|giacenz)\b/i,"Monitorare stock e allocazione dei prodotti");
 add(/\b(wholesale|order processing|order management|sales campaign|inserimento ordini)\b/i,"Supportare gestione ordini e attività commerciali");
 add(/\b(retail performance|retail network|store operations|rete di negozi)\b/i,"Supportare attività della rete retail");
 add(/\b(competitor|market analysis|benchmark)\b/i,"Analizzare mercato e concorrenti");
 if(!hits.length&&/\b(merchandis|ready to wear|men ready to wear)\b/i.test(t))
   hits.push("Conoscere i metodi di lavoro del merchandising"+(/men ready to wear/i.test(t)?" con focus sull'abbigliamento uomo":""));
 if(!hits.length&&/\b(product development|product lifecycle|fine vita|end of life)\b/i.test(t))
   hits.push("Seguire le attività di prodotto durante il suo ciclo di vita");
 return hits;
}
function italianEvidenceFromJob(description,evidence){
 const tasks=new Set();
 const requirements=new Set();
 // Only derive Italian descriptions from explicit words found in the original vacancy.
 for(const item of evidence.tasks){for(const hit of evidenceItSummary(item,"task"))tasks.add(hit)}
 for(const item of evidence.requirements){for(const hit of evidenceItSummary(item,"requirement"))requirements.add(hit)}
 // Some requirements run together in the original source and are not split into sentences.
 const full=String(description||"");
 for(const hit of evidenceItSummary(full,"requirement"))requirements.add(hit);
 return {tasks:[...tasks].slice(0,20),requirements:[...requirements].slice(0,24)};
}

function documentedRequirement(item,profile){
 const t=String(item||"").toLowerCase(),p=profile||{};
 const tools=(Array.isArray(p.tools)?p.tools:[]).join(" ").toLowerCase();
 const education=(Array.isArray(p.education)?p.education:[]).map(x=>String(x.program||"")+" "+String(x.school||"")).join(" ").toLowerCase();
 const languages=(Array.isArray(p.languages)?p.languages:[]).join(" ").toLowerCase();
 if(/excel/.test(t)&&!(/powerpoint|power point/.test(t))&&/excel/.test(tools))return true;
 if(/powerpoint|power point/.test(t)&&!(/excel/.test(t))&&/powerpoint|power point/.test(tools))return true;
 if(/c1|cefr c1|qcer c1/.test(t))return /english\s*c1|inglese\s*c1/.test(languages);
 if(/laurea magistrale in economia|master.s degree in economics/.test(t))return /(?:master|magistrale|msc).{0,35}(?:econom|business)/.test(education);
 return false;
}

// All vacancy parsers must expose the same shape. The Italian evidence parser
// returns "tasks" whereas the official bilingual source uses "duties".
// Never let a missing source section make the whole application folder crash.
function normalizeVacancyFacts(facts){
 const input=facts&&typeof facts==="object"?facts:{};
 const duties=Array.isArray(input.duties)?input.duties:Array.isArray(input.tasks)?input.tasks:[];
 const requirements=Array.isArray(input.requirements)?input.requirements:[];
 return {
   duties:duties.filter(v=>typeof v==="string"&&v.trim()).map(v=>v.trim()),
   requirements:requirements.filter(v=>typeof v==="string"&&v.trim()).map(v=>v.trim())
 };
}

function expandedDuties(duties){
 if(!Array.isArray(duties)||duties.length<=5)return "";
 return '<details class="luxMoreDuties"><summary>Mostra tutte le '+duties.length+' responsabilità <span>+'+(duties.length-5)+' altre</span></summary>'+
   '<ol class="luxDutyList" start="6">'+duties.slice(5).map((t,i)=>'<li><span class="luxDutyOrdinal">'+String(i+6).padStart(2,"0")+'</span>'+esc(t)+'</li>').join("")+'</ol></details>';
}

async function renderOpportunityFolder(jobId){
 selectedJobId=jobId;
 const preferredLocale="it";
 const row=await getOpportunityDetail(jobId);
 if(!row)throw new Error("Dossier non disponibile per questa posizione.");
 const savedCv=(row.cvs||[]).find(x=>x.id===row.dossier?.recommended_cv_id);
 const lastCvUpdate=row.dossier?.generated_from?.cv_updated_at;
 const dossierStale=Boolean(lastCvUpdate&&savedCv?.updated_at&&new Date(savedCv.updated_at)>new Date(lastCvUpdate));
 const modelStale=Boolean(row.dossier?.model_version!=="evidence_dossier_v11");
 const languageStale=Boolean(row.dossier?.generated_from?.language!==preferredLocale&&!row.dossier?.generated_from?.user_edited);
 // The cover-letter feature is paused: viewing a job never regenerates or overwrites a letter.
 if(selectedJobId!==jobId)return;
 const job=row.job;
 const brand=job.companies?.name||"Brand";
 const companyName=String(brand).trim();
 const evidence=jobTextEvidence(job.description);
 const actualFacts=job.metadata?.source_facts;
 const reviewedOfficial=actualFacts?.verification==="official_page_reviewed_2026_11_09";
 const aiQuoteChecked=actualFacts?.verification==="ai_source_quote_checked";
 const haveVerifiedSections=(reviewedOfficial||aiQuoteChecked)
   &&Array.isArray(actualFacts?.sections?.en?.duties)
   &&Array.isArray(actualFacts?.sections?.it?.duties);
 const bilingualFacts=haveVerifiedSections?actualFacts.sections:null;
 const summaryOnly=!haveVerifiedSections&&(String(job.description||"").length<340||job.metadata?.verification==="official_search_result");
 const factLists={
   it:normalizeVacancyFacts(haveVerifiedSections?bilingualFacts.it:italianEvidenceFromJob(job.description,evidence)),
   en:normalizeVacancyFacts(haveVerifiedSections?bilingualFacts.en:{duties:evidence.tasks,requirements:evidence.requirements})
 };
 // A source excerpt is not a translation; do not show English tasks in the Italian view.
 const dossierLang="it";

 const appStatus=row.application?.status||null;
 const cv=chooseCv(row);
 const selectedCv=cv;
 const evidencedProfile=profileForAssessment(selectedCv);
 const alternatives=(row.cvs||[]).filter(x=>x.id!==selectedCv?.id);
 const cvChecklistIt=checkRequirements(factLists.it.requirements,evidencedProfile,{alternatives});
 const cvChecklistEn=checkRequirements(factLists.en.requirements,evidencedProfile,{alternatives});
 const keyRequirements=prioritizeRequirements(factLists.it.requirements,4).map(x=>({...x,match:compareKeyRequirement(x,cvChecklistIt[x.sourceIndex],evidencedProfile)}));
 const assessmentIt=assessDossier(job,evidencedProfile,factLists.it.duties,cvChecklistIt,summaryOnly,"it");
 const assessmentEn=assessDossier(job,evidencedProfile,factLists.en.duties,cvChecklistEn,summaryOnly,"en");
 const cvAssessment=dossierLang==="it"?assessmentIt:assessmentEn;
 const fit=row.dossier?.model_version==="evidence_dossier_v11"&&row.dossier?.recommended_cv_id===selectedCv?.id&&row.dossier?.why_you?row.dossier.why_you:"L’analisi specifica dell’annuncio non è ancora aggiornata. Verifica i requisiti prima di dare priorità a questa candidatura.";
 const focusItems=Array.isArray(row.dossier?.generated_from?.duty_focus)?row.dossier.generated_from.duty_focus:[];
 const topDuty=focusItems[0]?.[1]||"";
 const smartQuestion=row.dossier?.generated_from?.interview_question||"";
 const opportunityValue=row.dossier?.generated_from?.opportunity_cost||"";
 const cvReady=hasParsedCv(row);
 const dossierEvidence=Array.isArray(row.dossier?.what_to_emphasize)?row.dossier.what_to_emphasize:[];
 const dossierGaps=Array.isArray(row.dossier?.gaps)?row.dossier.gaps:[];
 const dossierCvId=cv?.id||row.dossier?.recommended_cv_id||"";
 const dossierCvOptions=(row.cvs||[]).map((x,index)=>`<option value="${esc(x.id)}" ${x.id===(selectedCv?.id||"")?"selected":""}>${index+1}. ${esc(x.name||"CV")}${x.is_default?" · principale":""}${verifiedCv(x)?" · confermato":readableCv(x)?" · da confermare":" · da leggere"}</option>`).join("");
 const repostCount=(row.reposts||[]).length;
 const firstSeen=job.published_at?new Date(job.published_at):null;
 const repostSummary=repostCount
   ? `Questa posizione è ricomparsa ${repostCount} volt${repostCount===1?"a":"e"} dopo la prima pubblicazione. HUNT continua a considerare come riferimento la data originale (${firstSeen?firstSeen.toLocaleDateString("it-IT"):"—"}), così una ripubblicazione non viene presentata come una nuova opportunità.`
   : `HUNT memorizza la prima data in cui trova ogni annuncio. Se lo stesso brand lo ripubblica tra qualche giorno o settimana, non te lo mostrerà come “nuovo”: vedrai la data originale e l'eventuale ripubblicazione. Per questa posizione non sono ancora state rilevate ripubblicazioni.`;
 const signals=row.signals||[];
 const media=row.brandMedia||[];
 const sameJobs=row.sameJobs||[];
 const knownMatches=new Map(sameJobs.map(j=>[j.id,j.match_score]));
 const allCompanyOpenings=(row.companyJobs||[]).filter(j=>["active_verified","active_likely"].includes(j.state));
 const selectedRoles=[...(row.careerPrefs?.primary_role_families||[]),...(row.careerPrefs?.secondary_role_families||[])];
 const selectedCities=[...(row.careerPrefs?.preferred_locations||[]),...(row.careerPrefs?.relocation_locations||[])];
 const scope=row.careerPrefs?.preferences?.radar_scope||"smart";
 const withinCities=j=>!selectedCities.length||selectedCities.some(city=>{
   const a=String(city).toLowerCase().replace("milano","milan").trim();
   const b=String(j.city||"").toLowerCase().replace("milano","milan");
   return a.length>=3&&b.includes(a);
 });
 const companyOpenings=allCompanyOpenings.filter(j=>knownMatches.has(j.id)||
   (["internship","trainee","entry_level","junior","assistant"].includes(j.seniority)&&
    (selectedRoles.includes(j.role_family)||(scope==="explore"&&j.role_family))&&withinCities(j)));
 const otherCompanyOpenings=allCompanyOpenings.filter(j=>!companyOpenings.some(x=>x.id===j.id));
 const companyNewsDedup=new Map();
 for(const x of signals){
   if(x.title&&safeRadarUrl(x.source_url)){
     companyNewsDedup.set(x.source_url,{id:x.id,kind:"company",title:x.title,summary:x.summary,source:x.source_name||"Fonte ufficiale",url:x.source_url,date:x.published_at});
   }
 }
 for(const x of media){
   if(x.title&&safeRadarUrl(x.url)&&!companyNewsDedup.has(x.url)){
     companyNewsDedup.set(x.url,{
       id:x.id,kind:"industry",title:x.title,summary:x.summary,
       source:x.evidence?.original_publisher||x.world_news_sources?.publisher||"Testata internazionale",
       aggregator:x.evidence?.aggregator||null,
       url:x.url,date:x.published_at
     });
   }
 }
 const interestWords=[...(row.personalization?.interest_areas||[]),job.role_family||"","retail","merchandising","product","buying","assortment","collection","planning","allocation","sales","performance"]
   .join(" ").toLowerCase().match(/[a-zà-ÿ]{5,}/g)||[];
 const focusWords=[...new Set(interestWords)].filter(w=>!["fashion","brand","luxury","retail"].includes(w));
 const newsQuality=item=>{
   const title=String(item.title||"").toLowerCase();
   const txt=(String(item.title||"")+" "+String(item.summary||"")).toLowerCase();
   let score=item.kind==="company"?2:0;
   if(/merchandis|buying|product|assort|collection|retail|store|business|commercial|performance|executive|strategy|expansion|results|sales|growth|revenue|distribution|launch|investment/i.test(txt))score+=3;
   if(/red carpet|celebrity|viral|gossip|best dressed|horoscope|outfit|review|unboxing/i.test(txt))score-=3;
   score+=Math.min(4,focusWords.filter(w=>txt.includes(w)).length);
   if(item.date&&new Date(item.date).getTime()>Date.now()-7*86400000)score+=2;
   if(title.includes(companyName.toLowerCase()))score+=1;
   return score;
 };
 const companyNews=[...companyNewsDedup.values()]
   .map(x=>({...x,curation_score:newsQuality(x)}))
   .sort((a,b)=>b.curation_score-a.curation_score||new Date(b.date||0)-new Date(a.date||0));
 const {data:readRows,error:brandReadError}=companyNews.length
   ?await supabase.from("user_news_reads").select("item_id,source_kind").eq("user_id",currentUser.id).in("item_id",companyNews.map(x=>x.id))
   :{data:[],error:null};
 const brandReadIds=new Set((readRows||[]).map(x=>x.source_kind+":"+x.item_id));
 const showInterview=appStatus==="interview";

 app.innerHTML=shell(`<div class="folderTopbar">
   <button class="textBack" id="backToFeed">← Opportunità</button>
   ${appStatus?`<span class="folderStatus">${esc(statusLabel(appStatus))}</span>`:""}
 </div>

 <section class="folderHero section">
  <div class="folderLabel">Preparazione candidatura</div>
  <div class="eyebrow brandEyebrow">${esc(brand)}</div>
  <h1>${esc(job.canonical_title)}</h1>
  <p class="lead">${esc(job.city||"—")} · ${esc(job.role_family||"—")}</p>
  <div class="heroMeta editorialMeta darkMeta">
   <span class="heroMatch">${haveVerifiedSections?"Analisi su "+factLists.it.requirements.length+" requisiti aziendali":"Analisi basata sul testo acquisito"}</span>
   <span>${esc(ageLabel(job.published_at,job.first_seen_at))}</span>
   
  </div>
  <div class="actions">
   <button class="btn green" type="button" id="jumpToCv">Prepara candidatura ↓</button>
   <button class="btn darkSecondary" data-applied="${job.id}">Segna come candidata</button>
   <button class="btn darkGhost" data-ignore="${job.id}">Ignora</button>
  </div>
 </section>

 <div class="folderTabs section">
   <button class="folderTab active" data-folder-tab="application">Candidatura</button>
   <button class="folderTab" data-folder-tab="company">Azienda</button>
   ${showInterview?'<button class="folderTab" data-folder-tab="interview">Colloquio</button>':""}
 </div>

 <div data-folder-panel="application">
   ${renderJobWorkspace({
     roleTitle:job.canonical_title,
     summary:applicationInsight(assessmentIt,cvChecklistIt,factLists.it.duties),
     duties:factLists.it.duties,
     relevant:keyRequirements,
     cvs:(row.cvs||[]).map(x=>({id:x.id,name:x.name||"Curriculum",primary:!!x.is_default,selected:x.id===selectedCv?.id,verified:verifiedCv(x),readable:readableCv(x)})),
     officiallyVerified:haveVerifiedSections,
     sourceUrl:safeRadarUrl(job.primary_apply_url)?job.primary_apply_url:""
   })}

 </div>

 <div class="hide" data-folder-panel="company">
   <section class="section brandGlobalNews">
     <div class="brandGlobalNewsHead">
       <div><div class="eyebrow">News & mondo fashion</div><h2>${esc(brand)} nel mondo</h2>
         <p>Notizie aziendali e stampa internazionale raccolte dalle fonti monitorate da HUNT. Ogni articolo riporta la fonte. Non sono annunci di lavoro.</p>
       </div>
       <div class="brandGlobalNewsNav"><button type="button" class="worldReadToggle" id="brandReadToggle">Archivio lette</button><button type="button" class="worldReadToggle" id="brandGoFashionNews">Tutte le Fashion News</button></div>
     </div>
     <div class="brandNewsSwitch" role="group" aria-label="Filtra le notizie del brand">
       <button type="button" class="active" data-brand-news-filter="all">Tutte le notizie</button>
       <button type="button" data-brand-news-filter="company">Comunicati ufficiali</button>
       <button type="button" data-brand-news-filter="industry">Stampa internazionale</button>
     </div>
     <p id="brandNewsCounter" class="brandNewsCounter"></p>
     <button type="button" class="brandNewsMore" id="brandNewsMore" hidden>Mostra altre notizie rilevanti</button>
     <p id="brandNewsError" class="dossierError" role="alert" hidden></p>
     <div id="brandNewsList" class="brandGlobalNewsList"></div>
   </section>
   <section class="section companyOpenRoles">
     <div class="companyOpenRolesHead"><div class="eyebrow">Opportunità nel brand</div><h2>Altre posizioni aperte di ${esc(brand)}</h2>
       <p>Prima le posizioni vicine ai tuoi obiettivi; separatamente, le altre offerte pubbliche che HUNT ha trovato nel gruppo. Non tutte sono adatte al tuo CV e il database non è completo.</p>
       ${safeRadarUrl(job.companies?.careers_url)?`<a class="brandCareersLink" href="${esc(job.companies.careers_url)}" target="_blank" rel="noopener noreferrer">Vedi tutte le offerte sul sito aziendale</a>`:""}
     </div>
     ${companyOpenings.length?`<div class="companyOpenRolesList">
       ${[...companyOpenings].sort((a,b)=>(knownMatches.has(b.id)?1:0)-(knownMatches.has(a.id)?1:0)).map(j=>`<article class="brandJobItem">
         <div class="brandJobContent"><div class="eyebrow">${esc(j.role_family||"Fashion / Luxury")} ${knownMatches.has(j.id)?`· Match ${knownMatches.get(j.id)}%`:""}</div>
           <h3>${esc(j.canonical_title)}</h3><p>${esc(j.city||"Località da verificare")} · ${esc(ageLabel(j.published_at,j.first_seen_at))} · ${esc(j.confidence_label==="VERIFIED ACTIVE"?"Annuncio verificato":"Disponibilità da ricontrollare")}</p>
         </div>
         <div class="brandJobActions">
           <button class="btn" type="button" data-open-dossier="${esc(j.id)}">Apri dossier</button>
           ${safeRadarUrl(j.primary_apply_url)?`<a href="${esc(j.primary_apply_url)}" class="btn primary" target="_blank" rel="noopener noreferrer">Annuncio originale</a>`:""}
         </div>
       </article>`).join("")}
     </div>`:`<div class="companyNoJobs"><strong>Non ci sono altre offerte del brand coerenti con i target e le città che hai scelto.</strong><p>La ricerca continua. Qui sotto puoi aprire anche le posizioni rilevate fuori dai tuoi filtri, senza confonderle con i consigli per te.</p></div>`}
     ${otherCompanyOpenings.length?`<details class="brandOtherPositions"><summary>${otherCompanyOpenings.length} altre posizioni del brand fuori dai tuoi target</summary>
        <p>Rilevate nelle fonti dell'azienda, ma non raccomandate automaticamente. Verifica sede, seniority e requisiti.</p>
        <div class="companyOpenRolesList">${otherCompanyOpenings.slice(0,12).map(j=>`<article class="brandJobItem">
           <div class="brandJobContent"><div class="eyebrow">Fuori dal tuo feed · ${esc(j.seniority||"Livello da verificare")}</div>
             <h3>${esc(j.canonical_title)}</h3><p>${esc(j.city||"Località da verificare")} · ${esc(j.role_family||"Altro settore")}</p></div>
           <div class="brandJobActions"><button class="btn" type="button" data-open-dossier="${esc(j.id)}">Apri dossier</button>
             ${safeRadarUrl(j.primary_apply_url)?`<a class="btn primary" href="${esc(j.primary_apply_url)}" target="_blank" rel="noopener noreferrer">Annuncio ufficiale</a>`:""}</div>
         </article>`).join("")}</div>
       </details>`:""}
   </section>
   ${row.alternatives?.length?`<section class="section companyAlternatives">
     <div class="eyebrow">Opzioni vicine al tuo obiettivo</div><h2>Ruoli simili in altri brand</h2>
     <p>Stessa area professionale, specializzazione comparabile e livello compatibile. Un punteggio HUNT alto, da solo, non rende due lavori simili.</p>
     <div class="companyOpenRolesList">${row.alternatives.slice(0,6).map(j=>`<article class="brandJobItem">
       <div class="brandJobContent"><div class="eyebrow">${esc(j.companies?.name||"Altro brand")} · Match indicativo ${Number(j.match_score)||0}%</div>
         <h3>${esc(j.canonical_title)}</h3><p>${esc(j.city||"Località da verificare")} · ${esc(j.role_family||"Ruolo")}</p></div>
       <div class="brandJobActions"><button type="button" class="btn" data-open-dossier="${esc(j.id)}">Apri dossier</button>
         ${safeRadarUrl(j.primary_apply_url)?`<a class="btn primary" href="${esc(j.primary_apply_url)}" target="_blank" rel="noopener noreferrer">Annuncio originale</a>`:""}
       </div></article>`).join("")}</div>
   </section>`:""}
 </div>

 ${showInterview?`<div class="hide" data-folder-panel="interview">
   <section class="section companyIntro"><div class="eyebrow">Preparazione colloquio</div><h2>Preparazione specifica per questo colloquio</h2><p>Questa sezione userà CV, vacancy, informazioni recenti sul brand e storico della candidatura. Non verrà riempita con domande generiche.</p></section>
 </div>`:""}`);

 bindNav();bindOpportunityActions();
 document.getElementById("jumpToCv")?.addEventListener("click",()=>{
   document.getElementById("huntJobPreparation")?.scrollIntoView({behavior:"smooth",block:"start"});
 });
 let brandArchive=false;
 let brandFeedFilter="all";
 let brandShowAll=false;
 const renderBrandFeed=()=>{
   const area=document.getElementById("brandNewsList");
   const counter=document.getElementById("brandNewsCounter");
   const toggle=document.getElementById("brandReadToggle");
   if(!area)return;
   const eligible=companyNews.filter(n=>brandReadIds.has(n.kind+":"+n.id)===brandArchive&&(brandFeedFilter==="all"||n.kind===brandFeedFilter));
   const rows=brandShowAll?eligible.slice(0,30):eligible.slice(0,8);
   const more=document.getElementById("brandNewsMore");
   if(more){more.hidden=eligible.length<=8;more.textContent=brandShowAll?"Mostra solo le 8 notizie principali":"Mostra altre notizie ("+(eligible.length-8)+")"}
   const unreadCount=companyNews.filter(n=>!brandReadIds.has(n.kind+":"+n.id)).length;
   document.querySelectorAll("[data-brand-news-filter]").forEach(el=>el.classList.toggle("active",el.dataset.brandNewsFilter===brandFeedFilter));
   if(counter)counter.textContent=unreadCount+" da leggere · "+rows.length+" mostrate in ordine di pertinenza"+(brandArchive?" (archivio)":"");
   if(toggle)toggle.textContent=brandArchive?"← Torna alle notizie":"Archivio lette";
   area.innerHTML=rows.length?rows.map(item=>{
     const date=item.date?new Date(item.date):null;
     const when=date&&!Number.isNaN(date.getTime())?date.toLocaleDateString("it-IT"):"Data da verificare";
     const teaser=newsTeaser(item.title,item.summary);
     const sourceText=item.aggregator?item.source+" · via "+item.aggregator:item.source;
     return `<article class="brandNewsItem">
       <div class="brandNewsMeta"><span>${esc(sourceText)}</span><span>${esc(when)}</span></div>
       <h3>${esc(item.title)}</h3>
       <p class="brandNewsTeaser"><span class="brandNewsBriefLabel">In breve</span>${esc(teaser)}</p>
       <div class="brandNewsActions"><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${item.aggregator?"Apri articolo tramite Google News":"Leggi la fonte"} ↗</a>
         <button type="button" class="worldReadAction" data-brand-news-id="${esc(item.id)}" data-brand-news-kind="${esc(item.kind)}" data-brand-news-action="${brandArchive?"unread":"read"}" ${brandReadError?"disabled":""}>${brandArchive?"Ripristina":"✓ Letto"}</button>
       </div>
     </article>`;
   }).join(""):`<div class="emptyState"><h3>${brandArchive?"Nessuna notizia nell'archivio":"Nessuna nuova notizia da leggere"}</h3><p>${brandArchive?"Puoi tornare alle notizie attive.":"HUNT continuerà a cercare notizie sulle fonti aziendali e internazionali collegate."}</p></div>`;
   area.querySelectorAll("[data-brand-news-action]").forEach(button=>button.onclick=async()=>{
     if(brandReadError)return;
     const kind=button.dataset.brandNewsKind,id=button.dataset.brandNewsId,action=button.dataset.brandNewsAction;
     if(!["industry","company"].includes(kind)||!/^[0-9a-f-]{36}$/i.test(id))return;
     button.disabled=true;
     const result=action==="read"
       ?await supabase.from("user_news_reads").upsert({user_id:currentUser.id,source_kind:kind,item_id:id},{onConflict:"user_id,source_kind,item_id",ignoreDuplicates:true})
       :await supabase.from("user_news_reads").delete().eq("user_id",currentUser.id).eq("source_kind",kind).eq("item_id",id);
     if(result.error){
       const err=document.getElementById("brandNewsError");if(err){err.hidden=false;err.textContent=result.error.message}
       button.disabled=false;return;
     }
     if(action==="read")brandReadIds.add(kind+":"+id);else brandReadIds.delete(kind+":"+id);
     renderBrandFeed();
   });
 };
 const brandMore=document.getElementById("brandNewsMore");
 if(brandMore)brandMore.onclick=()=>{brandShowAll=!brandShowAll;renderBrandFeed()};
 document.querySelectorAll("[data-brand-news-filter]").forEach(btn=>btn.onclick=()=>{
   brandFeedFilter=btn.dataset.brandNewsFilter||"all";
   renderBrandFeed();
 });
 const toggleBrandArchive=document.getElementById("brandReadToggle");
 if(toggleBrandArchive)toggleBrandArchive.onclick=()=>{brandArchive=!brandArchive;renderBrandFeed()};
 const goAllNews=document.getElementById("brandGoFashionNews");
 if(goAllNews)goAllNews.onclick=()=>{radarCompanyFilter="all";radarSignalFilter="all";renderWorldRadar()};
 if(brandReadError){const el=document.getElementById("brandNewsError");if(el){el.hidden=false;el.textContent="Stato di lettura non disponibile: "+brandReadError.message}}
 renderBrandFeed();
 document.getElementById("backToFeed").onclick=()=>{
   history.replaceState({},"",location.pathname+location.search);
   renderOpportunities().catch(e=>{console.error("HUNT feed return failed",e);location.reload()});
 };
 document.querySelectorAll("[data-folder-tab]").forEach(btn=>btn.onclick=()=>{
   const tab=btn.dataset.folderTab;
   document.querySelectorAll("[data-folder-tab]").forEach(x=>x.classList.toggle("active",x.dataset.folderTab===tab));
   document.querySelectorAll("[data-folder-panel]").forEach(x=>x.classList.toggle("hide",x.dataset.folderPanel!==tab));
 });
 const openBrand=document.getElementById("openCompanyTab");
 if(openBrand)openBrand.onclick=()=>document.querySelector('[data-folder-tab="company"]')?.click();
 const exploreButtons=[...document.querySelectorAll("[data-hunt-explore]")];
 const setExploration=id=>{
   const wasOpen=id&&exploreButtons.some(b=>b.dataset.huntExplore===id&&b.getAttribute("aria-expanded")==="true");
   const next=wasOpen?null:id;
   exploreButtons.forEach(b=>{
     const active=Boolean(next&&b.dataset.huntExplore===next);
     b.classList.toggle("is-selected",active);
     b.setAttribute("aria-expanded",String(active));
   });
   document.querySelectorAll("[data-hunt-explore-panel]").forEach(p=>{p.hidden=p.dataset.huntExplorePanel!==next});
 };
 exploreButtons.forEach(b=>b.onclick=()=>setExploration(b.dataset.huntExplore));
 document.querySelectorAll("[data-hunt-explore-close]").forEach(b=>b.onclick=()=>setExploration(null));
 const dossierCvSelector=document.getElementById("dossierCv");
 if(dossierCvSelector)dossierCvSelector.onchange=async()=>{
   const next=dossierCvSelector.value;
   selectedDossierCvId=next;
   dossierCvChoices.set(jobId,next);
   dossierCvSelector.disabled=true;
   try{await renderOpportunityFolder(jobId)}
   catch(error){dossierCvSelector.disabled=false;console.error("CV comparison failed",error)}
 };
 const profileButton=document.getElementById("reviewRequirementsProfile");
 if(profileButton)profileButton.onclick=async()=>{
   if(profileButton.textContent.includes("Verifica")){
     const cvId=dossierCvSelector?.value;
     if(cvId){
       const {requestCvVerification}=await import("./cv-profile.js?v=20261110-155");
       requestCvVerification(cvId);
     }
   }
   await renderProfile(jobId);
 };

}

function statusLabel(status){
 return ({preparing:"Da preparare",applied:"Candidata",follow_up:"Follow-up",interview:"Colloquio",offer:"Offerta",rejected:"Rifiutata",closed:"Chiusa"})[status]||status;
}

async function renderApplications(){
 currentView="applications";
 const [{data:applications,error},{data:sentOutreach,error:outreachError}]=await Promise.all([
  supabase.from("applications").select("*").eq("user_id",currentUser.id).in("status",["applied","interview","offer","accepted","rejected","withdrawn","declined"]).order("updated_at",{ascending:false}),
  supabase.from("user_outreach_drafts").select("outreach_key,brand_name,status,updated_at").eq("user_id",currentUser.id).eq("status","applied")
 ]);
 const ids=(applications||[]).map(x=>x.job_id).filter(Boolean);
 let jobs=[];
 if(ids.length){
  const res=await supabase.from("jobs").select("id,canonical_title,city,companies(name)").in("id",ids);
  jobs=res.data||[];
 }
 const byId=new Map(jobs.map(x=>[x.id,x]));
 const jobCards=(applications||[]).map(item=>{
  const job=byId.get(item.job_id);
  return '<article class="card applicationCard"><div><div class="eyebrow">'+esc(job?.companies?.name||"Candidatura")+'</div><h3>'+esc(job?.canonical_title||"Opportunità")+'</h3><div class="jobMeta">'+esc(job?.city||"")+' · '+esc(statusLabel(item.status))+'</div></div><div class="actions">'+(item.job_id?'<button class="btn primary" data-app-folder="'+esc(item.job_id)+'">Apri folder</button>':"")+'</div></article>';
 }).join("");
 const spontaneousCards=(sentOutreach||[]).map(item=>
  '<article class="card applicationCard"><div><div class="eyebrow">Candidatura spontanea</div><h3>'+esc(item.brand_name)+'</h3>'+
  '<div class="jobMeta">Invio registrato · '+esc(new Date(item.updated_at).toLocaleDateString("it-IT"))+'</div></div>'+
  '<div class="actions"><button class="btn primary" data-outreach-folder="'+esc(item.outreach_key)+'">Apri folder</button></div></article>'
 ).join("");
 app.innerHTML=shell('<div class="eyebrow">Il tuo percorso</div><h1>Candidature</h1>'+
  '<p class="lead">Le candidature che hai dichiarato di aver inviato, comprese le spontanee. Le bozze restano nelle rispettive sezioni.</p>'+
  '<section class="section stack">'+(error?'<div class="msg bad">'+esc(error.message)+'</div>':(jobCards+spontaneousCards||'<div class="card">Nessuna candidatura ancora.</div>'))+
  (outreachError?'<div class="msg bad">Non riesco a leggere le spontanee: '+esc(outreachError.message)+'</div>':"")+
  '</section>');
 bindNav();
 document.querySelectorAll("[data-app-folder]").forEach(b=>b.onclick=()=>renderOpportunityFolder(b.dataset.appFolder));
 document.querySelectorAll("[data-outreach-folder]").forEach(b=>b.onclick=async()=>{await renderOutreach();openOutreachFolder(b.dataset.outreachFolder)});
}

/* Spontanee: rebuild the original HUNT folder using public evidence and private drafts. */
let outreachCache={leads:[],drafts:{},cvs:[],person:{},preferences:{},selectedCv:{}};
async function renderOutreach(){
 currentView="outreach";
 const [curatedRes,brandSourcesRes,signalsRes,draftsRes,cvsRes,personRes,preferencesRes]=await Promise.all([
   fetch("../data/outreach_signals_public.json?v=20261110-158",{cache:"no-store"}).then(async r=>r.ok?await r.json():[]).catch(()=>[]),
   fetch("../data/outreach_brand_sources.json?v=20261110-164",{cache:"no-store"}).then(async r=>r.ok?await r.json():{}).catch(()=>({})),
   supabase.from("company_signals").select("id,signal_type,title,summary,source_url,published_at,detected_at,companies(name,is_independent,size_band,careers_url)").order("published_at",{ascending:false,nullsFirst:false}).limit(200),
   supabase.from("user_outreach_drafts").select("outreach_key,brand_name,subject,email_body,status,updated_at,cv_id").eq("user_id",currentUser.id),
   supabase.from("user_cvs").select("id,name,is_default,parsed_profile,target_role_families").eq("user_id",currentUser.id).eq("active",true),
   supabase.from("profiles").select("display_name,first_name,last_name").eq("user_id",currentUser.id).maybeSingle(),
   supabase.from("user_personalization").select("career_goal,communication_style,interest_areas").eq("user_id",currentUser.id).maybeSingle()
 ]);
 const baseLeads=buildOutreachLeads(curatedRes,signalsRes.data||[]);
 // A small brand can be buried among thousands of general news results. Search for each named brand.
 const newsMatches=await Promise.all(baseLeads.map(async lead=>{
   const term=String(lead.brand||"").replace(/[%_,().]/g," ").trim().slice(0,80);
   if(!term)return {key:lead.key,data:[]};
   try{
     const result=await supabase.from("world_news_items").select("title,summary,url,published_at").or("title.ilike.%"+term+"%,summary.ilike.%"+term+"%").order("published_at",{ascending:false,nullsFirst:false}).limit(20);
     return {key:lead.key,data:result.data||[],error:result.error};
   }catch(e){return {key:lead.key,data:[],error:e}}
 }));
 const leads=enrichOutreachLeads(baseLeads.map(lead=>{
   const match=newsMatches.find(x=>x.key===lead.key);
   return attachBrandNews([lead],match?.data||[])[0];
 }),brandSourcesRes||{});
 const drafts=Object.fromEntries((draftsRes.data||[]).map(d=>[d.outreach_key,d]));
 outreachCache={leads,drafts,cvs:cvsRes.data||[],person:personRes.data||{},preferences:preferencesRes.data||{},selectedCv:{}};
 const errors=[signalsRes.error,draftsRes.error,cvsRes.error].filter(Boolean).map(e=>e.message);
 app.innerHTML=shell('<div class="outPage"><div class="eyebrow">HUNT / Ricerca brand</div>'+
 '<header class="outPageHeader"><h1>Brand da contattare</h1><p>HUNT individua occasioni concrete per presentarti a marchi indipendenti ed emergenti, anche quando non pubblicano un annuncio.</p></header>'+
 '<div class="outAbout">Per ogni brand trovi il motivo del contatto, le notizie che lo sostengono e una candidatura costruita sui dati del tuo CV verificato.</div>'+
 (errors.length?'<div class="msg bad">Alcuni dati non sono disponibili: '+esc(errors.join(" · "))+'</div>':"")+
 renderOutreachCards(leads,drafts)+'</div>');
 bindNav();
 document.querySelectorAll("[data-outreach-open]").forEach(button=>button.onclick=()=>openOutreachFolder(button.dataset.outreachOpen));
}
function openOutreachFolder(key){
 currentView="outreach";
 const lead=outreachCache.leads.find(item=>item.key===key);
 if(!lead)return renderOutreach();
 const draft=outreachCache.drafts[key]||null;
 const cvs=outreachCache.cvs,person=outreachCache.person,preferences=outreachCache.preferences;
 const cvId=outreachCache.selectedCv[key]||(draft?.cv_id&&cvs.some(c=>c.id===draft.cv_id)?draft.cv_id:null)||chooseOutreachCv(cvs,lead.area)?.id||"";
 app.innerHTML=shell(renderOutreachFolder(lead,{cvs,cvId,draft,person,preferences}));
 bindNav();
 const back=app.querySelector("[data-outreach-back]");
 if(back)back.onclick=renderOutreach;
 const targets={reason:"outReason",application:"outApplication",letter:"outLetter",news:"outNews"};
 app.querySelectorAll("[data-outreach-jump]").forEach(button=>button.onclick=()=>{
   const target=targets[button.dataset.outreachJump];
   if(!target)return;
   app.querySelector("#"+target)?.scrollIntoView({behavior:"smooth",block:"start"});
   app.querySelectorAll(".outSectionNav [data-outreach-jump]").forEach(x=>x.classList.toggle("active",x.dataset.outreachJump===button.dataset.outreachJump));
 });
 app.querySelectorAll("[data-outreach-news-filter]").forEach(button=>button.onclick=()=>{
   const kind=button.dataset.outreachNewsFilter||"all";
   let visible=0;
   app.querySelectorAll("[data-outreach-news-kind]").forEach(item=>{
     const match=kind==="all"||item.dataset.outreachNewsKind===kind;
     item.hidden=!match;
     if(match)visible++;
   });
   app.querySelectorAll("[data-outreach-news-filter]").forEach(x=>x.classList.toggle("active",x===button));
   const count=app.querySelector("#outNewsCounter");
   if(count)count.textContent=visible+" notizie e segnali mostrati"+(kind==="all"?"":" · "+button.textContent.trim());
 });
 const allNews=app.querySelector("[data-outreach-all-news]");
 if(allNews)allNews.onclick=()=>{currentView="radar";renderWorldRadar()};
 const cv=app.querySelector("#outCvChoice"),subject=app.querySelector("#outSubject"),body=app.querySelector("#outBody"),notice=app.querySelector("#outSaveState");
 const cvExplanation=app.querySelector("#outCvReason");
 const say=(message,bad=false)=>{if(!notice)return;notice.textContent=message;notice.classList.toggle("is-error",bad)};
 let activeCvId=cv?.value||"";
 const selectedById=id=>cvs.find(x=>x.id===id)||null;
 const draftFor=id=>composeOutreachEmail(lead,selectedById(id),person,preferences);
 const refreshCvExplanation=id=>{
   if(cvExplanation)cvExplanation.textContent=describeOutreachCv(selectedById(id),lead.area).text;
 };
 const replaceWithCv=id=>{
   const next=draftFor(id);
   subject.value=next.subject;body.value=next.body;
   activeCvId=id;
   outreachCache.selectedCv[key]=id;
   refreshCvExplanation(id);
   say(next.verifiedCv?"Email aggiornata con esperienza, progetti e obiettivi del CV selezionato.":"Testo aggiornato. Questo CV non ha dati verificati, quindi non sono state aggiunte esperienze.");
 };
 if(cv)cv.onchange=()=>{
   const nextId=cv.value,original=draftFor(activeCvId);
   const wasEdited=subject.value!==original.subject||body.value!==original.body;
   if(wasEdited&&!window.confirm("Questa email contiene modifiche tue. Cambiare CV crea un nuovo testo e sostituisce quello visibile. Vuoi continuare?")){
     cv.value=activeCvId;return;
   }
   replaceWithCv(nextId);
 };
 const regenerate=app.querySelector("[data-outreach-regenerate]");
 if(regenerate)regenerate.onclick=()=>{
   const next=draftFor(cv?.value||"");
   if((subject.value!==next.subject||body.value!==next.body)&&!window.confirm("Ripristinando il testo suggerito perderai le modifiche visualizzate. Continuare?"))return;
   replaceWithCv(cv?.value||"");
 };
 const mailto=app.querySelector("[data-outreach-mailto]");
 if(mailto)mailto.onclick=()=>{
   if(!lead.contactEmail)return;
   const url="mailto:"+encodeURIComponent(lead.contactEmail)+"?subject="+encodeURIComponent(subject.value)+"&body="+encodeURIComponent(body.value);
   window.location.href=url; // Opens the user's mail app: it does not send.
 };
 const copy=app.querySelector("[data-outreach-copy]");
 if(copy)copy.onclick=async()=>{
   try{await navigator.clipboard.writeText("Oggetto: "+subject.value+"\n\n"+body.value);say("Oggetto e testo copiati. HUNT non ha inviato nessuna email.")}
   catch(e){say("Copia non disponibile: seleziona il testo e copialo manualmente.",true)}
 };
 app.querySelectorAll("[data-outreach-save]").forEach(button=>button.onclick=async()=>{
   const status=button.dataset.outreachSave;
   if(status==="applied"&&!window.confirm("Confermi di aver già inviato personalmente questa candidatura? HUNT non invia messaggi."))return;
   const payload={user_id:currentUser.id,outreach_key:lead.key,brand_name:lead.brand,cv_id:cv?.value||null,subject:subject.value.trim(),email_body:body.value.trim(),status,updated_at:new Date().toISOString()};
   button.disabled=true;
   const {error}=await supabase.from("user_outreach_drafts").upsert(payload,{onConflict:"user_id,outreach_key"});
   button.disabled=false;
   if(error){say("Non è stato possibile salvare: "+error.message,true);return}
   outreachCache.drafts[key]=payload;
   say(status==="applied"?"Candidatura registrata come inviata. La ritrovi in Candidature.":"Bozza salvata nel tuo account HUNT.");
 });
}

const RADAR_TYPES={
  retail_expansion:["Retail & aperture","Espansione o presenza commerciale"],
  leadership:["Leadership","Nuove responsabilità e organizzazione"],
  results:["Risultati","Andamento e priorità aziendali"],
  strategy:["Strategia","Decisioni e direzione del brand"],
  product:["Prodotto","Collezioni, categorie e lanci"],
  sustainability:["Sostenibilità","Progetti e impegni aziendali"],
  industry:["News dal mondo","Aggiornamenti dai media internazionali"],
  news:["Altre notizie","Contesto e aggiornamenti"]
};
function safeRadarUrl(raw){
  try{const u=new URL(String(raw));return ["https:","http:"].includes(u.protocol)?u.href:null}
  catch{return null}
}
async function renderWorldRadar(){
  currentView="radar";
  const [companyRes,globalRes]=await Promise.all([
    supabase.from("company_signals").select("id,signal_type,title,summary,source_name,source_url,published_at,detected_at,relevance_score,companies(name)").order("published_at",{ascending:false,nullsFirst:false}).limit(120),
    supabase.from("world_news_items").select("id,theme,title,summary,url,published_at,detected_at,relevance_score,world_news_sources(publisher,region,language)").order("published_at",{ascending:false,nullsFirst:false}).limit(1000)
  ]);
  const global=(globalRes.data||[]).map(item=>({
    id:item.id,signal_type:item.theme||"industry",title:item.title,summary:item.summary,source_name:item.world_news_sources?.publisher||"Fonte",source_url:item.url,published_at:item.published_at,relevance_score:item.relevance_score,companies:{name:item.world_news_sources?.publisher||"Fonte"},region:item.world_news_sources?.region||"global",kind:"industry"
  }));
  const corporate=(companyRes.data||[]).map(item=>({...item,region:"aziende",kind:"company"}));
  const unique=new Map();
  for(const item of [...global,...corporate]){if(item.title&&item.source_url&&!unique.has(item.source_url))unique.set(item.source_url,item)}
  const all=[...unique.values()].sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0));
  const error=(companyRes.error&&globalRes.error)?{message:"Fonti aziendali e internazionali non disponibili: "+globalRes.error.message}:null;
  // Per-user read state is stored in Supabase, not localStorage. Read only IDs shown by this feed.
  const readQueries=[];
  for(let i=0;i<all.length;i+=100){
    readQueries.push(supabase.from("user_news_reads")
      .select("source_kind,item_id")
      .eq("user_id",currentUser.id)
      .in("item_id",all.slice(i,i+100).map(x=>x.id)));
  }
  const readResponses=await Promise.all(readQueries);
  const readError=readResponses.find(x=>x.error)?.error||null;
  const readIds=new Set(readResponses.flatMap(x=>x.data||[]).map(x=>x.source_kind+":"+x.item_id));
  const wasRead=item=>readIds.has(item.kind+":"+item.id);
  const unread=all.filter(item=>!wasRead(item));
  const available=radarShowRead?all.filter(wasRead):unread;
  const brands=[...new Set(all.map(s=>s.companies?.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"it"));
  const types=[...new Set(all.map(s=>s.signal_type||"news"))];
  const rows=available.filter(s=>(radarSignalFilter==="all"||s.signal_type===radarSignalFilter)&&(radarCompanyFilter==="all"||s.companies?.name===radarCompanyFilter)).slice(0,130);
  const options=(items,chosen,labels)=>items.map(x=>`<option value="${esc(x)}" ${x===chosen?"selected":""}>${esc(labels?.[x]||x)}</option>`).join("");
  const cards=rows.map(s=>{
    const category=RADAR_TYPES[s.signal_type]||RADAR_TYPES.news;
    const url=safeRadarUrl(s.source_url);
    const date=s.published_at?new Date(s.published_at):null;
    const dateText=date&&!isNaN(date.getTime())?date.toLocaleDateString("it-IT"):"Data da verificare";
    return `<article class="worldSignal">
      <div class="worldSignalMeta"><span class="worldSignalBrand">${esc(s.companies?.name||s.source_name||"Fonte")}</span><span>${esc(category[0])}</span><span>${esc(s.region==="aziende"?"Fonte aziendale":s.region||"Internazionale")}</span><span>${esc(dateText)}</span></div>
      <h2>${esc(s.title)}</h2>
      ${s.summary?`<p class="worldSignalSummary">${esc(s.summary)}</p>`:""}
      <div class="worldSignalBottom"><span>${esc(category[1])} · Fonte: ${esc(s.source_name||"Sito di origine")}</span>
        <div class="worldSignalActions">
          ${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Leggi la fonte ↗</a>`:""}
          <button type="button" class="worldReadAction" data-news-action="${radarShowRead?"unread":"read"}" data-news-kind="${esc(s.kind)}" data-news-id="${esc(s.id)}">${radarShowRead?"Ripristina":"✓ Letto"}</button>
        </div>
      </div>
    </article>`;
  }).join("");
  app.innerHTML=shell(`<div class="worldRadar">
    <div class="eyebrow">Fashion & Luxury Intelligence</div>
    <h1>Fashion News</h1>
    <p class="lead">Notizie dal fashion e dal lusso nel mondo: stampa internazionale, mercati e comunicazioni ufficiali dei brand. Ogni aggiornamento rimanda alla fonte originale.</p>
    <div class="worldRadarToolbar section">
      <strong>${unread.length} da leggere · ${rows.length} ${radarShowRead?"lette":"mostrate"}</strong>
      <div class="worldRadarFilters">
        <label>Argomento <select id="radarType"><option value="all">Tutti</option>${options(types,radarSignalFilter,Object.fromEntries(Object.entries(RADAR_TYPES).map(([k,v])=>[k,v[0]])))}</select></label>
        <label>Fonte / azienda <select id="radarCompany"><option value="all">Tutte</option>${options(brands,radarCompanyFilter)}</select></label>
        <button type="button" id="radarReadToggle" class="worldReadToggle">${radarShowRead?"← Torna alle notizie da leggere":"Archivio lette"}</button>
      </div>
    </div>
    ${readError?`<p id="radarReadError" class="worldReadError">Non riesco a caricare lo stato di lettura: ${esc(readError.message)}</p>`:`<p id="radarReadError" class="worldReadError" role="alert" hidden></p>`}
    <section class="worldRadarList">${error?`<div class="msg bad">${esc(error.message)}</div>`:(cards||`<div class="emptyState"><h3>${radarShowRead?"Nessuna notizia letta con questi filtri.":"Hai letto tutte le notizie disponibili con questi filtri."}</h3><p>${radarShowRead?"Torna alle novità da leggere oppure cambia i filtri.":"Le nuove notizie appariranno qui quando HUNT le raccoglierà."}</p></div>`)}</section>
    <p class="worldRadarFoot">Fonti ufficiali e testate internazionali monitorate a rotazione. Le notizie non sono prove di assunzione: verifica sempre il link originale.</p>
  </div>`);
  bindNav();
  const type=document.getElementById("radarType"),company=document.getElementById("radarCompany");
  if(type)type.onchange=()=>{radarSignalFilter=type.value;renderWorldRadar()};
  if(company)company.onchange=()=>{radarCompanyFilter=company.value;renderWorldRadar()};
  const toggle=document.getElementById("radarReadToggle");
  if(toggle)toggle.onclick=()=>{radarShowRead=!radarShowRead;renderWorldRadar()};
  document.querySelectorAll("[data-news-action]").forEach(button=>button.onclick=async()=>{
    if(readError)return;
    const kind=button.dataset.newsKind,id=button.dataset.newsId,action=button.dataset.newsAction;
    if(!["industry","company"].includes(kind)||!/^[0-9a-f-]{36}$/i.test(id))return;
    const original=button.textContent;
    button.disabled=true;button.textContent="Salvataggio…";
    const result=action==="read"
      ?await supabase.from("user_news_reads").upsert({user_id:currentUser.id,source_kind:kind,item_id:id},{onConflict:"user_id,source_kind,item_id",ignoreDuplicates:true})
      :await supabase.from("user_news_reads").delete().eq("user_id",currentUser.id).eq("source_kind",kind).eq("item_id",id);
    if(result.error){
      const notice=document.getElementById("radarReadError");
      if(notice){notice.hidden=false;notice.textContent="Impossibile aggiornare la notizia: "+result.error.message}
      button.disabled=false;button.textContent=original;return;
    }
    await renderWorldRadar();
  });
}

async function renderProfile(fromJobId=null){
 currentView="profile";
 const [p,pref]=await Promise.all([
  getProfile(),
  supabase.from("career_preferences").select("primary_role_families").eq("user_id",currentUser.id).maybeSingle()
 ]);
 const roles=pref.data?.primary_role_families||[];
 app.innerHTML=shell(`<div class="profilePage profileWorkspacePage">
  <header class="profileWorkspaceHeading">
    <div><div class="eyebrow">Il tuo spazio</div><h1>Profilo e curriculum</h1>
      <p>Gestisci le tue versioni del CV e controlla le informazioni utilizzate da HUNT per le candidature.</p></div>
    <div class="profileHeaderActions">
      ${fromJobId?`<button class="profileBackToJob" id="profileBackToJob">← Torna alla posizione</button>`:""}
      <button class="profileSignout" id="logoutBtn">Esci</button>
    </div>
  </header>
  <div class="profileAccountStrip"><span><strong>${esc(p?.display_name||"Profilo personale")}</strong><small>${esc(currentUser.email||"")}</small></span>
   <span><small>Aree di interesse</small><strong>${esc(Array.isArray(roles)&&roles.length?roles.slice(0,3).join(" · "):"Da definire")}</strong></span></div>
  <div id="cvManagerRoot"><p class="lead">Apertura del tuo archivio CV…</p></div>
 </div>`);
 bindNav();
 document.getElementById("logoutBtn").onclick=logout;
 const backToJob=document.getElementById("profileBackToJob");
 if(backToJob&&fromJobId)backToJob.onclick=()=>openOpportunityFolder(fromJobId,false);
 try{
   const {mountCvManager}=await import("./cv-profile.js?v=20261110-155");
   const root=document.getElementById("cvManagerRoot");
   if(currentView==="profile"&&root)await mountCvManager(root,{supabase,user:currentUser,refresh:()=>renderProfile(fromJobId),roleFamilies:macroAreas});
 }catch(e){
   const root=document.getElementById("cvManagerRoot");
   if(root)root.textContent="Impossibile aprire la gestione dei CV: "+(e.message||String(e));
 }
}

window.addEventListener("popstate",(event)=>{
 const jobId=event.state?.huntFolder;
 if(jobId){openOpportunityFolder(jobId,false);return}
 currentView="opportunities";
 renderOpportunities();
});
supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user&&!currentUser){currentUser=session.user;setTimeout(bootstrap,0)}});
bootstrap();
