import Link from "next/link";
import { notFound } from "next/navigation";
import FolderTabs from "@/components/FolderTabs";
import { getOpportunity } from "@/lib/data/opportunities";
import { createClient } from "@/lib/supabase/server";
import { ignoreOpportunity, markApplied, prepareApplication } from "../actions";

function strArray(value:unknown):string[]{
  return Array.isArray(value) ? value.map(String) : [];
}

function interestPhrase(value:unknown){
  const map:Record<string,string>={
    product_assortment:"prodotto e assortimento",
    numbers_performance:"numeri, KPI e performance",
    retail_market:"clienti, negozi e mercato",
    product_development:"sviluppo prodotto",
    commercial_relationships:"commerciale e relazioni",
    organization_operations:"organizzazione e processi",
    brand_communication:"brand e comunicazione",
    creative:"creatività e contenuti",
  };
  return strArray(value).map(x=>map[x]).filter(Boolean).slice(0,3);
}

function ageLabel(value?:string){
  if(!value)return "Data non verificata";
  const days=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/86400000));
  if(days===0)return "Pubblicata oggi";
  if(days===1)return "Pubblicata ieri";
  return `Pubblicata ${days} giorni fa`;
}

function verificationLabel(source:string,lastVerified?:string){
  if(source==="VERIFIED ACTIVE"){
    if(!lastVerified)return "Annuncio verificato";
    const d=new Date(lastVerified);
    return d.toDateString()===new Date().toDateString()
      ? "Verificato oggi"
      : "Verificato "+d.toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
  }
  return "Attività da riconfermare";
}

export default async function OpportunityFolder({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const job=await getOpportunity(id);
  if(!job) notFound();

  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;

  const [
    {data:personalization},
    {data:cvs},
    {data:reposts},
    {data:signals},
    {data:sameJobs},
  ]=userId ? await Promise.all([
    supabase.from("user_personalization").select("interest_areas,next_experience_drivers").eq("user_id",userId).maybeSingle(),
    supabase.from("user_cvs").select("id,name,target_role_families,is_default,created_at").eq("user_id",userId).eq("active",true).order("created_at",{ascending:false}),
    supabase.from("repost_events").select("id,detected_at,reason,evidence").eq("job_id",id).order("detected_at",{ascending:false}),
    job.companyId
      ? supabase.from("company_signals").select("id,title,summary,source_name,source_url,published_at,relevance_score").eq("company_id",job.companyId).order("relevance_score",{ascending:false}).limit(5)
      : Promise.resolve({data:[] as any[]}),
    job.companyId
      ? supabase.from("jobs").select("id,canonical_title,city,published_at").eq("company_id",job.companyId).neq("id",id).gte("published_at",new Date(Date.now()-20*86400000).toISOString()).order("published_at",{ascending:false}).limit(5)
      : Promise.resolve({data:[] as any[]}),
  ]) : [
    {data:null},{data:[]},{data:[]},{data:[]},{data:[]}
  ];

  const interests=interestPhrase(personalization?.interest_areas);
  const reasons=job.reasons||[];
  const whyPieces:string[]=[];
  if(interests.length)whyPieces.push("incrocia aspetti che hai indicato come importanti per te: "+interests.join(", "));
  if(reasons.some(x=>/città|milano/i.test(x)))whyPieces.push("è in una delle città che hai scelto");
  if(reasons.some(x=>/livello/i.test(x)))whyPieces.push("il livello è coerente con la fase in cui sei");
  if(!whyPieces.length&&job.why)whyPieces.push(job.why.toLowerCase());
  const personalizedWhy=`Questa opportunità merita attenzione perché ${whyPieces.join("; ")}. Il ruolo rientra nell'area ${job.role} e HUNT la considera una candidatura coerente con il tuo profilo attuale.`;

  const cvList=(cvs||[]) as any[];
  const cv=cvList.find(x=>strArray(x.target_role_families).includes(job.role))
    ||cvList.find(x=>x.is_default)
    ||cvList[0];

  const repostCount=(reposts||[]).length;
  const repostText=repostCount
    ? `HUNT ha rilevato ${repostCount} ripubblicazione${repostCount===1?"":"i"}. La prima data resta quella originale: un repost non viene trattato automaticamente come una nuova vacancy.`
    : "Nessuna ripubblicazione rilevata finora. HUNT continua a monitorare l’annuncio e, se ricompare, distingue un repost da una vacancy realmente nuova.";

  const questions=[
    `Perché ${job.brand} e perché questo ruolo?`,
    /Merchandising|Planning|Buying|E-commerce/.test(job.role)
      ? "Raccontami una situazione in cui hai usato dati, KPI o insight sul prodotto per prendere una decisione."
      : "Quale tua esperienza o progetto ti prepara meglio a questo ruolo?",
    "Cosa vorresti imparare nei primi mesi e come pensi di poter contribuire?",
  ];

  const signalRows=((signals||[]) as any[]).map(x=>({
    id:String(x.id),
    title:String(x.title||""),
    summary:String(x.summary||""),
    sourceName:x.source_name ? String(x.source_name) : undefined,
    sourceUrl:x.source_url ? String(x.source_url) : undefined,
  }));

  const relatedRows=((sameJobs||[]) as any[]).map(x=>({
    id:String(x.id),
    title:String(x.canonical_title),
    city:x.city ? String(x.city) : undefined,
    age:ageLabel(x.published_at ? String(x.published_at) : undefined),
  }));

  return (
    <>
      <div className="folderTopbar">
        <Link className="textBack" href="/opportunities">← Torna alle opportunità</Link>
      </div>

      <div className="folderHero">
        <div className="eyebrow">{job.brand}</div>
        <h1>{job.title}</h1>
        <p className="lead">{job.location} · {job.role}</p>
        <div className="heroMeta">
          <span className="heroMatch">{job.match}% compatibile con te</span>
          <span>{job.freshness}</span>
          <span>{verificationLabel(job.source,job.lastVerifiedAt)}</span>
        </div>
        <div className="actions">
          <form action={prepareApplication}><input type="hidden" name="job_id" value={job.id}/><button className="btn green">Prepara candidatura</button></form>
          <form action={markApplied}><input type="hidden" name="job_id" value={job.id}/><button className="btn darkSecondary">Già candidata</button></form>
          {job.applyUrl ? <a className="btn darkSecondary" href={job.applyUrl} target="_blank" rel="noreferrer">Sito del brand ↗</a> : null}
          <form action={ignoreOpportunity}><input type="hidden" name="job_id" value={job.id}/><button className="btn darkGhost">Ignora</button></form>
        </div>
      </div>

      <FolderTabs
        brand={job.brand}
        personalizedWhy={personalizedWhy}
        gaps={job.gaps||[]}
        cvName={cv?.name ? String(cv.name).trim() : undefined}
        repostText={repostText}
        verificationLabel={verificationLabel(job.source,job.lastVerifiedAt)}
        freshness={job.freshness}
        lastVerified={job.lastVerifiedAt ? new Date(job.lastVerifiedAt).toLocaleString("it-IT") : "—"}
        signals={signalRows}
        questions={questions}
        relatedJobs={relatedRows}
      />
    </>
  );
}
