import { ignoreOpportunity, markApplied, prepareApplication } from "@/app/opportunities/actions";

type Job = {
  id:string; brand:string; title:string; location:string; match:number;
  confidence:number; priority:number; freshness:string; role:string; source:string; why:string;
  official?:boolean; reasons?:string[]; gaps?:string[]; applyUrl?:string;
  lastVerifiedAt?:string;
};

function verificationLabel(job:Job){
  if(job.source==="VERIFIED ACTIVE"){
    if(!job.lastVerifiedAt) return "Annuncio verificato";
    const date=new Date(job.lastVerifiedAt);
    return date.toDateString()===new Date().toDateString()
      ? "Verificato oggi"
      : "Verificato "+date.toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
  }
  return "Da riconfermare";
}

export function OpportunityCard({job}:{job:Job}) {
  return (
    <article className="jobCard cleanJobCard">
      <div>
        <div className="eyebrow">{job.brand}</div>
        <h3>{job.title}</h3>
        <div className="jobMeta">{job.location} · {job.role}</div>
        <div className="humanBadges editorialMeta">
          <span className="matchPill">{job.match}% compatibile</span>
          <span>{job.freshness}</span>
          <span>{verificationLabel(job)}</span>
        </div>
        <div className="actions editorialActions">
          {job.applyUrl ? <a className="btn primary" href={job.applyUrl} target="_blank" rel="noreferrer">Apri posizione ↗</a> : null}
          <form action={prepareApplication}><input type="hidden" name="job_id" value={job.id}/><button className="btn">Prepara candidatura</button></form>
          <form action={markApplied}><input type="hidden" name="job_id" value={job.id}/><button className="btn">Già candidata</button></form>
          <form action={ignoreOpportunity}><input type="hidden" name="job_id" value={job.id}/><button className="btn ghostDanger">Ignora</button></form>
        </div>
      </div>
    </article>
  );
}
