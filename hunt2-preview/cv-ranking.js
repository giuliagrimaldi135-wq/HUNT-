/* CV relevance: automatic selection, not a manual role-tagging exercise. */
const words=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").match(/[a-z]{5,}/g)||[];
const themes={
 merchandising:/merchandis|assort|capsule|product mix|mix di prodotto|collezion/i,
 buying:/buying|buyer|acquist|order|ordini|budget|assort|otb/i,
 planning:/planning|pianific|forecast|kpi|stock|allocation|allocazion|otb/i,
 wholesale:/wholesale|showroom|sales campaign|campagna vendite|order|ordini/i,
 ecommerce:/ecommerce|e-commerce|digital|e.shop|online merchand/i,
 retail:/retail operations|store operation|negozi|customer service|client welcome|accoglienza/i,
 product:/product develop|sviluppo prodott|capsule|costing|material|proto/i
};
const intent=job=>{
 const t=((job?.canonical_title||"")+" "+(job?.role_family||"")).toLowerCase();
 if(/merchandis/.test(t))return "merchandising";
 if(/buying|buyer/.test(t))return "buying";
 if(/planning|allocat/.test(t))return "planning";
 if(/wholesale/.test(t))return "wholesale";
 if(/e.commerce|ecommerce|digital/.test(t))return "ecommerce";
 if(/product develop/.test(t))return "product";
 if(/retail|store/.test(t))return "retail";
 return null;
};
export function scoreCvForJob(cv,job){
 const p=cv?.parsed_profile||{},draft=p.draft_profile||{};
 const verified=p.profile_confirmed_by_user===true||p.profile_verified_from_user_history===true;
 const exp=Array.isArray(p.experience)&&p.experience.length?p.experience:draft.experience||[];
 const projects=Array.isArray(p.projects)&&p.projects.length?p.projects:draft.projects||[];
 const tools=Array.isArray(p.tools)&&p.tools.length?p.tools:draft.tools||[];
 const text=[
  ...exp.flatMap(x=>[x.role,x.company,...(Array.isArray(x.evidence)?x.evidence:[])]),
  ...projects.flatMap(x=>[x.name,...(Array.isArray(x.evidence)?x.evidence:[])]),
  ...tools,
 ].filter(Boolean).join(" ").toLowerCase();
 const type=intent(job);
 const related=type&&themes[type]?.test(text)?1:0;
 const roleWords=new Set(words((job?.canonical_title||"")+" "+(job?.role_family||"")));
 const evidenceWords=new Set(words(text));let lexical=0;for(const w of roleWords)if(evidenceWords.has(w))lexical++;
 const score=(verified?40:0)+(related?32:0)+Math.min(lexical,5)*3+(cv?.is_default?8:0)+
   (exp.length?3:0)+(projects.length?3:0);
 return {score,verified,related,reason:related?"Esperienze o progetti collegati alla posizione":cv?.is_default?"Curriculum principale":"Nessuna prova specifica individuata"};
}
export function chooseRelevantCv(cvs,job,savedId=null){
 const available=Array.isArray(cvs)?cvs.filter(Boolean):[];
 if(!available.length)return null;
 const ranked=available.map(cv=>({cv,...scoreCvForJob(cv,job)})).sort((a,b)=>
   b.score-a.score || Number(b.cv.is_default)-Number(a.cv.is_default));
 const saved=available.find(x=>x.id===savedId);
 if(saved){
   const same=ranked.find(x=>x.cv.id===savedId);
   if(same&&same.score>=ranked[0].score-8)return saved;
 }
 return ranked[0].cv;
}
