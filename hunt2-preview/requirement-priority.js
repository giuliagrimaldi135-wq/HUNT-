/* Professionally meaningful employer criteria, never personality scoring.
 * Preserve the full source array: selection affects presentation, not evidence. */
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const soft=/comunicativ|relazional|interperson|collabor|stakeholder|teamwork|iniziativ|autonom|ownership|attention to detail|attenzione ai dettagli|accuracy|precision|deadline|scadenz|priorit[ay]|motiva|ambition|passion|curios|proactiv|resilien|attitud|mindset|orientamento commerciale|commercial mindset|problem.solving|strong work ethic/i;
const qualifications=[
 {key:"experience",re:/\b\d+\s*[-–]\s*\d+\s*anni|\b\d+\s*(?:anni|years?)\b|\b\d+\s*[-–]\s*\d+\s*years?|esperienza (?:in|nel|di) (?:planning|buying|merchandising|sourcing)/i,score:95},
 {key:"degree",re:/laurea|degree|diploma|master|formazione specifica/i,score:85},
 {key:"systems",re:/\berp\b|\bsap\b|business objects|prima|power bi|sql|software gestional|sistema gestionale/i,score:90},
 {key:"excel",re:/excel|powerpoint|spreadsheet|fogli di calcolo/i,score:92},
 {key:"planning",re:/\bplanning\b|pianificazion|forecast|allocation|allocazion|supply.?chain|\botb\b|demand planning|sourcing/i,score:80},
 {key:"analytics",re:/analisi dei dati|data analysis|reporting|\bkpi\b|analitich|numerich|commercial insights|interpretare dati|analytical/i,score:72},
 {key:"languages",re:/inglese|francese|english|french|\bc1\b|\bb2\b/i,score:82},
 {key:"product",re:/merchandis|assortiment|buying|product knowledge|conoscenza prodotto|costing/i,score:76}
];
function category(t){return qualifications.find(x=>x.re.test(t))||null}
export function prioritizeRequirements(requirements,limit=4){
 const found=new Map();
 for(let index=0;index<(Array.isArray(requirements)?requirements.length:0);index++){
   const original=String(requirements[index]||"").trim();if(!original)continue;
   const cleaned=norm(original),cat=category(cleaned);
   // A planning-related word does NOT turn ambition or motivation into evidence.
   // Do not compare character traits against CVs.
   if(/motivazion|ambition|passion|attitude|ownership|iniziativ|attenzione ai dettagli|precision|accuracy|manage priorities|gestire le priorita/i.test(cleaned)&&
       !/\b(?:excel|powerpoint|sap|erp)\b|\d+\s*[-–]?\s*\d*\s*(?:anni|years)|\bdegree\b|laurea/i.test(cleaned))continue;
   if(!cat)continue; // refuse unassessable generic claims
   // Some requirements combine a technical qualification and softer adjectives.
   // Keep the objectively assessable part only, but retain the full source for traceability.
   const isSoftOnly=soft.test(cleaned)&&!/(excel|powerpoint|\bdegree\b|laurea|\d+\s*[-–]\s*\d+\s*anni|\d+\s*(?:anni|years)|\berp\b|reporting|analisi dei dati|\bkpi\b|analitich|numerich|planning|pianificazion|costing|buying|merchandis|sourcing|stock|supply)/i.test(cleaned);
   if(isSoftOnly)continue;
   const prev=found.get(cat.key);
   // Only one version per professional domain; prefer the more specific source statement.
   const specificity=cat.score+Math.min(original.length/30,5)+(/avanzat|advanced|\b\d+\b|\b1[-–]2\b/i.test(original)?8:0);
   if(!prev||prev.priority<specificity)found.set(cat.key,{text:original,sourceIndex:index,category:cat.key,priority:specificity});
 }
 return [...found.values()].sort((a,b)=>b.priority-a.priority||a.sourceIndex-b.sourceIndex).slice(0,limit);
}
export function compareKeyRequirement(requirement,check,profile){
 const kind=requirement?.category,raw=String(check?.proof||"").trim(),type=check?.type||"missing";
 const p=profile||{},draft=p.draft_profile||{};
 const confirmed=!!(p.profile_confirmed_by_user||p.profile_verified_from_user_history);
 if(kind==="experience"){
   // A qualifying job needs relevant tasks AND dated experience, not a self-entered
   // numerical estimate or an academic project.
   const jobs=Array.isArray(p.experience)&&p.experience.length?p.experience:
     Array.isArray(draft.experience)?draft.experience:[];
   const related=jobs.filter(x=>/planning|buyer|buying|sourcing|merchandis|allocation|pianificazion/i.test(
     [x.role,...(Array.isArray(x.evidence)?x.evidence:[])].join(" ")));
   if(related.length)return {state:"partial",label:"Esperienza collegata",
     evidence:"Il CV riporta attività pertinenti; la durata richiesta non è ancora documentata in modo sufficiente."};
   return {state:"missing",label:"Non indicato nel CV",
     evidence:"Non risultano esperienze professionali specifiche in planning, sourcing, buying o merchandising con la durata richiesta."};
 }
 if(kind==="analytics"){
   const projects=Array.isArray(p.projects)&&p.projects.length?p.projects:Array.isArray(draft.projects)?draft.projects:[];
   const project=projects.find(x=>/kpi|analisi|analysis|report|excel|budget|data/i.test((x.evidence||[]).join(" ")));
   if(project)return {state:"partial",label:"Esperienza formativa",
     evidence:"Il CV riporta attività formative di analisi nel progetto "+String(project.name||"accademico").replace(/ academic project$/i,"")+
     ". Una base pertinente, distinta dall’esperienza professionale."};
 }
 if(type==="found")return {state:"found",label:"Presente nel CV",evidence:raw};
 if(type==="detected")return {state:"detected",label:"Indicato nel CV",evidence:raw};
 if(type==="alternate")return {state:"alternate",label:"Solo in un altro CV",evidence:raw};
 if(type==="partial")return {state:"partial",label:"Presente in parte",evidence:raw};
 return {state:"missing",label:"Non indicato nel CV",evidence:"Il requisito non risulta dalle informazioni presenti in questa versione del curriculum."};
}
