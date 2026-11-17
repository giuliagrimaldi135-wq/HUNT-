import { getOwnProfile } from "@/lib/data/personal";

function shown(items:string[]):string {
 return items.length ? items.join(", ") : "Non ancora specificato";
}

export default async function ProfilePage(){
 const profile=await getOwnProfile();
 return (
  <>
   <div className="eyebrow">Il tuo HUNT</div>
   <h1>Profilo</h1>
   <p className="lead">Qui trovi soltanto i dati registrati nel tuo account. Le preferenze dichiarate hanno priorità sulle inferenze.</p>
   <section className="twoCol section">
    <article className="card">
     <div className="fieldTitle">CV registrati</div>
     <h2>{profile.cvs.length} {profile.cvs.length===1?"versione":"versioni"}</h2>
     {profile.cvs.length
       ? <ul className="listClean">
          {profile.cvs.map(cv=>(
           <li key={cv.id}>{cv.name} {cv.isDefault?<span className="pill high">Default</span>:null}
            <div className="source">{shown(cv.roles)}{!cv.active?" · Non attivo":""}</div>
           </li>
          ))}
         </ul>
       : <p className="source">Non risulta ancora un CV registrato.</p>}
     <p className="source">I file CV sono privati. Nessun CV viene inserito nel repository pubblico.</p>
    </article>
    <article className="card">
     <div className="fieldTitle">Direzione carriera registrata</div>
     <h2>{profile.currentTitle||"Profilo professionale"}</h2>
     <ul className="listClean">
      <li>Livello: {profile.seniority||"Non specificato"}</li>
      <li>Ruoli principali: {shown(profile.primaryRoles)}</li>
      <li>Ruoli adiacenti: {shown(profile.secondaryRoles)}</li>
      <li>Da escludere: {shown(profile.excludedRoles)}</li>
      <li>Località: {shown(profile.preferredLocations)}</li>
      <li>Disponibilità a trasferirti: {shown(profile.relocationLocations)}</li>
     </ul>
    </article>
   </section>
   <section className="section card">
    <div className="fieldTitle">Come HUNT impara</div>
    <h2>Tu resti in controllo.</h2>
    <p className="lead">Candidature, CV e feedback contribuiscono al confronto con le offerte; HUNT non deve inventare esperienze o modificare le tue preferenze dichiarate.</p>
   </section>
  </>
 );
}
