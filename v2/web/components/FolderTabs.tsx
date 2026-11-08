"use client";

import Link from "next/link";
import { useState } from "react";

type Signal = {
  id:string;
  type?:string;
  title:string;
  summary:string;
  sourceName?:string;
  sourceUrl?:string;
  publishedAt?:string;
};

type RelatedJob = {
  id:string;
  title:string;
  city?:string;
  age:string;
  match:number;
};

type Props = {
  brand:string;
  fitEvidence:string[];
  cvName?:string;
  cvReady:boolean;
  repostText:string;
  verificationLabel:string;
  freshness:string;
  lastVerified:string;
  signals:Signal[];
  relatedJobs:RelatedJob[];
  showInterview:boolean;
};

export default function FolderTabs(props:Props){
  const [tab,setTab]=useState<"application"|"company"|"interview">("application");

  return (
    <>
      <div className="folderTabs section">
        <button className={"folderTab "+(tab==="application"?"active":"")} onClick={()=>setTab("application")}>Candidatura</button>
        <button className={"folderTab "+(tab==="company"?"active":"")} onClick={()=>setTab("company")}>Azienda</button>
        {props.showInterview ? <button className={"folderTab "+(tab==="interview"?"active":"")} onClick={()=>setTab("interview")}>Colloquio</button> : null}
      </div>

      {tab==="application" ? (
        <>
          <section className="section featureEditorial">
            <div className="eyebrow">Perché questa posizione</div>
            <h2>Perché HUNT te la consiglia</h2>
            <div className="evidenceList">
              {props.fitEvidence.map((item,index)=>(
                <div className="evidenceRow" key={item}><span>{String(index+1).padStart(2,"0")}</span><p>{item}</p></div>
              ))}
            </div>
            {!props.cvReady ? <p className="cvPendingNote">Questa analisi diventerà molto più precisa quando HUNT avrà letto il contenuto del tuo CV: esperienze, progetti, competenze e strumenti verranno confrontati direttamente con i requisiti della vacancy.</p> : null}
          </section>

          <section className="section applicationTools">
            <div className="applicationToolsHead">
              <div><div className="eyebrow">Materiali candidatura</div><h2>Preparala per questa vacancy</h2></div>
              <span>{props.cvName || "CV da collegare"}</span>
            </div>
            <div className="applicationToolGrid">
              <article className={"applicationTool "+(props.cvReady?"ready":"")}>
                <div className="toolNumber">01</div>
                <h3>Cover letter</h3>
                <p>{props.cvReady ? "Generata incrociando vacancy, CV, profilo personale e informazioni sul brand. Nessun template standard." : "Si attiverà appena HUNT avrà analizzato il CV, così la lettera sarà davvero personale e non generica."}</p>
                <button className="textAction" disabled={!props.cvReady}>{props.cvReady ? "Apri cover letter →" : "In attesa del CV analizzato"}</button>
              </article>
              <article className="applicationTool">
                <div className="toolNumber">02</div>
                <h3>CV per questa posizione</h3>
                <p>HUNT userà il CV più adatto e segnalerà solo modifiche supportate da esperienze reali. Niente riscritture automatiche se non servono.</p>
                <button className="textAction" disabled>Analisi CV in arrivo</button>
              </article>
              <article className="applicationTool">
                <div className="toolNumber">03</div>
                <h3>Risposte candidatura</h3>
                <p>Se il form chiede “Why us?”, motivazione o domande aperte, HUNT prepara risposte specifiche per questa vacancy.</p>
                <button className="textAction" disabled>Disponibile quando serve</button>
              </article>
            </div>
          </section>

          <section className="section historyBlock">
            <div className="historyHeading"><div><div className="eyebrow">Stato dell'annuncio</div><h2>{props.verificationLabel}</h2></div><span>{props.freshness}</span></div>
            <p>HUNT ha controllato che l'annuncio sia ancora raggiungibile il {props.lastVerified}.</p>
            <div className="repostExplainer">
              <strong>Come HUNT tratta gli annunci ripubblicati</strong>
              <p>{props.repostText}</p>
            </div>
          </section>
        </>
      ) : null}

      {tab==="company" ? (
        <>
          <section className="section companyIntro">
            <div className="eyebrow">Company intelligence</div>
            <h2>Cosa sapere su {props.brand}</h2>
            <p>Una sola selezione di informazioni utili per capire il brand e questa candidatura: risultati, strategia, prodotto, retail, management, aperture, collaborazioni e segnali recenti. Le fonti restano sempre visibili.</p>
          </section>
          <section className="section companyIntelligence">
            {props.signals.length ? props.signals.map((signal,index)=>(
              <article className="companyFact" key={signal.id}>
                <div className="factIndex">{String(index+1).padStart(2,"0")}</div>
                <div>
                  <div className="factType">{(signal.type || "segnale").replaceAll("_"," ")}</div>
                  <h3>{signal.title}</h3>
                  <p>{signal.summary}</p>
                  <div className="signalSource">
                    {signal.sourceName || "Fonte"}
                    {signal.publishedAt ? <> · {new Date(signal.publishedAt).toLocaleDateString("it-IT")}</> : null}
                    {signal.sourceUrl ? <> · <a href={signal.sourceUrl} target="_blank" rel="noreferrer">Fonte ↗</a></> : null}
                  </div>
                </div>
              </article>
            )) : <p className="lead">Nessuna informazione verificata salvata per questo brand in questo momento.</p>}
          </section>

          <section className="section alignedRoles">
            <div className="eyebrow">Altre posizioni adatte a te</div>
            <h2>Nello stesso brand</h2>
            {props.relatedJobs.length ? (
              <div className="relatedJobs">
                {props.relatedJobs.map(job=>(
                  <Link className="relatedJob" href={"/opportunities/"+job.id} key={job.id}>
                    <span><strong>{job.title}</strong><small>{job.city || ""} · {job.age} · {job.match}% compatibile</small></span><b>→</b>
                  </Link>
                ))}
              </div>
            ) : <p className="lead">Non risultano altre vacancy fresche dello stesso brand abbastanza coerenti con il tuo profilo.</p>}
          </section>
        </>
      ) : null}

      {tab==="interview" ? (
        <section className="section companyIntro">
          <div className="eyebrow">Preparazione colloquio</div>
          <h2>Preparazione specifica per questo colloquio</h2>
          <p>Questa sezione userà CV, vacancy, informazioni recenti sul brand e storico della candidatura. Non verrà riempita con domande generiche.</p>
        </section>
      ) : null}
    </>
  );
}
