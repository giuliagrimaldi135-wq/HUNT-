import { intelligence } from "@/lib/demo";

export default function IntelligencePage(){
  return (
    <>
      <div className="eyebrow">Signals + News</div>
      <h1>Intelligence</h1>
      <p className="lead">HUNT legge molto più di quello che mostra. Qui arrivano solo notizie e segnali che possono cambiare una candidatura, un colloquio o una scelta di carriera.</p>
      <section className="section stack">
        {intelligence.map((item,i)=>(
          <article className="card" key={i}>
            <div className="badges"><span className="badge good">{item.type}</span><span className="badge">{item.when}</span></div>
            <div className="eyebrow" style={{marginTop:14}}>{item.brand}</div>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <p className="source">Fonte: {item.source}</p>
          </article>
        ))}
      </section>
    </>
  );
}
