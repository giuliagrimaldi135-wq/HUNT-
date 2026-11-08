
import { createClient } from "npm:@supabase/supabase-js@2";

const enc=new TextEncoder();
const DAY=86400000;

async function sha256Hex(v:string){
  const b=await crypto.subtle.digest("SHA-256",enc.encode(v));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function admin(){
  const url=Deno.env.get("SUPABASE_URL")!;
  const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
  let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(raw){try{const p=JSON.parse(raw);key=p.default||Object.values(p)[0]||key}catch{}}
  if(!url||!key)throw new Error("Missing Supabase admin environment");
  return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
}
function roleFamily(title:string){
  const t=title.toLowerCase();
  if(/facilit|store planning|store design|construction|architect|building services|maintenance coordinator|real estate/.test(t)) return "Facilities & Store Development";
  if(/human resources|\bhr\b|talent|people intern|people partner|people manager/.test(t)) return "HR & Talent";
  if(/finance|controll|accounting|legal|treasury|tax/.test(t)) return "Finance & Legal";
  if(/visual merchandis/.test(t)) return "Visual Merchandising";
  if(/supply chain|logistics|warehouse/.test(t)) return "Supply Chain & Logistics";
  if(/production|sourcing|procurement/.test(t)) return "Production & Sourcing";
  if(/planning|allocation|planner|demand planning/.test(t)) return "Planning & Allocation";
  if(/e.?commerce|digital commerce|site merchandising/.test(t)) return "E-commerce & Digital";
  if(/product developer|product development|product manager|product management/.test(t)) return "Product Management & Development";
  if(/\bbuy(er|ing)?\b/.test(t)) return "Buying";
  if(/merchandis/.test(t)) return "Merchandising";
  if(/retail operations|store operations|retail performance|retail excellence/.test(t)) return "Retail & Retail Operations";
  if(/wholesale|commercial|sales operations/.test(t)) return "Wholesale & Commercial";
  if(/crm|clienteling/.test(t)) return "CRM & Clienteling";
  if(/communication|public relations|\bpr\b|event/.test(t)) return "PR, Communications & Events";
  if(/marketing|brand/.test(t)) return "Marketing & Brand";
  if(/design|creative|designer/.test(t)) return "Design & Creative";
  if(/data|analytics|business intelligence/.test(t)) return "Data & Analytics";
  if(/strategy|project manager|project management/.test(t)) return "Strategy & Project Management";
  if(/sustainab/.test(t)) return "Sustainability";
  if(/technology|\bit\b|software developer|engineer/.test(t)) return "Technology";
  return null;
}
function seniority(title:string,desc:string){
  const t=(title+" "+desc.slice(0,1200)).toLowerCase();
  if(/intern|stage|tirocin/.test(title.toLowerCase())) return "internship";
  if(/trainee|graduate/.test(title.toLowerCase())) return "trainee";
  if(/assistant/.test(title.toLowerCase())) return "assistant";
  if(/junior|jr\.?/.test(title.toLowerCase())) return "junior";
  if(/director|head of/.test(title.toLowerCase())) return "head_director";
  if(/senior manager/.test(title.toLowerCase())) return "senior_manager";
  if(/\bmanager\b|\blead\b/.test(title.toLowerCase())) return "manager";
  const y=extractMinYears(desc);
  if(y!==null&&y>=7)return "senior_manager";
  if(y!==null&&y>=5)return "manager";
  if(y!==null&&y>=3)return "mid_level";
  if(y!==null&&y>=2)return "junior";
  return "entry_level";
}
function extractMinYears(desc:string){
  const t=desc.toLowerCase()
    .replace(/\bone\s+year/g,"1 year")
    .replace(/\btwo\s+years/g,"2 years")
    .replace(/\bthree\s+years/g,"3 years")
    .replace(/\bfour\s+years/g,"4 years")
    .replace(/\bfive\s+years/g,"5 years")
    .replace(/\bsix\s+years/g,"6 years")
    .replace(/\bseven\s+years/g,"7 years")
    .replace(/\beight\s+years/g,"8 years")
    .replace(/\bnine\s+years/g,"9 years")
    .replace(/\bten\s+years/g,"10 years");
  const patterns=[
    /minimum(?: of)?\s+(\d{1,2})\s*(?:\+)?\s*years?/,
    /at least\s+(\d{1,2})\s*(?:\+)?\s*years?/,
    /(\d{1,2})\s*[-–]\s*\d{1,2}\s*years?\s+of\s+(?:relevant\s+)?experience/,
    /(\d{1,2})\s*\+\s*years?\s+of\s+(?:relevant\s+)?experience/,
    /(\d{1,2})\s+years?\s+of\s+(?:relevant\s+)?experience/
  ];
  for(const p of patterns){const m=t.match(p);if(m)return Number(m[1])}
  return null;
}
function requiredLanguages(desc:string){
  const t=desc.toLowerCase();
  const langs:string[]=[];
  for(const lang of ["italian","english","french","german","spanish"]){
    const re=new RegExp("(fluent|fluency|business fluent|professional proficiency|native).{0,25}"+lang+"|"+lang+".{0,25}(required|mandatory|fluent)");
    if(re.test(t))langs.push(lang);
  }
  return langs;
}
function specialistSignals(desc:string,title:string){
  const t=(title+" "+desc).toLowerCase();
  const signals:string[]=[];
  if(/autocad|dwg|mep|technical drawings|building services/.test(t))signals.push("facilities_technical");
  if(/pattern making|garment construction|fitting|leatherwear|tailoring/.test(t))signals.push("product_technical");
  if(/after effects|photoshop|illustrator|indesign|motion design/.test(t))signals.push("creative_technical");
  return signals;
}
function experienceCapacity(profileSeniority:string,parsed:any){
  const y=Number(parsed?.relevant_years_experience ?? parsed?.years_experience);
  if(Number.isFinite(y)&&y>=0)return y;
  const map:Record<string,number>={internship:.5,trainee:.5,entry_level:1,assistant:1.5,junior:2,associate:3,coordinator_specialist:3,mid_level:5,manager:6,senior_manager:9,head_director:12};
  return map[profileSeniority]??1;
}
function adjacency(primary:string[],family:string|null){
  if(!family)return false;
  const map:Record<string,string[]>={
    "Merchandising":["Buying","Planning & Allocation","E-commerce & Digital","Visual Merchandising","Retail & Retail Operations","Product Management & Development"],
    "Buying":["Merchandising","Planning & Allocation","E-commerce & Digital","Wholesale & Commercial"],
    "Planning & Allocation":["Merchandising","Buying","E-commerce & Digital","Retail & Retail Operations","Supply Chain & Logistics"],
    "Retail & Retail Operations":["Merchandising","Planning & Allocation","CRM & Clienteling","Visual Merchandising"],
    "E-commerce & Digital":["Merchandising","Buying","Planning & Allocation","Data & Analytics","Marketing & Brand"],
    "Product Management & Development":["Merchandising","Production & Sourcing","Design & Creative"],
    "Production & Sourcing":["Product Management & Development","Supply Chain & Logistics"],
    "Supply Chain & Logistics":["Production & Sourcing","Planning & Allocation"],
    "Wholesale & Commercial":["Buying","Merchandising","Retail & Retail Operations"]
  };
  return primary.some(p=>(map[p]||[]).includes(family));
}
function locationHit(city:string|null,arr:any[]){
  if(!city)return false;const c=city.toLowerCase();
  return (arr||[]).some(x=>{const a=String(x).toLowerCase();return c.includes(a)||a.includes(c)});
}
function roleEvidence(desc:string,title:string,family:string|null,personal:any){
  const t=(title+" "+desc).toLowerCase();
  const interests=new Set(personal?.interest_areas||[]);
  const out:string[]=[];
  if(family==="Merchandising"){
    if(interests.has("product_assortment")&&/assort|collection|product mix|range|category|merchandis/.test(t))out.push("merch_product");
    if(interests.has("numbers_performance")&&/sales|performance|sell-in|sell-out|best seller|slow mover|kpi|report|analysis|stock/.test(t))out.push("merch_performance");
  }
  if(family==="Planning & Allocation"){
    if(/forecast|demand|budget|stock|inventory|allocation|sales plan|financial plan/.test(t))out.push("planning_core");
    if(interests.has("numbers_performance")&&/analysis|performance|sales|kpi|forecast|budget/.test(t))out.push("planning_numbers");
  }
  if(family==="Buying"){
    if(/buying|vendor|supplier|order|assort|otb|open to buy|budget/.test(t))out.push("buying_core");
    if(interests.has("product_assortment")&&/product|assort|collection|category/.test(t))out.push("buying_product");
  }
  if(family==="Supply Chain & Logistics"){
    if(/logistics|shipment|shipping|distribution|warehouse|inventory|supply chain|delivery|order flow/.test(t))out.push("supply_core");
    if(interests.has("organization_operations")&&/coordin|planning|process|flow|operations/.test(t))out.push("supply_ops");
  }
  if(family==="Retail & Retail Operations"){
    if(/store operations|retail operations|process|procedure|store network|boutique|outlet/.test(t))out.push("retail_ops_core");
    if(interests.has("numbers_performance")&&/report|scorecard|performance|kpi|sales|stock/.test(t))out.push("retail_ops_numbers");
  }
  if(family==="E-commerce & Digital"){
    if(/e-commerce|ecommerce|site merchandising|pdp|plp|conversion|digital sales|online/.test(t))out.push("ecom_core");
    if(interests.has("numbers_performance")&&/performance|conversion|analytics|kpi|sales/.test(t))out.push("ecom_numbers");
  }
  if(family==="Product Management & Development"){
    if(/product development|sample|prototype|materials|fitting|technical specification/.test(t))out.push("product_dev_core");
  }
  return [...new Set(out)];
}

function flattenProfileText(cv:any){
  const chunks:string[]=[];
  for(const e of cv?.experience||[]){
    chunks.push(String(e.role||""),String(e.company||""));
    for(const x of e.evidence||[])chunks.push(String(x));
  }
  for(const p of cv?.projects||[]){
    chunks.push(String(p.name||""));
    for(const x of p.evidence||[])chunks.push(String(x));
  }
  for(const x of cv?.tools||[])chunks.push(String(x));
  return chunks.join(" ").toLowerCase();
}
function profileEvidence(cv:any,family:string|null){
  if(!cv||typeof cv!=="object")return [];
  const t=flattenProfileText(cv);
  const out:string[]=[];
  if(family==="Merchandising"){
    if(/merchandising mix|assortment|assortimento|capsule planning/.test(t))out.push("Nel tuo profilo ci sono già progetti su merchandising mix, assortimento e pianificazione di collezione");
    if(/costing|pricing|product coding|codifica/.test(t))out.push("Hai già lavorato su costing, codifica prodotto o logiche di pricing in progetti accademici");
  }
  if(family==="Buying"){
    if(/buying logic|buying|budget|assortment|assortimento/.test(t))out.push("Nel tuo percorso hai già affrontato logiche di buying, assortimento e budget");
  }
  if(family==="Planning & Allocation"){
    if(/planning|distribution|budget|kpi|stock|order|ordini/.test(t))out.push("Hai già lavorato su pianificazione, budget, KPI e flussi che collegano ordini e distribuzione");
  }
  if(family==="Retail & Retail Operations"){
    if(/showroom|order|ordini|client|retail/.test(t))out.push("Hai già visto da vicino processi commerciali e operativi durante una campagna vendite in showroom");
    if(/kpi|excel|budget|planning/.test(t))out.push("Hai una base analitica su Excel, KPI e pianificazione costruita attraverso i progetti");
  }
  if(family==="Supply Chain & Logistics"){
    if(/distribution|order|ordini|logistics|logistica|planning/.test(t))out.push("Hai già lavorato, almeno a livello di progetto e supporto operativo, sul collegamento tra ordini, pianificazione e distribuzione");
  }
  if(family==="E-commerce & Digital"){
    if(/e-commerce|ecommerce|excel|kpi|performance/.test(t))out.push("Il tuo profilo contiene già elementi di analisi dati e performance utili per un contesto e-commerce");
  }
  if(family==="Product Management & Development"){
    if(/product coding|costing|capsule|product development|sviluppo prodotto/.test(t))out.push("Nei tuoi progetti hai già lavorato su sviluppo di capsule, costing e struttura del prodotto");
  }
  return [...new Set(out)].slice(0,2);
}

Deno.serve(async(req)=>{
  const db=admin();
  const supplied=req.headers.get("x-hunt-cron")||"";
  const {data:secret}=await db.from("internal_runtime_secrets").select("secret_hash").eq("name","hunt_cron_token").single();
  if(!secret||!supplied||!safeEqual(await sha256Hex(supplied),secret.secret_hash))return new Response('{"error":"unauthorized"}',{status:401});

  const cutoffDate=new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate()-20);
  cutoffDate.setUTCHours(0,0,0,0);
  const cutoff=cutoffDate.toISOString();
  const [{data:jobs},{data:prefs},{data:profiles},{data:personal},{data:cvs}]=await Promise.all([
    db.from("jobs").select("id,canonical_title,role_family,seniority,employment_type,city,remote_mode,description,published_at,vacancy_confidence,state,metadata").gte("published_at",cutoff).in("state",["active_verified","active_likely"]),
    db.from("career_preferences").select("user_id,primary_role_families,preferred_locations,relocation_locations,employment_types,preferences"),
    db.from("profiles").select("user_id,seniority").eq("onboarding_completed",true),
    db.from("user_personalization").select("user_id,interest_areas,avoid_role_traits"),
    db.from("user_cvs").select("user_id,parsed_profile,is_default,active,target_role_families,updated_at").eq("active",true)
  ]);
  const profileMap=new Map((profiles||[]).map((x:any)=>[x.user_id,x]));
  const personalMap=new Map((personal||[]).map((x:any)=>[x.user_id,x]));
  // Keep every CV version. Different vacancies can require different evidence.
  const cvMap=new Map<string,any[]>();
  for(const cv of cvs||[]){
    if(!cvMap.has(cv.user_id))cvMap.set(cv.user_id,[]);
    cvMap.get(cv.user_id)!.push(cv);
  }
  const chooseForFamily=(userId:string,family:string,desc:string)=>{
    const versions=cvMap.get(userId)||[];
    if(!versions.length)return {};
    const common=new Set((family+" "+desc.slice(0,1600)).toLowerCase().match(/[a-z]{5,}/g)||[]);
    const rated=versions.map((v:any)=>{
      const p=v.parsed_profile||{},target=Array.isArray(v.target_role_families)?v.target_role_families:[];
      const evidence=[...(p.experience||[]).flatMap((x:any)=>x.evidence||[]),...(p.projects||[]).flatMap((x:any)=>x.evidence||[]),...(p.tools||[])].join(" ").toLowerCase();
      const words=new Set(evidence.match(/[a-z]{5,}/g)||[]);
      let overlap=0;for(const t of common){if(words.has(t))overlap++}
      const score=(target.includes(family)?70:0)+Math.min(25,overlap*3)+(v.is_default?4:0)+((p.profile_confirmed_by_user||p.profile_verified_from_user_history)?12:0)+((p.experience?.length||p.projects?.length)?8:0);
      return {score,p};
    }).sort((a:any,b:any)=>b.score-a.score);
    return rated[0]?.p||{};
  };

  let considered=0,matched=0,rejected=0;
  for(const job of jobs||[]){
    const desc=String(job.description||"");
    const family=roleFamily(job.canonical_title)||job.role_family;
    const minYears=extractMinYears(desc);
    const jobSeniority=seniority(job.canonical_title,desc);
    const languages=requiredLanguages(desc);
    const specialist=specialistSignals(desc,job.canonical_title);
    await db.from("jobs").update({
      role_family:family,
      seniority:jobSeniority,
      metadata:{
        ...(job.metadata||{}),
        hard_requirements:{
          min_years_experience:minYears,
          required_languages:languages,
          specialist_signals:specialist,
          analyzed_at:new Date().toISOString(),
          analyzer_version:"eligibility-v2"
        }
      },
      updated_at:new Date().toISOString()
    }).eq("id",job.id);

    for(const pref of prefs||[]){
      considered++;
      const profile=profileMap.get(pref.user_id) as any;
      const pers=personalMap.get(pref.user_id) as any;
      const cv=chooseForFamily(pref.user_id,family,desc);
      const primary=pref.primary_role_families||[];
      const radar=String(pref.preferences?.radar_scope||"smart");
      const direct=Boolean(family&&primary.includes(family));
      const adjacent=adjacency(primary,family);
      const preferredHit=locationHit(job.city,pref.preferred_locations||[]);
      const relocationHit=locationHit(job.city,pref.relocation_locations||[]);
      const capacity=experienceCapacity(profile?.seniority||"entry_level",cv);
      const hardReasons:string[]=[];

      if(job.remote_mode!=="remote"&&(pref.preferred_locations||[]).length+(pref.relocation_locations||[]).length>0&&!preferredHit&&!relocationHit)hardReasons.push("location");
      const cvParsed=Boolean(cv?.profile_confirmed_by_user||cv?.profile_verified_from_user_history||cv?.experience?.length||cv?.projects?.length);
      const earlyCareer=["internship","trainee","entry_level","assistant","junior"].includes(profile?.seniority||"entry_level");
      if(minYears!==null&&minYears>capacity+0.25)hardReasons.push("experience_years");
      if(minYears!==null&&minYears>0&&earlyCareer&&!cvParsed)hardReasons.push("experience_unverified_until_cv");
      if(["manager","senior_manager","head_director"].includes(jobSeniority)&&earlyCareer)hardReasons.push("seniority");
      if(radar==="focused"&&!direct)hardReasons.push("outside_focused_target");
      if(radar==="smart"&&!direct&&!adjacent)hardReasons.push("outside_smart_adjacency");
      if(!family)hardReasons.push("unclassified_role");

      const avoid=pers?.avoid_role_traits||[];
      const lower=job.canonical_title.toLowerCase();
      if(avoid.includes("store_sales")&&/(sales assistant|style advisor|client advisor|sales associate)/.test(lower))hardReasons.push("excluded_store_sales");
      if(avoid.includes("technical_it")&&family==="Technology")hardReasons.push("excluded_technology");
      if(avoid.includes("constant_customer_contact")&&/(customer service|customer care|customer support|client advisor|sales advisor)/.test(lower))hardReasons.push("excluded_constant_customer_contact");
      if(avoid.includes("backoffice_admin")&&/(back.office|administrative assistant|data entry|invoice entry|invoice processing)/.test(lower))hardReasons.push("excluded_backoffice_admin");
      if(avoid.includes("pure_commercial")&&/(sales representative|business development|account executive|area sales manager|field sales)/.test(lower))hardReasons.push("excluded_pure_commercial");

      if(hardReasons.length){
        await db.from("user_job_matches").delete().eq("user_id",pref.user_id).eq("job_id",job.id);
        rejected++;continue;
      }

      let score=25;
      const reasons:string[]=[];
      const gaps:string[]=[];
      if(direct){score+=42;reasons.push("Target professionale diretto: "+family)}
      else if(adjacent){score+=20;reasons.push("Ruolo adiacente ai tuoi target, con contenuti professionali collegati")}
      const signals=roleEvidence(desc,job.canonical_title,family,pers);
      score+=Math.min(15,signals.length*5);
      if(signals.includes("merch_product"))reasons.push("Il lavoro riguarda direttamente assortimento, collezione o mix prodotto")
      if(signals.includes("merch_performance"))reasons.push("Il ruolo usa vendite, performance, stock o analisi per guidare decisioni di merchandising")
      if(signals.includes("planning_core"))reasons.push("Le attività includono forecast, budget, stock, inventory o allocation")
      if(signals.includes("planning_numbers"))reasons.push("La componente quantitativa è centrale: analisi, performance e pianificazione")
      if(signals.includes("buying_core"))reasons.push("Il ruolo lavora su buying, ordini, budget o relazione con fornitori")
      if(signals.includes("buying_product"))reasons.push("La selezione e costruzione dell'assortimento prodotto è parte del lavoro")
      if(signals.includes("supply_core"))reasons.push("Le responsabilità riguardano flussi logistici, distribuzione, stock o consegne")
      if(signals.includes("supply_ops"))reasons.push("Il ruolo richiede coordinamento operativo dei flussi e dei processi")
      if(signals.includes("retail_ops_core"))reasons.push("Il lavoro è focalizzato su processi e operatività della rete retail")
      if(signals.includes("retail_ops_numbers"))reasons.push("Il ruolo usa report, KPI e performance per migliorare le operazioni retail")
      if(signals.includes("ecom_core"))reasons.push("Le attività sono direttamente legate a e-commerce e merchandising digitale")
      if(signals.includes("ecom_numbers"))reasons.push("La posizione misura performance e conversione del canale digitale")
      if(signals.includes("product_dev_core"))reasons.push("Il ruolo include attività concrete di sviluppo prodotto, campioni o materiali")
      const cvReasons=profileEvidence(cv,family);
      if(cvReasons.length){
        score+=Math.min(10,cvReasons.length*5);
        reasons.push(...cvReasons);
      }
      if(preferredHit||relocationHit)score+=5;
      if(minYears!==null&&minYears>capacity)gaps.push("Richiede almeno "+minYears+" anni di esperienza; il profilo attuale è vicino alla soglia e va verificato sul CV")
      if(specialist.length&&Object.keys(cv||{}).length===0)gaps.push("La vacancy richiede competenze specialistiche che HUNT verificherà sul CV prima di consigliarla con alta confidenza")
      score=Math.max(0,Math.min(100,score));

      const age=Math.max(0,Math.floor((Date.now()-new Date(job.published_at).getTime())/DAY));
      const fresh=Math.max(20,100-age*4);
      const priority=Math.min(100,Math.round(score*.7+(job.vacancy_confidence||70)*.2+fresh*.1));
      const minScore=radar==="explore"?60:radar==="focused"?72:68;
      if(score<minScore){
        await db.from("user_job_matches").delete().eq("user_id",pref.user_id).eq("job_id",job.id);
        rejected++;continue;
      }
      await db.from("user_job_matches").upsert({
        user_id:pref.user_id,job_id:job.id,match_score:score,priority_score:priority,reasons,gaps,
        model_version:"eligibility-v2",calculated_at:new Date().toISOString()
      },{onConflict:"user_id,job_id"});
      matched++;
    }
  }
  return new Response(JSON.stringify({ok:true,considered,matched,rejected}),{headers:{"content-type":"application/json"}});
});
