import Link from "next/link";
import {notFound} from "next/navigation";
import {getOpportunity} from "@/lib/data/opportunities";
import {getOwnDossier} from "@/lib/data/dossiers";
import {getOwnProfile} from "@/lib/data/personal";
import {saveOpportunity,prepareApplication} from "@/app/opportunities/actions";
import {CopyMessageButton} from "@/components/CopyMessageButton";

const dateLabel=(iso:string)=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso));

export default async function OpportunityFolder({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const [job,dossier,profile]=await Promise.all([getOpportunity(id),getOwnDossier(id),getOwnProfile()]);
 if(!job)notFound();
 const cv=dossier?.recommendedCvId?profile.cvs.find(x=>x.id===dossier.recommendedCvId):null;
 const gaps=dossier?.gaps.length?dossier.gaps:job.gaps;
 const strengths=dossier?.emphasize.length?dossier.emphasize:job.reasons;
 const message=dossier?.message?.trim()||null;
 const nowMessage=job.publishedAt
  ?"Pubblicato secondo la fonte: "+dateLabel(job.publishedAt)
  :"Data di pubblicazione non esposta; osservato per la prima volta il "+dateLabel(job.firstSeenAt);

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
    <div className="actions">
     {job.applyUrl?<a className="btn green" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Apri candidatura ufficiale</a>:null}
     <form action={saveOpportunity}><input type="hidden" name="job_id" value={job.id}/><button className="btn" type="submit">Salva</button></form>
     <form action={prepareApplication}><input type="hidden" name="job_id" value={job.id}/><button className="btn" type="submit">Prepara candidatura</button></form>
    </div>
   </div>

   <section className="twoCol">
    <article className="card">
     <div className="fieldTitle">Perché tu</div>
     <p className="quote">{dossier?.whyYou||job.why}</p>
    </article>
    <article className="card">
     <div className="fieldTitle">Perché adesso</div>
     <p className="quote">{dossier?.whyNow||nowMessage}</p>
    </article>
   </section>

   <section className="section twoCol">
    <article className="card">
     <div className="fieldTitle">CV per questa candidatura</div>
     <h2>{cv?cv.name:"Nessuna versione ancora selezionata"}</h2>
     <p className="lead">{cv
       ? dossier?.cvReason||"CV individuato nel dossier salvato per questa posizione."
       : "Hai "+profile.cvs.length+" versioni nel profilo. HUNT non indicherà un CV consigliato senza evidenza documentata."}</p>
    </article>
    <article className="card">
     <div className="fieldTitle">Cosa valorizzare</div>
     {strengths.length?<ul className="listClean">{strengths.map((x,i)=><li key={i}>{x}</li>)}</ul>
       :<p className="source">Nessun elemento specifico ancora confermato dal confronto con il CV.</p>}
    </article>
   </section>

   {gaps.length?<section className="section card">
    <div className="fieldTitle">Requisiti da verificare</div>
    <ul className="listClean">{gaps.map((x,i)=><li key={i}>{x}</li>)}</ul>
   </section>:null}

   <section className="section twoCol">
    <article className="card">
     <div className="fieldTitle">Ready to Send</div>
     <h2>Messaggio candidatura</h2>
     {message?<>
       {dossier?.subject?<p className="source">Oggetto: {dossier.subject}</p>:null}
       <p className="quote" style={{whiteSpace:"pre-wrap"}}>{message}</p>
       <div className="actions"><CopyMessageButton text={message}/></div>
      </>:<p className="lead">Non risulta ancora un messaggio personalizzato salvato per questa vacancy. Nessun testo generico viene presentato come pronto da inviare.</p>}
    </article>
    <article className="card">
     <div className="fieldTitle">Dove contattare</div>
     <h2>Canale documentato</h2>
     <p className="source">{job.applyUrl?"Link della vacancy registrato dal monitor":"Nessun link di candidatura validato"}</p>
     <div className="actions">
      {job.applyUrl?<a className="btn green" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Apri candidatura</a>:null}
      {dossier?.contactUrl && dossier.contactUrl!==job.applyUrl
       ?<a className="btn" href={dossier.contactUrl} target="_blank" rel="noopener noreferrer">Altro contatto indicato</a>:null}
     </div>
    </article>
   </section>

   <section className="section twoCol">
    <article className="card">
     <div className="fieldTitle">Vacancy evidence</div>
     <div className="timeline">
      <div className="timelineItem"><strong>Stato: {job.source}</strong><span>Vacancy Confidence {job.confidence}%</span></div>
      <div className="timelineItem"><strong>Ultima verifica</strong><span>{job.lastVerifiedAt?dateLabel(job.lastVerifiedAt):"Non disponibile"}</span></div>
      <div className="timelineItem"><strong>Prima osservazione</strong><span>{dateLabel(job.firstSeenAt)}</span></div>
      <div className="timelineItem"><strong>Pubblicazione</strong><span>{job.publishedAt?dateLabel(job.publishedAt):"Data non fornita dal portale"}</span></div>
     </div>
    </article>
    <article className="card">
     <div className="fieldTitle">Descrizione ufficiale della vacancy</div>
     <p style={{whiteSpace:"pre-wrap"}}>{job.description}</p>
     <p className="source"><Link href="/intelligence">Consulta Intelligence per le notizie sull'azienda →</Link></p>
    </article>
   </section>
  </>
 );
}
