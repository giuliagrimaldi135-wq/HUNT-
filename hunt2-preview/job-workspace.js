/* Real product workspace for applications.
 * Source facts and candidate evidence arrive separately. No personality scoring. */
const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const qualityLabel={
 found:"Presente nel CV",detected:"Indicato nel CV",partial:"Presente in parte",
 alternate:"Solo in un altro CV",missing:"Non indicato nel CV"
};
const stateIcon={found:"✓",detected:"✓",partial:"·",alternate:"↗",missing:"—"};
function safeSource(u){
 try{const link=new URL(String(u));return ["http:","https:"].includes(link.protocol)?link.href:""}
 catch{return ""}
}
function req(item,compact=false){
 const match=item.match||{},state=match.state||"missing";
 const label=qualityLabel[state]||match.label||"Non indicato nel CV";
 const rawTitle=String(item.text||"").trim();
 const title=/^competenze excel richieste$/i.test(rawTitle)?"Conoscenza di Excel":rawTitle;
 // The short preview should show the specific skill actually written in the CV,
 // not just a vague status such as "detected" or "in a different document".
 const evidence=String(match.evidence||"").trim();
 const shortEvidence=compact&&["found","detected"].includes(state)&&evidence.length<=95;
 return '<div class="hwRequirement '+(compact?"is-compact":"")+'">'+
   '<span class="hwRequirementIcon hwRequirementIcon-'+esc(state)+'" aria-hidden="true">'+(stateIcon[state]||"·")+'</span>'+
   '<div class="hwRequirementCopy"><strong>'+esc(title)+'</strong>'+
   ((!compact||shortEvidence)&&evidence?'<p class="'+(compact?"hwCompactEvidence":"")+'">'+esc(evidence)+'</p>':"")+'</div>'+
   '<span class="hwRequirementStatus">'+esc(label)+'</span></div>';
}
function responsibilities(duties,limit){
 const list=Array.isArray(duties)?duties.filter(Boolean):[];
 return list.length?'<ol class="hwTaskList">'+list.slice(0,limit||list.length).map((t,i)=>'<li><span>'+String(i+1).padStart(2,"0")+'</span><p>'+esc(t)+'</p></li>').join("")+'</ol>':
 '<p class="hwEmpty">La descrizione acquisita non contiene attività sufficientemente dettagliate. Il collegamento all’annuncio originale rimane disponibile.</p>';
}
function naturalJoin(items){
 if(!items.length)return "";
 if(items.length===1)return items[0];
 return items.slice(0,-1).join(", ")+" e "+items.at(-1);
}
export function describePosition(duties=[],title=""){
 const text=(Array.isArray(duties)?duties:[]).filter(Boolean).join(" ").toLowerCase();
 const topics=[
  [/budget|spes[ae]|finanz|financial planning/,"pianificazione e monitoraggio dei budget"],
  [/stock|giacenz|inventar|disponibilit[aà] dei prodotti/,"gestione delle disponibilità di prodotto"],
  [/allocaz|allocation|distribuzione dei prodotti/,"allocazione dei prodotti"],
  [/vendit|sales performance|sales report|sales data/,"analisi delle vendite"],
  [/assortiment|product mix|mix di prodotto/,"assortimenti e mix di prodotto"],
  [/produzione|production plan|pianificazione.*sku/,"pianificazione della produzione"],
  [/fornitor|sourcing|supplier/,"rapporti con i fornitori"],
  [/e-commerce|ecommerce|online store/,"attività e-commerce"],
  [/client|customer|accoglienz/,"relazione con i clienti"],
  [/visual merchandis|allestiment|vetrin/,"presentazione dei prodotti negli spazi di vendita"],
  [/campagn|marketing|comunicazion|content/,"iniziative commerciali e di comunicazione"],
  [/retail|negoz|boutique|store operations/,"attività operative nei punti vendita"]
 ];
 const matched=topics.filter(([re])=>re.test(text)).map(x=>x[1]);
 if(/budget/.test(text)&&/stock|giacenz|allocaz/.test(text)){
  return "La posizione si concentra sulla pianificazione commerciale e sulla disponibilità dei prodotti. Il lavoro comprende il controllo dei budget e il monitoraggio dello stock e delle allocazioni: attività che mettono in relazione analisi e gestione operativa del prodotto.";
 }
 if(matched.length>=2)return "Dalle responsabilità pubblicate emerge un ruolo che combina "+naturalJoin(matched.slice(0,3))+". Le attività spaziano quindi tra queste aree, con un equilibrio che dipende dall'organizzazione del team e dalle priorità dell'azienda.";
 if(matched.length===1)return "Il focus della posizione, per quanto emerge dalla descrizione disponibile, è "+matched[0]+". La scheda Attività riporta le responsabilità acquisite dall'annuncio, senza aggiungere mansioni ipotizzate.";
 const role=String(title||"").trim();
 if((Array.isArray(duties)?duties:[]).filter(Boolean).length){
  return "L'annuncio descrive un ruolo"+(role?" di "+role:"")+" attraverso le sue responsabilità operative. Per comprendere il lavoro quotidiano, consulta le attività riportate dall'azienda nella scheda dedicata.";
 }
 return "Per questa posizione non è ancora disponibile una descrizione delle responsabilità sufficientemente dettagliata. Puoi consultare l'annuncio originale per verificare mansioni e perimetro del ruolo.";
}

