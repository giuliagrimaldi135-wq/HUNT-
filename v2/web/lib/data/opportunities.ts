import { opportunities as demo } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isEligibleFeedVacancy } from "@/lib/data/eligibility";

export type Opportunity = (typeof demo)[number];

export async function getOpportunities(): Promise<Opportunity[]> {
  if (!isSupabaseConfigured()) return process.env.NODE_ENV === "development" ? demo : [];

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  // An unauthenticated production visitor must never see invented opportunities.
  if (!userId) return [];

  const { data, error } = await supabase
    .from("user_job_matches")
    .select("match_score,priority_score,jobs(id,canonical_title,role_family,city,vacancy_confidence,confidence_label,last_verified_at,published_at,first_seen_at,state,metadata,companies(name))")
    .eq("user_id", userId)
    .order("priority_score", { ascending: false })
    .limit(50);

  if (error) {
    console.error("HUNT: unable to retrieve personalized opportunities", error.code || "unknown_error");
    return [];
  }
  if (!data?.length) return [];

  return data.filter((row: any) => isEligibleFeedVacancy(row.jobs))
    .map((row: any) => {
    const job = row.jobs;

    return {
      id: String(job.id),
      brand: job.companies?.name || "Brand",
      title: job.canonical_title,
      location: job.city || "Da verificare",
      match: row.match_score ?? 0,
      confidence: job.vacancy_confidence ?? 0,
      priority: row.priority_score ?? 0,
      freshness: job.published_at && new Date(job.published_at).toDateString() === new Date().toDateString() ? "Nuova" : "Verificata",
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
