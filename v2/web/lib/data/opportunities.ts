import { opportunities as demo } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type Opportunity = (typeof demo)[number];

export async function getOpportunities(): Promise<Opportunity[]> {
  if (!isSupabaseConfigured()) return demo;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) return demo;

  const { data, error } = await supabase
    .from("user_job_matches")
    .select("match_score,priority_score,jobs(id,canonical_title,role_family,city,vacancy_confidence,confidence_label,last_verified_at,companies(name))")
    .eq("user_id", userId)
    .order("priority_score", { ascending: false })
    .limit(50);

  if (error || !data) return demo;

  return data.map((row: any) => {
    const job = row.jobs;

    return {
      id: String(job.id),
      brand: job.companies?.name || "Brand",
      title: job.canonical_title,
      location: job.city || "Da verificare",
      match: row.match_score ?? 0,
      confidence: job.vacancy_confidence ?? 0,
      priority: row.priority_score ?? 0,
      freshness: job.last_verified_at ? "Verificata" : "Nuova",
      role: job.role_family || "Other",
      source: job.confidence_label || "HUNT",
      why: "Motivazione personalizzata disponibile nel dossier.",
    };
  });
}

export async function getOpportunity(id: string): Promise<Opportunity | undefined> {
  const feed = await getOpportunities();
  return feed.find((job) => job.id === id);
}
