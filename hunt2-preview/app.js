import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL="https://dfiokxjfgqoboxckcuut.supabase.co";
const SUPABASE_KEY="sb_publishable_9F3UoJWHMYSKSGqTibcZDg_VMRCGsI_";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
const app=document.getElementById("app");
let currentUser=null;
let currentView="opportunities";
let selectedJobId=null;

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
  <section class="card"><div class="eyebrow">5 · Primo CV</div><h2>Puoi aggiungerne altri dopo.</h2><div class="grid2" style="margin-top:12px"><label><div class="eyebrow">Nome CV</div><input class="input" name="cvname" placeholder="Es. Retail Merchandising"></label><label><div class="eyebrow">File</div><input class="input" name="cv" type="file" accept=".pdf,.doc,.docx"></label></div></section>
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
 const file=fd.get("cv");
 if(file instanceof File && file.size){
   if(file.size>8*1024*1024){msg.innerHTML='<div class="msg bad">CV troppo grande: massimo 8 MB.</div>';return}
   const ext=(file.name.split(".").pop()||"pdf").toLowerCase();
   const path=currentUser.id+"/"+crypto.randomUUID()+"."+ext;
   const up=await supabase.storage.from("cvs").upload(path,file,{contentType:file.type,upsert:false});
   if(up.error){msg.innerHTML='<div class="msg bad">'+esc(up.error.message)+'</div>';return}
   const row=await supabase.from("user_cvs").insert({user_id:currentUser.id,name:fd.get("cvname")||file.name,storage_path:path,target_role_families:primary,parsed_profile:{},is_default:true,active:true});
   if(row.error){await supabase.storage.from("cvs").remove([path]);msg.innerHTML='<div class="msg bad">'+esc(row.error.message)+'</div>';return}
 }
 renderShell();
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
 <div class="nav">${["opportunities","applications","profile"].map(v=>`<button data-view="${v}" class="${currentView===v?"active":""}">${({opportunities:"Opportunità",applications:"Candidature",profile:"Profilo"})[v]}</button>`).join("")}</div>
 <div class="sideFoot">Beta connected · Supabase</div></aside><main class="main">${inner}</main></div>
 <nav class="mobileNav">${["opportunities","applications","profile"].map(v=>`<button data-view="${v}">${({opportunities:"Opportunità",applications:"Candidature",profile:"Profilo"})[v]}</button>`).join("")}</nav>`;
}

async function renderShell(){
 if(currentView==="opportunities") return renderOpportunities();
 if(currentView==="applications") return renderApplications();
 return renderProfile();
}

async function getOpportunityFeed(limit=100){
 const [{data:matches,error:matchError},{data:hidden},{data:applications},{data:pref}]=await Promise.all([
   supabase.from("user_job_matches").select("job_id,match_score,priority_score,reasons,gaps").eq("user_id",currentUser.id).order("priority_score",{ascending:false}).limit(limit),
   supabase.from("user_job_feedback").select("job_id").eq("user_id",currentUser.id).eq("feedback_type","hide"),
   supabase.from("applications").select("job_id").eq("user_id",currentUser.id),
   supabase.from("career_preferences").select("preferred_locations,relocation_locations,preferences").eq("user_id",currentUser.id).maybeSingle()
 ]);
 if(matchError||!matches?.length)return {data:[],error:matchError};
 const excluded=new Set([...(hidden||[]).map(x=>x.job_id),...(applications||[]).map(x=>x.job_id).filter(Boolean)]);
 const ids=matches.map(x=>x.job_id).filter(id=>!excluded.has(id));
 if(!ids.length)return {data:[],error:null};
 const {data:jobs,error:jobError}=await supabase
   .from("jobs")
   .select("id,company_id,canonical_title,role_family,city,remote_mode,vacancy_confidence,confidence_label,last_verified_at,published_at,primary_apply_url,state,description,companies(name)")
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
   const city=job.city.toLowerCase();
   return cities.some(x=>city.includes(x)||x.includes(city));
 };
 const fresh=(jobs||[]).filter(job=>job.published_at&&new Date(job.published_at)>=cutoff&&cityAllowed(job));
 const byId=new Map(fresh.map(job=>[job.id,job]));
 return {data:matches.map(match=>({...match,job:byId.get(match.job_id)})).filter(x=>x.job&&!excluded.has(x.job_id)&&x.match_score>=minMatch),error:null};
}

async function getOpportunityDetail(jobId){
 const [{data:job,error:jobError},{data:match},{data:application},{data:personalization},{data:cvs},{data:reposts}]=await Promise.all([
   supabase.from("jobs").select("id,company_id,canonical_title,role_family,city,vacancy_confidence,confidence_label,last_verified_at,published_at,first_seen_at,primary_apply_url,state,description,companies(name)").eq("id",jobId).maybeSingle(),
   supabase.from("user_job_matches").select("match_score,priority_score,reasons,gaps").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle(),
   supabase.from("applications").select("*").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle(),
   supabase.from("user_personalization").select("interest_areas,next_experience_drivers,company_preference,avoid_role_traits").eq("user_id",currentUser.id).maybeSingle(),
   supabase.from("user_cvs").select("id,name,target_role_families,is_default,created_at").eq("user_id",currentUser.id).eq("active",true).order("created_at",{ascending:false}),
   supabase.from("repost_events").select("id,detected_at,reason,evidence").eq("job_id",jobId).order("detected_at",{ascending:false})
 ]);
 if(jobError||!job)return null;
 const [{data:signals},{data:sameJobs}]=await Promise.all([
   supabase.from("company_signals").select("id,signal_type,title,summary,source_name,source_url,published_at,relevance_score").eq("company_id",job.company_id).order("relevance_score",{ascending:false}).limit(5),
   supabase.from("jobs").select("id,canonical_title,city,role_family,published_at,state").eq("company_id",job.company_id).neq("id",jobId).gte("published_at",new Date(Date.now()-20*86400000).toISOString()).order("published_at",{ascending:false}).limit(5)
 ]);
 return {job,...(match||{match_score:0,priority_score:0,reasons:[],gaps:[]}),application,personalization,cvs:cvs||[],reposts:reposts||[],signals:signals||[],sameJobs:sameJobs||[]};
}

function ageLabel(value){
 if(!value)return "Data non verificata";
 const days=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/86400000));
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

function opportunityCard(row){
 const job=row.job;
 const brand=job.companies?.name||"Brand";
 return `<article class="card jobCard cleanJobCard">
  <div class="jobMain">
   <div class="eyebrow">${esc(brand)}</div>
   <h3>${esc(job.canonical_title)}</h3>
   <div class="jobMeta">${esc(job.city||"Località da verificare")} · ${esc(job.role_family||"Altro")}</div>
   <div class="humanBadges">
    <span class="matchPill">${row.match_score}% compatibile</span>
    <span>${esc(ageLabel(job.published_at))}</span>
    <span>${esc(verifiedLabel(job))}</span>
   </div>
   <div class="actions">
    <button class="btn primary" data-folder="${job.id}">Apri folder</button>
    <button class="btn" data-prepare="${job.id}">Prepara candidatura</button>
    <button class="btn" data-applied="${job.id}">Già candidata</button>
    <button class="btn ghostDanger" data-ignore="${job.id}">Ignora</button>
   </div>
  </div>
 </article>`;
}

async function saveApplication(jobId,status){
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
 currentView="applications";
 await renderApplications();
}

async function ignoreJob(jobId){
 const {error}=await supabase.from("user_job_feedback").insert({user_id:currentUser.id,job_id:jobId,feedback_type:"hide",details:{source:"opportunity_action"}});
 if(error){alert(error.message);return}
 currentView="opportunities";
 await renderOpportunities();
}

function openOpportunityFolder(jobId,push=true){
 selectedJobId=jobId;
 if(push)history.pushState({huntFolder:jobId},"","#job="+jobId);
 return renderOpportunityFolder(jobId);
}

function bindOpportunityActions(){
 document.querySelectorAll("[data-folder]").forEach(b=>b.onclick=()=>openOpportunityFolder(b.dataset.folder));
 document.querySelectorAll("[data-prepare]").forEach(b=>b.onclick=()=>saveApplication(b.dataset.prepare,"preparing"));
 document.querySelectorAll("[data-applied]").forEach(b=>b.onclick=()=>saveApplication(b.dataset.applied,"applied"));
 document.querySelectorAll("[data-ignore]").forEach(b=>b.onclick=()=>ignoreJob(b.dataset.ignore));
 document.querySelectorAll("[data-related-job]").forEach(b=>b.onclick=()=>openOpportunityFolder(b.dataset.relatedJob));
}
function bindNav(){
 document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;renderShell()});
}

async function renderOpportunities(){
 currentView="opportunities";
 selectedJobId=null;
 const feed=await getOpportunityFeed(100);
 const rows=feed.data||[];
 app.innerHTML=shell(`<div class="eyebrow">Il tuo radar</div><h1>Opportunità</h1>
 <p class="lead">HUNT cerca molto più in largo di quello che mostra. Qui entrano solo vacancy fresche, pertinenti e con una data affidabile.</p>
 <div class="feedToolbar section">
   <strong>${rows.length} opportunità per te</strong>
   <div class="filterPills"><span>Ultimi 20 giorni</span><span>Ordinate per priorità</span></div>
 </div>
 <section class="section stack">${feed.error?`<div class="msg bad">${esc(feed.error.message)}</div>`:(rows.length?rows.map(x=>opportunityCard(x)).join(""):`<div class="card"><h3>Nessuna opportunità fresca da mostrare.</h3><p class="lead">HUNT continua a cercare sul mercato, ma non riempie il feed con vacancy vecchie o senza data affidabile.</p></div>`)}</section>`);
 bindNav();bindOpportunityActions();
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

function personalizedWhy(row){
 const role=row.job.role_family||"quest'area";
 const interests=interestPhrase(row.personalization);
 const reasons=Array.isArray(row.reasons)?row.reasons:[];
 const pieces=[];
 if(interests.length)pieces.push("incrocia aspetti che hai indicato come importanti per te: "+interests.join(", "));
 if(reasons.some(x=>/città|milano/i.test(x)))pieces.push("è in una delle città che hai scelto");
 if(reasons.some(x=>/livello/i.test(x)))pieces.push("il livello è coerente con la fase in cui sei");
 if(!pieces.length&&reasons.length)pieces.push(reasons[0].toLowerCase());
 return `Questa opportunità merita attenzione perché ${pieces.join("; ")}. Il ruolo rientra nell'area ${role} e HUNT la considera una candidatura coerente con il tuo profilo attuale.`;
}

