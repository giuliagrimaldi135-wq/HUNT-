const ONESIGNAL_APP_ID="86341c64-d62a-4983-9e20-c242566d14ff";
let HuntOneSignal=null;
function iosDevice(){return /iPad|iPhone|iPod/.test(navigator.userAgent)}
function standaloneMode(){return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true}
function pushNotice(msg,kind="info"){const el=document.getElementById("pushNotice");if(!el)return;el.hidden=!msg;el.className="push-notice "+kind;el.textContent=msg||""}
async function updatePushUI(){
  const btn=document.getElementById("pushBtn");if(!btn)return;
  if(!HuntOneSignal){btn.textContent="🔔 Notifiche";return}
  try{
    const supported=await HuntOneSignal.Notifications.isPushSupported();
    if(!supported){btn.textContent="🔕 Non supportate";btn.disabled=true;return}
    const permission=HuntOneSignal.Notifications.permission;
    const opted=HuntOneSignal.User.PushSubscription.optedIn;
    if(permission&&opted){btn.textContent="🔔 Notifiche attive";btn.classList.add("active");pushNotice("Notifiche HUNT attive su questo dispositivo.","success")}
    else{btn.textContent="🔔 Attiva notifiche";btn.classList.remove("active")}
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
    if(HuntOneSignal.Notifications.permission&&!HuntOneSignal.User.PushSubscription.optedIn){
      await HuntOneSignal.User.PushSubscription.optIn();
    }
    await updatePushUI();
  }catch(e){pushNotice("Non sono riuscita ad attivare le notifiche. Controlla che HUNT sia aperta dalla schermata Home e che le notifiche non siano state negate.","warn")}
}
function initHuntPush(){
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  OneSignalDeferred.push(async function(OneSignal){
    try{
      await OneSignal.init({
        appId:ONESIGNAL_APP_ID,
        serviceWorkerPath:"HUNT-/push/onesignal/OneSignalSDKWorker.js",
        serviceWorkerParam:{scope:"/HUNT-/push/onesignal/"},
        autoResubscribe:true,
        notifyButton:{enable:false},
        welcomeNotification:{disable:true}
      });
      HuntOneSignal=OneSignal;
      OneSignal.Notifications.addEventListener("permissionChange",updatePushUI);
      OneSignal.User.PushSubscription.addEventListener("change",updatePushUI);
      await updatePushUI();
    }catch(e){
      pushNotice("Notifiche non ancora pronte su questo dispositivo.","warn");
    }
  });
}
window.enablePush=enablePush;

const views={alerts:["01 · Alerts","Avvisi"],hidden:["02 · Intelligence","Hidden"],fashion:["03 · Briefing","Fashion Now"],brands:["04 · Coverage","Brands"],applications:["05 · Agenda","Candidature"]};
let state={jobs:[],signals:[],brands:[],status:{},fashion:[],spontaneous:[]};
const navItems=[["alerts","Avvisi"],["hidden","Hidden"],["fashion","Fashion Now"],["brands","Brands"],["applications","Candidature"]];
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
async function load(){const [jobs,signals,brands,status,fashion,spontaneous]=await Promise.all([getJSON("./data/jobs.json",[]),getJSON("./data/signals.json",[]),getJSON("./config/brands.json",[]),getJSON("./data/source_status.json",{}),getJSON("./data/fashion_news.json",[]),getJSON("./data/spontaneous.json",[])]);state={jobs:jobs.filter(validItalyJob),signals,brands,status,fashion,spontaneous};renderAll()}
function validItalyJob(j){const l=(j.location||"").toLowerCase();const allowed=["milano","milan","firenze","florence","scandicci","roma","rome","londra","london","svizzera","switzerland","zurich","zürich","geneva","genève","lugano","mendrisio","basel","bâle"];return allowed.some(x=>l.includes(x))}
function renderAll(){renderStats();renderAlerts();renderHidden();renderSpontaneous();renderFashion();renderBrands();renderApplications();updateIntelBadges();const t=state.status.generated_at;document.getElementById("lastScan").textContent=t?"Ultimo controllo "+relative(t):"In attesa del controllo"}

