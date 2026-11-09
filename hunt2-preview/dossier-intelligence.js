const clean=v=>String(v??"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();
const fold=v=>clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const brief=(v,n=135)=>{const t=clean(v);return t.length>n?t.slice(0,n-1).replace(/\s+\S*$/,"")+"…":t};
const arr=v=>Array.isArray(v)?v:[];
export function checkRequirements(requirements,profile){
 const p=profile||{},confirmed=p.profile_confirmed_by_user===true;
 const tools=arr(p.tools).map(x=>clean(typeof x==="string"?x:x?.name));
 const languages=arr(p.languages).map(x=>clean(typeof x==="string"?x:(x?.language||"")+" "+(x?.level||"")));
 const education=arr(p.education).map(x=>clean((x?.program||"")+" "+(x?.school||"")));
 const experience=arr(p.experience).flatMap(x=>arr(x.evidence).map(t=>({origin:x.company||x.role||"Esperienza",text:clean(t)})));
 const hasTool=term=>tools.find(x=>fold(x).includes(term));
 const hasLanguage=term=>languages.find(x=>fold(x).includes(term));
 return arr(requirements).map(requirement=>{
   const txt=clean(requirement),t=fold(txt);
   let type="missing",proof="";
   const result=(state,evidence)=>{type=state;proof=evidence||""};
   if(/excel/.test(t)&&/powerpoint|power point/.test(t)){
     const a=hasTool("excel"),b=hasTool("powerpoint")||hasTool("power point");
     result(a&&b?"found":a||b?"partial":"missing",a&&b?"Excel e PowerPoint citati":a?"Excel presente; PowerPoint non trovato":b?"PowerPoint presente; Excel non trovato":"");
   }else if(/\bexcel\b/.test(t)){const a=hasTool("excel");result(a?"found":"missing",a)}
   else if(/powerpoint|power point/.test(t)){const a=hasTool("powerpoint")||hasTool("power point");result(a?"found":"missing",a)}
   else if(/english|inglese/.test(t)){
     const a=hasLanguage("english")||hasLanguage("inglese");
     result(/\bc1\b|cefr|qcer/.test(t)?a&&/\bc1\b/.test(fold(a))?"found":a?"partial":"missing":a?"found":"missing",a?(a+(type==="partial"?" — C1 non indicato":"")):"");
     if(a&&/\bc1\b|cefr|qcer/.test(t)&&!/\bc1\b/.test(fold(a)))result("partial",a+" — livello C1 non documentato");
   }else if(/laurea|master|bachelor|degree/.test(t)){
     const d=education.find(x=>/master|magistrale|laurea|bachelor|degree|diploma/i.test(x));
     if(d)result(/econom|finance|business/.test(t)&&!/econom|finance|business/.test(fold(d))?"partial":"found",d);
   }else if(/communication|comunicazion|teamwork|lavorare in team|interpersonal/.test(t)){
     const x=experience.find(v=>/client|customer|team|collabor|relazion|accoglienz/.test(fold(v.text)));
     if(x)result("partial",brief(x.origin+" — "+x.text,130));
   }else if(/fashion|luxury|moda|lusso/.test(t)){
     const d=education.find(v=>/fashion|moda|luxury|lusso/.test(fold(v)));
     if(d)result("partial",d);
   }else {
     const y=t.match(/(\d{1,2})\s*\+?\s*(?:years|anni)/);
     const n=Number(p.relevant_years_experience);
     if(y&&Number.isFinite(n))result(n>=Number(y[1])?"found":"partial",n+" anni indicati; il requisito ne chiede "+y[1]);
   }
   const label=type==="found"?confirmed?"Documentato nel CV confermato":"Citato nel profilo (da confermare)":type==="partial"?"Parzialmente documentato":"Non documentato nel CV acquisito";
   return {text:txt,type,label,proof};
 });
}
export function assessDossier(job,profile,duties,checks,incomplete){
 const p=profile||{};
 const tasks=arr(duties).map(clean).filter(Boolean);
 const words=new Set(fold(tasks.join(" ")).match(/\b[a-z]{5,}\b/g)||[]);
 const evidence=[
  ...arr(p.experience).flatMap(x=>arr(x.evidence).map(t=>({origin:x.company||x.role||"Esperienza",kind:"esperienza",text:clean(t)}))),
  ...arr(p.projects).flatMap(x=>arr(x.evidence).map(t=>({origin:x.name||"Progetto",kind:"progetto",text:clean(t)})))
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
 const judgement=incomplete?"Annuncio incompleto: valutazione preliminare.":missing.length?"Interessante, ma ci sono requisiti ancora da chiarire.":"Da approfondire: le attività sono coerenti con parte del profilo disponibile.";
 const work=tasks.length?"Le attività previste includono "+brief(tasks[0].replace(/[.;]$/,""),170)+(tasks[1]?" e "+brief(tasks[1].replace(/[.;]$/,""),115):"")+".":"La fonte acquisita non permette di descrivere con precisione le attività.";
 const why=matched?"Collegamento con il CV: "+matched.kind+" "+matched.origin+" — «"+brief(matched.text,140)+"».":
   "Non ho trovato nel CV acquisito una prova diretta per queste mansioni: il punteggio non va considerato una garanzia.";
 const watch=missing.length?"Prima di candidarti, verifica: "+missing.slice(0,2).map(x=>brief(x.text,95)).join(" · ")+".":"Controlla il testo completo dell'annuncio prima dell'invio.";
 return {judgement,work,why,watch,missingCount:missing.length};
}
export function newsTeaser(title,summary){
 const t=clean(title),s=clean(summary);
 const headline=fold(t.replace(/\s+[–-]\s+[^–-]{2,50}$/,""));
 const synopsis=fold(s.replace(/\s+[–-]\s+[^–-]{2,50}$/,""));
 if(s.length>=38&&synopsis!==headline&&!headline.includes(synopsis)&&!synopsis.includes(headline))return brief(s,165);
 const h=fold(t);
 if(/revenue|growth|profit|sales|earnings|results|ricavi|fatturato/.test(h))return "Risultati economici: notizia sui ricavi, sulle vendite o sulle performance del gruppo.";
 if(/ceo|director|management|leadership|appointment|nomina/.test(h))return "Strategia e persone: aggiornamento sui vertici e sulle decisioni aziendali.";
 if(/store|boutique|opening|expansion|flagship|retail|apertura/.test(h))return "Retail ed espansione: sviluppo della rete di negozi o presenza nei mercati.";
 if(/collection|capsule|runway|collezion|product|fashion week/.test(h))return "Collezioni e prodotto: novità sulle proposte e sulla loro presentazione.";
 if(/campaign|animation|creative|advertis|christmas|campagn/.test(h))return "Campagne e comunicazione: iniziative creative e racconto del marchio.";
 if(/sustainab|circular|recycl|sostenibil/.test(h))return "Sostenibilità: iniziative e dichiarazioni del marchio.";
 return "Aggiornamento sul brand: apri la fonte per conoscere i dettagli completi.";
}
