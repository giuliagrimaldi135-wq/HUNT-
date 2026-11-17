import { getLiveIntelligence } from "@/lib/data/live-intelligence";

const dateLabel=(iso:string)=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso));

export default async function IntelligencePage(){
  const {items,failed}=await getLiveIntelligence();
  return (
    <>
      <div className="eyebrow">Signals + News</div>
      <h1>Intelligence</h1>
      <p className="lead">Notizie recenti e segnali aziendali con una fonte pubblica consultabile. Le notizie di mercato non sono automaticamente offerte di lavoro.</p>
      <section className="section stack">
        {failed ? <div className="card source">Una fonte dati non è disponibile: l'elenco potrebbe essere incompleto.</div> : null}
        {items.length===0
          ? <div className="card"><h2>Nessuna notizia verificabile da mostrare.</h2><p className="lead">Aggiorneremo questa vista quando le fonti forniranno notizie recenti.</p></div>
          : items.map(item=>(
            <article className="card" key={item.id}>
              <div className="badges"><span className="badge good">{item.type}</span><span className="badge">{dateLabel(item.publishedAt)}</span></div>
              <div className="eyebrow" style={{marginTop:14}}>{item.brand}</div>
              <h2>{item.title}</h2>
              {item.summary ? <p>{item.summary}</p> : null}
              <p className="source">Fonte: {item.source}</p>
              <div className="actions"><a className="btn" href={item.url} target="_blank" rel="noopener noreferrer">Apri fonte originale</a></div>
            </article>
          ))}
      </section>
    </>
  );
}
