import { getDirectRecommendations } from "@/lib/data/personal";

export default async function DirectPage(){
  const direct=await getDirectRecommendations();
  return (
    <>
      <div className="eyebrow">Direct intelligence</div>
      <h1>Spontanee che hanno un motivo.</h1>
      <p className="lead">Una proposta compare solo quando HUNT trova motivi documentati e un percorso di contatto. Nessuna azienda viene inventata.</p>
      <section className="section stack">
        {direct.length===0
          ? <article className="card"><h2>Nessuna spontanea verificata per ora.</h2><p className="lead">Il sistema sta cercando segnali e contatti reali. Preferiamo non proporti un brand senza evidenze sufficienti.</p></article>
          : direct.map(item=>(
            <article className="card" key={item.id}>
              <div className="sectionHead">
                <div><div className="eyebrow">{item.area}</div><h2>{item.brand}</h2></div>
                {item.score!==null ? <span className="pill high">Pertinenza {item.score}%</span> : null}
              </div>
              <div className="fieldTitle">Perché proprio adesso</div>
              <p className="quote">{item.whyNow}</p>
              <p className="source">{item.contactLabel}</p>
              <div className="actions">
                {item.contactUrl
                  ? <a className="btn primary" href={item.contactUrl} target="_blank" rel="noopener noreferrer">Apri canale pubblico</a>
                  : <span className="source">Nessuna email o contatto specifico confermato</span>}
              </div>
            </article>
          ))}
      </section>
    </>
  );
}
