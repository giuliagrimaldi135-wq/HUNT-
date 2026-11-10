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
 return list.length?'<ul class="hwTaskList">'+list.slice(0,limit||list.length).map(t=>'<li><p>'+esc(t)+'</p></li>').join("")+'</ul>':
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
  return "La posizione si concentra sulla pianificazione commerciale e sulla disponibilità dei prodotti. Il lavoro comprende il controllo dei budget e il monitoraggio dello stock e delle allocazioni: attività che collegano analisi commerciale e gestione operativa del prodotto.";
 }
 if(matched.length>=2)return "Dalla descrizione emerge un ruolo che unisce "+naturalJoin(matched.slice(0,3))+". Sono queste le attività principali indicate nell'annuncio, da approfondire nelle responsabilità pubblicate dal brand.";
 if(matched.length===1)return "L'annuncio mette al centro "+matched[0]+".";
 const role=String(title||"").trim();
 if((Array.isArray(duties)?duties:[]).filter(Boolean).length){
  return "Per il ruolo"+(role?" di "+role:"")+" sono disponibili alcune attività nell'annuncio originale. Apri «Attività» per leggerle.";
 }
 return "Per questa posizione non è ancora disponibile una descrizione delle responsabilità sufficientemente dettagliata. Puoi consultare l'annuncio originale per verificare mansioni e perimetro del ruolo.";
}

export function renderJobWorkspace(data={}){
 const summary=String(data.summary||"").trim();
 const duties=Array.isArray(data.duties)?data.duties:[];
 const relevant=Array.isArray(data.relevant)?data.relevant:[];
 const cvs=Array.isArray(data.cvs)?data.cvs:[];
 const source=safeSource(data.sourceUrl);
 const chosen=cvs.find(x=>x.selected)||null;
 const cvOpts=cvs.map(cv=>'<option value="'+esc(cv.id)+'" '+(cv.selected?"selected":"")+'>'+esc(cv.name)+(cv.primary?" · principale":"")+'</option>').join("");
 const roleDescription=describePosition(duties,data.roleTitle||"");
 const verification=!chosen?"Nessun CV selezionato":chosen.verified?"Informazioni del CV verificate":chosen.readable?"Dati del CV ancora da verificare":"CV da leggere e verificare";
 const explore=(id,title,sub)=>
  '<button class="hwExploreChoice" type="button" data-hunt-explore="'+id+'" aria-controls="huntExplore-'+id+'" aria-expanded="false">'+
    '<span><strong>'+title+'</strong><small>'+sub+'</small></span><span class="hwExplorePlus" aria-hidden="true">+</span></button>';
 const pane=(id,body)=>
  '<section class="hwExplorePanel" data-hunt-explore-panel="'+id+'" id="huntExplore-'+id+'" hidden>'+
    '<button class="hwExploreClose" type="button" data-hunt-explore-close="'+id+'">Chiudi <span aria-hidden="true">×</span></button>'+body+'</section>';
 const tasks=pane("tasks",
  '<h4>Le attività previste</h4><p class="hwPanelSubhead">Responsabilità riportate nell’annuncio.</p>'+responsibilities(duties));
 const criteria=pane("criteria",
  '<h4>I requisiti richiesti</h4><p class="hwPanelSubhead">Confronto basato sulle informazioni disponibili nel CV scelto.</p>'+
  (relevant.length?'<div class="hwRequirementList is-full">'+relevant.map(r=>req(r,false)).join("")+'</div>':
  '<p class="hwEmpty">L’annuncio disponibile non contiene requisiti sufficienti per un confronto documentato.</p>'));
 return '<section id="huntJobPreparation" class="section huntWorkspace huntWorkspaceEditorial" aria-label="Dettaglio della posizione">'+
  '<div class="hwLayout"><div class="hwMain">'+
   '<article class="hwRoleStory"><header class="hwRoleStoryHead"><span class="hwEyebrow">Dentro la posizione</span>'+
   '<h2>Il ruolo, in sintesi</h2></header>'+
   '<p class="hwRoleDescription">'+esc(roleDescription)+'</p>'+
   (summary?'<section class="hwRoleFit"><span class="hwRoleFitLabel">In relazione al tuo profilo</span><p>'+esc(summary)+'</p></section>':"")+
   '</article>'+
   '<div class="hwExploreIntro"><span>Per approfondire</span><p>Le informazioni dell’annuncio, quando vuoi entrare nel dettaglio.</p></div>'+
   '<div class="hwExploreChoices" role="group" aria-label="Approfondimenti sulla posizione">'+
   explore("tasks","Attività e responsabilità","Come si svolge il lavoro")+
   explore("criteria","Requisiti","Cosa richiede l’azienda")+
   '</div><div class="hwExplorePanels">'+tasks+criteria+'</div>'+
   '<footer class="hwSource"><span>'+(data.officiallyVerified?"Dettagli verificati sull’annuncio aziendale":"Sintesi ricavata dal testo disponibile dell’annuncio")+'</span></footer>'+
  '</div><aside class="hwAside" aria-label="Prepara la candidatura">'+
   '<section class="hwAsideCard"><span class="hwEyebrow">Per questa candidatura</span><h3>Scegli il tuo CV</h3>'+
   '<p>Puoi utilizzare una versione diversa per ogni posizione.</p>'+
   '<label for="dossierCv" class="hwCvLabel">Curriculum</label>'+
   '<select id="dossierCv" aria-label="CV da utilizzare">'+(cvOpts||'<option value="">Nessun CV caricato</option>')+'</select>'+
   '<p class="hwCvState"><span class="hwCvStateDot" aria-hidden="true"></span><span>'+esc(verification)+'</span></p>'+
   '<button class="hwAsideTextAction" type="button" id="reviewRequirementsProfile">'+(chosen&&!chosen.verified?"Verifica i dati del CV":"Gestisci i tuoi CV")+' <span aria-hidden="true">↗</span></button></section>'+
   (source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer" class="hwOpenSource">Vai all’annuncio e candidati <span aria-hidden="true">↗</span></a>':"")+
   '</aside></div></section>';
}
