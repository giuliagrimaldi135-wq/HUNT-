import { OpportunityCard } from "@/components/OpportunityCard";
import { getOpportunities } from "@/lib/data/opportunities";

export default async function OpportunitiesPage(){
  const opportunities=await getOpportunities();

  return (
    <>
      <div className="eyebrow">Market scan</div>
      <h1>Opportunità</h1>
      <p className="lead">Non è un elenco grezzo. Ogni ruolo viene deduplicato, verificato e poi ordinato per il singolo utente.</p>
      <div className="badges">
        <span className="badge good">Tutte</span><span className="badge">Match 80+</span>
        <span className="badge">Nuove</span><span className="badge">Verificate</span>
        <span className="badge">Adiacenti intelligenti</span>
      </div>
      <section className="section stack">
        {opportunities.length
          ? opportunities.map(job=><OpportunityCard key={job.id} job={job}/>)
          : <div className="card"><h3>Nessuna opportunità da mostrare.</h3><p className="lead">Il motore sta costruendo il tuo feed.</p></div>}
      </section>
    </>
  );
}
