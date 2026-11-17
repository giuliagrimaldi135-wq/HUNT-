import Link from "next/link";
import {getOwnApplications} from "@/lib/data/personal";

const groups=[
 {key:"preparing",label:"In preparazione"},
 {key:"applied",label:"Inviate"},
 {key:"followup",label:"Follow-up"},
 {key:"interview",label:"Colloqui"},
 {key:"offer",label:"Offerte e chiuse"}
];
function category(status:string):string {
 const s=status.toLowerCase().replace(/[\s_-]/g,"");
 if(["preparing","draft","saved"].includes(s))return "preparing";
 if(["applied","submitted","sent"].includes(s))return "applied";
 if(["followup","waiting","pending"].includes(s))return "followup";
 if(["interview","screening"].includes(s))return "interview";
 return "offer";
}
const dateLabel=(iso:string)=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso));

export default async function ApplicationsPage(){
 const applications=await getOwnApplications();
 return (
  <>
   <div className="eyebrow">Pipeline personale</div>
   <h1>Candidature</h1>
   <p className="lead">Soltanto le candidature salvate nel tuo account, con lo stato e gli eventuali prossimi passi registrati.</p>
   <section className="section">
    {applications.length===0
      ? <article className="card"><h2>Non ci sono ancora candidature salvate.</h2><p className="lead">Quando preparerai o registrerai una candidatura, la ritroverai qui.</p></article>
      : groups.map(group=>{
       const rows=applications.filter(x=>category(x.status)===group.key);
       return (
        <div key={group.key} style={{marginBottom:26}}>
         <div className="sectionHead"><h2>{group.label}</h2><span className="source">{rows.length} elementi</span></div>
         {rows.length>0 ? <div className="stack">
          {rows.map(x=>(
           <article className="card" key={x.id}>
            <div className="eyebrow">{x.brand}</div>
            <h3>{x.role}</h3>
            {x.nextActionAt
              ? <p className="source">Prossimo controllo registrato: {dateLabel(x.nextActionAt)}</p>
              : <p className="source">Nessuna data di follow-up registrata</p>}
            <div className="actions"><Link className="btn" href={"/applications/"+x.id}>Apri folder</Link></div>
           </article>
          ))}
         </div> : <div className="card source">Nessuna candidatura qui.</div>}
        </div>
       );
      })}
   </section>
  </>
 );
}
