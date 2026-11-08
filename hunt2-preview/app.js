import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL="https://dfiokxjfgqoboxckcuut.supabase.co";
const SUPABASE_KEY="sb_publishable_9F3UoJWHMYSKSGqTibcZDg_VMRCGsI_";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
const app=document.getElementById("app");
let currentUser=null;
let currentView="today";

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
const countries=[
  "Italia","Francia","Regno Unito","Svizzera","Spagna","Germania","Paesi Bassi","Belgio","Austria","Portogallo",
  "Irlanda","Lussemburgo","Monaco","Danimarca","Svezia","Norvegia","Finlandia","Islanda","Grecia","Polonia",
  "Repubblica Ceca","Ungheria","Romania","Croazia","Slovenia","Slovacchia","Estonia","Lettonia","Lituania",
  "Stati Uniti","Canada","Messico","Brasile","Argentina","Cile","Colombia",
  "Emirati Arabi Uniti","Qatar","Arabia Saudita","Israele","Turchia",
  "Giappone","Corea del Sud","Singapore","Hong Kong","Cina","India","Thailandia","Vietnam","Indonesia","Malesia",
  "Australia","Nuova Zelanda","Sudafrica","Marocco","Egitto","Altro"
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

async function bootstrap(){
 const {data:{session}}=await supabase.auth.getSession();
 currentUser=session?.user||null;
 if(!currentUser){authView();return}
 const profile=await getProfile();
 if(!profile?.onboarding_completed){onboardingView(profile);return}
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
   <div class="grid2" style="margin-top:12px">
    <label><div class="eyebrow">Paese</div><select class="input" id="preferredCountry"><option value="">Seleziona un paese</option>${countries.map(country=>`<option value="${esc(country)}">${esc(country)}</option>`).join("")}</select></label>
    <label><div class="eyebrow">Città</div><input class="input" id="preferredCity" placeholder="Es. Milano"></label>
   </div>
   <div class="actions"><button class="btn" type="button" id="addPreferredLocation">+ Aggiungi località</button></div>
   <div id="preferredLocationsList" class="tagList"></div>

   <div style="height:1px;background:var(--line);margin:20px 0"></div>

   <div class="eyebrow">Dove ti trasferiresti?</div>
   <div class="grid2" style="margin-top:12px">
    <label><div class="eyebrow">Paese</div><select class="input" id="relocationCountry"><option value="">Seleziona un paese</option>${countries.map(country=>`<option value="${esc(country)}">${esc(country)}</option>`).join("")}</select></label>
    <label><div class="eyebrow">Città</div><input class="input" id="relocationCity" placeholder="Es. Parigi"></label>
   </div>
   <div class="actions"><button class="btn" type="button" id="addRelocationLocation">+ Aggiungi località</button></div>
   <div id="relocationLocationsList" class="tagList"></div>
  </section>
  <section class="card"><div class="eyebrow">5 · Primo CV</div><h2>Puoi aggiungerne altri dopo.</h2><div class="grid2" style="margin-top:12px"><label><div class="eyebrow">Nome CV</div><input class="input" name="cvname" placeholder="Es. Retail Merchandising"></label><label><div class="eyebrow">File</div><input class="input" name="cv" type="file" accept=".pdf,.doc,.docx"></label></div></section>
  <div id="onMsg"></div><div class="actions"><button class="btn green" type="submit">Crea il mio HUNT</button><button class="btn" id="logoutOn" type="button">Esci</button></div>
 </form></div>`;
 const preferredLocations=[];
 const relocationLocations=[];
 const renderLocationTags=(id,items,type)=>{document.getElementById(id).innerHTML=items.map((item,index)=>`<span class="locationTag">${esc(item)}<button type="button" data-remove-location="${type}" data-index="${index}" aria-label="Rimuovi">×</button></span>`).join("")};
 const addLocation=(countryId,cityId,items,listId,type)=>{
   const country=document.getElementById(countryId).value;
   const city=document.getElementById(cityId).value.trim();
   if(!country&&!city)return;
   const location=[city,country].filter(Boolean).join(", ");
   if(!items.includes(location))items.push(location);
   document.getElementById(countryId).value="";
   document.getElementById(cityId).value="";
   renderLocationTags(listId,items,type);
 };
 document.getElementById("addPreferredLocation").onclick=()=>addLocation("preferredCountry","preferredCity",preferredLocations,"preferredLocationsList","preferred");
 document.getElementById("addRelocationLocation").onclick=()=>addLocation("relocationCountry","relocationCity",relocationLocations,"relocationLocationsList","relocation");
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

function shell(inner){
 return `<div class="shell"><aside class="side"><div class="logo">HUNT<span>.</span></div><div class="sub">Fashion & Luxury Career Intelligence</div>
 <div class="nav">${["today","opportunities","applications","profile"].map(v=>`<button data-view="${v}" class="${currentView===v?"active":""}">${({today:"Oggi",opportunities:"Opportunità",applications:"Candidature",profile:"Profilo"})[v]}</button>`).join("")}</div>
 <div class="sideFoot">Beta connected · Supabase</div></aside><main class="main">${inner}</main></div>
 <nav class="mobileNav">${["today","opportunities","applications","profile"].map(v=>`<button data-view="${v}">${({today:"Oggi",opportunities:"Opportunità",applications:"Candidature",profile:"Profilo"})[v]}</button>`).join("")}</nav>`;
}

async function renderShell(){
 if(currentView==="today") return renderToday();
 if(currentView==="opportunities") return renderOpportunities();
 if(currentView==="applications") return renderApplications();
 return renderProfile();
}

function bindNav(){
 document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;renderShell()});
}

async function renderToday(){
 const [prof,matches]=await Promise.all([getProfile(),supabase.from("user_job_matches").select("match_score,priority_score,job_id").eq("user_id",currentUser.id).order("priority_score",{ascending:false}).limit(10)]);
 const count=matches.data?.length||0;
 app.innerHTML=shell(`<div class="eyebrow">HUNT Today</div><h1>Ciao ${esc((prof?.display_name||"").split(" ")[0]||"")}. Il tuo radar è acceso.</h1><p class="lead">Il tuo account e il profilo sono collegati al database reale. Il motore vacancy verrà popolato nel prossimo blocco.</p>
 <div class="grid3 section"><div class="card metric"><strong>${count}</strong><span>match nel tuo feed</span></div><div class="card metric"><strong>✓</strong><span>profilo attivo</span></div><div class="card metric"><strong>Private</strong><span>CV storage</span></div></div>
 <section class="card section"><div class="eyebrow">Stato beta</div><h2>La parte utente ora funziona davvero.</h2><p class="lead">Registrazione, sessione, onboarding, preferenze e CV sono sul progetto Supabase HUNT 2. Adesso colleghiamo il motore che importa le vacancy vere.</p></section>`);
 bindNav();
}

async function renderOpportunities(){
 const {data,error}=await supabase.from("user_job_matches").select("match_score,priority_score,job_id").eq("user_id",currentUser.id).order("priority_score",{ascending:false}).limit(50);
 app.innerHTML=shell(`<div class="eyebrow">Personal feed</div><h1>Opportunità</h1><p class="lead">Qui appariranno solo vacancy deduplicate, verificate e ordinate per te.</p><section class="section stack">${error?`<div class="msg bad">${esc(error.message)}</div>`:(data?.length?`<div class="card">${data.length} match disponibili.</div>`:`<div class="card"><h3>Il feed è pronto, ma ancora vuoto.</h3><p class="lead">Non è un errore: non abbiamo ancora avviato l'importazione delle vacancy reali nel nuovo database.</p></div>`)}</section>`);
 bindNav();
}

async function renderApplications(){
 const {data}=await supabase.from("applications").select("*").eq("user_id",currentUser.id).order("updated_at",{ascending:false});
 app.innerHTML=shell(`<div class="eyebrow">Pipeline</div><h1>Candidature</h1><p class="lead">Le candidature salvate dal tuo account resteranno private.</p><section class="section stack">${data?.length?data.map(x=>`<div class="card"><h3>${esc(x.status)}</h3><div class="muted">${esc(x.notes||"Nessuna nota")}</div></div>`).join(""):`<div class="card">Nessuna candidatura ancora.</div>`}</section>`);
 bindNav();
}

async function renderProfile(){
 const [p,pref,cvs]=await Promise.all([getProfile(),supabase.from("career_preferences").select("*").eq("user_id",currentUser.id).maybeSingle(),supabase.from("user_cvs").select("id,name,is_default,created_at").eq("user_id",currentUser.id).eq("active",true).order("created_at",{ascending:false})]);
 const roles=pref.data?.primary_role_families||[];
 app.innerHTML=shell(`<div class="eyebrow">Il tuo HUNT</div><h1>Profilo</h1><p class="lead">Quello che HUNT sa di te e usa per ordinare il mercato.</p>
 <div class="grid2 section"><section class="card"><div class="eyebrow">Profilo</div><div class="profileLine"><span>Nome</span><strong>${esc(p?.display_name||"—")}</strong></div><div class="profileLine"><span>Email</span><strong>${esc(currentUser.email||"")}</strong></div><div class="profileLine"><span>Target</span><strong>${esc(Array.isArray(roles)?roles.join(", "):"—")}</strong></div></section>
 <section class="card"><div class="eyebrow">CV privati</div>${cvs.data?.length?cvs.data.map(x=>`<div class="profileLine"><span>${esc(x.name)}</span><strong>${x.is_default?"Default":""}</strong></div>`).join(""):`<p class="lead">Nessun CV caricato.</p>`}<div class="actions"><button id="logoutBtn" class="btn">Esci dall'account</button></div></section></div>`);
 bindNav();document.getElementById("logoutBtn").onclick=logout;
}

supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user&&!currentUser){currentUser=session.user;setTimeout(bootstrap,0)}});
bootstrap();
