import { OpportunityCard } from "@/components/OpportunityCard";
import { opportunities } from "@/lib/demo";

export default function OpportunitiesPage(){
  return (
    <>
      <div className="eyebrow">Market scan</div>
      <h1>Opportunità</h1>
      <p className="lead">Non è un elenco grezzo. Ogni ruolo è deduplicato, verificato e ordinato per te.</p>
      <div className="badges">
        <span className="badge good">Tutte</span><span className="badge">Match 80+</span>
        <span className="badge">Nuove</span><span className="badge">Verificate</span>
        <span className="badge">Adiacenti intelligenti</span>
      </div>
      <section className="section stack">
        {opportunities.map(job=><OpportunityCard key={job.id} job={job}/>)}
      </section>
    </>
  );
}
