import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL="https://dfiokxjfgqoboxckcuut.supabase.co";
const SUPABASE_KEY="sb_publishable_9F3UoJWHMYSKSGqTibcZDg_VMRCGsI_";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
const app=document.getElementById("app");
let currentUser=null;
let currentView="opportunities";
let selectedJobId=null;
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
 <div class="nav">${["opportunities","radar","applications","profile"].map(v=>`<button data-view="${v}" class="${currentView===v?"active":""}">${({opportunities:"Opportunità",radar:"Fashion News",applications:"Candidature",profile:"Profilo"})[v]}</button>`).join("")}</div>
 <div class="sideFoot">Beta connected · Supabase</div></aside><main class="main">${inner}</main></div>
 <nav class="mobileNav">${["opportunities","radar","applications","profile"].map(v=>`<button data-view="${v}">${({opportunities:"Opportunità",radar:"Fashion News",applications:"Candidature",profile:"Profilo"})[v]}</button>`).join("")}</nav>`;
}

async function renderShell(){
 if(currentView==="opportunities") return renderOpportunities();
 if(currentView==="applications") return renderApplications();
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
 const fresh=(jobs||[]).filter(job=>{const date=job.published_at||job.first_seen_at;return date&&new Date(date)>=cutoff&&cityAllowed(job)&&["active_verified","active_likely"].includes(job.state)});
 const byId=new Map(fresh.map(job=>[job.id,job]));
 const applicationByJob=new Map((applications||[]).map(x=>[x.job_id,x.status]));
 return {data:matches.map(match=>({...match,job:byId.get(match.job_id),applicationStatus:applicationByJob.get(match.job_id)||null}))
   .filter(x=>x.job&&!excluded.has(x.job_id)&&x.match_score>=minMatch),error:null};
}

async function getOpportunityDetail(jobId){
 const [{data:job,error:jobError},{data:match},{data:application},{data:personalization},{data:cvs},{data:reposts},{data:dossier}]=await Promise.all([
   supabase.from("jobs").select("id,company_id,canonical_title,role_family,city,vacancy_confidence,confidence_label,last_verified_at,published_at,first_seen_at,primary_apply_url,state,description,metadata,companies(name)").eq("id",jobId).maybeSingle(),
   supabase.from("user_job_matches").select("match_score,priority_score,reasons,gaps").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle(),
   supabase.from("applications").select("*").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle(),
   supabase.from("user_personalization").select("interest_areas,next_experience_drivers,company_preference,avoid_role_traits").eq("user_id",currentUser.id).maybeSingle(),
   supabase.from("user_cvs").select("id,name,target_role_families,parsed_profile,is_default,created_at,updated_at").eq("user_id",currentUser.id).eq("active",true).order("created_at",{ascending:false}),
   supabase.from("repost_events").select("id,detected_at,reason,evidence").eq("job_id",jobId).order("detected_at",{ascending:false}),
   supabase.from("user_job_dossiers").select("*").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle()
 ]);
 if(jobError||!job)return null;
 const companyName=String(job.companies?.name||"").trim();
 const searchBrand=companyName.replace(/\s+(Group|Fashion Group|Holdings|S\.p\.A\.|Ltd\.)$/i,"").trim();
 const [{data:signals},{data:relatedMatches},{data:brandMedia},{data:companyJobs}]=await Promise.all([
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
     ?supabase.from("world_news_items").select("id,title,summary,url,published_at,world_news_sources(publisher)").ilike("title","%"+searchBrand.replace(/[%_,]/g," ").slice(0,75)+"%").order("published_at",{ascending:false}).limit(35)
     :Promise.resolve({data:[]}),
   supabase.from("jobs").select("id,canonical_title,city,role_family,published_at,first_seen_at,primary_apply_url,state,confidence_label")
     .eq("company_id",job.company_id).in("state",["active_verified","active_likely"])
     .neq("id",jobId).order("first_seen_at",{ascending:false}).limit(24)
 ]);
 const cutoff=new Date(Date.now()-20*86400000);
 const sameJobs=(relatedMatches||[])
   .map(x=>({...x.jobs,match_score:x.match_score,priority_score:x.priority_score}))
   .filter(x=>{const date=x?.published_at||x?.first_seen_at;return date&&new Date(date)>=cutoff});
 return {job,...(match||{match_score:0,priority_score:0,reasons:[],gaps:[]}),application,personalization,cvs:cvs||[],reposts:reposts||[],signals:signals||[],brandMedia:brandMedia||[],companyJobs:companyJobs||[],sameJobs,dossier:dossier||null};
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
 return "Fonte · Annuncio aziendale";
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
    <span class="matchPill">${row.match_score}% compatibile</span>
    ${row.applicationStatus==="preparing"?'<span class="jobPreparing">In preparazione</span>':""}
    <span>${esc(ageLabel(job.published_at,job.first_seen_at))}</span>
    <span>${esc(verifiedLabel(job))}</span>
    <span class="sourceMeta">${esc(sourceLabel(job))}</span>
   </div>
   <div class="actions editorialActions">
    ${job.primary_apply_url?`<a class="btn primary" href="${esc(job.primary_apply_url)}" target="_blank" rel="noopener">Apri posizione ↗</a>`:""}
    <button class="btn" data-prepare="${job.id}" data-resume="${row.applicationStatus==="preparing"?"true":"false"}">${row.applicationStatus==="preparing"?"Riprendi dossier":"Prepara candidatura"}</button>
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

function openOpportunityFolder(jobId,push=true){
 selectedJobId=jobId;
 if(push)history.pushState({huntFolder:jobId},"","#job="+jobId);
 return renderOpportunityFolder(jobId);
}

function bindOpportunityActions(){
 document.querySelectorAll("[data-prepare]").forEach(b=>b.onclick=()=>openOpportunityFolder(b.dataset.prepare));
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
 const rows=[...(feed.data||[])];
 if(opportunitySort==="recent"){
   rows.sort((a,b)=>new Date(b.job.published_at||b.job.first_seen_at||0)-new Date(a.job.published_at||a.job.first_seen_at||0));
 }else{
   rows.sort((a,b)=>(b.priority_score||0)-(a.priority_score||0));
 }
 app.innerHTML=shell(`<div class="opportunitiesPage">
 <div class="eyebrow">Il tuo radar</div><h1>Opportunità</h1>
 <p class="lead">HUNT esplora il mercato in profondità e qui mostra solo le posizioni fresche che vale la pena guardare.</p>
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

