/* Spontanee — evidence-first discovery and folder rendering. No social scraping. */
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const safeLink=value=>{try{const u=new URL(String(value||""));return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}};
export const emailAddress=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||"").trim())?String(value).trim():"";
const dateText=value=>{const d=new Date(value||"");return !Number.isNaN(d.getTime())?d.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"}):"Data non disponibile"};
const daysAgo=(value,now)=>{const d=Date.parse(value||"");return Number.isFinite(d)&&d<=now+86400000?Math.max(0,Math.floor((now-d)/86400000)):null};
const keyName=value=>String(value||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const focusType=new Set(["retail_expansion","retail_expansion_announcement","first_permanent_store","first_milan_store","international_pop_up","wholesale_showroom","category_expansion","collection_and_brand_space","shop_in_shop","hiring","investment","showroom_opening","new_market"]);
function evidenceFor(item){
 const arr=Array.isArray(item.signals)?item.signals:[];
 return arr.map(s=>({description:String(s.description||"").trim(),date:String(s.date||""),type:s.type||"news",url:safeLink(s.url)}))
  .filter(s=>s.description&&s.url);
}
export function buildOutreachLeads(curated=[],corporate=[],now=Date.now()){
 const byKey=new Map();
 for(const item of Array.isArray(curated)?curated:[]){
  const brand=String(item.brand||"").trim(),url=safeLink(item.source_url||item.url);
  const evidence=evidenceFor(item);
  if(!brand||!url||!evidence.length)continue; // No source means no unsolicited outreach recommendation.
  const recent=evidence.some(x=>{const age=daysAgo(x.date,now);return age!==null&&age<=120});
  const focus=evidence.some(x=>focusType.has(x.type));
  if(!focus)continue;
  const email=emailAddress(item.contact);
  const key=String(item.key||keyName(brand)).slice(0,180);
  byKey.set(keyName(brand),{
    key,brand,area:String(item.area||"Merchandising / Buying").trim(),
    whyNow:String(item.why_now||"").trim(),sourceUrl:url,
    evidence,priority:String(item.priority||"").toLowerCase(),
    dated:recent,checkedAt:item.updated_at||null,
    contactEmail:email,contactSourceUrl:safeLink(item.contact_source_url),contactKind:String(item.contact_kind||""),
    contactDescription:email?"Email indicata nel dossier: verifica sulla pagina ufficiale, non necessariamente recruiting":String(item.contact_hint||item.contact_kind||item.contact||"").trim(),
    careerUrl:safeLink(item.careers_url),signalOrigin:"curated",score:Number(item.score)||0
  });
 }
 // Corporate/newsroom evidence can supplement the folder, but an event does not prove recruitment.
 for(const signal of Array.isArray(corporate)?corporate:[]){
  const company=signal.companies||{},brand=String(company.name||"").trim();
  if(!brand||!safeLink(signal.source_url))continue;
  const type=String(signal.signal_type||"news"),published=signal.published_at||null;
  const e={description:String(signal.title||"").trim(),date:published,type,url:safeLink(signal.source_url)};
  if(!e.description)continue;
  const existing=byKey.get(keyName(brand));
  if(existing){
    if(!existing.evidence.some(x=>x.url===e.url))existing.evidence.push(e);
    continue;
  }
  // Only independent/small companies with a targeted commercial signal qualify.
  if(company.is_independent!==true&&!["small","micro","startup"].includes(company.size_band))continue;
  if(!focusType.has(type)||daysAgo(published,now)===null||daysAgo(published,now)>240)continue;
  const key="signal-"+String(signal.id||keyName(brand));
  byKey.set(keyName(brand),{
   key,brand,area:"Da valutare sul tuo profilo",whyNow:e.description,sourceUrl:e.url,
   evidence:[e],priority:"da valutare",dated:true,checkedAt:signal.detected_at||null,
   contactEmail:"",contactSourceUrl:"",contactDescription:"Nessun recapito recruiting verificato",
   careerUrl:safeLink(company.careers_url),signalOrigin:"company",score:0
  });
 }
 return [...byKey.values()].sort((a,b)=>(Number(b.dated)-Number(a.dated))||(b.score-a.score)).slice(0,35);
}

/* World Radar is supplementary reading, never a substitute for evidence of hiring. */
const folded=value=>String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export function attachBrandNews(leads=[],articles=[],now=Date.now()){
 return leads.map(lead=>{
  const name=folded(lead.brand),prior=new Set((lead.evidence||[]).map(s=>s.url));
  const related=(Array.isArray(articles)?articles:[]).filter(article=>{
   const url=safeLink(article.url),age=daysAgo(article.published_at,now);
   if(!url||prior.has(url)||age===null||age>180||!name)return false;
   const title=folded(article.title),summary=folded(article.summary);
   return (" "+title+" ").includes(" "+name+" ")&&(name.length>=8||(" "+summary+" ").includes(" "+name+" "));
  }).slice(0,5).map(article=>({title:String(article.title),summary:String(article.summary||""),url:safeLink(article.url),date:article.published_at}));
  return {...lead,news:related};
 });
}


export function enrichOutreachLeads(leads=[],registry={}){
 return leads.map(lead=>{
  const record=registry[lead.key]||{};
  const editorial=(record.articles||[]).filter(x=>safeLink(x.url)&&x.title).map(x=>({...x,kind:"press",url:safeLink(x.url)}));
  return {...lead,
   companyUrl:safeLink(record.company_url||lead.companyUrl),
   socialProfiles:(record.official_profiles||[]).filter(x=>safeLink(x.url)).map(x=>({...x,url:safeLink(x.url),sourceUrl:safeLink(x.source_url),kind:"official_profile"})),
   editorial,news:[...(lead.news||[])],messageAngle:String(record.message_angle||""),emailHook:String(record.email_hook||""),
   contactKind:String(lead.contactKind||record.contact_kind||"")
  };
 });
}
export function chooseOutreachCv(cvs=[],area=""){
 if(!Array.isArray(cvs)||!cvs.length)return null;
 const topic=String(area||"").toLowerCase();
 const specialist=cvs.find(c=>/merchandis|buying|planning|allocation/i.test(String(c.name||"")));
 if(/merchandis|buying|planning|product|wholesale/i.test(topic)&&specialist)return specialist;
 return cvs.find(c=>c.is_default)||cvs[0];
}
const normalizeContent=text=>String(text||"").replace(/\s+/g," ").trim();
function profileSentence(cv){
 const p=cv?.parsed_profile||{};
 if(!Boolean(p.profile_confirmed_by_user||p.profile_verified_from_user_history))return {text:"",verified:false};
 const edu=(p.education||[]).find(x=>x&&((x.program||x.degree)&&x.school));
 const exp=(p.experience||[]).find(x=>x&&(x.company||x.role));
 const program=normalizeContent(edu?.program||edu?.degree),school=normalizeContent(edu?.school);
 const company=normalizeContent(exp?.company),role=normalizeContent(exp?.role);
 const facts=[];
 if(program&&school)facts.push("Ho completato un percorso in "+program+" presso "+school+".");
 if(company)facts.push("Ho svolto un’esperienza "+(role?"come "+role+" ":"professionale ")+"presso "+company+".");
 return {text:facts.join(" "),verified:true};
}
export function composeOutreachEmail(lead,cv={},person={}){
 const profile=profileSentence(cv);
 const name=normalizeContent(person.display_name||[person.first_name,person.last_name].filter(Boolean).join(" "));
 const company=String(lead.brand||"il brand").trim();
 const area=String(lead.area||"merchandising e buying");
 const subject="Candidatura spontanea — "+area+" | "+company;
 const hook=normalizeContent(lead.emailHook||
  "Ho seguito con interesse gli ultimi sviluppi di "+company+", in particolare "+String(lead.whyNow||"le iniziative del brand").replace(/[.!?]+$/,"").replace(/^./,m=>m.toLowerCase())+".");
 const intro=hook.endsWith(".")?hook:hook+".";
 const second="Mi piacerebbe proporre il mio profilo per eventuali opportunità junior legate al merchandising, al prodotto o alle attività commerciali. Mi interessano in particolare la gestione degli assortimenti e la relazione tra prodotto e canali retail/wholesale.";
 const close="Vi allego il mio curriculum e sarei felice di approfondire eventuali possibilità di collaborazione. Se esiste un riferimento più adatto per questo tipo di candidatura, vi ringrazio se potrete indicarmelo.";
 const body="Buongiorno,\n\n"+intro+"\n\n"+(profile.text?profile.text+"\n\n":"")+second+
 "\n\n"+close+"\n\nGrazie per l’attenzione.\n\nCordiali saluti"+(name?",\n"+name:"");
 return {subject,body,verifiedCv:profile.verified};
}
const sourceHost=url=>{try{return new URL(url).hostname.replace(/^www\./,"")}catch{return "Fonte"}};
function sourceCatalog(lead){
 const items=[];
 const push=(x)=>{
  const url=safeLink(x.url);
  if(!url||items.some(e=>e.url===url))return;
  items.push({...x,url});
 };
 (lead.evidence||[]).forEach(x=>push({title:x.description,date:x.date,url:x.url,type:"Segnale",publisher:sourceHost(x.url)}));
 (lead.editorial||[]).forEach(x=>push({title:x.title,date:x.date,url:x.url,type:"Stampa",publisher:x.publisher||sourceHost(x.url)}));
 (lead.news||[]).forEach(x=>push({title:x.title,date:x.date,url:x.url,type:"World Radar",publisher:x.publisher||sourceHost(x.url)}));
 if(lead.companyUrl)push({title:"Sito ufficiale "+lead.brand,url:lead.companyUrl,type:"Brand",publisher:sourceHost(lead.companyUrl)});
 (lead.socialProfiles||[]).forEach(x=>push({title:lead.brand+" su "+x.platform,url:x.url,type:"Social",publisher:x.platform,verification:x.status||"Link pubblicamente verificato",provenance:x.sourceUrl}));
 return items;
}
const sourceItem=(x)=>'<li class="outSourceRow"><div><span class="outSourceType">'+esc(x.type)+'</span><strong>'+esc(x.title)+'</strong>'+
  '<small>'+esc(x.publisher)+(x.date?" · "+esc(dateText(x.date)):"")+(x.verification?" · "+esc(x.verification):"")+'</small></div>'+
  '<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">Apri fonte ↗</a></li>';
export function renderOutreachCards(leads=[],drafts={}){
 if(!leads.length)return '<section class="outEmpty"><h2>Nessun brand pronto per una proposta documentata.</h2><p>HUNT segnalerà soltanto movimenti commerciali con fonti consultabili.</p></section>';
 return '<div class="outResults">'+leads.map(x=>{
  const status=drafts[x.key]?.status,first=x.evidence.find(e=>e.date)?.date||x.checkedAt;
  return '<article class="outLead"><div class="outLeadMain"><span class="outEyebrow">'+esc(x.dated?"Segnale recente":"Segnale da ricontrollare")+'</span><h2>'+esc(x.brand)+'</h2>'+
   '<p class="outLeadWhy">'+esc(x.whyNow||x.evidence[0]?.description||"")+'</p>'+
   '<div class="outLeadMeta"><span>'+esc(x.area)+'</span><span>'+esc(dateText(first))+'</span></div></div>'+
   '<div class="outLeadActions">'+(status?'<span class="outStatus">'+esc(status==="applied"?"Invio registrato":status==="archived"?"Archiviata":"Bozza salvata")+'</span>':"")+
   '<button type="button" class="outOpen" data-outreach-open="'+esc(x.key)+'">Apri il dossier <span aria-hidden="true">↗</span></button></div></article>';
 }).join("")+'</div>';
}
export function renderOutreachFolder(lead,{cvs=[],cvId="",draft=null,person={}}={}){
 const suggested=chooseOutreachCv(cvs,lead.area);
 const selected=cvs.find(c=>c.id===cvId)||suggested;
 const email=composeOutreachEmail(lead,selected,person);
 const subject=draft?.subject??email.subject,body=draft?.email_body??email.body;
 const cvOptions=cvs.map(c=>'<option value="'+esc(c.id)+'" '+(selected?.id===c.id?"selected":"")+'>'+esc(c.name)+(c.is_default?" · principale":"")+'</option>').join("");
 const sources=sourceCatalog(lead);
 const press=sources.filter(s=>s.type==="Segnale"||s.type==="Stampa"||s.type==="World Radar");
 const socials=sources.filter(s=>s.type==="Social");
 const socialBar=socials.length?'<div class="outSocialLinks">'+socials.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.publisher)+' ↗</a>').join("")+'</div>':"";
 const primary=press.slice(0,3);
 const sourceCount=sources.length;
 const companyContact=lead.contactEmail&&lead.contactSourceUrl?
   '<strong class="outContactEmail">'+esc(lead.contactEmail)+'</strong><small>'+esc(lead.contactKind||"Contatto generale pubblicato dal brand; non HR")+'</small>'+
   '<a href="'+esc(lead.contactSourceUrl)+'" target="_blank" rel="noopener noreferrer">Verifica sul sito ↗</a>':
   '<p>Non risulta un indirizzo recruiting documentato. Puoi consultare la pagina contatti del brand.</p>'+
   (lead.contactSourceUrl?'<a href="'+esc(lead.contactSourceUrl)+'" target="_blank" rel="noopener noreferrer">Contatti ufficiali ↗</a>':"");
 const contactNote='HUNT non inventa email di recruiter. Prima dell’invio verifica che il canale sia appropriato.';
 return '<div class="outFolder outFolderV2"><div class="outFolderTop">'+
  '<button type="button" class="outBack" data-outreach-back>← Spontanee</button>'+
  '<span class="outFolderTag">Candidatura spontanea · dossier fonti</span></div>'+
  '<header class="outFolderHero"><span class="outSectionKicker">Luxury Outreach / '+esc(lead.dated?"Segnale recente":"Segnale da valutare")+'</span>'+
   '<h1>'+esc(lead.brand)+'</h1><p>'+esc(lead.area)+'</p>'+
   '<span class="outFolderSub">Un’opportunità di contatto basata su un movimento documentato del brand; non è un annuncio di lavoro.</span></header>'+
  '<section class="outStorySection"><div class="outSectionIntro"><span class="outSectionKicker">01 · Il momento</span><h2>Perché candidarti adesso</h2></div>'+
   '<p class="outStory">'+esc(lead.whyNow||lead.evidence[0]?.description||"")+'</p>'+

   '<div class="outStorySources">'+primary.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.publisher)+' <span>↗</span></a>').join("")+'</div></section>'+
  '<section class="outPrepare"><div class="outSectionIntro"><span class="outSectionKicker">02 · La candidatura</span><h2>Scheda candidatura</h2></div>'+
   '<div class="outPrepareColumns"><div><span class="outMiniTitle">Area su cui puntare</span><strong>'+esc(lead.area)+'</strong>'+
   (lead.priority?'<span class="outMiniTitle outPriorityText">Priorità di ricerca: '+esc(lead.priority)+'</span>':"")+
   (lead.messageAngle?'<span class="outMiniTitle outAngleLabel">Angolo del messaggio</span><p>'+esc(lead.messageAngle)+'</p>':"")+'</div>'+
   '<div><label for="outCvChoice" class="outMiniTitle">CV per questa candidatura</label>'+
   '<select id="outCvChoice" aria-label="Seleziona il CV">'+(cvOptions||'<option value="">Nessun CV caricato</option>')+'</select>'+
   '<p class="outSuggestedCv">'+(suggested?'HUNT ti consiglia: <strong>'+esc(suggested.name)+'</strong>. Puoi scegliere un altro CV.':'Carica un curriculum dal tuo profilo per personalizzare il testo.')+'</p></div></div></section>'+
  '<section class="outLetterSection"><div class="outSectionIntro"><span class="outSectionKicker">03 · Pronta da inviare</span><h2>Email pronta da personalizzare</h2>'+
   '<p>Una proposta concreta per questo brand. Puoi cambiare ogni parola prima di copiarla o salvarla.</p></div>'+
   '<label class="outField">Oggetto<input type="text" id="outSubject" value="'+esc(subject)+'" maxlength="300"></label>'+
   '<label class="outField">Messaggio<textarea id="outBody" rows="12">'+esc(body)+'</textarea></label>'+
   '<div class="outEmailActions"><button type="button" data-outreach-save="preparing">Salva bozza</button>'+
   '<button type="button" data-outreach-copy>Copia email</button>'+
   '<button type="button" data-outreach-regenerate>Personalizza con un altro CV</button></div>'+
   '<p class="outSaveState" id="outSaveState" aria-live="polite"></p></section>'+
  '<section class="outContactSection"><div class="outSectionIntro"><span class="outSectionKicker">04 · Il contatto</span><h2>Dove contattare il brand</h2></div>'+
   '<div class="outContactLine">'+companyContact+'</div>'+
   (lead.contactEmail&&lead.contactSourceUrl?'<button type="button" class="outMailtoAction" data-outreach-mailto>Prepara in email ↗</button>':"")+
   (lead.careerUrl?'<p><a href="'+esc(lead.careerUrl)+'" target="_blank" rel="noopener noreferrer">Controlla le posizioni ufficiali ↗</a></p>':"")+
   '<p class="outSmallNote">'+esc(contactNote)+'</p></section>'+
  '<section class="outEvidenceSection"><div class="outSectionIntro"><span class="outSectionKicker">05 · Trasparenza</span><h2>Fonti e segnali</h2>'+
   '<p>Tutti i collegamenti utilizzati e quelli da consultare per approfondire. Un profilo social ufficiale non significa che HUNT abbia letto tutti i post.</p></div>'+
   (socialBar||"")+
   '<details class="outEvidenceDetails"><summary>Esplora tutte le fonti <span>'+sourceCount+' collegamenti</span></summary>'+
   '<ul class="outSources">'+sources.map(sourceItem).join("")+'</ul></details></section>'+
  '<footer class="outFolderFoot"><button type="button" data-outreach-save="applied" class="outApplied">Ho inviato la candidatura</button>'+
   '<span>Registra solo un invio effettuato da te. HUNT non spedisce email automaticamente.</span></footer></div>';
}
