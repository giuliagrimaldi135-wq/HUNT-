import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string,string> = {
  preparing:"Da preparare",
  applied:"Candidata",
  interview:"Colloquio",
  follow_up:"Follow-up",
  rejected:"Rifiutata",
  offer:"Offerta",
  closed:"Chiusa",
};

export default async function ApplicationsPage(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;

  const {data,error}=userId
    ? await supabase
        .from("applications")
        .select("id,status,updated_at,job_id,jobs(id,canonical_title,city,companies(name))")
        .eq("user_id",userId)
        .order("updated_at",{ascending:false})
    : {data:[],error:null};

  const rows=(data||[]) as any[];

  return (
    <>
      <div className="eyebrow">Il tuo percorso</div>
      <h1>Candidature</h1>
      <p className="lead">Da preparare → Candidata → Colloquio → Follow-up → Rifiutata / Offerta.</p>
      <section className="section stack">
        {error ? <div className="card">Impossibile caricare le candidature.</div> : null}
        {!error && !rows.length ? <div className="card">Nessuna candidatura ancora.</div> : null}
        {rows.map((row)=>{
          const job=row.jobs;
          return (
            <article className="card" key={row.id}>
              <div className="eyebrow">{job?.companies?.name || "Candidatura"}</div>
              <h3>{job?.canonical_title || "Opportunità"}</h3>
              <p className="lead">{job?.city || ""} · {labels[row.status] || row.status}</p>
              <div className="actions">
                {row.job_id ? <Link className="btn primary" href={"/opportunities/"+row.job_id}>Apri folder</Link> : null}
              </div>
            </article>
          )
        })}
      </section>
    </>
  );
}