function chooseCv(row){
 const role=row.job.role_family;
 const exact=(row.cvs||[]).find(cv=>Array.isArray(cv.target_role_families)&&cv.target_role_families.includes(role));
 return exact||(row.cvs||[]).find(cv=>cv.is_default)||(row.cvs||[])[0]||null;
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

async function renderOpportunityFolder(jobId){
 selectedJobId=jobId;
 const row=await getOpportunityDetail(jobId);
 if(!row)return renderOpportunities();
 const job=row.job;
 const brand=job.companies?.name||"Brand";
 const gaps=Array.isArray(row.gaps)?row.gaps:[];
 const appStatus=row.application?.status||null;
 const cv=chooseCv(row);
 const questions=likelyInterviewQuestions(row);
 const repostCount=(row.reposts||[]).length;
 const repostText=repostCount
   ? `HUNT ha rilevato ${repostCount} ripubblicazione${repostCount===1?"":"i"}. La prima data resta quella originale: un repost non viene trattato automaticamente come una nuova vacancy.`
   : "Nessuna ripubblicazione rilevata finora. HUNT continua a monitorare l'annuncio e, se ricompare, distingue un repost da una vacancy realmente nuova.";
 const signals=(row.signals||[]);
 const sameJobs=(row.sameJobs||[]);

 app.innerHTML=shell(`<div class="folderTopbar">
   <button class="textBack" id="backToFeed">← Torna alle opportunità</button>
   ${appStatus?`<span class="folderStatus">${esc(statusLabel(appStatus))}</span>`:""}
 </div>

 <section class="folderHero section">
  <div class="eyebrow">${esc(brand)}</div>
  <h1>${esc(job.canonical_title)}</h1>
  <p class="lead">${esc(job.city||"—")} · ${esc(job.role_family||"—")}</p>
  <div class="heroMeta">
   <span class="heroMatch">${row.match_score}% compatibile con te</span>
   <span>${esc(ageLabel(job.published_at))}</span>
   <span>${esc(verifiedLabel(job))}</span>
  </div>
  <div class="actions">
   <button class="btn green" data-prepare="${job.id}">Prepara candidatura</button>
   <button class="btn darkSecondary" data-applied="${job.id}">Già candidata</button>
   ${job.primary_apply_url?`<a class="btn darkSecondary" href="${esc(job.primary_apply_url)}" target="_blank" rel="noopener">Sito del brand ↗</a>`:""}
   <button class="btn darkGhost" data-ignore="${job.id}">Ignora</button>
  </div>
 </section>

 <div class="folderTabs section">
   <button class="folderTab active" data-folder-tab="application">Candidatura</button>
   <button class="folderTab" data-folder-tab="company">Azienda & colloquio</button>
 </div>

 <div data-folder-panel="application">
   <section class="section card featureCard">
    <div class="eyebrow">Perché candidarti</div>
    <h2>Perché ha senso per te</h2>
    <p class="personalWhy">${esc(personalizedWhy(row))}</p>
   </section>

   <section class="section">
    <div class="sectionTitle"><div><div class="eyebrow">Cosa fare ora</div><h2>La candidatura, passo per passo</h2></div></div>
    <div class="stepsList">
      <article class="stepCard"><span>1</span><div><strong>Usa il CV più adatto</strong><p>${cv?`HUNT sceglierebbe “${esc(cv.name.trim()||"CV")}" per questa posizione. Il prossimo step è analizzarne davvero il contenuto e suggerire solo modifiche fattuali.`:"Carica un CV: HUNT selezionerà quello più coerente con la vacancy."}</p></div></article>
      <article class="stepCard"><span>2</span><div><strong>Controlla i punti da valorizzare</strong><p>HUNT confronterà vacancy e CV per dirti quali esperienze, progetti e competenze portare in alto, senza aggiungere cose che non hai fatto.</p></div></article>
      <article class="stepCard"><span>3</span><div><strong>Motivation answer / cover letter</strong><p>La preparo solo se è richiesta o davvero utile. Per una candidatura ufficiale non serve inventarsi un'email che nessuno ha chiesto.</p></div></article>
      <article class="stepCard"><span>4</span><div><strong>Candidati sul canale ufficiale</strong><p>Quando hai finito, apri il sito del brand e poi segnala a HUNT che ti sei candidata.</p></div></article>
    </div>
   </section>

   <section class="section grid2">
    <article class="card"><div class="eyebrow">Punti da controllare</div><h2>Prima di inviare</h2>${gaps.length?`<ul class="listClean">${gaps.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:'<p class="lead">Non è emerso nessun elemento chiaramente bloccante. HUNT continuerà a confrontare requisiti e CV.</p>'}</article>
    <article class="card"><div class="eyebrow">Annuncio & storico</div><h2>${esc(verifiedLabel(job))}</h2><p class="lead">${esc(ageLabel(job.published_at))}. Ultimo controllo: ${job.last_verified_at?new Date(job.last_verified_at).toLocaleString("it-IT"):"—"}.</p><p class="historyNote">${esc(repostText)}</p></article>
   </section>
 </div>

 <div class="hide" data-folder-panel="company">
   <section class="section">
    <div class="sectionTitle"><div><div class="eyebrow">Prima del colloquio</div><h2>Cose da sapere su ${esc(brand)}</h2></div></div>
    <div class="grid2">
      <article class="card"><div class="eyebrow">News & segnali utili</div>${signals.length?signals.map(s=>`<div class="signalItem"><strong>${esc(s.title)}</strong><p>${esc(s.summary||"")}</p>${s.source_url?`<a href="${esc(s.source_url)}" target="_blank" rel="noopener">Fonte ↗</a>`:""}</div>`).join(""):'<p class="lead">HUNT non ha ancora salvato segnali verificati per questo brand. Qui compariranno solo news utili a capire azienda, strategia o contesto del ruolo — non notizie casuali.</p>'}</article>
      <article class="card"><div class="eyebrow">Domande probabili</div><h2>Preparati su queste</h2><ol class="interviewQuestions">${questions.map(q=>`<li>${esc(q)}</li>`).join("")}</ol></article>
    </div>
   </section>

   <section class="section card">
    <div class="eyebrow">Altre posizioni del brand</div>
    <h2>Cos'altro è aperto adesso</h2>
    ${sameJobs.length?`<div class="relatedJobs">${sameJobs.map(j=>`<button class="relatedJob" data-related-job="${j.id}"><span><strong>${esc(j.canonical_title)}</strong><small>${esc(j.city||"")} · ${esc(ageLabel(j.published_at))}</small></span><b>→</b></button>`).join("")}</div>`:'<p class="lead">Nessun’altra vacancy fresca rilevata per questo brand negli ultimi 20 giorni.</p>'}
   </section>
 </div>`);

 bindNav();bindOpportunityActions();
 document.getElementById("backToFeed").onclick=()=>{
   if(location.hash.startsWith("#job="))history.back();
   else renderOpportunities();
 };
 document.querySelectorAll("[data-folder-tab]").forEach(btn=>btn.onclick=()=>{
   const tab=btn.dataset.folderTab;
   document.querySelectorAll("[data-folder-tab]").forEach(x=>x.classList.toggle("active",x.dataset.folderTab===tab));
   document.querySelectorAll("[data-folder-panel]").forEach(x=>x.classList.toggle("hide",x.dataset.folderPanel!==tab));
 });
}

function statusLabel(status){
 return ({preparing:"Da preparare",applied:"Candidata",follow_up:"Follow-up",interview:"Colloquio",offer:"Offerta",rejected:"Rifiutata",closed:"Chiusa"})[status]||status;
}

async function renderApplications(){
 currentView="applications";
 const {data:applications,error}=await supabase.from("applications").select("*").eq("user_id",currentUser.id).order("updated_at",{ascending:false});
 const ids=(applications||[]).map(x=>x.job_id).filter(Boolean);
 let jobs=[];
 if(ids.length){
   const res=await supabase.from("jobs").select("id,canonical_title,city,companies(name)").in("id",ids);
   jobs=res.data||[];
 }
 const byId=new Map(jobs.map(x=>[x.id,x]));
 const cards=(applications||[]).map(item=>{
   const job=byId.get(item.job_id);
   return `<article class="card applicationCard"><div><div class="eyebrow">${esc(job?.companies?.name||"Candidatura")}</div><h3>${esc(job?.canonical_title||"Opportunità")}</h3><div class="jobMeta">${esc(job?.city||"")} · ${esc(statusLabel(item.status))}</div></div><div class="actions">${item.job_id?`<button class="btn primary" data-app-folder="${item.job_id}">Apri folder</button>`:""}</div></article>`;
 }).join("");
 app.innerHTML=shell(`<div class="eyebrow">Il tuo percorso</div><h1>Candidature</h1>
 <p class="lead">Da preparare → Candidata → Colloquio → Follow-up → Rifiutata / Offerta.</p>
 <section class="section stack">${error?`<div class="msg bad">${esc(error.message)}</div>`:(cards||'<div class="card">Nessuna candidatura ancora.</div>')}</section>`);
 bindNav();
 document.querySelectorAll("[data-app-folder]").forEach(b=>b.onclick=()=>renderOpportunityFolder(b.dataset.appFolder));
}

async function renderProfile(){
 const [p,pref,cvs]=await Promise.all([getProfile(),supabase.from("career_preferences").select("*").eq("user_id",currentUser.id).maybeSingle(),supabase.from("user_cvs").select("id,name,is_default,created_at").eq("user_id",currentUser.id).eq("active",true).order("created_at",{ascending:false})]);
 const roles=pref.data?.primary_role_families||[];
 app.innerHTML=shell(`<div class="eyebrow">Il tuo HUNT</div><h1>Profilo</h1><p class="lead">Quello che HUNT sa di te e usa per ordinare il mercato.</p>
 <div class="grid2 section"><section class="card"><div class="eyebrow">Profilo</div><div class="profileLine"><span>Nome</span><strong>${esc(p?.display_name||"—")}</strong></div><div class="profileLine"><span>Email</span><strong>${esc(currentUser.email||"")}</strong></div><div class="profileLine"><span>Target</span><strong>${esc(Array.isArray(roles)?roles.join(", "):"—")}</strong></div></section>
 <section class="card"><div class="eyebrow">CV privati</div>${cvs.data?.length?cvs.data.map(x=>`<div class="profileLine"><span>${esc(x.name)}</span><strong>${x.is_default?"Default":""}</strong></div>`).join(""):`<p class="lead">Nessun CV caricato.</p>`}<div class="actions"><button id="logoutBtn" class="btn">Esci dall'account</button></div></section></div>`);
 bindNav();document.getElementById("logoutBtn").onclick=logout;
}

window.addEventListener("popstate",(event)=>{
 const jobId=event.state?.huntFolder;
 if(jobId){openOpportunityFolder(jobId,false);return}
 currentView="opportunities";
 renderOpportunities();
});
supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user&&!currentUser){currentUser=session.user;setTimeout(bootstrap,0)}});
bootstrap();
