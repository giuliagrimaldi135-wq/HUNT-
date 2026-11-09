
import {extractCvText} from "./cv-reader.js?v=20261109-60";
import {interpretCvText} from "./cv-interpreter.js?v=20261109-60";
const esc=(s="")=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lines=s=>String(s||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,50);
const mime={pdf:"application/pdf",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",txt:"text/plain",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg"};
let selectedId=null;
const appliedDrafts=new Map();
const input=(label,key,value)=>'<label class="cvField">'+esc(label)+'<input data-field="'+key+'" value="'+esc(value||"")+'"></label>';
const area=(label,key,value)=>'<label class="cvField">'+esc(label)+'<textarea data-field="'+key+'" rows="3">'+esc((value||[]).join("\n"))+'</textarea></label>';
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
 const p={...(cv.parsed_profile||{}),...(appliedDrafts.get(cv.id)||{})};
 const draft=p.draft_profile||{};
 // OCR interpretation fills editable fields, but DOES NOT assert user confirmation.
 const pick=key=>Array.isArray(p[key])&&p[key].length?p[key]:Array.isArray(draft[key])?draft[key]:[];
 const ex=pick("experience");
 const pr=pick("projects");
 const ed=pick("education");
 const tools=pick("tools");
 const languages=pick("languages");
 const isDraft=Boolean(!p.profile_confirmed_by_user&&!p.profile_verified_from_user_history&&draft.extracted_chars);
 return '<section class="cvEditor"><div class="cvEditorHeading"><div class="eyebrow">Profilo da CV</div><h2>Conferma le tue competenze</h2><p>I dati individuati nel documento sono proposte da verificare, non requisiti già confermati. Controllali e salva solo ciò che è realmente scritto nel CV.</p></div>'+
  '<div class="cvEditorMeta">CV: <b>'+esc(cv.name)+'</b> · '+esc(cvStatus(cv))+(draft.source_language?' · Testo originale: '+(draft.source_language==="it"?"italiano":"inglese"):"")+'</div>'+
  (isDraft?'<p class="cvDraftNotice">HUNT ha precompilato i campi dal testo del CV. Puoi correggerli; diventeranno dati confermati solo quando premi «Conferma e salva il profilo».</p>':"")+
  '<form id="cvFactsForm">'+
  '<div class="cvGroupHeading"><h3>Esperienze</h3><button type="button" class="cvTextButton" data-cv-action="add-experience">+ Aggiungi</button></div><div id="cvExperiences">'+(ex.length?ex:[{}]).map(x=>entry("experience",x)).join("")+'</div>'+
  '<div class="cvGroupHeading"><h3>Progetti</h3><button type="button" class="cvTextButton" data-cv-action="add-project">+ Aggiungi</button></div><div id="cvProjects">'+(pr.length?pr:[{}]).map(x=>entry("project",x)).join("")+'</div>'+
  '<div class="cvGroupHeading"><h3>Formazione</h3><button type="button" class="cvTextButton" data-cv-action="add-education">+ Aggiungi</button></div><div id="cvEducation">'+(ed.length?ed:[{}]).map(x=>entry("education",x)).join("")+'</div>'+
  '<div class="cvFieldsTwo"><label class="cvField">Strumenti e competenze, uno per riga<textarea id="cvTools" rows="4">'+esc(tools.join("\n"))+'</textarea></label><label class="cvField">Lingue confermate, una per riga<textarea id="cvLanguages" rows="4">'+esc(languages.join("\n"))+'</textarea></label></div>'+
  '<label class="cvField cvYears">Anni pertinenti (solo se verificabili)<input type="number" min="0" max="50" step=".01" id="cvYears" value="'+esc(p.relevant_years_experience??"")+'"></label>'+
  '<button class="btn primary" type="submit">Conferma e salva il profilo</button><p class="cvHint">Il testo estratto può contenere errori. Le esperienze riportate nelle candidature saranno quelle confermate qui.</p></form>'+
  (p.raw_text?'<details class="cvRawText"><summary>Confronta con il testo letto dal CV</summary><textarea readonly rows="14">'+esc(String(p.raw_text).slice(0,40000))+'</textarea></details>':'<p class="cvHint">Per leggere il contenuto del documento usa “Leggi CV” qui sopra.</p>')+
  '</section>';
}
function collect(root,original){
 const v=(el,key)=>String(el.querySelector('[data-field="'+key+'"]')?.value||"").trim();
 const group=type=>[...root.querySelectorAll('[data-cv-entry="'+type+'"]')];
 const experience=group("experience").map(el=>({company:v(el,"company"),role:v(el,"role"),start:v(el,"start"),end:v(el,"end"),evidence:lines(v(el,"evidence"))})).filter(x=>x.company||x.role||x.evidence.length);
 const projects=group("project").map(el=>({name:v(el,"name"),evidence:lines(v(el,"evidence"))})).filter(x=>x.name||x.evidence.length);
 const education=group("education").map(el=>({school:v(el,"school"),program:v(el,"program")})).filter(x=>x.school||x.program);
 const relevant=root.querySelector("#cvYears").value.trim();
 const result={...original,experience,projects,education,tools:lines(root.querySelector("#cvTools").value),languages:lines(root.querySelector("#cvLanguages").value),source:"user_confirmed_profile",profile_confirmed_by_user:true,profile_updated_at:new Date().toISOString()};
 if(relevant!==""&&Number.isFinite(Number(relevant))&&Number(relevant)>=0&&Number(relevant)<=50)result.relevant_years_experience=Number(relevant);
 else delete result.relevant_years_experience;
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
 const currentTargets=Array.isArray(current?.target_role_families)?current.target_role_families:[];
 const textPreview=current?.parsed_profile?.raw_text
   ?`<details class="cvRawPreview"><summary>Controlla il testo estratto dal CV · ${current.parsed_profile.raw_text.length} caratteri</summary><p>Il testo riconosciuto automaticamente può contenere errori di OCR. Verificalo prima di confermare esperienze e competenze.</p><pre>${esc(current.parsed_profile.raw_text.slice(0,9000))}</pre></details>`
   :current?`<p class="cvReadReminder">Questa versione non ha ancora un testo leggibile. Premi <strong>Leggi CV</strong> nella lista: l'OCR viene effettuato localmente nel tuo browser senza costi API.</p>`:"";
 const targetEditor=current?`<details class="cvTargetEditor">
   <summary>Per quali ruoli utilizzare questa versione del CV?</summary>
   <p>HUNT potrà scegliere automaticamente questo documento nelle vacancy pertinenti. Puoi selezionare più aree.</p>
   <div class="cvTargetOptions">${roleFamilies.map(role=>`<label><input type="checkbox" data-cv-target="${esc(role)}" ${currentTargets.includes(role)?"checked":""}> ${esc(role)}</label>`).join("")}</div>
   <button type="button" class="btn" data-cv-action="save-targets" data-cv-id="${current.id}">Salva destinazioni CV</button>
 </details>`:"";
 let fileHtml="";
 for(const cv of rows){
  fileHtml+='<article class="cvFileLine"><div><strong>'+esc(cv.name)+(cv.is_default?' · Principale':'')+'</strong><small>'+esc(cvStatus(cv))+'</small></div><div class="cvFileActions">'+
   '<button class="btn" data-cv-action="select" data-cv-id="'+cv.id+'">'+(cv.id===selectedId?"Aperto":"Apri")+'</button>'+
   '<button class="btn" data-cv-action="read" data-cv-id="'+cv.id+'">'+(cv.parsed_profile?.raw_text?'Rileggi e analizza':'Leggi e analizza')+'</button>'+
   (cv.is_default?"":'<button class="btn" data-cv-action="default" data-cv-id="'+cv.id+'">Imposta principale</button>')+
   '</div></article>';
 }
 root.innerHTML='<section class="cvManager"><div class="cvManagerHeading"><div class="eyebrow">CV privati</div><h2>Il tuo archivio professionale</h2><p>Più versioni, lettura visuale e informazioni confermate per candidature personalizzate.</p></div>'+
  '<div class="cvBatchToolbar"><span>'+rows.filter(x=>!x.parsed_profile?.raw_text).length+' CV senza testo · '+rows.filter(x=>x.parsed_profile?.raw_text&&!x.parsed_profile?.profile_confirmed_by_user).length+' da confermare</span><button class="btn" type="button" data-cv-action="read-all">Analizza tutti i CV non letti</button></div>'+
  '<div class="cvFileList">'+(fileHtml||'<p>Nessun CV caricato.</p>')+'</div>'+
  '<div class="cvUpload"><div class="cvMiniHead"><h3>Carica una nuova versione</h3><span>PDF, DOCX, TXT, PNG o JPG</span></div><div class="cvUploadFields"><input id="cvUploadName" placeholder="Es. Retail Merchandising"><input id="cvUploadFile" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"><button class="btn primary" data-cv-action="upload" type="button">Carica e leggi</button></div></div>'+
  '<div id="cvReaderStatus" role="status" class="cvReaderStatus"></div>'+
  '<div class="cvReaderOptions"><label>Lingua OCR <select id="cvOcrLang"><option value="ita+eng">Italiano + English</option><option value="eng">English</option><option value="ita">Italiano</option><option value="fra">Français</option><option value="deu">Deutsch</option><option value="spa">Español</option></select></label><p>Ogni CV viene letto e interpretato separatamente, nella lingua originale. L’analisi propone esperienze, progetti e software da confermare; nulla viene attribuito automaticamente come certificato.</p></div>'+
  targetEditor+textPreview+
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
  if(action==="save-targets"){
   const checked=[...root.querySelectorAll("[data-cv-target]:checked")].map(el=>el.dataset.cvTarget);
   b.disabled=true;
   const {error}=await supabase.from("user_cvs").update({target_role_families:checked,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id);
   if(error){show("Non riesco a salvare i ruoli: "+error.message,true);b.disabled=false}
   else await refresh();
   return;
  }
  if(action==="remove"){b.closest("[data-cv-entry]")?.remove();return}
  if(action==="add-experience"){root.querySelector("#cvExperiences").insertAdjacentHTML("beforeend",entry("experience"));return}
  if(action==="add-project"){root.querySelector("#cvProjects").insertAdjacentHTML("beforeend",entry("project"));return}
  if(action==="add-education"){root.querySelector("#cvEducation").insertAdjacentHTML("beforeend",entry("education"));return}
  if(action==="default"){
   b.disabled=true;
   const reset=await supabase.from("user_cvs").update({is_default:false}).eq("user_id",user.id).eq("active",true);
   const promote=reset.error?reset:await supabase.from("user_cvs").update({is_default:true}).eq("user_id",user.id).eq("id",id);
   if(promote.error){show(promote.error.message,true);b.disabled=false}else{selectedId=id;await refresh()}
   return;
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
    // Start reading the newly uploaded CV without a second manual action.
    const readButton=document.querySelector('#cvManagerRoot [data-cv-action="read"][data-cv-id="'+created.id+'"]');
    if(readButton)readButton.click();
   }catch(e){show("Upload non riuscito: "+(e.message||String(e)),true);b.disabled=false}
   return;
  }
  if(action==="read"||action==="read-all"){
   const language=root.querySelector("#cvOcrLang")?.value||"ita+eng";
   const queue=action==="read-all"?rows.filter(cv=>!cv.parsed_profile?.raw_text):rows.filter(cv=>cv.id===id);
   if(!queue.length){show("Tutti i CV hanno già un testo riconosciuto. Puoi aprirli e confermare i dati.");return}
   b.disabled=true;
   const title=b.textContent;
   const failed=[];
   let read=0;
   for(const [index,cv] of queue.entries()){
    b.textContent="Lettura "+(index+1)+"/"+queue.length+"…";
    show("Lettura di "+cv.name+" ("+(index+1)+"/"+queue.length+")…");
    try{await readSingleCv(cv,language);read++;selectedId=cv.id}
    catch(e){failed.push(cv.name+": "+(e?.message||String(e)))}
   }
   if(read)await refresh();
   const outcome=read+" CV analizzati. "+(failed.length?"Non completati: "+failed.join(" | "):"Apri ogni CV e conferma le informazioni proposte.");
   show(outcome,failed.length>0);
   if(b.isConnected){b.disabled=false;b.textContent=title}
   return;
  }
 };
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
