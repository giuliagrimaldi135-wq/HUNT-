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
  const recent=evidence.some(x=>{const age=daysAgo(x.date,now);return focusType.has(x.type)&&age!==null&&age<=120});
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
   outreachStory:String(record.outreach_story||""),outreachRelevance:String(record.outreach_relevance||""),outreachCaution:String(record.outreach_caution||""),
   contactKind:String(lead.contactKind||record.contact_kind||"")
  };
 });
}
function isConfirmedCv(cv){
 const p=cv?.parsed_profile||{};
 return Boolean(p.profile_confirmed_by_user||p.profile_verified_from_user_history);
}
function cvFocus(cv,area=""){
 const name=String(cv?.name||"").toLowerCase();
 const declared=Array.isArray(cv?.target_role_families)?cv.target_role_families.join(" ").toLowerCase():"";
 const basis=name||declared||String(area||"").toLowerCase();
 if(/merchandis|buying|allocat|planning/.test(basis))return {
  kind:"merchandising",label:"Merchandising e Retail Planning",
  intention:"Vorrei approfondire come vengono costruiti e monitorati gli assortimenti, collegando prodotto, stock e attività retail."};
 if(/wholesale|showroom|sales/.test(basis))return {
  kind:"wholesale",label:"Wholesale e Prodotto",
  intention:"Vorrei contribuire ai processi che collegano le collezioni alla distribuzione e ai rapporti commerciali."};
 if(/fashion management|brand|marketing|management/.test(basis))return {
  kind:"management",label:"Fashion Management e Prodotto",
  intention:"Vorrei crescere nella gestione del prodotto e nel coordinamento tra identità del brand, assortimenti ed esperienza retail."};
 return {kind:"general",label:String(area||"Merchandising e Prodotto").split("/").map(x=>x.trim()).filter(Boolean).slice(0,2).join(" e "),
 intention:"Vorrei imparare da vicino come si organizzano le attività di prodotto, retail e commerciali del brand."};
}
export function chooseOutreachCv(cvs=[],area=""){
 if(!Array.isArray(cvs)||!cvs.length)return null;
 const target=/merchandis|buying|planning|allocation|product|wholesale/i.test(String(area||""));
 const preferred=cvs.find(c=>target&&/merchandis|buying|planning|allocation/i.test(c.name||"")&&isConfirmedCv(c));
 return preferred||cvs.find(c=>c.is_default&&isConfirmedCv(c))||cvs.find(isConfirmedCv)||
   cvs.find(c=>target&&/merchandis|buying|planning|allocation/i.test(c.name||""))||
   cvs.find(c=>c.is_default)||cvs[0];
}
const normalizeContent=text=>String(text||"").replace(/\s+/g," ").trim();
function compactEvidence(x,max=135){
 return normalizeContent(x||"").replace(/[.!?]+$/,"").slice(0,max);
}
function confirmedProfile(cv,focus){
 const p=cv?.parsed_profile||{};
 if(!isConfirmedCv(cv))return {verified:false,proof:[],education:null,experience:null,project:null};
 const education=Array.isArray(p.education)?p.education.find(x=>x&&(x.school||x.program||x.degree)):null;
 const experience=Array.isArray(p.experience)?p.experience.find(x=>x&&(x.company||x.role)):null;
 const projects=Array.isArray(p.projects)?p.projects:[];
 const relevantWords=focus.kind==="merchandising"?/merchandis|buying|assort|retail|stock|planning|gucci|ala[iï]a/i:
   focus.kind==="wholesale"?/wholesale|showroom|sales|client|order/i:/brand|strategy|retail|management|marketing/i;
 const project=projects.find(x=>relevantWords.test([x.name,...(Array.isArray(x.evidence)?x.evidence:[])].join(" ")))||projects[0]||null;
 const proof=[];
 const program=compactEvidence(education?.program||education?.degree,85),school=compactEvidence(education?.school,85);
 const company=compactEvidence(experience?.company,90),role=compactEvidence(experience?.role,80),projectName=compactEvidence(project?.name,90);
 if(program)proof.push(school?program+" · "+school:program);
 if(company)proof.push((role?role+" · ":"")+company);
 if(projectName)proof.push("Progetto: "+projectName);
 const software=Array.isArray(p.tools)?p.tools.filter(x=>/excel|power bi|tableau|sap/i.test(typeof x==="string"?x:x?.name||"")):[];
 if(software.length)proof.push("Strumento documentato: "+compactEvidence(typeof software[0]==="string"?software[0]:software[0].name,75));
 return {verified:true,proof,education,experience,project};
}
export function describeOutreachCv(cv,area=""){
 if(!cv)return {verified:false,text:"Nessun CV selezionato. Aggiungi un curriculum e verificane i dati per personalizzare questa candidatura.",focus:"Profilo da aggiungere"};
 const focus=cvFocus(cv,area);
 const evidence=confirmedProfile(cv,focus);
 return {verified:evidence.verified,focus:focus.label,
  text:evidence.verified?
   "HUNT usa il CV «"+String(cv.name||"Curriculum")+"» e solo informazioni confermate: "+(evidence.proof.length?evidence.proof.slice(0,3).join(" · "):"profilo verificato, senza ulteriori dettagli dichiarati")+"."
   :"Il CV «"+String(cv.name||"Curriculum")+"» non contiene ancora informazioni confermate. HUNT non inserirà esperienze o competenze non verificate."};
}
export function composeOutreachEmail(lead,cv={},person={},preferences={}){
 const focus=cvFocus(cv,lead.area||"");
 const evidence=confirmedProfile(cv,focus);
 const name=normalizeContent(person?.display_name||[person?.first_name,person?.last_name].filter(Boolean).join(" "));
 const company=String(lead.brand||"il brand").trim();
 const subject="Candidatura spontanea | "+focus.label+" — "+company;
 const hook=normalizeContent(lead.emailHook||"Ho seguito con interesse un recente sviluppo commerciale di "+company+".");
 const intro=hook.endsWith(".")?hook:hook+".";
 const edu=evidence.education||{},exp=evidence.experience||{},proj=evidence.project||{};
 const school=compactEvidence(edu.school,90),course=compactEvidence(edu.program||edu.degree,90);
 const employer=compactEvidence(exp.company,95),role=compactEvidence(exp.role,85);
 const project=compactEvidence(proj.name,110);
 const facts=[];
 if(course&&school)facts.push("Ho completato un percorso in "+course+" presso "+school);
 else if(course)facts.push("Ho una formazione in "+course);
 if(employer)facts.push("ho maturato un'esperienza presso "+employer+(role?", nel ruolo di "+role:""));
 const actualFacts=facts.length?facts.map((x,i)=>i?x.charAt(0).toLowerCase()+x.slice(1):x).join(" e ")+".":"";
 const projectLine=project?(actualFacts?" Un progetto che ritengo pertinente a questa candidatura è «"+project+"».":"Nel mio percorso ho sviluppato il progetto «"+project+"»."):"";
 const interests=Array.isArray(preferences?.interest_areas)?preferences.interest_areas.map(normalizeContent).filter(Boolean):[];
 const userInterest=interests.find(x=>/merchandis|buying|product|retail|wholesale|planning/i.test(x));
 const goal=userInterest?userInterest:focus.label;
 const roleLabel=focus.kind==="wholesale"?"wholesale e supporto alle attività commerciali":
   focus.kind==="management"?"prodotto, merchandising e coordinamento retail":
   focus.kind==="merchandising"?"merchandising, buying e pianificazione retail":
   "prodotto e sviluppo commerciale";
 const brandAngle=normalizeContent(lead.messageAngle||lead.outreachRelevance||"");
 const why=focus.kind==="wholesale"?
  "Mi interessa in particolare il lavoro che collega la presentazione delle collezioni alle attività commerciali e ai canali distributivi.":
  focus.kind==="management"?
  "Mi interessa capire come l'identità del brand si traduca in scelte di prodotto e nell'esperienza in negozio.":
  "Mi interessa il rapporto tra prodotto, assortimento e risultati commerciali, soprattutto nei momenti in cui un brand sviluppa nuovi canali o categorie.";
 const short=/(brief|sintetic|concise|dirett)/i.test(String(preferences?.communication_style||""));
 const paragraph=(actualFacts?actualFacts+projectLine:"")||
   "Il mio interesse professionale è rivolto alle attività di "+goal+".";
 const offer="Vorrei quindi sottoporvi il mio profilo per eventuali opportunità junior nelle aree "+roleLabel+". "+why;
 const end=short?"Se il mio percorso fosse di interesse, potrei inviare il CV e approfondire una possibile collaborazione.":
  "Se riteneste il mio percorso in linea con future esigenze del team, sarei felice di inviarvi il CV e di approfondire un possibile confronto.";
 const body="Buongiorno,\n\n"+intro+"\n\n"+paragraph+"\n\n"+offer+"\n\n"+end+
  "\n\nGrazie per il tempo dedicato.\nCordiali saluti"+(name?",\n"+name:"");
 return {subject,body,verifiedCv:evidence.verified,cvId:cv?.id||null,focus:focus.label,proof:evidence.proof};
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
export function renderOutreachFolder(lead,{cvs=[],cvId="",draft=null,person={},preferences={}}={}){
 const suggestion=chooseOutreachCv(cvs,lead.area);
 const selected=cvs.find(c=>c.id===cvId)||suggestion;
 const email=composeOutreachEmail(lead,selected,person,preferences);
 const cvExplanation=describeOutreachCv(selected,lead.area);
 const subject=draft?.subject??email.subject,body=draft?.email_body??email.body;
 const cvOptions=cvs.map(c=>'<option value="'+esc(c.id)+'" '+(selected?.id===c.id?"selected":"")+'>'+esc(c.name)+(c.is_default?" · principale":"")+'</option>').join("");
 const sources=sourceCatalog(lead);
 const priority=String(lead.priority||"").toLowerCase();
 const sourceCount=sources.length;
 const signalDate=(lead.evidence||[]).find(x=>x.date)?.date||lead.checkedAt;
 const roleTitle=String(lead.area||"Merchandising / Prodotto").split("/").map(x=>x.trim()).filter(Boolean).slice(0,3).join(" & ");
 const factsText=String(lead.outreachStory||lead.whyNow||lead.evidence[0]?.description||"");
 const relevanceText=String(lead.outreachRelevance||lead.messageAngle||"");
 const caveatText=String(lead.outreachCaution||"Non è stato verificato un annuncio di assunzione collegato a questo segnale.");
 const news=[];
 const pushNews=(x)=>{
   const url=safeLink(x.url);
   if(!url||!x.title||news.some(i=>i.url===url))return;
   news.push({...x,url});
 };
 (lead.editorial||[]).forEach(x=>pushNews({title:x.title,source:x.publisher||sourceHost(x.url),date:x.date||null,url:x.url,summary:x.summary||"",kind:"press"}));
 (lead.news||[]).forEach(x=>pushNews({title:x.title,source:x.publisher||sourceHost(x.url),date:x.date||null,url:x.url,summary:x.summary||"",kind:"radar"}));
 (lead.evidence||[]).forEach(x=>pushNews({title:x.description,source:sourceHost(x.url),date:x.date||null,url:x.url,summary:"",kind:"signal"}));
 const newsLabels={press:"Stampa internazionale",radar:"World Radar",signal:"Segnale verificabile"};
 const press=news.filter(x=>x.kind==="press"||x.kind==="radar");
 const contact=lead.contactEmail&&lead.contactSourceUrl?
  '<strong class="outContactEmail">'+esc(lead.contactEmail)+'</strong>'+
  '<small>'+esc(lead.contactKind||"Email generale del brand; non HR")+'</small>'+
  '<a href="'+esc(lead.contactSourceUrl)+'" target="_blank" rel="noopener noreferrer">Verifica indirizzo ↗</a>':
  '<p>Non è disponibile un contatto recruiting verificato. Consulta il sito ufficiale prima di scrivere.</p>'+
  (lead.contactSourceUrl?'<a href="'+esc(lead.contactSourceUrl)+'" target="_blank" rel="noopener noreferrer">Pagina contatti ↗</a>':"");
 const socialLinks=(lead.socialProfiles||[]).filter(x=>safeLink(x.url)).map(x=>
   '<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.platform)+' ↗</a>').join("");
 const sourceRows=sources.map(sourceItem).join("");
 const newsCards=news.map((n,i)=>{
   const kind=String(n.kind||"press");
   const when=n.date?dateText(n.date):"Data da verificare";
   const intro=n.summary&&n.summary!==n.title?'<p class="brandNewsTeaser"><span class="brandNewsBriefLabel">In breve</span>'+esc(n.summary.slice(0,235))+'</p>':"";
   return '<article class="brandNewsItem" data-outreach-news-kind="'+esc(kind)+'">'+
    '<div class="brandNewsMeta"><span>'+esc(newsLabels[kind]||"Stampa")+' · '+esc(n.source||sourceHost(n.url))+'</span><span>'+esc(when)+'</span></div>'+
    '<h3>'+esc(n.title)+'</h3>'+intro+
    '<div class="brandNewsActions"><a href="'+esc(n.url)+'" target="_blank" rel="noopener noreferrer">Leggi la fonte ↗</a></div></article>';
 }).join("");
 return '<div class="outFolder outFolderV3">'+
  '<div class="folderTopbar outTopbar"><button type="button" class="textBack" data-outreach-back>← Brand da contattare</button>'+
  '<span class="outFolderTag">Ricerca brand · Contatto mirato</span></div>'+
  '<section class="folderHero section outHero"><div class="folderLabel">Candidatura spontanea</div>'+
   '<div class="eyebrow brandEyebrow">'+esc(lead.brand)+'</div>'+
   '<h1>'+esc(roleTitle)+'</h1>'+
   '<p class="lead">Proposta di collaborazione junior · '+esc(lead.brand)+'</p>'+
   '<div class="heroMeta editorialMeta darkMeta">'+
    (priority?'<span class="heroMatch">Priorità '+esc(priority)+'</span>':"")+
    '<span>'+esc(lead.dated?"Segnale recente":"Segnale da rivalutare")+'</span>'+
    '<span>'+esc(dateText(signalDate))+'</span>'+
    '<span>'+sourceCount+' fonti e collegamenti</span></div>'+
   '<div class="actions"><button class="btn green" type="button" data-outreach-jump="letter">Prepara candidatura ↓</button>'+
   '<button class="btn darkSecondary" type="button" data-outreach-save="preparing">Salva in preparazione</button></div></section>'+
  '<nav class="folderTabs section outSectionNav" aria-label="Sezioni del dossier">'+
   '<button type="button" class="folderTab active" data-outreach-jump="reason">Il brand</button>'+
   '<button type="button" class="folderTab" data-outreach-jump="application">La candidatura</button>'+
   '<button type="button" class="folderTab" data-outreach-jump="news">News & fonti</button></nav>'+
  '<section class="outV3Section outReason" id="outReason"><div class="outSectionIntro"><span class="outSectionKicker">IL MOTIVO DEL CONTATTO</span>'+
   '<h2>Perché contattare '+esc(lead.brand)+' adesso</h2></div>'+
   '<p class="outV3Story">'+esc(factsText)+'</p>'+
   (relevanceText?'<div class="outV3Relevance"><strong>Il collegamento con il tuo profilo</strong><p>'+esc(relevanceText)+'</p></div>':"")+
   '<p class="outV3Caution">'+esc(caveatText)+'</p>'+
   '<div class="outStorySources">'+press.slice(0,2).map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.source)+' ↗</a>').join("")+'</div></section>'+
  '<section class="outV3Section outV3Application" id="outApplication"><div class="outSectionIntro">'+
   '<span class="outSectionKicker">PREPARA LA CANDIDATURA</span><h2>La tua proposta</h2>'+
   '<p>HUNT parte dal tuo curriculum verificato e dalle esigenze che emergono dal brand.</p></div>'+
   '<div class="outPrepareColumns"><div>'+
    '<span class="outMiniTitle">Area di interesse</span><strong>'+esc(lead.area)+'</strong>'+
    (lead.messageAngle?'<p class="outRoleAngle">'+esc(lead.messageAngle)+'</p>':"")+
    '</div><div><label for="outCvChoice" class="outMiniTitle">CV da utilizzare</label>'+
    '<select id="outCvChoice" aria-label="Seleziona il CV">'+(cvOptions||'<option value="">Nessun CV caricato</option>')+'</select>'+
    '<p class="outSuggestedCv">'+(suggestion?'HUNT consiglia: <strong>'+esc(suggestion.name)+'</strong>':'Carica e conferma un CV dal profilo per personalizzare la candidatura.')+'</p>'+
    '<p class="outCvReason" id="outCvReason">'+esc(cvExplanation.text)+'</p></div></div></section>'+
  '<section class="outV3Section outLetterSection" id="outLetter"><div class="outSectionIntro">'+
   '<span class="outSectionKicker">IL TUO MESSAGGIO</span><h2>Email pronta da personalizzare</h2>'+
   '<p>Un messaggio professionale costruito sul brand e sulle tue esperienze verificate. Ogni parola è modificabile.</p></div>'+
   '<label class="outField">Oggetto<input type="text" id="outSubject" value="'+esc(subject)+'" maxlength="300"></label>'+
   '<label class="outField">Testo email<textarea id="outBody" rows="13">'+esc(body)+'</textarea></label>'+
   '<div class="outEmailActions"><button type="button" data-outreach-save="preparing">Salva la bozza</button>'+
    '<button type="button" data-outreach-copy>Copia email</button>'+
    '<button type="button" data-outreach-regenerate>Ripristina testo consigliato</button></div>'+
   '<p class="outSaveState" id="outSaveState" aria-live="polite"></p></section>'+
  '<section class="outV3Section outV3Contact"><div class="outSectionIntro"><span class="outSectionKicker">DOVE SCRIVERE</span>'+
   '<h2>Contatta il brand</h2></div>'+
   '<div class="outContactLine">'+contact+'</div>'+
   (lead.contactEmail&&lead.contactSourceUrl?'<button type="button" class="outMailtoAction" data-outreach-mailto>Apri nel programma email ↗</button>':"")+
   (lead.careerUrl?'<p><a href="'+esc(lead.careerUrl)+'" target="_blank" rel="noopener noreferrer">Controlla prima le posizioni ufficiali ↗</a></p>':"")+
   '<p class="outSmallNote">Un indirizzo generale non è un indirizzo HR. HUNT non invia email automaticamente.</p></section>'+
  '<section class="outV3Section brandGlobalNews outV3News" id="outNews"><div class="brandGlobalNewsHead">'+
    '<div><div class="eyebrow">News & mondo fashion</div><h2>'+esc(lead.brand)+' nel mondo</h2>'+
    '<p>Notizie aziendali e stampa internazionale con fonte e data. Sono informazioni per prepararti, non annunci di lavoro.</p></div>'+
    '<div class="brandGlobalNewsNav"><button type="button" class="worldReadToggle" data-outreach-all-news>Apri tutte le Fashion News</button></div></div>'+
   '<div class="brandNewsSwitch" role="group" aria-label="Filtra le notizie del brand">'+
    '<button type="button" class="active" data-outreach-news-filter="all">Tutte</button>'+
    '<button type="button" data-outreach-news-filter="press">Stampa</button>'+
    '<button type="button" data-outreach-news-filter="radar">World Radar</button>'+
    '<button type="button" data-outreach-news-filter="signal">Segnali</button></div>'+
   '<p class="brandNewsCounter" id="outNewsCounter">'+news.length+' notizie e segnali documentati</p>'+
   '<div class="brandGlobalNewsList" id="outNewsList">'+newsCards+'</div>'+
   (news.length?'':'<p class="outV3Caution">Nessuna notizia pertinente verificata in questo momento.</p>')+
   '<div class="outV3Sources"><h3>Fonti e profili del brand</h3>'+
    (socialLinks?'<div class="outSocialLinks">'+socialLinks+'</div>':"")+
    '<p>Questi sono collegamenti a profili ufficiali, non un monitoraggio automatico di tutti i loro post.</p>'+
    '<details class="outEvidenceDetails"><summary>Tutte le fonti utilizzate <span>'+sourceCount+' collegamenti</span></summary>'+
      '<ul class="outSources">'+sourceRows+'</ul></details></div></section>'+
  '<footer class="outFolderFoot"><button type="button" data-outreach-save="applied" class="outApplied">Ho inviato la candidatura</button>'+
   '<span>Registra un invio effettuato personalmente. HUNT non spedisce messaggi.</span></footer></div>';
}
