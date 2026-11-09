
import {extractCvText} from "./cv-reader.js?v=20261109-60";
import {interpretCvText} from "./cv-interpreter.js?v=20261109-60";
import {evidenceForDisplay,cvRoleSignals,cvReviewSummary} from "./cv-display.js?v=20261109-71";
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
function editor(cv){
 const p=cv.parsed_profile||{},d=p.draft_profile?.extracted_chars?p.draft_profile:(p.raw_text?interpretCvText(p.raw_text):{});
 const combined={...p,draft_profile:d},s=cvReviewSummary(combined),ex=s.experience,pr=s.projects,ed=s.education,tools=s.tools,languages=s.languages;
 const verified=s.confirmed;
 const details=xs=>(Array.isArray(xs)?xs:[]).slice(0,4).map(x=>{
   const a=evidenceForDisplay(x,"it");
   return '<li>'+esc(a.text)+(a.needsTranslation?'<small class="cvOriginalNote">Testo originale</small>':"")+'</li>';
 }).join("");
 const showRecord=(items,key)=>items.map(x=>'<article class="cvStoryItem"><h4>'+esc(x[key]||x.role||"Attività")+'</h4>'+
   (x.role&&key==="company"?'<p>'+esc(x.role)+'</p>':"")+
   (x.evidence?.length?'<ul>'+details(x.evidence)+'</ul>':"")+'</article>').join("");
 const pills=xs=>xs.map(x=>'<span class="cvPill">'+esc(typeof x==="string"?x:[x.program,x.school].filter(Boolean).join(" · "))+'</span>').join("");
 const roles=cvRoleSignals(combined);
 return '<section class="cvEditor cvInsightWorkspace">'+
  '<div class="cvInsightHeader"><div><div class="eyebrow">Analisi del curriculum</div><h2>Il tuo profilo, letto da HUNT</h2><p>Esperienze e competenze riconosciute in questa versione. HUNT le usa per scegliere il CV più adatto a ogni posizione.</p></div>'+
  '<span class="cvInsightState '+(verified?'is-verified':'')+'">'+(verified?"Profilo confermato":"Da verificare")+'</span></div>'+
  '<div class="cvInsightMetrics"><div><strong>'+ex.length+'</strong><span>Esperienze</span></div><div><strong>'+pr.length+'</strong><span>Progetti</span></div><div><strong>'+tools.length+'</strong><span>Software</span></div></div>'+
  (roles.length?'<div class="cvRoleReadout"><span class="eyebrow">Ambiti emersi</span><p>'+roles.map(esc).join(" · ")+'</p><small>La selezione del CV per ogni annuncio avviene in automatico.</small></div>':"")+
  '<form id="cvFactsForm"><div class="cvInsightColumns"><div><h3>Esperienze professionali</h3>'+ (ex.length?showRecord(ex,"company"):'<p class="cvInsightEmpty">Nessuna esperienza riconosciuta.</p>')+'</div>'+
  '<div><h3>Progetti e formazione</h3>'+(pr.length?showRecord(pr,"name"):'<p class="cvInsightEmpty">Nessun progetto rilevato.</p>')+
  (ed.length?'<div class="cvPillRow">'+pills(ed)+'</div>':"")+'</div></div>'+
  '<div class="cvDetectedSkills"><h3>Strumenti e competenze</h3><div class="cvPillRow">'+(tools.length?pills(tools):'<span class="cvInsightEmpty">Software non ancora riconosciuti</span>')+'</div>'+
  (languages.length?'<h4>Lingue nel CV</h4><div class="cvPillRow">'+pills(languages)+'</div>':"")+'</div>'+
  '<details class="cvCorrectionDetails"><summary>Correggi informazioni inesatte <span>Facoltativo</span></summary>'+
  '<p>Se la lettura automatica ha commesso errori, puoi correggere i dati qui. Non serve ricompilare il CV.</p>'+
  '<div class="cvGroupHeading"><h3>Esperienze</h3><button type="button" class="cvTextButton" data-cv-action="add-experience">+ Aggiungi</button></div><div id="cvExperiences">'+(ex.length?ex:[{}]).map(x=>entry("experience",x)).join("")+'</div>'+
  '<div class="cvGroupHeading"><h3>Progetti</h3><button type="button" class="cvTextButton" data-cv-action="add-project">+ Aggiungi</button></div><div id="cvProjects">'+(pr.length?pr:[{}]).map(x=>entry("project",x)).join("")+'</div>'+
  '<div class="cvGroupHeading"><h3>Formazione</h3><button type="button" class="cvTextButton" data-cv-action="add-education">+ Aggiungi</button></div><div id="cvEducation">'+(ed.length?ed:[{}]).map(x=>entry("education",x)).join("")+'</div>'+
  '<div class="cvFieldsTwo"><label class="cvField">Software e livelli dichiarati<textarea id="cvTools" rows="4">'+esc(tools.join("\n"))+'</textarea></label><label class="cvField">Lingue dichiarate<textarea id="cvLanguages" rows="4">'+esc(languages.join("\n"))+'</textarea></label></div></details>'+
  '<div class="cvInsightFooter"><div><strong>'+(verified?"Profilo pronto per i dossier":"Ultimo controllo")+'</strong><p>'+(verified?"Le informazioni sono già state confermate.":"Conferma che le informazioni rilevate dal CV siano corrette. Non vengono inventate esperienze o titoli.")+'</p></div>'+
  '<button class="btn primary" type="submit">'+(verified?"Salva eventuali modifiche":"Conferma l'analisi")+'</button></div></form>'+
  (p.raw_text?'<details class="cvRawText"><summary>Testo originale acquisito</summary><textarea readonly rows="10">'+esc(p.raw_text.slice(0,40000))+'</textarea></details>':"")+
  '</section>';
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
 if(!rows.some(x=>x.id===selectedId))selectedId=rows.find(x=>x.parsed_profile?.draft_profile&&!x.parsed_profile?.profile_confirmed_by_user)?.id||rows.find(x=>x.is_default)?.id||rows[0]?.id||null;
 const current=rows.find(x=>x.id===selectedId);
 const main=rows.find(x=>x.is_default),unread=rows.filter(x=>!x.parsed_profile?.raw_text);
 let fileHtml="";
 for(const cv of rows){
  const name=esc(cv.name||"Curriculum"),mainCv=!!cv.is_default,open=cv.id===selectedId;
  const status=esc(cvStatus(cv));
  fileHtml+='<article class="cvArchiveCard '+(open?'is-open ':'')+(mainCv?'is-main':'')+'">'+
   '<div class="cvArchiveIcon">CV</div><div class="cvArchiveInfo"><div class="cvArchiveTitle"><strong>'+name+'</strong>'+
   '<span class="cvArchiveType">'+(mainCv?'Principale':'Secondario')+'</span></div>'+
   '<p>'+status+'</p><small>HUNT valuta in automatico la pertinenza di questa versione per ciascuna opportunità.</small></div>'+
   '<div class="cvArchiveActions">'+
    '<button type="button" class="cvArchiveAction" data-cv-action="select" data-cv-id="'+cv.id+'">'+(open?'In visualizzazione':'Visualizza')+'</button>'+
    (!mainCv?'<button type="button" class="cvArchiveAction" data-cv-action="default" data-cv-id="'+cv.id+'">Rendi principale</button>':rows.length>1?
     '<button type="button" class="cvArchiveAction" data-cv-action="secondary" data-cv-id="'+cv.id+'">Rendi secondario</button>':"")+
    '<button type="button" class="cvArchiveAction is-danger" data-cv-action="delete-cv" data-cv-id="'+cv.id+'">Elimina</button>'+
   '</div></article>';
 }
 root.innerHTML='<section class="cvManager cvArchiveV2">'+
  '<header class="cvManagerHeading"><div class="eyebrow">Profilo professionale</div><h2>I tuoi curriculum</h2>'+
   '<p>Un solo CV principale, tutte le altre versioni secondarie. HUNT legge i documenti e sceglie automaticamente quella più pertinente per ogni posizione.</p></header>'+
  '<div class="cvArchiveStats"><span><strong>'+rows.length+'</strong> CV caricati</span><span><strong>'+rows.filter(x=>x.parsed_profile?.raw_text).length+'</strong> letti</span>'+
   '<span><strong>'+rows.filter(x=>x.parsed_profile?.profile_confirmed_by_user||x.parsed_profile?.profile_verified_from_user_history).length+'</strong> verificati</span></div>'+
  '<div class="cvFileList">'+(fileHtml||'<p class="cvArchiveEmpty">Carica il tuo primo CV: HUNT ne leggerà automaticamente il contenuto.</p>')+'</div>'+
  '<div class="cvUpload"><div class="cvMiniHead"><h3>Aggiungi un CV</h3><span>La lettura parte automaticamente</span></div>'+
   '<div class="cvUploadFields"><input id="cvUploadName" placeholder="Nome del CV, per esempio Merchandising">'+
    '<input id="cvUploadFile" type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg">'+
    '<button class="btn primary" data-cv-action="upload" type="button">Aggiungi CV</button></div></div>'+
  '<div id="cvReaderStatus" role="status" aria-live="polite" class="cvReaderStatus"></div>'+
  (unread.length?'<p class="cvAutoNotice">HUNT sta preparando la lettura automatica di '+unread.length+' CV. Se la scansione non riesce, troverai qui un comando per riprovare.</p>':"")+
  '<div class="cvReaderOptions"><label>Lingua del documento <select id="cvOcrLang"><option value="ita+eng">Riconoscimento italiano e inglese</option><option value="eng">Inglese</option><option value="ita">Italiano</option></select></label>'+
   '<p>Il riconoscimento avviene nel browser. Esperienze e competenze non vengono inventate o assegnate ad altri CV.</p></div>'+
  (current?editor(current):"")+'</section>';
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
