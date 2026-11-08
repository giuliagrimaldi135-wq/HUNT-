import Link from "next/link";
import { OpportunityCard } from "@/components/OpportunityCard";
import { direct, opportunities } from "@/lib/demo";

export default function TodayPage(){
  return (
    <>
      <div className="eyebrow">Domenica · HUNT Today</div>
      <h1>Oggi meritano la tua attenzione 7 opportunità.</h1>
      <p className="lead">HUNT ha già cercato, verificato e ordinato il mercato. Qui trovi solo ciò che richiede una decisione o un'azione.</p>

      <section className="grid4">
        <div className="metric"><strong>7</strong><span>opportunità forti</span></div>
        <div className="metric"><strong>2</strong><span>nuove da ieri</span></div>
        <div className="metric"><strong>1</strong><span>da prioritizzare oggi</span></div>
        <div className="metric"><strong>3</strong><span>segnali per spontanee</span></div>
      </section>

      <section className="section">
        <div className="sectionHead"><div><div className="eyebrow">Priorità</div><h2>Da guardare adesso</h2></div><Link href="/opportunities">Tutte le opportunità →</Link></div>
        <div className="stack">{opportunities.slice(0,2).map(job=><OpportunityCard key={job.id} job={job}/>)}</div>
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
          <h2>3 azioni, non 300 annunci.</h2>
          <ul className="listClean">
            <li>1. Apri la candidatura Prada</li>
            <li>2. Controlla il segnale Paris Texas</li>
            <li>3. Prepara il follow-up Antonioli</li>
          </ul>
        </div>
      </section>
    </>
  );
}
