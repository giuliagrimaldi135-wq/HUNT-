import Link from "next/link";
import { notFound } from "next/navigation";
import { opportunities } from "@/lib/demo";

export default async function OpportunityFolder({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const job=opportunities.find(x=>x.id===id);
  if(!job) notFound();

  return (
    <>
      <div className="folderHero">
        <div className="eyebrow">{job.brand}</div>
        <h1>{job.title}</h1>
        <p className="lead">{job.location} · {job.role}</p>
        <div className="folderScores">
          <div><strong>{job.match}%</strong><span>Match per te</span></div>
          <div><strong>{job.confidence}%</strong><span>Vacancy confidence</span></div>
          <div><strong>{job.priority}%</strong><span>Priorità</span></div>
        </div>
        <div className="actions"><button className="btn green">Candidati adesso</button><button className="btn">Salva</button></div>
      </div>

      <section className="twoCol">
        <article className="card">
          <div className="fieldTitle">Perché tu</div>
          <p className="quote">{job.why}</p>
        </article>
        <article className="card">
          <div className="fieldTitle">Perché adesso</div>
          <p className="quote">La vacancy è recente, presente sulla fonte ufficiale e il flusso di candidatura risulta attivo. Priorità alta.</p>
        </article>
      </section>

      <section className="section twoCol">
        <article className="card">
          <div className="fieldTitle">CV consigliato</div>
          <h2>Retail Merchandising CV</h2>
          <p className="lead">È la versione che valorizza meglio showroom, ordini, prodotto e formazione Fashion Management.</p>
          <div className="actions"><button className="btn">Apri CV</button><button className="btn">3 modifiche consigliate</button></div>
        </article>
        <article className="card">
          <div className="fieldTitle">Cosa valorizzare</div>
          <ul className="listClean">
            <li>Autonomia con clienti durante la campagna vendite</li>
            <li>Ordini e attenzione al budget cliente</li>
            <li>Progetti di assortimento e retail strategy</li>
          </ul>
        </article>
      </section>

      <section className="section twoCol">
        <article className="card">
          <div className="fieldTitle">Ready to Send</div>
          <h2>Email candidatura</h2>
          <p className="lead">Testo generato usando profilo, CV selezionato, ruolo e informazioni verificate sull'azienda.</p>
          <p className="quote">Buongiorno, mi chiamo Giulia Grimaldi e vorrei candidarmi per la posizione di Retail Merchandising Intern...</p>
          <div className="actions"><button className="btn primary">Copia</button><button className="btn">Modifica</button></div>
        </article>
        <article className="card">
          <div className="fieldTitle">Dove contattare</div>
          <h2>Canale ufficiale</h2>
          <p>Apply tramite career site ufficiale.</p>
          <p className="source">Fonte: career page aziendale · verificata oggi</p>
          <div className="actions"><button className="btn green">Apri candidatura</button></div>
        </article>
      </section>

      <section className="section twoCol">
        <article className="card">
          <div className="fieldTitle">Vacancy evidence</div>
          <div className="timeline">
            <div className="timelineItem"><strong>Oggi · verificata</strong><span>Career site ufficiale attivo</span></div>
            <div className="timelineItem"><strong>5 nov · prima rilevazione</strong><span>Requisition ID identificato</span></div>
            <div className="timelineItem"><strong>Repost history</strong><span>Nessun pattern evergreen rilevato</span></div>
          </div>
        </article>
        <article className="card">
          <div className="fieldTitle">Intelligence azienda</div>
          <h2>Segnali da sapere</h2>
          <ul className="listClean">
            <li>Movimenti retail recenti <span className="source">· fonte pubblica</span></li>
            <li>Focus prodotto e mercati locali <span className="source">· vacancy ufficiale</span></li>
            <li><Link href="/intelligence">Apri tutte le news e i segnali →</Link></li>
          </ul>
        </article>
      </section>
    </>
  );
}
