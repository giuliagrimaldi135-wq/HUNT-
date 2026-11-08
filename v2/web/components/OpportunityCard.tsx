import Link from "next/link";

type Job = {
  id:string; brand:string; title:string; location:string; match:number;
  confidence:number; priority:number; freshness:string; role:string; source:string; why:string;
  official?:boolean; reasons?:string[]; gaps?:string[]; applyUrl?:string;
};

export function OpportunityCard({job}:{job:Job}) {
  return (
    <article className="card jobCard">
      <div>
        <div className="eyebrow">{job.brand}</div>
        <h3>{job.title}</h3>
        <div className="jobMeta">{job.location} · {job.role} · {job.freshness}</div>
        <div className="badges">
          {job.official ? <span className="badge good">Fonte ufficiale</span> : <span className="badge">Fonte secondaria</span>}
          <span className="badge">{job.source}</span>
        </div>
        <p className="source">{job.why}</p>
        <div className="actions">
          <Link className="btn primary" href={"/opportunities/"+job.id}>Apri folder</Link>
          <button className="btn">Salva</button>
          <button className="btn">Ignora</button>
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
