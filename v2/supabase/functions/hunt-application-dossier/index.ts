
import { createClient } from "npm:@supabase/supabase-js@2";
const ORIGIN="https://giuliagrimaldi135-wq.github.io";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function reply(obj:unknown,status=200){return new Response(JSON.stringify(obj),{status,headers:{...cors,"Content-Type":"application/json"}})}
function admin(){
 const url=Deno.env.get("SUPABASE_URL")||"";
 const raw=Deno.env.get("SUPABASE_SECRET_KEYS")||"";
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(raw){try{const obj=JSON.parse(raw);key=String(obj.default||Object.values(obj)[0]||key)}catch{}}
 if(!url||!key)throw Error("Missing admin configuration");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
const str=(v:unknown)=>String(v??"").replace(/\s+/g," ").trim();
const short=(v:unknown,max=400)=>str(v).slice(0,max);
const list=(v:unknown):any[]=>Array.isArray(v)?v:[];
const clause=(v:unknown)=>{const s=short(v,300).replace(/[.;:, ]+$/,"");return s?s[0].toLowerCase()+s.slice(1):""};
const connect=(a:string[],lang="en")=>a.length>1?a.slice(0,-1).join(", ")+(lang==="it"?" e ":" and ")+a[a.length-1]:(a[0]||"");
function minExperience(desc:string){
 const t=desc.toLowerCase().replace(/\bfive\s+years/g,"5 years").replace(/\bthree\s+years/g,"3 years");
 for(const re of [/\bminimum(?: of)?\s+(\d{1,2})\s*(?:\+)?\s*years?/,/\bat least\s+(\d{1,2})\s*(?:\+)?\s*years?/,/\b(\d{1,2})\s*\+?\s*years?\s+of\s+(?:relevant\s+)?experience/]){const m=t.match(re);if(m)return Number(m[1])}
 return null;
}
function facts(cv:any,role:string,desc:string){
 const all:{origin:string;kind:string;value:string;score:number}[]=[];
 const text=(role+" "+desc.slice(0,2400)).toLowerCase();
 const keywords=(text.match(/\b[a-z]{5,}\b/g)||[]).filter(x=>!/^(about|which|their|years|skills|experience|previous|minimum|opportunity|department|business)$/.test(x));
 for(const e of list(cv.experience)){const origin=short(e.company||e.role||"Esperienza",120);for(const v of list(e.evidence)){const value=short(v,320);if(value)all.push({kind:"experience",origin,value,score:2})}}
 for(const p of list(cv.projects)){const origin=short(p.name||"Progetto",120);for(const v of list(p.evidence)){const value=short(v,320);if(value)all.push({kind:"project",origin,value,score:1})}}
 for(const t of list(cv.tools)){const value=short(t,100);if(value)all.push({kind:"tool",origin:"Strumenti",value,score:0})}
 for(const f of all){let count=0;for(const word of keywords){if(f.value.toLowerCase().includes(word))count++}f.score+=Math.min(6,count)}
 return all.sort((a,b)=>b.score-a.score);
}
function focus(role:string){
 const s=role.toLowerCase();
 if(/merchandis/.test(s))return ["assortment, product decisions and retail performance","assortimento, prodotto e performance retail"];
 if(/buying/.test(s))return ["product selection, buying budgets and commercial decisions","selezione prodotto, budget e decisioni commerciali"];
 if(/planning|allocation/.test(s))return ["planning, stock allocation and performance","pianificazione, allocazione e performance"];
 if(/wholesale/.test(s))return ["orders, product presentation and commercial relationships","ordini, presentazione prodotto e relazioni commerciali"];
 if(/e-commerce|digital/.test(s))return ["digital product assortment and online performance","assortimento digitale e performance online"];
 if(/retail/.test(s))return ["retail processes, coordination and performance","processi retail, coordinamento e performance"];
 if(/logistics|supply chain/.test(s))return ["order flows and operational coordination","flussi d'ordine e coordinamento operativo"];
 if(/product/.test(s))return ["product development and collection decisions","sviluppo prodotto e collezioni"];
 return ["the responsibilities outlined in this vacancy","le attività descritte nell'annuncio"];
}

function vacancyHighlights(text:string){
 // Only surface tasks actually mentioned in the vacancy, in Italian or English.
 const out:[string,string][]=[];
 const rules:[RegExp,string,string][]=[
  [/assortment|assortimento|assortimenti|product mix|range planning|selezione prodotto|selezione dei prodotti/i,"assortment and product selection","selezione di prodotto e assortimento"],
  [/sell[\s-]?in|sell[\s-]?out|sell[\s-]?through|sales analysis|sales reporting|analisi vendite|analisi delle vendite|best[\s-]?seller|slow[\s-]?mover|performance|kpi|report(?:ing)?/i,"commercial performance and sell-through analysis","analisi vendite e performance"],
  [/stock|inventory|inventario|giacenz|allocation|allocazione|copertura prodotto/i,"inventory management and allocation","gestione stock e allocazione"],
  [/buying|buyer|open[\s-]?to[\s-]?buy|budget.*acquist|fornitor|supplier|vendor/i,"buying and budget decisions","buying e gestione dei budget"],
  [/showroom|wholesale|order (management|entry|process)|gestione ordini|inserimento ordini|campagna vendite/i,"wholesale and order management","gestione ordini e processi wholesale"],
  [/ecommerce|e-commerce|online|digital merchandising|e[\s-]?shop/i,"digital merchandise performance","assortimento e performance online"],
  [/store operations|store network|boutique|outlet|rete (dei )?negozi|rete (di )?boutique|aperture stagionali|procedure retail|retail operations/i,"store network coordination","coordinamento operativo della rete retail"],
  [/forecast|demand planning|planning|financial plan|pianificazion|previsioni|stock planning/i,"planning and forecasting","pianificazione e forecasting"],
  [/competitor|benchmark|concorren|ricerca (di )?mercato|market research|pricing research|ricerca (su|dei?) concorrenti/i,"competitive and product research","analisi competitor e prodotto"],
  [/collection plan|collection database|line lists?|sample files?|sample management|sviluppo collezion|collezion/i,"collection and line-list management","pianificazione collezione e strumenti prodotto"],
  [/product cod|codici prodotto|product data|dati prodotto|attributi prodotto/i,"product-data accuracy","qualità e gestione dei dati prodotto"]
 ];
 for(const [re,en,it] of rules){if(re.test(text))out.push([en,it])}
 return out.slice(0,3);
}
function experienceBridge(cv:any,duty:[string,string]|null){
 if(!duty)return null;
 const topic=duty[1];
 const evidences=[...list(cv.experience).flatMap((x:any)=>list(x.evidence)),...list(cv.projects).flatMap((x:any)=>list(x.evidence))].map(x=>str(x).toLowerCase());
 const includes=(regex:RegExp)=>evidences.some(t=>regex.test(t));
 if(/assortimento|collezione|prodotto/.test(topic)&&includes(/merchandis|capsule|assortment|collection|product|costing/i))return "i progetti di assortimento e collezione";
 if(/performance|forecast|stock|budget/.test(topic)&&includes(/kpi|budget|excel|performance|planning|costing|sales|order/i))return "l'analisi di budget, KPI e pianificazione";
 if(/competitor/.test(topic)&&includes(/market|research|positioning|strategy|merchandis|capsule/i))return "l'analisi di posizionamento e prodotto";
 if(/ordini|wholesale/.test(topic)&&includes(/order|sales campaign|showroom/i))return "il lavoro operativo su ordini e campagna vendite";
 if(/rete retail|operativo/.test(topic)&&includes(/retail|showroom|order|client|store/i))return "l'esperienza operativa a contatto con i processi commerciali";
 if(/dati prodotto/.test(topic)&&includes(/product coding|codes|codici|data|excel/i))return "la gestione di codici prodotto e dati";
 return null;
}


function letter(args:any){
 const {language,company,role,name}=args;
 const it=language==="it";
 const evidence=list(args.experience?.evidence).map((x:any)=>str(x)).filter(Boolean);
 const project=list(args.projects).find((x:any)=>list(x.evidence).length>0);
 const projectEvidence=project?list(project.evidence).map((x:any)=>str(x)):[];
 const all=(evidence+" "+projectEvidence).toLowerCase();
 const duties=list(args.highlights).slice(0,2);
 const focusIt=duties.length?connect(duties.map((d:any)=>d[1]),"it"):str(args.areaIt||"il lavoro fra prodotto e mercato");
 const focusEn=duties.length?connect(duties.map((d:any)=>d[0])):str(args.areaEn||"the connection between product and the market");
 const area=(str(role)+" "+duties.map((d:any)=>d[0]).join(" ")).toLowerCase();
 const isAssort=/merchandis|assortment|collection|buying|product selection/i.test(area);
 const isNumbers=/analys|planning|sales|data|forecast|performance|allocation/i.test(area);
 const isDigital=/e-commerce|digital|online/i.test(area);
 const tagsIt:string[]=[];
 const tagsEn:string[]=[];
 const tags=[
  [/showroom|sales campaign/i,"attività di showroom e campagna vendite","showroom and sales-campaign work"],
  [/order|ordini/i,"gestione e inserimento degli ordini","order handling"],
  [/presentation|garment|client|customer/i,"presentazione del prodotto e relazione con i clienti","product presentation and client interaction"],
  [/budget/i,"attenzione ai budget commerciali","commercial budget constraints"],
  [/merchandis|assortment|mix/i,"assortimenti e merchandising mix","assortment and merchandising-mix projects"],
  [/capsule|collection planning/i,"pianificazione di capsule e collezioni","capsule and collection planning"],
  [/costing/i,"valutazione dei costi","cost analysis"],
  [/kpi|performance|otb|open.to.buy/i,"analisi di KPI e pianificazione commerciale","KPI analysis and commercial planning"],
  [/excel/i,"utilizzo di Excel","Excel analysis"]
 ];
 for(const [regex,itName,enName] of tags as [RegExp,string,string][]){
  if(regex.test(all)){tagsIt.push(itName);tagsEn.push(enName)}
 }
 const place=str(args.experience?.company||"");
 const projectName=str(project?.name||"").replace(/\s+(academic\s+)?project$/i,"").trim();
 const study=str(args.program||"");
 if(it){
  const opening=isAssort
    ?"Mi interessa il momento in cui una collezione diventa una scelta concreta: quali prodotti valorizzare, come costruire l'assortimento e come capire ciò che funziona davvero."
    :isNumbers
      ?"Mi piace l'idea che dietro le decisioni su prodotto e negozi ci siano dati da leggere, dettagli da controllare e persone che lavorano insieme."
      :isDigital
        ?"Mi incuriosisce il lavoro che rende un prodotto visibile e rilevante online, dal modo in cui viene presentato all'analisi delle sue performance."
        :"Mi interessa capire da vicino come le scelte di prodotto e il lavoro quotidiano dei team contribuiscano ai risultati del brand.";
  const bridge="È per questo che ho letto con attenzione la posizione di "+role+" presso "+company+", in particolare le attività legate a "+focusIt+".";
  const experience=place&&tagsIt.length
    ?"Nell'esperienza presso "+place+" ho avuto modo di lavorare su "+connect(tagsIt.slice(0,2),"it")+". Mi ha fatto capire quanto contino precisione, ascolto e passaggi ben organizzati, anche nelle attività che dall'esterno si vedono meno."
    :place?"L'esperienza presso "+place+" mi ha permesso di conoscere più da vicino i processi operativi del settore.":"";
  const academia=projectName&&projectEvidence.length
    ?"Con il progetto "+projectName+" ho poi potuto esplorare il lavoro dietro le decisioni di prodotto, passando dalla teoria a scelte concrete su cui confrontarmi."
    :study?"La formazione in "+study+" mi ha dato un punto di partenza che desidero mettere alla prova sul campo.":"";
  const closing="Non cerco di presentarmi come una persona con anni di esperienza: posso però portare cura per il lavoro, curiosità autentica e voglia di contribuire dove servono metodo e attenzione ai dettagli. Mi piacerebbe parlarne con voi e capire come potrei essere utile al team.";
  return ["Gentile team di "+company+",",opening+" "+bridge,[experience,academia].filter(Boolean).join(" "),closing,"Cordiali saluti,\n"+name].filter(Boolean).join("\n\n");
 }
 const opening=isAssort
   ?"I am interested in what happens between a collection idea and a real product decision: what to select, how to shape an assortment, and how to understand what works."
   :isNumbers
     ?"I am drawn to the decisions behind the products customers eventually see: understanding the numbers, noticing the details and bringing teams together around them."
     :isDigital
       ?"I am curious about what makes a product work online, from how it is presented to how its performance is understood."
       :"I want to learn how thoughtful product decisions and the everyday work of a team contribute to what customers ultimately experience.";
 const bridge="That is why the "+role+" opportunity at "+company+" caught my attention, especially its focus on "+focusEn+".";
 const experience=place&&tagsEn.length
   ?"At "+place+", I worked on "+connect(tagsEn.slice(0,2))+". That experience gave me an appreciation for careful coordination and for the details that matter even when customers never see them."
   :place?"My experience at "+place+" gave me a closer view of the operational side of fashion.":"";
 const academic=projectName&&projectEvidence.length
   ?"Through my "+projectName+" project, I had the chance to explore the decisions behind product and collection planning, and to question how those choices translate into practice."
   :study?"My studies in "+study+" gave me a foundation I am eager to build on through hands-on work.":"";
 const closing="I would not claim to bring years of experience. What I can offer is real curiosity, care with the work and a willingness to learn quickly while contributing wherever accuracy and attention to detail make a difference. I would welcome the opportunity to discuss that with your team.";
 return ["Dear "+company+" Hiring Team,",opening+" "+bridge,[experience,academic].filter(Boolean).join(" "),closing,"Kind regards,\n"+name].filter(Boolean).join("\n\n");
}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 if(req.headers.get("Origin")&&req.headers.get("Origin")!==ORIGIN)return reply({error:"Origin not allowed"},403);
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!token)return reply({error:"Accedi al tuo account HUNT."},401);
 const db=admin();
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return reply({error:"Sessione non valida: accedi di nuovo."},401);
 let payload:any;try{payload=await req.json()}catch{return reply({error:"Invalid JSON body"},400)}
 if(!uuid.test(String(payload?.job_id||"")))return reply({error:"Invalid job identifier"},400);
 const userId=user.id,language=payload.language==="it"?"it":"en";
 const [jobR,cvsR,profileR,matchR,personalR]=await Promise.all([
  db.from("jobs").select("id,company_id,canonical_title,description,role_family,seniority,metadata,primary_apply_url,companies(name)").eq("id",payload.job_id).maybeSingle(),
  db.from("user_cvs").select("id,name,parsed_profile,is_default,active,target_role_families,updated_at").eq("user_id",userId).eq("active",true),
  db.from("profiles").select("display_name,seniority").eq("user_id",userId).maybeSingle(),
  db.from("user_job_matches").select("reasons,gaps,match_score").eq("user_id",userId).eq("job_id",payload.job_id).maybeSingle(),
  db.from("user_personalization").select("interest_areas,avoid_role_traits,communication_style").eq("user_id",userId).maybeSingle()
 ]);
 if(jobR.error||!jobR.data)return reply({error:"Offerta non trovata."},404);
 if(cvsR.error)return reply({error:"Impossibile leggere i CV del tuo account."},500);
 const job=jobR.data,cvs=cvsR.data||[];
 let chosen=cvs.find(x=>payload?.cv_id&&x.id===payload.cv_id);
 if(payload?.cv_id&&!chosen)return reply({error:"Il CV non appartiene al tuo account."},403);
 const strength=(x:any)=>Number(Boolean(x.parsed_profile?.profile_verified_from_user_history||x.parsed_profile?.profile_confirmed_by_user))+Number(Boolean(x.parsed_profile?.experience?.length||x.parsed_profile?.projects?.length));
 // Choose the strongest CV for this *specific vacancy*, not just the default CV.
 const roleWords=new Set((str(job.role_family)+" "+str(job.canonical_title)+" "+str(job.description).slice(0,2400)).toLowerCase().match(/[a-z]{5,}/g)||[]);
 const rankCv=(x:any)=>{
   const p=x.parsed_profile||{};
   const targets=list(x.target_role_families).map((v:any)=>str(v).toLowerCase());
   const role=str(job.role_family).toLowerCase();
   const evidence=[...list(p.experience).flatMap((y:any)=>list(y.evidence)),...list(p.projects).flatMap((y:any)=>list(y.evidence)),...list(p.tools)].join(" ").toLowerCase();
   let overlaps=0;for(const word of roleWords)if(evidence.includes(word))overlaps++;
   return (targets.includes(role)?65:0)+Math.min(overlaps*3,21)+strength(x)*12+(x.is_default?4:0);
 };
 // An unparsed PDF may have role tags but cannot outrank a CV with confirmed evidence.
 const readyCv=cvs.filter(x=>strength(x)>0);
 chosen=chosen||[...readyCv].sort((a,b)=>rankCv(b)-rankCv(a))[0]||[...cvs].sort((a,b)=>rankCv(b)-rankCv(a))[0];
 if(!chosen)return reply({error:"Carica un CV o completa il profilo professionale."},422);
 const cv=chosen.parsed_profile||{};
 const exp=list(cv.experience),projects=list(cv.projects),education=list(cv.education);
 if(!exp.length&&!projects.length&&!education.length)return reply({error:"Il PDF è caricato, ma non contiene ancora esperienze confermate. Apri Profilo, controlla il testo estratto e conferma le informazioni prima di generare la lettera.",code:"CV_NOT_VERIFIED"},422);
 const description=str(job.description);
 const reqYears=typeof job.metadata?.hard_requirements?.min_years_experience==="number"?job.metadata.hard_requirements.min_years_experience:minExperience(description);
 const years=Number(cv.relevant_years_experience);
 const known=cv.relevant_years_experience!==undefined&&Number.isFinite(years);
 const early=["internship","trainee","entry_level","assistant","junior"].includes(profileR.data?.seniority||"entry_level");
 const gaps=list(matchR.data?.gaps).map((v:any)=>short(v,300));
 if(reqYears!==null&&reqYears>=2&&((known&&years+0.25<reqYears)||(!known&&early)))gaps.push("La vacancy richiede almeno "+reqYears+" anni di esperienza non documentati nel profilo.");
 const tech=/\b(degree\s+in\s+architecture|degree\s+in\s+civil\s+engineering|registered\s+architect|architectural\s+license|laurea\s+in\s+architettura)\b/i.test(description);
 const school=education.map(e=>str(e.program)+" "+str(e.school)).join(" ").toLowerCase();
 if(tech&&!/architecture|architettura|civil engineering|ingegneria civile/.test(school))gaps.push("Sono richieste qualifiche tecniche non documentate nella formazione.");
 const avoided=list(personalR.data?.avoid_role_traits);
 const heading=str(job.canonical_title).toLowerCase();
 if(avoided.includes("store_sales")&&/(sales assistant|client advisor|sales associate|sales advisor|style advisor)/.test(heading))gaps.push("Ruolo di vendita diretta escluso dalle tue preferenze.");
 if(avoided.includes("constant_customer_contact")&&/(customer service|customer support|customer care|client advisor)/.test(heading))gaps.push("Contatto continuo con clienti, escluso dalle tue preferenze.");
 if(avoided.includes("backoffice_admin")&&/(administrative|back.office|data entry|invoice entry)/.test(heading))gaps.push("Back-office amministrativo escluso dalle tue preferenze.");
 const blocked=gaps.some((x:string)=>/richiede almeno|qualifiche tecniche|experience_years|escluso dalle tue preferenze/i.test(x));
 const evidence=facts(cv,str(job.role_family||""),description);
 const seen=new Set();
 const unique=evidence.filter(x=>{const k=x.origin+"|"+x.value;if(seen.has(k))return false;seen.add(k);return true}).slice(0,6);
 const company=short(job.companies?.name||"Company",120),role=short(job.canonical_title,150),name=short(profileR.data?.display_name||"Applicant",120);
 const area=focus(str(job.role_family||role));
 const specificDuties=vacancyHighlights(description);
 const selectedDuty=specificDuties[0]||null;
 const relevantEvidence=unique.filter(x=>x.kind!=="tool").slice(0,2);
 const bridge=experienceBridge(cv,selectedDuty);
 const vacancyIsThin=description.length<100;
 const detail=selectedDuty?selectedDuty[1]:null;
 // Never display a concatenation of raw CV bullets as a reason to apply.
 const valueAngle=detail?("L'annuncio prevede "+detail+"."):"";
 const directTarget=list(chosen.target_role_families).some((r:any)=>String(r).toLowerCase()===String(job.role_family).toLowerCase());
 const bridgeText=bridge
   ?" Qui puoi trasformare "+bridge+" in un contributo concreto su attività svolte all'interno di un team."
   :detail?" È utile soltanto se vuoi acquisire esperienza pratica proprio su queste responsabilità.":"";
 const opportunityCost=!blocked&&detail&&!vacancyIsThin
   ?(directTarget
      ?" Scartarla senza approfondire significherebbe non valutare un'esperienza coerente con l'area professionale che hai selezionato."
      :" Valuta se queste attività ti portano più vicino al tuo prossimo obiettivo rispetto alle altre offerte.")
   :"";
 const weakText=description.length<90
   ?"La descrizione disponibile è troppo breve per motivare una candidatura: verifica le attività e i requisiti nell'annuncio ufficiale."
   :"La descrizione non permette di identificare con sicurezza attività specifiche pertinenti: consulta l'annuncio ufficiale prima di darle priorità.";
 const sharpQuestion=selectedDuty
   ?"Quali risultati vi aspettate da chi supporta "+selectedDuty[1]+" durante i primi mesi?"
   :"Quali responsabilità operative e risultati specifici avrà la persona nei primi tre mesi?";
 const valueNarrative=detail?(valueAngle+bridgeText+opportunityCost):weakText;
 const recommended=unique.map(x=>x.origin+": "+x.value);
 const why=blocked?"Non consigliata senza chiarimenti: "+gaps.join(" "):valueNarrative;
 const edu=education[0]||{};
 const body=blocked?null:letter({language,name,role,company,school:short(edu.school,100),program:short(edu.program,100),experience:exp[0],projects,tools:list(cv.tools).map(x=>short(x,100)),areaEn:area[0],areaIt:area[1],highlights:vacancyHighlights(description),interests:list(personalR.data?.interest_areas)});
 const record={user_id:userId,job_id:job.id,recommended_cv_id:chosen.id,why_you:why,why_now:"Controlla i requisiti e conferma che la vacancy sia ancora aperta prima di candidarti.",positioning_angle:selectedDuty?"Punta su "+selectedDuty[1]+(bridge?"; collega "+bridge:""):("Chiarisci le attività reali del ruolo"),cv_reason:"CV scelto in base al ruolo, alle evidenze pertinenti e alle preferenze salvate: "+chosen.name+". Verifica la scelta prima dell'invio.",gaps:[...new Set(gaps)],what_to_emphasize:recommended,contact_route:{type:"official_vacancy",url:job.primary_apply_url||null},ready_to_send_subject:body?(language==="it"?"Candidatura":"Application")+" — "+role+" — "+name:null,ready_to_send_message:body,generated_from:{cv_id:chosen.id,cv_updated_at:chosen.updated_at,cv_source:cv.source||"unknown",language,generated_at:new Date().toISOString(),evidence:recommended,eligibility_blocked:blocked,matching_model:matchR.data?"eligibility_v2":"not_calculated",duty_focus:specificDuties,interview_question:sharpQuestion,opportunity_cost:opportunityCost,comparison_cv_count:cvs.length,cv_selection:"role_and_evidence_v2"},model_version:"evidence_dossier_v5",updated_at:new Date().toISOString()};
 // Refresh relevance without silently destroying a previously edited letter.
 const {data:previous}=await db.from("user_job_dossiers").select("ready_to_send_message,ready_to_send_subject,generated_from").eq("user_id",userId).eq("job_id",job.id).maybeSingle();
 if(previous?.generated_from?.user_edited&&!payload?.force_regenerate){
   record.ready_to_send_message=previous.ready_to_send_message;
   record.ready_to_send_subject=previous.ready_to_send_subject;
   record.generated_from={...record.generated_from,user_edited:true,user_edited_at:previous.generated_from.user_edited_at||null,letter_cv_id:previous.generated_from.cv_id,letter_saved_manually:true};
 }
 const {error:saveError}=await db.from("user_job_dossiers").upsert(record,{onConflict:"user_id,job_id"});
 if(saveError)return reply({error:"Impossibile salvare la preparazione della candidatura.",detail:saveError.message},500);
 return reply({ok:true,blocked,cv_name:chosen.name,job_id:job.id,why_you:why,gaps:record.gaps,letter_created:Boolean(body),language});
});
