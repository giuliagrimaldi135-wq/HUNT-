import { saveOnboarding } from "./actions";

const primaryRoles = [
  "Retail Merchandising",
  "Buying",
  "Planning & Allocation",
  "Product",
  "Wholesale",
  "E-commerce",
  "Retail Performance",
  "Visual Merchandising",
  "Marketing",
  "PR & Communications",
];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <div className="eyebrow">3 minuti · Personalizzazione</div>
      <h1>Costruiamo il tuo HUNT.</h1>
      <p className="lead">
        Non ti chiediamo di compilare un altro CV. Ci servono solo le informazioni che cambiano davvero ciò che HUNT cerca e ordina per te.
      </p>

      <form action={saveOnboarding} className="section stack">
        {error ? <p className="formError">{error}</p> : null}

        <section className="card">
          <div className="fieldTitle">1 · Direzione principale</div>
          <h2>Cosa vuoi davvero fare?</h2>
          <p className="lead">Scegli uno o più target principali. Questi pesano più di tutto il resto.</p>
          <div className="choiceGrid">
            {primaryRoles.map((role) => (
              <label className="choice" key={role}>
                <input type="checkbox" name="primary_roles" value={role} />
                <span>{role}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="fieldTitle">2 · Ruoli adiacenti</div>
          <h2>Cosa prenderesti in considerazione?</h2>
          <div className="choiceGrid">
            {primaryRoles.map((role) => (
              <label className="choice" key={role}>
                <input type="checkbox" name="secondary_roles" value={role} />
                <span>{role}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="fieldTitle">3 · Cosa non vuoi</div>
          <h2>Fermiamo il rumore prima che arrivi.</h2>
          <div className="choiceGrid">
            <label className="choice"><input type="checkbox" name="excluded_roles" value="Sales Associate" /><span>Sales Associate puro</span></label>
            <label className="choice"><input type="checkbox" name="excluded_roles" value="Store Operations" /><span>Store Operations puro</span></label>
            <label className="choice"><input type="checkbox" name="excluded_roles" value="Data / BI" /><span>Data / BI puro</span></label>
          </div>
        </section>

        <section className="twoCol">
          <article className="card">
            <div className="fieldTitle">4 · Dove</div>
            <h2>Località</h2>
            <div className="choiceGrid oneCol">
              {["Milano","Firenze","Roma","Londra","Svizzera"].map(city=>(
                <label className="choice" key={city}><input type="checkbox" name="preferred_locations" value={city}/><span>{city}</span></label>
              ))}
            </div>
          </article>
          <article className="card">
            <div className="fieldTitle">Disponibilità a trasferirti</div>
            <h2>Relocation</h2>
            <div className="choiceGrid oneCol">
              {["Milano","Firenze","Roma","Londra","Svizzera"].map(city=>(
                <label className="choice" key={city}><input type="checkbox" name="relocation_locations" value={city}/><span>{city}</span></label>
              ))}
            </div>
          </article>
        </section>

        <section className="card">
          <div className="fieldTitle">5 · Livello e contratto</div>
          <div className="twoCol">
            <label>
              <div className="fieldTitle">Seniority</div>
              <select className="input" name="seniority" defaultValue="entry">
                <option value="entry">Internship / Entry level</option>
                <option value="early_career">Junior / Early career</option>
                <option value="experienced">Experienced</option>
              </select>
            </label>
            <div>
              <div className="fieldTitle">Contratti</div>
              <div className="choiceGrid oneCol">
                <label className="choice"><input type="checkbox" name="employment_types" value="internship" defaultChecked/><span>Stage / Internship</span></label>
                <label className="choice"><input type="checkbox" name="employment_types" value="full_time" defaultChecked/><span>Full-time junior</span></label>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="fieldTitle">6 · Il tuo primo CV</div>
          <h2>Caricalo. Gli altri potrai aggiungerli dopo.</h2>
          <p className="lead">PDF, DOC o DOCX · massimo 8 MB. Il file sarà privato e legato al tuo account.</p>
          <div className="twoCol">
            <label>
              <div className="fieldTitle">Nome della versione</div>
              <input className="input" name="cv_name" placeholder="Es. Retail Merchandising" />
            </label>
            <label>
              <div className="fieldTitle">File</div>
              <input className="input" type="file" name="cv" accept=".pdf,.doc,.docx" />
            </label>
          </div>
        </section>

        <div className="actions">
          <button className="btn green" type="submit">Crea il mio HUNT</button>
        </div>
      </form>
    </>
  );
}
