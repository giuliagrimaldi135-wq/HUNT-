const ONESIGNAL_APP_ID="86341c64-d62a-4983-9e20-c242566d14ff";
let HuntOneSignal=null;
function iosDevice(){return /iPad|iPhone|iPod/.test(navigator.userAgent)}
function standaloneMode(){return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true}
function pushNotice(msg,kind="info"){const el=document.getElementById("pushNotice");if(!el)return;el.hidden=!msg;el.className="push-notice "+kind;el.textContent=msg||""}
function pushRegistrationReady(){
  if(!HuntOneSignal)return false;
  const sub=HuntOneSignal.User.PushSubscription;
  return !!(sub.optedIn&&sub.id&&sub.token);
}
async function waitForPushRegistration(timeoutMs=12000){
  const start=Date.now();
  while(Date.now()-start<timeoutMs){
    if(pushRegistrationReady())return true;
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  return false;
}
async function updatePushUI(){
  const btn=document.getElementById("pushBtn");if(!btn)return;
  if(!HuntOneSignal){btn.textContent="🔔 Notifiche";return}
  try{
    const supported=await HuntOneSignal.Notifications.isPushSupported();
    if(!supported){btn.textContent="🔕 Non supportate";btn.disabled=true;return}
    const permission=HuntOneSignal.Notifications.permission;
    const sub=HuntOneSignal.User.PushSubscription;
    if(permission&&sub.optedIn&&sub.id&&sub.token){
      btn.textContent="🔔 Notifiche attive";btn.classList.add("active");
      pushNotice("Notifiche HUNT attive e dispositivo registrato.","success");
    }else if(permission&&sub.optedIn){
      btn.textContent="🔄 Completa notifiche";btn.classList.remove("active");
      pushNotice("Permesso iPhone concesso, ma la registrazione OneSignal non è completa. Tocca il pulsante per riprovare.","warn");
    }else{
      btn.textContent="🔔 Attiva notifiche";btn.classList.remove("active");
    }
  }catch(e){btn.textContent="🔔 Attiva notifiche"}
}
async function enablePush(){
  if(!HuntOneSignal){pushNotice("Il servizio notifiche si sta inizializzando. Riprova tra un momento.","info");return}
  if(iosDevice()&&!standaloneMode()){
    pushNotice("Su iPhone devi aprire HUNT dall’icona nella schermata Home. Se non c’è ancora: Safari → Condividi → Aggiungi alla schermata Home.","warn");
    return;
  }
  try{
    await HuntOneSignal.Notifications.requestPermission();
    if(!HuntOneSignal.Notifications.permission){
      pushNotice("Le notifiche non sono autorizzate nelle impostazioni di iPhone.","warn");
      await updatePushUI();return;
    }
    const sub=HuntOneSignal.User.PushSubscription;
    if(!sub.optedIn)await sub.optIn();
    let ready=await waitForPushRegistration();
    if(!ready){
      try{
        await sub.optOut();
        await new Promise(resolve=>setTimeout(resolve,500));
        await sub.optIn();
        ready=await waitForPushRegistration(15000);
      }catch(_){}
    }
    if(!ready){
      pushNotice("Permesso concesso, ma OneSignal non ha ancora creato l’ID del dispositivo. Riapri HUNT e tocca di nuovo Completa notifiche.","warn");
    }
    await updatePushUI();
  }catch(e){
    const detail=(e&&e.message)?e.message:String(e||"errore sconosciuto");
    pushNotice("Errore attivazione notifiche: "+detail,"warn");
  }
}
function initHuntPush(){
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  OneSignalDeferred.push(async function(OneSignal){
    try{
      await OneSignal.init({
        appId:ONESIGNAL_APP_ID,
        serviceWorkerOverrideForTypical:true,
        path:"/HUNT-/",
        serviceWorkerPath:"OneSignalSDKWorker.js",
        serviceWorkerParam:{scope:"/HUNT-/"},
        autoResubscribe:true,
        notifyButton:{enable:false},
        welcomeNotification:{disable:true}
      });
      HuntOneSignal=OneSignal;
      OneSignal.Notifications.addEventListener("permissionChange",updatePushUI);
      OneSignal.User.PushSubscription.addEventListener("change",updatePushUI);
      await updatePushUI();
    }catch(e){
      const detail=(e&&e.message)?e.message:String(e||"errore sconosciuto");
      pushNotice("Errore notifiche: "+detail,"warn");
      console.error("OneSignal init error",e);
    }
  });
}
window.enablePush=enablePush;

const views={alerts:["01 · Alerts","Avvisi"],hidden:["02 · Outreach","Spontanee"],fashion:["03 · Briefing","Fashion Now"],brands:["04 · Coverage","Brands"],applications:["05 · Agenda","Candidature"]};
let state={jobs:[],signals:[],brands:[],status:{},fashion:[],spontaneous:[],market:[],contacts:[],chatgptAlerts:[],chatgptOutreach:[]};
const navItems=[["alerts","Avvisi"],["hidden","Spontanee"],["fashion","Fashion Now"],["brands","Brands"],["applications","Candidature"]];
function navMarkup(){return navItems.map(([id,label])=>`<button class="nav-btn ${id==="alerts"?"active":""}" data-view="${id}">${label}<span class="nav-badge" data-badge-for="${id}"></span></button>`).join("")}
document.getElementById("desktopNav").innerHTML=navMarkup();document.getElementById("mobileNav").innerHTML=navMarkup();
document.addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)switchView(b.dataset.view)});
document.getElementById("refreshBtn").onclick=load;
document.getElementById("pushBtn").onclick=enablePush;
document.getElementById("searchInput").oninput=renderAlerts;
document.getElementById("scoreFilter").onchange=renderAlerts;
document.getElementById("brandSearch").oninput=renderBrands;
document.getElementById("addApplication").onclick=addApplication;

