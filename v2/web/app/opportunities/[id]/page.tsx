import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpportunity } from "@/lib/data/opportunities";

export default async function OpportunityFolder({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const job=await getOpportunity(id);
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
        <div className="actions">{job.applyUrl ? <a className="btn green" href={job.applyUrl} target="_blank" rel="noreferrer">Candidati adesso</a> : null}<button className="btn">Salva</button></div>
      </div>

      <section className="twoCol">
        <article className="card">
          <div className="fieldTitle">Perché tu</div>
          <p className="quote">{job.why}</p>
          {job.reasons?.length ? <ul className="listClean">{job.reasons.map((reason)=><li key={reason}>{reason}</li>)}</ul> : null}
        </article>
        <article className="card">
          <div className="fieldTitle">Perché adesso</div>
          <p className="quote">HUNT combina freschezza, verifica della fonte e compatibilità personale per decidere se vale la pena agire ora.</p>
        </article>
      </section>

      <section className="section twoCol">
        <article className="card">
          <div className="fieldTitle">CV consigliato</div>
          <h2>La versione più adatta al ruolo</h2>
          <p className="lead">Quando l'utente avrà caricato più CV, HUNT selezionerà qui quello più coerente e spiegherà il perché.</p>
          <div className="actions"><button className="btn">Apri CV</button><button className="btn">Modifiche consigliate</button></div>
        </article>
        <article className="card">
          <div className="fieldTitle">Cosa valorizzare</div>
          {job.gaps?.length
            ? <ul className="listClean">{job.gaps.map((gap)=><li key={gap}>{gap}</li>)}</ul>
            : <p className="lead">Nessun gap rilevante segnalato.</p>}
        </article>
      </section>

      <section className="section twoCol">
        <article className="card">
          <div className="fieldTitle">Ready to Send</div>
          <h2>Email / messaggio candidatura</h2>
          <p className="lead">Sarà costruito usando profilo, CV selezionato, vacancy e intelligence verificata. Nessuna esperienza verrà inventata.</p>
          <p className="quote">La versione finale apparirà qui pronta da controllare, copiare e inviare.</p>
          <div className="actions"><button className="btn primary">Copia</button><button className="btn">Modifica</button></div>
        </article>
        <article className="card">
          <div className="fieldTitle">Dove contattare</div>
          <h2>Canale verificato</h2>
          <p>Career site, recruiter pubblico o contatto aziendale: HUNT mostrerà sempre la provenienza.</p>
          <p className="source">Mai inventare email o contatti.</p>
          <div className="actions">{job.applyUrl ? <a className="btn green" href={job.applyUrl} target="_blank" rel="noreferrer">Apri candidatura</a> : null}</div>
        </article>
      </section>

      <section className="section twoCol">
        <article className="card">
          <div className="fieldTitle">Vacancy evidence</div>
          <div className="timeline">
            <div className="timelineItem"><strong>Stato: {job.source}</strong><span>Vacancy Confidence {job.confidence}%</span></div>
            <div className="timelineItem"><strong>Ultima verifica</strong><span>{job.freshness}</span></div>
            <div className="timelineItem"><strong>Repost history</strong><span>Apparirà qui quando esiste storico sufficiente.</span></div>
          </div>
        </article>
        <article className="card">
          <div className="fieldTitle">Intelligence azienda</div>
          <h2>Segnali da sapere</h2>
          <ul className="listClean">
            <li>News e segnali pertinenti con fonte</li>
            <li>Altre posizioni vive nello stesso brand</li>
            <li><Link href="/intelligence">Apri Intelligence →</Link></li>
          </ul>
        </article>
      </section>
    </>
  );
}
