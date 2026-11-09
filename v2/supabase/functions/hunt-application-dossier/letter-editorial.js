// HUNT editorial engine v9: deterministic, source-backed cover letters.
// Pure ES module: used by the Supabase Edge Function and tested with Node.
// Never infer a qualification, result, skill level, company achievement or performance metric.
const clean=v=>String(v??"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const items=v=>Array.isArray(v)?v:[];
const lowerFirst=s=>s?s[0].toLowerCase()+s.slice(1):"";
const join=(a,it)=>a.length>1?a.slice(0,-1).join(", ")+(it?" e ":" and ")+a[a.length-1]:(a[0]||"");

// A category is supported only when the candidate's evidence explicitly contains
// a corresponding activity. Labels do not assert numerical results or seniority.
const signals=[
 {id:"order_entry",re:/order entry|order processing|entered orders|inseriment[oa] ordini|presa ordini|raccolta ordini|registrazion[ei] ordini/i,it:"l'inserimento e la gestione degli ordini",en:"entering and handling orders"},
 {id:"product_codes",re:/product cod(?:e|es)|codici prodotto|product identification code/i,it:"l'utilizzo dei codici prodotto",en:"working with product codes"},
 {id:"clients",re:/client(?:s|i)?|customers?|accoglienz|customer relation/i,it:"il contatto con i clienti",en:"working directly with clients"},
 {id:"presentation",re:/present(?:ed|ation|ing)? (?:the )?(?:garments|items|products)|show(?:ed|ing)? (?:the )?garments|presentazion[ei] (?:dei |di )?(?:capi|prodott)|mostra(?:re|to) (?:i |dei )?capi/i,it:"la presentazione dei capi",en:"presenting garments"},
 {id:"minimum_budget",re:/minimum (?:client |order )?budgets?|budget minim[oi]|minimum order (?:value|threshold)/i,it:"l'attenzione ai budget minimi dei clienti",en:"monitoring clients' minimum order budgets"},
 {id:"assortment",re:/assortment|assortiment|merchandising mix|product mix|mix di prodotto/i,it:"le scelte di assortimento e merchandising mix",en:"assortment and merchandising-mix work"},
 {id:"performance",re:/sell.?through|sales (?:analysis|report|data|performance)|analisi (?:dei dati di )?vendite|report(?:ing)? vendite|retail performance|\bKPI\b/i,it:"l'analisi di vendite e indicatori di performance",en:"sales and performance-indicator analysis"},
 {id:"stock",re:/stock|inventory|inventar|allocazion|allocation|giacenz/i,it:"le attività su stock e allocazioni",en:"stock and allocation work"},
 {id:"costing",re:/costing|cost analysis|analisi dei costi|costi di prodotto/i,it:"l'analisi dei costi di prodotto",en:"product-cost analysis"},
 {id:"planning",re:/forecast|planning|pianificazion|open.to.buy|\bOTB\b/i,it:"la pianificazione di prodotto e budget",en:"product and budget planning"},
 {id:"research",re:/competitor|market (?:analysis|research)|benchmark|analisi competitor|ricerca di mercato|posizionamento/i,it:"l'analisi del mercato e dei competitor",en:"market and competitor analysis"},
 {id:"collection",re:/capsule|collection (?:planning|development)|sviluppo collezion|pianificazione collezion/i,it:"il lavoro su capsule e collezioni",en:"capsule and collection work"},
 {id:"ecommerce",re:/e-commerce|ecommerce|e.?shop|online merchandis/i,it:"le attività e-commerce",en:"e-commerce work"},
 {id:"showroom",re:/showroom|sales campaign|campagna vendite/i,it:"le attività di showroom e campagna vendite",en:"showroom and sales-campaign activities"}
];
const themes=[
 {re:/assort|merchand|product mix|mix di prodotto/i,ids:["assortment","collection","costing","product_codes"]},
 {re:/performance|sell.through|vendit|report|\bKPI\b/i,ids:["performance","minimum_budget","planning"]},
 {re:/stock|invent|allocat|allocazion/i,ids:["stock","planning"]},
 {re:/buying|acquist|budget|open.to.buy/i,ids:["planning","minimum_budget","costing","assortment"]},
 {re:/wholesale|order|ordini|showroom/i,ids:["order_entry","showroom","product_codes","clients"]},
 {re:/ecommerce|e-commerce|online|digital/i,ids:["ecommerce","assortment","performance"]},
 {re:/retail|store|boutique|negoz/i,ids:["clients","showroom","presentation","performance"]},
 {re:/competitor|market|ricerca|benchmark/i,ids:["research","assortment"]},
 {re:/collection|collezion|line.list/i,ids:["collection","assortment","costing","product_codes"]},
 {re:/product data|dati prodotto|codici prodotto/i,ids:["product_codes","assortment"]}
];
function classify(evidence){
 const text=items(evidence).map(clean).filter(Boolean).join(" | ");
 return signals.filter(s=>s.re.test(text)).map(s=>s.id);
}
const idsFor=focus=>{
 const out=new Set();
 for(const theme of themes)if(theme.re.test(focus))for(const id of theme.ids)out.add(id);
 return out;
};
function pickCandidate(records,focus,kind){
 const desired=idsFor(focus);
 return items(records).map((record,index)=>{
   const evidence=items(record?.evidence).filter(v=>clean(v));
   const ids=classify(evidence);
   const overlap=ids.filter(id=>desired.has(id));
   const concrete=ids.filter(id=>id!=="showroom"&&id!=="clients");
   const score=overlap.length*8+concrete.length*2+ids.length-(index*0.01);
   return {kind,record,index,evidence,ids,overlap,score};
 }).filter(x=>x.evidence.length&&x.ids.length)
   .sort((a,b)=>b.score-a.score)[0]||null;
}
function phrases(candidate,it,focus){
 if(!candidate)return [];
 const desired=idsFor(focus);
 const sorted=[...candidate.ids].sort((a,b)=>Number(desired.has(b))-Number(desired.has(a)));
 return sorted.slice(0,3).map(id=>{
   const s=signals.find(x=>x.id===id);
   return it?s.it:s.en;
 });
}

export function generateEditorialLetter(args={}){
 const it=args.language!=="en";
 const company=clean(args.company),role=clean(args.role),name=clean(args.name);
 if(!args.verified||!company||!role||!name)return null;
 const highlights=items(args.highlights).filter(x=>Array.isArray(x)&&clean(x[it?1:0]));
 // A role title alone is not enough to invent the role's day-to-day activities.
 if(!highlights.length)return null;
 const focus=highlights.slice(0,2).map(x=>clean(x[it?1:0])).filter(Boolean).join(it?" e ":" and ");
 const evidenceFocus=highlights.map(x=>clean(x[0])+" "+clean(x[1])).join(" ");
 const rankedExp=pickCandidate(args.experiences,evidenceFocus,"experience");
 const rankedProject=pickCandidate(args.projects,evidenceFocus,"project");
 // Exclude irrelevant experiences rather than inserting an arbitrary CV paragraph.
 const exp=rankedExp?.overlap.length?rankedExp:null;
 const project=rankedProject?.overlap.length?rankedProject:null;
 const expActivities=phrases(exp,it,evidenceFocus);
 const projectActivities=phrases(project,it,evidenceFocus);
 // Require a role-relevant concrete activity, not just generic client contact.
 const hasConcrete=[exp,project].some(c=>c&&c.overlap.some(id=>id!=="showroom"&&id!=="clients"));
 if(!hasConcrete)return null;
 const expName=clean(exp?.record?.company||exp?.record?.role);
 const projectName=clean(project?.record?.name);
 const backgroundIt=exp&&project?"esperienza pratica e progetti formativi":exp?"esperienza professionale":"progetti formativi";
 const backgroundEn=exp&&project?"practical experience and academic projects":exp?"professional experience":"academic projects";
 const intro=it
   ?"Mi candido per la posizione di "+role+" presso "+company+". Nell'annuncio mi interessa soprattutto il lavoro su "+focus+": è un'area che vorrei approfondire partendo da "+backgroundIt+"."
   :"I am applying for the "+role+" position at "+company+". I am particularly interested in its focus on "+focus+", an area where I hope to build on my "+backgroundEn+".";
 const work=exp&&expName&&expActivities.length
   ?it?"Durante la mia esperienza presso "+expName+" ho lavorato su aspetti concreti come "+join(expActivities,true)+"."
      :"At "+expName+", I gained practical experience with "+join(expActivities,false)+"."
   :"";
 const academic=project&&projectName&&projectActivities.length
   ?it?"Nel progetto "+projectName+" ho approfondito aspetti come "+join(projectActivities,true)+"."
      :"In the "+projectName+" project, I also explored "+join(projectActivities,false)+"."
   :"";
 // Do not claim the same CV proof twice: a role-specific paragraph earns its space.
 const proof=[work,academic].filter(Boolean).join("\n\n");
 const close=it
   ?"Sarei felice di approfondire come questo percorso possa essere utile alle attività di "+focus+" previste per il ruolo. Grazie per l'attenzione alla mia candidatura."
   :"I would welcome the opportunity to discuss how this background could support the work on "+focus+" described in the role. Thank you for considering my application.";
 const heading=it?"Gentile team Selezione,":"Dear Recruitment Team,";
 const signature=it?"Cordiali saluti,\n"+name:"Kind regards,\n"+name;
 return {
   text:[heading,intro,proof,close,signature].filter(Boolean).join("\n\n"),
   evidence:[
     ...(exp?exp.evidence.map(value=>({type:"experience",origin:expName,value})):[]),
     ...(project?project.evidence.map(value=>({type:"project",origin:projectName,value})):[])
   ],
   editorial_version:"evidence_editorial_v9",
   scope:focus
 };
}
