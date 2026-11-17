import Link from "next/link";
import { OpportunityCard } from "@/components/OpportunityCard";
import { getOpportunities } from "@/lib/data/opportunities";
import { getDirectRecommendations } from "@/lib/data/personal";

export default async function TodayPage(){
 const [opportunities,direct]=await Promise.all([getOpportunities(),getDirectRecommendations()]);
 const top=opportunities.slice(0,2);
 const bestDirect=direct[0];

 return (
  <>
   <div className="eyebrow">HUNT Today</div>
   <h1>Oggi meritano la tua attenzione {opportunities.length} opportunità.</h1>
   <p className="lead">Un feed basato su offerte effettivamente raccolte e confrontate con il tuo profilo, senza annunci dimostrativi.</p>
   <section className="grid4">
    <div className="metric"><strong>{opportunities.length}</strong><span>opportunità nel feed</span></div>
    <div className="metric"><strong>{opportunities.filter(x=>x.freshness==="Nuova").length}</strong><span>nuove</span></div>
    <div className="metric"><strong>{opportunities.filter(x=>x.priority>=90).length}</strong><span>priorità 90+</span></div>
    <div className="metric"><strong>{direct.length}</strong><span>spontanee con evidenza</span></div>
   </section>

   <section className="section">
    <div className="sectionHead"><div><div className="eyebrow">Priorità</div><h2>Da guardare adesso</h2></div><Link href="/opportunities">Tutte le opportunità →</Link></div>
    {top.length ? <div className="stack">{top.map(job=><OpportunityCard key={job.id} job={job}/>)}</div>
      : <div className="card"><h2>Nessuna vacancy pertinente al momento.</h2><p className="lead">I controlli sulle fonti continuano; qui compariranno solo ruoli adatti e sufficientemente verificati.</p></div>}
   </section>

   <section className="section infoGrid">
    <div className="callout">
     <div className="eyebrow">Direct signal</div>
     {bestDirect ? <>
      <h2>{bestDirect.brand}</h2>
      <p>{bestDirect.whyNow}</p>
     </> : <>
      <h2>Nessun segnale verificato ancora.</h2>
      <p>Non suggeriamo candidature spontanee senza una ragione documentata.</p>
     </>}
     <Link className="btn green" href="/direct">Esplora candidature spontanee</Link>
    </div>
    <div className="card">
     <div className="eyebrow">La tua giornata</div>
     <h2>Poche azioni, non centinaia di annunci.</h2>
     <ul className="listClean">
      {top[0]?<li><Link href={"/opportunities/"+top[0].id}>Apri {top[0].brand} — {top[0].title}</Link></li>:null}
      {bestDirect?<li><Link href="/direct">Verifica il segnale {bestDirect.brand}</Link></li>:null}
      <li><Link href="/applications">Controlla le candidature salvate e i follow-up</Link></li>
     </ul>
    </div>
   </section>
  </>
 );
}
