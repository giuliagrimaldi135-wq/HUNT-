/* Real product workspace for applications.
 * Source facts and candidate evidence arrive separately. No personality scoring. */
const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const qualityLabel={
 found:"Presente nel CV",detected:"Individuato nel testo",partial:"Da approfondire",
 alternate:"In un altro CV",missing:"Non documentato"
};
const stateIcon={found:"✓",detected:"✓",partial:"·",alternate:"↗",missing:"—"};
function safeSource(u){
 try{const link=new URL(String(u));return ["http:","https:"].includes(link.protocol)?link.href:""}
 catch{return ""}
}
function req(item,compact=false){
 const match=item.match||{},state=match.state||"missing";
 const label=qualityLabel[state]||match.label||"Non documentato";
 return '<div class="hwRequirement '+(compact?"is-compact":"")+'">'+
   '<span class="hwRequirementIcon hwRequirementIcon-'+esc(state)+'" aria-hidden="true">'+(stateIcon[state]||"·")+'</span>'+
   '<div class="hwRequirementCopy"><strong>'+esc(item.text||"")+'</strong>'+
   (!compact&&match.evidence?'<p>'+esc(match.evidence)+'</p>':"")+'</div>'+
   '<span class="hwRequirementStatus">'+esc(label)+'</span></div>';
}
function responsibilities(duties,limit){
 const list=Array.isArray(duties)?duties.filter(Boolean):[];
 return list.length?'<ol class="hwTaskList">'+list.slice(0,limit||list.length).map((t,i)=>'<li><span>'+String(i+1).padStart(2,"0")+'</span><p>'+esc(t)+'</p></li>').join("")+'</ol>':
 '<p class="hwEmpty">La descrizione acquisita non contiene attività sufficientemente dettagliate. Il collegamento all’annuncio originale rimane disponibile.</p>';
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
 const previewTasks=responsibilities(duties,3);
 const previewReq=relevant.length?'<div class="hwOverviewRequirements">'+relevant.slice(0,3).map(item=>req(item,true)).join("")+'</div>':
  '<p class="hwEmpty">Non sono disponibili requisiti professionali sufficientemente specifici per il confronto.</p>';
 const overview=panel("overview",active,
  '<div class="hwOverview">'+
   '<div class="hwOverviewHeading"><div><span class="hwEyebrow">La posizione</span><h3>Il lavoro, in breve</h3>'+
    '<p>Le responsabilità principali riportate nell’annuncio.</p></div>'+
    '<button type="button" class="hwOverviewOpen" data-switch-job-tab="tasks">Tutte le attività <span aria-hidden="true">↗</span></button></div>'+
   '<div class="hwOverviewTasks">'+previewTasks+'</div>'+
   '<div class="hwOverviewDivider"></div>'+
   '<div class="hwOverviewHeading hwOverviewHeadingSkills"><div><span class="hwEyebrow">Per questa candidatura</span>'+
    '<h3>Le competenze determinanti</h3><p>Requisiti professionali confrontati con il curriculum scelto.</p></div>'+
    '<button type="button" class="hwOverviewOpen" data-switch-job-tab="criteria">Confronto completo <span aria-hidden="true">↗</span></button></div>'+
   previewReq+
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