function switchView(id){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===id));document.getElementById("sectionEyebrow").textContent=views[id][0];document.getElementById("sectionTitle").textContent=views[id][1]}
async function getJSON(path,fallback){try{const r=await fetch(path+"?v="+Date.now(),{cache:"no-store"});if(!r.ok)throw 0;return await r.json()}catch{return fallback}}
function mergeByKey(primary,secondary,keyFn){
 const map=new Map();
 [...secondary,...primary].forEach(x=>{if(!x)return;const k=keyFn(x);if(k)map.set(k,x)});
 return [...map.values()]
}
async function load(){
 const [jobs,signals,brands,status,fashion,spontaneous,market,contacts,chatgptAlerts,chatgptOutreach]=await Promise.all([
  getJSON("./data/jobs.json",[]),getJSON("./data/signals.json",[]),getJSON("./config/brands.json",[]),getJSON("./data/source_status.json",{}),
  getJSON("./data/fashion_news.json",[]),getJSON("./data/spontaneous.json",[]),getJSON("./data/market_pulse.json",[]),getJSON("./config/contacts.json",[]),
  getJSON("./data/chatgpt_alerts.json",[]),getJSON("./data/chatgpt_outreach.json",[])
 ]);
 const mergedJobs=mergeByKey(chatgptAlerts,jobs,x=>x.url||x.key).filter(validItalyJob);
 const mergedOutreach=mergeByKey(chatgptOutreach,spontaneous,x=>(x.brand||"").toLowerCase());
 state={jobs:mergedJobs,signals,brands,status,fashion,spontaneous:mergedOutreach,market,contacts,chatgptAlerts,chatgptOutreach};
 renderAll()
}
function validItalyJob(j){const l=(j.location||"").toLowerCase();const allowed=["milano","milan","firenze","florence","scandicci","roma","rome","londra","london","svizzera","switzerland","zurich","zürich","geneva","genève","lugano","mendrisio","basel","bâle"];return allowed.some(x=>l.includes(x))}
function renderAll(){renderStats();renderAlerts();renderHidden();renderSpontaneous();renderMarket();renderFashion();renderBrands();renderApplications();updateIntelBadges();const t=state.status.generated_at;document.getElementById("lastScan").textContent=t?"Ultimo controllo "+relative(t):"In attesa del controllo"}

function cleanJobTitle(j){let t=(j.title||"").trim();const b=(j.brand||"").trim();if(!b)return t;const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const bt=norm(b),tt=norm(t);if(tt.startsWith(bt+" ")){const words=b.split(/\s+/).length;t=t.split(/\s+/).slice(words).join(" ").replace(/^[-–—:·]+\s*/,"")}return t||j.title}
function publishedAgeDays(j){if(!j.published_at)return null;const ms=Date.now()-new Date(j.published_at).getTime();return Number.isFinite(ms)?ms/86400000:null}
function publishedText(j){if(!j.published_at)return"Data pubblicazione non disponibile";return"Pubblicata "+new Date(j.published_at).toLocaleDateString("it-IT")}
function detectedText(j){return"Rilevata da HUNT "+relative(j.first_seen_at)}
function alertLabel(j){if(j.decision==="stretch_apply")return"STRETCH SENSATO";if(j.decision==="strong")return"FORTE MATCH";const d=publishedAgeDays(j);if(d!==null&&d<=3)return"NUOVO";if(d!==null&&d<=7)return"RECENTE";return"DA VALUTARE"}

function renderStats(){const high=state.jobs.filter(x=>x.score>=85).length;const fresh=state.jobs.filter(x=>{const d=publishedAgeDays(x);return d!==null&&d<=7}).length;const sources=Object.values(state.status.sources||{}).filter(x=>x.ok).length;document.getElementById("stats").innerHTML=[["Opportunità",state.jobs.length],["Alta priorità",high],["Pubblicate ≤7g",fresh],["Fonti live",sources]].map(([a,b])=>`<div class="stat"><strong>${b}</strong><span>${a}</span></div>`).join("")}

function readAlerts(){return new Set(JSON.parse(localStorage.getItem("hunt-read-alerts")||"[]"))}
function markAlertRead(key){
  const s=readAlerts();
  if(s.has(key))return;
  s.add(key);
  localStorage.setItem("hunt-read-alerts",JSON.stringify([...s]));
  updateAlertBadge();
}
function updateAlertBadge(){
  const read=readAlerts(),ignored=ignoredJobs(),apps=applications(),appliedUrls=new Set(apps.map(a=>a.url).filter(Boolean));
  const unread=state.jobs.filter(j=>j.score>=85&&!read.has(j.key)&&!ignored.has(j.key)&&!appliedUrls.has(j.url)).length;
  document.querySelectorAll('[data-badge-for="alerts"]').forEach(x=>{x.textContent=unread||"";x.style.display=unread?"inline-flex":"none"});
}
let alertObserver=null;
function observeAlertReads(){
  if(alertObserver)alertObserver.disconnect();
  alertObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const el=entry.target;
      clearTimeout(el._readTimer);
      el._readTimer=setTimeout(()=>{
        if(el.isConnected){markAlertRead(el.dataset.alertKey);alertObserver.unobserve(el)}
      },900);
    });
  },{threshold:.65});
  document.querySelectorAll("[data-alert-key]").forEach(el=>alertObserver.observe(el));
}
function ignoredJobs(){return new Set(JSON.parse(localStorage.getItem("hunt-ignored-jobs")||"[]"))}
function ignoreJob(key){const s=ignoredJobs();s.add(key);localStorage.setItem("hunt-ignored-jobs",JSON.stringify([...s]));markAlertRead(key);renderAlerts()}
window.ignoreJob=ignoreJob;
function restoreIgnored(){localStorage.removeItem("hunt-ignored-jobs");renderAlerts()}
window.restoreIgnored=restoreIgnored;
function renderAlerts(){const q=document.getElementById("searchInput").value.toLowerCase();const min=+document.getElementById("scoreFilter").value;const apps=applications();const appliedUrls=new Set(apps.map(a=>a.url).filter(Boolean));const ignored=ignoredJobs();let jobs=[...state.jobs].filter(j=>!ignored.has(j.key)&&!appliedUrls.has(j.url)&&j.score>=min&&(`${j.brand} ${j.title} ${j.location||""}`.toLowerCase().includes(q))).sort((a,b)=>{const milano=x=>(x.location||"").toLowerCase().includes("milano")||(x.location||"").toLowerCase().includes("milan");const ap=milano(a)?1:0,bp=milano(b)?1:0;const af=publishedAgeDays(a),bf=publishedAgeDays(b);const ar=af!==null&&af<=7?1:0,br=bf!==null&&bf<=7?1:0;return bp-ap||br-ar||b.score-a.score||new Date(b.published_at||0)-new Date(a.published_at||0)});
document.getElementById("alertCount").textContent=jobs.length;
updateAlertBadge();
document.getElementById("alertsList").innerHTML=jobs.length?jobs.map(j=>alertCard(j)).join(""):`<div class="empty">Nessun avviso corrisponde ai filtri.</div>`;
observeAlertReads()}

