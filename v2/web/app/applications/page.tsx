import { applications } from "@/lib/demo";

const groups=["Preparing","Applied","Follow-up","Interview","Offer / Closed"];

export default function ApplicationsPage(){
  return (
    <>
      <div className="eyebrow">Pipeline personale</div>
      <h1>Candidature</h1>
      <p className="lead">Una vista semplice di quello che stai facendo e della prossima azione.</p>
      <section className="section">
        {groups.map(group=>{
          const rows=applications.filter(x=>x.status.toLowerCase().replace(" ","-")===group.toLowerCase().replace(" ","-") || x.status===group);
          return (
            <div key={group} style={{marginBottom:26}}>
              <div className="sectionHead"><h2>{group}</h2><span className="source">{rows.length} elementi</span></div>
              <div className="stack">
                {rows.length ? rows.map((x,i)=>(
                  <article className="card" key={i}>
                    <div className="eyebrow">{x.brand}</div>
                    <h3>{x.role}</h3>
                    <p className="lead">Prossima azione: {x.next}</p>
                    <div className="actions"><button className="btn">Apri folder</button></div>
                  </article>
                )) : <div className="card source">Nessuna candidatura qui.</div>}
              </div>
            </div>
          )
        })}
      </section>
    </>
  );
}
