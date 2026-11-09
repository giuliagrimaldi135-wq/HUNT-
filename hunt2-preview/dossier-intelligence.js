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
  if(structured&&extracted&&!/avanzat|advanced|intermedi|intermediate|basic|base|expert/i.test(structured)&&/avanzat|advanced|intermedi|intermediate|basic|base|expert/i.test(extracted))
   return {value:extracted,confirmed:false};
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
     if(!missing.length){
       const needsAdvanced=/ottim|excellent|advanced|avanzat|molto buon/i.test(t);
       const advanced=present.every(x=>/avanzat|advanced|expert/i.test(x.value));
       const state=needsAdvanced&&!advanced?"partial":present.every(x=>x.confirmed)?"found":"detected";
       result(state,present.map(x=>x.value).join(" · ")+(needsAdvanced&&!advanced?" — livello avanzato non confermato per tutti gli strumenti":""));
     }
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
     if(x){
       const v=fold(x.text),facts=[];
       if(/client welcome|greet|accoglienz/.test(v))facts.push("accoglienza clienti");
       if(/garment presentation|presentazione (?:dei )?capi/.test(v))facts.push("presentazione dei capi");
       if(/team|collabor/.test(v))facts.push("collaborazione con il team");
       const summary=facts.length?facts.join(" · "):/\b[a-z]{4,}\b/.test(v)?"attività professionali riportate nel CV":x.text;
       result("partial",brief(x.origin+" — "+summary,125));
     }
   }else if(/fashion|luxury|moda|lusso/.test(t)){
     const d=education.find(v=>/fashion|moda|luxury|lusso/.test(fold(v)));
     if(d)result("partial",d);
   }else {
     const y=t.match(/(\d{1,2})\s*\+?\s*(?:years|anni)/),n=Number(p.relevant_years_experience);
     if(y&&p.relevant_years_experience!==undefined&&Number.isFinite(n))result(n>=Number(y[1])&&confirmed?"found":"partial",n+" anni dichiarati; richiesti "+y[1]);
   }
   // Explicitly say when the evidence belongs to ANOTHER uploaded CV.
   if(requiredTools.length&&type!=="found"){
     const other=altCvs.find(cv=>requiredTools.every(key=>{
       const match=sourceTools(cv.parsed_profile).get(key);
       return Boolean(match&&(!/ottim|excellent|advanced|avanzat|molto buon/i.test(t)||/avanzat|advanced|expert/i.test(match.value)));
     }));
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
// Sober, short, evidence-led editorial assessment. Avoid awkward concatenation of
// raw infinitive job duties and never describe OCR-only data as verified.
export function assessDossier(job,profile,duties,checks,incomplete,language="it"){
 const it=language!=="en",p=profile||{},tasks=arr(duties).map(clean).filter(Boolean);
 const text=fold(tasks.join(" "));
 const verified=Boolean(p.profile_confirmed_by_user||p.profile_verified_from_user_history);
 const draft=p.draft_profile||{};
 const ex=arr(p.experience).length?arr(p.experience):arr(draft.experience);
 const pr=arr(p.projects).length?arr(p.projects):arr(draft.projects);
 const evidence=[
  ...ex.flatMap(x=>arr(x.evidence).map(t=>({origin:x.company||x.role||"",kind:"experience",text:clean(t)}))),
  ...pr.flatMap(x=>arr(x.evidence).map(t=>({origin:x.name||"",kind:"project",text:clean(t)})))
 ];
 const categories=[
  {re:/assort|selezione|prodotto|product|merchandis/,it:"selezione e assortimento dei prodotti",en:"product selection and assortment",proof:/assort|merchandis|product mix|capsule|collezion/},
  {re:/budget|planning|pianific|forecast/,it:"pianificazione commerciale",en:"commercial planning",proof:/budget|planning|forecast|otb|costing/},
  {re:/vendit|sales|performance|kpi|sell.through/,it:"analisi delle vendite e della performance",en:"sales and performance analysis",proof:/analisi vendit|sales (?:analysis|report|data|performance)|\bkpi\b|sell.through|performance analysis/},
  {re:/stock|allocation|allocazion|inventar/,it:"stock e allocazioni",en:"stock and allocation",proof:/stock|allocation|allocazion|inventar/},
  {re:/visual|presentazion|collezion|collection/,it:"presentazione delle collezioni",en:"collection presentation",proof:/collezion|collection|capsule|present|garment|capi/},
  {re:/ordini|orders?|wholesale|showroom/,it:"processi wholesale e ordini",en:"wholesale and order processes",proof:/ordini|orders?|wholesale|showroom/}
 ];
 const mentioned=categories.filter(x=>x.re.test(text)).slice(0,3);
 const join=(a)=>a.length>1?a.slice(0,-1).join(", ")+(it?" e ":" and ")+a[a.length-1]:(a[0]||"");
 const work=incomplete?(it?"La descrizione disponibile non permette ancora una sintesi completa delle responsabilità.":"The available description is not sufficient for a complete assessment.")
  :mentioned.length?(it?"Le responsabilità si concentrano su ":"The responsibilities focus on ")+join(mentioned.map(x=>it?x.it:x.en))+"."
  :tasks.length?(it?"Le principali attività sono riportate nella scheda dell'annuncio, ma richiedono una lettura più approfondita.":"The main duties appear below; their scope needs a closer review.")
  :(it?"Non sono disponibili responsabilità sufficientemente dettagliate.":"The responsibilities are not described in enough detail.");
 const candidates=evidence.map(x=>{
  const relevant=mentioned.filter(cat=>cat.proof.test(fold(x.text)));
  return {...x,relevant,score:relevant.length*4+(x.kind==="experience"?0.1:0)};
 }).sort((a,b)=>b.score-a.score);
 const chosen=candidates.find(x=>x.score>=4)||null;
 let why;
 if(chosen){
  const origin=clean(chosen.origin).replace(/\s+academic project$/i,"").replace(/\s+progetto accademico$/i,"");
  const matchedArea=join(chosen.relevant.slice(0,2).map(x=>it?x.it:x.en));
  why=it
   ?(chosen.kind==="project"?"Il progetto «"+origin+"»":"L'esperienza presso "+origin)+" fornisce elementi pertinenti su "+matchedArea+"."
   :(chosen.kind==="project"?"The "+origin+" project":"Experience at "+origin)+" offers relevant evidence for "+matchedArea+".";
  if(!verified)why+=" "+(it?"Il testo del CV deve ancora essere confermato.":"The CV evidence still needs confirmation.");
 }else why=it?"Nel CV selezionato non emerge ancora un collegamento documentato con queste responsabilità.":"The selected CV does not yet provide direct evidence for these duties.";
 const unresolved=arr(checks).filter(x=>x.type==="missing"||x.type==="partial");
 const alternate=arr(checks).filter(x=>x.type==="alternate");
 const shortRequirement=x=>brief(x.text,92);
 const significant=unresolved.filter(x=>/master|magistral|english|inglese|c1|excel|powerpoint|degree|anni|years/i.test(x.text));
 const judgement=incomplete
  ?(it?"Analisi preliminare: annuncio incompleto":"Preliminary review: incomplete vacancy")
  :significant.length
    ?(it?"Attività pertinenti, requisiti da verificare":"Relevant duties, qualifications need review")
    :chosen
      ?(it?"Esperienze coerenti con le attività del ruolo":"Experience aligns with the role's duties")
      :(it?"Coerenza ancora da dimostrare":"Role fit not yet established");
 const watchParts=[];
 if(unresolved.length)watchParts.push((it?"Da verificare: ":"To verify: ")+unresolved.slice(0,3).map(shortRequirement).join(" · "));
 if(alternate.length)watchParts.push(it?"Alcuni requisiti risultano in un'altra versione del CV.":"Some qualifications appear in another CV version.");
 const watch=watchParts.length?watchParts.join(" "):(it?"Non emergono lacune dai requisiti acquisiti; verifica comunque la versione completa dell'annuncio.":"No gaps are evident in the captured requirements; review the complete posting.");
 return {judgement,work,why,watch,missingCount:unresolved.length,alternateCount:alternate.length};
}

export function newsTeaser(title,summary){
 const t=clean(title),s=clean(summary);
 const cleanHead=fold(t.replace(/\s+[–-]\s+[^–-]{2,50}$/,""));
 const cleanSummary=fold(s.replace(/\s+[–-]\s+[^–-]{2,50}$/,""));
 // Editorial extracts are taken from actual publisher copy; no invented article facts.
 if(s.length>=55&&cleanSummary!==cleanHead&&!cleanHead.includes(cleanSummary)&&!cleanSummary.includes(cleanHead)){
   const sentences=s.split(/(?<=[.!?])\s+/).filter(Boolean);
   const useful=sentences.filter(x=>fold(x)!==cleanHead).slice(0,3).join(" ").trim();
   return brief(useful||s,300);
 }
 // If only the headline is available, disclose the limited evidence.
 const h=fold(t);
 if(/revenue|growth|profit|sales|earnings|results|ricavi|fatturato|financial|bilancio/.test(h))
   return "La notizia riguarda risultati economici, vendite o andamento del gruppo. HUNT ha acquisito il titolo, ma non una sintesi dettagliata: apri la fonte per conoscere dati, periodo e contesto.";
 if(/ceo|director|management|appointment|nomina/.test(h))
   return "L'articolo segnala un cambiamento nella direzione o nell'organizzazione del brand. La fonte può chiarire il ruolo della persona coinvolta e le eventuali implicazioni strategiche; qui non è disponibile una sintesi completa.";
 if(/store|boutique|opening|expansion|flagship|retail|apertura/.test(h))
   return "La notizia riguarda la presenza retail del marchio, come punti vendita o mercati. Per sede, tempi e dimensioni dell'iniziativa occorre consultare l'articolo: HUNT dispone solo del titolo.";
 if(/collection|capsule|runway|collezion|product|fashion week/.test(h))
   return "L'aggiornamento tratta prodotto, collezioni o presentazioni del marchio. Per dettagli su assortimento, posizionamento e lancio, consulta l'articolo originale: la sintesi della fonte non è stata acquisita.";
 if(/campaign|creative|advertis|christmas|campagn/.test(h))
   return "Il titolo riguarda una campagna o un'iniziativa di comunicazione del brand. Il contenuto completo è disponibile presso l'editore; HUNT non ha una descrizione sufficientemente ricca per anticiparne i dettagli.";
 return "HUNT ha acquisito il titolo e la fonte della notizia, ma non abbastanza contenuto per un riepilogo affidabile. Apri l'articolo per il contesto e i dettagli.";
}
