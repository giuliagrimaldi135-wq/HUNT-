"use client";

import Link from "next/link";
import { useState } from "react";

type Signal={id:string;type?:string;title:string;summary:string;sourceName?:string;sourceUrl?:string;publishedAt?:string};
type RelatedJob={id:string;title:string;city?:string;age:string;match:number};
type Props={
  brand:string;fitSummary:string;coverLetter?:string;verificationLabel:string;freshness:string;
  repostCount:number;repostText?:string;signals:Signal[];relatedJobs:RelatedJob[];showInterview:boolean;
};

export default function FolderTabs(props:Props){
 const [tab,setTab]=useState<"application"|"company"|"interview">("application");
 const copy=async()=>{if(props.coverLetter)await navigator.clipboard.writeText(props.coverLetter)};

 return <>
  <div className="folderTabs section">
   <button className={"folderTab "+(tab==="application"?"active":"")} onClick={()=>setTab("application")}>Candidatura</button>
   <button className={"folderTab "+(tab==="company"?"active":"")} onClick={()=>setTab("company")}>Azienda</button>
   {props.showInterview?<button className={"folderTab "+(tab==="interview"?"active":"")} onClick={()=>setTab("interview")}>Colloquio</button>:null}
  </div>

  {tab==="application"?<>
   <section className="section fitBrief">
    <div className="eyebrow">Perché questa posizione</div>
    <div className="fitBriefGrid">
      <h2>Perché vale la pena guardarla</h2>
      <p>{props.fitSummary}</p>
    </div>
   </section>

   {props.coverLetter?<section className="section coverLetterReady">
    <div className="coverLetterHead"><div><div className="eyebrow">Cover letter</div><h2>Pronta per questa candidatura</h2></div><button className="btn primary" onClick={copy}>Copia</button></div>
    <div className="coverLetterText">{props.coverLetter}</div>
   </section>:null}

   <section className="section compactJobStatus">
    <div className="eyebrow">Stato annuncio</div>
    <div className="statusLine"><strong>{props.freshness}</strong><span>{props.verificationLabel}</span><span>{props.repostCount?props.repostCount+" repost rilevato"+(props.repostCount===1?"":"i"):"Nessun repost rilevato"}</span></div>
    {props.repostCount&&props.repostText?<p className="repostNote">{props.repostText}</p>:null}
   </section>
  </>:null}

  {tab==="company"?<>
   <section className="section companyIntro"><div className="eyebrow">Company intelligence</div><h2>Cosa sapere su {props.brand}</h2><p>Solo informazioni utili a capire il brand e questa candidatura: strategia, prodotto, risultati, retail, management, aperture e segnali recenti. Le fonti restano visibili.</p></section>
   <section className="section companyIntelligence">
    {props.signals.length?props.signals.map((signal,index)=><article className="companyFact" key={signal.id}>
     <div className="factIndex">{String(index+1).padStart(2,"0")}</div><div><div className="factType">{(signal.type||"segnale").replaceAll("_"," ")}</div><h3>{signal.title}</h3><p>{signal.summary}</p>
     <div className="signalSource">{signal.sourceName||"Fonte"}{signal.publishedAt?<> · {new Date(signal.publishedAt).toLocaleDateString("it-IT")}</>:null}{signal.sourceUrl?<> · <a href={signal.sourceUrl} target="_blank" rel="noreferrer">Fonte ↗</a></>:null}</div></div>
    </article>):<p className="lead">Nessuna informazione verificata salvata per questo brand in questo momento.</p>}
   </section>
   <section className="section alignedRoles"><div className="eyebrow">Altre posizioni adatte a te</div><h2>Nello stesso brand</h2>
    {props.relatedJobs.length?<div className="relatedJobs">{props.relatedJobs.map(job=><Link className="relatedJob" href={"/opportunities/"+job.id} key={job.id}><span><strong>{job.title}</strong><small>{job.city||""} · {job.age} · {job.match}% compatibile</small></span><b>→</b></Link>)}</div>:<p className="lead">Non risultano altre vacancy fresche dello stesso brand abbastanza coerenti con il tuo profilo.</p>}
   </section>
  </>:null}

  {tab==="interview"?<section className="section companyIntro"><div className="eyebrow">Preparazione colloquio</div><h2>Preparazione specifica per questo colloquio</h2><p>Questa sezione userà CV, vacancy, informazioni recenti sul brand e storico della candidatura. Non verrà riempita con domande generiche.</p></section>:null}
 </>;
}
