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
    contactEmail:email,contactSourceUrl:safeLink(item.contact_source_url),
    contactDescription:email?"Email indicata nel dossier: verifica sulla pagina ufficiale, non necessariamente recruiting":String(item.contact||"").trim(),
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

export function composeOutreachEmail(lead,cv={},person={}){
 const p=cv?.parsed_profile||{};
 const confirmed=Boolean(p.profile_confirmed_by_user||p.profile_verified_from_user_history);
 const name=String(person.display_name||[person.first_name,person.last_name].filter(Boolean).join(" ")||"").trim();
 const education=confirmed&&Array.isArray(p.education)?p.education[0]:null;
 const experience=confirmed&&Array.isArray(p.experience)?p.experience[0]:null;
 const school=String(education?.school||"").trim(),program=String(education?.program||"").trim();
 const company=String(experience?.company||"").trim();
 const facts=[];
 if(program&&school)facts.push("Ho una formazione in "+program+" presso "+school+".");
 else if(program)facts.push("Ho una formazione in "+program+".");
 if(company)facts.push("Ho maturato un’esperienza professionale presso "+company+".");
 const signal=(lead.evidence||[]).find(x=>x.description);
 const first=signal?"Ho letto la notizia relativa a "+String(signal.description).replace(/[.!?]+$/,"").slice(0,170)+".":"Ho seguito le attività di "+lead.brand+".";
 const area=String(lead.area||"merchandising e buying");
 const subject="Candidatura spontanea | "+area+" — "+lead.brand;
 const body="Buongiorno,\n\n"+first+" Per questo vorrei proporre il mio profilo per eventuali opportunità junior nell’area "+area+".\n\n"+
 (facts.length?facts.join(" ")+"\n\n":"")+
 "Mi piacerebbe contribuire al lavoro del team, imparando da vicino come vengono gestiti prodotti, assortimenti e attività commerciali. Se fosse possibile, sarei felice di inviarvi il mio curriculum e approfondire eventuali possibilità di collaborazione.\n\n"+
 "Vi ringrazio per l’attenzione.\n\nCordiali saluti"+(name?",\n"+name:"");
 return {subject,body,verifiedCv:confirmed};
}
const sourceLine=e=>'<li class="outSource"><div><strong>'+esc(e.description)+'</strong><small>'+esc(dateText(e.date))+'</small></div><a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">Leggi la fonte ↗</a></li>';
export function renderOutreachCards(leads=[],drafts={}){
 if(!leads.length)return '<section class="outEmpty"><h2>Nessun segnale abbastanza solido da proporti adesso.</h2><p>HUNT continua a raccogliere notizie e fonti ufficiali. Una semplice menzione sui social non basta per suggerirti una candidatura.</p></section>';
 return '<div class="outResults">'+leads.map(x=>{
  const status=drafts[x.key]?.status,when=x.evidence.find(e=>e.date)?.date||x.checkedAt;
  return '<article class="outLead"><div class="outLeadMain"><span class="outEyebrow">'+esc(x.dated?"Segnale recente":"Segnale storico · da rivalutare")+'</span><h2>'+esc(x.brand)+'</h2>'+
   '<p class="outLeadWhy">'+esc(x.whyNow||x.evidence[0]?.description||"")+'</p><div class="outLeadMeta">'+
   '<span>'+esc(x.area)+'</span><span>Fonte: '+esc(new URL(x.sourceUrl).hostname.replace(/^www\./,""))+'</span>'+
   '<span>'+esc(dateText(when))+'</span></div></div>'+
   '<div class="outLeadActions">'+(status?'<span class="outStatus">'+esc(status==="applied"?"Indicata come inviata":status==="archived"?"Archiviata":"Bozza salvata")+'</span>':"")+
   '<button type="button" class="outOpen" data-outreach-open="'+esc(x.key)+'">Apri folder <span aria-hidden="true">↗</span></button></div></article>';
 }).join("")+'</div>';
}
export function renderOutreachFolder(lead,{cvs=[],cvId="",draft=null,person={}}={}){
 const selected=cvs.find(c=>c.id===cvId)||cvs.find(c=>c.is_default)||cvs[0]||null;
 const initial=composeOutreachEmail(lead,selected,person);
 const subject=draft?.subject??initial.subject,body=draft?.email_body??initial.body;
 const cvOptions=cvs.map(c=>'<option value="'+esc(c.id)+'" '+(selected?.id===c.id?"selected":"")+'>'+esc(c.name)+(c.is_default?" · principale":"")+'</option>').join("");
 const contact=lead.contactEmail&&lead.contactSourceUrl?
   '<p><strong>'+esc(lead.contactEmail)+'</strong></p><p>Indirizzo riportato nella ricerca. Verificalo sul sito del brand: non è identificato come recruiting.</p>'+
   '<a href="'+esc(lead.contactSourceUrl)+'" target="_blank" rel="noopener noreferrer">Verifica il contatto sul sito ufficiale ↗</a>':
   '<p>Non è disponibile un indirizzo recruiting verificato. Non useremo email ipotizzate.</p>'+
   (lead.contactDescription?'<p class="outNote">'+esc(lead.contactDescription)+'</p>':"")+
    (lead.contactSourceUrl?'<p><a href="'+esc(lead.contactSourceUrl)+'" target="_blank" rel="noopener noreferrer">Consulta i contatti pubblicati dal brand ↗</a></p>':"");
 return '<div class="outFolder"><div class="outFolderTop"><button type="button" class="outBack" data-outreach-back>← Tutte le spontanee</button><span class="outEyebrow">HUNT / FOLDER CANDIDATURA</span></div>'+
  '<header class="outFolderHero"><h1>'+esc(lead.brand)+'</h1><p>'+esc(lead.area)+'</p></header>'+
  '<section class="outFolderSection"><span class="outSectionKicker">Il momento</span><h2>Perché candidarti adesso</h2><p class="outStory">'+esc(lead.whyNow)+'</p><p class="outEvidenceCaution">È un segnale commerciale, non una conferma di assunzioni. Controlla l’aggiornamento delle fonti prima dell’invio.</p>'+
   '<ul class="outSources">'+lead.evidence.map(sourceLine).join("")+'</ul></section>'+
   '<section class="outFolderSection"><span class="outSectionKicker">Contesto</span><h2>News del brand da conoscere</h2>'+
   ((lead.news||[]).length?'<ul class="outSources">'+lead.news.map(n=>sourceLine({description:n.title,url:n.url,date:n.date})).join("")+'</ul>':
   '<p>Non risultano altri articoli recenti collegati con sufficiente certezza a questo brand.</p>')+'</section>'+
  '<section class="outFolderSection"><span class="outSectionKicker">Preparazione</span><h2>Scheda candidatura</h2>'+
  '<div class="outFacts"><div><span>Area suggerita</span><strong>'+esc(lead.area)+'</strong></div><div><span>CV per questa candidatura</span>'+
  '<select id="outCvChoice" aria-label="Seleziona il CV">'+(cvOptions||'<option value="">Nessun CV caricato</option>')+'</select></div>'+
  '<div><span>Ultimo aggiornamento segnale</span><strong>'+esc(dateText(lead.checkedAt))+'</strong></div></div>'+
  '<p class="outNote">Una posizione aperta coerente sul sito del brand ha sempre priorità rispetto alla candidatura spontanea.</p></section>'+
  '<section class="outFolderSection"><span class="outSectionKicker">Il messaggio</span><h2>Email pronta da personalizzare</h2>'+
  '<p>Bozza modificabile basata sul segnale pubblicato. Le esperienze nel testo vengono inserite solo se confermate nel CV selezionato.</p>'+
  '<label class="outField">Oggetto<input type="text" id="outSubject" value="'+esc(subject)+'" maxlength="300"></label>'+
  '<label class="outField">Testo email<textarea id="outBody" rows="12">'+esc(body)+'</textarea></label>'+
  '<div class="outEmailActions"><button type="button" data-outreach-save="preparing">Salva la bozza</button>'+
  '<button type="button" data-outreach-copy>Copia email</button>'+
  '<button type="button" data-outreach-regenerate>Ricrea dal CV selezionato</button></div>'+
  '<p class="outNote">Ricreare la bozza sostituisce il testo visibile: salva prima eventuali modifiche che vuoi conservare.</p>'+
  '<p class="outSaveState" id="outSaveState" aria-live="polite"></p></section>'+
  '<section class="outFolderSection"><span class="outSectionKicker">Il canale</span><h2>Dove contattare il brand</h2>'+
  contact+(lead.careerUrl?'<p><a href="'+esc(lead.careerUrl)+'" target="_blank" rel="noopener noreferrer">Controlla prima le posizioni aperte ↗</a></p>':"")+
  '<p class="outNote">Non inviare candidature a email di customer care o private senza indicazioni pubbliche pertinenti.</p></section>'+
  '<div class="outFolderFoot"><button type="button" data-outreach-save="applied" class="outApplied">Ho inviato la candidatura</button>'+
  '<span>Il pulsante registra il tuo invio: HUNT non spedisce email automaticamente.</span></div></div>';
}
