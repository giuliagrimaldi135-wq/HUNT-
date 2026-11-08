import { saveOnboarding } from "./actions";

const roleGroups = [
  ["Merchandising & Buying", [
    "Retail Merchandising","Product / Collection Merchandising","E-commerce Merchandising",
    "Buying","Buying Operations","Merchandising Planning","Planning & Allocation",
    "Allocation","Retail Planning","Demand Planning",
  ]],
  ["Retail & Client", [
    "Retail Performance","Retail Operations","Retail Excellence","Store Operations",
    "Store Planning","CRM & Clienteling","Client Experience","Visual Merchandising",
    "Area / Retail Management",
  ]],
  ["Product & Collection", [
    "Product Management","Product Development","Collection Development","Production",
    "Production Planning","Sourcing","Materials / Fabrics","Quality Control",
  ]],
  ["Wholesale & Commercial", [
    "Wholesale","Showroom / Sales Campaign","Key Account Management","Business Development",
    "Commercial Planning","Trade Marketing","Sales Operations",
  ]],
  ["E-commerce & Digital", [
    "E-commerce","Omnichannel","Marketplace","Digital Product","CRM","Digital Marketing",
    "Performance Marketing","Growth","Digital Analytics",
  ]],
  ["Brand, Marketing & Communications", [
    "Marketing","Brand Management","PR & Communications","Events","Influencer Marketing",
    "Content & Social Media","Media","Partnerships",
  ]],
  ["Supply Chain & Operations", [
    "Supply Chain","Logistics","Inventory / Stock Management","Procurement","Purchasing",
    "Operations","Distribution","Customer Operations",
  ]],
  ["Creative & Design", [
    "Fashion Design","Accessories Design","Footwear Design","Graphic Design","Art Direction",
    "Styling","Content Production","Store Design / Architecture",
  ]],
  ["Corporate & Strategy", [
    "Strategy","Project Management","Data / BI / Analytics","Finance","HR / Talent Acquisition",
    "Legal","Sustainability / ESG","IT / Technology",
  ]],
] as const;

const seniorityLevels = [
  ["internship", "Internship / Stage"],
  ["trainee", "Trainee / Graduate Program"],
  ["entry_level", "Entry Level"],
  ["assistant", "Assistant"],
  ["junior", "Junior"],
  ["associate", "Associate"],
  ["coordinator_specialist", "Coordinator / Specialist"],
  ["mid_level", "Mid-level"],
  ["manager", "Manager"],
  ["senior_manager", "Senior Manager"],
  ["head_director", "Head / Director"],
] as const;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <div className="eyebrow">Personalizzazione</div>
      <h1>Costruiamo il tuo HUNT.</h1>
      <p className="lead">
        Tu ci dici dove vuoi andare. HUNT può allargare il radar senza perdere di vista il tuo obiettivo.
      </p>

      <form action={saveOnboarding} className="section stack">
        {error ? <p className="formError">{error}</p> : null}

        <section className="card">
          <div className="fieldTitle">1 · Chi sei</div>
          <div className="twoCol">
            <label>
              <div className="fieldTitle">Nome</div>
              <input className="input" name="first_name" required />
            </label>
            <label>
              <div className="fieldTitle">Cognome</div>
              <input className="input" name="last_name" required />
            </label>
          </div>
          <label style={{ display: "block", marginTop: 14 }}>
            <div className="fieldTitle">A che livello sei oggi?</div>
            <select className="input" name="seniority" defaultValue="entry_level">
              {seniorityLevels.map(([value,label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <p className="lead">Usiamo livelli simili a quelli che compaiono negli annunci; HUNT considera comunque il titolo reale della singola vacancy.</p>
        </section>

        <section>
          <div className="fieldTitle">2 · Obiettivo professionale</div>
          <h2>Cosa vuoi davvero fare?</h2>
          <p className="lead">Scegli una o più aree. Sono raggruppate per funzione così non devi scorrere una lista infinita.</p>
          <div className="stack">
            {roleGroups.map(([group, roles], index) => (
              <details className="card" key={group} open={index < 2}>
                <summary className="sectionHead" style={{ cursor: "pointer", marginBottom: 0 }}>
                  <strong>{group}</strong><span className="source">{roles.length} aree</span>
                </summary>
                <div className="choiceGrid" style={{ marginTop: 14 }}>
                  {roles.map((role) => (
                    <label className="choice" key={role}>
                      <input type="checkbox" name="primary_roles" value={role} />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="fieldTitle">3 · Ampiezza del radar</div>
          <h2>Quanto vuoi che HUNT allarghi gli orizzonti?</h2>
          <p className="lead">Non devi scegliere tu i “ruoli adiacenti”: HUNT può farlo automaticamente e spiegarti perché un ruolo alternativo può avere senso.</p>
          <div className="stack">
            <label className="choice"><input type="radio" name="radar_scope" value="focused"/><span><strong>Solo i miei target</strong> — quasi esclusivamente i ruoli che scelgo.</span></label>
            <label className="choice"><input type="radio" name="radar_scope" value="smart" defaultChecked/><span><strong>Allarga in modo intelligente</strong> — anche ruoli vicini che possono essere un buon ponte.</span></label>
            <label className="choice"><input type="radio" name="radar_scope" value="explore"/><span><strong>Fammi esplorare</strong> — alternative più ampie se il profilo è forte, sempre con spiegazione.</span></label>
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
          <div className="fieldTitle">5 · Contratto</div>
          <div className="choiceGrid">
            <label className="choice"><input type="checkbox" name="employment_types" value="internship" defaultChecked/><span>Stage / Internship</span></label>
            <label className="choice"><input type="checkbox" name="employment_types" value="graduate_program"/><span>Graduate / Trainee Program</span></label>
            <label className="choice"><input type="checkbox" name="employment_types" value="full_time" defaultChecked/><span>Full-time</span></label>
            <label className="choice"><input type="checkbox" name="employment_types" value="fixed_term"/><span>Tempo determinato</span></label>
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