function alertCard(j){
 const title=cleanJobTitle(j);
 const stretch=j.decision==="stretch_apply"||j.junior_fit===false||((j.years_required||0)>=2);
 const verdict=j.why_fit||j.fit_explanation||((j.years_required||0)>=2?"Stretch da valutare con attenzione.":"Ruolo coerente con il profilo.");
 const priority=(j.priority||((j.score||0)>=90?"ALTA":(j.score||0)>=80?"MEDIA":"DA VALUTARE")).toUpperCase();
 const detected=j.detected_at||j.first_seen_at;
 const source=j.source_type==="ChatGPT HUNT"?"ChatGPT HUNT":(j.source_name||"HUNT Radar");
 return `<article class="alert-card" data-alert-key="${j.key}">
 <div class="alert-top"><span class="alert-label">${esc(priority)}</span><span class="alert-score">${j.score}% MATCH</span></div>
 <h3>${esc(j.brand)}</h3><h4>${esc(title)}</h4>
 <div class="alert-location">📍 ${esc(j.location||"")}</div>
 <div class="meta">${publishedText(j)} · ${detected?"Rilevata "+relative(detected):"rilevazione n/a"} · ${esc(source)}</div>
 <div class="hunt-verdict"><strong>Perché è coerente</strong><span>${esc(verdict)}</span></div>
 <p>${esc((j.reasons||[]).slice(0,5).join(" · "))}</p>
 <div class="chips"><span class="chip">${esc(j.role_family||"Fashion")}</span>${stretch?'<span class="chip">STRETCH</span>':'<span class="chip high">JUNIOR FIT</span>'}</div>
 <div class="alert-actions"><button class="primary" onclick="openJobDossier('${j.key}')">Apri folder candidatura</button><button class="secondary" onclick="markApplied('${j.key}')">Ho applicato</button><button class="secondary" onclick="ignoreJob('${j.key}')">Ignora</button><a href="${escAttr(j.url)}" target="_blank" rel="noopener">Candidati / annuncio</a></div>
 </article>`
}

function signalTypeLabel(t){return({store_opening:"Apertura / retail",expansion:"Espansione",category_launch:"Nuovo prodotto/categoria",hiring_velocity:"Hiring",management_change:"Management",financial_momentum:"Business",social_signal:"Social / buzz",industry_news:"Industry",energy:"Energia & costi",consumer:"Domanda & consumi",currency:"Valute",luxury_market:"Luxury market",sourcing:"Sourcing & materiali",trade:"Commercio & tariffe"})[t]||"Segnale"}
function storageSet(name){return new Set(JSON.parse(localStorage.getItem(name)||"[]"))}
function saveStorageSet(name,set){localStorage.setItem(name,JSON.stringify([...set]))}
function dismissSignal(key){const x=storageSet("hunt-read-signals");x.add(key);saveStorageSet("hunt-read-signals",x);renderHidden();updateIntelBadges()}
function dismissFashion(key){const x=storageSet("hunt-read-fashion");x.add(key);saveStorageSet("hunt-read-fashion",x);renderFashion();updateIntelBadges()}
function dismissSpontaneous(key){const x=storageSet("hunt-read-spontaneous");x.add(key);saveStorageSet("hunt-read-spontaneous",x);renderSpontaneous();renderHidden();updateIntelBadges()}
function dismissMarket(key){const x=storageSet("hunt-read-market");x.add(key);saveStorageSet("hunt-read-market",x);renderMarket();updateIntelBadges()}
window.dismissSignal=dismissSignal;window.dismissFashion=dismissFashion;window.dismissSpontaneous=dismissSpontaneous;window.dismissMarket=dismissMarket;