function cleanJobTitle(j){let t=(j.title||"").trim();const b=(j.brand||"").trim();if(!b)return t;const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const bt=norm(b),tt=norm(t);if(tt.startsWith(bt+" ")){const words=b.split(/\s+/).length;t=t.split(/\s+/).slice(words).join(" ").replace(/^[-–—:·]+\s*/,"")}return t||j.title}
function publishedAgeDays(j){if(!j.published_at)return null;const ms=Date.now()-new Date(j.published_at).getTime();return Number.isFinite(ms)?ms/86400000:null}
function publishedText(j){if(!j.published_at)return"Data pubblicazione non disponibile";return"Pubblicata "+new Date(j.published_at).toLocaleDateString("it-IT")}
function detectedText(j){return"Rilevata da HUNT "+relative(j.first_seen_at)}
function alertLabel(j){const d=publishedAgeDays(j);if(d!==null&&d<=3)return"NUOVO";if(d!==null&&d<=7)return"RECENTE";if(j.score>=85)return"FORTE MATCH";return"DA VALUTARE"}

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

function alertCard(j){const title=cleanJobTitle(j);const stretch=j.junior_fit===false||((j.years_required||0)>=2);return `<article class="alert-card" data-alert-key="${j.key}"><div class="alert-top"><span class="alert-label">${alertLabel(j)}</span><span class="alert-score">${j.score}% MATCH</span></div><h3>${esc(j.brand)}</h3><h4>${esc(title)}</h4><div class="alert-location">📍 ${esc(j.location||"")}</div><div class="meta">${publishedText(j)} · ${detectedText(j)}</div><p>${esc((j.reasons||[]).slice(0,4).join(" · "))}</p><div class="chips"><span class="chip">${esc(j.role_family||"Fashion")}</span>${stretch?'<span class="chip">STRETCH</span>':'<span class="chip high">JUNIOR FIT</span>'}</div><div class="alert-actions"><button class="secondary" onclick="markApplied('${j.key}')">Ho applicato</button><button class="secondary" onclick="ignoreJob('${j.key}')">Ignora</button><a href="${escAttr(j.url)}" target="_blank" rel="noopener">Apri annuncio</a></div></article>`}

