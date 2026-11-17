import Link from "next/link";
import {saveOpportunity,hideOpportunity} from "@/app/opportunities/actions";

type Job = {
  id:string; brand:string; title:string; location:string; match:number;
  confidence:number; priority:number; freshness:string; role:string; source:string; why:string;
};

export function OpportunityCard({job}:{job:Job}) {
  return (
    <article className="card jobCard">
      <div>
        <div className="eyebrow">{job.brand}</div>
        <h3>{job.title}</h3>
        <div className="jobMeta">{job.location} · {job.role} · {job.freshness}</div>
        <div className="badges">
          <span className="badge good">{job.source==="VERIFIED ACTIVE"?"Fonte verificata":"Fonte da confermare"}</span>
          <span className="badge">{job.source}</span>
        </div>
        <div className="actions">
          <Link className="btn primary" href={"/opportunities/"+job.id}>Apri folder</Link>
          <form action={saveOpportunity}><input type="hidden" name="job_id" value={job.id}/><button className="btn" type="submit">Salva</button></form>
          <form action={hideOpportunity}><input type="hidden" name="job_id" value={job.id}/><button className="btn" type="submit">Ignora</button></form>
        </div>
      </div>
      <div className="scoreGroup">
        <div className="score"><strong>{job.match}</strong><span>Match</span></div>
        <div className="score"><strong>{job.confidence}</strong><span>Vacancy</span></div>
        <div className="score"><strong>{job.priority}</strong><span>Priority</span></div>
      </div>
    </article>
  );
}