function updateIntelBadges(){
 const rs=storageSet("hunt-read-signals"),rf=storageSet("hunt-read-fashion"),rp=storageSet("hunt-read-spontaneous"),rm=storageSet("hunt-read-market");
 const h=state.signals.filter(x=>!rs.has(x.key)).length+state.spontaneous.filter(x=>!rp.has(x.key)).length;
 const n=state.fashion.filter(x=>!rf.has(x.key)).length+state.market.filter(x=>!rm.has(x.key)).length;
 document.querySelectorAll('[data-badge-for="hidden"]').forEach(x=>{x.textContent=h||"";x.style.display=h?"inline-flex":"none"});
 document.querySelectorAll('[data-badge-for="fashion"]').forEach(x=>{x.textContent=n||"";x.style.display=n?"inline-flex":"none"});
}
function watchReason(x){
 const r=(x.reasons||[]).slice(0,3);
 return r.length?r.join(" · "):(x.why_now||"Più segnali recenti meritano attenzione.");
}
function renderHidden(){
 const read=storageSet("hunt-read-signals");
 const list=[...state.signals].filter(x=>!read.has(x.key)).sort((a,b)=>new Date(b.published_at||b.detected_at||0)-new Date(a.published_at||a.detected_at||0)).slice(0,40);
 let watch=[...state.spontaneous].sort((a,b)=>b.score-a.score).slice(0,5);
 if(!watch.length){
   const map={};state.signals.forEach(x=>{if(!x.brand)return;(map[x.brand]??=[]).push(x)});
   watch=Object.entries(map).map(([brand,ss])=>({brand,score:Math.max(...ss.map(x=>x.score||0)),reasons:[...new Set(ss.map(x=>signalTypeLabel(x.signal_type)))].slice(0,3)})).sort((a,b)=>b.score-a.score).slice(0,5);
 }
 const watchHtml=watch.length?`<div class="watch-reasons">${watch.map(x=>`<div><strong>${esc(x.brand)}</strong><span>${esc(watchReason(x))}</span></div>`).join("")}</div>`:"";
 document.getElementById("hiddenSummary").innerHTML=`<span class="hero-kicker">HUNT READOUT</span><p><strong>${list.length} segnali non letti</strong>. Qui entrano solo movimenti che possono anticipare un'opportunità, non vacancy.</p>${watchHtml}`;
 document.getElementById("signals").innerHTML=list.length?list.map(x=>`<article class="news-card"><div><span class="news-topic">${esc(signalTypeLabel(x.signal_type))}</span><h3>${esc(x.brand||"Fashion")} — ${esc(x.headline)}</h3><div class="meta">${x.source?esc(x.source)+" · ":""}${relative(x.published_at||x.detected_at)}</div><p><strong>Per te:</strong> ${esc(x.reason||"Segnale da incrociare con crescita, retail e hiring.")}</p><div class="news-actions"><button class="secondary" onclick="dismissSignal('${x.key}')">✓ Letto</button>${x.url?`<a href="${escAttr(x.url)}" target="_blank" rel="noopener" onclick="dismissSignal('${x.key}')">Apri fonte</a>`:""}</div></div></article>`).join(""):`<div class="empty">Hai letto tutti i segnali recenti.</div>`;
}
function brandMentions(text,brand){
 const norm=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ");
 const t=norm(text),tokens=norm(brand).split(/\s+/).filter(x=>x.length>2&&!["group","milano","maison"].includes(x));
 return tokens.length?tokens.slice(0,2).every(x=>t.includes(x)):false
}
function applicationAngle(x){
 const r=(x.reasons||[]).join(" ").toLowerCase();
 if(r.includes("apertura")||r.includes("store"))return "Usa l'apertura/espansione retail come motivo concreto per scrivere adesso. Collega il tuo profilo a assortimento, stock, merchandising, retail operations e coordinamento del lancio.";
 if(r.includes("categoria")||r.includes("lancio"))return "Collega il lancio prodotto al tuo interesse per assortment, pricing, merchandising, buying e go-to-market.";
 if(r.includes("hiring"))return "Il team sembra in rafforzamento: candidati prima che esca il ruolo perfetto e posizionati su merchandising/buying/planning/wholesale.";
 if(r.includes("leadership"))return "La nuova leadership può cambiare priorità e team: mostra di conoscere il momento del brand e proponiti con un profilo flessibile ma focalizzato sul prodotto.";
 if(r.includes("social"))return "Il brand sta vivendo un momento di attenzione: non basta citare il buzz. Collegalo a prodotto, cliente, retail e crescita commerciale.";
 return "Apri la candidatura con il motivo concreto per cui questo è un buon momento per contattare il brand, poi collega il tuo profilo a merchandising, buying, planning, product e retail."
}
function brandFolderData(brandName){
 const signals=state.signals.filter(y=>y.brand===brandName).sort((a,b)=>new Date(b.published_at||b.detected_at||0)-new Date(a.published_at||a.detected_at||0)).slice(0,10);
 const news=state.fashion.filter(y=>brandMentions(y.headline,brandName)).sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0)).slice(0,8);
 const jobs=state.jobs.filter(y=>y.brand===brandName).sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,8);
 const brand=state.brands.find(y=>y.name===brandName);
 const contact=state.contacts.find(y=>y.brand_id===brand?.id||y.brand===brandName)||null;
 const outreach=state.spontaneous.find(y=>y.brand===brandName)||null;
 return {signals,news,jobs,brand,contact,outreach}
}
function openJobDossier(key){
 const j=state.jobs.find(x=>x.key===key);if(!j)return;
 const d=brandFolderData(j.brand);
 const signalHtml=d.signals.length?d.signals.map(y=>`<div class="dossier-item"><span class="news-topic">${esc(signalTypeLabel(y.signal_type))}</span><h4>${esc(y.headline)}</h4><p>${esc(y.reason||"Segnale utile da conoscere.")}</p>${y.url?`<a href="${escAttr(y.url)}" target="_blank" rel="noopener">Fonte</a>`:""}</div>`).join(""):`<p class="dossier-muted">Nessun segnale recente specifico.</p>`;
 const newsHtml=d.news.length?d.news.map(y=>`<div class="dossier-item"><h4>${esc(y.headline)}</h4><div class="meta">${esc(y.source||"News")} · ${relative(y.published_at)}</div><p>${esc(y.why_it_matters||"Notizia utile per preparare candidatura e colloquio.")}</p>${y.url?`<a href="${escAttr(y.url)}" target="_blank" rel="noopener">Leggi</a>`:""}</div>`).join(""):`<p class="dossier-muted">Nessuna news specifica recente.</p>`;
 const otherJobs=d.jobs.filter(x=>x.key!==key).map(y=>`<div class="dossier-job"><div><strong>${esc(cleanJobTitle(y))}</strong><span>${esc(y.location||"")} · ${y.score}% match</span></div><a href="${escAttr(y.url)}" target="_blank">Apri</a></div>`).join("");
 const cv=j.recommended_cv==="fashion_mgmt"?"Fashion Management":"Merchandising & Buying";
 const why=j.why_fit||j.fit_explanation||(j.reasons||[]).join(" · ");
 const outreach=d.outreach;
 const mailDraft=outreach?.email_draft||`Buongiorno,\n\nvi contatto in riferimento alla posizione ${cleanJobTitle(j)} a ${j.location||"Milano"}. Ho concluso Fashion Management presso Istituto Marangoni e sono interessata a sviluppare il mio percorso nelle aree merchandising, buying, product e retail.\n\nLe attività descritte nella posizione sono particolarmente coerenti con il mio interesse per analisi commerciale del prodotto, assortimenti e performance retail.\n\nAllego il mio CV e resto disponibile per un confronto.\n\nCordiali saluti,\nGiulia Grimaldi`;
 document.getElementById("dossierContent").innerHTML=`
   <span class="hero-kicker">HUNT APPLICATION FOLDER</span>
   <h2 id="dossierTitle">${esc(j.brand)} — ${esc(cleanJobTitle(j))}</h2>
   <div class="dossier-score">${j.score}<span>/100</span></div>
   <section class="dossier-verdict"><strong>Perché candidarti</strong><p>${esc(why)}</p><div class="signal-stack">${(j.reasons||[]).slice(0,6).map(r=>`<span>${esc(r)}</span>`).join("")}</div></section>
   <section class="dossier-section"><h3>Scheda candidatura</h3><div class="dossier-plan">
     <div><b>Priorità</b><span>${esc(j.priority||((j.score||0)>=90?"ALTA":"MEDIA"))}</span></div>
     <div><b>Area</b><span>${esc(j.role_family||"Fashion / Luxury")}</span></div>
     <div><b>CV</b><span>${esc(cv)}</span></div>
     <div><b>Pubblicazione</b><span>${esc(j.published_at?new Date(j.published_at).toLocaleDateString("it-IT"):"Da verificare")}</span></div>
   </div></section>
   <section class="dossier-section"><h3>Email / messaggio di partenza</h3><div class="email-draft"><pre>${esc(mailDraft)}</pre></div></section>
   <section class="dossier-section"><h3>News e segnali da sapere prima di candidarti</h3>${signalHtml}${newsHtml}</section>
   <section class="dossier-section"><h3>Altre posizioni del brand</h3>${otherJobs||'<p class="dossier-muted">Nessun’altra posizione coerente rilevata.</p>'}</section>
   <div class="dossier-actions"><button class="primary" onclick="prepareJobApplication('${j.key}')">Salva in preparazione</button><a class="primary dossier-apply-link" href="${escAttr(j.url)}" target="_blank" rel="noopener">Apri candidatura</a><button class="secondary" onclick="markApplied('${j.key}')">✓ Ho applicato</button><button class="secondary" onclick="closeDossier()">Chiudi</button></div>
 `;
 const modal=document.getElementById("dossierModal");modal.hidden=false;document.body.classList.add("modal-open")
}
window.openJobDossier=openJobDossier;
function dossierData(key){
 const x=state.spontaneous.find(y=>y.key===key);if(!x)return null;
 const signals=state.signals.filter(y=>y.brand===x.brand).sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0)).slice(0,8);
 const news=state.fashion.filter(y=>brandMentions(y.headline,x.brand)).sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0)).slice(0,6);
 const jobs=state.jobs.filter(y=>y.brand===x.brand).sort((a,b)=>b.score-a.score).slice(0,5);
 const brand=state.brands.find(y=>y.name===x.brand);
 const contact=state.contacts.find(y=>y.brand_id===brand?.id||y.brand===x.brand)||null;
 return {x,signals,news,jobs,brand,contact}
}
function openDossier(key){
 const d=dossierData(key);if(!d)return;
 const {x,signals,news,jobs,brand,contact}=d;
 const signalHtml=signals.length?signals.map(y=>`<div class="dossier-item"><span class="news-topic">${esc(signalTypeLabel(y.signal_type))}</span><h4>${esc(y.headline)}</h4><p>${esc(y.reason||"Segnale da monitorare.")}</p>${y.url?`<a href="${escAttr(y.url)}" target="_blank" rel="noopener">Fonte</a>`:""}</div>`).join(""):`<p class="dossier-muted">Nessun altro segnale recente disponibile.</p>`;
 const newsHtml=news.length?news.map(y=>`<div class="dossier-item"><h4>${esc(y.headline)}</h4><div class="meta">${esc(y.source||"News")} · ${relative(y.published_at)}</div><p>${esc(y.why_it_matters||"Notizia utile da conoscere.")}</p>${y.url?`<a href="${escAttr(y.url)}" target="_blank" rel="noopener">Leggi</a>`:""}</div>`).join(""):`<p class="dossier-muted">Nessuna altra news recente specifica sul brand.</p>`;
 const jobsHtml=jobs.length?jobs.map(y=>`<div class="dossier-job"><div><strong>${esc(cleanJobTitle(y))}</strong><span>${esc(y.location||"")} · ${y.score}% match</span></div><a href="${escAttr(y.url)}" target="_blank" rel="noopener">Apri</a></div>`).join(""):`<p class="dossier-muted">HUNT non sta vedendo al momento una vacancy coerente: per questo il suggerimento è spontaneo.</p>`;
 const careerUrl=x.source_url||brand?.url||null;
 const career=careerUrl?`<a class="dossier-link" href="${escAttr(careerUrl)}" target="_blank" rel="noopener">Apri fonte career/brand</a>`:"";
 const contactValue=x.contact||contact?.email||null;
 const contactKind=x.contact_kind||contact?.kind||"Recruiting / LinkedIn";
 const contactSource=x.contact_source_url||contact?.source_url||null;
 const isEmail=contactValue&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue);
 const mailSubject=encodeURIComponent(x.email_subject||"Candidatura spontanea – Giulia Grimaldi | Merchandising / Buying");
 const contactHtml=contactValue?`<div class="contact-card"><div><span class="contact-kind">${esc(contactKind)}</span><strong>${esc(contactValue)}</strong><small>${esc(contact?.note||"Canale suggerito: verifica sempre la fonte prima dell’invio.")}</small></div><div class="contact-actions">${isEmail?`<a href="mailto:${escAttr(contactValue)}?subject=${mailSubject}">Scrivi email</a>`:""}${contactSource?`<a href="${escAttr(contactSource)}" target="_blank" rel="noopener">Verifica fonte</a>`:""}</div></div>`:`<div class="contact-card muted"><div><span class="contact-kind">CONTATTO</span><strong>Nessun contatto recruiting verificato</strong><small>HUNT non inventa indirizzi: usa la career page ufficiale oppure cerca il ruolo/persona suggerita su LinkedIn.</small></div></div>`;
 const emailDraft=x.email_draft||`Buongiorno,\n\nho seguito i recenti sviluppi di ${x.brand} e vorrei sottoporvi il mio profilo per eventuali opportunità junior nelle aree merchandising, buying, product o retail planning.\n\nHo concluso Fashion Management presso Istituto Marangoni e sono particolarmente interessata a ruoli legati al prodotto, agli assortimenti e alle performance commerciali.\n\nAllego il mio CV e resto disponibile per un confronto.\n\nCordiali saluti,\nGiulia Grimaldi`;
 const cvLabel=x.recommended_cv==="fashion_mgmt"?"Fashion Management":"Merchandising & Buying";
 document.getElementById("dossierContent").innerHTML=`
   <span class="hero-kicker">HUNT APPLICATION FOLDER</span>
   <h2 id="dossierTitle">${esc(x.brand)}</h2>
   <div class="dossier-score">${x.score}<span>/100</span></div>
   <section class="dossier-verdict"><strong>Perché candidarti adesso</strong><p>${esc(x.why_now||"Il brand mostra segnali concreti che rendono sensato un outreach mirato.")}</p><div class="signal-stack">${(x.reasons||[]).map(r=>`<span>${esc(r)}</span>`).join("")}</div></section>
   <section class="dossier-section"><h3>Scheda candidatura</h3>
     <div class="dossier-plan">
       <div><b>Priorità</b><span>${esc(x.priority||((x.score||0)>=90?"ALTA":"MEDIA"))}</span></div>
       <div><b>Area</b><span>${esc(x.area||"Merchandising / Buying / Product / Retail")}</span></div>
       <div><b>CV</b><span>${esc(cvLabel)}</span></div>
       <div><b>Angolo del messaggio</b><span>${esc(applicationAngle(x))}</span></div>
     </div>
   </section>
   <section class="dossier-section"><h3>Email pronta da personalizzare</h3><div class="email-draft"><pre>${esc(emailDraft)}</pre></div></section>
   <section class="dossier-section"><h3>Dove contattare il brand</h3>${contactHtml}<div class="dossier-contact-note">${contact?.recommended?"Questo è un canale utilizzabile per una candidatura spontanea.":"Se non è recruiting, usalo solo come fallback: prima controlla la career page ufficiale."}</div>${career}</section>
   <section class="dossier-section"><h3>Segnali da sapere</h3>${signalHtml}</section>
   <section class="dossier-section"><h3>News del brand da sapere</h3>${newsHtml}</section>
   <section class="dossier-section"><h3>Posizioni HUNT già aperte</h3>${jobsHtml}</section>
   <section class="dossier-section"><h3>Prima di inviare</h3>
     <div class="dossier-checklist"><span>□ So spiegare perché questo brand adesso</span><span>□ Ho adattato CV e headline all’area giusta</span><span>□ Ho letto le news e i segnali qui sopra</span><span>□ Ho controllato career page e contatto ufficiale</span></div>
   </section>
   <div class="dossier-actions"><button class="primary" onclick="saveSpontaneous('${x.key}','Da preparare')">Salva in preparazione</button><button class="secondary strong" onclick="saveSpontaneous('${x.key}','Applied')">✓ Già candidata</button><button class="secondary" onclick="closeDossier()">Chiudi</button></div>
 `;
 const modal=document.getElementById("dossierModal");modal.hidden=false;document.body.classList.add("modal-open")
}
function closeDossier(){const m=document.getElementById("dossierModal");if(m)m.hidden=true;document.body.classList.remove("modal-open")}
window.openDossier=openDossier;window.closeDossier=closeDossier;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDossier()});

