/* HUNT resume management — library navigation and clearly separated profile views. */
import {evidenceForDisplay,projectNameForDisplay} from "./cv-display.js?v=20261109-150";
const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
function fileIcon(){
 return '<svg width="20" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 2.5h9l5 5V22H5z"/><path d="M14 2.5V8h5"/><path d="M8 12h8M8 16h8"/></svg>';
}
function cleanRole(s){return String(s||"").replace(/\s+academic project$/i,"").trim()}
function period(x){
 const begin=x?.start?String(x.start):"",end=x?.end?String(x.end):"";
 return begin?begin+(end?" – "+end:" – oggi"):"";
}
function pills(vals){
 return (Array.isArray(vals)?vals:[]).map(x=>'<span class="cvWChip">'+esc(typeof x==="string"?x:[x.program,x.school].filter(Boolean).join(" · "))+'</span>').join("");
}
function activities(values,max){
 return Array.isArray(values)&&values.length?
 '<ul class="cvWEvidence">'+values.slice(0,max||values.length).map(x=>{
   const v=evidenceForDisplay(x,"it");
   return '<li>'+esc(v.text)+(v.needsTranslation?'<small>Testo originale del CV</small>':"")+'</li>';
 }).join("")+'</ul>':"";
}
function record(x,type){
 const exp=type==="experience",name=exp?(x.company||x.role||"Esperienza"):projectNameForDisplay(x.name||"Progetto","it");
 return '<article class="cvWRecord">'+
   '<div class="cvWRecordHeading"><div><h4>'+esc(name)+'</h4>'+
   (exp&&x.role?'<p>'+esc(x.role)+'</p>':"")+'</div>'+
   (exp&&period(x)?'<span>'+esc(period(x))+'</span>':"")+'</div>'+
   (activities(x.evidence)||'<p class="cvWEmpty">Nessuna attività dettagliata nel documento.</p>')+'</article>';
}
function tab(id,label,active){
 return '<button type="button" role="tab" class="cvWTab '+(id===active?"is-current":"")+'" data-cv-panel-target="'+id+'" aria-selected="'+(id===active?"true":"false")+'" aria-controls="cvw-'+id+'">'+label+'</button>';
}
function pane(id,active,html){
 return '<section class="cvWPane" id="cvw-'+id+'" role="tabpanel" data-cv-panel="'+id+'" '+(id===active?"":"hidden")+'>'+html+'</section>';
}
export function renderCvLibrary({cvs=[],selectedId=null,statusFor}){
 const list=cvs.map(x=>{
   const selected=x.id===selectedId;
   return '<div class="cvWFile '+(selected?"is-selected":"")+'">'+
    '<button type="button" class="cvWFileSelect" data-cv-action="select" data-cv-id="'+esc(x.id)+'" aria-current="'+(selected?"true":"false")+'">'+
     '<span class="cvWFileIcon">'+fileIcon()+'</span>'+
     '<span class="cvWFileText"><strong>'+esc(x.name||"Curriculum")+'</strong><small>'+esc(x.is_default?"Principale · "+statusFor(x):statusFor(x))+'</small></span>'+
     '</button>'+
    '<details class="cvWFileMenu"><summary aria-label="Opzioni per '+esc(x.name||"CV")+'" title="Gestisci CV">•••</summary>'+
     '<div class="cvWFileMenuItems">'+(!x.is_default?'<button type="button" data-cv-action="default" data-cv-id="'+esc(x.id)+'">Imposta come principale</button>':
      cvs.length>1?'<button type="button" data-cv-action="secondary" data-cv-id="'+esc(x.id)+'">Rendi secondario</button>':"")+
     '<button type="button" class="is-danger" data-cv-action="delete-cv" data-cv-id="'+esc(x.id)+'">Elimina CV</button></div></details>'+
    '</div>';
 }).join("");
 return '<aside class="cvWLibrary" aria-label="I tuoi curriculum">'+
   '<div class="cvWLibraryHeader"><div><span>ARCHIVIO</span><h2>I tuoi CV</h2></div><small>'+cvs.length+' document'+(cvs.length===1?"o":"i")+'</small></div>'+
   '<div class="cvWLibraryList">'+(list||'<p class="cvWEmpty">Non hai ancora caricato curriculum.</p>')+'</div>'+
   '<details class="cvWUpload"><summary><span>＋</span> Aggiungi un CV</summary>'+
    '<div class="cvWUploadFields"><label>Nome del CV<input id="cvUploadName" placeholder="Es. Planning"></label>'+
     '<label>Documento<input id="cvUploadFile" type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"></label>'+
     '<button class="btn primary" type="button" data-cv-action="upload">Carica e analizza</button></div></details>'+
    '<p class="cvWLibraryFoot">I CV restano privati. Quello principale viene proposto per primo, ma puoi sceglierne un altro per ogni candidatura.</p>'+
   '</aside>';
}
export function renderCvWorkspace({cv,info,areas=[],confirmed=false,activePanel="overview",corrections=""}){
 if(!cv)return '<section class="cvWBlank"><h2>Inizia dal tuo curriculum</h2><p>Carica un CV dall’archivio per vedere esperienze, progetti e competenze.</p></section>';
 const a=["overview","experience","projects","skills","areas","edit"].includes(activePanel)?activePanel:"overview";
 const exp=info.experience||[],projects=info.projects||[],edu=info.education||[],tools=info.tools||[],languages=info.languages||[];
 const related=areas.filter(x=>x.related);
 const overview=
  '<div class="cvWPanelHeader"><h3>Il tuo CV, in breve</h3><p>Queste sono le informazioni ricavate da HUNT. Esplora il tuo percorso e, quando serve, correggi i dati riconosciuti dal documento.</p></div>'+
  '<div class="cvWSnapshot cvWSnapshotEditorial cvWSimpleSummary">'+
   '<section class="cvWSnapshotMain"><div class="cvWSnapshotTitle"><h4>Esperienza</h4></div>'+
     (exp.length?'<strong>'+esc(exp[0].company||exp[0].role||"Esperienza")+'</strong>'+
       '<p class="cvWSnapshotRole">'+esc(exp[0].role||"")+'</p>'+activities(exp[0].evidence,1):
       '<p class="cvWEmpty">Nessuna esperienza riconosciuta in questo CV.</p>')+
     '<button class="cvWDetailsLink" type="button" data-cv-panel-target="experience">Vedi le esperienze <span aria-hidden="true">↗</span></button></section>'+
   '<div class="cvWSnapshotSide">'+
    '<section><div class="cvWSnapshotTitle"><h4>Progetti</h4></div>'+
      (projects.length?projects.slice(0,2).map(x=>'<p class="cvWSnapshotItem">'+esc(projectNameForDisplay(x.name,"it"))+'</p>').join(""):'<p class="cvWEmpty">Nessun progetto riconosciuto.</p>')+
      '<button class="cvWDetailsLink" type="button" data-cv-panel-target="projects">Vedi i progetti <span aria-hidden="true">↗</span></button></section>'+
    '<section><div class="cvWSnapshotTitle"><h4>Formazione e competenze</h4></div>'+
      (edu.length?'<p class="cvWSnapshotItem">'+esc([edu[0].program,edu[0].school].filter(Boolean).join(" · "))+'</p>':"")+
      '<p class="cvWInlineTools">'+(tools.length?tools.slice(0,3).map(esc).join('<span aria-hidden="true"> · </span>'):'Strumenti non ancora riconosciuti')+'</p>'+
      '<button class="cvWDetailsLink" type="button" data-cv-panel-target="skills">Vedi le competenze <span aria-hidden="true">↗</span></button></section>'+
   '</div></div>';
 const list=(items,type,empty)=>'<div class="cvWRecords">'+(items.length?items.map(x=>record(x,type)).join(""):'<p class="cvWEmpty">'+empty+'</p>')+'</div>';
 const experience='<div class="cvWPanelHeader"><h3>Esperienze professionali</h3><p>Posizioni e responsabilità riportate nel curriculum.</p></div>'+
   list(exp,"experience","Nessuna esperienza riconosciuta in questo documento.");
 const projectPanel='<div class="cvWPanelHeader"><h3>Progetti</h3><p>Attività accademiche e applicazioni pratiche: non sono presentate come lavoro professionale.</p></div>'+
   list(projects,"project","Non risultano progetti in questa versione.");
 const skills='<div class="cvWPanelHeader"><h3>Formazione e competenze</h3><p>Titoli, software e lingue presenti nel CV.</p></div>'+
  '<div class="cvWSkillSections">'+
   '<div><h4>Formazione</h4><div class="cvWChips">'+(pills(edu)||'<p class="cvWEmpty">Formazione non rilevata.</p>')+'</div></div>'+
   '<div><h4>Software</h4><div class="cvWChips">'+(pills(tools)||'<p class="cvWEmpty">Nessuno strumento rilevato.</p>')+'</div></div>'+
   '<div><h4>Lingue</h4><div class="cvWChips">'+(pills(languages)||'<p class="cvWEmpty">Lingue non indicate.</p>')+'</div></div></div>';
 const sources=(basis="")=>{
   const text=String(basis||"").trim();
   const match=/^(Progetto|Esperienza)\s*[·:-]\s*(.*)$/i.exec(text);
   const kind=match?.[1]?.toLowerCase()==="progetto"?"Progetto":match?.[1]?"Esperienza":"Dal CV";
   const detail=(match?.[2]||text).replace(/\s*[-–]\s*thesis project$/i,"").replace(/\s*academic project$/i,"").trim();
   return {kind,detail:detail||"Attività rilevante"};
 };
 const categories='<div class="cvWAreaHeader"><div class="cvWPanelHeader"><h3>Ambiti professionali</h3>'+
    '<p>Le aree collegate alle esperienze e ai progetti presenti in questo CV.</p></div>'+
    '<div class="cvWAreaCount"><strong>'+related.length+'</strong><span>aree collegate</span></div></div>'+
   '<div class="cvWAreaEntries">'+(related.length?related.map(x=>{
     const src=sources(x.basis);
     return '<div class="cvWAreaEntry"><div><strong>'+esc(x.name)+'</strong></div>'+
       '<p><span>'+esc(src.kind)+'</span> · '+esc(src.detail)+'</p></div>';
   }).join(""):'<p class="cvWEmpty">Non sono state riconosciute aree professionali specifiche in questo CV.</p>')+'</div>'+
   (related.length?'<div class="cvWAreaBottom"><span>Esplora le attività collegate a queste aree.</span><div>'+
   (related.some(x=>/^Esperienza/i.test(x.basis||""))?'<button type="button" data-cv-panel-target="experience">Esperienze ↗</button>':"")+
   (related.some(x=>/^Progetto/i.test(x.basis||""))?'<button type="button" data-cv-panel-target="projects">Progetti ↗</button>':"")+
   '</div></div>':"")+
   '<details class="cvWAllAreas"><summary>Esplora tutte le '+areas.length+' categorie professionali <span aria-hidden="true">⌄</span></summary>'+
    '<p>Le categorie non evidenziate non hanno collegamenti riconosciuti in questo documento.</p>'+
    '<div class="cvWAllAreasGrid">'+areas.map(x=>'<span class="'+(x.related?"is-related":"")+'">'+esc(x.name)+'</span>').join("")+'</div></details>';
 const edit='<div class="cvWPanelHeader cvWReviewIntro"><span class="cvWReviewKicker">'+(confirmed?"AGGIORNA IL PROFILO":"VERIFICA DEL CV")+'</span><h3>'+(confirmed?"Aggiorna le informazioni":"Verifica le informazioni del CV")+'</h3><p>Qui puoi verificare ciò che HUNT ha letto dal CV: esperienze, progetti, formazione, software e lingue. Apri le sezioni e correggi solo eventuali errori. Il file originale rimane invariato.</p></div>'+
   '<div id="cvCorrectionDetails" class="cvWEditFields">'+corrections+'</div>';
 const detailsPane=(id,html)=>pane(id,a,
  '<button type="button" class="cvWBack" data-cv-panel-target="overview">← Torna al riepilogo</button>'+html);
 const skillsAndAreas=skills+'<button type="button" class="cvWDetailsLink cvWAreasLink" data-cv-panel-target="areas">Ambiti professionali collegati <span aria-hidden="true">↗</span></button>';
 return '<section class="cvWWorkspace cvWWorkspaceSimple" aria-label="Curriculum selezionato">'+
  '<header class="cvWWorkspaceHead"><div><div class="cvWEyebrow">Il tuo curriculum</div>'+
   '<div class="cvWTitle"><h2>'+esc(cv.name||"Curriculum")+'</h2>'+(cv.is_default?'<span class="cvWPrimaryText">Principale</span>':"")+'</div>'+
   '<p>'+esc(confirmed?"Informazioni verificate. HUNT può usarle per confrontare il tuo profilo con gli annunci.":"HUNT ha già letto questo CV. Ora verifica esperienze, progetti, formazione e competenze: saranno i dati usati per valutare le offerte. Il documento originale non cambia.")+'</p></div>'+
   '<button type="button" data-cv-action="edit-profile" class="cvWEditButton '+(confirmed?'cvWEditSecondary':'cvWVerifyPrimary')+'">'+(confirmed?"Modifica i dati del CV":"Verifica i dati estratti")+' <span aria-hidden="true">↗</span></button></header>'+
  '<form id="cvFactsForm">'+
   pane("overview",a,overview)+detailsPane("experience",experience)+detailsPane("projects",projectPanel)+
   detailsPane("skills",skillsAndAreas)+detailsPane("areas",categories)+detailsPane("edit",edit)+
   '<div class="cvWConfirm" '+(a==="edit"?"":"hidden")+'><div><strong>'+esc(confirmed?"Salva le modifiche":"Dati verificati?")+'</strong>'+
    '<p>'+esc(confirmed?"Le modifiche aggiornano il profilo associato a questo CV.":"Confermando, HUNT utilizzerà questi dati per valutare i requisiti delle offerte. Il PDF originale resta invariato.")+'</p></div>'+
    '<button type="submit" class="btn primary">'+(confirmed?"Salva modifiche":"Conferma e salva")+'</button></div>'+
  '</form></section>';
}
