import Link from "next/link";
import { notFound } from "next/navigation";
import FolderTabs from "@/components/FolderTabs";
import { getOpportunity } from "@/lib/data/opportunities";
import { createClient } from "@/lib/supabase/server";
import { ignoreOpportunity, markApplied } from "../actions";

function strArray(value:unknown):string[]{ return Array.isArray(value) ? value.map(String) : []; }

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
  return "Da riconfermare";
}

function fitEvidence(job:any, personalization:any, reasons:string[]){
  const interests=new Set(strArray(personalization?.interest_areas));
  const desc=String(job.description||"").toLowerCase();
  const title=String(job.title||"").toLowerCase();
  const out:string[]=[];
  if(interests.has("product_assortment")&&/merchandis|assort|collection|product|shoe|jewelry|ready-to-wear/.test(desc+" "+title)){
    out.push("Hai indicato prodotto e assortimento tra le parti del lavoro che ti interessano di più, e questa posizione lavora direttamente su prodotto e merchandising.");
  }
  if(interests.has("numbers_performance")&&/sales|performance|sell-in|sell-out|best seller|slow mover|kpi|report|analysis|analisi/.test(desc)){
    out.push("Nel ruolo c’è una componente concreta di analisi delle performance, in linea con il tuo interesse per numeri e KPI.");
  }
  if(interests.has("organization_operations")&&/planning|coordin|process|launch|calendar|budget|stock|inventory/.test(desc)){
    out.push("La posizione include coordinamento e organizzazione operativa, un’altra area che hai indicato come interessante.");
  }
  if(reasons.some(x=>/città|milano/i.test(x)))out.push("È in una delle città che hai scelto per la ricerca.");
  if(reasons.some(x=>/livello|stage|intern/i.test(x)))out.push("Il livello della posizione è coerente con quello che stai cercando adesso.");
  if(!out.length)out.push(...reasons.slice(0,3));
  return out.slice(0,4);
}

export default async function OpportunityFolder({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const job=await getOpportunity(id);
  if(!job) notFound();

  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) notFound();

  const [
    {data:personalization},
    {data:cvs},
    {data:reposts},
    {data:signals},
    {data:application},
  ]=await Promise.all([
    supabase.from("user_personalization").select("interest_areas,next_experience_drivers").eq("user_id",userId).maybeSingle(),
    supabase.from("user_cvs").select("id,name,target_role_families,parsed_profile,is_default,created_at").eq("user_id",userId).eq("active",true).order("created_at",{ascending:false}),
    supabase.from("repost_events").select("id,detected_at,reason,evidence").eq("job_id",id).order("detected_at",{ascending:false}),
    job.companyId
      ? supabase.from("company_signals").select("id,signal_type,title,summary,source_name,source_url,published_at,relevance_score").eq("company_id",job.companyId).order("relevance_score",{ascending:false}).limit(8)
      : Promise.resolve({data:[] as any[]}),
    supabase.from("applications").select("status").eq("user_id",userId).eq("job_id",id).maybeSingle(),
  ]);

  let relatedRows:any[]=[];
  if(job.companyId){
    const {data:relatedMatches}=await supabase
      .from("user_job_matches")
      .select("match_score,priority_score,jobs!inner(id,company_id,canonical_title,city,published_at)")
      .eq("user_id",userId)
      .eq("jobs.company_id",job.companyId)
      .neq("job_id",id)
      .gte("match_score",70)
      .order("priority_score",{ascending:false})
      .limit(5);
    const cutoff=new Date(Date.now()-20*86400000);
    relatedRows=(relatedMatches||[])
      .map((row:any)=>({
        id:String(row.jobs.id),
        title:String(row.jobs.canonical_title),
        city:row.jobs.city ? String(row.jobs.city) : undefined,
        age:ageLabel(row.jobs.published_at ? String(row.jobs.published_at) : undefined),
        match:Number(row.match_score||0),
        publishedAt:row.jobs.published_at,
      }))
      .filter((row:any)=>row.publishedAt&&new Date(row.publishedAt)>=cutoff);
  }

  const cvList=(cvs||[]) as any[];
  const cv=cvList.find(x=>strArray(x.target_role_families).includes(job.role))
    ||cvList.find(x=>x.is_default)
    ||cvList[0];
  const cvReady=cvList.some(x=>x.parsed_profile&&typeof x.parsed_profile==="object"&&Object.keys(x.parsed_profile).length>0);

  const repostCount=(reposts||[]).length;
  const firstDate=job.publishedAt ? new Date(job.publishedAt).toLocaleDateString("it-IT") : "—";
  const repostText=repostCount
    ? `Questa posizione è ricomparsa ${repostCount} volt${repostCount===1?"a":"e"} dopo la prima pubblicazione. HUNT continua a considerare come riferimento la data originale (${firstDate}), così una ripubblicazione non viene presentata come una nuova opportunità.`
    : "HUNT memorizza la prima data in cui trova ogni annuncio. Se lo stesso brand lo ripubblica tra qualche giorno o settimana, non te lo mostrerà come “nuovo”: vedrai la data originale e l’eventuale ripubblicazione. Per questa posizione non sono ancora state rilevate ripubblicazioni.";

  const signalRows=((signals||[]) as any[]).map(x=>({
    id:String(x.id),
    type:x.signal_type ? String(x.signal_type) : undefined,
    title:String(x.title||""),
    summary:String(x.summary||""),
    sourceName:x.source_name ? String(x.source_name) : undefined,
    sourceUrl:x.source_url ? String(x.source_url) : undefined,
    publishedAt:x.published_at ? String(x.published_at) : undefined,
  }));

  return (
    <>
      <div className="folderTopbar"><Link className="textBack" href="/opportunities">← Opportunità</Link></div>

      <div className="folderHero">
        <div className="folderLabel">Preparazione candidatura</div>
        <div className="eyebrow brandEyebrow">{job.brand}</div>
        <h1>{job.title}</h1>
        <p className="lead">{job.location} · {job.role}</p>
        <div className="heroMeta editorialMeta darkMeta">
          <span className="heroMatch">{job.match}% compatibile con te</span>
          <span>{job.freshness}</span>
          <span>{verificationLabel(job.source,job.lastVerifiedAt)}</span>
        </div>
        <div className="actions">
          {job.applyUrl ? <a className="btn green" href={job.applyUrl} target="_blank" rel="noreferrer">Apri posizione ufficiale ↗</a> : null}
          <form action={markApplied}><input type="hidden" name="job_id" value={job.id}/><button className="btn darkSecondary">Segna come candidata</button></form>
          <form action={ignoreOpportunity}><input type="hidden" name="job_id" value={job.id}/><button className="btn darkGhost">Ignora</button></form>
        </div>
      </div>

      <FolderTabs
        brand={job.brand}
        fitEvidence={fitEvidence(job,personalization,job.reasons||[])}
        cvName={cv?.name ? String(cv.name).trim() : undefined}
        cvReady={cvReady}
        repostText={repostText}
        verificationLabel={verificationLabel(job.source,job.lastVerifiedAt)}
        freshness={job.freshness}
        lastVerified={job.lastVerifiedAt ? new Date(job.lastVerifiedAt).toLocaleString("it-IT") : "—"}
        signals={signalRows}
        relatedJobs={relatedRows}
        showInterview={application?.status==="interview"}
      />
    </>
  );
}