function hasParsedCv(row){
 return (row.cvs||[]).some(cv=>cv.parsed_profile?.cv_text_extraction_status==="text_extracted"&&String(cv.parsed_profile?.raw_text||"").length>=80);
}

function verifiedCv(cv){
 const p=cv?.parsed_profile||{};
 return Boolean(p.experience?.length||p.projects?.length||p.education?.length);
}
function chooseCv(row){
 const role=row.job.role_family;
 const cvs=(row.cvs||[]).filter(verifiedCv);
 const saved=row.dossier?.recommended_cv_id;
 return cvs.find(cv=>cv.id===saved)||cvs.find(cv=>Array.isArray(cv.target_role_families)&&cv.target_role_families.includes(role))||cvs.find(cv=>cv.is_default)||cvs[0]||(row.cvs||[]).find(cv=>cv.is_default)||(row.cvs||[])[0]||null;
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
 const sentences=relevant.split(/\n+|(?<=[.!?])\s+(?=[A-ZÀ-Ü])/)
   .map(x=>x.replace(/\s+/g," ").trim())
   .filter(x=>x.length>=30&&x.length<=750&&
     !/^(about us|about the company|equal opportunity|who we are|privacy|cookie policy)/i.test(x));
 const isBrandHistory=x=>/(founded in|founded by|pioneer of|headquartered in|in 20\d\d.*(created|became|changed)|\bemployees\b|operat(?:es|ing) in \d+ countries|billion (?:euros|dollars)|azienda fondata nel|fatturato del gruppo)/i.test(x);
 const tasks=sentences.filter(x=>!isBrandHistory(x)&&/support|coordinate|responsibilit|manage|monitor|analys|plan|merchandis|buying|purchase|assort|stock|allocation|report|collection|product|vendit|acquist|gestione|pianific|analisi|assortimento|negozi|retail/i.test(x)).slice(0,3);
 const requirements=sentences.filter(x=>!isBrandHistory(x)&&/\b(required|requirement|must|minimum|at least|years? of experience|proficient|fluent|excel|degree|preferred|conoscenza|requisiti|esperienza|laurea|lingua|padronanza|necessari|essenziale)\b/i.test(x)).slice(0,3);
 const clip=x=>x.length>290?x.slice(0,287).trim()+"…":x;
 return {tasks:tasks.map(clip),requirements:requirements.map(clip),hasDetails:original.length>=150};
}
async function renderOpportunityFolder(jobId){
 selectedJobId=jobId;
 const row=await getOpportunityDetail(jobId);
 if(!row)return renderOpportunities();
 const savedCv=(row.cvs||[]).find(x=>x.id===row.dossier?.recommended_cv_id);
 const lastCvUpdate=row.dossier?.generated_from?.cv_updated_at;
 const dossierStale=Boolean(lastCvUpdate&&savedCv?.updated_at&&new Date(savedCv.updated_at)>new Date(lastCvUpdate));
 const modelStale=Boolean(row.dossier?.model_version!=="evidence_dossier_v4");
 const shouldRefresh=Boolean(!row.dossier||dossierStale||modelStale);
 if(shouldRefresh&&!pendingDossiers.has(jobId)&&(row.cvs||[]).some(verifiedCv)){
   pendingDossiers.add(jobId);
   try{
     await requestDossier(jobId);
     const {data}=await supabase.from("user_job_dossiers").select("*").eq("user_id",currentUser.id).eq("job_id",jobId).maybeSingle();
     row.dossier=data||null;
   }catch(error){row.dossierError=error instanceof Error?error.message:String(error)}
   finally{pendingDossiers.delete(jobId)}
 }
 if(selectedJobId!==jobId)return;
 const job=row.job;
 const brand=job.companies?.name||"Brand";
 const evidence=jobTextEvidence(job.description);
 const targetIsRelevant=Boolean((row.cvs||[]).some(cv=>(cv.target_role_families||[]).includes(job.role_family)));
 const shortlistVerdict=!evidence.tasks.length
   ?"HUNT ha verificato l'esistenza dell'offerta, ma i contenuti disponibili non bastano per valutare con precisione il lavoro."
   :`La posizione riguarda ${job.role_family||"un'area da approfondire"}${job.city?" a "+job.city:""}. L'annuncio descrive questo lavoro: «${evidence.tasks[0]}»${targetIsRelevant?". È un'area per cui hai già predisposto una versione del CV.":"."}`;

 const appStatus=row.application?.status||null;
 const cv=chooseCv(row);
 const fit=row.dossier?.model_version==="evidence_dossier_v4"&&row.dossier?.why_you?row.dossier.why_you:"L’analisi specifica dell’annuncio non è ancora aggiornata. Verifica i requisiti prima di dare priorità a questa candidatura.";
 const focusItems=Array.isArray(row.dossier?.generated_from?.duty_focus)?row.dossier.generated_from.duty_focus:[];
 const topDuty=focusItems[0]?.[1]||"";
 const smartQuestion=row.dossier?.generated_from?.interview_question||"";
 const opportunityValue=row.dossier?.generated_from?.opportunity_cost||"";
 const cvReady=hasParsedCv(row);
 const dossierEvidence=Array.isArray(row.dossier?.what_to_emphasize)?row.dossier.what_to_emphasize:[];
 const dossierGaps=Array.isArray(row.dossier?.gaps)?row.dossier.gaps:[];
 const dossierCvId=row.dossier?.recommended_cv_id||cv?.id||"";
 const dossierCvOptions=(row.cvs||[]).map((c,index)=>`<option value="${esc(c.id)}" ${c.id===dossierCvId?"selected":""}>${index+1}. ${esc(c.name||"Curriculum")}${c.is_default?" · principale":""}${verifiedCv(c)?"":" · dati da verificare"}</option>`).join("");
 const dossierLang=row.dossier?.generated_from?.language==="it"?"it":"en";
 const repostCount=(row.reposts||[]).length;
 const firstSeen=job.published_at?new Date(job.published_at):null;
 const repostSummary=repostCount
   ? `Questa posizione è ricomparsa ${repostCount} volt${repostCount===1?"a":"e"} dopo la prima pubblicazione. HUNT continua a considerare come riferimento la data originale (${firstSeen?firstSeen.toLocaleDateString("it-IT"):"—"}), così una ripubblicazione non viene presentata come una nuova opportunità.`
   : `HUNT memorizza la prima data in cui trova ogni annuncio. Se lo stesso brand lo ripubblica tra qualche giorno o settimana, non te lo mostrerà come “nuovo”: vedrai la data originale e l'eventuale ripubblicazione. Per questa posizione non sono ancora state rilevate ripubblicazioni.`;
 const signals=row.signals||[];
 const media=row.brandMedia||[];
 const sameJobs=row.sameJobs||[];
 const knownMatches=new Map(sameJobs.map(j=>[j.id,j.match_score]));
 const companyOpenings=(row.companyJobs||[]).filter(j=>["active_verified","active_likely"].includes(j.state));
 const companyNewsDedup=new Map();
 for(const x of signals){
   if(x.title&&safeRadarUrl(x.source_url)){
     companyNewsDedup.set(x.source_url,{id:x.id,kind:"company",title:x.title,summary:x.summary,source:x.source_name||"Fonte ufficiale",url:x.source_url,date:x.published_at});
   }
 }
 for(const x of media){
   if(x.title&&safeRadarUrl(x.url)&&!companyNewsDedup.has(x.url)){
     companyNewsDedup.set(x.url,{id:x.id,kind:"industry",title:x.title,summary:x.summary,source:x.world_news_sources?.publisher||"Testata internazionale",url:x.url,date:x.published_at});
   }
 }
 const companyNews=[...companyNewsDedup.values()].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
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
   <span class="heroMatch">${row.match_score}% compatibile con te</span>
   <span>${esc(ageLabel(job.published_at,job.first_seen_at))}</span>
   <span>${esc(verifiedLabel(job))}</span>
   <span>${esc(sourceLabel(job))}</span>
  </div>
  <div class="actions">
   ${job.primary_apply_url?`<a class="btn green" href="${esc(job.primary_apply_url)}" target="_blank" rel="noopener">Apri posizione ufficiale ↗</a>`:""}
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
   <section class="section huntDecision huntDecisionV3">
     <div class="huntDecisionIntro"><div class="eyebrow">Analisi della posizione</div><h2>Vale la pena approfondirla?</h2></div>
     <div class="huntDecisionBody">
       <p class="huntDecisionText">${esc(shortlistVerdict)}</p>
       <p class="huntAnalysisMeta">Compatibilità stimata ${Number(row.match_score)||0}% · ${esc(verifiedLabel(job))} · ${esc(sourceLabel(job))}</p>
       ${dossierGaps.length?`<p class="huntDecisionCaution"><strong>Prima di decidere, controlla:</strong> ${esc(dossierGaps[0])}</p>`:""}
     </div>
   </section>

   <section class="section dossierWorkspace dossierWorkspaceV3">
     <div class="workspaceHeader">
       <div><div class="eyebrow">Dossier personalizzato</div><h2>L'offerta confrontata con il tuo CV</h2></div>
       <span class="workspaceSub">HUNT legge requisiti e mansioni, sceglie il CV pertinente e prepara i documenti. Non completa i dati mancanti per supposizione.</span>
     </div>
     <div class="workspaceBar">
       <label>CV da utilizzare <select id="dossierCv">${dossierCvOptions}</select></label>
       <label>Lingua <select id="dossierLang"><option value="en" ${dossierLang==="en"?"selected":""}>English</option><option value="it" ${dossierLang==="it"?"selected":""}>Italiano</option></select></label>
       <button class="btn primary" id="generateDossier">${row.dossier?"Aggiorna analisi":"Analizza CV e offerta"}</button>
       ${cv?`<button class="btn workspaceDownload" id="downloadDossierCv">Scarica CV</button>`:""}
     </div>
     <div id="dossierMessage" class="workspaceMessage"></div>
     ${row.dossierError?`<p class="dossierError">${esc(row.dossierError)}</p>`:""}
     <div class="vacancyEvidenceGrid">
       <div class="vacancyEvidenceColumn">
         <div class="eyebrow">Mansioni riportate nell'annuncio</div>
         ${evidence.tasks.length?`<ul>${evidence.tasks.slice(0,2).map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:"<p>L'annuncio non descrive mansioni abbastanza specifiche. Apri la posizione ufficiale per verificarle.</p>"}
       </div>
       <div class="vacancyEvidenceColumn">
         <div class="eyebrow">Requisiti dichiarati dal datore di lavoro</div>
         ${evidence.requirements.length?`<ul>${evidence.requirements.slice(0,2).map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:"<p>Non sono disponibili requisiti verificabili nel testo acquisito. Non li inventiamo.</p>"}
       </div>
     </div>
     ${dossierGaps.length?`<div class="workspaceGap"><strong>Possibili ostacoli da controllare</strong><p>${esc(dossierGaps.slice(0,3).join(" · "))}</p></div>`:""}
     ${dossierEvidence.length?`<details class="workspaceEvidence"><summary>Come HUNT ha collegato il CV a questa offerta</summary><ul>${dossierEvidence.slice(0,5).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><p>Queste sono evidenze disponibili nel profilo, non garanzie di compatibilità o di selezione.</p></details>`:""}
     ${!row.dossier?`<p class="workspaceEmpty">Conferma almeno un CV nel Profilo per ottenere una selezione realmente personalizzata.</p>`:""}
   </section>

   ${row.dossier?.ready_to_send_message?`<section class="section letterWorkbench">
     <div class="letterHeading"><div><div class="eyebrow">Candidatura personale</div><h2>La tua cover letter</h2><p>La bozza qui sotto è una base tecnica, non una lettera scritta dall'AI. HUNT AI potrà generarne una originale dal CV verificato e dal testo della posizione, seguendo il tuo stile.</p></div>
       <div class="letterToolbar"><button class="btn aiWriteButton" id="writeLetterAI">✦ Scrivi con HUNT AI</button><button class="btn" id="saveCoverLetter">Salva</button><button class="btn primary" id="copyCoverLetter">Copia lettera</button></div>
     </div>
     <label class="dossierSubject">Oggetto: <span>${esc(row.dossier.ready_to_send_subject||"")}</span></label>
     <textarea class="coverLetterEditor" id="coverLetterText" rows="12" spellcheck="true" aria-label="Modifica la cover letter">${esc(row.dossier.ready_to_send_message)}</textarea>
     <div class="letterPolish">
       <div class="letterPolishTitle"><span class="letterAiMark">✦</span><div><strong>La tua voce, non un modello prestampato</strong><p>Puoi chiedere cambiamenti sulla bozza, oppure far scrivere una nuova lettera da HUNT AI. Il sistema usa l’annuncio reale, i CV confermati e le preferenze professionali salvate.</p></div></div>
       <div class="polishPresets">
         <button type="button" data-ai-feedback="Rendila meno formale, più umana e naturale, senza perdere professionalità.">Più naturale</button>
         <button type="button" data-ai-feedback="Rendi l'apertura più incisiva, mettendo subito in evidenza il contributo reale che posso portare, senza inventare risultati.">Apertura più forte</button>
         <button type="button" data-ai-feedback="Evita di ripetere il CV: usa soltanto le esperienze più rilevanti e collegale al lavoro concreto richiesto.">Meno ripetizioni</button>
         <button type="button" data-ai-feedback="Rafforza il valore che posso apportare al team usando una leva della perdita sobria e credibile, senza fare promesse non dimostrate.">Più persuasiva</button>
       </div>
       <div class="polishComposer"><textarea id="letterAiInstruction" rows="2" maxlength="500" placeholder="Es. Falla più personale, dai peso al progetto di buying e taglia l'introduzione."></textarea><button class="btn primary" id="polishLetter">Migliora</button></div>
       <div class="letterPolishFooter"><span id="letterAiStatus" role="status">Le nuove versioni non si salvano da sole: puoi correggere, annullare e decidere tu quando salvare.</span><button class="btn letterUndo" id="undoLetter" hidden>Ripristina testo precedente</button></div>
     </div>
   </section>`:""}

   <section class="section compactJobStatus">
     <div class="eyebrow">Stato annuncio</div>
     <div class="statusLine">
       <strong>${esc(ageLabel(job.published_at,job.first_seen_at))}</strong>
       <span>${esc(verifiedLabel(job))}</span>
       <span>${repostCount?`${repostCount} ripubblicazione${repostCount===1?"":"i"} rilevata${repostCount===1?"":"e"}`:"Nessun repost rilevato"}</span>
     </div>
     ${repostCount?`<p class="repostNote">${esc(repostSummary)}</p>`:""}
   </section>
 </div>

 <div class="hide" data-folder-panel="company">
   <section class="section brandGlobalNews">
     <div class="brandGlobalNewsHead">
       <div><div class="eyebrow">News & mondo fashion</div><h2>${esc(brand)} nel mondo</h2>
         <p>Notizie aziendali e stampa internazionale raccolte dalle fonti monitorate da HUNT. Ogni articolo riporta la fonte. Non sono annunci di lavoro.</p>
       </div>
       <div class="brandGlobalNewsNav"><button type="button" class="worldReadToggle" id="brandReadToggle">Archivio lette</button><button type="button" class="worldReadToggle" id="brandGoFashionNews">Tutte le Fashion News</button></div>
     </div>
     <p id="brandNewsCounter" class="brandNewsCounter"></p>
     <p id="brandNewsError" class="dossierError" role="alert" hidden></p>
     <div id="brandNewsList" class="brandGlobalNewsList"></div>
   </section>
   <section class="section companyOpenRoles">
     <div class="companyOpenRolesHead"><div class="eyebrow">Opportunità nel brand</div><h2>Altre posizioni aperte di ${esc(brand)}</h2>
       <p>Annunci attivi verificati dalle fonti disponibili. Il loro numero dipende dalla copertura dei portali aziendali, non rappresenta necessariamente tutte le assunzioni del brand.</p>
     </div>
     ${companyOpenings.length?`<div class="companyOpenRolesList">
       ${[...companyOpenings].sort((a,b)=>(knownMatches.has(b.id)?1:0)-(knownMatches.has(a.id)?1:0)).map(j=>`<article class="brandJobItem">
         <div class="brandJobContent"><div class="eyebrow">${esc(j.role_family||"Fashion / Luxury")} ${knownMatches.has(j.id)?`· Match ${knownMatches.get(j.id)}%`:""}</div>
           <h3>${esc(j.canonical_title)}</h3><p>${esc(j.city||"Località da verificare")} · ${esc(ageLabel(j.published_at,j.first_seen_at))} · ${esc(j.confidence_label==="VERIFIED ACTIVE"?"Annuncio verificato":"Disponibilità da ricontrollare")}</p>
         </div>
         <div class="brandJobActions">
           <button class="btn" type="button" data-related-job="${esc(j.id)}">Apri dossier</button>
           ${safeRadarUrl(j.primary_apply_url)?`<a href="${esc(j.primary_apply_url)}" class="btn primary" target="_blank" rel="noopener noreferrer">Annuncio originale</a>`:""}
         </div>
       </article>`).join("")}
     </div>`:`<p class="workspaceEmpty">Non risultano altre posizioni attive verificate nelle fonti attualmente collegate a questo brand.</p>`}
   </section>
 </div>

 ${showInterview?`<div class="hide" data-folder-panel="interview">
   <section class="section companyIntro"><div class="eyebrow">Preparazione colloquio</div><h2>Preparazione specifica per questo colloquio</h2><p>Questa sezione userà CV, vacancy, informazioni recenti sul brand e storico della candidatura. Non verrà riempita con domande generiche.</p></section>
 </div>`:""}`);

 bindNav();bindOpportunityActions();
 let brandArchive=false;
 const renderBrandFeed=()=>{
   const area=document.getElementById("brandNewsList");
   const counter=document.getElementById("brandNewsCounter");
   const toggle=document.getElementById("brandReadToggle");
   if(!area)return;
   const rows=companyNews.filter(n=>brandReadIds.has(n.kind+":"+n.id)===brandArchive);
   const unreadCount=companyNews.filter(n=>!brandReadIds.has(n.kind+":"+n.id)).length;
   if(counter)counter.textContent=unreadCount+" da leggere · "+rows.length+(brandArchive?" nell'archivio":" mostrate");
   if(toggle)toggle.textContent=brandArchive?"← Torna alle notizie":"Archivio lette";
   area.innerHTML=rows.length?rows.map(item=>{
     const date=item.date?new Date(item.date):null;
     const when=date&&!Number.isNaN(date.getTime())?date.toLocaleDateString("it-IT"):"Data da verificare";
     return `<article class="brandNewsItem">
       <div class="brandNewsMeta"><span>${esc(item.source)}</span><span>${esc(when)}</span></div>
       <h3>${esc(item.title)}</h3>
       ${item.summary?`<p>${esc(item.summary)}</p>`:""}
       <div class="brandNewsActions"><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Leggi la fonte ↗</a>
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
 const toggleBrandArchive=document.getElementById("brandReadToggle");
 if(toggleBrandArchive)toggleBrandArchive.onclick=()=>{brandArchive=!brandArchive;renderBrandFeed()};
 const goAllNews=document.getElementById("brandGoFashionNews");
 if(goAllNews)goAllNews.onclick=()=>{radarCompanyFilter="all";radarSignalFilter="all";renderWorldRadar()};
 if(brandReadError){const el=document.getElementById("brandNewsError");if(el){el.hidden=false;el.textContent="Stato di lettura non disponibile: "+brandReadError.message}}
 renderBrandFeed();
 document.getElementById("backToFeed").onclick=()=>{
   if(location.hash.startsWith("#job="))history.back();
   else renderOpportunities();
 };
 document.querySelectorAll("[data-folder-tab]").forEach(btn=>btn.onclick=()=>{
   const tab=btn.dataset.folderTab;
   document.querySelectorAll("[data-folder-tab]").forEach(x=>x.classList.toggle("active",x.dataset.folderTab===tab));
   document.querySelectorAll("[data-folder-panel]").forEach(x=>x.classList.toggle("hide",x.dataset.folderPanel!==tab));
 });
 const openBrand=document.getElementById("openCompanyTab");
 if(openBrand)openBrand.onclick=()=>document.querySelector('[data-folder-tab="company"]')?.click();
 const cvSelect=document.getElementById("dossierCv");
 const languageSelect=document.getElementById("dossierLang");
 const selectionNote=()=>{const notice=document.getElementById("dossierMessage");if(notice)notice.textContent="Selezione aggiornata. Premi Aggiorna dossier per applicarla alla lettera e al confronto con i requisiti.";};
 if(cvSelect)cvSelect.onchange=selectionNote;
 if(languageSelect)languageSelect.onchange=selectionNote;
 const generate=document.getElementById("generateDossier");
 if(generate)generate.onclick=async()=>{
   const lang=document.getElementById("dossierLang").value;
   const cvId=document.getElementById("dossierCv").value;
   const info=document.getElementById("dossierMessage");
   const editor=document.getElementById("coverLetterText");
   if(editor&&editor.value!==row.dossier?.ready_to_send_message&&!window.confirm("Hai modifiche non salvate nella lettera. Rigenerando il dossier saranno sostituite. Continuare?"))return;
   if(row.dossier?.generated_from?.user_edited&&!window.confirm("La lettera attuale è stata salvata manualmente. Rigenerarla sostituirà quella versione. Continuare?"))return;
   generate.disabled=true;info.textContent="Preparazione del dossier…";
   try{await requestDossier(jobId,lang,cvId,true);await renderOpportunityFolder(jobId)}
   catch(e){info.textContent=e instanceof Error?e.message:String(e);info.className="dossierError";generate.disabled=false}
 };
 const download=document.getElementById("downloadDossierCv");
 if(download)download.onclick=async()=>{
   try{await downloadPrivateCv(document.getElementById("dossierCv").value)}
   catch(e){document.getElementById("dossierMessage").textContent=e.message||String(e)}
 };
 let lastAiProposal=null;
 const save=document.getElementById("saveCoverLetter");
 if(save)save.onclick=async()=>{
   save.disabled=true;
   const body=document.getElementById("coverLetterText")?.value||"";
   const editedMeta={...(row.dossier?.generated_from||{}),user_edited:true,user_modified_for_style:lastAiProposal===null||body!==lastAiProposal,ai_generated_last_saved:lastAiProposal!==null,user_edited_at:new Date().toISOString()};
   const {error}=await supabase.from("user_job_dossiers").update({ready_to_send_message:body,generated_from:editedMeta,updated_at:new Date().toISOString()}).eq("user_id",currentUser.id).eq("job_id",jobId);
   save.disabled=false;save.textContent=error?"Errore nel salvataggio":"Salvata";
   setTimeout(()=>save.textContent="Salva modifiche",1800);
 };
 const instruction=document.getElementById("letterAiInstruction");
 document.querySelectorAll("[data-ai-feedback]").forEach(x=>x.onclick=()=>{
   if(instruction){instruction.value=x.dataset.aiFeedback||"";instruction.focus()}
 });
 const improve=document.getElementById("polishLetter");
 const writeWithAI=document.getElementById("writeLetterAI");
 const undo=document.getElementById("undoLetter");
 const aiStatus=document.getElementById("letterAiStatus");
 let earlierLetter="";
 let aiEnabled=false;
 if(improve||writeWithAI){
   supabase.functions.invoke("hunt-ai-status",{body:{}}).then(({data,error})=>{
     if(error||!data?.enabled){
       aiEnabled=false;
       if(improve){improve.disabled=true;improve.textContent="AI da attivare"}
       if(writeWithAI){writeWithAI.disabled=true;writeWithAI.textContent="✦ AI da attivare"}
       if(aiStatus)aiStatus.textContent="L'AI non è attiva in questa versione: manca la chiave privata del provider, che va configurata sul server. Puoi comunque modificare e salvare la bozza.";
     }else{
       aiEnabled=true;
       if(aiStatus)aiStatus.textContent="AI attiva: puoi far scrivere una lettera originale o rivedere un testo già modificato. Nessuna modifica viene salvata senza il tuo comando.";
     }
   }).catch(()=>{if(aiStatus)aiStatus.textContent="Impossibile verificare il servizio AI. La scrittura manuale rimane disponibile."});
 }
 const runWriter=async(mode)=>{
   const editor=document.getElementById("coverLetterText");
   if(!editor||!aiEnabled)return;
   const requested=instruction?.value?.trim()||"";
   if(mode==="revise"&&requested.length<3){aiStatus.textContent="Scegli un suggerimento o scrivi cosa cambiare nella lettera.";return}
   if(mode==="generate"&&editor.value!==row.dossier?.ready_to_send_message&&!window.confirm("La nuova lettera sostituirà temporaneamente le modifiche presenti nell'editor. Puoi annullare il cambiamento, ma le modifiche non salvate potrebbero andare perse. Continuare?"))return;
   const trigger=mode==="generate"?writeWithAI:improve;
   const before=editor.value;
   trigger.disabled=true;
   const label=trigger.textContent;
   trigger.textContent=mode==="generate"?"Sto scrivendo…":"Sto migliorando…";
   aiStatus.textContent=mode==="generate"?"HUNT sta collegando le mansioni alla tua esperienza documentata e alle tue preferenze…":"HUNT sta rielaborando la lettera seguendo il tuo feedback…";
   try{
     const cvId=document.getElementById("dossierCv")?.value||row.dossier?.recommended_cv_id;
     const {data,error}=await supabase.functions.invoke("hunt-letter-polish",{
       body:{mode,job_id:jobId,cv_id:cvId,language:document.getElementById("dossierLang")?.value||"en",draft:before,instructions:requested}
     });
     if(error){
       let message=error.message||"Il modello non ha completato la richiesta.";
       try{const details=await error.context?.json?.();if(details?.error)message=details.error}catch{}
       throw new Error(message);
     }
     if(!data?.ok||typeof data.text!=="string")throw new Error(data?.error||"La proposta non è utilizzabile.");
     earlierLetter=before;
     editor.value=data.text;
     lastAiProposal=data.text;
     if(undo)undo.hidden=false;
     aiStatus.textContent="Nuova lettera pronta. Leggila: per conservarla devi premere Salva. Puoi modificarla o ripristinare la versione precedente.";
     editor.focus();
   }catch(e){aiStatus.textContent=e?.message||String(e)}
   finally{trigger.disabled=!aiEnabled;trigger.textContent=label}
 };
 if(improve)improve.onclick=()=>runWriter("revise");
 if(writeWithAI)writeWithAI.onclick=()=>runWriter("generate");
 if(undo)undo.onclick=()=>{
   const editor=document.getElementById("coverLetterText");
   if(editor&&earlierLetter){editor.value=earlierLetter;lastAiProposal=null;undo.hidden=true;aiStatus.textContent="Versione precedente ripristinata; non è stata salvata automaticamente."}
 };
 const copy=document.getElementById("copyCoverLetter");
 if(copy)copy.onclick=async()=>{
   const body=document.getElementById("coverLetterText")?.value||"";
   await navigator.clipboard.writeText(body);
   copy.textContent="Copiata";
   setTimeout(()=>copy.textContent="Copia",1200);
 };
}

function statusLabel(status){
 return ({preparing:"Da preparare",applied:"Candidata",follow_up:"Follow-up",interview:"Colloquio",offer:"Offerta",rejected:"Rifiutata",closed:"Chiusa"})[status]||status;
}

async function renderApplications(){
 currentView="applications";
 const {data:applications,error}=await supabase.from("applications").select("*").eq("user_id",currentUser.id).in("status",["applied","interview","offer","accepted","rejected","withdrawn","declined"]).order("updated_at",{ascending:false});
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
 <p class="lead">Qui trovi soltanto le posizioni per cui hai indicato di esserti candidata. I dossier in preparazione restano in Opportunità.</p>
 <section class="section stack">${error?`<div class="msg bad">${esc(error.message)}</div>`:(cards||'<div class="card">Nessuna candidatura ancora.</div>')}</section>`);
 bindNav();
 document.querySelectorAll("[data-app-folder]").forEach(b=>b.onclick=()=>renderOpportunityFolder(b.dataset.appFolder));
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
    supabase.from("world_news_items").select("id,theme,title,summary,url,published_at,detected_at,relevance_score,world_news_sources(publisher,region,language)").order("published_at",{ascending:false,nullsFirst:false}).limit(350)
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

async function renderProfile(){
 currentView="profile";
 const [p,pref]=await Promise.all([
  getProfile(),
  supabase.from("career_preferences").select("primary_role_families").eq("user_id",currentUser.id).maybeSingle()
 ]);
 const roles=pref.data?.primary_role_families||[];
 app.innerHTML=shell(`<div class="profilePage">
  <div class="eyebrow">Il tuo HUNT</div><h1>Profilo</h1>
  <p class="lead">Le tue informazioni confermate guidano il matching, la scelta del CV e la preparazione delle candidature.</p>
  <div class="profileIdentity section">
    <span><strong>${esc(p?.display_name||"—")}</strong><small>${esc(currentUser.email||"")}</small></span>
    <span><small>Target</small><strong>${esc(Array.isArray(roles)?roles.join(", "):"—")}</strong></span>
    <button class="btn" id="logoutBtn">Esci</button>
  </div>
  <div id="cvManagerRoot"><p class="lead">Caricamento archivio CV privato…</p></div>
 </div>`);
 bindNav();
 document.getElementById("logoutBtn").onclick=logout;
 try{
   const {mountCvManager}=await import("./cv-profile.js?v=20261108-27");
   const root=document.getElementById("cvManagerRoot");
   if(currentView==="profile"&&root)await mountCvManager(root,{supabase,user:currentUser,refresh:renderProfile,roleFamilies:macroAreas});
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