function tab(name,label,active){
 return '<button type="button" role="tab" class="hwTab '+(active===name?"is-active":"")+'" data-job-workspace-tab="'+name+'" aria-selected="'+(active===name?"true":"false")+'" aria-controls="hw-pane-'+name+'">'+label+'</button>';
}
function panel(name,active,content){
 return '<section role="tabpanel" id="hw-pane-'+name+'" class="hwPane" data-job-workspace-pane="'+name+'" '+(name===active?"":"hidden")+'>'+content+'</section>';
}
export function renderJobWorkspace(data={}){
 const summary=String(data.summary||"").trim();
 const duties=Array.isArray(data.duties)?data.duties:[];
 const relevant=Array.isArray(data.relevant)?data.relevant:[];
 const cvs=Array.isArray(data.cvs)?data.cvs:[];
 const active=["overview","tasks","criteria"].includes(data.activeTab)?data.activeTab:"overview";
 const source=safeSource(data.sourceUrl);
 const chosen=cvs.find(x=>x.selected)||null;
 const cvOpts=cvs.map(cv=>'<option value="'+esc(cv.id)+'" '+(cv.selected?"selected":"")+'>'+esc(cv.name)+(cv.primary?" · principale":"")+'</option>').join("");
 const roleDescription=describePosition(duties,data.roleTitle||"");
 const overview=panel("overview",active,
  '<div class="hwEditorialOverview">'+
   '<div class="hwEditorialHeadline"><span class="hwEyebrow">Dentro la posizione</span>'+
    '<h3>Il ruolo, in sintesi</h3></div>'+
   '<p class="hwEditorialStory">'+esc(roleDescription)+'</p>'+
   '<div class="hwEditorialExplore">'+
    '<button type="button" class="hwEditorialLink" data-switch-job-tab="tasks">'+
      '<span class="hwEditorialLinkBody"><span class="hwEditorialNumber">01 / IL RUOLO</span>'+
        '<strong>Attività e responsabilità</strong>'+
        '<small>Scopri le mansioni descritte nell’annuncio</small></span>'+
      '<span class="hwEditorialArrow" aria-hidden="true">↗</span></button>'+
    '<button type="button" class="hwEditorialLink" data-switch-job-tab="criteria">'+
      '<span class="hwEditorialLinkBody"><span class="hwEditorialNumber">02 / IL PROFILO</span>'+
        '<strong>Competenze richieste</strong>'+
        '<small>Confronta i requisiti con il tuo curriculum</small></span>'+
      '<span class="hwEditorialArrow" aria-hidden="true">↗</span></button>'+
   '</div>'+
  '</div>');
 const tasks=panel("tasks",active,
  '<div class="hwPanelHeading"><h3>Attività e responsabilità</h3><span>La descrizione del lavoro</span></div>'+
  '<p class="hwPanelSubhead">Attività riportate nell’annuncio della posizione.</p>'+
  responsibilities(duties));
 const criteria=panel("criteria",active,
  '<div class="hwPanelHeading"><h3>Requisiti professionali</h3><span>Confronto con il CV selezionato</span></div>'+
  '<p class="hwPanelSubhead">Il confronto mette in evidenza le competenze professionali più importanti per questo ruolo.</p>'+
  (relevant.length?'<div class="hwRequirementList is-full">'+relevant.map(r=>req(r,false)).join("")+'</div>':
  '<p class="hwEmpty">Non sono disponibili requisiti tecnici sufficienti per un confronto documentato.</p>'));
 return '<section class="section huntWorkspace" aria-label="Analisi della candidatura">'+
   '<header class="hwLead"><span class="hwEyebrow">Analisi di HUNT</span><h2>Questa opportunità, nel concreto.</h2>'+
   '<p>'+esc(summary)+'</p></header>'+
   '<div class="hwLayout"><div class="hwMain">'+
   '<nav class="hwTabs" role="tablist" aria-label="Sezioni della posizione">'+
   tab("overview","Panoramica",active)+tab("tasks","Attività",active)+tab("criteria","Requisiti",active)+'</nav>'+
   '<div class="hwContent">'+overview+tasks+criteria+'</div>'+
   '<footer class="hwSource">'+
   '<span>'+(data.officiallyVerified?"Contenuto verificato sull’annuncio aziendale":"Informazioni ricavate dal testo disponibile")+'</span>'+
   (source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">Leggi l’annuncio completo ↗</a>':"")+
   '</footer></div>'+
   '<aside class="hwAside" aria-label="La tua candidatura">'+
   '<section class="hwAsideCard"><span class="hwEyebrow">Il tuo dossier</span><h3>Curriculum da utilizzare</h3>'+
   '<p>HUNT propone la versione più pertinente. La scelta finale è tua.</p>'+
   '<label for="dossierCv" class="hwCvLabel">CV selezionato</label>'+
   '<select id="dossierCv" aria-label="CV per il confronto">'+(cvOpts||'<option value="">Nessun curriculum</option>')+'</select>'+
   '<div class="hwCvState"><span class="hwCvStateDot"></span><span>'+esc(!chosen?"Aggiungi un CV nel Profilo":chosen.verified?"Informazioni confermate":chosen.readable?"Da confermare nel Profilo":"Lettura del CV non completata")+'</span></div>'+
   '<button class="hwAsideTextAction" type="button" id="reviewRequirementsProfile">Apri il Profilo <span aria-hidden="true">↗</span></button></section>'+
   '<section class="hwNextSteps"><h3>Come procedere</h3><div><span>1</span><p>Valuta le attività e i requisiti</p></div><div><span>2</span><p>Scegli il curriculum più adatto</p></div><div><span>3</span><p>Candidati dal sito dell’azienda</p></div>'+
   (source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer" class="hwOpenSource">Vai all’annuncio ufficiale <span aria-hidden="true">↗</span></a>':"")+'</section>'+
   '<div class="hwUpcoming"><span>IN SVILUPPO</span><strong>Cover letter</strong><small>Personalizzazione della lettera, prossimamente.</small></div>'+
   '</aside></div></section>';
}
