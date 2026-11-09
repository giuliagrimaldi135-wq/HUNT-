/* User-facing Italian CV summaries, independent from the original stored evidence.
 * NEVER rewrite the source CV: translation is presentation-only. */
const string=v=>String(v??"").trim();
const known=new Map([
 ["client welcome and garment presentation during sales campaign","Accoglienza clienti e presentazione dei capi durante la campagna vendite"],
 ["order taking through max mara application using product codes","Raccolta degli ordini tramite l'applicazione Max Mara, usando i codici prodotto"],
 ["order entry and client minimum-budget support","Inserimento degli ordini e supporto alla verifica dei budget minimi dei clienti"],
 ["autonomy with clients during peak traffic","Gestione autonoma dei clienti nei momenti di maggiore affluenza"],
 ["client welcome and garment presentation during sales campaigns","Accoglienza clienti e presentazione dei capi durante le campagne vendite"],
 ["order entry with client minimum budget","Inserimento ordini e controllo dei budget minimi dei clienti"] ,
 ["merchandising mix and capsule planning","Analisi del merchandising mix e pianificazione di una capsule collection"],
 ["costing and product coding","Analisi dei costi di prodotto (costing) e codifica dei prodotti"],
 ["planning from collection development through orders and distribution","Pianificazione delle fasi dalla creazione della collezione agli ordini e alla distribuzione"],
 ["retail strategy and positioning analysis","Analisi della strategia retail e del posizionamento"],
 ["assortment and buying logic","Studio delle logiche di assortimento e buying"],
 ["budget, kpi and excel-based comparative analysis","Analisi comparativa di budget e KPI tramite Excel"],
 ["merchandising mix and assortment","Analisi del merchandising mix e degli assortimenti"],
 ["capsule collection planning and product costing","Pianificazione di capsule collection e analisi dei costi di prodotto"]

]);
export function projectNameForDisplay(value,locale="it"){
 const name=string(value).replace(/\s+(?:academic project|progetto accademico)$/i,"").trim();
 return locale==="it"&&/\bacademic project\b/i.test(string(value))?"Progetto accademico "+name:name;
}
export function evidenceForDisplay(value,locale="it"){
 const original=string(value),key=original.toLowerCase().replace(/[.!;]+$/,"");
 if(locale!=="it")return {text:original,translated:false};
 if(known.has(key))return {text:known.get(key),translated:true};
 // Exact, narrowly-grounded phrase patterns. The nonmatching source remains untouched.
 const phrases=[
 [/^client welcome and garment presentation during (?:the )?sales campaign$/i,"Accoglienza clienti e presentazione dei capi durante la campagna vendite"],
 [/^order taking (?:through|using) (?:the )?max mara (?:application|app) using product codes$/i,"Raccolta ordini tramite l'app Max Mara, con i codici prodotto"],
 [/^order entry and client minimum.budget support$/i,"Inserimento ordini e supporto alla verifica dei budget minimi dei clienti"],
 [/^autonomy with clients during peak (?:traffic|hours)$/i,"Gestione autonoma dei clienti nei momenti di maggiore affluenza"]
 ];
 for(const [re,text] of phrases)if(re.test(original))return {text,translated:true};
 return {text:original,translated:false,needsTranslation:/\b(?:the|during|with|using|client|customer|sales campaign|order entry|planning|costing|product coding|retail strategy|assortment|buying logic|kpi)\b/i.test(original)};
}
export function cvRoleSignals(profile){
 const p=profile||{},draft=p.draft_profile||{};
 const ex=Array.isArray(p.experience)&&p.experience.length?p.experience: Array.isArray(draft.experience)?draft.experience:[];
 const projects=Array.isArray(p.projects)&&p.projects.length?p.projects:Array.isArray(draft.projects)?draft.projects:[];
 const values=[
 ...ex.flatMap(x=>[x.role,x.company,...(Array.isArray(x.evidence)?x.evidence:[])]),
 ...projects.flatMap(x=>[x.name,...(Array.isArray(x.evidence)?x.evidence:[])])
 ].map(string).join(" ").toLowerCase();
 const out=[];
 if(/merchandis|assortment|assortimento|capsule/.test(values))out.push("Merchandising");
 if(/buying|budget|open.to.buy|\botb\b/.test(values))out.push("Buying e Planning");
 if(/showroom|ordini|orders?|wholesale/.test(values))out.push("Wholesale");
 if(/digital|e-commerce|ecommerce/.test(values))out.push("Digital");
 if(/stock|inventory|allocazion|allocation/.test(values))out.push("Operations");
 return out.slice(0,4);
}
const softwareKeys=[
 ["Excel",/\b(?:microsoft\s+|ms\s+)?excel\b/i],
 ["PowerPoint",/\b(?:microsoft\s+|ms\s+)?power\s*point\b/i],
 ["Word",/\b(?:microsoft\s+|ms\s+)?word\b/i],
 ["Adobe Photoshop",/\b(?:adobe\s+)?photoshop\b/i],
 ["Canva",/\bcanva\b/i],
 ["Power BI",/\bpower\s*bi\b/i],
 ["Tableau",/\btableau\b/i],
 ["SAP",/\bsap\b/i],
 ["InDesign",/\bindesign\b/i],
 ["Illustrator",/\billustrator\b/i]
];
const toolText=v=>string(typeof v==="string"?v:((v?.name||"")+" "+(v?.level?"("+v.level+")":"")));
const toolLevel=/avanzat|advanced|expert|intermedi|intermediate|basic|base/i;
function mergeCvSoftware(profile,draft){
 const entries=[...(Array.isArray(profile?.tools)?profile.tools:[]),
   ...(Array.isArray(draft?.tools)?draft.tools:[])].map(toolText).filter(Boolean);
 // Only explicitly labelled software rows in the SAME document are admissible.
 const source=String(profile?.raw_text||"").split(/\r?\n/).filter(x=>
   /^\s*(?:software|technical skills|digital skills|competenze informatiche|strumenti|tools)\s*:/i.test(x));
 for(const line of source){
   const body=line.replace(/^[^:]*:/,"");
   for(const [name,re] of softwareKeys){
     const match=re.exec(body);if(!match)continue;
     const level=body.slice(match.index+match[0].length).match(/^\s*\((avanzat[oa]|advanced|intermedi[oa]|intermediate|basic|base|expert)\)/i);
     entries.push(name+(level?" ("+level[1]+")":""));
   }
 }
 const merged=new Map();
 for(const entry of entries){
   const normalized=entry.toLowerCase().trim();
   const key=softwareKeys.find(([name,re])=>re.test(entry))?.[0].toLowerCase()||normalized;
   const previous=merged.get(key);
   if(!previous||(!toolLevel.test(previous)&&toolLevel.test(entry)))merged.set(key,entry);
 }
 return [...merged.values()];
}
export function cvReviewSummary(profile){
 const p=profile||{},d=p.draft_profile||{};
 const get=key=>Array.isArray(p[key])&&p[key].length?p[key]:Array.isArray(d[key])?d[key]:[];
 return {experience:get("experience"),projects:get("projects"),education:get("education"),
   tools:mergeCvSoftware(p,d),languages:get("languages"),
   confirmed:!!(p.profile_confirmed_by_user||p.profile_verified_from_user_history),
   language:p.source_language||d.source_language||"it"};
}

