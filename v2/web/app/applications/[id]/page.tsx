import Link from "next/link";
import {notFound} from "next/navigation";
import {getOwnApplication} from "@/lib/data/personal";

const formatDate=(iso:string)=>new Intl.DateTimeFormat("it-IT",{dateStyle:"medium"}).format(new Date(iso));

export default async function ApplicationFolder({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const item=await getOwnApplication(id);
 if(!item)notFound();
 return (
  <>
   <div className="eyebrow">{item.brand} · Candidatura registrata</div>
   <h1>{item.role}</h1>
   <p className="lead">Stato: {item.status}</p>
   <div className="actions"><Link href="/applications" className="btn">Torna alle candidature</Link></div>
   <section className="section stack">
    <article className="card">
     <div className="fieldTitle">Date registrate</div>
     <p>Invio: {item.appliedAt?formatDate(item.appliedAt):"Non ancora registrato"}</p>
     <p>Prossimo passo: {item.nextActionAt?formatDate(item.nextActionAt):"Nessuna data indicata"}</p>
    </article>
    <article className="card">
     <div className="fieldTitle">Note personali</div>
     <p>{item.notes?.trim()||"Non hai ancora aggiunto note per questa candidatura."}</p>
    </article>
   </section>
  </>
 );
}
