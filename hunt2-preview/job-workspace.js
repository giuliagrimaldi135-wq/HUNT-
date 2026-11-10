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
  return "Il ruolo riguarda la pianificazione commerciale: controllo dei budget, disponibilità dei prodotti e monitoraggio di stock e allocazioni.";
 }
 if(matched.length>=2)return "Le attività indicate nell'annuncio riguardano "+naturalJoin(matched.slice(0,3))+".";
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
 const description=describePosition(duties,data.roleTitle||"");
 const disclosure=(title,hint,body,extraClass="")=>
  '<details class="hwDisclosure '+extraClass+'"><summary><span class="hwDisclosureHeading"><strong>'+title+'</strong><small>'+hint+'</small></span><span class="hwChevron" aria-hidden="true"></span></summary><div class="hwDisclosureContent">'+body+'</div></details>';
 const dutiesPanel=disclosure(
  "Attività","Le responsabilità riportate nell’annuncio",
  responsibilities(duties),"hwDutiesDetail"
 );
 const requirementsPanel=disclosure(
  "Requisiti","Confronta le richieste del brand con il CV selezionato",
  relevant.length?'<div class="hwRequirementList is-full">'+relevant.map(r=>req(r,false)).join("")+'</div>':
  '<p class="hwEmpty">Non ci sono informazioni sufficienti per verificare i requisiti. Consulta l’annuncio originale.</p>',"hwRequirementsDetail"
 );
 const profilePanel=summary?disclosure(
  "Confronto con il mio CV","Punti pertinenti e aspetti da verificare",
  '<p class="hwProfileExplanation">'+esc(summary)+'</p>',"hwProfileDetail"
 ):"";
 const verification=!chosen?"Non hai ancora scelto un CV":chosen.verified?"Dati del CV confermati":chosen.readable?"Dati del CV da verificare":"Lettura del CV da completare";
 return '<section id="huntJobPreparation" class="section huntWorkspace huntWorkspaceSimplified" aria-label="Dettaglio della posizione">'+
  '<div class="hwLayout"><div class="hwMain">'+
  '<header class="hwIntro"><span class="hwEyebrow">La posizione</span><h2>Cosa farai</h2>'+
  '<p class="hwEditorialStory">'+esc(description)+'</p></header>'+
  '<div class="hwDisclosureList">'+dutiesPanel+requirementsPanel+profilePanel+'</div>'+
  '<footer class="hwSource"><span>'+(data.officiallyVerified?"Informazioni verificate sull’annuncio aziendale":"Sintesi basata sul testo disponibile dell’annuncio")+'</span></footer>'+
  '</div><aside class="hwAside" aria-label="Prepara la candidatura">'+
  '<section class="hwAsideCard"><h3>Il CV per questa candidatura</h3>'+
  '<p>Scegli il documento da usare e confrontare con i requisiti.</p>'+
  '<label for="dossierCv" class="hwCvLabel">Curriculum</label>'+
  '<select id="dossierCv" aria-label="CV da utilizzare">'+(cvOpts||'<option value="">Nessun CV caricato</option>')+'</select>'+
  '<p class="hwCvState"><span class="hwCvStateDot" aria-hidden="true"></span><span>'+esc(verification)+'</span></p>'+
  '<button class="hwAsideTextAction" type="button" id="reviewRequirementsProfile">Gestisci i miei CV <span aria-hidden="true">↗</span></button></section>'+
  (source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer" class="hwOpenSource">Vai all’annuncio e candidati <span aria-hidden="true">↗</span></a>':"")+
  '</aside></div></section>';
}
