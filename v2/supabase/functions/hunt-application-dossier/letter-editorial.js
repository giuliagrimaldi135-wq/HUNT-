// HUNT editorial engine v11: deterministic, source-backed cover letters.
// Pure ES module: used by the Supabase Edge Function and tested with Node.
// Never infer a qualification, result, skill level, company achievement or performance metric.
const clean=v=>String(v??"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const items=v=>Array.isArray(v)?v:[];
const lowerFirst=s=>s?s[0].toLowerCase()+s.slice(1):"";
const join=(a,it)=>a.length>1?a.slice(0,-1).join(", ")+(it?" e ":" and ")+a[a.length-1]:(a[0]||"");

// A category is supported only when the candidate's evidence explicitly contains
// a corresponding activity. Labels do not assert numerical results or seniority.
const signals=[
 {id:"order_entry",re:/order entry|order processing|entered orders|inseriment[oa] (?:degli )?ordini|registrazion[ei] (?:degli )?ordini/i,it:"l'inserimento degli ordini",en:"entering orders"},
 {id:"order_taking",re:/presa ordini|raccolta ordini|taking orders|took (?:customer )?orders|order taking/i,it:"la raccolta degli ordini",en:"taking customer orders"},
 {id:"product_codes",re:/product cod(?:e|es)|codici prodotto|product identification code/i,it:"l'utilizzo dei codici prodotto",en:"the use of product codes"},
 {id:"clients",re:/welcom(?:ed|ing)? clients|greet(?:ed|ing)? customers|customer.facing|client contact|client interaction|accoglienz|assistenza clienti|relazioni con (?:i )?clienti/i,it:"il contatto diretto con i clienti",en:"direct contact with clients"},
 {id:"presentation",re:/present(?:ed|ation|ing)? (?:the )?(?:garments|items|products)|show(?:ed|ing)? (?:the )?garments|presentazion[ei] (?:dei |di )?(?:capi|prodott)|mostra(?:re|to) (?:i |dei )?capi/i,it:"la presentazione dei prodotti",en:"presenting products"},
 {id:"minimum_budget",re:/minimum (?:client |order )?budgets?|budget minim[oi]|minimum order (?:value|threshold)/i,it:"il monitoraggio dei budget minimi dei clienti",en:"tracking clients' minimum order budgets"},
 {id:"assortment",re:/assortment|assortiment|product mix|mix di prodotto/i,it:"il lavoro sugli assortimenti",en:"assortment decisions"},
 {id:"merch_mix",re:/merchandising mix/i,it:"il merchandising mix",en:"merchandising mix"},
 {id:"performance",re:/sell.?through|sales (?:analysis|report|data|performance)|analisi (?:dei dati di )?vendite|report(?:ing)? vendite|retail performance|\bKPI\b/i,it:"le attività su KPI e performance",en:"KPI and performance analysis"},
 {id:"stock",re:/\bstock\b|inventory|inventar|giacenz/i,it:"il lavoro sulle disponibilità di stock",en:"stock availability work"},
 {id:"allocation",re:/allocazion|allocation/i,it:"le allocazioni di prodotto",en:"product allocation"},
 {id:"costing",re:/costing|cost analysis|analisi dei costi|costi di prodotto/i,it:"l'analisi dei costi di prodotto",en:"product-cost analysis"},
 {id:"planning",re:/forecast|planning|pianificazion|open.to.buy|\bOTB\b/i,it:"le attività di pianificazione",en:"planning activities"},
 {id:"research",re:/competitor|market (?:analysis|research)|benchmark|analisi competitor|ricerca di mercato|posizionamento/i,it:"l'analisi di mercato",en:"market analysis"},
 {id:"collection",re:/capsule|collection (?:planning|development)|sviluppo collezion|pianificazione collezion/i,it:"il lavoro su capsule e collezioni",en:"capsule and collection work"},
 {id:"ecommerce",re:/e-commerce|ecommerce|e.?shop|online merchandis/i,it:"le attività e-commerce",en:"e-commerce work"},
 {id:"showroom",re:/showroom/i,it:"le attività di showroom",en:"showroom work"},
 {id:"sales_campaign",re:/sales campaign|campagna vendite/i,it:"le attività della campagna vendite",en:"sales-campaign work"}
];
const themes=[
 {re:/assort|merchand|product mix|mix di prodotto/i,ids:["assortment","merch_mix","collection","costing","product_codes"]},
 {re:/performance|sell.through|vendit|report|\bKPI\b/i,ids:["performance","minimum_budget","planning"]},
 {re:/stock|invent|allocat|allocazion/i,ids:["stock","allocation","planning"]},
 {re:/planning|forecast|pianificazion|previsioni/i,ids:["planning","stock","performance"]},
 {re:/buying|acquist|budget|open.to.buy/i,ids:["planning","minimum_budget","costing","assortment"]},
 {re:/wholesale|order|ordini|showroom/i,ids:["order_entry","order_taking","showroom","sales_campaign","product_codes","clients"]},
 {re:/ecommerce|e-commerce|online|digital/i,ids:["ecommerce","assortment","performance"]},
 {re:/retail|store|boutique|negoz/i,ids:["clients","showroom","presentation","performance"]},
 {re:/competitor|market|ricerca|benchmark/i,ids:["research","assortment"]},
 {re:/collection|collezion|line.list/i,ids:["collection","assortment","merch_mix","costing","product_codes"]},
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
 const hasConcrete=[exp,project].some(c=>c&&c.overlap.some(id=>!["showroom","clients"].includes(id)));
 if(!hasConcrete)return null;
 const expName=clean(exp?.record?.company||exp?.record?.role);
 const projectName=clean(project?.record?.name);
 // One precise reason to apply, two source-backed examples at most, and no repeated
 // claims about company culture, skills, achievements or personal traits.
 const roleType=/wholesale|orders?|ordini|showroom/i.test(evidenceFocus)?"wholesale":
  /stock|allocat|planning|forecast|pianificazion/i.test(evidenceFocus)?"planning":
  /assort|merchand|collection|collezion/i.test(evidenceFocus)?"product":
  /e.?commerce|digital/i.test(evidenceFocus)?"digital":"general";
 const roleTopics={
  wholesale:{it:"gestione degli ordini, prodotto e supporto commerciale",en:"order management, products and commercial support"},
  planning:{it:"pianificazione commerciale, stock e attività operative",en:"commercial planning, stock and operational activities"},
  product:{it:"assortimento, prodotto e scelte di merchandising",en:"assortment, product and merchandising decisions"},
  digital:{it:"prodotto, canali digitali ed esperienza del cliente",en:"products, digital channels and customer experience"},
  general:{it:"attività operative e analitiche descritte nell'annuncio",en:"the operational and analytical work described in the vacancy"}
 };
 const area=roleTopics[roleType][it?"it":"en"];
 const education=items(args.education).find(x=>clean(x?.program)||clean(x?.school));
 const program=clean(education?.program),school=clean(education?.school);
 const study=program||school?
   it?"La mia formazione "+(program?"in "+program:"")+" presso "+(school||"l'istituto indicato nel CV")+" mi ha portata a confrontarmi con il mondo del fashion da una prospettiva professionale. Ora vorrei continuare questo percorso entrando più da vicino nei processi di un team."
     :"My studies "+(program?"in "+program:"")+" at "+(school||"the institution listed in my CV")+" have shaped my interest in the fashion industry from a professional perspective. I am now looking to develop that experience within a team."
   :"";
 const intro=it
  ?"Vorrei candidarmi per il ruolo di "+role+" presso "+company+". Dalla descrizione della posizione mi interessa in particolare il lavoro su "+area+": è un collegamento concreto tra il percorso che ho intrapreso e le responsabilità in cui desidero crescere."
  :"I would like to apply for the "+role+" position at "+company+". I was particularly interested in its responsibilities across "+area+", as these are areas in which I would like to build on my current experience and develop further.";
 const expText=exp&&expName&&expActivities.length
  ?it?"Nella mia esperienza presso "+expName+" ho seguito attività come "+join(expActivities.slice(0,2),true)+". Questa esperienza mi ha permesso di conoscere da vicino le attività operative che svolgevo e il modo in cui si organizzano nel lavoro quotidiano."
     :"During my experience at "+expName+", I was involved in "+join(expActivities.slice(0,2),false)+". This gave me a closer understanding of the work involved in these tasks and how they fit into a team's daily activities."
  :"";
 const projectLabel=projectName.replace(/\s+academic project$/i,"");
 const projectText=project&&projectName&&projectActivities.length
  ?it?"Nel progetto "+projectLabel+" ho inoltre approfondito "+join(projectActivities.slice(0,2),true)+". Ho trovato utile affrontare questi temi in modo strutturato, collegando le scelte di prodotto alle attività previste dal progetto."
     :"The "+projectLabel+" project also involved "+join(projectActivities.slice(0,2),false)+". It allowed me to explore the product-related decisions described in the project in a more structured way."
  :"";
 const motivation={
  product:it?"Mi interessa soprattutto imparare come si costruiscono assortimenti coerenti con le esigenze dei mercati e dei clienti.":"I am particularly interested in how assortments are developed around market and customer needs.",
  planning:it?"Mi interessa comprendere meglio come le informazioni disponibili vengano trasformate in decisioni di pianificazione, senza perdere di vista il lavoro operativo.":"I would like to better understand how information is turned into planning decisions while staying close to operational work.",
  wholesale:it?"Vorrei approfondire il rapporto fra ordini, prodotto e relazioni commerciali, dando continuità all'esperienza già acquisita.":"I would like to build on my experience and learn more about the links between orders, products and commercial relationships.",
  digital:it?"Vorrei capire meglio come prodotto e strumenti digitali contribuiscano all'esperienza del cliente.":"I would like to understand more about how products and digital tools shape the customer experience.",
  general:it?"Mi interessa confrontarmi con attività reali, imparando dal lavoro del team.":"I would welcome the opportunity to learn through the team's day-to-day work."
 }[roleType];
 const close=it
  ?motivation+" Sarebbe un piacere approfondire con voi il ruolo e raccontarvi come potrei contribuire. Vi ringrazio per l'attenzione dedicata alla mia candidatura."
  :motivation+" I would welcome the chance to discuss the role and how my background could be useful to the team. Thank you for taking the time to consider my application.";
 const heading=it?"Gentile team Recruiting,":"Dear Recruitment Team,";
 const signature=it?"Cordiali saluti,\n"+name:"Kind regards,\n"+name;
 const paragraphs=[intro,study,expText,projectText,close].filter(Boolean);
 const text=[heading,...paragraphs,signature].join("\n\n");
 return {
   text,
   evidence:[
     ...(exp?exp.evidence.filter(value=>exp.overlap.some(id=>signals.find(s=>s.id===id)?.re.test(value))).map(value=>({type:"experience",origin:expName,value})):[]),
     ...(project?project.evidence.filter(value=>project.overlap.some(id=>signals.find(s=>s.id===id)?.re.test(value))).map(value=>({type:"project",origin:projectName,value})):[])
   ],
   editorial_version:"evidence_editorial_v11",
   scope:focus
 };
}