function saveSpontaneous(key,status){
 const x=state.spontaneous.find(y=>y.key===key);if(!x)return;
 const a=applications(),now=new Date().toISOString();
 let item=a.find(y=>y.spontaneous_key===key);
 if(!item){
   item={id:Date.now(),brand:x.brand,role:"Candidatura spontanea",status,created_at:now,updated_at:now,source:x.email_draft?"ChatGPT Luxury Outreach":"HUNT Intelligence",spontaneous_key:key,url:x.source_url||x.url||null};
   if(status==="Applied")item.applied_at=now;
   a.unshift(item)
 }else{
   item.status=status;item.updated_at=now;if(status==="Applied"&&!item.applied_at)item.applied_at=now
 }
 saveApplications(a);dismissSpontaneous(key);closeDossier();switchView("applications")
}
function markSpontaneousApplied(key){saveSpontaneous(key,"Applied")}
window.saveSpontaneous=saveSpontaneous;window.markSpontaneousApplied=markSpontaneousApplied;
function prepareSpontaneous(key){openDossier(key)}
window.prepareSpontaneous=prepareSpontaneous;
function renderSpontaneous(){
 const read=storageSet("hunt-read-spontaneous");
 const apps=applications(),done=new Set(apps.map(a=>a.spontaneous_key).filter(Boolean));
 const list=[...state.spontaneous].filter(x=>!read.has(x.key)&&!done.has(x.key)).sort((a,b)=>b.score-a.score).slice(0,15);
 document.getElementById("spontaneousList").innerHTML=list.length?list.map(x=>`<article class="spontaneous-card"><div class="spont-score">${x.score}</div><div><span class="news-topic">${esc(x.action||"Candidatura spontanea")}</span><h3>${esc(x.brand)}</h3><p><strong>Perché adesso:</strong> ${esc(x.why_now||"Più segnali recenti rendono questo brand interessante per un outreach mirato.")}</p><div class="signal-stack">${(x.reasons||[]).slice(0,5).map(r=>`<span>${esc(r)}</span>`).join("")}</div><div class="news-actions"><button class="primary" onclick="openDossier('${x.key}')">📁 Apri folder candidatura</button><button class="secondary strong" onclick="markSpontaneousApplied('${x.key}')">✓ Già candidata</button><button class="secondary" onclick="dismissSpontaneous('${x.key}')">Ignora</button>${x.url?`<a href="${escAttr(x.url)}" target="_blank" rel="noopener">Fonte</a>`:""}</div></div></article>`).join(""):`<div class="empty">Nessuna nuova candidatura spontanea abbastanza forte al momento.</div>`;
}
function renderMarket(){
 const el=document.getElementById("marketPulse");if(!el)return;
 const read=storageSet("hunt-read-market");
 const list=[...state.market].filter(x=>!read.has(x.key)).sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0)).slice(0,30);
 el.innerHTML=list.length?list.map(x=>`<article class="news-card market-card"><div><span class="news-topic">${esc(signalTypeLabel(x.topic))}</span><h3>${esc(x.headline)}</h3><div class="meta">${esc(x.source||"Market")} · ${relative(x.published_at)}</div><p><strong>Perché conta per te:</strong> ${esc(x.why_it_matters||"Può influire su domanda, margini, retail e hiring nel fashion/luxury.")}</p><div class="news-actions"><button class="secondary" onclick="dismissMarket('${x.key}')">✓ Letto</button>${x.url?`<a href="${escAttr(x.url)}" target="_blank" rel="noopener" onclick="dismissMarket('${x.key}')">Leggi</a>`:""}</div></div></article>`).join(""):`<div class="empty">Hai letto tutto il Market Pulse recente.</div>`;
}
function renderFashion(){
 const read=storageSet("hunt-read-fashion");
 const list=[...state.fashion].filter(x=>!read.has(x.key)).sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0)).slice(0,60);
 document.getElementById("fashionNews").innerHTML=list.length?list.map(x=>`<article class="news-card"><div><span class="news-topic">${esc(signalTypeLabel(x.topic))}</span><h3>${esc(x.headline)}</h3><div class="meta">${esc(x.source||"News")} · ${relative(x.published_at)}</div><p><strong>Per il colloquio:</strong> ${esc(x.why_it_matters||"Tieni a mente il fatto e collegalo al brand e al ruolo.")}</p><div class="news-actions"><button class="secondary" onclick="dismissFashion('${x.key}')">✓ Letto</button>${x.url?`<a href="${escAttr(x.url)}" target="_blank" rel="noopener" onclick="dismissFashion('${x.key}')">Leggi</a>`:""}</div></div></article>`).join(""):`<div class="empty">Hai letto tutte le notizie recenti.</div>`;
}

