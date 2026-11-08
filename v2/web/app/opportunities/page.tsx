import { OpportunityCard } from "@/components/OpportunityCard";
import { getOpportunities } from "@/lib/data/opportunities";

export default async function OpportunitiesPage(){
  const opportunities=await getOpportunities();

  return (
    <>
      <div className="eyebrow">Il tuo radar</div>
      <h1>Opportunità</h1>
      <p className="lead">HUNT cerca molto più in largo di quello che mostra. Qui entrano solo vacancy fresche, pertinenti e con una data affidabile.</p>

      <div className="feedToolbar section">
        <strong>{opportunities.length} opportunità per te</strong>
        <div className="filterPills">
          <span>Ultimi 20 giorni</span>
          <span>Ordinate per priorità</span>
        </div>
      </div>

      <section className="section stack">
        {opportunities.length
          ? opportunities.map(job=><OpportunityCard key={job.id} job={job}/>)
          : <div className="card"><h3>Nessuna opportunità fresca da mostrare.</h3><p className="lead">HUNT continua a cercare sul mercato, ma non riempie il feed con vacancy vecchie o senza data affidabile.</p></div>}
      </section>
    </>
  );
}