const professionalCatalog=[
 ["Merchandising",/merchandis|assort|capsule|product mix/i],
 ["Buying",/\bbuying\b|\bbuyer\b|open.to.buy|\botb\b|acquisti/i],
 ["Planning & Allocation",/planning|pianific|forecast|allocat|\botb\b/i],
 ["Retail & Retail Operations",/retail strategy|retail operations|store operations|retail planning|rete (?:retail|negozi)/i],
 ["E-commerce & Digital",/e.commerce|ecommerce|e.shop|digital experience|online retail/i],
 ["Product Management & Development",/product development|sviluppo prodotto|product coding|costing|sviluppo collezion/i],
 ["Production & Sourcing",/\bsourcing\b|production planning|pianificazion[ei] produzione/i],
 ["Wholesale & Commercial",/showroom|wholesale|sales campaign|campagna vendite|order taking|order entry|raccolta ordini/i],
 ["Marketing & Brand",/brand strategy|brand positioning|marketing|posizionamento del brand/i],
 ["PR, Communications & Events",/public relations|\bpr\b|event management|press office/i],
 ["CRM & Clienteling",/\bcrm\b|clienteling|loyalty program|customer retention/i],
 ["Visual Merchandising",/visual merchandising|window display|vetrin|allestimento/i],
 ["Supply Chain & Logistics",/supply chain|logistics|logistica|inventory distribution/i],
 ["Design & Creative",/design research|graphic design|creative direction|direzione creativa/i],
 ["Data & Analytics",/data analysis|\bkpi\b|analisi comparativa|business intelligence|analytics/i],
 ["Strategy & Project Management",/project management|gestione progetti|strategic planning/i],
 ["HR & Talent",/human resources|\bhr\b|recruitment|talent acquisition/i],
 ["Finance & Legal",/financial analysis|accounting|contabilità|legal compliance/i],
 ["Sustainability",/sustainability|sostenibilit|circular economy/i],
 ["Technology",/software development|programming|coding in python|information technology/i]
];
export function cvProfessionalCategories(profile,available=professionalCatalog.map(x=>x[0])){
 const p=profile||{},d=p.draft_profile||{};
 const get=key=>Array.isArray(p[key])&&p[key].length?p[key]:Array.isArray(d[key])?d[key]:[];
 const proofs=[
  ...get("experience").flatMap(x=>(x.evidence||[]).map(z=>({text:String(z),kind:"Esperienza",source:String(x.company||x.role||"CV")}))),
  ...get("projects").flatMap(x=>(x.evidence||[]).map(z=>({text:String(z),kind:"Progetto",source:String(x.name||"CV")})))
 ];
 const names=Array.isArray(available)&&available.length?available:professionalCatalog.map(x=>x[0]);
 return names.map(name=>{
  const entry=professionalCatalog.find(x=>x[0]===name),rule=entry?.[1];
  const evidence=rule?proofs.find(x=>rule.test(x.text)):null;
  return {name,related:Boolean(evidence),basis:evidence?evidence.kind+" · "+evidence.source:""};
 });
}