function renderBrands(){
 const q=document.getElementById("brandSearch").value.toLowerCase();
 const list=state.brands.filter(b=>`${b.name} ${b.market}`.toLowerCase().includes(q));
 document.getElementById("brandGrid").innerHTML=list.map(b=>{
   const st=state.status.sources?.[b.id];let career,cls,explain;
   if(st?.ok&&(st.candidates||0)>0){career="● CAREER LETTA";cls="live";explain="HUNT sta leggendo elementi dalla fonte ufficiale e filtra quelli coerenti con te."}
   else if(st?.ok){career="◐ FONTE RAGGIUNGIBILE";cls="pending";explain="Il sito ufficiale risponde, ma in questo ciclo non sono stati letti job compatibili o il markup va ancora migliorato."}
   else if(b.enabled){career="◌ COLLEGAMENTO DA MIGLIORARE";cls="pending";explain="Fonte ufficiale presente, ma il collegamento automatico non sta funzionando bene."}
   else{career="○ NESSUN ATS STRUTTURATO";cls="pending";explain="Nessuna career source automatica affidabile; il brand resta comunque monitorato da HUNT Intelligence."}
   return `<div class="brand-card"><h3>${esc(b.name)}</h3><div class="source-status live">● INTELLIGENCE ATTIVA</div><div class="source-status ${cls}">${career}</div><p class="meta">${esc(b.market||"fashion/luxury")}</p><p class="brand-explain">${explain}</p></div>`
 }).join("")
}

