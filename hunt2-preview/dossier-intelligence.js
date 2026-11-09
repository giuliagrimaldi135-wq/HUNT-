const clean=v=>String(v??"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();
const fold=v=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const brief=(v,n=135)=>{const t=clean(v);return t.length>n?t.slice(0,n-1).replace(/\s+\S*$/,"")+"…":t};
const arr=v=>Array.isArray(v)?v:[];
// A software claim can be confirmed by the user, or detected from an OCR source
// quote. An OCR hit is NEVER silently promoted to a confirmed qualification.
const toolRegex={
 excel:/\b(?:microsoft\s+|ms\s+)?excel\b/i,
 powerpoint:/\b(?:microsoft\s+|ms\s+)?power\s*point\b/i,
 word:/\b(?:microsoft\s+|ms\s+)?word\b/i
};
function sourceTools(profile){
 const p=profile||{};
 const confirmed=Boolean(p.profile_confirmed_by_user||p.profile_verified_from_user_history);
 const reported=arr(p.tools).map(x=>clean(typeof x==="string"?x:x?.name+" "+(x?.level||""))).filter(Boolean);
 const draft=arr(p.draft_profile?.tools).map(clean);
 const softwareLines=String(p.raw_text||"").split(/\r?\n/).map(clean).filter(line=>/^(software|technical skills|digital skills|competenze informatiche|strumenti|tools)\s*:/i.test(line));
 const inferred=[];
 for(const line of softwareLines){
  const body=line.replace(/^[^:]*:/,"");
  for(const [key,re] of Object.entries(toolRegex)){
   const m=re.exec(body);if(!m)continue;
   const lvl=body.slice(m.index+m[0].length).match(/^\s*\((avanzat[oa]|advanced|intermedi[oa]|intermediate|base|basic|expert)\)/i)?.[1];
   const name=key==="powerpoint"?"PowerPoint":key==="excel"?"Excel":"Word";
   inferred.push(name+(lvl?" ("+lvl+")":""));
  }
 }
 const get=key=>{
  const re=toolRegex[key];
  const structured=reported.find(x=>re.test(x));
  const extracted=[...draft,...inferred].find(x=>re.test(x));
  return structured?{value:structured,confirmed}:extracted?{value:extracted,confirmed:false}:null;
 };
 return {get};
}
const cvTitle=x=>clean(x?.name||"un'altra versione").replace(/\.pdf$/i,"");
export function checkRequirements(requirements,profile,options={}){
 const p=profile||{},confirmed=Boolean(p.profile_confirmed_by_user||p.profile_verified_from_user_history);
 const proofTools=sourceTools(p);
 const rawDraft=p.draft_profile||{};
 const languages=[...arr(p.languages),...(!arr(p.languages).length?arr(rawDraft.languages):[])].map(x=>clean(typeof x==="string"?x:(x?.language||"")+" "+(x?.level||"")));
 const education=[...arr(p.education),...(!arr(p.education).length?arr(rawDraft.education):[])].map(x=>clean((x?.program||"")+" "+(x?.school||"")));
 const experience=[...arr(p.experience),...(!arr(p.experience).length?arr(rawDraft.experience):[])].flatMap(x=>arr(x.evidence).map(t=>({origin:x.company||x.role||"Esperienza",text:clean(t)})));
 const altCvs=arr(options.alternatives).filter(x=>x?.parsed_profile);
 return arr(requirements).map(requirement=>{
   const txt=clean(requirement),t=fold(txt);
   let type="missing",proof="",suggested_cv_id=null;
   const result=(state,evidence)=>{type=state;proof=evidence||""};
   const hasTool=key=>proofTools.get(key);
   const requiredTools=["excel","powerpoint"].filter(key=>key==="excel"?/\bexcel\b/.test(t):/power\s*point/.test(t));
   if(requiredTools.length){
     const present=requiredTools.map(hasTool);
     const found=present.filter(Boolean);
     const missing=requiredTools.filter((_,i)=>!present[i]);
     if(!missing.length)result(present.every(x=>x.confirmed)?"found":"detected",present.map(x=>x.value).join(" · "));
     else if(found.length)result("partial",found.map(x=>x.value).join(" · ")+" presente; "+missing.map(x=>x==="powerpoint"?"PowerPoint":"Excel").join(" e ")+" non trovato nel CV selezionato");
   }else if(/english|inglese/.test(t)){
     const a=languages.find(x=>/english|inglese/i.test(x));
     const needsC1=/\bc1\b|cefr c1|qcer c1/.test(t);
     if(a){
       const levelC1=/\bc1\b/i.test(a);
       result(needsC1&&!levelC1?"partial":confirmed?"found":"detected",a+(needsC1&&!levelC1?" — il livello C1 non è esplicitato":""));
     }
   }else if(/laurea|master|bachelor|degree/.test(t)){
     const needsMaster=/magistrale|master.s degree|\bmsc\b|master of science/.test(t);
     const d=education.find(x=>needsMaster?/laurea magistrale|master.s degree|\bmsc\b|master of science/i.test(x):/diploma|laurea|bachelor|degree|master/i.test(x));
     if(d)result(/econom|finance|business/.test(t)&&!/econom|finance|business/i.test(d)?"partial":confirmed?"found":"detected",d);
   }else if(/communication|comunicazion|teamwork|lavorare in team|interpersonal/.test(t)){
     const x=experience.find(v=>/client|customer|team|collabor|relazion|accoglienz/.test(fold(v.text)));
     if(x)result("partial",brief(x.origin+" — "+x.text,120));
   }else if(/fashion|luxury|moda|lusso/.test(t)){
     const d=education.find(v=>/fashion|moda|luxury|lusso/.test(fold(v)));
     if(d)result("partial",d);
   }else {
     const y=t.match(/(\d{1,2})\s*\+?\s*(?:years|anni)/),n=Number(p.relevant_years_experience);
     if(y&&p.relevant_years_experience!==undefined&&Number.isFinite(n))result(n>=Number(y[1])&&confirmed?"found":"partial",n+" anni dichiarati; richiesti "+y[1]);
   }
   // Explicitly say when the evidence belongs to ANOTHER uploaded CV.
   if(requiredTools.length&&type!=="found"){
     const other=altCvs.find(cv=>requiredTools.every(key=>sourceTools(cv.parsed_profile).get(key)));
     if(other){
       const matches=requiredTools.map(key=>sourceTools(other.parsed_profile).get(key));
       type="alternate";
       proof="Nel CV «"+cvTitle(other)+"»: "+matches.map(x=>x.value).join(" · ");
       suggested_cv_id=other.id||null;
     }
   }
   const label=type==="found"?"Documentato nel CV confermato":
     type==="detected"?"Rilevato dal CV · da confermare":
     type==="alternate"?"Presente in un'altra versione":
     type==="partial"?"Parzialmente documentato":"Non documentato nel CV selezionato";
   return {text:txt,type,label,proof,suggested_cv_id};
 });
}
// Natural-language decision, grounded in the exact responsibilities and candidate's own evidence.
export function assessDossier(job,profile,duties,checks,incomplete,language="it"){
 const it=language!=="en",p=profile||{},tasks=arr(duties).map(clean).filter(Boolean);
 const words=new Set(fold(tasks.join(" ")).match(/\b[a-z]{5,}\b/g)||[]);
 const evidence=[
  ...arr(p.experience).flatMap(x=>arr(x.evidence).map(t=>({origin:x.company||x.role||"Esperienza",kind:"experience",text:clean(t)}))),
  ...arr(p.projects).flatMap(x=>arr(x.evidence).map(t=>({origin:x.name||"Progetto",kind:"project",text:clean(t)})))
 ];
 const jobThemes=fold(tasks.join(" "));
 const topics=[
  [/assort|merchand|prodotto|product|collection|collezion/,/assort|merchand|product|capsule|collection|prodotto|collezion/],
  [/vendit|performance|sales|budget|kpi|pianific/,/ordini|order|budget|kpi|sales|vendit|analys|analysis|costing|planning/],
  [/retail|negozi|store|vetrin|visual/,/client|customer|store|showroom|retail|garment|visual/],
  [/digital|online|ecommerce/,/digital|online|ecommerce|e-commerce|web/],
  [/forecast|allocation|stock|inventar/,/forecast|stock|inventory|allocation|otb|planning/]
 ];
 const matches=evidence.map(e=>({...e,score:(fold(e.text).match(/\b[a-z]{5,}\b/g)||[]).filter(w=>words.has(w)&&!["support","activities","process","working","product","business","store","client"].includes(w)).length+
  topics.filter(([a,b])=>a.test(jobThemes)&&b.test(fold(e.text))).length*2})).sort((a,b)=>b.score-a.score);
 const matched=matches.find(x=>x.score>0)||null;
 const missing=arr(checks).filter(x=>x.type!=="found");
 const label=missing.map(x=>brief(x.text,95));
 // A source evidence quote is not automatically an Italian translation. Keep facts separate.
 const item=t=>brief(t.replace(/[.;]$/,""),135);
 const work=tasks.length?(it?"In pratica, il lavoro richiede di ":"In practice, the job involves ")+
  item(tasks[0])+(tasks[1]?(it?"; inoltre, ":"; also, ")+item(tasks[1]):"")+"."
  :(it?"La fonte disponibile non descrive le mansioni in modo sufficiente.":"The available source does not describe the responsibilities sufficiently.");
 const themes=fold(matched?.text||"");
 let proof="";
 if(matched){
  if(it){
   let detail="";
   if(/merchandis.*mix|capsule/.test(themes))detail="lavoro su merchandising mix e pianificazione di capsule";
   else if(/order|ordini|budget/.test(themes))detail="attività su ordini e budget";
   else if(/client|customer|garment|product presentation/.test(themes))detail="accoglienza dei clienti e presentazione del prodotto";
   else if(/otb|kpi|retail planning/.test(themes))detail="analisi di KPI e pianificazione retail";
   else if(/costing/.test(themes))detail="analisi dei costi di prodotto";
   proof="Nel CV: "+(matched.kind==="project"?"progetto formativo ":"esperienza professionale ")+clean(matched.origin)+
    (detail?", con "+detail:"; verifica la descrizione dettagliata nel Profilo")+".";
  }else{
   proof="Evidence in your CV: "+(matched.kind==="project"?"academic project ":"work experience ")+clean(matched.origin)+
    " — "+brief(matched.text,110)+".";
  }
  if(p.profile_confirmed_by_user!==true)proof+=" "+(it?"Informazioni del profilo ancora da confermare.":"The CV profile still needs your confirmation.");
 }else{
  proof=it?"Non emerge una prova diretta nel CV acquisito per queste mansioni: non considerare il match già dimostrato.":
    "No direct supporting example was found in the uploaded CV. Do not treat the match as verified.";
 }
 const significant=missing.filter(x=>/english|inglese|c1|excel|powerpoint|laurea|degree|master|years?|anni|esperienza/i.test(x.text));
 const lead=significant.map(x=>brief(x.text,72)).slice(0,2).join(" e ");
 const judgement=incomplete
  ?(it?"Annuncio parziale: non è ancora possibile valutarlo con affidabilità.":"Incomplete posting: a reliable evaluation is not yet possible.")
  :significant.length
   ?(it?"Prima di darle priorità, verifica i requisiti su "+lead+".":"Before prioritizing this role, check "+lead+".")
   :missing.length
    ?(it?"Le mansioni meritano attenzione, ma alcune capacità richieste non risultano ancora dimostrate.":"The duties are worth exploring, but some expected abilities are not yet evidenced.")
    :(it?"Da approfondire: emergono attività collegabili a esperienze del CV.":"Worth exploring: some responsibilities link to documented CV experience.");
 const watch=missing.length?(it?"Requisiti da controllare: ":"Requirements to check: ")+label.slice(0,3).join(" · ")+"."
  :(it?"Controlla comunque la descrizione completa prima dell'invio.":"Review the complete job posting before applying.");
 return {judgement,work,why:proof,watch,missingCount:missing.length};
}

export function newsTeaser(title,summary){
 const t=clean(title),s=clean(summary);
 const headline=fold(t.replace(/\s+[–-]\s+[^–-]{2,50}$/,""));
 const synopsis=fold(s.replace(/\s+[–-]\s+[^–-]{2,50}$/,""));
 if(s.length>=38&&synopsis!==headline&&!headline.includes(synopsis)&&!synopsis.includes(headline))return brief(s,165);
 const h=fold(t);
 if(/revenue|growth|profit|sales|earnings|results|ricavi|fatturato|investor|financial|highlights|bilancio/.test(h))return "Risultati economici: notizia sui ricavi, sulle vendite o sulle performance del gruppo.";
 if(/ceo|director|management|leadership|appointment|nomina/.test(h))return "Strategia e persone: aggiornamento sui vertici e sulle decisioni aziendali.";
 if(/store|boutique|opening|expansion|flagship|retail|apertura/.test(h))return "Retail ed espansione: sviluppo della rete di negozi o presenza nei mercati.";
 if(/collection|capsule|runway|collezion|product|fashion week/.test(h))return "Collezioni e prodotto: novità sulle proposte e sulla loro presentazione.";
 if(/campaign|animation|creative|advertis|christmas|campagn/.test(h))return "Campagne e comunicazione: iniziative creative e racconto del marchio.";
 if(/sustainab|circular|recycl|sostenibil/.test(h))return "Sostenibilità: iniziative e dichiarazioni del marchio.";
 return "Aggiornamento sul brand: apri la fonte per conoscere i dettagli completi.";
}
