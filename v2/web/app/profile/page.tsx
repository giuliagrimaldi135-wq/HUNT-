export default function ProfilePage(){
  return (
    <>
      <div className="eyebrow">Il tuo HUNT</div>
      <h1>Profilo</h1>
      <p className="lead">Qui l'utente controlla ciò che HUNT sa di lui. Le preferenze esplicite vincono sempre sulle inferenze.</p>
      <section className="twoCol section">
        <article className="card">
          <div className="fieldTitle">CV caricati</div>
          <h2>3 versioni</h2>
          <ul className="listClean">
            <li>Retail Merchandising <span className="pill high">Default</span></li>
            <li>Buying</li>
            <li>General Fashion</li>
          </ul>
          <div className="actions"><button className="btn primary">Carica nuovo CV</button></div>
        </article>
        <article className="card">
          <div className="fieldTitle">Direzione carriera</div>
          <ul className="listClean">
            <li>Primario: Retail Merchandising</li>
            <li>Secondari: Buying, Planning, Product, Wholesale</li>
            <li>Da evitare: Sales Associate puro</li>
            <li>Località: Milano → Italia</li>
          </ul>
          <div className="actions"><button className="btn">Modifica preferenze</button></div>
        </article>
      </section>
      <section className="section card">
        <div className="fieldTitle">Come HUNT impara</div>
        <h2>Tu resti in controllo.</h2>
        <p className="lead">Salvataggi, candidature e feedback aiutano il ranking, ma HUNT non deve cambiare una preferenza dichiarata senza dirtelo.</p>
        <div className="badges"><span className="badge">Più ruoli così</span><span className="badge">Troppo sales</span><span className="badge">Troppo senior</span><span className="badge">Brand sì, ruolo no</span></div>
      </section>
    </>
  );
}