function applications(){const a=JSON.parse(localStorage.getItem("hunt-applications")||"[]");let changed=false;a.forEach(x=>{if(x.status==="To apply"){x.status="Da preparare";changed=true}});if(changed)localStorage.setItem("hunt-applications",JSON.stringify(a));return a}
function saveApplications(x){localStorage.setItem("hunt-applications",JSON.stringify(x));renderApplications();renderAlerts();renderSpontaneous()}
function markApplied(key){
 const j=state.jobs.find(x=>x.key===key);if(!j)return;markAlertRead(key);
 const a=applications(),now=new Date().toISOString();
 if(!a.some(x=>x.url===j.url)){a.unshift({id:Date.now(),key:j.key,brand:j.brand,role:cleanJobTitle(j),url:j.url,status:"Applied",created_at:now,applied_at:now,updated_at:now,source:j.source_type||"HUNT"})}
 saveApplications(a);closeDossier();switchView("applications")
}
window.markApplied=markApplied;
function prepareJobApplication(key){
 const j=state.jobs.find(x=>x.key===key);if(!j)return;
 const a=applications(),now=new Date().toISOString();
 if(!a.some(x=>x.url===j.url)){a.unshift({id:Date.now(),key:j.key,brand:j.brand,role:cleanJobTitle(j),url:j.url,status:"Da preparare",created_at:now,updated_at:now,source:j.source_type||"HUNT"})}
 saveApplications(a);switchView("applications")
}
window.prepareJobApplication=prepareJobApplication;
function addApplication(){const brand=prompt("Brand?");if(!brand)return;const role=prompt("Ruolo?")||"Candidatura spontanea";const now=new Date().toISOString();saveApplications([{id:Date.now(),brand,role,status:"Applied",created_at:now,applied_at:now,updated_at:now,source:"Manuale"},...applications()])}
function appBaseDate(a){return a.applied_at||a.created_at||a.updated_at||new Date().toISOString()}
function appDays(a){return Math.max(0,Math.floor((Date.now()-new Date(appBaseDate(a)).getTime())/86400000))}
function updateApplication(id,status){const a=applications();const x=a.find(y=>y.id===id);if(!x)return;const now=new Date().toISOString();x.status=status;x.updated_at=now;if(status==="Applied"&&!x.applied_at)x.applied_at=now;if(status==="Interview"&&!x.interview_at)x.interview_at=now;saveApplications(a)}
window.updateApplication=updateApplication;
function removeApplication(id){saveApplications(applications().filter(x=>x.id!==id))}
window.removeApplication=removeApplication;
function openApplicationDossier(id){const a=applications().find(x=>x.id===id);if(!a)return;if(a.spontaneous_key)openDossier(a.spontaneous_key);else if(a.key)openJobDossier(a.key)}
window.openApplicationDossier=openApplicationDossier;
function renderApplications(){
 const a=applications().sort((x,y)=>new Date(y.updated_at||appBaseDate(y))-new Date(x.updated_at||appBaseDate(x)));
 document.querySelectorAll('[data-badge-for="applications"]').forEach(x=>{x.textContent="";x.style.display="none"});
 if(!a.length){document.getElementById("applicationsList").innerHTML='<div class="empty">Nessuna candidatura ancora. Da Avvisi o Spontanee puoi salvarla e aprire il suo folder di preparazione.</div>';return}
 const groups=[
  ["Da preparare",a.filter(x=>x.status==="Da preparare")],
  ["Inviate / follow-up",a.filter(x=>["Applied","Follow-up"].includes(x.status))],
  ["Colloqui / offerte",a.filter(x=>["Interview","Offer"].includes(x.status))],
  ["Chiuse",a.filter(x=>x.status==="Rejected")]
 ];
 const card=x=>{
   const days=appDays(x),isPrep=x.status==="Da preparare",follow=days>=7&&["Applied","Follow-up"].includes(x.status);
   const dateValue=new Date(x.updated_at||x.applied_at||x.created_at).toLocaleDateString("it-IT");
   return `<article class="application-card"><div class="application-days"><strong>${days}</strong><span>${isPrep?"giorni prep":"giorni"}</span></div><div class="application-main"><h3>${esc(x.brand)} — ${esc(x.role)}</h3><div class="meta">Aggiornata ${dateValue} · Stato: <strong>${esc(x.status)}</strong> · ${esc(x.source||"Manuale")}</div>${follow?'<p class="follow-warning">⚠️ Valuta un follow-up.</p>':""}<div class="stage-actions"><button onclick="updateApplication(${x.id},'Da preparare')">Da preparare</button><button onclick="updateApplication(${x.id},'Applied')">Candidata</button><button onclick="updateApplication(${x.id},'Interview')">Colloquio</button><button onclick="updateApplication(${x.id},'Follow-up')">Follow-up</button><button onclick="updateApplication(${x.id},'Rejected')">Rifiutata</button><button onclick="updateApplication(${x.id},'Offer')">Offerta</button></div></div><div class="app-links">${(x.spontaneous_key||x.key)?`<button class="text-btn folder-btn" onclick="openApplicationDossier(${x.id})">📁 Apri folder</button>`:""}${x.url?`<a href="${escAttr(x.url)}" target="_blank">Annuncio / fonte</a>`:""}<button class="text-btn" onclick="removeApplication(${x.id})">Archivia</button></div></article>`
 };
 document.getElementById("applicationsList").innerHTML=`<div class="application-summary"><div><strong>${a.filter(x=>x.status==="Da preparare").length}</strong><span>da preparare</span></div><div><strong>${a.filter(x=>["Applied","Follow-up"].includes(x.status)).length}</strong><span>inviate</span></div><div><strong>${a.filter(x=>["Interview","Offer"].includes(x.status)).length}</strong><span>in processo</span></div></div>`+groups.filter(g=>g[1].length).map(([name,items])=>`<section class="application-group"><h2>${name}</h2>${items.map(card).join("")}</section>`).join("");
}

function relative(v){if(!v)return"n/a";const d=(Date.now()-new Date(v).getTime())/1000;if(d<60)return"ora";if(d<3600)return Math.floor(d/60)+"m fa";if(d<86400)return Math.floor(d/3600)+"h fa";return Math.floor(d/86400)+"g fa"}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}function escAttr(s){return esc(s)}
initHuntPush();
load();