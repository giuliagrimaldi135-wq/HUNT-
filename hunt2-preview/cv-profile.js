
import {extractCvText} from "./cv-reader.js?v=20261109-60";
import {interpretCvText} from "./cv-interpreter.js?v=20261109-60";
import {evidenceForDisplay,projectNameForDisplay,cvProfessionalCategories,cvReviewSummary} from "./cv-display.js?v=20261109-92";
const esc=(s="")=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lines=s=>String(s||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,50);
const mime={pdf:"application/pdf",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",txt:"text/plain",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg"};
let selectedId=null;
let autoReading=false;
const failedReadIds=new Set();
const appliedDrafts=new Map();
const input=(label,key,value)=>'<label class="cvField">'+esc(label)+'<input data-field="'+key+'" value="'+esc(value||"")+'"></label>';
const area=(label,key,value)=>'<label class="cvField">'+esc(label)+'<textarea data-field="'+key+'" rows="3">'+esc((value||[]).map(x=>evidenceForDisplay(x,"it").text).join("\n"))+'</textarea></label>';
function entry(type,p={}){
 const remove='<button class="cvTextButton" type="button" data-cv-action="remove">Rimuovi</button>';
 let inner="";
 if(type==="experience")inner='<div class="cvFieldsTwo">'+input("Azienda","company",p.company)+input("Ruolo","role",p.role)+input("Inizio (YYYY-MM)","start",p.start)+input("Fine (YYYY-MM)","end",p.end)+'</div>'+area("Attività svolte — una per riga","evidence",p.evidence);
 if(type==="project")inner=input("Nome progetto","name",p.name)+area("Attività documentate — una per riga","evidence",p.evidence);
 if(type==="education")inner='<div class="cvFieldsTwo">'+input("Istituto","school",p.school)+input("Percorso","program",p.program)+'</div>';
 return '<div class="cvEvidenceCard" data-cv-entry="'+type+'"><div class="cvMiniHead"><strong>'+({experience:"Esperienza",project:"Progetto",education:"Formazione"}[type])+'</strong>'+remove+'</div>'+inner+'</div>';
}
function cvStatus(x){
 const p=x.parsed_profile||{};
 if(p.profile_confirmed_by_user)return "Profilo confermato";
 if(p.profile_verified_from_user_history)return "Profilo noto e verificato";
 if(p.cv_text_extraction_status==="ocr_text_extracted")return p.draft_profile?.extracted_chars?"OCR analizzato · dati da confermare":"Testo OCR letto · da interpretare";
 if(p.cv_text_extraction_status==="text_extracted")return p.draft_profile?.extracted_chars?"Testo analizzato · dati da confermare":"Testo letto · da interpretare";
 if(p.cv_text_extraction_status==="ocr_partial")return "Testo parziale, da controllare";
 if(p.cv_text_extraction_status==="image_pdf_no_text_layer")return "PDF grafico: leggi con OCR";
 return "Da leggere e verificare";
}
function editor(cv,roleFamilies=[]){
 const p=cv.parsed_profile||{};
 const d=p.draft_profile?.extracted_chars?p.draft_profile:(p.raw_text?interpretCvText(p.raw_text):{});
 const info=cvReviewSummary({...p,draft_profile:d}), verified=info.confirmed;
 const {experience:ex,projects:pr,education:ed,tools,languages}=info;
 const categories=cvProfessionalCategories({...p,draft_profile:d},roleFamilies);
 const related=categories.filter(x=>x.related);
 const evidenceList=evidence=>(Array.isArray(evidence)?evidence:[]).slice(0,8).map(t=>{
   const viewed=evidenceForDisplay(t,"it");
   return '<li>'+esc(viewed.text)+(viewed.needsTranslation?'<small>Trascrizione originale dal CV</small>':"")+'</li>';
 }).join("");
 const record=(item,type,index)=>{
   const isExperience=type==="experience",title=isExperience?(item.company||item.role||"Esperienza"):projectNameForDisplay(item.name||"Progetto","it");
   const role=isExperience?item.role||"":"";
   const count=Array.isArray(item.evidence)?item.evidence.length:0;
   return '<details class="cvProfileEntry" '+(isExperience&&index===0?"open":"")+'>'+
     '<summary><span><strong>'+esc(title)+'</strong>'+(role?'<small>'+esc(role)+'</small>':"")+'</span><span class="cvProfileEntryMeta">'+count+' attività <span aria-hidden="true">＋</span></span></summary>'+
     (count?'<ul>'+evidenceList(item.evidence)+'</ul>':'<p>Non sono ancora presenti attività dettagliate in questa versione.</p>')+
     '</details>';
 };
 const pills=(items,variant="")=>items.map(t=>'<span class="cvProfilePill '+variant+'">'+esc(typeof t==="string"?t:[t.program,t.school].filter(Boolean).join(" · "))+'</span>').join("");
 const categoryList=related.length?related.map(x=>'<span class="cvProfilePill cvProfilePillActive">'+esc(x.name)+'</span>').join(""):'<p class="cvProfileQuiet">Non emergono ancora aree specifiche da questa versione.</p>';
 const section=(number,title,description,body,id)=>'<section class="cvProfileSegment" id="'+id+'">'+
   '<div class="cvProfileSegmentLabel"><span>'+number+'</span><h3>'+title+'</h3><p>'+description+'</p></div>'+
   '<div class="cvProfileSegmentBody">'+body+'</div></section>';
 const experience=section("01","Esperienza","Attività professionali documentate.",
   ex.length?ex.map((x,i)=>record(x,"experience",i)).join(""):'<p class="cvProfileQuiet">Nessuna esperienza riconosciuta.</p>',"cv-work");
 const projects=section("02","Progetti","Lavori accademici e competenze applicate.",
   pr.length?pr.map((x,i)=>record(x,"project",i)).join(""):'<p class="cvProfileQuiet">Nessun progetto presente.</p>',"cv-projects");
 const capabilities=section("03","Formazione e strumenti","Titoli, software e lingue presenti nel CV.",
   '<div class="cvProfileSkillGroup"><h4>Formazione</h4><div class="cvProfilePills">'+(ed.length?pills(ed):'<span class="cvProfileQuiet">Non indicata</span>')+'</div></div>'+
   '<div class="cvProfileSkillGroup"><h4>Software</h4><div class="cvProfilePills">'+(tools.length?pills(tools):'<span class="cvProfileQuiet">Nessuno rilevato</span>')+'</div></div>'+
   '<div class="cvProfileSkillGroup"><h4>Lingue</h4><div class="cvProfilePills">'+(languages.length?pills(languages):'<span class="cvProfileQuiet">Non indicate</span>')+'</div></div>',"cv-skills");
 const areas=section("04","Ambiti professionali","Collegamenti ricavati dalle attività, non qualifiche attribuite.",
   '<div class="cvProfilePills">'+categoryList+'</div>'+
   '<details class="cvProfileAllAreas"><summary>Consulta tutte le '+categories.length+' aree di HUNT</summary><div class="cvProfileAreaCatalog">'+categories.map(x=>
     '<span class="'+(x.related?"active":"")+'">'+esc(x.name)+'</span>').join("")+'</div></details>',"cv-areas");
 const corrections='<details class="cvCorrectionDetails cvProfileCorrections" id="cvCorrectionDetails">'+
   '<summary>Modifica esperienze, progetti o competenze <span>Apri i campi di modifica</span></summary>'+
   '<p>Qui puoi correggere le informazioni che HUNT ha estratto, aggiungere ciò che manca e poi salvare.</p>'+
   '<div class="cvGroupHeading"><h3>Esperienze</h3><button type="button" class="cvTextButton" data-cv-action="add-experience">+ Aggiungi</button></div><div id="cvExperiences">'+(ex.length?ex:[{}]).map(x=>entry("experience",x)).join("")+'</div>'+
   '<div class="cvGroupHeading"><h3>Progetti</h3><button type="button" class="cvTextButton" data-cv-action="add-project">+ Aggiungi</button></div><div id="cvProjects">'+(pr.length?pr:[{}]).map(x=>entry("project",x)).join("")+'</div>'+
   '<div class="cvGroupHeading"><h3>Formazione</h3><button type="button" class="cvTextButton" data-cv-action="add-education">+ Aggiungi</button></div><div id="cvEducation">'+(ed.length?ed:[{}]).map(x=>entry("education",x)).join("")+'</div>'+
   '<div class="cvFieldsTwo"><label class="cvField">Software e livelli dichiarati<textarea id="cvTools" rows="4">'+esc(tools.join("\n"))+'</textarea></label><label class="cvField">Lingue dichiarate<textarea id="cvLanguages" rows="4">'+esc(languages.join("\n"))+'</textarea></label></div>'+
   (p.raw_text?'<details class="cvRawText"><summary>Consulta il testo estratto dal documento</summary><textarea readonly rows="9">'+esc(p.raw_text.slice(0,40000))+'</textarea></details>':"")+
   '</details>';
 return '<section class="cvEditor cvProfileDetail">'+
   '<header class="cvProfileDetailHead"><div class="eyebrow">Profilo ricavato dal curriculum</div><div class="cvProfileTitleLine"><h2>'+esc(cv.name||"Il tuo CV")+'</h2><span class="cvInsightState '+(verified?"is-verified":"")+'">'+(verified?"Confermato":"Da confermare")+'</span></div>'+
   '<p>Esamina il percorso che HUNT ha riconosciuto. Apri le singole attività per leggerle; puoi correggere o integrare tutto prima di salvare.</p></header>'+
   '<nav class="cvProfileQuickNav" aria-label="Sezioni del curriculum">'+
     '<a href="#cv-work">Esperienza <span>'+ex.length+'</span></a><a href="#cv-projects">Progetti <span>'+pr.length+'</span></a>'+
     '<a href="#cv-skills">Competenze</a><a href="#cv-areas">Ambiti</a></nav>'+
   '<form id="cvFactsForm">'+experience+projects+capabilities+areas+
   '<div class="cvProfileEditIntro"><div><strong>Devi correggere o aggiungere qualcosa?</strong><p>Le informazioni possono essere modificate senza dover ricaricare il documento.</p></div>'+
     '<button type="button" class="cvEditLaunch" data-cv-action="edit-profile">Modifica dati</button></div>'+
   corrections+
   '<footer class="cvProfileConfirm"><div><div class="eyebrow">Ultimo passaggio</div><h3>'+(verified?"Le tue informazioni sono salvate":"Conferma le informazioni")+'</h3><p>'+(verified?"Se modifichi un dato, salva la versione aggiornata.":"Controlla il riepilogo e conferma per utilizzare queste informazioni nei confronti con le offerte.")+'</p></div>'+
   '<button class="btn primary" type="submit">'+(verified?"Salva le modifiche":"Conferma e salva")+'</button></footer>'+
   '</form></section>';
}
function collect(root,original){
 const v=(el,key)=>String(el.querySelector('[data-field="'+key+'"]')?.value||"").trim();
 const group=type=>[...root.querySelectorAll('[data-cv-entry="'+type+'"]')];
 const experience=group("experience").map(el=>({company:v(el,"company"),role:v(el,"role"),start:v(el,"start"),end:v(el,"end"),evidence:lines(v(el,"evidence"))})).filter(x=>x.company||x.role||x.evidence.length);
 const projects=group("project").map(el=>({name:v(el,"name"),evidence:lines(v(el,"evidence"))})).filter(x=>x.name||x.evidence.length);
 const education=group("education").map(el=>({school:v(el,"school"),program:v(el,"program")})).filter(x=>x.school||x.program);
 const relevant="";
 const result={...original,experience,projects,education,tools:lines(root.querySelector("#cvTools").value),languages:lines(root.querySelector("#cvLanguages").value),source:"user_confirmed_profile",profile_confirmed_by_user:true,profile_updated_at:new Date().toISOString()};
 // The user is not asked to estimate experience years; preserve only explicit CV dates.
 return result;
}
export async function mountCvManager(root,{supabase,user,refresh,roleFamilies=[]}){
 const {data,error}=await supabase.from("user_cvs").select("id,name,storage_path,parsed_profile,is_default,target_role_families,created_at").eq("user_id",user.id).eq("active",true).order("created_at",{ascending:false});
 if(error){root.textContent="Errore di lettura dei CV: "+error.message;return}
 const rows=data||[];
 // Respect the explicitly opened CV; otherwise prioritise one that needs review,
 // rather than silently selecting the only legacy structured record.
 if(!rows.some(x=>x.id===selectedId))selectedId=rows.find(x=>x.is_default)?.id||rows[0]?.id||null;
 const current=rows.find(x=>x.id===selectedId);
 const main=rows.find(x=>x.is_default),unread=rows.filter(x=>!x.parsed_profile?.raw_text);
 let fileHtml="";
 for(const cv of rows){
  const name=esc(cv.name||"Curriculum"),mainCv=!!cv.is_default,open=cv.id===selectedId;
  const status=esc(cvStatus(cv));
  fileHtml+='<article class="cvArchiveCard '+(open?'is-open ':'')+(mainCv?'is-main':'')+'">'+
   '<div class="cvArchiveIcon">CV</div><div class="cvArchiveInfo"><div class="cvArchiveTitle"><button type="button" class="cvArchiveName" data-cv-action="select" data-cv-id="'+cv.id+'">'+name+'</button>'+
   '<span class="cvArchiveType">'+(mainCv?'Principale':'Secondario')+'</span></div>'+
   '<p>'+status+'</p><small>HUNT valuta in automatico la pertinenza di questa versione per ciascuna opportunità.</small></div>'+
   '<div class="cvArchiveActions">'+
    
    (!mainCv?'<button type="button" class="cvArchiveAction" data-cv-action="default" data-cv-id="'+cv.id+'">Rendi principale</button>':rows.length>1?
     '<button type="button" class="cvArchiveAction" data-cv-action="secondary" data-cv-id="'+cv.id+'">Rendi secondario</button>':"")+
    '<button type="button" class="cvArchiveAction is-danger" data-cv-action="delete-cv" data-cv-id="'+cv.id+'">Elimina</button>'+
   '</div></article>';
 }
 root.innerHTML='<section class="cvManager cvArchiveV2">'+
  '<header class="cvManagerHeading"><div class="eyebrow">Profilo professionale</div><h2>I tuoi curriculum</h2>'+
   '<p>HUNT confronta automaticamente le diverse versioni con le offerte. Seleziona il nome di un CV per controllarne le informazioni; qui puoi anche renderlo principale, secondario o eliminarlo.</p></header>'+
  '<div class="cvArchiveStats"><span><strong>'+rows.length+'</strong> CV caricati</span><span><strong>'+rows.filter(x=>x.parsed_profile?.raw_text).length+'</strong> letti</span>'+
   '<span><strong>'+rows.filter(x=>x.parsed_profile?.profile_confirmed_by_user||x.parsed_profile?.profile_verified_from_user_history).length+'</strong> verificati</span></div>'+
  '<div class="cvFileList">'+(fileHtml||'<p class="cvArchiveEmpty">Carica il tuo primo CV: HUNT ne leggerà automaticamente il contenuto.</p>')+'</div>'+
  '<div class="cvUpload"><div class="cvMiniHead"><h3>Aggiungi un CV</h3><span>La lettura parte automaticamente</span></div>'+
   '<div class="cvUploadFields"><input id="cvUploadName" placeholder="Nome del CV, per esempio Merchandising">'+
    '<input id="cvUploadFile" type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg">'+
    '<button class="btn primary" data-cv-action="upload" type="button">Aggiungi CV</button></div></div>'+
  '<div id="cvReaderStatus" role="status" aria-live="polite" class="cvReaderStatus"></div>'+
  (unread.length?'<p class="cvAutoNotice">HUNT sta preparando la lettura automatica di '+unread.length+' CV. Se la scansione non riesce, troverai qui un comando per riprovare.</p>':"")+
  (unread.length||failedReadIds.size?'<details class="cvReaderOptions cvReaderOptionsFold"><summary>Opzioni di lettura dei documenti</summary><div><label>Lingua OCR <select id="cvOcrLang"><option value="ita+eng">Italiano e inglese</option><option value="eng">Inglese</option><option value="ita">Italiano</option></select></label><p>Serve solo quando un PDF non può essere letto normalmente.</p></div></details>':"")+
  (current?editor(current,roleFamilies):"")+'</section>';
 const show=(text,bad=false)=>{const el=root.querySelector("#cvReaderStatus");if(el){el.textContent=text;el.classList.toggle("cvReaderError",bad)}};
 const readSingleCv=async (cv,language)=>{
   const {data:blob,error:dl}=await supabase.storage.from("cvs").download(cv.storage_path);
   if(dl||!blob)throw dl||new Error("File privato non trovato o accesso negato.");
   const parsed=await extractCvText(blob,cv.storage_path,language,message=>show(cv.name+" · "+message));
   if(parsed.text.length<80)throw new Error("Testo OCR insufficiente per "+cv.name+". Prova un'altra lingua OCR o una scansione più nitida.");
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(parsed.text)))).map(v=>v.toString(16).padStart(2,"0")).join("");
   const prior=cv.parsed_profile||{};
   const draft=interpretCvText(parsed.text);
   const next={...prior,raw_text:parsed.text.slice(0,40000),raw_text_hash:hash,draft_profile:draft,
    extractor_version:"browser-pdfjs-tesseract-v2",extracted_at:new Date().toISOString(),
    cv_text_extraction_status:parsed.partial?"ocr_partial":parsed.method==="ocr"?"ocr_text_extracted":"text_extracted",
    page_count:parsed.pages,read_pages:parsed.pages_processed,ocr_language:language,source_language:draft.source_language};
   // Do not erase previously confirmed work on this CV when re-reading a document.
   const {error:up}=await supabase.from("user_cvs").update({parsed_profile:next,updated_at:new Date().toISOString()}).eq("id",cv.id).eq("user_id",user.id);
   if(up)throw up;
   return draft;
 };
 root.onclick=async event=>{
  const b=event.target.closest("[data-cv-action]");if(!b)return;
  const action=b.dataset.cvAction,id=b.dataset.cvId;
  if(action==="select"){selectedId=id;await refresh();return}
  if(action==="edit-profile"){
   const details=root.querySelector("#cvCorrectionDetails");
   if(details){details.open=true;details.scrollIntoView?.({behavior:"smooth",block:"start"})}
   return;
  }
  if(action==="remove"){b.closest("[data-cv-entry]")?.remove();return}
  if(action==="add-experience"){root.querySelector("#cvExperiences").insertAdjacentHTML("beforeend",entry("experience"));return}
  if(action==="add-project"){root.querySelector("#cvProjects").insertAdjacentHTML("beforeend",entry("project"));return}
  if(action==="add-education"){root.querySelector("#cvEducation").insertAdjacentHTML("beforeend",entry("education"));return}
  if(action==="default"||action==="secondary"){
   const target=action==="secondary"?rows.find(x=>x.id!==id&&(x.parsed_profile?.profile_confirmed_by_user||x.parsed_profile?.profile_verified_from_user_history))||rows.find(x=>x.id!==id):rows.find(x=>x.id===id);
   if(!target){show("Serve almeno un CV principale. Carica un'altra versione prima di rendere secondaria questa.",true);return}
   b.disabled=true;
   const reset=await supabase.from("user_cvs").update({is_default:false}).eq("user_id",user.id).eq("active",true);
   const setMain=reset.error?reset:await supabase.from("user_cvs").update({is_default:true}).eq("user_id",user.id).eq("active",true).eq("id",target.id);
   if(setMain.error){show("Non riesco a modificare la priorità del CV: "+setMain.error.message,true);b.disabled=false}
   else {selectedId=id;await refresh()}
   return;
  }
  if(action==="delete-cv"){
   const cv=rows.find(x=>x.id===id);
   if(!cv)return;
   if(!window.confirm('Eliminare il CV «'+cv.name+'» dal tuo archivio? Il documento verrà cancellato e non sarà più utilizzato nei confronti con gli annunci.'))return;
   b.disabled=true;show("Eliminazione del CV dall'archivio privato…");
   // ON DELETE SET NULL detaches the CV from saved dossiers. No silent soft-delete
   // leaves sensitive parsed CV content in a supposedly deleted user_cvs record.
   const deleted=await supabase.from("user_cvs").delete().eq("id",id).eq("user_id",user.id).select("id");
   if(deleted.error||!deleted.data?.length){show("Impossibile eliminare il CV: "+(deleted.error?.message||"operazione non autorizzata"),true);b.disabled=false;return}
   const replacement=rows.filter(x=>x.id!==id).find(x=>x.is_default)||rows.find(x=>x.id!==id)||null;
   if(cv.is_default&&replacement){
     const promote=await supabase.from("user_cvs").update({is_default:true}).eq("id",replacement.id).eq("user_id",user.id).eq("active",true);
     if(promote.error){show("CV eliminato, ma non riesco a impostare quello principale: "+promote.error.message,true)}
   }
   const removed=await supabase.storage.from("cvs").remove([cv.storage_path]);
   selectedId=replacement?.id||null;failedReadIds.delete(id);
   await refresh();
   if(removed.error)show("CV eliminato dal database; è necessaria una verifica della cancellazione del documento privato: "+removed.error.message,true);
   return;
  }
  if(action==="retry-reading"){
   failedReadIds.clear();await refresh();return;
  }
  if(action==="upload"){
   const file=root.querySelector("#cvUploadFile")?.files?.[0];
   if(!file){show("Seleziona un file.",true);return}
   const ext=file.name.split(".").pop().toLowerCase();
   if(!mime[ext]){show("Formato non ammesso.",true);return}
   if(file.size>8*1024*1024){show("Massimo 8 MB per CV.",true);return}
   b.disabled=true;show("Caricamento privato in corso…");
   try{
    const path=user.id+"/"+crypto.randomUUID()+"."+ext;
    const {error:e}=await supabase.storage.from("cvs").upload(path,file,{contentType:mime[ext],upsert:false});
    if(e)throw e;
    const name=root.querySelector("#cvUploadName").value.trim()||file.name;
    const {data:created,error:dbError}=await supabase.from("user_cvs").insert({user_id:user.id,name,storage_path:path,target_role_families:[],parsed_profile:{},is_default:rows.length===0,active:true}).select("id").single();
    if(dbError){await supabase.storage.from("cvs").remove([path]);throw dbError}
    selectedId=created.id;await refresh();
    // Mounting the profile automatically starts local OCR and analysis.
   }catch(e){show("Upload non riuscito: "+(e.message||String(e)),true);b.disabled=false}
   return;
  }

 };
 // Read every pending CV automatically, sequentially, preserving separate provenance.
 // Failed scans are not retried infinitely; the user sees a clear retry action.
 if(!autoReading){
   const pending=rows.filter(cv=>!cv.parsed_profile?.raw_text&&!failedReadIds.has(cv.id));
   if(pending.length){
     autoReading=true;
     Promise.resolve().then(async()=>{
       const failures=[];let completed=0;
       for(const [i,cv] of pending.entries()){
         show("Analisi automatica CV "+(i+1)+"/"+pending.length+" · "+cv.name);
         try{
           await readSingleCv(cv,root.querySelector("#cvOcrLang")?.value||"ita+eng");
           completed++;
           if(!selectedId)selectedId=cv.id;
         }catch(e){failedReadIds.add(cv.id);failures.push(cv.name+": "+(e?.message||String(e)))}
       }
       autoReading=false;
       await refresh();
       if(failures.length){
         const notice=document.querySelector("#cvReaderStatus");
         if(notice){
           notice.classList.add("cvReaderError");
           notice.textContent="Alcuni CV non sono stati letti: "+failures.join(" | ")+" ";
           const btn=document.createElement("button");
           btn.className="btn";btn.type="button";btn.dataset.cvAction="retry-reading";btn.textContent="Riprova la lettura";
           notice.appendChild(btn);
         }
       }else if(completed){
         const status=document.querySelector("#cvReaderStatus");
         if(status)status.textContent=completed+" CV analizzati. Controlla la sintesi ed eventualmente conferma i dati.";
       }
     }).catch(e=>{autoReading=false;show("Errore di analisi automatica: "+(e?.message||String(e)),true)});
   }
 }

 const form=root.querySelector("#cvFactsForm");
 if(form)form.onsubmit=async e=>{
  e.preventDefault();
  const btn=form.querySelector('button[type="submit"]');
  btn.disabled=true;show("Salvataggio delle informazioni confermate…");
  try{
   const info=collect(form,current.parsed_profile||{});
   appliedDrafts.delete(current.id);
   const {error:up}=await supabase.from("user_cvs").update({parsed_profile:info,updated_at:new Date().toISOString()}).eq("id",current.id).eq("user_id",user.id);
   if(up)throw up;
   await refresh();
  }catch(e){show("Salvataggio non riuscito: "+(e.message||String(e)),true);btn.disabled=false}
 };
}
