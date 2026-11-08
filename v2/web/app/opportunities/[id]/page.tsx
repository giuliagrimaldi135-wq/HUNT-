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

function fitSummary(role:string,reasons:string[]){
  const strong=reasons.filter(x=>!/città|milano|livello|stage coerente/i.test(x));
  const detail=strong.filter(x=>!x.startsWith("Target professionale diretto:")&&!/ruolo adiacente/i.test(x));
  let opener="";
  if(strong.some(x=>x.startsWith("Target professionale diretto:"))){
    opener=`È un ruolo ${role} che rientra direttamente nelle aree che hai scelto come obiettivo.`;
  }else if(strong.some(x=>/ruolo adiacente/i.test(x))){
    opener="Non è il tuo target principale, ma è abbastanza vicino alle aree che hai scelto da meritare attenzione.";
  }else{
    opener="HUNT ha trovato una coerenza concreta tra questa posizione e il tuo radar professionale.";
  }
  const body=detail.slice(0,2).map(x=>x.replace(/^La vacancy /i,"La posizione ").replace(/^Il lavoro /i,"Il ruolo ")).join(" ");
  return [opener,body].filter(Boolean).join(" ");
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
    {data:dossier},
  ]=await Promise.all([
    supabase.from("user_personalization").select("interest_areas,next_experience_drivers").eq("user_id",userId).maybeSingle(),
    supabase.from("user_cvs").select("id,name,target_role_families,parsed_profile,is_default,created_at").eq("user_id",userId).eq("active",true).order("created_at",{ascending:false}),
    supabase.from("repost_events").select("id,detected_at,reason,evidence").eq("job_id",id).order("detected_at",{ascending:false}),
    job.companyId
      ? supabase.from("company_signals").select("id,signal_type,title,summary,source_name,source_url,published_at,relevance_score").eq("company_id",job.companyId).order("relevance_score",{ascending:false}).limit(8)
      : Promise.resolve({data:[] as any[]}),
    supabase.from("applications").select("status").eq("user_id",userId).eq("job_id",id).maybeSingle(),
    supabase.from("user_job_dossiers").select("ready_to_send_message").eq("user_id",userId).eq("job_id",id).maybeSingle(),
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
        fitSummary={fitSummary(job.role,job.reasons||[])}
        coverLetter={dossier?.ready_to_send_message ? String(dossier.ready_to_send_message) : undefined}
        verificationLabel={verificationLabel(job.source,job.lastVerifiedAt)}
        freshness={job.freshness}
        repostCount={repostCount}
        repostText={repostCount ? repostText : undefined}
        signals={signalRows}
        relatedJobs={relatedRows}
        showInterview={application?.status==="interview"}
      />
    </>
  );
}
