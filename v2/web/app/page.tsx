import Link from "next/link";
import { OpportunityCard } from "@/components/OpportunityCard";
import { direct } from "@/lib/demo";
import { getOpportunities } from "@/lib/data/opportunities";

export default async function TodayPage(){
  const opportunities=await getOpportunities();
  const top=opportunities.slice(0,2);

  return (
    <>
      <div className="eyebrow">HUNT Today</div>
      <h1>Oggi meritano la tua attenzione {opportunities.length} opportunità.</h1>
      <p className="lead">HUNT ha già cercato, verificato e ordinato il mercato. Qui trovi solo ciò che richiede una decisione o un'azione.</p>

      <section className="grid4">
        <div className="metric"><strong>{opportunities.length}</strong><span>opportunità nel feed</span></div>
        <div className="metric"><strong>{opportunities.filter(x=>x.freshness==="Nuova").length}</strong><span>nuove</span></div>
        <div className="metric"><strong>{opportunities.filter(x=>x.priority>=90).length}</strong><span>priorità 90+</span></div>
        <div className="metric"><strong>{direct.length}</strong><span>segnali per spontanee</span></div>
      </section>

      <section className="section">
        <div className="sectionHead"><div><div className="eyebrow">Priorità</div><h2>Da guardare adesso</h2></div><Link href="/opportunities">Tutte le opportunità →</Link></div>
        <div className="stack">{top.map(job=><OpportunityCard key={job.id} job={job}/>)}</div>
      </section>

      <section className="section infoGrid">
        <div className="callout">
          <div className="eyebrow">Direct signal</div>
          <h2>{direct[0].brand}</h2>
          <p>{direct[0].whyNow}</p>
          <Link className="btn green" href="/direct">Vedi perché contattarlo</Link>
        </div>
        <div className="card">
          <div className="eyebrow">La tua giornata</div>
          <h2>Poche azioni, non centinaia di annunci.</h2>
          <ul className="listClean">
            {top[0] ? <li>1. Apri {top[0].brand} — {top[0].title}</li> : null}
            <li>2. Controlla il segnale {direct[0].brand}</li>
            <li>3. Rivedi le candidature che richiedono follow-up</li>
          </ul>
        </div>
      </section>
    </>
  );
}
