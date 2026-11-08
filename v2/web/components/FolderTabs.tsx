"use client";

import Link from "next/link";
import { useState } from "react";

type Signal = {
  id:string;
  title:string;
  summary:string;
  sourceName?:string;
  sourceUrl?:string;
};

type RelatedJob = {
  id:string;
  title:string;
  city?:string;
  age:string;
};

type Props = {
  brand:string;
  personalizedWhy:string;
  gaps:string[];
  cvName?:string;
  repostText:string;
  verificationLabel:string;
  freshness:string;
  lastVerified:string;
  signals:Signal[];
  questions:string[];
  relatedJobs:RelatedJob[];
};

export default function FolderTabs(props:Props){
  const [tab,setTab]=useState<"application"|"company">("application");

  return (
    <>
      <div className="folderTabs section">
        <button className={"folderTab "+(tab==="application"?"active":"")} onClick={()=>setTab("application")}>Candidatura</button>
        <button className={"folderTab "+(tab==="company"?"active":"")} onClick={()=>setTab("company")}>Azienda & colloquio</button>
      </div>

      {tab==="application" ? (
        <>
          <section className="section card featureCard">
            <div className="eyebrow">Perché candidarti</div>
            <h2>Perché ha senso per te</h2>
            <p className="personalWhy">{props.personalizedWhy}</p>
          </section>

          <section className="section">
            <div className="sectionTitle"><div><div className="eyebrow">Cosa fare ora</div><h2>La candidatura, passo per passo</h2></div></div>
            <div className="stepsList">
              <article className="stepCard"><span>1</span><div><strong>Usa il CV più adatto</strong><p>{props.cvName ? <>HUNT sceglierebbe “{props.cvName}” per questa posizione. Il prossimo step è analizzarne davvero il contenuto e suggerire solo modifiche fattuali.</> : <>Carica un CV: HUNT selezionerà quello più coerente con la vacancy.</>}</p></div></article>
              <article className="stepCard"><span>2</span><div><strong>Controlla cosa valorizzare</strong><p>HUNT confronterà vacancy e CV per dirti quali esperienze, progetti e competenze portare in alto, senza aggiungere cose che non hai fatto.</p></div></article>
              <article className="stepCard"><span>3</span><div><strong>Motivation answer / cover letter</strong><p>La prepara solo se è richiesta o davvero utile. Per una candidatura ufficiale non serve inventarsi un’email che nessuno ha chiesto.</p></div></article>
              <article className="stepCard"><span>4</span><div><strong>Candidati sul canale ufficiale</strong><p>Quando hai finito, apri il sito del brand e poi segnala a HUNT che ti sei candidata.</p></div></article>
            </div>
          </section>

          <section className="section twoCol">
            <article className="card">
              <div className="eyebrow">Punti da controllare</div>
              <h2>Prima di inviare</h2>
              {props.gaps.length
                ? <ul className="listClean">{props.gaps.map(gap=><li key={gap}>{gap}</li>)}</ul>
                : <p className="lead">Non è emerso nessun elemento chiaramente bloccante. HUNT continuerà a confrontare requisiti e CV.</p>}
            </article>
            <article className="card">
              <div className="eyebrow">Annuncio & storico</div>
              <h2>{props.verificationLabel}</h2>
              <p className="lead">{props.freshness}. Ultimo controllo: {props.lastVerified}.</p>
              <p className="historyNote">{props.repostText}</p>
            </article>
          </section>
        </>
      ) : (
        <>
          <section className="section">
            <div className="sectionTitle"><div><div className="eyebrow">Prima del colloquio</div><h2>Cose da sapere su {props.brand}</h2></div></div>
            <div className="twoCol">
              <article className="card">
                <div className="eyebrow">News & segnali utili</div>
                {props.signals.length ? props.signals.map(signal=>(
                  <div className="signalItem" key={signal.id}>
                    <strong>{signal.title}</strong>
                    <p>{signal.summary}</p>
                    {signal.sourceUrl ? <a href={signal.sourceUrl} target="_blank" rel="noreferrer">Fonte ↗</a> : null}
                  </div>
                )) : <p className="lead">HUNT non ha ancora salvato segnali verificati per questo brand. Qui compariranno solo news utili a capire azienda, strategia o contesto del ruolo — non notizie casuali.</p>}
              </article>
              <article className="card">
                <div className="eyebrow">Domande probabili</div>
                <h2>Preparati su queste</h2>
                <ol className="interviewQuestions">{props.questions.map(q=><li key={q}>{q}</li>)}</ol>
              </article>
            </div>
          </section>

          <section className="section card">
            <div className="eyebrow">Altre posizioni del brand</div>
            <h2>Cos’altro è aperto adesso</h2>
            {props.relatedJobs.length ? (
              <div className="relatedJobs">
                {props.relatedJobs.map(job=>(
                  <Link className="relatedJob" href={"/opportunities/"+job.id} key={job.id}>
                    <span><strong>{job.title}</strong><small>{job.city || ""} · {job.age}</small></span><b>→</b>
                  </Link>
                ))}
              </div>
            ) : <p className="lead">Nessun’altra vacancy fresca rilevata per questo brand negli ultimi 20 giorni.</p>}
          </section>
        </>
      )}
    </>
  );
}
