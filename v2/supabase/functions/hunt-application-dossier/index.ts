
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
 const out:[string,string][]=[];
 const rules:[RegExp,string,string][]=[
  [/assortment|assortimento|product mix|range planning/i,"assortment planning","pianificazione dell'assortimento"],
  [/sales reporting|sales analysis|kpi|sell.through|performance report/i,"sales and KPI analysis","analisi vendite e KPI"],
  [/stock allocation|allocation|inventory allocation/i,"allocation and stock decisions","allocazione e gestione stock"],
  [/buying|open.to.buy|supplier|vendor/i,"buying decisions","decisioni di acquisto"],
  [/showroom|wholesale|order management|sales campaign/i,"wholesale and order processes","processi wholesale e gestione ordini"],
  [/ecommerce|e-commerce|online|digital merchandising/i,"digital product performance","performance del prodotto online"],
  [/store operations|retail operations|store network/i,"retail operations","operazioni della rete retail"],
  [/forecast|demand planning|budget planning/i,"planning and forecasting","pianificazione e previsioni"]
 ];
 for(const [re,en,it] of rules){if(re.test(text))out.push([en,it])}
 return out.slice(0,2);
}

function letter(args:any){
 const {language,company,role,name}=args;
 const it=language==="it",exp=args.experience,projects=list(args.projects),school=str(args.school),program=str(args.program);
 const focusEn=str(args.areaEn),focusIt=str(args.areaIt);
 const duties=list(args.highlights).slice(0,2),allFacts=list(exp?.evidence).map(clause).filter(Boolean);
 const relevantFacts=allFacts.slice(0,2);
 const project=projects.find((x:any)=>list(x.evidence).length>0);
 const projectFact=project?clause(list(project.evidence)[0]):"";
 const tool=list(args.tools).map((x:any)=>str(x)).filter(Boolean)[0]||"";
 const selection=it?duties.map((x:any)=>x[1]):duties.map((x:any)=>x[0]);
 const skillArea=it?focusIt:focusEn;
 const mention=(it?"specialmente per le attività di ":"particularly its work involving ")+(selection.length?connect(selection,it?"it":"en"):skillArea);
 if(it){
  const first="Gentile team Recruiting di "+company+",\n\nla posizione di "+role+" mi interessa "+mention+". È un ambito in cui desidero crescere mettendo a frutto esperienze concrete e una forte attenzione al prodotto e ai processi.";
  const experience=exp&&relevantFacts.length?"Durante l'esperienza presso "+str(exp.company)+", ho lavorato su "+connect(relevantFacts,"it")+".":"";
  const academic=project&&projectFact?"Nel progetto "+str(project.name)+" ho inoltre approfondito "+projectFact+".":"";
  const education=school&&program?"La formazione in "+program+" presso "+school+" mi ha dato una base per comprendere il settore.":"";
  const toolLine=tool?" Ho lavorato anche con "+tool+".":"";
  const connection="Questo percorso mi ha insegnato quanto sia importante non perdere precisione nei passaggi tra prodotto, dati e attività operative: è un'attenzione che vorrei portare nel vostro team, continuando a imparare sul campo.";
  return [first,[experience,academic,education].filter(Boolean).join(" ")+toolLine,connection,"Sarei felice di approfondire in un colloquio il contributo che potrei offrire alla squadra.\n\nCordiali saluti,\n"+name].filter(Boolean).join("\n\n");
 }
 const first="Dear "+company+" Hiring Team,\n\nThe "+role+" opportunity stands out to me for "+mention+". I am interested in building my career in "+skillArea+", where careful product and operational decisions matter.";
 const experience=exp&&relevantFacts.length?"At "+str(exp.company)+", I gained hands-on experience with "+connect(relevantFacts)+".":"";
 const academic=project&&projectFact?"In my "+str(project.name)+" project, I also explored "+projectFact+".":"";
 const education=school&&program?"My "+program+" studies at "+school+" helped me understand the wider industry context.":"";
 const toolLine=tool?" I have also worked with "+tool+".":"";
 const connection="I know that small details can be missed when information moves between product, commercial and operational teams. I would bring a careful approach, curiosity and the willingness to learn, helping support the decisions behind the work rather than simply repeating what is already in my CV.";
 return [first,[experience,academic,education].filter(Boolean).join(" ")+toolLine,connection,"I would welcome the opportunity to discuss how I could contribute to your team.\n\nKind regards,\n"+name].filter(Boolean).join("\n\n");
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
 chosen=chosen||[...cvs].sort((a,b)=>rankCv(b)-rankCv(a))[0];
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
 const valueAngle=selectedDuty
   ? "Questa posizione riguarda "+selectedDuty[1]+"."
   : "Controlla le attività concrete riportate nell'annuncio originale prima di decidere.";
 const relevantEvidence=unique.filter(x=>x.kind!=="tool").slice(0,2);
 const proofLine=relevantEvidence.map(x=>x.origin+" ("+x.value+")").join("; ");
 const opportunityCost=!blocked&&selectedDuty
   ? "Se vuoi sviluppare esperienza in "+selectedDuty[1]+", questa posizione può meritare priorità rispetto a ruoli meno vicini al tuo obiettivo."
   : "";
 const sharpQuestion=selectedDuty?
   "Quali indicatori utilizzate per valutare il successo delle attività di "+selectedDuty[1]+" nei primi mesi?"
   :"Quali sarebbero le due responsabilità più importanti nei primi tre mesi?";
 const valueNarrative=[valueAngle,proofLine?"Il punto da dimostrare è il collegamento con "+proofLine+".":"",opportunityCost].filter(Boolean).join(" ");
 const recommended=unique.map(x=>x.origin+": "+x.value);
 const why=blocked?"Non consigliata senza chiarimenti: "+gaps.join(" "):valueNarrative;
 const edu=education[0]||{};
 const body=blocked?null:letter({language,name,role,company,school:short(edu.school,100),program:short(edu.program,100),experience:exp[0],projects,tools:list(cv.tools).map(x=>short(x,100)),areaEn:area[0],areaIt:area[1],highlights:vacancyHighlights(description),interests:list(personalR.data?.interest_areas)});
 const record={user_id:userId,job_id:job.id,recommended_cv_id:chosen.id,why_you:why,why_now:"Controlla i requisiti e conferma che la vacancy sia ancora aperta prima di candidarti.",positioning_angle:selectedDuty?selectedDuty[1]+" × "+(relevantEvidence[0]?.origin||"CV da approfondire"):str(job.role_family||role),cv_reason:"CV scelto in base al ruolo, alle evidenze pertinenti e alle preferenze salvate: "+chosen.name+". Verifica la scelta prima dell'invio.",gaps:[...new Set(gaps)],what_to_emphasize:recommended,contact_route:{type:"official_vacancy",url:job.primary_apply_url||null},ready_to_send_subject:body?(language==="it"?"Candidatura":"Application")+" — "+role+" — "+name:null,ready_to_send_message:body,generated_from:{cv_id:chosen.id,cv_updated_at:chosen.updated_at,cv_source:cv.source||"unknown",language,generated_at:new Date().toISOString(),evidence:recommended,eligibility_blocked:blocked,matching_model:matchR.data?"eligibility_v2":"not_calculated",duty_focus:specificDuties,interview_question:sharpQuestion,opportunity_cost:opportunityCost,comparison_cv_count:cvs.length,cv_selection:"role_and_evidence_v2"},model_version:"evidence_dossier_v3",updated_at:new Date().toISOString()};
 const {error:saveError}=await db.from("user_job_dossiers").upsert(record,{onConflict:"user_id,job_id"});
 if(saveError)return reply({error:"Impossibile salvare la preparazione della candidatura.",detail:saveError.message},500);
 return reply({ok:true,blocked,cv_name:chosen.name,job_id:job.id,why_you:why,gaps:record.gaps,letter_created:Boolean(body),language});
});