function signalTypeLabel(t){return({store_opening:"Apertura / retail",expansion:"Espansione",category_launch:"Nuovo prodotto/categoria",hiring_velocity:"Hiring",management_change:"Management",financial_momentum:"Business",social_signal:"Social / buzz",industry_news:"Industry"})[t]||"Segnale"}
function storageSet(name){return new Set(JSON.parse(localStorage.getItem(name)||"[]"))}
function saveStorageSet(name,set){localStorage.setItem(name,JSON.stringify([...set]))}
function dismissSignal(key){const s=storageSet("hunt-read-signals");s.add(key);saveStorageSet("hunt-read-signals",s);renderHidden();updateIntelBadges()}
function dismissFashion(key){const s=storageSet("hunt-read-fashion");s.add(key);saveStorageSet("hunt-read-fashion",s);renderFashion();updateIntelBadges()}
function dismissSpontaneous(key){const s=storageSet("hunt-read-spontaneous");s.add(key);saveStorageSet("hunt-read-spontaneous",s);renderSpontaneous();updateIntelBadges()}
window.dismissSignal=dismissSignal;window.dismissFashion=dismissFashion;window.dismissSpontaneous=dismissSpontaneous;
function updateIntelBadges(){
  const rs=storageSet("hunt-read-signals"),rf=storageSet("hunt-read-fashion"),rsp=storageSet("hunt-read-spontaneous");
  const hidden=state.signals.filter(x=>!rs.has(x.key)).length+state.spontaneous.filter(x=>!rsp.has(x.key)).length;
  const fashion=state.fashion.filter(x=>!rf.has(x.key)).length;
  document.querySelectorAll('[data-badge-for="hidden"]').forEach(x=>{x.textContent=hidden||"";x.style.display=hidden?"inline-flex":"none"});
  document.querySelectorAll('[data-badge-for="fashion"]').forEach(x=>{x.textContent=fashion||"";x.style.display=fashion?"inline-flex":"none"});
}
function renderHidden(){
  const read=storageSet("hunt-read-signals");
  const recent=[...state.signals].filter(x=>!read.has(x.key)).sort((a,b)=>new Date(b.published_at||b.detected_at||0)-new Date(a.published_at||a.detected_at||0)).slice(0,40);
  const counts={};recent.forEach(x=>counts[x.signal_type]=(counts[x.signal_type]||0)+1);
  const topTypes=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${signalTypeLabel(k)} (${v})`).join(" · ");
  const topBrands=[...new Set(recent.map(x=>x.brand).filter(Boolean))].slice(0,6).join(", ");
  document.getElementById("hiddenSummary").innerHTML=`<span class="hero-kicker">HUNT READOUT</span><p><strong>${recent.length} segnali non letti</strong>${topTypes?" · "+esc(topTypes):""}.</p><p>${topBrands?"Brand che stanno muovendosi: "+esc(topBrands)+". ":""}Apri un segnale o premi “Letto” e sparirà da questa lista.</p>`;
  document.getElementById("signals").innerHTML=recent.length?recent.map(x=>`<article class="news-card"><div><span class="news-topic">${esc(signalTypeLabel(x.signal_type))}</span><h3>${esc(x.brand||"Fashion")} — ${esc(x.headline)}</h3><div class="meta">${x.source?esc(x.source)+" · ":""}${relative(x.published_at||x.detected_at)}</div><p>${esc(x.reason||"Segnale pubblico da monitorare.")}</p><div class="news-actions"><button class="secondary" onclick="dismissSignal('${x.key}')">✓ Letto</button>${x.url?`<a href="${escAttr(x.url)}" target="_blank" rel="noopener" onclick="dismissSignal('${x.key}')">Apri fonte</a>`:""}</div></div></article>`).join(""):`<div class="empty">Hai letto tutti i segnali recenti. I nuovi compariranno qui automaticamente.</div>`;
}
function prepareSpontaneous(key){
  const x=state.spontaneous.find(y=>y.key===key);if(!x)return;
  const a=applications();
  if(!a.some(y=>y.spontaneous_key===key))a.unshift({id:Date.now(),brand:x.brand,role:"Candidatura spontanea",status:"To apply",applied_at:new Date().toISOString(),updated_at:new Date().toISOString(),source:"HUNT Intelligence",spontaneous_key:key,url:x.url||null});
  saveApplications(a);dismissSpontaneous(key);switchView("applications")
}
window.prepareSpontaneous=prepareSpontaneous;
function renderSpontaneous(){
  const read=storageSet("hunt-read-spontaneous");
  const list=[...state.spontaneous].filter(x=>!read.has(x.key)).sort((a,b)=>b.score-a.score).slice(0,15);
  document.getElementById("spontaneousList").innerHTML=list.length?list.map(x=>`<article class="spontaneous-card"><div class="spont-score">${x.score}</div><div><span class="news-topic">${esc(x.action||"Candidatura spontanea")}</span><h3>${esc(x.brand)}</h3><p class="spont-why">${esc(x.why_now||"HUNT ha rilevato segnali che rendono questo brand interessante per un outreach mirato.")}</p><div class="signal-stack">${(x.reasons||[]).slice(0,4).map(r=>`<span>${esc(r)}</span>`).join("")}</div><div class="news-actions"><button class="primary" onclick="prepareSpontaneous('${x.key}')">Prepara candidatura</button><button class="secondary" onclick="dismissSpontaneous('${x.key}')">Ignora</button>${x.url?`<a href="${escAttr(x.url)}" target="_blank" rel="noopener">Fonte principale</a>`:""}</div></div></article>`).join(""):`<div class="empty">Nessuna nuova candidatura spontanea suggerita al momento.</div>`;
}
function renderFashion(){
  const read=storageSet("hunt-read-fashion");
  const n=[...state.fashion].filter(x=>!read.has(x.key)).sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0)).slice(0,60);
  document.getElementById("fashionNews").innerHTML=n.length?n.map(x=>`<article class="news-card"><div><span class="news-topic">${esc(signalTypeLabel(x.topic))}</span><h3>${esc(x.headline)}</h3><div class="meta">${esc(x.source||"News")} · ${relative(x.published_at)}</div><p><strong>Per il colloquio:</strong> ${esc(x.why_it_matters||"Tieni a mente il fatto e collegalo al brand e al ruolo.")}</p><div class="news-actions"><button class="secondary" onclick="dismissFashion('${x.key}')">✓ Letto</button>${x.url?`<a href="${escAttr(x.url)}" target="_blank" rel="noopener" onclick="dismissFashion('${x.key}')">Leggi</a>`:""}</div></div></article>`).join(""):`<div class="empty">Hai letto tutte le notizie recenti. Le nuove compariranno qui automaticamente.</div>`;
}

function renderBrands(){const q=document.getElementById("brandSearch").value.toLowerCase();const list=state.brands.filter(b=>`${b.name} ${b.market}`.toLowerCase().includes(q));document.getElementById("brandGrid").innerHTML=list.map(b=>{const s=state.status.sources?.[b.id];let label,cls,explain;if(s?.ok){label="● COLLEGATO";cls="live";explain="Career source controllata automaticamente."}else if(b.enabled){label="◌ COLLEGAMENTO DA MIGLIORARE";cls="pending";explain="Fonte presente, ma il connettore non sta ancora estraendo bene i job."}else{label="○ NON ANCORA COLLEGATO";cls="pending";explain="Brand nella watchlist. Career source automatica ancora da configurare."}return `<div class="brand-card"><h3>${esc(b.name)}</h3><div class="source-status ${cls}">${label}</div><p class="meta">${esc(b.market||"fashion/luxury")}</p><p class="brand-explain">${explain}</p></div>`}).join("")}

function applications(){return JSON.parse(localStorage.getItem("hunt-applications")||"[]")}
function saveApplications(x){localStorage.setItem("hunt-applications",JSON.stringify(x));renderApplications();renderAlerts()}
function markApplied(key){const j=state.jobs.find(x=>x.key===key);if(!j)return;markAlertRead(key);const a=applications();if(!a.some(x=>x.url===j.url)){a.unshift({id:Date.now(),key:j.key,brand:j.brand,role:cleanJobTitle(j),url:j.url,status:"Applied",applied_at:new Date().toISOString(),updated_at:new Date().toISOString(),source:"HUNT"})}saveApplications(a);switchView("applications")}
window.markApplied=markApplied;
function addApplication(){const brand=prompt("Brand?");if(!brand)return;const role=prompt("Ruolo?")||"Candidatura spontanea";saveApplications([{id:Date.now(),brand,role,status:"Applied",applied_at:new Date().toISOString(),updated_at:new Date().toISOString(),source:"Manuale"},...applications()])}
function appDays(a){return Math.max(0,Math.floor((Date.now()-new Date(a.applied_at).getTime())/86400000))}
function updateApplication(id,status){const a=applications();const x=a.find(y=>y.id===id);if(!x)return;x.status=status;x.updated_at=new Date().toISOString();if(status==="Interview"&&!x.interview_at)x.interview_at=new Date().toISOString();saveApplications(a)}
window.updateApplication=updateApplication;
function removeApplication(id){saveApplications(applications().filter(x=>x.id!==id))}
window.removeApplication=removeApplication;
function renderApplications(){const a=applications().sort((x,y)=>new Date(y.applied_at)-new Date(x.applied_at));document.querySelectorAll('[data-badge-for="applications"]').forEach(x=>{x.textContent="";x.style.display="none"});document.getElementById("applicationsList").innerHTML=a.length?a.map(x=>{const days=appDays(x);const follow=days>=7&&["Applied","Follow-up"].includes(x.status);return `<article class="application-card"><div class="application-days"><strong>${days}</strong><span>giorni</span></div><div class="application-main"><h3>${esc(x.brand)} — ${esc(x.role)}</h3><div class="meta">Applicato il ${new Date(x.applied_at).toLocaleDateString("it-IT")} · Stato: <strong>${esc(x.status)}</strong></div>${follow?'<p class="follow-warning">⚠️ Potrebbe essere il momento di valutare un follow-up.</p>':""}<div class="stage-actions"><button onclick="updateApplication(${x.id},'Applied')">Applied</button><button onclick="updateApplication(${x.id},'Interview')">Interview</button><button onclick="updateApplication(${x.id},'Follow-up')">Follow-up</button><button onclick="updateApplication(${x.id},'Rejected')">Rejected</button><button onclick="updateApplication(${x.id},'Offer')">Offer</button></div></div><div class="app-links">${x.url?`<a href="${escAttr(x.url)}" target="_blank">Annuncio</a>`:""}<button class="text-btn" onclick="removeApplication(${x.id})">Archivia</button></div></article>`}).join(""):`<div class="empty">Nessuna candidatura ancora. Quando applichi a un ruolo, tocca <strong>“Ho applicato”</strong> nell'avviso: entrerà qui automaticamente.</div>`}

function relative(v){if(!v)return"n/a";const d=(Date.now()-new Date(v).getTime())/1000;if(d<60)return"ora";if(d<3600)return Math.floor(d/60)+"m fa";if(d<86400)return Math.floor(d/3600)+"h fa";return Math.floor(d/86400)+"g fa"}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}function escAttr(s){return esc(s)}
if("serviceWorker" in navigator){let refreshing=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(refreshing)return;refreshing=true;location.reload()});navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>{reg.update().catch(()=>{});setInterval(()=>reg.update().catch(()=>{}),60000)}).catch(()=>{})}
initHuntPush();
load();