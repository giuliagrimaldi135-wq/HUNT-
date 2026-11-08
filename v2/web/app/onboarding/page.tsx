import { saveOnboarding } from "./actions";

const macroAreas = [
  "Merchandising",
  "Buying",
  "Planning & Allocation",
  "Retail & Retail Operations",
  "E-commerce & Digital",
  "Product Management & Development",
  "Production & Sourcing",
  "Wholesale & Commercial",
  "Marketing & Brand",
  "PR, Communications & Events",
  "CRM & Clienteling",
  "Visual Merchandising",
  "Supply Chain & Logistics",
  "Design & Creative",
  "Data & Analytics",
  "Strategy & Project Management",
  "HR & Talent",
  "Finance & Legal",
  "Sustainability",
  "Technology",
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
        </section>

        <section className="card">
          <div className="fieldTitle">2 · Obiettivo professionale</div>
          <h2>Cosa vuoi davvero fare?</h2>
          <p className="lead">Scegli una o più macro-aree. HUNT cercherà automaticamente tutti i ruoli e i titoli pertinenti dentro ogni area.</p>
          <div className="choiceGrid">
            {macroAreas.map((role) => (
              <label className="choice" key={role}>
                <input type="checkbox" name="primary_roles" value={role} />
                <span>{role}</span>
              </label>
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

        <section className="card">
          <div className="fieldTitle">4 · Dove</div>
          <h2>Dove vuoi lavorare?</h2>
          <p className="lead">Puoi inserire qualsiasi città, paese o area geografica. Separali con una virgola.</p>
          <div className="twoCol">
            <label>
              <div className="fieldTitle">Località preferite</div>
              <input className="input" name="preferred_locations_text" placeholder="Es. Milano, Parigi, Londra, Zurigo" />
            </label>
            <label>
              <div className="fieldTitle">Dove ti trasferiresti?</div>
              <input className="input" name="relocation_locations_text" placeholder="Es. Svizzera, Francia, New York" />
            </label>
          </div>
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
