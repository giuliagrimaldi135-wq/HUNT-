import { direct } from "@/lib/demo";

export default function DirectPage(){
  return (
    <>
      <div className="eyebrow">Direct intelligence</div>
      <h1>Spontanee che hanno un motivo.</h1>
      <p className="lead">Niente lista casuale di brand. HUNT propone un contatto diretto solo quando trova segnali concreti e non esiste una vacancy migliore a cui candidarsi.</p>
      <section className="section stack">
        {direct.map(item=>(
          <article className="card" key={item.brand}>
            <div className="sectionHead">
              <div><div className="eyebrow">{item.area}</div><h2>{item.brand}</h2></div>
              <span className="pill high">{item.score}% opportunità</span>
            </div>
            <div className="fieldTitle">Perché proprio adesso</div>
            <p className="quote">{item.whyNow}</p>
            <p className="source">Evidenza: {item.source}</p>
            <ul className="listClean">
              <li>Dove contattare: {item.contact}</li>
              <li>Ready to Send disponibile</li>
              <li>Nessuna vacancy più adatta rilevata oggi</li>
            </ul>
            <div className="actions"><button className="btn primary">Apri folder spontanea</button><button className="btn">Ignora</button></div>
          </article>
        ))}
      </section>
    </>
  );
}
